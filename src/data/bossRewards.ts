export type BossRewardType = 'max_hp_up' | 'time_up' | 'rare_card';

export interface BossReward {
  type: BossRewardType;
  label: string;
  description: string;
  icon: string;
}

export const BOSS_REWARDS: BossReward[] = [
  {
    type: 'max_hp_up',
    label: 'HP強化',
    description: 'HP最大値が10増加する',
    icon: '❤️',
  },
  {
    type: 'time_up',
    label: 'タイム強化',
    description: '毎ターンの持ち時間が+1秒になる',
    icon: '⏱️',
  },
  {
    type: 'rare_card',
    label: 'レアカード獲得',
    description: 'ランダムなレアカードを1枚獲得する',
    icon: '✨',
  },
];
