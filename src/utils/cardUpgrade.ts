import type { Card } from '../types/game';
import type { CardUpgrade } from '../data/upgrades/carpenterUpgrades';
import { getUpgradeForCard } from '../data/upgrades';

export type UpgradeType = 'damage' | 'block' | 'time';

/** カード名ベースの定義データで強化する（ジョブID指定） */
export function upgradeCardByJobId(card: Card, jobId: string): Card {
  if (card.upgraded) return card;
  const upgrade = getUpgradeForCard(card, jobId);
  if (!upgrade) return card;
  return applyUpgrade(card, upgrade);
}

/** カード名ベースの定義データで強化する（マップ直接指定・後方互換） */
export function upgradeCardByDefinition(
  card: Card,
  upgrades: Record<string, CardUpgrade>,
): Card {
  if (card.upgraded) return card;
  const upgrade = upgrades[card.name];
  if (!upgrade) return card;
  return applyUpgrade(card, upgrade);
}

function applyUpgrade(card: Card, upgrade: CardUpgrade): Card {
  const sanitizedDescription = upgrade.description
    .replace(/\s*[（(]所要時間[^）)]*[）)]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return {
    ...card,
    name: upgrade.name,
    damage: upgrade.damage !== undefined ? upgrade.damage : card.damage,
    block: upgrade.block !== undefined ? upgrade.block : card.block,
    timeCost: upgrade.timeCost !== undefined ? upgrade.timeCost : card.timeCost,
    scaffoldMultiplier:
      upgrade.scaffoldMultiplier !== undefined ? upgrade.scaffoldMultiplier : card.scaffoldMultiplier,
    cookingMultiplier:
      upgrade.cookingMultiplier !== undefined ? upgrade.cookingMultiplier : card.cookingMultiplier,
    lowHpBonus: upgrade.lowHpBonus !== undefined ? upgrade.lowHpBonus : card.lowHpBonus,
    reserveBonus: upgrade.reserveBonus
      ? {
          ...(card.reserveBonus ?? {
            description: '',
          }),
          ...upgrade.reserveBonus,
        }
      : card.reserveBonus,
    description: sanitizedDescription,
    effects: upgrade.effects ?? card.effects,
    tags: upgrade.tags !== undefined ? upgrade.tags : card.tags,
    badges: upgrade.tags !== undefined
      ? (upgrade.tags.filter((t) =>
          t === 'exhaust' || t === 'setup' || t === 'reserve' || t === 'self_damage',
        ) as import('../types/game').CardBadge[])
      : card.badges,
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
