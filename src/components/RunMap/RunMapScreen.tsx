import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { BranchPreview, GameProgress } from '../../types/run';
import type { Card } from '../../types/game';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import BranchSelectModal from './BranchSelectModal';
import CardComponent from '../Hand/CardComponent';
import Tooltip from '../Tooltip/Tooltip';
import './RunMapScreen.css';

interface Props {
  progress: GameProgress;
  branchPreviews: BranchPreview[];
  onRollDice: () => void;
  onSelectTile?: (tileId: number) => void;
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
      return { title: '🏨 ホテル', desc: '回復・強化・瞑想' };
    case 'area_boss':
      return { title: '👑 エリアボス', desc: '強大な敵が待つ' };
    case 'start':
    default:
      return { title: '🏁 スタート', desc: 'ここから探索開始' };
  }
};

const RunMapScreen = ({ progress, branchPreviews, onRollDice, onSelectTile }: Props) => {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [pieceLanding, setPieceLanding] = useState(false);
  const [tooltip, setTooltip] = useState<TileTooltipState | null>(null);
  const [relicsOpen, setRelicsOpen] = useState(false);
  const [showDeck, setShowDeck] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchMovedRef = useRef(false);
  const prevTileIdRef = useRef(progress.currentTileId);
  const isSelecting = progress.currentScreen === 'branch_select' && progress.selectableTileIds.length > 0;

  useEffect(() => {
    const currentEl = boardRef.current?.querySelector<HTMLButtonElement>(
      `[data-tile-id="${progress.currentTileId}"]`,
    );
    currentEl?.scrollIntoView({ block: 'center', behavior: 'smooth', inline: 'center' });
  }, [progress.currentTileId]);

  useEffect(() => {
    if (prevTileIdRef.current !== progress.currentTileId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPieceLanding(true);
      const timer = window.setTimeout(() => setPieceLanding(false), 420);
      prevTileIdRef.current = progress.currentTileId;
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [progress.currentTileId]);

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

  const maxX = Math.max(...progress.board.map((tile) => tile.x)) + 72;
  const maxY = Math.max(...progress.board.map((tile) => tile.y)) + 90;
  const width = Math.max(320, maxX);
  const height = Math.max(460, maxY);

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const showTooltip = (tile: GameProgress['board'][number]) => {
    const placeBelow = tile.y < 86;
    let align: TooltipAlign = 'center';
    if (tile.x < 90) align = 'left';
    if (tile.x > width - 90) align = 'right';
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
    effectiveTimeCost: card.timeCost,
    isTimeBuffed: false,
    isTimeDebuffed: false,
    isDamageBuffed: false,
    isDamageDebuffed: false,
    isBlockBuffed: false,
    isBlockDebuffed: false,
  });

  const noop = () => {};
  const sortedDeck = [...progress.deck].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

  return (
    <main className="run-map-screen">
      <header className="map-header">
        <div className="map-header-row">
          <span className="map-area-name">エリア{progress.currentArea}</span>
          <div className="map-player-stats">
            <span className={`map-stat map-stat--hp ${getHpClass()}`}>
              ❤️ {progress.player.currentHp}/{progress.player.maxHp}
            </span>
            <span className="map-stat">🧠 {progress.player.mental}</span>
            <span className="map-stat">💰 {progress.player.gold}G</span>
            <button type="button" className="btn-deck-icon" onClick={() => setShowDeck(true)}>
              🃏 {progress.deck.length}
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
                {progress.omamoris.map((relic) => (
                  <Tooltip
                    key={relic.id}
                    label={relic.name}
                    description={relic.description}
                  >
                    <span className="map-relic-icon">{relic.icon}</span>
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
                      x1={tile.x}
                      y1={tile.y}
                      x2={next.x}
                      y2={next.y}
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
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
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
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    className="board-path board-path--selecting"
                  />
                );
              })()}
          </svg>

          {progress.board.map((tile) => {
            const preview = getTilePreview(tile.type);
            return (
              <button
                key={tile.id}
                type="button"
                data-tile-id={tile.id}
                className={`board-tile board-tile--${tile.type} ${tile.visited ? 'board-tile--visited' : ''} ${
                  tile.isCurrentPosition ? 'board-tile--current' : ''
                } ${tile.isBranch ? 'board-tile--branch' : ''} ${
                  progress.selectableTileIds.includes(tile.id) ? 'board-tile--selectable' : ''
                } ${
                  progress.currentScreen === 'branch_select' &&
                  progress.selectableTileIds.length > 0 &&
                  !progress.selectableTileIds.includes(tile.id)
                    ? 'board-tile--non-selectable'
                    : ''
                }`}
                style={{ left: `${tile.x - 26}px`, top: `${tile.y - 26}px` }}
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
                <span>{tile.icon}</span>
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

          {(() => {
            const tile = progress.board.find((entry) => entry.id === progress.currentTileId);
            if (!tile) return null;
            return (
              <div
                className={`player-piece ${pieceLanding ? 'player-piece--landing' : ''}`}
              style={{ left: `${tile.x - 14}px`, top: `${tile.y - 14}px` }}
              >
                🧑
              </div>
            );
          })()}
        </div>
      </section>

      <footer className="map-controls">
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
      </footer>
      {progress.currentScreen === 'branch_select' && (
        <BranchSelectModal
          previews={branchPreviews}
          currentTileId={progress.currentTileId}
          onSelect={(tileId) => onSelectTile?.(tileId)}
        />
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
