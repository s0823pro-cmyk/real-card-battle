import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
} from 'react';
import { GlossaryModal } from '../GlossaryModal/GlossaryModal';
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
import type { Card, GameState } from '../../types/game';
import type { BattleResult, BattleSetup, Omamori } from '../../types/run';
import { getEffectiveCardValues } from '../../utils/cardPreview';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import { calculateEffectiveDamage } from '../../utils/damage';
import { applyMultiplierAndBoostToCard, getEnhancedCardForPlay } from '../../utils/playCardMultipliers';
import { isEnemyTargetCard } from '../../utils/cardTarget';
import { useAudioContext } from '../../contexts/AudioContext';
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
  onTurnStart?: (state: GameState) => void;
  onBattleFinished?: () => void;
  initialGameState?: GameState | null;
  /** 1ラン1回のリワード広告使用済み */
  rewardAdUsed?: boolean;
  /** リワード使用時（HP回復後にラン状態を更新） */
  onUseRewardAd?: () => void;
  /** 所持お守り（ヘッダー表示） */
  omamoris?: Omamori[];
}

const DRAG_CARD_HEIGHT = 168;
const DRAG_CARD_WIDTH = 105;
// 表示オフセット：指の位置がカード下部になるよう上にずらす
const DRAG_DISPLAY_Y_OFFSET = -(DRAG_CARD_HEIGHT - 40);
// 判定オフセット：カード上端基準（複数プローブで使用）
const DRAG_JUDGE_Y_OFFSET = DRAG_DISPLAY_Y_OFFSET;
type ReserveConfirmState = { card: Card; visible: boolean } | null;

const BOSS_IDS = ['monster_customer', 'evil_ceo', 'world_tree_warden'];
const getAutoUpgradeType = (card: Card): 'damage' | 'block' | 'time' => {
  if ((card.damage ?? 0) > 0) return 'damage';
  if ((card.block ?? 0) > 0) return 'block';
  return 'time';
};
const getUpgradePreviewText = (card: Card): string => {
  const type = getAutoUpgradeType(card);
  if (type === 'damage') {
    const before = card.damage ?? 0;
    return `ダメージ ${before} → ${before + 3}`;
  }
  if (type === 'block') {
    const before = card.block ?? 0;
    return `ブロック ${before} → ${before + 3}`;
  }
  return `所要時間 ${card.timeCost} → ${Math.max(1, card.timeCost - 1)}秒`;
};

const BattleOmamoriItem = ({ omamori }: { omamori: Omamori }) => {
  const ref = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updateTooltipPos = () => {
    if (!ref.current || !tooltipRef.current) return;
    const rect = ref.current.getBoundingClientRect();
    tooltipRef.current.style.left = `${Math.min(rect.left, window.innerWidth - 150)}px`;
    tooltipRef.current.style.top = `${rect.bottom + 6}px`;
  };

  const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    updateTooltipPos();
    ref.current?.classList.add('battle-omamori-item--active');
  };
  const handleTouchEnd = () => {
    setTimeout(() => ref.current?.classList.remove('battle-omamori-item--active'), 1500);
  };

  return (
    <div
      ref={ref}
      className="battle-omamori-item"
      onMouseEnter={updateTooltipPos}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {omamori.imageUrl ? (
        <img src={omamori.imageUrl} alt={omamori.name} className="battle-omamori-img" />
      ) : (
        <span className="battle-omamori-icon">{omamori.icon}</span>
      )}
      <div ref={tooltipRef} className="battle-omamori-tooltip">
        <p className="battle-omamori-tooltip-name">{omamori.name}</p>
        <p className="battle-omamori-tooltip-desc">{omamori.description}</p>
      </div>
    </div>
  );
};

