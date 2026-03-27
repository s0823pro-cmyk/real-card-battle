import type { Card, GameState } from '../types/game';

/** 全面改装／リフォーム系でバトル中だけ強化したカードを終了時に戻す対象か（プレイしたカード） */
export function isBattleTempUpgradeSourceCard(card: Card): boolean {
  const base = card.name.replace(/\+$/u, '') || card.name;
  return base === '全面改装' || base === 'リフォーム';
}

function revertOne(c: Card, map: Record<string, Card>): Card {
  return map[c.id] ? { ...map[c.id] } : c;
}

/** バトル終了時：一時強化を強化前のスナップショットへ戻し、マップをクリア */
export function applyBattleCardReverts(state: GameState): GameState {
  const map = state.battleCardRevertMap;
  if (!map || Object.keys(map).length === 0) {
    return { ...state, battleCardRevertMap: {} };
  }
  return {
    ...state,
    hand: state.hand.map((c) => revertOne(c, map)),
    drawPile: state.drawPile.map((c) => revertOne(c, map)),
    discardPile: state.discardPile.map((c) => revertOne(c, map)),
    reserved: state.reserved.map((c) => revertOne(c, map)),
    exhaustedCards: state.exhaustedCards.map((c) => revertOne(c, map)),
    activePowers: state.activePowers.map((c) => revertOne(c, map)),
    toolSlots: state.toolSlots.map((slot) =>
      slot ? { ...slot, card: revertOne(slot.card, map) } : slot,
    ),
    timeline: state.timeline.map((t) => ({ ...t, card: revertOne(t.card, map) })),
    battleCardRevertMap: {},
  };
}
