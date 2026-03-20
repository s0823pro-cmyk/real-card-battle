import { useEffect, useRef, useState, useCallback } from 'react';
import type { Card, GameState, JobId } from './types/game';
import type { BattleResult } from './types/run';
import BattleScreen from './components/BattleScreen/BattleScreen';
import { DefeatScreen } from './components/DefeatScreen/DefeatScreen';
import HomeScreen from './components/HomeScreen/HomeScreen';
import JobSelectScreen from './components/JobSelectScreen/JobSelectScreen';
import { StoryScreen } from './components/StoryScreen/StoryScreen';
import { TutorialOverlay, hasTutorialSeen } from './components/TutorialOverlay/TutorialOverlay';
import { VictoryScreen } from './components/VictoryScreen/VictoryScreen';
import { BossRewardScreen } from './components/BossRewardScreen/BossRewardScreen';
import { ZukanScreen } from './components/ZukanScreen/ZukanScreen';
import RouletteOverlay from './components/RunMap/RouletteOverlay';
import RunMapScreen from './components/RunMap/RunMapScreen';
import EventScreen from './components/RunFlow/EventScreen';
import RestScreen from './components/RunFlow/RestScreen';
import ShopScreen from './components/RunFlow/ShopScreen';
import ShrineScreen from './components/RunFlow/TreasureScreen';
import {
  CardRewardScreen,
  CardUpgradeScreen,
  OmamoriRewardScreen,
} from './components/RunFlow/RewardScreens';
import { useRunProgress, loadSavedProgress, clearSavedProgress } from './hooks/useRunProgress';
import type { DevDestination } from './hooks/useRunProgress';
import {
  CARPENTER_STORY,
  CARPENTER_E1_STORY,
  CARPENTER_E2_STORY,
  CARPENTER_E3_STORY,
  hasSeenStory,
  markStorySeen,
} from './data/stories/carpenterStory';
import type { BossReward } from './data/bossRewards';
import type { StoryScene } from './data/stories/carpenterStory';
import { preloadAllImages } from './utils/preloadImages';
import { loadBattleState, clearBattleState, restoreGameState } from './utils/battleSave';
import type { BattleSaveData } from './utils/battleSave';
import './App.css';
import './components/RunMap/RunMapScreen.css';
import './components/RunFlow/RunFlow.css';

type TransitionPhase = 'idle' | 'fade-out' | 'fade-in';

