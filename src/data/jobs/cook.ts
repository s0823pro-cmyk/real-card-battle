import type { Card } from '../../types/game';
import { ACHIEVEMENT_LOCKED_CARD_IDS } from '../achievementDefinitions';
import knifeSkillImage from '../../assets/cards/cook/knife_skill.png';
import apronGuardImage from '../../assets/cards/cook/apron_guard.png';
import onionCutImage from '../../assets/cards/cook/onion_cut.png';
import flambeImage from '../../assets/cards/cook/flambe.png';
import prepWorkImage from '../../assets/cards/cook/prep_work.png';
import garlicThrowImage from '../../assets/cards/cook/garlic_throw.png';
import ironPanImage from '../../assets/cards/cook/iron_pan.png';
import cuttingBoardGuardImage from '../../assets/cards/cook/cutting_board_guard.png';
import meatPoundImage from '../../assets/cards/cook/meat_pound.png';
import saltPepperImage from '../../assets/cards/cook/salt_pepper.png';
import hotSauceImage from '../../assets/cards/cook/hot_sauce.png';
import recipeBookImage from '../../assets/cards/cook/recipe_book.png';
import knifeSetImage from '../../assets/cards/cook/knife_set.png';
import agedDoughImage from '../../assets/cards/cook/aged_dough.png';
import deliveryBikeImage from '../../assets/cards/cook/delivery_bike.png';
import simmeringPotImage from '../../assets/cards/cook/simmering_pot.png';
import fullCourseImage from '../../assets/cards/cook/full_course.png';
import secretSoupImage from '../../assets/cards/cook/secret_soup.png';
import threeStarImage from '../../assets/cards/cook/three_star_1.png';
import mysteryPotImage from '../../assets/cards/cook/mystery_pot.png';
import flameFlambe2Image from '../../assets/cards/cook/flame_flambe2.png';
import knifeSharpeningImage from '../../assets/cards/cook/knife_sharpening.png';
import ingredientSourcingImage from '../../assets/cards/cook/ingredient_sourcing.png';
import kitchenDemonImage from '../../assets/cards/cook/kitchen_demon.png';

export const COOK_STARTER_DECK: Card[] = [
  { id: 'knife_1', name: '包丁さばき', type: 'attack', timeCost: 2, description: '3ダメージ', damage: 3, icon: '🔪', sellValue: 5, imageUrl: knifeSkillImage },
  { id: 'knife_2', name: '包丁さばき', type: 'attack', timeCost: 2, description: '3ダメージ', damage: 3, icon: '🔪', sellValue: 5, imageUrl: knifeSkillImage },
  { id: 'knife_3', name: '包丁さばき', type: 'attack', timeCost: 2, description: '3ダメージ', damage: 3, icon: '🔪', sellValue: 5, imageUrl: knifeSkillImage },
  { id: 'knife_4', name: '包丁さばき', type: 'attack', timeCost: 2, description: '3ダメージ', damage: 3, icon: '🔪', sellValue: 5, imageUrl: knifeSkillImage },
  { id: 'apron_1', name: 'エプロン防御', type: 'skill', timeCost: 2, description: '4ブロック', block: 4, icon: '👨‍🍳', sellValue: 5, imageUrl: apronGuardImage },
  { id: 'apron_2', name: 'エプロン防御', type: 'skill', timeCost: 2, description: '4ブロック', block: 4, icon: '👨‍🍳', sellValue: 5, imageUrl: apronGuardImage },
  { id: 'apron_3', name: 'エプロン防御', type: 'skill', timeCost: 2, description: '4ブロック', block: 4, icon: '👨‍🍳', sellValue: 5, imageUrl: apronGuardImage },
  {
    id: 'onion',
    name: '玉ねぎを切る',
    type: 'skill',
    timeCost: 1,
    description: '調理+1、満腹+1',
    damage: 0,
    icon: '🧅',
    sellValue: 5,
    tags: ['ingredient'],
    effects: [{ type: 'cooking_gauge', value: 1 }, { type: 'fullness_gauge', value: 1 }],
    imageUrl: onionCutImage,
  },
  {
    id: 'flambe',
    name: 'フランベ',
    type: 'attack',
    timeCost: 2,
    description: '4ダメージ+調理×3。使用後調理ゲージ0',
    damage: 4,
    icon: '🔥',
    sellValue: 8,
    tags: ['cooking_consume'],
    cookingMultiplier: 3,
    imageUrl: flambeImage,
  },
  { id: 'prep', name: '仕込み', type: 'skill', timeCost: 1, description: 'カード1枚ドロー、調理+1', icon: '📋', sellValue: 5, effects: [{ type: 'draw', value: 1 }, { type: 'cooking_gauge', value: 1 }], imageUrl: prepWorkImage },
];

