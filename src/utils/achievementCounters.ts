const KEY = 'real-card-battle:achievement-counters';

export interface AchievementCounters {
  battleWins: number;
  eliteWins: number;
  diceRolls: number;
  shrineVisits: number;
  hotelVisits: number;
  shopCardBuys: number;
  eventsResolved: number;
  lifetimeGoldEarned: number;
}

const defaultCounters = (): AchievementCounters => ({
  battleWins: 0,
  eliteWins: 0,
  diceRolls: 0,
  shrineVisits: 0,
  hotelVisits: 0,
  shopCardBuys: 0,
  eventsResolved: 0,
  lifetimeGoldEarned: 0,
});

export const loadAchievementCounters = (): AchievementCounters => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultCounters();
    const p = JSON.parse(raw) as Partial<AchievementCounters>;
    return { ...defaultCounters(), ...p };
  } catch {
    return defaultCounters();
  }
};

export const saveAchievementCounters = (c: AchievementCounters): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
};

export const clearAchievementCounters = (): void => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};
