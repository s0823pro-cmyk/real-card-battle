import { Capacitor, registerPlugin } from '@capacitor/core';
import { RANKING_DEVICE_ID_KEY, ensureRankingDeviceId } from './rankingClient';

const RANKING_BASE_URL = 'https://jobless-ranking.word2cardapi0823.workers.dev';

const APPLE_LINKED_KEY = 'real-card-battle:apple-account-linked';
const APPLE_LINKED_AT_KEY = 'real-card-battle:apple-account-linked-at';
export const APPLE_ACCOUNT_INTRO_SEEN_KEY = 'real-card-battle:apple-account-intro-seen-v1';
export const APPLE_ACCOUNT_CHANGED_EVENT = 'apple-account-changed';

const BACKUP_KEY_ALLOWLIST = new Set<string>([
  'real-card-battle:device-id',
  'real-card-battle:achievements',
  'real-card-battle:achievement-counters',
  'real-card-battle:unlocked-jobs',
  'real-card-battle:job-mastery-card-skins',
  'real-card-battle:job-mastery-selected-badge',
  'jobless_enemy_records',
  'jobless_enemy_defeat_counts',
]);

const BACKUP_PREFIX_ALLOWLIST = [
  'real-card-battle:job-mastery-xp:',
  'real-card-battle:job-unlock-seen-',
  'real-card-battle:nickname',
  'real-card-battle:ranking-display-consent',
  'real-card-battle:ranking-best-',
  'real-card-battle:ranking-submitted-',
  'real-card-battle:ranking-pending-',
  'real-card-battle:champion-reward-seen:',
  'story_seen_',
] as const;

const BACKUP_KEY_BLOCK_PREFIXES = [
  'real-card-battle:ads-removed',
  'real-card-battle:pending-defeat-interstitial',
  'real-card-battle:name-change-ticket',
  'real-card-battle:name-change-ticket-tx:',
  'real-card-battle:iap-tx:',
  'real-card-battle:debug-',
  'real-card-battle:image-preload-status',
  'real-card-battle:ranking-current-',
  'real-card-battle:ranking-season-debug-preview',
] as const;

export interface AppleAccountSignInResult {
  user: string;
  identityToken: string;
}

interface AppleAccountNativePlugin {
  signIn(): Promise<AppleAccountSignInResult>;
}

const NativeAppleAccount = registerPlugin<AppleAccountNativePlugin>('AppleAccount');

export type AppleAccountStatus = {
  linked: boolean;
  linkedAt: number | null;
};

export type AppleAccountBackup = {
  version: 1;
  createdAt: number;
  storage: Record<string, string>;
};

export type AppleLinkResult = {
  ok: boolean;
  linkedDeviceId?: string;
  restored?: boolean;
  error?: string;
};

const notifyAppleAccountChanged = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(APPLE_ACCOUNT_CHANGED_EVENT));
};

export function getAppleAccountStatus(): AppleAccountStatus {
  if (typeof localStorage === 'undefined') return { linked: false, linkedAt: null };
  const linked = localStorage.getItem(APPLE_LINKED_KEY) === '1';
  const raw = localStorage.getItem(APPLE_LINKED_AT_KEY);
  const linkedAt = raw == null ? null : Number.parseInt(raw, 10);
  return { linked, linkedAt: Number.isFinite(linkedAt) ? linkedAt : null };
}

function markAppleAccountLinked(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(APPLE_LINKED_KEY, '1');
  localStorage.setItem(APPLE_LINKED_AT_KEY, String(Date.now()));
  notifyAppleAccountChanged();
}

export function shouldShowAppleAccountIntro(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  if (Capacitor.getPlatform() !== 'ios') return false;
  if (typeof localStorage === 'undefined') return false;
  if (getAppleAccountStatus().linked) return false;
  return localStorage.getItem(APPLE_ACCOUNT_INTRO_SEEN_KEY) !== '1';
}

export function markAppleAccountIntroSeen(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(APPLE_ACCOUNT_INTRO_SEEN_KEY, '1');
}

function shouldBackupKey(key: string): boolean {
  if (BACKUP_KEY_BLOCK_PREFIXES.some((prefix) => key.startsWith(prefix))) return false;
  if (BACKUP_KEY_ALLOWLIST.has(key)) return true;
  return BACKUP_PREFIX_ALLOWLIST.some((prefix) => key.startsWith(prefix));
}

export function collectAppleAccountBackup(): AppleAccountBackup {
  const storage: Record<string, string> = {};
  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !shouldBackupKey(key)) continue;
      const value = localStorage.getItem(key);
      if (value != null) storage[key] = value;
    }
  }
  storage[RANKING_DEVICE_ID_KEY] = ensureRankingDeviceId();
  return { version: 1, createdAt: Date.now(), storage };
}

export function applyAppleAccountBackup(backup: unknown): number {
  if (typeof localStorage === 'undefined') return 0;
  if (!backup || typeof backup !== 'object') return 0;
  const storage = (backup as { storage?: unknown }).storage;
  if (!storage || typeof storage !== 'object') return 0;
  let applied = 0;
  for (const [key, value] of Object.entries(storage as Record<string, unknown>)) {
    if (typeof value !== 'string') continue;
    if (!shouldBackupKey(key)) continue;
    localStorage.setItem(key, value);
    applied += 1;
  }
  notifyAppleAccountChanged();
  window.dispatchEvent(new Event('storage'));
  return applied;
}

async function nativeAppleSignIn(): Promise<AppleAccountSignInResult> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
    throw new Error('ios_native_only');
  }
  const result = await NativeAppleAccount.signIn();
  if (!result.identityToken) throw new Error('missing_identity_token');
  return result;
}

async function postAppleAccount(path: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${RANKING_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || json.ok === false) {
    throw new Error(typeof json.error === 'string' ? json.error : 'network');
  }
  return json;
}

export async function linkAppleAccountForBackup(): Promise<AppleLinkResult> {
  try {
    const auth = await nativeAppleSignIn();
    const deviceId = ensureRankingDeviceId();
    const backup = collectAppleAccountBackup();
    const res = await postAppleAccount('/apple/link', {
      device_id: deviceId,
      identity_token: auth.identityToken,
      backup,
    });
    markAppleAccountLinked();
    return {
      ok: true,
      linkedDeviceId: typeof res.device_id === 'string' ? res.device_id : deviceId,
      restored: false,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'unknown' };
  }
}

export async function restoreAppleAccountBackup(): Promise<AppleLinkResult> {
  try {
    const auth = await nativeAppleSignIn();
    const res = await postAppleAccount('/apple/restore', {
      identity_token: auth.identityToken,
    });
    const linkedDeviceId = typeof res.device_id === 'string' ? res.device_id : null;
    if (linkedDeviceId && typeof localStorage !== 'undefined') {
      localStorage.setItem(RANKING_DEVICE_ID_KEY, linkedDeviceId);
    }
    const applied = applyAppleAccountBackup(res.backup);
    markAppleAccountLinked();
    return { ok: true, linkedDeviceId: linkedDeviceId ?? undefined, restored: applied > 0 };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'unknown' };
  }
}
