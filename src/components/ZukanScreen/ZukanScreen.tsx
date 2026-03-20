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
import {
  CARPENTER_STORY,
  CARPENTER_E1_STORY,
  CARPENTER_E2_STORY,
  CARPENTER_E3_STORY,
  hasSeenStory,
} from '../../data/stories/carpenterStory';
import type { StoryScene } from '../../data/stories/carpenterStory';
import { StoryScreen } from '../StoryScreen/StoryScreen';
import { ENEMY_ZUKAN_DATA } from '../../data/enemyZukanData';
import type { EnemyZukanEntry } from '../../data/enemyZukanData';
import { getEnemyDefeatCount, getEnemyStatus } from '../../utils/enemyRecord';
import './ZukanScreen.css';

type MainTab = 'cards' | 'stories' | 'enemies';
type JobTab = 'carpenter' | 'neutral';
type RarityFilter = 'all' | CardRarity;
type TypeFilter = 'all' | Extract<CardType, 'attack' | 'skill' | 'power' | 'tool'>;
type EnemyTypeFilter = 'all' | 'normal' | 'elite' | 'boss';
type FrameRarity = CardRarity | 'starter';

interface StoryEntry {
  storyId: string;
  name: string;
  icon: string;
  scenes: StoryScene[];
}

const STORY_LIST: StoryEntry[] = [
  { storyId: 'carpenter_opening', name: '大工 - 序章',         icon: '🔨', scenes: CARPENTER_STORY },
  { storyId: 'carpenter_e1',      name: '大工 - 第1章',        icon: '🔨', scenes: CARPENTER_E1_STORY },
  { storyId: 'carpenter_e2',      name: '大工 - 第2章',        icon: '🔨', scenes: CARPENTER_E2_STORY },
  { storyId: 'carpenter_e3',      name: '大工 - エンディング', icon: '🔨', scenes: CARPENTER_E3_STORY },
];

const JOB_TABS: { id: JobTab; label: string; icon: string }[] = [
  { id: 'carpenter', label: '大工', icon: '🔨' },
  { id: 'neutral', label: '無色', icon: '⬜' },
];

const withRarity = (cards: Card[], rarity: CardRarity): Card[] =>
  cards.map((card) => ({ ...card, rarity: card.rarity ?? rarity }));

/** 図鑑の「全解放」用に全ジョブプールを保持（タブは大工・無色のみ） */
const ZUKAN_CARD_POOLS = {
  carpenter: [
    ...CARPENTER_STARTER_DECK,
    ...withRarity(CARPENTER_COMMON_POOL, 'common'),
    ...withRarity(CARPENTER_UNCOMMON_POOL, 'uncommon'),
    ...withRarity(CARPENTER_RARE_POOL, 'rare'),
  ],
  cook: [
    ...COOK_STARTER_DECK,
    ...withRarity(COOK_COMMON_POOL, 'common'),
    ...withRarity(COOK_UNCOMMON_POOL, 'uncommon'),
    ...withRarity(COOK_RARE_POOL, 'rare'),
  ],
  unemployed: [
    ...UNEMPLOYED_STARTER_DECK,
    ...withRarity(UNEMPLOYED_COMMON_POOL, 'common'),
    ...withRarity(UNEMPLOYED_UNCOMMON_POOL, 'uncommon'),
    ...withRarity(UNEMPLOYED_RARE_POOL, 'rare'),
  ],
  neutral: withRarity(NEUTRAL_CARD_POOL, 'common'),
};

const ALL_CARDS: Record<JobTab, Card[]> = {
  carpenter: ZUKAN_CARD_POOLS.carpenter,
  neutral: ZUKAN_CARD_POOLS.neutral,
};

