import { InAppReview } from '@capacitor-community/in-app-review';
import { Capacitor } from '@capacitor/core';

export const REVIEW_REQUESTED_KEY = 'real-card-battle:review-requested';
export const REVIEW_COMPLETED_KEY = 'real-card-battle:review-completed';
export const DEFEAT_COUNT_SINCE_REVIEW_KEY = 'real-card-battle:defeat-count-since-review';
export const REVIEW_MILESTONES_KEY = 'real-card-battle:review-milestones';

const MAX_REVIEW_REQUESTS = 3;
const REVIEW_PROMPT_DELAY_MS = 900;

type ReviewMilestone = 'first_area1_boss_clear' | 'first_run_clear';

function readNumber(key: string, fallback: number): number {
  if (typeof localStorage === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function readBool(key: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(key) === 'true';
}

function writeNumber(key: string, value: number): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, String(value));
}

function readMilestones(): ReviewMilestone[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(REVIEW_MILESTONES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ReviewMilestone =>
        item === 'first_area1_boss_clear' || item === 'first_run_clear',
    );
  } catch {
    return [];
  }
}

function hasMilestone(milestone: ReviewMilestone): boolean {
  return readMilestones().includes(milestone);
}

function markMilestone(milestone: ReviewMilestone): void {
  if (typeof localStorage === 'undefined') return;
  const milestones = readMilestones();
  if (!milestones.includes(milestone)) {
    localStorage.setItem(REVIEW_MILESTONES_KEY, JSON.stringify([...milestones, milestone]));
  }
}

function markPromptFinished(milestone: ReviewMilestone): void {
  const nextRequested = readNumber(REVIEW_REQUESTED_KEY, 0) + 1;
  writeNumber(REVIEW_REQUESTED_KEY, nextRequested);
  writeNumber(DEFEAT_COUNT_SINCE_REVIEW_KEY, 0);
  markMilestone(milestone);
}

function maybePromptAppStoreReview(milestone: ReviewMilestone): void {
  if (typeof localStorage === 'undefined') return;
  if (Capacitor.getPlatform() !== 'ios') return;
  if (readBool(REVIEW_COMPLETED_KEY)) return;
  if (hasMilestone(milestone)) return;

  const reviewRequested = readNumber(REVIEW_REQUESTED_KEY, 0);
  if (reviewRequested >= MAX_REVIEW_REQUESTS) return;

  window.setTimeout(() => {
    void requestReview(milestone);
  }, REVIEW_PROMPT_DELAY_MS);
}

async function requestReview(milestone: ReviewMilestone): Promise<void> {
  if (hasMilestone(milestone)) return;
  try {
    await InAppReview.requestReview();
    markPromptFinished(milestone);
  } catch {
    // ネイティブ依頼が失敗した場合は review-requested を進めない
  }
}

export function maybePromptAppStoreReviewOnAreaBossClear(area: number): void {
  if (area !== 1) return;
  maybePromptAppStoreReview('first_area1_boss_clear');
}

export function maybePromptAppStoreReviewOnRunClear(): void {
  maybePromptAppStoreReview('first_run_clear');
}
