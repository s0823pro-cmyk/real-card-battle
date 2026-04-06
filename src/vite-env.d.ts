/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMOB_INTERSTITIAL_IOS?: string;
  readonly VITE_ADMOB_BANNER_IOS?: string;
  readonly VITE_ADMOB_INTERSTITIAL_ANDROID?: string;
  readonly VITE_ADMOB_BANNER_ANDROID?: string;
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
