import { useState } from 'react';
import type { JobId } from '../../types/game';
import './JobSelectScreen.css';

interface Job {
  id: JobId;
  name: string;
  icon: string;
  subtitle: string;
  description: string;
  difficulty: number;
  hp: number;
  mental: number;
  timeBar: number;
}

const JOBS: Job[] = [
  {
    id: 'carpenter',
    name: '大工',
    icon: '🔨',
    subtitle: 'バランス型',
    description: '足場を積んで大技を放つ',
    difficulty: 2,
    hp: 100,
    mental: 7,
    timeBar: 10.8,
  },
  {
    id: 'cook',
    name: '料理人',
    icon: '🔪',
    subtitle: 'アタック特化型',
    description: '食材コンボで大ダメージ',
    difficulty: 2,
    hp: 80,
    mental: 6,
    timeBar: 10.4,
  },
  {
    id: 'unemployed',
    name: '無職',
    icon: '✊',
    subtitle: 'リスク＆リワード型',
    description: 'ピンチほど強くなる',
    difficulty: 3,
    hp: 70,
    mental: 10,
    timeBar: 12.0,
  },
];

interface JobSelectScreenProps {
  onSelect: (jobId: JobId) => void;
  onBack: () => void;
}

const JobSelectScreen = ({ onSelect, onBack }: JobSelectScreenProps) => {
  const [selectedJobId, setSelectedJobId] = useState<JobId | null>(null);
  const selectedJob = JOBS.find((job) => job.id === selectedJobId) ?? null;

  const renderStars = (difficulty: number) =>
    [1, 2, 3].map((value) => (
      <span key={value} className={value <= difficulty ? 'star-on' : 'star-off'}>
        ★
      </span>
    ));

  return (
    <main className="job-select-screen">
      <div className="job-select-bg-effect" />
      <header className="job-select-header">
        <h2 className="job-select-title">職業を選んでください</h2>
      </header>

      <section className="job-icon-list" aria-label="職業一覧">
        {JOBS.map((job) => (
          <button
            key={job.id}
            type="button"
            className={`job-icon-button ${selectedJobId === job.id ? 'job-icon-button--selected' : ''}`}
            onClick={() => setSelectedJobId(job.id)}
            aria-pressed={selectedJobId === job.id}
          >
            <span className="job-icon-box">{job.icon}</span>
            <span className="job-label">{job.name}</span>
          </button>
        ))}
      </section>

      <section className="job-detail-area">
        {selectedJob && (
          <article className="job-detail-card" key={selectedJob.id}>
            <div className="job-card-header">
              <span className="job-icon">{selectedJob.icon}</span>
              <span className="job-name">{selectedJob.name}</span>
            </div>
            <div className="job-stats">
              <span>HP:{selectedJob.hp}</span>
              <span>🧠:{selectedJob.mental}</span>
              <span>⏱:{selectedJob.timeBar.toFixed(1)}s</span>
            </div>
            <div className="job-subtitle">{selectedJob.subtitle}</div>
            <div className="job-description">{selectedJob.description}</div>
            <div className="job-difficulty">難易度: {renderStars(selectedJob.difficulty)}</div>
            <button
              type="button"
              className="btn-confirm"
              onClick={() => onSelect(selectedJob.id)}
            >
              この職業で始める
            </button>
          </article>
        )}
      </section>

      <footer className="job-select-buttons">
        <button type="button" className="btn-back" onClick={onBack}>
          戻る
        </button>
      </footer>
    </main>
  );
};

export default JobSelectScreen;
