import type { Card, Enemy, EnemyIntent, JobId, PlayerState } from './game';

export type TileType =
  | 'start'
  | 'enemy'
  | 'unique_boss'
  | 'pawnshop'
  | 'event'
  | 'shrine'
  | 'hotel'
  | 'area_boss';

export type GameScreen =
  | 'home'
  | 'title'
  | 'job_select'
  | 'map'
  | 'dice_rolling'
  | 'battle'
  | 'card_reward'
  | 'omamori_reward'
  | 'shrine'
  | 'pawnshop'
  | 'event'
  | 'hotel'
  | 'branch_select'
  | 'card_upgrade'
  | 'victory'
  | 'game_over';

export interface BoardTile {
  id: number;
  index: number;
  row: number;
  branch?: string;
  type: TileType;
  icon: string;
  name: string;
  nextTiles: number[];
  isBranch: boolean;
  branchGroup?: number;
  visited: boolean;
  isCurrentPosition: boolean;
  x: number;
  y: number;
}

export interface DiceState {
  value: number | null;
  rolling: boolean;
}

export interface RunItemEffect {
  type: 'time_boost' | 'heal' | 'attack_buff' | 'draw';
  value: number;
  duration?: number;
}

export interface RunItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  price: number;
  effect: RunItemEffect;
}

export interface OmamoriEffect {
  type: 'start_of_battle' | 'passive' | 'on_kill' | 'on_turn_start';
  stat?: string;
  value?: number;
}

export interface Omamori {
  id: string;
  name: string;
  icon: string;
  description: string;
  effect: OmamoriEffect;
}

export interface EventEffect {
  type: 'heal' | 'damage' | 'gold' | 'mental' | 'card' | 'omamori' | 'curse';
  value: number;
}

export interface EventChoice {
  text: string;
  effects: EventEffect[];
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  choices: EventChoice[];
}

export interface LuckyUnluckyEntry {
  text: string;
  effect: EventEffect;
}

export interface ShopItem {
  id: string;
  type: 'card' | 'omamori' | 'item' | 'sell_card';
  item?: Card | Omamori | RunItem;
  price: number;
  purchased?: boolean;
}

export interface RewardState {
  cards: Card[];
  canSkip: boolean;
}

export interface BranchPreview {
  nextTileId: number;
  previewTiles: BoardTile[];
}

export type BattleKind = 'battle' | 'elite' | 'boss';

export interface BattleSetup {
  jobId: JobId;
  kind: BattleKind;
  enemies: Enemy[];
  deck: Card[];
  player: PlayerState;
  omamoris: Omamori[];
  items: RunItem[];
}

export interface BattleResult {
  outcome: 'victory' | 'defeat';
  player: PlayerState;
  deck: Card[];
  items: RunItem[];
  defeatedEnemies: Enemy[];
  rewardGold: number;
  mentalRecovery: number;
  kind: BattleKind;
}

export interface EnemyTemplateLike {
  templateId: string;
  name: string;
  icon: string;
  imageUrl?: string;
  maxHp: number;
  intents: EnemyIntent[];
}

export interface GameProgress {
  jobId: JobId;
  currentScreen: GameScreen;
  currentArea: number;
  board: BoardTile[];
  currentTileId: number;
  player: PlayerState;
  deck: Card[];
  omamoris: Omamori[];
  items: RunItem[];
  cardRemoveCount: number;
  dice: DiceState;
  selectedBranchTileId: number | null;
  pendingSteps: number;
  selectableTileIds: number[];
  traveledEdges: Array<{ from: number; to: number }>;
  activeEvent: GameEvent | null;
  activeShopItems: ShopItem[];
  pawnshopSellUsedThisVisit: boolean;
  cardReward: RewardState | null;
  omamoriRewardChoices: Omamori[] | null;
  omamoriRewardSource: 'battle' | 'shrine' | null;
  battleSetup: BattleSetup | null;
  lastTileType: TileType | null;
  cardUpgradeMode: 'upgrade' | 'remove' | null;
  returnScreenAfterUpgrade: Exclude<GameScreen, 'card_upgrade'> | null;
}
