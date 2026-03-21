export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rewardType: 'card' | 'omamori';
  rewardId: string;
  rewardName: string;
  rewardIcon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_win',
    name: '初陣',
    description: '初めてバトルに勝利する',
    icon: '🔨',
    rewardType: 'omamori',
    rewardId: 'alarm_clock',
    rewardName: '目覚まし時計',
    rewardIcon: '⏰',
  },
  {
    id: 'area1_clear',
    name: '一人前の大工',
    description: 'エリア1をクリアする',
    icon: '🏗️',
    rewardType: 'card',
    rewardId: 'ridgepole',
    rewardName: '棟上げ',
    rewardIcon: '🎌',
  },
  {
    id: 'area2_clear',
    name: '棟梁',
    description: 'エリア2をクリアする',
    icon: '🏆',
    rewardType: 'card',
    rewardId: 'temple_carpenter',
    rewardName: '宮大工の技',
    rewardIcon: '🏯',
  },
  {
    id: 'area3_clear',
    name: '伝説の職人',
    description: 'エリア3をクリアする（ゲームクリア）',
    icon: '👑',
    rewardType: 'omamori',
    rewardId: 'victory_charm',
    rewardName: '勝利のお守り',
    rewardIcon: '🏆',
  },
  {
    id: 'defeat_3',
    name: '不屈の魂',
    description: '3回敗北する',
    icon: '💀',
    rewardType: 'card',
    rewardId: 'miracle',
    rewardName: '奇跡の一手',
    rewardIcon: '✨',
  },
  {
    id: 'scaffold_10',
    name: '足場の鬼',
    description: '1バトルで足場を10以上積む',
    icon: '⚡',
    rewardType: 'card',
    rewardId: 'master_strike',
    rewardName: '匠の一撃',
    rewardIcon: '⚡',
  },
  {
    id: 'low_hp_kill',
    name: '根性',
    description: 'HPが10以下の状態で敵を倒す',
    icon: '😤',
    rewardType: 'omamori',
    rewardId: 'hard_hat',
    rewardName: '安全第一ヘルメット',
    rewardIcon: '⛑️',
  },
  {
    id: 'zero_mental_survive',
    name: '底力覚醒',
    description: 'メンタルが0になっても生き残る',
    icon: '🌟',
    rewardType: 'card',
    rewardId: 'hidden_power',
    rewardName: '底力',
    rewardIcon: '🔥',
  },
];

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

/** 解放済みお守りIDセット */
export const getUnlockedOmamoriIds = (): Set<string> => {
  const unlocked = getUnlockedAchievementIds();
  const ids = new Set<string>();
  for (const a of ACHIEVEMENTS) {
    if (a.rewardType === 'omamori' && unlocked.has(a.id)) {
      ids.add(a.rewardId);
    }
  }
  return ids;
};

/** 解放済みカードIDセット */
export const getUnlockedCardIds = (): Set<string> => {
  const unlocked = getUnlockedAchievementIds();
  const ids = new Set<string>();
  for (const a of ACHIEVEMENTS) {
    if (a.rewardType === 'card' && unlocked.has(a.id)) {
      ids.add(a.rewardId);
    }
  }
  return ids;
};

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
};

/** 開発用: 全実績を達成済みにする（localStorage に保存） */
export const unlockAllAchievements = (): void => {
  unlockAchievements(ACHIEVEMENTS.map((a) => a.id));
};