export const COOK_COMMON_POOL: Card[] = [
  {
    id: 'garlic',
    name: 'にんにく投げ',
    type: 'attack',
    timeCost: 1.5,
    description: '全体3ダメージ。弱体1ターン',
    damage: 3,
    icon: '🧄',
    tags: ['aoe'],
    effects: [{ type: 'weak', value: 1 }],
    sellValue: 5,
    imageUrl: garlicThrowImage,
  },
  {
    id: 'frypan',
    name: '鉄のフライパン',
    type: 'skill',
    timeCost: 2,
    description: '7ブロック',
    block: 7,
    icon: '🍳',
    sellValue: 5,
    imageUrl: ironPanImage,
  },
  {
    id: 'cutting_board',
    name: 'まな板ガード',
    type: 'skill',
    timeCost: 2,
    description: '5ブロック。調理+1',
    block: 5,
    icon: '🪵',
    sellValue: 5,
    effects: [{ type: 'cooking_gauge', value: 1 }],
    imageUrl: cuttingBoardGuardImage,
  },
  {
    id: 'meat',
    name: '肉を叩く',
    type: 'attack',
    timeCost: 2,
    description: '5ダメージ、調理+1、満腹+1',
    damage: 5,
    icon: '🥩',
    tags: ['ingredient'],
    effects: [{ type: 'cooking_gauge', value: 1 }, { type: 'fullness_gauge', value: 1 }],
    sellValue: 5,
    imageUrl: meatPoundImage,
  },
  { id: 'salt', name: '塩コショウ', type: 'skill', timeCost: 1, description: '敵に脆弱2付与、調理+1、満腹+1', icon: '🧂', tags: ['ingredient'], effects: [{ type: 'cooking_gauge', value: 1 }, { type: 'fullness_gauge', value: 1 }, { type: 'vulnerable', value: 1, duration: 2 }], sellValue: 5, imageUrl: saltPepperImage },
  {
    id: 'knife_sharpening',
    name: '包丁研ぎ',
    type: 'skill',
    timeCost: 1,
    description: 'このターン、次に使用するアタックカードのダメージ+3。調理+1',
    icon: '🔪',
    sellValue: 5,
    effects: [
      { type: 'next_attack_damage_boost', value: 3 },
      { type: 'cooking_gauge', value: 1 },
    ],
    imageUrl: knifeSharpeningImage,
  },
];

export const COOK_UNCOMMON_POOL_UNFILTERED: Card[] = [
  { id: 'hot_sauce', name: '激辛ソース', type: 'skill', timeCost: 1, description: '敵に火傷3付与、調理+1、満腹+1', icon: '🌶️', tags: ['ingredient'], effects: [{ type: 'cooking_gauge', value: 1 }, { type: 'fullness_gauge', value: 1 }, { type: 'burn', value: 3 }], sellValue: 12, imageUrl: hotSauceImage },
  {
    id: 'recipe_study',
    name: 'レシピ研究',
    type: 'power',
    timeCost: 5,
    description: '食材カードの調理+1',
    icon: '📖',
    sellValue: 12,
    imageUrl: recipeBookImage,
  },
  { id: 'knife_set', name: '包丁セット', type: 'tool', timeCost: 5, description: 'アタックカードのダメージ+2', icon: '🔪', sellValue: 12, imageUrl: knifeSetImage },
  {
    id: 'aged_dough',
    name: '寝かせた生地',
    type: 'attack',
    timeCost: 3,
    description: '5ダメージ、満腹+1。',
    damage: 5,
    icon: '🫓',
    tags: ['ingredient'],
    effects: [{ type: 'fullness_gauge', value: 1 }],
    reserveBonus: {
      description: '温存時：10ダメージ、調理+1、満腹+1',
      damageMultiplier: 2.0,
      extraEffects: [
        { type: 'cooking_gauge', value: 1 },
        { type: 'fullness_gauge', value: 1 },
      ],
    },
    badges: ['reserve'],
    sellValue: 12,
    imageUrl: agedDoughImage,
  },
  {
    id: 'delivery',
    name: '出前配達',
    type: 'attack',
    timeCost: 4.5,
    description: '3ダメージ×3。使用するたびにコスト-0.5（最小0）',
    damage: 3,
    hitCount: 3,
    icon: '🛵',
    sellValue: 12,
    tags: ['multi_hit'],
    imageUrl: deliveryBikeImage,
  },
  {
    id: 'simmering',
    name: '煮込み',
    type: 'skill',
    timeCost: 2,
    description: '調理+3、満腹+1',
    icon: '🍲',
    tags: ['ingredient'],
    effects: [{ type: 'cooking_gauge', value: 3 }, { type: 'fullness_gauge', value: 1 }],
    sellValue: 12,
    imageUrl: simmeringPotImage,
  },
  {
    id: 'ingredient_sourcing',
    name: '食材の仕入れ',
    type: 'skill',
    timeCost: 2,
    description: '2枚ドロー、調理+1、満腹+1',
    icon: '🛒',
    sellValue: 12,
    tags: ['ingredient'],
    effects: [
      { type: 'draw', value: 2 },
      { type: 'cooking_gauge', value: 1 },
      { type: 'fullness_gauge', value: 1 },
    ],
    imageUrl: ingredientSourcingImage,
  },
  {
    id: 'kitchen_demon',
    name: '厨房の鬼',
    type: 'power',
    timeCost: 5,
    description: '毎ターン調理ゲージ+1',
    icon: '👹',
    sellValue: 12,
    imageUrl: kitchenDemonImage,
  },
];

