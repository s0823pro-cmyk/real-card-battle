import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { BranchPreview, GameProgress, TileType } from '../../types/run';
import type { Card } from '../../types/game';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import { ICONS } from '../../assets/icons';
import { getMapBackground } from '../../data/mapBackgrounds';
import { GlossaryModal } from '../GlossaryModal/GlossaryModal';
import CardComponent from '../Hand/CardComponent';
import Tooltip from '../Tooltip/Tooltip';
import './RunMapScreen.css';

const MAP_NODE_IMAGES: Record<TileType, string> = {
  start: ICONS.mapStart,
  enemy: ICONS.mapBattle,
  unique_boss: ICONS.mapElite,
  area_boss: ICONS.mapBoss,
  pawnshop: ICONS.mapShop,
  event: ICONS.mapEvent,
  shrine: ICONS.mapShrine,
  hotel: ICONS.mapHotel,
};

function getNodeImage(nodeType: TileType): string | null {
  return MAP_NODE_IMAGES[nodeType] ?? null;
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

const getTilePreview = (type: GameProgress['board'][number]['type']): TilePreview => {
  switch (type) {
    case 'enemy':
      return {
        title: '⚔️ 戦闘',
        desc: '敵が現れる',
      };
    case 'unique_boss':
      return {
        title: '💀 強敵',
        desc: '強力な敵が待ち構えている',
      };
    case 'event':
      return { title: '❓ ？？？', desc: '何かが起こる…' };
    case 'shrine':
      return { title: '⛩️ 神社', desc: 'お守りが手に入る' };
    case 'pawnshop':
      return { title: '🏪 質屋', desc: 'カードやアイテムの売買' };
    case 'hotel':
      return { title: '🏨 ホテル', desc: '回復・強化・瞑想・アイテム' };
    case 'area_boss':
      return { title: '👑 エリアボス', desc: '強大な敵が待つ' };
    case 'start':
    default:
      return { title: '🏁 スタート', desc: 'ここから探索開始' };
  }
};

const getNodeSize = (type: TileType): number => {
  if (type === 'area_boss') return 70;
  if (type === 'unique_boss') return 65;
  return 60;
};

const NODE_SPACING_SCALE_X = 1.08;
const NODE_SPACING_SCALE_Y = 1.08;

const RunMapScreen = ({ progress, branchPreviews: _branchPreviews, onRollDice, onSelectTile, onGiveUp }: Props) => {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<TileTooltipState | null>(null);
  const [relicsOpen, setRelicsOpen] = useState(false);
  const [showDeck, setShowDeck] = useState(false);
  const [showMapSettings, setShowMapSettings] = useState(false);
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
  const [showMapGlossary, setShowMapGlossary] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [seEnabled, setSeEnabled] = useState(true);
  const [failedNodeImages, setFailedNodeImages] = useState<Set<TileType>>(new Set());
  const longPressTimerRef = useRef<number | null>(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchMovedRef = useRef(false);
  const prevAreaRef = useRef(progress.currentArea);
  const [isAreaFading, setIsAreaFading] = useState(true);
  const isSelecting = progress.currentScreen === 'branch_select' && progress.selectableTileIds.length > 0;

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

  const getHpClass = (): 'hp-high' | 'hp-mid' | 'hp-low' => {
    const ratio = progress.player.currentHp / Math.max(1, progress.player.maxHp);
    if (ratio <= 0.3) return 'hp-low';
    if (ratio <= 0.7) return 'hp-mid';
    return 'hp-high';
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
  });

  const noop = () => {};
  const sortedDeck = [...progress.deck].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  const bgUrl = progress.jobId === 'carpenter' ? getMapBackground(progress.currentArea) : null;

  return (
    <main
      className={`run-map-screen ${bgUrl && isAreaFading ? 'run-map-screen--bg-fadein' : ''}`}
      style={
        bgUrl
          ? {
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : {
              background: '#0d1117',
            }
      }
    >
      {bgUrl && <div className="map-bg-overlay" />}
      <header className="map-header">
        <div className="map-header-row">
          <span className="map-area-name">エリア{progress.currentArea}</span>
          <div className="map-player-stats">
            <span className={`map-stat map-stat--hp ${getHpClass()}`}>
              ❤️ {progress.player.currentHp}/{progress.player.maxHp}
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
              aria-label="マップ設定"
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
              お守り {relicsOpen ? '▲' : '▼'}
            </button>
            {relicsOpen && (
              <div className="map-relics">
                {progress.omamoris.map((relic, idx) => (
                  <Tooltip
                    key={`${relic.id}_${idx}`}
                    label={relic.name}
                    description={relic.description}
                  >
                    <span className="map-relic-icon">
                      {relic.imageUrl ? <img src={relic.imageUrl} alt={relic.name} className="map-relic-image" /> : (relic.icon ?? '🎴')}
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
            const nodeImage = failedNodeImages.has(tile.type) ? null : getNodeImage(tile.type);
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
                  !progress.selectableTileIds.includes(tile.id)
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
                  if (
                    progress.currentScreen === 'branch_select' &&
                    progress.selectableTileIds.includes(tile.id)
                  ) {
                    onSelectTile?.(tile.id);
                  }
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
            <p className="map-branch-inline-label">光っているノードをタップしてルートを選んでください</p>
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
            🎰 ルーレットを回す
          </button>
        )}
      </footer>
      {showMapSettings && (
        <div className="map-settings-overlay" onClick={() => setShowMapSettings(false)}>
          <div className="map-settings-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="map-settings-title">設定</h3>
            <div className="map-settings-items">
              <div className="map-settings-item">
                <span className="map-settings-label">BGM</span>
                <button
                  type="button"
                  className="settings-toggle"
                  onClick={() => setBgmEnabled((prev) => !prev)}
                >
                  {bgmEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="map-settings-item">
                <span className="map-settings-label">SE</span>
                <button
                  type="button"
                  className="settings-toggle"
                  onClick={() => setSeEnabled((prev) => !prev)}
                >
                  {seEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
            <div className="map-settings-divider" />
            <button
              type="button"
              className="btn-glossary"
              onClick={() => {
                setShowMapSettings(false);
                setShowMapGlossary(true);
              }}
            >
              📖 用語集
            </button>
            <button
              type="button"
              className="btn-give-up"
              onClick={() => setShowGiveUpConfirm(true)}
            >
              このランを諦める
            </button>
            <button
              type="button"
              className="btn-map-settings-close"
              onClick={() => setShowMapSettings(false)}
            >
              閉じる
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
            <h3 className="map-settings-title">本当に諦めますか？</h3>
            <p className="give-up-desc">進行状況は失われます。</p>
            <div className="give-up-buttons">
              <button
                type="button"
                className="btn-give-up-cancel"
                onClick={() => setShowGiveUpConfirm(false)}
              >
                やめておく
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
                諦める
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeck && (
        <div className="deck-overlay" onClick={() => setShowDeck(false)}>
          <div className="deck-modal" onClick={(event) => event.stopPropagation()}>
            <div className="deck-modal-header">
              <h2 className="deck-modal-title">デッキ ({progress.deck.length}枚)</h2>
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
