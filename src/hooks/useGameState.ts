import { useEffect, useMemo, useRef, useState } from 'react';
import { ANXIETY_CARD, CURSE_CARD } from '../data/carpenterDeck';
import { getJobConfig } from '../data/jobs';
import { createRandomEncounter } from '../data/enemies';
import { applyOneToolSlotToPlayer, useBattleLogic } from './useBattleLogic';
import { clearBattleState } from '../utils/battleSave';
import { clearSavedProgress } from './useRunProgress';
import { getAdsRemoved, setPendingDefeatInterstitial } from '../utils/adsRemoved';
import type { CardResolveResult } from './useBattleLogic';
import { useEnemyAI } from './useEnemyAI';
import type { Card, EnemyIntent, EnemyIntentType, GameState, JobId, PlayerState } from '../types/game';
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
import { applyDebugEnemyHp1ToEnemies } from '../utils/debugEnemyHp1';
import { recordEnemyDefeated, recordEnemyEncounter } from '../utils/enemyRecord';
import {
  canPlaySelfDamageBadgeCard,
  cardExhaustsWhenPlayed,
  exhaustsWhenIdleInReserveAtTurnStart,
  reserveBonusActiveForCard,
} from '../utils/cardBadgeRules';
import { applyMultiplierAndBoostToCard, getEnhancedCardForPlay } from '../utils/playCardMultipliers';

const MAX_RESERVED = 2;
const RESERVE_TIME_PENALTY = 1.5;
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
  kind: 'damage' | 'block' | 'buff' | 'dandori' | 'enemy_action';
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

