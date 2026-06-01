import type { JobId } from '../types/game';
import type { MasteryBadgeTier } from '../utils/jobMasterySystem';

import badgeMasteryCarpenterAdvanced from '../assets/badges/badge_mastery_carpenter_advanced.png';
import badgeMasteryCarpenterExpert from '../assets/badges/badge_mastery_carpenter_expert.png';
import badgeMasteryCarpenterSage from '../assets/badges/badge_mastery_carpenter_sage.png';
import badgeMasteryCookAdvanced from '../assets/badges/badge_mastery_cook_advanced.png';
import badgeMasteryCookExpert from '../assets/badges/badge_mastery_cook_expert.png';
import badgeMasteryCookSage from '../assets/badges/badge_mastery_cook_sage.png';
import badgeMasteryCourierAdvanced from '../assets/badges/badge_mastery_courier_advanced.png';
import badgeMasteryCourierExpert from '../assets/badges/badge_mastery_courier_expert.png';
import badgeMasteryCourierSage from '../assets/badges/badge_mastery_courier_sage.png';
import badgeMasteryUnemployedAdvanced from '../assets/badges/badge_mastery_unemployed_advanced.png';
import badgeMasteryUnemployedExpert from '../assets/badges/badge_mastery_unemployed_expert.png';
import badgeMasteryUnemployedSage from '../assets/badges/badge_mastery_unemployed_sage.png';
import badgeRankingChampion1 from '../assets/badges/badge_ranking_champion_1.png';

export const MASTERY_BADGE_IMAGE_BY_JOB_TIER: Record<JobId, Record<MasteryBadgeTier, string>> = {
  carpenter: {
    advanced: badgeMasteryCarpenterAdvanced,
    expert: badgeMasteryCarpenterExpert,
    sage: badgeMasteryCarpenterSage,
  },
  cook: {
    advanced: badgeMasteryCookAdvanced,
    expert: badgeMasteryCookExpert,
    sage: badgeMasteryCookSage,
  },
  unemployed: {
    advanced: badgeMasteryUnemployedAdvanced,
    expert: badgeMasteryUnemployedExpert,
    sage: badgeMasteryUnemployedSage,
  },
  courier: {
    advanced: badgeMasteryCourierAdvanced,
    expert: badgeMasteryCourierExpert,
    sage: badgeMasteryCourierSage,
  },
};

export const getMasteryBadgeImage = (jobId: JobId, tier: MasteryBadgeTier): string =>
  MASTERY_BADGE_IMAGE_BY_JOB_TIER[jobId][tier];

export type RankingChampionBadgeTier = 1 | 2 | 3 | 4 | 5;

export const RANKING_CHAMPION_BADGE_IMAGE_BY_TIER: Partial<Record<RankingChampionBadgeTier, string>> = {
  1: badgeRankingChampion1,
};

export const getRankingChampionBadgeImage = (count?: number | null): string | null => {
  if (!count || count <= 0) return null;
  const tier = Math.min(5, Math.max(1, Math.floor(count))) as RankingChampionBadgeTier;
  return RANKING_CHAMPION_BADGE_IMAGE_BY_TIER[tier] ?? RANKING_CHAMPION_BADGE_IMAGE_BY_TIER[1] ?? null;
};
