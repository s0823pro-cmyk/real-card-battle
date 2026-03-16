import type { Card, Enemy, PlayerState, ToolSlot } from '../types/game';
import { applyDamageToEnemy, calculateCardDamage, getDandoriBonus } from '../utils/damage';
import { getHungryState } from '../utils/hungrySystem';

export interface CardResolveResult {
  player: PlayerState;
  enemies: Enemy[];
  targetEnemyId: string | null;
  damage: number;
  blockGained: number;
  scaffoldGained: number;
  cookingGaugeGained: number;
  equippedTool: Card | null;
  isDandoriActive: boolean;
  goldGained: number;
  lighterBurnApplied: boolean;
}

export const useBattleLogic = () => {
  const upsertEnemyStatus = (
    enemy: Enemy,
    type: Enemy['statusEffects'][number]['type'],
    value: number,
    durationTurns = 1,
  ): void => {
    const idx = enemy.statusEffects.findIndex((status) => status.type === type);
    if (idx < 0) {
      const baseDuration = Math.max(1, durationTurns);
      enemy.statusEffects.push({ type, value, duration: baseDuration });
      return;
    }
    const current = enemy.statusEffects[idx];
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
    const next = [...toolSlots, { card }];
    return next.slice(-3);
  };

  const applyToolEffects = (toolSlots: ToolSlot[], player: PlayerState): PlayerState => {
    const nextPlayer = { ...player };
    const hungryState = getHungryState(nextPlayer);
    for (const tool of toolSlots) {
      if (tool.card.id === 'cardboard_house') {
        if (nextPlayer.canBlock) {
          nextPlayer.block += hungryState === 'awakened' ? 8 : 3;
        }
        continue;
      }
      if (tool.card.block && nextPlayer.canBlock) {
        nextPlayer.block += tool.card.block;
      }
      for (const effect of tool.card.effects ?? []) {
        if (effect.type === 'block_per_turn' && nextPlayer.canBlock) {
          nextPlayer.block += effect.value;
        }
      }
    }
    return nextPlayer;
  };

  const resolveCard = (
    card: Card,
    prevCard: Card | null,
    player: PlayerState,
    enemies: Enemy[],
    preferredTargetEnemyId: string | null = null,
    toolSlots: ToolSlot[] = [],
  ): CardResolveResult => {
    const nextPlayer: PlayerState = { ...player };
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
    let equippedTool: Card | null = null;
    let goldGained = 0;
    let lighterBurnApplied = false;

    if (card.type === 'attack') {
      const rawDamage = calculateCardDamage(card, nextPlayer, prevCard, toolSlots);
      const boostedDamage = isDandoriActive ? Math.floor(rawDamage * bonus.damageMultiplier) : rawDamage;
      if (card.tags?.includes('multi_hit') && (card.hitCount ?? 0) > 0) {
        for (let hit = 0; hit < (card.hitCount ?? 0); hit += 1) {
          const aliveEnemies = nextEnemies.filter((enemy) => enemy.currentHp > 0);
          if (aliveEnemies.length === 0) break;
          const randomEnemy = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          damage += applyDamageToEnemy(randomEnemy, boostedDamage);
          targetEnemyId = randomEnemy.id;
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
      if (nextPlayer.nextAttackDamageBoost > 0) {
        nextPlayer.nextAttackDamageBoost = 0;
      }
    }

    if (card.block && nextPlayer.canBlock) {
      nextPlayer.block += card.block;
      blockGained += card.block;
    }

    for (const effect of card.effects ?? []) {
      if (effect.type === 'scaffold') {
        nextPlayer.scaffold += effect.value;
        scaffoldGained += effect.value;
      }
      if (effect.type === 'cooking_gauge') {
        nextPlayer.cookingGauge += effect.value;
        cookingGaugeGained += effect.value;
      }
      if (effect.type === 'heal') {
        if (!nextPlayer.deathWishActive) {
          nextPlayer.currentHp = Math.min(nextPlayer.maxHp, nextPlayer.currentHp + effect.value);
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
        nextPlayer.blockPersist = true;
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
        nextPlayer.mental = Math.min(10, nextPlayer.mental + effect.value);
      }
      if (effect.type === 'low_hp_damage_boost') {
        nextPlayer.lowHpDamageBoost = Math.max(nextPlayer.lowHpDamageBoost, effect.value);
      }
      if (effect.type === 'first_cooking_multiplier_boost') {
        nextPlayer.kitchenDemonActive = true;
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
            effect.type === 'vulnerable' || effect.type === 'weak'
              ? effect.duration ?? effect.value
              : effect.duration ?? 1;
          upsertEnemyStatus(nextEnemies[targetIndex], statusType, effect.value, statusDuration);
        }
      }
    }

    if (card.id === 'gamble') {
      const isWin = Math.random() < 0.5;
      if (isWin) {
        const preferredIndex = preferredTargetEnemyId
          ? nextEnemies.findIndex((enemy) => enemy.id === preferredTargetEnemyId && enemy.currentHp > 0)
          : -1;
        const targetIndex = preferredIndex >= 0 ? preferredIndex : getAliveEnemyIndex(nextEnemies);
        if (targetIndex >= 0) {
          damage += applyDamageToEnemy(nextEnemies[targetIndex], 25);
          targetEnemyId = nextEnemies[targetIndex].id;
        }
      } else {
        nextPlayer.currentHp = Math.max(0, nextPlayer.currentHp - 10);
      }
    }

    if (card.tags?.includes('cooking_consume')) {
      nextPlayer.cookingGauge = 0;
    }

    if (card.tags?.includes('cooking') && nextPlayer.kitchenDemonActive && !nextPlayer.firstCookingUsedThisTurn) {
      nextPlayer.firstCookingUsedThisTurn = true;
    }

    if (card.tags?.includes('ingredient')) {
      if (nextPlayer.recipeStudyActive) {
        nextPlayer.recipeStudyBonus += 2;
      }
      if (nextPlayer.nextIngredientBonus > 0) {
        nextPlayer.nextIngredientBonus = 0;
      }
      if (nextPlayer.threeStarActive && !nextPlayer.firstIngredientUsedThisTurn) {
        nextPlayer.firstIngredientUsedThisTurn = true;
      }
    }

    if (card.id === 'cutting_board') {
      nextPlayer.nextIngredientBonus += 3;
    }

    if (card.id === 'vending_kick') {
      if (Math.random() < 0.5) {
        nextPlayer.gold += 10;
        goldGained = 10;
      }
    }

    if (card.type === 'attack' && toolSlots.some((slot) => slot.card.id === 'lighter')) {
      if (Math.random() < 0.2) {
        const aliveIdx = getAliveEnemyIndex(nextEnemies);
        if (aliveIdx >= 0) {
          upsertEnemyStatus(nextEnemies[aliveIdx], 'burn', 2, 1);
          lighterBurnApplied = true;
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
      equippedTool,
      isDandoriActive,
      goldGained,
      lighterBurnApplied,
    };
  };

  return { resolveCard, equipTool, applyToolEffects };
};
