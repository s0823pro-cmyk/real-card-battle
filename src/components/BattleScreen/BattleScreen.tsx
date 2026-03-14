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
    coinBursts,
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
    setExpandedCardId(null);
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
        const enemyRect = enemyAreaRef.current?.getBoundingClientRect();
        const aliveEnemies = gameState.enemies.filter((enemy) => enemy.currentHp > 0);
        const segment = enemyRect ? (handDrag.x - enemyRect.left) / Math.max(1, enemyRect.width) : 0;
        const roughIndex = Math.min(
          Math.max(0, Math.floor(segment * Math.max(1, gameState.enemies.length))),
          Math.max(0, gameState.enemies.length - 1),
        );
        const preferred = gameState.enemies[roughIndex]?.id ?? aliveEnemies[0]?.id ?? null;
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
        className={`enemy-placeholder ${
          handDrag.isDragging && handDrag.dropTarget === 'enemy' ? 'drop-active' : ''
        }`}
        ref={enemyAreaRef}
      >
        {battleItems.length > 0 && gameState.phase === 'player_turn' && (
          <div className="battle-item-bar">
            {battleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="battle-item-btn"
                onClick={() => useBattleItem(item.id)}
                title={item.description}
              >
                <span>{item.icon}</span>
                <small>{item.name}</small>
              </button>
            ))}
          </div>
        )}
        <EnemyDisplay enemies={gameState.enemies} intents={enemyIntents} hitEnemyId={hitEnemyId} />
      </section>

      <div className="battle-spacer" />

      <section className="player-area">
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

        <Timeline
          maxTime={gameState.maxTime}
          remainingTime={remainingTime}
          isDropActive={dropTimelineActive}
          isEnding={gameState.phase !== 'player_turn'}
          onEndTurn={endTurn}
          timelineBarRef={timelineBarRef}
        />

        <PlayerStatus
          player={gameState.player}
          toolSlots={gameState.toolSlots}
          isPlayerHit={isPlayerHit}
          hungryState={hungryState}
        />

        <ActionBar
          reserved={gameState.reserved}
          gold={gameState.player.gold}
          turn={gameState.turn}
          drawPileCount={gameState.drawPile.length}
          discardPileCount={gameState.discardPile.length}
          phaseText={gameState.phase}
          isDragging={handDrag.isDragging}
          activeDropTarget={handDrag.dropTarget}
          reserveFull={reserveFull}
          dragSellValue={canSellInBattle ? handDrag.card?.sellValue ?? null : null}
          coinBurstIds={coinBursts.map((burst) => burst.id)}
          reserveDropRef={reserveDropRef}
          sellDropRef={sellDropRef}
        />
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
            selected
            disabled={false}
            locked={false}
            isSelling={false}
            isReturning={false}
            isGhost={false}
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
