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
import Tooltip from '../Tooltip/Tooltip';
import EnemyDisplay from '../Enemy/EnemyDisplay';
import CardComponent from '../Hand/CardComponent';
import Hand from '../Hand/Hand';
import PlayerStatus from '../PlayerStatus/PlayerStatus';
import BattleDefeatOverlay from '../Result/BattleDefeatOverlay';
import BattleVictoryOverlay from '../Result/BattleVictoryOverlay';
import Timeline from '../Timeline/Timeline';
import { useGameState } from '../../hooks/useGameState';
import { ICONS } from '../../assets/icons';
import type { Card, GameState } from '../../types/game';
import type { BattleResult, BattleSetup, Omamori } from '../../types/run';
import {
  cardHasDamageImmunityThisTurn,
  getEffectiveCardValues,
  getPreviewScaffoldAfterPlay,
} from '../../utils/cardPreview';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import { calculateEffectiveDamage } from '../../utils/damage';
import { getAdsRemoved } from '../../utils/adsRemoved';
import { showInterstitialIfAllowed } from '../../utils/adMobClient';
import { hasTutorialSeen, markTutorialSeen } from '../../utils/tutorialState';
import { applyMultiplierAndBoostToCard, getEnhancedCardForPlay } from '../../utils/playCardMultipliers';
import { isEnemyTargetCard } from '../../utils/cardTarget';
import {
  applyPendingDebuffPreviewToEnemy,
  cardAppliesVulnerableToEnemy,
  cardDealsDamageForEnemyPreview,
  cardHasEnemyDebuffPreviewEffects,
} from '../../utils/enemyDebuffPreview';
import { useAudioContext } from '../../contexts/AudioContext';
import bgBattleArea1 from '../../assets/backgrounds/bg_battle_area1.png';
import bgBattleArea2 from '../../assets/backgrounds/bg_battle_area2.png';
import bgBattleArea3 from '../../assets/backgrounds/bg_battle_area3.png';
import bgBossArea1 from '../../assets/backgrounds/bg_boss_area1.png';
import bgBossArea2 from '../../assets/backgrounds/bg_boss_area2.png';
import bgBossArea3 from '../../assets/backgrounds/bg_boss_area3.png';
import bgBattleCookArea1 from '../../assets/backgrounds/bg_battle_cook_area1.png';
import bgBattleCookArea2 from '../../assets/backgrounds/bg_battle_cook_area2.png';
import bgBattleCookArea3 from '../../assets/backgrounds/bg_battle_cook_area3.png';
import bgBossCookArea1 from '../../assets/backgrounds/bg_boss_cook_area1.png';
import bgBossCookArea2 from '../../assets/backgrounds/bg_boss_cook_area2.png';
import bgBossCookArea3 from '../../assets/backgrounds/bg_boss_cook_area3.png';
import '../Enemy/Enemy.css';
import '../Effects/Effects.css';
import '../PlayerStatus/PlayerStatus.css';
import '../Result/Result.css';
import './BattleScreen.css';
import { TutorialOverlay } from '../Tutorial/TutorialOverlay';

type DropTarget = 'enemy' | 'field' | 'timebar' | 'hand' | 'reserve' | 'sell' | null;

const BATTLE_TUTORIAL_STEPS = [
  'battle_hand',
  'battle_reserve',
  'battle_attack',
  'battle_skill',
  'battle_equipment',
  'battle_power',
] as const;
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
  /** 所持お守り（ヘッダー表示） */
  omamoris?: Omamori[];
  /** マップの現在エリア（背景切り替え） */
  currentArea?: number;
  /** このランでまだ敗北復活を使っていなければ true（親の RunState） */
  canOfferDefeatRevive?: boolean;
  onDefeatReviveConsumed?: () => void;
}

