/** 開発用: 戦闘開始時に敵の maxHp / currentHp を 1 にする（課金キーとは別） */
export const DEBUG_ENEMY_HP1_KEY = 'real-card-battle:debug-enemy-hp1';

export function getDebugEnemyHp1(): boolean {
  try {
    return localStorage.getItem(DEBUG_ENEMY_HP1_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDebugEnemyHp1(value: boolean): void {
  try {
    if (value) localStorage.setItem(DEBUG_ENEMY_HP1_KEY, 'true');
    else localStorage.removeItem(DEBUG_ENEMY_HP1_KEY);
  } catch {
    /* ignore */
  }
}
