import type { Card } from '../../types/game';
import bareFistImage from '../../assets/cards/unemployed/bare_fist.png';
import cardboardShieldImage from '../../assets/cards/unemployed/cardboard_shield.png';
import dogezaImage from '../../assets/cards/unemployed/dogeza.png';
import fightingSpiritImage from '../../assets/cards/unemployed/fighting_spirit.png';
import desperatePunchImage from '../../assets/cards/unemployed/desperate_punch.png';
import emptyCanImage from '../../assets/cards/unemployed/empty_can.png';
import newspaperArmorImage from '../../assets/cards/unemployed/newspaper_armor.png';
import umbrellaStabImage from '../../assets/cards/unemployed/umbrella_stab.png';
import helloWorkImage from '../../assets/cards/unemployed/hello_work.png';
import vendingKickImage from '../../assets/cards/unemployed/vending_kick.png';
import welfareImage from '../../assets/cards/unemployed/welfare.png';
import cardboardHouseImage from '../../assets/cards/unemployed/cardboard_house.png';
import interviewPracticeImage from '../../assets/cards/unemployed/interview_practice.png';
import lighterImage from '../../assets/cards/unemployed/lighter.png';
import gutsImage from '../../assets/cards/unemployed/guts.png';
import emergencyPowerImage from '../../assets/cards/unemployed/emergency_power.png';
import gambleImage from '../../assets/cards/unemployed/gamble.png';
import revivalImage from '../../assets/cards/unemployed/revival.png';
import deathWishImage from '../../assets/cards/unemployed/death_wish.png';
import cliffEdgeImage from '../../assets/cards/unemployed/cliff_edge.png';
import revengeImage from '../../assets/cards/unemployed/revenge.png';
import defianceImage from '../../assets/cards/unemployed/defiance.png';
import drowningSorrowsImage from '../../assets/cards/unemployed/drowning_sorrows.png';
import acceptanceImage from '../../assets/cards/unemployed/acceptance.png';

export const UNEMPLOYED_STARTER_DECK: Card[] = [
  { id: 'punch_1', name: '素手で殴る', type: 'attack', timeCost: 2, description: '5ダメージ', damage: 5, icon: '✊', sellValue: 5, imageUrl: bareFistImage },
  { id: 'punch_2', name: '素手で殴る', type: 'attack', timeCost: 2, description: '5ダメージ', damage: 5, icon: '✊', sellValue: 5, imageUrl: bareFistImage },
  { id: 'punch_3', name: '素手で殴る', type: 'attack', timeCost: 2, description: '5ダメージ', damage: 5, icon: '✊', sellValue: 5, imageUrl: bareFistImage },
  { id: 'punch_4', name: '素手で殴る', type: 'attack', timeCost: 2, description: '5ダメージ', damage: 5, icon: '✊', sellValue: 5, imageUrl: bareFistImage },
  { id: 'cardboard_1', name: '段ボールの盾', type: 'skill', timeCost: 2, description: '4ブロック', block: 4, icon: '📦', sellValue: 5, imageUrl: cardboardShieldImage },
  { id: 'cardboard_2', name: '段ボールの盾', type: 'skill', timeCost: 2, description: '4ブロック', block: 4, icon: '📦', sellValue: 5, imageUrl: cardboardShieldImage },
  { id: 'cardboard_3', name: '段ボールの盾', type: 'skill', timeCost: 2, description: '4ブロック', block: 4, icon: '📦', sellValue: 5, imageUrl: cardboardShieldImage },
  { id: 'dogeza', name: '土下座', type: 'skill', timeCost: 1, description: '敵1体の攻撃力-3（2ターン）', icon: '🙇', sellValue: 5, effects: [{ type: 'debuff_enemy_atk', value: 3, duration: 2 }], imageUrl: dogezaImage },
  { id: 'kiai', name: '気合い', type: 'skill', timeCost: 1, description: '自分にダメージ5、残り時間+2秒', icon: '💢', sellValue: 5, badges: ['self_damage'], effects: [{ type: 'self_damage', value: 5 }, { type: 'time_boost', value: 2 }], imageUrl: fightingSpiritImage },
  { id: 'yakekuso', name: 'ヤケクソパンチ', type: 'attack', timeCost: 4, description: '14ダメージ。手札にこのカード以外があると使用不可', damage: 14, icon: '💥', sellValue: 5, tags: ['solo_play_only'], imageUrl: desperatePunchImage },
];

export const UNEMPLOYED_COMMON_POOL: Card[] = [
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
  { id: 'umbrella', name: '傘で突く', type: 'attack', timeCost: 2, description: '7ダメージ、2ブロック', damage: 7, block: 2, icon: '☂️', sellValue: 5, imageUrl: umbrellaStabImage },
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
  { id: 'vending_kick', name: '自販機キック', type: 'attack', timeCost: 1, description: '4ダメージ、50%で+10G', damage: 4, icon: '🥾', sellValue: 5, imageUrl: vendingKickImage },
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
];

export const UNEMPLOYED_UNCOMMON_POOL: Card[] = [
  { id: 'welfare', name: '生活保護申請', type: 'skill', timeCost: 3, description: 'HP8回復', icon: '📄', sellValue: 12, effects: [{ type: 'heal', value: 8 }], imageUrl: welfareImage },
  { id: 'cardboard_house', name: '段ボールハウス', type: 'tool', timeCost: 2, description: '毎ターン3ブロック。覚醒中は8ブロック', block: 3, icon: '🏠', sellValue: 12, tags: ['awakened_boost'], imageUrl: cardboardHouseImage },
  { id: 'interview', name: '面接練習', type: 'skill', timeCost: 2, description: '次に使うカードを2回発動', icon: '👔', sellValue: 12, effects: [{ type: 'double_next', value: 1 }], imageUrl: interviewPracticeImage },
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
    description: 'HP50%以下の時、全カード+2ダメージ追加（ハングリー精神と重複）',
    icon: '🤷',
    sellValue: 12,
    effects: [{ type: 'low_hp_damage_boost', value: 2, threshold: 0.5 }],
    imageUrl: acceptanceImage,
  },
];

export const UNEMPLOYED_RARE_POOL: Card[] = [
  { id: 'gamble', name: '一発逆転ギャンブル', type: 'skill', timeCost: 2, description: '50%で敵に25ダメージ、50%で自分に10ダメージ', icon: '🎰', rarity: 'rare', sellValue: 25, imageUrl: gambleImage },
  { id: 'revival', name: '七転び八起き', type: 'power', timeCost: 4, description: '戦闘不能時HP1で1回復活', icon: '🔄', rarity: 'rare', sellValue: 25, imageUrl: revivalImage },
  { id: 'death_wish', name: 'デスウィッシュ', type: 'power', timeCost: 3, description: 'HP回復を全て無効化。毎ターン全カード+4ダメージ', icon: '💀', rarity: 'rare', sellValue: 25, imageUrl: deathWishImage },
  { id: 'cliff_edge', name: '崖っぷちの底力', type: 'power', timeCost: 5, description: '覚醒中：毎ターンカード2枚追加ドロー＋タイムバー+1秒', icon: '⚡', rarity: 'rare', sellValue: 25, imageUrl: cliffEdgeImage },
  { id: 'revenge', name: 'リベンジ', type: 'attack', timeCost: 2, description: '前ターンに受けたダメージ分の攻撃。覚醒中：1.5倍', damage: 0, icon: '🔥', tags: ['revenge_damage'], rarity: 'rare', sellValue: 25, imageUrl: revengeImage },
];
