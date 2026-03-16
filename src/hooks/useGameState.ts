import { useEffect, useMemo, useRef, useState } from 'react';
import { ANXIETY_CARD } from '../data/carpenterDeck';
import { getJobConfig } from '../data/jobs';
import { createRandomEncounter } from '../data/enemies';
import { useBattleLogic } from './useBattleLogic';
import { useEnemyAI } from './useEnemyAI';
import type { Card, EnemyIntent, GameState, JobId, PlayerState } from '../types/game';
import type { BattleResult, BattleSetup, RunItem } from '../types/run';
import { drawCards } from '../utils/deckManager';
import { getHungryState } from '../utils/hungrySystem';
import { shuffle } from '../utils/shuffle';
import { isEnemyTargetCard } from '../utils/cardTarget';
import { getEffectiveTimeCost } from '../utils/timeline';
import { upgradeCard } from '../utils/cardUpgrade';

const MAX_RESERVED = 2;
const DRAW_COUNT = 5;
const SELL_ANIMATION_MS = 220;
const MAX_MENTAL = 10;
const INITIAL_MENTAL = 7;
const CARPENTER_CAN_SELL_IN_BATTLE = false;
const ENEMY_GOLD_REWARDS: Record<string, number> = {
  claimer: 10,
  drunk: 8,
  wildCat: 5,
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface CoinBurst {
  id: number;
}

export interface BattlePopup {
  id: number;
  text: string;
  target: 'player' | string;
  kind: 'damage' | 'block' | 'buff' | 'dandori';
}

export interface UseGameStateResult {
  gameState: GameState;
  selectedCardId: string | null;
  selectedCard: Card | null;
  lastPlayedCard: Card | null;
  remainingTime: number;
  canPlayCard: (card: Card) => boolean;
  executingCardId: string | null;
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
  selectCard: (cardId: string) => void;
  playCardInstant: (
    cardId: string,
    target: { type: 'enemy'; enemyId: string | null } | { type: 'field' },
  ) => boolean;
  reserveCardById: (cardId: string) => boolean;
  sellCardById: (cardId: string) => boolean;
  useBattleItem: (itemId: string) => boolean;
  upgradeHandCardById: (cardId: string) => boolean;
  skipHandUpgradeSelection: () => void;
  endTurn: () => Promise<void>;
  retryBattle: () => void;
}

interface UseGameStateOptions {
  setup?: BattleSetup | null;
  onBattleEnd?: (result: BattleResult) => void;
  onConsumeItem?: (itemId: string) => void;
}

const getMaxTime = (mental: number): number => Number((5 + mental * 0.3).toFixed(1));

const createAnxietyCards = (count: number): Card[] =>
  Array.from({ length: count }).map((_, idx) => ({
    ...ANXIETY_CARD,
    id: `${ANXIETY_CARD.id}_${Date.now()}_${idx}_${Math.floor(Math.random() * 9999)}`,
  }));

const getEnemyReward = (templateId: string): number => ENEMY_GOLD_REWARDS[templateId] ?? 5;

const withBattleFlagDefaults = (player: PlayerState): PlayerState => ({
  ...player,
  hasRevival: player.hasRevival ?? false,
  revivalUsed: player.revivalUsed ?? false,
  deathWishActive: player.deathWishActive ?? false,
  ridgepoleActive: player.ridgepoleActive ?? false,
  templeCarpenterActive: player.templeCarpenterActive ?? false,
  cliffEdgeActive: player.cliffEdgeActive ?? false,
  nextAttackTimeReduce: player.nextAttackTimeReduce ?? 0,
  blockPersist: player.blockPersist ?? false,
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
});

const createInitialGameState = (setup?: BattleSetup | null): GameState => {
  const encounter = setup?.enemies ?? createRandomEncounter();
  const initialJobId: JobId = setup?.jobId ?? 'carpenter';
  const fallbackConfig = getJobConfig(initialJobId);
  const deck = shuffle(
    (setup?.deck ?? fallbackConfig.createStarterDeck()).map((card) => ({
      ...card,
      wasReserved: false,
      reservedThisTurn: false,
    })),
  );
  const drawResult = drawCards(deck, [], DRAW_COUNT);
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
    deathWishActive: false,
    ridgepoleActive: false,
    templeCarpenterActive: false,
    cliffEdgeActive: false,
    nextAttackTimeReduce: 0,
    blockPersist: false,
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
  };

  return {
    phase: 'battle_start',
    turn: 1,
    maxTime: getMaxTime(basePlayer.mental),
    usedTime: 0,
    shuffleAnimation: false,
    hand: drawResult.drawn,
    timeline: [],
    reserved: [],
    drawPile: drawResult.drawPile,
    discardPile: drawResult.discardPile,
    exhaustedCards: [],
    activePowers: [],
    player: withBattleFlagDefaults({
      ...basePlayer,
      cookingGauge: 0,
      statusEffects: [...basePlayer.statusEffects],
    }),
    enemies: encounter.map((enemy) => ({ ...enemy, statusEffects: [...enemy.statusEffects] })),
    executingIndex: -1,
    toolSlots: [],
  };
};

