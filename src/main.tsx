import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import './index.css'
import App from './App.tsx'
try {
  localStorage.removeItem('real-card-battle:debug-enemy-hp1')
} catch {
  // ignore
}

if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: false })
  StatusBar.setStyle({ style: Style.Dark })
  StatusBar.setBackgroundColor({ color: '#000000' })
}

/** Android: decorFitsSystemWindows(true) で WebView は既にステータスバー下から始まる。--android-inset-top を足すと表示とタッチの Y がズレやすいので 0 */
if (Capacitor.getPlatform() === 'android') {
  document.documentElement.style.setProperty('--android-inset-top', '0px')
  /* env(safe-area-inset-bottom) が 0 でもナビゲーション／ジェスチャー帯と被らないよう確保 */
  document.documentElement.style.setProperty('--android-inset-bottom', '20px')
}

/** iOS WKWebView: 高さ・セーフエリアを CSS で揃える（index.css の .cap-ios） */
if (Capacitor.getPlatform() === 'ios') {
  document.documentElement.classList.add('cap-ios')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
// cache bust 03/31/2026 22:23:20
