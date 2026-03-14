import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import ActionBar from '../ActionBar/ActionBar';
import DamagePopup from '../Effects/DamagePopup';
import DandoriIndicator from '../Effects/DandoriIndicator';
import ShieldEffect from '../Effects/ShieldEffect';
import EnemyDisplay from '../Enemy/EnemyDisplay';
import CardComponent from '../Hand/CardComponent';
import Hand from '../Hand/Hand';
import PlayerStatus from '../PlayerStatus/PlayerStatus';
import DefeatScreen from '../Result/DefeatScreen';
import VictoryScreen from '../Result/VictoryScreen';
import Timeline from '../Timeline/Timeline';
import { useGameState } from '../../hooks/useGameState';
import type { Card } from '../../types/game';
import type { BattleResult, BattleSetup } from '../../types/run';
import { getEffectiveCardValues } from '../../utils/cardPreview';
import { calculateCardDamage } from '../../utils/damage';
import { isEnemyTargetCard } from '../../utils/cardTarget';
import '../Enemy/Enemy.css';
import '../Effects/Effects.css';
import '../PlayerStatus/PlayerStatus.css';
import '../Result/Result.css';
import './BattleScreen.css';

type DropTarget = 'enemy' | 'field' | 'hand' | 'reserve' | 'sell' | null;

interface HandDragState {
  isDragging: boolean;
  card: Card | null;
  sourceIndex: number;
  x: number;
  y: number;
  dropTarget: DropTarget;
  dropIndex: number | null;
}

interface DragStartState {
  x: number;
  y: number;
  time: number;
  card: Card;
  index: number;
  pointerId: number;
}

interface BattleScreenProps {
  setup?: BattleSetup | null;
  onBattleEnd?: (result: BattleResult) => void;
  onConsumeItem?: (itemId: string) => void;
}

