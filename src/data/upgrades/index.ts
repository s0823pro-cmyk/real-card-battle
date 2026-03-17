import type { Card } from '../../types/game';
import { CARPENTER_UPGRADES } from './carpenterUpgrades';
import type { CardUpgrade } from './carpenterUpgrades';
import { COOK_UPGRADES } from './cookUpgrades';
import { NEUTRAL_UPGRADES } from './neutralUpgrades';
import { UNEMPLOYED_UPGRADES } from './unemployedUpgrades';

export type { CardUpgrade };
export { CARPENTER_UPGRADES, COOK_UPGRADES, NEUTRAL_UPGRADES, UNEMPLOYED_UPGRADES };

const ALL_UPGRADES: Record<string, Record<string, CardUpgrade>> = {
  carpenter: CARPENTER_UPGRADES,
  cook: COOK_UPGRADES,
  unemployed: UNEMPLOYED_UPGRADES,
};

export function getUpgradeForCard(card: Card, jobId: string): CardUpgrade | null {
  return ALL_UPGRADES[jobId]?.[card.name] ?? NEUTRAL_UPGRADES[card.name] ?? null;
}
