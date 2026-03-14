import type { Card, Enemy, EnemyIntent, PlayerState, StatusEffect } from '../types/game';
import { getHungryDamageBonus, getHungryState } from './hungrySystem';

const findStatus = (list: StatusEffect[], type: StatusEffect['type']) =>
  list.find((status) => status.type === type);
const sumStatus = (list: StatusEffect[], type: StatusEffect['type']) =>
  list
    .filter((status) => status.type === type)
    .reduce((total, status) => total + status.value, 0);

export const getEnemyAttackValue = (intent: EnemyIntent, enemy: Enemy): number => {
  let damage = intent.value;
  const attackDownValue = sumStatus(enemy.statusEffects, 'attack_down');
  if (attackDownValue > 0) {
    damage -= attackDownValue;
  }
  const strengthUpValue = sumStatus(enemy.statusEffects, 'strength_up');
  if (strengthUpValue > 0) {
    damage += strengthUpValue;
  }
  const weak = findStatus(enemy.statusEffects, 'weak');
  if (weak) {
    damage = Math.floor(damage * 0.75);
  }
  if (intent.value > 0) {
    return Math.max(1, damage);
  }
  return Math.max(0, damage);
};

export const calculateCardDamage = (
  card: Card,
  player: PlayerState,
  prevCard: Card | null,
): number => {
  let damage = card.damage ?? 0;
  const hungryState = getHungryState(player);

  if (player.jobId === 'carpenter' && card.tags?.includes('scaffold_bonus')) {
    damage += player.scaffold * 2;
  }

  if (player.jobId === 'cook' && card.tags?.includes('cooking') && card.cookingMultiplier) {
    damage += player.cookingGauge * card.cookingMultiplier;
  }

  if (player.jobId === 'unemployed') {
    damage += getHungryDamageBonus(hungryState);
  }

  if (card.tags?.includes('missing_hp_damage')) {
    damage = (player.maxHp - player.currentHp) + getHungryDamageBonus(hungryState);
  }

  if (card.tags?.includes('missing_hp_damage_scaled')) {
    const multiplier = hungryState === 'awakened' ? 0.8 : 0.5;
    damage = Math.floor((player.maxHp - player.currentHp) * multiplier) + getHungryDamageBonus(hungryState);
  }

  if (card.tags?.includes('low_hp_bonus') && card.lowHpBonus) {
    const ratio = player.currentHp / Math.max(1, player.maxHp);
    if (ratio <= card.lowHpBonus.threshold) {
      damage = card.lowHpBonus.damage;
    }
  }

  if (prevCard?.tags?.includes('preparation')) {
    damage = Math.floor(damage * 1.3);
  }

  if (card.name === '闇鍋') {
    damage = 15 + Math.floor(Math.random() * 16);
  }

  if ((card.damage ?? 0) > 0 || card.tags?.includes('missing_hp_damage') || card.tags?.includes('missing_hp_damage_scaled')) {
    damage = Math.max(1, damage);
  }

  return damage;
};

export const applyDamageToEnemy = (enemy: Enemy, baseDamage: number): number => {
  let damage = baseDamage;
  const vulnerable = findStatus(enemy.statusEffects, 'vulnerable');
  if (vulnerable) {
    damage = Math.floor(damage * 1.5);
  }
  if (baseDamage > 0) {
    damage = Math.max(1, damage);
  }
  enemy.currentHp = Math.max(0, enemy.currentHp - damage);
  return damage;
};

export const applyEnemyAttack = (
  intent: EnemyIntent,
  enemy: Enemy,
  player: PlayerState,
): number => {
  const damage = getEnemyAttackValue(intent, enemy);

  if (player.block >= damage) {
    player.block -= damage;
    return 0;
  }

  const actualDamage = damage - player.block;
  player.block = 0;
  player.currentHp = Math.max(0, player.currentHp - actualDamage);
  return actualDamage;
};

export const getDandoriBonus = (
  timelineCards: Card[],
  index: number,
): { damageMultiplier: number; timeCostReduction: number } => {
  if (index === 0) return { damageMultiplier: 1, timeCostReduction: 0 };

  const prevCard = timelineCards[index - 1];
  if (prevCard?.tags?.includes('preparation')) {
    return { damageMultiplier: 1.3, timeCostReduction: 1 };
  }
  return { damageMultiplier: 1, timeCostReduction: 0 };
};
