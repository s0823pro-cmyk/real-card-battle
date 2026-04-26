import type { Card, PlayerState, ToolSlot } from '../types/game';
import {
  DANDORI_BASE_MULTIPLIER,
  isIngredientCard,
  isRecipeStudyInEffect,
  isReserveDoubleNextEffectActive,
  prevCardGrantsDandori,
  reserveBonusActiveForCard,
} from './cardBadgeRules';
import { getHungryDamageBonus, getHungryState } from './hungrySystem';
import {
  applyMultiplierAndBoostToCard,
  getEnhancedCardForPlay,
  hasConcentrationNextEffect,
} from './playCardMultipliers';
import { getEffectiveTimeCost } from './timeline';
import { isCardIdVariantOf } from './cardIds';

/** 調理・満腹のプレビュー（PlayerStatus の 🍳🍖 用） */
export type CookingFullnessPreview = {
  cookingFrom: number;
  cookingTo: number;
  fullnessFrom: number;
  fullnessTo: number;
  /** 満腹5到達で自動回復が発動する見た目用（表示は to=5 + 文言） */
  fullnessTriggerHint: boolean;
};

/** このターンの被ダメージ無効（居直り・点検車など） */
export const cardHasDamageImmunityThisTurn = (card: Card): boolean =>
  Boolean(card.effects?.some((e) => e.type === 'damage_immunity_this_turn'));

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
  /** 弱体中のアタック：説明文のダメージ数値を青色で優先表示 */
  isAttackDamageWeakDebuffed: boolean;
  /** 包丁セット・次アタック加算など、装備・パワー由来で数値が上振れ */
  isBoosted: boolean;
  /** 装備・パワー由来で実効ダメージがベースラインより高い（手札の攻撃数値を緑に） */
  isDamageBoosted: boolean;
  /** 同上・ブロック */
  isBlockBoosted: boolean;
}

const hasWeak = (player: PlayerState): boolean =>
  player.statusEffects.some((status) => status.type === 'weak' && status.duration > 0);

const getStrengthBonus = (player: PlayerState): number =>
  player.statusEffects
    .filter((status) => status.type === 'strength_up' && status.duration > 0)
    .reduce((total, status) => total + status.value, 0);

