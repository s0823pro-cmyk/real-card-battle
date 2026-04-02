import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Card, JobId } from '../../types/game';
import CardComponent from '../Hand/CardComponent';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import type { Achievement } from '../../utils/achievementTypes';
import { getAchievementRewardCards } from '../../utils/achievementRewardLookup';
import './AchievementRewardModal.css';

const STATIC_VALUES: EffectiveCardValues = {
  damage: null,
  block: null,
  heal: null,
  effectiveTimeCost: 0,
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
};

const noop = (): void => {};
const noopPointer = (_e: ReactPointerEvent): void => {
  void _e;
};

interface AchievementRewardModalProps {
  selected: Achievement | null;
  onClose: () => void;
  jobId: JobId;
}

const cardToValues = (card: Card): EffectiveCardValues => ({
  ...STATIC_VALUES,
  damage: card.damage ?? null,
  block: card.block ?? null,
  heal:
    (card.effects ?? []).filter((e) => e.type === 'heal').reduce((s, e) => s + e.value, 0) || null,
  effectiveTimeCost: card.timeCost,
});

export const AchievementRewardModal = ({ selected, onClose, jobId }: AchievementRewardModalProps) => {
  if (!selected) return null;

  const [cardA, cardB] = getAchievementRewardCards(selected.rewardCardIds[0], selected.rewardCardIds[1]);

  return createPortal(
    <div
      className="achievement-reward-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div
        className="achievement-reward-modal"
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <h3 className="achievement-reward-modal-title">
          {selected.icon} {selected.name}
        </h3>
        <p className="achievement-reward-modal-sub">解放された報酬（カード2枚）</p>
        <div className="achievement-reward-cards-row">
          {[cardA, cardB].map((card, idx) =>
            card ? (
              <div
                key={`${card.id}_${idx}`}
                style={{ '--hand-card-width': '140px', '--hand-card-height': '224px' } as CSSProperties}
              >
                <CardComponent
                  card={card}
                  jobId={jobId}
                  selected={false}
                  disabled={false}
                  locked={false}
                  isSelling={false}
                  isReturning={false}
                  isGhost={false}
                  isDragging={false}
                  isDragUnavailable={false}
                  effectiveValues={cardToValues(card)}
                  onSelect={noop}
                  onPointerDown={noopPointer}
                  onPointerMove={noopPointer}
                  onPointerUp={noopPointer}
                  onPointerCancel={noop}
                  onMouseEnter={noop}
                  onMouseLeave={noop}
                />
              </div>
            ) : null,
          )}
        </div>
        <button
          type="button"
          className="achievement-reward-close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          閉じる
        </button>
      </div>
    </div>,
    document.body,
  );
};
