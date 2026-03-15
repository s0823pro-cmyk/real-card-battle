import type { Card } from '../../types/game';
import deepBreathImage from '../../assets/cards/neutral/deep_breath.png';
import fullSprintImage from '../../assets/cards/neutral/full_sprint.png';
import firstAidImage from '../../assets/cards/neutral/first_aid.png';
import dodgeImage from '../../assets/cards/neutral/dodge.png';
import focusImage from '../../assets/cards/neutral/focus.png';
import gutsShowImage from '../../assets/cards/neutral/guts_show.png';
import comebackImage from '../../assets/cards/neutral/comeback.png';
import miracleImage from '../../assets/cards/neutral/miracle.png';
import hiddenPowerImage from '../../assets/cards/neutral/hidden_power.png';

export const NEUTRAL_CARD_POOL: Card[] = [
  {
    id: 'deep_breath',
    name: '深呼吸',
    type: 'skill',
    timeCost: 1,
    description: 'カード2枚ドロー',
    icon: '💨',
    rarity: 'common',
    sellValue: 5,
    neutral: true,
    effects: [{ type: 'draw', value: 2 }],
    imageUrl: deepBreathImage,
  },
  {
    id: 'full_sprint',
    name: '全力疾走',
    type: 'attack',
    timeCost: 2,
    description: '10ダメージ',
    damage: 10,
    icon: '🏃',
    rarity: 'common',
    sellValue: 5,
    neutral: true,
    imageUrl: fullSprintImage,
  },
  {
    id: 'first_aid',
    name: '応急処置',
    type: 'skill',
    timeCost: 2,
    description: 'HP8回復',
    icon: '🩹',
    rarity: 'common',
    sellValue: 5,
    neutral: true,
    effects: [{ type: 'heal', value: 8 }],
    imageUrl: firstAidImage,
  },
  {
    id: 'dodge',
    name: 'かわす',
    type: 'skill',
    timeCost: 2,
    description: '8ブロック',
    block: 8,
    icon: '💨',
    rarity: 'common',
    sellValue: 5,
    neutral: true,
    imageUrl: dodgeImage,
  },
  {
    id: 'focus',
    name: '集中力',
    type: 'skill',
    timeCost: 2,
    description: '次のカードの効果を2倍',
    icon: '🎯',
    rarity: 'uncommon',
    sellValue: 12,
    neutral: true,
    effects: [{ type: 'double_next', value: 1 }],
    imageUrl: focusImage,
  },
  {
    id: 'guts',
    name: '根性見せろ',
    type: 'skill',
    timeCost: 2,
    description: 'HP5消費、カード3枚ドロー',
    icon: '😤',
    rarity: 'uncommon',
    sellValue: 12,
    neutral: true,
    effects: [
      { type: 'self_damage', value: 5 },
      { type: 'draw', value: 3 },
    ],
    imageUrl: gutsShowImage,
  },
  {
    id: 'comeback',
    name: '起死回生',
    type: 'attack',
    timeCost: 3,
    description: '15ダメージ。HP30%以下で25ダメージ',
    damage: 15,
    icon: '⚡',
    rarity: 'uncommon',
    sellValue: 12,
    neutral: true,
    tags: ['low_hp_bonus'],
    lowHpBonus: { threshold: 0.3, damage: 25 },
    imageUrl: comebackImage,
  },
  {
    id: 'miracle',
    name: '奇跡の一手',
    type: 'attack',
    timeCost: 4,
    description: '30ダメージ',
    damage: 30,
    icon: '✨',
    rarity: 'rare',
    sellValue: 25,
    neutral: true,
    imageUrl: miracleImage,
  },
  {
    id: 'hidden_power',
    name: '底力',
    type: 'power',
    timeCost: 5,
    description: '毎ターンカード+1枚ドロー',
    icon: '🔥',
    rarity: 'rare',
    sellValue: 25,
    neutral: true,
    effects: [{ type: 'draw_per_turn', value: 1 }],
    imageUrl: hiddenPowerImage,
  },
];

export const NEUTRAL_COMMON_POOL = NEUTRAL_CARD_POOL.filter((card) => card.rarity === 'common');
export const NEUTRAL_UNCOMMON_POOL = NEUTRAL_CARD_POOL.filter((card) => card.rarity === 'uncommon');
export const NEUTRAL_RARE_POOL = NEUTRAL_CARD_POOL.filter((card) => card.rarity === 'rare');