/** 装備の包丁セット・次アタック加算・戦闘パワー由来の加算を除いたベースライン（isBoosted 比較用） */
function computeEffectiveCardValuesInner(
  card: Card,
  player: PlayerState,
  lastPlayedCard: Card | null,
  doubleNextCharges: number,
  attackItemBuff: { value: number; charges: number } | null | undefined,
  toolSlots: ToolSlot[] | undefined,
  doubleNextReplayCharges: number,
): Omit<EffectiveCardValues, 'isBoosted' | 'isDamageBoosted' | 'isBlockBoosted'> {
  let damage = card.damage ?? null;
  let block = card.block ?? null;
  const baseHeal = (card.effects ?? [])
    .filter((effect) => effect.type === 'heal')
    .reduce((sum, effect) => sum + effect.value, 0);
  let heal = baseHeal > 0 ? baseHeal : null;
  const effectiveTimeCost = getEffectiveTimeCost(card, lastPlayedCard, player, player.jobId);
  const dandoriMultiplier = prevCardGrantsDandori(lastPlayedCard)
    ? player.templeCarpenterActive
      ? (player.templeCarpenterMultiplier ?? 1.5)
      : DANDORI_BASE_MULTIPLIER
    : 1;
  const nextCardEffectBoost = Math.max(0, player.nextCardEffectBoost ?? 0);
  const reserveOrDoubleMultiplierPreview =
    doubleNextReplayCharges > 0 || doubleNextCharges > 0 || player.nextCardDoubleEffect ? 2 : 1;
  const isReserveDoubleNextCard = isReserveDoubleNextEffectActive(card);
  const shouldApplyNextCardEffectBoost =
    nextCardEffectBoost > 0 && reserveOrDoubleMultiplierPreview <= 1 && !isReserveDoubleNextCard;
  const concentrationApplies =
    (player.concentrationActive ?? false) &&
    (card.type === 'attack' || card.type === 'skill') &&
    !hasConcentrationNextEffect(card);
  const isDandoriActive = dandoriMultiplier > 1;
  const baseDamage = card.damage ?? 0;
  const baseBlock = card.block ?? 0;
  const baseTimeCost = card.timeCost;

  if (damage !== null) {
    if (card.type === 'attack' && attackItemBuff && attackItemBuff.charges > 0) {
      damage += attackItemBuff.value;
    }
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
    if (reserveBonusActiveForCard(card) && card.reserveBonus?.damageMultiplier) {
      damage = Math.floor(damage * card.reserveBonus.damageMultiplier);
    }
    if (isDandoriActive) {
      damage = Math.floor(damage * dandoriMultiplier);
    }
    if (player.deathWishActive && card.type === 'attack') {
      damage += 4;
    }
    // calculateCardDamage と同順（弱体前）：次アタック+damage・逆境・全アタック/ターン加算・お守り攻撃加算・具材・ナイフ
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
    if (card.type === 'attack' && (player.relicAttackDamageBonus ?? 0) > 0) {
      damage += player.relicAttackDamageBonus ?? 0;
    }
    if (card.type === 'attack' && player.nextIngredientBonus > 0 && isIngredientCard(card)) {
      damage += player.nextIngredientBonus;
    }
    if (card.type === 'attack') {
      const knifeBonus = (toolSlots ?? []).reduce((sum, slot) => {
        if (!isCardIdVariantOf(slot.card.id, 'knife_set')) return sum;
        return sum + (slot.card.upgraded ? 4 : 2);
      }, 0);
      if (knifeBonus > 0) {
        damage += knifeBonus;
      }
    }
    const strengthBonus = getStrengthBonus(player);
    if (strengthBonus > 0) {
      damage += strengthBonus;
    }
    if (
      (card.damage ?? 0) > 0 ||
      card.tags?.includes('missing_hp_damage') ||
      card.tags?.includes('missing_hp_damage_scaled')
    ) {
      damage = Math.max(1, damage);
    }
    if (card.type === 'attack' && hasWeak(player)) {
      damage = Math.floor(damage * 0.75);
    }
    if (damage > 0) {
      damage = Math.floor(damage * reserveOrDoubleMultiplierPreview);
    }
    if (shouldApplyNextCardEffectBoost && damage > 0) {
      const add = Math.max(1, Math.ceil(damage * nextCardEffectBoost));
      damage += add;
    }
    if (concentrationApplies && damage > 0) {
      damage = Math.floor(damage * 1.5);
    }
    // 金槌の響き等 next_attack_boost（実ダメージは resolveCard と同様に加算）
    if (card.type === 'attack' && player.nextAttackBoostCount > 0 && damage !== null) {
      damage += player.nextAttackBoostValue;
    }
  }

  if (block !== null) {
    if (reserveBonusActiveForCard(card) && card.reserveBonus?.blockMultiplier) {
      block = Math.floor(block * card.reserveBonus.blockMultiplier);
    }
    if ((player.nextCardBlockMultiplier ?? 1) > 1 && block > 0) {
      block = Math.floor(block * (player.nextCardBlockMultiplier ?? 1));
    }
    if (isDandoriActive && block > 0) {
      block = Math.floor(block * dandoriMultiplier);
    }
    const strengthBonus = getStrengthBonus(player);
    if (strengthBonus > 0) {
      block += strengthBonus;
    }
    if (block > 0) {
      block = Math.floor(block * reserveOrDoubleMultiplierPreview);
    }
    if (shouldApplyNextCardEffectBoost && block > 0) {
      const add = Math.max(1, Math.ceil(block * nextCardEffectBoost));
      block += add;
    }
    if (concentrationApplies && block > 0) {
      block = Math.floor(block * 1.5);
    }
  }

  if (heal !== null) {
    if (player.deathWishActive) {
      heal = 0;
    } else if (isDandoriActive) {
      heal = Math.floor(heal * dandoriMultiplier);
    }
    if (heal !== null && heal > 0) {
      heal = Math.floor(heal * reserveOrDoubleMultiplierPreview);
    }
    if (shouldApplyNextCardEffectBoost && heal !== null && heal > 0) {
      const add = Math.max(1, Math.ceil(heal * nextCardEffectBoost));
      heal += add;
    }
    if (concentrationApplies && heal !== null && heal > 0) {
      heal = Math.floor(heal * 1.5);
    }
  }

  const attackWeakDebuffed =
    card.type === 'attack' && hasWeak(player) && damage !== null && damage > 0;

  return {
    damage,
    block,
    heal,
    effectiveTimeCost,
    isTimeBuffed: effectiveTimeCost < baseTimeCost,
    isTimeDebuffed: effectiveTimeCost > baseTimeCost,
    isDamageBuffed: damage !== null && damage > baseDamage && !attackWeakDebuffed,
    isDamageDebuffed: damage !== null && damage < baseDamage && !attackWeakDebuffed,
    isBlockBuffed: block !== null && block > baseBlock,
    isBlockDebuffed: block !== null && block < baseBlock,
    isHealBuffed: heal !== null && heal > baseHeal,
    isHealDebuffed: heal !== null && heal < baseHeal,
    isAttackDamageWeakDebuffed: attackWeakDebuffed,
  };
}

