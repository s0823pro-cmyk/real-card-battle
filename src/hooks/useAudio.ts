import { useCallback, useEffect, useRef } from 'react';

let sharedAudioContext: AudioContext | null = null;
/** SE（とアンロック用サイレント音）を destination の手前でまとめ、画面録画時のミキシングを安定させる */
let seMasterCompressor: DynamicsCompressorNode | null = null;
const decodedBuffers = new Map<string, AudioBuffer>();

function getSeDestinationCompressor(ctx: AudioContext): DynamicsCompressorNode {
  if (!seMasterCompressor || seMasterCompressor.context !== ctx) {
    seMasterCompressor = ctx.createDynamicsCompressor();
    seMasterCompressor.connect(ctx.destination);
  }
  return seMasterCompressor;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    seMasterCompressor = null;
    const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = window.AudioContext ?? w.webkitAudioContext;
    if (!AudioContextClass) return null;
    const opts: AudioContextOptions = { latencyHint: 'playback', sampleRate: 44100 };
    try {
      sharedAudioContext = new AudioContextClass(opts);
    } catch {
      try {
        sharedAudioContext = new AudioContextClass({ latencyHint: 'playback' });
      } catch {
        try {
          sharedAudioContext = new AudioContextClass();
        } catch {
          return null;
        }
      }
    }
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
  src.connect(getSeDestinationCompressor(ctx));
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
  | 'map_move'
  /** 火傷DoT */
  | 'burn'
  /** 毒DoT */
  | 'poison';
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
  | 'cook_area1'
  | 'cook_area2'
  | 'cook_area3'
  | 'cook_story_area1'
  | 'cook_story_area2'
  | 'cook_story_area3'
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
  burn: publicSoundUrl('se-burn.mp3'),
  poison: publicSoundUrl('se-poison.mp3'),
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
  cook_area1: publicSoundUrl('bgm-cook-area1.mp3'),
  cook_area2: publicSoundUrl('bgm-cook-area2.mp3'),
  cook_area3: publicSoundUrl('bgm-cook-area3.mp3'),
  cook_story_area1: publicSoundUrl('bgm-cook-story-area1.mp3'),
  cook_story_area2: publicSoundUrl('bgm-cook-story-area2.mp3'),
  cook_story_area3: publicSoundUrl('bgm-cook-story-area3.mp3'),
};

const BGM_SRC_SET = new Set<string>(Object.values(BGM_FILES));

function isBgmSrc(src: string): boolean {
  return BGM_SRC_SET.has(src);
}

const LOOP_BGM: BgmType[] = ['menu', 'battle', 'boss', 'area1', 'area2', 'area3', 'cook_area1', 'cook_area2', 'cook_area3'];

/** BGM はアプリ全体で 1 つの HTMLAudioElement を共有（二重再生防止） */
let bgmElement: HTMLAudioElement | null = null;
let currentBgmType: BgmType = 'none';
let bgmSuspended = false;
let bgmSnapBeforeSuspend: BgmType = 'none';

let lifecycleListenerRefCount = 0;
let lifecycleCleanup: (() => void) | null = null;

function stopBgmPlaybackOnlyModule(): void {
  if (bgmElement) {
    bgmElement.pause();
    bgmElement.currentTime = 0;
  }
  currentBgmType = 'none';
}

function stopBgmModule(): void {
  bgmSuspended = false;
  bgmSnapBeforeSuspend = 'none';
  stopBgmPlaybackOnlyModule();
}

function playBgmModule(type: BgmType, volume: number, muted: boolean): void {
  if (type === currentBgmType) return;
  stopBgmModule();
  if (type === 'none') return;

  if (!bgmElement) {
    bgmElement = new Audio();
  }
  bgmElement.src = BGM_FILES[type];
  bgmElement.loop = LOOP_BGM.includes(type);
  bgmElement.volume = muted ? 0 : volume;
  bgmElement.muted = muted; // iOS WebView 対策
  void bgmElement.load();
  const playPromise = bgmElement.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      const retryOnInteraction = () => {
        void bgmElement?.play().catch(() => {});
        document.removeEventListener('touchstart', retryOnInteraction);
      };
      document.addEventListener('touchstart', retryOnInteraction, { once: true });
    });
  }
  currentBgmType = type;
}

/**
 * ミュート解除後など、同一トラックでも確実に再ロードして再生する。
 * （playBgmModule は currentBgmType が同じだと何もしないため別経路）
 */
function forceRestartCurrentBgmModule(volume: number, muted: boolean): void {
  const typeToPlay = currentBgmType;
  if (typeToPlay === 'none') return;
  currentBgmType = 'none';
  if (bgmElement) {
    bgmElement.pause();
    bgmElement.currentTime = 0;
    try {
      bgmElement.removeAttribute('src');
      bgmElement.load();
    } catch {
      /* ignore */
    }
  }
  playBgmModule(typeToPlay, volume, muted);
}

