import { Capacitor } from '@capacitor/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  COOK_STORY,
  COOK_E1_STORY,
  COOK_E2_STORY,
  COOK_E3_STORY,
} from '../../data/stories/cookStory';
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
  COOK_ACHIEVEMENTS_RESET_V1_KEY,
  clearAchievements,
  getCumulativeAchievementProgressSuffix,
  getUnlockedAchievementIds,
  resetCookAchievements,
  unlockAllAchievements,
} from '../../utils/achievementSystem';
import { getAdsRemoved, PENDING_DEFEAT_INTERSTITIAL_KEY } from '../../utils/adsRemoved';
import { DEBUG_ENEMY_HP1_KEY, getDebugEnemyHp1, setDebugEnemyHp1 } from '../../utils/debugEnemyHp1';
import { unlockJob } from '../../utils/jobUnlockSystem';
import { resetTutorial } from '../../utils/tutorialState';
import { IAP_PRODUCTS, purchaseProduct, restorePurchases } from '../../utils/iapService';
import { getAdminSummary, getMyStats, verifyCode } from '../../utils/statsApi';
import type { MyStatsResponse } from '../../utils/statsApi';
import type { Card, JobId } from '../../types/game';
import {
  getStoredRankingNickname,
  nicknameCharLength,
  postRankingNickname,
  RANKING_DEVICE_ID_KEY,
  RANKING_NICKNAME_KEY,
} from '../../utils/rankingClient';
import { useLanguage } from '../../contexts/LanguageContext';
import type { MessageKey } from '../../i18n';
import {
  achievementDescKey,
  achievementNameKey,
  cardNameKey,
  enemyNameKey,
  translatedCardName,
} from '../../i18n/entityKeys';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import { getCardById, getDisplayJobIdForCard } from '../../utils/achievementRewardLookup';
import CardComponent from '../Hand/CardComponent';
import { AchievementRewardModal } from '../AchievementRewardModal/AchievementRewardModal';
import { GlossaryModal } from '../GlossaryModal/GlossaryModal';

interface HomeScreenProps {
  onStart: () => void;
  onOpenZukan: () => void;
  onOpenRanking: () => void;
  onContinue?: (saved: GameProgress) => void;
  savedProgress?: GameProgress | null;
  onDevNavigate?: (destination: DevDestination) => void;
  /** 開発のみ: 拡張カードを各2枚デッキに追加 */
  onDevAddExpansionCards?: () => void;
}

type ModalType = 'howto' | 'credits' | null;
type HowtoTab = 'glossary' | 'story';
type StoryJobKey = 'carpenter' | 'cook' | 'unemployed';

/** 実績一覧の職業タブ（「全て」＋職業・共通） */
type AchievementJobTab = 'all' | JobId | 'common';

const achievementRewardModalJobId = (a: Achievement | null): JobId => {
  const j = a?.jobId;
  if (j === 'cook' || j === 'unemployed' || j === 'carpenter') return j;
  return 'carpenter';
};

type AdminSummaryPayload = {
  total_players: number;
  total_plays: number;
  total_victories: number;
  total_defeats: number;
  job_stats: Array<{ job_id: string; play_count: number; win_count: number; defeat_count: number }>;
  top_cards: Array<{ card_id: string; total_use_count: number }>;
  top_enemies: Array<{ enemy_id: string; total_kill_count: number }>;
  avg_gold_per_play: number;
  avg_play_time_seconds?: number;
  area_stats?: Array<{
    area: number;
    total_reached: number;
    total_cleared: number;
    clear_rate: number;
  }>;
  top_combos?: Array<{ combo_key: string; use_count: number }>;
};

const MY_STATS_CARD_PREVIEW_WIDTH = 72;

const myStatsCardPreviewNoop = () => {};

const getMyStatsCardBaseEffectiveValues = (card: Card): EffectiveCardValues => ({
  damage: card.damage ?? null,
  block: card.block ?? null,
  heal:
    (card.effects ?? []).filter((effect) => effect.type === 'heal').reduce((sum, effect) => sum + effect.value, 0) ||
    null,
  effectiveTimeCost: card.timeCost,
  isTimeBuffed: false,
  isTimeDebuffed: false,
  isDamageBuffed: false,
  isDamageDebuffed: false,
  isBlockBuffed: false,
  isBlockDebuffed: false,
  isHealBuffed: false,
  isHealDebuffed: false,
  isAttackDamageWeakDebuffed: false,
  isBoosted: false,
  isDamageBoosted: false,
  isBlockBoosted: false,
});

function isAdminSummary(s: unknown): s is AdminSummaryPayload {
  if (typeof s !== 'object' || s === null) return false;
  const o = s as Record<string, unknown>;
  return (
    typeof o.total_players === 'number' &&
    typeof o.total_plays === 'number' &&
    Array.isArray(o.job_stats) &&
    Array.isArray(o.top_cards) &&
    Array.isArray(o.top_enemies)
  );
}

/** `enemy_claimer_0` → `claimer`（表示用） */
function enemyRowTemplateId(enemyId: string): string {
  const m = enemyId.match(/^enemy_(.+)_\d+$/);
  return m ? m[1] : enemyId;
}

