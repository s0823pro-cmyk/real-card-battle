import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import './index.css'
import App from './App.tsx'

if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: false })
  StatusBar.setStyle({ style: Style.Dark })
  StatusBar.setBackgroundColor({ color: '#000000' })
}

/** Android WebView では env(safe-area-inset-top) が 0 のことが多い。MainActivity 注入までの一瞬の被りを減らす粗い既定値 */
if (Capacitor.getPlatform() === 'android') {
  document.documentElement.style.setProperty('--android-inset-top', '14px')
  /* env(safe-area-inset-bottom) が 0 でもナビゲーション／ジェスチャー帯と被らないよう確保 */
  document.documentElement.style.setProperty('--android-inset-bottom', '20px')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
