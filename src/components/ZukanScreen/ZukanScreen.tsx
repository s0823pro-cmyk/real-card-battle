import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAudioContext } from '../../contexts/AudioContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { MessageKey } from '../../i18n';
import { enemyNameKey, translatedCardName } from '../../i18n/entityKeys';
import type { PointerEvent as ReactPointerEvent } from 'react';
import CardComponent from '../Hand/CardComponent';
import type { Card, CardRarity, CardType, JobId } from '../../types/game';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import { CARPENTER_STARTER_DECK } from '../../data/carpenterDeck';
import {
  CARPENTER_COMMON_POOL_UNFILTERED,
  CARPENTER_RARE_POOL_ALL,
  CARPENTER_UNCOMMON_POOL_UNFILTERED,
} from '../../data/jobs/carpenter';
import {
  COOK_STARTER_DECK,
  COOK_COMMON_POOL,
  COOK_RARE_POOL_ALL,
  COOK_UNCOMMON_POOL_UNFILTERED,
} from '../../data/jobs/cook';
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
import {
  COOK_STORY,
  COOK_E1_STORY,
  COOK_E2_STORY,
  COOK_E3_STORY,
} from '../../data/stories/cookStory';
import type { StoryScene } from '../../data/stories/carpenterStory';
import { StoryScreen } from '../StoryScreen/StoryScreen';
import { ENEMY_ZUKAN_DATA } from '../../data/enemyZukanData';
import type { EnemyZukanEntry } from '../../data/enemyZukanData';
import { getEnemyDefeatCount, getEnemyStatus } from '../../utils/enemyRecord';
import { formatZukanIntentDetail, getEnemyIntentsForZukan } from '../../utils/enemyIntentCatalog';
import { upgradeCardByJobId } from '../../utils/cardUpgrade';
import { getUpgradeForCard } from '../../data/upgrades';
import './ZukanScreen.css';

type MainTab = 'cards' | 'stories' | 'enemies';
type JobTab = 'carpenter' | 'cook' | 'unemployed' | 'neutral';
type RarityFilter = 'all' | CardRarity;
type TypeFilter = 'all' | Extract<CardType, 'attack' | 'skill' | 'power' | 'tool'>;
type EnemyTypeFilter = 'all' | 'normal' | 'elite' | 'boss';
type FrameRarity = CardRarity | 'starter';

interface StoryEntry {
  storyId: string;
  icon: string;
  scenes: StoryScene[];
}

const STORY_LIST: StoryEntry[] = [
  { storyId: 'carpenter_opening', icon: '🔨', scenes: CARPENTER_STORY },
  { storyId: 'carpenter_e1', icon: '🔨', scenes: CARPENTER_E1_STORY },
  { storyId: 'carpenter_e2', icon: '🔨', scenes: CARPENTER_E2_STORY },
  { storyId: 'carpenter_e3', icon: '🔨', scenes: CARPENTER_E3_STORY },
  { storyId: 'cook_opening', icon: '🔪', scenes: COOK_STORY },
  { storyId: 'cook_e1', icon: '🔪', scenes: COOK_E1_STORY },
  { storyId: 'cook_e2', icon: '🔪', scenes: COOK_E2_STORY },
  { storyId: 'cook_e3', icon: '🔪', scenes: COOK_E3_STORY },
];

const JOB_TABS: { id: JobTab; labelKey: MessageKey; icon: string }[] = [
  { id: 'carpenter', labelKey: 'job.carpenter.name', icon: '🔨' },
  { id: 'cook', labelKey: 'job.cook.name', icon: '🔪' },
  /* 無職はプレイで選択できないため図鑑タブからは除外（カードプールは dev 全解放用に保持） */
  { id: 'neutral', labelKey: 'zukan.job.neutral', icon: '⬜' },
];

const withRarity = (cards: Card[], rarity: CardRarity): Card[] =>
  cards.map((card) => ({ ...card, rarity: card.rarity ?? rarity }));

