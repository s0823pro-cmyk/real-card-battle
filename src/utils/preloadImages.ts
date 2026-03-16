// Viteのimport.meta.globで全カード・敵画像を収集
const cardImageModules = import.meta.glob<{ default: string }>(
  '../assets/cards/**/*.png',
  { eager: true },
);
const enemyImageModules = import.meta.glob<{ default: string }>(
  '../assets/enemies/*.png',
  { eager: true },
);

const ALL_IMAGE_URLS: string[] = [
  ...Object.values(cardImageModules).map((m) => m.default),
  ...Object.values(enemyImageModules).map((m) => m.default),
];

export function preloadAllImages(
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  const total = ALL_IMAGE_URLS.length;
  if (total === 0) {
    onProgress?.(0, 0);
    return Promise.resolve();
  }
  let loaded = 0;

  const promises = ALL_IMAGE_URLS.map(
    (url) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          loaded++;
          onProgress?.(loaded, total);
          resolve();
        };
        img.onerror = () => {
          loaded++;
          onProgress?.(loaded, total);
          resolve();
        };
        img.src = url;
      }),
  );

  return Promise.all(promises).then(() => undefined);
}
