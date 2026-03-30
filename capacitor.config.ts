import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.s0823pro.realcardbattle',
  appName: 'Real Card Battle',
  webDir: 'dist',
  ios: {
    /**
     * always だと WKWebView がネイティブでセーフエリア分を取り、CSS の env(safe-area-inset-top) / --sat とも重なり
     * タッチの Y と描画がずれることがある。セーフエリアは CSS 側に一本化する。
     */
    contentInset: 'never',
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
    },
    AdMob: {
      appId: 'ca-app-pub-6731542556992059~4473120758',
    },
    /** WebView をステータスバーの下に配置（overlaysWebView: true だと全画面に被る） */
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#0d1117',
    },
  },
};

export default config;
