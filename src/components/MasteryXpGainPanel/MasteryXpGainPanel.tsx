import { useEffect, useMemo, useState } from 'react';
import type { JobId } from '../../types/game';
import { getLastJobMasteryRunGain } from '../../utils/jobMasterySystem';
import './MasteryXpGainPanel.css';

interface MasteryXpGainPanelProps {
  jobId: JobId;
}

const formatXp = (value: number): string => Math.max(0, Math.floor(value)).toLocaleString();

export const MasteryXpGainPanel = ({ jobId }: MasteryXpGainPanelProps) => {
  const gain = useMemo(() => getLastJobMasteryRunGain(jobId), [jobId]);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setAnimated(true), 420);
    return () => window.clearTimeout(timer);
  }, []);

  if (!gain) return null;

  const beforePct = Math.round(gain.beforeProgress * 100);
  const afterPct = Math.round(gain.afterProgress * 100);
  const isLevelUp = gain.levelUps > 0;

  return (
    <section className={`mastery-xp-panel ${isLevelUp ? 'mastery-xp-panel--levelup' : ''}`} aria-label="熟練度経験値">
      <div className="mastery-xp-panel__header">
        <div>
          <p className="mastery-xp-panel__kicker">JOB MASTERY</p>
          <h3 className="mastery-xp-panel__title">熟練度経験値</h3>
        </div>
        <strong className="mastery-xp-panel__gain">+{formatXp(gain.gainedXp)} XP</strong>
      </div>

      <div className="mastery-xp-panel__level-row">
        <span>Lv{gain.beforeLevel}</span>
        <span className="mastery-xp-panel__arrow">→</span>
        <span>Lv{gain.afterLevel}</span>
        {isLevelUp && <em>LEVEL UP</em>}
      </div>

      <div className="mastery-xp-panel__bar" aria-hidden>
        <span
          className="mastery-xp-panel__bar-fill"
          style={{ width: `${animated ? afterPct : beforePct}%` }}
        />
      </div>
    </section>
  );
};
