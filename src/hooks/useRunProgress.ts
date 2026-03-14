import { useEffect, useMemo, useReducer, useRef } from 'react';
import { ANXIETY_CARD } from '../data/carpenterDeck';
import { getJobConfig } from '../data/jobs';
import {
  AREA1_BOSS,
  generateCardRewardChoices,
  generateOmamoriChoices,
  generateShopCards,
  generateShopItems,
  getCardPrice,
  pickArea1Elite,
  pickArea1EncounterTemplateIds,
  pickEvent,
} from '../data/runData';
import { createEncounterFromTemplateIds, createEncounterFromTemplates } from '../data/enemies';
import type { Card, JobId, PlayerState } from '../types/game';
import type {
  BattleResult,
  BattleSetup,
  BoardTile,
  GameEvent,
  GameProgress,
  GameScreen,
  Omamori,
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
import { upgradeCard } from '../utils/cardUpgrade';
import type { UpgradeType } from '../utils/cardUpgrade';

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const rollRoulette = (): number => {
  const result = Math.floor(Math.random() * 3) + 1;
  console.log('ルーレット結果:', result);
  return result;
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
  | { type: 'set_card_reward'; cards: Card[] | null }
  | { type: 'set_omamori_reward'; omamoris: Omamori[] | null; source: 'battle' | 'shrine' | null }
  | { type: 'set_battle_setup'; setup: BattleSetup | null; tileType: TileType | null }
  | { type: 'set_player'; player: PlayerState }
  | { type: 'set_job'; jobId: JobId }
  | { type: 'set_deck'; deck: Card[] }
  | { type: 'set_items'; items: RunItem[] }
  | { type: 'set_omamoris'; omamoris: Omamori[] }
  | { type: 'set_card_remove_count'; value: number }
  | { type: 'open_card_upgrade'; mode: 'upgrade' | 'remove'; returnScreen: Exclude<GameScreen, 'card_upgrade'> }
  | { type: 'close_card_upgrade' };

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
};

const makeInitialProgress = (): GameProgress => {
  const board = generateBoard();
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
    cardReward: null,
    omamoriRewardChoices: null,
    omamoriRewardSource: null,
    battleSetup: null,
    lastTileType: null,
    cardUpgradeMode: null,
    returnScreenAfterUpgrade: null,
  };
};

const updateBoardPosition = (board: BoardTile[], tileId: number): BoardTile[] =>
  board.map((tile) => ({
    ...tile,
    isCurrentPosition: tile.id === tileId,
    visited: tile.visited || tile.id === tileId,
  }));

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
      return { ...state, deck: action.deck };
    case 'set_items':
      return { ...state, items: action.items };
    case 'set_omamoris':
      return { ...state, omamoris: action.omamoris };
    case 'set_card_remove_count':
      return { ...state, cardRemoveCount: action.value };
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

