import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { useEffect, useRef, useState } from 'react';
import type { Card, GameState, JobId } from './types/game';
import type { BattleResult } from './types/run';
import BattleScreen from './components/BattleScreen/BattleScreen';
import { DefeatScreen } from './components/DefeatScreen/DefeatScreen';
import HomeScreen from './components/HomeScreen/HomeScreen';
import JobSelectScreen from './components/JobSelectScreen/JobSelectScreen';
import { StoryScreen } from './components/StoryScreen/StoryScreen';
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
import { BattleVictoryScreen } from './components/RunFlow/BattleVictoryScreen';
import { useAudio, type BgmType } from './hooks/useAudio';
import { AudioCtx } from './contexts/AudioContext';
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
import { loadBattleState, clearBattleState, restoreGameState } from './utils/battleSave';
import type { BattleSaveData } from './utils/battleSave';
import './App.css';
import './components/RunMap/RunMapScreen.css';
import './components/RunFlow/RunFlow.css';
import {
  clearPendingDefeatInterstitial,
  getAdsRemoved,
  getPendingDefeatInterstitial,
  isAdRemoved,
  setPendingDefeatInterstitial,
} from './utils/adsRemoved';
import { ensureAdMobInitialized, showInterstitialIfAllowed } from './utils/adMobClient';

type TransitionPhase = 'idle' | 'fade-out' | 'fade-in';

