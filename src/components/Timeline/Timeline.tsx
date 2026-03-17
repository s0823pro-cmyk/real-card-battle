import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import './Timeline.css';

interface Props {
  maxTime: number;
  remainingTime: number;
  isDropActive: boolean;
  previewRemainingTime?: number | null;
  previewCost?: number | null;
  gaugeStyle?: 'clock' | 'bar';
  timelineBarRef?: RefObject<HTMLDivElement | null>;
}

const Timeline = ({
  maxTime,
  remainingTime,
  isDropActive,
  previewRemainingTime = null,
  previewCost = null,
  gaugeStyle = 'clock',
  timelineBarRef,
}: Props) => {
  const prevRemainingRef = useRef(remainingTime);
  const prevHasPreviewRef = useRef(false);
  const recoverTimerRef = useRef<number | null>(null);
  const previewHideTimerRef = useRef<number | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isPreviewReturning, setIsPreviewReturning] = useState(false);

  useEffect(() => {
    if (remainingTime > prevRemainingRef.current + 0.001) {
      setIsRecovering(true);
      if (recoverTimerRef.current !== null) {
        window.clearTimeout(recoverTimerRef.current);
      }
      recoverTimerRef.current = window.setTimeout(() => {
        setIsRecovering(false);
        recoverTimerRef.current = null;
      }, 620);
    }
    prevRemainingRef.current = remainingTime;
  }, [remainingTime]);

  useEffect(
    () => () => {
      if (recoverTimerRef.current !== null) {
        window.clearTimeout(recoverTimerRef.current);
      }
      if (previewHideTimerRef.current !== null) {
        window.clearTimeout(previewHideTimerRef.current);
      }
    },
    [],
  );

  const remainingRatio = Math.max(0, Math.min(1, remainingTime / Math.max(1, maxTime)));
  const fillPercent = remainingRatio * 100;
  const dangerClass = remainingRatio <= 0.25 ? 'critical' : remainingRatio <= 0.5 ? 'warning' : 'safe';
  const hasPreview = previewRemainingTime !== null && previewCost !== null;
  const displayedRemainingTime = hasPreview ? previewRemainingTime : remainingTime;
  const displayClockTimeText = hasPreview ? displayedRemainingTime.toFixed(1) : String(Math.round(displayedRemainingTime));
  const [clockTimeMainPart, clockTimeDecimalPart] = displayClockTimeText.split('.');
  const barDisplayedTime = hasPreview ? previewRemainingTime : remainingTime;
  const [barDisplayedIntPart, barDisplayedDecimalPart] = barDisplayedTime.toFixed(1).split('.');
  const previewRatio = hasPreview ? Math.max(0, Math.min(1, previewRemainingTime / Math.max(1, maxTime))) : remainingRatio;
  const previewPercent = previewRatio * 100;
  const previewLossPercent = hasPreview ? Math.max(0, fillPercent - previewPercent) : 0;
  const consumedDeg = (1 - remainingRatio) * 360;
  const currentHandDeg = consumedDeg;
  const previewHandDeg = (1 - previewRatio) * 360;

  useEffect(() => {
    const prevHasPreview = prevHasPreviewRef.current;
    if (hasPreview) {
      if (previewHideTimerRef.current !== null) {
        window.clearTimeout(previewHideTimerRef.current);
        previewHideTimerRef.current = null;
      }
      setIsPreviewReturning(false);
    } else if (prevHasPreview) {
      setIsPreviewReturning(true);
      if (previewHideTimerRef.current !== null) {
        window.clearTimeout(previewHideTimerRef.current);
      }
      previewHideTimerRef.current = window.setTimeout(() => {
        setIsPreviewReturning(false);
        previewHideTimerRef.current = null;
      }, 220);
    }
    prevHasPreviewRef.current = hasPreview;
  }, [hasPreview]);

  return (
    <section className="timeline-section">
      <div className="timebar-row">
        {gaugeStyle === 'clock' ? (
          <div
            className={`timeline-clock timeline-clock--${dangerClass} ${
              isDropActive ? 'timeline-clock--drop-active' : ''
            } ${isRecovering ? 'timeline-clock--recovering' : ''} ${
              hasPreview ? 'timeline-clock--previewing' : ''
            }`}
          >
            <div className="timeline-clock-start-marker" />
            <div
              className="timeline-clock-ring"
              style={{ '--clock-consumed-deg': `${consumedDeg}deg` } as CSSProperties}
            />
            {!hasPreview && !isPreviewReturning && (
              <div
                className="timeline-clock-hand"
                style={{ transform: `translateX(-50%) translateY(-100%) rotate(${currentHandDeg}deg)` }}
              />
            )}
            <div
              className={`timeline-clock-hand timeline-clock-hand--preview ${
                hasPreview || isPreviewReturning ? 'is-visible' : ''
              }`}
              style={{
                transform: `translateX(-50%) translateY(-100%) rotate(${hasPreview ? previewHandDeg : currentHandDeg}deg)`,
              }}
            />
            <div className="timeline-clock-center-dot" />
            <div
              className={`timeline-clock-time ${displayedRemainingTime <= 2 ? 'danger' : ''} ${
                hasPreview ? 'previewing' : ''
              }`}
            >
              <span className="timeline-clock-time-value">
                <span className="timeline-clock-time-int">{clockTimeMainPart}</span>
                {clockTimeDecimalPart !== undefined && (
                  <span className="timeline-clock-time-decimal">.{clockTimeDecimalPart}</span>
                )}
              </span>
            </div>
          </div>
        ) : null}
        {gaugeStyle === 'bar' ? (
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
                {hasPreview && previewLossPercent > 0 && (
                  <div
                    className="timeline-preview-loss"
                    style={{ width: `${previewLossPercent}%`, left: `${previewPercent}%` }}
                  />
                )}
              </div>
              <span
                key={remainingTime.toFixed(1)}
                className={`timeline-inline-remaining ${barDisplayedTime <= 2 ? 'danger' : ''} ${
                  hasPreview ? 'is-preview' : ''
                }`}
              >
                {barDisplayedIntPart}
                <span className="timeline-inline-time-decimal">.{barDisplayedDecimalPart}</span>ｓ
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default Timeline;
