import type { Card, CardBadge, JobId } from '../../types/game';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CSSProperties, ReactNode } from 'react';
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
  zukanMode?: 'list' | 'detail';
  style?: CSSProperties;
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
  zukanMode,
  style: styleProp,
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
  const headerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageLoadFailed(false);
  }, [card.id, card.imageUrl]);

  useEffect(() => {
    const nameEl = nameRef.current;
    const headerEl = headerRef.current;
    if (!nameEl || !headerEl) return;
    window.requestAnimationFrame(() => {
      const badgeEl = headerEl.querySelector('.card-cost-badge') as HTMLElement | null;
      const badgeWidth = badgeEl?.offsetWidth ?? 22;
      const gap = 6;
      const padding = 12;
      const availableWidth = headerEl.clientWidth - badgeWidth - gap - padding;
      const minSizeRaw = window.getComputedStyle(nameEl).getPropertyValue('--card-name-min-size').trim();
      const minSize = Number.isFinite(Number.parseFloat(minSizeRaw))
        ? Number.parseFloat(minSizeRaw)
        : 6;

      nameEl.style.whiteSpace = 'nowrap';
      nameEl.style.fontSize = '11px';

      let size = 11;
      while (nameEl.scrollWidth > availableWidth && size > minSize) {
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

  const RARITY_STYLES = {
    starter: {
      borderColor: '#4a5568',
      glowColor: 'rgba(74,85,104,0.3)',
    },
    common: {
      borderColor: '#4a5568',
      glowColor: 'rgba(74,85,104,0.3)',
    },
    uncommon: {
      borderColor: '#3b82f6',
      glowColor: 'rgba(59,130,246,0.4)',
    },
    rare: {
      borderColor: '#f0b429',
      glowColor: 'rgba(240,180,41,0.6)',
    },
  } as const;

  const BADGE_LABELS: Record<CardBadge, string> = {
    exhaust: '消耗',
    setup: '準備',
  };
  const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const replaceChangedValue = (
    source: ReactNode[],
    baseValue: number | null | undefined,
    nextValue: number | null | undefined,
    unit: string,
    keyPrefix: string,
  ): ReactNode[] => {
    if (baseValue == null || nextValue == null || baseValue === nextValue) {
      return source;
    }
    const tokenPattern = new RegExp(`${escapeRegExp(String(baseValue))}(?=${escapeRegExp(unit)})`, 'g');
    const valueClass = nextValue > baseValue ? 'card-inline-value--buffed' : 'card-inline-value--debuffed';
    return source.flatMap((node, nodeIdx) => {
      if (typeof node !== 'string') return [node];
      const matches = Array.from(node.matchAll(tokenPattern));
      if (matches.length === 0) return [node];
      const parts = node.split(tokenPattern);
      const rebuilt: ReactNode[] = [];
      parts.forEach((part, partIdx) => {
        if (part) rebuilt.push(part);
        if (partIdx < matches.length) {
          rebuilt.push(
            <span key={`${keyPrefix}-${nodeIdx}-${partIdx}`} className={valueClass}>
              {nextValue}
            </span>,
          );
        }
      });
      return rebuilt;
    });
  };
  const getRenderedDescription = (description: string): ReactNode => {
    let nodes: ReactNode[] = [description];
    nodes = replaceChangedValue(nodes, card.damage, effectiveValues.damage, 'ダメージ', 'damage');
    nodes = replaceChangedValue(nodes, card.block, effectiveValues.block, 'ブロック', 'block');
    return nodes;
  };

  const typeColor = TYPE_COLORS[card.type] ?? TYPE_COLORS.status;
  const rarity = getRarity(card);
  const rarityStyle = RARITY_STYLES[rarity];
  const reserveBonusReady = Boolean(card.wasReserved && card.reserveBonus);
  const getJobColor = (targetCard: Card, targetJobId: JobId): string => {
    if (targetCard.neutral) return NEUTRAL_COLOR;
    return JOB_COLORS[targetJobId] ?? '#3d444d';
  };
  const innerStyle = {
    '--job-color': getJobColor(card, jobId),
    '--border-color': rarityStyle.borderColor,
    '--glow-color': rarityStyle.glowColor,
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`hand-card ${card.type} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${
        isSelling ? 'selling' : ''
      } ${isReturning ? 'returning' : ''} ${isGhost ? 'ghost' : ''} ${isDragging ? 'hand-card--dragging' : ''} ${
        reserveBonusReady ? 'reserve-ready' : ''
      }`}
      style={styleProp}
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
        className={`hand-card-inner card-frame card-frame--${rarity} ${
          reserveBonusReady ? 'card-frame--reserved' : ''
        } ${zukanMode === 'list' ? 'card-frame--no-animation' : ''}`}
        style={innerStyle}
        ref={headerRef}
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

        <div className="card-text-band">
          <span ref={nameRef} className="card-name">
            {card.name}
            {card.upgraded && (
              <span className="card-upgrade-badge">✦</span>
            )}
          </span>
          <div className="card-type-row">
            <div
              className="card-type-badge"
              style={{ background: typeColor.bg, color: typeColor.text }}
            >
              {typeColor.label}
            </div>
            {card.badges && card.badges.length > 0 && (
              <div className="card-sub-badges">
                {card.badges.map((badge, index) => (
                  <span key={`${badge}-${index}`} className={`card-badge card-badge--${badge}`}>
                    {BADGE_LABELS[badge]}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="card-description">{getRenderedDescription(card.description)}</div>
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