const BattleScreen = ({ setup, onBattleEnd, onConsumeItem }: BattleScreenProps) => {
  const noop = () => {};
  const {
    gameState,
    selectedCardId,
    lastPlayedCard,
    remainingTime,
    sellingCardId,
    returningCardId,
    isPlayerHit,
    isMentalHit,
    hitEnemyId,
    shieldEffect,
    canSellInBattle,
    showStartBanner,
    battlePopups,
    enemyIntents,
    isDandoriReady,
    victoryRewardGold,
    victoryMentalRecovery,
    battleItems,
    hungryState,
    hungryFlash,
    canPlayCard,
    selectCard,
    playCardInstant,
    reserveCardById,
    sellCardById,
    useBattleItem,
    endTurn,
    retryBattle,
  } = useGameState({ setup, onBattleEnd, onConsumeItem });

  const enemyAreaRef = useRef<HTMLElement | null>(null);
  const timelineBarRef = useRef<HTMLDivElement | null>(null);
  const handAreaRef = useRef<HTMLDivElement | null>(null);
  const reserveDropRef = useRef<HTMLDivElement | null>(null);
  const sellDropRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<DragStartState | null>(null);
  const [handDrag, setHandDrag] = useState<HandDragState>({
    isDragging: false,
    card: null,
    sourceIndex: -1,
    x: 0,
    y: 0,
    dropTarget: null,
    dropIndex: null,
  });
  const [screenShake, setScreenShake] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [hoveredEnemyId, setHoveredEnemyId] = useState<string | null>(null);

  useEffect(() => {
    const heavyPlayerHit = battlePopups.some((popup) => {
      if (popup.target !== 'player' || popup.kind !== 'damage') return false;
      const damage = Number.parseInt(popup.text.replace(/[^0-9]/g, ''), 10);
      return damage >= 10;
    });
    if (!heavyPlayerHit) return;
    setScreenShake(true);
    const timer = window.setTimeout(() => setScreenShake(false), 400);
    return () => window.clearTimeout(timer);
  }, [battlePopups]);

  const detectDropTarget = (
    clientX: number,
    clientY: number,
    _startX: number,
    _startY: number,
  ): { target: DropTarget; index: number | null } => {
    const inRect = (el: HTMLElement | null, padding = 20): boolean => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return (
        clientX >= rect.left - padding &&
        clientX <= rect.right + padding &&
        clientY >= rect.top - padding &&
        clientY <= rect.bottom + padding
      );
    };
    if (inRect(enemyAreaRef.current, 20)) return { target: 'enemy', index: null };
    if (inRect(timelineBarRef.current, 24)) return { target: 'field', index: null };
    if (inRect(reserveDropRef.current, 20)) return { target: 'reserve', index: null };
    if (canSellInBattle && inRect(sellDropRef.current, 20)) return { target: 'sell', index: null };

    if (inRect(handAreaRef.current, 24)) return { target: 'hand', index: null };
    return { target: null, index: null };
  };

  const detectHoveredEnemyId = (clientX: number, clientY: number): string | null => {
    const enemyNodes = enemyAreaRef.current?.querySelectorAll<HTMLElement>('.enemy-card[data-enemy-id]');
    if (!enemyNodes?.length) return null;
    for (const node of enemyNodes) {
      const rect = node.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return node.dataset.enemyId ?? null;
      }
    }
    return null;
  };

  const onHandCardPointerDown = (
    card: Card,
    index: number,
    event: ReactPointerEvent,
  ) => {
    if (gameState.phase !== 'player_turn') return;
    if (card.type === 'status') return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setExpandedCardId(card.id);
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
      card,
      index,
      pointerId: event.pointerId,
    };
  };

  const onHandCardPointerMove = (event: ReactPointerEvent) => {
    const start = dragStartRef.current;
    if (!start || gameState.phase !== 'player_turn') return;
    if (event.pointerId !== start.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const moved = Math.hypot(dx, dy) > 10;
    const longPress = Date.now() - start.time > 150;
    if (!handDrag.isDragging && !(moved || longPress)) return;

    event.preventDefault();
    const detection = detectDropTarget(event.clientX, event.clientY, start.x, start.y);
    const enemyTargetCard = isEnemyTargetCard(start.card);
    const nextHoveredEnemyId =
      detection.target === 'enemy' && enemyTargetCard ? detectHoveredEnemyId(event.clientX, event.clientY) : null;
    setHoveredEnemyId(nextHoveredEnemyId);
    setHandDrag({
      isDragging: true,
      card: start.card,
      sourceIndex: start.index,
      x: event.clientX,
      y: event.clientY,
      dropTarget: detection.target,
      dropIndex: detection.index,
    });
  };

  const onHandCardPointerUp = (event: ReactPointerEvent) => {
    const start = dragStartRef.current;
    if (!start || gameState.phase !== 'player_turn') return;
    if (event.pointerId !== start.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setExpandedCardId(null);

    if (handDrag.isDragging && handDrag.card) {
      const enemyTargetCard = isEnemyTargetCard(handDrag.card);
      if (handDrag.dropTarget === 'enemy') {
        if (!enemyTargetCard) {
          dragStartRef.current = null;
          setHandDrag({
            isDragging: false,
            card: null,
            sourceIndex: -1,
            x: 0,
            y: 0,
            dropTarget: null,
            dropIndex: null,
          });
          return;
        }
        const aliveEnemies = gameState.enemies.filter((enemy) => enemy.currentHp > 0);
        const preferred = hoveredEnemyId ?? aliveEnemies[0]?.id ?? null;
        playCardInstant(handDrag.card.id, { type: 'enemy', enemyId: preferred });
      } else if (handDrag.dropTarget === 'field') {
        if (enemyTargetCard) {
          dragStartRef.current = null;
          setHandDrag({
            isDragging: false,
            card: null,
            sourceIndex: -1,
            x: 0,
            y: 0,
            dropTarget: null,
            dropIndex: null,
          });
          return;
        }
        playCardInstant(handDrag.card.id, { type: 'field' });
      } else if (handDrag.dropTarget === 'reserve') {
        reserveCardById(handDrag.card.id);
      } else if (handDrag.dropTarget === 'sell') {
        sellCardById(handDrag.card.id);
      }
    } else {
      // タップ時はプレビューの開閉のみ（配置はしない）
      setExpandedCardId((prev) => (prev === start.card.id ? null : start.card.id));
    }

    dragStartRef.current = null;
    setHoveredEnemyId(null);
    setHandDrag({
      isDragging: false,
      card: null,
      sourceIndex: -1,
      x: 0,
      y: 0,
      dropTarget: null,
      dropIndex: null,
    });
  };

  const onHandCardPointerCancel = () => {
    dragStartRef.current = null;
    setExpandedCardId(null);
    setHoveredEnemyId(null);
    setHandDrag({
      isDragging: false,
      card: null,
      sourceIndex: -1,
      x: 0,
      y: 0,
      dropTarget: null,
      dropIndex: null,
    });
  };

  const onCardHoverStart = (cardId: string) => {
    if (gameState.phase !== 'player_turn' || handDrag.isDragging) return;
    void cardId;
  };

  const onCardHoverEnd = () => {
    if (handDrag.isDragging) return;
  };

  const dropTimelineActive = handDrag.isDragging && handDrag.dropTarget === 'field';
  const isEnemyPreviewActive =
    handDrag.isDragging &&
    handDrag.card !== null &&
    handDrag.dropTarget === 'enemy' &&
    isEnemyTargetCard(handDrag.card) &&
    hoveredEnemyId !== null;

  const previewState = useMemo(() => {
    if (!isEnemyPreviewActive || !handDrag.card || !hoveredEnemyId) {
      return { enemyId: null, damage: 0, previewHp: 0 };
    }
    const enemy = gameState.enemies.find((entry) => entry.id === hoveredEnemyId);
    if (!enemy || enemy.currentHp <= 0) return { enemyId: null, damage: 0, previewHp: 0 };

    let previewDamage = 0;
    if (handDrag.card.type === 'attack') {
      previewDamage = calculateCardDamage(handDrag.card, gameState.player, lastPlayedCard);
      const vulnerable = enemy.statusEffects.find((status) => status.type === 'vulnerable');
      if (vulnerable) {
        previewDamage = Math.floor(previewDamage * 1.5);
      }
      const enemyBlock = (enemy as unknown as { block?: number }).block ?? 0;
      previewDamage = Math.max(0, previewDamage - enemyBlock);
    }
    return {
      enemyId: enemy.id,
      damage: previewDamage,
      previewHp: Math.max(0, enemy.currentHp - previewDamage),
    };
  }, [gameState.enemies, gameState.player, handDrag.card, hoveredEnemyId, isEnemyPreviewActive, lastPlayedCard]);

  const reserveFull = gameState.reserved.length >= 2;
  const startTitle = useMemo(
    () => `── ${gameState.enemies.map((enemy) => enemy.name).join(' / ')} 現る ──`,
    [gameState.enemies],
  );

  return (
    <main
      className={`battle-screen ${screenShake ? 'battle-screen--shake' : ''} ${
        gameState.player.mental <= 3 ? 'battle-screen--low-mental' : ''
      }`}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement;
        if (!target.closest('.hand-area') && expandedCardId) {
          setExpandedCardId(null);
        }
      }}
    >
      <div className={isMentalHit ? 'mental-hit-flash' : ''} />
      <div
        className={
          hungryFlash === 'awakened'
            ? 'hungry-flash hungry-flash--awakened'
            : hungryFlash === 'hungry'
              ? 'hungry-flash'
              : ''
        }
      />
      <section
        className={`enemy-placeholder battle-enemy-area ${
          handDrag.isDragging && handDrag.dropTarget === 'enemy' ? 'drop-active' : ''
        }`}
        ref={enemyAreaRef}
      >
        <EnemyDisplay
          enemies={gameState.enemies}
          intents={enemyIntents}
          hitEnemyId={hitEnemyId}
          previewTargetEnemyId={previewState.enemyId}
          previewDamage={previewState.damage}
          previewHp={previewState.previewHp}
        />
      </section>

      <div className="battle-spacer" />

      <section className="player-area">
        <div className="battle-timebar-row">
          <Timeline
            maxTime={gameState.maxTime}
            remainingTime={remainingTime}
            isDropActive={dropTimelineActive}
            isEnding={gameState.phase !== 'player_turn'}
            onEndTurn={endTurn}
            timelineBarRef={timelineBarRef}
          />
        </div>

        <div className="battle-status-row">
          <PlayerStatus
            player={gameState.player}
            toolSlots={gameState.toolSlots}
            battleItems={battleItems}
            canUseItems={gameState.phase === 'player_turn'}
            onUseItem={useBattleItem}
            drawPileCount={gameState.drawPile.length}
            discardPileCount={gameState.discardPile.length}
            isPlayerHit={isPlayerHit}
            hungryState={hungryState}
          />
        </div>

        <div className="battle-hand-area">
          <Hand
            hand={gameState.hand}
            player={gameState.player}
            usedTime={gameState.usedTime}
            lastPlayedCard={lastPlayedCard}
            selectedCardId={selectedCardId}
            maxTime={gameState.maxTime}
            isLocked={gameState.phase !== 'player_turn'}
            sellingCardId={sellingCardId}
            returningCardId={returningCardId}
            onSelectCard={selectCard}
            onCardPointerDown={onHandCardPointerDown}
            onCardPointerMove={onHandCardPointerMove}
            onCardPointerUp={onHandCardPointerUp}
            onCardPointerCancel={onHandCardPointerCancel}
            onCardHoverStart={onCardHoverStart}
            onCardHoverEnd={onCardHoverEnd}
            draggedCardId={handDrag.card?.id ?? null}
            expandedCardId={expandedCardId}
            handAreaRef={handAreaRef}
          />
          <DandoriIndicator count={isDandoriReady ? 1 : 0} />
        </div>

        <div className="battle-reserve-area">
          <ActionBar
            reserved={gameState.reserved}
            jobId={gameState.player.jobId}
            isDragging={handDrag.isDragging}
            activeDropTarget={handDrag.dropTarget}
            reserveFull={reserveFull}
            reserveDropRef={reserveDropRef}
          />
        </div>
      </section>

      <div className="effects-layer">
        <DamagePopup popups={battlePopups} />
        <ShieldEffect active={shieldEffect} />
      </div>

      {handDrag.isDragging && handDrag.card && (
        <div
          className={`drag-floating-card ${!canPlayCard(handDrag.card) ? 'invalid' : ''}`}
          style={{ left: handDrag.x, top: handDrag.y }}
        >
          <CardComponent
            card={handDrag.card}
            jobId={gameState.player.jobId}
            selected
            disabled={false}
            locked={false}
            isSelling={false}
            isReturning={false}
            isGhost={false}
            isDragging
            isDragUnavailable={false}
            effectiveValues={getEffectiveCardValues(handDrag.card, gameState.player, lastPlayedCard)}
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

      {showStartBanner && (
        <div className="start-banner">
          <p>{startTitle}</p>
          <h3>BATTLE START</h3>
        </div>
      )}
      {gameState.phase === 'victory' && (
        <VictoryScreen
          onRetry={retryBattle}
          rewardGold={victoryRewardGold}
          totalGold={gameState.player.gold}
          mentalRecovery={victoryMentalRecovery}
        />
      )}
      {gameState.phase === 'defeat' && <DefeatScreen onRetry={retryBattle} />}
    </main>
  );
};

export default BattleScreen;
