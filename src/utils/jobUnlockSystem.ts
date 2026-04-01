const UNLOCKED_JOBS_KEY = 'real-card-battle:unlocked-jobs';

const seenKey = (jobId: string) => `real-card-battle:job-unlock-seen-${jobId}`;

/** 解放済み職業ID（大工は常に含む） */
export const getUnlockedJobs = (): string[] => {
  try {
    const raw = window.localStorage.getItem(UNLOCKED_JOBS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const arr = Array.isArray(parsed) ? (parsed as string[]) : [];
    return [...new Set(['carpenter', ...arr])];
  } catch {
    return ['carpenter'];
  }
};

export const isJobUnlocked = (jobId: string): boolean => getUnlockedJobs().includes(jobId);

export const unlockJob = (jobId: string): void => {
  try {
    const jobs = JSON.parse(window.localStorage.getItem(UNLOCKED_JOBS_KEY) || '[]') as unknown;
    const list = Array.isArray(jobs) ? (jobs as string[]) : [];
    if (!list.includes(jobId)) {
      list.push(jobId);
    }
    window.localStorage.setItem(UNLOCKED_JOBS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
};

export const hasSeenJobUnlock = (jobId: string): boolean => {
  try {
    return window.localStorage.getItem(seenKey(jobId)) === '1';
  } catch {
    return false;
  }
};

export const markJobUnlockSeen = (jobId: string): void => {
  try {
    window.localStorage.setItem(seenKey(jobId), '1');
  } catch {
    /* ignore */
  }
};

/** データ初期化用: 解放状態と「演出済み」フラグを削除 */
export const clearJobUnlockStorage = (): void => {
  try {
    window.localStorage.removeItem(UNLOCKED_JOBS_KEY);
    window.localStorage.removeItem(seenKey('cook'));
  } catch {
    /* ignore */
  }
};
