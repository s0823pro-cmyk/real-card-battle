import type { CardUpgrade } from './carpenterUpgrades';
import { NEUTRAL_EXPANSION_UPGRADES } from './neutralExpansionUpgrades';

export const NEUTRAL_UPGRADES: Record<string, CardUpgrade> = {
  深呼吸: {
    name: '深呼吸+',
    description: 'カード3枚ドロー（所要時間0.5秒）',
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
    timeCost: 2,
    description: '次のカードの効果+50%。（除外なし）',
    badges: [],
    effects: [{ type: 'concentration_next', value: 1 }],
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
    timeCost: 4,
    damage: 12,
    lowHpBonus: { threshold: 0.5, damage: 20 },
    description: '12ダメージ。HP50%以下で20ダメージ（その場合使用後除外）',
    badges: ['oikomi'],
  },
  奇跡の一手: {
    name: '奇跡の一手+',
    damage: 40,
    description: '40ダメージ（所要時間6秒）',
  },
  底力: {
    name: '底力+',
    description: '毎ターンカード+2枚ドロー（所要時間5秒）',
    effects: [{ type: 'draw_per_turn', value: 2 }],
  },

  ...NEUTRAL_EXPANSION_UPGRADES,
};
