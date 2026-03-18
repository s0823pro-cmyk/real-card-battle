import type { CardEffect, LowHpBonus } from '../../types/game';

export interface CardUpgrade {
  name: string;
  damage?: number;
  block?: number;
  timeCost?: number;
  scaffoldMultiplier?: number;
  cookingMultiplier?: number;
  lowHpBonus?: LowHpBonus;
  reserveBonus?: {
    description?: string;
    damageMultiplier?: number;
    blockMultiplier?: number;
    extraEffects?: CardEffect[];
  };
  description: string;
  effects?: CardEffect[];
  tags?: string[];
}

export const CARPENTER_UPGRADES: Record<string, CardUpgrade> = {
  // 初期デッキ
  '金槌で殴る': {
    name: '金槌で殴る+',
    damage: 9,
    description: '9ダメージ',
  },
  'ノコギリガード': {
    name: 'ノコギリガード+',
    block: 8,
    description: '8ブロック',
  },
  '足場を組む': {
    name: '足場を組む+',
    block: 3,
    timeCost: 1,
    description: '足場+2、3ブロック（所要時間1秒）',
    effects: [{ type: 'scaffold', value: 2 }],
  },
  '釘打ち': {
    name: '釘打ち+',
    damage: 10,
    scaffoldMultiplier: 3,
    description: '10ダメージ+足場×3',
  },
  '作業着を着る': {
    name: '作業着を着る+',
    block: 0,
    description: '毎ターン+3ブロック',
    effects: [{ type: 'block_per_turn', value: 3 }],
  },

  // コモン
  '電動ドリル': {
    name: '電動ドリル+',
    damage: 16,
    description: '16ダメージ',
  },
  '木材ブロック': {
    name: '木材ブロック+',
    block: 10,
    description: '10ブロック、足場+2',
    effects: [{ type: 'scaffold', value: 2 }],
  },
  '設計図を描く': {
    name: '設計図を描く+',
    timeCost: 0,
    description: 'カード3枚ドロー（所要時間0秒）',
    effects: [{ type: 'draw', value: 3 }],
  },
  '墨出し': {
    name: '墨出し+',
    description: '次のアタックの所要時間-3秒',
    effects: [{ type: 'next_attack_time_reduce', value: 3 }],
  },
  '速打ち': {
    name: '速打ち+',
    damage: 6,
    description: '6ダメージ',
  },
  '補強壁': {
    name: '補強壁+',
    block: 8,
    timeCost: 1,
    description: '8ブロック。温存時：16ブロック（所要時間1秒）',
  },

  // アンコモン
  '乾燥させた木材': {
    name: '乾燥させた木材+',
    damage: 14,
    description: '14ダメージ。温存時：28ダメージ',
  },
  '研いだノコギリ': {
    name: '研いだノコギリ+',
    damage: 8,
    reserveBonus: {
      damageMultiplier: 2.0,
      extraEffects: [{ type: 'scaffold', value: 2 }],
    },
    description: '8ダメージ。温存時：16ダメージ+足場+2',
  },
  '大型クレーン': {
    name: '大型クレーン+',
    damage: 20,
    timeCost: 4,
    description: '全体20ダメージ。段取り時：3秒',
  },
  '防護壁を建てる': {
    name: '防護壁を建てる+',
    block: 26,
    timeCost: 3,
    description: '26ブロック、足場+3（所要時間3秒）',
    effects: [{ type: 'scaffold', value: 3 }],
  },
  '建設現場の親方': {
    name: '建設現場の親方+',
    description: '毎ターン足場+2',
    effects: [{ type: 'scaffold_per_turn', value: 2 }],
  },
  '鉄筋コンクリート': {
    name: '鉄筋コンクリート+',
    timeCost: 2,
    description: '2ターンブロックが消えない（所要時間2秒）',
    effects: [{ type: 'block_persist', value: 2 }],
  },
  '安全ヘルメット': {
    name: '安全ヘルメット+',
    description: '毎ターン+5ブロック',
    effects: [{ type: 'block_per_turn', value: 5 }],
  },
  '鉄壁工法': {
    name: '鉄壁工法+',
    block: 18,
    description: '18ブロック',
  },

  // レア
  '超釘打ち': {
    name: '超釘打ち+',
    timeCost: 3.5,
    damage: 2,
    scaffoldMultiplier: 2,
    description: '2ダメージ+足場×2ダメージ',
  },
  '棟上げ': {
    name: '棟上げ+',
    description: '足場4以上で毎ターン全敵に12ダメージ',
    effects: [
      { type: 'ridgepole_threshold', value: 4 },
      { type: 'ridgepole_damage', value: 12 },
    ],
  },
  '宮大工の技': {
    name: '宮大工の技+',
    timeCost: 5,
    description: '段取りボーナスが1.8倍に強化（所要時間5秒）',
  },
  'リフォーム': {
    name: 'リフォーム+',
    timeCost: 1,
    description: '手札のカード2枚をランダムで強化。使用後除外',
    effects: [{ type: 'upgrade_random_hand_card', value: 2 }],
  },
  '匠の一撃': {
    name: '匠の一撃+',
    timeCost: 3,
    scaffoldMultiplier: 6,
    tags: ['scaffold_consume', 'exhaust'],
    description: '足場×6ダメージ、足場を全消費。使用後除外。段取り時：2秒',
  },
};