const mergeCardResolveResults = (a: CardResolveResult, b: CardResolveResult): CardResolveResult => ({
  player: b.player,
  enemies: b.enemies,
  targetEnemyId: b.targetEnemyId ?? a.targetEnemyId,
  damage: a.damage + b.damage,
  blockGained: a.blockGained + b.blockGained,
  scaffoldGained: a.scaffoldGained + b.scaffoldGained,
  cookingGaugeGained: a.cookingGaugeGained + b.cookingGaugeGained,
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
  firstIngredientUsedThisTurn: player.firstIngredientUsedThisTurn ?? false,
  nextAttackBoostValue: player.nextAttackBoostValue ?? 0,
  nextAttackBoostCount: player.nextAttackBoostCount ?? 0,
  nextCardBlockMultiplier: player.nextCardBlockMultiplier ?? 1,
  timeBonusPerTurn: player.timeBonusPerTurn ?? 0,
  attackDamageBonusAllAttacks: player.attackDamageBonusAllAttacks ?? 0,
  fullSprintUsedCount: 0,
  mentalMaxBonus: player.mentalMaxBonus ?? 0,
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
  const startDrawBonus = getOmamoriBonus(setup?.omamoris ?? [], 'start_of_battle', 'draw');
  const startBlockBonus =
    getOmamoriBonus(setup?.omamoris ?? [], 'start_of_battle', 'block') +
    getOmamoriBonus(setup?.omamoris ?? [], 'on_turn_start', 'block');
  const startTimeBonus = getOmamoriBonus(setup?.omamoris ?? [], 'start_of_battle', 'time');
  const drawResult = drawCards(deck, [], DRAW_COUNT + Math.max(0, startDrawBonus));
  const basePlayer = setup?.player ?? {
    jobId: initialJobId,
    maxHp: fallbackConfig.initialHp,
    currentHp: fallbackConfig.initialHp,
    block: 0,
    gold: 0,
    scaffold: 0,
    cookingGauge: 0,
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
    firstIngredientUsedThisTurn: false,
    nextAttackBoostValue: 0,
    nextAttackBoostCount: 0,
    nextCardBlockMultiplier: 1,
    timeBonusPerTurn: 0,
    nextCardDoubleEffect: false,
    attackDamageBonusAllAttacks: 0,
    nextCardEffectBoost: 0,
  };

  const initialAnxietyHand = rollAnxietyCardsForDrawCount(
    drawResult.drawn.length,
    (basePlayer.mental ?? 0) <= 0,
  );

  return {
    phase: 'battle_start',
    turn: 1,
    maxTime: getMaxTime(basePlayer.mental, basePlayer.timeBonusPerTurn ?? 0) + Math.max(0, startTimeBonus),
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
      block: (basePlayer.block ?? 0) + Math.max(0, startBlockBonus),
      cookingGauge: 0,
      statusEffects: [...basePlayer.statusEffects],
    }),
    // DEV ONLY — 確認後削除（debugEnemyHp1.ts）
    enemies: applyDebugEnemyHp1ToEnemies(
      encounter.map((enemy) => ({ ...enemy, statusEffects: [...enemy.statusEffects] })),
    ),
    executingIndex: -1,
    toolSlots: [],
    battleCardRevertMap: {},
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
  const [curseImmunityUsed, setCurseImmunityUsed] = useState(false);
  const canPlayWithHandCondition = (card: Card, hand: Card[]): boolean => {
    const isSoloPlayOnlyCard = card.tags?.includes('solo_play_only') ?? false;
    if (!isSoloPlayOnlyCard) return true;
    return hand.length === 1 && hand[0]?.id === card.id;
  };

  const battleOmamoris = options?.setup?.omamoris ?? [];
  const prevHungryStateRef = useRef<'normal' | 'hungry' | 'awakened'>('normal');
  const endTurnRef = useRef<() => Promise<void>>(async () => {});
  const pushPopupRef = useRef<(text: string, target: 'player' | 'enemy' | string, kind: BattlePopup['kind']) => void>(
    () => {},
  );

  useEffect(() => {
    if (!options?.setup) return;
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

  function pushPopup(text: string, target: 'player' | 'enemy' | string, kind: BattlePopup['kind']) {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setBattlePopups((prev) => [...prev, { id, text, target, kind }]);
    const duration = kind === 'enemy_action' ? 2200 : 720;
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
    block: 0,
    scaffold: 0,
    cookingGauge: 0,
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
    firstIngredientUsedThisTurn: false,
    nextAttackBoostValue: 0,
    nextAttackBoostCount: 0,
    nextCardBlockMultiplier: 1,
    nextCardDoubleEffect: false,
    nextCardEffectBoost: 0,
    attackDamageBonusAllAttacks: 0,
    fullSprintUsedCount: 0,
  });

  const selectedCard = useMemo(
    () => gameState.hand.find((card) => card.id === selectedCardId) ?? null,
    [gameState.hand, selectedCardId],
  );
  const remainingTime = gameState.maxTime - gameState.usedTime;
  const canPlayCard = (card: Card): boolean => {
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

  const selectCard = (cardId: string): void => {
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
    const isReserveDoubleNextPlay =
      (enhancedCard.effects ?? []).some((effect) => effect.type === 'reserve_double_next') ?? false;
    const shouldUseTenBoost =
      reserveOrDoubleMultiplier <= 1 && nextCardEffectBoostRate > 0 && !isReserveDoubleNextPlay;
    const multipliedCard = applyMultiplierAndBoostToCard(enhancedCard, gameState.player, doubleNextCharges, {
      ignoreDoubleMultiplier: replayActive,
    });

    const enemiesBefore = gameState.enemies.map((enemy) => ({ id: enemy.id, hp: enemy.currentHp, templateId: enemy.templateId }));

    const buffedCard =
      attackItemBuff && attackItemBuff.charges > 0 && multipliedCard.type === 'attack'
        ? { ...multipliedCard, damage: (multipliedCard.damage ?? 0) + attackItemBuff.value }
        : multipliedCard;
    const playedCard: Card = { ...buffedCard, wasReserved: false, reservedThisTurn: false };
    // 捨て札/除外には温存ボーナス適用前の基礎値を保持する
    const cardForDiscard: Card = { ...card, wasReserved: false, reservedThisTurn: false };

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
        return { ...result.player, threeStarActive: true };
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
      return p;
    })();

    const drawAmountBase = (playedCard.effects ?? [])
      .filter((effect) => effect.type === 'draw')
      .reduce((sum, effect) => sum + effect.value, 0);
    const drawAmount = replayActive ? drawAmountBase * 2 : drawAmountBase;
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
    const drawResult =
      drawAmount > 0
        ? drawCards(gameState.drawPile, gameState.discardPile, drawAmount, equippedIdsForDraw)
        : { drawn: [] as Card[], drawPile: gameState.drawPile, discardPile: gameState.discardPile, shuffled: false };

    const newlyDefeated = result.enemies.filter((enemy) => {
      const before = enemiesBefore.find((item) => item.id === enemy.id);
      return Boolean(before && before.hp > 0 && enemy.currentHp <= 0);
    });
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
    const allEnemiesDead = result.enemies.every((enemy) => enemy.currentHp <= 0);
    const gainedDoubleNext = (playedCard.effects ?? [])
      .filter((effect) => effect.type === 'double_next')
      .reduce((sum, effect) => sum + effect.value, 0);
    const gainedDoubleReplay = (playedCard.effects ?? [])
      .filter((effect) => effect.type === 'double_next_replay')
      .reduce((sum, effect) => sum + effect.value, 0);
    const shouldExhaust = cardExhaustsWhenPlayed(card, cardWasReserved);
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
    const exhaustedCards = shouldExhaust
      ? [...gameState.exhaustedCards, cardForDiscard]
      : gameState.exhaustedCards;
    const discardPile =
      playedCard.type === 'tool' || playedCard.type === 'power' || shouldExhaust
        ? drawResult.discardPile
        : [...drawResult.discardPile, cardForDiscard];
    const drawPileDisplayOrder = nextDrawPileDisplayOrder(
      gameState.drawPileDisplayOrder,
      gameState.drawPile,
      drawResult.drawPile,
      drawResult.shuffled,
    );
    const postCardState: GameState = {
      ...gameState,
      discardPile,
      drawPile: drawResult.drawPile,
      drawPileDisplayOrder,
      exhaustedCards,
      player: playerAfterKill,
      enemies: result.enemies,
      activePowers,
      toolSlots: result.equippedTool ? equipTool(result.equippedTool, gameState.toolSlots) : gameState.toolSlots,
      hand: handAfterPlay,
      usedTime: gameState.usedTime + effectiveTimeCost,
      maxTime: gameState.maxTime + timeBoost + mentalTimeDelta,
      shuffleAnimation: drawResult.shuffled,
      battleCardRevertMap,
    };

    const nextCardDoubleConsumed = gameState.player.nextCardDoubleEffect && reserveOrDoubleMultiplier > 1;
    const nextCardEffectBoostConsumed = shouldUseTenBoost;
    const playedReserveDoubleCardNormally =
      !cardWasReserved &&
      ((playedCard.effects ?? []).some((effect) => effect.type === 'reserve_double_next') ?? false);
    const nextCardEffectBoostAfterPlay = playedReserveDoubleCardNormally
      ? 0.1
      : nextCardEffectBoostConsumed
        ? 0
        : (playerAfterKill.nextCardEffectBoost ?? 0);
    setGameState((prev) => ({
      ...prev,
      hand: handAfterPlay,
      discardPile,
      drawPile: drawResult.drawPile,
      drawPileDisplayOrder: nextDrawPileDisplayOrder(
        prev.drawPileDisplayOrder,
        prev.drawPile,
        drawResult.drawPile,
        drawResult.shuffled,
      ),
      exhaustedCards,
      player: {
        ...playerAfterKill,
        nextCardDoubleEffect: nextCardDoubleConsumed ? false : playerAfterKill.nextCardDoubleEffect,
        nextCardEffectBoost: nextCardEffectBoostAfterPlay,
      },
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

    setLastPlayedCard(playedCard);
    setSelectedCardId(null);
    if (playedCard.tags?.includes('aoe')) {
      for (const enemy of result.enemies) {
        const before = enemiesBefore.find((item) => item.id === enemy.id);
        if (!before) continue;
        const dealt = Math.max(0, before.hp - enemy.currentHp);
        if (dealt > 0) {
          pushPopup(`-${dealt}`, 'enemy', 'damage');
        }
      }
    } else if (result.multiHitJabs && result.multiHitJabs.length > 0) {
      const multiHitStaggerMs = 280;
      result.multiHitJabs.forEach((jab, i) => {
        window.setTimeout(() => {
          setHitEnemyId(jab.enemyId);
          pushPopup(`-${jab.damage}`, 'enemy', 'damage');
          window.setTimeout(() => setHitEnemyId(null), 260);
        }, i * multiHitStaggerMs);
      });
    } else if (result.damage > 0 && result.targetEnemyId) {
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
    if (result.scaffoldGained > 0) {
      pushPopup(`+${result.scaffoldGained}足場`, 'player', 'buff');
    }
    if (result.cookingGaugeGained > 0) {
      pushPopup(`+${result.cookingGaugeGained}🍳`, 'player', 'buff');
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
    /** 勝利のお守り等の on_kill 回復だけでは回復SEを鳴らさない（カード回復・敵回復は従来どおり） */
    const shouldPlayHealSe =
      anyEnemyHpIncreasedForHealSe || (playerHpIncreasedOverall && playerHpIncreasedFromCardResolve);
    if (shouldPlayHealSe) {
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
        });
      }, 500);
    }
    return { played: true, blockGained: result.blockGained, multiHitJabs: result.multiHitJabs };
  };

  const useBattleItem = (itemId: string): boolean => {
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
    if (gameState.phase !== 'player_turn') return false;
    if (activePendingHandUpgradeCount > 0) return false;

    /** 手札の有無は古い gameState のクロージャではなく、更新関数の prev だけで判定する（取りこぼしで false になり温存SEが鳴らないのを防ぐ） */
    let didReserve = false;
    setGameState((prev) => {
      if (prev.phase !== 'player_turn') return prev;
      if (prev.reserved.length >= MAX_RESERVED) return prev;
      const card = prev.hand.find((item) => item.id === cardId);
      if (!card || card.type === 'status' || card.type === 'curse') return prev;
      didReserve = true;
      const hasReserveDouble = card.effects?.some((e) => e.type === 'reserve_double_next') ?? false;
      const reservedCard: Card = {
        ...card,
        wasReserved: false,
        reservedThisTurn: true,
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
        player: {
          ...prev.player,
          nextCardDoubleEffect: hasReserveDouble ? true : prev.player.nextCardDoubleEffect,
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
    }, SELL_ANIMATION_MS);
    return true;
  };

  const moveToNextTurn = (state: GameState): GameState => {
    const cliffEdgeAwakened =
      state.player.cliffEdgeActive &&
      state.player.jobId === 'unemployed' &&
      getHungryState(state.player) === 'awakened';
    const cliffEdgeTimeBonus = cliffEdgeAwakened ? 1 : 0;
    const cliffEdgeDrawBonus = cliffEdgeAwakened ? 2 : 0;
    const onTurnStartDrawBonus = getOmamoriBonus(battleOmamoris, 'on_turn_start', 'draw');
    const onTurnStartBlockBonus = getOmamoriBonus(battleOmamoris, 'on_turn_start', 'block');
    const nextMaxTime = Math.max(
      3,
      getMaxTime(state.player.mental, state.player.timeBonusPerTurn) +
        cliffEdgeTimeBonus -
        state.player.nextTurnTimePenalty,
    );
    const scaffoldPerTurn = state.activePowers
      .flatMap((power) => power.effects ?? [])
      .filter((effect) => effect.type === 'scaffold_per_turn')
      .reduce((sum, effect) => sum + effect.value, 0);
    const blockPersistTurns = state.player.blockPersistTurns ?? 0;
    const keepBlock = blockPersistTurns > 0;
    const nextBlockPersistTurns = keepBlock ? Math.max(0, blockPersistTurns - 1) : 0;
    const shouldDisableBlockThisTurn = state.player.nextTurnNoBlock;

    // プレイヤーのburn（火傷）ダメージ処理
    let playerHpAfterBurn = state.player.currentHp;
    let burnDamageTotal = 0;
    for (const status of state.player.statusEffects) {
      if (status.type === 'burn' && status.duration > 0 && status.value > 0) {
        burnDamageTotal += status.value;
        playerHpAfterBurn = Math.max(0, playerHpAfterBurn - status.value);
      }
    }

    // プレイヤーの状態異常ターン経過処理
    const tickedPlayerStatuses = state.player.statusEffects
      .map((status) => {
        if (status.type === 'vulnerable' || status.type === 'weak') {
          return { ...status, duration: status.duration - 1, value: status.value - 1 };
        }
        if (status.type === 'burn') {
          return { ...status, duration: status.duration - 1 };
        }
        return status;
      })
      .filter((status) => status.duration > 0 && status.value > 0);

    const playerAfterReset = applyToolEffects(state.toolSlots, {
      ...state.player,
      currentHp: playerHpAfterBurn,
      block:
        shouldDisableBlockThisTurn
          ? 0
          : (keepBlock ? state.player.block : 0) + Math.max(0, onTurnStartBlockBonus),
      blockPersistTurns: nextBlockPersistTurns,
      scaffold: state.player.scaffold + scaffoldPerTurn,
      canBlock: !shouldDisableBlockThisTurn,
      nextTurnNoBlock: false,
      nextTurnTimePenalty: 0,
      damageImmunityThisTurn: false,
      firstCookingUsedThisTurn: false,
      lastTurnDamageTaken: state.player.currentTurnDamageTaken,
      currentTurnDamageTaken: 0,
      firstIngredientUsedThisTurn: false,
      nextCardDoubleEffect: false,
      nextCardEffectBoost: state.player.nextCardEffectBoost ?? 0,
      statusEffects: tickedPlayerStatuses,
    });
    const powerDrawPerTurn = state.activePowers
      .flatMap((power) => power.effects ?? [])
      .filter((effect) => effect.type === 'draw_per_turn')
      .reduce((sum, effect) => sum + effect.value, 0);
    const equippedCardIds = state.toolSlots.filter((t) => t !== null).map((t) => t!.card.id);
    const drawResult = drawCards(
      shuffle([...state.drawPile].filter((c) => !isAnxietyCard(c))),
      state.discardPile,
      DRAW_COUNT + powerDrawPerTurn + cliffEdgeDrawBonus + Math.max(0, onTurnStartDrawBonus),
      equippedCardIds,
    );
    const exhaustedReserved = state.reserved.filter((c) => exhaustsWhenIdleInReserveAtTurnStart(c));
    const keptReserved = state.reserved.filter((c) => !exhaustsWhenIdleInReserveAtTurnStart(c));
    const reservedToHand = keptReserved.map((card) => ({
      ...card,
      wasReserved: Boolean(card.reservedThisTurn),
      reservedThisTurn: false,
    }));
    const exhaustedFromReserve = exhaustedReserved.map((card) => ({
      ...card,
      wasReserved: false,
      reservedThisTurn: false,
    }));
    const anxietyHandBonus = rollAnxietyCardsForDrawCount(
      drawResult.drawn.length,
      playerAfterReset.mental <= 0,
    );
    return {
      ...state,
      phase: 'player_turn',
      turn: state.turn + 1,
      maxTime: nextMaxTime,
      usedTime: 0,
      shuffleAnimation: drawResult.shuffled,
      hand: [...reservedToHand, ...drawResult.drawn, ...anxietyHandBonus],
      reserved: [],
      timeline: [],
      drawPile: drawResult.drawPile,
      drawPileDisplayOrder: createShuffledDrawPileDisplayOrder(drawResult.drawPile.length),
      discardPile: drawResult.discardPile,
      exhaustedCards: [...state.exhaustedCards, ...exhaustedFromReserve],
      player: playerAfterReset,
      executingIndex: -1,
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
    const hp = Math.max(1, Math.floor(pending.snapshot.player.maxHp * 0.5));
    const cleared = clearBattleFlags(pending.snapshot.player);
    const revivedPlayer = { ...cleared, currentHp: hp };
    const mid: GameState = { ...pending.snapshot, player: revivedPlayer };
    const nextState = moveToNextTurn(mid);
    setGameState(nextState);
    setBattleMessage('復活！');
    options?.onTurnStart?.(nextState);
  };

  async function endTurn(): Promise<void> {
    if (gameState.phase !== 'player_turn') return;
    if (activePendingHandUpgradeCount > 0) return;
    setSelectedCardId(null);
    let workingState: GameState = {
      ...gameState,
      phase: 'enemy_turn',
      executingIndex: -1,
      player: {
        ...gameState.player,
        // 同ターン内のみ有効（ターン終了で失効）
        nextAttackBoostValue: 0,
        nextAttackBoostCount: 0,
        nextAttackTimeReduce: 0,
        nextCardBlockMultiplier: 1,
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
        });
        return;
      }
    }

    setGameState({ ...workingState, timeline: [] });
    setBattleMessage('敵の行動');
    await wait(380);

    let lastAttackerName = '';
    for (let ei = 0; ei < workingState.enemies.length; ei += 1) {
      const enemy = workingState.enemies[ei];
      if (enemy.currentHp <= 0) continue;
      const result = executeEnemyTurn(enemy, workingState.player);
      if (ENEMY_DEBUFF_INTENT_TYPES.includes(result.intentType)) {
        playSe('enemy_debuff');
      }
      const revivalOutcome = applyRevivalIfNeeded(result.player);
      workingState = {
        ...workingState,
        player: revivalOutcome.player,
        maxTime: getMaxTime(revivalOutcome.player.mental, revivalOutcome.player.timeBonusPerTurn),
        enemies: workingState.enemies.map((item) => (item.id === enemy.id ? result.enemy : item)),
      };
      if (revivalOutcome.revived) {
        pushPopup('🔄 七転び八起き！', 'player', 'buff');
        triggerRevivalEffect();
      }
      if (result.damageToPlayer > 0) {
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
            discardPile: [...workingState.discardPile, curseCard],
          };
          pushPopup('🌑 呪いカード追加！', 'player', 'damage');
        }
      }
      if (result.enemy.currentHp > enemy.currentHp) {
        playSe('heal');
        pushPopup(`💚+${result.enemy.currentHp - enemy.currentHp}HP`, enemy.id, 'buff');
      }
      setBattleMessage(result.log);
      setGameState({ ...workingState });
      await wait(540);
      setIsPlayerHit(false);
      setIsMentalHit(false);
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

    // burnダメージのポップアップ通知（moveToNextTurn適用前に表示）
    const burnTotal = workingState.player.statusEffects
      .filter((s) => s.type === 'burn' && s.duration > 0 && s.value > 0)
      .reduce((sum, s) => sum + s.value, 0);
    if (burnTotal > 0) {
      pushPopup(`🔥-${burnTotal}`, 'player', 'damage');
      await wait(400);
    }

    const next = moveToNextTurn(workingState);
    const onTurnStartBlockBonus = getOmamoriBonus(battleOmamoris, 'on_turn_start', 'block');
    if (onTurnStartBlockBonus > 0 && next.player.canBlock) {
      pushPopup(`⛑️ +${onTurnStartBlockBonus}ブロック`, 'player', 'buff');
    }

    // burnダメージによる敗北判定
    if (next.player.currentHp <= 0) {
      if (options?.canOfferDefeatRevive) {
        pendingDefeatRef.current = { snapshot: next, defeatedBy: '火傷' };
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
      options?.onBattleEnd?.(buildDefeatBattleResult(next, '火傷'));
      return;
    }

    setGameState(next);
    setLastPlayedCard(null);
    setBattleMessage('次のターン');
    options?.onTurnStart?.(next);
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
    skipHandUpgradeSelection,
    endTurn,
    concedeBattle,
    retryBattle,
    giveUpDefeatOffer,
    reviveAfterDefeatOffer,
    showDefeatReviveModal: gameState.phase === 'defeat_offer_revive',
  };
};
