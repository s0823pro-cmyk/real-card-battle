import { ja } from './ja';

export { ja };

export type { RemoteLocale } from './remoteLocale';
export {
  LOCALE_CACHE_KEYS,
  fetchLocaleBundle,
  normalizeLocaleBundle,
  readLocaleBundleFromStorage,
  writeLocaleBundleToStorage,
} from './remoteLocale';

export const LANGUAGE_STORAGE_KEY = 'real-card-battle:language' as const;

export type Locale = 'ja' | 'en' | 'ko';

export type MessageKey = keyof typeof ja;

/** 日本語 UI テーブル（バンドル） */
export const jaMessages: Record<MessageKey, string> = ja as unknown as Record<MessageKey, string>;

export function getStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (v === 'en' || v === 'ko' || v === 'ja') return v;
  } catch {
    /* ignore */
  }
  return 'ja';
}

/** `{n}` 等を置換 */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

export function translateJa(key: MessageKey, vars?: Record<string, string | number>): string {
  const raw = jaMessages[key];
  if (raw === undefined) return String(key);
  return interpolate(String(raw), vars);
}
