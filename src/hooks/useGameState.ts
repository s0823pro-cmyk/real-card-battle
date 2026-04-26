import { useEffect, useMemo, useRef, useState } from 'react';
import { ANXIETY_CARD, CURSE_CARD } from '../data/carpenterDeck';
import { getJobConfig } from '../data/jobs';
import { createRandomEncounter } from '../data/enemies';
import { applyOneToolSlotToPlayer, useBattleLogic } from './useBattleLogic';
import { clearBattleState } from '../utils/battleSave';
import { clearSavedProgress } from './useRunProgress';
import { getAdsRemoved, setPendingDefeatInterstitial } from '../utils/adsRemoved';
import { getDebugEnemyHp1 } from '../utils/debugEnemyHp1';
import type { CardResolveResult } from './useBattleLogic';
import {
  applyOneEnemyDotTick,
  buildEnemyDotStepQueue,
  finalizeEnemyAfterDotTicks,
  useEnemyAI,
} from './useEnemyAI';
import type {
  Card,
  Enemy,
  EnemyIntent,
  EnemyIntentType,
  GameState,
  JobId,
  PlayerState,
  StatusEffect,
} from '../types/game';
import { useAudioContext } from '../contexts/AudioContext';
import type { BattleResult, BattleSetup, Omamori, RunItem } from '../types/run';
import {
  createShuffledDrawPileDisplayOrder,
  drawCards,
  isAnxietyCard,
  nextDrawPileDisplayOrder,
} from '../utils/deckManager';
import { getHungryState } from '../utils/hungrySystem';
import { shuffle } from '../utils/shuffle';
import { isEnemyTargetCard } from '../utils/cardTarget';
import { getEffectiveTimeCost } from '../utils/timeline';
import { upgradeCardByJobId } from '../utils/cardUpgrade';
import { applyBattleCardReverts, isBattleTempUpgradeSourceCard } from '../utils/battleCardRevert';
import { getEffectiveMaxMental } from '../utils/mentalLimits';
import { recordEnemyDefeated, recordEnemyEncounter } from '../utils/enemyRecord';
import {
  canPlaySelfDamageBadgeCard,
  cardExhaustsWhenPlayed,
  comebackShouldExhaustAfterPlay,
  exhaustsWhenIdleInReserveAtTurnStart,
  isIngredientCard,
  isReserveDoubleNextEffectActive,
  reserveBonusActiveForCard,
  shouldTrackReserveDrawCount,
} from '../utils/cardBadgeRules';
import {
  applyConcentrationMultiplierToCard,
  applyMultiplierAndBoostToCard,
  getEnhancedCardForPlay,
  hasConcentrationNextEffect,
} from '../utils/playCardMultipliers';

