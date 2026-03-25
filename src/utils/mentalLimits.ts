import type { PlayerState } from '../types/game';
import { getJobConfig } from '../data/jobs';

/** 職業の maxMental にラン上のボーナス（ボス報酬など）を加えた実効上限 */
export function getEffectiveMaxMental(player: Pick<PlayerState, 'jobId' | 'mentalMaxBonus'>): number {
  const jc = getJobConfig(player.jobId);
  return jc.maxMental + (player.mentalMaxBonus ?? 0);
}