const BattleScreen = ({
  setup,
  onBattleEnd,
  onConsumeItem,
  onTurnStart,
  onBattleFinished,
  initialGameState,
  rewardAdUsed = false,
  onUseRewardAd,
  omamoris,
}: BattleScreenProps) => {
  const noop = () => {};
  const { playSe, playBgm } = useAudioContext();
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
    doubleNextCharges,
    attackItemBuff,
    canPlayCard,
    selectCard,
    playCardInstant,
    reserveCardById,
    sellCardById,
    useBattleItem,
    upgradeHandCardById,
    skipHandUpgradeSelection,
    endTurn,
    concedeBattle,
    retryBattle,
    applyRewardAdHeal,
  } = useGameState({ setup, onBattleEnd, onConsumeItem, onTurnStart, onBattleFinished, initialGameState });

  const isBoss = useMemo(
    () => gameState.enemies.some((e) => BOSS_IDS.includes(e.templateId)),
    [gameState.enemies],
  );

  const enemyAreaRef = useRef<HTMLElement | null>(null);
  const timebarRowRef = useRef<HTMLDivElement | null>(null);
  const reserveAreaRef = useRef<HTMLDivElement | null>(null);
  const timelineBarRef = useRef<HTMLDivElement | null>(null);
  const reserveDropRef = useRef<HTMLDivElement | null>(null);
  const sellDropRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<DragStartState | null>(null);
  const activeTouchPointerIdRef = useRef<number | null>(null);
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
  const [reserveConfirm, setReserveConfirm] = useState<ReserveConfirmState>(null);
  const [showBattleSettings, setShowBattleSettings] = useState(false);
  const [showBattleGlossary, setShowBattleGlossary] = useState(false);
  /** タイムラインはゲージ型に固定 */
  const timelineGaugeStyle = 'bar' as const;
  const [attackEffect, setAttackEffect] = useState<{ x: number; y: number } | null>(null);
  const [skillEffect, setSkillEffect] = useState(false);
  const attackEffectTimerRef = useRef<number | null>(null);
  const skillEffectTimerRef = useRef<number | null>(null);
  const lastCardPlayTimeRef = useRef<number>(0);
  const CARD_PLAY_COOLDOWN = 600;

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

  useEffect(() => {
    if (gameState.phase === 'victory' || gameState.phase === 'defeat') {
      setShowBattleSettings(false);
    }
  }, [gameState.phase]);

  useEffect(() => {
    playBgm(isBoss ? 'boss' : 'battle');
    return () => {
      playBgm('none');
    };
  }, [isBoss, playBgm]);

  const prevPopupsLenRef = useRef(0);
  useEffect(() => {
    const newPopups = battlePopups.slice(prevPopupsLenRef.current);
    prevPopupsLenRef.current = battlePopups.length;
    for (const popup of newPopups) {
      if (popup.target === 'player' && popup.kind === 'damage') {
        playSe('damage');
      }
    }
  }, [battlePopups, playSe]);

  const detectDropTarget = (
    clientX: number,
    clientY: number,
    card: Card,
  ): { target: DropTarget; index: number | null } => {
    const isInRect = (x: number, y: number, rect: DOMRect, padding = 0): boolean =>
      x >= rect.left - padding &&
      x <= rect.right + padding &&
      y >= rect.top - padding &&
      y <= rect.bottom + padding;

    const enemyRect = enemyAreaRef.current?.getBoundingClientRect();
    if (enemyRect && isInRect(clientX, clientY, enemyRect, 8)) {
      if (isEnemyTargetCard(card)) return { target: 'enemy', index: null };
    }

    // タイムバーを温存より先に判定（重なり部分での誤反応を防ぐ）
    const timebarRect = timebarRowRef.current?.getBoundingClientRect();
    if (timebarRect && isInRect(clientX, clientY, timebarRect, 4)) {
      if (!isEnemyTargetCard(card)) return { target: 'timebar', index: null };
    }

    const sellRect = canSellInBattle ? sellDropRef.current?.getBoundingClientRect() : null;
    if (sellRect && isInRect(clientX, clientY, sellRect)) {
      return { target: 'sell', index: null };
    }

    return { target: 'field', index: null };
  };

  // 判定点：カード全面を細かいメッシュで判定
  const getDragProbePositions = (clientX: number, clientY: number) => {
    const PROBE_STEP_X = 10;
    const PROBE_STEP_Y = 12;
    const EDGE_PADDING_X = 4;
    const EDGE_PADDING_Y = 4;
    const leftX = clientX - DRAG_CARD_WIDTH / 2 + EDGE_PADDING_X;
    const rightX = clientX + DRAG_CARD_WIDTH / 2 - EDGE_PADDING_X;
    const topY = clientY + DRAG_JUDGE_Y_OFFSET;
    const bottomY = topY + DRAG_CARD_HEIGHT - EDGE_PADDING_Y;
    const probes: { x: number; y: number }[] = [];

    for (let y = topY + EDGE_PADDING_Y; y <= bottomY; y += PROBE_STEP_Y) {
      for (let x = leftX; x <= rightX; x += PROBE_STEP_X) {
        probes.push({ x, y });
      }
      probes.push({ x: rightX, y });
    }

    for (let x = leftX; x <= rightX; x += PROBE_STEP_X) {
      probes.push({ x, y: bottomY });
    }
    probes.push({ x: rightX, y: bottomY });

    return probes;
  };

  const resolveDropTargetFromProbes = (
    probes: { x: number; y: number }[],
    card: Card,
    clientX: number,
    clientY: number,
  ): { target: DropTarget; index: number | null } => {
    const detections = probes.map((probe) => detectDropTarget(probe.x, probe.y, card));

    const enemyFound = detections.find((detection) => detection.target === 'enemy');
    if (enemyFound) return enemyFound;

    // 温存：reserveArea（温存枠）の実表示矩形に合わせて判定（タイムバーと横並びのため reserveRect のみ使用）
    // 判定はカード上部（上中央）がゾーン内に入った場合のみ
    const reserveRect = reserveAreaRef.current?.getBoundingClientRect();
    if (reserveRect) {
      const cardTop = clientY + DRAG_DISPLAY_Y_OFFSET;
      const anchorX = clientX; // カード上中央
      const anchorY = cardTop + 10;
      const zoneTop = reserveRect.top + 4;
      const zoneBottom = reserveRect.bottom - 4;
      const zoneLeft = reserveRect.left + 4;
      const zoneRight = reserveRect.right - 4;
      const inReserveLeftZone =
        anchorX >= zoneLeft &&
        anchorX <= zoneRight &&
        anchorY >= zoneTop &&
        anchorY <= zoneBottom;
      if (inReserveLeftZone) {
        return { target: 'reserve' as const, index: null };
      }
    }

    const timebarFound = detections.find((detection) => detection.target === 'timebar');
    if (timebarFound) return timebarFound;

    const sellFound = detections.find((detection) => detection.target === 'sell');
    if (sellFound) return sellFound;

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
    const target = event.target as HTMLElement;
    if (target.closest('.battle-slots-row')) return;
    if (gameState.phase !== 'player_turn') return;
    if (pendingHandUpgradeCount > 0) return;
    if (card.type === 'status') return;
    if (!event.isPrimary) return;
    if (event.pointerType === 'touch') {
      if (activeTouchPointerIdRef.current !== null) return;
      activeTouchPointerIdRef.current = event.pointerId;
      event.stopPropagation();
    }
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
    if (event.pointerType === 'touch' && activeTouchPointerIdRef.current !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const moved = Math.hypot(dx, dy) > 10;
    const longPress = Date.now() - start.time > 150;
    if (!handDrag.isDragging && !(moved || longPress)) return;

    event.preventDefault();
    if (event.pointerType === 'touch') {
      event.stopPropagation();
    }
    if (!canPlayCard(start.card)) {
      const probes = getDragProbePositions(event.clientX, event.clientY);
      const detection = resolveDropTargetFromProbes(probes, start.card, event.clientX, event.clientY);
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
    const detection = resolveDropTargetFromProbes(probes, start.card, event.clientX, event.clientY);
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

  const resetDragInteraction = useCallback(() => {
    dragStartRef.current = null;
    activeTouchPointerIdRef.current = null;
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
  }, []);

  const onHandCardPointerUp = (event: ReactPointerEvent) => {
    const start = dragStartRef.current;
    if (!start) {
      if (handDrag.isDragging) resetDragInteraction();
      return;
    }
    if (event.pointerId !== start.pointerId) return;
    if (event.pointerType === 'touch' && activeTouchPointerIdRef.current !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (event.pointerType === 'touch') {
      event.stopPropagation();
      activeTouchPointerIdRef.current = null;
    }

    if (gameState.phase !== 'player_turn' || pendingHandUpgradeCount > 0) {
      resetDragInteraction();
      return;
    }

    setExpandedCardId(null);
    setIsHoveringTimebar(false);

    if (handDrag.isDragging && handDrag.card) {
      if (!canPlayCard(handDrag.card)) {
        const probes = getDragProbePositions(event.clientX, event.clientY);
        const finalDetection = resolveDropTargetFromProbes(probes, handDrag.card, event.clientX, event.clientY);
        if (finalDetection.target === 'reserve') {
          setReserveConfirm({ card: handDrag.card, visible: true });
        }
        resetDragInteraction();
        return;
      }

      const probes = getDragProbePositions(event.clientX, event.clientY);
      const finalDetection = resolveDropTargetFromProbes(probes, handDrag.card, event.clientX, event.clientY);
      const finalTarget = finalDetection.target;
      const enemyTargetCard = isEnemyTargetCard(handDrag.card);

      const now = Date.now();
      const isPlayTarget = finalTarget === 'enemy' || finalTarget === 'timebar';
      if (isPlayTarget && now - lastCardPlayTimeRef.current < CARD_PLAY_COOLDOWN) {
        resetDragInteraction();
        return;
      }

      if (finalTarget === 'enemy') {
        if (!enemyTargetCard) {
          resetDragInteraction();
          return;
        }
        const aliveEnemies = gameState.enemies.filter((enemy) => enemy.currentHp > 0);
        const finalHoveredEnemyId =
          probes
            .map((probe) => detectHoveredEnemyId(probe.x, probe.y))
            .find((enemyId) => enemyId !== null) ?? null;
        const preferred = finalHoveredEnemyId ?? hoveredEnemyId ?? aliveEnemies[0]?.id ?? null;
        const result = playCardInstant(handDrag.card.id, { type: 'enemy', enemyId: preferred });
        if (result.played) {
          lastCardPlayTimeRef.current = Date.now();
          playSe('card');
          if (handDrag.card.type === 'attack') {
            playSe('attack');
            triggerAttackEffect(preferred);
          }
          if (result.blockGained > 0) playSe('block');
        }
      } else if (finalTarget === 'field') {
        // フィールド全体は発動しない（静かに手札へ戻す）
        resetDragInteraction();
        return;
      } else if (finalTarget === 'timebar') {
        if (enemyTargetCard) {
          resetDragInteraction();
          return;
        }
        const result = playCardInstant(handDrag.card.id, { type: 'field' });
        if (result.played) {
          lastCardPlayTimeRef.current = Date.now();
          playSe('card');
          if (handDrag.card.type === 'skill') triggerSkillEffect();
          if (result.blockGained > 0) playSe('block');
        }
      } else if (finalTarget === 'reserve') {
        setReserveConfirm({ card: handDrag.card, visible: true });
      } else if (finalTarget === 'sell') {
        sellCardById(handDrag.card.id);
      }
    } else if (event.pointerType !== 'touch') {
      // タップ時はプレビューの開閉のみ（設置はしない）
      setExpandedCardId((prev) => (prev === start.card.id ? null : start.card.id));
    }

    resetDragInteraction();
  };

  const onHandCardPointerCancel = () => {
    resetDragInteraction();
  };

  useEffect(() => {
    const resetTouchInteraction = () => {
      resetDragInteraction();
    };

    window.addEventListener('touchend', resetTouchInteraction, { passive: true });
    window.addEventListener('touchcancel', resetTouchInteraction, { passive: true });
    window.addEventListener('pointerup', resetTouchInteraction, { passive: true });
    window.addEventListener('pointercancel', resetTouchInteraction, { passive: true });
    return () => {
      window.removeEventListener('touchend', resetTouchInteraction);
      window.removeEventListener('touchcancel', resetTouchInteraction);
      window.removeEventListener('pointerup', resetTouchInteraction);
      window.removeEventListener('pointercancel', resetTouchInteraction);
    };
  }, [resetDragInteraction]);

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
      const enhanced = getEnhancedCardForPlay(handDrag.card);
      let previewCard = applyMultiplierAndBoostToCard(enhanced, gameState.player, doubleNextCharges);
      if (attackItemBuff && attackItemBuff.charges > 0 && previewCard.type === 'attack') {
        previewCard = { ...previewCard, damage: (previewCard.damage ?? 0) + attackItemBuff.value };
      }
      let rawDamage = calculateEffectiveDamage(
        previewCard,
        lastPlayedCard,
        gameState.player,
        gameState.toolSlots,
      );
      const vulnerable = enemy.statusEffects.find((status) => status.type === 'vulnerable');
      if (vulnerable) {
        rawDamage = Math.floor(rawDamage * 1.5);
      }
      previewDamage = Math.max(0, rawDamage - enemy.block);
    }
    return {
      enemyId: enemy.id,
      damage: previewDamage,
      previewHp: Math.max(0, enemy.currentHp - previewDamage),
    };
  }, [
    gameState.enemies,
    gameState.player,
    gameState.toolSlots,
    handDrag.card,
    hoveredEnemyId,
    isEnemyPreviewActive,
    lastPlayedCard,
    doubleNextCharges,
    attackItemBuff,
  ]);

  const timeUsagePreview = useMemo(() => {
    if (!handDrag.isDragging || !handDrag.card) return null;
    if (!canPlayCard(handDrag.card)) return null;
    const isPlayableTarget = handDrag.dropTarget === 'enemy' || handDrag.dropTarget === 'timebar';
    if (!isPlayableTarget) return null;
    const effective = getEffectiveCardValues(
      handDrag.card,
      gameState.player,
      lastPlayedCard,
      doubleNextCharges,
    ).effectiveTimeCost;
    const previewCost = Math.max(0, effective);
    const previewRemaining = Math.max(0, remainingTime - previewCost);
    return { previewCost, previewRemaining };
  }, [
    canPlayCard,
    gameState.player,
    handDrag.card,
    handDrag.dropTarget,
    handDrag.isDragging,
    lastPlayedCard,
    remainingTime,
    doubleNextCharges,
  ]);
  const previewBlockValue = useMemo(() => {
    if (!handDrag.isDragging || !handDrag.card) return null;
    const card = handDrag.card;
    if (!card.block || card.block <= 0) return null;
    const effective = getEffectiveCardValues(card, gameState.player, lastPlayedCard, doubleNextCharges);
    if (effective.block == null) return null;
    return gameState.player.block + effective.block;
  }, [handDrag.isDragging, handDrag.card, gameState.player, lastPlayedCard, doubleNextCharges]);
  const previewHpValue = useMemo(() => {
    if (!handDrag.isDragging || !handDrag.card) return null;
    const selfDamageEffect = handDrag.card.effects?.find((effect) => effect.type === 'self_damage');
    if (!selfDamageEffect) return null;
    return Math.max(0, gameState.player.currentHp - selfDamageEffect.value);
  }, [handDrag.isDragging, handDrag.card, gameState.player.currentHp]);

  const reserveFull = gameState.reserved.length >= 2;
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
  const currentPileCards = useMemo(() => {
    if (showPile === 'draw') return gameState.drawPile;
    if (showPile === 'discard') return gameState.discardPile;
    if (showPile === 'exhaust') return gameState.exhaustedCards;
    return [];
  }, [showPile, gameState.drawPile, gameState.discardPile, gameState.exhaustedCards]);
  const startTitle = useMemo(
    () => `── ${gameState.enemies.map((enemy) => enemy.name).join(' / ')} 現れ──`,
    [gameState.enemies],
  );
  const jobId = gameState.player.jobId;
  const isScaffoldHigh = jobId === 'carpenter' && gameState.player.scaffold >= 5;
  const isCookingHigh = jobId === 'cook' && gameState.player.cookingGauge >= 5;
  const isUnemployedBattle = gameState.player.jobId === 'unemployed';
  const hungryVisualState = isUnemployedBattle ? hungryState : 'normal';
  const hungryEffect = isUnemployedBattle ? hungryFlash : null;
  const canOpenBattleSettings = gameState.phase === 'battle_start' || gameState.phase === 'player_turn';
  const handleConcedeBattle = () => {
    const confirmed = window.confirm('このバトルをあきらめますか？');
    if (!confirmed) return;
    setShowBattleSettings(false);
    concedeBattle();
  };

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
        if (target.closest('.battle-slots-row')) return;
        if (target.closest('.battle-omamori-list')) return;
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
          {hungryEffect === 'hungry' ? '🔥 ハングリー' : '⚡ 覚醒'}
        </div>
      )}
      {showRevivalEffect && (
        <div className="revival-effect">
          <span className="revival-text">🔄 七転び八起き！</span>
        </div>
      )}
      {canOpenBattleSettings && !rewardAdUsed && (
        <button
          type="button"
          className="battle-reward-ad-btn"
          onClick={() => {
            // Capacitor移行後に AdMob リワード広告を表示
            const ok = applyRewardAdHeal();
            if (ok) onUseRewardAd?.();
          }}
          aria-label="広告を見てHP回復"
        >
          📺 広告でHP回復
        </button>
      )}
      {rewardAdUsed && (
        <button
          type="button"
          className="battle-reward-ad-btn battle-reward-ad-btn--used"
          disabled
          aria-label="使用済み"
        >
          📺 使用済み
        </button>
      )}
      {/* お守りリスト */}
      {omamoris && omamoris.length > 0 && (
        <div className="battle-omamori-list">
          {omamoris.map((omamori) => (
            <BattleOmamoriItem key={omamori.id} omamori={omamori} />
          ))}
        </div>
      )}
      {canOpenBattleSettings && (
        <button
          type="button"
          className="battle-settings-trigger"
          onClick={() => setShowBattleSettings(true)}
          aria-label="バトル設定を開く"
        >
          設定
        </button>
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
        <div className="battle-hand-area battle-hand-area--bar-align">
          <Hand
            hand={gameState.hand}
            player={gameState.player}
            doubleNextCharges={doubleNextCharges}
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

        <div className="battle-timebar-reserve-row">
          <div className="battle-reserve-area battle-reserve-area--gauge-expand" ref={reserveAreaRef}>
            <ActionBar
              reserved={gameState.reserved}
              jobId={gameState.player.jobId}
              isDragging={handDrag.isDragging}
              activeDropTarget={handDrag.dropTarget}
              reserveFull={reserveFull}
              reserveDropRef={reserveDropRef}
            />
          </div>

          <div
            className={`battle-timebar-row ${isHoveringTimebar ? 'timebar-row--active' : ''}`}
            ref={timebarRowRef}
          >
            <Timeline
              maxTime={gameState.maxTime}
              remainingTime={remainingTime}
              isDropActive={Boolean(timeUsagePreview)}
              previewRemainingTime={timeUsagePreview?.previewRemaining ?? null}
              previewCost={timeUsagePreview?.previewCost ?? null}
              gaugeStyle={timelineGaugeStyle}
              timelineBarRef={timelineBarRef}
            />
          </div>
        </div>

        <div className="battle-status-row">
          <PlayerStatus
            player={gameState.player}
            previewBlock={previewBlockValue}
            previewHp={previewHpValue}
            toolSlots={gameState.toolSlots}
            activePowers={gameState.activePowers}
            battleItems={battleItems}
            canUseItems={gameState.phase === 'player_turn'}
            onUseItem={useBattleItem}
            onEndTurn={endTurn}
            isTurnEnding={gameState.phase !== 'player_turn'}
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

      {gameState.shuffleAnimation && <div className="shuffle-popup">🔀 シャッフル中</div>}

      {handDrag.isDragging && handDrag.card && (
        <div
          className={`drag-floating-card ${!canPlayCard(handDrag.card) ? 'invalid' : ''}`}
          style={{
            left: handDrag.x - DRAG_CARD_WIDTH / 2,
            top: handDrag.y + DRAG_DISPLAY_Y_OFFSET,
          }}
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
            effectiveValues={getEffectiveCardValues(
              handDrag.card,
              gameState.player,
              lastPlayedCard,
              doubleNextCharges,
            )}
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
                ×</button>
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
              <h2 className="battle-deck-modal-title">リフォーム: 強化するカードを選択</h2>
              <button type="button" className="battle-btn-close" onClick={skipHandUpgradeSelection}>
                ×</button>
            </div>
            <div className="battle-upgrade-guide">
              残り {pendingHandUpgradeCount} 枚</div>
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
      {showBattleSettings && (
        <div className="battle-settings-overlay" onClick={() => setShowBattleSettings(false)}>
          <div className="battle-settings-modal" onClick={(event) => event.stopPropagation()}>
            <div className="battle-settings-header">
              <h2 className="battle-settings-title">バトル設定</h2>
              <button type="button" className="battle-btn-close" onClick={() => setShowBattleSettings(false)}>
                ×
              </button>
            </div>
            <div className="battle-settings-content">
              <button
                type="button"
                className="btn-glossary"
                onClick={() => {
                  setShowBattleSettings(false);
                  setShowBattleGlossary(true);
                }}
              >
                📖 用語集
              </button>
              <button type="button" className="battle-settings-surrender" onClick={handleConcedeBattle}>
                あきらめる
              </button>
            </div>
          </div>
        </div>
      )}
      {showBattleGlossary && (
        <GlossaryModal onClose={() => setShowBattleGlossary(false)} />
      )}
      {reserveConfirm?.visible && (
        <div className="reserve-confirm-overlay">
          <div className="reserve-confirm-dialog">
            <p className="reserve-confirm-title">「{reserveConfirm.card.name}」を温存しますか？</p>
            <p className="reserve-confirm-note">次ターン -1.5秒</p>
            <div className="reserve-confirm-buttons">
              <button type="button" className="btn-reserve-cancel" onClick={() => setReserveConfirm(null)}>
                キャンセル
              </button>
              <button
                type="button"
                className="btn-reserve-ok"
                onClick={() => {
                  reserveCardById(reserveConfirm.card.id);
                  setReserveConfirm(null);
                }}
              >
                温存する              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default BattleScreen;

