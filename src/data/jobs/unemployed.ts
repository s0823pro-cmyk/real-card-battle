import type { Card } from '../../types/game';
import { ACHIEVEMENT_LOCKED_CARD_IDS } from '../achievementDefinitions';
import bareFistImage from '../../assets/cards/unemployed/bare_fist_v3.png';
import cardboardShieldImage from '../../assets/cards/unemployed/cardboard_shield_v3.png';
import dogezaImage from '../../assets/cards/unemployed/dogeza_v3.png';
import fightingSpiritImage from '../../assets/cards/unemployed/fighting_spirit_v3.png';
import desperatePunchImage from '../../assets/cards/unemployed/desperate_punch_v3.png';
import bareFistMastery2Image from '../../assets/cards/unemployed/bare_fist_mastery2.jpg';
import cardboardShieldMastery2Image from '../../assets/cards/unemployed/cardboard_shield_mastery2.jpg';
import dogezaMastery2Image from '../../assets/cards/unemployed/dogeza_mastery2.jpg';
import fightingSpiritMastery2Image from '../../assets/cards/unemployed/fighting_spirit_mastery2.jpg';
import desperatePunchMastery2Image from '../../assets/cards/unemployed/desperate_punch_mastery2.jpg';
import emptyCanImage from '../../assets/cards/unemployed/empty_can_v3.png';
import newspaperArmorImage from '../../assets/cards/unemployed/newspaper_armor_v3.png';
import umbrellaStabImage from '../../assets/cards/unemployed/umbrella_stab_v3.png';
import helloWorkImage from '../../assets/cards/unemployed/hello_work_v3.png';
import vendingKickImage from '../../assets/cards/unemployed/vending_kick_v3.png';
import welfareImage from '../../assets/cards/unemployed/welfare_v3.png';
import cardboardHouseImage from '../../assets/cards/unemployed/cardboard_house_v3.png';
import interviewPracticeImage from '../../assets/cards/unemployed/interview_practice_v3.png';
import lighterImage from '../../assets/cards/unemployed/lighter_v3.png';
import gutsImage from '../../assets/cards/unemployed/guts_v3.png';
import emergencyPowerImage from '../../assets/cards/unemployed/emergency_power_v3.png';
import gambleImage from '../../assets/cards/unemployed/gamble_v3.png';
import revivalImage from '../../assets/cards/unemployed/revival_v3.png';
import deathWishImage from '../../assets/cards/unemployed/death_wish_v3.png';
import cliffEdgeImage from '../../assets/cards/unemployed/cliff_edge_v3.png';
import revengeImage from '../../assets/cards/unemployed/revenge_v3.png';
import defianceImage from '../../assets/cards/unemployed/defiance_v3.png';
import drowningSorrowsImage from '../../assets/cards/unemployed/drowning_sorrows_v3.png';
import acceptanceImage from '../../assets/cards/unemployed/acceptance_v3.png';
import {
  UNEMPLOYED_EXPANSION_COMMON,
  UNEMPLOYED_EXPANSION_RARE,
  UNEMPLOYED_EXPANSION_UNCOMMON,
} from './unemployedExpansion';
import {
  UNEMPLOYED_ACHIEVEMENT_RARE_CARDS,
  UNEMPLOYED_ACHIEVEMENT_UNCOMMON_CARDS,
} from './unemployedAchievementCards';

const UNEMPLOYED_ACHIEVEMENT_UNCOMMON_CARD_IDS = new Set(UNEMPLOYED_ACHIEVEMENT_UNCOMMON_CARDS.map((c) => c.id));
const UNEMPLOYED_ACHIEVEMENT_RARE_CARD_IDS = new Set(UNEMPLOYED_ACHIEVEMENT_RARE_CARDS.map((c) => c.id));

