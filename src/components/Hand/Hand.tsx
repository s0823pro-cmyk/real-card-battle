import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card, PlayerState } from '../../types/game';
import type { CSSProperties, RefObject } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { getEffectiveCardValues } from '../../utils/cardPreview';
import { getEffectiveTimeCost } from '../../utils/timeline';
import CardComponent from './CardComponent';
import './Hand.css';

interface Props {
  hand: Card[];
  player: PlayerState;
  usedTime: number;
  lastPlayedCard: Card | null;
  selectedCardId: string | null;
  maxTime: number;
  isLocked: boolean;
  sellingCardId: string | null;
  returningCardId: string | null;
  onSelectCard: (id: string) => void;
  onCardPointerDown: (card: Card, index: number, event: ReactPointerEvent) => void;
  onCardPointerMove: (event: ReactPointerEvent) => void;
  onCardPointerUp: (event: ReactPointerEvent) => void;
  onCardPointerCancel: () => void;
  onCardHoverStart: (cardId: string) => void;
  onCardHoverEnd: () => void;
  draggedCardId: string | null;
  expandedCardId: string | null;
  handAreaRef?: RefObject<HTMLDivElement | null>;
}

interface LayoutItem {
  x: number;
  yOffset: number;
  angle: number;
  width: number;
  height: number;
}

const calcHandLayout = (cardCount: number, areaWidth: number): LayoutItem[] => {
  if (cardCount <= 0) return [];
  const baseCardWidth = 100;
  const minCardWidth = 70;
  const cardWidth = Math.max(
    minCardWidth,
    Math.min(baseCardWidth, (areaWidth - 16) / Math.max(cardCount, 1)),
  );
  const cardHeight = cardWidth * 1.6;
  const anglePerCard = cardCount > 1 ? Math.min(20 / (cardCount - 1), 5) : 0;
  const totalAngle = anglePerCard * (cardCount - 1);
  const startAngle = -totalAngle / 2;
  const spacing = Math.min(
    cardWidth * 0.6,
    (areaWidth - cardWidth) / Math.max(cardCount - 1, 1),
  );
  const totalWidth = spacing * Math.max(0, cardCount - 1) + cardWidth;
  const startX = (areaWidth - totalWidth) / 2;

  return Array.from({ length: cardCount }, (_, i) => {
    const angle = startAngle + anglePerCard * i;
    const x = startX + spacing * i;
    const normalizedPos = cardCount > 1 ? (i / (cardCount - 1)) * 2 - 1 : 0;
    const yOffset = normalizedPos * normalizedPos * 20;
    return { x, yOffset, angle, width: cardWidth, height: cardHeight };
  });
};

const Hand = ({
  hand,
  player,
  usedTime,
  lastPlayedCard,
  selectedCardId,
  maxTime,
  isLocked,
  sellingCardId,
  returningCardId,
  onSelectCard,
  onCardPointerDown,
  onCardPointerMove,
  onCardPointerUp,
  onCardPointerCancel,
  onCardHoverStart,
  onCardHoverEnd,
  draggedCardId,
  expandedCardId,
  handAreaRef,
}: Props) => {
  const localAreaRef = useRef<HTMLDivElement | null>(null);
  const [areaWidth, setAreaWidth] = useState(360);
  const layout = useMemo(() => calcHandLayout(hand.length, areaWidth), [hand.length, areaWidth]);

  useEffect(() => {
    const target = localAreaRef.current;
    if (!target) return;
    const update = () => setAreaWidth(target.offsetWidth || 360);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(target);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <section className="hand-section">
      <div
        className="hand-area"
        ref={(node) => {
          localAreaRef.current = node;
          if (handAreaRef) handAreaRef.current = node;
        }}
      >
        {hand.map((card, cardIndex) => {
          const placeDisabled =
            card.type === 'status' ||
            usedTime + getEffectiveTimeCost(card, lastPlayedCard, player, player.jobId) > maxTime;
          const effectiveValues = getEffectiveCardValues(card, player, lastPlayedCard);
          const isExpanded = expandedCardId === card.id && draggedCardId !== card.id;
          const current = layout[cardIndex];
          const style: CSSProperties = {
            left: `${current?.x ?? 0}px`,
            bottom: `${-30 - (current?.yOffset ?? 0)}px`,
            '--hand-card-width': `${current?.width ?? 82}px`,
            '--hand-card-height': `${current?.height ?? 114}px`,
            '--card-angle': `${current?.angle ?? 0}deg`,
            transform: isExpanded
              ? `rotate(0deg) translateY(-50px) scale(1.15)`
              : `rotate(${current?.angle ?? 0}deg)`,
            zIndex: isExpanded ? 100 : cardIndex + 1,
            transition: 'transform 0.2s ease-out',
          } as CSSProperties;

          return (
            <div
              key={card.id}
              className={`hand-card-wrapper ${isExpanded ? 'hand-card-wrapper--expanded' : ''} ${
                placeDisabled ? 'hand-card-wrapper--disabled' : ''
              } ${draggedCardId === card.id ? 'hand-card-wrapper--dragging' : ''}`}
              style={style}
            >
              <CardComponent
                card={card}
                selected={selectedCardId === card.id || isExpanded}
                disabled={placeDisabled}
                locked={isLocked}
                isSelling={sellingCardId === card.id}
                isReturning={returningCardId === card.id}
                isGhost={draggedCardId === card.id}
                isDragUnavailable={placeDisabled}
                effectiveValues={effectiveValues}
                onSelect={() => onSelectCard(card.id)}
                onPointerDown={(event) => onCardPointerDown(card, cardIndex, event)}
                onPointerMove={onCardPointerMove}
                onPointerUp={onCardPointerUp}
                onPointerCancel={onCardPointerCancel}
                onMouseEnter={() => onCardHoverStart(card.id)}
                onMouseLeave={onCardHoverEnd}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Hand;
