import { InAppReview } from '@capacitor-community/in-app-review';
import { Capacitor } from '@capacitor/core';

export const REVIEW_REQUESTED_KEY = 'real-card-battle:review-requested';
export const REVIEW_COMPLETED_KEY = 'real-card-battle:review-completed';
export const DEFEAT_COUNT_SINCE_REVIEW_KEY = 'real-card-battle:defeat-count-since-review';

const MAX_REVIEW_REQUESTS = 3;

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

function markPromptFinished(): void {
  const nextRequested = readNumber(REVIEW_REQUESTED_KEY, 0) + 1;
  writeNumber(REVIEW_REQUESTED_KEY, nextRequested);
  writeNumber(DEFEAT_COUNT_SINCE_REVIEW_KEY, 0);
}

/**
 * ラン敗北（game_over 確定）時のみ呼ぶ。iOS ネイティブのレビュー依頼を条件付きで出す。
 */
export function maybePromptAppStoreReviewOnRunDefeat(): void {
  if (typeof localStorage === 'undefined') return;
  if (Capacitor.getPlatform() !== 'ios') return;
  if (readBool(REVIEW_COMPLETED_KEY)) return;

  const reviewRequested = readNumber(REVIEW_REQUESTED_KEY, 0);
  if (reviewRequested >= MAX_REVIEW_REQUESTS) return;

  let shouldPrompt = false;

  if (reviewRequested === 0) {
    shouldPrompt = true;
  } else {
    const nextDefeats = readNumber(DEFEAT_COUNT_SINCE_REVIEW_KEY, 0) + 1;
    writeNumber(DEFEAT_COUNT_SINCE_REVIEW_KEY, nextDefeats);
    if (nextDefeats >= 2) {
      shouldPrompt = true;
    }
  }

  if (!shouldPrompt) return;

  void (async () => {
    try {
      await InAppReview.requestReview();
      markPromptFinished();
    } catch {
      // ネイティブ依頼が失敗した場合は review-requested を進めない
    }
  })();
}
