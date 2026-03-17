import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { STATUS_TOOLTIPS } from './statusTooltips';
import { ENEMY_ACTION_TOOLTIPS } from './statusTooltips';
import type { TooltipKey } from './statusTooltips';
import './Tooltip.css';

interface TooltipProps {
  tooltipKey?: TooltipKey;
  label?: string;
  description?: string;
  touchMode?: 'tap' | 'hold';
  children: ReactNode;
}

const PADDING = 8;

const Tooltip = ({ tooltipKey, label, description, touchMode = 'tap', children }: TooltipProps) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: -9999, left: -9999 });
  const [calculated, setCalculated] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const holdDelayTimerRef = useRef<number | null>(null);
  const touchIdentifierRef = useRef<number | null>(null);
  const data = tooltipKey
    ? STATUS_TOOLTIPS[tooltipKey as keyof typeof STATUS_TOOLTIPS] ??
      ENEMY_ACTION_TOOLTIPS[tooltipKey as keyof typeof ENEMY_ACTION_TOOLTIPS]
    : label && description
      ? { label, description }
      : null;

  useEffect(() => {
    // マウント時：残留タッチ状態を確実にリセット
    touchIdentifierRef.current = null;
    setVisible(false);
    setPosition({ top: -9999, left: -9999 });
    setCalculated(false);

    return () => {
      // アンマウント時：タイマーとタッチ状態をクリア
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
      if (holdDelayTimerRef.current !== null) {
        window.clearTimeout(holdDelayTimerRef.current);
      }
      touchIdentifierRef.current = null;
      setPosition({ top: -9999, left: -9999 });
      setCalculated(false);
      setVisible(false);
    };
  }, []);

  useLayoutEffect(() => {
    const adjustPosition = () => {
      if (!wrapperRef.current || !tooltipRef.current) return;

      const wrapRect = wrapperRef.current.getBoundingClientRect();
      const tipRect = tooltipRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let top = wrapRect.top - tipRect.height - 8;
      let left = wrapRect.left + wrapRect.width / 2 - tipRect.width / 2;

      if (top < PADDING) {
        top = wrapRect.bottom + 8;
      }

      if (left < PADDING) {
        left = PADDING;
      }

      if (left + tipRect.width > vw - PADDING) {
        left = vw - tipRect.width - PADDING;
      }

      if (top + tipRect.height > vh - PADDING) {
        top = wrapRect.top - tipRect.height - 8;
      }

      if (top < PADDING) {
        top = PADDING;
      }

      setPosition({ top, left });
      setCalculated(true);
    };

    if (!visible) return;

    adjustPosition();
    window.addEventListener('resize', adjustPosition);
    window.addEventListener('scroll', adjustPosition, true);

    return () => {
      window.removeEventListener('resize', adjustPosition);
      window.removeEventListener('scroll', adjustPosition, true);
    };
  }, [visible]);

  const showTooltip = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setCalculated(false);
    setVisible(true);
  };

  const hideTooltip = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setPosition({ top: -9999, left: -9999 });
    setCalculated(false);
    setVisible(false);
  };

  const showTooltipWithTimeout = () => {
    showTooltip();
    hideTimerRef.current = window.setTimeout(() => {
      hideTooltip();
      hideTimerRef.current = null;
    }, 2000);
  };

  const clearHoldDelayTimer = () => {
    if (holdDelayTimerRef.current !== null) {
      window.clearTimeout(holdDelayTimerRef.current);
      holdDelayTimerRef.current = null;
    }
  };

  if (!data) return <>{children}</>;

  return (
    <div
      ref={wrapperRef}
      className="tooltip-wrapper"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onTouchStart={(event) => {
        // 既にタッチ追跡中の場合は無視（残留タッチの誤発火を防ぐ）
        if (touchIdentifierRef.current !== null) return;
        const touch = event.changedTouches[0];
        if (!touch) return;
        touchIdentifierRef.current = touch.identifier;
        event.preventDefault();
        event.stopPropagation();
        if (touchMode === 'hold') {
          clearHoldDelayTimer();
          holdDelayTimerRef.current = window.setTimeout(() => {
            showTooltip();
            holdDelayTimerRef.current = null;
          }, 220);
        } else {
          showTooltipWithTimeout();
        }
      }}
      onTouchEnd={(event) => {
        const touch = Array.from(event.changedTouches).find(
          (item) => item.identifier === touchIdentifierRef.current,
        );
        if (!touch) return;
        touchIdentifierRef.current = null;
        clearHoldDelayTimer();
        hideTooltip();
      }}
      onTouchCancel={() => {
        touchIdentifierRef.current = null;
        clearHoldDelayTimer();
        hideTooltip();
      }}
      onTouchMove={() => {
        touchIdentifierRef.current = null;
        clearHoldDelayTimer();
        hideTooltip();
      }}
    >
      {children}
      {createPortal(
        <div
          ref={tooltipRef}
          className="tooltip-box"
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 9999,
            visibility: visible && calculated ? 'visible' : 'hidden',
            opacity: visible && calculated ? 1 : 0,
            transition: calculated ? 'opacity 0.15s ease' : 'none',
            pointerEvents: 'none',
          }}
        >
          <div className="tooltip-label">{data.label}</div>
          <div className="tooltip-description">{data.description}</div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default Tooltip;
