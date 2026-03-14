import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Card, JobId } from '../../types/game';
import type { Omamori } from '../../types/run';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import CardComponent from '../Hand/CardComponent';
import type { UpgradeType } from '../../utils/cardUpgrade';

interface CardRewardProps {
  cards: Card[];
  jobId: JobId;
  onPick: (cardId: string) => void;
  onSkip: () => void;
}

const getBaseEffectiveValues = (card: Card): EffectiveCardValues => ({
  damage: card.damage ?? null,
  block: card.block ?? null,
  effectiveTimeCost: card.timeCost,
  isTimeBuffed: false,
  isTimeDebuffed: false,
  isDamageBuffed: false,
  isDamageDebuffed: false,
  isBlockBuffed: false,
  isBlockDebuffed: false,
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
  }, []);

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
  onUpgrade: (cardId: string, type: UpgradeType) => void;
  onRemove: (cardId: string) => void;
  onSkip: () => void;
}

export const CardUpgradeScreen = ({ mode, cards, jobId, onUpgrade, onRemove, onSkip }: CardUpgradeProps) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [upgradeType, setUpgradeType] = useState<UpgradeType | null>(null);
  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null;
  const noop = () => {};

  const getUpgradeOptions = (card: Card): UpgradeType[] => {
    const options: UpgradeType[] = [];
    if ((card.damage ?? 0) > 0) options.push('damage');
    if ((card.block ?? 0) > 0) options.push('block');
    options.push('time');
    return options;
  };

  const getPreviewText = (card: Card, type: UpgradeType): string => {
    if (type === 'damage') {
      return `ダメージ +3（${card.damage ?? 0} → ${(card.damage ?? 0) + 3}）`;
    }
    if (type === 'block') {
      return `ブロック +3（${card.block ?? 0} → ${(card.block ?? 0) + 3}）`;
    }
    return `所要時間 -1秒（${card.timeCost}s → ${Math.max(1, card.timeCost - 1)}s）`;
  };

  return (
    <main className="flow-screen">
      <section className="flow-card upgrade-screen">
        <h2>{mode === 'upgrade' ? 'カードを強化' : 'カードを削除'}</h2>
        {mode === 'upgrade' ? (
          <>
            <p className="upgrade-heading">強化するカードを選んでください</p>
            <div className="upgrade-card-grid card-display-grid">
              {cards.filter((card) => !card.upgraded).map((card, idx) => (
                <div
                  key={`${card.id}_${idx}`}
                  className={`upgrade-card-item card-display-item ${
                    selectedCardId === card.id ? 'upgrade-card-item--selected card-display-item--selected' : ''
                  }`}
                  onClick={() => {
                    setSelectedCardId(card.id);
                    setUpgradeType(null);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedCardId(card.id);
                      setUpgradeType(null);
                    }
                  }}
                  style={
                    {
                      '--hand-card-width': '80px',
                      '--hand-card-height': '128px',
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
            {selectedCard && (
              <div className="upgrade-options">
                {getUpgradeOptions(selectedCard).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`btn-upgrade-type ${upgradeType === type ? 'btn-upgrade-type--selected' : ''}`}
                    onClick={() => setUpgradeType(type)}
                  >
                    {getPreviewText(selectedCard, type)}
                  </button>
                ))}
              </div>
            )}
            <div className="upgrade-selected-name">
              <small>{selectedCard ? `選択中: ${selectedCard.name}` : 'カードを選択してください'}</small>
            </div>
            <div className="upgrade-note">
              <small>※ 強化済み（+）カードは再強化できません</small>
            </div>
            <div className="upgrade-buttons">
              <button
                type="button"
                className="flow-btn ghost"
                disabled={!selectedCard || !upgradeType}
                onClick={() => {
                  if (selectedCard && upgradeType) onUpgrade(selectedCard.id, upgradeType);
                }}
              >
                強化する
              </button>
              <button type="button" className="btn-skip" onClick={onSkip}>
                戻る
              </button>
            </div>
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
