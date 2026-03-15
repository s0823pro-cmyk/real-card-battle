import { useEffect, useMemo, useState } from 'react';

interface Props {
  rolling: boolean;
  value: number | null;
}

const ITEM_HEIGHT = 80;

const RouletteOverlay = ({ rolling, value }: Props) => {
  const result = value ?? 1;
  const [offsetY, setOffsetY] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isSettled, setIsSettled] = useState(false);

  const numbers = useMemo(() => {
    const loops = 5;
    const sequence: number[] = [];
    for (let i = 0; i < loops * 3; i += 1) {
      sequence.push((i % 3) + 1);
    }
    while (sequence[sequence.length - 1] !== result) {
      sequence.push((sequence.length % 3) + 1);
    }
    return sequence;
  }, [result]);

  useEffect(() => {
    if (rolling && value !== null) {
      let raf2: number | null = null;
      const raf1 = window.requestAnimationFrame(() => {
        setIsSettled(false);
        setIsSpinning(false);
        setOffsetY(0);
        raf2 = window.requestAnimationFrame(() => {
          setIsSpinning(true);
          setOffsetY(-(numbers.length - 1) * ITEM_HEIGHT);
        });
      });
      return () => {
        window.cancelAnimationFrame(raf1);
        if (raf2 !== null) window.cancelAnimationFrame(raf2);
      };
    }
    return undefined;
  }, [rolling, value, numbers.length]);

  useEffect(() => {
    if (!rolling && value !== null) {
      const raf = window.requestAnimationFrame(() => {
        setIsSpinning(false);
        setOffsetY(-(numbers.length - 1) * ITEM_HEIGHT);
        setIsSettled(true);
      });
      return () => window.cancelAnimationFrame(raf);
    }
    return undefined;
  }, [rolling, value, numbers.length]);

  if (!rolling && value === null) return null;

  return (
    <div
      className={`roulette-container ${!rolling && value !== null ? 'roulette-container--settled' : ''}`}
      role="dialog"
      aria-modal="true"
    >
      <div className={`roulette-window ${isSettled ? 'roulette-result-flash' : ''}`}>
        <div
          className={`roulette-strip ${isSpinning ? 'roulette-strip--spinning' : ''}`}
          style={{ transform: `translateY(${offsetY}px)` }}
        >
          {numbers.map((num, idx) => (
            <div key={`${num}_${idx}`} className="roulette-number">
              {num}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RouletteOverlay;
