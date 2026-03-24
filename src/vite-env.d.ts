/// <reference types="vite/client" />

/** デバッグ・E2E 用（App の effect で付与し cleanup で削除） */
declare global {
  interface Window {
    __stopBgm?: () => void;
    __resumeBgm?: () => void;
  }
}

export {};
