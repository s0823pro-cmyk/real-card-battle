type ImageAssetModuleMap = Record<string, string>;

export type ImagePreloadProgress = {
  loaded: number;
  total: number;
  failed: number;
  currentLabel: string;
};

export type ImagePreloadStatus = {
  done: boolean;
  total: number;
  completedAt: number | null;
};

const IMAGE_PRELOAD_STATUS_KEY = 'real-card-battle:image-preload-status:v1';

const imageAssetModules = import.meta.glob<string>('../assets/**/*.{png,jpg,jpeg,webp,gif}', {
  eager: true,
  import: 'default',
}) as ImageAssetModuleMap;

const preloadTargetRules: Array<{ match: (path: string) => boolean; label: string; order: number }> = [
  { match: (path) => path.includes('../assets/cards/'), label: 'カード', order: 10 },
  { match: (path) => path.includes('../assets/enemies/'), label: '敵', order: 20 },
  { match: (path) => path.includes('../assets/backgrounds/'), label: '戦闘背景', order: 30 },
  { match: (path) => path.includes('../assets/story/'), label: 'ストーリー背景', order: 40 },
  { match: (path) => path.includes('../assets/map_bg_'), label: 'マップ背景', order: 50 },
  { match: (path) => path.includes('../assets/jobs/'), label: 'ジョブ画像', order: 60 },
  { match: (path) => path.includes('../assets/omamori/'), label: 'お守り画像', order: 70 },
  { match: (path) => path.endsWith('../assets/home_background.png'), label: 'ホーム背景', order: 80 },
  { match: (path) => path.endsWith('../assets/job_select_background.png'), label: 'ジョブ選択背景', order: 90 },
];

type ImagePreloadItem = {
  path: string;
  url: string;
  label: string;
  order: number;
};

type StoredImagePreloadStatus = {
  signature: string;
  total: number;
  completedAt: number;
};

const getPreloadRule = (path: string) => preloadTargetRules.find((rule) => rule.match(path));

const hashString = (value: string) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
};

const getImagePreloadItems = (): ImagePreloadItem[] => {
  const seenUrls = new Set<string>();

  return Object.entries(imageAssetModules)
    .flatMap(([path, url]) => {
      const rule = getPreloadRule(path);
      if (!rule || seenUrls.has(url)) return [];
      seenUrls.add(url);
      return [{ path, url, label: rule.label, order: rule.order }];
    })
    .sort((a, b) => a.order - b.order || a.path.localeCompare(b.path));
};

const getImagePreloadSignature = (items: ImagePreloadItem[]) =>
  hashString(items.map((item) => item.url).join('|'));

const readStoredStatus = (): StoredImagePreloadStatus | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(IMAGE_PRELOAD_STATUS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredImagePreloadStatus>;
    if (
      typeof parsed.signature !== 'string' ||
      typeof parsed.total !== 'number' ||
      typeof parsed.completedAt !== 'number'
    ) {
      return null;
    }
    return {
      signature: parsed.signature,
      total: parsed.total,
      completedAt: parsed.completedAt,
    };
  } catch {
    return null;
  }
};

const writeStoredStatus = (items: ImagePreloadItem[]) => {
  if (typeof window === 'undefined') return;
  try {
    const status: StoredImagePreloadStatus = {
      signature: getImagePreloadSignature(items),
      total: items.length,
      completedAt: Date.now(),
    };
    window.localStorage.setItem(IMAGE_PRELOAD_STATUS_KEY, JSON.stringify(status));
  } catch {
    // localStorageが使えない環境でも、プリロード自体は成功扱いにしないだけで止めない。
  }
};

export const clearImagePreloadStatus = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(IMAGE_PRELOAD_STATUS_KEY);
  } catch {
    // ignore
  }
};

const waitForNextFrame = () =>
  new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve());
      return;
    }
    globalThis.setTimeout(resolve, 0);
  });

const preloadOneImage = (url: string) =>
  new Promise<boolean>((resolve) => {
    const img = new Image();
    let resolved = false;

    const finish = (ok: boolean) => {
      if (resolved) return;
      resolved = true;
      resolve(ok);
    };

    img.decoding = 'async';
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = url;

    if (img.complete) {
      finish(true);
    }
  });

export const getImagePreloadStatus = (): ImagePreloadStatus => {
  const items = getImagePreloadItems();
  const stored = readStoredStatus();
  const signature = getImagePreloadSignature(items);
  const done = Boolean(stored && stored.total === items.length && stored.signature === signature);

  return {
    done,
    total: items.length,
    completedAt: done ? stored?.completedAt ?? null : null,
  };
};

export const preloadImageAssets = async (
  onProgress?: (progress: ImagePreloadProgress) => void,
): Promise<ImagePreloadProgress> => {
  const items = getImagePreloadItems();
  let loaded = 0;
  let failed = 0;
  let currentLabel = items[0]?.label ?? '';

  onProgress?.({ loaded, total: items.length, failed, currentLabel });

  for (const item of items) {
    currentLabel = item.label;
    const ok = await preloadOneImage(item.url);
    loaded += 1;
    if (!ok) failed += 1;
    onProgress?.({ loaded, total: items.length, failed, currentLabel });
    await waitForNextFrame();
  }

  const result = { loaded, total: items.length, failed, currentLabel };
  if (failed === 0) {
    writeStoredStatus(items);
  }
  return result;
};
