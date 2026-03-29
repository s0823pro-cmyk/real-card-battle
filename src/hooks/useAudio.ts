import { useCallback, useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

let sharedAudioContext: AudioContext | null = null;
const decodedBuffers = new Map<string, AudioBuffer>();

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioContextClass =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    sharedAudioContext = new AudioContextClass();
  }
  return sharedAudioContext;
}

export async function unlockAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
}

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

type SeType =
  | 'card'
  | 'attack'
  | 'damage'
  | 'block'
  /** ブロックで攻撃を完全に防いだとき（専用ファイルが無ければ block と同音源） */
  | 'shield'
  | 'button'
  | 'reserve'
  | 'shop_sell'
  | 'shop_buy'
  | 'upgrade'
  /** HP 回復・メンタル回復など */
  | 'heal'
  /** 敵のデバフ・メンタル攻撃（文句を言う等） */
  | 'enemy_debuff'
  /** ゴールド減少（盗み・購入・ペナルティ等） */
  | 'gold_lost'
  /** マップで1マス進んだとき */
  | 'map_move';
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
  shield: publicSoundUrl('se-shield.mp3'),
  button: publicSoundUrl('se-button.mp3'),
  reserve: SE_RESERVE_SRC,
  shop_sell: publicSoundUrl('se-shop-sell.mp3'),
  shop_buy: publicSoundUrl('se-shop-buy.mp3'),
  upgrade: publicSoundUrl('se-upgrade.mp3'),
  heal: publicSoundUrl('se-heal.mp3'),
  enemy_debuff: publicSoundUrl('se-enemy-debuff.mp3'),
  gold_lost: publicSoundUrl('se-gold-lost.mp3'),
  map_move: publicSoundUrl('se-map-move.mp3'),
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

const BGM_SRC_SET = new Set<string>(Object.values(BGM_FILES));

function isBgmSrc(src: string): boolean {
  return BGM_SRC_SET.has(src);
}

const LOOP_BGM: BgmType[] = ['menu', 'battle', 'boss', 'area1', 'area2', 'area3'];

/** SE は AudioContext でデコード、BGM は fetch のみ（HTMLAudio 再生は従来どおり・キャッシュ温め） */
async function preloadAudio(src: string): Promise<void> {
  if (isBgmSrc(src)) {
    try {
      await fetch(src);
    } catch {
      const a = new Audio(src);
      a.preload = 'auto';
      a.load();
    }
    return;
  }
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      const a = new Audio(src);
      a.preload = 'auto';
      a.load();
      return;
    }
    if (decodedBuffers.has(src)) return;
    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();
    const copy = arrayBuffer.slice(0);
    const audioBuffer = await ctx.decodeAudioData(copy);
    decodedBuffers.set(src, audioBuffer);
  } catch {
    const a = new Audio(src);
    a.preload = 'auto';
    a.load();
  }
}

const ALL_PRELOAD_SRC = [...new Set([...Object.values(SE_FILES), ...Object.values(BGM_FILES)])];

function readStoredFloat(key: string, fallback: number): number {
  const v = parseFloat(localStorage.getItem(key) ?? String(fallback));
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
}

function playSeFromSrc(src: string, volume: number): void {
  const fallback = () => {
    const audio = new Audio(src);
    audio.volume = volume;
    void audio.play().catch(() => {});
  };

  const ctx = getAudioContext();
  const buffer = decodedBuffers.get(src);
  if (!ctx || !buffer) {
    fallback();
    return;
  }

  const run = () => {
    try {
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      gainNode.gain.value = volume;
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
    } catch {
      fallback();
    }
  };

  if (ctx.state === 'running') {
    run();
  } else {
    void ctx.resume().then(() => {
      if (ctx.state === 'running') {
        run();
      } else {
        fallback();
      }
    });
  }
}

/** フック外（useRunProgress 等）から SE を鳴らす。mute / volume は localStorage の現在値を参照 */
export function playSeByType(type: SeType): void {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('seMuted') === 'true') return;
  const vol = readStoredFloat('seVolume', 0.6);
  playSeFromSrc(SE_FILES[type], vol);
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
    playSeFromSrc(SE_FILES[type], seVolumeRef.current);
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
    void Promise.all(ALL_PRELOAD_SRC.map((src) => preloadAudio(src)));
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
