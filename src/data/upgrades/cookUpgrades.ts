import type { CardUpgrade } from './carpenterUpgrades';

export const COOK_UPGRADES: Record<string, CardUpgrade> = {
  // 初期デッキ
  '包丁さばき': {
    name: '包丁さばき+',
    damage: 9,
    description: '9ダメージ',
  },
  'エプロン防御': {
    name: 'エプロン防御+',
    block: 7,
    description: '7ブロック',
  },
  '玉ねぎを切る': {
    name: '玉ねぎを切る+',
    damage: 6,
    description: '6ダメージ、調理+2',
    effects: [{ type: 'cooking_gauge', value: 2 }],
  },
  'フランベ': {
    name: 'フランベ+',
    damage: 6,
    cookingMultiplier: 4,
    description: '6ダメージ+調理×4。使用後調理ゲージ0',
  },
  '仕込み': {
    name: '仕込み+',
    timeCost: 0,
    description: 'カード2枚ドロー、調理+1（所要時間0秒）',
    effects: [
      { type: 'draw', value: 2 },
      { type: 'cooking_gauge', value: 1 },
    ],
  },

  // コモン
  'にんにく投げ': {
    name: 'にんにく投げ+',
    damage: 5,
    description: '5ダメージ、弱体2付与、調理+1',
    effects: [
      { type: 'weak', value: 2 },
      { type: 'cooking_gauge', value: 1 },
    ],
  },
  '鉄のフライパン': {
    name: '鉄のフライパン+',
    damage: 10,
    description: '10ダメージ',
  },
  'まな板ガード': {
    name: 'まな板ガード+',
    block: 7,
    description: '7ブロック、次の食材+5ダメージ',
    effects: [{ type: 'next_ingredient_bonus', value: 5 }],
  },
  '肉を叩く': {
    name: '肉を叩く+',
    damage: 8,
    timeCost: 1,
    description: '8ダメージ、調理+2（所要時間1秒）',
    effects: [{ type: 'cooking_gauge', value: 2 }],
  },
  '塩コショウ': {
    name: '塩コショウ+',
    description: '敵に脆弱3付与、調理+2',
    effects: [
      { type: 'vulnerable', value: 3 },
      { type: 'cooking_gauge', value: 2 },
    ],
  },
  '包丁研ぎ': {
    name: '包丁研ぎ+',
    timeCost: 0,
    description: '次のアタックカード+6ダメージ、調理+1（所要時間0秒）',
    effects: [
      { type: 'next_attack_damage_boost', value: 6 },
      { type: 'cooking_gauge', value: 1 },
    ],
  },

  // アンコモン
  '激辛ソース': {
    name: '激辛ソース+',
    description: '敵に火傷5付与、調理+2',
    effects: [
      { type: 'burn', value: 5 },
      { type: 'cooking_gauge', value: 2 },
    ],
  },
  'レシピ研究': {
    name: 'レシピ研究+',
    timeCost: 3,
    description: '食材カード使用ごとに全アタック+3（所要時間3秒）',
  },
  '包丁セット': {
    name: '包丁セット+',
    timeCost: 3,
    description: '全アタック+3ダメージ（所要時間3秒）',
  },
  '寝かせた生地': {
    name: '寝かせた生地+',
    damage: 8,
    reserveBonus: {
      damageMultiplier: 2.0,
      extraEffects: [{ type: 'cooking_gauge', value: 3 }],
    },
    description: '8ダメージ。温存時：16ダメージ、調理+3',
  },
  '出前配達': {
    name: '出前配達+',
    damage: 4,
    description: 'ランダム敵に4ダメージ×4回',
    effects: [{ type: 'hit_count', value: 4 }],
  },
  '煮込み': {
    name: '煮込み+',
    timeCost: 1,
    description: '調理+6（所要時間1秒）',
    effects: [{ type: 'cooking_gauge', value: 6 }],
  },
  '食材の仕入れ': {
    name: '食材の仕入れ+',
    timeCost: 1,
    description: 'カード3枚ドロー、調理+2（所要時間1秒）',
    effects: [
      { type: 'draw', value: 3 },
      { type: 'cooking_gauge', value: 2 },
    ],
  },
  '厨房の鬼': {
    name: '厨房の鬼+',
    timeCost: 3,
    description: '毎ターン最初の調理カードの調理倍率+3（所要時間3秒）',
  },

  // レア
  'フルコース': {
    name: 'フルコース+',
    timeCost: 4,
    cookingMultiplier: 8,
    description: '調理ゲージ×8ダメージ（所要時間4秒）',
  },
  '秘伝のスープ': {
    name: '秘伝のスープ+',
    timeCost: 2,
    description: '調理+8、カード2枚ドロー（所要時間2秒）',
    effects: [
      { type: 'cooking_gauge', value: 8 },
      { type: 'draw', value: 2 },
    ],
  },
  '三ツ星の極意': {
    name: '三ツ星の極意+',
    timeCost: 4,
    description: '最初の食材カード0秒・次の食材カード-1秒（所要時間4秒）',
  },
  '闇鍋': {
    name: '闇鍋+',
    timeCost: 2,
    description: 'ランダムで10〜25ダメージ（所要時間2秒）',
  },
  '炎のフランベ': {
    name: '炎のフランベ+',
    damage: 12,
    timeCost: 3,
    cookingMultiplier: 5,
    description: '12ダメージ+調理×5。全体攻撃（所要時間3秒）',
  },
};