function App() {
  const {
    state,
    pendingItemReplacement,
    branchPreviews,
    rollDiceAndMove,
    chooseBranch,
    chooseEventChoice,
    hotelHeal,
    hotelMeditate,
    hotelGetItem,
    resolvePendingItemReplacement,
    openHotelUpgrade,
    closeCardUpgrade,
    upgradeDeckCard,
    removeCardInUpgrade,
    removeCardAtPawnshop,
    getRemoveCost,
    buyShopItem,
    sellPawnshopCard,
    closePawnshop,
    onBattleTurnStart,
    onBattleEnd,
    pickCardReward,
    pickOmamoriReward,
    applyBossReward,
    advanceAfterAreaBoss,
    continueFromSave,
    startRunFromHome,
    openZukanFromHome,
    backToHomeFromJobSelect,
    backToHomeFromZukan,
    unlockAllCardsForDebug,
    startDevNavigation,
    startRunFromJobSelect,
    resetRun,
  } = useRunProgress();
  const [savedProgress, setSavedProgress] = useState(() => loadSavedProgress());
  const [battleSave, setBattleSave] = useState<BattleSaveData | null>(() => loadBattleState());
  const [showBattleRestorePrompt, setShowBattleRestorePrompt] = useState(() => loadBattleState() !== null);
  const [restoredBattleState, setRestoredBattleState] = useState<GameState | null>(null);
  const [screenTransition, setScreenTransition] = useState<{ phase: TransitionPhase; durationMs: number }>({
    phase: 'idle',
    durationMs: 0,
  });
  const [showStory, setShowStory] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<JobId | null>(null);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [currentStoryScenes, setCurrentStoryScenes] = useState<StoryScene[] | null>(null);
  const pendingAreaTransitionRef = useRef<(() => void) | null>(null);
  const bossRewardHandledByStoryRef = useRef(false);
  const [showBossReward, setShowBossReward] = useState(false);
  const [bossRewardArea, setBossRewardArea] = useState<number | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const transitionCleanupRef = useRef<number | null>(null);
  const [preloadEnabled, setPreloadEnabled] = useState<boolean>(
    () => localStorage.getItem('preload_images') === 'true',
  );
  const [preloadProgress, setPreloadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const preloadDoneRef = useRef(false);

  useEffect(() => {
    const allowMapScroll =
      state.currentScreen === 'map' ||
      state.currentScreen === 'branch_select' ||
      state.currentScreen === 'dice_rolling';
    document.body.style.overflowY = allowMapScroll ? 'auto' : 'hidden';
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowY = allowMapScroll ? 'auto' : 'hidden';
    document.documentElement.style.overflowX = 'hidden';

    return () => {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    };
  }, [state.currentScreen]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
      if (transitionCleanupRef.current !== null) {
        window.clearTimeout(transitionCleanupRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!preloadEnabled || preloadDoneRef.current) return;
    preloadDoneRef.current = true;
    preloadAllImages((loaded, total) => {
      setPreloadProgress({ loaded, total });
      if (loaded >= total) {
        window.setTimeout(() => setPreloadProgress(null), 1200);
      }
    });
  }, [preloadEnabled]);

  const togglePreload = useCallback(() => {
    setPreloadEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('preload_images', String(next));
      return next;
    });
  }, []);

  const clearAllSaveData = () => {
    clearBattleState();
    clearSavedProgress();
    setSavedProgress(null);
  };

  const runScreenTransition = (action: () => void, fadeOutMs: number, fadeInMs: number) => {
    if (screenTransition.phase !== 'idle') return;
    setScreenTransition({ phase: 'fade-out', durationMs: fadeOutMs });
    transitionTimeoutRef.current = window.setTimeout(() => {
      action();
      setScreenTransition({ phase: 'fade-in', durationMs: fadeInMs });
      transitionCleanupRef.current = window.setTimeout(() => {
        setScreenTransition({ phase: 'idle', durationMs: 0 });
      }, fadeInMs);
    }, fadeOutMs);
  };

  const handleJobSelect = (jobId: JobId) => {
    runScreenTransition(() => {
      if (jobId === 'carpenter' && !hasSeenStory('carpenter')) {
        setPendingJobId(jobId);
        setShowStory(true);
        return;
      }
      startRunFromJobSelect(jobId);
      if (!hasTutorialSeen()) {
        setShowTutorial(true);
      }
    }, 400, 500);
  };

  const handleStoryComplete = () => {
    markStorySeen('carpenter');
    setShowStory(false);
    const nextJobId = pendingJobId ?? 'carpenter';
    setPendingJobId(null);
    startRunFromJobSelect(nextJobId);
    if (!hasTutorialSeen()) {
      setShowTutorial(true);
    }
  };

  const showAreaStory = (area: 1 | 2 | 3, onDone: () => void) => {
    const storyId = `carpenter_e${area}`;
    const scenes = area === 1 ? CARPENTER_E1_STORY : area === 2 ? CARPENTER_E2_STORY : CARPENTER_E3_STORY;
    pendingAreaTransitionRef.current = onDone;
    setCurrentStoryId(storyId);
    setCurrentStoryScenes(scenes);
    setShowStory(true);
  };

  const handleAreaStoryComplete = () => {
    const storyId = currentStoryId;
    setShowStory(false);
    setCurrentStoryId(null);
    setCurrentStoryScenes(null);
    if (storyId) markStorySeen(storyId);
    const transition = pendingAreaTransitionRef.current;
    pendingAreaTransitionRef.current = null;
    transition?.();
  };

  const startPostAreaBossFlow = (area: number) => {
    if (area >= 3) {
      advanceAfterAreaBoss();
      return;
    }

    const openBossReward = () => {
      setBossRewardArea(area);
      setShowBossReward(true);
    };
    openBossReward();
  };

  const handleBattleResult = (result: BattleResult) => {
    setRestoredBattleState(null);
    const isBossVictory = result.outcome === 'victory' && result.kind === 'boss';
    const area = state.currentArea;

    // エリア3ボス撃破時はストーリーを先に表示してからクリア画面へ
    if (isBossVictory && state.jobId === 'carpenter' && area >= 3) {
      onBattleEnd(result);
      showAreaStory(3, () => {});
      return;
    }

    // エリア1・2ボス撃破時はストーリー未見なら先にストーリーを表示してからカード報酬へ
    if (isBossVictory && state.jobId === 'carpenter') {
      const storyId = `carpenter_e${area}`;
      if (!hasSeenStory(storyId)) {
        showAreaStory(area as 1 | 2, () => {
          onBattleEnd(result);
          bossRewardHandledByStoryRef.current = true;
        });
        return;
      }
    }

    onBattleEnd(result);
  };

  const handlePickCardReward = (cardId: string | null) => {
    const isAreaBoss = state.lastTileType === 'area_boss';
    const area = state.currentArea;
    if (!isAreaBoss) {
      pickCardReward(cardId);
      return;
    }
    const hasOmamoriChoices = (state.omamoriRewardChoices?.length ?? 0) > 0;
    pickCardReward(cardId, { deferBossTransition: true });
    if (!hasOmamoriChoices && !bossRewardHandledByStoryRef.current) {
      startPostAreaBossFlow(area);
    }
    bossRewardHandledByStoryRef.current = false;
  };

  const handlePickOmamoriReward = (omamoriId: string) => {
    const isAreaBoss = state.lastTileType === 'area_boss';
    const area = state.currentArea;
    if (!isAreaBoss) {
      pickOmamoriReward(omamoriId);
      return;
    }
    pickOmamoriReward(omamoriId, { deferBossTransition: true });
    if (!bossRewardHandledByStoryRef.current) {
      startPostAreaBossFlow(area);
    }
    bossRewardHandledByStoryRef.current = false;
  };

  const handleBossRewardComplete = (reward: BossReward, selectedCard?: Card) => {
    applyBossReward(reward.type, selectedCard);
    setShowBossReward(false);
    setBossRewardArea(null);
    advanceAfterAreaBoss();
  };

  const handleDevNavigate = (destination: DevDestination) => {
    setRestoredBattleState(null);
    setShowBattleRestorePrompt(false);
    setBattleSave(null);
    if (destination === 'boss_reward') {
      startRunFromJobSelect('carpenter');
      setBossRewardArea(1);
      setShowBossReward(true);
      return;
    }
    if (destination === 'story') {
      startRunFromJobSelect('carpenter');
      showAreaStory(1, () => {});
      return;
    }
    startDevNavigation(destination);
  };

  const renderScreen = () => {
    const currentTile = state.board.find((tile) => tile.id === state.currentTileId);
    const floor = currentTile?.index ?? 1;
    const totalFloors = Math.max(1, ...state.board.map((tile) => tile.index));
    switch (state.currentScreen) {
      case 'home':
      case 'title':
        return (
          <HomeScreen
            onStart={() => runScreenTransition(startRunFromHome, 1000, 1000)}
            onOpenZukan={() => runScreenTransition(openZukanFromHome, 1000, 1000)}
            onContinue={(saved) => {
              clearAllSaveData();
              runScreenTransition(() => continueFromSave(saved), 1000, 1000);
            }}

            savedProgress={savedProgress}
            preloadEnabled={preloadEnabled}
            onTogglePreload={togglePreload}
            onDevNavigate={handleDevNavigate}
          />
        );
      case 'zukan':
        return (
          <ZukanScreen
            onClose={() => runScreenTransition(backToHomeFromZukan, 350, 350)}
            unlockedCardNames={state.unlockedCardNames}
            onUnlockAll={unlockAllCardsForDebug}
          />
        );
      case 'job_select':
        return (
          <JobSelectScreen
            onSelect={(jobId) => {
              handleJobSelect(jobId);
            }}
            onBack={() => runScreenTransition(backToHomeFromJobSelect, 350, 350)}
          />
        );
      case 'battle':
        return (
          <>
            <BattleScreen
              setup={state.battleSetup}
              onBattleEnd={handleBattleResult}
              onTurnStart={onBattleTurnStart}
              onBattleFinished={() => clearBattleState()}
              initialGameState={restoredBattleState}
            />
            {showTutorial && (
              <TutorialOverlay
                onComplete={() => {
                  setShowTutorial(false);
                }}
              />
            )}
          </>
        );
      case 'event':
        return state.activeEvent ? (
          <EventScreen event={state.activeEvent} onChoose={chooseEventChoice} />
        ) : null;
      case 'hotel':
        return (
          <RestScreen
            onHeal={hotelHeal}
            onUpgrade={openHotelUpgrade}
            onMeditate={hotelMeditate}
            onGetItem={hotelGetItem}
            canReceiveItem={!state.hotelItemReceivedThisVisit}
            itemReceivedThisVisit={state.hotelItemReceivedThisVisit}
            isItemInventoryFull={state.items.length >= 3}
          />
        );
      case 'pawnshop':
        return (
          <ShopScreen
            gold={state.player.gold}
            items={state.activeShopItems}
            deck={state.deck.filter((card) => card.type !== 'status')}
            onBuy={buyShopItem}
            onSell={sellPawnshopCard}
            onRemoveCard={removeCardAtPawnshop}
            removeCost={getRemoveCost(state.cardRemoveCount)}
            hasUsedSellThisVisit={state.pawnshopSellUsedThisVisit}
            jobId={state.jobId}
            onClose={closePawnshop}
          />
        );
      case 'shrine':
        return (
          <ShrineScreen
            omamoris={state.omamoriRewardChoices ?? []}
            onPick={pickOmamoriReward}
          />
        );
      case 'card_reward':
        return (
          <CardRewardScreen
            cards={state.cardReward?.cards ?? []}
            jobId={state.player.jobId}
            onPick={handlePickCardReward}
            onSkip={() => handlePickCardReward(null)}
          />
        );
      case 'omamori_reward':
        return (
          <OmamoriRewardScreen
            omamoris={state.omamoriRewardChoices ?? []}
            onPick={handlePickOmamoriReward}
          />
        );
      case 'card_upgrade':
        return (
          <CardUpgradeScreen
            mode={state.cardUpgradeMode ?? 'upgrade'}
            cards={state.deck.filter((card) => card.type !== 'status')}
            jobId={state.jobId}
            onUpgrade={(cardId) => upgradeDeckCard(cardId)}
            onRemove={removeCardInUpgrade}
            onSkip={closeCardUpgrade}
          />
        );
      case 'victory':
        return (
          <VictoryScreen
            jobId={state.jobId}
            area={state.currentArea}
            turnCount={state.totalTurns}
            cardsAcquired={state.cardsAcquired}
            onHome={() => {
              clearAllSaveData();
              runScreenTransition(resetRun, 350, 350);
            }}
          />
        );
      case 'game_over':
        return (
          <DefeatScreen
            jobId={state.jobId}
            area={state.currentArea}
            floor={floor}
            totalFloors={totalFloors}
            defeatedBy={state.lastDefeatedBy}
            onHome={() => {
              clearAllSaveData();
              runScreenTransition(resetRun, 350, 350);
            }}
            onRetry={() =>
              runScreenTransition(() => {
                clearAllSaveData();
                resetRun();
                startRunFromHome();
              }, 350, 350)
            }
          />
        );
      case 'map':
      case 'dice_rolling':
      case 'branch_select':
      default:
        return (
          <RunMapScreen
            progress={state}
            branchPreviews={branchPreviews}
            onRollDice={rollDiceAndMove}
            onSelectTile={chooseBranch}
            onGiveUp={() => {
              clearAllSaveData();
              runScreenTransition(resetRun, 350, 350);
            }}
          />
        );
    }
  };

  return (
    <div
      className={`app ${
        state.currentScreen === 'map' ||
        state.currentScreen === 'branch_select' ||
        state.currentScreen === 'dice_rolling'
          ? 'app--map'
          : ''
      }`}
    >
      {renderScreen()}
      <div className="rotate-warning">
        <span className="rotate-warning-icon">📱</span>
        <p>縦向きでプレイしてください</p>
      </div>
      {(state.currentScreen === 'dice_rolling' || state.dice.value !== null) && (
        <RouletteOverlay rolling={state.dice.rolling} value={state.dice.value} />
      )}
      {screenTransition.phase !== 'idle' && (
        <div
          className={`screen-transition-overlay ${
            screenTransition.phase === 'fade-out'
              ? 'screen-transition-overlay--fade-out'
              : 'screen-transition-overlay--fade-in'
          }`}
          style={{ animationDuration: `${screenTransition.durationMs}ms` }}
        />
      )}
      {showStory && state.currentScreen === 'job_select' && !currentStoryId && (
        <StoryScreen scenes={CARPENTER_STORY} onComplete={handleStoryComplete} />
      )}
      {showStory && currentStoryId && currentStoryScenes && (
        <StoryScreen
          scenes={currentStoryScenes}
          onComplete={handleAreaStoryComplete}
          showStartButton={false}
        />
      )}
      {showBossReward && bossRewardArea !== null && (
        <BossRewardScreen
          area={bossRewardArea}
          jobId={state.jobId}
          player={state.player}
          onComplete={handleBossRewardComplete}
        />
      )}
      {preloadProgress && (
        <div className="preload-progress">
          <div
            className="preload-progress-bar"
            style={{ width: `${(preloadProgress.loaded / Math.max(1, preloadProgress.total)) * 100}%` }}
          />
          <p className="preload-progress-text">
            画像を読み込み中… {preloadProgress.loaded}/{preloadProgress.total}
          </p>
        </div>
      )}
      {showBattleRestorePrompt && battleSave && (
        <div className="restore-overlay">
          <div className="restore-modal">
            <span className="restore-icon">⚔️</span>
            <h3 className="restore-title">バトルが中断されています</h3>
            <p className="restore-desc">前回のバトルの途中から再開しますか？</p>
            <div className="restore-buttons">
              <button
                type="button"
                className="btn-restore-continue"
                onClick={() => {
                  const save = battleSave;
                  setShowBattleRestorePrompt(false);
                  setBattleSave(null);
                  setRestoredBattleState(restoreGameState(save));
                  continueFromSave(save.runProgress);
                }}
              >
                バトルに戻る
              </button>
              <button
                type="button"
                className="btn-restore-abandon"
                onClick={() => {
                  clearAllSaveData();
                  setBattleSave(null);
                  setShowBattleRestorePrompt(false);
                }}
              >
                諦めてホームへ
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingItemReplacement && (
        <div className="item-replace-overlay">
          <div className="item-replace-modal">
            <h3 className="item-replace-title">入れ替えるアイテムを選択</h3>
            <p className="item-replace-desc">
              「{pendingItemReplacement.incomingItem.name}」を入手します。捨てるアイテムを選んでください。
            </p>
            <div className="item-replace-list">
              {state.items.map((item, idx) => (
                <button
                  key={`replace-item-${item.id}-${idx}`}
                  type="button"
                  className="item-replace-button"
                  onClick={() => resolvePendingItemReplacement(idx)}
                >
                  <span className="item-replace-name">
                    {item.icon ?? '🎒'} {item.name}
                  </span>
                  <span className="item-replace-action">これを捨てる</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="item-replace-cancel"
              onClick={() => resolvePendingItemReplacement(null)}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
