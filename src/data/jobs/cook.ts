import type { Card } from '../../types/game';

export const COOK_STARTER_DECK: Card[] = [
  { id: 'knife_1', name: '包丁さばき', type: 'attack', timeCost: 2, description: '6ダメージ', damage: 6, icon: '🔪', sellValue: 5 },
  { id: 'knife_2', name: '包丁さばき', type: 'attack', timeCost: 2, description: '6ダメージ', damage: 6, icon: '🔪', sellValue: 5 },
  { id: 'knife_3', name: '包丁さばき', type: 'attack', timeCost: 2, description: '6ダメージ', damage: 6, icon: '🔪', sellValue: 5 },
  { id: 'knife_4', name: '包丁さばき', type: 'attack', timeCost: 2, description: '6ダメージ', damage: 6, icon: '🔪', sellValue: 5 },
  { id: 'apron_1', name: 'エプロン防御', type: 'skill', timeCost: 2, description: '5ブロック', block: 5, icon: '👨‍🍳', sellValue: 5 },
  { id: 'apron_2', name: 'エプロン防御', type: 'skill', timeCost: 2, description: '5ブロック', block: 5, icon: '👨‍🍳', sellValue: 5 },
  { id: 'apron_3', name: 'エプロン防御', type: 'skill', timeCost: 2, description: '5ブロック', block: 5, icon: '👨‍🍳', sellValue: 5 },
  { id: 'onion', name: '玉ねぎを切る', type: 'attack', timeCost: 1, description: '4ダメージ、調理+1', damage: 4, icon: '🧅', sellValue: 5, tags: ['ingredient'], effects: [{ type: 'cooking_gauge', value: 1 }] },
  { id: 'flambe', name: 'フランベ', type: 'attack', timeCost: 3, description: '8ダメージ+調理×3', damage: 8, icon: '🔥', sellValue: 8, tags: ['cooking'], cookingMultiplier: 3 },
  { id: 'prep', name: '仕込み', type: 'skill', timeCost: 1, description: 'カード1枚ドロー、調理+1', icon: '📋', sellValue: 5, effects: [{ type: 'draw', value: 1 }, { type: 'cooking_gauge', value: 1 }] },
];

export const COOK_COMMON_POOL: Card[] = [
  { id: 'garlic', name: 'にんにく投げ', type: 'attack', timeCost: 1, description: '5ダメージ、弱体付与、調理+1', damage: 5, icon: '🧄', tags: ['ingredient'], effects: [{ type: 'cooking_gauge', value: 1 }, { type: 'debuff_enemy', value: 1 }], sellValue: 5 },
  { id: 'frypan', name: '鉄のフライパン', type: 'attack', timeCost: 2, description: '8ダメージ', damage: 8, icon: '🍳', sellValue: 5 },
  { id: 'cutting_board', name: 'まな板ガード', type: 'skill', timeCost: 2, description: '6ブロック、次の食材+3ダメージ', block: 6, icon: '🪵', sellValue: 5 },
  { id: 'meat', name: '肉を叩く', type: 'attack', timeCost: 2, description: '7ダメージ、調理+2', damage: 7, icon: '🥩', tags: ['ingredient'], effects: [{ type: 'cooking_gauge', value: 2 }], sellValue: 5 },
  { id: 'salt', name: '塩コショウ', type: 'skill', timeCost: 1, description: '敵に脆弱2付与、調理+1', icon: '🧂', tags: ['ingredient'], effects: [{ type: 'cooking_gauge', value: 1 }, { type: 'vulnerable', value: 2 }], sellValue: 5 },
];

export const COOK_UNCOMMON_POOL: Card[] = [
  { id: 'hot_sauce', name: '激辛ソース', type: 'skill', timeCost: 1, description: '敵に火傷3付与、調理+1', icon: '🌶️', tags: ['ingredient'], effects: [{ type: 'cooking_gauge', value: 1 }, { type: 'burn', value: 3 }], sellValue: 12 },
  { id: 'recipe_study', name: 'レシピ研究', type: 'power', timeCost: 4, description: '食材カード使用ごとに全アタック+2', icon: '📖', sellValue: 12 },
  { id: 'knife_set', name: '包丁セット', type: 'tool', timeCost: 4, description: '全アタック+2ダメージ', icon: '🔪', sellValue: 12 },
  { id: 'aged_dough', name: '寝かせた生地', type: 'attack', timeCost: 2, description: '8ダメージ。温存時：16ダメージ、調理+2', damage: 8, icon: '🫓', tags: ['ingredient'], effects: [{ type: 'cooking_gauge', value: 1 }], reserveBonus: { description: '温存時：16ダメージ、調理+2', damageMultiplier: 2.0, extraEffects: [{ type: 'cooking_gauge', value: 2 }] }, sellValue: 12 },
  { id: 'delivery', name: '出前配達', type: 'attack', timeCost: 2, description: 'ランダム敵に4ダメージ×3回', damage: 4, icon: '🛵', sellValue: 12 },
  { id: 'simmering', name: '煮込み', type: 'skill', timeCost: 2, description: '調理+3、HP5回復', icon: '🍲', tags: ['ingredient'], effects: [{ type: 'cooking_gauge', value: 3 }, { type: 'heal', value: 5 }], sellValue: 12 },
];

export const COOK_RARE_POOL: Card[] = [
  { id: 'full_course', name: 'フルコース', type: 'attack', timeCost: 5, description: '調理ゲージ×6ダメージ', damage: 0, icon: '🍽️', tags: ['cooking'], cookingMultiplier: 6, sellValue: 25 },
  { id: 'secret_soup', name: '秘伝のスープ', type: 'skill', timeCost: 3, description: 'HP10回復、調理+3', icon: '🥣', effects: [{ type: 'heal', value: 10 }, { type: 'cooking_gauge', value: 3 }], sellValue: 25 },
  { id: 'three_star', name: '三ツ星の極意', type: 'power', timeCost: 5, description: '毎ターン最初の食材カードの所要時間0秒', icon: '⭐', sellValue: 25 },
  { id: 'mystery_pot', name: '闇鍋', type: 'attack', timeCost: 3, description: 'ランダムで15〜30ダメージ', damage: 0, icon: '🫕', tags: ['cooking'], sellValue: 25 },
  { id: 'flame_flambe', name: '炎のフランベ', type: 'attack', timeCost: 4, description: '12ダメージ+調理×4。全体攻撃', damage: 12, icon: '🔥', tags: ['cooking'], cookingMultiplier: 4, sellValue: 25 },
];
