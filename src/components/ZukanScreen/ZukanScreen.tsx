import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import CardComponent from '../Hand/CardComponent';
import type { Card, CardRarity, CardType, JobId } from '../../types/game';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import { CARPENTER_STARTER_DECK } from '../../data/carpenterDeck';
import { CARPENTER_COMMON_POOL, CARPENTER_UNCOMMON_POOL, CARPENTER_RARE_POOL } from '../../data/jobs/carpenter';
import { COOK_STARTER_DECK, COOK_COMMON_POOL, COOK_UNCOMMON_POOL, COOK_RARE_POOL } from '../../data/jobs/cook';
import {
  UNEMPLOYED_STARTER_DECK,
  UNEMPLOYED_COMMON_POOL,
  UNEMPLOYED_UNCOMMON_POOL,
  UNEMPLOYED_RARE_POOL,
} from '../../data/jobs/unemployed';
import { NEUTRAL_CARD_POOL } from '../../data/cards/neutralCards';
import './ZukanScreen.css';

type JobTab = 'carpenter' | 'cook' | 'unemployed' | 'neutral';
type RarityFilter = 'all' | CardRarity;
type TypeFilter = 'all' | Extract<CardType, 'attack' | 'skill' | 'power' | 'tool'>;
type FrameRarity = CardRarity | 'starter';

const JOB_TABS: { id: JobTab; label: string; icon: string }[] = [
  { id: 'carpenter', label: '大工', icon: '🔨' },
  { id: 'cook', label: '料理人', icon: '🔪' },
  { id: 'unemployed', label: '無職', icon: '✊' },
  { id: 'neutral', label: '無色', icon: '⬜' },
];

const ALL_CARDS: Record<JobTab, Card[]> = {
  carpenter: [
    ...CARPENTER_STARTER_DECK,
    ...CARPENTER_COMMON_POOL,
    ...CARPENTER_UNCOMMON_POOL,
    ...CARPENTER_RARE_POOL,
  ],
  cook: [...COOK_STARTER_DECK, ...COOK_COMMON_POOL, ...COOK_UNCOMMON_POOL, ...COOK_RARE_POOL],
  unemployed: [
    ...UNEMPLOYED_STARTER_DECK,
    ...UNEMPLOYED_COMMON_POOL,
    ...UNEMPLOYED_UNCOMMON_POOL,
    ...UNEMPLOYED_RARE_POOL,
  ],
  neutral: [...NEUTRAL_CARD_POOL],
};

const STATIC_EFFECTIVE_VALUES: EffectiveCardValues = {
  damage: null,
  block: null,
  effectiveTimeCost: 0,
  isTimeBuffed: false,
  isTimeDebuffed: false,
  isDamageBuffed: false,
  isDamageDebuffed: false,
  isBlockBuffed: false,
  isBlockDebuffed: false,
};

type CardSizeStyle = CSSProperties & {
  '--hand-card-width': string;
  '--hand-card-height': string;
};

const noopPointer = (event: ReactPointerEvent) => {
  void event;
  // 図鑑内カードは非操作のため no-op。
};

const noop = () => {
  // 図鑑内カードは非操作のため no-op。
};

const getCardRarity = (card: Card): CardRarity => card.rarity ?? 'common';
const getFrameRarity = (card: Card): FrameRarity => card.rarity ?? 'starter';

const deduplicateCards = (cards: Card[]): Card[] => {
  const seen = new Set<string>();
  return cards.filter((card) => {
    if (seen.has(card.name)) return false;
    seen.add(card.name);
    return true;
  });
};

interface ZukanScreenProps {
  onClose: () => void;
  unlockedCardNames: Set<string>;
  onUnlockAll: (names: Set<string>) => void;
}

