import type { Card, PlayerState } from '../types/game';
import { isCardIdVariantOf } from './cardIds';

/** 段取り：直前カードが【準備】バッジで、次カードに適用する基礎倍率（宮大工の技で上書き） */
export const DANDORI_BASE_MULTIPLIER = 1.2;
/** 直前にプレイしたカードが次の段取りボーナスを与えるか（【準備】バッジ基準） */
export const prevCardGrantsDandori = (prevCard: Card | null | undefined): boolean =>
  Boolean(prevCard?.badges?.includes('setup'));

/** 温存系カードのドロー回数を数える対象か（【温存】ボーナス付き） */
export const shouldTrackReserveDrawCount = (card: Card): boolean => {
  const hasReserveBonus = Boolean(card.badges?.includes('reserve') && card.reserveBonus);
  return hasReserveBonus;
};

/** 旧 reserve_double_next 用（互換のため残す。現状は未使用） */
export const isReserveDoubleNextEffectActive = (_card: Card): boolean => false;

/**
 * プレイ後に除外されるか（消耗バッジまたは旧タグ）。
 */
export const cardExhaustsWhenPlayed = (card: Card, _playedAfterReserve = false): boolean => {
  if (getBattleUseLimit(card) > 0) return false;
  if (card.type === 'power' && (card.powerTurnsRemaining ?? 0) > 0) return false;
  const tagOrBadge = Boolean(
    card.badges?.includes('exhaust') ||
      card.badges?.includes('vanish') ||
      card.tags?.includes('exhaust') ||
      card.tags?.includes('vanish') ||
      isCardIdVariantOf(card.id, 'god_flambe'),
  );
  if (!tagOrBadge) return false;
  return true;
};

export const getBattleUseLimit = (card: Card): number => {
  const limit = card.battleUseLimit ?? 0;
  return Math.max(0, Math.floor(limit));
};

export const cardHasBattleUseLimit = (card: Card): boolean => getBattleUseLimit(card) > 0;

export const markBattleUse = (card: Card): Card => {
  const limit = getBattleUseLimit(card);
  if (limit <= 0) return card;
  return {
    ...card,
    battleUseLimit: limit,
    battleUses: Math.min(limit, (card.battleUses ?? 0) + 1),
  };
};

export const cardExhaustsByBattleUseLimit = (card: Card): boolean => {
  const limit = getBattleUseLimit(card);
  return limit > 0 && (card.battleUses ?? 0) >= limit;
};

export const clearBattleUseState = (card: Card): Card => {
  if (card.battleUses === undefined) return card;
  const { battleUses: _battleUses, ...rest } = card;
  return rest;
};

/** 消滅：使用した戦闘中は除外、戦闘終了後はラン中のデッキに戻さない。 */
export const cardVanishesAfterBattle = (card: Card): boolean =>
  Boolean(
    card.badges?.includes('vanish') ||
      card.tags?.includes('vanish') ||
      isCardIdVariantOf(card.id, 'god_flambe'),
  );

/** 起死回生：プレイ時点で HP が閾値以下ならボーナスダメージ発動 → そのプレイのみ除外（【追込】） */
export const comebackShouldExhaustAfterPlay = (card: Card, player: PlayerState): boolean => {
  if (card.id !== 'comeback' && card.id !== 'comeback_plus') return false;
  if (!card.lowHpBonus) return false;
  const hasLowHpMechanic =
    card.tags?.includes('low_hp_bonus') || card.badges?.includes('oikomi');
  if (!hasLowHpMechanic) return false;
  const ratio = player.currentHp / Math.max(1, player.maxHp);
  return ratio <= card.lowHpBonus.threshold + 1e-9;
};

/** 温存スロットに残したまま次プレイヤーターン開始時、除外山へ送るか（集中力は戻さず除外） */
export const exhaustsWhenIdleInReserveAtTurnStart = (card: Card): boolean =>
  Boolean(
    card.badges?.includes('exhaust') ||
      card.badges?.includes('vanish') ||
      card.tags?.includes('exhaust') ||
      card.tags?.includes('vanish'),
  );

/** 自傷効果の合計（効果定義ベース） */
export const sumSelfDamageFromEffects = (card: Card): number =>
  (card.effects ?? []).filter((e) => e.type === 'self_damage').reduce((s, e) => s + e.value, 0);

/**
 * 【自傷】バッジ：通常は支払い後に1HP以上必要。無職は自傷でHP0にならないためHP1でも使用可能。
 */
export const canPlaySelfDamageBadgeCard = (
  card: Card,
  currentHp: number,
  jobId?: PlayerState['jobId'],
): boolean => {
  if (!card.badges?.includes('self_damage')) return true;
  const cost = sumSelfDamageFromEffects(card);
  if (cost <= 0) return true;
  if (jobId === 'unemployed') return currentHp > 0;
  return currentHp > cost;
};

/** 温存時に reserveBonus を適用するか（【温存】バッジ＋定義あり） */
export const reserveBonusActiveForCard = (card: Card): boolean =>
  Boolean(
    card.wasReserved &&
      card.reserveBonus &&
      card.badges?.includes('reserve') &&
      (card.reserveDrawCount ?? 0) < 2,
  );

/** 食材カード：`ingredient` タグまたは【食材】バッジ（三ツ星の極意・レシピ研究・具材ボーナス等で共通） */
export const isIngredientCard = (card: Card): boolean =>
  Boolean(card.tags?.includes('ingredient') || card.badges?.includes('ingredient'));

/** `recipeStudyActive` またはパワー枠にレシピ研究があるとき（プレビュー・説明文表示で実戦と揃える） */
export function isRecipeStudyInEffect(player: PlayerState, activePowers?: readonly Card[] | null): boolean {
  if (player.recipeStudyActive) return true;
  if (!activePowers?.length) return false;
  return activePowers.some((p) => isCardIdVariantOf(p.id, 'recipe_study'));
}

/** 説明文の最初の「調理+N」だけ +1（レシピ研究が有効な食材カードの表示用） */
export function bumpFirstCookingGaugeInTextForRecipeStudy(text: string): string {
  let done = false;
  return text.replace(/調理\+(\d+)/g, (match, d: string) => {
    if (done) return match;
    done = true;
    return `調理+${Number(d) + 1}`;
  });
}
