import type { JobId } from '../types/game';
import type { BattleKind } from '../types/run';

export type RankingScoreCategoryId = 'progress' | 'victory' | 'combat' | 'job' | 'risk' | 'clear';

export type RankingScoreDetailInput = {
  category: RankingScoreCategoryId;
  label: string;
};

export type RankingScoreDetail = RankingScoreDetailInput & {
  points: number;
};

export type RankingScoreCategory = {
  id: RankingScoreCategoryId;
  label: string;
  points: number;
  details: RankingScoreDetail[];
};

export type RankingScoreBreakdown = {
  total: number;
  categories: RankingScoreCategory[];
};

export const RANKING_SCORE_CATEGORY_LABELS: Record<RankingScoreCategoryId, string> = {
  progress: '進行',
  victory: '勝利・撃破',
  combat: '戦闘技術',
  job: '職業ボーナス',
  risk: 'リスク達成',
  clear: 'クリア評価',
};

const DEFAULT_DETAIL: RankingScoreDetailInput = {
  category: 'combat',
  label: '戦闘中ボーナス',
};

export const RANKING_SCORE_GUIDE: ReadonlyArray<{
  title: string;
  rows: ReadonlyArray<readonly [string, string]>;
}> = [
  {
    title: '進行',
    rows: [
      ['1マス進む', '+3'],
      ['イベント / ホテル / 神社完了', '+5'],
      ['ショップ購入 / 質屋売却', '+3'],
      ['エリア2 / エリア3到達', '+100 / +200'],
    ],
  },
  {
    title: '勝利・撃破',
    rows: [
      ['通常戦: 1体 / 2体 / 3体以上撃破', '+30 / +50 / +120'],
      ['エリート撃破', '+120'],
      ['ボス撃破', '+220'],
    ],
  },
  {
    title: '戦闘技術',
    rows: [
      ['HPダメージ0で勝利', '+50'],
      ['勝利ターン: 1 / 3 / 5ターン以内', '+100 / +60 / +30'],
      ['長期戦勝利: 10 / 15ターン以上', '+30 / +60'],
      ['勝利時ブロック10 / 30 / 50以上', '+10 / +20 / +30'],
      ['敵の攻撃を完全ブロック', '+10'],
      ['1ターンにカード3枚以上使用', '+10'],
      ['1ターンにカード5枚以上使用', '+25'],
      ['集中消費', '+5'],
      ['温存1枚', '+5'],
      ['パワーカード2枚以上設置して勝利', '+20'],
      ['道具カード2枚以上設置して勝利', '+20'],
    ],
  },
  {
    title: '職業ボーナス',
    rows: [
      ['大工: 足場5 / 10 / 15到達', '+10 / +30 / +50'],
      ['大工: 足場0で勝利', '+20'],
      ['大工: 段取りボーナス発動', '+5/回'],
      ['料理人: 状態異常付きの敵を倒す / 調理ゲージ消費勝利', '+20 / +20'],
      ['料理人: 満腹2回目ブロック / 3回目以降ダメージ後勝利', '+15 / +40'],
      ['料理人: 調理ゲージ加算 / 満腹ゲージ加算 / 敵に異常付与', '+2 / +5 / +2'],
      ['無職: 覚醒勝利 / HP1勝利 / 復活後勝利', '+25 / +30 / +40'],
      ['無職: 自傷カード3回 / 5回以上使用して勝利', '+30 / +50'],
      ['配達員: スタミナ3以下 / 1以下で勝利', '+40 / +70'],
      ['配達員: 過労ダウン中 / 復帰後に勝利', '+80 / +50'],
      ['配達員: 1ターンにカード5枚以上使用', '+10'],
    ],
  },
  {
    title: 'リスク達成 / 上限',
    rows: [
      ['10 / 20 / 30ダメージ以上受けて勝利', '+20 / +40 / +60'],
      ['HP40% / 20% / 10%以下 / HP1で勝利', '+30 / +60 / +100 / +120'],
      ['連勝ボーナス', '2連勝+10、以降+10ずつ、6連勝以降+50'],
      ['所持ゴールド100 / 500 / 1000突破', '+10 / +30 / +50'],
      ['1バトル勝利時の基本内訳', '連勝数で変動'],
    ],
  },
] as const;

export const createRankingScoreDetail = (
  points: number,
  detail?: RankingScoreDetailInput,
): RankingScoreDetail => ({
  ...(detail ?? DEFAULT_DETAIL),
  points: Math.max(0, Math.floor(points)),
});

export const createEmptyRankingScoreBreakdown = (): RankingScoreBreakdown => ({
  total: 0,
  categories: [],
});

export function appendRankingScoreDetails(
  breakdown: RankingScoreBreakdown,
  details: RankingScoreDetail[],
): RankingScoreBreakdown {
  const categories = new Map<RankingScoreCategoryId, RankingScoreCategory>();
  for (const category of breakdown.categories) {
    categories.set(category.id, {
      ...category,
      details: [...category.details],
    });
  }
  for (const detail of details) {
    if (detail.points <= 0) continue;
    const current =
      categories.get(detail.category) ?? {
        id: detail.category,
        label: RANKING_SCORE_CATEGORY_LABELS[detail.category],
        points: 0,
        details: [],
      };
    const existing = current.details.find((item) => item.label === detail.label);
    if (existing) {
      existing.points += detail.points;
    } else {
      current.details.push({ ...detail });
    }
    current.points += detail.points;
    categories.set(detail.category, current);
  }
  const nextCategories = Array.from(categories.values()).filter((category) => category.points > 0);
  return {
    total: nextCategories.reduce((sum, category) => sum + category.points, 0),
    categories: nextCategories,
  };
}

