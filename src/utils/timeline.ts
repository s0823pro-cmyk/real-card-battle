import type { Card, JobId, PlayerState, TimelineSlot } from '../types/game';
import { getHungryState } from './hungrySystem';

export const getEffectiveTimeCost = (
  card: Card,
  prevCard: Card | null,
  player?: PlayerState,
  jobId?: JobId,
): number => {
  let cost = card.timeCost;
  const usesPreparationCost = prevCard?.tags?.includes('preparation') && card.preparationTimeCost !== undefined;
  if (usesPreparationCost) {
    cost = card.preparationTimeCost ?? cost;
  }
  const reduction = prevCard?.tags?.includes('preparation') && !usesPreparationCost ? 1 : 0;
  cost -= reduction;
  if (player && card.type === 'attack' && player.nextAttackTimeReduce > 0) {
    cost -= player.nextAttackTimeReduce;
  }
  const activeJobId = jobId ?? player?.jobId;
  if (activeJobId === 'unemployed' && player && getHungryState(player) === 'awakened') {
    cost -= 1;
  }
  if (
    player?.threeStarActive &&
    card.tags?.includes('ingredient') &&
    !player.firstIngredientUsedThisTurn
  ) {
    return 0;
  }
  return Math.max(0, cost);
};

interface TimelineSeed {
  card: Card;
  originalHandIndex: number;
}

const toTimelineSeed = (item: Card | TimelineSeed, fallbackIndex: number): TimelineSeed => {
  if ('card' in item) {
    return item;
  }
  return {
    card: item,
    originalHandIndex: fallbackIndex,
  };
};

export const buildTimelineSlots = (cards: Array<Card | TimelineSeed>): TimelineSlot[] => {
  let elapsed = 0;
  const seeds = cards.map((item, index) => toTimelineSeed(item, index));
  return seeds.map((seed, index) => {
    const prevCard = index > 0 ? seeds[index - 1].card : null;
    const cost = getEffectiveTimeCost(seed.card, prevCard);
    const startTime = elapsed;
    const endTime = startTime + cost;
    elapsed = endTime;
    return {
      card: seed.card,
      startTime,
      endTime,
      originalHandIndex: seed.originalHandIndex,
    };
  });
};

export const calculateUsedTime = (timeline: TimelineSlot[]): number =>
  timeline.reduce((sum, slot) => sum + (slot.endTime - slot.startTime), 0);

export const canPlaceCard = (
  maxTime: number,
  timelineCards: Card[],
  card: Card,
): boolean => {
  const nextCards = [...timelineCards, card];
  const usedTime = buildTimelineSlots(nextCards).at(-1)?.endTime ?? 0;
  return usedTime <= maxTime;
};

export const moveIndex = <T>(items: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
};
