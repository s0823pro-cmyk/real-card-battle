import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchLocaleBundle,
  getStoredLocale,
  interpolate,
  jaMessages,
  LANGUAGE_STORAGE_KEY,
  readLocaleBundleFromStorage,
  writeLocaleBundleToStorage,
  type Locale,
  type MessageKey,
} from '../i18n';
import type { RemoteLocale } from '../i18n/remoteLocale';

export type TFunction = (
  key: MessageKey | string,
  vars?: Record<string, string | number>,
  fallback?: string,
) => string;

const LanguageContext = createContext<{
  locale: Locale;
  switchLocale: (l: Locale) => Promise<void>;
  isLocaleLoading: boolean;
  localeReady: boolean;
  t: TFunction;
} | null>(null);

function isMessageKey(key: string): key is MessageKey {
  return key in jaMessages;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getStoredLocale());
  const [enBundle, setEnBundle] = useState<Record<string, string>>(() => readLocaleBundleFromStorage('en') ?? {});
  const [koBundle, setKoBundle] = useState<Record<string, string>>(() => readLocaleBundleFromStorage('ko') ?? {});
  const [isLocaleLoading, setIsLocaleLoading] = useState(false);

  const activeBundle = locale === 'en' ? enBundle : locale === 'ko' ? koBundle : {};
  const isJaLocale = locale === 'ja';
  const localeReady = isJaLocale || Object.keys(activeBundle).length > 0;
  const showLocaleBootOverlay = !localeReady && !isJaLocale;

  const setBundle = useCallback((remote: RemoteLocale, data: Record<string, string>) => {
    if (remote === 'en') setEnBundle(data);
    else setKoBundle(data);
  }, []);

  const switchLocale = useCallback(
    async (next: Locale) => {
      if (next === 'ja') {
        try {
          localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ja');
        } catch {
          /* ignore */
        }
        setLocaleState('ja');
        return;
      }
      const remote = next as RemoteLocale;
      const cached = readLocaleBundleFromStorage(remote);
      if (cached && Object.keys(cached).length > 0) {
        setBundle(remote, cached);
        try {
          localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
        } catch {
          /* ignore */
        }
        setLocaleState(next);
        return;
      }

      setIsLocaleLoading(true);
      try {
        const data = await fetchLocaleBundle(remote);
        writeLocaleBundleToStorage(remote, data);
        setBundle(remote, data);
        try {
          localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
        } catch {
          /* ignore */
        }
        setLocaleState(next);
      } finally {
        setIsLocaleLoading(false);
      }
    },
    [setBundle],
  );

  useEffect(() => {
    if (locale === 'ja') return;
    const remote = locale as RemoteLocale;
    const map = remote === 'en' ? enBundle : koBundle;
    if (Object.keys(map).length > 0) return;
    void switchLocale(locale);
  }, [locale, enBundle, koBundle, switchLocale]);

  const t = useCallback<TFunction>(
    (key, vars, fallback) => {
      const k = String(key);
      if (locale === 'ja') {
        if (isMessageKey(k)) {
          const raw = jaMessages[k];
          return interpolate(String(raw), vars);
        }
        return interpolate(fallback ?? k, vars);
      }
      const remoteVal = activeBundle[k];
      if (remoteVal !== undefined && remoteVal !== '') {
        return interpolate(remoteVal, vars);
      }
      return interpolate(fallback ?? k, vars);
    },
    [locale, activeBundle],
  );

  const value = useMemo(
    () => ({ locale, switchLocale, isLocaleLoading, localeReady, t }),
    [locale, switchLocale, isLocaleLoading, localeReady, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {showLocaleBootOverlay && (
        <div
          className="locale-boot-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            fontSize: '1.05rem',
            padding: '1rem',
            textAlign: 'center',
          }}
        >
          {jaMessages['common.localeLoading']}
        </div>
      )}
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): {
  locale: Locale;
  switchLocale: (l: Locale) => Promise<void>;
  isLocaleLoading: boolean;
  localeReady: boolean;
  t: TFunction;
} {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
