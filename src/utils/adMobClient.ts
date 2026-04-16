import { Capacitor } from '@capacitor/core';
import { clearPendingDefeatInterstitial } from './adsRemoved';

let initPromise: Promise<void> | null = null;
/** 広告表示〜終了までの連打防止 */
let isAdPlaying = false;

/** バナー広告の表示を全体的に抑止するフラグ。マップ画面で true にする */
let bannerSuppressed = false;

export function setBannerSuppressed(value: boolean): void {
  bannerSuppressed = value;
  if (value) {
    // 抑止モードに入った瞬間、既存のバナーも消す
    void (async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const { AdMob } = await import('@capacitor-community/admob');
        await AdMob.removeBanner().catch(() => {});
      } catch {
        /* noop */
      }
    })();
  }
}

export async function ensureAdMobInitialized(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!initPromise) {
    initPromise = (async () => {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.initialize();
    })();
  }
  await initPromise;
}

/** インタースティシャルを閉じるまで待つ（読み込み失敗時もブロックしない） */
export async function showInterstitialIfAllowed(
  adsRemoved: boolean,
  onAdComplete?: () => void,
): Promise<void> {
  if (adsRemoved || !Capacitor.isNativePlatform()) {
    onAdComplete?.();
    return;
  }
  if (isAdPlaying) {
    return;
  }
  await ensureAdMobInitialized();
  const { AdMob, InterstitialAdPluginEvents } = await import('@capacitor-community/admob');
  const { getInterstitialAdUnitId } = await import('../config/admob');
  const adId = getInterstitialAdUnitId();

  let resolveDone!: () => void;
  const donePromise = new Promise<void>((r) => {
    resolveDone = r;
  });
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    isAdPlaying = false;
    onAdComplete?.();
    clearPendingDefeatInterstitial();
    resolveDone();
  };

  const h1 = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, settle);
  const h2 = await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, settle);
  const h3 = await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, settle);

  isAdPlaying = true;
  try {
    await AdMob.prepareInterstitial({ adId, immersiveMode: true });
  } catch {
    settle();
  }
  if (!settled) {
    try {
      await AdMob.showInterstitial();
    } catch {
      settle();
    }
  }
  await donePromise;
  await h1.remove().catch(() => {});
  await h2.remove().catch(() => {});
  await h3.remove().catch(() => {});
}

/** ストーリー重ね表示などでネイティブバナーだけ消す */
export async function removeBannerAd(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await ensureAdMobInitialized();
  const { AdMob } = await import('@capacitor-community/admob');
  await AdMob.removeBanner().catch(() => {});
}

/** カード報酬画面用バナー。戻り値のクリーンアップで removeBanner する */
export async function mountCardRewardBanner(adsRemoved: boolean): Promise<() => Promise<void>> {
  if (adsRemoved || !Capacitor.isNativePlatform()) {
    return async () => {};
  }
  // バナー抑止モード中は表示しない（マップ画面に遷移した後の非同期完了を無効化）
  if (bannerSuppressed) {
    return async () => {};
  }
  await ensureAdMobInitialized();
  const { AdMob, BannerAdPosition } = await import('@capacitor-community/admob');
  const { getBannerAdUnitId } = await import('../config/admob');
  // 直前に再確認（await 中にマップ画面に遷移している可能性）
  if (bannerSuppressed) {
    return async () => {};
  }
  await AdMob.showBanner({
    adId: getBannerAdUnitId(),
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
  });
  // 表示直後にも抑止チェック。既に抑止モードなら即座に消す
  if (bannerSuppressed) {
    await AdMob.removeBanner().catch(() => {});
    return async () => {};
  }
  return async () => {
    await AdMob.removeBanner().catch(() => {});
  };
}
