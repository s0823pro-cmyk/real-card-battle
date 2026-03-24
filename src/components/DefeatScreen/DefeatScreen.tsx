import { useEffect, useMemo, useState } from 'react';
import { useAudioContext } from '../../contexts/AudioContext';
import type { JobId } from '../../types/game';
import type { Achievement } from '../../utils/achievementSystem';
import { AchievementRewardModal } from '../AchievementRewardModal/AchievementRewardModal';
import './DefeatScreen.css';

interface DefeatScreenProps {
  jobId: JobId;
  area: number;
  floor: number;
  totalFloors: number;
  defeatedBy: string;
  newAchievements?: Achievement[];
  onHome: () => void;
  onRetry: () => void;
}

const DEFEAT_MESSAGES = [
  'まだまだこれからだ。',
  '次は絶対に勝てる。',
  '負けから学べることがある。',
  '諦めなければ、負けじゃない。',
  'また挑戦しろ。',
  'ここで終わりじゃない。',
];

export const DefeatScreen = ({
  jobId,
  area,
  floor,
  totalFloors,
  defeatedBy,
  newAchievements = [],
  onHome,
  onRetry,
}: DefeatScreenProps) => {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const { playBgm } = useAudioContext();

  useEffect(() => {
    playBgm('defeat');
  }, [playBgm]);

  const message = useMemo(
    () => DEFEAT_MESSAGES[Math.floor(Math.random() * DEFEAT_MESSAGES.length)],
    [],
  );
  const jobName = { carpenter: '大工', cook: '料理人', unemployed: '無職' }[jobId] ?? jobId;
  const safeTotal = Math.max(1, totalFloors);
  const safeFloor = Math.min(Math.max(1, floor), safeTotal);
  const progressPercent = Math.floor((safeFloor / safeTotal) * 100);

  return (
    <div className="defeat-screen">
      <div className="defeat-bg" />
      <div className="defeat-content">
        <div className="defeat-title-area">
          <p className="defeat-job">{jobName}</p>
          <h1 className="defeat-title">力尽きた…</h1>
          <p className="defeat-enemy">
            <span className="defeat-enemy-label">倒された相手</span>
            <span className="defeat-enemy-name">{defeatedBy || '敵'}</span>
          </p>
        </div>

        <div className="defeat-progress">
          <div className="defeat-progress-header">
            <span className="defeat-progress-label">進捗</span>
            <span className="defeat-progress-value">
              エリア{area} - {safeFloor}/{safeTotal}マス
            </span>
          </div>
          <div className="defeat-progress-bar">
            <div className="defeat-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="defeat-progress-percent">{progressPercent}%</p>
        </div>

        <div className="defeat-message">
          <p className="defeat-message-text">「{message}」</p>
        </div>

        {newAchievements.length > 0 && (
          <div className="victory-achievements defeat-achievements">
            <h3 className="victory-achievements-title">🎖️ 実績解除！</h3>
            {newAchievements.map((a) => (
              <button
                key={a.id}
                type="button"
                className="victory-achievement-item"
                onClick={() => setSelectedAchievement(a)}
              >
                <span className="victory-achievement-icon">{a.icon}</span>
                <div className="victory-achievement-info">
                  <p className="victory-achievement-name">{a.name}</p>
                  <p className="victory-achievement-reward">
                    🃏 カード2枚 解放！{' '}
                    <span className="victory-achievement-tap">タップで確認</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 広告プレースホルダー: Capacitor移行後にAdMobのインタースティシャル広告を表示 */}
        <div className="ad-placeholder">
          <p className="ad-placeholder-text">広告スペース</p>
        </div>

        <div className="defeat-buttons">
          <button type="button" className="btn-defeat-retry" onClick={onRetry}>
            もう一度挑戦
          </button>
          <button type="button" className="btn-defeat-home" onClick={onHome}>
            ホームに戻る
          </button>
        </div>
      </div>

      <AchievementRewardModal
        selected={selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
        jobId={jobId}
      />
    </div>
  );
};
