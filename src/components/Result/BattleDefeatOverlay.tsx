import { useEffect } from 'react';
import { useAudioContext } from '../../contexts/AudioContext';

interface Props {
  onRetry: () => void;
}

/** バトル内の敗北オーバーレイ（ラン用 DefeatScreen とは別） */
const BattleDefeatOverlay = ({ onRetry }: Props) => {
  const { playBgm } = useAudioContext();

  useEffect(() => {
    playBgm('defeat');
  }, [playBgm]);

  return (
    <div className="result-overlay defeat">
      <h2>GAME OVER</h2>
      <p>体力が尽きた…</p>
      <button type="button" onClick={onRetry}>
        リトライ
      </button>
    </div>
  );
};

export default BattleDefeatOverlay;
