import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import ActionBar from '../ActionBar/ActionBar';
import DamagePopup from '../Effects/DamagePopup';
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
import type { EffectiveCardValues } from '../../utils/cardPreview';
import { calculateCardDamage } from '../../utils/damage';
import { isEnemyTargetCard } from '../../utils/cardTarget';
import '../Enemy/Enemy.css';
import '../Effects/Effects.css';
import '../PlayerStatus/PlayerStatus.css';
import '../Result/Result.css';
import './BattleScreen.css';

type DropTarget = 'enemy' | 'field' | 'timebar' | 'hand' | 'reserve' | 'sell' | null;
type PileView = 'draw' | 'discard' | 'exhaust' | null;

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

const DRAG_CARD_HEIGHT = 168;
const DRAG_Y_OFFSET = -DRAG_CARD_HEIGHT * 0.65;
const DRAG_PROBE_Y_RATIOS = [0, 0.5, 1] as const;
const getAutoUpgradeType = (card: Card): 'damage' | 'block' | 'time' => {
  if ((card.damage ?? 0) > 0) return 'damage';
  if ((card.block ?? 0) > 0) return 'block';
  return 'time';
};
const getUpgradePreviewText = (card: Card): string => {
  const type = getAutoUpgradeType(card);
  if (type === 'damage') {
    const before = card.damage ?? 0;
    return `ダメージ ${before}→${before + 3}`;
  }
  if (type === 'block') {
    const before = card.block ?? 0;
    return `ブロック ${before}→${before + 3}`;
  }
  return `所要時間 ${card.timeCost}→${Math.max(1, card.timeCost - 1)}秒`;
};

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
    showRevivalEffect,
    pendingHandUpgradeCount,
    upgradeableHandCards,
    canPlayCard,
    selectCard,
    playCardInstant,
    reserveCardById,
    sellCardById,
    useBattleItem,
    upgradeHandCardById,
    skipHandUpgradeSelection,
    endTurn,
    retryBattle,
  } = useGameState({ setup, onBattleEnd, onConsumeItem });

  const enemyAreaRef = useRef<HTMLElement | null>(null);
  const timebarRowRef = useRef<HTMLDivElement | null>(null);
  const reserveAreaRef = useRef<HTMLDivElement | null>(null);
  const timelineBarRef = useRef<HTMLDivElement | null>(null);
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
  const [isHoveringTimebar, setIsHoveringTimebar] = useState(false);
  const [showPile, setShowPile] = useState<PileView>(null);
  const [attackEffect, setAttackEffect] = useState<{ x: number; y: number } | null>(null);
  const [skillEffect, setSkillEffect] = useState(false);
  const attackEffectTimerRef = useRef<number | null>(null);
  const skillEffectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const heavyPlayerHit = battlePopups.some((popup) => {
      if (popup.target !== 'player' || popup.kind !== 'damage') return false;
      const damage = Number.parseInt(popup.text.replace(/[^0-9]/g, ''), 10);
      return damage >= 10;
    });
    if (!heavyPlayerHit) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScreenShake(true);
    const timer = window.setTimeout(() => setScreenShake(false), 400);
    return () => window.clearTimeout(timer);
  }, [battlePopups]);

  useEffect(
    () => () => {
      if (attackEffectTimerRef.current !== null) window.clearTimeout(attackEffectTimerRef.current);
      if (skillEffectTimerRef.current !== null) window.clearTimeout(skillEffectTimerRef.current);
    },
    [],
  );

  const detectDropTarget = (
    clientX: number,
    clientY: number,
    card: Card,
  ): { target: DropTarget; index: number | null } => {
    const isInRect = (x: number, y: number, rect: DOMRect): boolean =>
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

    const enemyRect = enemyAreaRef.current?.getBoundingClientRect();
    if (enemyRect && isInRect(clientX, clientY, enemyRect)) {
      return { target: 'enemy', index: null };
    }

    const reserveRect = reserveAreaRef.current?.getBoundingClientRect();
    if (reserveRect && isInRect(clientX, clientY, reserveRect)) {
      return { target: 'reserve', index: null };
    }

    const timebarRect = timebarRowRef.current?.getBoundingClientRect();
    if (timebarRect && isInRect(clientX, clientY, timebarRect)) {
      return { target: isEnemyTargetCard(card) ? null : 'timebar', index: null };
    }

    const sellRect = canSellInBattle ? sellDropRef.current?.getBoundingClientRect() : null;
    if (sellRect && isInRect(clientX, clientY, sellRect)) {
      return { target: 'sell', index: null };
    };
    return { target: 'field', index: null };
  };

  const getDragProbePositions = (clientX: number, clientY: number) => {
    const cardTopY = clientY + DRAG_Y_OFFSET;
    return DRAG_PROBE_Y_RATIOS.map((ratio) => ({
      x: clientX,
      y: cardTopY + DRAG_CARD_HEIGHT * ratio,
    }));
  };

  const resolveDropTargetFromProbes = (
    probes: { x: number; y: number }[],
    card: Card,
  ) => {
    const detections = probes.map((probe) => detectDropTarget(probe.x, probe.y, card));
    const priority: DropTarget[] = ['enemy', 'reserve', 'timebar', 'sell'];
    for (const target of priority) {
      const found = detections.find((detection) => detection.target === target);
      if (found) return found;
    }
    const nullFound = detections.find((detection) => detection.target === null);
    if (nullFound) return nullFound;
    return { target: 'field' as const, index: null };
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

  const getEnemyEffectPosition = (enemyId: string | null): { x: number; y: number } => {
    const node = enemyId
      ? enemyAreaRef.current?.querySelector<HTMLElement>(`.enemy-card[data-enemy-id="${enemyId}"]`)
      : null;
    if (node) {
      const rect = node.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    const enemyAreaRect = enemyAreaRef.current?.getBoundingClientRect();
    if (enemyAreaRect) {
      return {
        x: enemyAreaRect.left + enemyAreaRect.width / 2,
        y: enemyAreaRect.top + enemyAreaRect.height / 2,
      };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight * 0.35 };
  };

  const triggerAttackEffect = (enemyId: string | null) => {
    const position = getEnemyEffectPosition(enemyId);
    setAttackEffect(position);
    if (attackEffectTimerRef.current !== null) window.clearTimeout(attackEffectTimerRef.current);
    attackEffectTimerRef.current = window.setTimeout(() => {
      setAttackEffect(null);
      attackEffectTimerRef.current = null;
    }, 500);
  };

  const triggerSkillEffect = () => {
    setSkillEffect(true);
    if (skillEffectTimerRef.current !== null) window.clearTimeout(skillEffectTimerRef.current);
    skillEffectTimerRef.current = window.setTimeout(() => {
      setSkillEffect(false);
      skillEffectTimerRef.current = null;
    }, 400);
  };

  const onHandCardPointerDown = (
    card: Card,
    index: number,
    event: ReactPointerEvent,
  ) => {
    if (gameState.phase !== 'player_turn') return;
    if (pendingHandUpgradeCount > 0) return;
    if (card.type === 'status') return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setExpandedCardId(card.id);
    setIsHoveringTimebar(false);
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
    if (pendingHandUpgradeCount > 0) return;
    if (event.pointerId !== start.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const moved = Math.hypot(dx, dy) > 10;
    const longPress = Date.now() - start.time > 150;
    if (!handDrag.isDragging && !(moved || longPress)) return;

    event.preventDefault();
    if (!canPlayCard(start.card)) {
      const probes = getDragProbePositions(event.clientX, event.clientY);
      const detection = resolveDropTargetFromProbes(probes, start.card);
      const reserveOnlyTarget: DropTarget = detection.target === 'reserve' ? 'reserve' : null;
      setIsHoveringTimebar(false);
      setHoveredEnemyId(null);
      setHandDrag({
        isDragging: true,
        card: start.card,
        sourceIndex: start.index,
        x: event.clientX,
        y: event.clientY,
        dropTarget: reserveOnlyTarget,
        dropIndex: null,
      });
      return;
    }
    const probes = getDragProbePositions(event.clientX, event.clientY);
    const detection = resolveDropTargetFromProbes(probes, start.card);
    const enemyTargetCard = isEnemyTargetCard(start.card);
    const timebarRect = timebarRowRef.current?.getBoundingClientRect();
    const isOverTimebar = timebarRect
      ? probes.some(
          (probe) =>
            probe.x >= timebarRect.left &&
            probe.x <= timebarRect.right &&
            probe.y >= timebarRect.top &&
            probe.y <= timebarRect.bottom,
        )
      : false;
    setIsHoveringTimebar(isOverTimebar && !enemyTargetCard);
    const hoveredProbe =
      detection.target === 'enemy' && enemyTargetCard
        ? probes.find((probe) => detectHoveredEnemyId(probe.x, probe.y) !== null) ?? null
        : null;
    const nextHoveredEnemyId = hoveredProbe ? detectHoveredEnemyId(hoveredProbe.x, hoveredProbe.y) : null;
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
    if (pendingHandUpgradeCount > 0) return;
    if (event.pointerId !== start.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setExpandedCardId(null);
    setIsHoveringTimebar(false);

    if (handDrag.isDragging && handDrag.card) {
      if (!canPlayCard(handDrag.card)) {
        const probes = getDragProbePositions(event.clientX, event.clientY);
        const finalDetection = resolveDropTargetFromProbes(probes, handDrag.card);
        if (finalDetection.target === 'reserve') {
          reserveCardById(handDrag.card.id);
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
        return;
      }
      const probes = getDragProbePositions(event.clientX, event.clientY);
      const finalDetection = resolveDropTargetFromProbes(probes, handDrag.card);
      const finalTarget = finalDetection.target;
      const enemyTargetCard = isEnemyTargetCard(handDrag.card);
      if (finalTarget === 'enemy') {
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
        const finalHoveredEnemyId =
          probes
            .map((probe) => detectHoveredEnemyId(probe.x, probe.y))
            .find((enemyId) => enemyId !== null) ?? null;
        const preferred = finalHoveredEnemyId ?? hoveredEnemyId ?? aliveEnemies[0]?.id ?? null;
        const played = playCardInstant(handDrag.card.id, { type: 'enemy', enemyId: preferred });
        if (played && handDrag.card.type === 'attack') {
          triggerAttackEffect(preferred);
        }
      } else if (finalTarget === 'field') {
        // フィールド全体は発動しない（静かに手札へ戻す）
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
      } else if (finalTarget === 'timebar') {
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
        const played = playCardInstant(handDrag.card.id, { type: 'field' });
        if (played && handDrag.card.type === 'skill') {
          triggerSkillEffect();
        }
      } else if (finalTarget === 'reserve') {
        reserveCardById(handDrag.card.id);
      } else if (finalTarget === 'sell') {
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
    setIsHoveringTimebar(false);
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
  const currentPileCards = useMemo(() => {
    if (showPile === 'draw') return gameState.drawPile;
    if (showPile === 'discard') return gameState.discardPile;
    if (showPile === 'exhaust') return gameState.exhaustedCards;
    return [];
  }, [showPile, gameState.drawPile, gameState.discardPile, gameState.exhaustedCards]);
  const startTitle = useMemo(
    () => `── ${gameState.enemies.map((enemy) => enemy.name).join(' / ')} 現る ──`,
    [gameState.enemies],
  );
  const jobId = gameState.player.jobId;
  const isScaffoldHigh = jobId === 'carpenter' && gameState.player.scaffold >= 5;
  const isCookingHigh = jobId === 'cook' && gameState.player.cookingGauge >= 5;
  const isUnemployedBattle = gameState.player.jobId === 'unemployed';
  const hungryVisualState = isUnemployedBattle ? hungryState : 'normal';
  const hungryEffect = isUnemployedBattle ? hungryFlash : null;

  return (
    <main
      className={`battle-screen ${screenShake ? 'battle-screen--shake' : ''} ${
        gameState.player.mental <= 3 ? 'battle-screen--low-mental' : ''
      } ${hungryVisualState === 'hungry' ? 'battle-screen--hungry' : ''} ${
        hungryVisualState === 'awakened' ? 'battle-screen--awakened' : ''
      } ${hungryEffect === 'hungry' ? 'battle-screen--hungry-flash' : ''} ${
        hungryEffect === 'awakened' ? 'battle-screen--awakened-flash' : ''
      }`}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement;
        if (!target.closest('.hand-area') && expandedCardId) {
          setExpandedCardId(null);
        }
      }}
    >
      <div
        className={`battle-job-aura battle-job-aura--${jobId} ${isScaffoldHigh ? 'scaffold-high' : ''} ${
          isCookingHigh ? 'cooking-high' : ''
        }`}
      />
      <div className={isMentalHit ? 'mental-hit-flash' : ''} />
      {hungryEffect && (
        <div className={`hungry-popup hungry-popup--${hungryEffect}`}>
          {hungryEffect === 'hungry' ? '🔥 ハングリー！' : '⚡ 覚醒！'}
        </div>
      )}
      {showRevivalEffect && (
        <div className="revival-effect">
          <span className="revival-text">🔄 七転び八起き！</span>
        </div>
      )}
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
          />
        </div>

        <div
          className={`battle-timebar-row ${isHoveringTimebar ? 'timebar-row--active' : ''}`}
          ref={timebarRowRef}
        >
          <Timeline
            maxTime={gameState.maxTime}
            remainingTime={remainingTime}
            isDropActive={false}
            isEnding={gameState.phase !== 'player_turn'}
            onEndTurn={endTurn}
            timelineBarRef={timelineBarRef}
          />
        </div>

        <div className="battle-reserve-area" ref={reserveAreaRef}>
          <ActionBar
            reserved={gameState.reserved}
            jobId={gameState.player.jobId}
            isDragging={handDrag.isDragging}
            activeDropTarget={handDrag.dropTarget}
            reserveFull={reserveFull}
            reserveDropRef={reserveDropRef}
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
            isPreparationActive={isDandoriReady}
            hungryState={hungryState}
            onOpenDrawPile={() => setShowPile('draw')}
            onOpenDiscardPile={() => setShowPile('discard')}
          />
        </div>
      </section>

      <div className="effects-layer">
        <DamagePopup popups={battlePopups} />
        <ShieldEffect active={shieldEffect} />
        {attackEffect && (
          <div className="effect-attack" style={{ left: attackEffect.x, top: attackEffect.y }}>
            <div className="effect-slash" />
          </div>
        )}
        {skillEffect && <div className="effect-skill" />}
      </div>

      {gameState.shuffleAnimation && <div className="shuffle-popup">🔀 シャッフル！</div>}

      {handDrag.isDragging && handDrag.card && (
        <div
          className={`drag-floating-card ${!canPlayCard(handDrag.card) ? 'invalid' : ''}`}
          style={{ left: handDrag.x, top: handDrag.y + DRAG_Y_OFFSET }}
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
      {showPile && (
        <div className="battle-deck-overlay" onClick={() => setShowPile(null)}>
          <div className="battle-deck-modal" onClick={(event) => event.stopPropagation()}>
            <div className="battle-deck-modal-header">
              <h2 className="battle-deck-modal-title">
                {showPile === 'draw'
                  ? `山札 (${gameState.drawPile.length}枚)`
                  : showPile === 'discard'
                    ? `捨て札 (${gameState.discardPile.length}枚)`
                    : `除外 (${gameState.exhaustedCards.length}枚)`}
              </h2>
              <button type="button" className="battle-btn-close" onClick={() => setShowPile(null)}>
                ✕
              </button>
            </div>
            <div className="battle-pile-tabs">
              <button
                type="button"
                className={`battle-pile-tab ${showPile === 'draw' ? 'battle-pile-tab--active' : ''}`}
                onClick={() => setShowPile('draw')}
              >
                山札 ({gameState.drawPile.length})
              </button>
              <button
                type="button"
                className={`battle-pile-tab ${showPile === 'discard' ? 'battle-pile-tab--active' : ''}`}
                onClick={() => setShowPile('discard')}
              >
                捨て札 ({gameState.discardPile.length})
              </button>
              <button
                type="button"
                className={`battle-pile-tab ${showPile === 'exhaust' ? 'battle-pile-tab--active' : ''}`}
                onClick={() => setShowPile('exhaust')}
              >
                除外 ({gameState.exhaustedCards.length})
              </button>
            </div>
            <div className="battle-deck-card-grid card-display-grid">
              {currentPileCards.map((card, idx) => (
                <div
                  key={`${card.id}_${idx}`}
                  className="battle-deck-card-item card-display-item"
                  style={
                    {
                      '--hand-card-width': '90px',
                      '--hand-card-height': '144px',
                    } as CSSProperties
                  }
                >
                  <CardComponent
                    card={card}
                    jobId={gameState.player.jobId}
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
              ))}
              {currentPileCards.length === 0 && <p className="battle-pile-empty">カードがありません</p>}
            </div>
          </div>
        </div>
      )}
      {pendingHandUpgradeCount > 0 && (
        <div className="battle-deck-overlay" onClick={skipHandUpgradeSelection}>
          <div className="battle-deck-modal" onClick={(event) => event.stopPropagation()}>
            <div className="battle-deck-modal-header">
              <h2 className="battle-deck-modal-title">リフォーム：強化するカードを選択</h2>
              <button type="button" className="battle-btn-close" onClick={skipHandUpgradeSelection}>
                ✕
              </button>
            </div>
            <div className="battle-upgrade-guide">
              残り {pendingHandUpgradeCount} 枚
            </div>
            <div className="battle-deck-card-grid card-display-grid">
              {upgradeableHandCards.map((card, idx) => (
                <button
                  key={`${card.id}_${idx}`}
                  type="button"
                  className="battle-upgrade-card-button"
                  onClick={() => {
                    upgradeHandCardById(card.id);
                  }}
                  style={
                    {
                      '--hand-card-width': '90px',
                      '--hand-card-height': '144px',
                    } as CSSProperties
                  }
                >
                  <CardComponent
                    card={card}
                    jobId={gameState.player.jobId}
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
                  <span className="battle-upgrade-preview">{getUpgradePreviewText(card)}</span>
                </button>
              ))}
              {upgradeableHandCards.length === 0 && <p className="battle-pile-empty">強化できるカードがありません</p>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default BattleScreen;
