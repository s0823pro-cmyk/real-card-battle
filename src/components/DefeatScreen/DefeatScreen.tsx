import { useEffect, useMemo, useState } from 'react';
import { useAudioContext } from '../../contexts/AudioContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { MessageKey } from '../../i18n';
import { achievementNameKey } from '../../i18n/entityKeys';
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

const DEFEAT_FLAVOR_KEYS = [
  'defeat.flavor0',
  'defeat.flavor1',
  'defeat.flavor2',
  'defeat.flavor3',
  'defeat.flavor4',
  'defeat.flavor5',
] as const satisfies readonly MessageKey[];

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
  const { t } = useLanguage();
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const { playBgm } = useAudioContext();

  const flavorKey = useMemo(
    () => DEFEAT_FLAVOR_KEYS[Math.floor(Math.random() * DEFEAT_FLAVOR_KEYS.length)]!,
    [],
  );

  useEffect(() => {
    playBgm('defeat');
  }, [playBgm]);

  const message = t(flavorKey);
  const jobName = t(`job.${jobId}.name` as MessageKey);
  const safeTotal = Math.max(1, totalFloors);
  const safeFloor = Math.min(Math.max(1, floor), safeTotal);
  const progressPercent = Math.floor((safeFloor / safeTotal) * 100);

  return (
    <div className="defeat-screen">
      <div className="defeat-bg" />
      <div className="defeat-content">
        <div className="defeat-title-area">
          <p className="defeat-job">{jobName}</p>
          <h1 className="defeat-title">{t('defeat.title')}</h1>
          <p className="defeat-enemy">
            <span className="defeat-enemy-label">{t('defeat.defeatedByLabel')}</span>
            <span className="defeat-enemy-name">{defeatedBy || t('defeat.enemyFallback')}</span>
          </p>
        </div>

        <div className="defeat-progress">
          <div className="defeat-progress-header">
            <span className="defeat-progress-label">{t('defeat.progressLabel')}</span>
            <span className="defeat-progress-value">
              {t('defeat.progressValue', { area, floor: safeFloor, total: safeTotal })}
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
            <h3 className="victory-achievements-title">
              {newAchievements.length > 1
                ? t('defeat.achievementTitleMulti', { n: newAchievements.length })
                : t('defeat.achievementTitle')}
            </h3>
            <div className="victory-achievements-scroll">
              {newAchievements.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="victory-achievement-item"
                  onClick={() => setSelectedAchievement(a)}
                >
                  <span className="victory-achievement-icon">{a.icon}</span>
                  <div className="victory-achievement-info">
                    <p className="victory-achievement-name">{t(achievementNameKey(a.id), undefined, a.name)}</p>
                    <p className="victory-achievement-reward">{t('defeat.cardUnlockReward')}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="defeat-buttons">
          <button type="button" className="btn-defeat-retry" onClick={onRetry}>
            {t('defeat.retry')}
          </button>
          <button type="button" className="btn-defeat-home" onClick={onHome}>
            {t('defeat.home')}
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
