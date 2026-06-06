import { Capacitor } from '@capacitor/core';

export const DEBUG_TOOLS_KEY = 'real-card-battle:debug-tools-enabled';
export const DEBUG_TOOLS_CHANGED_EVENT = 'debug-tools-changed';
const PENDING_DEFEAT_INTERSTITIAL_KEY = 'real-card-battle:pending-defeat-interstitial';

export function getDebugToolsEnabled(): boolean {
  try {
    return localStorage.getItem(DEBUG_TOOLS_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDebugToolsEnabled(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(DEBUG_TOOLS_KEY, 'true');
      localStorage.removeItem(PENDING_DEFEAT_INTERSTITIAL_KEY);
      void removeActiveBannerForDebug();
    } else {
      localStorage.removeItem(DEBUG_TOOLS_KEY);
    }
    window.dispatchEvent(new Event(DEBUG_TOOLS_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

async function removeActiveBannerForDebug(): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    const { AdMob } = await import('@capacitor-community/admob');
    await AdMob.removeBanner().catch(() => {});
  } catch {
    /* ignore */
  }
}
