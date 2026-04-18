import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { getJobConfig } from '../../data/jobs';
import type { JobId } from '../../types/game';
import carpenterSymbolImage from '../../assets/jobs/carpenter_symbol.png';
import cookSymbolImage from '../../assets/jobs/cook_symbol.png';
import unemployedSymbolImage from '../../assets/jobs/unemployed_symbol.png';
import jobSelectBackgroundImage from '../../assets/job_select_background.png';
import { hasTutorialSeen, markTutorialSeen } from '../../utils/tutorialState';
import { hasSeenJobUnlock, isJobUnlocked, markJobUnlockSeen } from '../../utils/jobUnlockSystem';
import { TutorialOverlay } from '../Tutorial/TutorialOverlay';
import './JobSelectScreen.css';

/** アニメ終了はフレーム数では切らず、onComplete で UI を閉じる */
const CONFETTI_MAX_FRAMES = 520;

function runCookUnlockConfetti(
  canvas: HTMLCanvasElement | null,
  onComplete?: () => void,
): () => void {
  const finish = () => {
    queueMicrotask(() => onComplete?.());
  };
  if (!canvas) {
    finish();
    return () => {};
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    finish();
    return () => {};
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  const colors = ['#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7', '#00cec9', '#dfe6e9', '#ffeaa7'];
  /** 画面下〜手前から立ち上がり、横に揺れながら舞い上がる */
  const pieces = Array.from({ length: 160 }, () => ({
    x: Math.random() * w,
    y: h - 20 + Math.random() * 140,
    w: 3 + Math.random() * 7,
    h: 4 + Math.random() * 9,
    vy: -(3.2 + Math.random() * 5.5),
    vx: (Math.random() - 0.5) * 2.2,
    phase: Math.random() * Math.PI * 2,
    wobbleAmp: 1.2 + Math.random() * 2.2,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.22,
    color: colors[Math.floor(Math.random() * colors.length)]!,
    opacity: 1,
  }));
  let frame = 0;
  let animId = 0;
  let cancelled = false;
  const animate = () => {
    if (cancelled) return;
    ctx.clearRect(0, 0, w, h);
    pieces.forEach((p) => {
      const flutter = Math.sin(frame * 0.11 + p.phase) * p.wobbleAmp;
      p.x += p.vx + flutter * 0.35;
      p.y += p.vy;
      p.vy += 0.045;
      p.rot += p.vr + Math.sin(frame * 0.08 + p.phase) * 0.02;
      p.opacity -= 0.004;
      if (p.opacity <= 0) return;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    frame += 1;
    const allFaded = pieces.every((p) => p.opacity <= 0.01);
    if (allFaded || frame >= CONFETTI_MAX_FRAMES) {
      if (!cancelled) finish();
      return;
    }
    animId = window.requestAnimationFrame(animate);
  };
  animId = window.requestAnimationFrame(animate);
  return () => {
    cancelled = true;
    cancelAnimationFrame(animId);
  };
}

interface JobCard {
  id: string;
  selectableJobId?: JobId;
  name: string;
  icon: string;
  imageUrl: string;
  color: string;
  hp: number;
  timeBar: number;
  mental: number;
  mechanic: string;
  catchphrase: string;
  comingSoon?: boolean;
}

const JOB_CARDS: JobCard[] = [
  {
    id: 'carpenter',
    selectableJobId: 'carpenter',
    name: '大工',
    icon: '🔨',
    imageUrl: carpenterSymbolImage,
    color: '#c0392b',
    hp: 80,
    timeBar: 10.8,
    mental: 7,
    mechanic: '足場を積み上げて大ダメージ',
    catchphrase: '腕一本で生き抜く',
  },
  {
    id: 'cook',
    selectableJobId: 'cook',
    name: '料理人',
    icon: '🔪',
    imageUrl: cookSymbolImage,
    color: '#f9ca24',
    hp: 100,
    timeBar: 10.4,
    mental: 6,
    mechanic: '調理ゲージを爆発させる',
    catchphrase: '厨房は戦場だ',
  },
  {
    id: 'unemployed',
    selectableJobId: 'unemployed',
    name: '無職',
    icon: '✊',
    imageUrl: unemployedSymbolImage,
    color: '#8b949e',
    hp: 70,
    timeBar: 12.0,
    mental: 10,
    mechanic: 'ピンチほど強くなる',
    catchphrase: '失うものは何もない',
    comingSoon: true,
  },
];

/** タップ判定の移動距離上限（px） */
const TAP_THRESHOLD = 8;
const MELT_DURATION_MS = 1200;
const HAND_X_OFFSET = 24;

interface HandLayoutItem {
  x: number;
  yOffset: number;
  angle: number;
  width: number;
  height: number;
}

const calcHandLayout = (cardCount: number, areaWidth: number): HandLayoutItem[] => {
  if (cardCount <= 0) return [];
  const cardWidth = 88;
  const cardHeight = cardWidth * 1.55;
  const anglePerCard = cardCount > 1 ? Math.min(20 / (cardCount - 1), 5) : 0;
  const totalAngle = anglePerCard * (cardCount - 1);
  const startAngle = -totalAngle / 2;
  const spacing = Math.min(
    cardWidth * 0.6,
    (areaWidth - cardWidth) / Math.max(cardCount - 1, 1),
  );
  const totalWidth = spacing * Math.max(0, cardCount - 1) + cardWidth;
  const startX = (areaWidth - totalWidth) / 2;
  return Array.from({ length: cardCount }, (_, i) => {
    const angle = startAngle + anglePerCard * i;
    const x = startX + spacing * i;
    const normalizedPos = cardCount > 1 ? (i / (cardCount - 1)) * 2 - 1 : 0;
    const yOffset = normalizedPos * normalizedPos * 20;
    return { x, yOffset, angle, width: cardWidth, height: cardHeight };
  });
};

interface JobSelectScreenProps {
  onSelect: (jobId: JobId) => void;
  onBack: () => void;
}

const JobSelectScreen = ({ onSelect, onBack }: JobSelectScreenProps) => {
  // 拡大表示中のカード
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  // ドラッグ中のカードインデックス
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  // ドラッグ開始位置
  const dragStartPos = useRef({ x: 0, y: 0 });
  // ポインターダウン時のカード内オフセット（カード左上からの相対位置）
  const pointerOffsetInCard = useRef({ x: 0, y: 0 });
  // ドラッグ中の移動量（上方向が負）— 再レンダリング用 state
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  // 最新値を同期参照するための ref（PointerUp 時に使う）
  const dragDeltaRef = useRef({ x: 0, y: 0 });
  // タップ判定用：ポインタダウン時刻
  const pointerDownTime = useRef(0);

  const [isMelting, setIsMelting] = useState(false);
  const [meltColor, setMeltColor] = useState('#ffffff');
  const [imageLoadFailed, setImageLoadFailed] = useState<Set<string>>(() => new Set());
  const [handAreaWidth, setHandAreaWidth] = useState(360);
  const [viewportHeight, setViewportHeight] = useState(900);
  const [showJobTutorial, setShowJobTutorial] = useState(false);
  const [showCookUnlockCelebration, setShowCookUnlockCelebration] = useState(false);

  const cookUnlocked = isJobUnlocked('cook');
  const isCookCardLocked = (job: JobCard) => job.id === 'cook' && !cookUnlocked;

  const celebrationRanRef = useRef(false);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const confettiCleanupRef = useRef<(() => void) | null>(null);

  const meltCanvasRef = useRef<HTMLCanvasElement>(null);
  const handAreaRef = useRef<HTMLDivElement>(null);
  const meltTimerRef = useRef<number | null>(null);
  const meltResetTimerRef = useRef<number | null>(null);

  const expandedJob = expandedIndex !== null ? JOB_CARDS[expandedIndex] : null;

  useEffect(() => {
    if (!hasTutorialSeen('job_select')) {
      const timer = setTimeout(() => {
        setShowJobTutorial(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const tryStartCookUnlockCelebration = () => {
    if (celebrationRanRef.current) return;
    if (!isJobUnlocked('cook') || hasSeenJobUnlock('cook')) return;
    celebrationRanRef.current = true;
    setShowCookUnlockCelebration(true);
  };

  useEffect(() => {
    if (!showCookUnlockCelebration) {
      confettiCleanupRef.current?.();
      confettiCleanupRef.current = null;
      return;
    }
    const id = window.requestAnimationFrame(() => {
      confettiCleanupRef.current = runCookUnlockConfetti(confettiCanvasRef.current, () => {
        markJobUnlockSeen('cook');
        setShowCookUnlockCelebration(false);
      });
    });
    return () => {
      window.cancelAnimationFrame(id);
      confettiCleanupRef.current?.();
      confettiCleanupRef.current = null;
    };
  }, [showCookUnlockCelebration]);

  useEffect(() => {
    if (!isJobUnlocked('cook') || hasSeenJobUnlock('cook')) return;
    if (!hasTutorialSeen('job_select')) return;
    const t = window.setTimeout(() => tryStartCookUnlockCelebration(), 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- マウント時のみ（チュートリアル済みで初回のみ演出）
  }, []);

  const handleJobTutorialDone = () => {
    markTutorialSeen('job_select');
    setShowJobTutorial(false);
    window.setTimeout(() => {
      if (isJobUnlocked('cook') && !hasSeenJobUnlock('cook')) {
        tryStartCookUnlockCelebration();
      }
    }, 350);
  };

  // ---- melt particles ----
  const startMeltParticles = (job: JobCard, originX: number, originY: number) => {
    const canvas = meltCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const color = job.color;
    const particles = Array.from({ length: 120 }, () => ({
      x: originX + (Math.random() - 0.5) * 80,
      y: originY + (Math.random() - 0.5) * 120,
      vx: (Math.random() - 0.5) * 5,
      vy: -(Math.random() * 7 + 2),
      size: Math.random() * 8 + 2,
      opacity: 1,
    }));
    let frame = 0;
    let animId = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.15;
        p.opacity -= 0.018;
        p.size *= 0.97;
        if (p.opacity <= 0) return;
        const hex = Math.floor(p.opacity * 255).toString(16).padStart(2, '0');
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        glow.addColorStop(0, `${color}${hex}`);
        glow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${hex}`;
        ctx.fill();
      });
      frame += 1;
      if (frame < 70) animId = window.requestAnimationFrame(animate);
    };
    animId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animId);
  };

  // ---- melt trigger ----
  const triggerMeltEffect = (job: JobCard, originX: number, originY: number) => {
    if (!job.selectableJobId) return;
    if (isCookCardLocked(job)) return;
    setMeltColor('#ffffff');
    setIsMelting(true);
    startMeltParticles(job, originX, originY);
    if (meltTimerRef.current !== null) window.clearTimeout(meltTimerRef.current);
    if (meltResetTimerRef.current !== null) window.clearTimeout(meltResetTimerRef.current);
    meltTimerRef.current = window.setTimeout(() => {
      try {
        onSelect(job.selectableJobId as JobId);
      } catch {
        // 画面遷移側で例外が発生しても白画面固定を避ける
        setIsMelting(false);
      }
      setDraggingIndex(null);
      setExpandedIndex(null);
      dragDeltaRef.current = { x: 0, y: 0 };
      setDragDelta({ x: 0, y: 0 });
      setIsMelting(false);
    }, MELT_DURATION_MS);
    meltResetTimerRef.current = window.setTimeout(() => {
      setDraggingIndex(null);
      setExpandedIndex(null);
      dragDeltaRef.current = { x: 0, y: 0 };
      setDragDelta({ x: 0, y: 0 });
      setIsMelting(false);
    }, MELT_DURATION_MS + 400);
  };

  // ---- pointer handlers on hand cards ----
  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    if (isMelting) return;
    const job = JOB_CARDS[index];
    if (job.comingSoon || isCookCardLocked(job)) {
      e.preventDefault();
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragDeltaRef.current = { x: 0, y: 0 };
    setDragDelta({ x: 0, y: 0 });
    pointerDownTime.current = Date.now();
    // カード要素内での掴んだ位置を記録
    const rect = e.currentTarget.getBoundingClientRect();
    pointerOffsetInCard.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setDraggingIndex(index);
  };

  const handlePointerMove = (e: React.PointerEvent, index: number) => {
    if (draggingIndex !== index || isMelting) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    dragDeltaRef.current = { x: dx, y: dy };
    setDragDelta({ x: dx, y: dy });

    // カードの現在Y座標で拡大判定
    const currentY = e.clientY;
    const expandY = viewportHeight * 0.65;
    if (currentY < expandY) {
      setExpandedIndex(index);
    } else {
      setExpandedIndex(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent, index: number) => {
    if (draggingIndex !== index) return;
    const dy = dragDeltaRef.current.y;
    const totalMove = Math.abs(dragDeltaRef.current.x) + Math.abs(dy);

    if (totalMove < TAP_THRESHOLD) {
      // タップ → 何もしない
      setExpandedIndex(null);
      setDraggingIndex(null);
      return;
    }

    // カードが画面上部20%より上なら溶解
    const meltY = viewportHeight * 0.2;
    if (e.clientY < meltY) {
      triggerMeltEffect(JOB_CARDS[index], e.clientX, e.clientY);
    } else {
      // 途中で離した → 拡大を閉じて手札に戻す
      setExpandedIndex(null);
      setDraggingIndex(null);
    }
  };

  const handlePointerCancel = (index: number) => {
    if (draggingIndex === index) {
      setExpandedIndex(null);
      setDraggingIndex(null);
    }
  };

  // cleanup timers
  useEffect(
    () => () => {
      if (meltTimerRef.current !== null) window.clearTimeout(meltTimerRef.current);
      if (meltResetTimerRef.current !== null) window.clearTimeout(meltResetTimerRef.current);
    },
    [],
  );

  // hand area width measurement
  useEffect(() => {
    const el = handAreaRef.current;
    if (!el) return;
    const update = () => setHandAreaWidth(el.offsetWidth || 360);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    const updateViewport = () => setViewportHeight(window.innerHeight || 900);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const handLayout = useMemo(
    () => calcHandLayout(JOB_CARDS.length, handAreaWidth),
    [handAreaWidth],
  );

  // ドラッグ中カードの溶解進捗（0〜1）: 画面中央→上部20%の範囲
  const dragProgress = (() => {
    if (draggingIndex === null) return 0;
    const currentY = dragStartPos.current.y + dragDelta.y;
    const expandY = viewportHeight * 0.65;
    const meltY = viewportHeight * 0.2;
    if (currentY >= expandY) return 0;
    return Math.min(1, Math.max(0, (expandY - currentY) / (expandY - meltY)));
  })();
  const topLightIntensity = isMelting ? 1 : dragProgress;

  const expandedMentalCap =
    expandedJob?.selectableJobId != null ? getJobConfig(expandedJob.selectableJobId).maxMental : 10;

  return (
    <main
      className="job-select-screen"
      style={{
        backgroundImage: `url(${jobSelectBackgroundImage})`,
        backgroundColor: '#0b1118',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="job-select-overlay" />
      {topLightIntensity > 0.01 && (
        <div
          className={`job-top-light ${isMelting ? 'job-top-light--melt' : ''}`}
          style={{ '--light-intensity': topLightIntensity } as CSSProperties}
        />
      )}

      <button type="button" className="btn-job-back" onClick={onBack}>
        ← 戻る
      </button>

      {/* 拡大表示パネル（手札とは独立） */}
      {expandedJob &&
        !expandedJob.comingSoon &&
        !(expandedJob.id === 'cook' && !cookUnlocked) && (
        <div className="job-detail-area">
          <div
            className="job-detail-card"
            style={
              {
                '--job-color': expandedJob.color,
                borderColor: expandedJob.color,
                boxShadow: `0 0 30px ${expandedJob.color}55`,
              } as CSSProperties
            }
          >
            <div className="job-detail-card-topline" style={{ background: expandedJob.color }} />
            <div className="job-detail-symbol">
              {expandedJob.imageUrl && !imageLoadFailed.has(expandedJob.id) ? (
                <img
                  src={expandedJob.imageUrl}
                  alt={expandedJob.name}
                  className="job-detail-symbol-img"
                  draggable={false}
                  onError={() =>
                    setImageLoadFailed((prev) => {
                      const next = new Set(prev);
                      next.add(expandedJob.id);
                      return next;
                    })
                  }
                />
              ) : (
                <span className="job-detail-emoji">{expandedJob.icon}</span>
              )}
            </div>
            <div className="job-detail-name-area">
              <span className="job-detail-icon">{expandedJob.icon}</span>
              <h3 className="job-detail-name">{expandedJob.name}</h3>
            </div>
            <p className="job-detail-catch">{expandedJob.catchphrase}</p>
            <div className="job-detail-stats">
              <div className="job-detail-stat">
                <span className="job-detail-stat-label">❤️ HP</span>
                <div className="job-detail-stat-bar">
                  <div
                    className="job-detail-stat-fill"
                    style={{ width: `${(expandedJob.hp / 100) * 100}%`, background: '#e74c3c' }}
                  />
                </div>
                <span className="job-detail-stat-value">{expandedJob.hp}</span>
              </div>
              <div className="job-detail-stat">
                <span className="job-detail-stat-label">⏱ タイム</span>
                <div className="job-detail-stat-bar">
                  <div
                    className="job-detail-stat-fill"
                    style={{
                      width: `${(expandedJob.timeBar / 12) * 100}%`,
                      background: '#3b82f6',
                    }}
                  />
                </div>
                <span className="job-detail-stat-value">{expandedJob.timeBar}s</span>
              </div>
              <div className="job-detail-stat">
                <span className="job-detail-stat-label">🧠 メンタル</span>
                <div className="job-detail-stat-bar">
                  <div
                    className="job-detail-stat-fill"
                    style={{
                      width: `${(expandedJob.mental / expandedMentalCap) * 100}%`,
                      background: '#8b5cf6',
                    }}
                  />
                </div>
                <span className="job-detail-stat-value">
                  {expandedJob.mental}/{expandedMentalCap}
                </span>
              </div>
            </div>
            <div
              className="job-detail-mechanic"
              style={{ borderColor: `${expandedJob.color}44` }}
            >
              <span className="job-detail-mechanic-label">固有スキル</span>
              <p className="job-detail-mechanic-text">{expandedJob.mechanic}</p>
            </div>
          </div>
        </div>
      )}

      {/* 手札エリア */}
      <div className="job-hand-area" ref={handAreaRef}>
        {JOB_CARDS.map((job, index) => {
          const item = handLayout[index];
          const isDragging = draggingIndex === index;
          const cookLocked = isCookCardLocked(job);

          // ドラッグ中は「指の位置 - カード内オフセット」でカード左上を配置
          const cardW = item?.width ?? 88;
          const cardH = item?.height ?? 136;
          const draggingLeft = isDragging
            ? dragStartPos.current.x + dragDelta.x - pointerOffsetInCard.current.x
            : null;
          // bottom は画面下端からの距離に変換（position:fixed の手札エリアに合わせる）
          const draggingTop = isDragging
            ? dragStartPos.current.y + dragDelta.y - pointerOffsetInCard.current.y
            : null;

          const wrapperStyle = (
            isDragging
              ? {
                  position: 'fixed',
                  left: `${draggingLeft}px`,
                  top: `${draggingTop}px`,
                  width: `${cardW}px`,
                  height: `${cardH}px`,
                  '--card-angle': '0deg',
                  transform: 'rotate(0deg) scale(1.08)',
                  transformOrigin: 'center center',
                  transition: 'none',
                  zIndex: 200,
                }
              : {
                  position: 'absolute',
                  left: `${(item?.x ?? 0) + HAND_X_OFFSET}px`,
                  bottom: `${-30 - (item?.yOffset ?? 0)}px`,
                  width: `${item?.width ?? 88}px`,
                  height: `${item?.height ?? 136}px`,
                  '--card-angle': `${item?.angle ?? 0}deg`,
                  transform: `rotate(${item?.angle ?? 0}deg)`,
                  transformOrigin: 'bottom center',
                  transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  zIndex: index + 1,
                }
          ) as unknown as CSSProperties;

          return (
            <div
              key={job.id}
              className={`job-hand-card-wrapper${job.comingSoon ? ' job-hand-card-wrapper--coming-soon' : ''}${cookLocked ? ' job-hand-card-wrapper--job-locked' : ''}${isDragging ? ' job-hand-card-wrapper--dragging' : ''}`}
              style={wrapperStyle as CSSProperties}
              onPointerDown={(e) => handlePointerDown(e, index)}
              onPointerMove={(e) => handlePointerMove(e, index)}
              onPointerUp={(e) => handlePointerUp(e, index)}
              onPointerCancel={() => handlePointerCancel(index)}
            >
              {/* ドラッグ中の進捗ゲージ */}
              {isDragging && dragDelta.y < -10 && (
                <div
                  className="job-drag-progress"
                  style={{
                    background: job.color,
                    width: `${dragProgress * 100}%`,
                  }}
                />
              )}
              <div
                className="job-hand-card"
                style={
                  isDragging
                    ? {
                        boxShadow: `0 0 24px ${job.color}88`,
                        borderColor: job.color,
                      }
                    : undefined
                }
              >
                <div className="job-hand-card-topline" style={{ background: job.color }} />
                <div className="job-hand-card-name-area">
                  <span className="job-hand-card-name">
                    {cookLocked || job.comingSoon ? '？？？' : job.name}
                  </span>
                </div>
                <div className="job-hand-card-symbol">
                  {cookLocked ? (
                    <span className="job-hand-card-emoji job-hand-card-emoji--lock" aria-hidden>
                      🔒
                    </span>
                  ) : job.comingSoon || !job.imageUrl || imageLoadFailed.has(job.id) ? (
                    <span className="job-hand-card-emoji">{job.icon}</span>
                  ) : (
                    <img
                      src={job.imageUrl}
                      alt={job.name}
                      className="job-hand-card-img"
                      draggable={false}
                      onError={() =>
                        setImageLoadFailed((prev) => {
                          const next = new Set(prev);
                          next.add(job.id);
                          return next;
                        })
                      }
                    />
                  )}
                </div>
                {job.comingSoon && (
                  <div className="job-hand-card-coming-soon">
                    <span>
                      COMING
                      <br />
                      SOON
                    </span>
                  </div>
                )}
                {cookLocked && (
                  <div className="job-hand-card-cook-lock-hint" role="status">
                    エリア2ボス撃破で解放
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isMelting && (
        <>
          <canvas ref={meltCanvasRef} className="melt-canvas" />
          <div
            className="melt-flash"
            style={{ '--melt-color': meltColor } as CSSProperties}
          />
        </>
      )}
      {showCookUnlockCelebration && (
        <>
          <canvas ref={confettiCanvasRef} className="job-cook-unlock-confetti" aria-hidden />
          <div className="job-cook-unlock-overlay" role="dialog" aria-live="polite">
            <p className="job-cook-unlock-message">🔪 料理人が解放されました！</p>
          </div>
        </>
      )}
      {showJobTutorial && (
        <TutorialOverlay step="job_select" onNext={handleJobTutorialDone} onSkip={handleJobTutorialDone} />
      )}
    </main>
  );
};

export default JobSelectScreen;
