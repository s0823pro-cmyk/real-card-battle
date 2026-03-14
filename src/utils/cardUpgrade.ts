import type { Card } from '../types/game';

export const upgradeCard = (card: Card): Card => {
  const upgraded: Card = {
    ...card,
    name: card.name.endsWith('+') ? card.name : `${card.name}+`,
    timeCost: Math.max(1, card.timeCost - 1),
  };

  if (upgraded.damage) upgraded.damage += 3;
  if (upgraded.block) upgraded.block += 3;

  if (upgraded.reserveBonus?.damageMultiplier) {
    upgraded.reserveBonus = {
      ...upgraded.reserveBonus,
      damageMultiplier: upgraded.reserveBonus.damageMultiplier + 0.5,
    };
  }
  if (upgraded.reserveBonus?.blockMultiplier) {
    upgraded.reserveBonus = {
      ...upgraded.reserveBonus,
      blockMultiplier: upgraded.reserveBonus.blockMultiplier + 0.5,
    };
  }

  return upgraded;
};
