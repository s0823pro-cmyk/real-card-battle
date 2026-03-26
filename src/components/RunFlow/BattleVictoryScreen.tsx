import { useEffect } from 'react';
import { useAudioContext } from '../../contexts/AudioContext';
import type { JobId } from '../../types/game';
import type { Achievement } from '../../utils/achievementSystem';
import { BattleVictoryPanel } from '../Result/BattleVictoryPanel';

interface Props {
  rewardGold: number;
  mentalRecovery: number;
  totalGold: number;
  onContinue: () => void;
  /** ラン状態の battleVictorySeq（合計金の変更でタップ待ちがリセットされ続けないようにする） */
  tapArmKey: number;
  jobId: JobId;
  newAchievements?: Achievement[];
}

/** ラン中：敵討伐後のスプラッシュ →「進む」で次フローへ */
export const BattleVictoryScreen = ({
  rewardGold,
  mentalRecovery,
  totalGold,
  onContinue,
  tapArmKey,
  jobId,
  newAchievements = [],
}: Props) => {
  const { playBgm } = useAudioContext();
  useEffect(() => {
    playBgm('victory');
    // 遷移先で fanfare を頭からやり直さない（unmount 時に stop/play しない）
  }, [playBgm]);

  return (
    <BattleVictoryPanel
      rewardGold={rewardGold}
      mentalRecovery={mentalRecovery}
      totalGold={totalGold}
      onContinue={onContinue}
      tapArmKey={tapArmKey}
      jobId={jobId}
      newAchievements={newAchievements}
    />
  );
};
