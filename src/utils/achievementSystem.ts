import { ACHIEVEMENTS } from '../data/achievementDefinitions';
import type { Achievement } from './achievementTypes';
import type { JobId } from '../types/game';
import type { BattleResult } from '../types/run';
import type { AchievementTrackedJobId, JobAchievementCounters } from './achievementCounters';
import {
  clearAchievementCounters,
  getDefeatCountForJob,
  getTotalDefeatCountAcrossJobs,
  incrementDefeatCountForJob,
  incrementDiceRollsForJob,
  incrementEventsResolvedForJob,
  incrementHotelVisitsForJob,
  incrementShrineVisitsForJob,
  incrementShopCardBuysForJob,
  loadAchievementCountersForJob,
  recordBattleVictoryForJob,
} from './achievementCounters';
import { isJobUnlocked, unlockJob } from './jobUnlockSystem';

export type { Achievement, AchievementTier } from './achievementTypes';
export { ACHIEVEMENT_LOCKED_CARD_IDS, ACHIEVEMENTS } from '../data/achievementDefinitions';
export { getDefeatCountForJob, loadAchievementCountersForJob } from './achievementCounters';

const ACHIEVEMENT_KEY = 'real-card-battle:achievements';

/** 既存ユーザー向けワンショット移行（HomeScreen マウント時） */
export const COOK_ACHIEVEMENTS_RESET_V1_KEY = 'real-card-battle:cook-achievements-reset-v1';

const COOK_ACHIEVEMENT_IDS = new Set(
  ACHIEVEMENTS.filter((a) => a.jobId === 'cook').map((a) => a.id),
);

/**
 * 料理人（jobId === cook）の実績達成のみを localStorage から外す。
 * 大工・共通の実績 ID は触らない。報酬カードは `getUnlockedCardIds()` が
 * 達成済み実績から都度算出するため、料理人実績を外せば当該 rewardCardIds のみ除外される。
 */
export const resetCookAchievements = (): void => {
  const unlocked = getUnlockedAchievementIds();
  let changed = false;
  for (const id of COOK_ACHIEVEMENT_IDS) {
    if (unlocked.delete(id)) changed = true;
  }
  if (!changed) return;
  try {
    localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify([...unlocked]));
  } catch {
    /* localStorage 不可 */
  }
};

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

/**
 * @deprecated 職業横断の合計敗北（料理人ジョブ解放の隠し条件など従来互換用）
 */
export const getDefeatCount = (): number => getTotalDefeatCountAcrossJobs();

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

/**
 * 図鑑など「全カード定義を列挙する」UI用。
 * 実績報酬カードも未解除時点で枠だけ表示する。
 * 未入手カードの詳細表示や検索対象化は ZukanScreen 側の unlock 判定で制御する。
 */
export const isAchievementRewardCardVisibleInCatalog = (_cardId: string): boolean => true;

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
  } catch {
    /* ignore */
  }
  clearAchievementCounters();
};

/** バトル終了後にカウンタを更新（評価の前に呼ぶ） */
export const recordBattleEndForAchievements = (result: BattleResult): void => {
  const jobId = result.player.jobId;
  if (result.outcome !== 'victory') return;
  recordBattleVictoryForJob(jobId, Math.max(0, result.rewardGold), result.kind);
};

const pushIf = (ids: string[], cond: boolean, id: string): void => {
  if (cond) ids.push(id);
};

/** 料理人ジョブ：大工でエリア1ボス撃破（area1_clear）、または累計20敗（隠し）で解放。既に解放済みなら何もしない */
const maybeUnlockCookJobFromConditions = (): void => {
  if (isJobUnlocked('cook')) return;
  const ids = getUnlockedAchievementIds();
  if (ids.has('area1_clear') || getTotalDefeatCountAcrossJobs() >= 20) {
    unlockJob('cook');
  }
};

/** 無職ジョブ：料理人でエリア1ボス撃破、または累計35敗（隠し）で解放。既に解放済みなら何もしない */
const maybeUnlockUnemployedJobFromConditions = (): void => {
  if (isJobUnlocked('unemployed')) return;
  const ids = getUnlockedAchievementIds();
  if (ids.has('cook_area1_clear') || getTotalDefeatCountAcrossJobs() >= 35) {
    unlockJob('unemployed');
  }
};

/** 配達員ジョブ：無職でエリア1ボス撃破、または累計50敗（隠し）で解放。既に解放済みなら何もしない */
const maybeUnlockCourierJobFromConditions = (): void => {
  if (isJobUnlocked('courier')) return;
  const ids = getUnlockedAchievementIds();
  if (ids.has('unemployed_area1_clear') || getTotalDefeatCountAcrossJobs() >= 50) {
    unlockJob('courier');
  }
};

