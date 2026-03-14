import type { PlayerState, ToolSlot } from '../../types/game';
import type { HungryState } from '../../utils/hungrySystem';
import ToolSlots from './ToolSlots';
import Tooltip from '../Tooltip/Tooltip';
import './PlayerStatus.css';

interface Props {
  player: PlayerState;
  toolSlots: ToolSlot[];
  isPlayerHit: boolean;
  hungryState?: HungryState;
}

const PlayerStatus = ({ player, toolSlots, isPlayerHit, hungryState = 'normal' }: Props) => {
  const mentalClass = player.mental <= 3 ? 'mental-danger' : player.mental <= 7 ? 'mental-warn' : 'mental-safe';
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
          <span className="hp">♥ {player.currentHp}/{player.maxHp}</span>
        </Tooltip>
        <ToolSlots toolSlots={toolSlots} />
      </div>
      <div className="player-row player-row--middle">
        <Tooltip tooltipKey="block">
          <span className={`block ${blockClass}`}>🛡 {player.block}</span>
        </Tooltip>
      </div>
      <div className="player-row player-row--bottom">
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
        <Tooltip tooltipKey="mental">
          <span className={`mental ${mentalClass}`}>🧠 {player.mental}</span>
        </Tooltip>
        <Tooltip tooltipKey="gold">
          <span className="gold">💰 {player.gold}G</span>
        </Tooltip>
      </div>
    </section>
  );
};

export default PlayerStatus;
