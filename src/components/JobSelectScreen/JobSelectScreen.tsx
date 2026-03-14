import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { JobId } from '../../types/game';
import './JobSelectScreen.css';

interface Job {
  id: string;
  selectableJobId?: JobId;
  name: string;
  icon: string;
  catchcopy: string;
  mechanic: string;
  difficulty: string;
  hp: number | string;
  mental: number | string;
  timeBar: number | string;
  accentColor: string;
  accentGlow: string;
  comingSoon: boolean;
}

const JOBS: Job[] = [
  {
    id: 'carpenter',
    selectableJobId: 'carpenter',
    name: '大工',
    icon: '🔨',
    catchcopy: '足場を積んで大技を放つ',
    mechanic: '足場（スキルカードで蓄積、アタックで消費）',
    difficulty: '初心者向け',
    hp: 80,
    mental: 7,
    timeBar: 10.8,
    accentColor: '#c0392b',
    accentGlow: 'rgba(192,57,43,0.3)',
    comingSoon: false,
  },
  {
    id: 'cook',
    selectableJobId: 'cook',
    name: '料理人',
    icon: '🔪',
    catchcopy: '食材を仕込んでバースト火力',
    mechanic: '調理ゲージ（食材カードで蓄積、調理カードで爆発）',
    difficulty: '中級者向け',
    hp: 80,
    mental: 6,
    timeBar: 10.4,
    accentColor: '#f9ca24',
    accentGlow: 'rgba(249,202,36,0.3)',
    comingSoon: false,
  },
  {
    id: 'unemployed',
    selectableJobId: 'unemployed',
    name: '無職',
    icon: '✊',
    catchcopy: 'ピンチほど強くなる',
    mechanic: 'ハングリー精神（低HPでダメージ上昇・時間短縮）',
    difficulty: '上級者向け',
    hp: 70,
    mental: 10,
    timeBar: 12.0,
    accentColor: '#8b949e',
    accentGlow: 'rgba(139,148,158,0.3)',
    comingSoon: false,
  },
  {
    id: 'doctor',
    name: '医者',
    icon: '👨‍⚕️',
    catchcopy: '回復と毒で戦う戦略家',
    mechanic: '???',
    difficulty: '???',
    hp: '???',
    mental: '???',
    timeBar: '???',
    accentColor: '#2ecc71',
    accentGlow: 'rgba(46,204,113,0.3)',
    comingSoon: true,
  },
  {
    id: 'student',
    name: '学生',
    icon: '🎓',
    catchcopy: '知識と閃きで逆転する',
    mechanic: '???',
    difficulty: '???',
    hp: '???',
    mental: '???',
    timeBar: '???',
    accentColor: '#3b82f6',
    accentGlow: 'rgba(59,130,246,0.3)',
    comingSoon: true,
  },
  {
    id: 'scammer',
    name: '詐欺師',
    icon: '🃏',
    catchcopy: '嘘と罠で相手を翻弄する',
    mechanic: '???',
    difficulty: '???',
    hp: '???',
    mental: '???',
    timeBar: '???',
    accentColor: '#9b59b6',
    accentGlow: 'rgba(155,89,182,0.3)',
    comingSoon: true,
  },
];

interface JobSelectScreenProps {
  onSelect: (jobId: JobId) => void;
  onBack: () => void;
}

const JobSelectScreen = ({ onSelect, onBack }: JobSelectScreenProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(0);
  const activeJob = JOBS[activeIndex];

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const diff = touchStartX.current - event.changedTouches[0].clientX;
    if (Math.abs(diff) < 30) return;
    if (diff > 0 && activeIndex < JOBS.length - 1) {
      setActiveIndex((prev) => prev + 1);
    } else if (diff < 0 && activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
    }
  };

  return (
    <main className="job-select-screen">
      <p className="job-select-heading">職業を選んでください</p>

      <section
        className="job-carousel"
        aria-label="職業一覧"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {JOBS.map((job, index) => {
          const offset = index - activeIndex;
          const isActive = offset === 0;
          const absOffset = Math.abs(offset);
          const translateX = offset * 130;
          const scale = Math.max(0.76, 1 - absOffset * 0.2);
          const opacity = Math.max(0.35, 1 - absOffset * 0.5);
          const zIndex = 10 - absOffset;
          return (
            <button
              key={job.id}
              type="button"
              className={`job-carousel-item ${isActive ? 'job-carousel-item--active' : ''} ${
                job.comingSoon ? 'job-carousel-item--coming-soon' : ''
              }`}
              style={
                {
                  transform: `translateX(${translateX}px) scale(${scale})`,
                  opacity,
                  zIndex,
                  '--job-accent': job.accentColor,
                  '--job-accent-glow': job.accentGlow,
                } as CSSProperties
              }
              onClick={() => setActiveIndex(index)}
              aria-pressed={isActive}
            >
              <span className="job-carousel-emoji">{job.icon}</span>
              <span className="job-carousel-name">{job.name}</span>
              {job.comingSoon && <span className="job-coming-soon-badge">COMING SOON</span>}
            </button>
          );
        })}
      </section>

      <div className="job-dots" aria-label="職業インジケーター">
        {JOBS.map((job, index) => (
          <button
            key={`dot-${job.id}`}
            type="button"
            className={`job-dot ${index === activeIndex ? 'job-dot--active' : ''}`}
            onClick={() => setActiveIndex(index)}
            aria-label={`${job.name}を選択`}
          />
        ))}
      </div>

      <section className="job-detail-area">
        <article
          className={`job-detail-panel ${activeJob.comingSoon ? 'job-detail-panel--coming-soon' : ''}`}
          key={activeJob.id}
        >
            <div className="job-detail-header">
              <span className="job-detail-icon">{activeJob.icon}</span>
              <span className="job-detail-name">{activeJob.name}</span>
            </div>
            <p className="job-detail-catchcopy">{activeJob.catchcopy}</p>
            <div className="job-detail-divider" />
            {activeJob.comingSoon ? (
              <>
                <p className="job-coming-soon-text">🔒 この職業は現在開発中です</p>
                <p className="job-coming-soon-subtext">アップデートをお楽しみに！</p>
              </>
            ) : (
              <>
                <div className="job-detail-stats">
                  <span>❤️ {activeJob.hp}</span>
                  <span>🧠 {activeJob.mental}</span>
                  <span>⏱ {activeJob.timeBar}s</span>
                </div>
                <p className="job-detail-mechanic">固有：{activeJob.mechanic}</p>
                <p className="job-detail-difficulty">難易度：{activeJob.difficulty}</p>
              </>
            )}
          </article>
      </section>

      <footer className="job-select-buttons">
        <button
          type="button"
          className="btn-confirm"
          disabled={activeJob.comingSoon}
          onClick={() => {
            if (activeJob.selectableJobId) onSelect(activeJob.selectableJobId);
          }}
        >
          {activeJob.comingSoon ? '🔒 Coming Soon' : 'この職業で始める'}
        </button>
        <button type="button" className="btn-back-text" onClick={onBack}>
          戻る
        </button>
      </footer>
    </main>
  );
};

export default JobSelectScreen;
