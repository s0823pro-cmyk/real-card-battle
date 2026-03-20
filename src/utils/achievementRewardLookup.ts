/** 実績報酬表示用のカード／お守り解決（achievementSystem とは分離し runData との循環を防ぐ） */
import type { Card } from '../types/game';
import type { Omamori } from '../types/run';
import { CARPENTER_RARE_POOL_ALL } from '../data/jobs/carpenter';
import { NEUTRAL_CARD_POOL } from '../data/cards/neutralCards';
import { RELICS } from '../data/runData';

/** 実績報酬のカードオブジェクトを取得 */
export const getAchievementRewardCard = (rewardId: string): Card | null => {
  const allCards = [...CARPENTER_RARE_POOL_ALL, ...NEUTRAL_CARD_POOL];
  return allCards.find((c) => c.id === rewardId) ?? null;
};

/** 実績報酬のお守りオブジェクトを取得 */
export const getAchievementRewardOmamori = (rewardId: string): Omamori | null => {
  return RELICS.find((r) => r.id === rewardId) ?? null;
};
