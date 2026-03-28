import { useCallback, useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * public/sounds 以下のファイルを、現在のページ（document.baseURI）基準で絶対 URL にする。
 * `import.meta.env.BASE_URL` だけだと Capacitor / 一部 WebView で意図とずれることがある。
 */
function publicSoundUrl(filename: string): string {
  const path = `sounds/${filename}`;
  if (typeof document !== 'undefined' && document.baseURI) {
    try {
      return new URL(path, document.baseURI).href;
    } catch {
      /* fall through */
    }
  }
  const base = import.meta.env.BASE_URL;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${path}`;
}

const SE_CARD_SRC = publicSoundUrl('se-card.mp3');
const SE_RESERVE_SRC = publicSoundUrl('se-reserve.mp3');

export type SeType =
  | 'card'
  | 'attack'
  | 'damage'
  | 'block'
  | 'button'
  | 'reserve'
  | 'shop_sell'
  | 'shop_buy'
  | 'upgrade'
  /** HP 回復・メンタル回復など */
  | 'heal'
  /** 敵のデバフ・メンタル攻撃（文句を言う等） */
  | 'enemy_debuff';
export type BgmType =
  | 'menu'
  | 'battle'
  | 'boss'
  | 'victory'
  | 'defeat'
  | 'area1'
  | 'area2'
  | 'area3'
  | 'story_area1'
  | 'story_area2'
  | 'story_area3'
  | 'none';

const SE_FILES: Record<SeType, string> = {
  card: SE_CARD_SRC,
  attack: publicSoundUrl('se-attack.mp3'),
  damage: publicSoundUrl('se-damage.mp3'),
  block: publicSoundUrl('se-block.mp3'),
  button: publicSoundUrl('se-button.mp3'),
  reserve: SE_RESERVE_SRC,
  shop_sell: publicSoundUrl('se-shop-sell.mp3'),
  shop_buy: publicSoundUrl('se-shop-buy.mp3'),
  upgrade: publicSoundUrl('se-upgrade.mp3'),
  heal: publicSoundUrl('se-heal.mp3'),
  enemy_debuff: publicSoundUrl('se-enemy-debuff.mp3'),
};

const BGM_FILES: Record<Exclude<BgmType, 'none'>, string> = {
  menu: publicSoundUrl('bgm-menu.mp3'),
  battle: publicSoundUrl('bgm-battle.mp3'),
  boss: publicSoundUrl('bgm-boss.mp3'),
  victory: publicSoundUrl('bgm-victory.mp3'),
  defeat: publicSoundUrl('bgm-defeat.mp3'),
  area1: publicSoundUrl('bgm-area1.mp3'),
  area2: publicSoundUrl('bgm-area2.mp3'),
  area3: publicSoundUrl('bgm-area3.mp3'),
  story_area1: publicSoundUrl('bgm-story-area1.mp3'),
  story_area2: publicSoundUrl('bgm-story-area2.mp3'),
  story_area3: publicSoundUrl('bgm-story-area3.mp3'),
};

const LOOP_BGM: BgmType[] = ['menu', 'battle', 'boss', 'area1', 'area2', 'area3'];

/** ブラウザにデコードを先読みさせる（初回再生の遅延を減らす） */
export function preloadAudio(src: string): void {
  const a = new Audio(src);
  a.preload = 'auto';
  a.load();
}

const ALL_PRELOAD_SRC = [...new Set([...Object.values(SE_FILES), ...Object.values(BGM_FILES)])];

function readStoredFloat(key: string, fallback: number): number {
  const v = parseFloat(localStorage.getItem(key) ?? String(fallback));
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
}

/** フック外（useRunProgress 等）から SE を鳴らす。mute / volume は localStorage の現在値を参照 */
export function playSeByType(type: SeType): void {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('seMuted') === 'true') return;
  const vol = readStoredFloat('seVolume', 0.6);
  const audio = new Audio(SE_FILES[type]);
  audio.volume = vol;
  void audio.play().catch(() => {});
}

export const useAudio = () => {
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const currentBgmRef = useRef<BgmType>('none');
  /** OS バックグラウンド等で一時停止したときの復帰用（stopBgm とは独立） */
  const bgmSuspendedRef = useRef(false);
  const bgmSnapBeforeSuspendRef = useRef<BgmType>('none');

  const bgmVolumeRef = useRef<number>(readStoredFloat('bgmVolume', 0.4));
  const seVolumeRef = useRef<number>(readStoredFloat('seVolume', 0.6));
  const bgmMutedRef = useRef<boolean>(localStorage.getItem('bgmMuted') === 'true');
  const seMutedRef = useRef<boolean>(localStorage.getItem('seMuted') === 'true');

  const setBgmVolume = useCallback((vol: number) => {
    const clamped = Math.min(1, Math.max(0, vol));
    bgmVolumeRef.current = clamped;
    localStorage.setItem('bgmVolume', String(clamped));
    if (bgmRef.current) {
      bgmRef.current.volume = bgmMutedRef.current ? 0 : clamped;
    }
  }, []);

  const setSeVolume = useCallback((vol: number) => {
    const clamped = Math.min(1, Math.max(0, vol));
    seVolumeRef.current = clamped;
    localStorage.setItem('seVolume', String(clamped));
  }, []);

  const toggleBgmMute = useCallback((): boolean => {
    bgmMutedRef.current = !bgmMutedRef.current;
    localStorage.setItem('bgmMuted', String(bgmMutedRef.current));
    if (bgmRef.current) {
      bgmRef.current.volume = bgmMutedRef.current ? 0 : bgmVolumeRef.current;
    }
    return bgmMutedRef.current;
  }, []);

  const toggleSeMute = useCallback((): boolean => {
    seMutedRef.current = !seMutedRef.current;
    localStorage.setItem('seMuted', String(seMutedRef.current));
    return seMutedRef.current;
  }, []);

  const getBgmVolume = useCallback(() => bgmVolumeRef.current, []);
  const getSeVolume = useCallback(() => seVolumeRef.current, []);
  const getCurrentBgm = useCallback(() => currentBgmRef.current, []);
  const isBgmMuted = useCallback(() => bgmMutedRef.current, []);
  const isSeMuted = useCallback(() => seMutedRef.current, []);

  const playSe = useCallback((type: SeType) => {
    if (seMutedRef.current) return;
    const tryPlay = (src: string) => {
      const audio = new Audio(src);
      audio.volume = seVolumeRef.current;
      audio.addEventListener(
        'ended',
        () => {
          audio.pause();
          audio.currentTime = 0;
        },
        { once: true },
      );
      return audio.play();
    };
    void tryPlay(SE_FILES[type]).catch(() => {});
  }, []);

  const stopBgmPlaybackOnly = useCallback(() => {
    if (bgmRef.current) {
      bgmRef.current.pause();
      bgmRef.current.currentTime = 0;
      bgmRef.current = null;
    }
    currentBgmRef.current = 'none';
  }, []);

  const stopBgm = useCallback(() => {
    bgmSuspendedRef.current = false;
    bgmSnapBeforeSuspendRef.current = 'none';
    stopBgmPlaybackOnly();
  }, [stopBgmPlaybackOnly]);

  const playBgm = useCallback(
    (type: BgmType) => {
      if (type === currentBgmRef.current) return;
      stopBgm();
      if (type === 'none') return;

      const audio = new Audio(BGM_FILES[type]);
      audio.volume = bgmMutedRef.current ? 0 : bgmVolumeRef.current;
      audio.loop = LOOP_BGM.includes(type);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          const retryOnInteraction = () => {
            void audio.play().catch(() => {});
            document.removeEventListener('touchstart', retryOnInteraction);
          };
          document.addEventListener('touchstart', retryOnInteraction, { once: true });
        });
      }
      bgmRef.current = audio;
      currentBgmRef.current = type;
    },
    [stopBgm],
  );

  useEffect(() => {
    ALL_PRELOAD_SRC.forEach(preloadAudio);
  }, []);

  useEffect(() => {
    const suspendForBackground = () => {
      if (bgmSuspendedRef.current) return;
      const cur = currentBgmRef.current;
      if (cur === 'none') return;
      bgmSnapBeforeSuspendRef.current = cur;
      bgmSuspendedRef.current = true;
      stopBgmPlaybackOnly();
    };

    const resumeAfterBackground = () => {
      if (!bgmSuspendedRef.current) return;
      bgmSuspendedRef.current = false;
      const snap = bgmSnapBeforeSuspendRef.current;
      bgmSnapBeforeSuspendRef.current = 'none';
      if (snap !== 'none') {
        playBgm(snap);
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        suspendForBackground();
      } else {
        resumeAfterBackground();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    let removeAppListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          suspendForBackground();
        } else {
          resumeAfterBackground();
        }
      }).then((handle) => {
        removeAppListener = () => {
          void handle.remove();
        };
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      removeAppListener?.();
    };
  }, [playBgm, stopBgmPlaybackOnly]);

  useEffect(() => {
    return () => {
      stopBgm();
    };
  }, [stopBgm]);

  return {
    playSe,
    playBgm,
    stopBgm,
    setBgmVolume,
    setSeVolume,
    toggleBgmMute,
    toggleSeMute,
    getBgmVolume,
    getSeVolume,
    isBgmMuted,
    isSeMuted,
    getCurrentBgm,
  };
};
