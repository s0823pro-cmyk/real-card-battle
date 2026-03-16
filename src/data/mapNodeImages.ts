import type { TileType } from '../types/run';
import nodeStart from '../assets/map/node_start.png';
import nodeEnemy from '../assets/map/node_enemy.png';
import nodeUniqueBoss from '../assets/map/node_unique_boss.png';
import nodeAreaBoss from '../assets/map/node_area_boss.png';
import nodePawnshop from '../assets/map/node_pawnshop.png';
import nodeEvent from '../assets/map/node_event.png';
import nodeShrine from '../assets/map/node_shrine.png';
import nodeHotel from '../assets/map/node_hotel.png';

export const MAP_NODE_IMAGES: Record<TileType, string> = {
  start: nodeStart,
  enemy: nodeEnemy,
  unique_boss: nodeUniqueBoss,
  area_boss: nodeAreaBoss,
  pawnshop: nodePawnshop,
  event: nodeEvent,
  shrine: nodeShrine,
  hotel: nodeHotel,
};

export function getNodeImage(nodeType: TileType): string | null {
  return MAP_NODE_IMAGES[nodeType] ?? null;
}
