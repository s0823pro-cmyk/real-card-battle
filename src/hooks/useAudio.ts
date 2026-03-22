import { useCallback, useEffect, useRef } from 'react';

export type SeType = 'card' | 'attack' | 'damage' | 'block' | 'button';
export type BgmType = 'menu' | 'battle' | 'boss' | 'victory' | 'defeat' | 'none';

const SE_FILES: Record<SeType, string> = {
  card: '/sounds/se-card.mp3',
  attack: '/sounds/se-attack.mp3',
  damage: '/sounds/se-damage.mp3',
  block: '/sounds/se-block.mp3',
  button: '/sounds/se-button.mp3',
};

const BGM_FILES: Record<Exclude<BgmType, 'none'>, string> = {
  menu: '/sounds/bgm-menu.mp3',
  battle: '/sounds/bgm-battle.mp3',
  boss: '/sounds/bgm-boss.mp3',
  victory: '/sounds/bgm-victory.mp3',
  defeat: '/sounds/bgm-defeat.mp3',
};

const LOOP_BGM: BgmType[] = ['menu', 'battle', 'boss'];

function readStoredFloat(key: string, fallback: number): number {
  const v = parseFloat(localStorage.getItem(key) ?? String(fallback));
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
}

export const useAudio = () => {
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const currentBgmRef = useRef<BgmType>('none');

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
  const isBgmMuted = useCallback(() => bgmMutedRef.current, []);
  const isSeMuted = useCallback(() => seMutedRef.current, []);

  const playSe = useCallback((type: SeType) => {
    if (seMutedRef.current) return;
    const audio = new Audio(SE_FILES[type]);
    audio.volume = seVolumeRef.current;
    audio.play().catch(() => {});
  }, []);

  const stopBgm = useCallback(() => {
    if (bgmRef.current) {
      bgmRef.current.pause();
      bgmRef.current.currentTime = 0;
      bgmRef.current = null;
    }
    currentBgmRef.current = 'none';
  }, []);

  const playBgm = useCallback(
    (type: BgmType) => {
      if (type === currentBgmRef.current) return;
      stopBgm();
      if (type === 'none') return;

      const audio = new Audio(BGM_FILES[type]);
      audio.volume = bgmMutedRef.current ? 0 : bgmVolumeRef.current;
      audio.loop = LOOP_BGM.includes(type);
      audio.play().catch(() => {});
      bgmRef.current = audio;
      currentBgmRef.current = type;
    },
    [stopBgm],
  );

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
  };
};
