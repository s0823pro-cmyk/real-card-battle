import type { Card, PlayerState } from '../types/game';
import { getHungryDamageBonus, getHungryState } from './hungrySystem';
import { getEffectiveTimeCost } from './timeline';

export interface EffectiveCardValues {
  damage: number | null;
  block: number | null;
  heal: number | null;
  effectiveTimeCost: number;
  isTimeBuffed: boolean;
  isTimeDebuffed: boolean;
  isDamageBuffed: boolean;
  isDamageDebuffed: boolean;
  isBlockBuffed: boolean;
  isBlockDebuffed: boolean;
  isHealBuffed: boolean;
  isHealDebuffed: boolean;
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
  const baseHeal = (card.effects ?? [])
    .filter((effect) => effect.type === 'heal')
    .reduce((sum, effect) => sum + effect.value, 0);
  let heal = baseHeal > 0 ? baseHeal : null;
  const effectiveTimeCost = getEffectiveTimeCost(card, lastPlayedCard, player, player.jobId);
  const dandoriMultiplier = lastPlayedCard?.tags?.includes('preparation')
    ? (player.templeCarpenterActive ? (player.templeCarpenterMultiplier ?? 1.5) : 1.3)
    : 1;
  const isDandoriActive = dandoriMultiplier > 1;
  const baseDamage = card.damage ?? 0;
  const baseBlock = card.block ?? 0;
  const baseTimeCost = card.timeCost;

  if (damage !== null) {
    if (player.jobId === 'carpenter' && card.tags?.includes('scaffold_bonus')) {
      const scaffoldMultiplier = card.scaffoldMultiplier ?? 2;
      damage += player.scaffold * scaffoldMultiplier;
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
    if (card.tags?.includes('low_hp_bonus') && card.lowHpBonus) {
      const ratio = player.currentHp / Math.max(1, player.maxHp);
      if (ratio <= card.lowHpBonus.threshold) {
        damage = card.lowHpBonus.damage;
      }
    }
    if (card.tags?.includes('scaffold_consume')) {
      const scaffoldMultiplier = card.scaffoldMultiplier ?? 10;
      damage = player.scaffold * scaffoldMultiplier;
    }
    if (card.tags?.includes('revenge_damage')) {
      const baseDamage = player.lastTurnDamageTaken ?? 0;
      damage = getHungryState(player) === 'awakened' ? Math.floor(baseDamage * 1.5) : baseDamage;
    }
    if (card.tags?.includes('cooking') && card.name === '闇鍋') {
      damage = 15;
    }
    if (card.wasReserved && card.reserveBonus?.damageMultiplier) {
      damage = Math.floor(damage * card.reserveBonus.damageMultiplier);
    }
    if (isDandoriActive) {
      damage = Math.floor(damage * dandoriMultiplier);
    }
    if (player.deathWishActive && card.type === 'attack') {
      damage += 4;
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
    if (isDandoriActive && block > 0) {
      block = Math.floor(block * dandoriMultiplier);
    }
    const strengthBonus = getStrengthBonus(player);
    if (strengthBonus > 0) {
      block += strengthBonus;
    }
    if (hasWeak(player)) {
      block = Math.floor(block * 0.75);
    }
  }

  if (heal !== null) {
    if (player.deathWishActive) {
      heal = 0;
    } else if (isDandoriActive) {
      heal = Math.floor(heal * dandoriMultiplier);
    }
  }

  return {
    damage,
    block,
    heal,
    effectiveTimeCost,
    isTimeBuffed: effectiveTimeCost < baseTimeCost,
    isTimeDebuffed: effectiveTimeCost > baseTimeCost,
    isDamageBuffed: damage !== null && damage > baseDamage,
    isDamageDebuffed: damage !== null && damage < baseDamage,
    isBlockBuffed: block !== null && block > baseBlock,
    isBlockDebuffed: block !== null && block < baseBlock,
    isHealBuffed: heal !== null && heal > baseHeal,
    isHealDebuffed: heal !== null && heal < baseHeal,
  };
};
