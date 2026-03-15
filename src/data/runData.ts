import { cloneRewardCard, getCardPoolsByJob } from './jobs';
import { NEUTRAL_COMMON_POOL, NEUTRAL_RARE_POOL, NEUTRAL_UNCOMMON_POOL } from './cards/neutralCards';
import type {
  EnemyTemplateLike,
  GameEvent,
  Omamori,
  RunItem,
} from '../types/run';
import type { Card, JobId } from '../types/game';
import bikerLeaderImage from '../assets/enemies/biker_leader.png';
import badRealtorImage from '../assets/enemies/bad_realtor.png';
import monsterCustomerImage from '../assets/enemies/monster_customer.png';

export const TILE_LABELS: Record<string, { icon: string; name: string }> = {
  start: { icon: '🏁', name: 'スタート' },
  enemy: { icon: '⚔️', name: '戦闘' },
  unique_boss: { icon: '💀', name: '強敵' },
  pawnshop: { icon: '🏪', name: '質屋' },
  event: { icon: '❓', name: 'イベント' },
  shrine: { icon: '⛩️', name: '神社' },
  hotel: { icon: '🏨', name: 'ホテル' },
  area_boss: { icon: '👑', name: 'エリアボス' },
};

export const AREA1_ENCOUNTER_TEMPLATE_IDS: string[][] = [
  ['claimer'],
  ['drunk'],
  ['wildCat', 'wildCat'],
  ['claimer', 'drunk'],
  ['wildCat', 'claimer'],
];

export const AREA1_ELITES: EnemyTemplateLike[] = [
  {
    templateId: 'biker_leader',
    name: '暴走族リーダー',
    icon: '🏍️',
    imageUrl: bikerLeaderImage,
    maxHp: 90,
    intents: [
      { type: 'attack', value: 20, description: '攻撃 20', icon: '⚔️' },
      { type: 'buff', value: 3, description: '仲間を呼ぶ', icon: '📢' },
      { type: 'attack', value: 16, description: '特攻 16', icon: '💥' },
    ],
  },
  {
    templateId: 'evil_realtor',
    name: '悪徳不動産屋',
    icon: '🏠',
    imageUrl: badRealtorImage,
    maxHp: 75,
    intents: [
      { type: 'attack', value: 15, description: '攻撃 15', icon: '⚔️' },
      { type: 'mental_attack', value: 0, mentalDamage: 2, description: '悪質な契約', icon: '📋' },
      { type: 'attack', value: 15, description: '追い出し 15', icon: '🚪' },
    ],
  },
];

export const AREA1_BOSS: EnemyTemplateLike = {
  templateId: 'monster_customer',
  name: 'モンスターカスタマー',
  icon: '👑',
  imageUrl: monsterCustomerImage,
  maxHp: 200,
  intents: [
    { type: 'attack', value: 14, description: '攻撃 14', icon: '⚔️' },
    { type: 'mental_attack', value: 0, mentalDamage: 1, description: 'クレーム', icon: '😤' },
    { type: 'attack', value: 22, description: '激怒の攻撃 22', icon: '💢' },
    { type: 'buff', value: 3, description: 'SNSに投稿', icon: '📱' },
    { type: 'mental_attack', value: 0, mentalDamage: 2, description: 'レビュー爆撃', icon: '⭐' },
    { type: 'attack', value: 28, description: '暴走 28', icon: '💥' },
    { type: 'attack', value: 18, description: '攻撃 18', icon: '⚔️' },
    { type: 'mental_attack', value: 0, mentalDamage: 3, description: '土下座要求', icon: '🙇' },
  ],
};

export const RELICS: Omamori[] = [
  {
    id: 'energy_drink',
    name: 'エナジードリンク',
    icon: '🥫',
    description: '戦闘開始時タイムバー+1秒（初ターンのみ）',
    effect: { type: 'start_of_battle', stat: 'time', value: 1 },
  },
  {
    id: 'amulet',
    name: '厄除けお守り',
    icon: '🧧',
    description: '呪いカード1枚を無効化',
    effect: { type: 'passive', stat: 'curse_immunity', value: 1 },
  },
  {
    id: 'alarm_clock',
    name: '目覚まし時計',
    icon: '⏰',
    description: '毎ターン開始時カード+1枚ドロー',
    effect: { type: 'on_turn_start', stat: 'draw', value: 1 },
  },
  {
    id: 'supplement',
    name: '栄養サプリ',
    icon: '💊',
    description: '休憩マスでの回復量+10',
    effect: { type: 'passive', stat: 'rest_heal', value: 10 },
  },
  {
    id: 'brand_wallet',
    name: 'ブランド財布',
    icon: '👛',
    description: 'ショップ全品15%割引',
    effect: { type: 'passive', stat: 'shop_discount', value: 0.15 },
  },
  {
    id: 'hard_hat',
    name: '安全第一ヘルメット',
    icon: '⛑️',
    description: '毎ターン+2ブロック',
    effect: { type: 'on_turn_start', stat: 'block', value: 2 },
  },
];

