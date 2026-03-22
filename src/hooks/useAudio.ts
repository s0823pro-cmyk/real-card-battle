import { useCallback, useEffect, useRef } from 'react';

export type SeType =
  | 'cardPlay'
  | 'attack'
  | 'damage'
  | 'block'
  | 'heal'
  | 'buttonClick'
  | 'levelUp'
  | 'enemyDeath'
  | 'victory'
  | 'defeat';

export type BgmType = 'menu' | 'battle' | 'none';

export const useAudio = () => {
  const ctxRef = useRef<AudioContext | null>(null);
  const bgmNodeRef = useRef<{ osc: OscillatorNode[]; gain: GainNode } | null>(null);
  const bgmIntervalRef = useRef<number[]>([]);
  const currentBgmRef = useRef<BgmType>('none');
  const mutedRef = useRef(false);

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playSe = useCallback(
    (type: SeType) => {
      if (mutedRef.current) return;
      const ctx = getCtx();
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      const now = ctx.currentTime;

      switch (type) {
        case 'cardPlay': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }
        case 'attack': {
          const bufferSize = Math.floor(ctx.sampleRate * 0.15);
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
          }
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 200;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.8, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          source.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          source.start(now);
          break;
        }
        case 'damage': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }
        case 'block': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.setValueAtTime(1200, now + 0.02);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }
        case 'heal': {
          [523, 659, 784].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(masterGain);
            osc.type = 'sine';
            osc.frequency.value = freq;
            const t = now + i * 0.08;
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            osc.start(t);
            osc.stop(t + 0.3);
          });
          break;
        }
        case 'buttonClick': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }
        case 'levelUp': {
          [523, 659, 784, 1047].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(masterGain);
            osc.type = 'square';
            osc.frequency.value = freq;
            const t = now + i * 0.1;
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            osc.start(t);
            osc.stop(t + 0.25);
          });
          break;
        }
        case 'enemyDeath': {
          const bufferSize = Math.floor(ctx.sampleRate * 0.4);
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
          }
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 400;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(1.0, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          source.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          source.start(now);
          break;
        }
        case 'victory': {
          const notes = [523, 659, 784, 659, 1047];
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(masterGain);
            osc.type = 'square';
            osc.frequency.value = freq;
            const t = now + i * 0.15;
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            osc.start(t);
            osc.stop(t + 0.3);
          });
          break;
        }
        case 'defeat': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 1.2);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
          osc.start(now);
          osc.stop(now + 1.2);
          break;
        }
      }
    },
    [getCtx],
  );

  const stopBgm = useCallback(() => {
    bgmIntervalRef.current.forEach((id) => window.clearInterval(id));
    bgmIntervalRef.current = [];

    if (bgmNodeRef.current && ctxRef.current) {
      const t = ctxRef.current.currentTime;
      try {
        bgmNodeRef.current.gain.gain.setValueAtTime(
          bgmNodeRef.current.gain.gain.value,
          t,
        );
        bgmNodeRef.current.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      } catch {
        // ignore
      }
      const oscs = bgmNodeRef.current.osc;
      window.setTimeout(() => {
        oscs.forEach((o) => {
          try {
            o.stop();
          } catch {
            // already stopped
          }
        });
      }, 600);
      bgmNodeRef.current = null;
    }
    currentBgmRef.current = 'none';
  }, []);

  const playBgm = useCallback(
    (type: BgmType) => {
      if (type === currentBgmRef.current) return;
      stopBgm();
      if (type === 'none' || mutedRef.current) return;

      const ctx = getCtx();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.08, ctx.currentTime);
      masterGain.connect(ctx.destination);
      currentBgmRef.current = type;

      if (type === 'menu') {
        const notes = [261, 329, 392, 329];
        const oscs: OscillatorNode[] = [];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const noteGain = ctx.createGain();
          noteGain.gain.value = 0;
          osc.connect(noteGain);
          noteGain.connect(masterGain);
          osc.start();
          oscs.push(osc);

          const intervalId = window.setInterval(() => {
            if (!ctxRef.current || mutedRef.current) return;
            const t = ctx.currentTime;
            noteGain.gain.cancelScheduledValues(t);
            noteGain.gain.setValueAtTime(0, t + i * 0.3);
            noteGain.gain.linearRampToValueAtTime(0.6, t + i * 0.3 + 0.05);
            noteGain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.3 + 0.8);
          }, notes.length * 300);
          bgmIntervalRef.current.push(intervalId);
        });
        bgmNodeRef.current = { osc: oscs, gain: masterGain };
      } else if (type === 'battle') {
        const oscs: OscillatorNode[] = [];

        const bassOsc = ctx.createOscillator();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.value = 80;
        const bassGain = ctx.createGain();
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowpass';
        bassFilter.frequency.value = 300;
        bassGain.gain.value = 0;
        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(masterGain);
        bassOsc.start();
        oscs.push(bassOsc);

        const bassPattern = [1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
        let step = 0;
        const bassIntervalId = window.setInterval(() => {
          if (!ctxRef.current || mutedRef.current) return;
          const t = ctx.currentTime;
          if (bassPattern[step % bassPattern.length]) {
            bassGain.gain.cancelScheduledValues(t);
            bassGain.gain.setValueAtTime(0.8, t);
            bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          }
          step++;
        }, 200);
        bgmIntervalRef.current.push(bassIntervalId);

        bgmNodeRef.current = { osc: oscs, gain: masterGain };
      }
    },
    [getCtx, stopBgm],
  );

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    if (mutedRef.current) {
      stopBgm();
    }
    return mutedRef.current;
  }, [stopBgm]);

  const isMuted = useCallback(() => mutedRef.current, []);

  useEffect(() => {
    return () => {
      stopBgm();
      ctxRef.current?.close();
    };
  }, [stopBgm]);

  return { playSe, playBgm, stopBgm, toggleMute, isMuted };
};
