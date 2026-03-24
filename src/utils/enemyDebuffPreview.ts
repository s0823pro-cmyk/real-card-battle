import type { Card, Enemy } from '../types/game';

export type EnemyStatusEffect = Enemy['statusEffects'][number];

function upsertStatusClone(
  effects: EnemyStatusEffect[],
  type: EnemyStatusEffect['type'],
  value: number,
  durationTurns: number,
): EnemyStatusEffect[] {
  const list = effects.map((s) => ({ ...s }));
  const idx = list.findIndex((s) => s.type === type);
  if (idx < 0) {
    const baseDuration = Math.max(1, durationTurns);
    list.push({ type, value, duration: baseDuration });
    return list;
  }
  const current = list[idx];
  if (type === 'vulnerable' || type === 'weak') {
    const turns = Math.max(1, durationTurns);
    list[idx] = {
      ...current,
      value: current.value + turns,
      duration: current.duration + turns,
    };
    return list;
  }
  if (type === 'attack_down') {
    list[idx] = {
      ...current,
      value: current.value + value,
      duration: Math.max(current.duration, Math.max(1, durationTurns)),
    };
    return list;
  }
  list[idx] = {
    ...current,
    value: current.value + value,
    duration: 1,
  };
  return list;
}

/** カード使用時と同じルールで、対象敵に付与されるデバフを仮適用した敵（行動予測用） */
export function applyPendingDebuffPreviewToEnemy(enemy: Enemy, card: Card): Enemy {
  let statusEffects = enemy.statusEffects.map((s) => ({ ...s }));
  for (const effect of card.effects ?? []) {
    if (
      effect.type === 'vulnerable' ||
      effect.type === 'debuff_enemy' ||
      effect.type === 'debuff_enemy_atk' ||
      effect.type === 'weak' ||
      effect.type === 'burn'
    ) {
      const statusType =
        effect.type === 'vulnerable'
          ? 'vulnerable'
          : effect.type === 'burn'
            ? 'burn'
            : effect.type === 'debuff_enemy_atk'
              ? 'attack_down'
              : 'weak';
      const statusDuration =
        effect.type === 'vulnerable' || effect.type === 'weak'
          ? effect.duration ?? effect.value
          : effect.duration ?? 1;
      statusEffects = upsertStatusClone(statusEffects, statusType, effect.value, statusDuration);
    }
  }
  return { ...enemy, statusEffects };
}

export function cardHasEnemyDebuffPreviewEffects(card: Card): boolean {
  return Boolean(
    card.effects?.some((e) =>
      ['vulnerable', 'debuff_enemy', 'debuff_enemy_atk', 'weak', 'burn'].includes(e.type),
    ),
  );
}

/** 敵に脆弱を付与するカードか（ネーム点滅の色分け用） */
export function cardAppliesVulnerableToEnemy(card: Card): boolean {
  return Boolean(card.effects?.some((e) => e.type === 'vulnerable'));
}

/** previewByEnemy と同条件：ダメージ予測が付くか */
export function cardDealsDamageForEnemyPreview(card: Card): boolean {
  return (
    card.type === 'attack' ||
    ((card.type === 'skill' || card.type === 'power') && (card.damage ?? 0) > 0)
  );
}
