import type { Card, JobId } from '../../types/game';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import type { CSSProperties, RefObject } from 'react';
import CardComponent from '../Hand/CardComponent';
import Tooltip from '../Tooltip/Tooltip';
import './ActionBar.css';

interface Props {
  reserved: Card[];
  jobId: JobId;
  isDragging: boolean;
  activeDropTarget: 'enemy' | 'field' | 'timebar' | 'hand' | 'reserve' | 'sell' | null;
  reserveFull: boolean;
  reserveDropRef?: RefObject<HTMLDivElement | null>;
}

const ActionBar = ({
  reserved,
  jobId,
  isDragging: _isDragging,
  activeDropTarget,
  reserveFull,
  reserveDropRef,
}: Props) => {
  const reservePenaltySeconds = reserved.length * 1.5;
  const reservePenaltyLabel =
    reserved.length > 0
      ? `次ターン -${Number.isInteger(reservePenaltySeconds) ? reservePenaltySeconds : reservePenaltySeconds.toFixed(1)}秒`
      : '';

  const noop = () => {};

  const getBaseEffectiveValues = (card: Card): EffectiveCardValues => ({
    damage: card.damage ?? null,
    block: card.block ?? null,
    heal:
      (card.effects ?? [])
        .filter((effect) => effect.type === 'heal')
        .reduce((sum, effect) => sum + effect.value, 0) || null,
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

  return (
    <section className="action-bar bottom-area">
      <div className="reserve-left">
        <div className="reserve-slots-row">
          <div
            className={`reserved-cards drop-target reserve-target ${
              activeDropTarget === 'reserve' ? 'active' : ''
            } ${reserveFull ? 'full' : ''} ${
              activeDropTarget === 'reserve' && reserveFull ? 'reject' : ''
            }`}
            ref={reserveDropRef}
          >
            <div className={`reserve-slots${reserved.length >= 3 ? ' reserve-slots--scrollable' : ''}`}>
              {reserved.length === 0 ? (
                <>
                  <Tooltip
                    label="温存枠"
                    description="カードをここにドロップすると温存できます。温存したカードは次ターン開始時に手札に戻ります。温存1枚につき次ターンの時間が1.5秒減少します。"
                  >
                    <div className="reserved-card-mini empty" />
                  </Tooltip>
                  <Tooltip
                    label="温存枠"
                    description="カードをここにドロップすると温存できます。温存したカードは次ターン開始時に手札に戻ります。温存1枚につき次ターンの時間が1.5秒減少します。"
                  >
                    <div className="reserved-card-mini empty" />
                  </Tooltip>
                </>
              ) : (
                reserved.map((card, index) => (
                  <Tooltip
                    key={`reserved-${index}`}
                    label={card.name}
                    description={card.description ?? ''}
                  >
                    <div className="reserve-slot-item">
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
                        zukanMode="list"
                        effectiveValues={getBaseEffectiveValues(card)}
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
                          } as CSSProperties
                        }
                      />
                    </div>
                  </Tooltip>
                ))
              )}
            </div>
          </div>
        </div>
        <p className="reserve-penalty-inline">
          {reservePenaltyLabel}
        </p>
      </div>
      <div className="reserve-right" />
    </section>
  );
};

export default ActionBar;