/** 図鑑の「全解放」用に全ジョブプールを保持 */
const ZUKAN_CARD_POOLS = {
  carpenter: [
    ...CARPENTER_STARTER_DECK,
    ...withRarity(CARPENTER_COMMON_POOL_UNFILTERED, 'common'),
    ...withRarity(CARPENTER_UNCOMMON_POOL_UNFILTERED, 'uncommon'),
    ...withRarity(CARPENTER_RARE_POOL_ALL, 'rare'),
  ],
  cook: [
    ...COOK_STARTER_DECK,
    ...withRarity(COOK_COMMON_POOL, 'common'),
    ...withRarity(COOK_UNCOMMON_POOL_UNFILTERED, 'uncommon'),
    ...withRarity(COOK_RARE_POOL_ALL, 'rare'),
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
  cook: ZUKAN_CARD_POOLS.cook,
  unemployed: ZUKAN_CARD_POOLS.unemployed,
  neutral: ZUKAN_CARD_POOLS.neutral,
};

const JOB_TABS_WITH_UPGRADE_PREVIEW: JobTab[] = ['carpenter', 'cook'];

/** 図鑑タブのカードプールに、少なくとも1枚は強化定義があるか（no_upgrade は除外） */
const jobTabPoolHasAnyUpgrade = (tab: JobTab): boolean => {
  if (!JOB_TABS_WITH_UPGRADE_PREVIEW.includes(tab)) return false;
  const pool = ALL_CARDS[tab];
  const seenNames = new Set<string>();
  for (const card of pool) {
    if (seenNames.has(card.name)) continue;
    seenNames.add(card.name);
    if (card.tags?.includes('no_upgrade')) continue;
    if (getUpgradeForCard({ ...card, upgraded: false }, tab)) return true;
  }
  return false;
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
  isAttackDamageWeakDebuffed: false,
  isBoosted: false,
  isDamageBoosted: false,
  isBlockBoosted: false,
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
  const { t } = useLanguage();
  const { playBgm } = useAudioContext();
  const [mainTab, setMainTab] = useState<MainTab>('cards');
  const [activeTab, setActiveTab] = useState<JobTab>('carpenter');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [enemyTypeFilter, setEnemyTypeFilter] = useState<EnemyTypeFilter>('all');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [playingStory, setPlayingStory] = useState<StoryEntry | null>(null);
  const [selectedEnemy, setSelectedEnemy] = useState<EnemyZukanEntry | null>(null);
  const [enemySkillsOpen, setEnemySkillsOpen] = useState(false);
  const [showUpgradePreview, setShowUpgradePreview] = useState(false);
  const suppressOverlayCloseRef = useRef(false);

  const handleStoryComplete = useCallback(() => {
    setPlayingStory(null);
    playBgm('menu');
  }, [playBgm]);

  useEffect(() => {
    setEnemySkillsOpen(false);
  }, [selectedEnemy]);

  const filteredCardsBase = useMemo(() => {
    const cards = deduplicateCards(ALL_CARDS[activeTab]);
    return cards.filter((card) => {
      if (rarityFilter !== 'all' && getCardRarity(card) !== rarityFilter) return false;
      if (typeFilter !== 'all' && card.type !== typeFilter) return false;
      return true;
    });
  }, [activeTab, rarityFilter, typeFilter]);

  const filteredCards = useMemo(() => {
    if (!showUpgradePreview || !JOB_TABS_WITH_UPGRADE_PREVIEW.includes(activeTab)) {
      return filteredCardsBase;
    }
    return filteredCardsBase.map((card) =>
      upgradeCardByJobId({ ...card, upgraded: false }, activeTab as JobId),
    );
  }, [activeTab, showUpgradePreview, filteredCardsBase]);

  const showZukanUpgradeToggle = useMemo(() => jobTabPoolHasAnyUpgrade(activeTab), [activeTab]);

  const previewJobId: JobId = activeTab === 'neutral' ? 'carpenter' : activeTab;
  const activeSelectedIndex =
    selectedIndex !== null && selectedIndex >= 0 && selectedIndex < filteredCards.length
      ? selectedIndex
      : null;
  const selectedCard = activeSelectedIndex !== null ? filteredCards[activeSelectedIndex] : null;
  const selectedUnlockName =
    activeSelectedIndex !== null &&
    showUpgradePreview &&
    JOB_TABS_WITH_UPGRADE_PREVIEW.includes(activeTab)
      ? filteredCardsBase[activeSelectedIndex]?.name
      : selectedCard?.name;

  const getPreviewValues = (card: Card): EffectiveCardValues => ({
    ...STATIC_EFFECTIVE_VALUES,
    damage: card.damage ?? null,
    block: card.block ?? null,
    heal:
      (card.effects ?? []).filter((effect) => effect.type === 'heal').reduce((sum, effect) => sum + effect.value, 0) ||
      null,
    effectiveTimeCost: card.timeCost,
  });

  const openCardDetail = (index: number) => {
    suppressOverlayCloseRef.current = true;
    window.setTimeout(() => {
      suppressOverlayCloseRef.current = false;
    }, 180);
    setSelectedIndex(index);
  };
  const selectedCardUnlocked = selectedUnlockName ? unlockedCardNames.has(selectedUnlockName) : false;
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
    const isCook = playingStory.storyId.startsWith('cook');
    const storyBgmArea =
      playingStory.storyId.endsWith('_e1')
        ? 2
        : playingStory.storyId.endsWith('_e2') || playingStory.storyId.endsWith('_e3')
          ? 3
          : 1;
    return (
      <StoryScreen
        scenes={playingStory.scenes}
        onComplete={handleStoryComplete}
        showStartButton={false}
        storyBundleId={playingStory.storyId}
        jobId={isCook ? 'cook' : 'carpenter'}
        storyBgmArea={storyBgmArea}
      />
    );
  }

  return (
    <div className="zukan-overlay" onClick={onClose}>
      <div className="zukan-modal" onClick={(event) => event.stopPropagation()}>
        <div className="zukan-header">
          <button type="button" className="zukan-back-btn" onClick={onClose}>
            {t('common.back')}
          </button>
          <h2 className="zukan-title">{t('zukan.title')}</h2>
          <div className="zukan-header-actions">
            {mainTab === 'cards' && (
              import.meta.env.DEV ? (
                <button type="button" className="btn-unlock-all" onClick={unlockAllCards}>
                  {t('zukan.devUnlockAll')}
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
            {t('zukan.tab.cards')}
          </button>
          <button
            type="button"
            className={`zukan-main-tab ${mainTab === 'enemies' ? 'zukan-main-tab--active' : ''}`}
            onClick={() => setMainTab('enemies')}
          >
            {t('zukan.tab.enemies')}
          </button>
          <button
            type="button"
            className={`zukan-main-tab ${mainTab === 'stories' ? 'zukan-main-tab--active' : ''}`}
            onClick={() => setMainTab('stories')}
          >
            {t('zukan.tab.stories')}
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
                  <span className="zukan-story-name">
                    {t(`zukan.story.${entry.storyId}` as MessageKey)}
                  </span>
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
                  {type === 'all'
                    ? t('zukan.filter.all')
                    : type === 'normal'
                      ? t('zukan.filter.normal')
                      : type === 'elite'
                        ? t('zukan.filter.elite')
                        : t('zukan.filter.boss')}
                </button>
              ))}
            </div>
            {[1, 2, 3].map((area) => (
              <div key={area} className="zukan-enemy-area">
                <h3 className="zukan-enemy-area-title">{t('zukan.areaTitle', { n: area })}</h3>
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
                          if (status === 'none' || status === 'encountered') return;
                          setSelectedEnemy(enemy);
                        }}
                      >
                        {status === 'none' || status === 'encountered' ? (
                          <div className="zukan-enemy-unknown">
                            <span className="zukan-enemy-unknown-icon">？</span>
                          </div>
                        ) : (
                          <img
                            className="zukan-enemy-img"
                            src={enemy.imageUrl}
                            alt={t(enemyNameKey(enemy.id), undefined, enemy.name)}
                          />
                        )}
                        <p className="zukan-enemy-name">
                          {status === 'none' || status === 'encountered'
                            ? '？？？'
                            : t(enemyNameKey(enemy.id), undefined, enemy.name)}
                        </p>
                        {status === 'defeated' && defeatCount > 0 && (
                          <span className="zukan-enemy-defeat-count">討伐 {defeatCount}</span>
                        )}
                        {enemy.type === 'boss' && status === 'defeated' && (
                          <span className="zukan-enemy-boss-badge">BOSS</span>
                        )}
                        {enemy.type === 'elite' && status === 'defeated' && (
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
                    setShowUpgradePreview(false);
                  }}
                >
                  {tab.icon} {t(tab.labelKey)}
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
                    {rarity === 'all' ? t('zukan.filter.all') : rarity === 'common' ? 'C' : rarity === 'uncommon' ? 'U' : 'R'}
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
                      ? t('zukan.filter.all')
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

            <div className="zukan-count-row">
              <p className="zukan-count">{t('zukan.cardCount', { n: filteredCards.length })}</p>
              {showZukanUpgradeToggle && (
                <button
                  type="button"
                  className={`zukan-upgrade-toggle ${showUpgradePreview ? 'zukan-upgrade-toggle--active' : ''}`}
                  onClick={() => {
                    setShowUpgradePreview((v) => !v);
                    setSelectedIndex(null);
                  }}
                >
                  {t('zukan.upgradeBtn')}
                </button>
              )}
            </div>

            <div className="zukan-card-grid">
              {filteredCards.map((card, index) => {
                const unlockName =
                  showUpgradePreview && JOB_TABS_WITH_UPGRADE_PREVIEW.includes(activeTab)
                    ? filteredCardsBase[index]?.name ?? card.name
                    : card.name;
                const isUnlocked = unlockedCardNames.has(unlockName);
                const frameRarity = getFrameRarity(card);
                const zukanRarityClass =
                  frameRarity === 'starter' ? 'zukan-card-item--common' : `zukan-card-item--${frameRarity}`;
                return (
                  <div
                    key={`${card.id}-${index}`}
                    className={`zukan-card-item ${zukanRarityClass} ${isUnlocked ? '' : 'zukan-card-item--locked'}`}
                    role="button"
                    tabIndex={0}
                    aria-label={t('zukan.cardDetailAria', { name: translatedCardName(card, t) })}
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
                      aria-label={t('zukan.cardDetailAria', { name: translatedCardName(card, t) })}
                      disabled={!isUnlocked}
                      onClick={(event) => {
                        if (!isUnlocked) return;
                        event.preventDefault();
                        event.stopPropagation();
                        openCardDetail(index);
                      }}
                    />
                    <div
                      className={`zukan-card-wrapper zukan-card-preview ${isUnlocked ? '' : 'zukan-card-wrapper--locked'}`}
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
              {filteredCards.length === 0 && <p className="zukan-empty">{t('zukan.emptyFilter')}</p>}
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
                  {showZukanUpgradeToggle && (
                    <div className="zukan-detail-upgrade-bar">
                      <button
                        type="button"
                        className={`zukan-upgrade-toggle ${showUpgradePreview ? 'zukan-upgrade-toggle--active' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setShowUpgradePreview((v) => !v);
                        }}
                      >
                        強化
                      </button>
                    </div>
                  )}
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
                    aria-label={t('zukan.cardNavNext')}
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
                alt={t(enemyNameKey(selectedEnemy.id), undefined, selectedEnemy.name)}
              />
              <div className="zukan-enemy-modal-info">
                <div className="zukan-enemy-modal-name-row">
                  <h3 className="zukan-enemy-modal-name">
                    {t(enemyNameKey(selectedEnemy.id), undefined, selectedEnemy.name)}
                  </h3>
                  {getEnemyIntentsForZukan(selectedEnemy.id).length > 0 && (
                    <button
                      type="button"
                      className={`zukan-enemy-skills-btn ${enemySkillsOpen ? 'zukan-enemy-skills-btn--active' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setEnemySkillsOpen(true);
                      }}
                    >
                      {t('zukan.enemy.skills')}
                    </button>
                  )}
                </div>
                <div className="zukan-enemy-modal-stats">
                  <span>HP: {selectedEnemy.hp}</span>
                  <span>{t('zukan.areaTitle', { n: selectedEnemy.area })}</span>
                  <span>{t('zukan.enemy.defeatCount', { n: getEnemyDefeatCount(selectedEnemy.id) })}</span>
                </div>
                {getEnemyStatus(selectedEnemy.id) === 'defeated' && (
                  <p className="zukan-enemy-modal-desc">{selectedEnemy.description}</p>
                )}
                {getEnemyStatus(selectedEnemy.id) === 'encountered' && (
                  <p className="zukan-enemy-modal-desc zukan-enemy-modal-desc--unknown">
                    {t('zukan.enemy.unlockHint')}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="zukan-enemy-modal-close"
                onClick={() => {
                  setEnemySkillsOpen(false);
                  setSelectedEnemy(null);
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {selectedEnemy && enemySkillsOpen && getEnemyIntentsForZukan(selectedEnemy.id).length > 0 && (
          <div
            className="zukan-enemy-skills-overlay"
            onClick={() => setEnemySkillsOpen(false)}
            role="presentation"
          >
            <div className="zukan-enemy-skills-modal" onClick={(event) => event.stopPropagation()}>
              <div className="zukan-enemy-skills-modal-header">
                <h3 className="zukan-enemy-skills-modal-title">{t('zukan.enemySkillsTitle')}</h3>
                <p className="zukan-enemy-skills-modal-sub">
                  {t(enemyNameKey(selectedEnemy.id), undefined, selectedEnemy.name)}
                </p>
              </div>
              <div className="zukan-enemy-skills-modal-body">
                {getEnemyStatus(selectedEnemy.id) === 'defeated' ? (
                  <ul className="zukan-enemy-skills-list">
                    {getEnemyIntentsForZukan(selectedEnemy.id).map((intent, idx) => (
                      <li key={`${selectedEnemy.id}-intent-${idx}`} className="zukan-enemy-skill-row">
                        <span className="zukan-enemy-skill-icon" aria-hidden>
                          {intent.icon}
                        </span>
                        <div className="zukan-enemy-skill-text">
                          <span className="zukan-enemy-skill-name">{intent.description}</span>
                          <span className="zukan-enemy-skill-detail">
                            {formatZukanIntentDetail(intent, selectedEnemy.id)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="zukan-enemy-skills-locked">
                    この敵を撃破すると、使用する技一覧が確認できます。
                  </p>
                )}
              </div>
              <button
                type="button"
                className="zukan-enemy-skills-modal-close"
                onClick={() => setEnemySkillsOpen(false)}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
