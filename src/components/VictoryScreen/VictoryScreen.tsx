import { useEffect, useRef, useState } from 'react';
import type { JobId } from '../../types/game';
import type { Achievement } from '../../utils/achievementSystem';
import { AchievementRewardModal } from '../AchievementRewardModal/AchievementRewardModal';
import './VictoryScreen.css';

interface VictoryScreenProps {
  jobId: JobId;
  area: number;
  turnCount: number;
  cardsAcquired: number;
  newAchievements?: Achievement[];
  onHome: () => void;
}

export const VictoryScreen = ({
  jobId,
  area,
  turnCount,
  cardsAcquired,
  newAchievements = [],
  onHome,
}: VictoryScreenProps) => {
  const [showStats, setShowStats] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const confettiRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowStats(true), 800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = confettiRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = ['#f0b429', '#e74c3c', '#3b82f6', '#2ecc71', '#9b59b6'];
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 3 + 1,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 5,
    }));

    let animId = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);
        ctx.restore();
      });
      animId = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animId);
    };
  }, []);

  const jobName = { carpenter: '大工', cook: '料理人', unemployed: '無職' }[jobId] ?? jobId;
  const jobColor = { carpenter: '#c0392b', cook: '#f9ca24', unemployed: '#8b949e' }[jobId] ?? '#ffffff';

  return (
    <div className="victory-screen">
      <div className="victory-bg" />
      <canvas ref={confettiRef} className="victory-confetti" />
      <div className="victory-content">
        <div className="victory-title-area">
          <p className="victory-job" style={{ color: jobColor }}>
            {jobName}
          </p>
          <h1 className="victory-title">クリア！</h1>
          <p className="victory-sub">全エリアを制覇した！</p>
        </div>

        {showStats && (
          <div className="victory-stats">
            <div className="victory-stat-card">
              <span className="victory-stat-icon">🗺️</span>
              <div className="victory-stat-info">
                <p className="victory-stat-label">到達エリア</p>
                <p className="victory-stat-value">エリア{area}</p>
              </div>
            </div>
            <div className="victory-stat-card">
              <span className="victory-stat-icon">⚔️</span>
              <div className="victory-stat-info">
                <p className="victory-stat-label">総ターン数</p>
                <p className="victory-stat-value">{turnCount}ターン</p>
              </div>
            </div>
            <div className="victory-stat-card">
              <span className="victory-stat-icon">🃏</span>
              <div className="victory-stat-info">
                <p className="victory-stat-label">獲得カード数</p>
                <p className="victory-stat-value">{cardsAcquired}枚</p>
              </div>
            </div>
          </div>
        )}

        {showStats && newAchievements.length > 0 && (
          <div className="victory-achievements">
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
                    {a.rewardIcon} {a.rewardName} 解放！{' '}
                    <span className="victory-achievement-tap">タップで確認</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {showStats && (
          <button type="button" className="btn-victory-home" onClick={onHome}>
            ホームに戻る
          </button>
        )}
      </div>

      <AchievementRewardModal
        selected={selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
        jobId={jobId}
      />
    </div>
  );
};
