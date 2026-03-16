import { useMemo } from 'react';
import type { JobId } from '../../types/game';
import './DefeatScreen.css';

interface DefeatScreenProps {
  jobId: JobId;
  area: number;
  floor: number;
  totalFloors: number;
  defeatedBy: string;
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
  onHome,
  onRetry,
}: DefeatScreenProps) => {
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

        <div className="defeat-buttons">
          <button type="button" className="btn-defeat-retry" onClick={onRetry}>
            もう一度挑戦
          </button>
          <button type="button" className="btn-defeat-home" onClick={onHome}>
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  );
};
