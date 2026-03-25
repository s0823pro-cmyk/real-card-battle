// DEV ONLY — 確認後削除
import type { Enemy } from '../types/game';

export const DEBUG_ENEMY_HP1_STORAGE_KEY = 'real-card-battle:debug-enemy-hp1';

export function isDebugEnemyHp1Enabled(): boolean {
  try {
    return window.localStorage.getItem(DEBUG_ENEMY_HP1_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** createInitialGameState 内で敵配列に適用 */
export function applyDebugEnemyHp1ToEnemies(enemies: Enemy[]): Enemy[] {
  if (!isDebugEnemyHp1Enabled()) return enemies;
  return enemies.map((e) => ({ ...e, currentHp: 1, maxHp: 1 }));
}
