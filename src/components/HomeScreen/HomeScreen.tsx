import { useEffect, useMemo, useRef, useState } from 'react';
import { useAudioContext } from '../../contexts/AudioContext';
import type { CSSProperties } from 'react';
import { StoryScreen } from '../StoryScreen/StoryScreen';
import {
  CARPENTER_E1_STORY,
  CARPENTER_E2_STORY,
  CARPENTER_E3_STORY,
  CARPENTER_STORY,
  hasSeenStory,
} from '../../data/stories/carpenterStory';
import type { StoryScene } from '../../data/stories/carpenterStory';
import type { GameProgress } from '../../types/run';
import type { DevDestination } from '../../hooks/useRunProgress';
import homeBackgroundImage from '../../assets/home_background.png';
import letterJImage from '../../assets/title/letter_J.png';
import letterOImage from '../../assets/title/letter_O.png';
import letterBImage from '../../assets/title/letter_B.png';
import letterLImage from '../../assets/title/letter_L.png';
import letterEImage from '../../assets/title/letter_E.png';
import letterSImage from '../../assets/title/letter_S.png';
import letterS2Image from '../../assets/title/letter_S2.png';
import './HomeScreen.css';
import type { Achievement } from '../../utils/achievementSystem';
import {
  ACHIEVEMENTS,
  clearAchievements,
  getUnlockedAchievementIds,
  unlockAllAchievements,
} from '../../utils/achievementSystem';
import { AchievementRewardModal } from '../AchievementRewardModal/AchievementRewardModal';

const JOB_NAMES: Record<string, string> = {
  carpenter: '大工',
  cook: '料理人',
  unemployed: '無職',
};

interface HomeScreenProps {
  onStart: () => void;
  onOpenZukan: () => void;
  onContinue?: (saved: GameProgress) => void;
  savedProgress?: GameProgress | null;
  onDevNavigate?: (destination: DevDestination) => void;
}

type ModalType = 'howto' | 'credits' | null;
type HowtoTab = 'glossary' | 'story';
type StoryJobKey = 'carpenter' | 'cook' | 'unemployed';
type StoryEpisodeId =
  | 'carpenter_opening'
  | 'carpenter_e1'
  | 'carpenter_e2'
  | 'carpenter_e3'
  | 'cook_planned'
  | 'unemployed_planned';

interface FireflyParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  opacityDir: 1 | -1;
  opacitySpeed: number;
  size: number;
  glowSize: number;
  angleX: number;
  angleY: number;
  angleSpeedX: number;
  angleSpeedY: number;
  amplitude: number;
  canFlyHigh: boolean;
  glowIntensity: number;
  glowTarget: number;
  glowChangeSpeed: number;
  glowSizeCurrent: number;
  glowSizeTarget: number;
  glowSizeSpeed: number;
  isOff: boolean;
  offTimer: number;
  offDuration: number;
  nextOffTimer: number;
  dirChangeTimer: number;
  speedScale: number;
}

