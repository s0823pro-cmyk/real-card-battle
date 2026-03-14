import type { TimelineSlot as TimelineSlotType } from '../../types/game';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface Props {
  slot: TimelineSlotType;
  maxTime: number;
  effectiveTimeCost: number;
  isDandori: boolean;
  isDimmed: boolean;
  isDragging: boolean;
  isExecuting: boolean;
  bind: {
    onPointerDown: (event: ReactPointerEvent) => void;
    onPointerMove: (event: ReactPointerEvent) => void;
    onPointerUp: (event: ReactPointerEvent) => void;
    onPointerCancel: () => void;
  };
}

const TimelineSlot = ({
  slot,
  maxTime,
  effectiveTimeCost,
  isDandori,
  isDimmed,
  isDragging,
  isExecuting,
  bind,
}: Props) => {
  const width = (effectiveTimeCost / maxTime) * 100;
  const left = (slot.startTime / maxTime) * 100;

  return (
    <div
      className={`timeline-slot ${slot.card.type} ${isExecuting ? 'executing' : ''} ${isDimmed ? 'dimmed' : ''} ${
        isDragging ? 'dragging' : ''
      }`}
      style={{ width: `${width}%`, left: `${left}%` }}
      {...bind}
    >
      <div className="timeline-slot-main">
        <span className="timeline-slot-name">{slot.card.icon ?? '🃏'}</span>
        <span className="timeline-slot-time">{effectiveTimeCost}s</span>
      </div>
      {isDandori && <span className="timeline-dandori-badge">⚡</span>}
    </div>
  );
};

export default TimelineSlot;
