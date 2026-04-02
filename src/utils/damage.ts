import type { Card, Enemy, EnemyIntent, PlayerState, StatusEffect, ToolSlot } from '../types/game';
import { isIngredientCard } from './cardBadgeRules';
import { isCardIdVariantOf } from './cardIds';
import { DANDORI_BASE_MULTIPLIER, prevCardGrantsDandori, reserveBonusActiveForCard } from './cardBadgeRules';
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
  toolSlots?: ToolSlot[],
): number => {
  const safeToolSlots: ToolSlot[] = Array.isArray(toolSlots) ? toolSlots : [];
  let damage = card.damage ?? 0;
  const hungryState = getHungryState(player);

  if (player.jobId === 'carpenter' && card.tags?.includes('scaffold_bonus')) {
    const scaffoldMultiplier = card.scaffoldMultiplier ?? 2;
    damage += player.scaffold * scaffoldMultiplier;
  }

  if (
    player.jobId === 'cook' &&
    (card.tags?.includes('cooking') || card.tags?.includes('cooking_consume')) &&
    card.cookingMultiplier
  ) {
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

  if (card.tags?.includes('revenge_damage')) {
    const baseDamage = player.lastTurnDamageTaken;
    damage = hungryState === 'awakened' ? Math.floor(baseDamage * 1.5) : baseDamage;
  }

  if (card.tags?.includes('scaffold_consume')) {
    const scaffoldMultiplier = card.scaffoldMultiplier ?? 10;
    damage = player.scaffold * scaffoldMultiplier;
  }

  if (card.tags?.includes('low_hp_bonus') && card.lowHpBonus) {
    const ratio = player.currentHp / Math.max(1, player.maxHp);
    if (ratio <= card.lowHpBonus.threshold) {
      damage = card.lowHpBonus.damage;
    }
  }

  if (player.deathWishActive && card.type === 'attack') {
    damage += 4;
  }

  if (card.type === 'attack' && player.nextAttackDamageBoost > 0) {
    damage += player.nextAttackDamageBoost;
  }

  if (card.type === 'attack' && player.lowHpDamageBoost > 0) {
    const ratio = player.currentHp / Math.max(1, player.maxHp);
    if (ratio <= 0.5) {
      damage += player.lowHpDamageBoost;
    }
  }

  if (card.type === 'attack' && (player.attackDamageBonusAllAttacks ?? 0) > 0) {
    damage += player.attackDamageBonusAllAttacks ?? 0;
  }

  if (card.type === 'attack' && (player.turnAttackDamageBonus ?? 0) > 0) {
    damage += player.turnAttackDamageBonus ?? 0;
  }

  if (card.type === 'attack') {
    if (player.nextIngredientBonus > 0 && isIngredientCard(card)) {
      damage += player.nextIngredientBonus;
    }
    const knifeSetBonus = safeToolSlots.reduce((sum, slot) => {
      if (!isCardIdVariantOf(slot.card.id, 'knife_set')) return sum;
      return sum + (slot.card.upgraded ? 4 : 2);
    }, 0);
    if (knifeSetBonus > 0) {
      damage += knifeSetBonus;
    }
  }

  if ((card.damage ?? 0) > 0 || card.tags?.includes('missing_hp_damage') || card.tags?.includes('missing_hp_damage_scaled')) {
    damage = Math.max(1, damage);
  }

  // プレイヤーの弱体状態：与えるダメージ-25%
  if (card.type === 'attack') {
    const playerWeak = findStatus(player.statusEffects, 'weak');
    if (playerWeak) {
      damage = Math.floor(damage * 0.75);
    }
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
  // 敵のブロックでダメージを軽減
  if (enemy.block > 0) {
    if (enemy.block >= damage) {
      enemy.block -= damage;
      return 0;
    }
    damage -= enemy.block;
    enemy.block = 0;
  }
  enemy.currentHp = Math.max(0, enemy.currentHp - damage);
  return damage;
};

export interface EnemyAttackOutcome {
  hpDamage: number;
  /** 攻撃ダメージがあり、ブロックのみで HP を削らなかった（無敵ではない） */
  fullyBlocked: boolean;
}

export const applyEnemyAttack = (
  intent: EnemyIntent,
  enemy: Enemy,
  player: PlayerState,
): EnemyAttackOutcome => {
  if (player.damageImmunityThisTurn) {
    return { hpDamage: 0, fullyBlocked: false };
  }

  let damage = getEnemyAttackValue(intent, enemy);

  // プレイヤーの脆弱状態：受けるダメージ+50%
  const playerVulnerable = findStatus(player.statusEffects, 'vulnerable');
  if (playerVulnerable) {
    damage = Math.floor(damage * 1.5);
  }

  if (!player.canBlock) {
    player.block = 0;
    player.currentHp = Math.max(0, player.currentHp - damage);
    return { hpDamage: damage, fullyBlocked: false };
  }

  if (player.block >= damage) {
    player.block -= damage;
    return { hpDamage: 0, fullyBlocked: damage > 0 };
  }

  const actualDamage = damage - player.block;
  player.block = 0;
  player.currentHp = Math.max(0, player.currentHp - actualDamage);
  return { hpDamage: actualDamage, fullyBlocked: false };
};

/** 敵インテント表示用：プレイヤーが受ける物理攻撃の合計表示値（野良猫は3連分、脆弱で1.5倍） */
export const getIncomingPhysicalAttackDisplayNumber = (
  intent: EnemyIntent,
  enemy: Enemy,
  player: PlayerState,
): { text: string; hasPlayerVulnerable: boolean } => {
  if (intent.type !== 'attack') return { text: '', hasPlayerVulnerable: false };
  const perHit = getEnemyAttackValue(intent, enemy);
  const isWildCat = enemy.templateId === 'wildCat' || enemy.name === '野良猫';
  let total = isWildCat ? perHit * 3 : perHit;
  const playerVulnerable = findStatus(player.statusEffects, 'vulnerable');
  if (playerVulnerable && total > 0) {
    total = Math.floor(total * 1.5);
  }
  return {
    text: String(total),
    hasPlayerVulnerable: Boolean(playerVulnerable && total > 0),
  };
};

export const getDandoriBonus = (
  timelineCards: Card[],
  index: number,
  player?: PlayerState,
): { damageMultiplier: number; timeCostReduction: number } => {
  if (index === 0) return { damageMultiplier: 1, timeCostReduction: 0 };

  const prevCard = timelineCards[index - 1];
  if (prevCardGrantsDandori(prevCard)) {
    return {
      damageMultiplier: player?.templeCarpenterActive
        ? (player.templeCarpenterMultiplier ?? 1.5)
        : DANDORI_BASE_MULTIPLIER,
      timeCostReduction: 1,
    };
  }
  return { damageMultiplier: 1, timeCostReduction: 0 };
};

/**
 * カードの実効ダメージを計算する（温存ボーナス・段取りボーナス込み）
 * BattleScreen のプレビューと useBattleLogic の resolveCard で共通使用。
 */
export const calculateEffectiveDamage = (
  card: Card,
  prevCard: Card | null,
  player: PlayerState,
  toolSlots?: ToolSlot[],
): number => {
  // 温存ボーナス適用（【温存】バッジがあるときのみ）
  const reservedBonusActive = reserveBonusActiveForCard(card);
  const cardForCalc: Card = reservedBonusActive
    ? {
        ...card,
        damage: card.damage
          ? Math.floor(card.damage * (card.reserveBonus?.damageMultiplier ?? 1))
          : card.damage,
        effects: [
          ...(card.effects ?? []),
          ...(card.reserveBonus?.extraEffects ?? []),
        ],
        wasReserved: false,
      }
    : card;

  // 基本ダメージ計算
  let damage = calculateCardDamage(cardForCalc, player, toolSlots);

  // 段取りボーナス適用
  const timelineCards = [prevCard, cardForCalc].filter(Boolean) as Card[];
  const dandoriBonus = getDandoriBonus(timelineCards, timelineCards.length - 1, player);
  if (dandoriBonus.damageMultiplier > 1) {
    damage = Math.floor(damage * dandoriBonus.damageMultiplier);
  }

  return damage;
};
