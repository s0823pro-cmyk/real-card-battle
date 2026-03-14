import type { Card, JobId } from '../../types/game';
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

export interface JobConfig {
  id: JobId;
  initialHp: number;
  initialMental: number;
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

export const CARPENTER_CONFIG: JobConfig = {
  id: 'carpenter',
  initialHp: 80,
  initialMental: 7,
  createStarterDeck: () => createCarpenterStarterDeck(),
};

export const COOK_CONFIG: JobConfig = {
  id: 'cook',
  initialHp: 80,
  initialMental: 6,
  createStarterDeck: () => createFixedStarterDeck(COOK_STARTER_DECK),
};

export const UNEMPLOYED_CONFIG: JobConfig = {
  id: 'unemployed',
  initialHp: 70,
  initialMental: 10,
  createStarterDeck: () => createFixedStarterDeck(UNEMPLOYED_STARTER_DECK),
};

export const getJobConfig = (jobId: JobId): JobConfig => {
  if (jobId === 'cook') return COOK_CONFIG;
  if (jobId === 'unemployed') return UNEMPLOYED_CONFIG;
  return CARPENTER_CONFIG;
};

export const getCardPoolsByJob = (jobId: JobId): JobCardPools => {
  if (jobId === 'cook') {
    return {
      common: COOK_COMMON_POOL,
      uncommon: COOK_UNCOMMON_POOL,
      rare: COOK_RARE_POOL,
    };
  }
  if (jobId === 'unemployed') {
    return {
      common: UNEMPLOYED_COMMON_POOL,
      uncommon: UNEMPLOYED_UNCOMMON_POOL,
      rare: UNEMPLOYED_RARE_POOL,
    };
  }
  return {
    common: CARPENTER_COMMON_POOL,
    uncommon: CARPENTER_UNCOMMON_POOL,
    rare: CARPENTER_RARE_POOL,
  };
};
