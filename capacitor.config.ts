import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.s0823pro.realcardbattle',
  appName: 'Real Card Battle',
  webDir: 'dist',
  ios: {
    /**
     * always だとネイティブ + CSS の env(--sat) で二重になりタッチ Y がずれるため never。
     * 上余白は App.css の html.cap-ios #root { padding-top: var(--sat) } と --root-safe-top で各画面を補正。
     */
    contentInset: 'never',
    backgroundColor: '#000000',
    allowsLinkPreview: false,
    scrollEnabled: false,
    limitsNavigationsToAppBoundDomains: true,
  },
  server: {
    androidScheme: 'https',
    ...(isDev && { url: 'http://192.168.2.159:5173', cleartext: true }),
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
