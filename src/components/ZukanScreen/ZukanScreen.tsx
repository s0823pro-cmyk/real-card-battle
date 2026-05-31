import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAudioContext } from '../../contexts/AudioContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { MessageKey } from '../../i18n';
import { enemyNameKey, translatedCardName } from '../../i18n/entityKeys';
import type { PointerEvent as ReactPointerEvent } from 'react';
import CardComponent from '../Hand/CardComponent';
import type { Card, CardBadge, CardRarity, CardType, JobId } from '../../types/game';
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
  UNEMPLOYED_ZUKAN_COMMON_POOL,
  UNEMPLOYED_ZUKAN_UNCOMMON_POOL,
  UNEMPLOYED_ZUKAN_RARE_POOL_ALL,
} from '../../data/jobs/unemployed';
import {
  COURIER_COMMON_POOL_UNFILTERED,
  COURIER_RARE_POOL_ALL,
  COURIER_STARTER_DECK,
  COURIER_UNCOMMON_POOL_UNFILTERED,
} from '../../data/jobs/courier';
import { NEUTRAL_CARD_POOL } from '../../data/cards/neutralCards';
import { DAR_REQUIEM_CARD, LEGENDARY_WINNERS } from '../../data/legendaryRewardCards';
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
import {
  UNEMPLOYED_STORY,
  UNEMPLOYED_E1_STORY,
  UNEMPLOYED_E2_STORY,
  UNEMPLOYED_E3_STORY,
} from '../../data/stories/unemployedStory';
import {
  COURIER_STORY,
  COURIER_E1_STORY,
  COURIER_E2_STORY,
  COURIER_E3_STORY,
} from '../../data/stories/courierStory';
import type { StoryScene } from '../../data/stories/carpenterStory';
import { StoryScreen } from '../StoryScreen/StoryScreen';
import { ENEMY_ZUKAN_DATA } from '../../data/enemyZukanData';
import type { EnemyZukanEntry } from '../../data/enemyZukanData';
import { getEnemyDefeatCount, getEnemyStatus } from '../../utils/enemyRecord';
import { formatZukanIntentDetail, getEnemyIntentsForZukan } from '../../utils/enemyIntentCatalog';
import { upgradeCardByJobId } from '../../utils/cardUpgrade';
import { getUpgradeForCard } from '../../data/upgrades';
import {
  ACHIEVEMENT_LOCKED_CARD_IDS,
  getUnlockedCardIds,
  isAchievementRewardCardVisibleInCatalog,
} from '../../utils/achievementSystem';
import {
  canUseStarterIllustration2,
  getSelectedCardIllustrationVariant,
  hasMasteryIllustration2Asset,
  isStarterIllustration2Eligible,
  JOB_MASTERY_CHANGED_EVENT,
  setSelectedCardIllustrationVariant,
} from '../../utils/jobMasterySystem';
import './ZukanScreen.css';

type MainTab = 'cards' | 'stories' | 'enemies';
type JobTab = 'carpenter' | 'cook' | 'unemployed' | 'courier' | 'neutral' | 'legendary';
type RarityFilter = 'all' | CardRarity;
type TypeFilter = 'all' | Extract<CardType, 'attack' | 'skill' | 'power' | 'tool'>;
type EnemyTypeFilter = 'all' | 'normal' | 'elite' | 'boss';
type FrameRarity = CardRarity | 'starter';

const CARD_BADGE_SEARCH_LABELS: Record<CardBadge, string[]> = {
  exhaust: ['消耗', '使用後除外', 'exhaust'],
  vanish: ['消滅', 'デッキから削除', 'vanish'],
  limited: ['制限', '所持制限', '1枚制限', 'limited'],
  setup: ['準備', 'setup'],
  self_damage: ['自傷', '自分にダメージ', 'self damage', 'self_damage'],
  reserve: ['温存', 'reserve'],
  oikomi: ['追込', '追い込み', 'oikomi'],
  ingredient: ['食材', 'ingredient'],
  cooking: ['調理', 'cooking'],
  stamina: ['スタミナ', '過労', 'stamina'],
  immovable: ['不動', '過労ダウン中のみ', 'immovable'],
  unyielding: ['不屈', '過労ダウン中でも使用可能', 'unyielding'],
};

interface StoryEntry {
  storyId: string;
  icon: string;
  jobId: JobId;
  scenes: StoryScene[];
}

