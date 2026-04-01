import { ACHIEVEMENTS } from '../data/achievementDefinitions';
import type { Achievement } from './achievementTypes';
import type { JobId } from '../types/game';
import type { BattleResult } from '../types/run';
import type { AchievementCounters } from './achievementCounters';
import { clearAchievementCounters, loadAchievementCounters, saveAchievementCounters } from './achievementCounters';
import { unlockJob } from './jobUnlockSystem';

export type { Achievement, AchievementTier } from './achievementTypes';
export { ACHIEVEMENTS, ACHIEVEMENT_LOCKED_CARD_IDS } from '../data/achievementDefinitions';

const ACHIEVEMENT_KEY = 'real-card-battle:achievements';
const DEFEAT_COUNT_KEY = 'real-card-battle:defeat-count';

/** 達成済みIDセットを取得 */
export const getUnlockedAchievementIds = (): Set<string> => {
  try {
    const saved = localStorage.getItem(ACHIEVEMENT_KEY);
    if (!saved) return new Set();
    return new Set(JSON.parse(saved) as string[]);
  } catch {
    return new Set();
  }
};

/** 実績を達成済みにする（新規達成分だけを返す） */
export const unlockAchievements = (ids: string[]): Achievement[] => {
  const current = getUnlockedAchievementIds();
  const newlyUnlocked: Achievement[] = [];
  for (const id of ids) {
    if (!current.has(id)) {
      current.add(id);
      const achievement = ACHIEVEMENTS.find((a) => a.id === id);
      if (achievement) newlyUnlocked.push(achievement);
    }
  }
  try {
    localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify([...current]));
  } catch {
    /* localStorage 不可 */
  }
  return newlyUnlocked;
};

/** 敗北回数 */
export const getDefeatCount = (): number => {
  try {
    return parseInt(localStorage.getItem(DEFEAT_COUNT_KEY) ?? '0', 10);
  } catch {
    return 0;
  }
};

export const incrementDefeatCount = (): number => {
  const next = getDefeatCount() + 1;
  try {
    localStorage.setItem(DEFEAT_COUNT_KEY, String(next));
  } catch {
    /* localStorage 不可 */
  }
  return next;
};

/** 解放済みカードID（実績報酬の合計） */
export const getUnlockedCardIds = (): Set<string> => {
  const unlocked = getUnlockedAchievementIds();
  const ids = new Set<string>();
  for (const a of ACHIEVEMENTS) {
    if (unlocked.has(a.id)) {
      ids.add(a.rewardCardIds[0]);
      ids.add(a.rewardCardIds[1]);
    }
  }
  return ids;
};

/** 実績経由のお守り解放は廃止（常に空） */
export const getUnlockedOmamoriIds = (): Set<string> => new Set();

/**
 * 実績報酬のカード／お守りオブジェクト取得は `achievementRewardLookup.ts`
 * （`runData` が本モジュールを参照するため、循環依存回避で分離）
 */

/** データ初期化時に呼ぶ */
export const clearAchievements = (): void => {
  try {
    localStorage.removeItem(ACHIEVEMENT_KEY);
    localStorage.removeItem(DEFEAT_COUNT_KEY);
  } catch {
    /* ignore */
  }
  clearAchievementCounters();
};

/** バトル終了後にカウンタを更新（評価の前に呼ぶ） */
export const recordBattleEndForAchievements = (result: BattleResult): void => {
  const c = loadAchievementCounters();
  if (result.outcome === 'victory') {
    c.battleWins += 1;
    c.lifetimeGoldEarned += Math.max(0, result.rewardGold);
    if (result.kind === 'elite') c.eliteWins += 1;
  }
  saveAchievementCounters(c);
};

const pushIf = (ids: string[], cond: boolean, id: string): void => {
  if (cond) ids.push(id);
};

/**
 * 実績の jobId と現在プレイ中の職業が一致するか。
 * `common` または未指定はどの職業でも達成可能。
 */