export const syncJobUnlocksFromConditions = (): void => {
  maybeUnlockCookJobFromConditions();
  maybeUnlockUnemployedJobFromConditions();
  maybeUnlockCourierJobFromConditions();
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

const achievementJobKey = (a: Achievement | undefined): AchievementTrackedJobId => {
  if (a?.jobId === 'cook' || a?.jobId === 'unemployed' || a?.jobId === 'carpenter' || a?.jobId === 'courier') {
    return a.jobId;
  }
  return 'carpenter';
};

/**
 * 実績一覧で「累積条件」の現在値を表示する対象。
 * 閾値・カウンタ対応は evaluateAchievementProgress / evaluateAchievementsAfterBattle と一致させる（職業別カウンタ）。
 */
const CUMULATIVE_ACHIEVEMENT_DISPLAY: Record<
  string,
  | { kind: 'counter'; key: keyof JobAchievementCounters; unit: 'times' | 'gold' }
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
  // コック用累積系
  cook_shrine_5: { kind: 'counter', key: 'shrineVisits', unit: 'times' },
  cook_gold_500: { kind: 'counter', key: 'lifetimeGoldEarned', unit: 'gold' },
  cook_gold_2000: { kind: 'counter', key: 'lifetimeGoldEarned', unit: 'gold' },
  cook_events_10: { kind: 'counter', key: 'eventsResolved', unit: 'times' },
  cook_hotel_5: { kind: 'counter', key: 'hotelVisits', unit: 'times' },
  cook_win_10: { kind: 'counter', key: 'battleWins', unit: 'times' },
  cook_win_25: { kind: 'counter', key: 'battleWins', unit: 'times' },
  cook_elite_wins_5: { kind: 'counter', key: 'eliteWins', unit: 'times' },
  cook_defeat_3: { kind: 'defeat' },
  // 無職用累積系
  unemployed_dice_25: { kind: 'counter', key: 'diceRolls', unit: 'times' },
  unemployed_shrine_5: { kind: 'counter', key: 'shrineVisits', unit: 'times' },
  unemployed_shop_cards_8: { kind: 'counter', key: 'shopCardBuys', unit: 'times' },
  unemployed_gold_500: { kind: 'counter', key: 'lifetimeGoldEarned', unit: 'gold' },
  unemployed_gold_2000: { kind: 'counter', key: 'lifetimeGoldEarned', unit: 'gold' },
  unemployed_events_10: { kind: 'counter', key: 'eventsResolved', unit: 'times' },
  unemployed_hotel_5: { kind: 'counter', key: 'hotelVisits', unit: 'times' },
  unemployed_win_10: { kind: 'counter', key: 'battleWins', unit: 'times' },
  unemployed_win_25: { kind: 'counter', key: 'battleWins', unit: 'times' },
  unemployed_elite_wins_5: { kind: 'counter', key: 'eliteWins', unit: 'times' },
  unemployed_defeat_3: { kind: 'defeat' },
  // 配達員用累積系
  courier_dice_25: { kind: 'counter', key: 'diceRolls', unit: 'times' },
  courier_shrine_5: { kind: 'counter', key: 'shrineVisits', unit: 'times' },
  courier_shop_cards_8: { kind: 'counter', key: 'shopCardBuys', unit: 'times' },
  courier_gold_500: { kind: 'counter', key: 'lifetimeGoldEarned', unit: 'gold' },
  courier_gold_2000: { kind: 'counter', key: 'lifetimeGoldEarned', unit: 'gold' },
  courier_events_10: { kind: 'counter', key: 'eventsResolved', unit: 'times' },
  courier_hotel_5: { kind: 'counter', key: 'hotelVisits', unit: 'times' },
  courier_win_10: { kind: 'counter', key: 'battleWins', unit: 'times' },
  courier_win_25: { kind: 'counter', key: 'battleWins', unit: 'times' },
  courier_elite_wins_5: { kind: 'counter', key: 'eliteWins', unit: 'times' },
  courier_defeat_3: { kind: 'defeat' },
};