const Fireflies = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      console.log('canvas size:', canvas.width, canvas.height);
    };

    setSize();

    const fireflies: FireflyParticle[] = Array.from({ length: 6 }, (_, i) => {
      const speedScale = Math.random() * 0.6 + 0.2;
      return {
        x: Math.random() * canvas.width,
        y: i < 2 ? Math.random() * canvas.height : canvas.height * 0.5 + Math.random() * canvas.height * 0.5,
        vx: (Math.random() - 0.5) * 1.2 * speedScale,
        vy: (Math.random() - 0.5) * 1.0 * speedScale,
        opacity: Math.random(),
        opacityDir: Math.random() > 0.5 ? 1 : -1,
        opacitySpeed: Math.random() * 0.015 + 0.002,
        size: Math.random() * 3 + 1,
        glowSize: Math.random() * 14 + 6,
        angleX: Math.random() * Math.PI * 2,
        angleY: Math.random() * Math.PI * 2,
        angleSpeedX: (Math.random() - 0.5) * 0.03,
        angleSpeedY: (Math.random() - 0.5) * 0.025,
        amplitude: (Math.random() * 2.5 + 0.5) * speedScale,
        canFlyHigh: i < 2,
        glowIntensity: Math.random(),
        glowTarget: Math.random(),
        glowChangeSpeed: Math.random() * 0.03 + 0.005,
        glowSizeCurrent: Math.random() * 14 + 6,
        glowSizeTarget: Math.random() * 14 + 6,
        glowSizeSpeed: Math.random() * 0.04 + 0.01,
        isOff: false,
        offTimer: 0,
        offDuration: 0,
        nextOffTimer: Math.random() * 300 + 60,
        dirChangeTimer: Math.random() * 200 + 50,
        speedScale,
      };
    });

    let frameId = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      fireflies.forEach((fly) => {
        fly.dirChangeTimer -= 1;
        if (fly.dirChangeTimer <= 0) {
          fly.vx = (Math.random() - 0.5) * 1.2 * fly.speedScale;
          fly.vy = (Math.random() - 0.5) * 1.0 * fly.speedScale;
          fly.dirChangeTimer = Math.random() * 300 + 60;
          if (Math.random() < 0.15) {
            fly.vx *= 1.8;
            fly.vy *= 1.8;
            fly.dirChangeTimer = Math.random() * 30 + 10;
          }
        }

        fly.angleX += fly.angleSpeedX;
        fly.angleY += fly.angleSpeedY;
        fly.x += fly.vx + Math.sin(fly.angleX) * fly.amplitude;
        fly.y += fly.vy + Math.cos(fly.angleY) * fly.amplitude * 0.5;

        if (fly.x < -20) {
          fly.x = -20;
          fly.vx = Math.abs(fly.vx);
        }
        if (fly.x > canvas.width + 20) {
          fly.x = canvas.width + 20;
          fly.vx = -Math.abs(fly.vx);
        }

        const ceiling = fly.canFlyHigh ? 0 : canvas.height * 0.5;
        if (fly.y < ceiling) {
          fly.y = ceiling;
          fly.vy = Math.abs(fly.vy) * 0.3;
        }
        if (fly.y > canvas.height + 20) {
          fly.y = canvas.height + 20;
          fly.vy = -Math.abs(fly.vy) * 0.3;
        }

        fly.nextOffTimer -= 1;
        if (fly.nextOffTimer <= 0 && !fly.isOff) {
          fly.isOff = true;
          fly.offDuration = Math.random() < 0.3 ? Math.random() * 20 + 5 : Math.random() * 180 + 60;
          fly.offTimer = fly.offDuration;
        }
        if (fly.isOff) {
          fly.offTimer -= 1;
          if (fly.offTimer <= 0) {
            fly.isOff = false;
            fly.nextOffTimer = Math.random() < 0.3 ? Math.random() * 60 + 20 : Math.random() * 500 + 100;
          }
        }

        if (fly.isOff) return;

        if (Math.abs(fly.glowIntensity - fly.glowTarget) < 0.02) {
          fly.glowTarget = Math.random();
          fly.glowChangeSpeed = Math.random() * 0.03 + 0.005;
        }
        fly.glowIntensity += (fly.glowTarget - fly.glowIntensity) * fly.glowChangeSpeed * 10;

        if (Math.abs(fly.glowSizeCurrent - fly.glowSizeTarget) < 0.5) {
          fly.glowSizeTarget = Math.random() * 16 + 6;
          fly.glowSizeSpeed = Math.random() * 0.05 + 0.02;
        }
        fly.glowSizeCurrent += (fly.glowSizeTarget - fly.glowSizeCurrent) * fly.glowSizeSpeed;

        fly.opacity += fly.opacityDir * fly.opacitySpeed;
        if (fly.opacity >= 1) {
          fly.opacity = 1;
          fly.opacityDir = -1;
        } else if (fly.opacity <= 0) {
          fly.opacity = 0;
          fly.opacityDir = 1;
        }

        const alpha = fly.opacity * fly.glowIntensity * 0.9;
        const glowGradient = ctx.createRadialGradient(fly.x, fly.y, 0, fly.x, fly.y, fly.glowSizeCurrent);
        glowGradient.addColorStop(0, `rgba(180, 255, 100, ${alpha * 0.5})`);
        glowGradient.addColorStop(0.4, `rgba(150, 230, 80, ${alpha * 0.2})`);
        glowGradient.addColorStop(1, 'rgba(100, 200, 50, 0)');
        ctx.beginPath();
        ctx.arc(fly.x, fly.y, fly.glowSizeCurrent, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        const coreSize = fly.size * (0.8 + fly.glowIntensity * 0.4);
        const coreGradient = ctx.createRadialGradient(fly.x, fly.y, 0, fly.x, fly.y, coreSize);
        coreGradient.addColorStop(0, `rgba(230, 255, 180, ${alpha})`);
        coreGradient.addColorStop(0.5, `rgba(180, 255, 100, ${alpha * 0.8})`);
        coreGradient.addColorStop(1, 'rgba(120, 200, 60, 0)');
        ctx.beginPath();
        ctx.arc(fly.x, fly.y, coreSize, 0, Math.PI * 2);
        ctx.fillStyle = coreGradient;
        ctx.fill();
      });

      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    window.addEventListener('resize', setSize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', setSize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fireflies-canvas" aria-hidden />;
};

const HomeScreen = ({
  onStart,
  onOpenZukan,
  onContinue,
  savedProgress,
  onDevNavigate,
}: HomeScreenProps) => {
  const [modal, setModal] = useState<ModalType>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [achievementRefreshKey, setAchievementRefreshKey] = useState(0);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [activeHowtoTab, setActiveHowtoTab] = useState<HowtoTab>('glossary');
  const [openedHowtoEntry, setOpenedHowtoEntry] = useState<string | null>(null);
  const [playingStory, setPlayingStory] = useState<StoryEpisodeId | null>(null);
  const [selectedStoryByJob, setSelectedStoryByJob] = useState<Record<StoryJobKey, number>>({
    carpenter: 0,
    cook: 0,
    unemployed: 0,
  });
  const [fallingIndex, setFallingIndex] = useState<number | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const transitionTimeoutRef = useRef<number | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);
  const activeFragmentsRef = useRef<HTMLDivElement[]>([]);
  const backgroundStyle: CSSProperties = {
    backgroundImage: `url(${homeBackgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
  };

  const modalTitles: Record<Exclude<ModalType, null>, string> = {
    howto: '遊び方',
    credits: 'クレジット',
  };

  const unlockedIds = useMemo(() => getUnlockedAchievementIds(), [achievementRefreshKey]);
  const storyJobs: {
    jobKey: StoryJobKey;
    jobName: string;
    icon: string;
    episodes: {
      id: StoryEpisodeId;
      chapterName: string;
      scenes: StoryScene[];
      planned?: boolean;
    }[];
  }[] = [
    {
      jobKey: 'carpenter',
      jobName: '大工',
      icon: '🔨',
      episodes: [
        { id: 'carpenter_opening', chapterName: '序章', scenes: CARPENTER_STORY },
        { id: 'carpenter_e1', chapterName: '第1章', scenes: CARPENTER_E1_STORY },
        { id: 'carpenter_e2', chapterName: '第2章', scenes: CARPENTER_E2_STORY },
        { id: 'carpenter_e3', chapterName: 'エンディング', scenes: CARPENTER_E3_STORY },
      ],
    },
    {
      jobKey: 'cook',
      jobName: '料理人',
      icon: '🔪',
      episodes: [{ id: 'cook_planned', chapterName: '実装予定', scenes: [], planned: true }],
    },
    {
      jobKey: 'unemployed',
      jobName: '無職',
      icon: '✊',
      episodes: [{ id: 'unemployed_planned', chapterName: '実装予定', scenes: [], planned: true }],
    },
  ];
  const glossaryEntries = [
    {
      id: 'basics',
      term: '基本の流れ',
      description: 'カードをドラッグして敵・タイムバー・温存枠へ配置し、ターンを進めて敵を倒します。',
    },
    { id: 'hp', term: 'HP', description: '体力。0になると敗北です。' },
    { id: 'mental', term: 'メンタル', description: 'タイム上限や各種効果に影響する精神状態です。' },
    { id: 'timebar', term: 'タイムバー', description: 'ターン中に使える時間。時間が切れると行動終了です。' },
    { id: 'reserve-bonus', term: '温存ボーナス', description: '温存した特定カードに次ターン強化効果が付与されます。' },
    { id: 'status', term: '状態異常', description: '敵味方に付く持続効果。弱体や有利効果を含みます。' },
  ] as const;

  const getStoryScenes = (episodeId: StoryEpisodeId): StoryScene[] => {
    for (const job of storyJobs) {
      const foundEpisode = job.episodes.find((episode) => episode.id === episodeId);
      if (foundEpisode) {
        return foundEpisode.scenes;
      }
    }
    return [];
  };

  const moveStorySelection = (jobKey: StoryJobKey, direction: -1 | 1, maxLength: number) => {
    setSelectedStoryByJob((prev) => {
      const currentIndex = prev[jobKey];
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= maxLength) {
        return prev;
      }
      return {
        ...prev,
        [jobKey]: nextIndex,
      };
    });
  };

  const {
    playSe,
    playBgm,
    setBgmVolume,
    setSeVolume,
    toggleBgmMute,
    toggleSeMute,
    getBgmVolume,
    getSeVolume,
    isBgmMuted,
    isSeMuted,
  } = useAudioContext();

  const [bgmVol, setBgmVol] = useState(() => getBgmVolume());
  const [seVol, setSeVol] = useState(() => getSeVolume());
  const [bgmMuted, setBgmMuted] = useState(() => isBgmMuted());
  const [seMuted, setSeMuted] = useState(() => isSeMuted());
  const [openSettingsSection, setOpenSettingsSection] = useState<string | null>(null);

  const toggleSettingsSection = (section: string) => {
    setOpenSettingsSection((prev) => (prev === section ? null : section));
  };

  useEffect(() => {
    playBgm('menu');
  }, [playBgm]);

  const handleButtonClick = (index: number, callback: () => void) => {
    if (fallingIndex !== null) {
      return;
    }

    playSe('button');
    setFallingIndex(index);
    const clickedBtn = btnRefs.current[index];
    if (!clickedBtn) {
      setFallingIndex(null);
      return;
    }
    clickedBtn.style.pointerEvents = 'none';

    const rect = clickedBtn.getBoundingClientRect();
    const fragmentCount = 16;
    const fragments: HTMLDivElement[] = [];

    for (let i = 0; i < fragmentCount; i += 1) {
      const fragment = document.createElement('div');
      fragment.className = 'rock-fragment';

      const size = Math.random() * 20 + 8;
      fragment.style.width = `${size}px`;
      fragment.style.height = `${size * (0.6 + Math.random() * 0.8)}px`;

      const startX = rect.left + Math.random() * rect.width;
      const startY = rect.top + Math.random() * rect.height;
      fragment.style.left = `${startX}px`;
      fragment.style.top = `${startY}px`;

      const grayValue = Math.floor(Math.random() * 80 + 60);
      fragment.style.background = `rgb(${grayValue}, ${grayValue - 10}, ${grayValue - 20})`;

      const angle = (i / fragmentCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const distance = Math.random() * 180 + 80;
      const fx = Math.cos(angle) * distance;
      const fy = Math.sin(angle) * distance + Math.random() * 100;
      const fr = `${(Math.random() - 0.5) * 720}deg`;

      fragment.style.setProperty('--fx', `${fx}px`);
      fragment.style.setProperty('--fy', `${fy}px`);
      fragment.style.setProperty('--fr', fr);

      document.body.appendChild(fragment);
      fragments.push(fragment);
    }

    activeFragmentsRef.current = fragments;

    clickedBtn.classList.add('btn-shattering');
    callback();

    transitionTimeoutRef.current = window.setTimeout(() => {
      fragments.forEach((fragment) => fragment.remove());
      activeFragmentsRef.current = [];

      resetTimeoutRef.current = window.setTimeout(() => {
        clickedBtn.classList.remove('btn-shattering');
        clickedBtn.style.transform = '';
        clickedBtn.style.opacity = '1';
        clickedBtn.style.pointerEvents = 'auto';
        setFallingIndex(null);
      }, 800);
    }, 650);
  };

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
      activeFragmentsRef.current.forEach((fragment) => fragment.remove());
      activeFragmentsRef.current = [];
    };
  }, []);

  const handleHowtoStoryComplete = () => {
    setPlayingStory(null);
    setActiveHowtoTab('story');
    setModal('howto');
  };

  const homeButtons = [
    { label: 'ゲームスタート', className: 'btn-home-start', onClick: onStart },
    { label: '図鑑', className: 'btn-home-zukan', onClick: onOpenZukan },
    { label: '実績', className: 'btn-home-records', onClick: () => setShowRecords(true) },
    { label: '設定', className: 'btn-home-settings', onClick: () => setShowSettings(true) },
    { label: 'クレジット', className: 'btn-home-credits', onClick: () => setModal('credits') },
  ] as const;
  const titleLetters = [
    { src: letterJImage, alt: 'J' },
    { src: letterOImage, alt: 'O' },
    { src: letterBImage, alt: 'B' },
    { src: letterLImage, alt: 'L' },
    { src: letterEImage, alt: 'E' },
    { src: letterSImage, alt: 'S' },
    { src: letterS2Image, alt: 'S' },
  ] as const;
  const hasSaveData =
    savedProgress !== null &&
    savedProgress !== undefined &&
    savedProgress.jobId != null &&
    typeof savedProgress.currentArea === 'number' &&
    savedProgress.currentArea >= 1 &&
    typeof savedProgress.currentTileId === 'number' &&
    savedProgress.currentTileId >= 1 &&
    savedProgress.currentScreen !== 'home' &&
    savedProgress.currentScreen !== 'title' &&
    savedProgress.currentScreen !== 'zukan' &&
    savedProgress.currentScreen !== 'job_select' &&
    savedProgress.currentScreen !== 'victory' &&
    savedProgress.currentScreen !== 'game_over';

  const renderSettingsContent = () => (
    <div className="settings-page-stack">
      <div className="settings-accordion">
        <button
          type="button"
          className={`settings-accordion-header ${openSettingsSection === 'sound' ? 'is-open' : ''}`}
          onClick={() => toggleSettingsSection('sound')}
        >
          <span>🔊 音量設定</span>
          <span className="settings-accordion-arrow">
            {openSettingsSection === 'sound' ? '▲' : '▼'}
          </span>
        </button>
        {openSettingsSection === 'sound' && (
          <div className="settings-accordion-body">
            <div className="settings-item settings-item--audio">
              <div className="settings-item-header">
                <span className="settings-item-label">BGM音量</span>
                <button
                  type="button"
                  className={`btn-mute ${bgmMuted ? 'btn-mute--off' : 'btn-mute--on'}`}
                  onClick={() => {
                    const next = toggleBgmMute();
                    setBgmMuted(next);
                  }}
                >
                  {bgmMuted ? '🔇 OFF' : '🔊 ON'}
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={bgmVol}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setBgmVol(v);
                  setBgmVolume(v);
                }}
                className="settings-slider"
              />
            </div>
            <div className="settings-item settings-item--audio">
              <div className="settings-item-header">
                <span className="settings-item-label">SE音量</span>
                <button
                  type="button"
                  className={`btn-mute ${seMuted ? 'btn-mute--off' : 'btn-mute--on'}`}
                  onClick={() => {
                    const next = toggleSeMute();
                    setSeMuted(next);
                  }}
                >
                  {seMuted ? '🔇 OFF' : '🔊 ON'}
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={seVol}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setSeVol(v);
                  setSeVolume(v);
                }}
                className="settings-slider"
              />
            </div>
          </div>
        )}
      </div>

      <div className="settings-accordion">
        <button
          type="button"
          className={`settings-accordion-header ${openSettingsSection === 'game' ? 'is-open' : ''}`}
          onClick={() => toggleSettingsSection('game')}
        >
          <span>⚙️ データ</span>
          <span className="settings-accordion-arrow">
            {openSettingsSection === 'game' ? '▲' : '▼'}
          </span>
        </button>
        {openSettingsSection === 'game' && (
          <div className="settings-accordion-body">
            <div className="settings-item settings-item--row">
              <div className="settings-item-info">
                <p className="settings-item-title">データ初期化</p>
                <p className="settings-item-desc">
                  ゲームの進行・図鑑・チュートリアルをすべてリセットします。この操作は元に戻せません。
                </p>
              </div>
              <button
                type="button"
                className="settings-btn-danger"
                onClick={() => {
                  const confirmed = window.confirm(
                    'すべてのデータを初期化しますか？\nこの操作は元に戻せません。',
                  );
                  if (!confirmed) return;
                  const keysToDelete = [
                    'real-card-battle:save-data',
                    'jobless_battle_save',
                    'jobless_enemy_records',
                    'jobless_enemy_defeat_counts',
                    'real-card-battle:unlocked-card-names',
                    'real-card-battle:tutorial-seen',
                    'story_seen_carpenter',
                    'story_seen_carpenter_e1',
                    'story_seen_carpenter_e2',
                    'story_seen_carpenter_e3',
                  ];
                  keysToDelete.forEach((key) => localStorage.removeItem(key));
                  clearAchievements();
                  window.alert('データを初期化しました。');
                  window.location.reload();
                }}
              >
                初期化
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="settings-accordion">
        <button
          type="button"
          className={`settings-accordion-header ${openSettingsSection === 'purchase' ? 'is-open' : ''}`}
          onClick={() => toggleSettingsSection('purchase')}
        >
          <span>💳 購入・課金</span>
          <span className="settings-accordion-arrow">
            {openSettingsSection === 'purchase' ? '▲' : '▼'}
          </span>
        </button>
        {openSettingsSection === 'purchase' && (
          <div className="settings-accordion-body">
            <div className="settings-item settings-item--row">
              <div className="settings-item-info">
                <p className="settings-item-title">広告を削除</p>
                <p className="settings-item-desc">
                  ¥250で広告を完全に削除します。（Capacitor移行後に有効化）
                </p>
              </div>
              <button type="button" className="settings-btn-purchase" disabled>
                ¥250
              </button>
            </div>
            <div className="settings-item settings-item--row">
              <div className="settings-item-info">
                <p className="settings-item-title">購入の復元</p>
                <p className="settings-item-desc">以前に購入した広告削除を復元します。</p>
              </div>
              <button type="button" className="settings-btn-restore" disabled>
                復元
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="settings-divider" />

      <div className="settings-item">
        <div className="settings-item-info">
          <p className="settings-item-title">利用規約</p>
        </div>
        <button
          type="button"
          className="settings-btn-link"
          onClick={() => window.open('https://s0823pro-cmyk.github.io/real-card-battle/terms.html', '_self')}
        >
          確認 →
        </button>
      </div>

      <div className="settings-item">
        <div className="settings-item-info">
          <p className="settings-item-title">プライバシーポリシー</p>
        </div>
        <button
          type="button"
          className="settings-btn-link"
          onClick={() => window.open('https://s0823pro-cmyk.github.io/real-card-battle/privacy.html', '_self')}
        >
          確認 →
        </button>
      </div>

      <div className="settings-legal">
        <p className="settings-legal-text">
          広告削除（¥250）は買い切りです。購入後は同一Apple ID / Google アカウントで無制限にご利用いただけます。
        </p>
      </div>

      {import.meta.env.DEV && (
        <div className="dev-tools">
          <p className="dev-tools-title">🛠️ 開発用ツール</p>
          <div className="dev-tools-grid">
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('battle_normal')}>
              通常戦闘
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('battle_elite')}>
              エリート戦闘
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('battle_boss_1')}>
              ボス1
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('battle_boss_2')}>
              ボス2
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('battle_boss_3')}>
              ボス3
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('shop')}>
              質屋
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('shrine')}>
              神社
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('hotel')}>
              ホテル
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('event')}>
              イベント
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('card_reward')}>
              カード報酬
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('boss_reward')}>
              ボス報酬
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('story')}>
              ストーリー
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('battle_all_cards')}>
              全カード戦闘
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (showSettings) {
    return (
      <main className="home-screen" style={backgroundStyle}>
        <Fireflies />
        <div className="records-page">
          <div className="records-page-header">
            <button type="button" className="records-back-btn" onClick={() => setShowSettings(false)}>
              ← 戻る
            </button>
            <h2 className="records-page-title">設定</h2>
            <div />
          </div>
          <div className="records-page-content">{renderSettingsContent()}</div>
        </div>
      </main>
    );
  }

  if (showRecords) {
    return (
      <main className="home-screen" style={backgroundStyle}>
        <Fireflies />
        <div className="records-page">
          <div className="records-page-header">
            <button type="button" className="records-back-btn" onClick={() => setShowRecords(false)}>
              ← 戻る
            </button>
            <h2 className="records-page-title">実績</h2>
            <div />
          </div>
          <div className="records-page-content">
            {import.meta.env.DEV && (
              <div className="records-page-dev">
                <button
                  type="button"
                  className="records-page-dev-unlock-all"
                  onClick={() => {
                    unlockAllAchievements();
                    setAchievementRefreshKey((k) => k + 1);
                  }}
                >
                  【開発】全実績解放
                </button>
              </div>
            )}
            <div className="achievement-list">
              {ACHIEVEMENTS.map((a) => {
                const isUnlocked = unlockedIds.has(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`achievement-item ${isUnlocked ? 'achievement-item--unlocked' : ''}`}
                    disabled={!isUnlocked}
                    onClick={() => (isUnlocked ? setSelectedAchievement(a) : undefined)}
                  >
                    <span className="achievement-icon">{isUnlocked ? a.icon : '🔒'}</span>
                    <div className="achievement-info">
                      <p className="achievement-name">{isUnlocked ? a.name : '???'}</p>
                      <p className="achievement-desc">{isUnlocked ? a.description : '未達成'}</p>
                      {isUnlocked && (
                        <p className="achievement-reward">
                          {a.rewardIcon} {a.rewardName} 解放済み
                          <span className="victory-achievement-tap"> タップで確認</span>
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <AchievementRewardModal
            selected={selectedAchievement}
            onClose={() => setSelectedAchievement(null)}
            jobId="carpenter"
          />
        </div>
      </main>
    );
  }

  return (
    <main className="home-screen" style={backgroundStyle}>
      <Fireflies />
      <div className="home-content">
        <div className="home-title-area">
          <div className="home-title-letters">
            {titleLetters.map((letter, index) => (
              <img key={`${letter.alt}-${index}`} className="home-title-letter" src={letter.src} alt={letter.alt} />
            ))}
          </div>
        </div>

        <div className="home-menu-area">
          {hasSaveData && (
            <button
              type="button"
              className="btn-home-continue"
              style={{ pointerEvents: fallingIndex !== null ? 'none' : 'auto' }}
              onClick={() => {
                if (savedProgress) onContinue?.(savedProgress);
              }}
            >
              <span className="btn-home-continue-label">続きから始める</span>
              <span className="btn-home-continue-sub">
                {JOB_NAMES[savedProgress.jobId] ?? savedProgress.jobId} / エリア{savedProgress.currentArea}
              </span>
            </button>
          )}
          {homeButtons.map((button, index) => (
            <button
              key={button.label}
              ref={(element) => {
                btnRefs.current[index] = element;
              }}
              type="button"
              className={button.className}
              style={{
                position: 'relative',
                zIndex: fallingIndex === index ? 50 : 10,
                transition: fallingIndex === index ? 'none' : 'transform 0.3s ease',
                pointerEvents: fallingIndex !== null ? 'none' : 'auto',
              }}
              onClick={() => handleButtonClick(index, button.onClick)}
            >
              {button.label}
            </button>
          ))}
        </div>

        <p className="home-version">ver 0.1.0</p>
      </div>

      {modal && (
        <div
          className="home-modal-overlay"
          onClick={() => {
            if (modal !== 'howto') setModal(null);
          }}
        >
          <div
            className={`home-modal-box ${modal === 'howto' ? 'home-modal-box--howto' : ''}`}
            onClick={(event) => event.stopPropagation()}
          >
            <h2>{modalTitles[modal]}</h2>
            {modal === 'howto' ? (
              <div className="howto-panel">
                <div className="howto-tabs">
                  <button
                    type="button"
                    className={`howto-tab ${activeHowtoTab === 'glossary' ? 'howto-tab--active' : ''}`}
                    onClick={() => {
                      setActiveHowtoTab('glossary');
                      setOpenedHowtoEntry(null);
                    }}
                  >
                    用語集
                  </button>
                  <button
                    type="button"
                    className={`howto-tab ${activeHowtoTab === 'story' ? 'howto-tab--active' : ''}`}
                    onClick={() => {
                      setActiveHowtoTab('story');
                      setOpenedHowtoEntry(null);
                    }}
                  >
                    ストーリー
                  </button>
                </div>
                {activeHowtoTab === 'glossary' ? (
                  <div className="howto-content">
                    <div className="howto-entry-list">
                      {glossaryEntries.map((entry) => {
                        const isOpen = openedHowtoEntry === entry.id;
                        return (
                          <button
                            key={entry.id}
                            type="button"
                            className={`howto-entry-btn ${isOpen ? 'howto-entry-btn--open' : ''}`}
                            onClick={() => setOpenedHowtoEntry((prev) => (prev === entry.id ? null : entry.id))}
                          >
                            <span className="howto-entry-title">{entry.term}</span>
                            <span className="howto-entry-arrow">{isOpen ? '−' : '+'}</span>
                            {isOpen && (
                              <span className="howto-entry-description">
                                {entry.description}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="howto-story-panel">
                    <div className="howto-story-job-list">
                      {storyJobs.map((job) => {
                        const selectedIndex = Math.min(
                          selectedStoryByJob[job.jobKey],
                          Math.max(0, job.episodes.length - 1),
                        );
                        const selectedEpisode = job.episodes[selectedIndex];
                        const canGoPrev = selectedIndex > 0;
                        const canGoNext = selectedIndex < job.episodes.length - 1;
                        const canPlay = hasSeenStory(selectedEpisode.id) && selectedEpisode.scenes.length > 0;
                        const isPlanned = selectedEpisode.planned === true;

                        return (
                          <div key={job.jobKey} className="howto-story-job-block">
                            <div className="howto-story-nav">
                              <button
                                type="button"
                                className="howto-story-arrow-btn"
                                onClick={() => moveStorySelection(job.jobKey, -1, job.episodes.length)}
                                disabled={!canGoPrev}
                                aria-label={`${job.jobName}の前チャプター`}
                              >
                                ←
                              </button>
                              <div className="howto-story-nav-center">
                                <p className="howto-story-swipe-hint">{job.jobName}チャプター</p>
                                <p className="howto-story-chapter-indicator">
                                  {selectedIndex + 1} / {job.episodes.length}
                                </p>
                              </div>
                              <button
                                type="button"
                                className="howto-story-arrow-btn"
                                onClick={() => moveStorySelection(job.jobKey, 1, job.episodes.length)}
                                disabled={!canGoNext}
                                aria-label={`${job.jobName}の次チャプター`}
                              >
                                →
                              </button>
                            </div>

                            <button
                              type="button"
                              className={`story-list-item ${!canPlay ? 'story-list-item--locked' : ''}`}
                              onClick={() => {
                                if (canPlay) {
                                  setPlayingStory(selectedEpisode.id);
                                }
                              }}
                              disabled={!canPlay}
                            >
                              <span className="story-list-icon">{job.icon}</span>
                              <div className="story-list-info">
                                <p className="story-list-name">{job.jobName}</p>
                                <p className="story-list-sub">
                                  {selectedEpisode.chapterName}
                                  {canPlay ? ' / タップで再生' : isPlanned ? ' / 実装予定' : ' / 未解放'}
                                </p>
                              </div>
                              {canPlay ? (
                                <span className="story-list-play">▶</span>
                              ) : (
                                <span className="story-list-lock">🔒</span>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="credits-content">
                <div className="credits-section">
                  <p className="credits-game-title">JOBLESS</p>
                  <p className="credits-version">ver 0.1.0</p>
                </div>

                <div className="credits-section">
                  <p className="credits-label">Development</p>
                  <p className="credits-value">Aramanchu</p>
                </div>

                <div className="credits-section">
                  <p className="credits-label">Tools</p>
                  <p className="credits-value">React / Vite / TypeScript</p>
                  <p className="credits-value">Cursor / Claude (Anthropic)</p>
                </div>

                <div className="credits-section">
                  <p className="credits-label">Art & Images</p>
                  <p className="credits-value">AI Generated (ChatGPT / DALL·E)</p>
                </div>

                <div className="credits-section">
                  <p className="credits-label">Fonts</p>
                  <p className="credits-value">Noto Serif JP / Orbitron</p>
                </div>

                <div className="credits-section">
                  <p className="credits-label">Inspired by</p>
                  <p className="credits-value">Slay the Spire</p>
                  <p className="credits-value-sub">by MegaCrit</p>
                </div>

                <div className="credits-section">
                  <p className="credits-label">Special Thanks</p>
                  <p className="credits-value">すべてのプレイヤーへ 🙏</p>
                </div>
              </div>
            )}
            <button type="button" className="home-modal-close" onClick={() => setModal(null)}>
              閉じる
            </button>
          </div>
        </div>
      )}
      {playingStory && (
        <StoryScreen scenes={getStoryScenes(playingStory)} onComplete={handleHowtoStoryComplete} showStartButton={false} />
      )}
    </main>
  );
};

export default HomeScreen;
