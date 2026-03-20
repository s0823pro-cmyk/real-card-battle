import { useState } from 'react';
import './TutorialOverlay.css';

const TUTORIAL_SEEN_KEY = 'real-card-battle:tutorial-seen';

export const hasTutorialSeen = (): boolean => {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
};

export const markTutorialSeen = (): void => {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
  } catch {
    /* localStorage 不可 */
  }
};

interface TutorialStep {
  title: string;
  description: string;
  highlight: 'hand' | 'timebar' | 'reserve' | 'status';
  arrowDirection: 'up' | 'down' | 'left' | 'right';
}

const STEPS: TutorialStep[] = [
  {
    title: 'カードの使い方',
    description: '手札のカードを敵キャラクターかタイムバーにドラッグして使おう！',
    highlight: 'hand',
    arrowDirection: 'up',
  },
  {
    title: 'タイムバー',
    description: '1ターンの持ち時間。カードを使うと時間を消費する。時間が足りなくなったらターン終了！',
    highlight: 'timebar',
    arrowDirection: 'down',
  },
  {
    title: '温存',
    description: 'カードを温存枠にドラッグすると次のターンに持ち越せる。ただし次のターンの時間が減るぞ！',
    highlight: 'reserve',
    arrowDirection: 'down',
  },
  {
    title: 'HP・ブロック',
    description: 'HPが0になると負け。ブロックがあるとその分ダメージを軽減できる。毎ターン開始時にリセットされるぞ！',
    highlight: 'status',
    arrowDirection: 'up',
  },
];

const HIGHLIGHT_POSITIONS: Record<
  TutorialStep['highlight'],
  { top?: string; bottom?: string; left?: string; right?: string; width: string; height: string }
> = {
  hand: { bottom: '28%', left: '0', width: '100%', height: '22%' },
  timebar: { bottom: '36%', left: '0', width: '100%', height: '8%' },
  reserve: { bottom: '44%', left: '0', width: '50%', height: '14%' },
  status: { bottom: '6%', left: '0', width: '100%', height: '16%' },
};

const CALLOUT_POSITIONS: Record<TutorialStep['highlight'], { top?: string; bottom?: string }> = {
  hand: { bottom: '52%' },
  timebar: { bottom: '46%' },
  reserve: { bottom: '60%' },
  status: { top: '30%' },
};

interface Props {
  onComplete: () => void;
}

export const TutorialOverlay = ({ onComplete }: Props) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      markTutorialSeen();
      onComplete();
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    markTutorialSeen();
    onComplete();
  };

  const highlightPos = HIGHLIGHT_POSITIONS[current.highlight];
  const calloutPos = CALLOUT_POSITIONS[current.highlight];

  return (
    <div className="tutorial-overlay">
      {/* 暗幕 */}
      <div className="tutorial-backdrop" />

      {/* ハイライト枠 */}
      <div className="tutorial-highlight" style={highlightPos} />

      {/* 矢印＋説明 */}
      <div className="tutorial-callout" style={calloutPos}>
        <div className={`tutorial-arrow tutorial-arrow--${current.arrowDirection}`} />
        <div className="tutorial-box">
          <p className="tutorial-step-count">
            {step + 1} / {STEPS.length}
          </p>
          <h3 className="tutorial-title">{current.title}</h3>
          <p className="tutorial-description">{current.description}</p>
          <div className="tutorial-buttons">
            <button type="button" className="tutorial-btn-skip" onClick={handleSkip}>
              スキップ
            </button>
            <button type="button" className="tutorial-btn-next" onClick={handleNext}>
              {isLast ? '始める！' : '次へ →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
