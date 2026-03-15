import type { Card, Enemy, PlayerState, ToolSlot } from '../types/game';
import { applyDamageToEnemy, calculateCardDamage, getDandoriBonus } from '../utils/damage';

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
}

export const useBattleLogic = () => {
  const upsertEnemyStatus = (enemy: Enemy, type: Enemy['statusEffects'][number]['type'], value: number): void => {
    const idx = enemy.statusEffects.findIndex((status) => status.type === type);
    if (idx < 0) {
      const baseDuration = type === 'vulnerable' || type === 'weak' ? value : 1;
      enemy.statusEffects.push({ type, value, duration: baseDuration });
      return;
    }
    const current = enemy.statusEffects[idx];
    if (type === 'vulnerable' || type === 'weak') {
      const turns = Math.max(1, value);
      enemy.statusEffects[idx] = {
        ...current,
        value: current.value + turns,
        duration: current.duration + turns,
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
    for (const tool of toolSlots) {
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

    if (card.type === 'attack') {
      const rawDamage = calculateCardDamage(card, nextPlayer, prevCard);
      const boostedDamage = isDandoriActive ? Math.floor(rawDamage * bonus.damageMultiplier) : rawDamage;
      if (card.tags?.includes('aoe')) {
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
          upsertEnemyStatus(nextEnemies[targetIndex], statusType, effect.value);
        }
      }
    }

    if (card.tags?.includes('cooking') && nextPlayer.kitchenDemonActive && !nextPlayer.firstCookingUsedThisTurn) {
      nextPlayer.firstCookingUsedThisTurn = true;
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
    };
  };

  return { resolveCard, equipTool, applyToolEffects };
};
