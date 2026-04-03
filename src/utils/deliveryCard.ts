import type { Card } from '../types/game';
import { isCardIdVariantOf } from './cardIds';

/** cook.ts の delivery / cookUpgrades の出前配達+ と一致 */
const DELIVERY_TIME_COST_BASE = 4.5;
const DELIVERY_PLUS_TIME_COST_BASE = 4;

/**
 * 出前配達：戦闘中に減った timeCost を戦闘終了後に初期へ戻す（全力疾走の fullSprintUsedCount クリアと同様）。
 */
export function resetDeliveryCardTimeCostForRun(card: Card): Card {
  if (!isCardIdVariantOf(card.id, 'delivery')) return card;
  const base = card.upgraded ? DELIVERY_PLUS_TIME_COST_BASE : DELIVERY_TIME_COST_BASE;
  return { ...card, timeCost: base };
}
