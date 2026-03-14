import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { JobId } from '../../types/game';
import './JobSelectScreen.css';

interface Job {
  id: JobId;
  name: string;
  icon: string;
  catchcopy: string;
  mechanic: string;
  difficulty: string;
  hp: number;
  mental: number;
  timeBar: number;
  accentColor: string;
  accentGlow: string;
}

const JOBS: Job[] = [
  {
    id: 'carpenter',
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
  },
  {
    id: 'cook',
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
  },
  {
    id: 'unemployed',
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
  },
];

interface JobSelectScreenProps {
  onSelect: (jobId: JobId) => void;
  onBack: () => void;
}

const JobSelectScreen = ({ onSelect, onBack }: JobSelectScreenProps) => {
  const [selectedJobId, setSelectedJobId] = useState<JobId | null>(null);
  const selectedJob = JOBS.find((job) => job.id === selectedJobId) ?? null;

  return (
    <main className="job-select-screen">
      <p className="job-select-heading">職業を選んでください</p>

      <section className="job-character-list" aria-label="職業一覧">
        {JOBS.map((job) => (
          <button
            key={job.id}
            type="button"
            className={`job-character-card ${selectedJobId === job.id ? 'job-character-card--selected' : ''}`}
            style={
              {
                '--job-accent': job.accentColor,
                '--job-accent-glow': job.accentGlow,
              } as CSSProperties
            }
            onClick={() => setSelectedJobId(job.id)}
            aria-pressed={selectedJobId === job.id}
          >
            <span className="job-character-emoji">{job.icon}</span>
            <span className="job-character-name">{job.name}</span>
          </button>
        ))}
      </section>

      <section className="job-detail-area">
        {selectedJob && (
          <article className="job-detail-panel" key={selectedJob.id}>
            <div className="job-detail-header">
              <span className="job-detail-icon">{selectedJob.icon}</span>
              <span className="job-detail-name">{selectedJob.name}</span>
            </div>
            <p className="job-detail-catchcopy">{selectedJob.catchcopy}</p>
            <div className="job-detail-divider" />
            <div className="job-detail-stats">
              <span>❤️ {selectedJob.hp}</span>
              <span>🧠 {selectedJob.mental}</span>
              <span>⏱ {selectedJob.timeBar.toFixed(1)}s</span>
            </div>
            <p className="job-detail-mechanic">固有：{selectedJob.mechanic}</p>
            <p className="job-detail-difficulty">難易度：{selectedJob.difficulty}</p>
          </article>
        )}
        {!selectedJob && <div className="job-detail-placeholder">職業を選ぶと詳細が表示されます</div>}
      </section>

      <footer className="job-select-buttons">
        <button
          type="button"
          className="btn-confirm"
          disabled={!selectedJobId}
          onClick={() => selectedJobId && onSelect(selectedJobId)}
        >
          この職業で始める
        </button>
        <button type="button" className="btn-back-text" onClick={onBack}>
          戻る
        </button>
      </footer>
    </main>
  );
};

export default JobSelectScreen;