function suspendForBackgroundModule(): void {
  if (bgmSuspended) return;
  const cur = currentBgmType;
  if (cur !== 'none') {
    bgmSnapBeforeSuspend = cur;
    bgmSuspended = true;
    stopBgmPlaybackOnlyModule();
  }
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'running') {
    void ctx.suspend();
  }
}

function resumeAfterBackgroundModule(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume();
  }
  if (!bgmSuspended) return;
  bgmSuspended = false;
  const snap = bgmSnapBeforeSuspend;
  bgmSnapBeforeSuspend = 'none';
  if (snap !== 'none') {
    const vol = readStoredFloat('bgmVolume', 0.4);
    const muted = typeof localStorage !== 'undefined' && localStorage.getItem('bgmMuted') === 'true';
    playBgmModule(snap, vol, muted);
  }
}

/** Capacitor `App` のフォアグラウンド／バックグラウンド（App.tsx の appStateChange と併用） */
export function applyAppStateToAudio(isActive: boolean): void {
  if (isActive) {
    resumeAfterBackgroundModule();
  } else {
    suspendForBackgroundModule();
  }
}

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

function clearSeDecodedBuffers(): void {
  for (const src of Object.values(SE_FILES)) {
    decodedBuffers.delete(src);
  }
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
      gainNode.connect(getSeDestinationCompressor(ctx));
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
  const bgmVolumeRef = useRef<number>(readStoredFloat('bgmVolume', 0.4));
  const seVolumeRef = useRef<number>(readStoredFloat('seVolume', 0.6));
  const bgmMutedRef = useRef<boolean>(localStorage.getItem('bgmMuted') === 'true');
  const seMutedRef = useRef<boolean>(localStorage.getItem('seMuted') === 'true');

  const setBgmVolume = useCallback((vol: number) => {
    const clamped = Math.min(1, Math.max(0, vol));
    bgmVolumeRef.current = clamped;
    localStorage.setItem('bgmVolume', String(clamped));
    if (bgmElement) {
      bgmElement.volume = bgmMutedRef.current ? 0 : clamped;
      bgmElement.muted = bgmMutedRef.current; // iOS WebView 対策
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
    if (bgmMutedRef.current) {
      if (bgmElement) {
        bgmElement.pause();
        bgmElement.volume = 0;
        bgmElement.muted = true;
      }
    } else {
      forceRestartCurrentBgmModule(bgmVolumeRef.current, false);
    }
    return bgmMutedRef.current;
  }, []);

  const toggleSeMute = useCallback((): boolean => {
    seMutedRef.current = !seMutedRef.current;
    localStorage.setItem('seMuted', String(seMutedRef.current));
    if (!seMutedRef.current) {
      clearSeDecodedBuffers();
      void unlockAudioContext();
    }
    return seMutedRef.current;
  }, []);

  const getBgmVolume = useCallback(() => bgmVolumeRef.current, []);
  const getSeVolume = useCallback(() => seVolumeRef.current, []);
  const getCurrentBgm = useCallback(() => currentBgmType, []);
  const isBgmMuted = useCallback(() => bgmMutedRef.current, []);
  const isSeMuted = useCallback(() => seMutedRef.current, []);

  const playSe = useCallback((type: SeType) => {
    if (seMutedRef.current) return;
    playSeFromSrc(SE_FILES[type], seVolumeRef.current);
  }, []);

  const stopBgm = useCallback(() => {
    stopBgmModule();
  }, []);

  const playBgm = useCallback((type: BgmType) => {
    playBgmModule(type, bgmVolumeRef.current, bgmMutedRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      for (const src of ALL_PRELOAD_SRC) {
        if (cancelled) break;
        await preloadAudio(src);
        // 各ファイル間に間を空けて CPU 負荷を分散（発熱対策）
        await new Promise((r) => setTimeout(r, 100));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    lifecycleListenerRefCount += 1;
    if (lifecycleListenerRefCount === 1) {
      const onVisibility = () => {
        if (document.hidden) {
          suspendForBackgroundModule();
        } else {
          resumeAfterBackgroundModule();
        }
      };
      document.addEventListener('visibilitychange', onVisibility);

      /** PiP 中は BGM のみ止める（SE は継続）。イベントは video からバブルする */
      const onEnterPip = () => {
        suspendForBackgroundModule();
      };
      const onLeavePip = () => {
        resumeAfterBackgroundModule();
      };
      document.addEventListener('enterpictureinpicture', onEnterPip);
      document.addEventListener('leavepictureinpicture', onLeavePip);

      lifecycleCleanup = () => {
        document.removeEventListener('visibilitychange', onVisibility);
        document.removeEventListener('enterpictureinpicture', onEnterPip);
        document.removeEventListener('leavepictureinpicture', onLeavePip);
      };
    }
    return () => {
      lifecycleListenerRefCount -= 1;
      if (lifecycleListenerRefCount === 0) {
        lifecycleCleanup?.();
        lifecycleCleanup = null;
      }
    };
  }, []);

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