export const isAchievementEligibleForJob = (
  achievementJobId: JobId | 'common' | undefined,
  currentJobId: JobId,
): boolean => {
  if (achievementJobId === undefined || achievementJobId === 'common') return true;
  return achievementJobId === currentJobId;
};

const filterAchievementIdsByJob = (ids: string[], currentJobId: JobId): string[] =>
  ids.filter((id) => {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    return a ? isAchievementEligibleForJob(a.jobId, currentJobId) : false;
  });

/**
 * 実績一覧で「累積条件」の現在値を表示する対象。
 * 閾値・カウンタ対応は evaluateAchievementProgress / evaluateAchievementsAfterBattle と一致させる（職業フィルタ含む）。
 */
const CUMULATIVE_ACHIEVEMENT_DISPLAY: Record<
  string,
  | { kind: 'counter'; key: keyof AchievementCounters; unit: 'times' | 'gold' }
  | { kind: 'defeat' }
> = {
  dice_25: { kind: 'counter', key: 'diceRolls', unit: 'times' },
  dice_80: { kind: 'counter', key: 'diceRolls', unit: 'times' },
  shrine_5: { kind: 'counter', key: 'shrineVisits', unit: 'times' },
  shop_cards_8: { kind: 'counter', key: 'shopCardBuys', unit: 'times' },
  gold_lifetime_500: { kind: 'counter', key: 'lifetimeGoldEarned', unit: 'gold' },
  gold_lifetime_2000: { kind: 'counter', key: 'lifetimeGoldEarned', unit: 'gold' },
  events_10: { kind: 'counter', key: 'eventsResolved', unit: 'times' },
  hotel_5: { kind: 'counter', key: 'hotelVisits', unit: 'times' },
  win_10: { kind: 'counter', key: 'battleWins', unit: 'times' },
  win_25: { kind: 'counter', key: 'battleWins', unit: 'times' },
  elite_wins_5: { kind: 'counter', key: 'eliteWins', unit: 'times' },
  defeat_3: { kind: 'defeat' },
};

/** 累積型実績の説明文に付ける接尾辞（例: （現在3回））。対象外は null */
export const getCumulativeAchievementProgressSuffix = (
  achievementId: string,
  counters: AchievementCounters,
  defeatCount: number,
): string | null => {
  const spec = CUMULATIVE_ACHIEVEMENT_DISPLAY[achievementId];
  if (!spec) return null;
  if (spec.kind === 'defeat') {
    return `（現在${defeatCount}回）`;
  }
  const n = counters[spec.key] as number;
  if (spec.unit === 'gold') {
    return `（現在${n}G）`;
  }
  return `（現在${n}回）`;
};

/** 累計カウンタのみで判定する実績（サイコロ・神社・ゴールド等）。`currentJobId` と実績の jobId が一致するものだけ解放 */
export const evaluateAchievementProgress = (currentJobId: JobId): Achievement[] => {
  const achievementIds: string[] = [];
  const already = getUnlockedAchievementIds();
  const c = loadAchievementCounters();
  pushIf(achievementIds, c.diceRolls >= 25 && !already.has('dice_25'), 'dice_25');
  pushIf(achievementIds, c.diceRolls >= 80 && !already.has('dice_80'), 'dice_80');
  pushIf(achievementIds, c.shrineVisits >= 5 && !already.has('shrine_5'), 'shrine_5');
  pushIf(achievementIds, c.shopCardBuys >= 8 && !already.has('shop_cards_8'), 'shop_cards_8');
  pushIf(achievementIds, c.lifetimeGoldEarned >= 500 && !already.has('gold_lifetime_500'), 'gold_lifetime_500');
  pushIf(achievementIds, c.lifetimeGoldEarned >= 2000 && !already.has('gold_lifetime_2000'), 'gold_lifetime_2000');
  pushIf(achievementIds, c.eventsResolved >= 10 && !already.has('events_10'), 'events_10');
  pushIf(achievementIds, c.hotelVisits >= 5 && !already.has('hotel_5'), 'hotel_5');
  pushIf(achievementIds, c.battleWins >= 10 && !already.has('win_10'), 'win_10');
  pushIf(achievementIds, c.battleWins >= 25 && !already.has('win_25'), 'win_25');
  pushIf(achievementIds, c.eliteWins >= 5 && !already.has('elite_wins_5'), 'elite_wins_5');
  return unlockAchievements(filterAchievementIdsByJob([...new Set(achievementIds)], currentJobId));
};