export const UNEMPLOYED_STARTER_DECK: Card[] = [
  { id: 'punch_1', name: '素手で殴る', type: 'attack', timeCost: 2, description: '5ダメージ。自分に1ダメージ（HP50%以下で無効）', damage: 5, icon: '✊', sellValue: 5, badges: ['self_damage'], effects: [{ type: 'self_damage_above_hp_ratio', value: 1, threshold: 0.5 }], imageUrl: bareFistImage, imageVariant2Url: bareFistMastery2Image },
  { id: 'punch_2', name: '素手で殴る', type: 'attack', timeCost: 2, description: '5ダメージ。自分に1ダメージ（HP50%以下で無効）', damage: 5, icon: '✊', sellValue: 5, badges: ['self_damage'], effects: [{ type: 'self_damage_above_hp_ratio', value: 1, threshold: 0.5 }], imageUrl: bareFistImage, imageVariant2Url: bareFistMastery2Image },
  { id: 'punch_3', name: '素手で殴る', type: 'attack', timeCost: 2, description: '5ダメージ。自分に1ダメージ（HP50%以下で無効）', damage: 5, icon: '✊', sellValue: 5, badges: ['self_damage'], effects: [{ type: 'self_damage_above_hp_ratio', value: 1, threshold: 0.5 }], imageUrl: bareFistImage, imageVariant2Url: bareFistMastery2Image },
  { id: 'punch_4', name: '素手で殴る', type: 'attack', timeCost: 2, description: '5ダメージ。自分に1ダメージ（HP50%以下で無効）', damage: 5, icon: '✊', sellValue: 5, badges: ['self_damage'], effects: [{ type: 'self_damage_above_hp_ratio', value: 1, threshold: 0.5 }], imageUrl: bareFistImage, imageVariant2Url: bareFistMastery2Image },
  { id: 'cardboard_1', name: '段ボールの盾', type: 'skill', timeCost: 2, description: '4ブロック', block: 4, icon: '📦', sellValue: 5, imageUrl: cardboardShieldImage, imageVariant2Url: cardboardShieldMastery2Image },
  { id: 'cardboard_2', name: '段ボールの盾', type: 'skill', timeCost: 2, description: '4ブロック', block: 4, icon: '📦', sellValue: 5, imageUrl: cardboardShieldImage, imageVariant2Url: cardboardShieldMastery2Image },
  { id: 'cardboard_3', name: '段ボールの盾', type: 'skill', timeCost: 2, description: '4ブロック', block: 4, icon: '📦', sellValue: 5, imageUrl: cardboardShieldImage, imageVariant2Url: cardboardShieldMastery2Image },
  { id: 'dogeza', name: '土下座', type: 'skill', timeCost: 1, description: '敵1体の攻撃力-3（2ターン）', icon: '🙇', sellValue: 5, effects: [{ type: 'debuff_enemy_atk', value: 3, duration: 2 }], imageUrl: dogezaImage, imageVariant2Url: dogezaMastery2Image },
  { id: 'kiai', name: '気合い', type: 'skill', timeCost: 0, description: '自分にダメージ5、残り時間+2秒', icon: '💢', sellValue: 5, badges: ['self_damage'], effects: [{ type: 'self_damage', value: 5 }, { type: 'time_boost', value: 2 }], imageUrl: fightingSpiritImage, imageVariant2Url: fightingSpiritMastery2Image },
  { id: 'yakekuso', name: 'ヤケクソパンチ', type: 'attack', timeCost: 4, description: '14ダメージ。手札にこのカード以外があると使用不可', damage: 14, icon: '💥', sellValue: 5, tags: ['solo_play_only'], imageUrl: desperatePunchImage, imageVariant2Url: desperatePunchMastery2Image },
];

export const UNEMPLOYED_COMMON_POOL_UNFILTERED: Card[] = [
  {
    id: 'can',
    name: '空き缶投げ',
    type: 'attack',
    timeCost: 0,
    description: '4ダメージ',
    damage: 4,
    hitCount: 1,
    tags: ['multi_hit'],
    icon: '🥫',
    sellValue: 5,
    imageUrl: emptyCanImage,
  },
  { id: 'newspaper', name: '新聞紙アーマー', type: 'skill', timeCost: 1, description: '3ブロック、カード1枚ドロー', block: 3, icon: '📰', sellValue: 5, effects: [{ type: 'draw', value: 1 }], imageUrl: newspaperArmorImage },
  { id: 'umbrella', name: '傘で突く', type: 'attack', timeCost: 3.5, description: '7ダメージ、2ブロック（所要時間3.5秒）', damage: 7, block: 2, icon: '☂️', sellValue: 5, imageUrl: umbrellaStabImage },
  {
    id: 'hello_work',
    name: 'ハローワークへ行く',
    type: 'skill',
    timeCost: 2,
    description: 'カード3枚ドロー、次ターンタイムバー-2秒',
    icon: '🏢',
    sellValue: 5,
    effects: [
      { type: 'draw', value: 3 },
      { type: 'next_turn_time_penalty', value: 2 },
    ],
    imageUrl: helloWorkImage,
  },
  { id: 'vending_kick', name: '自販機キック', type: 'attack', timeCost: 1, description: '4ダメージ、50%で+10G。2回使用後除外', damage: 4, icon: '🥾', sellValue: 5, badges: ['exhaust'], battleUseLimit: 2, imageUrl: vendingKickImage },
  {
    id: 'defiance',
    name: '居直り',
    type: 'skill',
    timeCost: 2,
    description: 'このターン受けるダメージを0にする。次ターンブロック不可',
    icon: '😤',
    sellValue: 5,
    effects: [
      { type: 'damage_immunity_this_turn', value: 1 },
      { type: 'next_turn_no_block', value: 1 },
    ],
    imageUrl: defianceImage,
  },
  ...UNEMPLOYED_EXPANSION_COMMON,
];

