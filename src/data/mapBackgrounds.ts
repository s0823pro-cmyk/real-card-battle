import mapBgArea1 from '../assets/map_bg_area1.png';
import mapBgArea2 from '../assets/map_bg_area2.png';
import mapBgArea3 from '../assets/map_bg_area3.png';

export const MAP_BACKGROUNDS: Record<number, string> = {
  1: mapBgArea1,
  2: mapBgArea2,
  3: mapBgArea3,
};

export function getMapBackground(area: number): string {
  return MAP_BACKGROUNDS[area] ?? MAP_BACKGROUNDS[1];
}
