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
    records: '実績・記録',
    credits: 'クレジット',
  };

  return (
    <main className="home-screen">
      <div className="home-bg-effect" />

      <section className="home-title-block">
        <h1 className="home-title">リアルカードバトル</h1>
        <p className="home-subtitle">～職業カードで生き残れ～</p>
      </section>

      <div className="home-job-icons">
        <span className="home-job-icon icon--carpenter">🔨</span>
        <span className="home-job-icon icon--cook">🔪</span>
        <span className="home-job-icon icon--unemployed">✊</span>
      </div>

      <section className="home-buttons">
        <button type="button" className="btn-start" onClick={onStart}>
          ゲームスタート
        </button>

        <div className="btn-sub-grid">
          <button type="button" className="btn-sub" onClick={() => setModal('howto')}>
            遊び方
          </button>
          <button type="button" className="btn-sub" onClick={() => setModal('settings')}>
            設定
          </button>
          <button type="button" className="btn-sub" onClick={() => setModal('records')}>
            実績・記録
          </button>
          <button type="button" className="btn-sub" onClick={() => setModal('credits')}>
            クレジット
          </button>
        </div>
      </section>

      <p className="home-version">ver 0.1.0</p>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={(event) => event.stopPropagation()}>
            <h2>{modalTitles[modal]}</h2>
            <p>準備中です。</p>
            <button type="button" className="modal-close" onClick={() => setModal(null)}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default HomeScreen;
