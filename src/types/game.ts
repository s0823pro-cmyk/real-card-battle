export type CardType = 'attack' | 'skill' | 'power' | 'tool' | 'status' | 'curse';
export type CardBadge =
  | 'exhaust'
  | 'setup'
  | 'self_damage'
  | 'reserve'
  | 'oikomi'
  | 'ingredient'
  | 'cooking';
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
  | 'fullness_gauge'
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
  | 'upgrade_all_hand_card'
  | 'next_attack_damage_boost'
  | 'damage_immunity_this_turn'
  | 'next_turn_no_block'
  | 'next_turn_time_penalty'
  | 'mental_boost'
  | 'low_hp_damage_boost'
  | 'attack_damage_all_attacks'
  /** このターン中にプレイするアタックカードすべてにダメージ加算（ターン終了でリセット） */
  | 'turn_attack_damage_bonus'
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
  | 'reserve_double_next'
  /** 集中力：プレイ後に次の攻撃・スキル1枚へ数値1.5倍 */
  | 'concentration_next'
  /** 釘袋整理：捨て札から指定枚数を手札へ（選択UI） */
  | 'pick_from_discard'
  /** 捨て札から食材カードのみ指定枚数を手札へ */
  | 'pick_from_discard_ingredient'
  /** 敵に毒（ターン数は value） */
  | 'enemy_poison'
  /** プレイヤーの毒を解除（毒があるときのみ） */
  | 'clear_player_poison'
  /** プレイヤーの火傷を解除（火傷があるときのみ） */
  | 'clear_player_burn'
  /** 手札の食材カードをこの戦闘中＋に強化（value 枚） */
  | 'upgrade_ingredient_hand';

export type CardRarity = 'common' | 'uncommon' | 'rare';

export interface LowHpBonus {
  threshold: number;
  damage: number;
}
export type StatusEffectType =
  | 'weak'
  | 'vulnerable'
  | 'strength_up'
  | 'burn'
  | 'poison'
  | 'attack_down';
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
  /** 温存系（段取り／集中力など）が手札に戻ってきた回数。2以上で温存ボーナスを失効 */
  reserveDrawCount?: number;
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
  debuffType?: 'vulnerable' | 'weak' | 'burn' | 'poison';
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
  fullnessGauge: number;
  /** 満腹ゲージは1ターン1回まで。ターン開始で false にリセット */
  fullnessGainedThisTurn: boolean;
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
  /** 0 以外なら次の自分ターン開始までブロックを維持する残り回数 */
  blockPersistTurns: number;
  nextAttackDamageBoost: number;
  damageImmunityThisTurn: boolean;
  nextTurnNoBlock: boolean;
  nextTurnTimePenalty: number;
  /** 次の自分ターンの maxTime に加算する秒（ターン終了時に5秒以上残していれば 0.5） */
  nextTurnTimeBonus?: number;
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
  /** 三ツ星の極意+：毎ターン最初の食材カードのコストを0にする（未強化は50%カット・最低1） */
  threeStarFirstIngredientFree?: boolean;
  firstIngredientUsedThisTurn: boolean;
  nextAttackBoostValue: number;
  nextAttackBoostCount: number;
  /** 次にプレイするブロック付きカードの block を乗算（1で無効）。ターン終了で1にリセット */
  nextCardBlockMultiplier: number;
  timeBonusPerTurn: number;
  /** ボス報酬「最大メンタル+1」などで上乗せしたメンタル上限（getJobConfig.maxMental に加算） */
  mentalMaxBonus?: number;
  nextCardDoubleEffect: boolean;
  /** 集中力：次の攻撃・スキル1枚の数値効果を1.5倍にする（使用後に消費） */
  concentrationActive: boolean;
  /** 逆境の才能など：パワーで付与された全アタックダメージ加算 */
  attackDamageBonusAllAttacks: number;
  /** 本気モードなど：このターン中の全アタックに加算（ターン終了でリセット） */
  turnAttackDamageBonus: number;
  nextCardEffectBoost: number;
  fullSprintUsedCount?: number;
  /** バトル中の調理ゲージ獲得累計（cook_cooking_10/20 実績用） */
  totalCookingGaugeGained?: number;
  /** バトル中の満腹ボーナス（HP回復）発動回数（cook_fullness_3 実績用） */
  fullnessBonusCount?: number;
  /** 伝説のレシピ：このターン食材カードの時間コスト0 */
  ingredientCostFreeThisTurn?: boolean;
  /** 食の神髄：このターン手札の全カードのコストを減算（秒） */
  handTimeCostDiscountThisTurn?: number;
  /** このターンに「調理+」系（cooking_gauge 効果）を持つカードをプレイした回数（厨房の掟用） */
  cookingGaugePlaysThisTurn?: number;
  /** バトル中のみ：お守りによるアタックダメージ加算（固定値） */
  relicAttackDamageBonus?: number;
  /** バトル中のみ：ブロック数値を持つカードのブロック加算 */
  relicBlockCardFlatBonus?: number;
  /** バトル中のみ：スキルカードの時間コスト減算（秒） */
  relicSkillTimeDiscount?: number;
  /** バトル中のみ：敵への火傷・毒1ティックあたりの追加ダメージ */
  relicEnemyDotTickBonus?: number;
  /** バトル中のみ：ターン開始ドロー枚数への加算（手札上限相当） */
  relicHandDrawBonus?: number;
  /** バトル中のみ：鉄の胃袋（満腹ボーナス時の追加HP） */
  relicIronStomach?: boolean;
  /** バトル中のみ：食材カード使用時の調理ゲージ追加 */
  relicIngredientCookingBonus?: number;
  /** バトル中のみ：【準備】カード使用時の追加ドロー */
  relicSetupCardDraw?: number;
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
  /** 全面改装／リフォーム系のバトル中のみの強化を終了時に戻すため id→強化前 */
  battleCardRevertMap?: Record<string, Card>;
  /** 次のターン開始時に手札に強制追加される呪いカード（add_curse で付与） */
  pendingCurseCards?: Card[];
}
