import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { BossRewardType } from '../data/bossRewards';
import { CARPENTER_STARTER_DECK, CURSE_CARD, RESERVE_BONUS_CARDS } from '../data/carpenterDeck';
import { NEUTRAL_CARD_POOL } from '../data/cards/neutralCards';
import { getJobConfig } from '../data/jobs';
import { cloneRewardCard } from '../data/jobs/index';
import {
  CARPENTER_COMMON_POOL,
  CARPENTER_RARE_POOL,
  CARPENTER_UNCOMMON_POOL,
} from '../data/jobs/carpenter';
import {
  AREA1_BOSS,
  AREA2_BOSS,
  AREA3_BOSS,
  generateCardRewardChoices,
  generateRareCardRewardChoices,
  generateOmamoriChoices,
  generateShopCards,
  generateShopItems,
  getCardPrice,
  pickArea1Elite,
  pickArea1EncounterTemplateIds,
  pickArea2Encounter,
  pickArea2Elite,
  pickArea3Encounter,
  pickArea3Elite,
  pickEvent,
} from '../data/runData';
import { createEncounterFromTemplateIds, createEncounterFromTemplates } from '../data/enemies';
import type { Card, GameState, JobId, PlayerState } from '../types/game';
import type {
  BattleResult,
  BattleSetup,
  BoardTile,
  GameEvent,
  GameProgress,
  GameScreen,
  Omamori,
  PendingItemReplacement,
  RunItem,
  ShopItem,
  TileType,
} from '../types/run';
import {
  generateBoard,
  getRoutePreviewTiles,
  getTileById,
  movePlayerBySteps,
} from '../utils/boardGenerator';
import { upgradeCardByJobId } from '../utils/cardUpgrade';
import { clearBattleState, saveBattleState } from '../utils/battleSave';

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const UNLOCKED_CARD_NAMES_STORAGE_KEY = 'real-card-battle:unlocked-card-names';
const SAVE_DATA_KEY = 'real-card-battle:save-data';
const NON_RESUMABLE_SCREENS = [
  'home',
  'title',
  'zukan',
  'job_select',
  'victory',
  'game_over',
  'card_reward',
  'omamori_reward',
  'boss_reward',
];
const NORMALIZE_TO_MAP = ['battle', 'card_reward', 'omamori_reward', 'boss_reward'];
export type DevDestination =
  | 'battle_normal'
  | 'battle_elite'
  | 'battle_boss_1'
  | 'battle_boss_2'
  | 'battle_boss_3'
  | 'battle_all_cards'
  | 'shop'
  | 'shrine'
  | 'hotel'
  | 'event'
  | 'card_reward'
  | 'boss_reward'
  | 'story';

type SerializedProgress = Omit<GameProgress, 'unlockedCardNames'> & { unlockedCardNames: string[] };

const saveProgressToStorage = (progress: GameProgress): void => {
  try {
    const saveable: SerializedProgress = {
      ...progress,
      unlockedCardNames: [...progress.unlockedCardNames],
    };
    window.localStorage.setItem(SAVE_DATA_KEY, JSON.stringify(saveable));
  } catch {
    // localStorage が利用できない環境では保存をスキップ。
  }
};

