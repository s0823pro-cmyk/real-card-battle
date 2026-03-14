import type { Card, PlayerState } from '../types/game';
import { getHungryDamageBonus, getHungryState } from './hungrySystem';
import { getEffectiveTimeCost } from './timeline';

export interface EffectiveCardValues {
  damage: number | null;
  block: number | null;
  effectiveTimeCost: number;
  isTimeBuffed: boolean;
  isTimeDebuffed: boolean;
  isDamageBuffed: boolean;
  isDamageDebuffed: boolean;
  isBlockBuffed: boolean;
  isBlockDebuffed: boolean;
}

const hasWeak = (player: PlayerState): boolean =>
  player.statusEffects.some((status) => status.type === 'weak' && status.duration > 0);

const getStrengthBonus = (player: PlayerState): number =>
  player.statusEffects
    .filter((status) => status.type === 'strength_up' && status.duration > 0)
    .reduce((total, status) => total + status.value, 0);

export const getEffectiveCardValues = (
  card: Card,
  player: PlayerState,
  lastPlayedCard: Card | null,
): EffectiveCardValues => {
  let damage = card.damage ?? null;
  let block = card.block ?? null;
  const effectiveTimeCost = getEffectiveTimeCost(card, lastPlayedCard, player, player.jobId);
  const baseDamage = card.damage ?? 0;
  const baseBlock = card.block ?? 0;
  const baseTimeCost = card.timeCost;

  if (damage !== null) {
    if (player.jobId === 'carpenter' && card.tags?.includes('scaffold_bonus')) {
      damage += player.scaffold * 2;
    }
    if (player.jobId === 'cook' && card.tags?.includes('cooking') && card.cookingMultiplier) {
      damage += player.cookingGauge * card.cookingMultiplier;
    }
    if (player.jobId === 'unemployed') {
      damage += getHungryDamageBonus(getHungryState(player));
    }
    if (card.tags?.includes('missing_hp_damage')) {
      damage = player.maxHp - player.currentHp + getHungryDamageBonus(getHungryState(player));
    }
    if (card.tags?.includes('missing_hp_damage_scaled')) {
      const multiplier = getHungryState(player) === 'awakened' ? 0.8 : 0.5;
      damage = Math.floor((player.maxHp - player.currentHp) * multiplier) + getHungryDamageBonus(getHungryState(player));
    }
    if (card.tags?.includes('cooking') && card.name === '闇鍋') {
      damage = 15;
    }
    if (card.wasReserved && card.reserveBonus?.damageMultiplier) {
      damage = Math.floor(damage * card.reserveBonus.damageMultiplier);
    }
    if (lastPlayedCard?.tags?.includes('preparation')) {
      damage = Math.floor(damage * 1.3);
    }
    const strengthBonus = getStrengthBonus(player);
    if (strengthBonus > 0) {
      damage += strengthBonus;
    }
    if (hasWeak(player)) {
      damage = Math.floor(damage * 0.75);
    }
  }

  if (block !== null) {
    if (card.wasReserved && card.reserveBonus?.blockMultiplier) {
      block = Math.floor(block * card.reserveBonus.blockMultiplier);
    }
    const strengthBonus = getStrengthBonus(player);
    if (strengthBonus > 0) {
      block += strengthBonus;
    }
    if (hasWeak(player)) {
      block = Math.floor(block * 0.75);
    }
  }

  return {
    damage,
    block,
    effectiveTimeCost,
    isTimeBuffed: effectiveTimeCost < baseTimeCost,
    isTimeDebuffed: effectiveTimeCost > baseTimeCost,
    isDamageBuffed: damage !== null && damage > baseDamage,
    isDamageDebuffed: damage !== null && damage < baseDamage,
    isBlockBuffed: block !== null && block > baseBlock,
    isBlockDebuffed: block !== null && block < baseBlock,
  };
};
