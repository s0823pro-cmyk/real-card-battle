import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { JobId } from '../../types/game';
import CardComponent from '../Hand/CardComponent';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import type { Achievement } from '../../utils/achievementSystem';
import { getAchievementRewardCard, getAchievementRewardOmamori } from '../../utils/achievementRewardLookup';

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

export const AchievementRewardModal = ({ selected, onClose, jobId }: AchievementRewardModalProps) => {
  if (!selected) return null;

  return (
    <div className="achievement-reward-overlay" onClick={onClose}>
      <div className="achievement-reward-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="achievement-reward-modal-title">
          {selected.icon} {selected.name}
        </h3>
        <p className="achievement-reward-modal-sub">解放された報酬</p>
        {selected.rewardType === 'card' ? (() => {
          const card = getAchievementRewardCard(selected.rewardId);
          if (!card) return null;
          const values: EffectiveCardValues = {
            ...STATIC_VALUES,
            damage: card.damage ?? null,
            block: card.block ?? null,
            heal:
              (card.effects ?? [])
                .filter((e) => e.type === 'heal')
                .reduce((s, e) => s + e.value, 0) || null,
            effectiveTimeCost: card.timeCost,
          };
          return (
            <div style={{ '--hand-card-width': '160px', '--hand-card-height': '256px' } as CSSProperties}>
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
                effectiveValues={values}
                onSelect={noop}
                onPointerDown={noopPointer}
                onPointerMove={noopPointer}
                onPointerUp={noopPointer}
                onPointerCancel={noop}
                onMouseEnter={noop}
                onMouseLeave={noop}
              />
            </div>
          );
        })() : (() => {
          const omamori = getAchievementRewardOmamori(selected.rewardId);
          if (!omamori) return null;
          return (
            <div className="achievement-omamori-detail">
              <span className="achievement-omamori-icon">{omamori.icon}</span>
              <p className="achievement-omamori-name">{omamori.name}</p>
              <p className="achievement-omamori-desc">{omamori.description}</p>
            </div>
          );
        })()}
        <button type="button" className="achievement-reward-close" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
};
