interface Props {
  onHeal: () => void;
  onUpgrade: () => void;
  onMeditate: () => void;
  onGetItem: () => void;
  canReceiveItem: boolean;
  itemReceivedThisVisit: boolean;
  isItemInventoryFull: boolean;
}

const RestScreen = ({
  onHeal,
  onUpgrade,
  onMeditate,
  onGetItem,
  canReceiveItem,
  itemReceivedThisVisit,
  isItemInventoryFull,
}: Props) => {
  const itemButtonLabel = itemReceivedThisVisit
    ? '🎁 アイテム受け取り済み（この訪問）'
    : isItemInventoryFull
      ? '🎒 アイテム枠がいっぱい'
      : '🎁 アイテムをもらう（ランダム1個）';

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
          <button type="button" className="flow-btn" onClick={onGetItem} disabled={!canReceiveItem}>
            {itemButtonLabel}
          </button>
        </div>
      </section>
    </main>
  );
};

export default RestScreen;