/** 累積型実績の説明文に付ける接尾辞（例: （現在3回））。対象外は null */
export const getCumulativeAchievementProgressSuffix = (achievementId: string): string | null => {
  if (achievementId === 'cook_dice_80') {
    const cook = loadAchievementCountersForJob('cook');
    const area3 = getUnlockedAchievementIds().has('cook_area3_clear');
    return `（勝利${cook.battleWins}/50・エリア3:${area3 ? '済' : '未'}）`;
  }
  const spec = CUMULATIVE_ACHIEVEMENT_DISPLAY[achievementId];
  if (!spec) return null;
  const ach = ACHIEVEMENTS.find((a) => a.id === achievementId);
  const job = achievementJobKey(ach);
  const counters = loadAchievementCountersForJob(job);
  if (spec.kind === 'defeat') {
    return `（現在${getDefeatCountForJob(job)}回）`;
  }
  const n = counters[spec.key] as number;
  if (spec.unit === 'gold') {
    return `（現在${n}G）`;
  }
  return `（現在${n}回）`;
};

/** 累計カウンタのみで判定する実績。現在プレイ中の職業のカウンタのみ参照 */
export const evaluateAchievementProgress = (currentJobId: JobId): Achievement[] => {
  if (
    currentJobId !== 'carpenter' &&
    currentJobId !== 'cook' &&
    currentJobId !== 'unemployed' &&
    currentJobId !== 'courier'
  ) {
    return [];
  }
  const achievementIds: string[] = [];
  const already = getUnlockedAchievementIds();
  const c = loadAchievementCountersForJob(currentJobId);
  if (currentJobId === 'carpenter') {
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
  } else if (currentJobId === 'cook') {
    pushIf(achievementIds, c.shrineVisits >= 5 && !already.has('cook_shrine_5'), 'cook_shrine_5');
    pushIf(achievementIds, c.lifetimeGoldEarned >= 500 && !already.has('cook_gold_500'), 'cook_gold_500');
    pushIf(achievementIds, c.lifetimeGoldEarned >= 2000 && !already.has('cook_gold_2000'), 'cook_gold_2000');
    pushIf(achievementIds, c.eventsResolved >= 10 && !already.has('cook_events_10'), 'cook_events_10');
    pushIf(achievementIds, c.hotelVisits >= 5 && !already.has('cook_hotel_5'), 'cook_hotel_5');
    pushIf(achievementIds, c.battleWins >= 10 && !already.has('cook_win_10'), 'cook_win_10');
    pushIf(achievementIds, c.battleWins >= 25 && !already.has('cook_win_25'), 'cook_win_25');
    pushIf(achievementIds, c.eliteWins >= 5 && !already.has('cook_elite_wins_5'), 'cook_elite_wins_5');
  } else if (currentJobId === 'unemployed') {
    pushIf(achievementIds, c.diceRolls >= 25 && !already.has('unemployed_dice_25'), 'unemployed_dice_25');
    pushIf(achievementIds, c.shrineVisits >= 5 && !already.has('unemployed_shrine_5'), 'unemployed_shrine_5');
    pushIf(achievementIds, c.shopCardBuys >= 8 && !already.has('unemployed_shop_cards_8'), 'unemployed_shop_cards_8');
    pushIf(achievementIds, c.lifetimeGoldEarned >= 500 && !already.has('unemployed_gold_500'), 'unemployed_gold_500');
    pushIf(achievementIds, c.lifetimeGoldEarned >= 2000 && !already.has('unemployed_gold_2000'), 'unemployed_gold_2000');
    pushIf(achievementIds, c.eventsResolved >= 10 && !already.has('unemployed_events_10'), 'unemployed_events_10');
    pushIf(achievementIds, c.hotelVisits >= 5 && !already.has('unemployed_hotel_5'), 'unemployed_hotel_5');
    pushIf(achievementIds, c.battleWins >= 10 && !already.has('unemployed_win_10'), 'unemployed_win_10');
    pushIf(achievementIds, c.battleWins >= 25 && !already.has('unemployed_win_25'), 'unemployed_win_25');
    pushIf(achievementIds, c.eliteWins >= 5 && !already.has('unemployed_elite_wins_5'), 'unemployed_elite_wins_5');
  } else if (currentJobId === 'courier') {
    pushIf(achievementIds, c.diceRolls >= 25 && !already.has('courier_dice_25'), 'courier_dice_25');
    pushIf(achievementIds, c.shrineVisits >= 5 && !already.has('courier_shrine_5'), 'courier_shrine_5');
    pushIf(achievementIds, c.shopCardBuys >= 8 && !already.has('courier_shop_cards_8'), 'courier_shop_cards_8');
    pushIf(achievementIds, c.lifetimeGoldEarned >= 500 && !already.has('courier_gold_500'), 'courier_gold_500');
    pushIf(achievementIds, c.lifetimeGoldEarned >= 2000 && !already.has('courier_gold_2000'), 'courier_gold_2000');
    pushIf(achievementIds, c.eventsResolved >= 10 && !already.has('courier_events_10'), 'courier_events_10');
    pushIf(achievementIds, c.hotelVisits >= 5 && !already.has('courier_hotel_5'), 'courier_hotel_5');
    pushIf(achievementIds, c.battleWins >= 10 && !already.has('courier_win_10'), 'courier_win_10');
    pushIf(achievementIds, c.battleWins >= 25 && !already.has('courier_win_25'), 'courier_win_25');
    pushIf(achievementIds, c.eliteWins >= 5 && !already.has('courier_elite_wins_5'), 'courier_elite_wins_5');
  }
  return unlockAchievements(filterAchievementIdsByJob([...new Set(achievementIds)], currentJobId));
};

