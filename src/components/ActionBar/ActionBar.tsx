import type { Card, JobId } from '../../types/game';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import CardComponent from '../Hand/CardComponent';
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
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);
  const [previewAlign, setPreviewAlign] = useState<'center' | 'left' | 'right'>('center');
  const longPressTimerRef = useRef<number | null>(null);

  const noop = () => {};
  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const startLongPressPreview = (card: Card, target: HTMLElement) => {
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      showPreview(card, target);
    }, 300);
  };
  const stopLongPressPreview = (card?: Card) => {
    clearLongPress();
    if (card) hidePreview(card.id);
  };
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
  const showPreview = (card: Card, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const edge = 56;
    if (rect.left < edge) setPreviewAlign('left');
    else if (rect.right > window.innerWidth - edge) setPreviewAlign('right');
    else setPreviewAlign('center');
    setPreviewCardId(card.id);
  };
  const hidePreview = (cardId: string) => {
    setPreviewCardId((current) => (current === cardId ? null : current));
  };

  useEffect(() => {
    if (!isDragging) return;
    setPreviewCardId(null);
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
            <span className="reserved-label">温存:</span>
            {Array.from({ length: 2 }).map((_, index) => {
              const card = reserved[index];
              return (
                <div
                  key={`reserved-${index}`}
                  className={`reserved-card-mini ${card?.type ?? ''} ${card ? '' : 'empty'}`}
                  onMouseEnter={(event) => {
                    if (!card || isDragging) return;
                    showPreview(card, event.currentTarget);
                  }}
                  onMouseLeave={() => {
                    if (!card) return;
                    hidePreview(card.id);
                  }}
                  onPointerDown={(event) => {
                    if (!card || isDragging || event.pointerType === 'mouse') return;
                    startLongPressPreview(card, event.currentTarget);
                  }}
                  onPointerUp={() => {
                    stopLongPressPreview(card);
                  }}
                  onPointerCancel={() => {
                    stopLongPressPreview(card);
                  }}
                  onPointerLeave={() => {
                    stopLongPressPreview(card);
                  }}
                  onTouchStart={(event) => {
                    if (!card || isDragging) return;
                    startLongPressPreview(card, event.currentTarget);
                  }}
                  onTouchEnd={() => {
                    stopLongPressPreview(card);
                  }}
                  onTouchCancel={() => {
                    stopLongPressPreview(card);
                  }}
                >
                  {card && (
                    <>
                      <span className="reserved-card-mini-icon">{card.icon ?? '🃏'}</span>
                      <span className="reserved-card-mini-name">{card.name}</span>
                      {previewCardId === card.id && (
                        <div
                          className={`reserved-card-preview ${
                            previewAlign === 'left'
                              ? 'reserved-card-preview--left'
                              : previewAlign === 'right'
                                ? 'reserved-card-preview--right'
                                : ''
                          }`}
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
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <p className="reserve-penalty-inline">
            {reserved.length > 0 ? `次ターン -${reserved.length}秒` : ''}
          </p>
        </div>
      </div>
      <div className="reserve-right" />
    </section>
  );
};

export default ActionBar;
