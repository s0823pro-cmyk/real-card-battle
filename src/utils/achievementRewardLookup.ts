/** 実績報酬のカード解決（achievementSystem とは分離し runData との循環を防ぐ） */
import type { Card } from '../types/game';
import type { JobId } from '../types/game';
import { NEUTRAL_CARD_POOL } from '../data/cards/neutralCards';
import {
  CARPENTER_COMMON_POOL,
  CARPENTER_RARE_POOL_ALL,
  CARPENTER_UNCOMMON_POOL_UNFILTERED,
} from '../data/jobs/carpenter';
import {
  COOK_COMMON_POOL,
  COOK_RARE_POOL_UNFILTERED,
  COOK_UNCOMMON_POOL_UNFILTERED,
} from '../data/jobs/cook';
import {
  UNEMPLOYED_COMMON_POOL,
  UNEMPLOYED_RARE_POOL_UNFILTERED,
  UNEMPLOYED_UNCOMMON_POOL_UNFILTERED,
} from '../data/jobs/unemployed';
import { getUnlockedCardIds } from './achievementSystem';

const JOB_CARD_SOURCES: Record<JobId, Card[]> = {
  carpenter: [...CARPENTER_COMMON_POOL, ...CARPENTER_UNCOMMON_POOL_UNFILTERED, ...CARPENTER_RARE_POOL_ALL],
  cook: [...COOK_COMMON_POOL, ...COOK_UNCOMMON_POOL_UNFILTERED, ...COOK_RARE_POOL_UNFILTERED],
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
add(JOB_CARD_SOURCES.carpenter);
add(JOB_CARD_SOURCES.cook);
add(JOB_CARD_SOURCES.unemployed);

/** 実績報酬カード1枚をIDで取得 */
export const getAchievementRewardCard = (rewardId: string): Card | null => LOOKUP.get(rewardId) ?? null;

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
