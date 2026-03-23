import type { CSSProperties } from 'react';
import { FLOW_BG_HOTEL } from '../../data/flowBackgrounds';

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
      ? '🎒 アイテムを入れ替える（ランダム1個）'
      : '🎁 アイテムをもらう（ランダム1個）';

  const mainStyle = {
    '--flow-bg-image': `url(${FLOW_BG_HOTEL})`,
  } as CSSProperties;

  return (
    <main className="flow-screen flow-screen--with-bg" style={mainStyle}>
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
