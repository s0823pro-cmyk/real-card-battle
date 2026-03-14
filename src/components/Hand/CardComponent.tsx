import type { Card } from '../../types/game';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { EffectiveCardValues } from '../../utils/cardPreview';

interface Props {
  card: Card;
  selected: boolean;
  disabled: boolean;
  locked: boolean;
  isSelling: boolean;
  isReturning: boolean;
  isGhost: boolean;
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
  selected,
  disabled,
  locked,
  isSelling,
  isReturning,
  isGhost,
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
  const typeLabel =
    card.type === 'attack'
      ? '攻撃'
      : card.type === 'skill'
        ? '技術'
        : card.type === 'power'
          ? '能力'
          : card.type === 'tool'
            ? '道具'
            : '状態';

  return (
    <button
      type="button"
      className={`hand-card ${card.type} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${
        isSelling ? 'selling' : ''
      } ${isReturning ? 'returning' : ''} ${isGhost ? 'ghost' : ''} ${card.wasReserved ? 'reserve-ready' : ''}`}
      onClick={(event) => event.preventDefault()}
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
      <div className="card-type-line" />
      <div className="card-head">
        <span
          className={`card-time ${
            effectiveValues.isTimeBuffed
              ? 'card-value--buffed'
              : effectiveValues.isTimeDebuffed
                ? 'card-value--debuffed'
                : ''
          }`}
        >
          ⏱{effectiveValues.effectiveTimeCost}s
        </span>
        <span className="card-name">[{typeLabel}]</span>
      </div>
      <div className="card-image">
        {card.imageUrl ? <img src={card.imageUrl} alt={card.name} /> : <span>{card.icon ?? '🃏'}</span>}
      </div>
      <p className="card-name">{card.name}</p>
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
        {card.type === 'tool' && <span>🔧 道具</span>}
      </div>
      {isDragUnavailable && (
        <span className="time-shortage">{card.type === 'status' ? '使用不可' : '時間不足'}</span>
      )}
    </button>
  );
};

export default CardComponent;
