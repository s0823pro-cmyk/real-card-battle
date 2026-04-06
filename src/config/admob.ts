import { Capacitor } from '@capacitor/core';

/**
 * AdMob 広告ユニット ID。
 * プラットフォーム別に本番 / テスト ID を返す。
 * .env に本番 ID を設定すること。未設定時はテスト ID にフォールバック。
 */

// --- Google 公式テスト用 ID ---
const TEST_INTERSTITIAL_ANDROID = 'ca-app-pub-3940256099942544/1033173712';
const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_INTERSTITIAL_IOS = 'ca-app-pub-3940256099942544/4411468910';
const TEST_BANNER_IOS = 'ca-app-pub-3940256099942544/2934735716';

function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

export function getInterstitialAdUnitId(): string {
  if (isIOS()) {
    return import.meta.env.VITE_ADMOB_INTERSTITIAL_IOS ?? TEST_INTERSTITIAL_IOS;
  }
  return import.meta.env.VITE_ADMOB_INTERSTITIAL_ANDROID ?? TEST_INTERSTITIAL_ANDROID;
}

export function getBannerAdUnitId(): string {
  if (isIOS()) {
    return import.meta.env.VITE_ADMOB_BANNER_IOS ?? TEST_BANNER_IOS;
  }
  return import.meta.env.VITE_ADMOB_BANNER_ANDROID ?? TEST_BANNER_ANDROID;
}
