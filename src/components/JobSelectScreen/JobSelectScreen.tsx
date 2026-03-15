import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { JobId } from '../../types/game';
import carpenterSymbolImage from '../../assets/jobs/carpenter_symbol.png';
import cookSymbolImage from '../../assets/jobs/cook_symbol.png';
import unemployedSymbolImage from '../../assets/jobs/unemployed_symbol.png';
import homeBackgroundImage from '../../assets/home_background.png';
import './JobSelectScreen.css';

interface Job {
  id: string;
  selectableJobId?: JobId;
  name: string;
  icon: string;
  imageUrl?: string;
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
    imageUrl: carpenterSymbolImage,
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
    imageUrl: cookSymbolImage,
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
    imageUrl: unemployedSymbolImage,
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
  const [isSwiping, setIsSwiping] = useState(false);
  const [imageLoadFailedJobs, setImageLoadFailedJobs] = useState<Set<string>>(() => new Set());
  const iconAreaRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const mouseStartX = useRef<number | null>(null);
  const activeJob = JOBS[activeIndex];

  const goNext = () => {
    setActiveIndex((prev) => (prev < JOBS.length - 1 ? prev + 1 : prev));
  };

  const goPrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = () => {
    setIsSwiping(true);
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const diff = touchStartX.current - event.changedTouches[0].clientX;
    if (Math.abs(diff) >= 30) {
      if (diff > 0 && activeIndex < JOBS.length - 1) {
        goNext();
      } else if (diff < 0 && activeIndex > 0) {
        goPrev();
      }
    }
    window.setTimeout(() => setIsSwiping(false), 120);
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    mouseStartX.current = event.clientX;
    setIsSwiping(true);
    event.preventDefault();
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    event.preventDefault();
  };

  const handleMouseUp = (event: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const diff = event.clientX - mouseStartX.current;
    if (diff < -40) goNext();
    else if (diff > 40) goPrev();
    mouseStartX.current = null;
    window.setTimeout(() => setIsSwiping(false), 120);
  };

  const getCardPositionClass = (index: number): string => {
    const offset = index - activeIndex;
    if (offset === 0) return 'job-card--active';
    if (offset === -1) return 'job-card--prev';
    if (offset === 1) return 'job-card--next';
    if (offset < -1) return 'job-card--far-left';
    return 'job-card--far-right';
  };

  const hpValue = typeof activeJob.hp === 'number' ? activeJob.hp : 0;
  const timeValue = typeof activeJob.timeBar === 'number' ? activeJob.timeBar : 0;
  const mentalValue = typeof activeJob.mental === 'number' ? activeJob.mental : 0;

  return (
    <main
      className="job-select-screen"
      style={{
        backgroundImage: `url(${homeBackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="job-select-overlay" />
      <div className="job-select-content">
        <p className="job-select-heading">職業を選んでください</p>
        <div
          className="job-icon-list"
          ref={iconAreaRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {JOBS.map((job, index) => (
            <button
              key={`icon-${job.id}`}
              type="button"
              className={`job-icon-item ${index === activeIndex ? 'job-icon-item--active' : ''} ${
                job.comingSoon ? 'job-icon-item--coming-soon' : ''
              }`}
              onClick={() => {
                if (!job.comingSoon) setActiveIndex(index);
              }}
              disabled={job.comingSoon}
              aria-label={`${job.name}を選択`}
              draggable={false}
            >
              {job.imageUrl && !imageLoadFailedJobs.has(job.id) ? (
                <img
                  className="job-icon-img"
                  src={job.imageUrl}
                  alt={job.name}
                  draggable={false}
                  onError={() => {
                    setImageLoadFailedJobs((prev) => {
                      const next = new Set(prev);
                      next.add(job.id);
                      return next;
                    });
                  }}
                />
              ) : (
                <span className="job-icon-emoji">{job.icon}</span>
              )}
            </button>
          ))}
        </div>

        <section
          className={`job-carousel ${isSwiping ? 'job-carousel--swiping' : ''}`}
          aria-label="職業一覧"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDragStart={(event) => event.preventDefault()}
        >
          {JOBS.map((job, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={job.id}
                type="button"
                className={`job-card ${getCardPositionClass(index)} ${job.comingSoon ? 'job-card--coming-soon' : ''} job-card--${job.id}`}
                style={
                  {
                    '--job-accent': job.accentColor,
                    '--job-accent-glow': job.accentGlow,
                  } as CSSProperties
                }
                onClick={() => setActiveIndex(index)}
                aria-pressed={isActive}
              >
                <div className="job-symbol">
                  {job.imageUrl && !imageLoadFailedJobs.has(job.id) ? (
                    <img
                      className="job-symbol-img"
                      src={job.imageUrl}
                      alt={job.name}
                    draggable={false}
                      onError={() => {
                        setImageLoadFailedJobs((prev) => {
                          const next = new Set(prev);
                          next.add(job.id);
                          return next;
                        });
                      }}
                    />
                  ) : (
                    <span className="job-carousel-emoji">{job.icon}</span>
                  )}
                </div>
                {job.comingSoon && (
                  <div className="job-coming-soon-overlay">
                    <div className="job-coming-soon-badge">
                      <span className="job-coming-soon-icon">🔒</span>
                      <p className="job-coming-soon-text">COMING SOON</p>
                      <p className="job-coming-soon-sub">近日公開予定</p>
                    </div>
                  </div>
                )}
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

        <section className="job-info">
          <div className="job-name-area">
            <h2 className="job-name">{activeJob.name}</h2>
          </div>
          <p className="job-catch">{activeJob.catchcopy}</p>

          {activeJob.comingSoon ? (
            <p className="job-mechanic">この職業は現在開発中です。アップデートをお楽しみに！</p>
          ) : (
            <>
              <div className="job-stats">
                <div className="job-stat">
                  <span className="job-stat-label">❤️ HP</span>
                  <div className="job-stat-bar">
                    <div className="job-stat-fill job-stat-fill--hp" style={{ width: `${(hpValue / 100) * 100}%` }} />
                  </div>
                  <span className="job-stat-value">{hpValue}</span>
                </div>
                <div className="job-stat">
                  <span className="job-stat-label">⏱ タイム</span>
                  <div className="job-stat-bar">
                    <div className="job-stat-fill job-stat-fill--time" style={{ width: `${(timeValue / 12) * 100}%` }} />
                  </div>
                  <span className="job-stat-value">{timeValue}s</span>
                </div>
                <div className="job-stat">
                  <span className="job-stat-label">🧠 メンタル</span>
                  <div className="job-stat-bar">
                    <div
                      className="job-stat-fill job-stat-fill--mental"
                      style={{ width: `${(mentalValue / 10) * 100}%` }}
                    />
                  </div>
                  <span className="job-stat-value">{mentalValue}</span>
                </div>
              </div>
              <p className="job-mechanic">固有：{activeJob.mechanic}</p>
            </>
          )}
        </section>

        <footer className="job-select-buttons">
          <button
            type="button"
            className={`btn-job-select job-card--${activeJob.id}`}
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
      </div>
    </main>
  );
};

export default JobSelectScreen;
