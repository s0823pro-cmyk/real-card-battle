import type { Card } from '../types/game';
import type { CardUpgrade } from '../data/upgrades/carpenterUpgrades';

export type UpgradeType = 'damage' | 'block' | 'time';

/** カード名ベースの定義データで強化する（推奨） */
export function upgradeCardByDefinition(
  card: Card,
  upgrades: Record<string, CardUpgrade>,
): Card {
  if (card.upgraded) return card;
  const upgrade = upgrades[card.name];
  if (!upgrade) return card;

  return {
    ...card,
    name: upgrade.name,
    damage: upgrade.damage ?? card.damage,
    block: upgrade.block ?? card.block,
    timeCost: upgrade.timeCost ?? card.timeCost,
    description: upgrade.description,
    effects: upgrade.effects ?? card.effects,
    upgraded: true,
  };
}

/** 強化済みカードの判定 */
export function isUpgraded(card: Card): boolean {
  return card.upgraded === true || card.name.endsWith('+');
}

/** 旧来のタイプ選択方式（後方互換用） */
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
