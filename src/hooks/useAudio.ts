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

export const useAudio = () => {
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const currentBgmRef = useRef<BgmType>('none');
  const mutedRef = useRef(false);

  const playSe = useCallback((type: SeType) => {
    if (mutedRef.current) return;
    const audio = new Audio(SE_FILES[type]);
    audio.volume = 0.6;
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
      if (type === 'none' || mutedRef.current) return;

      const audio = new Audio(BGM_FILES[type]);
      audio.volume = type === 'battle' || type === 'boss' ? 0.4 : 0.5;
      audio.loop = LOOP_BGM.includes(type);
      audio.play().catch(() => {});
      bgmRef.current = audio;
      currentBgmRef.current = type;
    },
    [stopBgm],
  );

  const toggleMute = useCallback((): boolean => {
    mutedRef.current = !mutedRef.current;
    if (mutedRef.current) {
      if (bgmRef.current) bgmRef.current.pause();
    } else {
      if (bgmRef.current) bgmRef.current.play().catch(() => {});
    }
    return mutedRef.current;
  }, []);

  const isMuted = useCallback(() => mutedRef.current, []);

  useEffect(() => {
    return () => {
      stopBgm();
    };
  }, [stopBgm]);

  return { playSe, playBgm, stopBgm, toggleMute, isMuted };
};
