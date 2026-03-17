import type { Card } from '../types/game';
import { shuffle } from './shuffle';

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
      drawPile.push(...shuffle(discardPile));
      discardPile = [];
      shuffled = true;
    }
    if (drawPile.length === 0) break;

    if (nonDrawableIds.size > 0) {
      // ドロー可能なカードを先頭から探す
      const drawableIdx = drawPile.findLastIndex((c) => !nonDrawableIds.has(c.id));
      if (drawableIdx === -1) break;
      const [card] = drawPile.splice(drawableIdx, 1);
      drawn.push(card);
    } else {
      const card = drawPile.pop();
      if (card) drawn.push(card);
    }
  }

  return { drawn, drawPile, discardPile, shuffled };
};
