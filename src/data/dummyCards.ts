import type { Card, CardType } from '../types/game';

interface CardSeed {
  name: string;
  type: CardType;
  timeCost: number;
  description: string;
}

const CARD_SEEDS: CardSeed[] = [
  { name: '金槌で殴る', type: 'attack', timeCost: 2, description: '6ダメージ' },
  { name: 'ノコギリガード', type: 'skill', timeCost: 2, description: '5ブロック' },
  { name: '足場を組む', type: 'skill', timeCost: 2, description: '足場+1、3ブロック' },
  { name: '釘打ち', type: 'attack', timeCost: 3, description: '8ダメージ+足場×2' },
  { name: '電動ドリル', type: 'attack', timeCost: 3, description: '12ダメージ' },
];

let cardIdCounter = 0;

export const COMMON_SELL_PRICE = 5;

const withId = (seed: CardSeed): Card => {
  cardIdCounter += 1;
  return {
    ...seed,
    id: `card-${cardIdCounter}`,
  };
};

export const createDummyHand = (): Card[] => CARD_SEEDS.map(withId);