const cloneAnxiety = (): Card => ({
  ...ANXIETY_CARD,
  id: `${ANXIETY_CARD.id}_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
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
      next.deck.push(...Array.from({ length: effect.value }).map(() => cloneAnxiety()));
      break;
    case 'omamori':
      break;
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
      console.log(
        `[run-transition] ${prevScreenRef.current} -> ${state.currentScreen} (tile:${state.currentTileId})`,
      );
      prevScreenRef.current = state.currentScreen;
    }
  }, [state.currentScreen, state.currentTileId]);

  useEffect(() => {
    if (state.currentScreen !== 'map') return;
    if (!state.dice.rolling && state.dice.value === null) return;
    dispatch({ type: 'set_dice', value: null, rolling: false });
  }, [state.currentScreen, state.dice.rolling, state.dice.value]);

  const branchPreviews = useMemo(() => {
    if (state.selectableTileIds.length === 0) return [];
    return state.selectableTileIds.map((nextTileId) => ({
      nextTileId,
      previewTiles: getRoutePreviewTiles(state.board, nextTileId, 3),
    }));
  }, [state.board, state.selectableTileIds]);

  const openTileScreen = (tile: BoardTile) => {
    if (tile.type === 'enemy') {
      const setup: BattleSetup = {
        jobId: stateRef.current.jobId,
        kind: 'battle',
        enemies: createEncounterFromTemplateIds(pickArea1EncounterTemplateIds()),
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
      const setup: BattleSetup = {
        jobId: stateRef.current.jobId,
        kind: 'elite',
        enemies: createEncounterFromTemplates([pickArea1Elite()]),
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
      const setup: BattleSetup = {
        jobId: stateRef.current.jobId,
        kind: 'boss',
        enemies: createEncounterFromTemplates([AREA1_BOSS]),
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
      dispatch({ type: 'set_omamori_reward', omamoris: generateOmamoriChoices(3), source: 'shrine' });
      dispatch({ type: 'set_screen', screen: 'shrine' });
      return;
    }
    if (tile.type === 'pawnshop') {
      const discount =
        stateRef.current.omamoris.find((omamori) => omamori.effect.stat === 'shop_discount')?.effect.value ?? 0;
      const cards = generateShopCards(5).map((card, idx) => {
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
        item: generateOmamoriChoices(1)[0],
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
    if (move.stoppedAtBranch) {
      dispatch({ type: 'set_selectable_tiles', tileIds: move.branchOptions });
      dispatch({ type: 'set_screen', screen: 'branch_select' });
      return;
    }
    dispatch({ type: 'set_selectable_tiles', tileIds: [] });
    dispatch({ type: 'set_branch', tileId: null });
    dispatch({ type: 'set_pending_steps', steps: value });
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
    dispatch({ type: 'set_selectable_tiles', tileIds: [] });
    dispatch({ type: 'set_screen', screen: 'map' });
    dispatch({ type: 'set_branch', tileId: nextTileId });
  };

  const chooseEventChoice = (choiceIndex: number) => {
    const event = stateRef.current.activeEvent;
    if (!event) return;
    let nextState = stateRef.current;
    for (const effect of event.choices[choiceIndex]?.effects ?? []) {
      if (event.id === 'vending_machine' && effect.type === 'gold' && effect.value === -10) {
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
    dispatch({ type: 'set_event', event: null });
    console.log('[run-check] event -> map');
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
    console.log('[run-check] hotel-heal -> map');
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
    console.log('[run-check] hotel-mental -> map');
    dispatch({ type: 'set_screen', screen: 'map' });
  };

  const upgradeDeckCard = (cardId: string, upgradeType: UpgradeType) => {
    const target = stateRef.current.deck.find((card) => card.id === cardId);
    if (!target) return;
    if (target.upgraded) return;
    dispatch({
      type: 'set_deck',
      deck: stateRef.current.deck.map((card) =>
        card.id === cardId ? upgradeCard(card, upgradeType) : card,
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
    let nextDeck = [...stateRef.current.deck];
    let nextItems = [...stateRef.current.items];
    let nextOmamoris = [...stateRef.current.omamoris];
    if (shop.type === 'card' && shop.item) {
      nextDeck.push(shop.item as Card);
    } else if (shop.type === 'item' && shop.item && nextItems.length < 3) {
      nextItems.push(shop.item as RunItem);
    } else if (shop.type === 'omamori' && shop.item) {
      nextOmamoris.push(shop.item as Omamori);
    }
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
    console.log('[run-check] pawnshop -> map');
    dispatch({ type: 'set_screen', screen: 'map' });
  };

  const onBattleEnd = (result: BattleResult) => {
    console.log(`[run-check] battle-end outcome:${result.outcome} kind:${result.kind}`);
    dispatch({ type: 'set_player', player: { ...result.player, cookingGauge: 0 } });
    dispatch({ type: 'set_deck', deck: result.deck });
    dispatch({ type: 'set_items', items: result.items });
    dispatch({ type: 'set_battle_setup', setup: null, tileType: stateRef.current.lastTileType });

    if (result.outcome === 'defeat') {
      dispatch({ type: 'set_screen', screen: 'game_over' });
      return;
    }

    dispatch({ type: 'set_card_reward', cards: generateCardRewardChoices(stateRef.current.jobId, 3) });
    if (result.kind === 'elite' || result.kind === 'boss') {
      dispatch({ type: 'set_omamori_reward', omamoris: generateOmamoriChoices(3), source: 'battle' });
    } else {
      dispatch({ type: 'set_omamori_reward', omamoris: null, source: null });
    }
    dispatch({ type: 'set_screen', screen: 'card_reward' });
    console.log('[run-check] battle-victory -> card_reward');
  };

  const pickCardReward = (cardId: string | null) => {
    if (cardId) {
      const card = stateRef.current.cardReward?.cards.find((item) => item.id === cardId);
      if (card) dispatch({ type: 'set_deck', deck: [...stateRef.current.deck, card] });
    }
    dispatch({ type: 'set_card_reward', cards: null });
    if (stateRef.current.omamoriRewardChoices?.length) {
      console.log('[run-check] card_reward -> omamori_reward');
      dispatch({ type: 'set_screen', screen: 'omamori_reward' });
      return;
    }
    if (stateRef.current.lastTileType === 'area_boss') {
      console.log('[run-check] boss card_reward -> victory');
      dispatch({ type: 'set_screen', screen: 'victory' });
      return;
    }
    console.log('[run-check] card_reward -> map');
    dispatch({ type: 'set_screen', screen: 'map' });
  };

  const pickOmamoriReward = (omamoriId: string) => {
    const omamori = stateRef.current.omamoriRewardChoices?.find((item) => item.id === omamoriId);
    if (omamori) dispatch({ type: 'set_omamoris', omamoris: [...stateRef.current.omamoris, omamori] });
    const source = stateRef.current.omamoriRewardSource;
    dispatch({ type: 'set_omamori_reward', omamoris: null, source: null });
    if (source === 'battle' && stateRef.current.lastTileType === 'area_boss') {
      console.log('[run-check] boss omamori_reward -> victory');
      dispatch({ type: 'set_screen', screen: 'victory' });
    } else {
      console.log('[run-check] omamori_reward -> map');
      dispatch({ type: 'set_screen', screen: 'map' });
    }
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
    };
    dispatch({ type: 'set_job', jobId: resetJobId });
    dispatch({ type: 'set_board', board: nextBoard });
    dispatch({ type: 'set_current_tile', tileId: 1 });
    dispatch({ type: 'set_player', player: resetPlayer });
    dispatch({ type: 'set_deck', deck: jobConfig.createStarterDeck() });
    dispatch({ type: 'set_items', items: [] });
    dispatch({ type: 'set_omamoris', omamoris: [] });
    dispatch({ type: 'set_card_remove_count', value: 0 });
    dispatch({ type: 'set_card_reward', cards: null });
    dispatch({ type: 'set_omamori_reward', omamoris: null, source: null });
    dispatch({ type: 'set_shop', shopItems: [] });
    dispatch({ type: 'set_pawnshop_sell_used', used: false });
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

  const backToHomeFromJobSelect = () => {
    dispatch({ type: 'set_screen', screen: 'home' });
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
    dispatch({ type: 'set_event', event: null });
    dispatch({ type: 'set_battle_setup', setup: null, tileType: null });
    dispatch({ type: 'set_branch', tileId: null });
    dispatch({ type: 'set_selectable_tiles', tileIds: [] });
    dispatch({ type: 'clear_traveled_edges' });
    dispatch({ type: 'set_pending_steps', steps: 0 });
    dispatch({ type: 'set_dice', value: null, rolling: false });
    dispatch({ type: 'set_card_remove_count', value: 0 });
    dispatch({ type: 'set_current_tile', tileId: 1 });
    dispatch({ type: 'set_screen', screen: 'map' });
  };

  return {
    state,
    branchPreviews,
    rollDiceAndMove,
    chooseBranch,
    chooseEventChoice,
    hotelHeal,
    hotelMeditate,
    openHotelUpgrade,
    closeCardUpgrade,
    upgradeDeckCard,
    removeCardInUpgrade,
    removeCardAtPawnshop,
    getRemoveCost,
    buyShopItem,
    sellPawnshopCard,
    closePawnshop,
    onBattleEnd,
    pickCardReward,
    pickOmamoriReward,
    startRunFromHome,
    backToHomeFromJobSelect,
    startRunFromJobSelect,
    resetRun,
  };
};
