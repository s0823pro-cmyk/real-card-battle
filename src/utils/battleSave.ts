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

export function saveBattleState(gameState: GameState, runProgress: GameProgress): void {
  const data: BattleSaveData = {
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
    runProgress,
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
    const parsed = JSON.parse(saved) as BattleSaveData;
    // runProgress.unlockedCardNames は Set だが JSON では配列になるので変換
    if (parsed.runProgress?.unlockedCardNames && !('has' in parsed.runProgress.unlockedCardNames)) {
      parsed.runProgress.unlockedCardNames = new Set(
        parsed.runProgress.unlockedCardNames as unknown as string[],
      );
    }
    return parsed;
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
