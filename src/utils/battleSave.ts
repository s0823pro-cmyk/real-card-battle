import type { Card, Enemy, GameState, PlayerState, ToolSlot } from '../types/game';
import type { GameProgress } from '../types/run';

const BATTLE_SAVE_KEY = 'jobless_battle_save';

export interface BattleSaveData {
  // バトル内状態
  player: PlayerState;
  enemies: Enemy[];
  drawPile: Card[];
  hand: Card[];
  discardPile: Card[];
  exhaustedCards: Card[];
  reserved: Card[];
  activePowers: Card[];
  toolSlots: ToolSlot[];
  turn: number;
  // ランの全状態（復帰後の続きのため）
  runProgress: GameProgress;
  // 保存時刻
  savedAt: number;
}

type SerializedRunProgress = Omit<GameProgress, 'unlockedCardNames'> & {
  unlockedCardNames: string[];
};

type StoredBattleSaveData = Omit<BattleSaveData, 'runProgress'> & {
  runProgress: SerializedRunProgress;
};

const getMaxTime = (mental: number, timeBonusPerTurn = 0): number =>
  Math.max(3, Number((5 + mental * 0.3 + timeBonusPerTurn).toFixed(1)));

export function saveBattleState(gameState: GameState, runProgress: GameProgress): void {
  const serializedRunProgress: SerializedRunProgress = {
    ...runProgress,
    unlockedCardNames: [...runProgress.unlockedCardNames],
  };
  const data: StoredBattleSaveData = {
    player: gameState.player,
    enemies: gameState.enemies,
    drawPile: gameState.drawPile,
    hand: gameState.hand,
    discardPile: gameState.discardPile,
    exhaustedCards: gameState.exhaustedCards,
    reserved: gameState.reserved,
    activePowers: gameState.activePowers,
    toolSlots: gameState.toolSlots,
    turn: gameState.turn,
    runProgress: serializedRunProgress,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(BATTLE_SAVE_KEY, JSON.stringify(data));
  } catch {
    // localStorage が使えない場合は無視
  }
}

export function loadBattleState(): BattleSaveData | null {
  try {
    const saved = localStorage.getItem(BATTLE_SAVE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as StoredBattleSaveData;
    const unlocked = Array.isArray(parsed.runProgress?.unlockedCardNames)
      ? parsed.runProgress.unlockedCardNames
      : [];
    return {
      ...parsed,
      runProgress: {
        ...parsed.runProgress,
        unlockedCardNames: new Set(unlocked),
        pendingItemReplacement: null,
      },
    };
  } catch {
    return null;
  }
}

export function clearBattleState(): void {
  localStorage.removeItem(BATTLE_SAVE_KEY);
}

export function hasBattleSave(): boolean {
  return localStorage.getItem(BATTLE_SAVE_KEY) !== null;
}

export function restoreGameState(data: BattleSaveData): GameState {
  return {
    phase: 'player_turn',
    turn: data.turn,
    maxTime: getMaxTime(data.player.mental, data.player.timeBonusPerTurn ?? 0),
    usedTime: 0,
    shuffleAnimation: false,
    hand: data.hand,
    timeline: [],
    reserved: data.reserved,
    drawPile: data.drawPile,
    discardPile: data.discardPile,
    exhaustedCards: data.exhaustedCards,
    activePowers: data.activePowers,
    player: data.player,
    enemies: data.enemies,
    executingIndex: -1,
    toolSlots: data.toolSlots,
  };
}