/** サイコロ1回分（出目に関わらず1回） */
export const recordDiceRollForAchievements = (currentJobId: JobId): Achievement[] => {
  const c = loadAchievementCounters();
  c.diceRolls += 1;
  saveAchievementCounters(c);
  return evaluateAchievementProgress(currentJobId);
};

/** 神社訪問1回 */
export const recordShrineVisitForAchievements = (currentJobId: JobId): Achievement[] => {
  const c = loadAchievementCounters();
  c.shrineVisits += 1;
  saveAchievementCounters(c);
  return evaluateAchievementProgress(currentJobId);
};

/** ホテル訪問1回 */
export const recordHotelVisitForAchievements = (currentJobId: JobId): Achievement[] => {
  const c = loadAchievementCounters();
  c.hotelVisits += 1;
  saveAchievementCounters(c);
  return evaluateAchievementProgress(currentJobId);
};

/** 質屋でカード購入1回 */
export const recordShopCardBuyForAchievements = (currentJobId: JobId): Achievement[] => {
  const c = loadAchievementCounters();
  c.shopCardBuys += 1;
  saveAchievementCounters(c);
  return evaluateAchievementProgress(currentJobId);
};

/** イベント完了1回 */
export const recordEventResolvedForAchievements = (currentJobId: JobId): Achievement[] => {
  const c = loadAchievementCounters();
  c.eventsResolved += 1;
  saveAchievementCounters(c);
  return evaluateAchievementProgress(currentJobId);
};

/**
 * バトル結果から解除候補を評価（戦闘終了時）。カウンタ系もまとめて評価。
 */
export const evaluateAchievementsAfterBattle = (
  result: BattleResult,
  currentArea: number,
): Achievement[] => {
  const currentJobId = result.player.jobId;
  const achievementIds: string[] = [];
  const already = getUnlockedAchievementIds();
  const c = loadAchievementCounters();

  if (result.outcome === 'victory') {
    pushIf(achievementIds, !already.has('first_win'), 'first_win');
    if (result.kind === 'elite') {
      pushIf(achievementIds, !already.has('elite_first'), 'elite_first');
    }
    if (result.kind === 'boss') {
      if (currentArea === 1) achievementIds.push('area1_clear');
      if (currentArea === 2) {
        achievementIds.push('area2_clear');
        unlockJob('cook');
      }
      if (currentArea === 3) achievementIds.push('area3_clear');
    }
    pushIf(achievementIds, c.battleWins >= 10, 'win_10');
    pushIf(achievementIds, c.battleWins >= 25, 'win_25');
    pushIf(achievementIds, c.eliteWins >= 5, 'elite_wins_5');
    if (result.player.scaffold >= 10) achievementIds.push('scaffold_10');
    if (result.player.currentHp <= 10) achievementIds.push('low_hp_kill');
    if (result.player.mental <= 0) achievementIds.push('zero_mental_survive');
  }

  if (result.outcome === 'defeat') {
    const count = incrementDefeatCount();
    if (count >= 20) unlockJob('cook');
    if (count >= 3) achievementIds.push('defeat_3');
  }

  const fromBattle = unlockAchievements(
    filterAchievementIdsByJob([...new Set(achievementIds)], currentJobId),
  );
  const fromProgress = evaluateAchievementProgress(currentJobId);
  const seen = new Set(fromBattle.map((a) => a.id));
  return [...fromBattle, ...fromProgress.filter((a) => !seen.has(a.id))];
};

/** 開発用: 全実績を達成済みにする（localStorage に保存） */
export const unlockAllAchievements = (): void => {
  unlockAchievements(ACHIEVEMENTS.map((a) => a.id));
};
