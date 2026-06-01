import type { Card, CardBadge } from '../types/game';
import darRequiemLegendImage from '../assets/cards/legendary/dar_requiem_legend_v1.png';
import sonnaDaikuLegendImage from '../assets/cards/legendary/sonna_daiku_legend_v1.png';

export type LegendaryRewardStatus = 'candidate' | 'official';

export type LegendaryRewardCard = {
  name: string;
  rarity: string;
  description: string;
  flavor: string;
  badges?: CardBadge[];
  imageUrl?: string;
};

export type LegendaryRankingSnapshotRow = {
  rank: number;
  nickname: string;
  score: number;
};

export type LegendaryWinner = {
  id: string;
  seasonLabel: string;
  winnerName: string;
  totalScore: number;
  status: LegendaryRewardStatus;
  capturedAt: string;
  finalRankingTop3: LegendaryRankingSnapshotRow[];
  card: LegendaryRewardCard;
};

export const DAR_REQUIEM_CARD: Card = {
  id: 'legend_dar_requiem',
  name: 'ダーのレクイエム',
  type: 'skill',
  timeCost: 2.5,
  description: 'カード2枚ドロー。敵全体に弱体1ターン。次のカード効果+25%。使用後除外。',
  icon: '🕯️',
  rarity: 'rare',
  sellValue: 0,
  neutral: true,
  tags: ['legendary', 'aoe_debuff', 'exhaust'],
  badges: ['limited', 'exhaust'],
  effects: [
    { type: 'draw', value: 2 },
    { type: 'weak', value: 1, duration: 1 },
    { type: 'next_card_effect_boost', value: 0.25 },
  ],
  imageUrl: darRequiemLegendImage,
};

export const SONNA_DAIKU_CARD: Card = {
  id: 'legend_sonna_daiku_architecture',
  name: 'そんな大工いるか？〈一夜で築いた大型建築〉',
  type: 'skill',
  timeCost: 0,
  description: '15ブロック。使用後除外。',
  block: 15,
  icon: '🏗️',
  rarity: 'rare',
  sellValue: 0,
  neutral: true,
  tags: ['legendary', 'exhaust'],
  badges: ['limited', 'exhaust'],
  imageUrl: sonnaDaikuLegendImage,
};

const HIDDEN_DAR_REQUIEM_WINNER: LegendaryWinner = {
  id: 'season-2026-05-official-darlek',
  seasonLabel: '2026年5月 総合優勝',
  winnerName: 'ダーレク',
  totalScore: 29430,
  status: 'official',
  capturedAt: '2026-05-31 00:00',
  finalRankingTop3: [
    { rank: 1, nickname: 'ダーレク', score: 29430 },
    { rank: 2, nickname: "O'Neal", score: 16975 },
    { rank: 3, nickname: 'あらまんちゅ', score: 11030 },
  ],
  card: {
    name: DAR_REQUIEM_CARD.name,
    rarity: 'LEGEND',
    description: DAR_REQUIEM_CARD.description,
    flavor: '第一回総合ランキングの頂点に刻まれた名が、静かに響く。',
    badges: DAR_REQUIEM_CARD.badges,
    imageUrl: DAR_REQUIEM_CARD.imageUrl,
  },
};

/**
 * ダーのレクイエムは実カード定義を残すが、現在の正式優勝者カードではないため非表示。
 * 再採用する場合は LEGENDARY_REWARD_CARDS / LEGENDARY_WINNERS へ戻す。
 */
export const HIDDEN_LEGENDARY_REWARD_CARDS: Card[] = [DAR_REQUIEM_CARD];
export const HIDDEN_LEGENDARY_WINNERS: LegendaryWinner[] = [HIDDEN_DAR_REQUIEM_WINNER];

export const LEGENDARY_REWARD_CARDS: Card[] = [SONNA_DAIKU_CARD];

export const LEGENDARY_WINNERS: LegendaryWinner[] = [
  {
    id: 'season-2026-05-official-sonna-daiku',
    seasonLabel: '2026年5月 総合優勝',
    winnerName: 'そんな大工いるか？',
    totalScore: 32550,
    status: 'official',
    capturedAt: '2026-05-31 00:00',
    finalRankingTop3: [
      { rank: 1, nickname: 'そんな大工いるか？', score: 32550 },
      { rank: 2, nickname: 'ダーレク', score: 31780 },
      { rank: 3, nickname: 'うめめめ', score: 27745 },
    ],
    card: {
      name: SONNA_DAIKU_CARD.name,
      rarity: 'LEGEND',
      description: SONNA_DAIKU_CARD.description,
      flavor: '第一回総合ランキングの頂点に現れた名が、一夜にして伝説を築いた。',
      badges: SONNA_DAIKU_CARD.badges,
      imageUrl: SONNA_DAIKU_CARD.imageUrl,
    },
  },
];
