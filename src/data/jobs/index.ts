import type { Card, JobId } from '../../types/game';
import { getUnlockedCardIds } from '../../utils/achievementSystem';
import {
  CARPENTER_ACHIEVEMENT_RARE_CARDS,
  CARPENTER_COMMON_POOL,
  CARPENTER_RARE_POOL,
  CARPENTER_UNCOMMON_POOL,
  createCarpenterStarterDeck,
} from './carpenter';
import { COOK_COMMON_POOL, COOK_RARE_POOL, COOK_STARTER_DECK, COOK_UNCOMMON_POOL } from './cook';
import {
  UNEMPLOYED_COMMON_POOL,
  UNEMPLOYED_RARE_POOL,
  UNEMPLOYED_STARTER_DECK,
  UNEMPLOYED_UNCOMMON_POOL,
} from './unemployed';
import {
  NEUTRAL_ACHIEVEMENT_RARE_CARDS,
  NEUTRAL_COMMON_POOL,
  NEUTRAL_RARE_POOL,
  NEUTRAL_UNCOMMON_POOL,
} from '../cards/neutralCards';

export interface JobConfig {
  id: JobId;
  initialHp: number;
  initialMental: number;
  /** メンタルがこれ以上に増えない（UI・バトル・マップイベントで共通） */
  maxMental: number;
  createStarterDeck: () => Card[];
}

export interface JobCardPools {
  common: Card[];
  uncommon: Card[];
  rare: Card[];
}

let starterSerial = 0;
let rewardSerial = 0;

const cloneStarterCard = (card: Card): Card => {
  starterSerial += 1;
  return { ...card, id: `${card.id}_${starterSerial}` };
};

export const cloneRewardCard = (card: Card): Card => {
  rewardSerial += 1;
  return { ...card, id: `${card.id}_reward_${rewardSerial}` };
};

const createFixedStarterDeck = (cards: Card[]): Card[] => cards.map(cloneStarterCard);
const withRarity = (cards: Card[], rarity: 'common' | 'uncommon' | 'rare'): Card[] =>
  cards.map((card) => ({ ...card, rarity: card.rarity ?? rarity }));

export const CARPENTER_CONFIG: JobConfig = {
  id: 'carpenter',
  initialHp: 80,
  initialMental: 7,
  maxMental: 9,
  createStarterDeck: () => createCarpenterStarterDeck(),
};

export const COOK_CONFIG: JobConfig = {
  id: 'cook',
  initialHp: 80,
  initialMental: 6,
  maxMental: 8,
  createStarterDeck: () => createFixedStarterDeck(COOK_STARTER_DECK),
};

export const UNEMPLOYED_CONFIG: JobConfig = {
  id: 'unemployed',
  initialHp: 70,
  initialMental: 10,
  maxMental: 10,
  createStarterDeck: () => createFixedStarterDeck(UNEMPLOYED_STARTER_DECK),
};

export const getJobConfig = (jobId: JobId): JobConfig => {
  if (jobId === 'cook') return COOK_CONFIG;
  if (jobId === 'unemployed') return UNEMPLOYED_CONFIG;
  return CARPENTER_CONFIG;
};

const withUnlockedAchievementRares = (jobId: JobId, carpenterRare: Card[], neutralRare: Card[]): Card[] => {
  const unlocked = getUnlockedCardIds();
  const extraNeutral = NEUTRAL_ACHIEVEMENT_RARE_CARDS.filter((c) => unlocked.has(c.id)).map((c) => ({
    ...c,
    rarity: 'rare' as const,
  }));
  if (jobId === 'carpenter') {
    const extraJob = CARPENTER_ACHIEVEMENT_RARE_CARDS.filter((c) => unlocked.has(c.id)).map((c) => ({
      ...c,
      rarity: 'rare' as const,
    }));
    return [...carpenterRare, ...neutralRare, ...extraJob, ...extraNeutral];
  }
  return [...carpenterRare, ...neutralRare, ...extraNeutral];
};

export const getCardPoolsByJob = (jobId: JobId): JobCardPools => {
  if (jobId === 'cook') {
    const rare = withUnlockedAchievementRares(
      'cook',
      [...withRarity(COOK_RARE_POOL, 'rare')],
      [...withRarity(NEUTRAL_RARE_POOL, 'rare')],
    );
    return {
      common: [...withRarity(COOK_COMMON_POOL, 'common'), ...withRarity(NEUTRAL_COMMON_POOL, 'common')],
      uncommon: [...withRarity(COOK_UNCOMMON_POOL, 'uncommon'), ...withRarity(NEUTRAL_UNCOMMON_POOL, 'uncommon')],
      rare,
    };
  }
  if (jobId === 'unemployed') {
    const rare = withUnlockedAchievementRares(
      'unemployed',
      [...withRarity(UNEMPLOYED_RARE_POOL, 'rare')],
      [...withRarity(NEUTRAL_RARE_POOL, 'rare')],
    );
    return {
      common: [...withRarity(UNEMPLOYED_COMMON_POOL, 'common'), ...withRarity(NEUTRAL_COMMON_POOL, 'common')],
      uncommon: [
        ...withRarity(UNEMPLOYED_UNCOMMON_POOL, 'uncommon'),
        ...withRarity(NEUTRAL_UNCOMMON_POOL, 'uncommon'),
      ],
      rare,
    };
  }
  const rare = withUnlockedAchievementRares(
    'carpenter',
    [...withRarity(CARPENTER_RARE_POOL, 'rare')],
    [...withRarity(NEUTRAL_RARE_POOL, 'rare')],
  );
  return {
    common: [...withRarity(CARPENTER_COMMON_POOL, 'common'), ...withRarity(NEUTRAL_COMMON_POOL, 'common')],
    uncommon: [...withRarity(CARPENTER_UNCOMMON_POOL, 'uncommon'), ...withRarity(NEUTRAL_UNCOMMON_POOL, 'uncommon')],
    rare,
  };
};
