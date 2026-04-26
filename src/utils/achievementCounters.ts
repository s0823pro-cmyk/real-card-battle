const KEY = 'real-card-battle:achievement-counters';
/** 旧版: 職業横断で1本の敗北回数（職業別へ移行時に carpenter に取り込む） */
const LEGACY_DEFEAT_COUNT_KEY = 'real-card-battle:defeat-count';

export type AchievementTrackedJobId = 'carpenter' | 'cook';

/** 1職業分の累計（ラン中のマス・バトル由来） */
export interface JobAchievementCounters {
  battleWins: number;
  eliteWins: number;
  diceRolls: number;
  shrineVisits: number;
  hotelVisits: number;
  shopCardBuys: number;
  eventsResolved: number;
  lifetimeGoldEarned: number;
  /** その職業プレイ中の累計敗北 */
  defeatCount: number;
}

export interface AchievementCountersStateV2 {
  v: 2;
  perJob: Record<AchievementTrackedJobId, JobAchievementCounters>;
}

const emptyJob = (): JobAchievementCounters => ({
  battleWins: 0,
  eliteWins: 0,
  diceRolls: 0,
  shrineVisits: 0,
  hotelVisits: 0,
  shopCardBuys: 0,
  eventsResolved: 0,
  lifetimeGoldEarned: 0,
  defeatCount: 0,
});

const isTrackedJob = (jobId: string): jobId is AchievementTrackedJobId =>
  jobId === 'carpenter' || jobId === 'cook';

function readLegacyDefeatCount(): number {
  try {
    return parseInt(localStorage.getItem(LEGACY_DEFEAT_COUNT_KEY) ?? '0', 10);
  } catch {
    return 0;
  }
}

function migrateFromLegacyFlat(parsed: Record<string, unknown>): AchievementCountersStateV2 {
  const row: JobAchievementCounters = {
    battleWins: Number(parsed.battleWins) || 0,
    eliteWins: Number(parsed.eliteWins) || 0,
    diceRolls: Number(parsed.diceRolls) || 0,
    shrineVisits: Number(parsed.shrineVisits) || 0,
    hotelVisits: Number(parsed.hotelVisits) || 0,
    shopCardBuys: Number(parsed.shopCardBuys) || 0,
    eventsResolved: Number(parsed.eventsResolved) || 0,
    lifetimeGoldEarned: Number(parsed.lifetimeGoldEarned) || 0,
    defeatCount: readLegacyDefeatCount(),
  };
  try {
    localStorage.removeItem(LEGACY_DEFEAT_COUNT_KEY);
  } catch {
    /* ignore */
  }
  return {
    v: 2,
    perJob: {
      carpenter: { ...row },
      cook: emptyJob(),
    },
  };
}

export const loadAchievementCountersState = (): AchievementCountersStateV2 => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return {
        v: 2,
        perJob: { carpenter: emptyJob(), cook: emptyJob() },
      };
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.v === 2 && parsed.perJob && typeof parsed.perJob === 'object') {
      const pj = parsed.perJob as Record<string, Partial<JobAchievementCounters>>;
      return {
        v: 2,
        perJob: {
          carpenter: { ...emptyJob(), ...pj.carpenter },
          cook: { ...emptyJob(), ...pj.cook },
        },
      };
    }
    return migrateFromLegacyFlat(parsed);
  } catch {
    return {
      v: 2,
      perJob: { carpenter: emptyJob(), cook: emptyJob() },
    };
  }
};

const saveAchievementCountersState = (state: AchievementCountersStateV2): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* localStorage 不可 */
  }
};

/** 実績用に追跡する職業のカウンタ行を取得 */
export const loadAchievementCountersForJob = (jobId: AchievementTrackedJobId): JobAchievementCounters => {
  const s = loadAchievementCountersState();
  return { ...emptyJob(), ...s.perJob[jobId] };
};

/** @deprecated 職業横断の単一オブジェクトが必要だった箇所向け。大工分のみ返す（旧挙動に近い） */
export const loadAchievementCounters = (): JobAchievementCounters => loadAchievementCountersForJob('carpenter');

const updateJob = (
  jobId: AchievementTrackedJobId,
  updater: (row: JobAchievementCounters) => void,
): void => {
  const s = loadAchievementCountersState();
  const row = { ...emptyJob(), ...s.perJob[jobId] };
  updater(row);
  s.perJob[jobId] = row;
  saveAchievementCountersState(s);
};

export const incrementDiceRollsForJob = (jobId: string): void => {
  if (!isTrackedJob(jobId)) return;
  updateJob(jobId, (row) => {
    row.diceRolls += 1;
  });
};

export const incrementShrineVisitsForJob = (jobId: string): void => {
  if (!isTrackedJob(jobId)) return;
  updateJob(jobId, (row) => {
    row.shrineVisits += 1;
  });
};

export const incrementHotelVisitsForJob = (jobId: string): void => {
  if (!isTrackedJob(jobId)) return;
  updateJob(jobId, (row) => {
    row.hotelVisits += 1;
  });
};

export const incrementShopCardBuysForJob = (jobId: string): void => {
  if (!isTrackedJob(jobId)) return;
  updateJob(jobId, (row) => {
    row.shopCardBuys += 1;
  });
};

export const incrementEventsResolvedForJob = (jobId: string): void => {
  if (!isTrackedJob(jobId)) return;
  updateJob(jobId, (row) => {
    row.eventsResolved += 1;
  });
};

/** 勝利確定時: 累計勝利・ゴールド・（エリートなら）エリート勝利をその職業分に加算 */
export const recordBattleVictoryForJob = (
  jobId: string,
  rewardGold: number,
  battleKind: 'battle' | 'elite' | 'boss',
): void => {
  if (!isTrackedJob(jobId)) return;
  updateJob(jobId, (row) => {
    row.battleWins += 1;
    row.lifetimeGoldEarned += Math.max(0, rewardGold);
    if (battleKind === 'elite') row.eliteWins += 1;
  });
};

export const incrementDefeatCountForJob = (jobId: string): number => {
  if (!isTrackedJob(jobId)) return 0;
  let next = 0;
  updateJob(jobId, (row) => {
    row.defeatCount += 1;
    next = row.defeatCount;
  });
  return next;
};

export const getDefeatCountForJob = (jobId: AchievementTrackedJobId): number =>
  loadAchievementCountersForJob(jobId).defeatCount;

/** 料理人解放用: 全職業の敗北の合計 */
export const getTotalDefeatCountAcrossJobs = (): number => {
  const s = loadAchievementCountersState();
  return s.perJob.carpenter.defeatCount + s.perJob.cook.defeatCount;
};

export const clearAchievementCounters = (): void => {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_DEFEAT_COUNT_KEY);
  } catch {
    /* ignore */
  }
};

export type { JobAchievementCounters as AchievementCounters };