export const getEffectiveCardValues = (
  card: Card,
  player: PlayerState,
  lastPlayedCard: Card | null,
  doubleNextCharges: number = 0,
  attackItemBuff: { value: number; charges: number } | null | undefined = undefined,
  toolSlots: ToolSlot[] | undefined = undefined,
  doubleNextReplayCharges: number = 0,
): EffectiveCardValues => {
  const full = computeEffectiveCardValuesInner(
    card,
    player,
    lastPlayedCard,
    doubleNextCharges,
    attackItemBuff,
    toolSlots,
    doubleNextReplayCharges,
  );
  const boostBaselinePlayer: PlayerState = {
    ...player,
    nextAttackDamageBoost: 0,
    nextAttackBoostCount: 0,
    nextAttackBoostValue: 0,
    attackDamageBonusAllAttacks: 0,
    turnAttackDamageBonus: 0,
  };
  const boostBaselineSlots = (toolSlots ?? []).filter(
    (s) => s?.card && !isCardIdVariantOf(s.card.id, 'knife_set'),
  );
  const stripped = computeEffectiveCardValuesInner(
    card,
    boostBaselinePlayer,
    lastPlayedCard,
    doubleNextCharges,
    null,
    boostBaselineSlots,
    doubleNextReplayCharges,
  );
  const isDamageBoosted =
    full.damage != null && stripped.damage != null && full.damage > stripped.damage;
  const isBlockBoosted = full.block != null && stripped.block != null && full.block > stripped.block;
  const isBoosted = isDamageBoosted || isBlockBoosted;
  return { ...full, isBoosted, isDamageBoosted, isBlockBoosted };
};

/**
 * ドラッグ／選択中：playCardInstant と同じ合成カードで調理・満腹の予測（闇鍋等ランダムは不可のため null）
 */
export function getPreviewCookingFullnessAfterPlay(
  card: Card,
  player: PlayerState,
  doubleNextCharges: number,
  doubleNextReplayCharges: number = 0,
  activePowers?: Card[],
): CookingFullnessPreview | null {
  const effectivePlayer =
    isRecipeStudyInEffect(player, activePowers) && !player.recipeStudyActive
      ? { ...player, recipeStudyActive: true }
      : player;
  if (effectivePlayer.jobId !== 'cook') return null;
  if (card.id === 'mystery_pot' || card.id.startsWith('mystery_pot_')) return null;

  const replayActive = doubleNextReplayCharges > 0;
  const enhanced = getEnhancedCardForPlay(card);
  const multiplied = applyMultiplierAndBoostToCard(enhanced, effectivePlayer, doubleNextCharges, {
    ignoreDoubleMultiplier: replayActive,
  });

  let cooking = effectivePlayer.cookingGauge;
  let fullness = effectivePlayer.fullnessGauge ?? 0;
  let fullnessGainedThisTurn = effectivePlayer.fullnessGainedThisTurn ?? false;
  const cookingFrom = cooking;
  const fullnessFrom = fullness;

  for (const effect of multiplied.effects ?? []) {
    if (effect.type === 'cooking_gauge') {
      cooking += effect.value;
    }
    if (effect.type === 'fullness_gauge' && !fullnessGainedThisTurn) {
      fullness += 1;
      fullnessGainedThisTurn = true;
    }
  }

  let fullnessTriggerHint = false;
  let fullnessTo = fullness;
  if (fullness >= 5) {
    fullnessTriggerHint = true;
    fullnessTo = 5;
    fullness = 0;
  }

  if (multiplied.tags?.includes('cooking_consume')) {
    cooking = 0;
  }

  if (isIngredientCard(multiplied) && effectivePlayer.recipeStudyActive) {
    cooking += 1;
  }

  const cookingTo = cooking;

  if (
    cookingTo === cookingFrom &&
    fullnessTo === fullnessFrom &&
    !fullnessTriggerHint
  ) {
    return null;
  }

  return {
    cookingFrom,
    cookingTo,
    fullnessFrom,
    fullnessTo,
    fullnessTriggerHint,
  };
}

/**
 * ドラッグ中プレビュー用：カード使用後の足場（playCardInstant と同じ強化・倍率を反映）
 */
export function getPreviewScaffoldAfterPlay(
  card: Card,
  player: PlayerState,
  doubleNextCharges: number,
  doubleNextReplayCharges: number = 0,
): number | null {
  if (player.jobId !== 'carpenter') return null;
  const enhanced = getEnhancedCardForPlay(card);
  const replayActive = doubleNextReplayCharges > 0;
  const multiplied = applyMultiplierAndBoostToCard(enhanced, player, doubleNextCharges, {
    ignoreDoubleMultiplier: replayActive,
  });

  let next = player.scaffold;
  const entersDamageBlock =
    multiplied.type === 'attack' ||
    ((multiplied.type === 'skill' || multiplied.type === 'power') && multiplied.damage);
  if (entersDamageBlock && multiplied.tags?.includes('scaffold_consume')) {
    next = 0;
  }
  for (const effect of multiplied.effects ?? []) {
    if (effect.type === 'scaffold') {
      next += effect.value * (replayActive ? 2 : 1);
    }
  }

  const hasScaffoldGain = (multiplied.effects ?? []).some((e) => e.type === 'scaffold');
  const hasConsume = Boolean(entersDamageBlock && multiplied.tags?.includes('scaffold_consume'));
  if (!hasScaffoldGain && !hasConsume) return null;
  if (next === player.scaffold) return null;
  return next;
}
