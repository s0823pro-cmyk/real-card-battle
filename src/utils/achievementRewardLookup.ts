/** 実績報酬のカード解決（achievementSystem とは分離し runData との循環を防ぐ） */
import type { Card } from '../types/game';
import type { JobId } from '../types/game';
import { NEUTRAL_CARD_POOL } from '../data/cards/neutralCards';
import {
  CARPENTER_COMMON_POOL_UNFILTERED,
  CARPENTER_RARE_POOL_ALL,
  CARPENTER_UNCOMMON_POOL_UNFILTERED,
} from '../data/jobs/carpenter';
import {
  COOK_COMMON_POOL,
  COOK_RARE_POOL_ALL,
  COOK_UNCOMMON_POOL_UNFILTERED,
} from '../data/jobs/cook';
import {
  UNEMPLOYED_COMMON_POOL,
  UNEMPLOYED_RARE_POOL_UNFILTERED,
  UNEMPLOYED_UNCOMMON_POOL_UNFILTERED,
} from '../data/jobs/unemployed';
import { getUnlockedCardIds } from './achievementSystem';

/** 実績報酬は大工＋無色のみ。抽選プール用に料理人・無職の全カードも参照する */
const CARPENTER_ALL: Card[] = [
  ...CARPENTER_COMMON_POOL_UNFILTERED,
  ...CARPENTER_UNCOMMON_POOL_UNFILTERED,
  ...CARPENTER_RARE_POOL_ALL,
];

const COOK_ALL: Card[] = [
  ...COOK_COMMON_POOL,
  ...COOK_UNCOMMON_POOL_UNFILTERED,
  ...COOK_RARE_POOL_ALL,
];

const JOB_CARD_SOURCES: Record<JobId, Card[]> = {
  carpenter: CARPENTER_ALL,
  cook: COOK_ALL,
  unemployed: [...UNEMPLOYED_COMMON_POOL, ...UNEMPLOYED_UNCOMMON_POOL_UNFILTERED, ...UNEMPLOYED_RARE_POOL_UNFILTERED],
};

const JOB_ID_SET: Record<JobId, Set<string>> = {
  carpenter: new Set(JOB_CARD_SOURCES.carpenter.map((c) => c.id)),
  cook: new Set(JOB_CARD_SOURCES.cook.map((c) => c.id)),
  unemployed: new Set(JOB_CARD_SOURCES.unemployed.map((c) => c.id)),
};

const NEUTRAL_IDS = new Set(NEUTRAL_CARD_POOL.map((c) => c.id));

const LOOKUP = new Map<string, Card>();
const add = (cards: Card[]): void => {
  for (const c of cards) {
    if (!LOOKUP.has(c.id)) LOOKUP.set(c.id, c);
  }
};
add(NEUTRAL_CARD_POOL);
add(CARPENTER_ALL);
add(COOK_ALL);
add(JOB_CARD_SOURCES.unemployed);

/** アプリ内のカード定義を ID で解決（図鑑・統計プレビュー等） */
export const getCardById = (cardId: string): Card | null => LOOKUP.get(cardId) ?? null;

/** 実績報酬カード1枚をIDで取得 */
export const getAchievementRewardCard = getCardById;

/** CardComponent の jobId 用（無色は大工表示に寄せる） */
export const getDisplayJobIdForCard = (card: Card): JobId => {
	if (card.neutral) return 'carpenter';
	if (JOB_ID_SET.cook.has(card.id)) return 'cook';
	if (JOB_ID_SET.unemployed.has(card.id)) return 'unemployed';
	return 'carpenter';
};

export const getAchievementRewardCards = (rewardIdA: string, rewardIdB: string): [Card | null, Card | null] => [
  getAchievementRewardCard(rewardIdA),
  getAchievementRewardCard(rewardIdB),
];

/** 実績解放カードがそのジョブの抽選に含まれるか（無色は全ジョブ） */
export const isAchievementCardInJobPool = (cardId: string, jobId: JobId): boolean => {
  if (NEUTRAL_IDS.has(cardId)) return true;
  return JOB_ID_SET[jobId].has(cardId);
};

/** 解放済み実績カードのうちジョブに合うものだけを返す */
export const getUnlockedAchievementCardsForJob = (jobId: JobId): Card[] => {
  const unlocked = getUnlockedCardIds();
  const out: Card[] = [];
  for (const id of unlocked) {
    if (!isAchievementCardInJobPool(id, jobId)) continue;
    const c = getAchievementRewardCard(id);
    if (c) out.push(c);
  }
  return out;
};
