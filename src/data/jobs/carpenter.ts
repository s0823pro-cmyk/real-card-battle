import type { Card } from '../../types/game';
import { CARPENTER_STARTER_DECK, RESERVE_BONUS_CARDS, buildStarterDeck } from '../carpenterDeck';

export const CARPENTER_COMMON_POOL: Card[] = [
  ...CARPENTER_STARTER_DECK,
  {
    id: 'wood_block',
    name: '木材ブロック',
    type: 'skill',
    timeCost: 2,
    block: 7,
    description: '7ブロック',
    icon: '🪵',
    sellValue: 6,
  },
  {
    id: 'quick_hammer',
    name: '速打ち',
    type: 'attack',
    timeCost: 1,
    damage: 4,
    description: '4ダメージ',
    icon: '🔨',
    sellValue: 6,
  },
];

export const CARPENTER_UNCOMMON_POOL: Card[] = [
  ...RESERVE_BONUS_CARDS,
  {
    id: 'blueprint',
    name: '設計図',
    type: 'skill',
    timeCost: 2,
    description: '足場+2',
    effects: [{ type: 'scaffold', value: 2 }],
    icon: '📐',
    sellValue: 10,
  },
  {
    id: 'power_drill',
    name: '電ドリ全開',
    type: 'attack',
    timeCost: 3,
    damage: 12,
    description: '12ダメージ',
    icon: '🔧',
    sellValue: 10,
  },
];

export const CARPENTER_RARE_POOL: Card[] = [
  {
    id: 'mega_nail',
    name: '超釘打ち',
    type: 'attack',
    timeCost: 3,
    damage: 14,
    description: '14ダメージ+足場×2',
    tags: ['scaffold_bonus'],
    icon: '🧨',
    sellValue: 14,
  },
  {
    id: 'iron_wall',
    name: '鉄壁工法',
    type: 'skill',
    timeCost: 2,
    block: 12,
    description: '12ブロック',
    icon: '🧱',
    sellValue: 14,
  },
];

export const createCarpenterStarterDeck = (): Card[] => buildStarterDeck();