export function sumRankingScoreDetails(details: RankingScoreDetail[]): number {
  return details.reduce((sum, detail) => sum + Math.max(0, Math.floor(detail.points)), 0);
}

export function calculateBattleVictoryRankingDetails(input: {
  jobId: JobId;
  kind: BattleKind;
  defeatedEnemyCount: number;
  battleTurns: number;
  hpDamageTaken: number;
  currentHp: number;
  maxHp: number;
  block: number;
  activePowerCount: number;
  toolCount: number;
  cookConsumedCookingGauge: boolean;
  cookFullnessPain: boolean;
  cookDefeatedStatusEnemy: boolean;
  unemployedSelfDamageCardsUsed: number;
  unemployedRevivalTriggered: boolean;
  courierRecoveredFromDown: boolean;
  deliveryStamina: number;
  deliveryDownTurns: number;
  mental: number;
  maxMental: number;
  gold: number;
  goldBonusThreshold: number | null;
  scaffold: number;
  winStreak: number;
}): RankingScoreDetail[] {
  const details: RankingScoreDetail[] = [];
  const add = (points: number, category: RankingScoreCategoryId, label: string) => {
    if (points > 0) details.push(createRankingScoreDetail(points, { category, label }));
  };

  if (input.kind === 'elite') {
    add(120, 'victory', 'エリート撃破');
  } else if (input.kind === 'boss') {
    add(220, 'victory', 'ボス撃破');
  } else {
    const count = Math.max(1, input.defeatedEnemyCount);
    add(count >= 3 ? 120 : count === 2 ? 50 : 30, 'victory', `通常戦勝利: ${count >= 3 ? '3体以上' : `${count}体`}撃破`);
  }

  if (input.hpDamageTaken === 0) add(50, 'combat', 'HPダメージ0で勝利');
  if (input.battleTurns <= 1) add(100, 'combat', '1ターン以内に勝利');
  else if (input.battleTurns <= 3) add(60, 'combat', '3ターン以内に勝利');
  else if (input.battleTurns <= 5) add(30, 'combat', '5ターン以内に勝利');
  else if (input.battleTurns >= 15) add(60, 'combat', '15ターン以上かけて勝利');
  else if (input.battleTurns >= 10) add(30, 'combat', '10ターン以上かけて勝利');

  if (input.block >= 50) add(30, 'combat', '勝利時ブロック50以上');
  else if (input.block >= 30) add(20, 'combat', '勝利時ブロック30以上');
  else if (input.block >= 10) add(10, 'combat', '勝利時ブロック10以上');
  if (input.activePowerCount >= 2) add(20, 'combat', 'パワーカード2枚以上設置して勝利');
  if (input.toolCount >= 2) add(20, 'combat', '道具カード2枚以上設置して勝利');

  if (input.hpDamageTaken >= 30) add(60, 'risk', '30ダメージ以上受けて勝利');
  else if (input.hpDamageTaken >= 20) add(40, 'risk', '20ダメージ以上受けて勝利');
  else if (input.hpDamageTaken >= 10) add(20, 'risk', '10ダメージ以上受けて勝利');

  const hpRate = input.maxHp > 0 ? input.currentHp / input.maxHp : 1;
  if (input.currentHp === 1) add(120, 'risk', 'HP1で勝利');
  else if (input.currentHp > 0 && hpRate <= 0.1) add(100, 'risk', 'HP10%以下で勝利');
  else if (input.currentHp > 0 && hpRate <= 0.2) add(60, 'risk', 'HP20%以下で勝利');
  else if (input.currentHp > 0 && hpRate <= 0.4) add(30, 'risk', 'HP40%以下で勝利');

  if (input.goldBonusThreshold === 100) add(10, 'clear', '所持ゴールド100突破');
  else if (input.goldBonusThreshold === 500) add(30, 'clear', '所持ゴールド500突破');
  else if (input.goldBonusThreshold === 1000) add(50, 'clear', '所持ゴールド1000突破');
  if (input.winStreak >= 2) add(Math.min((input.winStreak - 1) * 10, 50), 'clear', `${input.winStreak}連勝ボーナス`);
  if (input.jobId === 'carpenter' && input.scaffold <= 0) add(20, 'job', '大工: 足場0で勝利');
  if (input.jobId === 'cook') {
    if (input.cookDefeatedStatusEnemy) add(20, 'job', '料理人: 状態異常付きの敵を撃破');
    if (input.cookConsumedCookingGauge) add(20, 'job', '料理人: 調理ゲージを消費して勝利');
    if (input.cookFullnessPain) add(40, 'job', '料理人: お腹が苦しい状態で勝利');
  }
  if (input.jobId === 'unemployed') {
    if (input.currentHp > 0 && hpRate <= 0.3) add(25, 'job', '無職: 覚醒状態で勝利');
    if (input.currentHp === 1) add(30, 'job', '無職: HP1で勝利');
    if (input.unemployedSelfDamageCardsUsed >= 5) add(50, 'job', '無職: 自傷カード5回以上使用して勝利');
    else if (input.unemployedSelfDamageCardsUsed >= 3) add(30, 'job', '無職: 自傷カード3回以上使用して勝利');
    if (input.unemployedRevivalTriggered) add(40, 'job', '無職: 復活系カード発動後に勝利');
  }
  if (input.jobId === 'courier') {
    if (input.deliveryStamina <= 1) add(70, 'job', '配達員: スタミナ1以下で勝利');
    else if (input.deliveryStamina <= 3) add(40, 'job', '配達員: スタミナ3以下で勝利');
    if (input.deliveryDownTurns > 0) add(80, 'job', '配達員: 過労ダウン中に勝利');
    if (input.courierRecoveredFromDown) add(50, 'job', '配達員: 過労ダウンから復帰後に勝利');
  }

  return details;
}