export const useGameState = (options?: UseGameStateOptions): UseGameStateResult => {
  const { resolveCard, equipTool, applyToolEffects } = useBattleLogic();
  const { getEnemyIntent, executeEnemyTurn } = useEnemyAI();

  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState(options?.setup));
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [sellingCardId, setSellingCardId] = useState<string | null>(null);
  const [returningCardId, setReturningCardId] = useState<string | null>(null);
  const [coinBursts, setCoinBursts] = useState<CoinBurst[]>([]);
  const [battlePopups, setBattlePopups] = useState<BattlePopup[]>([]);
  const [battleMessage, setBattleMessage] = useState('戦闘開始！');
  const [showStartBanner, setShowStartBanner] = useState(true);
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
  const [hungryFlash, setHungryFlash] = useState<'hungry' | 'awakened' | null>(null);
  const [showRevivalEffect, setShowRevivalEffect] = useState(false);
  const [pendingHandUpgradeCount, setPendingHandUpgradeCount] = useState(0);
  const prevHungryStateRef = useRef<'normal' | 'hungry' | 'awakened'>('normal');
  const endTurnRef = useRef<() => Promise<void>>(async () => {});
  const pushPopupRef = useRef<(text: string, target: 'player' | string, kind: BattlePopup['kind']) => void>(
    () => {},
  );

  useEffect(() => {
    if (!options?.setup) return;
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
    setHungryFlash(null);
    setShowRevivalEffect(false);
    setPendingHandUpgradeCount(0);
    prevHungryStateRef.current = 'normal';
  }, [options?.setup]);

  useEffect(() => {
    if (gameState.phase !== 'battle_start') return;
    const timer = window.setTimeout(() => {
      setGameState((prev) => ({ ...prev, phase: 'player_turn' }));
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
    const noPlayableCard =
      gameState.hand.length > 0 &&
      gameState.hand.every((card) => card.type === 'status' || card.type === 'curse');
    const shouldAutoEnd =
      gameState.maxTime - gameState.usedTime <= 0 || gameState.hand.length === 0 || noPlayableCard;
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

  function pushPopup(text: string, target: 'player' | string, kind: BattlePopup['kind']) {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setBattlePopups((prev) => [...prev, { id, text, target, kind }]);
    window.setTimeout(() => {
      setBattlePopups((prev) => prev.filter((popup) => popup.id !== id));
    }, 720);
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
        currentHp: 1,
        hasRevival: false,
        revivalUsed: true,
      },
      revived: true,
    };
  };

  const clearBattleFlags = (player: PlayerState): PlayerState => ({
    ...player,
    scaffold: 0,
    hasRevival: false,
    revivalUsed: false,
    deathWishActive: false,
    ridgepoleActive: false,
    templeCarpenterActive: false,
    cliffEdgeActive: false,
    nextAttackTimeReduce: 0,
    blockPersist: false,
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
  });

  const getAutoUpgradeType = (card: Card): 'damage' | 'block' | 'time' => {
    if ((card.damage ?? 0) > 0) return 'damage';
    if ((card.block ?? 0) > 0) return 'block';
    return 'time';
  };

  const selectedCard = useMemo(
    () => gameState.hand.find((card) => card.id === selectedCardId) ?? null,
    [gameState.hand, selectedCardId],
  );
  const remainingTime = gameState.maxTime - gameState.usedTime;
  const executingCardId = null;
  const canPlayCard = (card: Card): boolean => {
    if (card.type === 'status' || card.type === 'curse') return false;
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

  const isDandoriReady = Boolean(lastPlayedCard?.tags?.includes('preparation'));
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
  ): boolean => {
    if (gameState.phase !== 'player_turn') return false;
    if (activePendingHandUpgradeCount > 0) return false;
    const card = gameState.hand.find((item) => item.id === cardId);
    if (!card || !canPlayCard(card)) return false;
    if (isEnemyTargetCard(card) && target.type !== 'enemy') return false;
    if (!isEnemyTargetCard(card) && target.type === 'enemy') return false;

    const reservedBonusActive = Boolean(card.wasReserved && card.reserveBonus);
    const enhancedCard: Card = reservedBonusActive
      ? {
          ...card,
          damage: card.damage
            ? Math.floor(card.damage * (card.reserveBonus?.damageMultiplier ?? 1))
            : card.damage,
          block: card.block
            ? Math.floor(card.block * (card.reserveBonus?.blockMultiplier ?? 1))
            : card.block,
          effects: [...(card.effects ?? []), ...(card.reserveBonus?.extraEffects ?? [])],
          wasReserved: false,
          reservedThisTurn: false,
        }
      : card;

    const effectMultiplier = doubleNextCharges > 0 ? 2 : 1;
    const multipliedCard: Card =
      effectMultiplier > 1
        ? {
            ...enhancedCard,
            damage:
              enhancedCard.damage !== undefined
                ? enhancedCard.damage * effectMultiplier
                : enhancedCard.damage,
            block:
              enhancedCard.block !== undefined
                ? enhancedCard.block * effectMultiplier
                : enhancedCard.block,
            effects: (enhancedCard.effects ?? []).map((effect) => ({
              ...effect,
              value: effect.value * effectMultiplier,
            })),
          }
        : enhancedCard;

    const enemiesBefore = gameState.enemies.map((enemy) => ({ id: enemy.id, hp: enemy.currentHp, templateId: enemy.templateId }));

    const buffedCard =
      attackItemBuff && attackItemBuff.charges > 0 && multipliedCard.type === 'attack'
        ? { ...multipliedCard, damage: (multipliedCard.damage ?? 0) + attackItemBuff.value }
        : multipliedCard;
    const playedCard: Card = { ...buffedCard, wasReserved: false, reservedThisTurn: false };

    const result = resolveCard(
      playedCard,
      lastPlayedCard,
      gameState.player,
      gameState.enemies,
      target.type === 'enemy' ? target.enemyId : null,
      gameState.toolSlots,
    );
    const playerAfterPowerFlags: PlayerState = (() => {
      if (playedCard.type !== 'power') return result.player;
      if (playedCard.id === 'revival') {
        return { ...result.player, hasRevival: true, revivalUsed: false };
      }
      if (playedCard.id === 'death_wish') {
        return { ...result.player, deathWishActive: true };
      }
      if (playedCard.id === 'ridgepole') {
        return { ...result.player, ridgepoleActive: true };
      }
      if (playedCard.id === 'temple_carpenter') {
        return { ...result.player, templeCarpenterActive: true };
      }
      if (playedCard.id === 'cliff_edge') {
        return { ...result.player, cliffEdgeActive: true };
      }
      if (playedCard.id === 'recipe_study') {
        return { ...result.player, recipeStudyActive: true };
      }
      if (playedCard.id === 'three_star') {
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
    const playerAfterCard: PlayerState =
      playedCard.type === 'attack' && playerAfterCardBase.nextAttackTimeReduce > 0
        ? { ...playerAfterCardBase, nextAttackTimeReduce: 0 }
        : playerAfterCardBase;

    const drawAmount = (playedCard.effects ?? [])
      .filter((effect) => effect.type === 'draw')
      .reduce((sum, effect) => sum + effect.value, 0);
    const timeBoost = (playedCard.effects ?? [])
      .filter((effect) => effect.type === 'time_boost')
      .reduce((sum, effect) => sum + effect.value, 0);
    const mentalTimeDelta = Number(
      (
        getMaxTime(playerAfterCard.mental) - getMaxTime(gameState.player.mental)
      ).toFixed(1),
    );
    const drawResult =
      drawAmount > 0
        ? drawCards(gameState.drawPile, gameState.discardPile, drawAmount)
        : { drawn: [] as Card[], drawPile: gameState.drawPile, discardPile: gameState.discardPile, shuffled: false };

    const allEnemiesDead = result.enemies.every((enemy) => enemy.currentHp <= 0);
    const gainedDoubleNext = (playedCard.effects ?? [])
      .filter((effect) => effect.type === 'double_next')
      .reduce((sum, effect) => sum + effect.value, 0);
    const activePowers =
      playedCard.type === 'power' ? [...gameState.activePowers, { ...playedCard }] : gameState.activePowers;
    const handAfterPlay = [...gameState.hand.filter((item) => item.id !== cardId), ...drawResult.drawn];
    const upgradeHandCardCount = (playedCard.effects ?? [])
      .filter((effect) => effect.type === 'upgrade_hand_card')
      .reduce((sum, effect) => sum + effect.value, 0);
    const postCardState: GameState = {
      ...gameState,
      discardPile:
        playedCard.type === 'tool' || playedCard.type === 'power'
          ? drawResult.discardPile
          : [...drawResult.discardPile, playedCard],
      drawPile: drawResult.drawPile,
      player: playerAfterCard,
      enemies: result.enemies,
      activePowers,
      toolSlots: result.equippedTool ? equipTool(result.equippedTool, gameState.toolSlots) : gameState.toolSlots,
      hand: handAfterPlay,
      usedTime: gameState.usedTime + effectiveTimeCost,
      maxTime: gameState.maxTime + timeBoost + mentalTimeDelta,
      shuffleAnimation: drawResult.shuffled,
    };

    setGameState((prev) => ({
      ...prev,
      hand: handAfterPlay,
      discardPile:
        playedCard.type === 'tool' || playedCard.type === 'power'
          ? drawResult.discardPile
          : [...drawResult.discardPile, playedCard],
      drawPile: drawResult.drawPile,
      player: playerAfterCard,
      enemies: result.enemies,
      activePowers,
      toolSlots: result.equippedTool ? equipTool(result.equippedTool, prev.toolSlots) : prev.toolSlots,
      usedTime: prev.usedTime + effectiveTimeCost,
      maxTime: prev.maxTime + timeBoost + mentalTimeDelta,
      shuffleAnimation: drawResult.shuffled,
    }));
    setDoubleNextCharges((prev) => Math.max(0, prev - (effectMultiplier > 1 ? 1 : 0)) + gainedDoubleNext);

    setLastPlayedCard(playedCard);
    setSelectedCardId(null);
    if (playedCard.tags?.includes('aoe')) {
      for (const enemy of result.enemies) {
        const before = enemiesBefore.find((item) => item.id === enemy.id);
        if (!before) continue;
        const dealt = Math.max(0, before.hp - enemy.currentHp);
        if (dealt > 0) {
          pushPopup(`-${dealt}`, enemy.id, 'damage');
        }
      }
    } else if (result.damage > 0 && result.targetEnemyId) {
      setHitEnemyId(result.targetEnemyId);
      pushPopup(`-${result.damage}`, result.targetEnemyId, 'damage');
      window.setTimeout(() => setHitEnemyId(null), 260);
    }
    if (result.blockGained > 0) {
      setShieldEffect(true);
      pushPopup(`+${result.blockGained}🛡`, 'player', 'block');
      window.setTimeout(() => setShieldEffect(false), 260);
    }
    if (playedCard.id === 'gamble') {
      if (result.damage > 0) {
        pushPopup('🎰 大当たり！ 25ダメージ！', 'player', 'buff');
      } else {
        setIsPlayerHit(true);
        pushPopup('🎰 ハズレ… 10ダメージ', 'player', 'damage');
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
    if (upgradeHandCardCount > 0) {
      setPendingHandUpgradeCount((prev) => prev + upgradeHandCardCount);
      pushPopup('🔧 強化カードを選択', 'player', 'buff');
    }
    if (timeBoost > 0) {
      pushPopup(`+${timeBoost.toFixed(1)}s`, 'player', 'buff');
    }
    if (mentalTimeDelta > 0) {
      pushPopup(`🧠+${mentalTimeDelta.toFixed(1)}s`, 'player', 'buff');
    }
    if (result.isDandoriActive) {
      pushPopup('⚡段取り！', 'player', 'dandori');
    }
    if (reservedBonusActive) {
      pushPopup('✨温存ボーナス！', 'player', 'buff');
    }
    if (attackItemBuff && playedCard.type === 'attack') {
      setAttackItemBuff((prev) =>
        prev ? { ...prev, charges: Math.max(0, prev.charges - 1) } : prev,
      );
      pushPopup(`+${attackItemBuff.value}💪`, 'player', 'buff');
    }

    const newlyDefeated = result.enemies.filter((enemy) => {
      const before = enemiesBefore.find((item) => item.id === enemy.id);
      return Boolean(before && before.hp > 0 && enemy.currentHp <= 0);
    });
    for (const enemy of newlyDefeated) {
      pushPopup(`+${getEnemyReward(enemy.templateId)}G`, enemy.id, 'buff');
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
        const nextMental = Math.min(MAX_MENTAL, playerAfterCard.mental + 1);
        setVictoryRewardGold(reward);
        setVictoryMentalRecovery(nextMental - playerAfterCard.mental);
        setGameState({
          ...postCardState,
          phase: 'victory',
          timeline: [],
          player: {
            ...clearBattleFlags(playerAfterCard),
            gold: playerAfterCard.gold + reward,
            mental: nextMental,
          },
        });
        setBattleMessage('勝利！');
        options?.onBattleEnd?.({
          outcome: 'victory',
          player: {
            ...clearBattleFlags(playerAfterCard),
            gold: playerAfterCard.gold + reward,
            mental: nextMental,
          },
          deck: [
            ...postCardState.drawPile,
            ...postCardState.discardPile,
            ...postCardState.hand,
            ...postCardState.reserved,
            ...postCardState.activePowers,
            ...postCardState.toolSlots.map((slot) => slot.card),
          ],
          items: battleItems,
          defeatedEnemies: result.enemies,
          rewardGold: reward,
          mentalRecovery: nextMental - playerAfterCard.mental,
          kind: options?.setup?.kind ?? 'battle',
        });
      }, 500);
    }
    return true;
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
        const drawResult = drawCards(prev.drawPile, prev.discardPile, effect.value);
        return {
          ...prev,
          hand: [...prev.hand, ...drawResult.drawn],
          drawPile: drawResult.drawPile,
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
    let changed = false;
    if (gameState.phase !== 'player_turn') return changed;
    if (activePendingHandUpgradeCount > 0) return changed;
    setGameState((prev) => {
      if (prev.reserved.length >= MAX_RESERVED) return prev;
      const card = prev.hand.find((item) => item.id === cardId);
      if (!card || card.type === 'status' || card.type === 'curse') return prev;
      changed = true;
      const reservedCard: Card = {
        ...card,
        wasReserved: false,
        reservedThisTurn: true,
      };
      return {
        ...prev,
        hand: prev.hand.filter((item) => item.id !== cardId),
        reserved: [...prev.reserved, reservedCard],
      };
    });
    if (changed) {
      setSelectedCardId((prev) => (prev === cardId ? null : prev));
    }
    return changed;
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
    const nextMaxTime = Math.max(
      1,
      getMaxTime(state.player.mental) + cliffEdgeTimeBonus - state.player.nextTurnTimePenalty,
    );
    const scaffoldPerTurn = state.activePowers
      .flatMap((power) => power.effects ?? [])
      .filter((effect) => effect.type === 'scaffold_per_turn')
      .reduce((sum, effect) => sum + effect.value, 0);
    const keepBlock = state.player.blockPersist;
    const shouldDisableBlockThisTurn = state.player.nextTurnNoBlock;
    const playerAfterReset = applyToolEffects(state.toolSlots, {
      ...state.player,
      block: shouldDisableBlockThisTurn ? 0 : keepBlock ? state.player.block : 0,
      blockPersist: false,
      scaffold: state.player.scaffold + scaffoldPerTurn,
      canBlock: !shouldDisableBlockThisTurn,
      nextTurnNoBlock: false,
      nextTurnTimePenalty: 0,
      damageImmunityThisTurn: false,
      firstCookingUsedThisTurn: false,
      lastTurnDamageTaken: state.player.currentTurnDamageTaken,
      currentTurnDamageTaken: 0,
      firstIngredientUsedThisTurn: false,
    });
    const anxietyCount = playerAfterReset.mental <= 0 ? 2 : playerAfterReset.mental <= 2 ? 1 : 0;
    const anxietyCards = anxietyCount > 0 ? createAnxietyCards(anxietyCount) : [];
    const powerDrawPerTurn = state.activePowers
      .flatMap((power) => power.effects ?? [])
      .filter((effect) => effect.type === 'draw_per_turn')
      .reduce((sum, effect) => sum + effect.value, 0);
    const drawResult = drawCards(
      shuffle([...state.drawPile, ...anxietyCards]),
      state.discardPile,
      DRAW_COUNT + powerDrawPerTurn + cliffEdgeDrawBonus,
    );
    const reservedToHand = state.reserved.map((card) => ({
      ...card,
      wasReserved: Boolean(card.reservedThisTurn),
      reservedThisTurn: false,
    }));
    return {
      ...state,
      phase: 'player_turn',
      turn: state.turn + 1,
      maxTime: nextMaxTime,
      usedTime: 0,
      shuffleAnimation: drawResult.shuffled,
      hand: [...reservedToHand, ...drawResult.drawn],
      reserved: [],
      timeline: [],
      drawPile: drawResult.drawPile,
      discardPile: drawResult.discardPile,
      player: playerAfterReset,
      executingIndex: -1,
    };
  };

  async function endTurn(): Promise<void> {
    if (gameState.phase !== 'player_turn') return;
    if (activePendingHandUpgradeCount > 0) return;
    setSelectedCardId(null);
    let workingState: GameState = {
      ...gameState,
      phase: 'enemy_turn',
      executingIndex: -1,
      player: { ...gameState.player },
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
      const nextMental = Math.min(MAX_MENTAL, workingState.player.mental + 1);
      setVictoryRewardGold(reward);
      setVictoryMentalRecovery(nextMental - workingState.player.mental);
      setGameState({
        ...workingState,
        phase: 'victory',
        timeline: [],
        player: {
          ...clearBattleFlags(workingState.player),
          gold: workingState.player.gold + reward,
          mental: nextMental,
        },
      });
      setBattleMessage('勝利！');
      options?.onBattleEnd?.({
        outcome: 'victory',
        player: {
          ...clearBattleFlags(workingState.player),
          gold: workingState.player.gold + reward,
          mental: nextMental,
        },
        deck: [
          ...workingState.drawPile,
          ...workingState.discardPile,
          ...workingState.hand,
          ...workingState.reserved,
          ...workingState.activePowers,
          ...workingState.toolSlots.map((slot) => slot.card),
        ],
        items: battleItems,
        defeatedEnemies: workingState.enemies,
        rewardGold: reward,
        mentalRecovery: nextMental - workingState.player.mental,
        kind: options?.setup?.kind ?? 'battle',
      });
      return;
    }

    if (workingState.player.ridgepoleActive && workingState.player.scaffold >= 5) {
      let dealt = false;
      const nextEnemies = workingState.enemies.map((enemy) => {
        if (enemy.currentHp <= 0) return enemy;
        dealt = true;
        const nextHp = Math.max(0, enemy.currentHp - 10);
        if (enemy.currentHp - nextHp > 0) {
          pushPopup('-10', enemy.id, 'damage');
        }
        return { ...enemy, currentHp: nextHp };
      });
      if (dealt) {
        workingState = { ...workingState, enemies: nextEnemies };
        pushPopup('🎌 棟上げ発動！', 'player', 'buff');
      }
      if (workingState.enemies.every((enemy) => enemy.currentHp <= 0)) {
        const reward = workingState.enemies.reduce((sum, enemy) => sum + getEnemyReward(enemy.templateId), 0);
        const nextMental = Math.min(MAX_MENTAL, workingState.player.mental + 1);
        setVictoryRewardGold(reward);
        setVictoryMentalRecovery(nextMental - workingState.player.mental);
        setGameState({
          ...workingState,
          phase: 'victory',
          timeline: [],
          player: {
            ...clearBattleFlags(workingState.player),
            gold: workingState.player.gold + reward,
            mental: nextMental,
          },
        });
        setBattleMessage('勝利！');
        options?.onBattleEnd?.({
          outcome: 'victory',
          player: {
            ...clearBattleFlags(workingState.player),
            gold: workingState.player.gold + reward,
            mental: nextMental,
          },
          deck: [
            ...workingState.drawPile,
            ...workingState.discardPile,
            ...workingState.hand,
            ...workingState.reserved,
            ...workingState.activePowers,
            ...workingState.toolSlots.map((slot) => slot.card),
          ],
          items: battleItems,
          defeatedEnemies: workingState.enemies,
          rewardGold: reward,
          mentalRecovery: nextMental - workingState.player.mental,
          kind: options?.setup?.kind ?? 'battle',
        });
        return;
      }
    }

    setGameState({ ...workingState, timeline: [] });
    setBattleMessage('敵の行動');
    await wait(380);

    for (const enemy of workingState.enemies) {
      if (enemy.currentHp <= 0) continue;
      const result = executeEnemyTurn(enemy, workingState.player);
      const revivalOutcome = applyRevivalIfNeeded(result.player);
      workingState = {
        ...workingState,
        player: revivalOutcome.player,
        maxTime: getMaxTime(revivalOutcome.player.mental),
        enemies: workingState.enemies.map((item) => (item.id === enemy.id ? result.enemy : item)),
      };
      if (revivalOutcome.revived) {
        pushPopup('🔄 七転び八起き！', 'player', 'buff');
        triggerRevivalEffect();
      }
      if (result.damageToPlayer > 0) {
        workingState.player.currentTurnDamageTaken += result.damageToPlayer;
        setIsPlayerHit(true);
        pushPopup(`-${result.damageToPlayer}`, 'player', 'damage');
      } else {
        pushPopup(result.log, 'player', 'buff');
      }
      if (result.mentalDamageToPlayer > 0) {
        setIsMentalHit(true);
        pushPopup(`🧠-${result.mentalDamageToPlayer}`, 'player', 'buff');
      }
      setBattleMessage(result.log);
      setGameState({ ...workingState });
      await wait(540);
      setIsPlayerHit(false);
      setIsMentalHit(false);
      if (workingState.player.currentHp <= 0) break;
    }

    if (workingState.player.currentHp <= 0) {
      setGameState({
        ...workingState,
        phase: 'defeat',
        player: clearBattleFlags(workingState.player),
      });
      setBattleMessage('敗北...');
      options?.onBattleEnd?.({
        outcome: 'defeat',
        player: clearBattleFlags(workingState.player),
        deck: [
          ...workingState.drawPile,
          ...workingState.discardPile,
          ...workingState.hand,
          ...workingState.reserved,
          ...workingState.activePowers,
          ...workingState.toolSlots.map((slot) => slot.card),
        ],
        items: battleItems,
        defeatedEnemies: workingState.enemies,
        rewardGold: 0,
        mentalRecovery: 0,
        kind: options?.setup?.kind ?? 'battle',
      });
      return;
    }

    const next = moveToNextTurn(workingState);
    setGameState(next);
    setLastPlayedCard(null);
    setBattleMessage('次のターン');
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
          card.id === cardId ? upgradeCard(card, getAutoUpgradeType(card)) : card,
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
    setHungryFlash(null);
    setShowRevivalEffect(false);
    setPendingHandUpgradeCount(0);
    prevHungryStateRef.current = 'normal';
  };

  return {
    gameState,
    selectedCardId,
    selectedCard,
    lastPlayedCard,
    remainingTime,
    canPlayCard,
    executingCardId,
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
    selectCard,
    playCardInstant,
    reserveCardById,
    sellCardById,
    useBattleItem,
    upgradeHandCardById,
    skipHandUpgradeSelection,
    endTurn,
    retryBattle,
  };
};
