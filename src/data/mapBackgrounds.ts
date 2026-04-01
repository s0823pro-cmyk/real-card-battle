import type { JobId } from '../types/game';
import mapBgArea1 from '../assets/map_bg_area1.png';
import mapBgArea2 from '../assets/map_bg_area2.png';
import mapBgArea3 from '../assets/map_bg_area3.png';
import mapBgCookArea1 from '../assets/map_bg_cook_area1.png';
import mapBgCookArea2 from '../assets/map_bg_cook_area2.png';
import mapBgCookArea3 from '../assets/map_bg_cook_area3.png';

export const MAP_BACKGROUNDS: Record<number, string> = {
  1: mapBgArea1,
  2: mapBgArea2,
  3: mapBgArea3,
};

/** 料理人用マップ背景（`src/assets/map_bg_cook_area*.png`） */
export const COOK_MAP_BACKGROUNDS: Record<number, string> = {
  1: mapBgCookArea1,
  2: mapBgCookArea2,
  3: mapBgCookArea3,
};

export function getMapBackground(area: number): string {
  return MAP_BACKGROUNDS[area] ?? MAP_BACKGROUNDS[1];
}

/** 大工・料理人はエリア別マップ画像、それ以外は null（単色背景） */
export function getMapBackgroundForJob(jobId: JobId, area: number): string | null {
  const a = Math.min(3, Math.max(1, Math.floor(area)));
  if (jobId === 'carpenter') return MAP_BACKGROUNDS[a] ?? MAP_BACKGROUNDS[1];
  if (jobId === 'cook') return COOK_MAP_BACKGROUNDS[a] ?? COOK_MAP_BACKGROUNDS[1];
  return null;
}
