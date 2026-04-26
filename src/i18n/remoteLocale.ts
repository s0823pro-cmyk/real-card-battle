export type RemoteLocale = 'en' | 'ko';

export const LOCALE_CACHE_KEYS: Record<RemoteLocale, string> = {
  en: 'real-card-battle:locale-en',
  ko: 'real-card-battle:locale-ko',
};

export function normalizeLocaleBundle(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

export function readLocaleBundleFromStorage(locale: RemoteLocale): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(LOCALE_CACHE_KEYS[locale]);
    if (!raw) return null;
    return normalizeLocaleBundle(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeLocaleBundleToStorage(locale: RemoteLocale, bundle: Record<string, string>): void {
  try {
    localStorage.setItem(LOCALE_CACHE_KEYS[locale], JSON.stringify(bundle));
  } catch {
    /* ignore */
  }
}

export async function fetchLocaleBundle(locale: RemoteLocale): Promise<Record<string, string>> {
  const res = await fetch(`/locales/${locale}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`locale fetch failed: ${res.status}`);
  const json = (await res.json()) as unknown;
  return normalizeLocaleBundle(json);
}
