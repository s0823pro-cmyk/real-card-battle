import type { CardUpgrade } from './carpenterUpgrades';

export const COOK_UPGRADES: Record<string, CardUpgrade> = {
  // 初期デッキ
  '包丁さばき': {
    name: '包丁さばき+',
    damage: 6,
    description: '6ダメージ',
  },
  'エプロン防御': {
    name: 'エプロン防御+',
    block: 7,
    description: '7ブロック',
  },
  '玉ねぎを切る': {
    name: '玉ねぎを切る+',
    description: '調理+2、満腹+1',
    effects: [
      { type: 'cooking_gauge', value: 2 },
      { type: 'fullness_gauge', value: 1 },
    ],
  },
  'フランベ': {
    name: 'フランベ+',
    damage: 4,
    cookingMultiplier: 4,
    description: '4ダメージ+調理×4。使用後調理ゲージ0',
  },
  '仕込み': {
    name: '仕込み+',
    description: '1枚ドロー。調理+2',
    effects: [
      { type: 'draw', value: 1 },
      { type: 'cooking_gauge', value: 2 },
    ],
  },

  // コモン
  'にんにく投げ': {
    name: 'にんにく投げ+',
    damage: 5,
    description: '全体5ダメージ。弱体2ターン',
    effects: [{ type: 'weak', value: 2 }],
  },
  '鉄のフライパン': {
    name: '鉄のフライパン+',
    block: 10,
    description: '10ブロック',
  },
  'まな板ガード': {
    name: 'まな板ガード+',
    block: 8,
    description: '8ブロック。調理+1',
    effects: [{ type: 'cooking_gauge', value: 1 }],
  },
  '肉を叩く': {
    name: '肉を叩く+',
    damage: 10,
    description: '10ダメージ。調理+1、満腹+1',
    effects: [
      { type: 'cooking_gauge', value: 1 },
      { type: 'fullness_gauge', value: 1 },
    ],
  },
  '塩コショウ': {
    name: '塩コショウ+',
    description: '脆弱3ターン。調理+2、満腹+1',
    effects: [
      { type: 'vulnerable', value: 1, duration: 3 },
      { type: 'cooking_gauge', value: 2 },
      { type: 'fullness_gauge', value: 1 },
    ],
  },
  '包丁研ぎ': {
    name: '包丁研ぎ+',
    description: 'このターン、次に使用するアタックカードのダメージ+5。調理+2',
    effects: [
      { type: 'next_attack_damage_boost', value: 5 },
      { type: 'cooking_gauge', value: 2 },
    ],
  },

  // アンコモン
  '激辛ソース': {
    name: '激辛ソース+',
    description: '火傷4ターン。調理+2、満腹+1',
    effects: [
      { type: 'burn', value: 4 },
      { type: 'cooking_gauge', value: 2 },
      { type: 'fullness_gauge', value: 1 },
    ],
  },
  'レシピ研究': {
    name: 'レシピ研究+',
    timeCost: 4,
    description: '食材カードの調理+1',
  },
  '包丁セット': {
    name: '包丁セット+',
    timeCost: 5,
    description: 'アタックカードのダメージ+4',
  },
  '寝かせた生地': {
    name: '寝かせた生地+',
    timeCost: 2.5,
    damage: 6,
    reserveBonus: {
      description: '温存時：12ダメージ、調理+1、満腹+1',
      damageMultiplier: 2.0,
      extraEffects: [
        { type: 'cooking_gauge', value: 1 },
        { type: 'fullness_gauge', value: 1 },
      ],
    },
    description: '6ダメージ、満腹+1。',
  },
  '出前配達': {
    name: '出前配達+',
    timeCost: 4,
    damage: 5,
    description: '5ダメージ×3。使用するたびにコスト-0.5（最小0）',
  },
  '煮込み': {
    name: '煮込み+',
    timeCost: 1.5,
    description: '調理+4、満腹+1',
    effects: [
      { type: 'cooking_gauge', value: 4 },
      { type: 'fullness_gauge', value: 1 },
    ],
  },
  '食材の仕入れ': {
    name: '食材の仕入れ+',
    description: '2枚ドロー、調理+2、満腹+1',
    effects: [
      { type: 'draw', value: 2 },
      { type: 'cooking_gauge', value: 2 },
      { type: 'fullness_gauge', value: 1 },
    ],
  },
  '厨房の鬼': {
    name: '厨房の鬼+',
    timeCost: 4,
    description: '毎ターン調理ゲージ+1',
  },

  // レア
  'フルコース': {
    name: 'フルコース+',
    timeCost: 5,
    cookingMultiplier: 5,
    description: '調理×5。使用後調理ゲージ0。使用後除外',
  },
  '秘伝のスープ': {
    name: '秘伝のスープ+',
    timeCost: 5,
    description: '調理+5、1枚ドロー、満腹+1。使用後除外',
    effects: [
      { type: 'cooking_gauge', value: 5 },
      { type: 'fullness_gauge', value: 1 },
      { type: 'draw', value: 1 },
    ],
  },
  '三ツ星の極意': {
    name: '三ツ星の極意+',
    timeCost: 6,
    description: '毎ターン最初に使用する食材カードのコスト0',
  },
  '闇鍋': {
    name: '闇鍋+',
    timeCost: 5,
    description:
      'ランダム効果：全体25ダメ/単体50ダメ/自分12ダメ/調理+10/自分毒4T。使用後除外',
  },
  '炎のフランベ': {
    name: '炎のフランベ+',
    damage: 6,
    cookingMultiplier: 4,
    description: '全体6ダメージ+調理×4。使用後調理ゲージ0',
  },
};