const MAX_RESERVED = 2;
/** 温存時に次ターンへ加算する時間ペナルティ（秒）。UI の温存プレビュー計算と共有 */
export const RESERVE_TIME_PENALTY = 1.5;
/** 温存成功時にこのターンのタイムラインで即時消費する秒（BattleScreen の RESERVE_PENDING_MS / 1000 と同じ） */
const RESERVE_COST_SEC = 0.5;
const DRAW_COUNT = 5;
const SELL_ANIMATION_MS = 220;
const INITIAL_MENTAL = 7;
const CARPENTER_CAN_SELL_IN_BATTLE = false;
const ENEMY_GOLD_REWARDS: Record<string, number> = {
  // エリア1
  claimer: 10,
  drunk: 8,
  wildCat: 5,
  bicycle: 6,
  solicitor: 9,
  biker_leader: 25,
  evil_realtor: 22,
  monster_customer: 60,
  // エリア2
  collector: 12,
  sloppy_worker: 10,
  yakuza_minion: 14,
  evil_sales: 10,
  rogue_dump: 16,
  evil_supervisor: 30,
  land_shark: 28,
  evil_ceo: 70,
  // エリア3
  world_tree_root: 14,
  lost_soul: 12,
  stone_soldier: 18,
  light_guardian: 14,
  cursed_tree: 18,
  world_tree_guardian: 35,
  ancient_ghost: 32,
  world_tree_warden: 80,
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** 各敵のインテント表示後のディレイ（このあとにその敵のDoT等） */
const MS_AFTER_ENEMY_ACTION_DISPLAY = 540;
/** 敵ターンで最後に行動する敵のインテント表示後は、ターン終了までを短くする */
const MS_AFTER_LAST_ENEMY_ACTION_DISPLAY = 300;
/** 全敵の行動が終わってから次処理（プレイヤーDoT等）へ入るまでのほんの少しの間 */
const MS_AFTER_ENEMY_TURN_END = 380;
/** 敵のインテント表示から最初の（敵自身の）火傷・毒DoTまで */
const MS_AFTER_ENEMY_ACTION_TO_FIRST_DOT = 350;
/** 敵ターン最後の敵のみ、その敵のDoT開始までを短くする */
const MS_AFTER_LAST_ENEMY_TO_SELF_DOT = 220;
/** 敵の通常攻撃完了から最初のプレイヤーDoTまで（敵ターン終了後） */
const MS_AFTER_ENEMY_TURN_TO_PLAYER_FIRST_DOT = 350;
/** 同一種DoTスタック間 */
const MS_BETWEEN_SAME_KIND_DOT = 400;
/** 火傷フェーズ終了後〜毒フェーズ開始前（400〜500ms） */
const MS_AFTER_BURN_PHASE_BEFORE_POISON = 450;
/** 全DoT終了後〜カードドロー前（400〜500ms） */
const MS_AFTER_ALL_DOT_BEFORE_DRAW = 450;

type PlayerDotStep = { kind: 'burn' | 'poison'; damage: number };

const buildPlayerDotStepQueue = (player: PlayerState): PlayerDotStep[] => {
  const steps: PlayerDotStep[] = [];
  let hp = player.currentHp;
  const burns = player.statusEffects.filter((s) => s.type === 'burn' && s.duration > 0);
  const poisons = player.statusEffects.filter((s) => s.type === 'poison' && s.duration > 0);
  for (const s of burns) {
    steps.push({ kind: 'burn', damage: s.duration });
    hp = Math.max(0, hp - s.duration);
  }
  if (hp > 0) {
    for (const _ of poisons) {
      const dmg = Math.ceil(hp * 0.05);
      steps.push({ kind: 'poison', damage: dmg });
      hp = Math.max(0, hp - dmg);
    }
  }
  return steps;
};

/** 敵の火傷・毒の「残りターン」合計（UI・SE 用。複数エントリは加算） */
const sumEnemyBurnTurns = (enemy: Enemy): number =>
  enemy.statusEffects
    .filter((s) => s.type === 'burn' && s.duration > 0)
    .reduce((a, s) => a + s.duration, 0);

const sumEnemyPoisonTurns = (enemy: Enemy): number =>
  enemy.statusEffects
    .filter((s) => s.type === 'poison' && s.duration > 0)
    .reduce((a, s) => a + s.duration, 0);

const applyOnePlayerDotTick = (
  player: PlayerState,
): { nextPlayer: PlayerState; step: PlayerDotStep } | null => {
  const rest = player.statusEffects.filter((s) => s.type !== 'burn' && s.type !== 'poison');
  const burns = player.statusEffects.filter((s) => s.type === 'burn' && s.duration > 0);
  if (burns.length > 0) {
    const s = burns[0];
    const dmg = s.duration;
    const hp = Math.max(0, player.currentHp - dmg);
    const nd = s.duration - 1;
    const newFirst = nd > 0 ? [{ ...s, duration: nd, value: nd }] : [];
    const otherBurns = burns.slice(1);
    const poisons = player.statusEffects.filter((x) => x.type === 'poison' && x.duration > 0);
    return {
      nextPlayer: {
        ...player,
        currentHp: hp,
        statusEffects: [...rest, ...newFirst, ...otherBurns, ...poisons],
      },
      step: { kind: 'burn', damage: dmg },
    };
  }
  const poisons = player.statusEffects.filter((s) => s.type === 'poison' && s.duration > 0);
  if (player.currentHp > 0 && poisons.length > 0) {
    const s = poisons[0];
    const dmg = Math.ceil(player.currentHp * 0.05);
    const hp = Math.max(0, player.currentHp - dmg);
    const nd = s.duration - 1;
    const newFirst = nd > 0 ? [{ ...s, duration: nd, value: nd }] : [];
    const otherPoisons = poisons.slice(1);
    const burnRemain = player.statusEffects.filter((x) => x.type === 'burn' && x.duration > 0);
    return {
      nextPlayer: {
        ...player,
        currentHp: hp,
        statusEffects: [...rest, ...burnRemain, ...newFirst, ...otherPoisons],
      },
      step: { kind: 'poison', damage: dmg },
    };
  }
  return null;
};

/** 火傷・毒のターン処理後：脆弱等のターン経過（processPlayerTurnStartStatuses の後半と同一） */
const finalizePlayerTurnStartFromPostDotPlayer = (player: PlayerState): PlayerState => {
  const statusEffects = player.statusEffects
    .map((status) => {
      if (status.type === 'vulnerable' || status.type === 'weak') {
        return { ...status, duration: status.duration - 1, value: status.value - 1 };
      }
      if (status.type === 'attack_down') {
        return { ...status, duration: status.duration - 1 };
      }
      return status;
    })
    .filter((status) => {
      if (status.type === 'attack_down') return status.duration > 0 && status.value > 0;
      return status.duration > 0 && status.value > 0;
    });
  return { ...player, statusEffects };
};

/** 敵のデバフ・メンタル・呪い付与などに共通 SE */
const ENEMY_DEBUFF_INTENT_TYPES: readonly EnemyIntentType[] = [
  'debuff',
  'random_debuff',
  'mental_attack',
  'add_curse',
];

interface CoinBurst {
  id: number;
}

export interface BattlePopup {
  id: number;
  text: string;
  target: 'player' | 'enemy' | string;
  kind: 'damage' | 'block' | 'buff' | 'dandori' | 'enemy_action' | 'mystery_pot' | 'burn' | 'poison';
}

export interface UseGameStateResult {
  gameState: GameState;
  selectedCardId: string | null;
  selectedCard: Card | null;
  lastPlayedCard: Card | null;
  remainingTime: number;
  canPlayCard: (card: Card) => boolean;
  sellingCardId: string | null;
  returningCardId: string | null;
  isPlayerHit: boolean;
  /** プレイヤー火傷 DoT 時の画面フラッシュ（battle-screen--burn-flash） */
  dotBurnFlash: boolean;
  /** プレイヤー毒 DoT 時の画面フラッシュ（battle-screen--poison-flash） */
  dotPoisonFlash: boolean;
  hitEnemyId: string | null;
  shieldEffect: boolean;
  isMentalHit: boolean;
  canSellInBattle: boolean;
  showStartBanner: boolean;
  battlePopups: BattlePopup[];
  battleMessage: string;
  coinBursts: CoinBurst[];
  enemyIntents: Record<string, EnemyIntent>;
  isDandoriReady: boolean;
  victoryRewardGold: number;
  victoryMentalRecovery: number;
  battleItems: RunItem[];
  hungryState: 'normal' | 'hungry' | 'awakened';
  hungryFlash: 'hungry' | 'awakened' | null;
  showRevivalEffect: boolean;
  pendingHandUpgradeCount: number;
  /** 捨て札から選ぶ残り枚数（食材選択のみ UI 使用） */
  pendingDiscardPicks: number;
  /** true のとき捨て札選択は食材カードのみ */
  discardPickIngredientOnly: boolean;
  upgradeableHandCards: Card[];
  doubleNextCharges: number;
  doubleNextReplayCharges: number;
  attackItemBuff: { value: number; charges: number } | null;
  selectCard: (cardId: string) => void;
  playCardInstant: (
    cardId: string,
    target: { type: 'enemy'; enemyId: string | null } | { type: 'field' },
  ) => {
    played: boolean;
    blockGained: number;
    multiHitJabs?: { enemyId: string; damage: number }[];
  };
  reserveCardById: (cardId: string) => boolean;
  sellCardById: (cardId: string) => boolean;
  useBattleItem: (itemId: string) => boolean;
  upgradeHandCardById: (cardId: string) => boolean;
  /** 捨て札一覧の表示順（上が新しい）のインデックスで選択 */
  confirmPickFromDiscard: (displayIndex: number) => void;
  skipHandUpgradeSelection: () => void;
  endTurn: () => Promise<void>;
  concedeBattle: () => void;
  retryBattle: () => void;
  giveUpDefeatOffer: () => void;
  reviveAfterDefeatOffer: () => void;
  showDefeatReviveModal: boolean;
}

interface UseGameStateOptions {
  setup?: BattleSetup | null;
  onBattleEnd?: (result: BattleResult) => void;
  onConsumeItem?: (itemId: string) => void;
  onTurnStart?: (state: GameState) => void;
  onBattleFinished?: () => void;
  initialGameState?: GameState | null;
  /** このランでまだ敗北復活を使っていれば true（親の RunState と同期） */
  canOfferDefeatRevive?: boolean;
  onDefeatReviveConsumed?: () => void;
  /** ランキング用: バトル中の加点（非同期送信は親側） */
  onRankingScore?: (points: number) => void;
}

const getMaxTime = (mental: number, timeBonusPerTurn = 0): number =>
  Math.max(3, Number((5 + mental * 0.3 + timeBonusPerTurn).toFixed(1)));

const createAnxietyCards = (count: number): Card[] =>
  Array.from({ length: count }).map((_, idx) => ({
    ...ANXIETY_CARD,
    id: `${ANXIETY_CARD.id}_${Date.now()}_${idx}_${Math.floor(Math.random() * 9999)}`,
  }));

/** メンタル最低時、ドロー1枚ごとに独立して10%で不安1枚（同一ドロー処理内は最大 drawCount 枚） */
const rollAnxietyCardsForDrawCount = (drawCount: number, mentalAtMin: boolean): Card[] => {
  if (!mentalAtMin || drawCount <= 0) return [];
  const hits = Array.from({ length: drawCount }).filter(() => Math.random() < 0.1).length;
  return hits > 0 ? createAnxietyCards(hits) : [];
};

/** プレイヤーターン開始時：火傷（残りターン=ダメ）→毒（残りHPの5%切り上げ）→その他のターン経過 */
const processPlayerTurnStartStatuses = (
  player: PlayerState,
): {
  currentHp: number;
  statusEffects: StatusEffect[];
  burnDamage: number;
  poisonDamage: number;
  dotLethal?: 'burn' | 'poison';
} => {
  let hp = player.currentHp;
  let burnDamage = 0;
  let poisonDamage = 0;
  let dotLethal: 'burn' | 'poison' | undefined;

  const rest = player.statusEffects.filter((s) => s.type !== 'burn' && s.type !== 'poison');
  const burns = player.statusEffects.filter((s) => s.type === 'burn' && s.duration > 0);
  const poisons = player.statusEffects.filter((s) => s.type === 'poison' && s.duration > 0);

  const newBurns: StatusEffect[] = [];
  for (const s of burns) {
    const dmg = s.duration;
    burnDamage += dmg;
    hp = Math.max(0, hp - dmg);
    const nd = s.duration - 1;
    if (nd > 0) newBurns.push({ ...s, duration: nd, value: nd });
    if (hp <= 0 && !dotLethal) dotLethal = 'burn';
  }

  const newPoisons: StatusEffect[] = [];
  if (hp > 0) {
    for (const s of poisons) {
      const dmg = Math.ceil(hp * 0.05);
      poisonDamage += dmg;
      hp = Math.max(0, hp - dmg);
      const nd = s.duration - 1;
      if (nd > 0) newPoisons.push({ ...s, duration: nd, value: nd });
      if (hp <= 0) dotLethal = 'poison';
    }
  }

  const merged = [...rest, ...newBurns, ...newPoisons];
  const statusEffects = merged
    .map((status) => {
      if (status.type === 'vulnerable' || status.type === 'weak') {
        return { ...status, duration: status.duration - 1, value: status.value - 1 };
      }
      if (status.type === 'attack_down') {
        return { ...status, duration: status.duration - 1 };
      }
      return status;
    })
    .filter((status) => {
      if (status.type === 'attack_down') return status.duration > 0 && status.value > 0;
      return status.duration > 0 && status.value > 0;
    });

  return { currentHp: hp, statusEffects, burnDamage, poisonDamage, dotLethal };
};

const mergeCardResolveResults = (a: CardResolveResult, b: CardResolveResult): CardResolveResult => ({
  player: b.player,
  enemies: b.enemies,
  targetEnemyId: b.targetEnemyId ?? a.targetEnemyId,
  damage: a.damage + b.damage,
  blockGained: a.blockGained + b.blockGained,
  scaffoldGained: a.scaffoldGained + b.scaffoldGained,
  cookingGaugeGained: a.cookingGaugeGained + b.cookingGaugeGained,
  fullnessGaugeGained: a.fullnessGaugeGained + b.fullnessGaugeGained,
  fullnessAutoHealTriggered: a.fullnessAutoHealTriggered || b.fullnessAutoHealTriggered,
  equippedTool: b.equippedTool ?? a.equippedTool,
  isDandoriActive: b.isDandoriActive,
  goldGained: a.goldGained + b.goldGained,
  lighterBurnApplied: a.lighterBurnApplied || b.lighterBurnApplied,
  attackBuff: b.attackBuff ?? a.attackBuff,
  multiHitJabs:
    a.multiHitJabs && b.multiHitJabs
      ? [...a.multiHitJabs, ...b.multiHitJabs]
      : b.multiHitJabs ?? a.multiHitJabs,
});

const getEnemyReward = (templateId: string): number => ENEMY_GOLD_REWARDS[templateId] ?? 5;

const isCardVariantId = (cardId: string, baseId: string): boolean =>
  cardId === baseId || cardId.startsWith(`${baseId}_`);

const getOmamoriBonus = (
  omamoris: Omamori[],
  effectType: Omamori['effect']['type'],
  stat: string,
): number =>
  omamoris
    .filter((omamori) => omamori.effect.type === effectType && omamori.effect.stat === stat)
    .reduce((sum, omamori) => sum + (omamori.effect.value ?? 0), 0);

const withBattleFlagDefaults = (player: PlayerState): PlayerState => ({
  ...player,
  hasRevival: player.hasRevival ?? false,
  revivalUsed: player.revivalUsed ?? false,
  revivalHp: player.revivalHp,
  deathWishActive: player.deathWishActive ?? false,
  ridgepoleActive: player.ridgepoleActive ?? false,
  templeCarpenterActive: player.templeCarpenterActive ?? false,
  templeCarpenterMultiplier: player.templeCarpenterMultiplier,
  cliffEdgeActive: player.cliffEdgeActive ?? false,
  nextAttackTimeReduce: player.nextAttackTimeReduce ?? 0,
  blockPersistTurns: player.blockPersistTurns ?? 0,
  nextAttackDamageBoost: player.nextAttackDamageBoost ?? 0,
  damageImmunityThisTurn: player.damageImmunityThisTurn ?? false,
  nextTurnNoBlock: player.nextTurnNoBlock ?? false,
  nextTurnTimePenalty: player.nextTurnTimePenalty ?? 0,
  nextTurnTimeBonus: player.nextTurnTimeBonus ?? 0,
  canBlock: player.canBlock ?? true,
  lowHpDamageBoost: player.lowHpDamageBoost ?? 0,
  kitchenDemonActive: player.kitchenDemonActive ?? false,
  firstCookingUsedThisTurn: player.firstCookingUsedThisTurn ?? false,
  lastTurnDamageTaken: player.lastTurnDamageTaken ?? 0,
  currentTurnDamageTaken: player.currentTurnDamageTaken ?? 0,
  recipeStudyActive: player.recipeStudyActive ?? false,
  recipeStudyBonus: player.recipeStudyBonus ?? 0,
  nextIngredientBonus: player.nextIngredientBonus ?? 0,
  threeStarActive: player.threeStarActive ?? false,
  threeStarFirstIngredientFree: player.threeStarFirstIngredientFree ?? false,
  firstIngredientUsedThisTurn: player.firstIngredientUsedThisTurn ?? false,
  nextAttackBoostValue: player.nextAttackBoostValue ?? 0,
  nextAttackBoostCount: player.nextAttackBoostCount ?? 0,
  nextCardBlockMultiplier: player.nextCardBlockMultiplier ?? 1,
  timeBonusPerTurn: player.timeBonusPerTurn ?? 0,
  attackDamageBonusAllAttacks: player.attackDamageBonusAllAttacks ?? 0,
  turnAttackDamageBonus: player.turnAttackDamageBonus ?? 0,
  nextCardDoubleEffect: player.nextCardDoubleEffect ?? false,
  nextCardEffectBoost: player.nextCardEffectBoost ?? 0,
  concentrationActive: player.concentrationActive ?? false,
  fullSprintUsedCount: 0,
  mentalMaxBonus: player.mentalMaxBonus ?? 0,
  fullnessGauge: player.fullnessGauge ?? 0,
  fullnessGainedThisTurn: player.fullnessGainedThisTurn ?? false,
  totalCookingGaugeGained: 0,
  fullnessBonusCount: 0,
  relicAttackDamageBonus: player.relicAttackDamageBonus ?? 0,
  relicBlockCardFlatBonus: player.relicBlockCardFlatBonus ?? 0,
  relicSkillTimeDiscount: player.relicSkillTimeDiscount ?? 0,
  relicEnemyDotTickBonus: player.relicEnemyDotTickBonus ?? 0,
  relicHandDrawBonus: player.relicHandDrawBonus ?? 0,
  relicIronStomach: player.relicIronStomach ?? false,
  relicIngredientCookingBonus: player.relicIngredientCookingBonus ?? 0,
  relicSetupCardDraw: player.relicSetupCardDraw ?? 0,
});

const createInitialGameState = (setup?: BattleSetup | null): GameState => {
  const encounter = setup?.enemies ?? createRandomEncounter();
  encounter.forEach((enemy) => recordEnemyEncounter(enemy.templateId));
  const initialJobId: JobId = setup?.jobId ?? 'carpenter';
  const fallbackConfig = getJobConfig(initialJobId);
  const deck = shuffle(
    (setup?.deck ?? fallbackConfig.createStarterDeck()).map((card) => ({
      ...card,
      wasReserved: false,
      reservedThisTurn: false,
    })),
  );
  const om = setup?.omamoris ?? [];
  const startDrawBonus = getOmamoriBonus(om, 'start_of_battle', 'draw');
  const startMentalBonus = getOmamoriBonus(om, 'start_of_battle', 'mental');
  const startScaffoldBonus = getOmamoriBonus(om, 'start_of_battle', 'scaffold');
  const startCookingBonus = getOmamoriBonus(om, 'start_of_battle', 'cooking_gauge');
  const relicAttack = getOmamoriBonus(om, 'passive', 'attack_damage');
  const relicBlockCard = getOmamoriBonus(om, 'passive', 'block_card_block');
  const relicSkillDisc = getOmamoriBonus(om, 'passive', 'skill_time_discount');
  const relicHand = getOmamoriBonus(om, 'passive', 'hand_draw_bonus');
  const relicDot = getOmamoriBonus(om, 'passive', 'enemy_dot_bonus');
  const relicIron = om.some((o) => o.id === 'iron_stomach');
  const relicIngredientCook = getOmamoriBonus(om, 'passive', 'ingredient_cooking_bonus');
  const relicSetupDraw = getOmamoriBonus(om, 'passive', 'setup_card_draw');
  const startBlockBonus =
    getOmamoriBonus(om, 'start_of_battle', 'block') + getOmamoriBonus(om, 'on_turn_start', 'block');
  const startTimeBonus = getOmamoriBonus(om, 'start_of_battle', 'time');
  const drawResult = drawCards(deck, [], DRAW_COUNT + Math.max(0, startDrawBonus) + Math.max(0, relicHand));
  const basePlayer = setup?.player ?? {
    jobId: initialJobId,
    maxHp: fallbackConfig.initialHp,
    currentHp: fallbackConfig.initialHp,
    block: 0,
    gold: 0,
    scaffold: 0,
    cookingGauge: 0,
    fullnessGauge: 0,
    fullnessGainedThisTurn: false,
    mental: fallbackConfig.initialMental ?? INITIAL_MENTAL,
    statusEffects: [],
    hasRevival: false,
    revivalUsed: false,
    revivalHp: undefined,
    deathWishActive: false,
    ridgepoleActive: false,
    templeCarpenterActive: false,
    templeCarpenterMultiplier: undefined,
    cliffEdgeActive: false,
    nextAttackTimeReduce: 0,
    blockPersistTurns: 0,
    nextAttackDamageBoost: 0,
    damageImmunityThisTurn: false,
    nextTurnNoBlock: false,
    nextTurnTimePenalty: 0,
    nextTurnTimeBonus: 0,
    canBlock: true,
    lowHpDamageBoost: 0,
    kitchenDemonActive: false,
    firstCookingUsedThisTurn: false,
    lastTurnDamageTaken: 0,
    currentTurnDamageTaken: 0,
    recipeStudyActive: false,
    recipeStudyBonus: 0,
    nextIngredientBonus: 0,
    threeStarActive: false,
    threeStarFirstIngredientFree: false,
    firstIngredientUsedThisTurn: false,
    nextAttackBoostValue: 0,
    nextAttackBoostCount: 0,
    nextCardBlockMultiplier: 1,
    timeBonusPerTurn: 0,
    nextCardDoubleEffect: false,
    concentrationActive: false,
    attackDamageBonusAllAttacks: 0,
    turnAttackDamageBonus: 0,
    nextCardEffectBoost: 0,
  };

  const bpMental0 = basePlayer.mental ?? INITIAL_MENTAL;
  const mentalAfterRelic = Math.min(getEffectiveMaxMental(basePlayer), bpMental0 + startMentalBonus);
  const initialAnxietyHand = rollAnxietyCardsForDrawCount(
    drawResult.drawn.length,
    mentalAfterRelic <= 0,
  );

  return {
    phase: 'battle_start',
    turn: 1,
    maxTime: getMaxTime(mentalAfterRelic, basePlayer.timeBonusPerTurn ?? 0) + Math.max(0, startTimeBonus),
    usedTime: 0,
    shuffleAnimation: false,
    hand: [...drawResult.drawn, ...initialAnxietyHand],
    timeline: [],
    reserved: [],
    drawPile: drawResult.drawPile,
    drawPileDisplayOrder: createShuffledDrawPileDisplayOrder(drawResult.drawPile.length),
    discardPile: drawResult.discardPile,
    exhaustedCards: [],
    activePowers: [],
    player: withBattleFlagDefaults({
      ...basePlayer,
      mental: mentalAfterRelic,
      block: (basePlayer.block ?? 0) + Math.max(0, startBlockBonus),
      scaffold: (basePlayer.scaffold ?? 0) + Math.max(0, startScaffoldBonus),
      cookingGauge: Math.max(0, startCookingBonus),
      fullnessGauge: 0,
      statusEffects: [...basePlayer.statusEffects],
      relicAttackDamageBonus: relicAttack,
      relicBlockCardFlatBonus: relicBlockCard,
      relicSkillTimeDiscount: relicSkillDisc,
      relicEnemyDotTickBonus: relicDot,
      relicHandDrawBonus: relicHand,
      relicIronStomach: relicIron,
      relicIngredientCookingBonus: relicIngredientCook,
      relicSetupCardDraw: relicSetupDraw,
    }),
    enemies: encounter.map((enemy) => {
      const e = { ...enemy, statusEffects: [...enemy.statusEffects] };
      if (import.meta.env.DEV && getDebugEnemyHp1()) {
        return { ...e, maxHp: 1, currentHp: 1 };
      }
      return e;
    }),
    executingIndex: -1,
    toolSlots: [],
    battleCardRevertMap: {},
    pendingCurseCards: [],
  };
};

export const useGameState = (options?: UseGameStateOptions): UseGameStateResult => {
  const { resolveCard, equipTool, applyToolEffects } = useBattleLogic();
  const { getEnemyIntent, executeEnemyTurn } = useEnemyAI();
  const { playSe } = useAudioContext();

  const [gameState, setGameState] = useState<GameState>(
    () => options?.initialGameState ?? createInitialGameState(options?.setup),
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [sellingCardId, setSellingCardId] = useState<string | null>(null);
  const [returningCardId, setReturningCardId] = useState<string | null>(null);
  const [coinBursts, setCoinBursts] = useState<CoinBurst[]>([]);
  const [battlePopups, setBattlePopups] = useState<BattlePopup[]>([]);
  const [battleMessage, setBattleMessage] = useState(() =>
    options?.initialGameState?.phase === 'player_turn' ? 'カードを配置してターン終了' : '戦闘開始！',
  );
  const [showStartBanner, setShowStartBanner] = useState(() => !options?.initialGameState);
  /** セーブから再開したときバトル開始演出をスキップ */
  const skipBattleStartAnimationRef = useRef(!!options?.initialGameState);
  const [hitEnemyId, setHitEnemyId] = useState<string | null>(null);
  const [isPlayerHit, setIsPlayerHit] = useState(false);
  const [dotBurnFlash, setDotBurnFlash] = useState(false);
  const [dotPoisonFlash, setDotPoisonFlash] = useState(false);
  const [isMentalHit, setIsMentalHit] = useState(false);
  const [shieldEffect, setShieldEffect] = useState(false);
  const [lastPlayedCard, setLastPlayedCard] = useState<Card | null>(null);
  const [victoryRewardGold, setVictoryRewardGold] = useState(0);
  const [victoryMentalRecovery, setVictoryMentalRecovery] = useState(0);
  const [battleItems, setBattleItems] = useState<RunItem[]>(options?.setup?.items ?? []);
  const [attackItemBuff, setAttackItemBuff] = useState<{ value: number; charges: number } | null>(null);
  const [doubleNextCharges, setDoubleNextCharges] = useState(0);
  const [doubleNextReplayCharges, setDoubleNextReplayCharges] = useState(0);
  const [hungryFlash, setHungryFlash] = useState<'hungry' | 'awakened' | null>(null);
  const [showRevivalEffect, setShowRevivalEffect] = useState(false);
  const [pendingHandUpgradeCount, setPendingHandUpgradeCount] = useState(0);
  const pendingHandUpgradeCountRef = useRef(0);
  const [pendingDiscardPicks, setPendingDiscardPicks] = useState(0);
  const [discardPickIngredientOnly, setDiscardPickIngredientOnly] = useState(false);
  const [curseImmunityUsed, setCurseImmunityUsed] = useState(false);
  /** ランキング: 敵の攻撃で受けたHPダメージ累計 */
  const rankingEnemyAttackHpDamageRef = useRef(0);
  const cardsPlayedThisTurnRef = useRef(0);
  const rankingScaffold10AwardedRef = useRef(false);
  const rankingCooking10AwardedRef = useRef(false);
  const canPlayWithHandCondition = (card: Card, hand: Card[]): boolean => {
    const isSoloPlayOnlyCard = card.tags?.includes('solo_play_only') ?? false;
    if (!isSoloPlayOnlyCard) return true;
    return hand.length === 1 && hand[0]?.id === card.id;
  };

  const battleOmamoris = options?.setup?.omamoris ?? [];
  const prevHungryStateRef = useRef<'normal' | 'hungry' | 'awakened'>('normal');
  const endTurnRef = useRef<() => Promise<void>>(async () => {});
  /** 敵ターン終了〜プレイヤーDoT直列演出中はカード操作を拒否 */
  const dotSequenceInProgressRef = useRef(false);
  const pushPopupRef = useRef<
    (text: string, target: 'player' | 'enemy' | string, kind: BattlePopup['kind'], durationMs?: number) => void
  >(() => {});

  useEffect(() => {
    if (!options?.setup) return;
    rankingEnemyAttackHpDamageRef.current = 0;
    cardsPlayedThisTurnRef.current = 0;
    rankingScaffold10AwardedRef.current = false;
    rankingCooking10AwardedRef.current = false;
    if (options?.initialGameState) {
      setBattleItems(options.setup.items ?? []);
      setBattleMessage(
        options.initialGameState.phase === 'player_turn'
          ? 'カードを配置してターン終了'
          : '戦闘開始！',
      );
      setShowStartBanner(false);
      return;
    }
    skipBattleStartAnimationRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGameState(createInitialGameState(options.setup));
    setBattleItems(options.setup.items ?? []);
    setSelectedCardId(null);
    setSellingCardId(null);
    setReturningCardId(null);
    setCoinBursts([]);
    setBattlePopups([]);
    setBattleMessage('戦闘開始！');
    setShowStartBanner(true);
    setHitEnemyId(null);
    setIsPlayerHit(false);
    setDotBurnFlash(false);
    setDotPoisonFlash(false);
    setIsMentalHit(false);
    setShieldEffect(false);
    setLastPlayedCard(null);
    setVictoryRewardGold(0);
    setVictoryMentalRecovery(0);
    setAttackItemBuff(null);
    setDoubleNextCharges(0);
    setDoubleNextReplayCharges(0);
    setHungryFlash(null);
    setShowRevivalEffect(false);
    setPendingHandUpgradeCount(0);
    prevHungryStateRef.current = 'normal';
  }, [options?.setup, options?.initialGameState]);

  useEffect(() => {
    if (gameState.phase !== 'battle_start') return;
    if (skipBattleStartAnimationRef.current) {
      skipBattleStartAnimationRef.current = false;
      setGameState((prev) => {
        const nextState = { ...prev, phase: 'player_turn' as const };
        options?.onTurnStart?.(nextState);
        return nextState;
      });
      setShowStartBanner(false);
      setBattleMessage('カードを配置してターン終了');
      return;
    }
    const timer = window.setTimeout(() => {
      setGameState((prev) => {
        const nextState = { ...prev, phase: 'player_turn' as const };
        options?.onTurnStart?.(nextState);
        return nextState;
      });
      setShowStartBanner(false);
      setBattleMessage('カードを配置してターン終了');
    }, 700);
    return () => window.clearTimeout(timer);
  }, [gameState.phase]);

  useEffect(() => {
    if (!gameState.shuffleAnimation) return;
    const timer = window.setTimeout(() => {
      setGameState((prev) => ({ ...prev, shuffleAnimation: false }));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [gameState.shuffleAnimation]);

  useEffect(() => {
    if (gameState.phase !== 'player_turn') return;
    if (
      pendingHandUpgradeCount > 0 &&
      gameState.hand.some((card) => !card.upgraded && card.type !== 'status' && card.type !== 'curse')
    )
      return;
    const shouldAutoEnd = gameState.maxTime - gameState.usedTime <= 0;
    if (!shouldAutoEnd) return;
    const timer = window.setTimeout(() => {
      void endTurnRef.current();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [gameState.phase, gameState.maxTime, gameState.usedTime, gameState.hand, gameState.hand.length, pendingHandUpgradeCount]);

  useEffect(() => {
    if (gameState.player.jobId !== 'unemployed') {
      prevHungryStateRef.current = 'normal';
      return;
    }
    const state = getHungryState(gameState.player);
    const prev = prevHungryStateRef.current;
    prevHungryStateRef.current = state;
    if (state === prev) return;
    if (state === 'normal') return;
    if (state === 'hungry') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHungryFlash('hungry');
      pushPopupRef.current('🔥ハングリー！', 'player', 'buff');
    } else {
      setHungryFlash('awakened');
      pushPopupRef.current('⚡覚醒！', 'player', 'buff');
    }
    const timer = window.setTimeout(() => setHungryFlash(null), state === 'awakened' ? 2000 : 1500);
    return () => window.clearTimeout(timer);
    // HPと職業変化のみを監視
  }, [gameState.player, gameState.player.currentHp, gameState.player.maxHp, gameState.player.jobId]);

  function pushPopup(
    text: string,
    target: 'player' | 'enemy' | string,
    kind: BattlePopup['kind'],
    durationMs?: number,
  ) {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setBattlePopups((prev) => [...prev, { id, text, target, kind }]);
    const duration = durationMs ?? (kind === 'enemy_action' ? 2200 : 720);
    window.setTimeout(() => {
      setBattlePopups((prev) => prev.filter((popup) => popup.id !== id));
    }, duration);
  }

  const triggerRevivalEffect = () => {
    setShowRevivalEffect(true);
    window.setTimeout(() => setShowRevivalEffect(false), 1000);
  };

  const applyRevivalIfNeeded = (player: PlayerState): { player: PlayerState; revived: boolean } => {
    if (player.currentHp > 0) return { player, revived: false };
    if (!player.hasRevival || player.revivalUsed) return { player, revived: false };
    return {
      player: {
        ...player,
        currentHp: player.revivalHp ?? 1,
        hasRevival: false,
        revivalUsed: true,
      },
      revived: true,
    };
  };

  const clearBattleFlags = (player: PlayerState): PlayerState => ({
    ...player,
    relicAttackDamageBonus: undefined,
    relicBlockCardFlatBonus: undefined,
    relicSkillTimeDiscount: undefined,
    relicEnemyDotTickBonus: undefined,
    relicHandDrawBonus: undefined,
    relicIronStomach: undefined,
    relicIngredientCookingBonus: undefined,
    relicSetupCardDraw: undefined,
    block: 0,
    scaffold: 0,
    cookingGauge: 0,
    fullnessGauge: 0,
    fullnessGainedThisTurn: false,
    statusEffects: [],
    hasRevival: false,
    revivalUsed: false,
    revivalHp: undefined,
    deathWishActive: false,
    ridgepoleActive: false,
    templeCarpenterActive: false,
    templeCarpenterMultiplier: undefined,
    cliffEdgeActive: false,
    nextAttackTimeReduce: 0,
    blockPersistTurns: 0,
    nextAttackDamageBoost: 0,
    damageImmunityThisTurn: false,
    nextTurnNoBlock: false,
    nextTurnTimePenalty: 0,
    nextTurnTimeBonus: 0,
    canBlock: true,
    lowHpDamageBoost: 0,
    kitchenDemonActive: false,
    firstCookingUsedThisTurn: false,
    lastTurnDamageTaken: 0,
    currentTurnDamageTaken: 0,
    recipeStudyActive: false,
    recipeStudyBonus: 0,
    nextIngredientBonus: 0,
    threeStarActive: false,
    threeStarFirstIngredientFree: false,
    firstIngredientUsedThisTurn: false,
    nextAttackBoostValue: 0,
    nextAttackBoostCount: 0,
    nextCardBlockMultiplier: 1,
    nextCardDoubleEffect: false,
    nextCardEffectBoost: 0,
    concentrationActive: false,
    attackDamageBonusAllAttacks: 0,
    turnAttackDamageBonus: 0,
    fullSprintUsedCount: 0,
  });

  const selectedCard = useMemo(
    () => gameState.hand.find((card) => card.id === selectedCardId) ?? null,
    [gameState.hand, selectedCardId],
  );
  const remainingTime = gameState.maxTime - gameState.usedTime;
  const canPlayCard = (card: Card): boolean => {
    if (dotSequenceInProgressRef.current) return false;
    if (pendingDiscardPicks > 0) return false;
    if (gameState.phase !== 'player_turn') return false;
    if (card.type === 'status' || card.type === 'curse') return false;
    if (card.tags?.includes('require_below_half_hp')) {
      if (gameState.player.currentHp > Math.floor(gameState.player.maxHp / 2)) return false;
    }
    if (!canPlaySelfDamageBadgeCard(card, gameState.player.currentHp)) return false;
    if (!canPlayWithHandCondition(card, gameState.hand)) return false;
    return (
      gameState.usedTime + getEffectiveTimeCost(card, lastPlayedCard, gameState.player, gameState.player.jobId) <=
      gameState.maxTime
    );
  };

  const hungryState = getHungryState(gameState.player);

  const enemyIntents = useMemo(() => {
    const intents: Record<string, EnemyIntent> = {};
    gameState.enemies.forEach((enemy) => {
      intents[enemy.id] = getEnemyIntent(enemy);
    });
    return intents;
  }, [gameState.enemies, getEnemyIntent]);

  const isDandoriReady = Boolean(lastPlayedCard?.badges?.includes('setup'));
  const upgradeableHandCards = useMemo(
    () => gameState.hand.filter((card) => !card.upgraded && card.type !== 'status' && card.type !== 'curse'),
    [gameState.hand],
  );
  const activePendingHandUpgradeCount =
    pendingHandUpgradeCount > 0 && upgradeableHandCards.length > 0 ? pendingHandUpgradeCount : 0;

  pendingHandUpgradeCountRef.current = pendingHandUpgradeCount;

  const selectCard = (cardId: string): void => {
    if (dotSequenceInProgressRef.current) return;
    if (pendingDiscardPicks > 0) return;
    if (gameState.phase !== 'player_turn') return;
    setSelectedCardId((prev) => (prev === cardId ? null : cardId));
  };

  const playCardInstant = (
    cardId: string,
    target: { type: 'enemy'; enemyId: string | null } | { type: 'field' },
  ): {
    played: boolean;
    blockGained: number;
    multiHitJabs?: { enemyId: string; damage: number }[];
  } => {
    if (dotSequenceInProgressRef.current) return { played: false, blockGained: 0 };
    if (gameState.phase !== 'player_turn') return { played: false, blockGained: 0 };
    if (activePendingHandUpgradeCount > 0) return { played: false, blockGained: 0 };
    const card = gameState.hand.find((item) => item.id === cardId);
    if (!card || !canPlayCard(card)) return { played: false, blockGained: 0 };
    if (isEnemyTargetCard(card) && target.type !== 'enemy') return { played: false, blockGained: 0 };
    if (!isEnemyTargetCard(card) && target.type === 'enemy') return { played: false, blockGained: 0 };
    const cardWasReserved = Boolean(card.wasReserved);

    const enhancedCard = getEnhancedCardForPlay(card);
    const replayActive = doubleNextReplayCharges > 0;
    const reserveOrDoubleMultiplier =
      replayActive
        ? 1
        : doubleNextCharges > 0 || gameState.player.nextCardDoubleEffect
          ? 2
          : 1;
    const nextCardEffectBoostRate = Math.max(0, gameState.player.nextCardEffectBoost ?? 0);
    const isReserveDoubleNextPlay = isReserveDoubleNextEffectActive(enhancedCard);
    const shouldUseTenBoost =
      reserveOrDoubleMultiplier <= 1 && nextCardEffectBoostRate > 0 && !isReserveDoubleNextPlay;
    const multipliedCard = applyMultiplierAndBoostToCard(enhancedCard, gameState.player, doubleNextCharges, {
      ignoreDoubleMultiplier: replayActive,
    });
    const concentratedCard = applyConcentrationMultiplierToCard(multipliedCard, gameState.player);

    const enemiesBefore = gameState.enemies.map((enemy) => ({ id: enemy.id, hp: enemy.currentHp, templateId: enemy.templateId }));
    const enemyDebuffTotalsBefore = gameState.enemies.map((e) => ({
      id: e.id,
      burn: sumEnemyBurnTurns(e),
      poison: sumEnemyPoisonTurns(e),
    }));

    const buffedCard =
      attackItemBuff && attackItemBuff.charges > 0 && concentratedCard.type === 'attack'
        ? { ...concentratedCard, damage: (concentratedCard.damage ?? 0) + attackItemBuff.value }
        : concentratedCard;
    const playedCard: Card = { ...buffedCard, wasReserved: false, reservedThisTurn: false };
    // 捨て札/除外には温存ボーナス適用前の基礎値を保持する
    let cardForDiscard: Card = { ...card, wasReserved: false, reservedThisTurn: false };
    if (isCardVariantId(card.id, 'delivery')) {
      cardForDiscard = {
        ...cardForDiscard,
        timeCost: Math.max(0, Number((cardForDiscard.timeCost - 0.5).toFixed(1))),
      };
    }

    let result = resolveCard(
      playedCard,
      lastPlayedCard,
      gameState.player,
      gameState.enemies,
      target.type === 'enemy' ? target.enemyId : null,
      gameState.toolSlots,
    );
    if (replayActive && result.enemies.some((e) => e.currentHp > 0)) {
      const toolSlotsAfterFirst = result.equippedTool
        ? equipTool(result.equippedTool, gameState.toolSlots)
        : gameState.toolSlots;
      result = mergeCardResolveResults(
        result,
        resolveCard(
          playedCard,
          lastPlayedCard,
          result.player,
          result.enemies,
          target.type === 'enemy' ? target.enemyId : null,
          toolSlotsAfterFirst,
        ),
      );
    }
    const playerAfterPowerFlags: PlayerState = (() => {
      if (playedCard.type !== 'power') return result.player;
      if (isCardVariantId(playedCard.id, 'revival')) {
        return {
          ...result.player,
          hasRevival: true,
          revivalUsed: false,
          revivalHp: playedCard.upgraded ? 10 : 1,
        };
      }
      if (isCardVariantId(playedCard.id, 'death_wish')) {
        return { ...result.player, deathWishActive: true };
      }
      if (isCardVariantId(playedCard.id, 'ridgepole')) {
        return { ...result.player, ridgepoleActive: true };
      }
      if (isCardVariantId(playedCard.id, 'temple_carpenter')) {
        return {
          ...result.player,
          templeCarpenterActive: true,
          templeCarpenterMultiplier: playedCard.upgraded ? 1.8 : 1.5,
        };
      }
      if (isCardVariantId(playedCard.id, 'cliff_edge')) {
        return { ...result.player, cliffEdgeActive: true };
      }
      if (isCardVariantId(playedCard.id, 'recipe_study')) {
        return { ...result.player, recipeStudyActive: true };
      }
      if (isCardVariantId(playedCard.id, 'three_star')) {
        return {
          ...result.player,
          threeStarActive: true,
          threeStarFirstIngredientFree: Boolean(playedCard.upgraded),
        };
      }
      if (isCardVariantId(playedCard.id, 'kitchen_demon')) {
        return { ...result.player, kitchenDemonActive: true };
      }
      if (isCardVariantId(playedCard.id, 'legendary_recipe')) {
        return { ...result.player, ingredientCostFreeThisTurn: true };
      }
      return result.player;
    })();
    const revivalOutcome = applyRevivalIfNeeded(playerAfterPowerFlags);
    const playerAfterCardBase = revivalOutcome.player;
    const effectiveTimeCost = getEffectiveTimeCost(
      playedCard,
      lastPlayedCard,
      playerAfterCardBase,
      playerAfterCardBase.jobId,
    );
    const playerAfterCard: PlayerState = (() => {
      let p = playerAfterCardBase;
      if (playedCard.type === 'attack' && p.nextAttackTimeReduce > 0) {
        p = { ...p, nextAttackTimeReduce: 0 };
      }
      if (isCardVariantId(playedCard.id, 'full_sprint')) {
        p = { ...p, fullSprintUsedCount: (p.fullSprintUsedCount ?? 0) + 1 };
      }
      if (isCardVariantId(playedCard.id, 'food_essence')) {
        p = { ...p, handTimeCostDiscountThisTurn: 1 };
      }
      return p;
    })();

    const drawAmountBase = (playedCard.effects ?? [])
      .filter((effect) => effect.type === 'draw')
      .reduce((sum, effect) => sum + effect.value, 0);
    let drawAmount = replayActive ? drawAmountBase * 2 : drawAmountBase;
    if (playedCard.badges?.includes('setup') && (gameState.player.relicSetupCardDraw ?? 0) > 0) {
      drawAmount += gameState.player.relicSetupCardDraw ?? 0;
    }
    const timeBoost = (playedCard.effects ?? [])
      .filter((effect) => effect.type === 'time_boost')
      .reduce((sum, effect) => sum + effect.value, 0);
    const mentalTimeDelta = Number(
      (
        getMaxTime(playerAfterCard.mental, playerAfterCard.timeBonusPerTurn) -
        getMaxTime(gameState.player.mental, gameState.player.timeBonusPerTurn)
      ).toFixed(1),
    );
    const equippedIdsForDraw = gameState.toolSlots.filter((t) => t !== null).map((t) => t!.card.id);

    const newlyDefeated = result.enemies.filter((enemy) => {
      const before = enemiesBefore.find((item) => item.id === enemy.id);
      return Boolean(before && before.hp > 0 && enemy.currentHp <= 0);
    });
    const onKillDrawBonus = getOmamoriBonus(battleOmamoris, 'on_kill', 'draw');
    if (onKillDrawBonus > 0 && newlyDefeated.length > 0) {
      drawAmount += newlyDefeated.length * onKillDrawBonus;
    }
    const drawResult =
      drawAmount > 0
        ? drawCards(gameState.drawPile, gameState.discardPile, drawAmount, equippedIdsForDraw)
        : { drawn: [] as Card[], drawPile: gameState.drawPile, discardPile: gameState.discardPile, shuffled: false };

    const onKillHeal = getOmamoriBonus(battleOmamoris, 'on_kill', 'heal');
    const onKillGold = getOmamoriBonus(battleOmamoris, 'on_kill', 'gold');
    const onKillHealTotal = newlyDefeated.length * onKillHeal;
    const onKillGoldTotal = newlyDefeated.length * onKillGold;
    let playerAfterKill: PlayerState =
      onKillHealTotal > 0 || onKillGoldTotal > 0
        ? {
            ...playerAfterCard,
            currentHp:
              onKillHealTotal > 0
                ? Math.min(playerAfterCard.maxHp, playerAfterCard.currentHp + onKillHealTotal)
                : playerAfterCard.currentHp,
            gold: playerAfterCard.gold + onKillGoldTotal,
          }
        : playerAfterCard;
    if (result.equippedTool) {
      const slot = { card: result.equippedTool };
      const omitStatic: { omitStaticCardBlock?: boolean } = { omitStaticCardBlock: true };
      playerAfterKill = applyOneToolSlotToPlayer(playerAfterKill, slot, omitStatic);
      if (replayActive) {
        playerAfterKill = applyOneToolSlotToPlayer(playerAfterKill, slot, omitStatic);
      }
    }
    playerAfterKill = {
      ...playerAfterKill,
      cookingGaugePlaysThisTurn: (playedCard.effects ?? []).some((e) => e.type === 'cooking_gauge')
        ? (playerAfterKill.cookingGaugePlaysThisTurn ?? 0) + 1
        : (playerAfterKill.cookingGaugePlaysThisTurn ?? 0),
    };
    const allEnemiesDead = result.enemies.every((enemy) => enemy.currentHp <= 0);
    const gainedDoubleNext = (playedCard.effects ?? [])
      .filter((effect) => effect.type === 'double_next')
      .reduce((sum, effect) => sum + effect.value, 0);
    const gainedDoubleReplay = (playedCard.effects ?? [])
      .filter((effect) => effect.type === 'double_next_replay')
      .reduce((sum, effect) => sum + effect.value, 0);
    // 捨て札ではなく exhaustedCards へ：【消耗】/集中力温存プレイ + 起死回生の【追込】（HP閾値以下）
    const shouldExhaust =
      cardExhaustsWhenPlayed(card, cardWasReserved) || comebackShouldExhaustAfterPlay(card, gameState.player);
    const activePowers =
      playedCard.type === 'power' && !shouldExhaust
        ? [...gameState.activePowers, { ...playedCard }]
        : gameState.activePowers;
    const upgradeRandomHandCardCountBase = (playedCard.effects ?? [])
      .filter((effect) => effect.type === 'upgrade_random_hand_card')
      .reduce((sum, effect) => sum + effect.value, 0);
    const upgradeRandomHandCardCount = replayActive
      ? upgradeRandomHandCardCountBase * 2
      : upgradeRandomHandCardCountBase;
    const upgradeAllHandCard =
      (playedCard.effects ?? []).some((effect) => effect.type === 'upgrade_all_hand_card');
    const tempUpgradeSource = isBattleTempUpgradeSourceCard(playedCard);
    let battleCardRevertMap: Record<string, Card> = { ...(gameState.battleCardRevertMap ?? {}) };
    let handAfterPlay = [
      ...gameState.hand.filter((item) => item.id !== cardId),
      ...drawResult.drawn,
      ...rollAnxietyCardsForDrawCount(drawResult.drawn.length, playerAfterCard.mental <= 0),
    ];
    if (upgradeRandomHandCardCount > 0) {
      const upgradableCards = handAfterPlay.filter((entry) => !entry.upgraded && entry.type !== 'status' && entry.type !== 'curse');
      if (upgradableCards.length === 0) {
        pushPopup('強化できるカードがありません', 'player', 'buff');
      } else {
        const targetCards = shuffle(upgradableCards).slice(
          0,
          Math.min(upgradeRandomHandCardCount, upgradableCards.length),
        );
        if (tempUpgradeSource) {
          targetCards.forEach((entry) => {
            battleCardRevertMap[entry.id] = { ...entry };
          });
        }
        const targetIds = new Set(targetCards.map((entry) => entry.id));
        handAfterPlay = handAfterPlay.map((entry) =>
          targetIds.has(entry.id) ? upgradeCardByJobId(entry, gameState.player.jobId) : entry,
        );
        targetCards.forEach((entry) => {
          const upgradedName = handAfterPlay.find((cardInHand) => cardInHand.id === entry.id)?.name ?? `${entry.name}+`;
          pushPopup(`🔧 ${entry.name} → ${upgradedName}`, 'player', 'buff');
        });
      }
    }
    if (upgradeAllHandCard) {
      const upgradableAll = handAfterPlay.filter((entry) => !entry.upgraded && entry.type !== 'status' && entry.type !== 'curse');
      if (upgradableAll.length === 0) {
        pushPopup('強化できるカードがありません', 'player', 'buff');
      } else {
        if (tempUpgradeSource) {
          upgradableAll.forEach((entry) => {
            battleCardRevertMap[entry.id] = { ...entry };
          });
        }
        const allIds = new Set(upgradableAll.map((c) => c.id));
        handAfterPlay = handAfterPlay.map((entry) =>
          allIds.has(entry.id) ? upgradeCardByJobId(entry, gameState.player.jobId) : entry,
        );
        upgradableAll.forEach((entry) => {
          const upgradedName = handAfterPlay.find((cardInHand) => cardInHand.id === entry.id)?.name ?? `${entry.name}+`;
          pushPopup(`🔧 ${entry.name} → ${upgradedName}`, 'player', 'buff');
        });
      }
    }
    const upgradeIngredientHandCountBase = (playedCard.effects ?? [])
      .filter((effect) => effect.type === 'upgrade_ingredient_hand')
      .reduce((sum, effect) => sum + effect.value, 0);
    const upgradeIngredientHandCount = replayActive ? upgradeIngredientHandCountBase * 2 : upgradeIngredientHandCountBase;
    if (upgradeIngredientHandCount > 0) {
      const pool = handAfterPlay.filter(
        (entry) =>
          isIngredientCard(entry) && !entry.upgraded && entry.type !== 'status' && entry.type !== 'curse',
      );
      if (pool.length === 0) {
        pushPopup('強化できる食材がありません', 'player', 'buff');
      } else {
        const targetCards = shuffle(pool).slice(0, Math.min(upgradeIngredientHandCount, pool.length));
        if (tempUpgradeSource) {
          targetCards.forEach((entry) => {
            battleCardRevertMap[entry.id] = { ...entry };
          });
        }
        const targetIds = new Set(targetCards.map((entry) => entry.id));
        handAfterPlay = handAfterPlay.map((entry) =>
          targetIds.has(entry.id) ? upgradeCardByJobId(entry, gameState.player.jobId) : entry,
        );
        targetCards.forEach((entry) => {
          const upgradedName = handAfterPlay.find((cardInHand) => cardInHand.id === entry.id)?.name ?? `${entry.name}+`;
          pushPopup(`🔧 ${entry.name} → ${upgradedName}`, 'player', 'buff');
        });
      }
    }
    const exhaustedCards = shouldExhaust
      ? [...gameState.exhaustedCards, cardForDiscard]
      : gameState.exhaustedCards;
    let discardPile =
      playedCard.type === 'tool' || playedCard.type === 'power' || shouldExhaust
        ? drawResult.discardPile
        : [...drawResult.discardPile, cardForDiscard];
    let handFinal = handAfterPlay;
    if (isCardVariantId(playedCard.id, 'food_god')) {
      const ing = discardPile.filter(isIngredientCard);
      const non = discardPile.filter((c) => !isIngredientCard(c));
      const room = Math.max(0, 10 - handFinal.length);
      const take = ing.slice(0, room);
      const restIng = ing.slice(room);
      handFinal = [...handFinal, ...take];
      discardPile = [...non, ...restIng];
    }

    const pickFromDiscardSum = (concentratedCard.effects ?? [])
      .filter((e) => e.type === 'pick_from_discard')
      .reduce((s, e) => s + e.value, 0);
    if (pickFromDiscardSum > 0) {
      const picks = Math.min(pickFromDiscardSum, discardPile.length);
      if (picks === 0) {
        pushPopup('捨て札がありません', 'player', 'buff');
      } else {
        const pool = [...discardPile];
        const picked: Card[] = [];
        for (let n = 0; n < picks; n++) {
          const ri = Math.floor(Math.random() * pool.length);
          picked.push(pool.splice(ri, 1)[0]!);
        }
        handFinal = [...handFinal, ...picked];
        discardPile = pool;
        playSe('card');
      }
    }

    const drawPileDisplayOrder = nextDrawPileDisplayOrder(
      gameState.drawPileDisplayOrder,
      gameState.drawPile,
      drawResult.drawPile,
      drawResult.shuffled,
    );

    const nextCardDoubleConsumed = gameState.player.nextCardDoubleEffect && reserveOrDoubleMultiplier > 1;
    const nextCardEffectBoostConsumed = shouldUseTenBoost;
    const nextCardEffectBoostAfterPlay = nextCardEffectBoostConsumed
      ? 0
      : (playerAfterKill.nextCardEffectBoost ?? 0);
    const hadConcentration = gameState.player.concentrationActive ?? false;
    const consumedConcentration =
      hadConcentration &&
      (playedCard.type === 'attack' || playedCard.type === 'skill') &&
      !hasConcentrationNextEffect(playedCard);
    const concentrationActiveAfterPlay = consumedConcentration
      ? false
      : (playerAfterKill.concentrationActive ?? false);
    const playerAfterKillResolved: PlayerState = {
      ...playerAfterKill,
      nextCardDoubleEffect: nextCardDoubleConsumed ? false : playerAfterKill.nextCardDoubleEffect,
      nextCardEffectBoost: nextCardEffectBoostAfterPlay,
      concentrationActive: concentrationActiveAfterPlay,
    };

    const postCardState: GameState = {
      ...gameState,
      discardPile,
      drawPile: drawResult.drawPile,
      drawPileDisplayOrder,
      exhaustedCards,
      player: playerAfterKillResolved,
      enemies: result.enemies,
      activePowers,
      toolSlots: result.equippedTool ? equipTool(result.equippedTool, gameState.toolSlots) : gameState.toolSlots,
      hand: handFinal,
      usedTime: gameState.usedTime + effectiveTimeCost,
      maxTime: gameState.maxTime + timeBoost + mentalTimeDelta,
      shuffleAnimation: drawResult.shuffled,
      battleCardRevertMap,
    };

    setGameState((prev) => ({
      ...prev,
      hand: handFinal,
      discardPile,
      drawPile: drawResult.drawPile,
      drawPileDisplayOrder: nextDrawPileDisplayOrder(
        prev.drawPileDisplayOrder,
        prev.drawPile,
        drawResult.drawPile,
        drawResult.shuffled,
      ),
      exhaustedCards,
      player: playerAfterKillResolved,
      enemies: result.enemies,
      activePowers,
      toolSlots: result.equippedTool ? equipTool(result.equippedTool, prev.toolSlots) : prev.toolSlots,
      usedTime: prev.usedTime + effectiveTimeCost,
      maxTime: prev.maxTime + timeBoost + mentalTimeDelta,
      shuffleAnimation: drawResult.shuffled,
      battleCardRevertMap,
    }));
    setDoubleNextCharges(
      (prev) => Math.max(0, prev - (doubleNextCharges > 0 && reserveOrDoubleMultiplier > 1 ? 1 : 0)) + gainedDoubleNext,
    );
    setDoubleNextReplayCharges(
      (prev) => Math.max(0, prev - (replayActive ? 1 : 0)) + gainedDoubleReplay,
    );

    const rankPts = options?.onRankingScore;
    if (rankPts) {
      cardsPlayedThisTurnRef.current += 1;
      if (consumedConcentration) {
        rankPts(5);
      }
      const prevFull = gameState.player.fullnessBonusCount ?? 0;
      const nextFull = playerAfterKillResolved.fullnessBonusCount ?? 0;
      if (nextFull > prevFull) {
        rankPts(15 * (nextFull - prevFull));
      }
      if (
        gameState.player.jobId === 'carpenter' &&
        !rankingScaffold10AwardedRef.current &&
        gameState.player.scaffold < 10 &&
        playerAfterKillResolved.scaffold >= 10
      ) {
        rankingScaffold10AwardedRef.current = true;
        rankPts(20);
      }
      const prevCook = gameState.player.totalCookingGaugeGained ?? 0;
      const nextCook = playerAfterKillResolved.totalCookingGaugeGained ?? 0;
      if (
        gameState.player.jobId === 'cook' &&
        !rankingCooking10AwardedRef.current &&
        prevCook < 10 &&
        nextCook >= 10
      ) {
        rankingCooking10AwardedRef.current = true;
        rankPts(20);
      }
    }

    const pickFromDiscardIngredientSum = (concentratedCard.effects ?? [])
      .filter((e) => e.type === 'pick_from_discard_ingredient')
      .reduce((s, e) => s + e.value, 0);
    if (pickFromDiscardIngredientSum > 0) {
      const ingredientCount = discardPile.filter((c) => isIngredientCard(c)).length;
      const picks = Math.min(pickFromDiscardIngredientSum, ingredientCount);
      setDiscardPickIngredientOnly(true);
      if (picks === 0) {
        pushPopup('捨て札に食材がありません', 'player', 'buff');
      } else {
        setPendingDiscardPicks(picks);
      }
    }

    setLastPlayedCard(playedCard);
    setSelectedCardId(null);

    const playedMysteryPot = isCardVariantId(playedCard.id, 'mystery_pot');
    if (playedMysteryPot && result.mysteryPotLabel) {
      if (result.mysteryPotHitEnemyId) {
        setHitEnemyId(result.mysteryPotHitEnemyId);
        window.setTimeout(() => setHitEnemyId(null), 420);
      }
      if (result.mysteryPotOutcome === 'self_damage') {
        setIsPlayerHit(true);
        window.setTimeout(() => setIsPlayerHit(false), 420);
      }
      pushPopup(
        result.mysteryPotLabel,
        result.mysteryPotPopupTarget ?? 'player',
        'mystery_pot',
        2400,
      );
    }

    if (!playedMysteryPot && playedCard.tags?.includes('aoe')) {
      for (const enemy of result.enemies) {
        const before = enemiesBefore.find((item) => item.id === enemy.id);
        if (!before) continue;
        const dealt = Math.max(0, before.hp - enemy.currentHp);
        if (dealt > 0) {
          pushPopup(`-${dealt}`, 'enemy', 'damage');
        }
      }
    } else if (!playedMysteryPot && result.multiHitJabs && result.multiHitJabs.length > 0) {
      const multiHitStaggerMs = 280;
      result.multiHitJabs.forEach((jab, i) => {
        window.setTimeout(() => {
          setHitEnemyId(jab.enemyId);
          pushPopup(`-${jab.damage}`, 'enemy', 'damage');
          window.setTimeout(() => setHitEnemyId(null), 260);
        }, i * multiHitStaggerMs);
      });
    } else if (!playedMysteryPot && result.damage > 0 && result.targetEnemyId) {
      setHitEnemyId(result.targetEnemyId);
      pushPopup(`-${result.damage}`, 'enemy', 'damage');
      window.setTimeout(() => setHitEnemyId(null), 260);
    }
    if (result.blockGained > 0) {
      setShieldEffect(true);
      pushPopup(`+${result.blockGained}🛡`, 'player', 'block');
      window.setTimeout(() => setShieldEffect(false), 260);
    }
    if (isCardVariantId(playedCard.id, 'gamble')) {
      const winDmg = playedCard.upgraded ? 35 : 25;
      const lossDmg = playedCard.upgraded ? 8 : 10;
      if (result.damage > 0) {
        pushPopup(`🎰 大当たり！ ${winDmg}ダメージ！`, 'player', 'buff');
      } else {
        setIsPlayerHit(true);
        pushPopup(`🎰 ハズレ… ${lossDmg}ダメージ`, 'player', 'damage');
        window.setTimeout(() => setIsPlayerHit(false), 260);
      }
    }
    if (result.goldGained > 0) {
      pushPopup(`💰 +${result.goldGained}G ゲット！`, 'player', 'buff');
      spawnCoinBurst();
    }
    if (result.lighterBurnApplied) {
      pushPopup('🔥 火傷2付与！', result.targetEnemyId ?? 'player', 'buff');
    }
    {
      let enemyBurnIncreased = false;
      let enemyPoisonIncreased = false;
      for (const e of result.enemies) {
        const prev = enemyDebuffTotalsBefore.find((x) => x.id === e.id);
        if (sumEnemyBurnTurns(e) > (prev?.burn ?? 0)) enemyBurnIncreased = true;
        if (sumEnemyPoisonTurns(e) > (prev?.poison ?? 0)) enemyPoisonIncreased = true;
      }
      if (enemyBurnIncreased) playSe('burn');
      if (enemyPoisonIncreased) playSe('poison');
    }
    if (result.scaffoldGained > 0) {
      pushPopup(`+${result.scaffoldGained}足場`, 'player', 'buff');
    }
    if (result.cookingGaugeGained > 0 && !playedMysteryPot) {
      pushPopup(`+${result.cookingGaugeGained}🍳`, 'player', 'buff');
    }
    if (result.fullnessAutoHealTriggered) {
      pushPopup('+🍖', 'player', 'buff');
    }
    if (drawAmount > 0) {
      pushPopup(`+${drawAmount}ドロー`, 'player', 'buff');
    }
    if (timeBoost > 0) {
      pushPopup(`+${timeBoost.toFixed(1)}s`, 'player', 'buff');
    }
    if (mentalTimeDelta > 0) {
      pushPopup(`🧠+${mentalTimeDelta.toFixed(1)}s`, 'player', 'buff');
    }
    /** カード解決直後（撃破お守りの on_kill 回復より前）に既にHPが増えているか */
    const playerHpIncreasedFromCardResolve = playerAfterCard.currentHp > gameState.player.currentHp;
    const playerHpIncreasedOverall = playerAfterKill.currentHp > gameState.player.currentHp;
    const anyEnemyHpIncreasedForHealSe = result.enemies.some((e) => {
      const before = enemiesBefore.find((item) => item.id === e.id);
      return before !== undefined && e.currentHp > before.hp;
    });
    /** 勝利のお守り等の on_kill 回復だけでは回復SEを鳴らさない（カード回復・敵回復は従来どおり）。満腹5回復も含める */
    const shouldPlayHealSe =
      anyEnemyHpIncreasedForHealSe || (playerHpIncreasedOverall && playerHpIncreasedFromCardResolve);
    if (shouldPlayHealSe || result.fullnessAutoHealTriggered) {
      playSe('heal');
    }
    if (result.isDandoriActive) {
      pushPopup('⚡段取り！', 'player', 'dandori');
    }
    if (reserveBonusActiveForCard(card)) {
      pushPopup('✨温存ボーナス！', 'player', 'buff');
    }
    if (attackItemBuff && playedCard.type === 'attack') {
      const dec = replayActive ? 2 : 1;
      setAttackItemBuff((prev) =>
        prev ? { ...prev, charges: Math.max(0, prev.charges - dec) } : prev,
      );
      pushPopup(`+${attackItemBuff.value}💪`, 'player', 'buff');
    }
    if (result.attackBuff) {
      setAttackItemBuff(result.attackBuff);
      pushPopup(`次${result.attackBuff.charges}回 +${result.attackBuff.value}💪`, 'player', 'buff');
    }

    for (const enemy of newlyDefeated) {
      recordEnemyDefeated(enemy.templateId);
      pushPopup(`+${getEnemyReward(enemy.templateId)}G`, enemy.id, 'buff');
    }
    if (onKillHealTotal > 0) {
      pushPopup(`💚+${onKillHealTotal}HP`, 'player', 'buff');
    }
    if (onKillGoldTotal > 0) {
      pushPopup(`💰+${onKillGoldTotal}G`, 'player', 'buff');
      spawnCoinBurst();
    }
    if (revivalOutcome.revived) {
      pushPopup('🔄 七転び八起き！', 'player', 'buff');
      triggerRevivalEffect();
    }

    if (allEnemiesDead) {
      setBattleMessage('敵を一掃！');
      setGameState((prev) => ({ ...prev, phase: 'executing' }));
      window.setTimeout(() => {
        const reward = result.enemies.reduce((sum, enemy) => sum + getEnemyReward(enemy.templateId), 0);
        const nextMental = Math.min(
          getEffectiveMaxMental(playerAfterKill),
          playerAfterKill.mental + 1,
        );
        const revertedVictory = applyBattleCardReverts(postCardState);
        setVictoryRewardGold(reward);
        setVictoryMentalRecovery(nextMental - playerAfterKill.mental);
        setGameState({
          ...revertedVictory,
          phase: 'victory',
          timeline: [],
          player: {
            ...clearBattleFlags(playerAfterKill),
            gold: playerAfterKill.gold + reward,
            mental: nextMental,
          },
        });
        setBattleMessage('勝利！');
        options?.onBattleFinished?.();
        options?.onBattleEnd?.({
          outcome: 'victory',
          player: {
            ...clearBattleFlags(playerAfterKill),
            gold: playerAfterKill.gold + reward,
            mental: nextMental,
          },
          deck: [
            ...revertedVictory.drawPile,
            ...revertedVictory.discardPile,
            ...revertedVictory.hand,
            ...revertedVictory.reserved,
            ...revertedVictory.exhaustedCards,
            ...revertedVictory.activePowers,
            ...revertedVictory.toolSlots.map((slot) => slot.card),
          ],
          items: battleItems,
          defeatedEnemies: result.enemies,
          rewardGold: reward,
          mentalRecovery: nextMental - playerAfterKill.mental,
          kind: options?.setup?.kind ?? 'battle',
          battleTurns: gameState.turn,
          rankingEnemyAttackHpDamageSum: rankingEnemyAttackHpDamageRef.current,
        });
      }, 500);
    }
    return { played: true, blockGained: result.blockGained, multiHitJabs: result.multiHitJabs };
  };

  const useBattleItem = (itemId: string): boolean => {
    if (dotSequenceInProgressRef.current) return false;
    if (pendingDiscardPicks > 0) return false;
    if (activePendingHandUpgradeCount > 0) return false;
    const item = battleItems.find((entry) => entry.id === itemId);
    if (!item || gameState.phase !== 'player_turn') return false;
    const effect = item.effect;
    if (effect.type === 'time_boost') {
      setGameState((prev) => ({ ...prev, maxTime: prev.maxTime + effect.value }));
      pushPopup(`+${effect.value.toFixed(1)}s`, 'player', 'buff');
    } else if (effect.type === 'heal') {
      if (gameState.player.deathWishActive) {
        pushPopup('💀 回復無効', 'player', 'buff');
        setBattleItems((prev) => prev.filter((entry) => entry.id !== itemId));
        options?.onConsumeItem?.(itemId);
        return true;
      }
      setGameState((prev) => ({
        ...prev,
        player: {
          ...prev.player,
          currentHp: Math.min(prev.player.maxHp, prev.player.currentHp + effect.value),
        },
      }));
      pushPopup(`+${effect.value}HP`, 'player', 'buff');
    } else if (effect.type === 'attack_buff') {
      setAttackItemBuff({ value: effect.value, charges: effect.duration ?? 3 });
      pushPopup(`次${effect.duration ?? 3}回 +${effect.value}⚔`, 'player', 'buff');
    } else if (effect.type === 'draw') {
      setGameState((prev) => {
        const equippedIdsItem = prev.toolSlots.filter((t) => t !== null).map((t) => t!.card.id);
        const drawResult = drawCards(prev.drawPile, prev.discardPile, effect.value, equippedIdsItem);
        const anxietyFromDraw = rollAnxietyCardsForDrawCount(
          drawResult.drawn.length,
          prev.player.mental <= 0,
        );
        return {
          ...prev,
          hand: [...prev.hand, ...drawResult.drawn, ...anxietyFromDraw],
          drawPile: drawResult.drawPile,
          drawPileDisplayOrder: nextDrawPileDisplayOrder(
            prev.drawPileDisplayOrder,
            prev.drawPile,
            drawResult.drawPile,
            drawResult.shuffled,
          ),
          discardPile: drawResult.discardPile,
          shuffleAnimation: drawResult.shuffled,
        };
      });
      pushPopup(`+${effect.value}ドロー`, 'player', 'buff');
    }
    setBattleItems((prev) => prev.filter((entry) => entry.id !== itemId));
    options?.onConsumeItem?.(itemId);
    return true;
  };

  const reserveCardById = (cardId: string): boolean => {
    if (pendingDiscardPicks > 0) return false;
    if (dotSequenceInProgressRef.current) return false;
    /** phase / 手札強化待ち / 温存可否はすべて prev と ref で判定（stale closure・遅延呼び出しでも nextCardDoubleEffect を誤って落とさない） */
    let didReserve = false;
    setGameState((prev) => {
      if (prev.phase !== 'player_turn') return prev;
      const upgradeableCount = prev.hand.filter(
        (c) => !c.upgraded && c.type !== 'status' && c.type !== 'curse',
      ).length;
      if (pendingHandUpgradeCountRef.current > 0 && upgradeableCount > 0) return prev;
      if (prev.reserved.length >= MAX_RESERVED) return prev;
      const remainingTime = prev.maxTime - prev.usedTime;
      if (remainingTime + 1e-9 < RESERVE_COST_SEC) return prev;
      const card = prev.hand.find((item) => item.id === cardId);
      if (!card || card.type === 'status' || card.type === 'curse') return prev;
      didReserve = true;
      const reservedCard: Card = {
        ...card,
        wasReserved: false,
        reservedThisTurn: true,
        // ドローで既に +1 されていると戻り時に +1 で 2 になり温存ボーナスが死ぬため、枠に入れた時点で手札入りカウントを切り直す
        ...(shouldTrackReserveDrawCount(card) ? { reserveDrawCount: 0 } : {}),
      };
      const normalizedHand = prev.hand.map((item) => ({
        ...item,
        wasReserved: false,
        reservedThisTurn: false,
      }));
      const normalizedReserved = prev.reserved.map((item) => ({
        ...item,
        wasReserved: false,
        reservedThisTurn: false,
      }));
      return {
        ...prev,
        hand: normalizedHand.filter((item) => item.id !== cardId),
        reserved: [...normalizedReserved, reservedCard],
        usedTime: prev.usedTime + RESERVE_COST_SEC,
        player: {
          ...prev.player,
          nextTurnTimePenalty: prev.player.nextTurnTimePenalty + RESERVE_TIME_PENALTY,
        },
      };
    });
    if (didReserve) {
      setSelectedCardId((prev) => (prev === cardId ? null : prev));
    }
    return didReserve;
  };

  const spawnCoinBurst = (): void => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setCoinBursts((bursts) => [...bursts, { id }]);
    window.setTimeout(() => {
      setCoinBursts((bursts) => bursts.filter((burst) => burst.id !== id));
    }, 520);
  };

  const sellCardById = (cardId: string): boolean => {
    if (!CARPENTER_CAN_SELL_IN_BATTLE) return false;
    if (pendingDiscardPicks > 0) return false;
    if (dotSequenceInProgressRef.current) return false;
    if (gameState.phase !== 'player_turn') return false;
    if (activePendingHandUpgradeCount > 0) return false;
    const targetCard = gameState.hand.find((card) => card.id === cardId);
    if (!targetCard || targetCard.type === 'status' || targetCard.type === 'curse') return false;
    setSellingCardId(cardId);
    window.setTimeout(() => {
      setGameState((prev) => {
        const latestCard = prev.hand.find((card) => card.id === cardId);
        if (!latestCard) return prev;
        return {
          ...prev,
          hand: prev.hand.filter((card) => card.id !== cardId),
          player: {
            ...prev.player,
            gold: prev.player.gold + (latestCard.sellValue ?? 5),
          },
        };
      });
      setSellingCardId(null);
      setSelectedCardId((prev) => (prev === cardId ? null : prev));
      spawnCoinBurst();
      options?.onRankingScore?.(5);
    }, SELL_ANIMATION_MS);
    return true;
  };

  const moveToNextTurn = (
    state: GameState,
    dotOverride?: { currentHp: number; statusEffects: StatusEffect[] },
  ): GameState => {
    const cliffEdgeAwakened =
      state.player.cliffEdgeActive &&
      state.player.jobId === 'unemployed' &&
      getHungryState(state.player) === 'awakened';
    const cliffEdgeTimeBonus = cliffEdgeAwakened ? 1 : 0;
    const cliffEdgeDrawBonus = cliffEdgeAwakened ? 2 : 0;
    const onTurnStartDrawBonus = getOmamoriBonus(battleOmamoris, 'on_turn_start', 'draw');
    const onTurnStartBlockBonus = getOmamoriBonus(battleOmamoris, 'on_turn_start', 'block');
    const onTurnStartTimeBarRelic = getOmamoriBonus(battleOmamoris, 'on_turn_start', 'time_bar');
    const onTurnStartAttackRelic = getOmamoriBonus(battleOmamoris, 'on_turn_start', 'turn_attack_damage');
    const nextTurnTimeBonusSec = state.player.nextTurnTimeBonus ?? 0;
    const dot = dotOverride ?? processPlayerTurnStartStatuses(state.player);
    const lowHpForRelics = dot.currentHp <= 20;
    const lowHpBlockRelic = lowHpForRelics
      ? getOmamoriBonus(battleOmamoris, 'passive', 'low_hp_block')
      : 0;
    const lowHpTimeRelic = lowHpForRelics
      ? getOmamoriBonus(battleOmamoris, 'passive', 'low_hp_time')
      : 0;
    const foodLoverChance =
      battleOmamoris.find((o) => o.id === 'food_lover')?.effect.value ?? 0;
    const foodLoverFullness =
      foodLoverChance > 0 && Math.random() < foodLoverChance ? 1 : 0;
    const nextMaxTime = Math.max(
      3,
      getMaxTime(state.player.mental, state.player.timeBonusPerTurn) +
        cliffEdgeTimeBonus -
        state.player.nextTurnTimePenalty +
        nextTurnTimeBonusSec +
        onTurnStartTimeBarRelic +
        lowHpTimeRelic,
    );
    const scaffoldPerTurn = state.activePowers
      .flatMap((power) => power.effects ?? [])
      .filter((effect) => effect.type === 'scaffold_per_turn')
      .reduce((sum, effect) => sum + effect.value, 0);
    const blockPersistTurns = state.player.blockPersistTurns ?? 0;
    const keepBlock = blockPersistTurns > 0;
    const nextBlockPersistTurns = keepBlock ? Math.max(0, blockPersistTurns - 1) : 0;
    const shouldDisableBlockThisTurn = state.player.nextTurnNoBlock;

    const playerAfterReset = applyToolEffects(state.toolSlots, {
      ...state.player,
      currentHp: dot.currentHp,
      block:
        shouldDisableBlockThisTurn
          ? 0
          : (keepBlock ? state.player.block : 0) +
            Math.max(0, onTurnStartBlockBonus) +
            Math.max(0, lowHpBlockRelic),
      blockPersistTurns: nextBlockPersistTurns,
      scaffold: state.player.scaffold + scaffoldPerTurn,
      canBlock: !shouldDisableBlockThisTurn,
      nextTurnNoBlock: false,
      nextTurnTimePenalty: 0,
      nextTurnTimeBonus: 0,
      damageImmunityThisTurn: false,
      firstCookingUsedThisTurn: false,
      lastTurnDamageTaken: state.player.currentTurnDamageTaken,
      currentTurnDamageTaken: 0,
      firstIngredientUsedThisTurn: false,
      nextCardDoubleEffect: false,
      nextCardEffectBoost: state.player.nextCardEffectBoost ?? 0,
      fullnessGainedThisTurn: false,
      ingredientCostFreeThisTurn: false,
      handTimeCostDiscountThisTurn: 0,
      cookingGaugePlaysThisTurn: 0,
      statusEffects: dot.statusEffects,
      fullnessGauge: (state.player.fullnessGauge ?? 0) + foodLoverFullness,
      turnAttackDamageBonus:
        (state.player.turnAttackDamageBonus ?? 0) + Math.max(0, onTurnStartAttackRelic),
    });
    const playerAfterKitchenDemon = state.player.kitchenDemonActive
      ? {
          ...playerAfterReset,
          cookingGauge: playerAfterReset.cookingGauge + 1,
        }
      : playerAfterReset;
    const powerDrawPerTurn = state.activePowers
      .flatMap((power) => power.effects ?? [])
      .filter((effect) => effect.type === 'draw_per_turn')
      .reduce((sum, effect) => sum + effect.value, 0);
    const equippedCardIds = state.toolSlots.filter((t) => t !== null).map((t) => t!.card.id);
    const drawResult = drawCards(
      shuffle([...state.drawPile].filter((c) => !isAnxietyCard(c))),
      state.discardPile,
      DRAW_COUNT +
        powerDrawPerTurn +
        cliffEdgeDrawBonus +
        Math.max(0, onTurnStartDrawBonus) +
        Math.max(0, state.player.relicHandDrawBonus ?? 0),
      equippedCardIds,
    );
    const exhaustedReserved = state.reserved.filter((c) => exhaustsWhenIdleInReserveAtTurnStart(c));
    const keptReserved = state.reserved.filter((c) => !exhaustsWhenIdleInReserveAtTurnStart(c));
    const reservedToHand = keptReserved.map((card) => {
      const base = {
        ...card,
        // 温存枠から手札に戻るカードはすべて「温存から戻った」扱い（reservedThisTurn は2枚目温存時に先に入れた枚が false になるため使わない）
        wasReserved: true,
        reservedThisTurn: false,
      };
      if (!shouldTrackReserveDrawCount(base)) return base;
      return { ...base, reserveDrawCount: (base.reserveDrawCount ?? 0) + 1 };
    });
    const exhaustedFromReserve = exhaustedReserved.map((card) => ({
      ...card,
      wasReserved: false,
      reservedThisTurn: false,
    }));
    const anxietyHandBonus = rollAnxietyCardsForDrawCount(
      drawResult.drawn.length,
      playerAfterKitchenDemon.mental <= 0,
    );
    const pendingCurses = state.pendingCurseCards ?? [];
    return {
      ...state,
      phase: 'player_turn',
      turn: state.turn + 1,
      maxTime: nextMaxTime,
      usedTime: 0,
      shuffleAnimation: drawResult.shuffled,
      hand: [...reservedToHand, ...drawResult.drawn, ...anxietyHandBonus, ...pendingCurses],
      reserved: [],
      timeline: [],
      drawPile: drawResult.drawPile,
      drawPileDisplayOrder: createShuffledDrawPileDisplayOrder(drawResult.drawPile.length),
      discardPile: drawResult.discardPile,
      exhaustedCards: [...state.exhaustedCards, ...exhaustedFromReserve],
      player: playerAfterKitchenDemon,
      executingIndex: -1,
      pendingCurseCards: [],
    };
  };

  /**
   * 広告復活: 敵ターン中に倒れたスナップショットから、山札順を変えずにプレイヤーターンへ戻す。
   * moveToNextTurn とは異なりターン数を増やさず、プレイヤーのバフ・ゲージ・敵状態はスナップショットを維持する。
   */
  const buildPlayerTurnAfterReviveFromEnemyTurnSnapshot = (
    snapshot: GameState,
    revivedPlayer: PlayerState,
  ): GameState => {
    const state = { ...snapshot, player: revivedPlayer };
    const cliffEdgeAwakened =
      revivedPlayer.cliffEdgeActive &&
      revivedPlayer.jobId === 'unemployed' &&
      getHungryState(revivedPlayer) === 'awakened';
    const cliffEdgeTimeBonus = cliffEdgeAwakened ? 1 : 0;
    const cliffEdgeDrawBonus = cliffEdgeAwakened ? 2 : 0;
    const onTurnStartDrawBonus = getOmamoriBonus(battleOmamoris, 'on_turn_start', 'draw');
    const onTurnStartTimeBarRelic = getOmamoriBonus(battleOmamoris, 'on_turn_start', 'time_bar');
    const nextTurnTimeBonusSec = revivedPlayer.nextTurnTimeBonus ?? 0;
    const lowHpForRelics = revivedPlayer.currentHp <= 20;
    const lowHpTimeRelic = lowHpForRelics
      ? getOmamoriBonus(battleOmamoris, 'passive', 'low_hp_time')
      : 0;
    const nextMaxTime = Math.max(
      3,
      getMaxTime(revivedPlayer.mental, revivedPlayer.timeBonusPerTurn) +
        cliffEdgeTimeBonus -
        revivedPlayer.nextTurnTimePenalty +
        nextTurnTimeBonusSec +
        onTurnStartTimeBarRelic +
        lowHpTimeRelic,
    );
    const powerDrawPerTurn = state.activePowers
      .flatMap((power) => power.effects ?? [])
      .filter((effect) => effect.type === 'draw_per_turn')
      .reduce((sum, effect) => sum + effect.value, 0);
    const equippedCardIds = state.toolSlots.filter((t) => t !== null).map((t) => t!.card.id);
    const drawPileInputOrdered = [...state.drawPile].filter((c) => !isAnxietyCard(c));
    const drawResult = drawCards(
      drawPileInputOrdered,
      state.discardPile,
      DRAW_COUNT +
        powerDrawPerTurn +
        cliffEdgeDrawBonus +
        Math.max(0, onTurnStartDrawBonus) +
        Math.max(0, revivedPlayer.relicHandDrawBonus ?? 0),
      equippedCardIds,
    );
    const exhaustedReserved = state.reserved.filter((c) => exhaustsWhenIdleInReserveAtTurnStart(c));
    const keptReserved = state.reserved.filter((c) => !exhaustsWhenIdleInReserveAtTurnStart(c));
    const reservedToHand = keptReserved.map((card) => {
      const base = {
        ...card,
        wasReserved: true,
        reservedThisTurn: false,
      };
      if (!shouldTrackReserveDrawCount(base)) return base;
      return { ...base, reserveDrawCount: (base.reserveDrawCount ?? 0) + 1 };
    });
    const exhaustedFromReserve = exhaustedReserved.map((card) => ({
      ...card,
      wasReserved: false,
      reservedThisTurn: false,
    }));
    const anxietyHandBonus = rollAnxietyCardsForDrawCount(
      drawResult.drawn.length,
      revivedPlayer.mental <= 0,
    );
    const pendingCurses = state.pendingCurseCards ?? [];
    return {
      ...state,
      phase: 'player_turn',
      turn: state.turn,
      maxTime: nextMaxTime,
      usedTime: 0,
      shuffleAnimation: drawResult.shuffled,
      hand: [...reservedToHand, ...drawResult.drawn, ...anxietyHandBonus, ...pendingCurses],
      reserved: [],
      timeline: [],
      drawPile: drawResult.drawPile,
      drawPileDisplayOrder: nextDrawPileDisplayOrder(
        state.drawPileDisplayOrder,
        drawPileInputOrdered,
        drawResult.drawPile,
        drawResult.shuffled,
      ),
      discardPile: drawResult.discardPile,
      exhaustedCards: [...state.exhaustedCards, ...exhaustedFromReserve],
      player: revivedPlayer,
      executingIndex: -1,
      pendingCurseCards: [],
    };
  };

  const pendingDefeatRef = useRef<{ snapshot: GameState; defeatedBy: string } | null>(null);

  const buildDefeatBattleResult = (snapshot: GameState, defeatedBy: string): BattleResult => {
    const reverted = applyBattleCardReverts(snapshot);
    return {
      outcome: 'defeat',
      player: clearBattleFlags(reverted.player),
      deck: [
        ...reverted.drawPile,
        ...reverted.discardPile,
        ...reverted.hand,
        ...reverted.reserved,
        ...reverted.exhaustedCards,
        ...reverted.activePowers,
        ...reverted.toolSlots.map((slot) => slot.card),
      ],
      items: battleItems,
      defeatedEnemies: snapshot.enemies,
      rewardGold: 0,
      mentalRecovery: 0,
      kind: options?.setup?.kind ?? 'battle',
      battleTurns: snapshot.turn,
      defeatedBy,
    };
  };

  const giveUpDefeatOffer = () => {
    const pending = pendingDefeatRef.current;
    if (!pending) return;
    pendingDefeatRef.current = null;
    const { snapshot, defeatedBy } = pending;
    const reverted = applyBattleCardReverts(snapshot);
    setGameState({ ...reverted, phase: 'defeat', player: clearBattleFlags(reverted.player) });
    setBattleMessage('敗北...');
    options?.onBattleFinished?.();
    options?.onBattleEnd?.(buildDefeatBattleResult(snapshot, defeatedBy));
  };

  const reviveAfterDefeatOffer = () => {
    const pending = pendingDefeatRef.current;
    if (!pending) return;
    pendingDefeatRef.current = null;
    options?.onDefeatReviveConsumed?.();
    const snap = pending.snapshot;
    const hp = Math.max(1, Math.floor(snap.player.maxHp * 0.5));
    const revivedPlayer = { ...snap.player, currentHp: hp };

    let nextState: GameState;
    if (snap.phase === 'enemy_turn') {
      if (snap.hand.length > 0) {
        nextState = {
          ...snap,
          player: revivedPlayer,
          phase: 'player_turn',
          executingIndex: -1,
          timeline: [],
        };
      } else {
        nextState = buildPlayerTurnAfterReviveFromEnemyTurnSnapshot(snap, revivedPlayer);
      }
    } else {
      nextState = {
        ...snap,
        player: revivedPlayer,
        phase: 'player_turn',
        executingIndex: -1,
        timeline: [],
      };
    }
    cardsPlayedThisTurnRef.current = 0;
    setSelectedCardId(null);
    setGameState(nextState);
    setBattleMessage('復活！');
    options?.onTurnStart?.(nextState);
  };

  async function endTurn(): Promise<void> {
    if (gameState.phase !== 'player_turn') return;
    if (activePendingHandUpgradeCount > 0) return;
    if (pendingDiscardPicks > 0) return;
    if (cardsPlayedThisTurnRef.current >= 3) {
      options?.onRankingScore?.(10);
    }
    cardsPlayedThisTurnRef.current = 0;
    setSelectedCardId(null);
    const remainingTurnTimeSec = gameState.maxTime - gameState.usedTime;
    const nextTurnTimeBonusFromSurplus = remainingTurnTimeSec >= 5 ? 0.5 : 0;
    const endTurnCookingRelic = getOmamoriBonus(battleOmamoris, 'on_turn_end', 'cooking_gauge');
    let workingState: GameState = {
      ...gameState,
      phase: 'enemy_turn',
      executingIndex: -1,
      player: {
        ...gameState.player,
        cookingGauge: gameState.player.cookingGauge + endTurnCookingRelic,
        nextTurnTimeBonus: nextTurnTimeBonusFromSurplus,
        // 同ターン内のみ有効（ターン終了で失効）
        nextAttackBoostValue: 0,
        nextAttackBoostCount: 0,
        nextAttackTimeReduce: 0,
        nextCardBlockMultiplier: 1,
        turnAttackDamageBonus: 0,
      },
      enemies: gameState.enemies.map((enemy) => ({ ...enemy, statusEffects: [...enemy.statusEffects] })),
      toolSlots: [...gameState.toolSlots],
      hand: [],
      discardPile: [...gameState.discardPile, ...gameState.hand],
    };

    const anxietyCount = gameState.hand.filter((card) => card.type === 'status' || card.type === 'curse').length;
    if (anxietyCount > 0) {
      const consumed = anxietyCount;
      workingState.usedTime = Math.min(workingState.maxTime, workingState.usedTime + consumed);
      pushPopup(`😰 -${consumed.toFixed(1)}s`, 'player', 'buff');
    }

    if (workingState.enemies.every((enemy) => enemy.currentHp <= 0)) {
      const reward = workingState.enemies.reduce((sum, enemy) => sum + getEnemyReward(enemy.templateId), 0);
      const nextMental = Math.min(
        getEffectiveMaxMental(workingState.player),
        workingState.player.mental + 1,
      );
      const revertedVictory = applyBattleCardReverts(workingState);
      setVictoryRewardGold(reward);
      setVictoryMentalRecovery(nextMental - workingState.player.mental);
      setGameState({
        ...revertedVictory,
        phase: 'victory',
        timeline: [],
        player: {
          ...clearBattleFlags(workingState.player),
          gold: workingState.player.gold + reward,
          mental: nextMental,
        },
      });
      setBattleMessage('勝利！');
      options?.onBattleFinished?.();
      options?.onBattleEnd?.({
        outcome: 'victory',
        player: {
          ...clearBattleFlags(workingState.player),
          gold: workingState.player.gold + reward,
          mental: nextMental,
        },
        deck: [
          ...revertedVictory.drawPile,
          ...revertedVictory.discardPile,
          ...revertedVictory.hand,
          ...revertedVictory.reserved,
          ...revertedVictory.exhaustedCards,
          ...revertedVictory.activePowers,
          ...revertedVictory.toolSlots.map((slot) => slot.card),
        ],
        items: battleItems,
        defeatedEnemies: workingState.enemies,
        rewardGold: reward,
        mentalRecovery: nextMental - workingState.player.mental,
        kind: options?.setup?.kind ?? 'battle',
        battleTurns: workingState.turn,
        rankingEnemyAttackHpDamageSum: rankingEnemyAttackHpDamageRef.current,
      });
      return;
    }

    const ridgepolePowers = workingState.activePowers.filter((p) =>
      isCardVariantId(p.id, 'ridgepole'),
    );
    const ridgepoleActive = ridgepolePowers.length > 0 || workingState.player.ridgepoleActive;
    // 複数枚ある場合は最も発動しやすい閾値（最小値）を採用
    const ridgepoleThreshold = ridgepolePowers.length > 0
      ? Math.min(...ridgepolePowers.map(
        (p) => p.effects?.find((e) => e.type === 'ridgepole_threshold')?.value ?? 5,
      ))
      : 5;
    // 複数枚ある場合はダメージを合算。カード未保持でフラグのみ有効時はデフォルト10。
    const ridgepoleDamage = ridgepolePowers.reduce((sum, p) => {
      return sum + (p.effects?.find((e) => e.type === 'ridgepole_damage')?.value ?? 10);
    }, 0) || 10;
    const effectiveRidgepoleDamage = ridgepolePowers.length > 0 ? ridgepoleDamage : 10;
    if (ridgepoleActive && workingState.player.scaffold >= ridgepoleThreshold) {
      let dealt = false;
      const defeatedByRidgepole: string[] = [];
      const nextEnemies = workingState.enemies.map((enemy) => {
        if (enemy.currentHp <= 0) return enemy;
        dealt = true;
        const nextHp = Math.max(0, enemy.currentHp - effectiveRidgepoleDamage);
        if (enemy.currentHp > 0 && nextHp <= 0) {
          defeatedByRidgepole.push(enemy.templateId);
        }
        if (enemy.currentHp - nextHp > 0) {
          pushPopup(`-${effectiveRidgepoleDamage}`, 'enemy', 'damage');
          playSe('attack');
        }
        return { ...enemy, currentHp: nextHp };
      });
      if (dealt) {
        workingState = { ...workingState, enemies: nextEnemies };
        pushPopup('🎌 棟上げ発動！', 'player', 'buff');
        defeatedByRidgepole.forEach((templateId) => recordEnemyDefeated(templateId));
      }
      if (workingState.enemies.every((enemy) => enemy.currentHp <= 0)) {
        const reward = workingState.enemies.reduce((sum, enemy) => sum + getEnemyReward(enemy.templateId), 0);
        const nextMental = Math.min(
          getEffectiveMaxMental(workingState.player),
          workingState.player.mental + 1,
        );
        const revertedVictory = applyBattleCardReverts(workingState);
        setVictoryRewardGold(reward);
        setVictoryMentalRecovery(nextMental - workingState.player.mental);
        setGameState({
          ...revertedVictory,
          phase: 'victory',
          timeline: [],
          player: {
            ...clearBattleFlags(workingState.player),
            gold: workingState.player.gold + reward,
            mental: nextMental,
          },
        });
        setBattleMessage('勝利！');
        options?.onBattleFinished?.();
        options?.onBattleEnd?.({
          outcome: 'victory',
          player: {
            ...clearBattleFlags(workingState.player),
            gold: workingState.player.gold + reward,
            mental: nextMental,
          },
          deck: [
            ...revertedVictory.drawPile,
            ...revertedVictory.discardPile,
            ...revertedVictory.hand,
            ...revertedVictory.reserved,
            ...revertedVictory.exhaustedCards,
            ...revertedVictory.activePowers,
            ...revertedVictory.toolSlots.map((slot) => slot.card),
          ],
          items: battleItems,
          defeatedEnemies: workingState.enemies,
          rewardGold: reward,
          mentalRecovery: nextMental - workingState.player.mental,
          kind: options?.setup?.kind ?? 'battle',
          battleTurns: workingState.turn,
          rankingEnemyAttackHpDamageSum: rankingEnemyAttackHpDamageRef.current,
        });
        return;
      }
    }

    setGameState({ ...workingState, timeline: [] });
    setBattleMessage('敵の行動');
    await wait(380);

    let lastAttackerName = '';
    enemyActions: for (let ei = 0; ei < workingState.enemies.length; ei += 1) {
      if (workingState.player.currentHp <= 0) break;
      const enemy = workingState.enemies[ei];
      if (enemy.currentHp <= 0) continue;
      const blockBeforeEnemy = workingState.player.block;
      const result = executeEnemyTurn(enemy, workingState.player);
      if (ENEMY_DEBUFF_INTENT_TYPES.includes(result.intentType)) {
        playSe('enemy_debuff');
      }
      const revivalOutcome = applyRevivalIfNeeded(result.player);
      workingState = {
        ...workingState,
        player: revivalOutcome.player,
        maxTime: getMaxTime(revivalOutcome.player.mental, revivalOutcome.player.timeBonusPerTurn),
        enemies: workingState.enemies.map((item) =>
          item.id === enemy.id ? result.enemyBeforeDot : item,
        ),
      };
      if (revivalOutcome.revived) {
        pushPopup('🔄 七転び八起き！', 'player', 'buff');
        triggerRevivalEffect();
      }
      if (result.intentType === 'attack') {
        const damageTaken = result.damageToPlayer;
        if (damageTaken === 0 && blockBeforeEnemy > result.player.block) {
          playSe('shield');
        } else if (damageTaken > 0) {
          playSe('damage');
        }
        if (result.attackFullyBlocked) {
          options?.onRankingScore?.(10);
        }
      }
      if (result.damageToPlayer > 0) {
        rankingEnemyAttackHpDamageRef.current += result.damageToPlayer;
        lastAttackerName = enemy.name;
        workingState = {
          ...workingState,
          player: {
            ...workingState.player,
            currentTurnDamageTaken: workingState.player.currentTurnDamageTaken + result.damageToPlayer,
          },
        };
        setIsPlayerHit(true);
        pushPopup(`-${result.damageToPlayer}`, 'player', 'damage');
      } else {
        pushPopup(result.log, 'player', 'enemy_action');
      }
      if (result.mentalDamageToPlayer > 0) {
        setIsMentalHit(true);
        pushPopup(`🧠-${result.mentalDamageToPlayer}`, 'player', 'buff');
      }
      if (result.goldStolen > 0) {
        playSe('gold_lost');
        pushPopup(`💰-${result.goldStolen}G 盗まれた！`, 'player', 'damage');
      }
      if (result.addCurse) {
        const hasCurseImmunity =
          !curseImmunityUsed &&
          battleOmamoris.some(
            (omamori) => omamori.effect.type === 'passive' && omamori.effect.stat === 'curse_immunity',
          );
        if (hasCurseImmunity) {
          setCurseImmunityUsed(true);
          pushPopup('🧧 呪いを無効化', 'player', 'buff');
        } else {
          const curseCard: Card = {
            ...CURSE_CARD,
            id: `${CURSE_CARD.id}_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
          };
          workingState = {
            ...workingState,
            pendingCurseCards: [...(workingState.pendingCurseCards ?? []), curseCard],
          };
          pushPopup('🌑 呪いカード追加！', 'player', 'damage');
        }
      }
      if (result.enemyBeforeDot.currentHp > enemy.currentHp) {
        playSe('heal');
        pushPopup(`💚+${result.enemyBeforeDot.currentHp - enemy.currentHp}HP`, enemy.id, 'buff');
      }
      setBattleMessage(result.log);
      setGameState({ ...workingState });
      const moreLivingEnemiesAfter = workingState.enemies.some(
        (e, idx) => idx > ei && e.currentHp > 0,
      );
      await wait(
        moreLivingEnemiesAfter ? MS_AFTER_ENEMY_ACTION_DISPLAY : MS_AFTER_LAST_ENEMY_ACTION_DISPLAY,
      );
      setIsPlayerHit(false);
      setIsMentalHit(false);

      if (workingState.player.currentHp <= 0) {
        workingState = {
          ...workingState,
          enemies: workingState.enemies.map((item) =>
            item.id === enemy.id ? result.enemy : item,
          ),
        };
        setGameState({ ...workingState });
        dotSequenceInProgressRef.current = false;
        break enemyActions;
      }

      const dotTickBonus = workingState.player.relicEnemyDotTickBonus ?? 0;
      const enemyDotQueue = buildEnemyDotStepQueue(result.enemyBeforeDot, dotTickBonus);
      if (enemyDotQueue.length > 0) {
        await wait(
          moreLivingEnemiesAfter ? MS_AFTER_ENEMY_ACTION_TO_FIRST_DOT : MS_AFTER_LAST_ENEMY_TO_SELF_DOT,
        );
        let eEnemy = result.enemyBeforeDot;
        for (let di = 0; di < enemyDotQueue.length; di += 1) {
          if (workingState.player.currentHp <= 0) {
            eEnemy = finalizeEnemyAfterDotTicks(eEnemy);
            workingState = {
              ...workingState,
              enemies: workingState.enemies.map((item) => (item.id === enemy.id ? eEnemy : item)),
            };
            setGameState({ ...workingState });
            dotSequenceInProgressRef.current = false;
            break enemyActions;
          }
          if (di > 0) {
            const prev = enemyDotQueue[di - 1];
            const cur = enemyDotQueue[di];
            await wait(
              prev.kind === 'burn' && cur.kind === 'poison'
                ? MS_AFTER_BURN_PHASE_BEFORE_POISON
                : MS_BETWEEN_SAME_KIND_DOT,
            );
          }
          const tick = applyOneEnemyDotTick(eEnemy, dotTickBonus);
          if (!tick) break;
          eEnemy = tick.nextEnemy;
          pushPopup(
            tick.step.kind === 'burn' ? `🔥-${tick.step.damage}` : `☠️-${tick.step.damage}`,
            enemy.id,
            tick.step.kind === 'burn' ? 'burn' : 'poison',
          );
          setHitEnemyId(enemy.id);
          window.setTimeout(() => setHitEnemyId(null), 400);
          workingState = {
            ...workingState,
            enemies: workingState.enemies.map((item) => (item.id === enemy.id ? eEnemy : item)),
          };
          setGameState({ ...workingState });
          if (eEnemy.currentHp <= 0) {
            eEnemy = finalizeEnemyAfterDotTicks(eEnemy);
            workingState = {
              ...workingState,
              enemies: workingState.enemies.map((item) => (item.id === enemy.id ? eEnemy : item)),
            };
            setGameState({ ...workingState });
            break;
          }
        }
        if (eEnemy.currentHp > 0) {
          eEnemy = finalizeEnemyAfterDotTicks(eEnemy);
          workingState = {
            ...workingState,
            enemies: workingState.enemies.map((item) => (item.id === enemy.id ? eEnemy : item)),
          };
          setGameState({ ...workingState });
        }
      } else {
        const finalizedEnemy = finalizeEnemyAfterDotTicks(result.enemyBeforeDot);
        workingState = {
          ...workingState,
          enemies: workingState.enemies.map((item) =>
            item.id === enemy.id ? finalizedEnemy : item,
          ),
        };
        setGameState({ ...workingState });
      }

      if (workingState.enemies.every((e) => e.currentHp <= 0)) {
        const reward = workingState.enemies.reduce((sum, e) => sum + getEnemyReward(e.templateId), 0);
        const nextMental = Math.min(
          getEffectiveMaxMental(workingState.player),
          workingState.player.mental + 1,
        );
        const revertedVictory = applyBattleCardReverts(workingState);
        setVictoryRewardGold(reward);
        setVictoryMentalRecovery(nextMental - workingState.player.mental);
        setGameState({
          ...revertedVictory,
          phase: 'victory',
          timeline: [],
          player: {
            ...clearBattleFlags(workingState.player),
            gold: workingState.player.gold + reward,
            mental: nextMental,
          },
        });
        setBattleMessage('勝利！');
        options?.onBattleFinished?.();
        options?.onBattleEnd?.({
          outcome: 'victory',
          player: {
            ...clearBattleFlags(workingState.player),
            gold: workingState.player.gold + reward,
            mental: nextMental,
          },
          deck: [
            ...revertedVictory.drawPile,
            ...revertedVictory.discardPile,
            ...revertedVictory.hand,
            ...revertedVictory.reserved,
            ...revertedVictory.exhaustedCards,
            ...revertedVictory.activePowers,
            ...revertedVictory.toolSlots.map((slot) => slot.card),
          ],
          items: battleItems,
          defeatedEnemies: workingState.enemies,
          rewardGold: reward,
          mentalRecovery: nextMental - workingState.player.mental,
          kind: options?.setup?.kind ?? 'battle',
          battleTurns: workingState.turn,
          rankingEnemyAttackHpDamageSum: rankingEnemyAttackHpDamageRef.current,
        });
        return;
      }

      if (workingState.player.currentHp <= 0) break;
    }

    if (workingState.player.currentHp <= 0) {
      const defeatedByLabel = lastAttackerName || '敵';
      if (options?.canOfferDefeatRevive) {
        pendingDefeatRef.current = { snapshot: workingState, defeatedBy: defeatedByLabel };
        clearBattleState();
        clearSavedProgress();
        if (!getAdsRemoved()) setPendingDefeatInterstitial(true);
        setGameState({
          ...workingState,
          phase: 'defeat_offer_revive',
          player: clearBattleFlags(workingState.player),
        });
        setBattleMessage('敗北...');
        return;
      }
      setGameState({
        ...workingState,
        phase: 'defeat',
        player: clearBattleFlags(workingState.player),
      });
      setBattleMessage('敗北...');
      options?.onBattleFinished?.();
      options?.onBattleEnd?.(buildDefeatBattleResult(workingState, defeatedByLabel));
      return;
    }

    await wait(MS_AFTER_ENEMY_TURN_END);

    const playerDotQueue = buildPlayerDotStepQueue(workingState.player);
    let dotLethal: 'burn' | 'poison' | undefined;
    if (playerDotQueue.length > 0) {
      dotSequenceInProgressRef.current = true;
    }
    try {
      if (playerDotQueue.length > 0) {
        await wait(MS_AFTER_ENEMY_TURN_TO_PLAYER_FIRST_DOT);
        let p = workingState.player;
        let burnTicks = 0;
        let poisonTicks = 0;

        for (let di = 0; di < playerDotQueue.length; di += 1) {
          if (p.currentHp <= 0) break;
          if (di > 0) {
            const prev = playerDotQueue[di - 1];
            const cur = playerDotQueue[di];
            await wait(
              prev.kind === 'burn' && cur.kind === 'poison'
                ? MS_AFTER_BURN_PHASE_BEFORE_POISON
                : MS_BETWEEN_SAME_KIND_DOT,
            );
          }
          const tick = applyOnePlayerDotTick(p);
          if (!tick) break;
          p = tick.nextPlayer;
          if (tick.step.kind === 'burn') {
            burnTicks += 1;
            setDotBurnFlash(true);
            window.setTimeout(() => setDotBurnFlash(false), 320);
            pushPopup(`🔥-${tick.step.damage}`, 'player', 'burn');
          } else {
            poisonTicks += 1;
            setDotPoisonFlash(true);
            window.setTimeout(() => setDotPoisonFlash(false), 320);
            pushPopup(`☠️-${tick.step.damage}`, 'player', 'poison');
          }
          workingState = { ...workingState, player: p };
          setGameState({ ...workingState });
          if (p.currentHp <= 0) {
            dotLethal = tick.step.kind === 'burn' ? 'burn' : 'poison';
            break;
          }
        }

        if (p.currentHp > 0 && (burnTicks > 0 || poisonTicks > 0)) {
          await wait(MS_AFTER_ALL_DOT_BEFORE_DRAW);
        }

        if (p.currentHp > 0) {
          p = finalizePlayerTurnStartFromPostDotPlayer(p);
          workingState = { ...workingState, player: p };
          setGameState({ ...workingState });
        }
      }

      if (workingState.player.currentHp <= 0 && playerDotQueue.length > 0) {
        const defeatedByDot = dotLethal === 'poison' ? '毒' : '火傷';
        if (options?.canOfferDefeatRevive) {
          pendingDefeatRef.current = { snapshot: workingState, defeatedBy: defeatedByDot };
          clearBattleState();
          clearSavedProgress();
          if (!getAdsRemoved()) setPendingDefeatInterstitial(true);
          setGameState({
            ...workingState,
            phase: 'defeat_offer_revive',
            player: clearBattleFlags(workingState.player),
          });
          setBattleMessage('敗北...');
          return;
        }
        setGameState({
          ...workingState,
          phase: 'defeat',
          player: clearBattleFlags(workingState.player),
        });
        setBattleMessage('敗北...');
        options?.onBattleFinished?.();
        options?.onBattleEnd?.(buildDefeatBattleResult(workingState, defeatedByDot));
        return;
      }

      const dotPre =
        playerDotQueue.length > 0 && workingState.player.currentHp > 0
          ? { currentHp: workingState.player.currentHp, statusEffects: workingState.player.statusEffects }
          : undefined;
      const next = moveToNextTurn(workingState, dotPre);
      const onTurnStartBlockBonus = getOmamoriBonus(battleOmamoris, 'on_turn_start', 'block');
      if (onTurnStartBlockBonus > 0 && next.player.canBlock) {
        pushPopup(`⛑️ +${onTurnStartBlockBonus}ブロック`, 'player', 'buff');
      }

      if (next.player.currentHp <= 0) {
        const defeatedByDot = dotLethal === 'poison' ? '毒' : '火傷';
        if (options?.canOfferDefeatRevive) {
          pendingDefeatRef.current = { snapshot: next, defeatedBy: defeatedByDot };
          clearBattleState();
          clearSavedProgress();
          if (!getAdsRemoved()) setPendingDefeatInterstitial(true);
          setGameState({
            ...next,
            phase: 'defeat_offer_revive',
            player: clearBattleFlags(next.player),
          });
          setBattleMessage('敗北...');
          return;
        }
        setGameState({ ...next, phase: 'defeat', player: clearBattleFlags(next.player) });
        setBattleMessage('敗北...');
        options?.onBattleFinished?.();
        options?.onBattleEnd?.(buildDefeatBattleResult(next, defeatedByDot));
        return;
      }

      setGameState(next);
      setLastPlayedCard(null);
      setBattleMessage('次のターン');
      options?.onTurnStart?.(next);
    } finally {
      dotSequenceInProgressRef.current = false;
    }
  }

  const upgradeHandCardById = (cardId: string): boolean => {
    if (activePendingHandUpgradeCount <= 0) return false;
    let upgraded = false;
    setGameState((prev) => {
      const target = prev.hand.find((card) => card.id === cardId);
      if (!target || target.upgraded || target.type === 'status' || target.type === 'curse') return prev;
      upgraded = true;
      return {
        ...prev,
        hand: prev.hand.map((card) =>
          card.id === cardId ? upgradeCardByJobId(card, gameState.player.jobId) : card,
        ),
      };
    });
    if (!upgraded) return false;
    setPendingHandUpgradeCount((prev) => Math.max(0, prev - 1));
    pushPopup('🔧 カード強化！', 'player', 'buff');
    return true;
  };

  const skipHandUpgradeSelection = () => {
    setPendingHandUpgradeCount(0);
  };

  const confirmPickFromDiscard = (displayIndex: number): void => {
    if (pendingDiscardPicks <= 0) return;
    if (dotSequenceInProgressRef.current) return;
    let picked = false;
    setGameState((prev) => {
      if (prev.phase !== 'player_turn') return prev;
      const pile = prev.discardPile;
      if (pile.length === 0) return prev;
      const realIdx = pile.length - 1 - displayIndex;
      if (realIdx < 0 || realIdx >= pile.length) return prev;
      const card = pile[realIdx];
      if (discardPickIngredientOnly && !isIngredientCard(card)) {
        pushPopup('食材カードを選んでください', 'player', 'buff');
        return prev;
      }
      picked = true;
      return {
        ...prev,
        hand: [...prev.hand, card],
        discardPile: pile.filter((_, i) => i !== realIdx),
      };
    });
    if (picked) {
      setPendingDiscardPicks((p) => {
        const next = Math.max(0, p - 1);
        if (next === 0) setDiscardPickIngredientOnly(false);
        return next;
      });
      playSe('card');
    }
  };

  useEffect(() => {
    endTurnRef.current = endTurn;
    pushPopupRef.current = pushPopup;
  });

  const retryBattle = (): void => {
    pendingDefeatRef.current = null;
    setGameState(createInitialGameState(options?.setup));
    setSelectedCardId(null);
    setSellingCardId(null);
    setReturningCardId(null);
    setCoinBursts([]);
    setBattlePopups([]);
    setBattleMessage('戦闘開始！');
    setShowStartBanner(true);
    setHitEnemyId(null);
    setIsPlayerHit(false);
    setDotBurnFlash(false);
    setDotPoisonFlash(false);
    setIsMentalHit(false);
    setShieldEffect(false);
    setLastPlayedCard(null);
    setVictoryRewardGold(0);
    setVictoryMentalRecovery(0);
    setBattleItems(options?.setup?.items ?? []);
    setAttackItemBuff(null);
    setDoubleNextCharges(0);
    setDoubleNextReplayCharges(0);
    setHungryFlash(null);
    setShowRevivalEffect(false);
    setPendingHandUpgradeCount(0);
    setPendingDiscardPicks(0);
    setDiscardPickIngredientOnly(false);
    setCurseImmunityUsed(false);
    prevHungryStateRef.current = 'normal';
  };

  const concedeBattle = (): void => {
    if (!['battle_start', 'player_turn', 'enemy_turn', 'executing'].includes(gameState.phase)) return;
    const reverted = applyBattleCardReverts(gameState);
    const clearedPlayer = clearBattleFlags(reverted.player);
    const deck = [
      ...reverted.drawPile,
      ...reverted.discardPile,
      ...reverted.hand,
      ...reverted.reserved,
      ...reverted.exhaustedCards,
      ...reverted.activePowers,
      ...reverted.toolSlots.map((slot) => slot.card),
    ];
    setSelectedCardId(null);
    setGameState({
      ...reverted,
      phase: 'defeat',
      timeline: [],
      player: clearedPlayer,
    });
    setBattleMessage('敗北...');
    options?.onBattleFinished?.();
    options?.onBattleEnd?.({
      outcome: 'defeat',
      player: clearedPlayer,
      deck,
      items: battleItems,
      defeatedEnemies: gameState.enemies,
      rewardGold: 0,
      mentalRecovery: 0,
      kind: options?.setup?.kind ?? 'battle',
      battleTurns: gameState.turn,
      defeatedBy: '撤退',
    });
  };

  return {
    gameState,
    selectedCardId,
    selectedCard,
    lastPlayedCard,
    remainingTime,
    canPlayCard,
    sellingCardId,
    returningCardId,
    isPlayerHit,
    dotBurnFlash,
    dotPoisonFlash,
    isMentalHit,
    hitEnemyId,
    shieldEffect,
    canSellInBattle: CARPENTER_CAN_SELL_IN_BATTLE,
    showStartBanner,
    battlePopups,
    battleMessage,
    coinBursts,
    enemyIntents,
    isDandoriReady,
    victoryRewardGold,
    victoryMentalRecovery,
    battleItems,
    hungryState,
    hungryFlash,
    showRevivalEffect,
    pendingHandUpgradeCount: activePendingHandUpgradeCount,
    pendingDiscardPicks,
    discardPickIngredientOnly,
    upgradeableHandCards,
    doubleNextCharges,
    doubleNextReplayCharges,
    attackItemBuff,
    selectCard,
    playCardInstant,
    reserveCardById,
    sellCardById,
    useBattleItem,
    upgradeHandCardById,
    confirmPickFromDiscard,
    skipHandUpgradeSelection,
    endTurn,
    concedeBattle,
    retryBattle,
    giveUpDefeatOffer,
    reviveAfterDefeatOffer,
    showDefeatReviveModal: gameState.phase === 'defeat_offer_revive',
  };
};