const DRAG_CARD_HEIGHT = 168;
const DRAG_CARD_WIDTH = 105;
// 表示オフセット：指の位置がカード下部になるよう上にずらす
const DRAG_DISPLAY_Y_OFFSET = -(DRAG_CARD_HEIGHT - 40);
// 判定オフセット：カード上端基準（複数プローブで使用）
const DRAG_JUDGE_Y_OFFSET = DRAG_DISPLAY_Y_OFFSET;
/** 温存枠ドロップから reserveCardById までの遅延 */
const RESERVE_PENDING_MS = 500;
/** 温存でタイムラインから減る秒数（実コストに合わせ、プレビューもこの固定値） */
const RESERVE_DROP_COST = RESERVE_PENDING_MS / 1000;

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
        <img
          src={omamori.imageUrl}
          alt={omamori.name}
          className="battle-omamori-img"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
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
  omamoris,
  currentArea = 1,
  canOfferDefeatRevive = false,
  onDefeatReviveConsumed,
}: BattleScreenProps) => {
  const noop = () => {};
  const {
    playSe,
    playBgm,
    stopBgm,
    toggleBgmMute,
    toggleSeMute,
    isBgmMuted,
    isSeMuted,
  } = useAudioContext();
  const [bgmMuted, setBgmMuted] = useState(() => isBgmMuted());
  const [seMuted, setSeMuted] = useState(() => isSeMuted());
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
    doubleNextReplayCharges,
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
    giveUpDefeatOffer,
    reviveAfterDefeatOffer,
    showDefeatReviveModal,
  } = useGameState({
    setup,
    onBattleEnd,
    onConsumeItem,
    onTurnStart,
    onBattleFinished,
    initialGameState,
    canOfferDefeatRevive,
    onDefeatReviveConsumed,
  });

  const reserveCardByIdRef = useRef(reserveCardById);
  reserveCardByIdRef.current = reserveCardById;

  const isBoss = useMemo(
    () => gameState.enemies.some((e) => BOSS_IDS.includes(e.templateId)),
    [gameState.enemies],
  );

  const battleBackgroundSrc = useMemo(() => {
    const area = Math.min(3, Math.max(1, currentArea));
    const isBossBattle = setup?.kind === 'boss';
    const jid = gameState.player.jobId;
    if (jid === 'cook') {
      if (isBossBattle) {
        if (area === 1) return bgBossCookArea1;
        if (area === 2) return bgBossCookArea2;
        return bgBossCookArea3;
      }
      if (area === 1) return bgBattleCookArea1;
      if (area === 2) return bgBattleCookArea2;
      return bgBattleCookArea3;
    }
    if (isBossBattle) {
      if (area === 1) return bgBossArea1;
      if (area === 2) return bgBossArea2;
      return bgBossArea3;
    }
    if (area === 1) return bgBattleArea1;
    if (area === 2) return bgBattleArea2;
    return bgBattleArea3;
  }, [currentArea, setup?.kind, gameState.player.jobId]);

  const enemyAreaRef = useRef<HTMLElement | null>(null);
  const timebarRowRef = useRef<HTMLDivElement | null>(null);
  const reserveAreaRef = useRef<HTMLDivElement | null>(null);
  const timelineBarRef = useRef<HTMLDivElement | null>(null);
  const reserveDropRef = useRef<HTMLDivElement | null>(null);
  const reservePendingTimeoutRef = useRef<number | null>(null);
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
  const [pendingReserveCardId, setPendingReserveCardId] = useState<string | null>(null);
  const [showBattleSettings, setShowBattleSettings] = useState(false);
  const [battleVolumeOpen, setBattleVolumeOpen] = useState(false);
  const [showBattleGlossary, setShowBattleGlossary] = useState(false);
  /** タイムラインはゲージ型に固定 */
  const timelineGaugeStyle = 'bar' as const;
  const [skillEffect, setSkillEffect] = useState(false);
  const skillEffectTimerRef = useRef<number | null>(null);
  const lastCardPlayTimeRef = useRef<number>(0);
  const CARD_PLAY_COOLDOWN = 600;

  const [battleTutorialIndex, setBattleTutorialIndex] = useState<number | null>(null);

  useEffect(() => {
    if (hasTutorialSeen('battle')) return;
    const t = window.setTimeout(() => setBattleTutorialIndex(0), 0);
    return () => clearTimeout(t);
  }, []);

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
      if (skillEffectTimerRef.current !== null) window.clearTimeout(skillEffectTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (gameState.phase === 'victory' || gameState.phase === 'defeat') {
      setShowBattleSettings(false);
      setBattleTutorialIndex(null);
      markTutorialSeen('battle');
    }
  }, [gameState.phase]);

  useEffect(() => {
    if (!showBattleSettings) return;
    setBgmMuted(isBgmMuted());
    setSeMuted(isSeMuted());
    setBattleVolumeOpen(false);
  }, [showBattleSettings, isBgmMuted, isSeMuted]);

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

  /** 立ち絵（.enemy-illustration）をヒットボックスに。エリア余白では反応しない */
  const ENEMY_ILLUSTRATION_HIT_PADDING = 8;

  const isPointOnEnemyIllustration = (clientX: number, clientY: number): boolean => {
    const root = enemyAreaRef.current;
    if (!root) return false;
    const illustrations = root.querySelectorAll<HTMLElement>('.enemy-card:not(.dead) .enemy-illustration');
    for (const el of illustrations) {
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left - ENEMY_ILLUSTRATION_HIT_PADDING &&
        clientX <= rect.right + ENEMY_ILLUSTRATION_HIT_PADDING &&
        clientY >= rect.top - ENEMY_ILLUSTRATION_HIT_PADDING &&
        clientY <= rect.bottom + ENEMY_ILLUSTRATION_HIT_PADDING
      ) {
        return true;
      }
    }
    return false;
  };

  const findEnemyIdAtIllustration = (clientX: number, clientY: number): string | null => {
    const root = enemyAreaRef.current;
    if (!root) return null;
    const cards = root.querySelectorAll<HTMLElement>('.enemy-card:not(.dead)[data-enemy-id]');
    for (const card of cards) {
      const ill = card.querySelector<HTMLElement>('.enemy-illustration');
      if (!ill) continue;
      const rect = ill.getBoundingClientRect();
      if (
        clientX >= rect.left - ENEMY_ILLUSTRATION_HIT_PADDING &&
        clientX <= rect.right + ENEMY_ILLUSTRATION_HIT_PADDING &&
        clientY >= rect.top - ENEMY_ILLUSTRATION_HIT_PADDING &&
        clientY <= rect.bottom + ENEMY_ILLUSTRATION_HIT_PADDING
      ) {
        return card.dataset.enemyId ?? null;
      }
    }
    return null;
  };

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

    if (isEnemyTargetCard(card) && isPointOnEnemyIllustration(clientX, clientY)) {
      return { target: 'enemy', index: null };
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
    remainingTimeSec: number,
    reserveSlotsFull: boolean,
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
      if (
        inReserveLeftZone &&
        !reserveSlotsFull &&
        remainingTimeSec + 1e-9 >= RESERVE_DROP_COST
      ) {
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
      const detection = resolveDropTargetFromProbes(
        probes,
        start.card,
        event.clientX,
        event.clientY,
        remainingTime,
        gameState.reserved.length >= 2,
      );
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
    const detection = resolveDropTargetFromProbes(
      probes,
      start.card,
      event.clientX,
      event.clientY,
      remainingTime,
      gameState.reserved.length >= 2,
    );
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
    const nextHoveredEnemyId =
      detection.target === 'enemy' && enemyTargetCard
        ? findEnemyIdAtIllustration(event.clientX, event.clientY) ||
          probes.map((p) => findEnemyIdAtIllustration(p.x, p.y)).find((id) => id != null) ||
          null
        : null;
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
    if (reservePendingTimeoutRef.current === null) {
      setPendingReserveCardId(null);
    }
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
        const finalDetection = resolveDropTargetFromProbes(
          probes,
          handDrag.card,
          event.clientX,
          event.clientY,
          remainingTime,
          gameState.reserved.length >= 2,
        );
        if (finalDetection.target === 'reserve') {
          scheduleReserveFromDrop(handDrag.card.id);
        }
        resetDragInteraction();
        return;
      }

      const probes = getDragProbePositions(event.clientX, event.clientY);
      const finalDetection = resolveDropTargetFromProbes(
        probes,
        handDrag.card,
        event.clientX,
        event.clientY,
        remainingTime,
        gameState.reserved.length >= 2,
      );
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
          // 自バフ系（金槌の響きの next_attack_boost 等）：敵エリアにドロップしてもタイムライン発動として扱う
          const result = playCardInstant(handDrag.card.id, { type: 'field' });
          if (result.played) {
            lastCardPlayTimeRef.current = Date.now();
            playSe('card');
            if (handDrag.card.type === 'skill') triggerSkillEffect();
            if (result.blockGained > 0) playSe('block');
          }
          resetDragInteraction();
          return;
        }
        const aliveEnemies = gameState.enemies.filter((enemy) => enemy.currentHp > 0);
        const finalHoveredEnemyId =
          findEnemyIdAtIllustration(event.clientX, event.clientY) ||
          probes.map((probe) => findEnemyIdAtIllustration(probe.x, probe.y)).find((id) => id != null) ||
          null;
        const preferred = finalHoveredEnemyId ?? hoveredEnemyId ?? aliveEnemies[0]?.id ?? null;
        const result = playCardInstant(handDrag.card.id, { type: 'enemy', enemyId: preferred });
        if (result.played) {
          lastCardPlayTimeRef.current = Date.now();
          playSe('card');
          if (handDrag.card.type === 'attack') {
            const multiHitStaggerMs = 280;
            if (result.multiHitJabs && result.multiHitJabs.length > 0) {
              result.multiHitJabs.forEach((_, i) => {
                window.setTimeout(() => {
                  playSe('attack');
                }, i * multiHitStaggerMs);
              });
            } else {
              playSe('attack');
            }
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
        scheduleReserveFromDrop(handDrag.card.id);
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

  const isAoeDamageDragPreview =
    handDrag.card !== null &&
    handDrag.card.tags?.includes('aoe') &&
    (handDrag.card.type === 'attack' ||
      ((handDrag.card.type === 'skill' || handDrag.card.type === 'power') &&
        (handDrag.card.damage ?? 0) > 0));

  const isEnemyPreviewActive =
    handDrag.isDragging &&
    handDrag.card !== null &&
    canPlayCard(handDrag.card) &&
    handDrag.dropTarget === 'enemy' &&
    isEnemyTargetCard(handDrag.card) &&
    (isAoeDamageDragPreview || hoveredEnemyId !== null);

  /** ドラッグ中の敵へのダメージ／予測HP（全体攻撃時は全員分） */
  const previewByEnemy = useMemo(() => {
    if (!isEnemyPreviewActive || !handDrag.card) return null;

    const card = handDrag.card;
    const dealsDamage =
      card.type === 'attack' ||
      ((card.type === 'skill' || card.type === 'power') && (card.damage ?? 0) > 0);
    if (!dealsDamage) return null;

    const enhanced = getEnhancedCardForPlay(card);
    const replayActive = doubleNextReplayCharges > 0;
    let previewCard = applyMultiplierAndBoostToCard(enhanced, gameState.player, doubleNextCharges, {
      ignoreDoubleMultiplier: replayActive,
    });
    if (attackItemBuff && attackItemBuff.charges > 0 && previewCard.type === 'attack') {
      previewCard = { ...previewCard, damage: (previewCard.damage ?? 0) + attackItemBuff.value };
    }
    let rawDamageBase = calculateEffectiveDamage(
      previewCard,
      lastPlayedCard,
      gameState.player,
      gameState.toolSlots,
    );
    if (card.type === 'attack' && gameState.player.nextAttackBoostCount > 0) {
      rawDamageBase += gameState.player.nextAttackBoostValue;
    }
    if (replayActive) {
      rawDamageBase *= 2;
    }

    const computeForEnemy = (enemy: (typeof gameState.enemies)[number]) => {
      let rawDamage = rawDamageBase;
      const vulnerable = enemy.statusEffects.find((status) => status.type === 'vulnerable');
      if (vulnerable) {
        rawDamage = Math.floor(rawDamage * 1.5);
      }
      const previewDamage = Math.max(0, rawDamage - enemy.block);
      const previewHp = Math.max(0, enemy.currentHp - previewDamage);
      return { damage: previewDamage, previewHp };
    };

    if (card.tags?.includes('aoe')) {
      const out: Record<string, { damage: number; previewHp: number }> = {};
      for (const enemy of gameState.enemies) {
        if (enemy.currentHp <= 0) continue;
        out[enemy.id] = computeForEnemy(enemy);
      }
      return Object.keys(out).length > 0 ? out : null;
    }

    if (!hoveredEnemyId) return null;
    const enemy = gameState.enemies.find((entry) => entry.id === hoveredEnemyId);
    if (!enemy || enemy.currentHp <= 0) return null;
    return { [enemy.id]: computeForEnemy(enemy) };
  }, [
    gameState.enemies,
    gameState.player,
    gameState.toolSlots,
    handDrag.card,
    hoveredEnemyId,
    isEnemyPreviewActive,
    lastPlayedCard,
    doubleNextCharges,
    doubleNextReplayCharges,
    attackItemBuff,
    canPlayCard,
  ]);

  /** ドラッグ中：デバフ付与後の敵インテント数値（虎の視線など） */
  const previewIntentEnemyById = useMemo(() => {
    if (!handDrag.isDragging || !handDrag.card || handDrag.dropTarget !== 'enemy') return null;
    if (!canPlayCard(handDrag.card)) return null;
    if (cardHasDamageImmunityThisTurn(handDrag.card)) return null;
    if (!isEnemyTargetCard(handDrag.card)) return null;
    if (!cardHasEnemyDebuffPreviewEffects(handDrag.card)) return null;

    const card = handDrag.card;
    if (!card.tags?.includes('aoe') && !hoveredEnemyId) return null;

    const applyOne = (enemy: (typeof gameState.enemies)[number]) =>
      applyPendingDebuffPreviewToEnemy(enemy, card);

    if (card.tags?.includes('aoe')) {
      const out: Record<string, (typeof gameState.enemies)[number]> = {};
      for (const enemy of gameState.enemies) {
        if (enemy.currentHp <= 0) continue;
        out[enemy.id] = applyOne(enemy);
      }
      return Object.keys(out).length > 0 ? out : null;
    }

    const enemy = gameState.enemies.find((e) => e.id === hoveredEnemyId);
    if (!enemy || enemy.currentHp <= 0) return null;
    return { [enemy.id]: applyOne(enemy) };
  }, [
    canPlayCard,
    handDrag.isDragging,
    handDrag.card,
    handDrag.dropTarget,
    hoveredEnemyId,
    gameState.enemies,
  ]);

  /** 敵の物理攻撃がこのターン無効化される見た目（カード使用後のみ0表示。無効化カードドラッグ中は敵攻撃表示は変えない） */
  const intentAttackDamageImmunityInfo = useMemo(() => {
    const playerImmune = gameState.player.damageImmunityThisTurn;
    return {
      show: playerImmune,
      pulse: false,
    };
  }, [gameState.player.damageImmunityThisTurn]);

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
      attackItemBuff,
      gameState.toolSlots,
      doubleNextReplayCharges,
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
    doubleNextReplayCharges,
    attackItemBuff,
    gameState.toolSlots,
  ]);
  const previewBlockValue = useMemo(() => {
    if (!handDrag.isDragging || !handDrag.card) return null;
    const card = handDrag.card;
    if (!card.block || card.block <= 0) return null;
    if (!canPlayCard(card)) {
      return gameState.player.block + card.block;
    }
    const effective = getEffectiveCardValues(
      card,
      gameState.player,
      lastPlayedCard,
      doubleNextCharges,
      attackItemBuff,
      gameState.toolSlots,
      doubleNextReplayCharges,
    );
    if (effective.block == null) return null;
    return gameState.player.block + effective.block;
  }, [
    canPlayCard,
    handDrag.isDragging,
    handDrag.card,
    gameState.player,
    lastPlayedCard,
    doubleNextCharges,
    doubleNextReplayCharges,
    attackItemBuff,
    gameState.toolSlots,
  ]);
  const previewHpValue = useMemo(() => {
    if (!handDrag.isDragging || !handDrag.card) return null;
    if (!canPlayCard(handDrag.card)) return null;
    const selfDamageEffect = handDrag.card.effects?.find((effect) => effect.type === 'self_damage');
    if (!selfDamageEffect) return null;
    return Math.max(0, gameState.player.currentHp - selfDamageEffect.value);
  }, [canPlayCard, handDrag.isDragging, handDrag.card, gameState.player.currentHp]);

  const previewScaffoldValue = useMemo(() => {
    if (!handDrag.isDragging || !handDrag.card) return null;
    if (!canPlayCard(handDrag.card)) return null;
    return getPreviewScaffoldAfterPlay(handDrag.card, gameState.player, doubleNextCharges, doubleNextReplayCharges);
  }, [canPlayCard, handDrag.isDragging, handDrag.card, gameState.player, doubleNextCharges, doubleNextReplayCharges]);

  /** ダメージ無効スキル（居直り・点検車等）ドラッグ中：ブロック数値はそのまま、金色で「このターン無敵」を示す */
  const previewBlockImmunityDrag = useMemo(
    () =>
      Boolean(handDrag.isDragging && handDrag.card && cardHasDamageImmunityThisTurn(handDrag.card)),
    [handDrag.isDragging, handDrag.card],
  );

  const dragCardAppliesEnemyVulnerable = useMemo(
    () => Boolean(handDrag.card && cardAppliesVulnerableToEnemy(handDrag.card)),
    [handDrag.card],
  );

  /** ダメージ予測がない敵向けデバフ（脆弱・攻撃デバフ・弱体・火傷等）：ホバー中の敵ネームを灰色点滅 */
  const enemyDebuffHintEnemyId = useMemo(() => {
    const card = handDrag.card;
    if (!handDrag.isDragging || !card || handDrag.dropTarget !== 'enemy') return null;
    if (!canPlayCard(card)) return null;
    if (!isEnemyTargetCard(card)) return null;
    if (!cardHasEnemyDebuffPreviewEffects(card)) return null;
    if (cardDealsDamageForEnemyPreview(card)) return null;
    return hoveredEnemyId;
  }, [
    handDrag.isDragging,
    handDrag.card,
    handDrag.dropTarget,
    hoveredEnemyId,
    canPlayCard,
  ]);

  const playerDebuffStrip = useMemo(() => {
    const p = gameState.player;
    const vulnerable = p.statusEffects
      .filter((s) => s.type === 'vulnerable' && s.duration > 0)
      .reduce((sum, s) => sum + s.value, 0);
    const weak = p.statusEffects
      .filter((s) => s.type === 'weak' && s.duration > 0)
      .reduce((sum, s) => sum + s.value, 0);
    const burnFx = p.statusEffects.filter((s) => s.type === 'burn' && s.duration > 0);
    const burnDamage = burnFx.reduce((a, s) => a + s.value, 0);
    const burnTurns = burnFx.length ? Math.max(...burnFx.map((s) => s.duration)) : 0;
    if (vulnerable === 0 && weak === 0 && burnDamage === 0) return null;
    return { vulnerable, weak, burnDamage, burnTurns };
  }, [gameState.player.statusEffects]);

  const reserveFull = gameState.reserved.length >= 2;

  const clearPendingReserveTimeout = useCallback(() => {
    if (reservePendingTimeoutRef.current !== null) {
      window.clearTimeout(reservePendingTimeoutRef.current);
      reservePendingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => clearPendingReserveTimeout(), [clearPendingReserveTimeout]);

  useEffect(() => {
    if (!pendingReserveCardId) return;
    if (!gameState.hand.some((c) => c.id === pendingReserveCardId)) {
      clearPendingReserveTimeout();
      setPendingReserveCardId(null);
    }
  }, [gameState.hand, pendingReserveCardId, clearPendingReserveTimeout]);

  /** ドラッグ中に温存枠と重なった時点でプレビュー（0.5秒確定待ち中は ref でスキップ） */
  useEffect(() => {
    if (reservePendingTimeoutRef.current !== null) return;
    if (handDrag.isDragging && handDrag.dropTarget === 'reserve' && handDrag.card) {
      setPendingReserveCardId(handDrag.card.id);
    } else if (handDrag.isDragging && handDrag.dropTarget !== 'reserve') {
      setPendingReserveCardId(null);
    }
  }, [handDrag.isDragging, handDrag.dropTarget, handDrag.card?.id]);

  const scheduleReserveFromDrop = useCallback(
    (cardId: string) => {
      if (remainingTime + 1e-9 < RESERVE_DROP_COST) return;
      if (gameState.reserved.length >= 2) return;
      clearPendingReserveTimeout();
      setPendingReserveCardId(cardId);
      reservePendingTimeoutRef.current = window.setTimeout(() => {
        reservePendingTimeoutRef.current = null;
        const ok = reserveCardByIdRef.current(cardId);
        if (ok) playSe('reserve');
        setPendingReserveCardId(null);
      }, RESERVE_PENDING_MS);
    },
    [clearPendingReserveTimeout, playSe, remainingTime, gameState.reserved.length],
  );

  const pendingReserveCard = useMemo(
    () =>
      pendingReserveCardId ? (gameState.hand.find((c) => c.id === pendingReserveCardId) ?? null) : null,
    [gameState.hand, pendingReserveCardId],
  );

  /** 温存仮置き中：タイムバーにかかる時間のプレビュー（温存コストは固定秒） */
  const reserveTimeUsagePreview = useMemo(() => {
    if (!pendingReserveCard) return null;
    const previewCost = RESERVE_DROP_COST;
    const previewRemaining = Math.max(0, remainingTime - previewCost);
    return { previewCost, previewRemaining };
  }, [pendingReserveCard, remainingTime]);

  const finalTimelinePreviewCost = reserveTimeUsagePreview?.previewCost ?? timeUsagePreview?.previewCost ?? null;
  const finalTimelinePreviewRemaining =
    reserveTimeUsagePreview != null
      ? reserveTimeUsagePreview.previewRemaining
      : timeUsagePreview?.previewRemaining ?? null;

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
    isAttackDamageWeakDebuffed: false,
  });
  const currentPileCards = useMemo(() => {
    if (showPile === 'draw') {
      const pile = gameState.drawPile;
      const perm = gameState.drawPileDisplayOrder;
      if (!perm || perm.length !== pile.length || pile.length === 0) return pile;
      return perm.map((idx) => pile[idx]);
    }
    if (showPile === 'discard') return [...gameState.discardPile].reverse();
    if (showPile === 'exhaust') return gameState.exhaustedCards;
    return [];
  }, [showPile, gameState.drawPile, gameState.discardPile, gameState.exhaustedCards, gameState.drawPileDisplayOrder]);
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

  const handleBattleTutorialNext = () => {
    setBattleTutorialIndex((i) => {
      if (i === null) return null;
      if (i >= BATTLE_TUTORIAL_STEPS.length - 1) {
        markTutorialSeen('battle');
        return null;
      }
      return i + 1;
    });
  };

  const handleBattleTutorialSkip = () => {
    markTutorialSeen('battle');
    setBattleTutorialIndex(null);
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
      <div className="battle-screen-bg-root" aria-hidden>
        <img src={battleBackgroundSrc} alt="" className="battle-screen-bg-img" draggable={false} />
        <div className="battle-screen-bg-dim" />
        <div className="battle-screen-bg-gradient" />
      </div>
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
        className={`enemy-placeholder battle-enemy-area enemy-area ${
          handDrag.isDragging && handDrag.dropTarget === 'enemy' ? 'drop-active' : ''
        }`}
        ref={enemyAreaRef}
      >
        <EnemyDisplay
          enemies={gameState.enemies}
          intents={enemyIntents}
          hitEnemyId={hitEnemyId}
          previewByEnemy={previewByEnemy}
          intentPreviewEnemyById={previewIntentEnemyById}
          intentAttackDamageImmunity={intentAttackDamageImmunityInfo.show}
          intentAttackDamageImmunityPulse={intentAttackDamageImmunityInfo.pulse}
          player={gameState.player}
          dragCardAppliesEnemyVulnerable={dragCardAppliesEnemyVulnerable}
          enemyDebuffHintEnemyId={enemyDebuffHintEnemyId}
        />
      </section>

      <div className="battle-spacer" />

      <section className="player-area">
        <div className="battle-hand-area">
          <Hand
            hand={gameState.hand}
            player={gameState.player}
            doubleNextCharges={doubleNextCharges}
            doubleNextReplayCharges={doubleNextReplayCharges}
            attackItemBuff={attackItemBuff}
            toolSlots={gameState.toolSlots}
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
          <div
            className="battle-reserve-area battle-reserve-area--gauge-expand reserve-slot"
            ref={reserveAreaRef}
          >
            <ActionBar
              reserved={gameState.reserved}
              pendingReserveCard={pendingReserveCard}
              jobId={gameState.player.jobId}
              isDragging={handDrag.isDragging}
              activeDropTarget={handDrag.dropTarget}
              reserveFull={reserveFull}
              reserveDropRef={reserveDropRef}
            />
          </div>

          <div
            className={`battle-timebar-row time-bar ${isHoveringTimebar ? 'timebar-row--active' : ''}`}
            ref={timebarRowRef}
          >
            <div className="battle-timebar-wrap">
              {playerDebuffStrip && (
                <div className="battle-timebar-debuff-overlay" aria-label="プレイヤーのデバフ">
                  {playerDebuffStrip.vulnerable > 0 && (
                    <Tooltip
                      label="脆弱"
                      description={`受けるダメージ+50%。敵の攻撃表示は1.5倍で表示されます。残り${playerDebuffStrip.vulnerable}ターン`}
                    >
                      <span className="status-badge status-badge--vulnerable">
                        <img src={ICONS.badgeVulnerable} alt="" className="status-icon" />
                        {playerDebuffStrip.vulnerable}
                      </span>
                    </Tooltip>
                  )}
                  {playerDebuffStrip.weak > 0 && (
                    <Tooltip label="弱体" description={`与えるダメージが25％減少。残り${playerDebuffStrip.weak}ターン`}>
                      <span className="status-badge status-badge--weak">
                        <img src={ICONS.badgeWeak} alt="" className="status-icon" />
                        {playerDebuffStrip.weak}
                      </span>
                    </Tooltip>
                  )}
                  {playerDebuffStrip.burnDamage > 0 && (
                    <Tooltip
                      label="炎上"
                      description={`ターン終了時に${playerDebuffStrip.burnDamage}ダメージ。残り${playerDebuffStrip.burnTurns}ターン`}
                    >
                      <span className="status-badge status-badge--burn">
                        <img src={ICONS.badgeBurn} alt="" className="status-icon" />
                        {playerDebuffStrip.burnDamage}
                      </span>
                    </Tooltip>
                  )}
                </div>
              )}
              <Timeline
                maxTime={gameState.maxTime}
                remainingTime={remainingTime}
                isDropActive={Boolean(timeUsagePreview || reserveTimeUsagePreview)}
                previewRemainingTime={finalTimelinePreviewRemaining}
                previewCost={finalTimelinePreviewCost}
                gaugeStyle={timelineGaugeStyle}
                timelineBarRef={timelineBarRef}
              />
            </div>
          </div>
        </div>

        <div className="battle-status-row">
          <PlayerStatus
            player={gameState.player}
            previewBlock={previewBlockValue}
            previewBlockImmunity={previewBlockImmunityDrag}
            previewHp={previewHpValue}
            previewScaffold={previewScaffoldValue}
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
              attackItemBuff,
              gameState.toolSlots,
              doubleNextReplayCharges,
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
        <BattleVictoryOverlay
          onContinue={noop}
          rewardGold={victoryRewardGold}
          totalGold={gameState.player.gold}
          mentalRecovery={victoryMentalRecovery}
        />
      )}
      {showDefeatReviveModal && (
        <div className="defeat-revive-overlay" role="dialog" aria-modal="true">
          <div className="defeat-revive-dialog">
            <p className="defeat-revive-title">復活しますか？</p>
            <p className="defeat-revive-desc">HPが最大の50%まで回復します（このランは1回のみ）</p>
            <div className="defeat-revive-actions">
              <button
                type="button"
                className="defeat-revive-btn defeat-revive-btn--primary"
                onClick={() => {
                  void (async () => {
                    await showInterstitialIfAllowed(getAdsRemoved(), () => {
                      stopBgm();
                      playBgm(isBoss ? 'boss' : 'battle');
                    });
                    reviveAfterDefeatOffer();
                  })();
                }}
              >
                {getAdsRemoved() ? '広告なしで復活' : '広告を見て復活'}
              </button>
              <button type="button" className="defeat-revive-btn defeat-revive-btn--ghost" onClick={giveUpDefeatOffer}>
                あきらめる
              </button>
            </div>
          </div>
        </div>
      )}
      {gameState.phase === 'defeat' && <BattleDefeatOverlay onRetry={retryBattle} />}
      {showPile && (
        <div className="battle-deck-overlay battle-deck-overlay--fullscreen" onClick={() => setShowPile(null)}>
          <div className="battle-deck-modal battle-deck-modal--fullscreen" onClick={(event) => event.stopPropagation()}>
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
            <div className="battle-deck-card-grid battle-deck-card-grid--pile card-display-grid">
              {currentPileCards.map((card, idx) => (
                <div
                  key={`${card.id}_${idx}`}
                  className="battle-deck-card-item battle-deck-card-item--pile card-display-item"
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
                className={`battle-settings-volume-toggle ${battleVolumeOpen ? 'battle-settings-volume-toggle--open' : ''}`}
                onClick={() => setBattleVolumeOpen((v) => !v)}
                aria-expanded={battleVolumeOpen}
              >
                <span>🔊 音量</span>
                <span className="battle-settings-volume-toggle-arrow" aria-hidden>
                  {battleVolumeOpen ? '▲' : '▼'}
                </span>
              </button>
              {battleVolumeOpen && (
                <div className="battle-settings-audio">
                  <div className="battle-settings-audio-item">
                    <div className="battle-settings-audio-head">
                      <span className="battle-settings-audio-title">BGM</span>
                      <button
                        type="button"
                        className={`battle-settings-mute ${bgmMuted ? 'battle-settings-mute--off' : 'battle-settings-mute--on'}`}
                        onClick={() => {
                          const next = toggleBgmMute();
                          setBgmMuted(next);
                        }}
                      >
                        {bgmMuted ? '🔇 OFF' : '🔊 ON'}
                      </button>
                    </div>
                  </div>
                  <div className="battle-settings-audio-item">
                    <div className="battle-settings-audio-head">
                      <span className="battle-settings-audio-title">SE</span>
                      <button
                        type="button"
                        className={`battle-settings-mute ${seMuted ? 'battle-settings-mute--off' : 'battle-settings-mute--on'}`}
                        onClick={() => {
                          const next = toggleSeMute();
                          setSeMuted(next);
                        }}
                      >
                        {seMuted ? '🔇 OFF' : '🔊 ON'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
      {battleTutorialIndex !== null && (
        <TutorialOverlay
          step={BATTLE_TUTORIAL_STEPS[battleTutorialIndex]}
          onNext={handleBattleTutorialNext}
          onSkip={handleBattleTutorialSkip}
        />
      )}
    </main>
  );
};

export default BattleScreen;

