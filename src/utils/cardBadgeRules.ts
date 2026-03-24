import type { Card } from '../types/game';

/** 段取り：直前カードが【準備】バッジで、次カードに適用する基礎倍率（宮大工の技で上書き） */
export const DANDORI_BASE_MULTIPLIER = 1.2;

/** 直前にプレイしたカードが次の段取りボーナスを与えるか（【準備】バッジ基準） */
export const prevCardGrantsDandori = (prevCard: Card | null | undefined): boolean =>
  Boolean(prevCard?.badges?.includes('setup'));

/**
 * プレイ後に除外されるか（消耗バッジまたは旧タグ）。
 * 「集中力」など reserve_double_next は手札から通常プレイ時は捨て札、温存後に手札へ戻ってからプレイしたときのみ除外。
 */
export const cardExhaustsWhenPlayed = (card: Card, playedAfterReserve = false): boolean => {
  const tagOrBadge = Boolean(card.badges?.includes('exhaust') || card.tags?.includes('exhaust'));
  if (!tagOrBadge) return false;
  const hasReserveDouble = (card.effects ?? []).some((e) => e.type === 'reserve_double_next');
  if (hasReserveDouble) return playedAfterReserve;
  return true;
};

/** 温存スロットに残したまま次プレイヤーターン開始時、除外山へ送るか（集中力は戻さず除外） */
export const exhaustsWhenIdleInReserveAtTurnStart = (card: Card): boolean =>
  Boolean(card.badges?.includes('exhaust') || card.tags?.includes('exhaust'));

/** 自傷効果の合計（効果定義ベース） */
export const sumSelfDamageFromEffects = (card: Card): number =>
  (card.effects ?? []).filter((e) => e.type === 'self_damage').reduce((s, e) => s + e.value, 0);

/**
 * 【自傷】バッジ：支払い後に1HP以上必要（全額払えない／0HPでは打てない）
 */
export const canPlaySelfDamageBadgeCard = (card: Card, currentHp: number): boolean => {
  if (!card.badges?.includes('self_damage')) return true;
  const cost = sumSelfDamageFromEffects(card);
  if (cost <= 0) return true;
  return currentHp > cost;
};

/** 温存時に reserveBonus を適用するか（【温存】バッジ＋定義あり） */
export const reserveBonusActiveForCard = (card: Card): boolean =>
  Boolean(card.wasReserved && card.reserveBonus && card.badges?.includes('reserve'));