export const ITEMS: RunItem[] = [
  {
    id: 'canned_coffee',
    name: '缶コーヒー',
    icon: '☕',
    description: 'タイムバー+3秒（1ターン）',
    price: 30,
    effect: { type: 'time_boost', value: 3 },
  },
  {
    id: 'energy_drink_p',
    name: '栄養ドリンク',
    icon: '🧃',
    description: 'HP15回復',
    price: 40,
    effect: { type: 'heal', value: 15 },
  },
  {
    id: 'protein',
    name: 'プロテイン',
    icon: '💪',
    description: '次の3回アタック+5ダメージ',
    price: 50,
    effect: { type: 'attack_buff', value: 5, duration: 3 },
  },
  {
    id: 'eye_drops',
    name: '目薬',
    icon: '👁️',
    description: 'カード3枚ドロー',
    price: 35,
    effect: { type: 'draw', value: 3 },
  },
];

export const AREA1_EVENTS: GameEvent[] = [
  {
    id: 'lost_item',
    name: '落とし物を拾った',
    description: '道端に財布が落ちている。中にはお金が入っているようだ。',
    choices: [
      { text: '交番に届ける（メンタル+1）', effects: [{ type: 'mental', value: 1 }] },
      {
        text: 'ネコババする（+50G、メンタル-1）',
        effects: [{ type: 'gold', value: 50 }, { type: 'mental', value: -1 }],
      },
      { text: '無視する', effects: [] },
    ],
  },
  {
    id: 'cat_cafe',
    name: '猫カフェ発見',
    description: '疲れた体に癒しを…入店料がかかるが、心が休まりそうだ。',
    choices: [
      {
        text: '入る（-20G、HP+15、メンタル+2）',
        effects: [{ type: 'gold', value: -20 }, { type: 'heal', value: 15 }, { type: 'mental', value: 2 }],
      },
      { text: '素通りする', effects: [] },
    ],
  },
  {
    id: 'street_musician',
    name: '路上ライブ',
    description: 'ギターを弾く若者がいる。なかなか上手い。',
    choices: [
      { text: '聞いていく（メンタル+1）', effects: [{ type: 'mental', value: 1 }] },
      { text: '投げ銭する（-15G、カード獲得）', effects: [{ type: 'gold', value: -15 }, { type: 'card', value: 1 }] },
      { text: '無視する', effects: [] },
    ],
  },
  {
    id: 'vending_machine',
    name: '怪しい自販機',
    description: '見たことのない飲み物が並ぶ自販機。何が出るかわからない。',
    choices: [
      { text: '買ってみる（-10G、ランダム効果）', effects: [{ type: 'gold', value: -10 }] },
      { text: 'やめておく', effects: [] },
    ],
  },
  {
    id: 'training',
    name: '職業訓練校',
    description: '短期講座の無料体験をやっている。カードを1枚強化できそうだ。',
    choices: [
      { text: '受講する（カード1枚強化）', effects: [] },
      { text: '時間がないので断る', effects: [] },
    ],
  },
  {
    id: 'drinking_party',
    name: '飲み会の誘い',
    description: '知り合いに飲みに誘われた。楽しそうだが体に悪そうでもある。',
    choices: [
      {
        text: '参加する（-20G、メンタル+2、HP-10）',
        effects: [{ type: 'gold', value: -20 }, { type: 'mental', value: 2 }, { type: 'damage', value: 10 }],
      },
      { text: '断る', effects: [] },
    ],
  },
  {
    id: 'found_money',
    name: '道端でお金発見！',
    description: '足元に小銭入りの封筒が落ちていた。',
    choices: [{ text: 'ラッキー！（+30G）', effects: [{ type: 'gold', value: 30 }] }],
  },
  {
    id: 'good_mood',
    name: '今日はいい天気！',
    description: '気分が軽く、足取りも軽快だ。',
    choices: [{ text: '気分がいい！（メンタル+2）', effects: [{ type: 'mental', value: 2 }] }],
  },
  {
    id: 'health_checkup',
    name: '健康診断で異常なし！',
    description: '医者に太鼓判を押され、体調が上向いた。',
    choices: [{ text: 'HP20回復', effects: [{ type: 'heal', value: 20 }] }],
  },
  {
    id: 'lost_wallet',
    name: '財布を落とした…',
    description: '帰り道で財布が見当たらないことに気づいた。',
    choices: [{ text: '…（-20G）', effects: [{ type: 'gold', value: -20 }] }],
  },
  {
    id: 'bad_memory',
    name: '嫌なことを思い出した…',
    description: 'ふとしたきっかけで気持ちが沈む。',
    choices: [{ text: '…（メンタル-1）', effects: [{ type: 'mental', value: -1 }] }],
  },
  {
    id: 'tripped',
    name: '道端で躓いた！',
    description: '段差に気づかず派手に転んでしまった。',
    choices: [{ text: 'HP-10', effects: [{ type: 'damage', value: 10 }] }],
  },
];

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const pickRandomCommonCard = (jobId: JobId = 'carpenter'): Card =>
  cloneRewardCard(pickRandom(getCardPoolsByJob(jobId).common.filter((card) => !card.neutral)));
