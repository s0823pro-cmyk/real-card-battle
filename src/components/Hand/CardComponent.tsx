import type { Card, JobId } from '../../types/game';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CSSProperties } from 'react';
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
  const JOB_COLORS = {
    carpenter: '#c0392b',
    cook: '#f9ca24',
    unemployed: '#8b949e',
  } as const;

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
  const innerStyle = {
    '--job-color': JOB_COLORS[jobId] ?? '#8b949e',
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
        card.wasReserved ? 'reserve-ready' : ''
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
        className={`hand-card-inner card-frame card-frame--${rarity}`}
        style={innerStyle}
      >
        <div
          className={`card-cost-badge ${
            effectiveValues.isTimeBuffed
              ? 'card-value--buffed'
              : effectiveValues.isTimeDebuffed
                ? 'card-value--debuffed'
                : ''
          }`}
        >
          <span className="card-cost-icon">⏱</span>
          <span className="card-cost-value">{effectiveValues.effectiveTimeCost}s</span>
        </div>

        <div className="card-illustration">
          {card.imageUrl ? (
            <img className="card-illustration-img" src={card.imageUrl} alt={card.name} />
          ) : (
            <div className="card-illustration-emoji">{card.icon ?? '🃏'}</div>
          )}
        </div>

        <div className="card-name">{card.name}</div>

        <div
          className="card-type-badge"
          style={{ background: typeColor.bg, color: typeColor.text }}
        >
          {typeColor.label}
        </div>

        <div className="card-divider" />

        <p className="card-description">{card.description}</p>
        {card.reserveBonus && <p className="card-reserve-bonus">{card.reserveBonus.description}</p>}

        <div className="card-foot">
          {effectiveValues.damage !== null && (
            <span
              key={`damage-${effectiveValues.damage}`}
              className={`card-value ${
                effectiveValues.isDamageBuffed
                  ? 'card-value--buffed card-value--changed'
                  : effectiveValues.isDamageDebuffed
                    ? 'card-value--debuffed card-value--changed'
                    : ''
              }`}
            >
              ⚔ {effectiveValues.damage}
            </span>
          )}
          {effectiveValues.block !== null && (
            <span
              key={`block-${effectiveValues.block}`}
              className={`card-value ${
                effectiveValues.isBlockBuffed
                  ? 'card-value--buffed card-value--changed'
                  : effectiveValues.isBlockDebuffed
                    ? 'card-value--debuffed card-value--changed'
                    : ''
              }`}
            >
              🛡 {effectiveValues.block}
            </span>
          )}
          {card.type === 'tool' && <span className="card-value">🔧 道具</span>}
        </div>
      </div>
      {isDragUnavailable && (
        <span className="time-shortage">{card.type === 'status' ? '使用不可' : '時間不足'}</span>
      )}
    </button>
  );
};

export default CardComponent;
