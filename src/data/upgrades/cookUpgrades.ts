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
    block: 8,
    description: '8ブロック',
  },
  '玉ねぎを切る': {
    name: '玉ねぎを切る+',
    damage: 6,
    description: '6ダメージ、調理+2',
    effects: [{ type: 'cooking_gauge', value: 2 }],
  },
  'フランベ': {
    name: 'フランベ+',
    damage: 10,
    description: '10ダメージ+調理×4',
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
    damage: 7,
    description: '7ダメージ、弱体2付与、調理+1',
    effects: [
      { type: 'weak', value: 2 },
      { type: 'cooking_gauge', value: 1 },
    ],
  },
  '鉄のフライパン': {
    name: '鉄のフライパン+',
    damage: 12,
    description: '12ダメージ',
  },
  'まな板ガード': {
    name: 'まな板ガード+',
    block: 8,
    description: '8ブロック、次の食材+5ダメージ',
    effects: [{ type: 'next_ingredient_bonus', value: 5 }],
  },
  '肉を叩く': {
    name: '肉を叩く+',
    damage: 10,
    timeCost: 1,
    description: '10ダメージ、調理+2（所要時間1秒）',
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
    description: '次のアタックカード+8ダメージ、調理+1（所要時間0秒）',
    effects: [
      { type: 'next_attack_damage_boost', value: 8 },
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
    damage: 10,
    description: '10ダメージ。温存時：22ダメージ、調理+3',
  },
  '出前配達': {
    name: '出前配達+',
    damage: 5,
    description: 'ランダム敵に5ダメージ×4回',
    effects: [{ type: 'hit_count', value: 4 }],
  },
  '煮込み': {
    name: '煮込み+',
    timeCost: 1,
    description: '調理+4、HP8回復（所要時間1秒）',
    effects: [
      { type: 'cooking_gauge', value: 4 },
      { type: 'heal', value: 8 },
    ],
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
    description: '調理ゲージ×8ダメージ（所要時間4秒）',
  },
  '秘伝のスープ': {
    name: '秘伝のスープ+',
    timeCost: 2,
    description: 'HP15回復、調理+4（所要時間2秒）',
    effects: [
      { type: 'heal', value: 15 },
      { type: 'cooking_gauge', value: 4 },
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
    description: 'ランダムで20〜40ダメージ（所要時間2秒）',
  },
  '炎のフランベ': {
    name: '炎のフランベ+',
    damage: 15,
    timeCost: 3,
    description: '15ダメージ+調理×5。全体攻撃（所要時間3秒）',
  },
};
