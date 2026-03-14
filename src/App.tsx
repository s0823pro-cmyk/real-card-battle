import { useEffect } from 'react';
import BattleScreen from './components/BattleScreen/BattleScreen';
import HomeScreen from './components/HomeScreen/HomeScreen';
import JobSelectScreen from './components/JobSelectScreen/JobSelectScreen';
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
import './App.css';
import './components/RunMap/RunMapScreen.css';
import './components/RunFlow/RunFlow.css';

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
    upgradeOrRemoveCard,
    buyShopItem,
    sellPawnshopCard,
    closePawnshop,
    onBattleEnd,
    pickCardReward,
    pickOmamoriReward,
    startRunFromHome,
    backToHomeFromJobSelect,
    startRunFromJobSelect,
    resetRun,
  } = useRunProgress();

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

  const renderScreen = () => {
    switch (state.currentScreen) {
      case 'home':
      case 'title':
        return <HomeScreen onStart={startRunFromHome} />;
      case 'job_select':
        return (
          <JobSelectScreen
            onSelect={(jobId) => {
              startRunFromJobSelect(jobId);
            }}
            onBack={backToHomeFromJobSelect}
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
            onSelect={upgradeOrRemoveCard}
          />
        );
      case 'victory':
        return <RunClearScreen onReset={resetRun} />;
      case 'game_over':
        return <RunGameOverScreen onReset={resetRun} />;
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
    </div>
  );
}

export default App;