const STORY_LIST: StoryEntry[] = [
  { storyId: 'carpenter_opening', icon: '🔨', jobId: 'carpenter', scenes: CARPENTER_STORY },
  { storyId: 'carpenter_e1', icon: '🔨', jobId: 'carpenter', scenes: CARPENTER_E1_STORY },
  { storyId: 'carpenter_e2', icon: '🔨', jobId: 'carpenter', scenes: CARPENTER_E2_STORY },
  { storyId: 'carpenter_e3', icon: '🔨', jobId: 'carpenter', scenes: CARPENTER_E3_STORY },
  { storyId: 'cook_opening', icon: '🔪', jobId: 'cook', scenes: COOK_STORY },
  { storyId: 'cook_e1', icon: '🔪', jobId: 'cook', scenes: COOK_E1_STORY },
  { storyId: 'cook_e2', icon: '🔪', jobId: 'cook', scenes: COOK_E2_STORY },
  { storyId: 'cook_e3', icon: '🔪', jobId: 'cook', scenes: COOK_E3_STORY },
  { storyId: 'unemployed_opening', icon: '✊', jobId: 'unemployed', scenes: UNEMPLOYED_STORY },
  { storyId: 'unemployed_e1', icon: '✊', jobId: 'unemployed', scenes: UNEMPLOYED_E1_STORY },
  { storyId: 'unemployed_e2', icon: '✊', jobId: 'unemployed', scenes: UNEMPLOYED_E2_STORY },
  { storyId: 'unemployed_e3', icon: '✊', jobId: 'unemployed', scenes: UNEMPLOYED_E3_STORY },
  { storyId: 'courier_opening', icon: '🏍️', jobId: 'courier', scenes: COURIER_STORY },
  { storyId: 'courier_e1', icon: '🏍️', jobId: 'courier', scenes: COURIER_E1_STORY },
  { storyId: 'courier_e2', icon: '🏍️', jobId: 'courier', scenes: COURIER_E2_STORY },
  { storyId: 'courier_e3', icon: '🏍️', jobId: 'courier', scenes: COURIER_E3_STORY },
];

const JOB_TABS: { id: JobTab; labelKey?: MessageKey; label?: string; icon: string }[] = [
  { id: 'carpenter', labelKey: 'job.carpenter.name', icon: '🔨' },
  { id: 'cook', labelKey: 'job.cook.name', icon: '🔪' },
  { id: 'unemployed', labelKey: 'job.unemployed.name', icon: '✊' },
  { id: 'courier', labelKey: 'job.courier.name', icon: '🏍️' },
  { id: 'neutral', labelKey: 'zukan.job.neutral', icon: '⬜' },
  { id: 'legendary', label: '伝説', icon: '🌈' },
];

const getJobTabLabel = (tab: (typeof JOB_TABS)[number], t: ReturnType<typeof useLanguage>['t']): string =>
  tab.label ?? (tab.labelKey ? t(tab.labelKey) : tab.id);

const getLegendaryOwnerName = (card: Card): string | null => {
  if (!card.tags?.includes('legendary')) return null;
  return LEGENDARY_WINNERS.find((winner) => winner.card.name === card.name)?.winnerName ?? null;
};

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
    ...withRarity(UNEMPLOYED_ZUKAN_COMMON_POOL, 'common'),
    ...withRarity(UNEMPLOYED_ZUKAN_UNCOMMON_POOL, 'uncommon'),
    ...withRarity(UNEMPLOYED_ZUKAN_RARE_POOL_ALL, 'rare'),
  ],
  courier: [
    ...COURIER_STARTER_DECK,
    ...withRarity(COURIER_COMMON_POOL_UNFILTERED, 'common'),
    ...withRarity(COURIER_UNCOMMON_POOL_UNFILTERED, 'uncommon'),
    ...withRarity(COURIER_RARE_POOL_ALL, 'rare'),
  ],
  neutral: withRarity(NEUTRAL_CARD_POOL, 'common'),
  legendary: [DAR_REQUIEM_CARD],
};

const ALL_CARDS: Record<JobTab, Card[]> = {
  carpenter: ZUKAN_CARD_POOLS.carpenter,
  cook: ZUKAN_CARD_POOLS.cook,
  unemployed: ZUKAN_CARD_POOLS.unemployed,
  courier: ZUKAN_CARD_POOLS.courier,
  neutral: ZUKAN_CARD_POOLS.neutral,
  legendary: ZUKAN_CARD_POOLS.legendary,
};

const JOB_TABS_WITH_UPGRADE_PREVIEW: JobTab[] = [
  'carpenter',
  'cook',
  'unemployed',
  'courier',
  'neutral',
  'legendary',
];

/** 図鑑タブのカードプールに、少なくとも1枚は強化定義があるか（no_upgrade は除外） */
const jobTabPoolHasAnyUpgrade = (tab: JobTab, pool: Card[]): boolean => {
  if (!JOB_TABS_WITH_UPGRADE_PREVIEW.includes(tab)) return false;
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
const normalizeSearchText = (value: string): string => value.toLocaleLowerCase('ja-JP').normalize('NFKC');

const getCardSearchText = (card: Card, t: ReturnType<typeof useLanguage>['t']): string =>
  normalizeSearchText(
    [
      translatedCardName(card, t),
      card.name,
      card.description,
      card.type,
      card.rarity ?? 'starter',
      ...(card.badges ?? []).flatMap((badge) => [badge, ...(CARD_BADGE_SEARCH_LABELS[badge] ?? [])]),
    ].join(' '),
  );

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
  initialTab?: MainTab;
  debugUnlockAll?: boolean;
}