export const pickRandomUncommonCard = (jobId: JobId = 'carpenter'): Card =>
  cloneRewardCard(pickRandom(getCardPoolsByJob(jobId).uncommon.filter((card) => !card.neutral)));
export const pickRandomRareCard = (jobId: JobId = 'carpenter'): Card =>
  cloneRewardCard(pickRandom(getCardPoolsByJob(jobId).rare.filter((card) => !card.neutral)));

const pickRandomNeutralByRarity = (rarity: 'common' | 'uncommon' | 'rare'): Card => {
  if (rarity === 'rare') return cloneRewardCard(pickRandom(NEUTRAL_RARE_POOL));
  if (rarity === 'uncommon') return cloneRewardCard(pickRandom(NEUTRAL_UNCOMMON_POOL));
  return cloneRewardCard(pickRandom(NEUTRAL_COMMON_POOL));
};

export const generateCardRewardChoices = (jobId: JobId = 'carpenter', count = 3): Card[] => {
  const cards: Card[] = [];
  for (let i = 0; i < count; i += 1) {
    const roll = Math.random();
    const rarity: 'common' | 'uncommon' | 'rare' = roll < 0.1 ? 'rare' : roll < 0.4 ? 'uncommon' : 'common';
    const useNeutral = Math.random() < 0.3;
    if (useNeutral) {
      cards.push(pickRandomNeutralByRarity(rarity));
    } else if (rarity === 'rare') {
      cards.push(pickRandomRareCard(jobId));
    } else if (rarity === 'uncommon') {
      cards.push(pickRandomUncommonCard(jobId));
    } else {
      cards.push(pickRandomCommonCard(jobId));
    }
  }
  return cards;
};

export const generateOmamoriChoices = (count = 3): Omamori[] => {
  const shuffled = [...RELICS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export const generateShopCards = (count: number, jobId: JobId = 'carpenter'): Card[] =>
  Array.from({ length: count }).map(() => {
    const roll = Math.random();
    const rarity: 'common' | 'uncommon' | 'rare' = roll < 0.12 ? 'rare' : roll < 0.45 ? 'uncommon' : 'common';
    const useNeutral = Math.random() < 0.3;
    if (useNeutral) return pickRandomNeutralByRarity(rarity);
    if (rarity === 'rare') return pickRandomRareCard(jobId);
    if (rarity === 'uncommon') return pickRandomUncommonCard(jobId);
    return pickRandomCommonCard(jobId);
  });

export const getCardPrice = (card: Card): number => {
  const carpenterPools = getCardPoolsByJob('carpenter');
  const cookPools = getCardPoolsByJob('cook');
  const unemployedPools = getCardPoolsByJob('unemployed');
  const rarePool = [...carpenterPools.rare, ...cookPools.rare, ...unemployedPools.rare];
  const uncommonPool = [...carpenterPools.uncommon, ...cookPools.uncommon, ...unemployedPools.uncommon];
  if (rarePool.some((rare) => rare.name === card.name)) return 150;
  if (uncommonPool.some((uncommon) => uncommon.name === card.name)) return 80;
  return 50;
};

export const generateShopItems = (count: number): RunItem[] => {
  const shuffled = [...ITEMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((item, idx) => ({ ...item, id: `${item.id}_shop_${Date.now()}_${idx}` }));
};

export const pickArea1EncounterTemplateIds = (): string[] =>
  AREA1_ENCOUNTER_TEMPLATE_IDS[Math.floor(Math.random() * AREA1_ENCOUNTER_TEMPLATE_IDS.length)];

export const pickArea1Elite = (): EnemyTemplateLike =>
  AREA1_ELITES[Math.floor(Math.random() * AREA1_ELITES.length)];

export const pickEvent = (): GameEvent =>
  AREA1_EVENTS[Math.floor(Math.random() * AREA1_EVENTS.length)];
