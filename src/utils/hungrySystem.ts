import type { PlayerState } from '../types/game';

export type HungryState = 'normal' | 'hungry' | 'awakened';

export const getHungryState = (player: PlayerState): HungryState => {
  const ratio = player.currentHp / Math.max(1, player.maxHp);
  if (ratio <= 0.3) return 'awakened';
  if (ratio <= 0.5) return 'hungry';
  return 'normal';
};

export const getHungryDamageBonus = (state: HungryState): number => {
  if (state === 'awakened') return 6;
  if (state === 'hungry') return 3;
  return 0;
};
