import type { Card } from '../types/game';

export type UpgradeType = 'damage' | 'block' | 'time';

export const upgradeCard = (card: Card, upgradeType: UpgradeType): Card => {
  const upgraded: Card = {
    ...card,
    name: card.name.endsWith('+') ? card.name : `${card.name}+`,
    upgraded: true,
  };

  if (upgradeType === 'damage') {
    upgraded.damage = (card.damage ?? 0) + 3;
    upgraded.description = card.description.replace(
      /(\d+)ダメージ/,
      `${(card.damage ?? 0) + 3}ダメージ`,
    );
  } else if (upgradeType === 'block') {
    upgraded.block = (card.block ?? 0) + 3;
    upgraded.description = card.description.replace(
      /(\d+)ブロック/,
      `${(card.block ?? 0) + 3}ブロック`,
    );
  } else {
    upgraded.timeCost = Math.max(1, card.timeCost - 1);
  }

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
