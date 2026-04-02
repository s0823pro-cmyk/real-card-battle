import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card, PlayerState, ToolSlot } from '../../types/game';
import type { CSSProperties, RefObject } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { getEffectiveCardValues } from '../../utils/cardPreview';
import { isIngredientCard, isRecipeStudyInEffect } from '../../utils/cardBadgeRules';
import { getEffectiveTimeCost } from '../../utils/timeline';
import CardComponent from './CardComponent';
import './Hand.css';

interface Props {
  hand: Card[];
  player: PlayerState;
  /** playCardInstant と同じ倍撃チャージ（プレビュー用） */
  doubleNextCharges?: number;
  /** 二重発動系カードのプレビュー用 */
  doubleNextReplayCharges?: number;
  /** 気合を入れる等の次アタック加算（カード上ダメージ予測と整合） */
  attackItemBuff?: { value: number; charges: number } | null;
  /** ナイフセット等（calculateCardDamage と整合） */
  toolSlots?: ToolSlot[];
  /** パワー枠のレシピ研究を含め、食材カード説明の調理+1 を表示に反映 */
  activePowers?: Card[];
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
  const cardWidth = 100;
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
  doubleNextCharges = 0,
  doubleNextReplayCharges = 0,
  attackItemBuff = null,
  toolSlots,
  activePowers,
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
          const isSoloPlayOnlyCard = card.tags?.includes('solo_play_only') ?? false;
          const violatesSoloPlayCondition = isSoloPlayOnlyCard && hand.length > 1;
          const placeDisabled =
            card.type === 'status' ||
            violatesSoloPlayCondition ||
            usedTime + getEffectiveTimeCost(card, lastPlayedCard, player, player.jobId) > maxTime;
          const effectiveValues = getEffectiveCardValues(
            card,
            player,
            lastPlayedCard,
            doubleNextCharges,
            attackItemBuff,
            toolSlots,
            doubleNextReplayCharges,
          );
          const recipeStudyDisplay =
            isRecipeStudyInEffect(player, activePowers) && isIngredientCard(card);
          const isExpanded = expandedCardId === card.id;
          const isDraggingCard = draggedCardId === card.id;
          const current = layout[cardIndex];
          const style: CSSProperties = {
            left: `${current?.x ?? 0}px`,
            bottom: `${-30 - (current?.yOffset ?? 0)}px`,
            '--hand-card-width': `${current?.width ?? 78}px`,
            '--hand-card-height': `${current?.height ?? 110}px`,
            '--card-angle': `${current?.angle ?? 0}deg`,
            transform: isDraggingCard
              ? 'rotate(0deg) translateY(-50px) scale(1.15)'
              : isExpanded
                ? 'rotate(0deg) translateY(-50px) scale(1.15)'
                : `rotate(${current?.angle ?? 0}deg)`,
            zIndex: isDraggingCard ? 200 : isExpanded ? 100 : cardIndex + 1,
            transition: isDraggingCard
              ? 'none'
              : 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
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
                jobId={player.jobId}
                selected={selectedCardId === card.id || isExpanded}
                disabled={placeDisabled}
                locked={isLocked}
                isSelling={sellingCardId === card.id}
                isReturning={returningCardId === card.id}
                isGhost={draggedCardId === card.id}
                isDragging={isDraggingCard}
                isDragUnavailable={placeDisabled}
                recipeStudyDisplay={recipeStudyDisplay}
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
