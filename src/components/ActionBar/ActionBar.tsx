import type { Card, JobId } from '../../types/game';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { createPortal } from 'react-dom';
import CardComponent from '../Hand/CardComponent';
import Tooltip from '../Tooltip/Tooltip';
import './ActionBar.css';

interface Props {
  reserved: Card[];
  jobId: JobId;
  isDragging: boolean;
  activeDropTarget: 'enemy' | 'field' | 'timebar' | 'hand' | 'reserve' | 'sell' | null;
  reserveFull: boolean;
  reserveDropRef?: RefObject<HTMLDivElement | null>;
}

const ActionBar = ({
  reserved,
  jobId,
  isDragging,
  activeDropTarget,
  reserveFull,
  reserveDropRef,
}: Props) => {
  const reservePenaltySeconds = reserved.length * 1.5;
  const reservePenaltyLabel =
    reserved.length > 0
      ? `次ターン -${Number.isInteger(reservePenaltySeconds) ? reservePenaltySeconds : reservePenaltySeconds.toFixed(1)}秒`
      : '';
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);
  const [pinnedPreviewCardId, setPinnedPreviewCardId] = useState<string | null>(null);
  const [previewDialogCard, setPreviewDialogCard] = useState<Card | null>(null);
  const [previewAlign, setPreviewAlign] = useState<'center' | 'left' | 'right'>('center');
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const longPressTimerRef = useRef<number | null>(null);

  const noop = () => {};
  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const getBaseEffectiveValues = (card: Card): EffectiveCardValues => ({
    damage: card.damage ?? null,
    block: card.block ?? null,
    heal:
      (card.effects ?? []).filter((effect) => effect.type === 'heal').reduce((sum, effect) => sum + effect.value, 0) ||
      null,
    effectiveTimeCost: card.timeCost,
    isTimeBuffed: false,
    isTimeDebuffed: false,
    isDamageBuffed: false,
    isDamageDebuffed: false,
    isBlockBuffed: false,
    isBlockDebuffed: false,
    isHealBuffed: false,
    isHealDebuffed: false,
  });
  const showPreview = (card: Card, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const edge = 56;
    let align: 'center' | 'left' | 'right' = 'center';
    if (rect.left < edge) align = 'left';
    else if (rect.right > window.innerWidth - edge) align = 'right';
    setPreviewAlign(align);
    setPreviewPosition({
      x: align === 'left' ? rect.left : align === 'right' ? rect.right : rect.left + rect.width / 2,
      y: rect.top - 8,
    });
    setPreviewCardId(card.id);
  };
  const hidePreview = (cardId: string) => {
    if (pinnedPreviewCardId === cardId) return;
    setPreviewCardId((current) => (current === cardId ? null : current));
  };

  useEffect(() => {
    if (!isDragging) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewCardId(null);
    setPinnedPreviewCardId(null);
    setPreviewDialogCard(null);
    clearLongPress();
  }, [isDragging]);

  useEffect(
    () => () => {
      clearLongPress();
    },
    [],
  );

  return (
    <section className="action-bar bottom-area">
      <div className="reserve-left">
        <div className="reserve-slots-row">
          <div
            className={`reserved-cards drop-target reserve-target ${
              activeDropTarget === 'reserve' ? 'active' : ''
            } ${reserveFull ? 'full' : ''} ${
              activeDropTarget === 'reserve' && reserveFull ? 'reject' : ''
            }`}
            ref={reserveDropRef}
          >
            <div className={`reserve-slots${reserved.length >= 3 ? ' reserve-slots--scrollable' : ''}`}>
            {reserved.length === 0 ? (
              <>
                <Tooltip
                  label="温存枠"
                  description="カードをここにドロップすると温存できます。温存したカードは次ターン開始時に手札に戻ります。温存1枚につき次ターンの時間が1.5秒減少します。"
                  touchMode="hold"
                >
                  <div className="reserved-card-mini empty" />
                </Tooltip>
                <Tooltip
                  label="温存枠"
                  description="カードをここにドロップすると温存できます。温存したカードは次ターン開始時に手札に戻ります。温存1枚につき次ターンの時間が1.5秒減少します。"
                  touchMode="hold"
                >
                  <div className="reserved-card-mini empty" />
                </Tooltip>
              </>
            ) : (
              reserved.map((card, index) => (
                <Tooltip
                  key={`reserved-${index}`}
                  label={card.name}
                  description={card.description ?? ''}
                >
                  <div
                    className="reserve-slot-item"
                    onMouseEnter={(event) => {
                      if (isDragging) return;
                      if (pinnedPreviewCardId) return;
                      showPreview(card, event.currentTarget);
                    }}
                    onMouseLeave={() => {
                      hidePreview(card.id);
                    }}
                    onPointerDown={(event) => {
                      if (isDragging) return;
                      if (event.pointerType === 'mouse') return;
                      setPinnedPreviewCardId(card.id);
                      showPreview(card, event.currentTarget);
                    }}
                    onPointerUp={() => {
                      clearLongPress();
                    }}
                    onPointerCancel={() => {
                      clearLongPress();
                    }}
                    onPointerLeave={() => {
                      clearLongPress();
                    }}
                    onTouchStart={(event) => {
                      if (isDragging) return;
                      setPinnedPreviewCardId(card.id);
                      showPreview(card, event.currentTarget);
                    }}
                    onTouchEnd={() => {
                      clearLongPress();
                    }}
                    onTouchCancel={() => {
                      clearLongPress();
                    }}
                    onClick={(event) => {
                      if (isDragging) return;
                      const shouldClose = previewDialogCard?.id === card.id;
                      setPinnedPreviewCardId(card.id);
                      showPreview(card, event.currentTarget);
                      setPreviewDialogCard(shouldClose ? null : card);
                    }}
                  >
                    <CardComponent
                      card={card}
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
                      effectiveValues={getBaseEffectiveValues(card)}
                      onSelect={noop}
                      onPointerDown={noop}
                      onPointerMove={noop}
                      onPointerUp={noop}
                      onPointerCancel={noop}
                      onMouseEnter={noop}
                      onMouseLeave={noop}
                      style={
                        {
                          '--hand-card-width': '36px',
                          '--hand-card-height': '56px',
                          position: 'relative',
                          transform: 'none',
                          transition: 'none',
                          flexShrink: 0,
                        } as CSSProperties
                      }
                    />
                    {previewCardId === card.id &&
                      createPortal(
                        <div
                          className={`reserved-card-preview reserved-card-preview--floating ${
                            previewAlign === 'left'
                              ? 'reserved-card-preview--left'
                              : previewAlign === 'right'
                                ? 'reserved-card-preview--right'
                                : ''
                          }`}
                          style={{ left: `${previewPosition.x}px`, top: `${previewPosition.y}px` }}
                        >
                          <CardComponent
                            card={card}
                            jobId={jobId}
                            selected={false}
                            disabled={false}
                            locked={false}
                            isSelling={false}
                            isReturning={false}
                            isGhost={false}
                            isDragging={false}
                            isDragUnavailable={false}
                            effectiveValues={getBaseEffectiveValues(card)}
                            onSelect={noop}
                            onPointerDown={noop}
                            onPointerMove={noop}
                            onPointerUp={noop}
                            onPointerCancel={noop}
                            onMouseEnter={noop}
                            onMouseLeave={noop}
                          />
                        </div>,
                        document.body,
                      )}
                  </div>
                </Tooltip>
              ))
            )}
            </div>
          </div>
          <p className="reserve-penalty-inline">
            {reservePenaltyLabel}
          </p>
        </div>
      </div>
      <div className="reserve-right" />
      {previewDialogCard &&
        createPortal(
          <div className="reserved-preview-overlay" onClick={() => setPreviewDialogCard(null)}>
            <div className="reserved-preview-dialog" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="reserved-preview-close"
                onClick={() => setPreviewDialogCard(null)}
              >
                ×
              </button>
              <CardComponent
                card={previewDialogCard}
                jobId={jobId}
                selected={false}
                disabled={false}
                locked={false}
                isSelling={false}
                isReturning={false}
                isGhost={false}
                isDragging={false}
                isDragUnavailable={false}
                effectiveValues={getBaseEffectiveValues(previewDialogCard)}
                onSelect={noop}
                onPointerDown={noop}
                onPointerMove={noop}
                onPointerUp={noop}
                onPointerCancel={noop}
                onMouseEnter={noop}
                onMouseLeave={noop}
              />
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
};

export default ActionBar;
