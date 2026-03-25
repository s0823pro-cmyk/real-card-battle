/**
 * AdMob の App ID / 広告ユニット ID。
 * 未設定時は Google 公式のテスト用 ID（https://developers.google.com/admob/android/test-ads）を使用する。
 */
const TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_INTERSTITIAL_ANDROID = 'ca-app-pub-3940256099942544/1033173712';
const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/6300978111';

/** AndroidManifest / strings.xml の APPLICATION_ID と揃える（本番は AdMob コンソールの App ID） */
export function getAndroidAdMobAppId(): string {
  return import.meta.env.VITE_ADMOB_APP_ID ?? TEST_ANDROID_APP_ID;
}

export function getInterstitialAdUnitId(): string {
  return import.meta.env.VITE_ADMOB_INTERSTITIAL_ANDROID ?? TEST_INTERSTITIAL_ANDROID;
}

export function getBannerAdUnitId(): string {
  return import.meta.env.VITE_ADMOB_BANNER_ANDROID ?? TEST_BANNER_ANDROID;
}