function adminComboLabel(
  comboKey: string,
  t: (key: MessageKey | string, vars?: Record<string, string | number>, fallback?: string) => string,
): string {
  const parts = comboKey.split('|');
  if (parts.length !== 2) return comboKey;
  const [a, b] = parts;
  return `${t(cardNameKey(a), {}, a)} + ${t(cardNameKey(b), {}, b)}`;
}
type StoryEpisodeId =
  | 'carpenter_opening'
  | 'carpenter_e1'
  | 'carpenter_e2'
  | 'carpenter_e3'
  | 'cook_opening'
  | 'cook_e1'
  | 'cook_e2'
  | 'cook_e3'
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
  onOpenRanking,
  onContinue,
  savedProgress,
  onDevNavigate,
  onDevAddExpansionCards,
}: HomeScreenProps) => {
  const { t, locale, switchLocale, isLocaleLoading } = useLanguage();
  const [modal, setModal] = useState<ModalType>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorialResetModal, setShowTutorialResetModal] = useState(false);
  const [showHomeGlossary, setShowHomeGlossary] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [rankingNicknameModalOpen, setRankingNicknameModalOpen] = useState(false);
  const [rankingNicknameDraft, setRankingNicknameDraft] = useState('');
  const [rankingNicknameBusy, setRankingNicknameBusy] = useState(false);
  const [rankingNicknameErr, setRankingNicknameErr] = useState<string | null>(null);
  const [achievementRefreshKey, setAchievementRefreshKey] = useState(0);
  const [achievementJobTab, setAchievementJobTab] = useState<AchievementJobTab>('all');
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

  const modalTitles = useMemo(
    () =>
      ({
        howto: t('home.modal.howto'),
        credits: t('home.modal.credits'),
      }) as Record<Exclude<ModalType, null>, string>,
    [t],
  );

  const unlockedIds = useMemo(() => getUnlockedAchievementIds(), [achievementRefreshKey]);

  useEffect(() => {
    try {
      if (localStorage.getItem(COOK_ACHIEVEMENTS_RESET_V1_KEY)) return;
      resetCookAchievements();
      localStorage.setItem(COOK_ACHIEVEMENTS_RESET_V1_KEY, '1');
      setAchievementRefreshKey((k) => k + 1);
    } catch {
      /* localStorage 不可 */
    }
  }, []);

  const filteredAchievements = useMemo(() => {
    if (achievementJobTab === 'all') return ACHIEVEMENTS;
    return ACHIEVEMENTS.filter((a) => a.jobId === achievementJobTab);
  }, [achievementJobTab]);
  type HowtoStoryEpisode = {
    id: StoryEpisodeId;
    chapterKey: MessageKey;
    scenes: StoryScene[];
    planned?: boolean;
  };
  const storyJobs = useMemo(
    () =>
      [
        {
          jobKey: 'carpenter' as const,
          jobNameKey: 'job.carpenter.name' as const,
          icon: '🔨',
          episodes: [
            { id: 'carpenter_opening', chapterKey: 'home.story.prologue', scenes: CARPENTER_STORY, planned: false },
            { id: 'carpenter_e1', chapterKey: 'home.story.chapter1', scenes: CARPENTER_E1_STORY, planned: false },
            { id: 'carpenter_e2', chapterKey: 'home.story.chapter2', scenes: CARPENTER_E2_STORY, planned: false },
            { id: 'carpenter_e3', chapterKey: 'home.story.ending', scenes: CARPENTER_E3_STORY, planned: false },
          ] satisfies HowtoStoryEpisode[],
        },
        {
          jobKey: 'cook' as const,
          jobNameKey: 'job.cook.name' as const,
          icon: '🔪',
          episodes: [
            { id: 'cook_opening', chapterKey: 'home.story.prologue', scenes: COOK_STORY, planned: false },
            { id: 'cook_e1', chapterKey: 'home.story.chapter1', scenes: COOK_E1_STORY, planned: false },
            { id: 'cook_e2', chapterKey: 'home.story.chapter2', scenes: COOK_E2_STORY, planned: false },
            { id: 'cook_e3', chapterKey: 'home.story.ending', scenes: COOK_E3_STORY, planned: false },
          ] satisfies HowtoStoryEpisode[],
        },
        {
          jobKey: 'unemployed' as const,
          jobNameKey: 'job.unemployed.name' as const,
          icon: '✊',
          episodes: [
            {
              id: 'unemployed_planned',
              chapterKey: 'home.story.planned',
              scenes: [],
              planned: true,
            },
          ] satisfies HowtoStoryEpisode[],
        },
      ],
    [],
  );
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
        return [...foundEpisode.scenes];
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
    toggleBgmMute,
    toggleSeMute,
    isBgmMuted,
    isSeMuted,
  } = useAudioContext();

  const [bgmMuted, setBgmMuted] = useState(() => isBgmMuted());
  const [seMuted, setSeMuted] = useState(() => isSeMuted());
  const [openSettingsSection, setOpenSettingsSection] = useState<string | null>(null);
  const [isAdFree, setIsAdFree] = useState(() => getAdsRemoved());
  const [iapBusy, setIapBusy] = useState(false);
  const [debugEnemyHp1, setDebugEnemyHp1Local] = useState(() => getDebugEnemyHp1());
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const [adminSummary, setAdminSummary] = useState<AdminSummaryPayload | null>(null);
  const [giftToast, setGiftToast] = useState<string | null>(null);
  const giftToastTimerRef = useRef<number | null>(null);
  const [myStatsLoading, setMyStatsLoading] = useState(false);
  const [myStatsData, setMyStatsData] = useState<MyStatsResponse | null>(null);
  const [myStatsError, setMyStatsError] = useState(false);

  const toggleSettingsSection = (section: string) => {
    setOpenSettingsSection((prev) => (prev === section ? null : section));
  };

  useEffect(() => {
    const onAdsRemoved = () => setIsAdFree(getAdsRemoved());
    window.addEventListener('ads-removed-changed', onAdsRemoved);
    return () => window.removeEventListener('ads-removed-changed', onAdsRemoved);
  }, []);

  useEffect(() => {
    return () => {
      if (giftToastTimerRef.current != null) window.clearTimeout(giftToastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (openSettingsSection !== 'mystats') return;
    let cancelled = false;
    setMyStatsLoading(true);
    setMyStatsError(false);
    void getMyStats().then((data) => {
      if (cancelled) return;
      setMyStatsLoading(false);
      if (data === null) {
        setMyStatsError(true);
        setMyStatsData(null);
      } else {
        setMyStatsData(data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [openSettingsSection]);

  useEffect(() => {
    playBgm('menu');
  }, [playBgm]);

  const handleIapPurchase = async (productId: string) => {
    if (!Capacitor.isNativePlatform()) {
      window.alert(t('home.settings.iapNativeOnly'));
      return;
    }
    setIapBusy(true);
    try {
      await purchaseProduct(productId);
      setIsAdFree(getAdsRemoved());
    } catch {
      window.alert(t('home.settings.iapPurchaseFail'));
    } finally {
      setIapBusy(false);
    }
  };

  const handleIapRestore = async () => {
    if (!Capacitor.isNativePlatform()) {
      window.alert(t('home.settings.iapRestoreNativeOnly'));
      return;
    }
    setIapBusy(true);
    try {
      await restorePurchases();
      setIsAdFree(getAdsRemoved());
    } catch {
      window.alert(t('home.settings.iapRestoreFail'));
    } finally {
      setIapBusy(false);
    }
  };

  const jobLabel = (jobId: string) => {
    if (jobId === 'carpenter') return t('job.carpenter.name');
    if (jobId === 'cook') return t('job.cook.name');
    if (jobId === 'unemployed') return t('job.unemployed.name');
    return jobId;
  };

  const handleVerifyCode = async () => {
    const trimmed = codeInput.trim();
    setCodeError(null);
    if (!trimmed) {
      setCodeError(t('home.settings.codeInvalid'));
      return;
    }
    setCodeBusy(true);
    try {
      const v = await verifyCode(trimmed);
      if (!v.ok || (v.type !== 'admin' && v.type !== 'gift')) {
        setCodeError(t('home.settings.codeInvalid'));
        return;
      }
      if (v.type === 'gift') {
        setGiftToast(t('home.settings.giftReceived'));
        if (giftToastTimerRef.current != null) window.clearTimeout(giftToastTimerRef.current);
        giftToastTimerRef.current = window.setTimeout(() => {
          setGiftToast(null);
          giftToastTimerRef.current = null;
        }, 3200);
        return;
      }
      const raw = await getAdminSummary(trimmed);
      if (raw === null || (typeof raw === 'object' && raw !== null && 'error' in raw)) {
        setCodeError(t('home.settings.summaryLoadError'));
        return;
      }
      if (!isAdminSummary(raw)) {
        setCodeError(t('home.settings.summaryLoadError'));
        return;
      }
      setAdminSummary(raw);
    } finally {
      setCodeBusy(false);
    }
  };

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
    playBgm('menu');
  };

  const handleOpenRanking = useCallback(() => {
    if (getStoredRankingNickname()) {
      onOpenRanking();
      return;
    }
    setRankingNicknameDraft('');
    setRankingNicknameErr(null);
    setRankingNicknameModalOpen(true);
  }, [onOpenRanking]);

  const handleRankingNicknameSubmit = useCallback(async () => {
    const len = nicknameCharLength(rankingNicknameDraft);
    if (len < 2 || len > 12) {
      setRankingNicknameErr(t('home.ranking.errLength'));
      return;
    }
    setRankingNicknameBusy(true);
    setRankingNicknameErr(null);
    const res = await postRankingNickname(rankingNicknameDraft);
    setRankingNicknameBusy(false);
    if (!res.ok) {
      const err = res.error;
      if (err === 'network') setRankingNicknameErr(t('home.ranking.errNetwork'));
      else if (err === 'nickname_not_allowed') setRankingNicknameErr(t('home.ranking.errNickname'));
      else if (err === 'nickname_length') setRankingNicknameErr(t('home.ranking.errLength'));
      else setRankingNicknameErr(t('home.ranking.errRegister'));
      return;
    }
    setRankingNicknameModalOpen(false);
    onOpenRanking();
  }, [onOpenRanking, rankingNicknameDraft, t]);

  const homeButtons = useMemo(
    () =>
      [
        { id: 'start', label: t('home.gameStart'), className: 'btn-home-start', onClick: onStart },
        { id: 'zukan', label: t('home.zukan'), className: 'btn-home-zukan', onClick: onOpenZukan },
        { id: 'records', label: t('home.records'), className: 'btn-home-records', onClick: () => setShowRecords(true) },
        { id: 'ranking', label: `🏆 ${t('home.ranking')}`, className: 'btn-home-ranking', onClick: handleOpenRanking },
        { id: 'settings', label: t('home.settings'), className: 'btn-home-settings', onClick: () => setShowSettings(true) },
        { id: 'credits', label: t('home.credits'), className: 'btn-home-credits', onClick: () => setModal('credits') },
      ] as const,
    [t, onStart, onOpenZukan, handleOpenRanking],
  );
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
    savedProgress.currentScreen !== 'ranking' &&
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
          <span>{t('common.volumeSettings')}</span>
          <span className="settings-accordion-arrow">
            {openSettingsSection === 'sound' ? '▲' : '▼'}
          </span>
        </button>
        {openSettingsSection === 'sound' && (
          <div className="settings-accordion-body">
            <div className="settings-item settings-item--audio">
              <div className="settings-item-header">
                <span className="settings-item-label">{t('common.bgm')}</span>
                <button
                  type="button"
                  className={`btn-mute ${bgmMuted ? 'btn-mute--off' : 'btn-mute--on'}`}
                  onClick={() => {
                    const next = toggleBgmMute();
                    setBgmMuted(next);
                  }}
                >
                  {bgmMuted ? t('common.audioOff') : t('common.audioOn')}
                </button>
              </div>
            </div>
            <div className="settings-item settings-item--audio">
              <div className="settings-item-header">
                <span className="settings-item-label">{t('common.se')}</span>
                <button
                  type="button"
                  className={`btn-mute ${seMuted ? 'btn-mute--off' : 'btn-mute--on'}`}
                  onClick={() => {
                    const next = toggleSeMute();
                    setSeMuted(next);
                  }}
                >
                  {seMuted ? t('common.audioOff') : t('common.audioOn')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="settings-accordion">
        <button
          type="button"
          className={`settings-accordion-header ${openSettingsSection === 'mystats' ? 'is-open' : ''}`}
          onClick={() => toggleSettingsSection('mystats')}
        >
          <span>{t('home.settings.myStatsSection')}</span>
          <span className="settings-accordion-arrow">
            {openSettingsSection === 'mystats' ? '▲' : '▼'}
          </span>
        </button>
        {openSettingsSection === 'mystats' && (
          <div className="settings-accordion-body">
            {myStatsLoading ? (
              <div className="settings-mystats-spinner-wrap" role="status" aria-live="polite">
                <span className="settings-mystats-spinner" aria-hidden />
                <span className="settings-mystats-spinner-label">{t('home.settings.myStatsLoading')}</span>
              </div>
            ) : myStatsError ? (
              <p className="settings-mystats-msg settings-mystats-msg--error">{t('home.settings.myStatsLoadError')}</p>
            ) : myStatsData && myStatsData.total_plays === 0 ? (
              <p className="settings-mystats-msg">{t('home.settings.myStatsEmpty')}</p>
            ) : myStatsData ? (
              <div className="settings-mystats-body">
                <dl className="settings-admin-dl settings-mystats-dl">
                  <div>
                    <dt>{t('home.settings.myStatsTotalPlays')}</dt>
                    <dd>{myStatsData.total_plays}</dd>
                  </div>
                  <div>
                    <dt>{t('home.settings.myStatsTotalWins')}</dt>
                    <dd>{myStatsData.total_wins}</dd>
                  </div>
                  <div>
                    <dt>{t('home.settings.myStatsTotalDefeats')}</dt>
                    <dd>{myStatsData.total_defeats}</dd>
                  </div>
                  <div>
                    <dt>{t('home.settings.myStatsWinRate')}</dt>
                    <dd>
                      {myStatsData.total_plays > 0
                        ? t('home.settings.myStatsWinRateValue', {
                            pct: Math.round((100 * myStatsData.total_wins) / myStatsData.total_plays),
                          })
                        : t('home.settings.myStatsNoValue')}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('home.settings.myStatsTotalGold')}</dt>
                    <dd>{myStatsData.total_gold}</dd>
                  </div>
                  <div>
                    <dt>{t('home.settings.myStatsAvgPlayTime')}</dt>
                    <dd>
                      {t('home.settings.adminAvgPlayTimeFmt', {
                        m: Math.floor(myStatsData.avg_play_time_seconds / 60),
                        sec: myStatsData.avg_play_time_seconds % 60,
                      })}
                    </dd>
                  </div>
                </dl>
                <h4 className="settings-admin-subheading">{t('home.settings.myStatsJobPlays')}</h4>
                <ul className="settings-admin-list">
                  {myStatsData.job_stats.map((row) => (
                    <li key={row.job_id}>
                      <span className="settings-admin-list-label">{jobLabel(row.job_id)}</span>
                      <span className="settings-admin-list-value">
                        {t('home.settings.jobShortPlays')} {row.play_count} · {t('home.settings.jobShortWins')}{' '}
                        {row.win_count}
                      </span>
                    </li>
                  ))}
                </ul>
                <h4 className="settings-admin-subheading">{t('home.settings.myStatsTopCards')}</h4>
                {myStatsData.top_cards.length === 0 ? (
                  <p className="settings-mystats-subempty">{t('home.settings.myStatsNoValue')}</p>
                ) : (
                  <div className="settings-mystats-top-cards-row" role="list" aria-label={t('home.settings.myStatsTopCards')}>
                    {myStatsData.top_cards.slice(0, 3).map((row, idx) => {
                      const card = getCardById(row.card_id);
                      const previewH = Math.floor(MY_STATS_CARD_PREVIEW_WIDTH * 1.6);
                      return (
                        <div
                          key={`${row.card_id}-${idx}`}
                          className="settings-mystats-top-card-slot"
                          role="listitem"
                        >
                          {card ? (
                            <>
                              <div
                                className="settings-mystats-top-card-wrap"
                                style={
                                  {
                                    '--hand-card-width': `${MY_STATS_CARD_PREVIEW_WIDTH}px`,
                                    '--hand-card-height': `${previewH}px`,
                                  } as CSSProperties
                                }
                              >
                                <CardComponent
                                  card={card}
                                  jobId={getDisplayJobIdForCard(card)}
                                  selected={false}
                                  disabled={false}
                                  locked={false}
                                  isSelling={false}
                                  isReturning={false}
                                  isGhost={false}
                                  isDragging={false}
                                  isDragUnavailable={false}
                                  zukanMode="list"
                                  effectiveValues={getMyStatsCardBaseEffectiveValues(card)}
                                  onSelect={myStatsCardPreviewNoop}
                                  onPointerDown={myStatsCardPreviewNoop}
                                  onPointerMove={myStatsCardPreviewNoop}
                                  onPointerUp={myStatsCardPreviewNoop}
                                  onPointerCancel={myStatsCardPreviewNoop}
                                  onMouseEnter={myStatsCardPreviewNoop}
                                  onMouseLeave={myStatsCardPreviewNoop}
                                />
                              </div>
                              <div className="settings-mystats-top-card-meta">
                                <span className="settings-mystats-top-card-name">{translatedCardName(card, t)}</span>
                                <span className="settings-mystats-top-card-count">{row.use_count}</span>
                              </div>
                            </>
                          ) : (
                            <div className="settings-mystats-top-card-fallback">
                              <span className="settings-mystats-top-card-fallback-id">{row.card_id}</span>
                              <span className="settings-mystats-top-card-count">{row.use_count}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <h4 className="settings-admin-subheading">{t('home.settings.myStatsTopEnemies')}</h4>
                {myStatsData.top_enemies.length === 0 ? (
                  <p className="settings-mystats-subempty">{t('home.settings.myStatsNoValue')}</p>
                ) : (
                  <ol className="settings-admin-ol">
                    {myStatsData.top_enemies.map((row, idx) => {
                      const tid = enemyRowTemplateId(row.enemy_id);
                      return (
                        <li key={`${row.enemy_id}-${idx}`}>
                          <span className="settings-admin-list-label">
                            {t(enemyNameKey(tid), {}, tid)}
                          </span>
                          <span className="settings-admin-list-num">{row.kill_count}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="settings-accordion">
        <button
          type="button"
          className={`settings-accordion-header ${openSettingsSection === 'game' ? 'is-open' : ''}`}
          onClick={() => toggleSettingsSection('game')}
        >
          <span>{t('home.settings.dataSection')}</span>
          <span className="settings-accordion-arrow">
            {openSettingsSection === 'game' ? '▲' : '▼'}
          </span>
        </button>
        {openSettingsSection === 'game' && (
          <div className="settings-accordion-body">
            <button type="button" className="settings-btn-block" onClick={() => setShowHomeGlossary(true)}>
              <span className="settings-btn-block-title">{t('home.settings.glossaryTitle')}</span>
              <span className="settings-btn-block-desc">{t('home.settings.glossaryDesc')}</span>
            </button>
            <div className="settings-item settings-item--audio settings-language-block">
              <span className="settings-language-label">{t('common.language')}</span>
              {isLocaleLoading && <p className="settings-locale-loading">{t('common.localeLoading')}</p>}
              <div className="settings-language-row" role="group" aria-label={t('common.language')}>
                {(
                  [
                    { code: 'ja' as const, labelKey: 'lang.ja' as const },
                    { code: 'en' as const, labelKey: 'lang.en' as const },
                    { code: 'ko' as const, labelKey: 'lang.ko' as const },
                  ] as const
                ).map(({ code, labelKey }) => (
                  <button
                    key={code}
                    type="button"
                    disabled={isLocaleLoading}
                    className={`settings-lang-btn ${locale === code ? 'settings-lang-btn--active' : ''}`}
                    onClick={() => void switchLocale(code)}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-item settings-item--row">
              <div className="settings-item-info">
                <p className="settings-item-title">{t('home.settings.tutorialResetTitle')}</p>
                <p className="settings-item-desc">{t('home.settings.tutorialResetDesc')}</p>
              </div>
              <button
                type="button"
                className="settings-btn-secondary"
                onClick={() => {
                  resetTutorial();
                  setShowTutorialResetModal(true);
                }}
              >
                {t('home.settings.tutorialResetBtn')}
              </button>
            </div>
            <div className="settings-item settings-item--row">
              <div className="settings-item-info">
                <p className="settings-item-title">{t('home.settings.dataResetTitle')}</p>
                <p className="settings-item-desc">{t('home.settings.dataResetDesc')}</p>
              </div>
              <button
                type="button"
                className="settings-btn-danger"
                onClick={() => {
                  const firstOk = window.confirm(t('home.settings.dataResetConfirm1'));
                  if (!firstOk) return;
                  const secondOk = window.confirm(t('home.settings.dataResetConfirm2'));
                  if (!secondOk) return;
                  /** 課金・広告削除（real-card-battle:ads-removed）は意図的に除外 */
                  const keysToDelete = [
                    PENDING_DEFEAT_INTERSTITIAL_KEY,
                    DEBUG_ENEMY_HP1_KEY,
                    RANKING_DEVICE_ID_KEY,
                    RANKING_NICKNAME_KEY,
                    'real-card-battle:save-data',
                    'jobless_battle_save',
                    'jobless_enemy_records',
                    'jobless_enemy_defeat_counts',
                    'real-card-battle:unlocked-card-names',
                    'real-card-battle:unlocked-jobs',
                    'real-card-battle:job-unlock-seen-cook',
                    'real-card-battle:tutorial-seen',
                    'story_seen_carpenter',
                    'story_seen_carpenter_e1',
                    'story_seen_carpenter_e2',
                    'story_seen_carpenter_e3',
                  ];
                  keysToDelete.forEach((key) => localStorage.removeItem(key));
                  clearAchievements();
                  window.alert(t('home.settings.dataResetDone'));
                  window.location.reload();
                }}
              >
                {t('home.settings.dataResetBtn')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="settings-accordion">
        <button
          type="button"
          className={`settings-accordion-header ${openSettingsSection === 'code' ? 'is-open' : ''}`}
          onClick={() => toggleSettingsSection('code')}
        >
          <span>{t('home.settings.codeSection')}</span>
          <span className="settings-accordion-arrow">
            {openSettingsSection === 'code' ? '▲' : '▼'}
          </span>
        </button>
        {openSettingsSection === 'code' && (
          <div className="settings-accordion-body">
            <div className="settings-code-block">
              <input
                type="text"
                className="settings-code-input"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder={t('home.settings.codePlaceholder')}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="settings-code-verify-btn"
                disabled={codeBusy}
                onClick={() => void handleVerifyCode()}
              >
                {codeBusy ? t('home.settings.codeBusy') : t('home.settings.codeVerify')}
              </button>
            </div>
            {codeError ? <p className="settings-code-error">{codeError}</p> : null}
          </div>
        )}
      </div>

      <div className="settings-accordion">
        <button
          type="button"
          className={`settings-accordion-header ${openSettingsSection === 'purchase' ? 'is-open' : ''}`}
          onClick={() => toggleSettingsSection('purchase')}
        >
          <span>{t('home.settings.purchaseSection')}</span>
          <span className="settings-accordion-arrow">
            {openSettingsSection === 'purchase' ? '▲' : '▼'}
          </span>
        </button>
        {openSettingsSection === 'purchase' && (
          <div className="settings-accordion-body">
            {!isAdFree && (
              <div className="settings-item settings-item--row">
                <div className="settings-item-info">
                  <p className="settings-item-title">{t('home.settings.removeAdsTitle')}</p>
                  <p className="settings-item-desc">{t('home.settings.removeAdsDesc')}</p>
                </div>
                <button
                  type="button"
                  className="settings-btn-purchase"
                  disabled={iapBusy}
                  onClick={() => void handleIapPurchase(IAP_PRODUCTS.REMOVE_ADS)}
                >
                  ¥300
                </button>
              </div>
            )}
            <div className="settings-item settings-item--row">
              <div className="settings-item-info">
                <p className="settings-item-title">{t('home.settings.supporterTitle')}</p>
                <p className="settings-item-desc">{t('home.settings.supporterDesc')}</p>
              </div>
              <button
                type="button"
                className="settings-btn-purchase"
                disabled={iapBusy}
                onClick={() => void handleIapPurchase(IAP_PRODUCTS.SUPPORTER_PACK)}
              >
                ¥500
              </button>
            </div>
            {!isAdFree && (
              <div className="settings-item settings-item--row">
                <div className="settings-item-info">
                  <p className="settings-item-title">{t('home.settings.bundleTitle')}</p>
                  <p className="settings-item-desc">{t('home.settings.bundleDesc')}</p>
                </div>
                <button
                  type="button"
                  className="settings-btn-purchase"
                  disabled={iapBusy}
                  onClick={() => void handleIapPurchase(IAP_PRODUCTS.BUNDLE_PACK)}
                >
                  ¥700
                </button>
              </div>
            )}
            <div className="settings-item settings-item--row">
              <div className="settings-item-info">
                <p className="settings-item-title">{t('home.settings.restoreTitle')}</p>
                <p className="settings-item-desc">{t('home.settings.restoreDesc')}</p>
              </div>
              <button
                type="button"
                className="settings-btn-restore"
                disabled={iapBusy}
                onClick={() => void handleIapRestore()}
              >
                {t('home.settings.restoreBtn')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="settings-divider" />

      <div className="settings-block-actions">
        <button
          type="button"
          className="settings-btn-block"
          onClick={() => window.open('https://s0823pro-cmyk.github.io/real-card-battle/terms.html', '_self')}
        >
          <span className="settings-btn-block-title">{t('home.settings.terms')}</span>
        </button>
        <button
          type="button"
          className="settings-btn-block"
          onClick={() => window.open('https://s0823pro-cmyk.github.io/real-card-battle/privacy.html', '_self')}
        >
          <span className="settings-btn-block-title">{t('home.settings.privacy')}</span>
        </button>
        <button
          type="button"
          className="settings-btn-block"
          onClick={() =>
            window.open(
              'https://docs.google.com/forms/d/e/1FAIpQLSeRZ04gxmRYKpRsG43pYuoIsvrd-MAJrll7vknlL7c4v67cJg/viewform',
              '_self',
            )
          }
        >
          <span className="settings-btn-block-title">{t('home.settings.feedback')}</span>
        </button>
      </div>

      <div className="settings-legal">
        <p className="settings-legal-text">{t('home.settings.adRemoveLegal')}</p>
      </div>

      {import.meta.env.DEV && (
        <div className="dev-tools">
          <p className="dev-tools-title">{t('settings.devTools')}</p>
          <div className="dev-tools-grid">
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('battle_normal')}>
              {t('settings.dev.normalBattle')}
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('battle_elite')}>
              {t('settings.dev.eliteBattle')}
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('battle_boss_1')}>
              {t('settings.dev.boss1')}
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('battle_boss_2')}>
              {t('settings.dev.boss2')}
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('battle_boss_3')}>
              {t('settings.dev.boss3')}
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('shop')}>
              {t('settings.dev.pawnshop')}
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('shrine')}>
              {t('settings.dev.shrine')}
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('hotel')}>
              {t('settings.dev.hotel')}
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('event')}>
              {t('settings.dev.event')}
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('card_reward')}>
              {t('settings.dev.cardReward')}
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('boss_reward')}>
              {t('settings.dev.bossReward')}
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('story')}>
              {t('settings.dev.story')}
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('battle_all_cards')}>
              {t('settings.dev.allCardsBattle')}
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('battle_cook_all_x2')}>
              {t('settings.dev.cookAllX2')}
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevNavigate?.('battle_expansion_x2')}>
              {t('settings.dev.expansionBattle')}
            </button>
            <button type="button" className="btn-dev" onClick={() => onDevAddExpansionCards?.()}>
              {t('home.settings.devExpansionAdd')}
            </button>
            <button
              type="button"
              className="btn-dev"
              onClick={() => {
                const next = !debugEnemyHp1;
                setDebugEnemyHp1(next);
                setDebugEnemyHp1Local(next);
              }}
            >
              {t('settings.dev.enemyHp1')} {debugEnemyHp1 ? 'ON' : 'OFF'}
            </button>
            <button type="button" className="btn-dev" onClick={() => unlockJob('cook')}>
              {t('settings.dev.unlockCook')}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (showSettings) {
    return (
      <>
        <main className="home-screen">
          <div className="home-screen-fullbleed-bg" style={backgroundStyle} aria-hidden />
          <Fireflies />
          <div className="records-page">
            <div className="records-page-header">
              <button
                type="button"
                className="records-back-btn"
                onClick={() => {
                  setShowHomeGlossary(false);
                  setShowSettings(false);
                }}
              >
                {t('common.back')}
              </button>
              <h2 className="records-page-title">{t('common.settings')}</h2>
            </div>
            <div className="records-page-content">{renderSettingsContent()}</div>
          </div>
        </main>
        {showHomeGlossary && <GlossaryModal onClose={() => setShowHomeGlossary(false)} />}
        {showTutorialResetModal && (
          <div
            className="home-modal-overlay home-modal-overlay--tutorial-reset"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-reset-done-title"
            onClick={() => setShowTutorialResetModal(false)}
          >
            <div className="home-modal-box" onClick={(e) => e.stopPropagation()}>
              <h2 id="tutorial-reset-done-title">{t('home.tutorialReset.title')}</h2>
              <p className="home-modal-tutorial-reset-msg">{t('home.tutorialReset.msg')}</p>
              <button
                type="button"
                className="home-modal-close"
                onClick={() => setShowTutorialResetModal(false)}
              >
                {t('common.ok')}
              </button>
            </div>
          </div>
        )}
        {giftToast ? <div className="settings-gift-toast" role="status">{giftToast}</div> : null}
        {adminSummary ? (
          <div
            className="settings-admin-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-settings-admin-summary-title"
            onClick={() => setAdminSummary(null)}
          >
            <div className="settings-admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="settings-admin-modal-header">
                <h3 id="home-settings-admin-summary-title" className="settings-admin-modal-title">
                  {t('home.settings.adminSummaryTitle')}
                </h3>
                <button
                  type="button"
                  className="settings-admin-modal-close"
                  onClick={() => setAdminSummary(null)}
                >
                  {t('common.close')}
                </button>
              </div>
              <div className="settings-admin-modal-body">
                <dl className="settings-admin-dl">
                  <div>
                    <dt>{t('home.settings.totalPlayers')}</dt>
                    <dd>{adminSummary.total_players}</dd>
                  </div>
                  <div>
                    <dt>{t('home.settings.totalPlays')}</dt>
                    <dd>{adminSummary.total_plays}</dd>
                  </div>
                  <div>
                    <dt>{t('home.settings.totalVictories')}</dt>
                    <dd>{adminSummary.total_victories}</dd>
                  </div>
                  <div>
                    <dt>{t('home.settings.totalDefeats')}</dt>
                    <dd>{adminSummary.total_defeats}</dd>
                  </div>
                  <div>
                    <dt>{t('home.settings.avgGoldPerPlay')}</dt>
                    <dd>{adminSummary.avg_gold_per_play.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt>{t('home.settings.adminAvgPlayTimeLabel')}</dt>
                    <dd>
                      {t('home.settings.adminAvgPlayTimeFmt', {
                        m: Math.floor((adminSummary.avg_play_time_seconds ?? 0) / 60),
                        sec: (adminSummary.avg_play_time_seconds ?? 0) % 60,
                      })}
                    </dd>
                  </div>
                </dl>
                <h4 className="settings-admin-subheading">{t('home.settings.adminAreaClearTitle')}</h4>
                <ul className="settings-admin-list">
                  {(adminSummary.area_stats ?? []).map((row) => (
                    <li key={row.area}>
                      <span className="settings-admin-list-label">
                        {t('home.settings.adminAreaLine', {
                          n: row.area,
                          reached: row.total_reached,
                          cleared: row.total_cleared,
                          pct: row.clear_rate,
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
                <h4 className="settings-admin-subheading">{t('home.settings.jobStatsTitle')}</h4>
                <ul className="settings-admin-list">
                  {adminSummary.job_stats.map((row) => (
                    <li key={row.job_id}>
                      <span className="settings-admin-list-label">{jobLabel(row.job_id)}</span>
                      <span className="settings-admin-list-value">
                        {t('home.settings.jobShortPlays')} {row.play_count} · {t('home.settings.jobShortWins')}{' '}
                        {row.win_count} · {t('home.settings.jobShortLosses')} {row.defeat_count}
                      </span>
                    </li>
                  ))}
                </ul>
                <h4 className="settings-admin-subheading">{t('home.settings.topCardsTitle')}</h4>
                <ol className="settings-admin-ol">
                  {adminSummary.top_cards.slice(0, 10).map((row, idx) => (
                    <li key={`${row.card_id}-${idx}`}>
                      <span className="settings-admin-list-label">
                        {t(cardNameKey(row.card_id), {}, row.card_id)}
                      </span>
                      <span className="settings-admin-list-num">{row.total_use_count}</span>
                    </li>
                  ))}
                </ol>
                <h4 className="settings-admin-subheading">{t('home.settings.topEnemiesTitle')}</h4>
                <ol className="settings-admin-ol">
                  {adminSummary.top_enemies.slice(0, 10).map((row, idx) => {
                    const tid = enemyRowTemplateId(row.enemy_id);
                    return (
                      <li key={`${row.enemy_id}-${idx}`}>
                        <span className="settings-admin-list-label">
                          {t(enemyNameKey(tid), {}, tid)}
                        </span>
                        <span className="settings-admin-list-num">{row.total_kill_count}</span>
                      </li>
                    );
                  })}
                </ol>
                <h4 className="settings-admin-subheading">{t('home.settings.adminComboPairsTitle')}</h4>
                <ol className="settings-admin-ol">
                  {(adminSummary.top_combos ?? []).slice(0, 10).map((row, idx) => (
                    <li key={`${row.combo_key}-${idx}`}>
                      <span className="settings-admin-list-label">{adminComboLabel(row.combo_key, t)}</span>
                      <span className="settings-admin-list-num">{row.use_count}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  if (showRecords) {
    return (
      <main className="home-screen">
        <div className="home-screen-fullbleed-bg" style={backgroundStyle} aria-hidden />
        <Fireflies />
        <div className="records-page">
          <div className="records-page-header">
            <button type="button" className="records-back-btn" onClick={() => setShowRecords(false)}>
              {t('common.back')}
            </button>
            <h2 className="records-page-title">{t('home.records.title')}</h2>
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
                  {t('home.records.devUnlockAll')}
                </button>
              </div>
            )}
            <div className="zukan-job-tabs records-page-achievement-job-tabs">
              {(
                [
                  { id: 'all' as const, label: t('home.records.tabAll') },
                  { id: 'carpenter' as const, label: t('home.records.tabCarpenter') },
                  { id: 'cook' as const, label: t('home.records.tabCook') },
                  { id: 'common' as const, label: t('home.records.tabCommon') },
                ] satisfies { id: AchievementJobTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`zukan-job-tab ${achievementJobTab === tab.id ? 'zukan-job-tab--active' : ''}`}
                  onClick={() => {
                    setAchievementJobTab(tab.id);
                    setSelectedAchievement(null);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="achievement-list">
              {filteredAchievements.map((a) => {
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
                      <p className="achievement-name">{t(achievementNameKey(a.id), undefined, a.name)}</p>
                      <p className="achievement-desc">
                        {t(achievementDescKey(a.id), undefined, a.description)}
                        {getCumulativeAchievementProgressSuffix(a.id) ?? ''}
                      </p>
                      <p className="achievement-tier">{t(`achievement.tier.${a.tier}` as MessageKey)}</p>
                      <p className="achievement-reward">
                        {isUnlocked
                          ? t('home.records.rewardKnown')
                          : t('home.records.rewardUnknown')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <AchievementRewardModal
            selected={selectedAchievement}
            onClose={() => setSelectedAchievement(null)}
            jobId={achievementRewardModalJobId(selectedAchievement)}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="home-screen">
      <div className="home-screen-fullbleed-bg" style={backgroundStyle} aria-hidden />
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
              <span className="btn-home-continue-label">{t('home.continue')}</span>
              <span className="btn-home-continue-sub">
                {t(`job.${savedProgress.jobId}.name` as MessageKey)} / {t('home.areaLine', { n: savedProgress.currentArea })}
              </span>
            </button>
          )}
          {homeButtons.map((button, index) => (
            <button
              key={button.id}
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

        <p className="home-version">ver 1.0.0</p>
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
                    {t('home.howto.glossaryTab')}
                  </button>
                  <button
                    type="button"
                    className={`howto-tab ${activeHowtoTab === 'story' ? 'howto-tab--active' : ''}`}
                    onClick={() => {
                      setActiveHowtoTab('story');
                      setOpenedHowtoEntry(null);
                    }}
                  >
                    {t('home.howto.storyTab')}
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
                                aria-label={t('home.story.ariaPrev', { job: t(job.jobNameKey) })}
                              >
                                ←
                              </button>
                              <div className="howto-story-nav-center">
                                <p className="howto-story-swipe-hint">
                                  {t('home.story.chapterHint', { job: t(job.jobNameKey) })}
                                </p>
                                <p className="howto-story-chapter-indicator">
                                  {selectedIndex + 1} / {job.episodes.length}
                                </p>
                              </div>
                              <button
                                type="button"
                                className="howto-story-arrow-btn"
                                onClick={() => moveStorySelection(job.jobKey, 1, job.episodes.length)}
                                disabled={!canGoNext}
                                aria-label={t('home.story.ariaNext', { job: t(job.jobNameKey) })}
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
                                <p className="story-list-name">{t(job.jobNameKey as MessageKey)}</p>
                                <p className="story-list-sub">
                                  {t(selectedEpisode.chapterKey as MessageKey)}
                                  {canPlay
                                    ? ` / ${t('home.story.tapToPlay')}`
                                    : isPlanned
                                      ? ` / ${t('home.story.planned')}`
                                      : ` / ${t('home.story.locked')}`}
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
                  <p className="credits-label">Development</p>
                  <p className="credits-value">Aramanchu</p>
                </div>

                <div className="credits-section">
                  <p className="credits-label">Tools</p>
                  <p className="credits-value">React / Vite / TypeScript</p>
                </div>

                <div className="credits-section">
                  <p className="credits-label">■ 使用ツール</p>
                  <p className="credits-value">開発支援 AI：Claude (Anthropic)</p>
                  <p className="credits-value">AI コーディング：Cursor</p>
                  <p className="credits-value">画像生成：Midjourney</p>
                  <p className="credits-value">BGM/SE 生成：Suno</p>
                </div>

                <div className="credits-section">
                  <p className="credits-label">■ 素材提供</p>
                  <p className="credits-value">SE：効果音ラボ (soundeffect-lab.info)</p>
                </div>

                <div className="credits-section">
                  <p className="credits-label">Art & Images</p>
                  <p className="credits-value">AI Generated (ChatGPT / DALL·E)</p>
                </div>

                <div className="credits-section">
                  <p className="credits-label">Fonts</p>
                  <p className="credits-value">Orbitron</p>
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
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
      {rankingNicknameModalOpen && (
        <div
          className="home-modal-overlay"
          onClick={() => {
            if (!rankingNicknameBusy) setRankingNicknameModalOpen(false);
          }}
        >
          <div className="home-modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>{t('home.ranking.modalTitle')}</h2>
            <p className="ranking-nickname-modal-desc">{t('home.ranking.modalDesc')}</p>
            <input
              type="text"
              className="ranking-nickname-modal-input"
              value={rankingNicknameDraft}
              onChange={(e) => setRankingNicknameDraft(e.target.value)}
              maxLength={24}
              autoComplete="username"
              placeholder={t('home.ranking.placeholder')}
              disabled={rankingNicknameBusy}
            />
            {rankingNicknameErr ? <p className="ranking-nickname-modal-error">{rankingNicknameErr}</p> : null}
            <p className="ranking-nickname-modal-notice" role="note">
              {t('home.ranking.notice')}
            </p>
            <div className="ranking-nickname-modal-actions">
              <button
                type="button"
                className="home-modal-close"
                disabled={rankingNicknameBusy}
                onClick={() => setRankingNicknameModalOpen(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="ranking-nickname-modal-submit"
                disabled={rankingNicknameBusy}
                onClick={() => void handleRankingNicknameSubmit()}
              >
                {rankingNicknameBusy ? t('home.ranking.submitting') : t('home.ranking.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
      {playingStory && (
        <StoryScreen
          scenes={getStoryScenes(playingStory)}
          onComplete={handleHowtoStoryComplete}
          showStartButton={false}
          storyBundleId={playingStory}
          jobId={playingStory.startsWith('cook') ? 'cook' : 'carpenter'}
          storyBgmArea={
            playingStory === 'carpenter_e1' || playingStory === 'cook_e1'
              ? 2
              : playingStory === 'carpenter_e2' || playingStory === 'cook_e2'
                ? 3
                : playingStory === 'carpenter_e3' || playingStory === 'cook_e3'
                  ? 3
                  : 1
          }
        />
      )}
    </main>
  );
};

export default HomeScreen;
