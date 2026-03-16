import type { ToolSlot } from '../../types/game';
import Tooltip from '../Tooltip/Tooltip';

interface Props {
  toolSlots: ToolSlot[];
}

const ToolSlots = ({ toolSlots }: Props) => {
  return (
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
  );
};

export default ToolSlots;
