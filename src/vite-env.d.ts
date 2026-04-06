/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMOB_APP_ID?: string;
  /** true のとき Google 公式テスト広告ユニット（本番 ID は使わない） */
  readonly VITE_ADMOB_TEST?: string;
  readonly VITE_ADMOB_INTERSTITIAL_ANDROID?: string;
  readonly VITE_ADMOB_BANNER_ANDROID?: string;
  readonly VITE_ADMOB_INTERSTITIAL_IOS?: string;
  readonly VITE_ADMOB_BANNER_IOS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** デバッグ・E2E 用（App の effect で付与し cleanup で削除） */
declare global {
  interface Window {
    __stopBgm?: () => void;
    __resumeBgm?: () => void;
  }
}

export {};
