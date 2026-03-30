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

/**
 * position:fixed の top/left は getBoundingClientRect と同じレイアウトビューポート座標で揃える。
 * visualViewport.offsetTop を min/max に混ぜると、一部 WebView で固定レイヤとクランプが二重ずれする。
 */
function getLayoutViewportSize(): { width: number; height: number } {
  const d = document.documentElement;
  const w = window.innerWidth || d.clientWidth;
  const h = window.innerHeight || d.clientHeight;
  return { width: w, height: h };
}

const Tooltip = ({ tooltipKey, label, description, children }: TooltipProps) => {
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
      const { width: vw, height: vh } = getLayoutViewportSize();
      const minL = PADDING;
      const minT = PADDING;
      const maxR = vw - PADDING;
      const maxB = vh - PADDING;

      let top = wrapRect.top - tipRect.height - 8;
      let left = wrapRect.left + wrapRect.width / 2 - tipRect.width / 2;

      if (top < minT) {
        top = wrapRect.bottom + 8;
      }

      if (left < minL) {
        left = minL;
      }

      if (left + tipRect.width > maxR) {
        left = maxR - tipRect.width;
      }

      if (top + tipRect.height > maxB) {
        top = wrapRect.top - tipRect.height - 8;
      }

      if (top < minT) {
        top = minT;
      }

      if (top + tipRect.height > maxB) {
        top = Math.max(minT, maxB - tipRect.height);
      }

      if (left + tipRect.width > maxR) {
        left = minL;
      }

      setPosition({ top, left });
      setCalculated(true);
    };

    if (!visible) return;

    adjustPosition();
    window.addEventListener('resize', adjustPosition);
    window.addEventListener('scroll', adjustPosition, true);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', adjustPosition);
    vv?.addEventListener('scroll', adjustPosition);

    return () => {
      window.removeEventListener('resize', adjustPosition);
      window.removeEventListener('scroll', adjustPosition, true);
      vv?.removeEventListener('resize', adjustPosition);
      vv?.removeEventListener('scroll', adjustPosition);
    };
  }, [visible]);

  const showTooltip = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setCalculated(false);
    setPosition({ top: 100, left: 20 }); // 強制的に画面内に表示
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
      onMouseEnter={() => {
        if (window.matchMedia('(pointer: coarse)').matches) return;
        showTooltip();
      }}
      onMouseLeave={() => {
        if (window.matchMedia('(pointer: coarse)').matches) return;
        hideTooltip();
      }}
      onTouchStart={(event) => {
        if (touchIdentifierRef.current !== null) return;
        const touch = event.changedTouches[0];
        if (!touch) return;
        touchIdentifierRef.current = touch.identifier;
        showTooltip();
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
            /* 内側スクロールのため auto（CSS と整合） */
            pointerEvents: visible && calculated ? 'auto' : 'none',
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
