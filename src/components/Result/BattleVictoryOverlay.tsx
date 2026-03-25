import { useEffect } from 'react';
import { useAudioContext } from '../../contexts/AudioContext';
import { BattleVictoryPanel } from './BattleVictoryPanel';

interface Props {
  /** ランでは onBattleEnd 後に画面遷移するため通常は no-op でよい */
  onContinue: () => void;
  rewardGold: number;
  totalGold: number;
  mentalRecovery: number;
}

/** バトル内の勝利オーバーレイ（BattleVictoryPanel とレイアウト共通） */
const BattleVictoryOverlay = ({ onContinue, rewardGold, totalGold, mentalRecovery }: Props) => {
  const { playBgm } = useAudioContext();
  useEffect(() => {
    playBgm('victory');
  }, [playBgm]);

  return (
    <BattleVictoryPanel
      rewardGold={rewardGold}
      totalGold={totalGold}
      mentalRecovery={mentalRecovery}
      onContinue={onContinue}
    />
  );
};

export default BattleVictoryOverlay;
