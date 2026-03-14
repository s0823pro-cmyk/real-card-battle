interface Props {
  onHeal: () => void;
  onUpgrade: () => void;
  onMeditate: () => void;
}

const RestScreen = ({ onHeal, onUpgrade, onMeditate }: Props) => {
  return (
    <main className="flow-screen">
      <section className="flow-card">
        <h2>🏨 ホテル</h2>
        <div className="flow-list">
          <button type="button" className="flow-btn" onClick={onHeal}>
            🛏️ 休む（HP 30%回復）
          </button>
          <button type="button" className="flow-btn" onClick={onUpgrade}>
            🔨 鍛錬（カード1枚強化）
          </button>
          <button type="button" className="flow-btn" onClick={onMeditate}>
            🧘 瞑想（メンタル+2）
          </button>
        </div>
      </section>
    </main>
  );
};

export default RestScreen;
