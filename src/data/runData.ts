import { ICONS } from '../assets/icons';
import { cloneRewardCard, getCardPoolsByJob } from './jobs';
import { NEUTRAL_CARD_POOL, NEUTRAL_COMMON_POOL } from './cards/neutralCards';
import { ACHIEVEMENT_LOCKED_CARD_IDS } from './achievementDefinitions';
import { getUnlockedCardIds } from '../utils/achievementSystem';
import type {
  EnemyTemplateLike,
  GameEvent,
  Omamori,
  RunItem,
  TileType,
} from '../types/run';
import type { Card, JobId } from '../types/game';
import bikerLeaderImage from '../assets/enemies/biker_leader.png';
import badRealtorImage from '../assets/enemies/bad_realtor.png';
import monsterCustomerImage from '../assets/enemies/monster_customer.png';
import collectorImage from '../assets/enemies/collector.png';
import sloppyWorkerImage from '../assets/enemies/sloppy_worker.png';
import yakuzaMinionImage from '../assets/enemies/yakuza_minion.png';
import evilSalesImage from '../assets/enemies/evil_sales.png';
import rogueDumpImage from '../assets/enemies/rogue_dump.png';
import evilSupervisorImage from '../assets/enemies/evil_supervisor.png';
import landSharkImage from '../assets/enemies/land_shark.png';
import evilCeoImage from '../assets/enemies/evil_ceo.png';
import worldTreeRootImage from '../assets/enemies/world_tree_root.png';
import lostSoulImage from '../assets/enemies/lost_soul.png';
import stoneSoldierImage from '../assets/enemies/stone_soldier.png';
import lightGuardianImage from '../assets/enemies/light_guardian.png';
import cursedTreeImage from '../assets/enemies/cursed_tree.png';
import worldTreeGuardianImage from '../assets/enemies/world_tree_guardian.png';
import ancientGhostImage from '../assets/enemies/ancient_ghost.png';
import worldTreeWardenImage from '../assets/enemies/world_tree_warden.png';
import energyDrinkImage from '../assets/omamori/energy_drink.png';
import amuletImage from '../assets/omamori/amulet.png';
import alarmClockImage from '../assets/omamori/alarm_clock.png';
import supplementImage from '../assets/omamori/supplement.png';
import brandWalletImage from '../assets/omamori/brand_wallet.png';
import hardHatImage from '../assets/omamori/hard_hat.png';
import victoryCharmImage from '../assets/omamori/victory_charm.png';
import fortuneCatImage from '../assets/omamori/fortune_cat.png';

export const TILE_LABELS: Record<TileType, { icon: string; iconImg: string; name: string }> = {
  start: { icon: '🏁', iconImg: ICONS.mapStart, name: 'スタート' },
  enemy: { icon: '⚔️', iconImg: ICONS.mapBattle, name: '戦闘' },
  unique_boss: { icon: '💀', iconImg: ICONS.mapElite, name: '強敵' },
  pawnshop: { icon: '🏪', iconImg: ICONS.mapShop, name: '質屋' },
  event: { icon: '❓', iconImg: ICONS.mapEvent, name: 'イベント' },
  shrine: { icon: '⛩️', iconImg: ICONS.mapShrine, name: '神社' },
  hotel: { icon: '🏨', iconImg: ICONS.mapHotel, name: 'ホテル' },
  area_boss: { icon: '👑', iconImg: ICONS.mapBoss, name: 'エリアボス' },
};

