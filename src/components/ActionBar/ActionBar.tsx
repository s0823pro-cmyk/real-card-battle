import type { Card } from '../../types/game';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import CardComponent from '../Hand/CardComponent';
import './ActionBar.css';

interface Props {
  reserved: Card[];
  gold: number;
  turn: number;
  drawPileCount: number;
  discardPileCount: number;
  phaseText: string;
  isDragging: boolean;
  activeDropTarget: 'enemy' | 'field' | 'hand' | 'reserve' | 'sell' | null;
  reserveFull: boolean;
  dragSellValue: number | null;
  coinBurstIds: number[];
  reserveDropRef?: RefObject<HTMLDivElement | null>;
  sellDropRef?: RefObject<HTMLDivElement | null>;
}

const ActionBar = ({
  reserved,
  gold,
  turn,
  drawPileCount,
  discardPileCount,
  phaseText,
  isDragging,
  activeDropTarget,
  reserveFull,
  dragSellValue,
  coinBurstIds,
  reserveDropRef,
  sellDropRef,
}: Props) => {
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);
  const [previewAlign, setPreviewAlign] = useState<'center' | 'left' | 'right'>('center');
  const longPressTimerRef = useRef<number | null>(null);

  const phaseLabelMap: Record<string, string> = {
    battle_start: '戦闘開始',
    player_turn: 'プレイヤー',
    executing: '実行',
    enemy_turn: '敵',
    victory: '勝利',
    defeat: '敗北',
  };
  const phaseLabel = phaseLabelMap[phaseText] ?? phaseText;
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
      <p className="battle-meta">
        Turn {turn} / {phaseLabel} / 山札 {drawPileCount} / 捨て札 {discardPileCount}
      </p>

      <div className="deck-info">
        <div className="reserved-panel">
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
                            selected={false}
                            disabled={false}
                            locked={false}
                            isSelling={false}
                            isReturning={false}
                            isGhost={false}
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
          {reserved.length > 0 && <span className="reserve-penalty">次ターン -{reserved.length}秒</span>}
        </div>
        <div
          className={`gold-panel drop-target sell-target ${activeDropTarget === 'sell' ? 'active' : ''}`}
          ref={sellDropRef}
        >
          <span className="gold-amount">
            💰 {gold}G {isDragging && activeDropTarget === 'sell' ? `(+${dragSellValue ?? 5}G)` : ''}
          </span>
          {coinBurstIds.map((id) => (
            <span key={id} className="coin-burst">
              +5
            </span>
          ))}
        </div>
      </div>

    </section>
  );
};

export default ActionBar;
