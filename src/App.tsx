import { useEffect, useRef, useState } from 'react';
import type { JobId } from './types/game';
import BattleScreen from './components/BattleScreen/BattleScreen';
import HomeScreen from './components/HomeScreen/HomeScreen';
import JobSelectScreen from './components/JobSelectScreen/JobSelectScreen';
import { StoryScreen } from './components/StoryScreen/StoryScreen';
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
  RunClearScreen,
  RunGameOverScreen,
} from './components/RunFlow/RewardScreens';
import { useRunProgress } from './hooks/useRunProgress';
import { CARPENTER_STORY, hasSeenStory, markStorySeen } from './data/stories/carpenterStory';
import './App.css';
import './components/RunMap/RunMapScreen.css';
import './components/RunFlow/RunFlow.css';

type TransitionPhase = 'idle' | 'fade-out' | 'fade-in';

function App() {
  const {
    state,
    branchPreviews,
    rollDiceAndMove,
    chooseBranch,
    chooseEventChoice,
    hotelHeal,
    hotelMeditate,
    openHotelUpgrade,
    closeCardUpgrade,
    upgradeDeckCard,
    removeCardInUpgrade,
    removeCardAtPawnshop,
    getRemoveCost,
    buyShopItem,
    sellPawnshopCard,
    closePawnshop,
    onBattleEnd,
    pickCardReward,
    pickOmamoriReward,
    startRunFromHome,
    openZukanFromHome,
    backToHomeFromJobSelect,
    backToHomeFromZukan,
    unlockAllCardsForDebug,
    startRunFromJobSelect,
    resetRun,
  } = useRunProgress();
  const [screenTransition, setScreenTransition] = useState<{ phase: TransitionPhase; durationMs: number }>({
    phase: 'idle',
    durationMs: 0,
  });
  const [showStory, setShowStory] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<JobId | null>(null);
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
    }, 500, 500);
  };

  const handleStoryComplete = () => {
    markStorySeen('carpenter');
    setShowStory(false);
    const nextJobId = pendingJobId ?? 'carpenter';
    setPendingJobId(null);
    startRunFromJobSelect(nextJobId);
  };

  const renderScreen = () => {
    switch (state.currentScreen) {
      case 'home':
      case 'title':
        return (
          <HomeScreen
            onStart={() => runScreenTransition(startRunFromHome, 1000, 1000)}
            onOpenZukan={() => runScreenTransition(openZukanFromHome, 1000, 1000)}
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
            onBattleEnd={onBattleEnd}
          />
        );
      case 'event':
        return state.activeEvent ? (
          <EventScreen event={state.activeEvent} onChoose={chooseEventChoice} />
        ) : null;
      case 'hotel':
        return <RestScreen onHeal={hotelHeal} onUpgrade={openHotelUpgrade} onMeditate={hotelMeditate} />;
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
            canCarryMoreItems={state.items.length < 3}
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
            onPick={pickCardReward}
            onSkip={() => pickCardReward(null)}
          />
        );
      case 'omamori_reward':
        return (
          <OmamoriRewardScreen
            omamoris={state.omamoriRewardChoices ?? []}
            onPick={pickOmamoriReward}
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
        return <RunClearScreen onReset={() => runScreenTransition(resetRun, 350, 350)} />;
      case 'game_over':
        return <RunGameOverScreen onReset={() => runScreenTransition(resetRun, 350, 350)} />;
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
        <span style={{ fontSize: 48 }}>📱</span>
        <span>縦向きでプレイしてください</span>
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
      {showStory && state.currentScreen === 'job_select' && (
        <StoryScreen scenes={CARPENTER_STORY} onComplete={handleStoryComplete} />
      )}
    </div>
  );
}

export default App;
