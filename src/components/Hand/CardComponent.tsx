import type { Card, JobId } from '../../types/game';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { EffectiveCardValues } from '../../utils/cardPreview';

interface Props {
  card: Card;
  jobId: JobId;
  selected: boolean;
  disabled: boolean;
  locked: boolean;
  isSelling: boolean;
  isReturning: boolean;
  isGhost: boolean;
  isDragging: boolean;
  isDragUnavailable: boolean;
  effectiveValues: EffectiveCardValues;
  onSelect: () => void;
  onPointerDown: (event: ReactPointerEvent) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: (event: ReactPointerEvent) => void;
  onPointerCancel: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const CardComponent = ({
  card,
  jobId,
  selected,
  disabled,
  locked,
  isSelling,
  isReturning,
  isGhost,
  isDragging,
  isDragUnavailable,
  effectiveValues,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onMouseEnter,
  onMouseLeave,
}: Props) => {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const nameRef = useRef<HTMLSpanElement | null>(null);
  const textBandRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageLoadFailed(false);
  }, [card.id, card.imageUrl]);

  useEffect(() => {
    const nameEl = nameRef.current;
    const bandEl = textBandRef.current;
    if (!nameEl || !bandEl) return;
    window.requestAnimationFrame(() => {
      nameEl.style.fontSize = '11px';
      nameEl.style.whiteSpace = 'nowrap';

      const availableWidth = bandEl.clientWidth - 8;

      let size = 11;
      while (nameEl.scrollWidth > availableWidth && size > 5) {
        size -= 0.5;
        nameEl.style.fontSize = `${size}px`;
      }
    });
  }, [card.name]);

  const JOB_COLORS = {
    carpenter: '#c0392b',
    cook: '#f9ca24',
    unemployed: '#3d444d',
  } as const;
  const NEUTRAL_COLOR = '#ffffff';

  const TYPE_COLORS = {
    attack: { bg: '#7f1d1d', text: '#fca5a5', label: 'アタック' },
    skill: { bg: '#1e3a5f', text: '#93c5fd', label: 'スキル' },
    power: { bg: '#3b1f6e', text: '#c4b5fd', label: 'パワー' },
    tool: { bg: '#1a3a2a', text: '#6ee7b7', label: '道具' },
    status: { bg: '#374151', text: '#9ca3af', label: 'ステータス' },
    curse: { bg: '#1a0a0a', text: '#f87171', label: '呪い' },
  } as const;

  type Rarity = 'common' | 'uncommon' | 'rare' | 'starter';
  const getRarity = (target: Card): Rarity => {
    if (target.rarity) return target.rarity;
    // 報酬/ショップで生成されたカードは reward サフィックス付き。
    // それ以外は初期デッキ由来として扱う。
    if (!target.id.includes('_reward_')) return 'starter';
    const value = target.sellValue ?? 5;
    if (value >= 14) return 'rare';
    if (value >= 10) return 'uncommon';
    return 'common';
  };

  const RARITY_COLORS = {
    common: '#8b949e',
    uncommon: '#3b82f6',
    rare: '#f0b429',
    starter: '#8b949e',
  } as const;

  const typeColor = TYPE_COLORS[card.type] ?? TYPE_COLORS.status;
  const rarity = getRarity(card);
  const reserveBonusReady = Boolean(card.wasReserved && card.reserveBonus);
  const getJobColor = (targetCard: Card, targetJobId: JobId): string => {
    if (targetCard.neutral) return NEUTRAL_COLOR;
    return JOB_COLORS[targetJobId] ?? '#3d444d';
  };
  const innerStyle = {
    '--job-color': getJobColor(card, jobId),
    '--border-color': RARITY_COLORS[rarity],
    '--glow-color':
      rarity === 'rare'
        ? 'rgba(240,180,41,0.6)'
        : rarity === 'uncommon'
          ? 'rgba(59,130,246,0.4)'
          : 'rgba(74,85,104,0.3)',
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`hand-card ${card.type} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${
        isSelling ? 'selling' : ''
      } ${isReturning ? 'returning' : ''} ${isGhost ? 'ghost' : ''} ${isDragging ? 'hand-card--dragging' : ''} ${
        reserveBonusReady ? 'reserve-ready' : ''
      }`}
      onClick={(event) => event.preventDefault()}
      onMouseDown={(event) => event.preventDefault()}
      onTouchStart={(event) => event.preventDefault()}
      disabled={isSelling || locked}
      aria-pressed={selected}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div
        className={`hand-card-inner card-frame card-frame--${rarity} ${reserveBonusReady ? 'card-frame--reserved' : ''}`}
        style={innerStyle}
      >
        {(rarity === 'uncommon' || rarity === 'rare') && <div className="card-particles" />}
        <div className="card-bg-illustration">
          {card.imageUrl && !imageLoadFailed ? (
            <img
              className="card-bg-img"
              src={card.imageUrl}
              alt={card.name}
              onError={() => setImageLoadFailed(true)}
            />
          ) : (
            <div className="card-bg-emoji">{card.icon ?? '🃏'}</div>
          )}
        </div>

        <div
          className={`card-cost-badge ${
            effectiveValues.isTimeBuffed
              ? 'card-value--buffed'
              : effectiveValues.isTimeDebuffed
                ? 'card-value--debuffed'
                : ''
          }`}
        >
          <span className="card-cost-value">
            {effectiveValues.effectiveTimeCost}
            <span className="card-cost-unit">s</span>
          </span>
        </div>

        <div className="card-text-band" ref={textBandRef}>
          <span ref={nameRef} className="card-name">
            {card.name}
          </span>
          <div
            className="card-type-badge"
            style={{ background: typeColor.bg, color: typeColor.text }}
          >
            {typeColor.label}
          </div>
          <div className="card-description">{card.description}</div>
          {card.reserveBonus && <p className="card-reserve-bonus">{card.reserveBonus.description}</p>}
        </div>
      </div>
      {isDragUnavailable && (
        <span className="time-shortage">{card.type === 'status' ? '使用不可' : '時間不足'}</span>
      )}
    </button>
  );
};

export default CardComponent;
