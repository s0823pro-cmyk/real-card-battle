import { Capacitor } from '@capacitor/core';

/**
 * AdMob の広告ユニット ID。
 * プラットフォームごとに本番 ID を返す。
 * テスト時は .env に VITE_ADMOB_TEST=true を設定すると Google 公式テスト ID を使用。
 *
 * 本番ビルドでは各 VITE_ADMOB_* を AdMob コンソールの値に設定すること。
 */

const isTestMode = import.meta.env.VITE_ADMOB_TEST === 'true';

// --- テスト用 ID（Google 公式）---
const TEST_INTERSTITIAL_ANDROID = 'ca-app-pub-3940256099942544/1033173712';
const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_INTERSTITIAL_IOS = 'ca-app-pub-3940256099942544/4411468910';
const TEST_BANNER_IOS = 'ca-app-pub-3940256099942544/2934735716';

/** 本番: .env で上書き（未設定時は警告のうえテスト ID — ストア提出前に必ず設定） */
const PROD_INTERSTITIAL_ANDROID = import.meta.env.VITE_ADMOB_INTERSTITIAL_ANDROID as string | undefined;
const PROD_BANNER_ANDROID = import.meta.env.VITE_ADMOB_BANNER_ANDROID as string | undefined;
const PROD_INTERSTITIAL_IOS = import.meta.env.VITE_ADMOB_INTERSTITIAL_IOS as string | undefined;
const PROD_BANNER_IOS = import.meta.env.VITE_ADMOB_BANNER_IOS as string | undefined;

function warnMissingProdId(kind: 'interstitial' | 'banner'): void {
  if (import.meta.env.DEV) {
    console.warn(
      `[AdMob] 本番の${kind}ユニット ID が未設定です。VITE_ADMOB_* を .env に設定してください。`,
    );
  }
}

export function getInterstitialAdUnitId(): string {
  if (isTestMode) {
    return Capacitor.getPlatform() === 'ios' ? TEST_INTERSTITIAL_IOS : TEST_INTERSTITIAL_ANDROID;
  }
  if (Capacitor.getPlatform() === 'ios') {
    const id = PROD_INTERSTITIAL_IOS?.trim();
    if (id) return id;
    warnMissingProdId('interstitial');
    return TEST_INTERSTITIAL_IOS;
  }
  const id = PROD_INTERSTITIAL_ANDROID?.trim();
  if (id) return id;
  warnMissingProdId('interstitial');
  return TEST_INTERSTITIAL_ANDROID;
}

export function getBannerAdUnitId(): string {
  if (isTestMode) {
    return Capacitor.getPlatform() === 'ios' ? TEST_BANNER_IOS : TEST_BANNER_ANDROID;
  }
  if (Capacitor.getPlatform() === 'ios') {
    const id = PROD_BANNER_IOS?.trim();
    if (id) return id;
    warnMissingProdId('banner');
    return TEST_BANNER_IOS;
  }
  const id = PROD_BANNER_ANDROID?.trim();
  if (id) return id;
  warnMissingProdId('banner');
  return TEST_BANNER_ANDROID;
}
