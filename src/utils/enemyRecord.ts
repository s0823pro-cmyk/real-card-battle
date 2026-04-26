import type { Enemy } from '../types/game';

export type EnemyEncounterStatus = 'none' | 'encountered' | 'defeated';

/** ランキング統計用: templateId（claimer / bicycle 等）。図鑑・recordEnemyDefeated と揃える */
export const getEnemyTemplateIdForStats = (enemy: Pick<Enemy, 'id' | 'templateId'>): string => {
  const tid = enemy.templateId?.trim();
  if (tid) return tid;
  const m = enemy.id.match(/^enemy_(.+)_\d+$/);
  return m ? m[1] : enemy.id;
};

const ENEMY_RECORD_KEY = 'jobless_enemy_records';
const ENEMY_DEFEAT_COUNT_KEY = 'jobless_enemy_defeat_counts';

const loadEnemyRecords = (): Record<string, EnemyEncounterStatus> => {
  try {
    const saved = window.localStorage.getItem(ENEMY_RECORD_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved) as Record<string, EnemyEncounterStatus>;
    return parsed ?? {};
  } catch {
    return {};
  }
};

const saveEnemyRecords = (records: Record<string, EnemyEncounterStatus>): void => {
  try {
    window.localStorage.setItem(ENEMY_RECORD_KEY, JSON.stringify(records));
  } catch {
    // localStorage が利用不可な環境では保存をスキップ
  }
};

const loadEnemyDefeatCounts = (): Record<string, number> => {
  try {
    const saved = window.localStorage.getItem(ENEMY_DEFEAT_COUNT_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved) as Record<string, number>;
    return parsed ?? {};
  } catch {
    return {};
  }
};

const saveEnemyDefeatCounts = (counts: Record<string, number>): void => {
  try {
    window.localStorage.setItem(ENEMY_DEFEAT_COUNT_KEY, JSON.stringify(counts));
  } catch {
    // localStorage が利用不可な環境では保存をスキップ
  }
};

export const recordEnemyEncounter = (enemyId: string): void => {
  const records = loadEnemyRecords();
  if (!records[enemyId]) {
    records[enemyId] = 'encountered';
    saveEnemyRecords(records);
  }
};

export const recordEnemyDefeated = (enemyId: string): void => {
  const records = loadEnemyRecords();
  records[enemyId] = 'defeated';
  saveEnemyRecords(records);
  const counts = loadEnemyDefeatCounts();
  counts[enemyId] = (counts[enemyId] ?? 0) + 1;
  saveEnemyDefeatCounts(counts);
};

export const getEnemyStatus = (enemyId: string): EnemyEncounterStatus => {
  const records = loadEnemyRecords();
  return records[enemyId] ?? 'none';
};

export const getEnemyDefeatCount = (enemyId: string): number => {
  const counts = loadEnemyDefeatCounts();
  return counts[enemyId] ?? 0;
};
