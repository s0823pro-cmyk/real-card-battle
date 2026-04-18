import type { CardUpgrade } from './carpenterUpgrades';

/** 料理人拡張コモンのアップグレード（カード名キー） */
export const COOK_EXPANSION_UPGRADES: Record<string, CardUpgrade> = {
  玉ねぎ: {
    name: '玉ねぎ+',
    description: '満腹+1。ドロー2',
    effects: [
      { type: 'draw', value: 2 },
      { type: 'fullness_gauge', value: 1 },
    ],
  },
  じゃがいも: {
    name: 'じゃがいも+',
    block: 6,
    description: '満腹+1。ブロック6',
    effects: [{ type: 'fullness_gauge', value: 1 }],
  },
  卵投げ: {
    name: '卵投げ+',
    damage: 8,
    description: '8ダメージ。満腹+1。毒1',
    effects: [
      { type: 'fullness_gauge', value: 1 },
      { type: 'enemy_poison', value: 1 },
    ],
  },
  キノコ: {
    name: 'キノコ+',
    description: '満腹+1。火傷3',
    effects: [{ type: 'fullness_gauge', value: 1 }, { type: 'burn', value: 3 }],
  },
  トマト: {
    name: 'トマト+',
    description: '満腹+1。ドロー1。使い捨て',
    effects: [{ type: 'fullness_gauge', value: 1 }, { type: 'draw', value: 1 }],
  },
  魚: {
    name: '魚+',
    timeCost: 1,
    description: '所要時間1秒。満腹+1。ブロック6',
    block: 6,
    effects: [{ type: 'fullness_gauge', value: 1 }],
  },
  下ごしらえ: {
    name: '下ごしらえ+',
    timeCost: 1.5,
    description: '所要時間1.5秒。調理ゲージ+3',
    effects: [{ type: 'cooking_gauge', value: 3 }],
  },
  とうがらし投げ: {
    name: 'とうがらし投げ+',
    timeCost: 1.5,
    damage: 9,
    description: '9ダメージ。調理ゲージ+1。火傷1',
    effects: [
      { type: 'cooking_gauge', value: 1 },
      { type: 'burn', value: 1 },
    ],
  },
  煮込む: {
    name: '煮込む+',
    timeCost: 2.5,
    description: '所要時間2.5秒。調理ゲージ+4',
    effects: [{ type: 'cooking_gauge', value: 4 }],
  },
  炒める: {
    name: '炒める+',
    timeCost: 1.5,
    description: '所要時間1.5秒。調理ゲージ+2。火傷1',
    effects: [
      { type: 'cooking_gauge', value: 2 },
      { type: 'burn', value: 1 },
    ],
  },
  盛り付け: {
    name: '盛り付け+',
    timeCost: 1.5,
    block: 6,
    description: '所要時間1.5秒。調理ゲージ+2。ブロック6',
    effects: [{ type: 'cooking_gauge', value: 2 }],
  },
  味見: {
    name: '味見+',
    timeCost: 0.5,
    description: '所要時間0.5秒。調理ゲージ+2。使い捨て',
    effects: [{ type: 'cooking_gauge', value: 2 }],
  },
  エプロン: {
    name: 'エプロン+',
    block: 9,
    description: '9ブロック',
  },
  鍋蓋: {
    name: '鍋蓋+',
    block: 8,
    description: '8ブロック。調理ゲージ+1',
    effects: [{ type: 'cooking_gauge', value: 1 }],
  },
  厚手グローブ: {
    name: '厚手グローブ+',
    block: 15,
    description: '15ブロック',
  },
  食器棚倒し: {
    name: '食器棚倒し+',
    damage: 14,
    description: '全体14ダメージ。ドロー1',
    effects: [{ type: 'draw', value: 1 }],
  },
  ミゼン: {
    name: 'ミゼン+',
    description: 'ドロー3',
    effects: [{ type: 'draw', value: 3 }],
  },
  食材補充: {
    name: '食材補充+',
    description: '捨て札から食材カード2枚を手札に',
    effects: [{ type: 'pick_from_discard_ingredient', value: 2 }],
  },
  腐り食材投げ: {
    name: '腐り食材投げ+',
    timeCost: 2,
    damage: 5,
    description: '全体5ダメージ。火傷3。毒3',
    effects: [
      { type: 'burn', value: 3 },
      { type: 'enemy_poison', value: 3 },
    ],
  },
  賄い: {
    name: '賄い+',
    timeCost: 1,
    description: '所要時間1秒。ドロー3。使い捨て',
    effects: [{ type: 'draw', value: 3 }],
  },
  包丁投げ: {
    name: '包丁投げ+',
    damage: 8,
    description: 'ランダムな2体に8ダメージ',
  },
  フライパン振り: {
    name: 'フライパン振り+',
    damage: 14,
    description: '14ダメージ',
  },

  // アンコモン拡張
  高級肉: {
    name: '高級肉+',
    timeCost: 1.5,
    description: '満腹+1。調理ゲージ+2',
    effects: [
      { type: 'fullness_gauge', value: 1 },
      { type: 'cooking_gauge', value: 2 },
    ],
  },
  きのこ鍋: {
    name: 'きのこ鍋+',
    block: 12,
    description: '満腹+1。ブロック12',
    effects: [{ type: 'fullness_gauge', value: 1 }],
  },
  解毒スープ: {
    name: '解毒スープ+',
    description: '自分が毒状態なら毒を回復。ドロー1',
    effects: [
      { type: 'clear_player_poison', value: 1 },
      { type: 'draw', value: 1 },
    ],
  },
  ガスボンベ殴り: {
    name: 'ガスボンベ殴り+',
    timeCost: 2.5,
    damage: 15,
    description: '15ダメージ',
  },
  圧力鍋: {
    name: '圧力鍋+',
    block: 8,
    description: '調理ゲージ+4。ブロック8',
    effects: [{ type: 'cooking_gauge', value: 4 }],
  },
  隠し味: {
    name: '隠し味+',
    description: '調理ゲージ+3',
    effects: [{ type: 'cooking_gauge', value: 3 }],
  },
  仕上げ: {
    name: '仕上げ+',
    description: '調理ゲージ+2。敵に毒3',
    effects: [
      { type: 'cooking_gauge', value: 2 },
      { type: 'enemy_poison', value: 3 },
    ],
  },
  防炎エプロン: {
    name: '防炎エプロン+',
    block: 16,
    description: 'ブロック16。自分が火傷状態なら火傷を回復',
    effects: [{ type: 'clear_player_burn', value: 1 }],
  },
  まな板ガード2: {
    name: 'まな板ガード2+',
    block: 10,
    description: 'ブロック10。調理ゲージ+1',
    effects: [{ type: 'cooking_gauge', value: 1 }],
  },
  寸胴鍋: {
    name: '寸胴鍋+',
    block: 20,
    description: 'ブロック20。調理ゲージ+2',
    effects: [{ type: 'cooking_gauge', value: 2 }],
  },
  テンパリング: {
    name: 'テンパリング+',
    timeCost: 1.5,
    description: '調理ゲージ×1ダメージ。使用後ゲージ半分消費',
    cookingMultiplier: 1,
  },
  下処理: {
    name: '下処理+',
    description: '手札の食材カード2枚をこの戦闘中＋に強化',
    effects: [{ type: 'upgrade_ingredient_hand', value: 2 }],
  },
  連続フォーク刺し: {
    name: '連続フォーク刺し+',
    timeCost: 1,
    damage: 1,
    description: 'ランダムな敵に10回1ダメージ',
    effects: [{ type: 'hit_count', value: 10 }],
  },
  フォーク刺し: {
    name: 'フォーク刺し+',
    timeCost: 0,
    damage: 8,
    description: '8ダメージ',
  },
  厨房の掟: {
    name: '厨房の掟+',
    description: 'このターン使った調理カードの数×4ダメージ',
  },

  // レア拡張
  究極のフルコース: {
    name: '究極のフルコース+',
    timeCost: 2.5,
    description: '調理ゲージ+6。満腹+1',
    effects: [
      { type: 'cooking_gauge', value: 6 },
      { type: 'fullness_gauge', value: 1 },
    ],
  },
  食の神髄: {
    name: '食の神髄+',
    timeCost: 1.5,
    description: '手札の全カードのコスト-1（1ターン）',
  },
  'デス・フランベ': {
    name: 'デス・フランベ+',
    timeCost: 4,
    damage: 0,
    cookingMultiplier: 5,
    description:
      '自傷HP-10。全体に調理ゲージ×5ダメージ。使用後ゲージ0。敵全体に火傷3',
    effects: [{ type: 'self_damage', value: 10 }],
    tags: ['aoe', 'cooking_consume'],
  },
  厨房の熱気: {
    name: '厨房の熱気+',
    description: '敵全体に火傷6。自分にも火傷2',
  },

  // 実績レア（ゴッドフランベは no_upgrade）
  伝説のレシピ: {
    name: '伝説のレシピ+',
    timeCost: 2,
    description: 'このターン「食材」カードはコスト0で使用できる',
  },
  料理の神: {
    name: '料理の神+',
    timeCost: 2,
    description: '捨て札にある食材カードをすべて手札に戻す（手札上限10枚）',
  },
};