export const ZukanScreen = ({ onClose, unlockedCardNames, onUnlockAll }: ZukanScreenProps) => {
  const [activeTab, setActiveTab] = useState<JobTab>('carpenter');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const suppressOverlayCloseRef = useRef(false);

  const filteredCards = useMemo(() => {
    const cards = deduplicateCards(ALL_CARDS[activeTab]);
    return cards.filter((card) => {
      if (rarityFilter !== 'all' && getCardRarity(card) !== rarityFilter) return false;
      if (typeFilter !== 'all' && card.type !== typeFilter) return false;
      return true;
    });
  }, [activeTab, rarityFilter, typeFilter]);

  const previewJobId: JobId = activeTab === 'neutral' ? 'carpenter' : activeTab;
  const activeSelectedIndex =
    selectedIndex !== null && selectedIndex >= 0 && selectedIndex < filteredCards.length
      ? selectedIndex
      : null;
  const selectedCard = activeSelectedIndex !== null ? filteredCards[activeSelectedIndex] : null;

  const getPreviewValues = (card: Card): EffectiveCardValues => ({
    ...STATIC_EFFECTIVE_VALUES,
    damage: card.damage ?? null,
    block: card.block ?? null,
    effectiveTimeCost: card.timeCost,
  });

  const cardStyle: CardSizeStyle = {
    width: '80px',
    height: '128px',
    position: 'relative',
    transform: 'none',
    transition: 'none',
    '--hand-card-width': '80px',
    '--hand-card-height': '128px',
  };

  const detailCardStyle: CardSizeStyle = {
    width: '180px',
    height: '288px',
    position: 'relative',
    transform: 'none',
    transition: 'none',
    '--hand-card-width': '180px',
    '--hand-card-height': '288px',
  };

  const openCardDetail = (index: number) => {
    suppressOverlayCloseRef.current = true;
    window.setTimeout(() => {
      suppressOverlayCloseRef.current = false;
    }, 180);
    setSelectedIndex(index);
  };
  const selectedCardUnlocked = selectedCard ? unlockedCardNames.has(selectedCard.name) : false;
  const goNext = () => {
    if (activeSelectedIndex === null || filteredCards.length === 0) return;
    setSelectedIndex((activeSelectedIndex + 1) % filteredCards.length);
  };
  const goPrev = () => {
    if (activeSelectedIndex === null || filteredCards.length === 0) return;
    setSelectedIndex((activeSelectedIndex - 1 + filteredCards.length) % filteredCards.length);
  };
  const unlockAllCards = () => {
    const allNames = new Set(
      [...ALL_CARDS.carpenter, ...ALL_CARDS.cook, ...ALL_CARDS.unemployed, ...ALL_CARDS.neutral].map(
        (card) => card.name,
      ),
    );
    onUnlockAll(allNames);
  };

  return (
    <div className="zukan-overlay" onClick={onClose}>
      <div className="zukan-modal" onClick={(event) => event.stopPropagation()}>
        <div className="zukan-header">
          <h2 className="zukan-title">図鑑</h2>
          <div className="zukan-header-actions">
            <button type="button" className="btn-unlock-all" onClick={unlockAllCards}>
              全解放
            </button>
            <button type="button" className="zukan-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="zukan-job-tabs">
          {JOB_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`zukan-job-tab ${activeTab === tab.id ? 'zukan-job-tab--active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                setRarityFilter('all');
                setTypeFilter('all');
                setSelectedIndex(null);
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="zukan-filters">
          <div className="zukan-filter-group">
            {(['all', 'common', 'uncommon', 'rare'] as RarityFilter[]).map((rarity) => (
              <button
                key={rarity}
                type="button"
                className={`zukan-filter-btn ${
                  rarity !== 'all' ? `zukan-filter-btn--${rarity}` : ''
                } ${rarityFilter === rarity ? 'zukan-filter-btn--active' : ''}`}
                onClick={() => setRarityFilter(rarity)}
              >
                {rarity === 'all' ? '全て' : rarity === 'common' ? 'C' : rarity === 'uncommon' ? 'U' : 'R'}
              </button>
            ))}
          </div>
          <div className="zukan-filter-group">
            {(['all', 'attack', 'skill', 'power', 'tool'] as TypeFilter[]).map((type) => (
              <button
                key={type}
                type="button"
                className={`zukan-filter-btn ${typeFilter === type ? 'zukan-filter-btn--active' : ''}`}
                onClick={() => setTypeFilter(type)}
              >
                {type === 'all'
                  ? '全て'
                  : type === 'attack'
                    ? 'ATK'
                    : type === 'skill'
                      ? 'SKL'
                      : type === 'power'
                        ? 'PWR'
                        : 'TL'}
              </button>
            ))}
          </div>
        </div>

        <p className="zukan-count">{filteredCards.length}枚</p>

        <div className="zukan-card-grid">
          {filteredCards.map((card, index) => {
            const isUnlocked = unlockedCardNames.has(card.name);
            const frameRarity = getFrameRarity(card);
            const zukanRarityClass =
              frameRarity === 'starter' ? 'zukan-card-item--common' : `zukan-card-item--${frameRarity}`;
            return (
              <div
                key={`${card.id}-${index}`}
                className={`zukan-card-item ${zukanRarityClass} ${isUnlocked ? '' : 'zukan-card-item--locked'}`}
                role="button"
                tabIndex={0}
                aria-label={`${card.name} の詳細を開く`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openCardDetail(index);
                  }
                }}
              >
                <button
                  type="button"
                  className="zukan-card-hitbox"
                  aria-label={`${card.name} の詳細を開く`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openCardDetail(index);
                  }}
                />
                <div
                  className={`zukan-card-wrapper zukan-card-preview ${isUnlocked ? '' : 'zukan-card-wrapper--locked'}`}
                  style={cardStyle}
                >
                  <CardComponent
                    card={card}
                    jobId={previewJobId}
                    selected={false}
                    disabled={false}
                    locked={false}
                    isSelling={false}
                    isReturning={false}
                    isGhost={false}
                    isDragging={false}
                    isDragUnavailable={false}
                    effectiveValues={getPreviewValues(card)}
                    onSelect={noop}
                    onPointerDown={noopPointer}
                    onPointerMove={noopPointer}
                    onPointerUp={noopPointer}
                    onPointerCancel={noop}
                    onMouseEnter={noop}
                    onMouseLeave={noop}
                  />
                </div>
                {!isUnlocked && (
                  <div className="zukan-locked-overlay">
                    <span className="zukan-locked-mark">？</span>
                  </div>
                )}
              </div>
            );
          })}
          {filteredCards.length === 0 && <p className="zukan-empty">該当するカードがありません</p>}
        </div>

        {selectedCard && (
          <div
            className="zukan-card-detail-overlay"
            onClick={() => {
              if (suppressOverlayCloseRef.current) return;
              setSelectedIndex(null);
            }}
          >
            <div className="zukan-card-detail" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="zukan-nav-btn zukan-nav-btn--left"
                onClick={(event) => {
                  event.stopPropagation();
                  goPrev();
                }}
                aria-label="前のカード"
              >
                ‹
              </button>
              <div
                className={`zukan-detail-card-wrapper ${selectedCardUnlocked ? '' : 'zukan-card-wrapper--locked'}`}
                style={detailCardStyle}
              >
                <CardComponent
                  card={selectedCard}
                  jobId={previewJobId}
                  selected={false}
                  disabled={false}
                  locked={false}
                  isSelling={false}
                  isReturning={false}
                  isGhost={false}
                  isDragging={false}
                  isDragUnavailable={false}
                  effectiveValues={getPreviewValues(selectedCard)}
                  onSelect={noop}
                  onPointerDown={noopPointer}
                  onPointerMove={noopPointer}
                  onPointerUp={noopPointer}
                  onPointerCancel={noop}
                  onMouseEnter={noop}
                  onMouseLeave={noop}
                />
              </div>
              {!selectedCardUnlocked && (
                <div className="zukan-locked-overlay zukan-locked-overlay--large">
                  <span className="zukan-locked-mark zukan-locked-mark--large">？</span>
                </div>
              )}
              <button
                type="button"
                className="zukan-nav-btn zukan-nav-btn--right"
                onClick={(event) => {
                  event.stopPropagation();
                  goNext();
                }}
                aria-label="次のカード"
              >
                ›
              </button>

              <div className="zukan-card-detail-info">
                {selectedCardUnlocked ? (
                  <>
                    <p className="zukan-detail-name">{selectedCard.name}</p>
                    <p className="zukan-detail-desc">{selectedCard.description}</p>
                    <p className="zukan-detail-rarity">
                      {getCardRarity(selectedCard) === 'common'
                        ? 'コモン'
                        : getCardRarity(selectedCard) === 'uncommon'
                          ? 'アンコモン'
                          : 'レア'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="zukan-detail-name">？？？</p>
                    <p className="zukan-detail-desc">まだ入手していないカードです</p>
                  </>
                )}
                <p className="zukan-detail-index">
                  {(activeSelectedIndex ?? 0) + 1} / {filteredCards.length}
                </p>
              </div>

              <button
                type="button"
                className="zukan-detail-close-btn zukan-detail-close"
                onClick={() => setSelectedIndex(null)}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
