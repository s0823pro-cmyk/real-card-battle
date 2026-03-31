import type { CSSProperties } from 'react';
import type { Card, JobId, ToolSlot } from '../../types/game';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import CardComponent from '../Hand/CardComponent';
import Tooltip from '../Tooltip/Tooltip';
import './ToolSlots.css';

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
    isAttackDamageWeakDebuffed: false,
  });
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget.children[0] as HTMLElement;
    if (!el) return;
    const startX = e.pageX - el.offsetLeft;
    const scrollLeft = el.scrollLeft;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const x = moveEvent.pageX - el.offsetLeft;
      el.scrollLeft = scrollLeft - (x - startX);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="battle-slots-row">
      <div
        style={{
          width: '120px',
          flexShrink: 0,
          overflow: 'hidden',
          touchAction: 'pan-x',
          cursor: 'grab',
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {}
        }}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => {
          e.stopPropagation();
        }}
        onMouseDown={handleMouseDown}
      >
        <div
          className="tool-slots-inline tool-slots-inline--scrollable equipment-slot"
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            touchAction: 'pan-x',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {Array.from({ length: toolDisplayCount }).map((_, idx) => {
            const slot = toolSlots[idx];
            return (
              <Tooltip
                key={`tool-${idx}`}
                label={slot ? slot.card.name : '装備スロット'}
                description={
                  slot
                    ? slot.card.description
                    : '装備カード。4枚以上セット可能。4枚目以降は横スクロールで確認できる。毎ターン自動で効果が発動する。'
                }
              >
                {slot ? (
                  <div
                    className="tool-slot-card-item"
                    style={
                      {
                        '--hand-card-width': '36px',
                        '--hand-card-height': '52px',
                      } as CSSProperties
                    }
                  >
                    <CardComponent
                      card={slot.card}
                      jobId={jobId}
                      selected={false}
                      disabled={false}
                      locked={true}
                      isSelling={false}
                      isReturning={false}
                      isGhost={false}
                      isDragging={false}
                      isDragUnavailable={false}
                      zukanMode="list"
                      effectiveValues={getBaseEffectiveValues(slot.card)}
                      onSelect={noop}
                      onPointerDown={noop}
                      onPointerMove={noop}
                      onPointerUp={noop}
                      onPointerCancel={noop}
                      onMouseEnter={noop}
                      onMouseLeave={noop}
                      style={
                        {
                          '--hand-card-width': '36px',
                          '--hand-card-height': '52px',
                          position: 'relative',
                          transform: 'none',
                          transition: 'none',
                          flexShrink: 0,
                          width: '36px',
                          height: '52px',
                        } as CSSProperties
                      }
                    />
                  </div>
                ) : (
                  <span className="tool-slot-inline empty" />
                )}
              </Tooltip>
            );
          })}
        </div>
      </div>

      <div className="slots-divider" />
      <div
        style={{
          width: '116px',
          flexShrink: 0,
          overflow: 'hidden',
          touchAction: 'pan-x',
          cursor: 'grab',
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {}
        }}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => {
          e.stopPropagation();
        }}
        onMouseDown={handleMouseDown}
      >
        <div
          className="power-slots power-slots--scrollable power-slot"
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            touchAction: 'pan-x',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
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
                        '--hand-card-width': '36px',
                        '--hand-card-height': '56px',
                        position: 'relative',
                        transform: 'none',
                        transition: 'none',
                        flexShrink: 0,
                        width: '36px',
                        height: '56px',
                      } as CSSProperties
                    }
                  />
                </div>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ToolSlots;
