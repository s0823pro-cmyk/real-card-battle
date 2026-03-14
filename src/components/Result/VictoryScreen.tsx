import { useEffect, useState } from 'react';

interface Props {
  onRetry: () => void;
  rewardGold: number;
  totalGold: number;
  mentalRecovery: number;
}

const VictoryScreen = ({ onRetry, rewardGold, totalGold, mentalRecovery }: Props) => {
  const [displayGold, setDisplayGold] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 500;
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplayGold(Math.floor(rewardGold * progress));
      if (progress < 1) {
        raf = window.requestAnimationFrame(tick);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [rewardGold]);

  return (
    <div className="result-overlay victory">
      <h2>VICTORY</h2>
      <p>現場を守り切った！</p>
      <div className="victory-reward">
        <p>獲得ゴールド</p>
        <strong>💰 +{displayGold}G</strong>
      </div>
      <p>メンタル回復: 🧠 +{mentalRecovery}</p>
      <p>合計所持金: {totalGold}G</p>
      <button type="button" onClick={onRetry}>
        もう一度戦う
      </button>
    </div>
  );
};

export default VictoryScreen;
