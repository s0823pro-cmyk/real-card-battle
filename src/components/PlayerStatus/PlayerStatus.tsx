import type { Card, PlayerState, ToolSlot } from '../../types/game';
import type { RunItem } from '../../types/run';
import type { HungryState } from '../../utils/hungrySystem';
import ToolSlots from './ToolSlots';
import Tooltip from '../Tooltip/Tooltip';
import './PlayerStatus.css';

interface Props {
  player: PlayerState;
  previewBlock?: number | null;
  toolSlots: ToolSlot[];
  activePowers: Card[];
  battleItems: RunItem[];
  canUseItems: boolean;
  onUseItem: (itemId: string) => void;
  onEndTurn: () => void;
  isTurnEnding: boolean;
  drawPileCount: number;
  discardPileCount: number;
  isPlayerHit: boolean;
  isPreparationActive?: boolean;
  hungryState?: HungryState;
  onOpenDrawPile?: () => void;
  onOpenDiscardPile?: () => void;
}

const PlayerStatus = ({
  player,
  previewBlock = null,
  toolSlots,
  activePowers,
  battleItems,
  canUseItems,
  onUseItem,
  onEndTurn,
  isTurnEnding,
  drawPileCount,
  discardPileCount,
  isPlayerHit,
  isPreparationActive = false,
  hungryState = 'normal',
  onOpenDrawPile,
  onOpenDiscardPile,
}: Props) => {
  const hpRatio = player.currentHp / Math.max(1, player.maxHp);
  const hpClass = hpRatio <= 0.3 ? 'hp-low' : hpRatio <= 0.7 ? 'hp-mid' : 'hp-high';
  const awakeThreshold = Math.floor(player.maxHp * 0.3);
  const remainingToAwake = Math.max(0, player.currentHp - awakeThreshold);
  const unemployedLabel =
    hungryState === 'awakened' ? '⚡ 覚醒' : `💢 ${remainingToAwake}`;
  const unemployedClass =
    hungryState === 'awakened'
      ? 'awakened-state'
      : hungryState === 'hungry'
        ? 'hungry-state'
        : 'normal-awake-state';
  const blockClass = player.block > 0 ? 'status-block--active' : 'status-block--zero';
  const itemSlots = (
    <div className="stat-items">
      {Array.from({ length: 3 }).map((_, idx) => {
        const item = battleItems[idx];
        return (
          <Tooltip
            key={`item-${idx}`}
            label={item?.name ?? 'アイテム'}
            description={item?.description ?? '戦闘で使えるアイテム'}
          >
            <button
              type="button"
              className={`item-slot ${item ? 'filled' : ''}`}
              disabled={!item || !canUseItems}
              onClick={() => {
                if (item && canUseItems) onUseItem(item.id);
              }}
            >
              {item ? (
                item.imageUrl ? (
                  <img className="item-slot-image" src={item.imageUrl} alt={item.name} />
                ) : (
                  <span className="item-emoji">{item.icon ?? '🧪'}</span>
                )
              ) : (
                ''
              )}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );

  return (
    <section className={`player-status ${isPlayerHit ? 'player-hit' : ''}`}>
      <div className="player-row player-row--top">
        <div className="player-main-stats">
          <div className="player-hp-row">
            <Tooltip tooltipKey="hp">
              <span className={`hp ${hpClass}`}>♥ {player.currentHp}/{player.maxHp}</span>
            </Tooltip>
          </div>
          <div className="player-info-row">
            <Tooltip tooltipKey="block">
              <span className={`block ${blockClass} ${previewBlock != null ? 'block--preview' : ''}`}>
                🛡{' '}
                {previewBlock != null ? (
                  <>
                    <span className="block-preview-current">{player.block}</span>
                    <span className="block-preview-arrow">→</span>
                    <span className="block-preview-next">{previewBlock}</span>
                  </>
                ) : (
                  player.block
                )}
              </span>
            </Tooltip>
            {player.jobId === 'carpenter' && (
              <Tooltip tooltipKey="scaffold">
                <span key={`scaffold-${player.scaffold}`} className="scaffold scaffold-bounce">
                  🏗️ {player.scaffold}
                </span>
              </Tooltip>
            )}
            {player.jobId === 'cook' && (
              <Tooltip tooltipKey="cooking">
                <span key={`cook-${player.cookingGauge}`} className="cooking-gauge scaffold-bounce">
                  🍳 {player.cookingGauge}
                </span>
              </Tooltip>
            )}
            {player.jobId === 'unemployed' && (
              <Tooltip tooltipKey="hungry">
                <span className={unemployedClass}>{unemployedLabel}</span>
              </Tooltip>
            )}
            {player.deathWishActive && (
              <Tooltip label="💀 デスウィッシュ" description="HP回復無効。全アタック+4ダメージ">
                <span className="status-death-wish">💀</span>
              </Tooltip>
            )}
            {player.ridgepoleActive && (
              <Tooltip label="🎌 棟上げ" description="足場5以上で毎ターン全敵10ダメージ">
                <span className="status-ridgepole">🎌</span>
              </Tooltip>
            )}
            {player.templeCarpenterActive && (
              <Tooltip label="🏯 宮大工の技" description="段取りボーナスが+50%に強化">
                <span className="status-temple">🏯</span>
              </Tooltip>
            )}
            {player.cliffEdgeActive && (
              <Tooltip label="⚡ 崖っぷちの底力" description="覚醒中：毎ターン2ドロー + タイムバー+1秒">
                <span className="status-cliff-edge">⚡</span>
              </Tooltip>
            )}
          </div>
        </div>
        <ToolSlots toolSlots={toolSlots} activePowers={activePowers} jobId={player.jobId} />
      </div>
      <div className="player-row player-row--sub">
        {itemSlots}
        <div className="stat-preparation">
          {isPreparationActive && (
            <Tooltip
              label="⚡ 段取りボーナス"
              description="直前に【準備】タグのカードを使用。次のカードのダメージ+30%"
            >
              <span className="stat-preparation-text">⚡ 段取り！</span>
            </Tooltip>
          )}
        </div>
        <div className="stat-piles">
          <button type="button" className="btn-pile" onClick={onOpenDrawPile}>
            山:{drawPileCount}
          </button>
          <button type="button" className="btn-pile" onClick={onOpenDiscardPile}>
            捨:{discardPileCount}
          </button>
          <button
            type="button"
            className="btn-turn-end-inline"
            disabled={isTurnEnding}
            onClick={(event) => {
              event.stopPropagation();
              onEndTurn();
            }}
          >
            終了
          </button>
        </div>
      </div>
    </section>
  );
};

export default PlayerStatus;