/** サイコロ1回分（出目に関わらず1回） */
export const recordDiceRollForAchievements = (currentJobId: JobId): Achievement[] => {
  incrementDiceRollsForJob(currentJobId);
  return evaluateAchievementProgress(currentJobId);
};

/** 神社訪問1回 */
export const recordShrineVisitForAchievements = (currentJobId: JobId): Achievement[] => {
  incrementShrineVisitsForJob(currentJobId);
  return evaluateAchievementProgress(currentJobId);
};

/** ホテル訪問1回 */
export const recordHotelVisitForAchievements = (currentJobId: JobId): Achievement[] => {
  incrementHotelVisitsForJob(currentJobId);
  return evaluateAchievementProgress(currentJobId);
};

/** 質屋でカード購入1回 */
export const recordShopCardBuyForAchievements = (currentJobId: JobId): Achievement[] => {
  incrementShopCardBuysForJob(currentJobId);
  return evaluateAchievementProgress(currentJobId);
};

/** イベント完了1回 */
export const recordEventResolvedForAchievements = (currentJobId: JobId): Achievement[] => {
  incrementEventsResolvedForJob(currentJobId);
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
  if (
    currentJobId !== 'carpenter' &&
    currentJobId !== 'cook' &&
    currentJobId !== 'unemployed' &&
    currentJobId !== 'courier'
  ) {
    return [];
  }
  const achievementIds: string[] = [];
  const already = getUnlockedAchievementIds();
  const c = loadAchievementCountersForJob(currentJobId);

  if (result.outcome === 'victory') {
    if (currentJobId === 'cook') {
      pushIf(achievementIds, !already.has('cook_first_win'), 'cook_first_win');
      if (result.kind === 'elite') {
        pushIf(achievementIds, !already.has('cook_elite_first'), 'cook_elite_first');
      }
      if (result.kind === 'boss') {
        if (currentArea === 1) achievementIds.push('cook_area1_clear');
        if (currentArea === 2) achievementIds.push('cook_area2_clear');
        if (currentArea === 3) achievementIds.push('cook_area3_clear');
      }
      pushIf(achievementIds, c.battleWins >= 10, 'cook_win_10');
      pushIf(achievementIds, c.battleWins >= 25, 'cook_win_25');
      pushIf(achievementIds, c.eliteWins >= 5, 'cook_elite_wins_5');
      if (result.player.currentHp <= 10) achievementIds.push('cook_low_hp_kill');
      if (result.player.mental <= 0) achievementIds.push('cook_zero_mental');
      const cookingTotal = result.player.totalCookingGaugeGained ?? 0;
      if (cookingTotal >= 10) achievementIds.push('cook_cooking_10');
      if (cookingTotal >= 20) achievementIds.push('cook_cooking_20');
      const fullnessCount = result.player.fullnessBonusCount ?? 0;
      if (fullnessCount >= 3) achievementIds.push('cook_fullness_3');
      // 果てまで歩く料理人: 料理人でエリア3ボス撃破、または料理人累計50勝（recordBattleEnd 後の battleWins）
      pushIf(achievementIds, c.battleWins >= 50 && !already.has('cook_dice_80'), 'cook_dice_80');
      if (result.kind === 'boss' && currentArea === 3) {
        pushIf(achievementIds, !already.has('cook_dice_80'), 'cook_dice_80');
      }
    } else if (currentJobId === 'unemployed') {
      pushIf(achievementIds, !already.has('unemployed_first_win'), 'unemployed_first_win');
      if (result.kind === 'elite') {
        pushIf(achievementIds, !already.has('unemployed_elite_first'), 'unemployed_elite_first');
      }
      if (result.kind === 'boss') {
        if (currentArea === 1) achievementIds.push('unemployed_area1_clear');
        if (currentArea === 2) achievementIds.push('unemployed_area2_clear');
        if (currentArea === 3) achievementIds.push('unemployed_area3_clear');
      }
      pushIf(achievementIds, c.battleWins >= 10, 'unemployed_win_10');
      pushIf(achievementIds, c.battleWins >= 25, 'unemployed_win_25');
      pushIf(achievementIds, c.eliteWins >= 5, 'unemployed_elite_wins_5');
      if (result.player.currentHp <= 10) achievementIds.push('unemployed_low_hp_kill');
      if (result.player.mental <= 0) achievementIds.push('unemployed_zero_mental');
      if (result.player.currentHp / Math.max(1, result.player.maxHp) <= 0.5) {
        achievementIds.push('unemployed_hungry_win');
      }
      if (result.player.currentHp / Math.max(1, result.player.maxHp) <= 0.3) {
        achievementIds.push('unemployed_awakened_win');
      }
    } else if (currentJobId === 'courier') {
      pushIf(achievementIds, !already.has('courier_first_win'), 'courier_first_win');
      if (result.kind === 'elite') {
        pushIf(achievementIds, !already.has('courier_elite_first'), 'courier_elite_first');
      }
      if (result.kind === 'boss') {
        if (currentArea === 1) achievementIds.push('courier_area1_clear');
        if (currentArea === 2) achievementIds.push('courier_area2_clear');
        if (currentArea === 3) achievementIds.push('courier_area3_clear');
      }
      pushIf(achievementIds, c.battleWins >= 10, 'courier_win_10');
      pushIf(achievementIds, c.battleWins >= 25, 'courier_win_25');
      pushIf(achievementIds, c.eliteWins >= 5, 'courier_elite_wins_5');
      if (result.player.currentHp <= 10) achievementIds.push('courier_low_hp_kill');
      if (result.player.mental <= 0) achievementIds.push('courier_zero_mental');
      if ((result.player.deliveryDownTurns ?? 0) > 0) achievementIds.push('courier_overwork_win');
      if ((result.player.deliveryStamina ?? 10) <= 3) achievementIds.push('courier_low_stamina_win');
    } else if (currentJobId === 'carpenter') {
      pushIf(achievementIds, !already.has('first_win'), 'first_win');
      if (result.kind === 'elite') {
        pushIf(achievementIds, !already.has('elite_first'), 'elite_first');
      }
      if (result.kind === 'boss') {
        if (currentArea === 1) achievementIds.push('area1_clear');
        if (currentArea === 2) achievementIds.push('area2_clear');
        if (currentArea === 3) achievementIds.push('area3_clear');
      }
      pushIf(achievementIds, c.battleWins >= 10, 'win_10');
      pushIf(achievementIds, c.battleWins >= 25, 'win_25');
      pushIf(achievementIds, c.eliteWins >= 5, 'elite_wins_5');
      if (result.player.scaffold >= 10) achievementIds.push('scaffold_10');
      if (result.player.currentHp <= 10) achievementIds.push('low_hp_kill');
      if (result.player.mental <= 0) achievementIds.push('zero_mental_survive');
    }
  }

  if (result.outcome === 'defeat') {
    if (currentJobId === 'cook' || currentJobId === 'carpenter' || currentJobId === 'unemployed' || currentJobId === 'courier') {
      const count = incrementDefeatCountForJob(currentJobId);
      if (count >= 3) {
        if (currentJobId === 'cook') {
          achievementIds.push('cook_defeat_3');
        } else if (currentJobId === 'unemployed') {
          achievementIds.push('unemployed_defeat_3');
        } else if (currentJobId === 'courier') {
          achievementIds.push('courier_defeat_3');
        } else {
          achievementIds.push('defeat_3');
        }
      }
    }
  }

  const fromBattle = unlockAchievements(
    filterAchievementIdsByJob([...new Set(achievementIds)], currentJobId),
  );
  const fromProgress = evaluateAchievementProgress(currentJobId);
  syncJobUnlocksFromConditions();
  const seen = new Set(fromBattle.map((a) => a.id));
  return [...fromBattle, ...fromProgress.filter((a) => !seen.has(a.id))];
};

/** 開発用: 全実績を達成済みにする（localStorage に保存） */
export const unlockAllAchievements = (): void => {
  unlockAchievements(ACHIEVEMENTS.map((a) => a.id));
  syncJobUnlocksFromConditions();
};
