import type { CardUpgrade } from './carpenterUpgrades';

export const UNEMPLOYED_UPGRADES: Record<string, CardUpgrade> = {
  // 初期デッキ
  '素手で殴る': {
    name: '素手で殴る+',
    damage: 8,
    description: '8ダメージ',
  },
  '段ボールの盾': {
    name: '段ボールの盾+',
    block: 7,
    description: '7ブロック',
  },
  '土下座': {
    name: '土下座+',
    description: '敵1体の攻撃力-4（3ターン）',
    effects: [{ type: 'debuff_enemy_atk', value: 4, duration: 3 }],
  },
  '気合い': {
    name: '気合い+',
    description: '自分にダメージ3、タイムバー+3秒',
    effects: [
      { type: 'self_damage', value: 3 },
      { type: 'time_boost', value: 3 },
    ],
  },
  'ヤケクソパンチ': {
    name: 'ヤケクソパンチ+',
    timeCost: 3,
    damage: 20,
    description: '20ダメージ。手札にこのカード以外があると使用不可',
  },

  // コモン
  '空き缶投げ': {
    name: '空き缶投げ+',
    damage: 4,
    description: '4ダメージ×2回',
    effects: [{ type: 'hit_count', value: 2 }],
  },
  '新聞紙アーマー': {
    name: '新聞紙アーマー+',
    block: 5,
    timeCost: 1,
    description: '5ブロック、カード2枚ドロー（所要時間1秒）',
    effects: [{ type: 'draw', value: 2 }],
  },
  '傘で突く': {
    name: '傘で突く+',
    damage: 9,
    block: 4,
    description: '9ダメージ、4ブロック',
  },
  'ハローワークへ行く': {
    name: 'ハローワークへ行く+',
    description: 'カード4枚ドロー、次ターンタイムバー-1秒',
    effects: [
      { type: 'draw', value: 4 },
      { type: 'next_turn_time_penalty', value: 1 },
    ],
  },
  '自販機キック': {
    name: '自販機キック+',
    damage: 6,
    description: '6ダメージ、50%で+15G',
  },
  '居直り': {
    name: '居直り+',
    description: 'このターン受けるダメージを0にする。次ターンブロック半減',
    effects: [
      { type: 'damage_immunity_this_turn', value: 1 },
      { type: 'next_turn_block_half', value: 1 },
    ],
  },

  // アンコモン
  '生活保護申請': {
    name: '生活保護申請+',
    timeCost: 2,
    description: 'メンタル+3、カード2枚ドロー（所要時間2秒）',
    effects: [
      { type: 'mental_boost', value: 3 },
      { type: 'draw', value: 2 },
    ],
  },
  '段ボールハウス': {
    name: '段ボールハウス+',
    description: '毎ターン4ブロック。覚醒中は10ブロック',
    effects: [{ type: 'block_per_turn_awakened', value: 10, normalValue: 4 }],
  },
  '面接練習': {
    name: '面接練習+',
    timeCost: 1,
    description: '次に使うカードを2回発動（所要時間1秒）',
  },
  '100円ライター': {
    name: '100円ライター+',
    description: 'アタック使用時35%で火傷3付与',
    effects: [{ type: 'lighter_chance', value: 0.35, burnValue: 3 }],
  },
  '根性': {
    name: '根性+',
    description: '自分にダメージ8、次3回のアタック+6',
    effects: [
      { type: 'self_damage', value: 8 },
      { type: 'next_attack_boost', value: 6, count: 3 },
    ],
  },
  '火事場の馬鹿力': {
    name: '火事場の馬鹿力+',
    description: '減っているHP×0.7ダメージ。覚醒中：×1.0',
  },
  'やけ酒': {
    name: 'やけ酒+',
    description: 'メンタル+3、自分に3ダメージ',
    effects: [
      { type: 'mental_boost', value: 3 },
      { type: 'self_damage', value: 3 },
    ],
  },
  '開き直り': {
    name: '開き直り+',
    description: 'HP60%以下の時、全カード+3ダメージ追加',
    effects: [{ type: 'low_hp_damage_boost', value: 3, threshold: 0.6 }],
  },

  // レア
  '一発逆転ギャンブル': {
    name: '一発逆転ギャンブル+',
    timeCost: 1,
    description: '50%で敵に35ダメージ、50%で自分に8ダメージ（所要時間1秒）',
  },
  '七転び八起き': {
    name: '七転び八起き+',
    timeCost: 3,
    description: '戦闘不能時HP10で1回復活（所要時間3秒）',
  },
  'デスウィッシュ': {
    name: 'デスウィッシュ+',
    timeCost: 2,
    description: 'HP回復を全て無効化。毎ターン全カード+6ダメージ（所要時間2秒）',
  },
  '崖っぷちの底力': {
    name: '崖っぷちの底力+',
    timeCost: 4,
    description: '覚醒中：毎ターンカード3枚追加ドロー＋タイムバー+2秒（所要時間4秒）',
  },
  'リベンジ': {
    name: 'リベンジ+',
    timeCost: 1,
    description: '前ターンに受けたダメージ×1.3の攻撃。覚醒中：1.8倍（所要時間1秒）',
  },
};
