import type { Card, JobId } from '../../types/game';
import { getUnlockedAchievementCardsForJob } from '../../utils/achievementRewardLookup';
import {
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
import { NEUTRAL_COMMON_POOL, NEUTRAL_RARE_POOL, NEUTRAL_UNCOMMON_POOL } from '../cards/neutralCards';

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
  const definitionId = card.definitionId ?? card.id;
  return { ...card, id: `${card.id}_${starterSerial}`, definitionId, baseCardId: card.baseCardId };
};

export const cloneRewardCard = (card: Card): Card => {
  rewardSerial += 1;
  const definitionId = card.definitionId ?? card.id;
  return { ...card, id: `${card.id}_reward_${rewardSerial}`, definitionId, baseCardId: card.baseCardId };
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
  initialHp: 100,
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

const mergeUnlockedAchievementCards = (jobId: JobId, uncommon: Card[], rare: Card[]): { uncommon: Card[]; rare: Card[] } => {
  const extra = getUnlockedAchievementCardsForJob(jobId);
  const eu: Card[] = [];
  const er: Card[] = [];
  for (const c of extra) {
    const rr = c.rarity ?? 'common';
    if (rr === 'uncommon') eu.push({ ...c, rarity: 'uncommon' });
    if (rr === 'rare') er.push({ ...c, rarity: 'rare' });
  }
  return { uncommon: [...uncommon, ...eu], rare: [...rare, ...er] };
};

export const getCardPoolsByJob = (jobId: JobId): JobCardPools => {
  if (jobId === 'cook') {
    const merged = mergeUnlockedAchievementCards(
      'cook',
      [...withRarity(COOK_UNCOMMON_POOL, 'uncommon'), ...withRarity(NEUTRAL_UNCOMMON_POOL, 'uncommon')],
      [...withRarity(COOK_RARE_POOL, 'rare'), ...withRarity(NEUTRAL_RARE_POOL, 'rare')],
    );
    return {
      common: [...withRarity(COOK_COMMON_POOL, 'common'), ...withRarity(NEUTRAL_COMMON_POOL, 'common')],
      uncommon: merged.uncommon,
      rare: merged.rare,
    };
  }
  if (jobId === 'unemployed') {
    const merged = mergeUnlockedAchievementCards(
      'unemployed',
      [
        ...withRarity(UNEMPLOYED_UNCOMMON_POOL, 'uncommon'),
        ...withRarity(NEUTRAL_UNCOMMON_POOL, 'uncommon'),
      ],
      [...withRarity(UNEMPLOYED_RARE_POOL, 'rare'), ...withRarity(NEUTRAL_RARE_POOL, 'rare')],
    );
    return {
      common: [...withRarity(UNEMPLOYED_COMMON_POOL, 'common'), ...withRarity(NEUTRAL_COMMON_POOL, 'common')],
      uncommon: merged.uncommon,
      rare: merged.rare,
    };
  }
  const merged = mergeUnlockedAchievementCards(
    'carpenter',
    [...withRarity(CARPENTER_UNCOMMON_POOL, 'uncommon'), ...withRarity(NEUTRAL_UNCOMMON_POOL, 'uncommon')],
    [...withRarity(CARPENTER_RARE_POOL, 'rare'), ...withRarity(NEUTRAL_RARE_POOL, 'rare')],
  );
  return {
    common: [...withRarity(CARPENTER_COMMON_POOL, 'common'), ...withRarity(NEUTRAL_COMMON_POOL, 'common')],
    uncommon: merged.uncommon,
    rare: merged.rare,
  };
};