export const AREA1_ELITES: EnemyTemplateLike[] = [
  {
    templateId: 'biker_leader',
    name: '暴走族リーダー',
    icon: '🏍️',
    imageUrl: bikerLeaderImage,
    maxHp: 90,
    intents: [
      { type: 'attack', value: 18, description: '囲み込んで威圧', icon: '⚔️' },
      { type: 'buff', value: 3, description: '走りを呼ぶ', icon: '📢' },
      { type: 'attack', value: 20, description: 'マフラー音で牽制', icon: '🏍️' },
      { type: 'attack', value: 22, description: '特攻突っ込み', icon: '💥' },
    ],
  },
  {
    templateId: 'evil_realtor',
    name: '悪徳不動産屋',
    icon: '🏠',
    imageUrl: badRealtorImage,
    maxHp: 75,
    intents: [
      { type: 'attack', value: 14, description: '解約を拒否する', icon: '⚔️' },
      { type: 'mental_attack', value: 0, mentalDamage: 1, description: '小さな字の説明書攻撃', icon: '📋' },
      { type: 'attack', value: 16, description: '立ち退き迫る', icon: '🚪' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '抜け穴だらけの条項', icon: '📄' },
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
    { type: 'attack', value: 14, description: '応対のフリをして踏み込む', icon: '⚔️' },
    { type: 'mental_attack', value: 0, mentalDamage: 1, description: 'クレームの種をまく', icon: '😤' },
    { type: 'attack', value: 22, description: '要求エスカレート', icon: '💢' },
    { type: 'debuff', value: 2, debuffType: 'vulnerable', description: '炎上を煽る投稿', icon: '📱' },
    { type: 'mental_attack', value: 0, mentalDamage: 2, description: 'レビュー爆撃', icon: '⭐' },
  ],
};

export const RELICS: Omamori[] = [
  {
    id: 'energy_drink',
    name: 'エナジードリンク',
    icon: '⚡',
    imageUrl: energyDrinkImage,
    description: '戦闘開始時タイムバー+1秒（初ターンのみ）',
    effect: { type: 'start_of_battle', stat: 'time', value: 1 },
  },
  {
    id: 'amulet',
    name: '厄除けお守り',
    icon: '🔮',
    imageUrl: amuletImage,
    description: '呪いカード1枚を無効化',
    effect: { type: 'passive', stat: 'curse_immunity', value: 1 },
  },
  {
    id: 'alarm_clock',
    name: '目覚まし時計',
    icon: '⏰',
    imageUrl: alarmClockImage,
    description: '毎ターン開始時カード+1枚ドロー',
    effect: { type: 'on_turn_start', stat: 'draw', value: 1 },
  },
  {
    id: 'supplement',
    name: '栄養サプリ',
    icon: '💊',
    imageUrl: supplementImage,
    description: '休憩マスでの回復量+10',
    effect: { type: 'passive', stat: 'rest_heal', value: 10 },
  },
  {
    id: 'brand_wallet',
    name: 'ブランド財布',
    icon: '👜',
    imageUrl: brandWalletImage,
    description: 'ショップ全品15%割引',
    effect: { type: 'passive', stat: 'shop_discount', value: 0.15 },
  },
  {
    id: 'hard_hat',
    name: '安全第一ヘルメット',
    icon: '⛑️',
    imageUrl: hardHatImage,
    description: '毎ターン+2ブロック',
    effect: { type: 'on_turn_start', stat: 'block', value: 2 },
  },
  {
    id: 'victory_charm',
    name: '勝利のお守り',
    icon: '🏆',
    imageUrl: victoryCharmImage,
    description: '敵を倒すたびHPを2回復',
    effect: { type: 'on_kill', stat: 'heal', value: 2 },
  },
  {
    id: 'fortune_cat',
    name: '招き猫のお守り',
    icon: '🐱',
    imageUrl: fortuneCatImage,
    description: '敵を倒すたび+4G',
    effect: { type: 'on_kill', stat: 'gold', value: 4 },
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
      { text: '購入する（-10G、何が出るかはお楽しみ）', effects: [{ type: 'gold', value: -10 }] },
      { text: 'やめておく', effects: [] },
    ],
  },
  {
    id: 'training',
    name: '職業訓練校',
    description:
      '短期講座の無料体験をやっている。受講するとカードを1枚強化できる。',
    choices: [
      { text: '受講する（カード1枚を強化）', effects: [] },
      { text: '時間がないので断る', effects: [] },
    ],
  },
  {
    id: 'shrine_lucky_charm',
    name: '拾ったお守り',
    description: '道端で小さなお守りを拾った。持ち主は見当たらない。',
    choices: [
      { text: 'ありがたく受け取る（お守り獲得）', effects: [{ type: 'omamori', value: 1 }] },
      { text: 'そのまま置いておく', effects: [] },
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
  {
    id: 'park_nap',
    name: '公園でお昼寝',
    description: 'ベンチが空いていた。少し休むか…',
    choices: [
      { text: '気持ちよく眠る（メンタル+2）', effects: [{ type: 'mental', value: 2 }] },
      { text: '短く仮眠する（HP+5）', effects: [{ type: 'heal', value: 5 }] },
    ],
  },
  {
    id: 'stray_cat',
    name: '野良猫に懐かれた',
    description: '足元をグルグル回る猫が、しきりに擦り寄ってくる。',
    choices: [{ text: '撫でる（メンタル+1）', effects: [{ type: 'mental', value: 1 }] }],
  },
  {
    id: 'convenience_win',
    name: 'コンビニでポイント当選',
    description: 'レシートのキャンペーンに当たったようだ。',
    choices: [{ text: '引き換える（+20G）', effects: [{ type: 'gold', value: 20 }] }],
  },
  {
    id: 'lost_way',
    name: '道に迷った',
    description: '見慣れない路地に迷い込んでしまった。',
    choices: [
      { text: '歩き回る（HP-5）', effects: [{ type: 'damage', value: 5 }] },
      { text: '地図アプリを買う（-10G）', effects: [{ type: 'gold', value: -10 }] },
    ],
  },
];

/** エリア2専用（中盤・判断・リスク／リターン） */
const AREA2_ONLY_EVENTS: GameEvent[] = [
  {
    id: 'friend_encounter',
    name: '知人にばったり会う',
    description: '昔の顔見知りと鉢合わせした。しばらく話が弾んだ。',
    choices: [
      {
        text: '飲みに行く（-15G、メンタル+2）',
        effects: [{ type: 'gold', value: -15 }, { type: 'mental', value: 2 }],
      },
      { text: '挨拶だけして断る', effects: [] },
    ],
  },
  {
    id: 'cheap_tools_sale',
    name: '工具を安く売っている',
    description: '路肩に並んだ品。本物かどうかはわからない。',
    choices: [
      {
        text: '買う（-30G、カード1枚）',
        effects: [{ type: 'gold', value: -30 }, { type: 'card', value: 1 }],
      },
      { text: 'スルーする', effects: [] },
    ],
  },
  {
    id: 'suspicious_parttime',
    name: '不審なアルバイト',
    description: 'チラシに「日給高め」と書いてある。詳細はあいまいだ。',
    choices: [
      {
        text: '引き受ける（+50G、HP-15）',
        effects: [{ type: 'gold', value: 50 }, { type: 'damage', value: 15 }],
      },
      { text: '断る', effects: [] },
    ],
  },
  {
    id: 'hungry_starving',
    name: '空腹で倒れそう',
    description: '胃がきしむ音がする。何か食べないと…',
    choices: [
      {
        text: '飯を買う（-10G、HP+20）',
        effects: [{ type: 'gold', value: -10 }, { type: 'heal', value: 20 }],
      },
      { text: '我慢する（HP-10）', effects: [{ type: 'damage', value: 10 }] },
    ],
  },
];

/** エリア3専用（終盤・高リスク高リターン）。賭け・謎の薬は chooseEventChoice で50%分岐 */
const AREA3_ONLY_EVENTS: GameEvent[] = [
  {
    id: 'gambling_invite',
    name: '賭け事の誘い',
    description: '怪しげな男が声をかけてきた。一発逆転か、一発地獄か。',
    choices: [
      { text: '賭けに参加する（+80G or -40G、どちらかは運次第）', effects: [] },
      { text: '断る', effects: [] },
    ],
  },
  {
    id: 'work_to_limit',
    name: '限界まで働く',
    description: '急ぎの仕事が山積みだ。身体を削れば報酬は大きい。',
    choices: [
      {
        text: '受ける（+60G、HP-20、メンタル-2）',
        effects: [{ type: 'gold', value: 60 }, { type: 'damage', value: 20 }, { type: 'mental', value: -2 }],
      },
      { text: '断る', effects: [] },
    ],
  },
  {
    id: 'mystery_medicine',
    name: '謎の薬',
    description: 'ラベルのない瓶が転がっている。飲めば…？',
    choices: [
      { text: '飲んでみる（HP+30 or HP-20、どちらかは運次第）', effects: [] },
      { text: '捨てる', effects: [] },
    ],
  },
  {
    id: 'omamori_merchant',
    name: 'お守りの行商人',
    description: '巾着に詰まったお守りを売り歩いている。',
    choices: [
      {
        text: '買う（-40G、お守り1）',
        effects: [{ type: 'gold', value: -40 }, { type: 'omamori', value: 1 }],
      },
      { text: 'スルーする', effects: [] },
    ],
  },
];

const AREA2_EVENT_IDS_FROM_AREA1 = new Set([
  'lost_item',
  'cat_cafe',
  'street_musician',
  'vending_machine',
  'training',
  'shrine_lucky_charm',
  'drinking_party',
  'lost_wallet',
  'bad_memory',
]);

const AREA3_EVENT_IDS_FROM_AREA1 = new Set([
  'drinking_party',
  'vending_machine',
  'tripped',
  'lost_wallet',
  'bad_memory',
  'health_checkup',
  'cat_cafe',
  'street_musician',
  'found_money',
]);

export const AREA2_EVENTS: GameEvent[] = [
  ...AREA2_ONLY_EVENTS,
  ...AREA1_EVENTS.filter((e) => AREA2_EVENT_IDS_FROM_AREA1.has(e.id)),
];

export const AREA3_EVENTS: GameEvent[] = [
  ...AREA3_ONLY_EVENTS,
  ...AREA1_EVENTS.filter((e) => AREA3_EVENT_IDS_FROM_AREA1.has(e.id)),
];

/**
 * イベント抽選の重み（未指定 id は 1.0）。
 * - 高め: 選択なしで明確なプラス、または強い恒常報酬（強化・お守り・大きめ回復・ゴールド）
 * - 基準 1.0: 判断が分かれる・コストとトレードのある選択肢
 * - 低め: 純デメリット1択、極端なギャンブル（50%系）、身体に効くデバフ付き高額報酬
 */
const EVENT_SELECTION_WEIGHTS: Record<string, number> = {
  // --- エリア1共有 ---
  lost_item: 1.0,
  cat_cafe: 1.0,
  street_musician: 1.0,
  vending_machine: 0.88,
  training: 1.22,
  shrine_lucky_charm: 1.22,
  drinking_party: 0.94,
  found_money: 1.32,
  good_mood: 1.32,
  health_checkup: 1.28,
  lost_wallet: 0.56,
  bad_memory: 0.58,
  tripped: 0.58,
  park_nap: 1.26,
  stray_cat: 1.32,
  convenience_win: 1.32,
  lost_way: 0.94,
  // --- エリア2専用 ---
  friend_encounter: 1.0,
  cheap_tools_sale: 1.0,
  suspicious_parttime: 0.92,
  hungry_starving: 1.0,
  // --- エリア3専用 ---
  gambling_invite: 0.68,
  work_to_limit: 0.9,
  mystery_medicine: 0.68,
  omamori_merchant: 1.12,
};

const getEventSelectionWeight = (id: string): number => EVENT_SELECTION_WEIGHTS[id] ?? 1;

const pickWeightedGameEvent = (pool: GameEvent[]): GameEvent => {
  if (pool.length === 0) {
    throw new Error('pickWeightedGameEvent: empty pool');
  }
  const total = pool.reduce((sum, e) => sum + getEventSelectionWeight(e.id), 0);
  let r = Math.random() * total;
  for (const e of pool) {
    r -= getEventSelectionWeight(e.id);
    if (r <= 0) return e;
  }
  return pool[pool.length - 1];
};

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const pickRandomCommonCard = (jobId: JobId = 'carpenter'): Card =>
  cloneRewardCard(pickRandom(getCardPoolsByJob(jobId).common.filter((card) => !card.neutral)));
export const pickRandomUncommonCard = (jobId: JobId = 'carpenter'): Card =>
  cloneRewardCard(pickRandom(getCardPoolsByJob(jobId).uncommon.filter((card) => !card.neutral)));
export const pickRandomRareCard = (jobId: JobId = 'carpenter'): Card =>
  cloneRewardCard(pickRandom(getCardPoolsByJob(jobId).rare.filter((card) => !card.neutral)));

const getNeutralPoolForPick = (rarity: 'uncommon' | 'rare'): Card[] => {
  const unlocked = getUnlockedCardIds();
  return NEUTRAL_CARD_POOL.filter(
    (c) =>
      c.rarity === rarity &&
      (!ACHIEVEMENT_LOCKED_CARD_IDS.has(c.id) || unlocked.has(c.id)),
  );
};

const pickRandomNeutralByRarity = (rarity: 'common' | 'uncommon' | 'rare'): Card => {
  if (rarity === 'rare') return cloneRewardCard(pickRandom(getNeutralPoolForPick('rare')));
  if (rarity === 'uncommon') return cloneRewardCard(pickRandom(getNeutralPoolForPick('uncommon')));
  return cloneRewardCard(pickRandom(NEUTRAL_COMMON_POOL));
};

export const generateCardRewardChoices = (jobId: JobId = 'carpenter', count = 3): Card[] => {
  const cards: Card[] = [];
  for (let i = 0; i < count; i += 1) {
    const roll = Math.random();
    const rarity: 'common' | 'uncommon' | 'rare' = roll < 0.03 ? 'rare' : roll < 0.23 ? 'uncommon' : 'common';
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

export const generateRareCardRewardChoices = (jobId: JobId = 'carpenter', count = 3): Card[] => {
  const cards: Card[] = [];
  for (let i = 0; i < count; i += 1) {
    const useNeutral = Math.random() < 0.3;
    if (useNeutral) {
      cards.push(pickRandomNeutralByRarity('rare'));
    } else {
      cards.push(pickRandomRareCard(jobId));
    }
  }
  return cards;
};

export const generateOmamoriChoices = (
  count = 3,
  currentOmamoris: Omamori[] = [],
): Omamori[] => {
  const ownedIds = new Set(currentOmamoris.map((o) => o.id));
  const available = RELICS.filter((relic) => !ownedIds.has(relic.id));
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

export const generateShopCards = (count: number, jobId: JobId = 'carpenter'): Card[] =>
  Array.from({ length: count }).map(() => {
    const roll = Math.random();
    const rarity: 'common' | 'uncommon' | 'rare' = roll < 0.03 ? 'rare' : roll < 0.23 ? 'uncommon' : 'common';
    const useNeutral = Math.random() < 0.3;
    if (useNeutral) return pickRandomNeutralByRarity(rarity);
    if (rarity === 'rare') return pickRandomRareCard(jobId);
    if (rarity === 'uncommon') return pickRandomUncommonCard(jobId);
    return pickRandomCommonCard(jobId);
  });

const ALL_RARE_NAMES = new Set([
  ...getCardPoolsByJob('carpenter').rare,
  ...getCardPoolsByJob('cook').rare,
  ...getCardPoolsByJob('unemployed').rare,
].map((entry) => entry.name));

const ALL_UNCOMMON_NAMES = new Set([
  ...getCardPoolsByJob('carpenter').uncommon,
  ...getCardPoolsByJob('cook').uncommon,
  ...getCardPoolsByJob('unemployed').uncommon,
].map((entry) => entry.name));

export const getCardPrice = (card: Card): number => {
  if (ALL_RARE_NAMES.has(card.name)) return 150;
  if (ALL_UNCOMMON_NAMES.has(card.name)) return 80;
  return 50;
};

export const getSellPrice = (card: Card): number => {
  const buyPrice = getCardPrice(card);
  if (buyPrice >= 150) return 50;
  if (buyPrice >= 80) return 25;
  return 15;
};

export const generateShopItems = (count: number): RunItem[] => {
  const shuffled = [...ITEMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((item, idx) => ({ ...item, id: `${item.id}_shop_${Date.now()}_${idx}` }));
};

/** 3体は出現率を抑え、1体のときは中央大表示用レイアウトと組み合わせる */
export const pickArea1EncounterTemplateIds = (): string[] => {
  const r = Math.random();
  if (r < 0.11) {
    const triples = [
      ['wildCat', 'wildCat', 'wildCat'],
      ['wildCat', 'bicycle', 'claimer'],
      ['solicitor', 'wildCat', 'bicycle'],
    ];
    return triples[Math.floor(Math.random() * triples.length)];
  }
  if (r < 0.11 + 0.36) {
    const doubles = [
      ['wildCat', 'wildCat'],
      ['claimer', 'drunk'],
      ['wildCat', 'claimer'],
      ['bicycle', 'drunk'],
      ['solicitor', 'claimer'],
    ];
    return doubles[Math.floor(Math.random() * doubles.length)];
  }
  const singles = [['claimer'], ['drunk'], ['bicycle'], ['solicitor']];
  return singles[Math.floor(Math.random() * singles.length)];
};

export const pickArea1Elite = (): EnemyTemplateLike =>
  AREA1_ELITES[Math.floor(Math.random() * AREA1_ELITES.length)];

export const pickEvent = (area: number): GameEvent => {
  const pool = area >= 3 ? AREA3_EVENTS : area >= 2 ? AREA2_EVENTS : AREA1_EVENTS;
  return pickWeightedGameEvent(pool);
};

// ===== AREA 2 =====

export const AREA2_NORMAL_ENEMIES: EnemyTemplateLike[] = [
  {
    templateId: 'collector',
    name: '取り立て屋',
    icon: '💼',
    imageUrl: collectorImage,
    maxHp: 45,
    intents: [
      { type: 'attack', value: 8, description: '督促状を叩きつける', icon: '⚔️' },
      { type: 'steal_gold', value: 5, description: '財布を狙う', icon: '💰' },
      { type: 'attack', value: 9, description: '深夜の呼び出し', icon: '⚔️' },
    ],
  },
  {
    templateId: 'sloppy_worker',
    name: '手抜き職人',
    icon: '🔧',
    imageUrl: sloppyWorkerImage,
    maxHp: 40,
    intents: [
      { type: 'attack', value: 7, description: '適当な釘打ち', icon: '⚔️' },
      { type: 'defend', value: 0, description: 'サボって煙草', icon: '💫' },
      { type: 'attack', value: 8, description: '材料の切り落としで殴る', icon: '🔧' },
    ],
  },
  {
    templateId: 'yakuza_minion',
    name: 'ヤクザの子分',
    icon: '🐉',
    imageUrl: yakuzaMinionImage,
    maxHp: 55,
    intents: [
      { type: 'attack', value: 10, description: '組の看板を振り回す', icon: '⚔️' },
      { type: 'debuff', value: 2, debuffType: 'vulnerable', description: '睨みで足をすくう', icon: '💢' },
      { type: 'attack', value: 11, description: '鉄パイプを振る', icon: '⚔️' },
    ],
  },
  {
    templateId: 'evil_sales',
    name: '悪徳セールス',
    icon: '📋',
    imageUrl: evilSalesImage,
    maxHp: 38,
    intents: [
      { type: 'attack', value: 6, description: '長話の押し売り', icon: '⚔️' },
      { type: 'add_curse', value: 1, description: '謎の契約書を押しつける', icon: '🌑' },
      { type: 'attack', value: 7, description: 'サンプルを投げつける', icon: '⚔️' },
    ],
  },
  {
    templateId: 'rogue_dump',
    name: '暴走ダンプ',
    icon: '🚛',
    imageUrl: rogueDumpImage,
    maxHp: 65,
    intents: [
      { type: 'attack', value: 12, description: '荷台で体当たり', icon: '⚔️' },
      { type: 'buff', value: 1, description: 'アクセル全開', icon: '⬆️' },
      { type: 'attack', value: 13, description: '排気ガスを浴びせる', icon: '💨' },
    ],
  },
];

export const AREA2_ELITES: EnemyTemplateLike[] = [
  {
    templateId: 'evil_supervisor',
    name: '悪徳監督',
    icon: '👷',
    imageUrl: evilSupervisorImage,
    maxHp: 110,
    intents: [
      { type: 'attack', value: 14, description: '現場で怒鳴り散らす', icon: '⚔️' },
      { type: 'buff', value: 2, description: '作業員を差し向ける', icon: '📢' },
      { type: 'attack', value: 16, description: '図面を叩きつける', icon: '⚔️' },
      { type: 'defend', value: 14, description: '責任を部下になすりつける', icon: '🛡️' },
    ],
  },
  {
    templateId: 'land_shark',
    name: '地上げ屋の親分',
    icon: '🏚️',
    imageUrl: landSharkImage,
    maxHp: 95,
    intents: [
      { type: 'attack', value: 16, description: '空き家に警告文を貼る', icon: '⚔️' },
      { type: 'debuff', value: 3, debuffType: 'burn', description: '嫌がらせの火の手', icon: '🔥' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '住民を脅す噂話', icon: '💢' },
      { type: 'attack', value: 18, description: '解体業者を差し向ける', icon: '⚔️' },
    ],
  },
];

export const AREA2_BOSS: EnemyTemplateLike = {
  templateId: 'evil_ceo',
  name: '悪徳ゼネコン社長',
  icon: '👔',
  imageUrl: evilCeoImage,
  maxHp: 280,
  intents: [
    { type: 'defend', value: 20, description: '会見で誤魔化す', icon: '🛡️' },
    { type: 'attack', value: 14, description: '責任転嫁の唾飛沫', icon: '⚔️' },
    { type: 'attack', value: 22, description: '下請けを蹴る', icon: '💥' },
    { type: 'debuff', value: 2, debuffType: 'weak', description: 'パワハラ叱責', icon: '💢' },
    { type: 'attack', value: 26, description: 'リストラ宣告', icon: '✂️' },
  ],
};

const AREA2_TRIPLE_INDEX_PATTERNS: number[][] = [
  [0, 1, 2],
  [1, 2, 3],
  [2, 3, 4],
  [0, 2, 4],
  [0, 1, 4],
];

export const pickArea2Encounter = (): EnemyTemplateLike[] => {
  const r = Math.random();
  if (r < 0.12) {
    const pick = AREA2_TRIPLE_INDEX_PATTERNS[Math.floor(Math.random() * AREA2_TRIPLE_INDEX_PATTERNS.length)];
    return pick.map((i) => AREA2_NORMAL_ENEMIES[i]);
  }
  if (r < 0.12 + 0.35) {
    const doubles = [
      [0, 1],
      [2, 3],
      [1, 4],
    ];
    const pick = doubles[Math.floor(Math.random() * doubles.length)];
    return pick.map((i) => AREA2_NORMAL_ENEMIES[i]);
  }
  const i = Math.floor(Math.random() * AREA2_NORMAL_ENEMIES.length);
  return [AREA2_NORMAL_ENEMIES[i]];
};

export const pickArea2Elite = (): EnemyTemplateLike =>
  AREA2_ELITES[Math.floor(Math.random() * AREA2_ELITES.length)];

// ===== AREA 3 =====

export const AREA3_NORMAL_ENEMIES: EnemyTemplateLike[] = [
  {
    templateId: 'world_tree_root',
    name: '世界樹の根',
    icon: '🌿',
    imageUrl: worldTreeRootImage,
    maxHp: 55,
    intents: [
      { type: 'attack', value: 9, description: '根を這わせて絡みつく', icon: '⚔️' },
      { type: 'regen', value: 5, description: '大地から養分を吸う', icon: '💚' },
      { type: 'attack', value: 10, description: '地割れを起こす', icon: '⚔️' },
    ],
  },
  {
    templateId: 'lost_soul',
    name: '迷い魂',
    icon: '👻',
    imageUrl: lostSoulImage,
    maxHp: 45,
    intents: [
      { type: 'attack', value: 11, description: 'すり抜ける一撃', icon: '⚔️' },
      { type: 'attack', value: 11, description: '怨嗟のさざ波', icon: '⚔️' },
      { type: 'random_debuff', value: 2, description: '呪いの囁き', icon: '🎲' },
    ],
  },
  {
    templateId: 'stone_soldier',
    name: '石化した兵士',
    icon: '🗿',
    imageUrl: stoneSoldierImage,
    maxHp: 68,
    intents: [
      { type: 'defend', value: 15, description: '石壁の構え', icon: '🛡️' },
      { type: 'attack', value: 10, description: '石斧の一閃', icon: '⚔️' },
      { type: 'attack', value: 9, description: '石化の粉塵', icon: '⚔️' },
    ],
  },
  {
    templateId: 'light_guardian',
    name: '光の番兵',
    icon: '⚔️',
    imageUrl: lightGuardianImage,
    maxHp: 50,
    intents: [
      { type: 'attack', value: 13, description: '閃光の斬撃', icon: '⚔️' },
      { type: 'buff', value: 2, description: '聖域の加護', icon: '⬆️' },
      { type: 'attack', value: 14, description: '逆光で眩ます', icon: '⚔️' },
    ],
  },
  {
    templateId: 'cursed_tree',
    name: '呪われた大木',
    icon: '🌳',
    imageUrl: cursedTreeImage,
    maxHp: 72,
    intents: [
      { type: 'attack', value: 8, description: '枝を鞭のように振る', icon: '⚔️' },
      { type: 'add_curse', value: 1, description: '呪いの実を落とす', icon: '🌑' },
      { type: 'defend', value: 12, description: '樹皮を鎧にする', icon: '🛡️' },
    ],
  },
];

export const AREA3_ELITES: EnemyTemplateLike[] = [
  {
    templateId: 'world_tree_guardian',
    name: '世界樹の守護者',
    icon: '🛡️',
    imageUrl: worldTreeGuardianImage,
    maxHp: 130,
    intents: [
      { type: 'defend', value: 22, description: '樹冠の大盾', icon: '🛡️' },
      { type: 'attack', value: 16, description: '枝槍の突き', icon: '⚔️' },
      { type: 'attack', value: 18, description: '根の足止め', icon: '⚔️' },
      { type: 'defend', value: 20, description: '樹液の膜', icon: '🛡️' },
    ],
  },
  {
    templateId: 'ancient_ghost',
    name: '古代の亡霊',
    icon: '💀',
    imageUrl: ancientGhostImage,
    maxHp: 115,
    intents: [
      { type: 'attack', value: 18, description: '墓場からの手招き', icon: '⚔️' },
      { type: 'debuff', value: 2, debuffType: 'vulnerable', description: '怨念の呪縛', icon: '💢' },
      { type: 'attack', value: 20, description: '魂を削る悲鳴', icon: '⚔️' },
      { type: 'defend', value: 0, description: '霧に溶ける（牽制）', icon: '👻' },
    ],
  },
];

export const AREA3_BOSS: EnemyTemplateLike = {
  templateId: 'world_tree_warden',
  name: '世界樹の番人',
  icon: '🌲',
  imageUrl: worldTreeWardenImage,
  maxHp: 350,
  intents: [
    { type: 'defend', value: 22, description: '世界樹の根壁', icon: '🛡️' },
    { type: 'attack', value: 18, description: '樹海の薙ぎ払い', icon: '⚔️' },
    { type: 'debuff', value: 2, debuffType: 'weak', description: '年輪の呪い', icon: '💢' },
    { type: 'attack', value: 24, description: '巨枝の落下', icon: '💥' },
    { type: 'random_debuff', value: 3, description: '瘴気の渦', icon: '🎲' },
  ],
};

const AREA3_TRIPLE_INDEX_PATTERNS: number[][] = [
  [0, 1, 2],
  [1, 2, 3],
  [2, 3, 4],
  [0, 2, 4],
  [0, 1, 4],
];

export const pickArea3Encounter = (): EnemyTemplateLike[] => {
  const r = Math.random();
  if (r < 0.12) {
    const pick = AREA3_TRIPLE_INDEX_PATTERNS[Math.floor(Math.random() * AREA3_TRIPLE_INDEX_PATTERNS.length)];
    return pick.map((i) => AREA3_NORMAL_ENEMIES[i]);
  }
  if (r < 0.12 + 0.35) {
    const doubles = [
      [0, 1],
      [2, 3],
      [1, 4],
    ];
    const pick = doubles[Math.floor(Math.random() * doubles.length)];
    return pick.map((i) => AREA3_NORMAL_ENEMIES[i]);
  }
  const i = Math.floor(Math.random() * AREA3_NORMAL_ENEMIES.length);
  return [AREA3_NORMAL_ENEMIES[i]];
};

export const pickArea3Elite = (): EnemyTemplateLike =>
  AREA3_ELITES[Math.floor(Math.random() * AREA3_ELITES.length)];
