import type { PlayerState, ToolSlot } from '../../types/game';
import type { RunItem } from '../../types/run';
import type { HungryState } from '../../utils/hungrySystem';
import ToolSlots from './ToolSlots';
import Tooltip from '../Tooltip/Tooltip';
import './PlayerStatus.css';

interface Props {
  player: PlayerState;
  toolSlots: ToolSlot[];
  battleItems: RunItem[];
  canUseItems: boolean;
  onUseItem: (itemId: string) => void;
  drawPileCount: number;
  discardPileCount: number;
  isPlayerHit: boolean;
  hungryState?: HungryState;
}

const PlayerStatus = ({
  player,
  toolSlots,
  battleItems,
  canUseItems,
  onUseItem,
  drawPileCount,
  discardPileCount,
  isPlayerHit,
  hungryState = 'normal',
}: Props) => {
  const hpRatio = player.currentHp / Math.max(1, player.maxHp);
  const hpClass = hpRatio <= 0.3 ? 'hp-low' : hpRatio <= 0.7 ? 'hp-mid' : 'hp-high';
  const awakeThreshold = Math.floor(player.maxHp * 0.3);
  const remainingToAwake = Math.max(0, player.currentHp - awakeThreshold);
  const unemployedLabel =
    hungryState === 'awakened' ? '⚡ 覚醒中' : `💢 あと${remainingToAwake}で覚醒`;
  const unemployedClass =
    hungryState === 'awakened'
      ? 'awakened-state'
      : hungryState === 'hungry'
        ? 'hungry-state'
        : 'normal-awake-state';
  const blockClass = player.block > 0 ? 'status-block--active' : 'status-block--zero';

  return (
    <section className={`player-status ${isPlayerHit ? 'player-hit' : ''}`}>
      <div className="player-row player-row--top">
        <Tooltip tooltipKey="hp">
          <span className={`hp ${hpClass}`}>♥ {player.currentHp}/{player.maxHp}</span>
        </Tooltip>
        <Tooltip tooltipKey="block">
          <span className={`block ${blockClass}`}>🛡 {player.block}</span>
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
                  {item ? item.icon : ''}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>
      <div className="player-row player-row--sub">
        <ToolSlots toolSlots={toolSlots} />
        <span className="stat-deck">
          山:{drawPileCount} 捨:{discardPileCount}
        </span>
      </div>
    </section>
  );
};

export default PlayerStatus;
