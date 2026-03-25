import { useEffect, useRef, useState } from 'react';
import './Result.css';

const VICTORY_TAP_DELAY_MS = 900;

export interface BattleVictoryPanelProps {
  rewardGold: number;
  totalGold: number;
  mentalRecovery: number;
  onContinue: () => void;
  /**
   * ラン用。指定時はこの値が変わったときだけタップ待ちをリセットします。
   * 未指定時は rewardGold / mentalRecovery（合計所持金は含めない：後から金額が変わるとタップ待ちが永遠に終わらない）。
   */
  tapArmKey?: number;
}

/**
 * ラン中・バトル内共通の VICTORY 表示（レイアウト統一用）
 */
export const BattleVictoryPanel = ({
  rewardGold,
  totalGold,
  mentalRecovery,
  onContinue,
  tapArmKey,
}: BattleVictoryPanelProps) => {
  const [displayGold, setDisplayGold] = useState(0);
  const [tapToContinueEnabled, setTapToContinueEnabled] = useState(false);
  /** タッチ直後に続く click を二重に進めない（touchend で進んだ場合） */
  const skipNextClickRef = useRef(false);

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

  // 空依存だと再マウントなしの再表示で 900ms 待ちが走らずタップ不能になる。勝利のたびにリセットする。
  useEffect(() => {
    setTapToContinueEnabled(false);
    const id = window.setTimeout(() => setTapToContinueEnabled(true), VICTORY_TAP_DELAY_MS);
    return () => window.clearTimeout(id);
  }, tapArmKey !== undefined ? [tapArmKey] : [rewardGold, mentalRecovery]);

  useEffect(() => {
    skipNextClickRef.current = false;
  }, tapArmKey !== undefined ? [tapArmKey] : [rewardGold, mentalRecovery]);

  const fireContinue = () => {
    if (!tapToContinueEnabled) return;
    onContinue();
  };

  return (
    <div
      className={`result-overlay victory ${tapToContinueEnabled ? 'victory--tap-ready' : ''}`}
      role="presentation"
      onTouchEnd={(e) => {
        if (!tapToContinueEnabled) return;
        e.preventDefault();
        skipNextClickRef.current = true;
        fireContinue();
      }}
      onClick={() => {
        if (skipNextClickRef.current) {
          skipNextClickRef.current = false;
          return;
        }
        fireContinue();
      }}
    >
      <h2>VICTORY</h2>
      <p>現場を守り切った！</p>
      <div className="victory-reward">
        <p>獲得ゴールド</p>
        <strong>💰 +{displayGold}G</strong>
      </div>
      <p>メンタル回復: 🧠 +{mentalRecovery}</p>
      <p>合計所持金: {totalGold}G</p>
      <p
        className={`victory-tap-hint ${tapToContinueEnabled ? 'victory-tap-hint--ready' : ''}`}
        aria-hidden={!tapToContinueEnabled}
      >
        タップして進む
      </p>
    </div>
  );
};
