import { createContext, useContext } from 'react';
import type { useAudio } from '../hooks/useAudio';

type AudioContextType = ReturnType<typeof useAudio>;

export const AudioCtx = createContext<AudioContextType | null>(null);

export const useAudioContext = (): AudioContextType => {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error('useAudioContext must be used within AudioCtx.Provider');
  return ctx;
};
