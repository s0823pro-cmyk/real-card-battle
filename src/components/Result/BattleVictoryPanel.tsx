import { useEffect, useMemo, useRef, useState } from 'react';
import type { JobId } from '../../types/game';
import type { AchievementTier } from '../../utils/achievementTypes';
import {
  getCumulativeAchievementProgressSuffix,
  getDefeatCount,
  type Achievement,
} from '../../utils/achievementSystem';
import { loadAchievementCounters } from '../../utils/achievementCounters';
import { AchievementRewardModal } from '../AchievementRewardModal/AchievementRewardModal';
import '../HomeScreen/HomeScreen.css';
import './Result.css';

const TIER_LABEL: Record<AchievementTier, string> = {
  easy: '（アンコモン×2）',
  medium: '（アンコモン+レア）',
  hard: '（レア×2）',
};

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
  /** このバトルで新規解除された実績（複数件は縦スクロール） */
  newAchievements?: Achievement[];
  jobId?: JobId;
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
  newAchievements = [],
  jobId = 'carpenter',
}: BattleVictoryPanelProps) => {
  const [displayGold, setDisplayGold] = useState(0);
  const [tapToContinueEnabled, setTapToContinueEnabled] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  /** タッチ直後に続く click を二重に進めない（touchend で進んだ場合） */
  const skipNextClickRef = useRef(false);

  const cumulativeDisplayState = useMemo(
    () => ({
      counters: loadAchievementCounters(),
      defeatCount: getDefeatCount(),
    }),
    [tapArmKey, rewardGold, mentalRecovery],
  );

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
      <div className="battle-victory-panel-inner">
        <h2>VICTORY</h2>
        <p>現場を守り切った！</p>
        <div className="victory-reward">
          <p>獲得ゴールド</p>
          <strong>💰 +{displayGold}G</strong>
        </div>
        <p>メンタル回復: 🧠 +{mentalRecovery}</p>
        <p>合計所持金: {totalGold}G</p>

        {newAchievements.length > 0 && (
          <div
            className="battle-victory-achievements"
            role="region"
            aria-label="実績解除"
            onTouchEnd={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="battle-victory-achievements-title">
              🎖️ 実績解除！{newAchievements.length > 1 ? `（${newAchievements.length}件）` : ''}
            </h3>
            <div className="achievement-list">
              {newAchievements.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="achievement-item achievement-item--unlocked"
                  onClick={() => setSelectedAchievement(a)}
                >
                  <span className="achievement-icon">{a.icon}</span>
                  <div className="achievement-info">
                    <p className="achievement-name">{a.name}</p>
                    <p className="achievement-desc">
                      {a.description}
                      {getCumulativeAchievementProgressSuffix(
                        a.id,
                        cumulativeDisplayState.counters,
                        cumulativeDisplayState.defeatCount,
                      ) ?? ''}
                    </p>
                    <p className="achievement-tier">{TIER_LABEL[a.tier]}</p>
                    <p className="achievement-reward">報酬: カード2枚（タップで表示）</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <p
          className={`victory-tap-hint ${tapToContinueEnabled ? 'victory-tap-hint--ready' : ''}`}
          aria-hidden={!tapToContinueEnabled}
        >
          タップして進む
        </p>
      </div>

      <AchievementRewardModal
        selected={selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
        jobId={jobId}
      />
    </div>
  );
};