export const COOK_UNCOMMON_POOL: Card[] = COOK_UNCOMMON_POOL_UNFILTERED.filter(
  (c) => !ACHIEVEMENT_LOCKED_CARD_IDS.has(c.id),
);

/** 実績ロック分を含む（参照用） */
export const COOK_RARE_POOL_UNFILTERED: Card[] = [
  {
    id: 'full_course',
    name: 'フルコース',
    type: 'attack',
    timeCost: 6,
    description: '調理×5。使用後調理ゲージ0。使用後除外',
    damage: 0,
    icon: '🍽️',
    tags: ['cooking', 'cooking_consume'],
    cookingMultiplier: 5,
    rarity: 'rare',
    sellValue: 25,
    badges: ['exhaust'],
    imageUrl: fullCourseImage,
  },
  {
    id: 'secret_soup',
    name: '秘伝のスープ',
    type: 'skill',
    timeCost: 6,
    description: '調理+5、1枚ドロー、満腹+1。使用後除外',
    icon: '🥣',
    tags: ['ingredient'],
    effects: [
      { type: 'cooking_gauge', value: 5 },
      { type: 'fullness_gauge', value: 1 },
      { type: 'draw', value: 1 },
    ],
    rarity: 'rare',
    sellValue: 25,
    badges: ['exhaust'],
    imageUrl: secretSoupImage,
  },
  {
    id: 'three_star',
    name: '三ツ星の極意',
    type: 'power',
    timeCost: 6,
    description: '毎ターン最初に使用する食材カードのコスト-50%（最低1）',
    icon: '⭐',
    rarity: 'rare',
    sellValue: 25,
    imageUrl: threeStarImage,
  },
  {
    id: 'mystery_pot',
    name: '闇鍋',
    type: 'attack',
    timeCost: 6,
    description:
      'ランダム効果：全体20ダメ/単体40ダメ/自分15ダメ/調理+10/自分毒5T。使用後除外',
    damage: 0,
    icon: '🫕',
    tags: ['cooking'],
    rarity: 'rare',
    sellValue: 25,
    badges: ['exhaust'],
    imageUrl: mysteryPotImage,
  },
  {
    id: 'flame_flambe',
    name: '炎のフランベ',
    type: 'attack',
    timeCost: 4,
    description: '全体4ダメージ+調理×3。使用後調理ゲージ0',
    damage: 4,
    icon: '🔥',
    tags: ['aoe', 'cooking_consume'],
    cookingMultiplier: 3,
    rarity: 'rare',
    sellValue: 25,
    imageUrl: flameFlambe2Image,
  },
];

export const COOK_RARE_POOL: Card[] = COOK_RARE_POOL_UNFILTERED.filter(
  (c) => !ACHIEVEMENT_LOCKED_CARD_IDS.has(c.id),
);
