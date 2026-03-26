import { Capacitor } from '@capacitor/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAudioContext } from '../../contexts/AudioContext';
import { mountCardRewardBanner, removeBannerAd } from '../../utils/adMobClient';
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
import './VictoryScreen.css';

const TIER_LABEL: Record<AchievementTier, string> = {
  easy: '（アンコモン×2）',
  medium: '（アンコモン+レア）',
  hard: '（レア×2）',
};

interface VictoryScreenProps {
  jobId: JobId;
  area: number;
  turnCount: number;
  cardsAcquired: number;
  newAchievements?: Achievement[];
  adsRemoved: boolean;
  /** エリア3クリア後ストーリー等で重ねる間はネイティブの下部バナーを出さない */
  suppressNativeBanner?: boolean;
  onHome: () => void;
}

export const VictoryScreen = ({
  jobId,
  area,
  turnCount,
  cardsAcquired,
  newAchievements = [],
  adsRemoved,
  suppressNativeBanner = false,
  onHome,
}: VictoryScreenProps) => {
  const [showStats, setShowStats] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const { playBgm } = useAudioContext();

  const cumulativeDisplayState = useMemo(
    () => ({
      counters: loadAchievementCounters(),
      defeatCount: getDefeatCount(),
    }),
    [showStats, newAchievements],
  );

  useEffect(() => {
    playBgm('victory');
  }, [playBgm]);

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

  useEffect(() => {
    if (suppressNativeBanner) {
      void removeBannerAd();
      return;
    }
    let cancelled = false;
    let remove: (() => Promise<void>) | undefined;
    void (async () => {
      remove = await mountCardRewardBanner(adsRemoved);
      if (cancelled) await remove();
    })();
    return () => {
      cancelled = true;
      void remove?.();
    };
  }, [adsRemoved, suppressNativeBanner]);

  const bannerBottomClass =
    !adsRemoved && !suppressNativeBanner && Capacitor.isNativePlatform() ? ' victory-screen--with-banner' : '';

  const jobName = { carpenter: '大工', cook: '料理人', unemployed: '無職' }[jobId] ?? jobId;
  const jobColor = { carpenter: '#c0392b', cook: '#f9ca24', unemployed: '#8b949e' }[jobId] ?? '#ffffff';

  return (
    <div className={`victory-screen${bannerBottomClass}`}>
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
            <h3 className="victory-achievements-title">
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
