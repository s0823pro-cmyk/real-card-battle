import { isIngredientCard } from '../utils/cardBadgeRules';
import { getEffectiveMaxMental } from '../utils/mentalLimits';
import type { Card, Enemy, PlayerState, ToolSlot } from '../types/game';
import { applyDamageToEnemy, calculateEffectiveDamage, getDandoriBonus } from '../utils/damage';
import { getHungryState } from '../utils/hungrySystem';
import { isCardIdVariantOf } from '../utils/cardIds';

export interface CardResolveResult {
  player: PlayerState;
  enemies: Enemy[];
  targetEnemyId: string | null;
  damage: number;
  blockGained: number;
  scaffoldGained: number;
  cookingGaugeGained: number;
  fullnessGaugeGained: number;
  /** 満腹ゲージが5以上で自動回復が発動した（ポップ用） */
  fullnessAutoHealTriggered: boolean;
  equippedTool: Card | null;
  isDandoriActive: boolean;
  goldGained: number;
  lighterBurnApplied: boolean;
  attackBuff: { value: number; charges: number } | null;
  /** multi_hit 時：各ヒットの敵IDと実ダメージ（演出用） */
  multiHitJabs?: { enemyId: string; damage: number }[];
  /** 闇鍋：結果表示・演出用 */
  mysteryPotOutcome?: 'aoe' | 'single' | 'self_damage' | 'cooking' | 'poison';
  mysteryPotLabel?: string;
  mysteryPotPopupTarget?: 'player' | 'enemy' | string;
  mysteryPotHitEnemyId?: string | null;
}

export type ApplyOneToolSlotOptions = {
  /**
   * resolveCard がプレイ時に既に card.block を加算している場合は true。
   * ターン開始時の applyToolEffects では false のまま（毎ターンの装備ブロックを加算）。
   */
  omitStaticCardBlock?: boolean;
};

/** 装備1枠分のターン開始時相当の効果（プレイ直後にも適用する） */
export const applyOneToolSlotToPlayer = (
  player: PlayerState,
  tool: ToolSlot,
  options?: ApplyOneToolSlotOptions,
): PlayerState => {
  const nextPlayer = { ...player };
  const hungryState = getHungryState(nextPlayer);
  if (isCardIdVariantOf(tool.card.id, 'cardboard_house')) {
    if (nextPlayer.canBlock) {
      const hasAwakeningEffect = tool.card.effects?.some((e) => e.type === 'block_per_turn_awakened');
      if (!hasAwakeningEffect) {
        nextPlayer.block += hungryState === 'awakened' ? 8 : 3;
      }
    }
    if (!tool.card.effects?.some((e) => e.type === 'block_per_turn_awakened')) {
      return nextPlayer;
    }
  }
  if (!options?.omitStaticCardBlock && tool.card.block && nextPlayer.canBlock) {
    nextPlayer.block += tool.card.block;
  }
  for (const effect of tool.card.effects ?? []) {
    if (effect.type === 'block_per_turn' && nextPlayer.canBlock) {
      nextPlayer.block += effect.value;
    }
    if (effect.type === 'block_per_turn_awakened' && nextPlayer.canBlock) {
      const blockAmount = hungryState === 'awakened' ? effect.value : (effect.normalValue ?? effect.value);
      nextPlayer.block += blockAmount;
    }
  }
  return nextPlayer;
};

