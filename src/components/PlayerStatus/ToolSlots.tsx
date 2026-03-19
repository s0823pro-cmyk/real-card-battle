import type { CSSProperties } from 'react';
import type { Card, JobId, ToolSlot } from '../../types/game';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import CardComponent from '../Hand/CardComponent';
import Tooltip from '../Tooltip/Tooltip';

interface Props {
  toolSlots: ToolSlot[];
  activePowers: Card[];
  jobId: JobId;
}

const ToolSlots = ({ toolSlots, activePowers, jobId }: Props) => {
  const noop = () => {};
  const BASE_SLOT_COUNT = 3;
  const toolDisplayCount = Math.max(BASE_SLOT_COUNT, toolSlots.length);
  const powerDisplayCount = Math.max(BASE_SLOT_COUNT, activePowers.length);
  const getSimplePowerDescription = (card: Card): string => {
    const firstSentence = card.description.split('。')[0]?.trim();
    return firstSentence && firstSentence.length > 0 ? `${firstSentence}。` : card.description;
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

  return (
    <div className="battle-slots-row">
      <div
        className={`tool-slots-inline ${toolSlots.length >= 4 ? 'tool-slots-inline--scrollable' : ''}`}
        style={{ width: '138px', maxWidth: '138px', overflowX: toolSlots.length >= 4 ? 'auto' : 'hidden' }}
      >
        {Array.from({ length: toolDisplayCount }).map((_, idx) => {
          const slot = toolSlots[idx];
          return (
            <Tooltip
              key={`tool-${idx}`}
              label={slot ? slot.card.name : '道具スロット'}
              description={
                slot
                  ? slot.card.description
                  : '装備カード。4枚以上セット可能。4枚目以降は横スクロールで確認できる。毎ターン自動で効果が発動する。'
              }
            >
              <span className={`tool-slot-inline ${slot ? 'filled' : 'empty'} ${slot?.card.type ?? ''}`}>
                {slot ? (
                  <>
                    <span className="tool-slot-inline-icon">{slot.card.icon ?? '🔧'}</span>
                    <span className="tool-slot-inline-name">{slot.card.name}</span>
                  </>
                ) : null}
              </span>
            </Tooltip>
          );
        })}
      </div>

      <div className="slots-divider" />
      <div
        className={`power-slots ${activePowers.length >= 4 ? 'power-slots--scrollable' : ''}`}
        style={{ width: '140px', maxWidth: '140px', overflowX: activePowers.length >= 4 ? 'auto' : 'hidden' }}
      >
        {Array.from({ length: powerDisplayCount }).map((_, idx) => {
          const power = activePowers[idx];
          if (!power) {
            return (
              <Tooltip
                key={`power-empty-${idx}`}
                label="パワースロット"
                description="パワーカードをセットすると、戦闘中に継続効果が有効になります。"
                touchMode="hold"
              >
                <div className="power-slot-item power-slot-item--empty" />
              </Tooltip>
            );
          }
          return (
            <Tooltip
              key={`power-${power.id}-${idx}`}
              label={power.name}
              description={getSimplePowerDescription(power)}
              touchMode="hold"
            >
              <div className="power-slot-item">
                <CardComponent
                  card={power}
                  jobId={jobId}
                  selected={false}
                  disabled={false}
                  locked={false}
                  isSelling={false}
                  isReturning={false}
                  isGhost={false}
                  isDragging={false}
                  isDragUnavailable={false}
                  zukanMode="list"
                  effectiveValues={getBaseEffectiveValues(power)}
                  onSelect={noop}
                  onPointerDown={noop}
                  onPointerMove={noop}
                  onPointerUp={noop}
                  onPointerCancel={noop}
                  onMouseEnter={noop}
                  onMouseLeave={noop}
                  style={
                    {
                      '--hand-card-width': '44px',
                      '--hand-card-height': '70px',
                      position: 'relative',
                      transform: 'none',
                      transition: 'none',
                      flexShrink: 0,
                    } as CSSProperties
                  }
                />
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

export default ToolSlots;
