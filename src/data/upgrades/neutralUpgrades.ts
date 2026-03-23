import type { CardUpgrade } from './carpenterUpgrades';
import { NEUTRAL_EXPANSION_UPGRADES } from './neutralExpansionUpgrades';

export const NEUTRAL_UPGRADES: Record<string, CardUpgrade> = {
  深呼吸: {
    name: '深呼吸+',
    timeCost: 0,
    description: 'カード3枚ドロー（所要時間0秒）',
    effects: [{ type: 'draw', value: 3 }],
  },
  全力疾走: {
    name: '全力疾走+',
    damage: 14,
    description: '14ダメージ',
  },
  応急処置: {
    name: '応急処置+',
    timeCost: 7,
    description: 'HP5回復。使用後除外しない。',
    effects: [{ type: 'heal', value: 5 }],
    tags: [],
  },
  かわす: {
    name: 'かわす+',
    block: 12,
    timeCost: 1,
    description: '12ブロック（所要時間1秒）',
  },
  集中力: {
    name: '集中力+',
    timeCost: 1,
    description: '通常使用で次のカード効果+20%（捨て札）。温存すると次のカード効果が2倍で、使用後は除外。（所要時間1秒）',
  },
  根性見せろ: {
    name: '根性見せろ+',
    description: 'HP3消費、カード4枚ドロー',
    effects: [
      { type: 'self_damage', value: 3 },
      { type: 'draw', value: 4 },
    ],
  },
  起死回生: {
    name: '起死回生+',
    damage: 18,
    lowHpBonus: { threshold: 0.3, damage: 32 },
    description: '18ダメージ。HP30%以下で32ダメージ',
  },
  奇跡の一手: {
    name: '奇跡の一手+',
    damage: 40,
    timeCost: 5,
    description: '40ダメージ（所要時間5秒）',
  },
  底力: {
    name: '底力+',
    timeCost: 4,
    description: '毎ターンカード+2枚ドロー（所要時間4秒）',
    effects: [{ type: 'draw_per_turn', value: 2 }],
  },

  ...NEUTRAL_EXPANSION_UPGRADES,
};