export const ZukanScreen = ({
  onClose,
  unlockedCardNames,
  onUnlockAll,
  initialTab,
  debugUnlockAll = false,
}: ZukanScreenProps) => {
  const { t } = useLanguage();
  const { playBgm } = useAudioContext();
  const [mainTab, setMainTab] = useState<MainTab>(initialTab ?? 'cards');
  const [activeTab, setActiveTab] = useState<JobTab>('carpenter');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [enemyTypeFilter, setEnemyTypeFilter] = useState<EnemyTypeFilter>('all');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [playingStory, setPlayingStory] = useState<StoryEntry | null>(null);
  const [selectedEnemy, setSelectedEnemy] = useState<EnemyZukanEntry | null>(null);
  const [enemySkillsEnemyId, setEnemySkillsEnemyId] = useState<string | null>(null);
  const [showUpgradePreview, setShowUpgradePreview] = useState(false);
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [masteryRevision, setMasteryRevision] = useState(0);
  const suppressOverlayCloseRef = useRef(false);
  const enemySkillsOpen = selectedEnemy ? enemySkillsEnemyId === selectedEnemy.id : false;

  const handleStoryComplete = useCallback(() => {
    setPlayingStory(null);
    playBgm('menu');
  }, [playBgm]);

  useEffect(() => {
    const onMasteryChanged = () => setMasteryRevision((v) => v + 1);
    window.addEventListener(JOB_MASTERY_CHANGED_EVENT, onMasteryChanged);
    return () => window.removeEventListener(JOB_MASTERY_CHANGED_EVENT, onMasteryChanged);
  }, []);

  const isAlwaysUnlockedCard = useCallback(
    (card: Card) => activeTab === 'legendary' || card.tags?.includes('legendary') === true,
    [activeTab],
  );

  const unlockedAchievementCardIds = useMemo(() => getUnlockedCardIds(), []);
  const getZukanEnemyStatus = useCallback(
    (enemyId: string) => (debugUnlockAll ? 'defeated' : getEnemyStatus(enemyId)),
    [debugUnlockAll],
  );

  const shouldShowCardInCatalog = useCallback(
    (card: Card) => isAlwaysUnlockedCard(card) || debugUnlockAll || isAchievementRewardCardVisibleInCatalog(card.id),
    [debugUnlockAll, isAlwaysUnlockedCard],
  );

  const isCardUnlockedInCatalog = useCallback(
    (card: Card, unlockName: string) => {
      if (isAlwaysUnlockedCard(card) || debugUnlockAll) return true;
      if (ACHIEVEMENT_LOCKED_CARD_IDS.has(card.id)) return unlockedAchievementCardIds.has(card.id);
      return unlockedCardNames.has(unlockName);
    },
    [debugUnlockAll, isAlwaysUnlockedCard, unlockedAchievementCardIds, unlockedCardNames],
  );

  const filteredCardsBase = useMemo(() => {
    const cards = deduplicateCards(ALL_CARDS[activeTab]).filter(shouldShowCardInCatalog);
    const searchTerms = normalizeSearchText(cardSearchQuery)
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean);
    return cards.filter((card) => {
      if (rarityFilter !== 'all' && getCardRarity(card) !== rarityFilter) return false;
      if (typeFilter !== 'all' && card.type !== typeFilter) return false;
      if (searchTerms.length > 0) {
        if (!isCardUnlockedInCatalog(card, card.name)) return false;
        const searchText = getCardSearchText(card, t);
        if (!searchTerms.every((term) => searchText.includes(term))) return false;
      }
      return true;
    });
  }, [activeTab, cardSearchQuery, isCardUnlockedInCatalog, rarityFilter, shouldShowCardInCatalog, t, typeFilter]);

  const filteredCards = useMemo(() => {
    if (!showUpgradePreview || !JOB_TABS_WITH_UPGRADE_PREVIEW.includes(activeTab)) {
      return filteredCardsBase;
    }
    return filteredCardsBase.map((card) =>
      upgradeCardByJobId({ ...card, upgraded: false }, activeTab),
    );
  }, [activeTab, showUpgradePreview, filteredCardsBase]);

  const showZukanUpgradeToggle = useMemo(() => {
    const pool = deduplicateCards(ALL_CARDS[activeTab]).filter(shouldShowCardInCatalog);
    return jobTabPoolHasAnyUpgrade(activeTab, pool);
  }, [activeTab, shouldShowCardInCatalog]);

  const previewJobId: JobId = activeTab === 'neutral' || activeTab === 'legendary' ? 'carpenter' : activeTab;
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
  const selectedCardUnlocked = selectedUnlockName && selectedCard ? isCardUnlockedInCatalog(selectedCard, selectedUnlockName) : false;
  const selectedCardCanUseIllustration2 =
    selectedCard != null &&
    activeTab !== 'neutral' &&
    activeTab !== 'legendary' &&
    selectedCardUnlocked &&
    canUseStarterIllustration2(previewJobId) &&
    isStarterIllustration2Eligible(previewJobId, selectedCard);
  const selectedCardIllustrationVariant =
    selectedCard && selectedCardCanUseIllustration2
      ? getSelectedCardIllustrationVariant(previewJobId, selectedCard)
      : 'v1';
  void masteryRevision;
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
        ...ZUKAN_CARD_POOLS.courier,
        ...ZUKAN_CARD_POOLS.neutral,
        ...ZUKAN_CARD_POOLS.legendary,
      ]
        .filter((card) => isAchievementRewardCardVisibleInCatalog(card.id))
        .map((card) => card.name),
    );
    onUnlockAll(allNames);
  };

  if (playingStory) {
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
        jobId={playingStory.jobId}
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
              const unlocked = debugUnlockAll || hasSeenStory(entry.storyId);
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
                    const status = getZukanEnemyStatus(enemy.id);
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
	                    setCardSearchQuery('');
	                    setSelectedIndex(null);
	                    setShowUpgradePreview(false);
	                  }}
                >
                  {tab.icon} {getJobTabLabel(tab, t)}
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

	            <div className="zukan-card-search">
	              <input
	                className="zukan-card-search-input"
	                type="search"
	                value={cardSearchQuery}
	                placeholder={t('zukan.search.placeholder')}
	                aria-label={t('zukan.search.placeholder')}
	                enterKeyHint="search"
	                onChange={(event) => {
	                  setCardSearchQuery(event.target.value);
	                  setSelectedIndex(null);
	                }}
	              />
	              {cardSearchQuery.trim() && (
	                <button
	                  type="button"
	                  className="zukan-card-search-clear"
	                  aria-label={t('zukan.search.clear')}
	                  onClick={() => {
	                    setCardSearchQuery('');
	                    setSelectedIndex(null);
	                  }}
	                >
	                  ×
	                </button>
	              )}
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
                const isUnlocked = isCardUnlockedInCatalog(card, unlockName);
                const legendaryOwnerName = getLegendaryOwnerName(card);
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
                      {legendaryOwnerName && (
                        <span className="zukan-legend-owner-badge">
                          ユーザー名：{legendaryOwnerName}
                        </span>
                      )}
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
                  {selectedCard && selectedCardCanUseIllustration2 && (
                    <div className="zukan-detail-skin-bar">
                      <span className="zukan-detail-skin-label">熟練度イラスト</span>
                      <button
                        type="button"
                        className={`zukan-skin-toggle ${selectedCardIllustrationVariant === 'v1' ? 'zukan-skin-toggle--active' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedCardIllustrationVariant(previewJobId, selectedCard, 'v1');
                        }}
                      >
                        1
                      </button>
                      <button
                        type="button"
                        className={`zukan-skin-toggle ${selectedCardIllustrationVariant === 'v2' ? 'zukan-skin-toggle--active' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedCardIllustrationVariant(previewJobId, selectedCard, 'v2');
                        }}
                      >
                        2
                      </button>
                      {!hasMasteryIllustration2Asset(selectedCard) && (
                        <small className="zukan-detail-skin-note">画像2未登録</small>
                      )}
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
                    {getLegendaryOwnerName(selectedCard) && (
                      <span className="zukan-legend-owner-badge zukan-legend-owner-badge--detail">
                        ユーザー名：{getLegendaryOwnerName(selectedCard)}
                      </span>
                    )}
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
	                        setEnemySkillsEnemyId(selectedEnemy.id);
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
                {getZukanEnemyStatus(selectedEnemy.id) === 'defeated' && (
                  <p className="zukan-enemy-modal-desc">{selectedEnemy.description}</p>
                )}
                {getZukanEnemyStatus(selectedEnemy.id) === 'encountered' && (
                  <p className="zukan-enemy-modal-desc zukan-enemy-modal-desc--unknown">
                    {t('zukan.enemy.unlockHint')}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="zukan-enemy-modal-close"
	                onClick={() => {
	                  setEnemySkillsEnemyId(null);
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
	            onClick={() => setEnemySkillsEnemyId(null)}
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
                {getZukanEnemyStatus(selectedEnemy.id) === 'defeated' ? (
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
	                onClick={() => setEnemySkillsEnemyId(null)}
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