export const loadSavedProgress = (): GameProgress | null => {
  try {
    const raw = window.localStorage.getItem(SAVE_DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SerializedProgress;
    const normalizedScreen = NORMALIZE_TO_MAP.includes(parsed.currentScreen) ? 'map' : parsed.currentScreen;
    const isInvalidProgress =
      !parsed.jobId ||
      !normalizedScreen ||
      typeof parsed.currentArea !== 'number' ||
      parsed.currentArea < 1 ||
      typeof parsed.currentTileId !== 'number' ||
      parsed.currentTileId < 1 ||
      !Array.isArray(parsed.board) ||
      parsed.board.length === 0 ||
      !parsed.player ||
      !Array.isArray(parsed.deck) ||
      NON_RESUMABLE_SCREENS.includes(normalizedScreen);
    if (isInvalidProgress) {
      window.localStorage.removeItem(SAVE_DATA_KEY);
      return null;
    }
    return {
      ...parsed,
      unlockedCardNames: new Set(parsed.unlockedCardNames ?? []),
      pendingItemReplacement: null,
      // バトル中状態はリセット（マップ画面に戻す）
      battleSetup: null,
      currentScreen: normalizedScreen,
    };
  } catch {
    window.localStorage.removeItem(SAVE_DATA_KEY);
    return null;
  }
};

export const clearSavedProgress = (): void => {
  try {
    window.localStorage.removeItem(SAVE_DATA_KEY);
  } catch {
    // ignore
  }
};

const loadUnlockedCardNames = (): Set<string> => {
  try {
    const raw = window.localStorage.getItem(UNLOCKED_CARD_NAMES_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((entry): entry is string => typeof entry === 'string'));
  } catch {
    return new Set<string>();
  }
};

const saveUnlockedCardNames = (names: Set<string>) => {
  try {
    window.localStorage.setItem(UNLOCKED_CARD_NAMES_STORAGE_KEY, JSON.stringify([...names]));
  } catch {
    // localStorage が利用できない環境では保存をスキップ。
  }
};

const rollRoulette = (): number => {
  const roll = Math.random();
  return roll < 0.30 ? 1 : roll < 0.65 ? 2 : 3;
};

type Action =
  | { type: 'set_screen'; screen: GameScreen }
  | { type: 'set_board'; board: BoardTile[] }
  | { type: 'set_current_tile'; tileId: number }
  | { type: 'set_dice'; value: number | null; rolling: boolean }
  | { type: 'set_pending_steps'; steps: number }
  | { type: 'set_selectable_tiles'; tileIds: number[] }
  | { type: 'add_traveled_edge'; from: number; to: number }
  | { type: 'clear_traveled_edges' }
  | { type: 'set_branch'; tileId: number | null }
  | { type: 'set_event'; event: GameEvent | null }
  | { type: 'set_shop'; shopItems: ShopItem[] }
  | { type: 'set_pawnshop_sell_used'; used: boolean }
  | { type: 'set_hotel_item_received'; used: boolean }
  | { type: 'set_card_reward'; cards: Card[] | null }
  | { type: 'set_omamori_reward'; omamoris: Omamori[] | null; source: 'battle' | 'shrine' | null }
  | { type: 'set_battle_setup'; setup: BattleSetup | null; tileType: TileType | null }
  | { type: 'set_player'; player: PlayerState }
  | { type: 'set_job'; jobId: JobId }
  | { type: 'set_deck'; deck: Card[] }
  | { type: 'set_unlocked_card_names'; names: Set<string> }
  | { type: 'set_items'; items: RunItem[] }
  | { type: 'set_omamoris'; omamoris: Omamori[] }
  | { type: 'set_card_remove_count'; value: number }
  | { type: 'set_run_stats'; totalTurns?: number; cardsAcquired?: number; lastDefeatedBy?: string }
  | { type: 'set_current_area'; area: number }
  | { type: 'set_pending_item_replacement'; value: PendingItemReplacement | null }
  | { type: 'open_card_upgrade'; mode: 'upgrade' | 'remove'; returnScreen: Exclude<GameScreen, 'card_upgrade'> }
  | { type: 'close_card_upgrade' };

interface PickRewardOptions {
  deferBossTransition?: boolean;
}

const initialPlayer: PlayerState = {
  jobId: 'carpenter',
  maxHp: 80,
  currentHp: 80,
  block: 0,
  gold: 0,
  scaffold: 0,
  cookingGauge: 0,
  mental: 7,
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
  nextAttackBoostValue: 0,
  nextAttackBoostCount: 0,
  timeBonusPerTurn: 0,
  nextCardDoubleEffect: false,
  nextCardEffectBoost: 0,
};

const makeInitialProgress = (): GameProgress => {
  const board = generateBoard();
  const unlockedCardNames = loadUnlockedCardNames();
  return {
    jobId: 'carpenter',
    currentScreen: 'home',
    currentArea: 1,
    board,
    currentTileId: 1,
    player: { ...initialPlayer },
    deck: getJobConfig('carpenter').createStarterDeck(),
    omamoris: [],
    items: [],
    cardRemoveCount: 0,
    dice: { value: null, rolling: false },
    selectedBranchTileId: null,
    pendingSteps: 0,
    selectableTileIds: [],
    traveledEdges: [],
    activeEvent: null,
    activeShopItems: [],
    pawnshopSellUsedThisVisit: false,
    hotelItemReceivedThisVisit: false,
    cardReward: null,
    omamoriRewardChoices: null,
    omamoriRewardSource: null,
    battleSetup: null,
    lastTileType: null,
    cardUpgradeMode: null,
    returnScreenAfterUpgrade: null,
    unlockedCardNames,
    totalTurns: 0,
    cardsAcquired: 0,
    lastDefeatedBy: '',
    pendingItemReplacement: null,
  };
};

const updateBoardPosition = (board: BoardTile[], tileId: number): BoardTile[] =>
  board.map((tile) => ({
    ...tile,
    isCurrentPosition: tile.id === tileId,
    visited: tile.visited || tile.id === tileId,
  }));

const pruneUnselectedBranchRoutes = (
  board: BoardTile[],
  branchEntryTileId: number,
  selectedBranchTileId: number,
): BoardTile[] => {
  const branchEntry = board.find((tile) => tile.id === branchEntryTileId);
  const selected = board.find((tile) => tile.id === selectedBranchTileId);
  if (!branchEntry || !selected || !selected.branchGroup || !selected.branch) return board;
  if (!branchEntry.nextTiles.includes(selectedBranchTileId)) return board;

  const removedIds = new Set(
    board
      .filter(
        (tile) =>
          tile.branchGroup === selected.branchGroup &&
          Boolean(tile.branch) &&
          tile.branch !== selected.branch,
      )
      .map((tile) => tile.id),
  );
  if (removedIds.size === 0) return board;

  return board
    .filter((tile) => !removedIds.has(tile.id))
    .map((tile) => ({
      ...tile,
      nextTiles: tile.nextTiles.filter((nextId) => !removedIds.has(nextId)),
    }));
};

const reducer = (state: GameProgress, action: Action): GameProgress => {
  switch (action.type) {
    case 'set_screen':
      return { ...state, currentScreen: action.screen };
    case 'set_board':
      return { ...state, board: action.board };
    case 'set_current_tile':
      return {
        ...state,
        currentTileId: action.tileId,
        board: updateBoardPosition(state.board, action.tileId),
      };
    case 'set_dice':
      return { ...state, dice: { value: action.value, rolling: action.rolling } };
    case 'set_pending_steps':
      return { ...state, pendingSteps: action.steps };
    case 'set_selectable_tiles':
      return { ...state, selectableTileIds: action.tileIds };
    case 'add_traveled_edge':
      return {
        ...state,
        traveledEdges: [...state.traveledEdges, { from: action.from, to: action.to }],
      };
    case 'clear_traveled_edges':
      return { ...state, traveledEdges: [] };
    case 'set_branch':
      return { ...state, selectedBranchTileId: action.tileId };
    case 'set_event':
      return { ...state, activeEvent: action.event };
    case 'set_shop':
      return { ...state, activeShopItems: action.shopItems };
    case 'set_pawnshop_sell_used':
      return { ...state, pawnshopSellUsedThisVisit: action.used };
    case 'set_hotel_item_received':
      return { ...state, hotelItemReceivedThisVisit: action.used };
    case 'set_card_reward':
      return {
        ...state,
        cardReward: action.cards ? { cards: action.cards, canSkip: true } : null,
      };
    case 'set_omamori_reward':
      return {
        ...state,
        omamoriRewardChoices: action.omamoris,
        omamoriRewardSource: action.omamoris ? action.source : null,
      };
    case 'set_battle_setup':
      return { ...state, battleSetup: action.setup, lastTileType: action.tileType };
    case 'set_player':
      return { ...state, player: action.player };
    case 'set_job':
      return { ...state, jobId: action.jobId };
    case 'set_deck':
      {
        const gained = Math.max(0, action.deck.length - state.deck.length);
      return {
        ...state,
        deck: action.deck,
        unlockedCardNames: new Set([
          ...state.unlockedCardNames,
          ...action.deck.map((card) => card.name),
        ]),
        cardsAcquired: state.cardsAcquired + gained,
      };
      }
    case 'set_unlocked_card_names':
      return {
        ...state,
        unlockedCardNames: new Set(action.names),
      };
    case 'set_items':
      return { ...state, items: action.items };
    case 'set_omamoris':
      return { ...state, omamoris: action.omamoris };
    case 'set_card_remove_count':
      return { ...state, cardRemoveCount: action.value };
    case 'set_run_stats':
      return {
        ...state,
        totalTurns: action.totalTurns ?? state.totalTurns,
        cardsAcquired: action.cardsAcquired ?? state.cardsAcquired,
        lastDefeatedBy: action.lastDefeatedBy ?? state.lastDefeatedBy,
      };
    case 'set_current_area':
      return { ...state, currentArea: action.area };
    case 'set_pending_item_replacement':
      return { ...state, pendingItemReplacement: action.value };
    case 'open_card_upgrade':
      return {
        ...state,
        currentScreen: 'card_upgrade',
        cardUpgradeMode: action.mode,
        returnScreenAfterUpgrade: action.returnScreen,
      };
    case 'close_card_upgrade':
      return {
        ...state,
        currentScreen: state.returnScreenAfterUpgrade ?? 'map',
        cardUpgradeMode: null,
        returnScreenAfterUpgrade: null,
      };
    default:
      return state;
  }
};

const cloneCurse = (): Card => ({
  ...CURSE_CARD,
  id: `${CURSE_CARD.id}_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
});

const applyCardGain = (deck: Card[], jobId: JobId, count = 1): Card[] => {
  const gained = generateCardRewardChoices(jobId, count);
  return [...deck, ...gained];
};

const getSellPrice = (card: Card): number => {
  const buyPrice = getCardPrice(card);
  if (buyPrice >= 150) return 50;
  if (buyPrice >= 80) return 25;
  return 15;
};

const getRemoveCost = (removeCount: number): number => 50 + removeCount * 25;

const advanceAfterAreaBossCore = (
  dispatchFn: (action: Action) => void,
  currentArea: number,
) => {
  if (currentArea >= 3) {
    dispatchFn({ type: 'set_screen', screen: 'victory' });
    return;
  }
  dispatchFn({ type: 'set_current_area', area: currentArea + 1 });
  dispatchFn({ type: 'set_board', board: updateBoardPosition(generateBoard(), 1) });
  dispatchFn({ type: 'set_current_tile', tileId: 1 });
  dispatchFn({ type: 'clear_traveled_edges' });
  dispatchFn({ type: 'set_screen', screen: 'map' });
};

const applySingleEffect = (
  state: GameProgress,
  effect: { type: 'heal' | 'damage' | 'gold' | 'mental' | 'card' | 'omamori' | 'curse'; value: number },
): GameProgress => {
  const next = { ...state, player: { ...state.player }, deck: [...state.deck] };
  switch (effect.type) {
    case 'heal':
      next.player.currentHp = Math.min(next.player.maxHp, next.player.currentHp + effect.value);
      break;
    case 'damage':
      next.player.currentHp = Math.max(0, next.player.currentHp - effect.value);
      break;
    case 'gold':
      next.player.gold = Math.max(0, next.player.gold + effect.value);
      break;
    case 'mental':
      next.player.mental = Math.max(0, Math.min(10, next.player.mental + effect.value));
      break;
    case 'card':
      next.deck = applyCardGain(next.deck, state.jobId, Math.max(1, effect.value));
      break;
    case 'curse':
      next.deck.push(...Array.from({ length: effect.value }).map(() => cloneCurse()));
      break;
    case 'omamori':
      {
        if (effect.value <= 0) break;
        const choices = generateOmamoriChoices(1, state.omamoris);
        if (choices.length === 0) break;
        const randomOmamori = choices[0];
        return {
          ...next,
          omamoris: [...next.omamoris, randomOmamori],
        };
      }
    default:
      break;
  }
  return next;
};

export const useRunProgress = () => {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialProgress);
  const stateRef = useRef(state);
  const prevScreenRef = useRef(state.currentScreen);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (prevScreenRef.current !== state.currentScreen) {
      prevScreenRef.current = state.currentScreen;
    }
  }, [state.currentScreen, state.currentTileId]);

  useEffect(() => {
    if (state.currentScreen !== 'map') return;
    if (!state.dice.rolling && state.dice.value === null) return;
    dispatch({ type: 'set_dice', value: null, rolling: false });
  }, [state.currentScreen, state.dice.rolling, state.dice.value]);

  useEffect(() => {
    saveUnlockedCardNames(state.unlockedCardNames);
  }, [state.unlockedCardNames]);

  useEffect(() => {
    if (!NON_RESUMABLE_SCREENS.includes(state.currentScreen)) {
      saveProgressToStorage(state);
    }
  }, [state]);

  const branchPreviews = useMemo(() => {
    if (state.selectableTileIds.length === 0) return [];
    return state.selectableTileIds.map((nextTileId) => ({
      nextTileId,
      previewTiles: getRoutePreviewTiles(state.board, nextTileId, 3),
    }));
  }, [state.board, state.selectableTileIds]);

  const onBattleTurnStart = (gameState: GameState) => {
    saveBattleState(gameState, stateRef.current);
  };

  const openTileScreen = (tile: BoardTile) => {
    if (tile.type === 'enemy') {
      const area = stateRef.current.currentArea;
      let enemies;
      if (area === 2) {
        enemies = createEncounterFromTemplates(pickArea2Encounter());
      } else if (area === 3) {
        enemies = createEncounterFromTemplates(pickArea3Encounter());
      } else {
        enemies = createEncounterFromTemplateIds(pickArea1EncounterTemplateIds());
      }
      const setup: BattleSetup = {
        jobId: stateRef.current.jobId,
        kind: 'battle',
        enemies,
        deck: stateRef.current.deck,
        player: stateRef.current.player,
        omamoris: stateRef.current.omamoris,
        items: stateRef.current.items,
      };
      dispatch({ type: 'set_battle_setup', setup, tileType: tile.type });
      dispatch({ type: 'set_screen', screen: 'battle' });
      return;
    }
    if (tile.type === 'unique_boss') {
      const area = stateRef.current.currentArea;
      let eliteTemplate;
      if (area === 2) {
        eliteTemplate = pickArea2Elite();
      } else if (area === 3) {
        eliteTemplate = pickArea3Elite();
      } else {
        eliteTemplate = pickArea1Elite();
      }
      const setup: BattleSetup = {
        jobId: stateRef.current.jobId,
        kind: 'elite',
        enemies: createEncounterFromTemplates([eliteTemplate]),
        deck: stateRef.current.deck,
        player: stateRef.current.player,
        omamoris: stateRef.current.omamoris,
        items: stateRef.current.items,
      };
      dispatch({ type: 'set_battle_setup', setup, tileType: tile.type });
      dispatch({ type: 'set_screen', screen: 'battle' });
      return;
    }
    if (tile.type === 'area_boss') {
      const area = stateRef.current.currentArea;
      let bossTemplate;
      if (area === 2) {
        bossTemplate = AREA2_BOSS;
      } else if (area === 3) {
        bossTemplate = AREA3_BOSS;
      } else {
        bossTemplate = AREA1_BOSS;
      }
      const setup: BattleSetup = {
        jobId: stateRef.current.jobId,
        kind: 'boss',
        enemies: createEncounterFromTemplates([bossTemplate]),
        deck: stateRef.current.deck,
        player: stateRef.current.player,
        omamoris: stateRef.current.omamoris,
        items: stateRef.current.items,
      };
      dispatch({ type: 'set_battle_setup', setup, tileType: tile.type });
      dispatch({ type: 'set_screen', screen: 'battle' });
      return;
    }
    if (tile.type === 'event') {
      dispatch({ type: 'set_event', event: pickEvent() });
      dispatch({ type: 'set_screen', screen: 'event' });
      return;
    }
    if (tile.type === 'shrine') {
      dispatch({ type: 'set_omamori_reward', omamoris: generateOmamoriChoices(3, stateRef.current.omamoris), source: 'shrine' });
      dispatch({ type: 'set_screen', screen: 'shrine' });
      return;
    }
    if (tile.type === 'pawnshop') {
      const discount =
        stateRef.current.omamoris.find((omamori) => omamori.effect.stat === 'shop_discount')?.effect.value ?? 0;
      const cards = generateShopCards(6, stateRef.current.jobId).map((card, idx) => {
        const base = getCardPrice(card);
        const discounted = Math.floor(base * (1 - discount));
        return {
          id: `shop_card_${idx}_${card.id}`,
          type: 'card' as const,
          item: card,
          price: Math.max(1, discounted),
        };
      });
      const items = generateShopItems(2).map((item, idx) => ({
        id: `shop_item_${idx}_${item.id}`,
        type: 'item' as const,
        item,
        price: Math.max(1, Math.floor(item.price * (1 - discount))),
      }));
      const omamori: ShopItem = {
        id: `shop_omamori_${Date.now()}`,
        type: 'omamori',
        item: generateOmamoriChoices(1, stateRef.current.omamoris)[0],
        price: Math.max(1, Math.floor(150 * (1 - discount))),
      };
      dispatch({
        type: 'set_shop',
        shopItems: [...cards, omamori, ...items],
      });
      dispatch({ type: 'set_pawnshop_sell_used', used: false });
      dispatch({ type: 'set_screen', screen: 'pawnshop' });
      return;
    }
    if (tile.type === 'hotel') {
      dispatch({ type: 'set_hotel_item_received', used: false });
      dispatch({ type: 'set_screen', screen: 'hotel' });
      return;
    }
  };

  const rollDiceAndMove = async () => {
    const current = stateRef.current;
    if (current.currentScreen !== 'map') return;
    const currentTile = getTileById(current.board, current.currentTileId);
    if (!currentTile || currentTile.type === 'area_boss') return;

    const value = rollRoulette();
    dispatch({ type: 'set_screen', screen: 'dice_rolling' });
    dispatch({ type: 'set_dice', value: null, rolling: true });
    await wait(150);
    dispatch({ type: 'set_dice', value, rolling: true });
    await wait(1200);
    dispatch({ type: 'set_dice', value, rolling: false });
    await wait(500);
    dispatch({ type: 'set_dice', value: null, rolling: false });
    dispatch({ type: 'set_screen', screen: 'map' });
    const after = stateRef.current;
    const move = movePlayerBySteps(after.board, after.currentTileId, value, after.selectedBranchTileId);
    dispatch({ type: 'set_pending_steps', steps: value });
    if (move.stoppedAtBranch) {
      let fromId = after.currentTileId;
      for (let i = 0; i < move.passedTileIds.length; i += 1) {
        const toId = move.passedTileIds[i];
        dispatch({ type: 'add_traveled_edge', from: fromId, to: toId });
        dispatch({ type: 'set_current_tile', tileId: toId });
        dispatch({ type: 'set_pending_steps', steps: Math.max(0, value - i - 1) });
        fromId = toId;
        await wait(260);
      }
      dispatch({ type: 'set_branch', tileId: null });
      dispatch({ type: 'set_selectable_tiles', tileIds: move.branchOptions });
      dispatch({ type: 'set_screen', screen: 'branch_select' });
      return;
    }
    dispatch({ type: 'set_selectable_tiles', tileIds: [] });
    dispatch({ type: 'set_branch', tileId: null });
    (async () => {
      let fromId = after.currentTileId;
      for (let i = 0; i < move.passedTileIds.length; i += 1) {
        const toId = move.passedTileIds[i];
        dispatch({ type: 'add_traveled_edge', from: fromId, to: toId });
        dispatch({ type: 'set_current_tile', tileId: toId });
        dispatch({ type: 'set_pending_steps', steps: Math.max(0, value - i - 1) });
        fromId = toId;
        await wait(260);
      }
      const landed = getTileById(stateRef.current.board, move.newTileId);
      if (landed) openTileScreen(landed);
    })();
  };

  const chooseBranch = (nextTileId: number) => {
    const current = stateRef.current;
    if (current.currentScreen !== 'branch_select') return;
    const currentTile = getTileById(current.board, current.currentTileId);
    if (!currentTile || !currentTile.nextTiles.includes(nextTileId)) return;
    const prunedBoard = pruneUnselectedBranchRoutes(current.board, current.currentTileId, nextTileId);
    const stepsToAdvance = Math.max(1, current.pendingSteps);
    const move = movePlayerBySteps(prunedBoard, current.currentTileId, stepsToAdvance, nextTileId);

    dispatch({ type: 'set_selectable_tiles', tileIds: [] });
    dispatch({ type: 'set_branch', tileId: null });
    dispatch({ type: 'set_board', board: prunedBoard });
    dispatch({ type: 'set_screen', screen: 'map' });

    (async () => {
      let fromId = current.currentTileId;
      for (let i = 0; i < move.passedTileIds.length; i += 1) {
        const toId = move.passedTileIds[i];
        dispatch({ type: 'add_traveled_edge', from: fromId, to: toId });
        dispatch({ type: 'set_current_tile', tileId: toId });
        dispatch({ type: 'set_pending_steps', steps: Math.max(0, stepsToAdvance - i - 1) });
        fromId = toId;
        await wait(260);
      }

      if (move.stoppedAtBranch) {
        dispatch({ type: 'set_selectable_tiles', tileIds: move.branchOptions });
        dispatch({ type: 'set_screen', screen: 'branch_select' });
        return;
      }

      dispatch({ type: 'set_pending_steps', steps: 0 });
      const landed = getTileById(prunedBoard, move.newTileId);
      if (landed) openTileScreen(landed);
    })();
  };

  const chooseEventChoice = (choiceIndex: number) => {
    const event = stateRef.current.activeEvent;
    if (!event) return;

    // trainingイベント：受講する（choiceIndex=0）でカード強化画面へ
    if (event.id === 'training' && choiceIndex === 0) {
      dispatch({ type: 'set_event', event: null });
      dispatch({ type: 'open_card_upgrade', mode: 'upgrade', returnScreen: 'map' });
      return;
    }

    let nextState = stateRef.current;
    for (const effect of event.choices[choiceIndex]?.effects ?? []) {
      if (event.id === 'vending_machine' && effect.type === 'gold' && effect.value === -10) {
        // -10G消費を先に適用してからランダム効果を付与
        nextState = applySingleEffect(nextState, effect);
        const randomSet = [
          { type: 'heal', value: 20 },
          { type: 'damage', value: 5 },
          { type: 'gold', value: 30 },
          { type: 'mental', value: 1 },
          { type: 'mental', value: -1 },
        ] as const;
        nextState = applySingleEffect(nextState, randomSet[Math.floor(Math.random() * randomSet.length)]);
      } else {
        nextState = applySingleEffect(nextState, effect);
      }
    }
    dispatch({ type: 'set_player', player: nextState.player });
    dispatch({ type: 'set_deck', deck: nextState.deck });
    dispatch({ type: 'set_omamoris', omamoris: nextState.omamoris });
    dispatch({ type: 'set_event', event: null });
    dispatch({ type: 'set_screen', screen: 'map' });
  };

  const openHotelUpgrade = () => {
    dispatch({ type: 'open_card_upgrade', mode: 'upgrade', returnScreen: 'map' });
  };

  const closeCardUpgrade = () => {
    dispatch({ type: 'close_card_upgrade' });
  };

  const hotelHeal = () => {
    const bonus = stateRef.current.omamoris.find((item) => item.effect.stat === 'rest_heal')?.effect.value ?? 0;
    const healAmount = Math.floor(stateRef.current.player.maxHp * 0.3) + bonus;
    dispatch({
      type: 'set_player',
      player: {
        ...stateRef.current.player,
        currentHp: Math.min(stateRef.current.player.maxHp, stateRef.current.player.currentHp + healAmount),
      },
    });
    dispatch({ type: 'set_screen', screen: 'map' });
  };

  const hotelMeditate = () => {
    dispatch({
      type: 'set_player',
      player: {
        ...stateRef.current.player,
        mental: Math.min(10, stateRef.current.player.mental + 2),
      },
    });
    dispatch({ type: 'set_screen', screen: 'map' });
  };

  const hotelGetItem = () => {
    if (stateRef.current.hotelItemReceivedThisVisit) {
      dispatch({ type: 'set_screen', screen: 'map' });
      return;
    }
    const randomItem = generateShopItems(1)[0];
    if (!randomItem) {
      dispatch({ type: 'set_screen', screen: 'map' });
      return;
    }
    if (stateRef.current.items.length >= 3) {
      dispatch({
        type: 'set_pending_item_replacement',
        value: { source: 'hotel', incomingItem: randomItem },
      });
      return;
    }
    dispatch({ type: 'set_items', items: [...stateRef.current.items, randomItem] });
    dispatch({ type: 'set_hotel_item_received', used: true });
    dispatch({ type: 'set_screen', screen: 'map' });
  };

  const upgradeDeckCard = (cardId: string) => {
    const target = stateRef.current.deck.find((card) => card.id === cardId);
    if (!target) return;
    if (target.upgraded) return;
    const jobId = stateRef.current.jobId;
    const upgraded = upgradeCardByJobId(target, jobId);
    dispatch({
      type: 'set_deck',
      deck: stateRef.current.deck.map((card) =>
        card.id === cardId ? upgraded : card,
      ),
    });
    dispatch({ type: 'close_card_upgrade' });
  };

  const removeCardInUpgrade = (cardId: string) => {
    const target = stateRef.current.deck.find((card) => card.id === cardId);
    if (!target) return;
    dispatch({
      type: 'set_deck',
      deck: stateRef.current.deck.filter((card) => card.id !== cardId),
    });
    dispatch({ type: 'close_card_upgrade' });
  };

  const removeCardAtPawnshop = (cardId: string) => {
    const target = stateRef.current.deck.find((card) => card.id === cardId);
    if (!target) return;
    const cost = getRemoveCost(stateRef.current.cardRemoveCount);
    if (stateRef.current.player.gold < cost) return;
    const confirmed = window.confirm(`${target.name} を ${cost}Gで削除しますか？`);
    if (!confirmed) return;
    dispatch({
      type: 'set_deck',
      deck: stateRef.current.deck.filter((card) => card.id !== cardId),
    });
    dispatch({
      type: 'set_player',
      player: { ...stateRef.current.player, gold: stateRef.current.player.gold - cost },
    });
    dispatch({ type: 'set_card_remove_count', value: stateRef.current.cardRemoveCount + 1 });
  };

  const buyShopItem = (shopId: string) => {
    const shop = stateRef.current.activeShopItems.find((item) => item.id === shopId && !item.purchased);
    if (!shop) return;
    if (stateRef.current.player.gold < shop.price) return;

    const nextGold = stateRef.current.player.gold - shop.price;
    const nextDeck =
      shop.type === 'card' && shop.item
        ? [...stateRef.current.deck, shop.item as Card]
        : [...stateRef.current.deck];
    let nextItems = [...stateRef.current.items];
    if (shop.type === 'item' && shop.item) {
      const incomingItem = shop.item as RunItem;
      if (nextItems.length >= 3) {
        dispatch({
          type: 'set_pending_item_replacement',
          value: { source: 'shop', incomingItem, shopId },
        });
        return;
      }
      nextItems = [...nextItems, incomingItem];
    }
    const nextOmamoris =
      shop.type === 'omamori' && shop.item
        ? [...stateRef.current.omamoris, shop.item as Omamori]
        : [...stateRef.current.omamoris];
    dispatch({ type: 'set_player', player: { ...stateRef.current.player, gold: nextGold } });
    dispatch({ type: 'set_deck', deck: nextDeck });
    dispatch({ type: 'set_items', items: nextItems });
    dispatch({ type: 'set_omamoris', omamoris: nextOmamoris });
    dispatch({
      type: 'set_shop',
      shopItems: stateRef.current.activeShopItems.map((item) =>
        item.id === shopId ? { ...item, purchased: true } : item,
      ),
    });
  };

  const resolvePendingItemReplacement = (discardIndex: number | null) => {
    const pending = stateRef.current.pendingItemReplacement;
    if (!pending) return;
    if (discardIndex === null) {
      dispatch({ type: 'set_pending_item_replacement', value: null });
      return;
    }
    const currentItems = [...stateRef.current.items];
    if (discardIndex < 0 || discardIndex >= currentItems.length) return;
    const replacedItems = currentItems.map((item, idx) => (idx === discardIndex ? pending.incomingItem : item));

    if (pending.source === 'hotel') {
      dispatch({ type: 'set_items', items: replacedItems });
      dispatch({ type: 'set_hotel_item_received', used: true });
      dispatch({ type: 'set_pending_item_replacement', value: null });
      dispatch({ type: 'set_screen', screen: 'map' });
      return;
    }

    const shopId = pending.shopId;
    if (!shopId) {
      dispatch({ type: 'set_pending_item_replacement', value: null });
      return;
    }
    const shop = stateRef.current.activeShopItems.find((item) => item.id === shopId && !item.purchased);
    if (!shop || shop.type !== 'item' || !shop.item) {
      dispatch({ type: 'set_pending_item_replacement', value: null });
      return;
    }
    if (stateRef.current.player.gold < shop.price) {
      dispatch({ type: 'set_pending_item_replacement', value: null });
      return;
    }

    dispatch({
      type: 'set_player',
      player: { ...stateRef.current.player, gold: stateRef.current.player.gold - shop.price },
    });
    dispatch({ type: 'set_items', items: replacedItems });
    dispatch({
      type: 'set_shop',
      shopItems: stateRef.current.activeShopItems.map((item) =>
        item.id === shopId ? { ...item, purchased: true } : item,
      ),
    });
    dispatch({ type: 'set_pending_item_replacement', value: null });
  };

  const sellPawnshopCard = (cardId: string) => {
    if (stateRef.current.pawnshopSellUsedThisVisit) return;
    const card = stateRef.current.deck.find((entry) => entry.id === cardId);
    if (!card) return;
    const sellPrice = getSellPrice(card);
    const confirmed = window.confirm(`${card.name} を ${sellPrice}G で売却しますか？`);
    if (!confirmed) return;
    dispatch({ type: 'set_deck', deck: stateRef.current.deck.filter((entry) => entry.id !== cardId) });
    dispatch({
      type: 'set_player',
      player: { ...stateRef.current.player, gold: stateRef.current.player.gold + sellPrice },
    });
    dispatch({ type: 'set_pawnshop_sell_used', used: true });
  };

  const closePawnshop = () => {
    dispatch({ type: 'set_shop', shopItems: [] });
    dispatch({ type: 'set_screen', screen: 'map' });
  };

  const sanitizePlayerAfterBattle = (player: PlayerState): PlayerState => ({
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
    nextAttackBoostValue: 0,
    nextAttackBoostCount: 0,
    nextCardDoubleEffect: false,
    nextCardEffectBoost: 0,
    fullSprintUsedCount: 0,
  });

  const onBattleEnd = (result: BattleResult) => {
    clearBattleState();
    const cleanedDeck = result.deck.filter(
      (card) => card.type !== 'status' && card.type !== 'curse',
    );
    dispatch({
      type: 'set_run_stats',
      totalTurns: stateRef.current.totalTurns + (result.battleTurns ?? 0),
      lastDefeatedBy: result.defeatedBy ?? stateRef.current.lastDefeatedBy,
    });
    dispatch({ type: 'set_player', player: sanitizePlayerAfterBattle(result.player) });
    dispatch({ type: 'set_deck', deck: cleanedDeck });
    dispatch({ type: 'set_items', items: result.items });
    dispatch({ type: 'set_battle_setup', setup: null, tileType: stateRef.current.lastTileType });

    if (result.outcome === 'defeat') {
      dispatch({ type: 'set_screen', screen: 'game_over' });
      return;
    }

    // エリア3ボス撃破時は報酬なしで直接クリア画面へ
    if (
      result.kind === 'boss' &&
      stateRef.current.lastTileType === 'area_boss' &&
      stateRef.current.currentArea >= 3
    ) {
      dispatch({ type: 'set_screen', screen: 'victory' });
      return;
    }

    const isBossBattle = result.kind === 'boss';
    dispatch({
      type: 'set_card_reward',
      cards: isBossBattle
        ? generateRareCardRewardChoices(stateRef.current.jobId, 3)
        : generateCardRewardChoices(stateRef.current.jobId, 3),
    });
    if (result.kind === 'elite' || result.kind === 'boss') {
      dispatch({ type: 'set_omamori_reward', omamoris: generateOmamoriChoices(3, stateRef.current.omamoris), source: 'battle' });
    } else {
      dispatch({ type: 'set_omamori_reward', omamoris: null, source: null });
    }
    dispatch({ type: 'set_screen', screen: 'card_reward' });
  };

  const pickCardReward = (cardId: string | null, options?: PickRewardOptions) => {
    if (cardId) {
      const card = stateRef.current.cardReward?.cards.find((item) => item.id === cardId);
      if (card) dispatch({ type: 'set_deck', deck: [...stateRef.current.deck, card] });
    }
    dispatch({ type: 'set_card_reward', cards: null });
    if (stateRef.current.omamoriRewardChoices?.length) {
      dispatch({ type: 'set_screen', screen: 'omamori_reward' });
      return;
    }
    if (stateRef.current.lastTileType === 'area_boss') {
      if (options?.deferBossTransition) {
        dispatch({ type: 'set_screen', screen: 'map' });
        return;
      }
      advanceAfterAreaBossCore(dispatch, stateRef.current.currentArea);
      return;
    }
    dispatch({ type: 'set_screen', screen: 'map' });
  };

  const pickOmamoriReward = (omamoriId: string, options?: PickRewardOptions) => {
    const omamori = stateRef.current.omamoriRewardChoices?.find((item) => item.id === omamoriId);
    if (omamori) dispatch({ type: 'set_omamoris', omamoris: [...stateRef.current.omamoris, omamori] });
    const source = stateRef.current.omamoriRewardSource;
    dispatch({ type: 'set_omamori_reward', omamoris: null, source: null });
    if (source === 'battle' && stateRef.current.lastTileType === 'area_boss') {
      if (options?.deferBossTransition) {
        dispatch({ type: 'set_screen', screen: 'map' });
        return;
      }
      advanceAfterAreaBossCore(dispatch, stateRef.current.currentArea);
      return;
    }
    dispatch({ type: 'set_screen', screen: 'map' });
  };

  const applyBossReward = (rewardType: BossRewardType, selectedCard?: Card) => {
    if (rewardType === 'max_hp_up') {
      dispatch({
        type: 'set_player',
        player: {
          ...stateRef.current.player,
          maxHp: stateRef.current.player.maxHp + 10,
          currentHp: stateRef.current.player.currentHp + 10,
        },
      });
      return;
    }
    if (rewardType === 'time_up') {
      dispatch({
        type: 'set_player',
        player: {
          ...stateRef.current.player,
          timeBonusPerTurn: stateRef.current.player.timeBonusPerTurn + 1,
        },
      });
      return;
    }
    if (rewardType === 'rare_card' && selectedCard) {
      dispatch({ type: 'set_deck', deck: [...stateRef.current.deck, selectedCard] });
    }
  };

  const advanceAfterAreaBoss = () => {
    advanceAfterAreaBossCore(dispatch, stateRef.current.currentArea);
  };

  const resetRun = () => {
    const resetJobId = stateRef.current.jobId;
    const jobConfig = getJobConfig(resetJobId);
    const nextBoard = updateBoardPosition(generateBoard(), 1);
    const resetPlayer: PlayerState = {
      ...stateRef.current.player,
      jobId: resetJobId,
      maxHp: jobConfig.initialHp,
      currentHp: jobConfig.initialHp,
      block: 0,
      gold: 0,
      scaffold: 0,
      cookingGauge: 0,
      mental: jobConfig.initialMental,
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
      nextAttackBoostValue: 0,
      nextAttackBoostCount: 0,
      timeBonusPerTurn: 0,
      nextCardDoubleEffect: false,
      nextCardEffectBoost: 0,
    };
    dispatch({ type: 'set_job', jobId: resetJobId });
    dispatch({ type: 'set_board', board: nextBoard });
    dispatch({ type: 'set_current_tile', tileId: 1 });
    dispatch({ type: 'set_player', player: resetPlayer });
    dispatch({ type: 'set_deck', deck: jobConfig.createStarterDeck() });
    dispatch({ type: 'set_items', items: [] });
    dispatch({ type: 'set_omamoris', omamoris: [] });
    dispatch({ type: 'set_card_remove_count', value: 0 });
    dispatch({ type: 'set_run_stats', totalTurns: 0, cardsAcquired: 0, lastDefeatedBy: '' });
    dispatch({ type: 'set_current_area', area: 1 });
    dispatch({ type: 'set_card_reward', cards: null });
    dispatch({ type: 'set_omamori_reward', omamoris: null, source: null });
    dispatch({ type: 'set_shop', shopItems: [] });
    dispatch({ type: 'set_pawnshop_sell_used', used: false });
    dispatch({ type: 'set_hotel_item_received', used: false });
    dispatch({ type: 'set_event', event: null });
    dispatch({ type: 'set_battle_setup', setup: null, tileType: null });
    dispatch({ type: 'set_branch', tileId: null });
    dispatch({ type: 'set_selectable_tiles', tileIds: [] });
    dispatch({ type: 'clear_traveled_edges' });
    dispatch({ type: 'set_pending_steps', steps: 0 });
    dispatch({ type: 'set_dice', value: null, rolling: false });
    dispatch({ type: 'set_screen', screen: 'home' });
  };

  const startRunFromHome = () => {
    dispatch({ type: 'set_screen', screen: 'job_select' });
  };

  const continueFromSave = (saved: GameProgress) => {
    dispatch({ type: 'set_job', jobId: saved.jobId });
    dispatch({ type: 'set_player', player: saved.player });
    dispatch({ type: 'set_deck', deck: saved.deck });
    dispatch({ type: 'set_items', items: saved.items });
    dispatch({ type: 'set_omamoris', omamoris: saved.omamoris });
    dispatch({ type: 'set_card_reward', cards: saved.cardReward?.cards ?? null });
    dispatch({ type: 'set_omamori_reward', omamoris: saved.omamoriRewardChoices, source: saved.omamoriRewardSource });
    dispatch({ type: 'set_shop', shopItems: saved.activeShopItems });
    dispatch({ type: 'set_pawnshop_sell_used', used: saved.pawnshopSellUsedThisVisit });
    dispatch({ type: 'set_hotel_item_received', used: saved.hotelItemReceivedThisVisit ?? false });
    dispatch({ type: 'set_event', event: saved.activeEvent });
    dispatch({
      type: 'set_battle_setup',
      setup: saved.currentScreen === 'battle' ? saved.battleSetup : null,
      tileType: saved.currentScreen === 'battle' ? saved.lastTileType : null,
    });
    dispatch({ type: 'set_branch', tileId: saved.selectedBranchTileId });
    dispatch({ type: 'set_selectable_tiles', tileIds: saved.selectableTileIds });
    dispatch({ type: 'set_pending_steps', steps: saved.pendingSteps });
    dispatch({ type: 'set_dice', value: saved.dice.value, rolling: false });
    dispatch({ type: 'set_card_remove_count', value: saved.cardRemoveCount });
    dispatch({ type: 'set_run_stats', totalTurns: saved.totalTurns, cardsAcquired: saved.cardsAcquired, lastDefeatedBy: saved.lastDefeatedBy });
    dispatch({ type: 'set_current_area', area: saved.currentArea });
    dispatch({ type: 'set_board', board: saved.board });
    dispatch({ type: 'set_current_tile', tileId: saved.currentTileId });
    dispatch({ type: 'set_screen', screen: saved.currentScreen });
  };

  const openZukanFromHome = () => {
    dispatch({ type: 'set_screen', screen: 'zukan' });
  };

  const backToHomeFromJobSelect = () => {
    dispatch({ type: 'set_screen', screen: 'home' });
  };

  const backToHomeFromZukan = () => {
    dispatch({ type: 'set_screen', screen: 'home' });
  };

  const unlockAllCardsForDebug = (names: Set<string>) => {
    dispatch({ type: 'set_unlocked_card_names', names: new Set(names) });
  };

  const startDevNavigation = (destination: Exclude<DevDestination, 'boss_reward' | 'story'>) => {
    const jobId: JobId = 'carpenter';
    const jobConfig = getJobConfig(jobId);
    const area = destination === 'battle_boss_2' ? 2 : destination === 'battle_boss_3' ? 3 : 1;
    const devPlayer: PlayerState = {
      ...stateRef.current.player,
      jobId,
      maxHp: jobConfig.initialHp,
      currentHp: jobConfig.initialHp,
      block: 0,
      scaffold: 0,
      cookingGauge: 0,
      mental: jobConfig.initialMental,
      gold: 100,
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
      nextAttackBoostValue: 0,
      nextAttackBoostCount: 0,
      timeBonusPerTurn: 0,
      nextCardDoubleEffect: false,
      nextCardEffectBoost: 0,
    };
    const devDeck = jobConfig.createStarterDeck();
    const devBoard = updateBoardPosition(generateBoard(), 1);

    dispatch({ type: 'set_job', jobId });
    dispatch({ type: 'set_player', player: devPlayer });
    dispatch({ type: 'set_deck', deck: devDeck });
    dispatch({ type: 'set_items', items: [] });
    dispatch({ type: 'set_omamoris', omamoris: [] });
    dispatch({ type: 'set_card_reward', cards: null });
    dispatch({ type: 'set_omamori_reward', omamoris: null, source: null });
    dispatch({ type: 'set_shop', shopItems: [] });
    dispatch({ type: 'set_pawnshop_sell_used', used: false });
    dispatch({ type: 'set_hotel_item_received', used: false });
    dispatch({ type: 'set_event', event: null });
    dispatch({ type: 'set_battle_setup', setup: null, tileType: null });
    dispatch({ type: 'set_branch', tileId: null });
    dispatch({ type: 'set_selectable_tiles', tileIds: [] });
    dispatch({ type: 'clear_traveled_edges' });
    dispatch({ type: 'set_pending_steps', steps: 0 });
    dispatch({ type: 'set_dice', value: null, rolling: false });
    dispatch({ type: 'set_card_remove_count', value: 0 });
    dispatch({ type: 'set_run_stats', totalTurns: 0, cardsAcquired: 0, lastDefeatedBy: '' });
    dispatch({ type: 'set_current_area', area });
    dispatch({ type: 'set_board', board: devBoard });
    dispatch({ type: 'set_current_tile', tileId: 1 });

    if (destination === 'battle_all_cards') {
      const allCarpenterCards = [
        ...CARPENTER_STARTER_DECK,
        ...CARPENTER_COMMON_POOL,
        ...CARPENTER_UNCOMMON_POOL,
        ...CARPENTER_RARE_POOL,
        ...RESERVE_BONUS_CARDS,
      ];
      const allNeutralCards = [...NEUTRAL_CARD_POOL];
      const allCards = [...allCarpenterCards, ...allNeutralCards];
      const deck: Card[] = allCards.flatMap((card) => [cloneRewardCard(card), cloneRewardCard(card)]);
      const setup: BattleSetup = {
        jobId,
        kind: 'battle',
        enemies: createEncounterFromTemplateIds(['claimer']),
        deck,
        player: devPlayer,
        omamoris: [],
        items: [],
      };
      dispatch({ type: 'set_deck', deck });
      dispatch({ type: 'set_battle_setup', setup, tileType: 'enemy' });
      dispatch({ type: 'set_screen', screen: 'battle' });
      return;
    }

    if (destination === 'battle_normal' || destination === 'battle_elite' || destination.startsWith('battle_boss')) {
      const templateId =
        destination === 'battle_normal'
          ? 'claimer'
          : destination === 'battle_elite'
            ? 'biker_leader'
            : destination === 'battle_boss_1'
              ? 'monster_customer'
              : destination === 'battle_boss_2'
                ? 'evil_ceo'
                : 'world_tree_warden';
      const kind = destination === 'battle_normal' ? 'battle' : destination === 'battle_elite' ? 'elite' : 'boss';
      const tileType = destination === 'battle_normal' ? 'enemy' : destination === 'battle_elite' ? 'unique_boss' : 'area_boss';
      const setup: BattleSetup = {
        jobId,
        kind,
        enemies: createEncounterFromTemplateIds([templateId]),
        deck: devDeck,
        player: devPlayer,
        omamoris: [],
        items: [],
      };
      dispatch({ type: 'set_battle_setup', setup, tileType });
      dispatch({ type: 'set_screen', screen: 'battle' });
      return;
    }

    if (destination === 'shop') {
      const cards = generateShopCards(6, jobId).map((card, idx) => ({
        id: `shop_card_dev_${idx}_${card.id}`,
        type: 'card' as const,
        item: card,
        price: getCardPrice(card),
      }));
      const items = generateShopItems(2).map((item, idx) => ({
        id: `shop_item_dev_${idx}_${item.id}`,
        type: 'item' as const,
        item,
        price: item.price,
      }));
      const omamori = generateOmamoriChoices(1).map((entry, idx) => ({
        id: `shop_omamori_dev_${idx}`,
        type: 'omamori' as const,
        item: entry,
        price: 150,
      }));
      dispatch({
        type: 'set_shop',
        shopItems: [...cards, ...omamori, ...items],
      });
      dispatch({ type: 'set_screen', screen: 'pawnshop' });
      return;
    }
    if (destination === 'shrine') {
      dispatch({ type: 'set_omamori_reward', omamoris: generateOmamoriChoices(3, []), source: 'shrine' });
      dispatch({ type: 'set_screen', screen: 'shrine' });
      return;
    }
    if (destination === 'hotel') {
      dispatch({ type: 'set_hotel_item_received', used: false });
      dispatch({ type: 'set_screen', screen: 'hotel' });
      return;
    }
    if (destination === 'event') {
      dispatch({ type: 'set_event', event: pickEvent() });
      dispatch({ type: 'set_screen', screen: 'event' });
      return;
    }
    if (destination === 'card_reward') {
      dispatch({ type: 'set_card_reward', cards: generateCardRewardChoices(jobId, 3) });
      dispatch({ type: 'set_screen', screen: 'card_reward' });
    }
  };

  const startRunFromJobSelect = (jobId: JobId) => {
    const jobConfig = getJobConfig(jobId);
    const nextPlayer: PlayerState = {
      ...stateRef.current.player,
      jobId,
      maxHp: jobConfig.initialHp,
      currentHp: jobConfig.initialHp,
      block: 0,
      scaffold: 0,
      cookingGauge: 0,
      mental: jobConfig.initialMental,
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
      nextAttackBoostValue: 0,
      nextAttackBoostCount: 0,
      timeBonusPerTurn: 0,
      nextCardDoubleEffect: false,
      nextCardEffectBoost: 0,
    };
    dispatch({ type: 'set_job', jobId });
    dispatch({ type: 'set_player', player: nextPlayer });
    dispatch({ type: 'set_deck', deck: jobConfig.createStarterDeck() });
    dispatch({ type: 'set_items', items: [] });
    dispatch({ type: 'set_omamoris', omamoris: [] });
    dispatch({ type: 'set_card_reward', cards: null });
    dispatch({ type: 'set_omamori_reward', omamoris: null, source: null });
    dispatch({ type: 'set_shop', shopItems: [] });
    dispatch({ type: 'set_pawnshop_sell_used', used: false });
    dispatch({ type: 'set_hotel_item_received', used: false });
    dispatch({ type: 'set_event', event: null });
    dispatch({ type: 'set_battle_setup', setup: null, tileType: null });
    dispatch({ type: 'set_branch', tileId: null });
    dispatch({ type: 'set_selectable_tiles', tileIds: [] });
    dispatch({ type: 'clear_traveled_edges' });
    dispatch({ type: 'set_pending_steps', steps: 0 });
    dispatch({ type: 'set_dice', value: null, rolling: false });
    dispatch({ type: 'set_card_remove_count', value: 0 });
    dispatch({ type: 'set_run_stats', totalTurns: 0, cardsAcquired: 0, lastDefeatedBy: '' });
    dispatch({ type: 'set_current_area', area: 1 });
    dispatch({ type: 'set_board', board: updateBoardPosition(generateBoard(), 1) });
    dispatch({ type: 'set_current_tile', tileId: 1 });
    dispatch({ type: 'set_screen', screen: 'map' });
  };

  return {
    state,
    pendingItemReplacement: state.pendingItemReplacement,
    branchPreviews,
    rollDiceAndMove,
    chooseBranch,
    chooseEventChoice,
    hotelHeal,
    hotelMeditate,
    hotelGetItem,
    resolvePendingItemReplacement,
    openHotelUpgrade,
    closeCardUpgrade,
    upgradeDeckCard,
    removeCardInUpgrade,
    removeCardAtPawnshop,
    getRemoveCost,
    buyShopItem,
    sellPawnshopCard,
    closePawnshop,
    onBattleTurnStart,
    onBattleEnd,
    pickCardReward,
    pickOmamoriReward,
    applyBossReward,
    advanceAfterAreaBoss,
    continueFromSave,
    startRunFromHome,
    openZukanFromHome,
    backToHomeFromJobSelect,
    backToHomeFromZukan,
    unlockAllCardsForDebug,
    startDevNavigation,
    startRunFromJobSelect,
    resetRun,
  };
};
