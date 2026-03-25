/** 広告削除購入フラグ（ランセーブとは別。データ初期化では削除しない） */
export const ADS_REMOVED_STORAGE_KEY = 'real-card-battle:ads-removed';

/**
 * 敗北後のインタースティシャルが完了前にアプリが落ちた場合などに立てる「未完了」フラグ。
 * 次回ホームのゲームスタートで先に広告を流す。完了時にクリアする。
 */
export const PENDING_DEFEAT_INTERSTITIAL_KEY = 'real-card-battle:pending-defeat-interstitial';

export function getPendingDefeatInterstitial(): boolean {
  try {
    return localStorage.getItem(PENDING_DEFEAT_INTERSTITIAL_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setPendingDefeatInterstitial(value: boolean): void {
  try {
    if (value) localStorage.setItem(PENDING_DEFEAT_INTERSTITIAL_KEY, 'true');
    else localStorage.removeItem(PENDING_DEFEAT_INTERSTITIAL_KEY);
  } catch {
    /* ignore */
  }
}

export function clearPendingDefeatInterstitial(): void {
  setPendingDefeatInterstitial(false);
}

export function getAdsRemoved(): boolean {
  try {
    return localStorage.getItem(ADS_REMOVED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** 広告削除購入済みか（`getAdsRemoved` と同じ） */
export function isAdRemoved(): boolean {
  return getAdsRemoved();
}

/** IAP 実装時に購入完了で呼ぶ */
export function setAdsRemoved(value: boolean): void {
  try {
    localStorage.setItem(ADS_REMOVED_STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}
