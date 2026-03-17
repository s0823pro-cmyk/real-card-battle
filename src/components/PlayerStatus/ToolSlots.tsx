import type { CSSProperties } from 'react';
import type { Card, JobId, ToolSlot } from '../../types/game';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import CardComponent from '../Hand/CardComponent';
import Tooltip from '../Tooltip/Tooltip';

interface Props {
  toolSlots: ToolSlot[];
  activePowers: Card[];
  jobId: JobId;
}

const ToolSlots = ({ toolSlots, activePowers, jobId }: Props) => {
  const noop = () => {};
  const getBaseEffectiveValues = (card: Card): EffectiveCardValues => ({
    damage: card.damage ?? null,
    block: card.block ?? null,
    effectiveTimeCost: card.timeCost,
    isTimeBuffed: false,
    isTimeDebuffed: false,
    isDamageBuffed: false,
    isDamageDebuffed: false,
    isBlockBuffed: false,
    isBlockDebuffed: false,
  });

  return (
    <div className="battle-slots-row">
      <div className="tool-slots-inline">
        {Array.from({ length: 3 }).map((_, idx) => {
          const slot = toolSlots[idx];
          return (
            <Tooltip
              key={`tool-${idx}`}
              label={slot ? slot.card.name : '道具スロット'}
              description={
                slot ? slot.card.description : '装備カード。最大3枠。毎ターン自動で効果が発動する。'
              }
            >
              <span className={`tool-slot-inline ${slot ? 'filled' : 'empty'} ${slot?.card.type ?? ''}`}>
                {slot ? (
                  <>
                    <span className="tool-slot-inline-icon">{slot.card.icon ?? '🔧'}</span>
                    <span className="tool-slot-inline-name">{slot.card.name}</span>
                  </>
                ) : null}
              </span>
            </Tooltip>
          );
        })}
      </div>

      {activePowers.length > 0 && (
        <>
          <div className="slots-divider" />
          <div className={`power-slots ${activePowers.length > 3 ? 'power-slots--scrollable' : ''}`}>
            {activePowers.map((power, idx) => (
              <Tooltip key={`power-${power.id}-${idx}`} label={power.name} description={power.description}>
                <div className="power-slot-item">
                  <CardComponent
                    card={power}
                    jobId={jobId}
                    selected={false}
                    disabled={false}
                    locked={false}
                    isSelling={false}
                    isReturning={false}
                    isGhost={false}
                    isDragging={false}
                    isDragUnavailable={false}
                    zukanMode="list"
                    effectiveValues={getBaseEffectiveValues(power)}
                    onSelect={noop}
                    onPointerDown={noop}
                    onPointerMove={noop}
                    onPointerUp={noop}
                    onPointerCancel={noop}
                    onMouseEnter={noop}
                    onMouseLeave={noop}
                    style={
                      {
                        '--hand-card-width': '44px',
                        '--hand-card-height': '70px',
                        position: 'relative',
                        transform: 'none',
                        transition: 'none',
                        flexShrink: 0,
                      } as CSSProperties
                    }
                  />
                </div>
              </Tooltip>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ToolSlots;
