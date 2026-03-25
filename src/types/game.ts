export type CardType = 'attack' | 'skill' | 'power' | 'tool' | 'status' | 'curse';
export type CardBadge = 'exhaust' | 'setup' | 'self_damage' | 'reserve';
export type JobId = 'carpenter' | 'cook' | 'unemployed';
export type GamePhase =
  | 'battle_start'
  | 'player_turn'
  | 'executing'
  | 'enemy_turn'
  | 'victory'
  | 'defeat'
  | 'defeat_offer_revive';

export type EffectType =
  | 'scaffold'
  | 'draw'
  | 'debuff_enemy'
  | 'weak'
  | 'heal'
  | 'cooking_gauge'
  | 'vulnerable'
  | 'burn'
  | 'debuff_enemy_atk'
  | 'self_damage'
  | 'time_boost'
  | 'double_next'
  | 'double_next_replay'
  | 'attack_buff'
  | 'draw_per_turn'
  | 'next_attack_time_reduce'
  | 'scaffold_per_turn'
  | 'block_persist'
  | 'block_per_turn'
  | 'upgrade_random_hand_card'
  | 'next_attack_damage_boost'
  | 'damage_immunity_this_turn'
  | 'next_turn_no_block'
  | 'next_turn_time_penalty'
  | 'mental_boost'
  | 'low_hp_damage_boost'
  | 'attack_damage_all_attacks'
  | 'first_cooking_multiplier_boost'
  | 'ridgepole_threshold'
  | 'ridgepole_damage'
  | 'next_ingredient_bonus'
  | 'hit_count'
  | 'next_turn_block_half'
  | 'block_per_turn_awakened'
  | 'lighter_chance'
  | 'next_attack_boost'
  | 'next_card_block_multiplier'
  | 'reserve_double_next';

export type CardRarity = 'common' | 'uncommon' | 'rare';

export interface LowHpBonus {
  threshold: number;
  damage: number;
}
export type StatusEffectType = 'weak' | 'vulnerable' | 'strength_up' | 'burn' | 'attack_down';
export type EnemyIntentType =
  | 'attack'
  | 'defend'
  | 'buff'
  | 'debuff'
  | 'mental_attack'
  | 'steal_gold'
  | 'regen'
  | 'random_debuff'
  | 'add_curse';

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
  rarity?: CardRarity;
  neutral?: boolean;
  imageUrl?: string;
  icon?: string;
  reserveBonus?: ReserveBonus;
  wasReserved?: boolean;
  reservedThisTurn?: boolean;
  cookingMultiplier?: number;
  scaffoldMultiplier?: number;
  preparationTimeCost?: number;
  upgraded?: boolean;
  lowHpBonus?: LowHpBonus;
  hitCount?: number;
  badges?: CardBadge[];
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
  threshold?: number;
  normalValue?: number;
  count?: number;
  burnValue?: number;
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
  debuffType?: 'vulnerable' | 'weak' | 'burn';
  description: string;
  icon: string;
}

export interface Enemy {
  id: string;
  templateId: string;
  name: string;
  maxHp: number;
  currentHp: number;
  block: number;
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
  hasRevival: boolean;
  revivalUsed: boolean;
  revivalHp?: number;
  deathWishActive: boolean;
  ridgepoleActive: boolean;
  templeCarpenterActive: boolean;
  templeCarpenterMultiplier?: number;
  cliffEdgeActive: boolean;
  nextAttackTimeReduce: number;
  blockPersist: boolean;
  nextAttackDamageBoost: number;
  damageImmunityThisTurn: boolean;
  nextTurnNoBlock: boolean;
  nextTurnTimePenalty: number;
  canBlock: boolean;
  lowHpDamageBoost: number;
  kitchenDemonActive: boolean;
  firstCookingUsedThisTurn: boolean;
  lastTurnDamageTaken: number;
  currentTurnDamageTaken: number;
  recipeStudyActive: boolean;
  recipeStudyBonus: number;
  nextIngredientBonus: number;
  threeStarActive: boolean;
  firstIngredientUsedThisTurn: boolean;
  nextAttackBoostValue: number;
  nextAttackBoostCount: number;
  /** 次にプレイするブロック付きカードの block を乗算（1で無効）。ターン終了で1にリセット */
  nextCardBlockMultiplier: number;
  timeBonusPerTurn: number;
  /** ボス報酬「最大メンタル+1」などで上乗せしたメンタル上限（getJobConfig.maxMental に加算） */
  mentalMaxBonus?: number;
  nextCardDoubleEffect: boolean;
  /** 逆境の才能など：パワーで付与された全アタックダメージ加算 */
  attackDamageBonusAllAttacks: number;
  nextCardEffectBoost: number;
  fullSprintUsedCount?: number;
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
  shuffleAnimation: boolean;
  hand: Card[];
  timeline: TimelineSlot[];
  reserved: Card[];
  drawPile: Card[];
  /** 山札一覧の表示順（インデックスの並び）。シャッフル／ターン開始ドロー時に更新 */
  drawPileDisplayOrder: number[];
  discardPile: Card[];
  exhaustedCards: Card[];
  activePowers: Card[];
  player: PlayerState;
  enemies: Enemy[];
  executingIndex: number;
  toolSlots: ToolSlot[];
}
