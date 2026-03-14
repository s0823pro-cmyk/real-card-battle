import type { Card } from '../types/game';
import { shuffle } from './shuffle';

interface DrawResult {
  drawn: Card[];
  drawPile: Card[];
  discardPile: Card[];
}

export const drawCards = (
  drawPileInput: Card[],
  discardPileInput: Card[],
  count: number,
): DrawResult => {
  const drawPile = [...drawPileInput];
  let discardPile = [...discardPileInput];
  const drawn: Card[] = [];

  for (let i = 0; i < count; i += 1) {
    if (drawPile.length === 0 && discardPile.length > 0) {
      drawPile.push(...shuffle(discardPile));
      discardPile = [];
    }
    if (drawPile.length === 0) break;
    const card = drawPile.pop();
    if (card) drawn.push(card);
  }

  return { drawn, drawPile, discardPile };
};
