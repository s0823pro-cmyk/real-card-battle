import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.s0823pro.realcardbattle',
  appName: 'Real Card Battle',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
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
    /** WebView 繧偵せ繝・・繧ｿ繧ｹ繝舌・縺ｮ荳九↓驟咲ｽｮ・域里螳壹・ overlaysWebView: true 縺縺ｨ蜈ｨ髱｢縺ｫ驥阪↑繧具ｼ・*/
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#0d1117',
    },
  },
};

export default config;
