export type CardType = 'attack' | 'skill' | 'power' | 'tool' | 'status';
export type JobId = 'carpenter' | 'cook' | 'unemployed';
export type GamePhase =
  | 'battle_start'
  | 'player_turn'
  | 'executing'
  | 'enemy_turn'
  | 'victory'
  | 'defeat';

export type EffectType =
  | 'scaffold'
  | 'draw'
  | 'buff_attack'
  | 'debuff_enemy'
  | 'weak'
  | 'heal'
  | 'cooking_gauge'
  | 'vulnerable'
  | 'burn'
  | 'debuff_enemy_atk'
  | 'self_damage'
  | 'time_boost'
  | 'next_turn_time_penalty'
  | 'double_next'
  | 'attack_buff';
export type StatusEffectType = 'weak' | 'vulnerable' | 'strength_up' | 'burn' | 'attack_down';
export type EnemyIntentType = 'attack' | 'defend' | 'buff' | 'debuff' | 'mental_attack';

export interface Card {
  id: string;
  name: string;
  type: CardType;
  timeCost: number;
  description: string;
  damage?: number;
  block?: number;
  effects?: CardEffect[];
  tags?: string[];
  sellValue?: number;
  imageUrl?: string;
  icon?: string;
  reserveBonus?: ReserveBonus;
  wasReserved?: boolean;
  cookingMultiplier?: number;
}

export interface ReserveBonus {
  description: string;
  damageMultiplier?: number;
  blockMultiplier?: number;
  extraEffects?: CardEffect[];
}

export interface CardEffect {
  type: EffectType;
  value: number;
  duration?: number;
}

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;
  value: number;
}

export interface EnemyIntent {
  type: EnemyIntentType;
  value: number;
  mentalDamage?: number;
  description: string;
  icon: string;
}

export interface Enemy {
  id: string;
  templateId: string;
  name: string;
  maxHp: number;
  currentHp: number;
  imageUrl?: string;
  icon?: string;
  intentHistory: EnemyIntent[];
  currentIntentIndex: number;
  statusEffects: StatusEffect[];
}

export interface PlayerState {
  jobId: JobId;
  maxHp: number;
  currentHp: number;
  block: number;
  gold: number;
  scaffold: number;
  cookingGauge: number;
  mental: number;
  statusEffects: StatusEffect[];
}

export interface ToolSlot {
  card: Card;
}

export interface TimelineSlot {
  card: Card;
  startTime: number;
  endTime: number;
  originalHandIndex: number;
}

export interface GameState {
  phase: GamePhase;
  turn: number;
  maxTime: number;
  usedTime: number;
  hand: Card[];
  timeline: TimelineSlot[];
  reserved: Card[];
  drawPile: Card[];
  discardPile: Card[];
  player: PlayerState;
  enemies: Enemy[];
  executingIndex: number;
  toolSlots: ToolSlot[];
  nextTurnTimeBonus: number;
}
