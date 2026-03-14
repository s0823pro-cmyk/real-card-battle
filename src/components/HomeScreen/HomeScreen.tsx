import { useState } from 'react';
import './HomeScreen.css';

interface HomeScreenProps {
  onStart: () => void;
}

type ModalType = 'howto' | 'settings' | 'records' | 'credits' | null;

const HomeScreen = ({ onStart }: HomeScreenProps) => {
  const [modal, setModal] = useState<ModalType>(null);

  const modalTitles: Record<Exclude<ModalType, null>, string> = {
    howto: '遊び方',
    settings: '設定',
    records: '実績',
    credits: 'クレジット',
  };

  return (
    <main className="home-screen">
      <div className="home-bg" />

      <div className="home-title-block">
        <h1 className="home-title">リアルカードバトル</h1>
        <p className="home-subtitle">～職業カードで生き残れ～</p>
      </div>

      <div className="home-main-action">
        <button type="button" className="btn-start" onClick={onStart}>
          ゲームスタート
        </button>
      </div>

      <nav className="home-sub-nav">
        <button type="button" className="btn-sub-text" onClick={() => setModal('howto')}>
          遊び方
        </button>
        <span className="home-nav-divider">·</span>
        <button type="button" className="btn-sub-text" onClick={() => setModal('settings')}>
          設定
        </button>
        <span className="home-nav-divider">·</span>
        <button type="button" className="btn-sub-text" onClick={() => setModal('records')}>
          実績
        </button>
        <span className="home-nav-divider">·</span>
        <button type="button" className="btn-sub-text" onClick={() => setModal('credits')}>
          クレジット
        </button>
      </nav>

      <p className="home-version">ver 0.1.0</p>

      {modal && (
        <div className="home-modal-overlay" onClick={() => setModal(null)}>
          <div className="home-modal-box" onClick={(event) => event.stopPropagation()}>
            <h2>{modalTitles[modal]}</h2>
            <p>準備中です。</p>
            <button type="button" className="home-modal-close" onClick={() => setModal(null)}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default HomeScreen;
