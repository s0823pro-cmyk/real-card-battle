import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { BranchPreview, GameProgress, TileType } from '../../types/run';
import type { Card } from '../../types/game';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import { getEffectiveMaxMental } from '../../utils/mentalLimits';
import { getMapBackgroundForJob } from '../../data/mapBackgrounds';
import { TILE_LABELS } from '../../data/runData';
import { useAudioContext } from '../../contexts/AudioContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { omamoriDescKey, omamoriNameKey } from '../../i18n/entityKeys';
import { GlossaryModal } from '../GlossaryModal/GlossaryModal';
import CardComponent from '../Hand/CardComponent';
import Tooltip from '../Tooltip/Tooltip';
import { removeBannerAd, setBannerSuppressed } from '../../utils/adMobClient';
import './RunMapScreen.css';

function getNodeImage(nodeType: TileType): string | null {
  return TILE_LABELS[nodeType]?.iconImg ?? null;
}

interface Props {
  progress: GameProgress;
  branchPreviews: BranchPreview[];
  onRollDice: () => void;
  onSelectTile?: (tileId: number) => void;
  onGiveUp: () => void;
}

type TooltipAlign = 'center' | 'left' | 'right';

interface TileTooltipState {
  tileId: number;
  placeBelow: boolean;
  align: TooltipAlign;
}

interface TilePreview {
  title: string;
  desc: string;
}

const getNodeSize = (type: TileType): number => {
  if (type === 'area_boss') return 70;
  if (type === 'unique_boss') return 65;
  return 60;
};

const NODE_SPACING_SCALE_X = 1.08;
const NODE_SPACING_SCALE_Y = 1.08;

