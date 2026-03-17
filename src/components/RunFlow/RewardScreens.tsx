import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Card, JobId } from '../../types/game';
import type { Omamori } from '../../types/run';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import CardComponent from '../Hand/CardComponent';
import { upgradeCardByJobId } from '../../utils/cardUpgrade';

interface CardRewardProps {
  cards: Card[];
  jobId: JobId;
  onPick: (cardId: string) => void;
  onSkip: () => void;
}

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

export const CardRewardScreen = ({ cards, jobId, onPick, onSkip }: CardRewardProps) => {
  const noop = () => {};
  const rewardListRef = useRef<HTMLDivElement | null>(null);
  const [rewardCardWidth, setRewardCardWidth] = useState(() =>
    Math.floor((Math.min(window.innerWidth, 430) - 56) / 3),
  );

  useEffect(() => {
    const node = rewardListRef.current;
    if (!node) return;
    const updateRewardCardWidth = () => {
      const fallbackListWidth = Math.min(window.innerWidth, 430) - 16;
      const rectWidth = Math.floor(node.getBoundingClientRect().width);
      const measuredListWidth = Math.max(node.clientWidth, rectWidth);
      const listWidth = measuredListWidth > 0 ? measuredListWidth : fallbackListWidth;
      const count = Math.max(1, cards.length);
      const gap = 10;
      const width = Math.floor((listWidth - gap * (count - 1)) / count);
      setRewardCardWidth(Math.max(84, width));
    };
    updateRewardCardWidth();
    window.requestAnimationFrame(updateRewardCardWidth);
    const observer = new ResizeObserver(updateRewardCardWidth);
    observer.observe(node);
    window.addEventListener('resize', updateRewardCardWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateRewardCardWidth);
    };
  }, [cards.length]);

  return (
    <main className="flow-screen card-reward-screen">
      <section className="flow-card card-reward-panel">
        <h2 className="reward-heading">カードを1枚選んでください</h2>
        <div className="reward-card-list" ref={rewardListRef}>
          {cards.map((card, idx) => (
            <div
              key={`${card.id}_${idx}`}
              className="reward-card-wrapper"
              role="button"
              tabIndex={0}
              onClick={() => onPick(card.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onPick(card.id);
                }
              }}
              style={
                {
                  '--reward-card-width': `${rewardCardWidth}px`,
                  '--hand-card-width': `${rewardCardWidth}px`,
                  '--hand-card-height': `${Math.floor(rewardCardWidth * 1.6)}px`,
                } as CSSProperties
              }
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
        <button type="button" className="btn-skip" onClick={onSkip}>
          スキップ
        </button>
      </section>
    </main>
  );
};

interface OmamoriProps {
  omamoris: Omamori[];
  onPick: (id: string) => void;
}

export const OmamoriRewardScreen = ({ omamoris, onPick }: OmamoriProps) => {
  return (
    <main className="flow-screen">
      <section className="flow-card">
        <h2>お守りを選べ！</h2>
        <div className="flow-list">
          {omamoris.map((omamori) => (
            <button key={omamori.id} type="button" className="flow-btn" onClick={() => onPick(omamori.id)}>
              {omamori.icon} {omamori.name} - {omamori.description}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
};

interface CardUpgradeProps {
  mode: 'upgrade' | 'remove';
  cards: Card[];
  jobId: JobId;
  onUpgrade: (cardId: string) => void;
  onRemove: (cardId: string) => void;
  onSkip: () => void;
}

export const CardUpgradeScreen = ({ mode, cards, jobId, onUpgrade, onRemove, onSkip }: CardUpgradeProps) => {
  const UPGRADE_DIFF_VISIBLE_ROWS = 4;
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const upgradableCards = cards.filter(
    (card) => !card.upgraded && !card.name.endsWith('+') && card.type !== 'status',
  );
  const selectedCard = upgradableCards.find((card) => card.id === selectedCardId) ?? null;
  const selectedUpgradedCard = selectedCard ? upgradeCardByJobId(selectedCard, jobId) : null;
  const selectedUpgradeRows =
    selectedCard && selectedUpgradedCard
      ? [
          { kind: 'title' as const, text: '《強化後》' },
          selectedCard.description !== selectedUpgradedCard.description
            ? {
                kind: 'pair' as const,
                before: selectedCard.description,
                after: selectedUpgradedCard.description,
              }
            : null,
          selectedCard.timeCost !== selectedUpgradedCard.timeCost
            ? {
                kind: 'pair' as const,
                before: `タイムコスト${selectedCard.timeCost}秒`,
                after: `タイムコスト${selectedUpgradedCard.timeCost}秒`,
              }
            : null,
        ]
          .filter((row): row is { kind: 'title'; text: string } | { kind: 'pair'; before: string; after: string } => row !== null)
      : [];
  const paddedUpgradeRows = Array.from({ length: UPGRADE_DIFF_VISIBLE_ROWS }, (_, idx) => selectedUpgradeRows[idx] ?? null);
  const noop = () => {};

  return (
    <main className="flow-screen">
      <section className="flow-card upgrade-screen">
        <div className="upgrade-header">
          <h2 className="upgrade-title">{mode === 'upgrade' ? 'カードを強化する' : 'カードを削除する'}</h2>
          {mode === 'upgrade' && <p className="upgrade-heading">強化するカードを選んでください</p>}
        </div>
        {mode === 'upgrade' ? (
          <>
            {upgradableCards.length === 0 ? (
              <div className="upgrade-empty">
                <p className="upgrade-empty-text">強化できるカードがありません</p>
                <button type="button" className="btn-upgrade-skip" onClick={onSkip}>
                  次へ進む
                </button>
              </div>
            ) : (
              <>
                <div className="upgrade-card-list-container">
                  <div className="upgrade-card-list">
                    {upgradableCards.map((card, idx) => (
                      (() => {
                        const isSelected = selectedCardId === card.id;
                        const displayCard = isSelected ? upgradeCardByJobId(card, jobId) : card;
                        return (
                      <div
                        key={`${card.id}_${idx}`}
                        className={`upgrade-card-item ${isSelected ? 'upgrade-card-item--selected' : ''}`}
                        onClick={() => setSelectedCardId(card.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedCardId(card.id);
                          }
                        }}
                      >
                        <CardComponent
                          card={displayCard}
                          jobId={jobId}
                          selected={false}
                          disabled={false}
                          locked={false}
                          isSelling={false}
                          isReturning={false}
                          isGhost={false}
                          isDragging={false}
                          isDragUnavailable={false}
                          effectiveValues={getBaseEffectiveValues(displayCard)}
                          onSelect={noop}
                          onPointerDown={noop}
                          onPointerMove={noop}
                          onPointerUp={noop}
                          onPointerCancel={noop}
                          onMouseEnter={noop}
                          onMouseLeave={noop}
                          style={
                            {
                              '--hand-card-width': '100%',
                              '--hand-card-height': '100%',
                              width: '100%',
                              height: '100%',
                              position: 'relative',
                              transform: 'none',
                              transition: 'none',
                            } as CSSProperties
                          }
                        />
                      </div>
                        );
                      })()
                    ))}
                  </div>
                </div>
                {selectedCard && (
                  <div className="upgrade-preview">
                    <div className="upgrade-diff-list">
                      {paddedUpgradeRows.map((row, idx) => {
                        if (!row) {
                          return (
                            <p key={`upgrade-diff-row-${idx}`} className="upgrade-diff-item upgrade-diff-item--empty">
                              {'\u00A0'}
                            </p>
                          );
                        }
                        if (row.kind === 'title') {
                          return (
                            <p key={`upgrade-diff-row-${idx}`} className="upgrade-diff-item upgrade-diff-item--title">
                              {row.text}
                            </p>
                          );
                        }
                        return (
                          <p key={`upgrade-diff-row-${idx}`} className="upgrade-diff-item">
                            <span className="upgrade-diff-before">{row.before}</span>
                            <span className="upgrade-diff-arrow">→</span>
                            <span className="upgrade-diff-after">{row.after}</span>
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="upgrade-note">
                  <small>※ 強化済み（+）カードは再強化できません</small>
                </div>
                <div className="upgrade-actions">
                  {selectedCard && (
                    <button
                      type="button"
                      className="btn-upgrade-confirm"
                      onClick={() => onUpgrade(selectedCard.id)}
                    >
                      強化する
                    </button>
                  )}
                  <button type="button" className="btn-upgrade-skip" onClick={onSkip}>
                    スキップ
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="flow-list card-display-grid">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="card-display-item card-display-item--purchasable"
                  role="button"
                  tabIndex={0}
                  onClick={() => onRemove(card.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRemove(card.id);
                    }
                  }}
                  style={
                    {
                      '--hand-card-width': '90px',
                      '--hand-card-height': '144px',
                    } as CSSProperties
                  }
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
            <div className="upgrade-note">
              <small>※ この操作は取り消せません</small>
            </div>
            <button type="button" className="flow-btn ghost" onClick={onSkip}>
              戻る
            </button>
          </>
        )}
      </section>
    </main>
  );
};

interface TextResultProps {
  title: string;
  text: string;
  onClose: () => void;
}

export const SimpleResultScreen = ({ title, text, onClose }: TextResultProps) => {
  return (
    <main className="flow-screen">
      <section className="flow-card">
        <h2>{title}</h2>
        <p>{text}</p>
        <button type="button" className="flow-btn" onClick={onClose}>
          戻る
        </button>
      </section>
    </main>
  );
};

interface FinalProps {
  onReset: () => void;
}

export const RunClearScreen = ({ onReset }: FinalProps) => (
  <main className="flow-screen">
    <section className="flow-card">
      <h2>エリア1クリア！</h2>
      <p>商店街を守り抜いた！</p>
      <button type="button" className="flow-btn" onClick={onReset}>
        もう一度挑戦
      </button>
    </section>
  </main>
);

export const RunGameOverScreen = ({ onReset }: FinalProps) => (
  <main className="flow-screen">
    <section className="flow-card">
      <h2>GAME OVER</h2>
      <p>立て直して再挑戦しよう。</p>
      <button type="button" className="flow-btn" onClick={onReset}>
        リトライ
      </button>
    </section>
  </main>
);
