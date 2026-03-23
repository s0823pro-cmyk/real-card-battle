import type { CardUpgrade } from './carpenterUpgrades';

export const NEUTRAL_EXPANSION_UPGRADES: Record<string, CardUpgrade> = {
  肩の力を抜く: {
    name: '肩の力を抜く+',
    description: 'メンタル+2。最大時間+1秒',
    effects: [
      { type: 'mental_boost', value: 2 },
      { type: 'time_boost', value: 1 },
    ],
  },
  体勢を立て直す: {
    name: '体勢を立て直す+',
    block: 7,
    timeCost: 1.5,
    description: '7ブロック（所要時間1.5秒）',
  },
  一呼吸: {
    name: '一呼吸+',
    timeCost: 0,
    description: 'カード2枚ドロー（所要時間0秒）',
    effects: [{ type: 'draw', value: 2 }],
  },
  気合を入れる: {
    name: '気合を入れる+',
    description: '次の攻撃3回+3ダメージ',
    effects: [{ type: 'attack_buff', value: 3, duration: 3 }],
  },
  牽制: {
    name: '牽制+',
    description: '敵に弱体3ターン',
    effects: [{ type: 'weak', value: 1, duration: 3 }],
  },
  急制動: {
    name: '急制動+',
    block: 4,
    description: '4ブロック。次のアタックの所要時間-2秒',
    effects: [{ type: 'next_attack_time_reduce', value: 2 }],
  },
  踏ん張り: {
    name: '踏ん張り+',
    block: 8,
    timeCost: 2,
    description: '8ブロック（所要時間2秒）',
  },
  目を閉じる: {
    name: '目を閉じる+',
    description: 'メンタル+2',
    effects: [{ type: 'mental_boost', value: 2 }],
  },
  小休憩: {
    name: '小休憩+',
    timeCost: 2.5,
    description: 'カード3枚ドロー（所要時間2.5秒）',
    effects: [{ type: 'draw', value: 3 }],
  },
  余裕の微笑み: {
    name: '余裕の微笑み+',
    description: '敵に脆弱3ターン',
    effects: [{ type: 'vulnerable', value: 1, duration: 3 }],
  },

  本気モード: {
    name: '本気モード+',
    description: 'HP半分以下のとき、このターンの攻撃ダメージ+8',
    effects: [{ type: 'low_hp_damage_boost', value: 8 }],
  },
  鉄の意思: {
    name: '鉄の意思+',
    timeCost: 4,
    description: 'このターン受けるダメージを無効化（所要時間4秒）',
  },
  読み合い: {
    name: '読み合い+',
    description: 'HP2消費、カード4枚ドロー',
    effects: [
      { type: 'self_damage', value: 2 },
      { type: 'draw', value: 4 },
    ],
  },
  カウンターの構え: {
    name: 'カウンターの構え+',
    description: '次のアタックのダメージ+11',
    effects: [{ type: 'next_attack_damage_boost', value: 11 }],
  },
  静かな覚悟: {
    name: '静かな覚悟+',
    description: 'メンタル+3。最大時間+1秒',
    effects: [
      { type: 'mental_boost', value: 3 },
      { type: 'time_boost', value: 1 },
    ],
  },
  静かな障壁: {
    name: '静かな障壁+',
    block: 12,
    timeCost: 2.5,
    description: '12ブロック。次のターン開始時、時間ペナルティ+1秒',
    effects: [{ type: 'next_turn_time_penalty', value: 1 }],
  },
  虎の視線: {
    name: '虎の視線+',
    description: '敵の攻撃力を4下げる3ターン',
    effects: [{ type: 'debuff_enemy_atk', value: 4, duration: 3 }],
  },
  再起動: {
    name: '再起動+',
    timeCost: 2.5,
    block: 5,
    description: '5ブロック、カード3枚ドロー、メンタル+2（所要時間2.5秒）',
    effects: [
      { type: 'draw', value: 3 },
      { type: 'mental_boost', value: 2 },
    ],
  },

  心身の調律: {
    name: '心身の調律+',
    timeCost: 5,
    description: '毎ターンカード+2枚ドロー、メンタル+1（プレイ時）',
    effects: [
      { type: 'draw_per_turn', value: 2 },
      { type: 'mental_boost', value: 1 },
    ],
  },
  逆境の才能: {
    name: '逆境の才能+',
    timeCost: 4,
    description: 'HP半分以下のとき、このターンの攻撃ダメージ+11（プレイ時に付与）',
    effects: [{ type: 'low_hp_damage_boost', value: 11 }],
  },
  ラストワード: {
    name: 'ラストワード+',
    damage: 40,
    timeCost: 5,
    description: '40ダメージ。使用後除外（所要時間5秒）',
  },
};