const STATIC_EFFECTIVE_VALUES: EffectiveCardValues = {
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

type CardSizeStyle = CSSProperties & {
  '--hand-card-width': string;
  '--hand-card-height': string;
  '--card-name-min-size'?: string;
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
  const [mainTab, setMainTab] = useState<MainTab>('cards');
  const [activeTab, setActiveTab] = useState<JobTab>('carpenter');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [enemyTypeFilter, setEnemyTypeFilter] = useState<EnemyTypeFilter>('all');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [playingStory, setPlayingStory] = useState<StoryEntry | null>(null);
  const [selectedEnemy, setSelectedEnemy] = useState<EnemyZukanEntry | null>(null);
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
    heal:
      (card.effects ?? []).filter((effect) => effect.type === 'heal').reduce((sum, effect) => sum + effect.value, 0) ||
      null,
    effectiveTimeCost: card.timeCost,
  });

  const cardStyle: CardSizeStyle = {
    width: '96px',
    height: '154px',
    position: 'relative',
    transform: 'none',
    transition: 'none',
    '--hand-card-width': '96px',
    '--hand-card-height': '154px',
    '--card-name-min-size': '10px',
  };

  const detailCardStyle: CardSizeStyle = {
    width: '210px',
    height: '336px',
    position: 'relative',
    transform: 'none',
    transition: 'none',
    '--hand-card-width': '210px',
    '--hand-card-height': '336px',
    '--card-name-min-size': '11px',
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
      [
        ...ZUKAN_CARD_POOLS.carpenter,
        ...ZUKAN_CARD_POOLS.cook,
        ...ZUKAN_CARD_POOLS.unemployed,
        ...ZUKAN_CARD_POOLS.neutral,
      ].map((card) => card.name),
    );
    onUnlockAll(allNames);
  };

  if (playingStory) {
    return (
      <StoryScreen
        scenes={playingStory.scenes}
        onComplete={() => setPlayingStory(null)}
        showStartButton={false}
      />
    );
  }

  return (
    <div className="zukan-overlay" onClick={onClose}>
      <div className="zukan-modal" onClick={(event) => event.stopPropagation()}>
        <div className="zukan-header">
          <button type="button" className="zukan-back-btn" onClick={onClose}>
            ← 戻る
          </button>
          <h2 className="zukan-title">図鑑</h2>
          <div className="zukan-header-actions">
            {mainTab === 'cards' && (
              import.meta.env.DEV ? (
                <button type="button" className="btn-unlock-all" onClick={unlockAllCards}>
                  🛠️ 全解放
                </button>
              ) : null
            )}
          </div>
        </div>

        <div className="zukan-main-tabs">
          <button
            type="button"
            className={`zukan-main-tab ${mainTab === 'cards' ? 'zukan-main-tab--active' : ''}`}
            onClick={() => setMainTab('cards')}
          >
            カード
          </button>
          <button
            type="button"
            className={`zukan-main-tab ${mainTab === 'enemies' ? 'zukan-main-tab--active' : ''}`}
            onClick={() => setMainTab('enemies')}
          >
            敵
          </button>
          <button
            type="button"
            className={`zukan-main-tab ${mainTab === 'stories' ? 'zukan-main-tab--active' : ''}`}
            onClick={() => setMainTab('stories')}
          >
            ストーリー
          </button>
        </div>

        {mainTab === 'stories' && (
          <div className="zukan-story-list">
            {STORY_LIST.map((entry) => {
              const unlocked = hasSeenStory(entry.storyId);
              return (
                <button
                  key={entry.storyId}
                  type="button"
                  className={`zukan-story-item ${unlocked ? '' : 'zukan-story-item--locked'}`}
                  onClick={() => {
                    if (unlocked) setPlayingStory(entry);
                  }}
                  disabled={!unlocked}
                >
                  <span className="zukan-story-icon">{entry.icon}</span>
                  <span className="zukan-story-name">{entry.name}</span>
                  {!unlocked && <span className="zukan-story-lock">🔒</span>}
                </button>
              );
            })}
          </div>
        )}

        {mainTab === 'enemies' && (
          <div className="zukan-enemy-list">
            <div className="zukan-enemy-filters">
              {(['all', 'normal', 'elite', 'boss'] as EnemyTypeFilter[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`zukan-filter-btn ${enemyTypeFilter === type ? 'zukan-filter-btn--active' : ''}`}
                  onClick={() => setEnemyTypeFilter(type)}
                >
                  {type === 'all' ? '全て' : type === 'normal' ? '通常' : type === 'elite' ? 'ELITE' : 'BOSS'}
                </button>
              ))}
            </div>
            {[1, 2, 3].map((area) => (
              <div key={area} className="zukan-enemy-area">
                <h3 className="zukan-enemy-area-title">エリア{area}</h3>
                <div className="zukan-enemy-grid">
                  {ENEMY_ZUKAN_DATA
                    .filter((enemy) => enemy.area === area && (enemyTypeFilter === 'all' || enemy.type === enemyTypeFilter))
                    .map((enemy) => {
                    const status = getEnemyStatus(enemy.id);
                    const defeatCount = getEnemyDefeatCount(enemy.id);
                    return (
                      <div
                        key={enemy.id}
                        className={`zukan-enemy-item zukan-enemy-item--${status}`}
                        onClick={() => {
                          if (status !== 'none') setSelectedEnemy(enemy);
                        }}
                      >
                        {status === 'none' ? (
                          <div className="zukan-enemy-unknown">
                            <span className="zukan-enemy-unknown-icon">？</span>
                          </div>
                        ) : (
                          <img
                            className={`zukan-enemy-img ${status === 'encountered' ? 'zukan-enemy-img--silhouette' : ''}`}
                            src={enemy.imageUrl}
                            alt={enemy.name}
                          />
                        )}
                        <p className="zukan-enemy-name">{status === 'none' ? '？？？' : enemy.name}</p>
                        {status === 'defeated' && defeatCount > 0 && (
                          <span className="zukan-enemy-defeat-count">討伐 {defeatCount}</span>
                        )}
                        {enemy.type === 'boss' && status !== 'none' && (
                          <span className="zukan-enemy-boss-badge">BOSS</span>
                        )}
                        {enemy.type === 'elite' && status !== 'none' && (
                          <span className="zukan-enemy-elite-badge">ELITE</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {mainTab === 'cards' && (
          <>
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
                        zukanMode="list"
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
                      key={`zukan-detail-${selectedCard.id}-${activeSelectedIndex ?? 0}`}
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
                      zukanMode="detail"
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

                </div>
              </div>
            )}
          </>
        )}
        {selectedEnemy && (
          <div className="zukan-enemy-modal-overlay" onClick={() => setSelectedEnemy(null)}>
            <div className="zukan-enemy-modal" onClick={(event) => event.stopPropagation()}>
              <img
                className="zukan-enemy-modal-img"
                src={selectedEnemy.imageUrl}
                alt={selectedEnemy.name}
              />
              <div className="zukan-enemy-modal-info">
                <h3 className="zukan-enemy-modal-name">{selectedEnemy.name}</h3>
                <div className="zukan-enemy-modal-stats">
                  <span>HP: {selectedEnemy.hp}</span>
                  <span>エリア{selectedEnemy.area}</span>
                  <span>討伐: {getEnemyDefeatCount(selectedEnemy.id)}回</span>
                </div>
                {getEnemyStatus(selectedEnemy.id) === 'defeated' && (
                  <p className="zukan-enemy-modal-desc">{selectedEnemy.description}</p>
                )}
                {getEnemyStatus(selectedEnemy.id) === 'encountered' && (
                  <p className="zukan-enemy-modal-desc zukan-enemy-modal-desc--unknown">
                    撃破すると詳細が解放されます
                  </p>
                )}
              </div>
              <button
                type="button"
                className="zukan-enemy-modal-close"
                onClick={() => setSelectedEnemy(null)}
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