const RunMapScreen = ({ progress, branchPreviews, onRollDice, onSelectTile, onGiveUp }: Props) => {
  const { t, locale, switchLocale, isLocaleLoading } = useLanguage();
  const getTilePreview = useCallback(
    (type: GameProgress['board'][number]['type']): TilePreview => {
      switch (type) {
        case 'enemy':
          return { title: t('map.tile.enemy.title'), desc: t('map.tile.enemy.desc') };
        case 'unique_boss':
          return { title: t('map.tile.elite.title'), desc: t('map.tile.elite.desc') };
        case 'event':
          return { title: t('map.tile.event.title'), desc: t('map.tile.event.desc') };
        case 'shrine':
          return { title: t('map.tile.shrine.title'), desc: t('map.tile.shrine.desc') };
        case 'pawnshop':
          return { title: t('map.tile.pawnshop.title'), desc: t('map.tile.pawnshop.desc') };
        case 'hotel':
          return { title: t('map.tile.hotel.title'), desc: t('map.tile.hotel.desc') };
        case 'area_boss':
          return { title: t('map.tile.boss.title'), desc: t('map.tile.boss.desc') };
        case 'start':
        default:
          return { title: t('map.tile.start.title'), desc: t('map.tile.start.desc') };
      }
    },
    [t],
  );
  const {
    toggleBgmMute,
    toggleSeMute,
    isBgmMuted,
    isSeMuted,
  } = useAudioContext();
  const [bgmMuted, setBgmMuted] = useState(() => isBgmMuted());
  const [seMuted, setSeMuted] = useState(() => isSeMuted());
  const [mapVolumeOpen, setMapVolumeOpen] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<TileTooltipState | null>(null);
  const [relicsOpen, setRelicsOpen] = useState(false);
  const [showDeck, setShowDeck] = useState(false);
  const [showMapSettings, setShowMapSettings] = useState(false);
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
  const [showMapGlossary, setShowMapGlossary] = useState(false);
  const [failedNodeImages, setFailedNodeImages] = useState<Set<TileType>>(new Set());
  const longPressTimerRef = useRef<number | null>(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchMovedRef = useRef(false);
  const prevAreaRef = useRef(progress.currentArea);
  const [isAreaFading, setIsAreaFading] = useState(true);
  const isSelecting = progress.currentScreen === 'branch_select' && progress.selectableTileIds.length > 0;

  /** 分岐プレビュー上のノードはグレーアウトしない（分岐先の2マス目以降も通常表示） */
  const branchRouteTileIds = useMemo(() => {
    const set = new Set<number>();
    for (const p of branchPreviews) {
      for (const t of p.previewTiles) {
        set.add(t.id);
      }
    }
    return set;
  }, [branchPreviews]);

  // マップ画面ではバナー広告を絶対に表示しない
  useEffect(() => {
    setBannerSuppressed(true);
    void removeBannerAd();
    const t1 = window.setTimeout(() => {
      void removeBannerAd();
    }, 1000);
    const t2 = window.setTimeout(() => {
      void removeBannerAd();
    }, 3000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      setBannerSuppressed(false);
    };
  }, []);

  useEffect(() => {
    const currentEl = boardRef.current?.querySelector<HTMLButtonElement>(
      `[data-tile-id="${progress.currentTileId}"]`,
    );
    currentEl?.scrollIntoView({ block: 'center', behavior: 'smooth', inline: 'center' });
  }, [progress.currentTileId]);

  useEffect(() => {
    if (prevAreaRef.current !== progress.currentArea) {
      setIsAreaFading(true);
      prevAreaRef.current = progress.currentArea;
      const timer = window.setTimeout(() => setIsAreaFading(false), 800);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [progress.currentArea]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTooltip(null);
  }, [progress.currentScreen]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isSelecting) setTooltip(null);
  }, [isSelecting]);

  useEffect(
    () => () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!showMapSettings) return;
    setBgmMuted(isBgmMuted());
    setSeMuted(isSeMuted());
    setMapVolumeOpen(false);
  }, [showMapSettings, isBgmMuted, isSeMuted]);

  const minX = Math.min(...progress.board.map((tile) => tile.x));
  const maxX = Math.max(...progress.board.map((tile) => tile.x));
  const minY = Math.min(...progress.board.map((tile) => tile.y));
  const maxY = Math.max(...progress.board.map((tile) => tile.y));
  const paddingX = 40;
  const paddingY = 44;
  const scaledWidth = (maxX - minX) * NODE_SPACING_SCALE_X;
  const scaledHeight = (maxY - minY) * NODE_SPACING_SCALE_Y;
  const baseWidth = scaledWidth + paddingX * 2;
  const baseHeight = scaledHeight + paddingY * 2;
  const width = Math.max(320, baseWidth);
  const height = Math.max(460, baseHeight);
  const offsetX = paddingX + (width - baseWidth) / 2;
  const offsetY = paddingY + (height - baseHeight) / 2;
  const toCanvasX = (x: number) => (x - minX) * NODE_SPACING_SCALE_X + offsetX;
  const toCanvasY = (y: number) => (y - minY) * NODE_SPACING_SCALE_Y + offsetY;

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const showTooltip = (tile: GameProgress['board'][number]) => {
    const canvasY = toCanvasY(tile.y);
    const placeBelow = canvasY < 86;
    let align: TooltipAlign = 'center';
    const canvasX = toCanvasX(tile.x);
    if (canvasX < 90) align = 'left';
    if (canvasX > width - 90) align = 'right';
    setTooltip({ tileId: tile.id, placeBelow, align });
  };

  const hideTooltip = (tileId: number) => {
    setTooltip((current) => (current?.tileId === tileId ? null : current));
  };

  /** 分岐マス選択が確定したとき（移動 SE は useRunProgress の1マス進行ループで再生） */
  const handleBranchNodeSelect = (tile: GameProgress['board'][number]) => {
    if (progress.currentScreen !== 'branch_select' || !progress.selectableTileIds.includes(tile.id)) {
      return;
    }
    onSelectTile?.(tile.id);
  };

  const getHpClass = (): 'hp-high' | 'hp-warning' | 'hp-critical' => {
    const ratio = progress.player.currentHp / Math.max(1, progress.player.maxHp);
    if (ratio <= 0.3) return 'hp-critical';
    if (ratio <= 0.5) return 'hp-warning';
    return 'hp-high';
  };

  const mentalMax = getEffectiveMaxMental(progress.player);

  const getMentalClass = (): 'mental-high' | 'mental-mid' | 'mental-low' => {
    const ratio = progress.player.mental / Math.max(1, mentalMax);
    if (ratio <= 0.3) return 'mental-low';
    if (ratio <= 0.6) return 'mental-mid';
    return 'mental-high';
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
    isAttackDamageWeakDebuffed: false,
    isBoosted: false,
    isDamageBoosted: false,
    isBlockBoosted: false,
  });

  const noop = () => {};
  const sortedDeck = [...progress.deck].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  const bgUrl = getMapBackgroundForJob(progress.jobId, progress.currentArea);

  return (
    <main
      className="run-map-screen"
      style={bgUrl ? { background: 'transparent' } : { background: '#0d1117' }}
    >
      {bgUrl && (
        <>
          <div
            className={`run-map-fullbleed-bg ${isAreaFading ? 'run-map-fullbleed-bg--fadein' : ''}`}
            style={{
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
            aria-hidden
          />
          <div className="map-bg-overlay" />
        </>
      )}
      {/* overflow: hidden の main 外に出せないため、ノッチ〜ステータス帯の黒みは fixed で被せる */}
      <div className="map-header-status-gradient" aria-hidden />
      <header className="map-header">
        <div className="map-header-row">
          <span className="map-area-name">{t('map.area', { n: progress.currentArea })}</span>
          <div className="map-player-stats">
            <span className={`map-stat map-stat--hp ${getHpClass()}`}>
              ❤️ {progress.player.maxHp}/{progress.player.currentHp}
            </span>
            <span className={`map-stat map-stat--mental ${getMentalClass()}`}>
              🧠 {progress.player.mental}/{mentalMax}
            </span>
            <span className="map-stat">💰 {progress.player.gold}G</span>
          </div>
          <div className="map-header-right">
            <button type="button" className="btn-deck-icon" onClick={() => setShowDeck(true)}>
              🃏 {progress.deck.length}
            </button>
            <button
              type="button"
              className="btn-map-settings"
              onClick={() => setShowMapSettings(true)}
              aria-label={t('map.settingsAria')}
            >
              ⚙️
            </button>
          </div>
        </div>
        {progress.omamoris.length > 0 && (
          <div className="map-relics-wrap">
            <button
              type="button"
              className="map-relics-toggle"
              onClick={() => setRelicsOpen((prev) => !prev)}
            >
              {t('map.relicsToggle', {
                state: relicsOpen ? t('map.relicsOpen') : t('map.relicsClosed'),
              })}
            </button>
            {relicsOpen && (
              <div className="map-relics">
                {progress.omamoris.map((relic, idx) => (
                  <Tooltip
                    key={`${relic.id}_${idx}`}
                    label={t(omamoriNameKey(relic.id), undefined, relic.name)}
                    description={t(omamoriDescKey(relic.id), undefined, relic.description)}
                  >
                    <span className="map-relic-icon">
                      {relic.imageUrl ? (
                        <img
                          src={relic.imageUrl}
                          alt={t(omamoriNameKey(relic.id), undefined, relic.name)}
                          className="map-relic-image"
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      ) : (
                        relic.icon ?? '🎴'
                      )}
                    </span>
                  </Tooltip>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      <section className="board-wrapper map-board-container" ref={boardRef}>
        <div className="board-canvas" style={{ width, height }}>
          <svg className="board-paths" viewBox={`0 0 ${width} ${height}`}>
            {(() => {
              const seen = new Set<string>();
              return progress.board.flatMap((tile) =>
                tile.nextTiles.map((nextId) => {
                  const next = progress.board.find((entry) => entry.id === nextId);
                  if (!next) return null;
                  const key = tile.id < next.id ? `${tile.id}_${next.id}` : `${next.id}_${tile.id}`;
                  if (seen.has(key)) return null;
                  seen.add(key);
                  return (
                    <line
                      key={`edge_${key}`}
                      x1={toCanvasX(tile.x)}
                      y1={toCanvasY(tile.y)}
                      x2={toCanvasX(next.x)}
                      y2={toCanvasY(next.y)}
                      className="board-path"
                    />
                  );
                }),
              );
            })()}
            {progress.traveledEdges.map((edge, idx) => {
              const from = progress.board.find((tile) => tile.id === edge.from);
              const to = progress.board.find((tile) => tile.id === edge.to);
              if (!from || !to) return null;
              return (
                <line
                  key={`traveled_${edge.from}_${edge.to}_${idx}`}
                  x1={toCanvasX(from.x)}
                  y1={toCanvasY(from.y)}
                  x2={toCanvasX(to.x)}
                  y2={toCanvasY(to.y)}
                  className="board-path board-path--visited"
                />
              );
            })}
            {progress.selectedBranchTileId &&
              (() => {
                const from = progress.board.find((tile) => tile.id === progress.currentTileId);
                const to = progress.board.find((tile) => tile.id === progress.selectedBranchTileId);
                if (!from || !to) return null;
                return (
                  <line
                    x1={toCanvasX(from.x)}
                    y1={toCanvasY(from.y)}
                    x2={toCanvasX(to.x)}
                    y2={toCanvasY(to.y)}
                    className="board-path board-path--selecting"
                  />
                );
              })()}
          </svg>

          {progress.board.map((tile) => {
            const preview = getTilePreview(tile.type);
            const nodeImage = failedNodeImages.has(tile.type)
              ? null
              : (tile.iconImg ?? getNodeImage(tile.type));
            const nodeSize = getNodeSize(tile.type);
            return (
              <button
                key={tile.id}
                type="button"
                data-tile-id={tile.id}
                className={`map-node map-node--${tile.type} ${tile.visited ? 'map-node--visited' : ''} ${
                  tile.isCurrentPosition ? 'map-node--current' : ''
                } ${tile.isBranch ? 'map-node--branch' : ''} ${
                  progress.selectableTileIds.includes(tile.id) ? 'map-node--selectable' : ''
                } ${
                  progress.currentScreen === 'branch_select' &&
                  progress.selectableTileIds.length > 0 &&
                  !progress.selectableTileIds.includes(tile.id) &&
                  !branchRouteTileIds.has(tile.id) &&
                  !tile.isCurrentPosition
                    ? 'map-node--non-selectable'
                    : ''
                }`}
                style={{
                  left: `${toCanvasX(tile.x) - nodeSize / 2}px`,
                  top: `${toCanvasY(tile.y) - nodeSize / 2}px`,
                }}
                onClick={() => {
                  if (touchMovedRef.current) {
                    touchMovedRef.current = false;
                    return;
                  }
                  touchMovedRef.current = false;
                  handleBranchNodeSelect(tile);
                }}
                onMouseEnter={() => {
                  if (isSelecting) return;
                  showTooltip(tile);
                }}
                onMouseLeave={() => hideTooltip(tile.id)}
                onPointerDown={(event) => {
                  if (event.pointerType === 'mouse' || isSelecting) return;
                  clearLongPress();
                  touchStartXRef.current = event.clientX;
                  touchStartYRef.current = event.clientY;
                  touchMovedRef.current = false;
                  longPressTimerRef.current = window.setTimeout(() => showTooltip(tile), 300);
                }}
                onPointerMove={(event) => {
                  if (event.pointerType === 'mouse' || isSelecting) return;
                  if (
                    Math.abs(event.clientX - touchStartXRef.current) > 10 ||
                    Math.abs(event.clientY - touchStartYRef.current) > 10
                  ) {
                    touchMovedRef.current = true;
                    clearLongPress();
                    hideTooltip(tile.id);
                  }
                }}
                onPointerUp={() => {
                  clearLongPress();
                  hideTooltip(tile.id);
                }}
                onPointerCancel={() => {
                  clearLongPress();
                  hideTooltip(tile.id);
                  touchMovedRef.current = false;
                }}
                onPointerLeave={() => {
                  clearLongPress();
                  hideTooltip(tile.id);
                }}
              >
                {nodeImage ? (
                  <img
                    className="map-node-img"
                    src={nodeImage}
                    alt={tile.name}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    onError={() =>
                      setFailedNodeImages((prev) => {
                        const next = new Set(prev);
                        next.add(tile.type);
                        return next;
                      })
                    }
                  />
                ) : (
                  <span className="map-node-icon">{tile.icon}</span>
                )}
                {tooltip?.tileId === tile.id && (
                  <div
                    className={`tile-tooltip ${tooltip.placeBelow ? 'tile-tooltip--below' : ''} ${
                      tooltip.align === 'left'
                        ? 'tile-tooltip--align-left'
                        : tooltip.align === 'right'
                          ? 'tile-tooltip--align-right'
                          : ''
                    }`}
                  >
                    <div className="tile-tooltip-title">{preview.title}</div>
                    <div className="tile-tooltip-desc">{preview.desc}</div>
                  </div>
                )}
              </button>
            );
          })}

          {null}
        </div>
      </section>

      <footer className="map-controls">
        {isSelecting ? (
          <div className="map-branch-inline">
            <p className="map-branch-inline-label">{t('map.branchHint')}</p>
          </div>
        ) : (
          <button
            type="button"
            className="btn-roulette"
            disabled={
              progress.currentScreen !== 'map' ||
              progress.board.find((tile) => tile.id === progress.currentTileId)?.type === 'area_boss'
            }
            onClick={onRollDice}
          >
            {t('map.roulette')}
          </button>
        )}
      </footer>
      {showMapSettings && (
        <div className="map-settings-overlay" onClick={() => setShowMapSettings(false)}>
          <div className="map-settings-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="map-settings-title">{t('common.settings')}</h3>
            <button
              type="button"
              className={`map-settings-volume-toggle ${mapVolumeOpen ? 'map-settings-volume-toggle--open' : ''}`}
              onClick={() => setMapVolumeOpen((v) => !v)}
              aria-expanded={mapVolumeOpen}
            >
              <span>{t('common.volume')}</span>
              <span className="map-settings-volume-toggle-arrow" aria-hidden>
                {mapVolumeOpen ? '▲' : '▼'}
              </span>
            </button>
            {mapVolumeOpen && (
              <div className="map-settings-audio">
                <div className="map-settings-audio-item">
                  <div className="map-settings-audio-head">
                    <span className="map-settings-audio-title">{t('common.bgm')}</span>
                    <button
                      type="button"
                      className={`map-settings-mute ${bgmMuted ? 'map-settings-mute--off' : 'map-settings-mute--on'}`}
                      onClick={() => {
                        const next = toggleBgmMute();
                        setBgmMuted(next);
                      }}
                    >
                      {bgmMuted ? t('common.audioOff') : t('common.audioOn')}
                    </button>
                  </div>
                </div>
                <div className="map-settings-audio-item">
                  <div className="map-settings-audio-head">
                    <span className="map-settings-audio-title">{t('common.se')}</span>
                    <button
                      type="button"
                      className={`map-settings-mute ${seMuted ? 'map-settings-mute--off' : 'map-settings-mute--on'}`}
                      onClick={() => {
                        const next = toggleSeMute();
                        setSeMuted(next);
                      }}
                    >
                      {seMuted ? t('common.audioOff') : t('common.audioOn')}
                    </button>
                  </div>
                </div>
                <div className="map-settings-language">
                  <span className="map-settings-language-label">{t('common.language')}</span>
                  {isLocaleLoading && <p className="map-settings-locale-loading">{t('common.localeLoading')}</p>}
                  <div className="map-settings-language-row" role="group" aria-label={t('common.language')}>
                    {(
                      [
                        { code: 'ja' as const, labelKey: 'lang.ja' as const },
                        { code: 'en' as const, labelKey: 'lang.en' as const },
                        { code: 'ko' as const, labelKey: 'lang.ko' as const },
                      ] as const
                    ).map(({ code, labelKey }) => (
                      <button
                        key={code}
                        type="button"
                        disabled={isLocaleLoading}
                        className={`map-settings-lang-btn ${locale === code ? 'map-settings-lang-btn--active' : ''}`}
                        onClick={() => void switchLocale(code)}
                      >
                        {t(labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="map-settings-divider" />
            <button
              type="button"
              className="btn-glossary"
              onClick={() => {
                setShowMapSettings(false);
                setShowMapGlossary(true);
              }}
            >
              {t('battle.glossary')}
            </button>
            <button
              type="button"
              className="btn-give-up"
              onClick={() => setShowGiveUpConfirm(true)}
            >
              {t('map.giveUpRun')}
            </button>
            <button
              type="button"
              className="btn-map-settings-close"
              onClick={() => setShowMapSettings(false)}
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
      {showMapGlossary && (
        <GlossaryModal onClose={() => setShowMapGlossary(false)} />
      )}
      {showGiveUpConfirm && (
        <div className="map-settings-overlay" onClick={() => setShowGiveUpConfirm(false)}>
          <div className="map-settings-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="map-settings-title">{t('map.giveUpTitle')}</h3>
            <p className="give-up-desc">{t('map.giveUpDesc')}</p>
            <div className="give-up-buttons">
              <button
                type="button"
                className="btn-give-up-cancel"
                onClick={() => setShowGiveUpConfirm(false)}
              >
                {t('map.giveUpCancel')}
              </button>
              <button
                type="button"
                className="btn-give-up-confirm"
                onClick={() => {
                  setShowGiveUpConfirm(false);
                  setShowMapSettings(false);
                  onGiveUp();
                }}
              >
                {t('map.giveUpConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeck && (
        <div className="deck-overlay" onClick={() => setShowDeck(false)}>
          <div className="deck-modal" onClick={(event) => event.stopPropagation()}>
            <div className="deck-modal-header">
              <h2 className="deck-modal-title">{t('map.deckTitle', { n: progress.deck.length })}</h2>
              <button type="button" className="btn-close" onClick={() => setShowDeck(false)}>
                ✕
              </button>
            </div>
            <div className="deck-card-grid card-display-grid">
              {sortedDeck.map((card, idx) => (
                <div
                  key={`${card.id}_${idx}`}
                  className="deck-card-item card-display-item"
                  style={
                    {
                      '--hand-card-width': '90px',
                      '--hand-card-height': '144px',
                    } as CSSProperties
                  }
                >
                  <CardComponent
                    card={card}
                    jobId={progress.jobId}
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
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default RunMapScreen;
