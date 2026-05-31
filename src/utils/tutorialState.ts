const KEY = 'real-card-battle:tutorial-seen';
const RANKING_SNOOZE_UNTIL_KEY = 'rankingSnoozeUntil';
const RANKING_SNOOZE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TutorialStep = 'job_select' | 'battle' | 'ranking';

export const hasTutorialSeen = (step: TutorialStep): boolean => {
  try {
    const val = JSON.parse(localStorage.getItem(KEY) || '{}');
    return !!val[step];
  } catch {
    return false;
  }
};

export const markTutorialSeen = (step: TutorialStep): void => {
  try {
    const val = JSON.parse(localStorage.getItem(KEY) || '{}');
    val[step] = true;
    localStorage.setItem(KEY, JSON.stringify(val));
  } catch {
    // Tutorial state is non-critical; ignore storage failures.
  }
};

export const resetTutorial = (): void => {
  localStorage.removeItem(KEY);
};

export const shouldShowRankingRenewalPrompt = (): boolean => {
  try {
    const val = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (val.ranking) return false;
    const snoozeUntil = Number(val[RANKING_SNOOZE_UNTIL_KEY] || 0);
    return !snoozeUntil || Date.now() >= snoozeUntil;
  } catch {
    return true;
  }
};

export const snoozeRankingRenewalPrompt = (): void => {
  try {
    const val = JSON.parse(localStorage.getItem(KEY) || '{}');
    val[RANKING_SNOOZE_UNTIL_KEY] = Date.now() + RANKING_SNOOZE_DAYS * DAY_MS;
    localStorage.setItem(KEY, JSON.stringify(val));
  } catch {
    // Tutorial state is non-critical; ignore storage failures.
  }
};

export const resetRankingTutorial = (): void => {
  try {
    const val = JSON.parse(localStorage.getItem(KEY) || '{}');
    delete val.ranking;
    delete val[RANKING_SNOOZE_UNTIL_KEY];
    if (Object.keys(val).length === 0) {
      localStorage.removeItem(KEY);
      return;
    }
    localStorage.setItem(KEY, JSON.stringify(val));
  } catch {
    localStorage.removeItem(KEY);
  }
};