function App() {
  const audio = useAudio();
  const { playBgm, stopBgm } = audio;
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
    proceedFromBattleVictory,
    pendingArea3RunVictoryStoryRef,
    continueFromSave,
    startRunFromHome,
    openZukanFromHome,
    backToHomeFromJobSelect,
    backToHomeFromZukan,
    unlockAllCardsForDebug,
    addExpansionCardsTwiceToDeckDev,
    startDevNavigation,
    startRunFromJobSelect,
    resetRun,
    consumeDefeatRevive,
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
  const [pendingJobId, setPendingJobId] = useState<JobId | null>(null);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [currentStoryScenes, setCurrentStoryScenes] = useState<StoryScene[] | null>(null);
  const pendingAreaTransitionRef = useRef<(() => void) | null>(null);
  const [showBossReward, setShowBossReward] = useState(false);
  const [bossRewardArea, setBossRewardArea] = useState<number | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const transitionCleanupRef = useRef<number | null>(null);
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

  /** 敗北でランセーブを消した直後に、ホーム用の続き判定 state をストレージと一致させる */
  useEffect(() => {
    if (state.currentScreen === 'game_over') {
      setSavedProgress(loadSavedProgress());
    }
  }, [state.currentScreen]);

  /** 敗北画面表示時点で未視聴フラグを立てる（アプリ終了で広告スキップされないように） */
  useEffect(() => {
    if (state.currentScreen === 'game_over' && !isAdRemoved()) {
      setPendingDefeatInterstitial(true);
    }
  }, [state.currentScreen]);

  /** マップ系画面のエリアBGM（子の unmount cleanup より後に確実に鳴らす。ストーリー表示中は鳴らさない） */
  useEffect(() => {
    if (showStory) return;
    const screen = state.currentScreen;
    if (screen !== 'map' && screen !== 'dice_rolling' && screen !== 'branch_select') return;
    const id = window.setTimeout(() => {
      const area = Math.min(3, Math.max(1, state.currentArea));
      if (area === 1) playBgm('area1');
      else if (area === 2) playBgm('area2');
      else playBgm('area3');
    }, 0);
    return () => window.clearTimeout(id);
  }, [state.currentScreen, state.currentArea, showStory, playBgm]);

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
    if (!Capacitor.isNativePlatform()) return;
    void ensureAdMobInitialized();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});
  }, []);

  useEffect(() => {
    const snap = { bgm: 'none' as BgmType };
    window.__stopBgm = () => {
      snap.bgm = audio.getCurrentBgm();
      audio.stopBgm();
    };
    window.__resumeBgm = () => {
      if (snap.bgm !== 'none') {
        audio.playBgm(snap.bgm);
      }
    };
    return () => {
      delete window.__stopBgm;
      delete window.__resumeBgm;
    };
  }, [audio]);

  const clearAllSaveData = () => {
    clearBattleState();
    clearSavedProgress();
    setSavedProgress(null);
  };

  const resumeMenuBgmAfterAd = () => {
    stopBgm();
    playBgm('menu');
  };

  const goHomeWithInterstitial = () => {
    void (async () => {
      await showInterstitialIfAllowed(getAdsRemoved(), resumeMenuBgmAfterAd);
      clearAllSaveData();
      runScreenTransition(resetRun, 350, 350);
    })();
  };

  /** 敗北画面の「ホームに戻る」— 押下時にインタースティシャル（未完了時は次回スタートで回収） */
  const defeatHomeWithInterstitial = () => {
    void (async () => {
      if (!isAdRemoved() && Capacitor.isNativePlatform()) {
        setPendingDefeatInterstitial(true);
      }
      await showInterstitialIfAllowed(getAdsRemoved(), resumeMenuBgmAfterAd);
      clearAllSaveData();
      runScreenTransition(resetRun, 350, 350);
    })();
  };

  /** 敗北画面の「もう一度挑戦」 */
  const defeatRetryWithInterstitial = () => {
    void (async () => {
      if (!isAdRemoved() && Capacitor.isNativePlatform()) {
        setPendingDefeatInterstitial(true);
      }
      await showInterstitialIfAllowed(getAdsRemoved(), resumeMenuBgmAfterAd);
      runScreenTransition(() => {
        clearAllSaveData();
        resetRun();
        startRunFromHome();
      }, 350, 350);
    })();
  };

  /** ホーム「ゲームスタート」— 保留中の敗北広告があれば先に表示 */
  const handleStartFromHomeWithPendingAd = () => {
    void (async () => {
      if (isAdRemoved()) {
        clearPendingDefeatInterstitial();
        runScreenTransition(startRunFromHome, 1000, 1000);
        return;
      }
      if (!Capacitor.isNativePlatform()) {
        clearPendingDefeatInterstitial();
        runScreenTransition(startRunFromHome, 1000, 1000);
        return;
      }
      if (getPendingDefeatInterstitial()) {
        await showInterstitialIfAllowed(getAdsRemoved(), resumeMenuBgmAfterAd);
      }
      runScreenTransition(startRunFromHome, 1000, 1000);
    })();
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
    }, 400, 500);
  };

  const handleStoryComplete = () => {
    markStorySeen('carpenter');
    setShowStory(false);
    const nextJobId = pendingJobId ?? 'carpenter';
    setPendingJobId(null);
    startRunFromJobSelect(nextJobId);
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
    onBattleEnd(result);
    // ランクリア（onBattleEnd が実際に nextScreen: victory を積んだ）ときだけ e3 ストーリー。App の currentArea だけではエリア1・2ボス後に誤被せしうる
    if (pendingArea3RunVictoryStoryRef.current) {
      pendingArea3RunVictoryStoryRef.current = false;
      if (state.jobId === 'carpenter') {
        showAreaStory(3, () => {});
      }
    }
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
    if (!hasOmamoriChoices) {
      startPostAreaBossFlow(area);
    }
  };

  const handlePickOmamoriReward = (omamoriId: string) => {
    const isAreaBoss = state.lastTileType === 'area_boss';
    const area = state.currentArea;
    if (!isAreaBoss) {
      pickOmamoriReward(omamoriId);
      return;
    }
    pickOmamoriReward(omamoriId, { deferBossTransition: true });
    startPostAreaBossFlow(area);
  };

  const handleBossRewardComplete = (reward: BossReward, selectedCard?: Card) => {
    const area = bossRewardArea;
    const updatedPlayer = applyBossReward(reward.type, selectedCard);
    setShowBossReward(false);
    setBossRewardArea(null);
    if (state.jobId === 'carpenter' && area !== null && area >= 1 && area <= 2) {
      const storyId = `carpenter_e${area}`;
      if (!hasSeenStory(storyId)) {
        showAreaStory(area as 1 | 2, () => {
          advanceAfterAreaBoss(updatedPlayer);
        });
        return;
      }
    }
    advanceAfterAreaBoss(updatedPlayer);
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
            onStart={handleStartFromHomeWithPendingAd}
            onOpenZukan={() => runScreenTransition(openZukanFromHome, 1000, 1000)}
            onContinue={(saved) => {
              clearAllSaveData();
              runScreenTransition(() => continueFromSave(saved), 1000, 1000);
            }}

            savedProgress={savedProgress}
            onDevNavigate={handleDevNavigate}
            onDevAddExpansionCards={addExpansionCardsTwiceToDeckDev}
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
          <BattleScreen
            setup={state.battleSetup}
            onBattleEnd={handleBattleResult}
            onTurnStart={onBattleTurnStart}
            onBattleFinished={() => clearBattleState()}
            initialGameState={restoredBattleState}
            omamoris={state.omamoris}
            currentArea={state.currentArea}
            canOfferDefeatRevive={!state.defeatReviveUsedThisRun}
            onDefeatReviveConsumed={consumeDefeatRevive}
          />
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
      case 'battle_victory':
        return (
          <BattleVictoryScreen
            key={`bv-${state.lastVictoryRewardGold}-${state.lastVictoryMentalRecovery}-${state.totalTurns}`}
            rewardGold={state.lastVictoryRewardGold}
            mentalRecovery={state.lastVictoryMentalRecovery}
            totalGold={state.player.gold}
            onContinue={proceedFromBattleVictory}
          />
        );
      case 'card_reward':
        return (
          <CardRewardScreen
            cards={state.cardReward?.cards ?? []}
            jobId={state.player.jobId}
            onPick={handlePickCardReward}
            onSkip={() => handlePickCardReward(null)}
            adsRemoved={getAdsRemoved()}
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
            newAchievements={state.lastBattleNewAchievements}
            adsRemoved={getAdsRemoved()}
            onHome={goHomeWithInterstitial}
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
            newAchievements={state.lastBattleNewAchievements}
            onHome={defeatHomeWithInterstitial}
            onRetry={defeatRetryWithInterstitial}
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
            onGiveUp={goHomeWithInterstitial}
          />
        );
    }
  };

  return (
    <AudioCtx.Provider value={audio}>
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
        <StoryScreen
          scenes={CARPENTER_STORY}
          onComplete={handleStoryComplete}
          currentArea={state.currentArea}
        />
      )}
      {showStory && currentStoryId && currentStoryScenes && (
        <StoryScreen
          scenes={currentStoryScenes}
          onComplete={handleAreaStoryComplete}
          showStartButton={false}
          storyBgmArea={
            currentStoryId === 'carpenter_e1' ? 2 : currentStoryId === 'carpenter_e2' ? 3 : 3
          }
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
                  if (!isAdRemoved()) setPendingDefeatInterstitial(true);
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
    </AudioCtx.Provider>
  );
}
export default App;