export const UNEMPLOYED_COMMON_POOL: Card[] = UNEMPLOYED_COMMON_POOL_UNFILTERED.filter(
  (c) => !ACHIEVEMENT_LOCKED_CARD_IDS.has(c.id),
);

export const UNEMPLOYED_UNCOMMON_POOL_UNFILTERED: Card[] = [
  {
    id: 'welfare',
    name: '生活保護申請',
    type: 'skill',
    timeCost: 3,
    description: 'メンタル+2、カード1枚ドロー',
    icon: '📄',
    sellValue: 12,
    effects: [
      { type: 'mental_boost', value: 2 },
      { type: 'draw', value: 1 },
    ],
    imageUrl: welfareImage,
  },
  { id: 'cardboard_house', name: '段ボールハウス', type: 'tool', timeCost: 2, description: '毎ターン3ブロック。覚醒中は8ブロック', block: 3, icon: '🏠', sellValue: 12, tags: ['awakened_boost'], imageUrl: cardboardHouseImage },
  { id: 'interview', name: '面接練習', type: 'skill', timeCost: 2, description: '次に使うカードを2回発動（ターン終了で失効）', icon: '👔', sellValue: 12, effects: [{ type: 'double_next', value: 1 }], imageUrl: interviewPracticeImage },
  { id: 'lighter', name: '100円ライター', type: 'tool', timeCost: 1, description: 'アタック使用時20%で火傷2付与', icon: '🔥', sellValue: 12, imageUrl: lighterImage },
  { id: 'konjou', name: '根性', type: 'skill', timeCost: 1, description: '自分にダメージ10、次2回のアタック+5', icon: '😤', sellValue: 12, badges: ['self_damage'], effects: [{ type: 'self_damage', value: 10 }, { type: 'attack_buff', value: 5, duration: 2 }], imageUrl: gutsImage },
  { id: 'kajiba', name: '火事場の馬鹿力', type: 'attack', timeCost: 3, description: '減っているHP×0.5ダメージ。覚醒中：×0.8', damage: 0, icon: '💪', tags: ['missing_hp_damage_scaled'], sellValue: 12, imageUrl: emergencyPowerImage },
  {
    id: 'drowning_sorrows',
    name: 'やけ酒',
    type: 'skill',
    timeCost: 2,
    description: 'メンタル+2、自分に5ダメージ',
    icon: '🍶',
    sellValue: 12,
    badges: ['self_damage'],
    effects: [
      { type: 'mental_boost', value: 2 },
      { type: 'self_damage', value: 5 },
    ],
    imageUrl: drowningSorrowsImage,
  },
  {
    id: 'acceptance',
    name: '開き直り',
    type: 'power',
    timeCost: 3,
    description: 'HP50%以下の時、全アタック+2ダメージ追加（ハングリー精神と重複）',
    icon: '🤷',
    sellValue: 12,
    effects: [{ type: 'low_hp_damage_boost', value: 2, threshold: 0.5 }],
    imageUrl: acceptanceImage,
  },
  ...UNEMPLOYED_EXPANSION_UNCOMMON,
  ...UNEMPLOYED_ACHIEVEMENT_UNCOMMON_CARDS,
];

export const UNEMPLOYED_UNCOMMON_POOL: Card[] = UNEMPLOYED_UNCOMMON_POOL_UNFILTERED.filter(
  (c) => !ACHIEVEMENT_LOCKED_CARD_IDS.has(c.id) && !UNEMPLOYED_ACHIEVEMENT_UNCOMMON_CARD_IDS.has(c.id),
);

