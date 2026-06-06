export type AppPlatform = 'web' | 'mobile' | 'steam';

const requestedPlatform = import.meta.env.VITE_APP_PLATFORM;

export const APP_PLATFORM: AppPlatform =
  requestedPlatform === 'steam' || import.meta.env.MODE === 'steam'
    ? 'steam'
    : requestedPlatform === 'mobile'
      ? 'mobile'
      : 'web';

export function isSteamBuild(): boolean {
  return APP_PLATFORM === 'steam';
}

export function areAdsEnabled(): boolean {
  return !isSteamBuild();
}

export function areInAppPurchasesEnabled(): boolean {
  return !isSteamBuild();
}

export function isAppStoreReviewPromptEnabled(): boolean {
  return !isSteamBuild();
}
