import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAudioContext } from '../../contexts/AudioContext';
import CardComponent from '../Hand/CardComponent';
import { FLOW_BG_BOSS_REWARD } from '../../data/flowBackgrounds';
import { BOSS_REWARDS } from '../../data/bossRewards';
import type { BossReward } from '../../data/bossRewards';
import { pickRandomRareCard } from '../../data/runData';
import type { Card, JobId, PlayerState } from '../../types/game';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import './BossRewardScreen.css';

interface BossRewardScreenProps {
  area: number;
  jobId: JobId;
  player: PlayerState;
  onComplete: (reward: BossReward, selectedCard?: Card) => void;
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
  isAttackDamageWeakDebuffed: false,
});

const generateRareRewardCards = (jobId: JobId): Card[] => {
  const picked: Card[] = [];
  const seenNames = new Set<string>();
  let guard = 0;
  while (picked.length < 3 && guard < 30) {
    const next = pickRandomRareCard(jobId);
    if (!seenNames.has(next.name)) {
      picked.push(next);
      seenNames.add(next.name);
    }
    guard += 1;
  }
  while (picked.length < 3) {
    picked.push(pickRandomRareCard(jobId));
  }
  return picked;
};

export const BossRewardScreen = ({ area, jobId, player, onComplete }: BossRewardScreenProps) => {
  const { playBgm } = useAudioContext();
  useEffect(() => {
    playBgm('victory');
    return () => {
      playBgm('none');
    };
  }, [playBgm]);

  const [selectedReward, setSelectedReward] = useState<BossReward | null>(null);
  const [showCardSelect, setShowCardSelect] = useState(false);
  const [rareCards] = useState<Card[]>(() => generateRareRewardCards(jobId));
  const listRef = useRef<HTMLDivElement | null>(null);
  const [cardWidth, setCardWidth] = useState(() => Math.floor((Math.min(window.innerWidth, 430) - 48) / 3));

  const noop = () => {};

  useEffect(() => {
    const node = listRef.current;
    if (!node || !showCardSelect) return;
    const fallbackListWidth = Math.min(window.innerWidth, 430) - 32;
    const rectWidth = Math.floor(node.getBoundingClientRect().width);
    const measuredListWidth = Math.max(node.clientWidth, rectWidth);
    const listWidth = measuredListWidth > 0 ? measuredListWidth : fallbackListWidth;
    const gap = 10;
    const width = Math.floor((listWidth - gap * 2) / 3);
    setCardWidth(Math.max(86, width));
  }, [showCardSelect, rareCards.length]);

  const handleRewardSelect = (reward: BossReward) => {
    setSelectedReward(reward);
    if (reward.type === 'rare_card') {
      setShowCardSelect(true);
    }
  };

  const handleConfirm = (selectedCard?: Card) => {
    if (!selectedReward) return;
    onComplete(selectedReward, selectedCard);
  };

  const bossRewardRootStyle = {
    '--flow-bg-image': `url(${FLOW_BG_BOSS_REWARD})`,
    '--flow-bg-overlay': 'rgba(0, 0, 0, 0.18)',
  } as CSSProperties;

  return (
    <div className="boss-reward-screen boss-reward-screen--with-bg" style={bossRewardRootStyle}>
      <div className="boss-reward-header">
        <p className="boss-reward-area">エリア{area} クリア！</p>
        <h2 className="boss-reward-title">報酬を選択してください</h2>
      </div>

      {!showCardSelect && (
        <div className="boss-reward-options">
          {BOSS_REWARDS.map((reward) => (
            <button
              key={reward.type}
              type="button"
              className={`boss-reward-option ${
                selectedReward?.type === reward.type ? 'boss-reward-option--selected' : ''
              }`}
              onClick={() => handleRewardSelect(reward)}
            >
              <span className="boss-reward-option-icon">{reward.icon}</span>
              <div className="boss-reward-option-info">
                <p className="boss-reward-option-label">{reward.label}</p>
                <p className="boss-reward-option-desc">{reward.description}</p>
              </div>
              {selectedReward?.type === reward.type && <span className="boss-reward-option-check">✓</span>}
            </button>
          ))}

          {selectedReward && selectedReward.type !== 'rare_card' && (
            <button type="button" className="btn-boss-reward-confirm" onClick={() => handleConfirm()}>
              決定
            </button>
          )}
        </div>
      )}

      {showCardSelect && (
        <div className="boss-reward-card-select">
          <p className="boss-reward-card-title">レアカードを1枚選択</p>
          <div className="boss-reward-card-list" ref={listRef}>
            {rareCards.map((card, i) => (
              <div
                key={`${card.id}_${i}`}
                className="boss-reward-card-item"
                role="button"
                tabIndex={0}
                onClick={() => handleConfirm(card)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleConfirm(card);
                  }
                }}
                style={
                  {
                    '--reward-card-width': `${cardWidth}px`,
                    '--hand-card-width': `${cardWidth}px`,
                    '--hand-card-height': `${Math.floor(cardWidth * 1.6)}px`,
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
          <button
            type="button"
            className="btn-boss-reward-back"
            onClick={() => {
              setShowCardSelect(false);
              setSelectedReward(null);
            }}
          >
            ← 戻る
          </button>
        </div>
      )}
      <div className="boss-reward-player-hp">HP: {player.maxHp}/{player.currentHp}</div>
    </div>
  );
};