export const useBattleLogic = () => {
  const upsertEnemyStatus = (
    enemy: Enemy,
    type: Enemy['statusEffects'][number]['type'],
    value: number,
    durationTurns = 1,
  ): void => {
    const idx = enemy.statusEffects.findIndex((status) => status.type === type);
    if (idx < 0) {
      if (type === 'burn' || type === 'poison') {
        const turns = Math.max(1, value);
        enemy.statusEffects.push({ type, duration: turns, value: turns });
        return;
      }
      const baseDuration = Math.max(1, durationTurns);
      enemy.statusEffects.push({ type, value, duration: baseDuration });
      return;
    }
    const current = enemy.statusEffects[idx];
    if (type === 'burn' || type === 'poison') {
      const addTurns = Math.max(1, value);
      const nextDur = current.duration + addTurns;
      enemy.statusEffects[idx] = { type, duration: nextDur, value: nextDur };
      return;
    }
    if (type === 'vulnerable' || type === 'weak') {
      const turns = Math.max(1, durationTurns);
      enemy.statusEffects[idx] = {
        ...current,
        value: current.value + turns,
        duration: current.duration + turns,
      };
      return;
    }
    if (type === 'attack_down') {
      enemy.statusEffects[idx] = {
        ...current,
        value: current.value + value,
        duration: Math.max(current.duration, Math.max(1, durationTurns)),
      };
      return;
    }
    enemy.statusEffects[idx] = {
      ...current,
      value: current.value + value,
      duration: 1,
    };
  };

  const getAliveEnemyIndex = (enemies: Enemy[]): number =>
    enemies.findIndex((enemy) => enemy.currentHp > 0);

  const equipTool = (card: Card, toolSlots: ToolSlot[]): ToolSlot[] => {
    return [...toolSlots, { card }];
  };

  const applyToolEffects = (toolSlots: ToolSlot[], player: PlayerState): PlayerState =>
    toolSlots.reduce((p, tool) => applyOneToolSlotToPlayer(p, tool), { ...player });

  const resolveCard = (
    card: Card,
    prevCard: Card | null,
    player: PlayerState,
    enemies: Enemy[],
    preferredTargetEnemyId: string | null = null,
    toolSlots: ToolSlot[] = [],
  ): CardResolveResult => {
    const nextPlayer: PlayerState = {
      ...player,
      fullnessGauge: player.fullnessGauge ?? 0,
      fullnessGainedThisTurn: player.fullnessGainedThisTurn ?? false,
    };
    const nextEnemies: Enemy[] = enemies.map((enemy) => ({
      ...enemy,
      statusEffects: [...enemy.statusEffects],
    }));

    const timelineCards = [prevCard, card].filter(Boolean) as Card[];
    const bonus = getDandoriBonus(timelineCards, timelineCards.length - 1, player);
    const isDandoriActive = bonus.damageMultiplier > 1;

    let targetEnemyId: string | null = null;
    let damage = 0;
    let blockGained = 0;
    let scaffoldGained = 0;
    let cookingGaugeGained = 0;
    let fullnessGaugeGained = 0;
    let equippedTool: Card | null = null;
    let goldGained = 0;
    let lighterBurnApplied = false;
    let attackBuff: { value: number; charges: number } | null = null;
    let multiHitJabs: { enemyId: string; damage: number }[] | undefined;

    if (card.id === 'mystery_pot' || card.id.startsWith('mystery_pot_')) {
      const upgraded = Boolean(card.upgraded);
      const roll = Math.floor(Math.random() * 5);
      const aoeDmg = upgraded ? 25 : 20;
      const singleDmg = upgraded ? 50 : 40;
      const selfDmg = upgraded ? 12 : 15;
      const poisonTurns = upgraded ? 4 : 5;

      let np: PlayerState = { ...nextPlayer };
      const ne = nextEnemies;
      let damageOut = 0;
      let tid: string | null = null;
      let cgGained = 0;

      const upsertPlayerPoison = (player: PlayerState, add: number): PlayerState => {
        const list = [...player.statusEffects];
        const idx = list.findIndex((s) => s.type === 'poison');
        if (idx < 0) {
          list.push({ type: 'poison', duration: add, value: add });
        } else {
          const cur = list[idx];
          const nd = cur.duration + add;
          list[idx] = { type: 'poison', duration: nd, value: nd };
        }
        return { ...player, statusEffects: list };
      };

      let mysteryPotOutcome: CardResolveResult['mysteryPotOutcome'];
      let mysteryPotLabel: string | undefined;
      let mysteryPotPopupTarget: 'player' | 'enemy' | string = 'player';
      let mysteryPotHitEnemyId: string | null = null;

      if (roll === 0) {
        mysteryPotOutcome = 'aoe';
        mysteryPotPopupTarget = 'enemy';
        mysteryPotHitEnemyId = ne.find((e) => e.currentHp > 0)?.id ?? null;
        mysteryPotLabel = `🫕 全体${aoeDmg}ダメージ`;
        for (const enemy of ne) {
          if (enemy.currentHp > 0) {
            damageOut += applyDamageToEnemy(enemy, aoeDmg);
          }
        }
      } else if (roll === 1) {
        mysteryPotOutcome = 'single';
        mysteryPotPopupTarget = 'enemy';
        const alive = ne.filter((e) => e.currentHp > 0);
        if (alive.length > 0) {
          const t = alive[Math.floor(Math.random() * alive.length)];
          damageOut = applyDamageToEnemy(t, singleDmg);
          tid = t.id;
          mysteryPotHitEnemyId = tid;
        }
        mysteryPotLabel = `🫕 単体${singleDmg}ダメージ`;
      } else if (roll === 2) {
        mysteryPotOutcome = 'self_damage';
        mysteryPotPopupTarget = 'player';
        mysteryPotLabel = `🫕 自分に${selfDmg}ダメージ`;
        np.currentHp = Math.max(0, np.currentHp - selfDmg);
      } else if (roll === 3) {
        mysteryPotOutcome = 'cooking';
        mysteryPotPopupTarget = 'player';
        mysteryPotLabel = '🫕 調理+10';
        np.cookingGauge += 10;
        cgGained = 10;
      } else {
        mysteryPotOutcome = 'poison';
        mysteryPotPopupTarget = 'player';
        mysteryPotLabel = `🫕 毒${poisonTurns}ターン`;
        np = upsertPlayerPoison(np, poisonTurns);
      }

      let fullnessAutoHealTriggered = false;
      if ((np.fullnessGauge ?? 0) >= 5) {
        if (!np.deathWishActive) {
          np.currentHp = Math.min(np.maxHp, np.currentHp + 5);
        }
        np.fullnessGauge = 0;
        fullnessAutoHealTriggered = true;
        np.fullnessBonusCount = (np.fullnessBonusCount ?? 0) + 1;
      }

      return {
        player: np,
        enemies: ne,
        targetEnemyId: tid,
        damage: damageOut,
        blockGained: 0,
        scaffoldGained: 0,
        cookingGaugeGained: cgGained,
        fullnessGaugeGained: 0,
        fullnessAutoHealTriggered,
        equippedTool: null,
        isDandoriActive: false,
        goldGained: 0,
        lighterBurnApplied: false,
        attackBuff: null,
        multiHitJabs: undefined,
        mysteryPotOutcome,
        mysteryPotLabel,
        mysteryPotPopupTarget,
        mysteryPotHitEnemyId,
      };
    }

    // ダメージ処理（attack / skill / power 共通）
    if (card.type === 'attack' || ((card.type === 'skill' || card.type === 'power') && card.damage)) {
      // 温存ボーナス・段取りボーナス込みのダメージを計算
      let rawDamage = calculateEffectiveDamage(card, prevCard, nextPlayer, toolSlots);
      // next_attack_boost（根性+）のボーナスを適用（attackのみ）
      if (card.type === 'attack' && nextPlayer.nextAttackBoostCount > 0) {
        rawDamage += nextPlayer.nextAttackBoostValue;
        nextPlayer.nextAttackBoostCount -= 1;
        if (nextPlayer.nextAttackBoostCount <= 0) {
          nextPlayer.nextAttackBoostValue = 0;
        }
      }
      const boostedDamage = rawDamage;
      const hitCountEffect = card.effects?.find((e) => e.type === 'hit_count');
      const effectiveHitCount = hitCountEffect?.value ?? card.hitCount ?? 0;
      if (card.tags?.includes('multi_hit') && effectiveHitCount > 0) {
        multiHitJabs = [];
        for (let hit = 0; hit < effectiveHitCount; hit += 1) {
          const aliveEnemies = nextEnemies.filter((enemy) => enemy.currentHp > 0);
          if (aliveEnemies.length === 0) break;
          const randomEnemy = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          const dealt = applyDamageToEnemy(randomEnemy, boostedDamage);
          damage += dealt;
          targetEnemyId = randomEnemy.id;
          if (dealt > 0) {
            multiHitJabs.push({ enemyId: randomEnemy.id, damage: dealt });
          }
        }
      } else if (card.tags?.includes('aoe')) {
        for (const enemy of nextEnemies) {
          if (enemy.currentHp <= 0) continue;
          damage += applyDamageToEnemy(enemy, boostedDamage);
        }
      } else {
        const preferredIndex = preferredTargetEnemyId
          ? nextEnemies.findIndex((enemy) => enemy.id === preferredTargetEnemyId && enemy.currentHp > 0)
          : -1;
        const targetIndex = preferredIndex >= 0 ? preferredIndex : getAliveEnemyIndex(nextEnemies);
        if (targetIndex >= 0) {
          damage = applyDamageToEnemy(nextEnemies[targetIndex], boostedDamage);
          targetEnemyId = nextEnemies[targetIndex].id;
        }
      }
      if (card.tags?.includes('scaffold_consume')) {
        nextPlayer.scaffold = 0;
      }
      if (card.type === 'attack' && nextPlayer.nextAttackDamageBoost > 0) {
        nextPlayer.nextAttackDamageBoost = 0;
      }
    }

    if (card.block && nextPlayer.canBlock) {
      let blockFromCard = card.block;
      if ((nextPlayer.nextCardBlockMultiplier ?? 1) > 1) {
        blockFromCard = Math.floor(blockFromCard * (nextPlayer.nextCardBlockMultiplier ?? 1));
        nextPlayer.nextCardBlockMultiplier = 1;
      }
      const boostedBlock = isDandoriActive
        ? Math.floor(blockFromCard * bonus.damageMultiplier)
        : blockFromCard;
      nextPlayer.block += boostedBlock;
      blockGained += boostedBlock;
    }

    for (const effect of card.effects ?? []) {
      if (effect.type === 'scaffold') {
        nextPlayer.scaffold += effect.value;
        scaffoldGained += effect.value;
      }
      if (effect.type === 'cooking_gauge') {
        nextPlayer.cookingGauge += effect.value;
        cookingGaugeGained += effect.value;
        nextPlayer.totalCookingGaugeGained = (nextPlayer.totalCookingGaugeGained ?? 0) + effect.value;
      }
      if (effect.type === 'fullness_gauge' && !nextPlayer.fullnessGainedThisTurn) {
        nextPlayer.fullnessGauge += 1;
        nextPlayer.fullnessGainedThisTurn = true;
        fullnessGaugeGained += 1;
      }
      if (effect.type === 'heal') {
        if (!nextPlayer.deathWishActive) {
          const boostedHeal = isDandoriActive ? Math.floor(effect.value * bonus.damageMultiplier) : effect.value;
          nextPlayer.currentHp = Math.min(nextPlayer.maxHp, nextPlayer.currentHp + boostedHeal);
        }
      }
      if (effect.type === 'self_damage') {
        nextPlayer.currentHp = Math.max(0, nextPlayer.currentHp - effect.value);
      }
      if (effect.type === 'next_attack_time_reduce') {
        nextPlayer.nextAttackTimeReduce += effect.value;
      }
      if (effect.type === 'next_attack_damage_boost') {
        nextPlayer.nextAttackDamageBoost += effect.value;
      }
      if (effect.type === 'block_persist') {
        const turns = effect.value ?? 1;
        nextPlayer.blockPersistTurns = Math.max(nextPlayer.blockPersistTurns ?? 0, turns);
      }
      if (effect.type === 'damage_immunity_this_turn') {
        nextPlayer.damageImmunityThisTurn = true;
      }
      if (effect.type === 'next_turn_no_block') {
        nextPlayer.nextTurnNoBlock = true;
      }
      if (effect.type === 'next_turn_time_penalty') {
        nextPlayer.nextTurnTimePenalty += effect.value;
      }
      if (effect.type === 'mental_boost') {
        const cap = getEffectiveMaxMental(nextPlayer);
        nextPlayer.mental = Math.min(cap, nextPlayer.mental + effect.value);
      }
      if (effect.type === 'low_hp_damage_boost') {
        nextPlayer.lowHpDamageBoost = Math.max(nextPlayer.lowHpDamageBoost, effect.value);
      }
      if (effect.type === 'attack_damage_all_attacks') {
        nextPlayer.attackDamageBonusAllAttacks =
          (nextPlayer.attackDamageBonusAllAttacks ?? 0) + effect.value;
      }
      if (effect.type === 'turn_attack_damage_bonus') {
        nextPlayer.turnAttackDamageBonus = (nextPlayer.turnAttackDamageBonus ?? 0) + effect.value;
      }
      if (effect.type === 'attack_buff') {
        attackBuff = { value: effect.value, charges: effect.duration ?? 2 };
      }
      if (effect.type === 'next_attack_boost') {
        nextPlayer.nextAttackBoostValue = effect.value;
        nextPlayer.nextAttackBoostCount = effect.count ?? 2;
      }
      if (effect.type === 'next_card_block_multiplier') {
        nextPlayer.nextCardBlockMultiplier = Math.max(1, effect.value);
      }
      if (
        effect.type === 'vulnerable' ||
        effect.type === 'debuff_enemy' ||
        effect.type === 'debuff_enemy_atk' ||
        effect.type === 'weak' ||
        effect.type === 'burn'
      ) {
        const targetIndex = preferredTargetEnemyId
          ? nextEnemies.findIndex((enemy) => enemy.id === preferredTargetEnemyId && enemy.currentHp > 0)
          : getAliveEnemyIndex(nextEnemies);
        if (targetIndex >= 0) {
          const statusType =
            effect.type === 'vulnerable'
              ? 'vulnerable'
              : effect.type === 'burn'
                ? 'burn'
                : effect.type === 'debuff_enemy_atk'
                  ? 'attack_down'
                  : 'weak';
          const statusDuration =
            effect.type === 'burn'
              ? effect.value
              : effect.type === 'vulnerable' || effect.type === 'weak'
                ? effect.duration ?? effect.value
                : effect.duration ?? 1;
          upsertEnemyStatus(nextEnemies[targetIndex], statusType, effect.value, statusDuration);
        }
      }
    }

    if (card.id === 'gamble') {
      const isWin = Math.random() < 0.5;
      const winDamage = card.upgraded ? 35 : 25;
      const lossDamage = card.upgraded ? 8 : 10;
      if (isWin) {
        const preferredIndex = preferredTargetEnemyId
          ? nextEnemies.findIndex((enemy) => enemy.id === preferredTargetEnemyId && enemy.currentHp > 0)
          : -1;
        const targetIndex = preferredIndex >= 0 ? preferredIndex : getAliveEnemyIndex(nextEnemies);
        if (targetIndex >= 0) {
          damage += applyDamageToEnemy(nextEnemies[targetIndex], winDamage);
          targetEnemyId = nextEnemies[targetIndex].id;
        }
      } else {
        nextPlayer.currentHp = Math.max(0, nextPlayer.currentHp - lossDamage);
      }
    }

    let fullnessAutoHealTriggered = false;
    if (nextPlayer.fullnessGauge >= 5) {
      if (!nextPlayer.deathWishActive) {
        nextPlayer.currentHp = Math.min(nextPlayer.maxHp, nextPlayer.currentHp + 5);
      }
      nextPlayer.fullnessGauge = 0;
      fullnessAutoHealTriggered = true;
      nextPlayer.fullnessBonusCount = (nextPlayer.fullnessBonusCount ?? 0) + 1;
    }

    if (card.tags?.includes('cooking_consume')) {
      nextPlayer.cookingGauge = 0;
    }

    if (isIngredientCard(card)) {
      if (nextPlayer.recipeStudyActive) {
        nextPlayer.cookingGauge += 1;
        cookingGaugeGained += 1;
      }
      if (nextPlayer.nextIngredientBonus > 0) {
        nextPlayer.nextIngredientBonus = 0;
      }
      if (nextPlayer.threeStarActive && !nextPlayer.firstIngredientUsedThisTurn) {
        nextPlayer.firstIngredientUsedThisTurn = true;
      }
    }

    if (card.id === 'vending_kick') {
      if (Math.random() < 0.5) {
        nextPlayer.gold += 10;
        goldGained = 10;
      }
    }

    if (card.type === 'attack') {
      const lighterSlot = toolSlots.find((slot) => isCardIdVariantOf(slot.card.id, 'lighter'));
      if (lighterSlot) {
        const chanceEffect = lighterSlot.card.effects?.find((e) => e.type === 'lighter_chance');
        const chance = chanceEffect?.value ?? 0.2;
        const burnValue = chanceEffect?.burnValue ?? 2;
        if (Math.random() < chance) {
          const aliveIdx = getAliveEnemyIndex(nextEnemies);
          if (aliveIdx >= 0) {
            upsertEnemyStatus(nextEnemies[aliveIdx], 'burn', burnValue, 1);
            lighterBurnApplied = true;
          }
        }
      }
    }

    if (card.type === 'tool') {
      equippedTool = card;
    }

    return {
      player: nextPlayer,
      enemies: nextEnemies,
      targetEnemyId,
      damage,
      blockGained,
      scaffoldGained,
      cookingGaugeGained,
      fullnessGaugeGained,
      fullnessAutoHealTriggered,
      equippedTool,
      isDandoriActive,
      goldGained,
      lighterBurnApplied,
      attackBuff,
      multiHitJabs,
    };
  };

  return { resolveCard, equipTool, applyToolEffects };
};
