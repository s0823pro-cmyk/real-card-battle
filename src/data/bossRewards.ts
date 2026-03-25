export type BossRewardType = 'max_hp_up' | 'mental_max_up' | 'rare_card';

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
    type: 'mental_max_up',
    label: 'メンタル上限+1',
    description: 'メンタルの最大値が+1される',
    icon: '🧠',
  },
  {
    type: 'rare_card',
    label: 'レアカード獲得',
    description: 'ランダムなレアカードを1枚獲得する',
    icon: '✨',
  },
];
