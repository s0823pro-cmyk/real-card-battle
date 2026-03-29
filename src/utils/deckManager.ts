import type { Card } from '../types/game';
import { shouldTrackReserveDrawCount } from './cardBadgeRules';
import { shuffle } from './shuffle';

const bumpReserveDrawCountIfNeeded = (card: Card): Card => {
  if (!shouldTrackReserveDrawCount(card)) return card;
  return { ...card, reserveDrawCount: (card.reserveDrawCount ?? 0) + 1 };
};

/** 不安カード（createAnxietyCards は anxiety_<suffix> のID）。シャッフル時に山札から除去する */
export const isAnxietyCard = (card: Card): boolean =>
  card.id === 'anxiety' || card.id.startsWith('anxiety_');

interface DrawResult {
  drawn: Card[];
  drawPile: Card[];
  discardPile: Card[];
  shuffled: boolean;
}

export const drawCards = (
  drawPileInput: Card[],
  discardPileInput: Card[],
  count: number,
  equippedCardIds: string[] = [],
): DrawResult => {
  const drawPile = [...drawPileInput];
  let discardPile = [...discardPileInput];
  const drawn: Card[] = [];
  let shuffled = false;

  // 装備中カードIDの出現回数をカウント
  const equippedCountMap = new Map<string, number>();
  for (const id of equippedCardIds) {
    equippedCountMap.set(id, (equippedCountMap.get(id) ?? 0) + 1);
  }

  // ドロー不可カードIDセットを構築（全枚数が装備中の場合のみ除外）
  const nonDrawableIds = new Set<string>();
  if (equippedCountMap.size > 0) {
    const allCards = [...drawPile, ...discardPile];
    for (const [id, equippedCount] of equippedCountMap) {
      const totalCount = allCards.filter((c) => c.id === id).length;
      if (totalCount <= equippedCount) {
        nonDrawableIds.add(id);
      }
    }
  }

  for (let i = 0; i < count; i += 1) {
    if (drawPile.length === 0 && discardPile.length > 0) {
      const kept = discardPile.filter((c) => !isAnxietyCard(c));
      drawPile.push(...shuffle(kept));
      discardPile = [];
      shuffled = true;
    }
    if (drawPile.length === 0) break;

    if (nonDrawableIds.size > 0) {
      // ドロー可能なカードを先頭から探す
      const drawableIdx = drawPile.findLastIndex((c) => !nonDrawableIds.has(c.id));
      if (drawableIdx === -1) break;
      const [card] = drawPile.splice(drawableIdx, 1);
      drawn.push(bumpReserveDrawCountIfNeeded(card));
    } else {
      const card = drawPile.pop();
      if (card) drawn.push(bumpReserveDrawCountIfNeeded(card));
    }
  }

  return { drawn, drawPile, discardPile, shuffled };
};

function isOnlyPopsFromEnd(oldPile: Card[], newPile: Card[]): boolean {
  if (newPile.length > oldPile.length) return false;
  for (let i = 0; i < newPile.length; i += 1) {
    if (newPile[i] !== oldPile[i]) return false;
  }
  return true;
}

/** 山札モーダル用：ランダムな表示順（インデックスの並び） */
export function createShuffledDrawPileDisplayOrder(length: number): number[] {
  if (length <= 0) return [];
  return shuffle(Array.from({ length }, (_, i) => i));
}

/**
 * ドロー後の山札表示順。捨て札から戻したシャッフル時は全振り直し。
 * 末尾からのドローのみなら、取り除いたインデックスを表示順から除去。
 */
export function nextDrawPileDisplayOrder(
  prevPerm: number[] | undefined,
  oldPile: Card[],
  newPile: Card[],
  shuffled: boolean,
): number[] {
  const len = newPile.length;
  if (len === 0) return [];
  if (shuffled) {
    return createShuffledDrawPileDisplayOrder(len);
  }
  if (!prevPerm || prevPerm.length !== oldPile.length) {
    return createShuffledDrawPileDisplayOrder(len);
  }
  if (!isOnlyPopsFromEnd(oldPile, newPile)) {
    return createShuffledDrawPileDisplayOrder(len);
  }
  const drawn = oldPile.length - newPile.length;
  let p = [...prevPerm];
  for (let k = 0; k < drawn; k += 1) {
    const removedIdx = oldPile.length - 1 - k;
    p = p.filter((idx) => idx !== removedIdx);
  }
  return p;
}
