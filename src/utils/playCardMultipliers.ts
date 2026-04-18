import type { Card, PlayerState } from '../types/game';
import { isReserveDoubleNextEffectActive, reserveBonusActiveForCard } from './cardBadgeRules';

const CONCENTRATION_EFFECT_MULT = 1.5;

/** 集中力カード（バフ付与側）。これ自体には集中倍率を掛けない */
export function hasConcentrationNextEffect(card: Card): boolean {
  return (card.effects ?? []).some((e) => e.type === 'concentration_next');
}

/** 集中バフ適用：次の攻撃・スキル1枚の数値を×1.5（床） */
export function applyConcentrationMultiplierToCard(card: Card, player: PlayerState): Card {
  if (!player.concentrationActive) return card;
  if (card.type !== 'attack' && card.type !== 'skill') return card;
  if (hasConcentrationNextEffect(card)) return card;
  const scale = (n: number) => Math.floor(n * CONCENTRATION_EFFECT_MULT);
  return {
    ...card,
    damage: card.damage !== undefined ? scale(card.damage) : card.damage,
    block: card.block !== undefined ? scale(card.block) : card.block,
    hitCount: card.hitCount !== undefined ? scale(card.hitCount) : card.hitCount,
    effects: (card.effects ?? []).map((effect) => {
      if (effect.type === 'concentration_next') return effect;
      if (typeof effect.value !== 'number') return effect;
      return { ...effect, value: scale(effect.value) };
    }),
  };
}

/** 温存ボーナス適用後のカード（playCardInstant と同じ） */
export const getEnhancedCardForPlay = (card: Card): Card => {
  const reservedBonusActive = reserveBonusActiveForCard(card);
  if (!reservedBonusActive) return card;
  return {
    ...card,
    damage: card.damage
      ? Math.floor(card.damage * (card.reserveBonus?.damageMultiplier ?? 1))
      : card.damage,
    block: card.block
      ? Math.floor(card.block * (card.reserveBonus?.blockMultiplier ?? 1))
      : card.block,
    effects: [...(card.effects ?? []), ...(card.reserveBonus?.extraEffects ?? [])],
    wasReserved: false,
    reservedThisTurn: false,
  };
};

/**
 * doubleNext / 温存2倍 / 集中力ブーストをカード数値へ反映（playCardInstant の multipliedCard と同じ）
 */
export const applyMultiplierAndBoostToCard = (
  enhancedCard: Card,
  player: PlayerState,
  doubleNextCharges: number,
  options?: { ignoreDoubleMultiplier?: boolean },
): Card => {
  const reserveOrDoubleMultiplier =
    options?.ignoreDoubleMultiplier
      ? 1
      : doubleNextCharges > 0 || player.nextCardDoubleEffect
        ? 2
        : 1;
  const nextCardEffectBoostRate = Math.max(0, player.nextCardEffectBoost ?? 0);
  const isReserveDoubleNextPlay = isReserveDoubleNextEffectActive(enhancedCard);
  const shouldUseTenBoost =
    reserveOrDoubleMultiplier <= 1 && nextCardEffectBoostRate > 0 && !isReserveDoubleNextPlay;
  const applyBoostWithMinOne = (value: number): number => {
    if (!shouldUseTenBoost || value <= 0) return value;
    const add = Math.max(1, Math.ceil(value * nextCardEffectBoostRate));
    return value + add;
  };
  return {
    ...enhancedCard,
    damage:
      enhancedCard.damage !== undefined
        ? applyBoostWithMinOne(enhancedCard.damage * reserveOrDoubleMultiplier)
        : enhancedCard.damage,
    block:
      enhancedCard.block !== undefined
        ? applyBoostWithMinOne(enhancedCard.block * reserveOrDoubleMultiplier)
        : enhancedCard.block,
    effects: (enhancedCard.effects ?? []).map((effect) => {
      const baseValue = effect.value ?? 0;
      if (effect.type === 'next_attack_boost') {
        return {
          ...effect,
          value:
            reserveOrDoubleMultiplier > 1
              ? Math.floor(baseValue * reserveOrDoubleMultiplier)
              : baseValue,
        };
      }
      return {
        ...effect,
        value: applyBoostWithMinOne(baseValue * reserveOrDoubleMultiplier),
      };
    }),
  };
};
