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
  const getAliveEnemyIndex = (enemies: Enemy[]): number =>
    enemies.findIndex((enemy) => enemy.currentHp > 0);

  const equipTool = (card: Card, toolSlots: ToolSlot[]): ToolSlot[] => {
    const next = [...toolSlots, { card }];
    return next.slice(-3);
  };

  const applyToolEffects = (toolSlots: ToolSlot[], player: PlayerState): PlayerState => {
    const nextPlayer = { ...player };
    for (const tool of toolSlots) {
      if (tool.card.block) {
        nextPlayer.block += tool.card.block;
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
    const bonus = getDandoriBonus(timelineCards, timelineCards.length - 1);
    const isDandoriActive = bonus.damageMultiplier > 1;

    let targetEnemyId: string | null = null;
    let damage = 0;
    let blockGained = 0;
    let scaffoldGained = 0;
    let cookingGaugeGained = 0;
    let equippedTool: Card | null = null;

    if (card.type === 'attack') {
      const preferredIndex = preferredTargetEnemyId
        ? nextEnemies.findIndex((enemy) => enemy.id === preferredTargetEnemyId && enemy.currentHp > 0)
        : -1;
      const targetIndex = preferredIndex >= 0 ? preferredIndex : getAliveEnemyIndex(nextEnemies);
      if (targetIndex >= 0) {
        const rawDamage = calculateCardDamage(card, nextPlayer, prevCard);
        const boostedDamage = isDandoriActive
          ? Math.floor(rawDamage * bonus.damageMultiplier)
          : rawDamage;
        damage = applyDamageToEnemy(nextEnemies[targetIndex], boostedDamage);
        targetEnemyId = nextEnemies[targetIndex].id;
      }
    }

    if (card.block) {
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
        nextPlayer.currentHp = Math.min(nextPlayer.maxHp, nextPlayer.currentHp + effect.value);
      }
      if (effect.type === 'self_damage') {
        nextPlayer.currentHp = Math.max(0, nextPlayer.currentHp - effect.value);
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
          nextEnemies[targetIndex].statusEffects.push({
            type: statusType,
            duration: Math.max(1, effect.duration ?? effect.value),
            value: effect.value,
          });
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
    };
  };

  return { resolveCard, equipTool, applyToolEffects };
};
