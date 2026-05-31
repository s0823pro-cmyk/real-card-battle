import type { JobId } from '../types/game';
import mapBgArea1 from '../assets/map_bg_area1.png';
import mapBgArea2 from '../assets/map_bg_area2.png';
import mapBgArea3 from '../assets/map_bg_area3.png';
import mapBgCarpenterArea1 from '../assets/map_bg_carpenter_area1.png';
import mapBgCarpenterArea2 from '../assets/map_bg_carpenter_area2.png';
import mapBgCarpenterArea3 from '../assets/map_bg_carpenter_area3.png';
import mapBgCookArea1 from '../assets/map_bg_cook_area1_v2.png';
import mapBgCookArea2 from '../assets/map_bg_cook_area2_v2.png';
import mapBgCookArea3 from '../assets/map_bg_cook_area3_v2.png';
import mapBgUnemployedArea1 from '../assets/map_bg_unemployed_area1.png';
import mapBgUnemployedArea2 from '../assets/map_bg_unemployed_area2.png';
import mapBgUnemployedArea3 from '../assets/map_bg_unemployed_area3.png';
import mapBgCourierArea1 from '../assets/map_bg_courier_area1.png';
import mapBgCourierArea2 from '../assets/map_bg_courier_area2.png';
import mapBgCourierArea3 from '../assets/map_bg_courier_area3.png';

export const MAP_BACKGROUNDS: Record<number, string> = {
  1: mapBgArea1,
  2: mapBgArea2,
  3: mapBgArea3,
};

export const CARPENTER_MAP_BACKGROUNDS: Record<number, string> = {
  1: mapBgCarpenterArea1,
  2: mapBgCarpenterArea2,
  3: mapBgCarpenterArea3,
};

/** 料理人用マップ背景（`src/assets/map_bg_cook_area*.png`） */
export const COOK_MAP_BACKGROUNDS: Record<number, string> = {
  1: mapBgCookArea1,
  2: mapBgCookArea2,
  3: mapBgCookArea3,
};

export const UNEMPLOYED_MAP_BACKGROUNDS: Record<number, string> = {
  1: mapBgUnemployedArea1,
  2: mapBgUnemployedArea2,
  3: mapBgUnemployedArea3,
};

export const COURIER_MAP_BACKGROUNDS: Record<number, string> = {
  1: mapBgCourierArea1,
  2: mapBgCourierArea2,
  3: mapBgCourierArea3,
};

export function getMapBackground(area: number): string {
  return MAP_BACKGROUNDS[area] ?? MAP_BACKGROUNDS[1];
}

/** ジョブ別マップ背景。未定義ジョブだけ旧汎用背景にフォールバックする。 */
export function getMapBackgroundForJob(jobId: JobId, area: number): string | null {
  const a = Math.min(3, Math.max(1, Math.floor(area)));
  if (jobId === 'carpenter') return CARPENTER_MAP_BACKGROUNDS[a] ?? CARPENTER_MAP_BACKGROUNDS[1];
  if (jobId === 'cook') return COOK_MAP_BACKGROUNDS[a] ?? COOK_MAP_BACKGROUNDS[1];
  if (jobId === 'unemployed') return UNEMPLOYED_MAP_BACKGROUNDS[a] ?? UNEMPLOYED_MAP_BACKGROUNDS[1];
  if (jobId === 'courier') return COURIER_MAP_BACKGROUNDS[a] ?? COURIER_MAP_BACKGROUNDS[1];
  return MAP_BACKGROUNDS[a] ?? MAP_BACKGROUNDS[1];
}
