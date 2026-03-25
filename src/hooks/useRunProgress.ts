import { useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react';
import type { BossRewardType } from '../data/bossRewards';
import { CARPENTER_STARTER_DECK, CURSE_CARD, RESERVE_BONUS_CARDS } from '../data/carpenterDeck';
import { NEUTRAL_CARD_POOL } from '../data/cards/neutralCards';
import { getJobConfig } from '../data/jobs';
import { cloneRewardCard } from '../data/jobs/index';
import {
  CARPENTER_COMMON_POOL,
  CARPENTER_RARE_POOL_ALL,
  CARPENTER_UNCOMMON_POOL,
} from '../data/jobs/carpenter';
import {
  CARPENTER_EXPANSION_COMMON,
  CARPENTER_EXPANSION_RARE,
  CARPENTER_EXPANSION_UNCOMMON,
} from '../data/jobs/carpenterExpansion';
import {
  NEUTRAL_EXPANSION_COMMON_POOL,
  NEUTRAL_EXPANSION_RARE_POOL,
  NEUTRAL_EXPANSION_UNCOMMON_POOL,
} from '../data/cards/neutralExpansion';
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
  getSellPrice,
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
  BattleKind,
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
import { getEffectiveMaxMental } from '../utils/mentalLimits';
import { clearBattleState, saveBattleState } from '../utils/battleSave';
import type { Achievement } from '../utils/achievementSystem';
import {
  evaluateAchievementsAfterBattle,
  recordBattleEndForAchievements,
  recordDiceRollForAchievements,
  recordEventResolvedForAchievements,
  recordHotelVisitForAchievements,
  recordShrineVisitForAchievements,
  recordShopCardBuyForAchievements,
} from '../utils/achievementSystem';
import { playSeByType } from './useAudio';

/** 開発用: 拡張プールの全カード（各1枚分の定義） */
const DEV_EXPANSION_CARD_POOLS_LIST: Card[] = [
  ...CARPENTER_EXPANSION_COMMON,
  ...CARPENTER_EXPANSION_UNCOMMON,
  ...CARPENTER_EXPANSION_RARE,
  ...NEUTRAL_EXPANSION_COMMON_POOL,
  ...NEUTRAL_EXPANSION_UNCOMMON_POOL,
  ...NEUTRAL_EXPANSION_RARE_POOL,
];

/**
 * 「初期＋拡張バトル開始」用: チェックリストで [o] 済みの拡張カードは積まず、
 * [効果調整]のみ（再確認向け）を各1枚。
 */
const DEV_BATTLE_EXPANSION_RECHECK_ONLY_IDS: readonly string[] = [
  'sumitsubo_makijaku',
  'daiku_nomi_mejirushi',
  'sagyo_dai',
  'sumitsuke_naoshi',
  'hari_tsugite',
  'kanazuchi_hibiki',
  'nokogiri_renda',
  'kensa_gokaku',
  'shiage_kanna',
  'zenmen_kaiso',
  'kiai_ireru',
  'shinshin_choritu',
  'gyakkyou_sainou',
];

const cloneExpansionCardsOnceForDevBattleRecheckOnly = (): Card[] =>
  DEV_EXPANSION_CARD_POOLS_LIST.filter((card) => DEV_BATTLE_EXPANSION_RECHECK_ONLY_IDS.includes(card.id)).map(
    (card) => cloneRewardCard(card),
  );

const cloneExpansionCardsTwiceForDev = (): Card[] =>
  DEV_EXPANSION_CARD_POOLS_LIST.flatMap((card) => [cloneRewardCard(card), cloneRewardCard(card)]);

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** lastTileType が欠けているとき battleSetup から復元（ボス討伐後の遷移不具合対策） */
function inferLastTileTypeFromSetup(setup: BattleSetup | null): TileType | null {
  if (!setup) return null;
  if (setup.kind === 'boss') return 'area_boss';
  if (setup.kind === 'elite') return 'unique_boss';
  return 'enemy';
}

/**
 * バトル結果の kind は常に setup.kind と一致する想定だが、ラン状態の lastTileType / battleSetup が
 * 欠落していると preservedLastTileType が null になり lastTileType が消える → エリート後に
 * regenerate が通常枠になりレア報酬フローと不整合、またはタップ後の遷移が壊れる原因になる。
 */
function inferLastTileTypeFromBattleResultKind(kind: BattleKind): TileType {
  if (kind === 'boss') return 'area_boss';
  if (kind === 'elite') return 'unique_boss';
  return 'enemy';
}
const UNLOCKED_CARD_NAMES_STORAGE_KEY = 'real-card-battle:unlocked-card-names';
const SAVE_DATA_KEY = 'real-card-battle:save-data';
const NON_RESUMABLE_SCREENS = [
  'home',
  'title',
  'zukan',
  'job_select',
  'victory',
  'game_over',
  'omamori_reward',
  'boss_reward',
];
const NORMALIZE_TO_MAP = ['battle', 'omamori_reward', 'boss_reward', 'battle_victory'];
export type DevDestination =
  | 'battle_normal'
  | 'battle_elite'
  | 'battle_boss_1'
  | 'battle_boss_2'
  | 'battle_boss_3'
  | 'battle_all_cards'
  /** 初期デッキ + 拡張のうちチェックリスト [効果調整] のみ各1枚（[o] 済みは含めない）で戦闘開始 */
  | 'battle_expansion_x2'
  | 'shop'
  | 'shrine'
  | 'hotel'
  | 'event'
  | 'card_reward'
  | 'boss_reward'
  | 'story';

type SerializedProgress = Omit<GameProgress, 'unlockedCardNames' | 'lastBattleNewAchievements'> & {
  unlockedCardNames: string[];
};

const saveProgressToStorage = (progress: GameProgress): void => {
  try {
    const { lastBattleNewAchievements: _a, ...rest } = progress;
    const saveable: SerializedProgress = {
      ...rest,
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
    let normalizedScreen: GameScreen = parsed.currentScreen;
    const savedRewardCount = parsed.cardReward?.cards?.length ?? 0;
    // 報酬カードがあるときはカード選択へ。空でも battle_victory / card_reward のまま返し continueFromSave で再生成
    if (
      (parsed.currentScreen === 'battle_victory' || parsed.currentScreen === 'card_reward') &&
      savedRewardCount > 0
    ) {
      normalizedScreen = 'card_reward';
    } else if (NORMALIZE_TO_MAP.includes(parsed.currentScreen)) {
      normalizedScreen = 'map';
    }
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
      lastBattleNewAchievements: [],
      rewardAdUsed: parsed.rewardAdUsed ?? false,
      defeatReviveUsedThisRun: parsed.defeatReviveUsedThisRun ?? false,
      battleVictorySeq: typeof parsed.battleVictorySeq === 'number' ? parsed.battleVictorySeq : 0,
      lastVictoryRewardGold: parsed.lastVictoryRewardGold ?? 0,
      lastVictoryMentalRecovery: parsed.lastVictoryMentalRecovery ?? 0,
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
  | { type: 'set_screen_with_achievements'; screen: GameScreen; achievements: Achievement[] }
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
  | { type: 'close_card_upgrade' }
  | { type: 'set_last_battle_achievements'; achievements: Achievement[] }
  | { type: 'set_reward_ad_used'; used: boolean }
  | { type: 'set_defeat_revive_used'; used: boolean }
  | { type: 'set_last_victory_rewards'; rewardGold: number; mentalRecovery: number }
  | { type: 'set_battle_victory_seq'; value: number }
  /**
   * バトル勝利後の更新を1回の reducer で適用する。
   * 連続 dispatch だと React のバッチとは別に、中間状態を読む useEffect / stateRef との競合で
   * cardReward が欠落したように見えることがある（エリート・ボス後の VICTORY で進めない原因）。
   */
  | {
      type: 'apply_battle_win_bundle';
      runStats: { totalTurns: number; lastDefeatedBy: string };
      player: PlayerState;
      deck: Card[];
      items: RunItem[];
      lastTileType: TileType;
      achievements: Achievement[];
      lastVictoryRewardGold: number;
      lastVictoryMentalRecovery: number;
      cardRewardCards: Card[] | null;
      omamoriReward: { omamoris: Omamori[] | null; source: 'battle' | 'shrine' | null };
      nextScreen: 'battle_victory' | 'victory';
    };

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
  nextCardBlockMultiplier: 1,
  timeBonusPerTurn: 0,
  nextCardDoubleEffect: false,
  nextCardEffectBoost: 0,
  attackDamageBonusAllAttacks: 0,
  mentalMaxBonus: 0,
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
    lastBattleNewAchievements: [],
    rewardAdUsed: false,
    defeatReviveUsedThisRun: false,
    lastVictoryRewardGold: 0,
    lastVictoryMentalRecovery: 0,
    battleVictorySeq: 0,
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
    case 'set_screen_with_achievements':
      return {
        ...state,
        currentScreen: action.screen,
        lastBattleNewAchievements: action.achievements,
      };
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
    case 'set_omamori_reward': {
      const hasChoices = Boolean(action.omamoris && action.omamoris.length > 0);
      return {
        ...state,
        omamoriRewardChoices: action.omamoris,
        omamoriRewardSource: hasChoices ? action.source : null,
      };
    }
    case 'set_last_victory_rewards':
      return {
        ...state,
        lastVictoryRewardGold: action.rewardGold,
        lastVictoryMentalRecovery: action.mentalRecovery,
      };
    case 'set_battle_victory_seq':
      return { ...state, battleVictorySeq: action.value };
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
    case 'set_last_battle_achievements':
      return { ...state, lastBattleNewAchievements: action.achievements };
    case 'set_reward_ad_used':
      return { ...state, rewardAdUsed: action.used };
    case 'set_defeat_revive_used':
      return { ...state, defeatReviveUsedThisRun: action.used };
    case 'apply_battle_win_bundle': {
      const a = action;
      const gained = Math.max(0, a.deck.length - state.deck.length);
      const hasOmamori = Boolean(a.omamoriReward.omamoris && a.omamoriReward.omamoris.length > 0);
      const nextBattleVictorySeq =
        a.nextScreen === 'battle_victory' ? state.battleVictorySeq + 1 : state.battleVictorySeq;
      return {
        ...state,
        battleVictorySeq: nextBattleVictorySeq,
        totalTurns: a.runStats.totalTurns,
        lastDefeatedBy: a.runStats.lastDefeatedBy,
        player: a.player,
        deck: a.deck,
        unlockedCardNames: new Set([...state.unlockedCardNames, ...a.deck.map((card) => card.name)]),
        cardsAcquired: state.cardsAcquired + gained,
        items: a.items,
        battleSetup: null,
        lastTileType: a.lastTileType,
        lastBattleNewAchievements: a.achievements,
        lastVictoryRewardGold: a.lastVictoryRewardGold,
        lastVictoryMentalRecovery: a.lastVictoryMentalRecovery,
        cardReward:
          a.cardRewardCards && a.cardRewardCards.length > 0
            ? { cards: a.cardRewardCards, canSkip: true }
            : null,
        omamoriRewardChoices: a.omamoriReward.omamoris,
        omamoriRewardSource: hasOmamori ? a.omamoriReward.source : null,
        currentScreen: a.nextScreen,
      };
    }
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

const getRemoveCost = (removeCount: number): number => 50 + removeCount * 25;

/** バトル終了時と同じルールで報酬カードを再生成（unique_boss / area_boss はレア枠） */
const regenerateCardRewardChoices = (jobId: JobId, lastTileType: TileType | null): Card[] => {
  const useRare = lastTileType === 'area_boss' || lastTileType === 'unique_boss';
  return useRare ? generateRareCardRewardChoices(jobId, 3) : generateCardRewardChoices(jobId, 3);
};

const advanceAfterAreaBossCore = (
  dispatchFn: (action: Action) => void,
  currentArea: number,
  player: PlayerState,
  jobId: JobId,
) => {
  if (currentArea >= 3) {
    dispatchFn({ type: 'set_screen', screen: 'victory' });
    return;
  }
  playSeByType('heal');
  const jc = getJobConfig(jobId);
  const effectiveMaxMental = getEffectiveMaxMental(player);
  const mentalAfterAreaClear = Math.min(
    effectiveMaxMental,
    jc.initialMental + (player.mentalMaxBonus ?? 0),
  );
  dispatchFn({
    type: 'set_player',
    player: {
      ...player,
      currentHp: player.maxHp,
      /** ボス報酬のメンタル上限+1 等を反映（例：大工 7/9 → +1 上限後はエリア開始 8/10） */
      mental: mentalAfterAreaClear,
    },
  });
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
    case 'mental': {
      const cap = getEffectiveMaxMental(next.player);
      next.player.mental = Math.max(0, Math.min(cap, next.player.mental + effect.value));
      break;
    }
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
  /**
   * apply_battle_win_bundle 直後でも stateRef / reducer と競合して cardReward が一瞬空に見えることがある。
   * エリート・エリアボス後の VICTORY で進めない対策として、生成した報酬3枚を退避する。
   */
  const lastBattleVictoryCardChoicesRef = useRef<Card[] | null>(null);
  /** 同一フレーム内の proceed 二重発火のみ抑止（時間デバウンスは前戦の値が残り雑魚戦で進めなくなるため使わない） */
  const victoryProceedScheduledRef = useRef(false);
  /** onBattleEnd 直後に stateRef が未更新の瞬間でも proceedFromBattleVictory の再生成に使う */
  const lastBattleResultKindRef = useRef<BattleKind | null>(null);
  /**
   * エリア3最終ボス撃破でランクリア（currentScreen: victory）に入った直後のみ true。
   * App.tsx で showAreaStory(3) を出す判定に使う。state.currentArea >= 3 だけだと
   * エリア1・2のエリアボス後に誤ってストーリーが被り、VICTORY タップが奪われることがある。
   */
  const pendingArea3RunVictoryStoryRef = useRef(false);
  const prevScreenRef = useRef(state.currentScreen);
  /** ペイント前に同期しないと、VICTORY 直後のタップで cardReward が未反映の stateRef を読み進めないことがある */
  useLayoutEffect(() => {
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
      dispatch({ type: 'set_event', event: pickEvent(stateRef.current.currentArea) });
      dispatch({ type: 'set_screen', screen: 'event' });
      return;
    }
    if (tile.type === 'shrine') {
      recordShrineVisitForAchievements();
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
      recordHotelVisitForAchievements();
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
    recordDiceRollForAchievements();
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

    if (event.id === 'gambling_invite' && choiceIndex === 0) {
      let nextState = stateRef.current;
      const effect =
        Math.random() < 0.5
          ? ({ type: 'gold', value: 80 } as const)
          : ({ type: 'gold', value: -40 } as const);
      nextState = applySingleEffect(nextState, effect);
      dispatch({ type: 'set_player', player: nextState.player });
      dispatch({ type: 'set_deck', deck: nextState.deck });
      dispatch({ type: 'set_omamoris', omamoris: nextState.omamoris });
      dispatch({ type: 'set_event', event: null });
      recordEventResolvedForAchievements();
      dispatch({ type: 'set_screen', screen: 'map' });
      return;
    }
    if (event.id === 'mystery_medicine' && choiceIndex === 0) {
      let nextState = stateRef.current;
      const effect =
        Math.random() < 0.5
          ? ({ type: 'heal', value: 30 } as const)
          : ({ type: 'damage', value: 20 } as const);
      nextState = applySingleEffect(nextState, effect);
      if (effect.type === 'heal') {
        playSeByType('heal');
      } else if (effect.type === 'damage' && effect.value > 0) {
        playSeByType('damage');
      }
      dispatch({ type: 'set_player', player: nextState.player });
      dispatch({ type: 'set_deck', deck: nextState.deck });
      dispatch({ type: 'set_omamoris', omamoris: nextState.omamoris });
      dispatch({ type: 'set_event', event: null });
      recordEventResolvedForAchievements();
      dispatch({ type: 'set_screen', screen: 'map' });
      return;
    }

    // trainingイベント：受講する（choiceIndex=0）でカード強化画面へ
    if (event.id === 'training' && choiceIndex === 0) {
      dispatch({ type: 'set_event', event: null });
      dispatch({ type: 'open_card_upgrade', mode: 'upgrade', returnScreen: 'map' });
      return;
    }

    const effectIsHealOrPositiveMental = (e: { type: string; value: number }): boolean =>
      e.type === 'heal' || (e.type === 'mental' && e.value > 0);

    let nextState = stateRef.current;
    let shouldPlayHealSe = false;
    let shouldPlayDamageSe = false;
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
        const randomEffect = randomSet[Math.floor(Math.random() * randomSet.length)];
        nextState = applySingleEffect(nextState, randomEffect);
        if (effectIsHealOrPositiveMental(randomEffect)) shouldPlayHealSe = true;
        if (randomEffect.type === 'damage' && randomEffect.value > 0) shouldPlayDamageSe = true;
      } else {
        if (effectIsHealOrPositiveMental(effect)) shouldPlayHealSe = true;
        if (effect.type === 'damage' && effect.value > 0) shouldPlayDamageSe = true;
        nextState = applySingleEffect(nextState, effect);
      }
    }
    if (shouldPlayHealSe) playSeByType('heal');
    if (shouldPlayDamageSe) playSeByType('damage');
    dispatch({ type: 'set_player', player: nextState.player });
    dispatch({ type: 'set_deck', deck: nextState.deck });
    dispatch({ type: 'set_omamoris', omamoris: nextState.omamoris });
    dispatch({ type: 'set_event', event: null });
    recordEventResolvedForAchievements();
    dispatch({ type: 'set_screen', screen: 'map' });
  };

  const openHotelUpgrade = () => {
    dispatch({ type: 'open_card_upgrade', mode: 'upgrade', returnScreen: 'map' });
  };

  const closeCardUpgrade = () => {
    dispatch({ type: 'close_card_upgrade' });
  };

  const hotelHeal = () => {
    playSeByType('heal');
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
    playSeByType('heal');
    dispatch({
      type: 'set_player',
      player: {
        ...stateRef.current.player,
        mental: Math.min(
          getEffectiveMaxMental(stateRef.current.player),
          stateRef.current.player.mental + 2,
        ),
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
    if (shop.type === 'card') {
      recordShopCardBuyForAchievements();
    }
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
    nextCardBlockMultiplier: 1,
    nextCardDoubleEffect: false,
    nextCardEffectBoost: 0,
    attackDamageBonusAllAttacks: 0,
    fullSprintUsedCount: 0,
    mentalMaxBonus: player.mentalMaxBonus ?? 0,
  });

  const onBattleEnd = (result: BattleResult) => {
    lastBattleVictoryCardChoicesRef.current = null;
    victoryProceedScheduledRef.current = false;
    lastBattleResultKindRef.current = result.kind;
    pendingArea3RunVictoryStoryRef.current = false;
    clearBattleState();
    // 敗北確定時点でランセーブを消す（game_over では save がスキップされ、直前の battle 等が残ると再起動後に「続きから」になる）
    if (result.outcome === 'defeat') {
      clearSavedProgress();
    }
    const battleArea = stateRef.current.currentArea;
    recordBattleEndForAchievements(result);
    const newAchievements = evaluateAchievementsAfterBattle(result, battleArea);
    const cleanedDeck = result.deck.filter(
      (card) => card.type !== 'status' && card.type !== 'curse',
    );
    const preservedLastTileType =
      stateRef.current.lastTileType ??
      inferLastTileTypeFromSetup(stateRef.current.battleSetup) ??
      inferLastTileTypeFromBattleResultKind(result.kind);

    if (result.outcome === 'defeat') {
      dispatch({
        type: 'set_run_stats',
        totalTurns: stateRef.current.totalTurns + (result.battleTurns ?? 0),
        lastDefeatedBy: result.defeatedBy ?? stateRef.current.lastDefeatedBy,
      });
      dispatch({ type: 'set_player', player: sanitizePlayerAfterBattle(result.player) });
      dispatch({ type: 'set_deck', deck: cleanedDeck });
      dispatch({ type: 'set_items', items: result.items });
      dispatch({ type: 'set_battle_setup', setup: null, tileType: preservedLastTileType });
      dispatch({
        type: 'set_screen_with_achievements',
        screen: 'game_over',
        achievements: newAchievements,
      });
      return;
    }

    const sanitizedPlayer = sanitizePlayerAfterBattle(result.player);
    const runStatsBase = {
      totalTurns: stateRef.current.totalTurns + (result.battleTurns ?? 0),
      lastDefeatedBy: result.defeatedBy ?? stateRef.current.lastDefeatedBy,
    };

    // エリア3最終ボス: stateRef は未更新のことがあるため preservedLastTileType を使う（stateRef.lastTileType では誤判定しうる）
    if (result.kind === 'boss' && preservedLastTileType === 'area_boss' && battleArea >= 3) {
      pendingArea3RunVictoryStoryRef.current = true;
      dispatch({
        type: 'apply_battle_win_bundle',
        runStats: runStatsBase,
        player: sanitizedPlayer,
        deck: cleanedDeck,
        items: result.items,
        lastTileType: preservedLastTileType,
        achievements: newAchievements,
        lastVictoryRewardGold: result.rewardGold,
        lastVictoryMentalRecovery: result.mentalRecovery,
        cardRewardCards: null,
        omamoriReward: { omamoris: null, source: null },
        nextScreen: 'victory',
      });
      return;
    }

    const useRareCards = result.kind === 'boss' || result.kind === 'elite';
    const cardRewardCards = useRareCards
      ? generateRareCardRewardChoices(stateRef.current.jobId, 3)
      : generateCardRewardChoices(stateRef.current.jobId, 3);
    const omamoriReward =
      result.kind === 'elite' || result.kind === 'boss'
        ? { omamoris: generateOmamoriChoices(3, stateRef.current.omamoris), source: 'battle' as const }
        : { omamoris: null, source: null };

    lastBattleVictoryCardChoicesRef.current =
      cardRewardCards.length > 0 ? cardRewardCards : null;

    dispatch({
      type: 'apply_battle_win_bundle',
      runStats: runStatsBase,
      player: sanitizedPlayer,
      deck: cleanedDeck,
      items: result.items,
      lastTileType: preservedLastTileType,
      achievements: newAchievements,
      lastVictoryRewardGold: result.rewardGold,
      lastVictoryMentalRecovery: result.mentalRecovery,
      cardRewardCards,
      omamoriReward,
      nextScreen: 'battle_victory',
    });
  };

  const pickCardReward = (cardId: string | null, options?: PickRewardOptions) => {
    const pendingOmamori = stateRef.current.omamoriRewardChoices;
    if (cardId) {
      const card = stateRef.current.cardReward?.cards.find((item) => item.id === cardId);
      if (card) dispatch({ type: 'set_deck', deck: [...stateRef.current.deck, card] });
    }
    dispatch({ type: 'set_card_reward', cards: null });
    if (pendingOmamori && pendingOmamori.length > 0) {
      dispatch({ type: 'set_screen', screen: 'omamori_reward' });
      return;
    }
    if (stateRef.current.lastTileType === 'area_boss') {
      if (options?.deferBossTransition) {
        dispatch({ type: 'set_screen', screen: 'map' });
        return;
      }
      advanceAfterAreaBossCore(
        dispatch,
        stateRef.current.currentArea,
        stateRef.current.player,
        stateRef.current.jobId,
      );
      return;
    }
    dispatch({ type: 'set_screen', screen: 'map' });
  };

  const pickOmamoriReward = (omamoriId: string, options?: PickRewardOptions) => {
    const omamori = stateRef.current.omamoriRewardChoices?.find((item) => item.id === omamoriId);
    const source = stateRef.current.omamoriRewardSource;
    const lastTile = stateRef.current.lastTileType;
    if (omamori) dispatch({ type: 'set_omamoris', omamoris: [...stateRef.current.omamoris, omamori] });
    dispatch({ type: 'set_omamori_reward', omamoris: null, source: null });
    if (source === 'battle' && lastTile === 'area_boss') {
      if (options?.deferBossTransition) {
        dispatch({ type: 'set_screen', screen: 'map' });
        return;
      }
      advanceAfterAreaBossCore(
        dispatch,
        stateRef.current.currentArea,
        stateRef.current.player,
        stateRef.current.jobId,
      );
      return;
    }
    dispatch({ type: 'set_screen', screen: 'map' });
  };

  const applyBossReward = (rewardType: BossRewardType, selectedCard?: Card): PlayerState => {
    const p = stateRef.current.player;
    if (rewardType === 'max_hp_up') {
      playSeByType('heal');
      const next: PlayerState = {
        ...p,
        maxHp: p.maxHp + 10,
        currentHp: p.currentHp + 10,
      };
      dispatch({ type: 'set_player', player: next });
      return next;
    }
    if (rewardType === 'mental_max_up') {
      playSeByType('heal');
      const next: PlayerState = {
        ...p,
        mentalMaxBonus: (p.mentalMaxBonus ?? 0) + 1,
      };
      dispatch({ type: 'set_player', player: next });
      return next;
    }
    if (rewardType === 'rare_card' && selectedCard) {
      dispatch({ type: 'set_deck', deck: [...stateRef.current.deck, selectedCard] });
      return p;
    }
    return p;
  };

  const advanceAfterAreaBoss = (playerOverride?: PlayerState) => {
    advanceAfterAreaBossCore(
      dispatch,
      stateRef.current.currentArea,
      playerOverride ?? stateRef.current.player,
      stateRef.current.jobId,
    );
  };

  const proceedFromBattleVictory = () => {
    if (victoryProceedScheduledRef.current) return;
    victoryProceedScheduledRef.current = true;
    try {
      const jobId = stateRef.current.jobId;
      let cards = stateRef.current.cardReward?.cards;
      if (!cards || cards.length === 0) {
        cards = lastBattleVictoryCardChoicesRef.current ?? [];
      }
      if (cards.length > 0) {
        lastBattleVictoryCardChoicesRef.current = null;
        if (!stateRef.current.cardReward?.cards?.length) {
          dispatch({ type: 'set_card_reward', cards });
        }
        dispatch({ type: 'set_screen', screen: 'card_reward' });
        return;
      }
      const tileForRegen =
        stateRef.current.lastTileType ??
        inferLastTileTypeFromBattleResultKind(lastBattleResultKindRef.current ?? 'battle');
      const regen = regenerateCardRewardChoices(jobId, tileForRegen);
      if (regen.length > 0) {
        dispatch({ type: 'set_card_reward', cards: regen });
        dispatch({ type: 'set_screen', screen: 'card_reward' });
        return;
      }
      dispatch({ type: 'set_card_reward', cards: null });
      dispatch({ type: 'set_screen', screen: 'map' });
    } finally {
      queueMicrotask(() => {
        victoryProceedScheduledRef.current = false;
      });
    }
  };

  const consumeDefeatRevive = () => {
    dispatch({ type: 'set_defeat_revive_used', used: true });
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
      nextCardBlockMultiplier: 1,
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
    dispatch({ type: 'set_last_battle_achievements', achievements: [] });
    dispatch({ type: 'set_reward_ad_used', used: false });
    dispatch({ type: 'set_defeat_revive_used', used: false });
    dispatch({ type: 'set_last_victory_rewards', rewardGold: 0, mentalRecovery: 0 });
    dispatch({ type: 'set_battle_victory_seq', value: 0 });
    dispatch({ type: 'set_screen', screen: 'home' });
  };

  const startRunFromHome = () => {
    dispatch({ type: 'set_screen', screen: 'job_select' });
  };

  const continueFromSave = (saved: GameProgress) => {
    lastBattleVictoryCardChoicesRef.current = null;
    victoryProceedScheduledRef.current = false;
    let resolvedScreen: GameScreen = saved.currentScreen;
    let resolvedRewardCards: Card[] | null = saved.cardReward?.cards ?? null;
    if (resolvedScreen === 'battle_victory' || resolvedScreen === 'card_reward') {
      const n = resolvedRewardCards?.length ?? 0;
      if (n > 0) {
        resolvedScreen = 'card_reward';
      } else {
        const regen = regenerateCardRewardChoices(saved.jobId, saved.lastTileType);
        if (regen.length > 0) {
          resolvedRewardCards = regen;
          resolvedScreen = 'card_reward';
        } else {
          resolvedRewardCards = null;
          resolvedScreen = 'map';
        }
      }
    }

    dispatch({ type: 'set_job', jobId: saved.jobId });
    dispatch({ type: 'set_player', player: saved.player });
    dispatch({ type: 'set_deck', deck: saved.deck });
    dispatch({ type: 'set_items', items: saved.items });
    dispatch({ type: 'set_omamoris', omamoris: saved.omamoris });
    dispatch({ type: 'set_card_reward', cards: resolvedRewardCards });
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
    dispatch({ type: 'set_screen', screen: resolvedScreen });
    dispatch({ type: 'set_last_battle_achievements', achievements: [] });
    dispatch({ type: 'set_reward_ad_used', used: saved.rewardAdUsed ?? false });
    dispatch({ type: 'set_defeat_revive_used', used: saved.defeatReviveUsedThisRun ?? false });
    dispatch({
      type: 'set_last_victory_rewards',
      rewardGold: saved.lastVictoryRewardGold ?? 0,
      mentalRecovery: saved.lastVictoryMentalRecovery ?? 0,
    });
    dispatch({ type: 'set_battle_victory_seq', value: saved.battleVictorySeq ?? 0 });
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

  /** 開発のみ: 拡張カードを各2枚ずつ現在のデッキに追加 */
  const addExpansionCardsTwiceToDeckDev = () => {
    if (!import.meta.env.DEV) return;
    const added = cloneExpansionCardsTwiceForDev();
    dispatch({ type: 'set_deck', deck: [...stateRef.current.deck, ...added] });
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
      nextCardBlockMultiplier: 1,
      timeBonusPerTurn: 0,
      nextCardDoubleEffect: false,
      nextCardEffectBoost: 0,
      attackDamageBonusAllAttacks: 0,
    };
    const devDeck = stateRef.current.deck.map((card) => cloneRewardCard(card));
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
    dispatch({ type: 'set_last_battle_achievements', achievements: [] });

    if (destination === 'battle_all_cards') {
      const allCarpenterCards = [
        ...CARPENTER_STARTER_DECK,
        ...CARPENTER_COMMON_POOL,
        ...CARPENTER_UNCOMMON_POOL,
        ...CARPENTER_RARE_POOL_ALL,
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

    if (destination === 'battle_expansion_x2') {
      const starter = jobConfig.createStarterDeck().map((card) => cloneRewardCard(card));
      const deck = [...starter, ...cloneExpansionCardsOnceForDevBattleRecheckOnly()];
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
      dispatch({ type: 'set_event', event: pickEvent(stateRef.current.currentArea) });
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
      nextCardBlockMultiplier: 1,
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
    dispatch({ type: 'set_last_battle_achievements', achievements: [] });
    dispatch({ type: 'set_reward_ad_used', used: false });
    dispatch({ type: 'set_defeat_revive_used', used: false });
    dispatch({ type: 'set_last_victory_rewards', rewardGold: 0, mentalRecovery: 0 });
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
    addExpansionCardsTwiceToDeckDev,
    startDevNavigation,
    startRunFromJobSelect,
    resetRun,
    consumeDefeatRevive,
    proceedFromBattleVictory,
    pendingArea3RunVictoryStoryRef,
  };
};
