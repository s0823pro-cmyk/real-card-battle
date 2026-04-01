import type { JobId } from '../types/game';

export type AchievementTier = 'easy' | 'medium' | 'hard';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  /** 図鑑・実績タブ分類。未指定は従来どおり共通扱い */
  jobId?: JobId | 'common';
  /** 解放でプールに追加されるカードID（常に2枚）。未達成時は内容を表示しない */
  rewardCardIds: readonly [string, string];
}
