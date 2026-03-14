import type { BoardTile } from '../../types/run';

interface Props {
  previews: Array<{ nextTileId: number; previewTiles: BoardTile[] }>;
  currentTileId: number;
  onSelect: (nextTileId: number) => void;
}

const BranchSelectModal = ({ previews, currentTileId, onSelect }: Props) => {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3>ルートを選んでください</h3>
        <div className="branch-grid">
          {previews.map((item) => (
            <article key={item.nextTileId} className="branch-option">
              <small>
                {currentTileId} → ルート{item.previewTiles[0]?.branch ?? '?'}
              </small>
              <h4>
                {item.previewTiles[0]?.icon} {item.previewTiles[0]?.name}
              </h4>
              <p>{item.previewTiles.map((tile) => tile.icon).join(' → ')}</p>
              <button type="button" onClick={() => onSelect(item.nextTileId)}>
                選択
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BranchSelectModal;
