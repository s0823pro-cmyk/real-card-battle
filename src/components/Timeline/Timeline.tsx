import type { RefObject } from 'react';
import './Timeline.css';

interface Props {
  maxTime: number;
  remainingTime: number;
  isDropActive: boolean;
  isEnding: boolean;
  onEndTurn: () => void;
  timelineBarRef?: RefObject<HTMLDivElement | null>;
}

const Timeline = ({
  maxTime,
  remainingTime,
  isDropActive,
  isEnding,
  onEndTurn,
  timelineBarRef,
}: Props) => {
  const remainingRatio = Math.max(0, Math.min(1, remainingTime / Math.max(1, maxTime)));
  const fillPercent = remainingRatio * 100;
  const dangerClass = remainingRatio <= 0.25 ? 'critical' : remainingRatio <= 0.5 ? 'warning' : 'safe';

  return (
    <section className="timeline-section">
      <div className="timebar-row">
        <div className="timebar-container">
          <div
            className={`timeline-bar ${isDropActive ? 'drop-active' : ''}`}
            ref={(node) => {
              if (timelineBarRef) timelineBarRef.current = node;
            }}
          >
            <div className="timeline-mental-track">
              <div className="timeline-empty" />
              <div className={`timeline-mental-fill ${dangerClass}`} style={{ width: `${fillPercent}%` }} />
            </div>
            <span
              key={remainingTime.toFixed(1)}
              className={`timeline-inline-remaining ${remainingTime <= 2 ? 'danger' : ''}`}
            >
              {remainingTime.toFixed(1)}s
            </span>
          </div>
        </div>
        <button
          type="button"
          className="btn-turn-end"
          disabled={isEnding}
          onClick={(event) => {
            event.stopPropagation();
            onEndTurn();
          }}
        >
          終了
        </button>
      </div>
    </section>
  );
};

export default Timeline;
