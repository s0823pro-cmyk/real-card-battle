import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import type { GameScreen } from '../types/run';

/** マップ／図鑑／ランク等のヘッダー帯に合わせる既定色 */
const INSET_DEFAULT = '#0d1117';
/** 敗北画面 .defeat-bg グラデーション上端 */
const INSET_GAME_OVER = '#0d0d0d';
/** 連続呼び出しで古い非同期が後から完了しイマーシブを潰すのを防ぐ */
let statusBarApplyGen = 0;

const IMMERSIVE_SCREENS = new Set<GameScreen>([
  'home',
  'title',
  'job_select',
  'battle',
  /** ラン中バトル勝利スプラッシュ・カード／お守り報酬・イベント獲得プレビュー等 */
  'battle_victory',
  'card_reward',
  'omamori_reward',
  'event_card_preview',
  'event_gain_modal',
  /** マップ・ルーレット・分岐選択（マップ背景の全面表示） */
  'map',
  'dice_rolling',
  'branch_select',
  /** イベント・宿・質屋・神社・鍛錬（flow-screen 写真背景） */
  'event',
  'hotel',
  'pawnshop',
  'shrine',
  'card_upgrade',
  /** エリア3クリア後の勝利（VictoryScreen） */
  'victory',
]);

/**
 * ネイティブのみ。上記イマーシブ画面・ストーリー・ボス報酬は WebView をステータス下まで拡張。
 * それ以外はオーバーレイ off + ヘッダー相当の背景色。
 */
export function applyStatusBarForAppState(params: {
  currentScreen: GameScreen;
  showStory: boolean;
  showBossReward: boolean;
}): void {
  if (!Capacitor.isNativePlatform()) return;
  const { currentScreen, showStory, showBossReward } = params;

  const immersive = showStory || showBossReward || IMMERSIVE_SCREENS.has(currentScreen);

  const gen = ++statusBarApplyGen;
  void (async () => {
    try {
      const stale = () => gen !== statusBarApplyGen;
      if (immersive) {
        await StatusBar.setOverlaysWebView({ overlay: true });
        if (stale()) return;
        await StatusBar.setStyle({ style: Style.Dark });
        return;
      }
      await StatusBar.setOverlaysWebView({ overlay: false });
      if (stale()) return;
      await StatusBar.setStyle({ style: Style.Dark });
      if (stale()) return;
      let color = INSET_DEFAULT;
      if (currentScreen === 'game_over') color = INSET_GAME_OVER;
      await StatusBar.setBackgroundColor({ color });
    } catch {
      // ignore
    }
  })();
}