export const UNEMPLOYED_RARE_POOL_UNFILTERED: Card[] = [
  { id: 'gamble', name: '一発逆転ギャンブル', type: 'skill', timeCost: 2, description: '敵1体。50%で25ダメージ、50%で自分に10ダメージ', icon: '🎰', rarity: 'rare', sellValue: 25, imageUrl: gambleImage },
  { id: 'revival', name: '七転び八起き', type: 'power', timeCost: 4, description: '戦闘不能時HP1で1回復活。【消滅】', icon: '🔄', rarity: 'rare', sellValue: 25, tags: ['vanish'], badges: ['vanish'], imageUrl: revivalImage },
  { id: 'death_wish', name: 'デスウィッシュ', type: 'power', timeCost: 3, description: 'HP回復を全て無効化。毎ターン全アタック+4ダメージ', icon: '💀', rarity: 'rare', sellValue: 25, imageUrl: deathWishImage },
  { id: 'cliff_edge', name: '崖っぷちの底力', type: 'power', timeCost: 5, description: '覚醒中：毎ターンカード2枚追加ドロー＋タイムバー+1秒', icon: '⚡', rarity: 'rare', sellValue: 25, imageUrl: cliffEdgeImage },
  { id: 'revenge', name: 'リベンジ', type: 'attack', timeCost: 2, description: '前ターンに受けたダメージ分の攻撃。覚醒中：1.5倍', damage: 0, icon: '🔥', tags: ['revenge_damage'], rarity: 'rare', sellValue: 25, imageUrl: revengeImage },
  ...UNEMPLOYED_EXPANSION_RARE,
  ...UNEMPLOYED_ACHIEVEMENT_RARE_CARDS,
];

export const UNEMPLOYED_RARE_POOL: Card[] = UNEMPLOYED_RARE_POOL_UNFILTERED.filter(
  (c) => !ACHIEVEMENT_LOCKED_CARD_IDS.has(c.id) && !UNEMPLOYED_ACHIEVEMENT_RARE_CARD_IDS.has(c.id),
);

export const UNEMPLOYED_RARE_POOL_ALL: Card[] = UNEMPLOYED_RARE_POOL_UNFILTERED;

const pickAchievementCards = (source: Card[], ids: readonly string[], rarity: 'common' | 'uncommon' | 'rare'): Card[] =>
  ids.flatMap((id) => {
    const card = source.find((c) => c.id === id);
    return card ? [{ ...card, rarity }] : [];
  });

const UNEMPLOYED_ZUKAN_COMMON_ACHIEVEMENT_IDS = [
  'loose_change',
  'cardboard_decoy',
  'job_flyer',
  'cracked_watch',
  'thrift_cloak',
  'rainwater_bucket',
  'empty_promise',
  'pocket_sandwich',
  'public_phone',
  'worn_sneakers',
  'bench_barricade',
  'apology_letter',
  'tin_can_alarm',
  'newspaper_map',
] as const;

const UNEMPLOYED_ZUKAN_UNCOMMON_ACHIEVEMENT_IDS = [
  'night_shift_memory',
  'rejection_stack',
  'odd_job_contract',
  'coin_luck',
  'borrowed_umbrella',
  'coupon_bundle',
  'last_train_ticket',
  'rainy_underpass',
] as const;

const UNEMPLOYED_ZUKAN_UNCOMMON_RARE_IDS = ['black_company_manual'] as const;
const UNEMPLOYED_ZUKAN_RARE_ACHIEVEMENT_IDS = ['cardboard_fortress', 'streetwise'] as const;

/** 図鑑表示用: 料理人と同じ 5 + C28 + U23 + R12 = 68 枚に揃える。未採用カード定義は保持する。 */
export const UNEMPLOYED_ZUKAN_COMMON_POOL: Card[] = [
  ...UNEMPLOYED_COMMON_POOL_UNFILTERED,
  ...pickAchievementCards(UNEMPLOYED_ACHIEVEMENT_UNCOMMON_CARDS, UNEMPLOYED_ZUKAN_COMMON_ACHIEVEMENT_IDS, 'common'),
];

export const UNEMPLOYED_ZUKAN_UNCOMMON_POOL: Card[] = [
  ...UNEMPLOYED_UNCOMMON_POOL_UNFILTERED.filter((c) => !UNEMPLOYED_ACHIEVEMENT_UNCOMMON_CARDS.some((a) => a.id === c.id)),
  ...pickAchievementCards(UNEMPLOYED_ACHIEVEMENT_UNCOMMON_CARDS, UNEMPLOYED_ZUKAN_UNCOMMON_ACHIEVEMENT_IDS, 'uncommon'),
  ...pickAchievementCards(UNEMPLOYED_ACHIEVEMENT_RARE_CARDS, UNEMPLOYED_ZUKAN_UNCOMMON_RARE_IDS, 'uncommon'),
];

export const UNEMPLOYED_ZUKAN_RARE_POOL_ALL: Card[] = [
  ...UNEMPLOYED_RARE_POOL_UNFILTERED.filter((c) => !UNEMPLOYED_ACHIEVEMENT_RARE_CARDS.some((a) => a.id === c.id)),
  ...pickAchievementCards(UNEMPLOYED_ACHIEVEMENT_RARE_CARDS, UNEMPLOYED_ZUKAN_RARE_ACHIEVEMENT_IDS, 'rare'),
];
