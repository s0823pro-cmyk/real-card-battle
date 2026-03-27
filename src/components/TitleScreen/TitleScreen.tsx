import { useEffect, useState } from 'react';
import { useAudioContext } from '../../contexts/AudioContext';
import './TitleScreen.css';

interface TitleScreenProps {
  onStart: () => void;
}

const TitleScreen = ({ onStart }: TitleScreenProps) => {
  const [showHowTo, setShowHowTo] = useState(false);
  const { playBgm } = useAudioContext();

  useEffect(() => {
    playBgm('none');
  }, [playBgm]);

  return (
    <main className="title-screen">
      <div className="title-bg-effect" />

      <div className="title-job-icons">
        <span className="title-job-icon job-icon--carpenter">🔨</span>
        <span className="title-job-icon job-icon--cook">🔪</span>
        <span className="title-job-icon job-icon--unemployed">✊</span>
      </div>

      <section className="title-text-block">
        <h1 className="title-main">リアルカードバトル</h1>
        <p className="title-sub">～職業カードで生き残れ～</p>
      </section>

      <div className="title-buttons">
        <button type="button" className="btn-start" onClick={onStart}>
          ゲームを始める
        </button>
        <button type="button" className="btn-secondary" onClick={() => setShowHowTo(true)}>
          遊び方
        </button>
      </div>

      <p className="title-version">ver 1.0.0</p>

      {showHowTo && (
        <div className="howto-overlay" onClick={() => setShowHowTo(false)}>
          <div className="howto-modal" onClick={(event) => event.stopPropagation()}>
            <h2>遊び方</h2>
            <p>準備中です。</p>
            <button type="button" onClick={() => setShowHowTo(false)}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default TitleScreen;
