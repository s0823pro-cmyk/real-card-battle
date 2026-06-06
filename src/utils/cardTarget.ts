import type { Card, EffectType } from '../types/game';
import { isCardIdVariantOf } from './cardIds';

const ENEMY_TARGET_EFFECTS: EffectType[] = [
  'debuff_enemy',
  'debuff_enemy_atk',
  'vulnerable',
  'burn',
  'weak',
];

export const isEnemyTargetCard = (card: Card): boolean => {
  if (isCardIdVariantOf(card.id, 'gamble')) return true;
  if (card.type === 'attack') return true;
  return Boolean(card.effects?.some((effect) => ENEMY_TARGET_EFFECTS.includes(effect.type)));
};
