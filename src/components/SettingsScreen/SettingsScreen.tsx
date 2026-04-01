import './SettingsScreen.css';
import { useEffect, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { getAdsRemoved } from '../../utils/adsRemoved';
import { getDebugEnemyHp1, setDebugEnemyHp1 } from '../../utils/debugEnemyHp1';
import { unlockJob } from '../../utils/jobUnlockSystem';
import { IAP_PRODUCTS, purchaseProduct, restorePurchases } from '../../utils/iapService';
import { useAudioContext } from '../../contexts/AudioContext';
import type { DevDestination } from '../../hooks/useRunProgress';

const TERMS_URL = 'https://s0823pro-cmyk.github.io/real-card-battle/terms.html';
const PRIVACY_URL = 'https://s0823pro-cmyk.github.io/real-card-battle/privacy.html';

const openUrl = async (url: string) => {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
};

export interface SettingsScreenProps {
  onBack: () => void;
  onResetData: () => void;
  onDevNavigate?: (destination: DevDestination) => void;
}

const SettingsScreen = ({ onBack, onResetData, onDevNavigate }: SettingsScreenProps) => {
  const { toggleBgmMute, toggleSeMute, isBgmMuted, isSeMuted } = useAudioContext();

  const [bgmMuted, setBgmMuted] = useState(() => isBgmMuted());
  const [seMuted, setSeMuted] = useState(() => isSeMuted());
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [isAdFree, setIsAdFree] = useState(() => getAdsRemoved());
  const [iapBusy, setIapBusy] = useState(false);
  const [debugEnemyHp1, setDebugEnemyHp1Local] = useState(() => getDebugEnemyHp1());

  const toggleSection = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  useEffect(() => {
    const onAdsRemoved = () => setIsAdFree(getAdsRemoved());
    window.addEventListener('ads-removed-changed', onAdsRemoved);
    return () => window.removeEventListener('ads-removed-changed', onAdsRemoved);
  }, []);

  const handleIapPurchase = async (productId: string) => {
    if (!Capacitor.isNativePlatform()) {
      window.alert('アプリ内課金はストアからインストールしたアプリでご利用ください。');
      return;
    }
    setIapBusy(true);
    try {
      await purchaseProduct(productId);
      setIsAdFree(getAdsRemoved());
    } catch {
      window.alert('購入を完了できませんでした。');
    } finally {
      setIapBusy(false);
    }
  };

  const handleIapRestore = async () => {
    if (!Capacitor.isNativePlatform()) {
      window.alert('購入の復元はストアからインストールしたアプリでご利用ください。');
      return;
    }
    setIapBusy(true);
    try {
      await restorePurchases();
      setIsAdFree(getAdsRemoved());
    } catch {
      window.alert('復元に失敗しました。');
    } finally {
      setIapBusy(false);
    }
  };

  return (
    <div className="settings-screen">
      <div className="settings-header">
        <button type="button" className="btn-settings-back" onClick={onBack}>
          ← 戻る
        </button>
        <h2 className="settings-title">設定</h2>
      </div>

      <div className="settings-content">
        <div className="settings-accordion">
          <button
            type="button"
            className={`settings-accordion-header ${openSection === 'sound' ? 'is-open' : ''}`}
            onClick={() => toggleSection('sound')}
          >
            <span>🔊 音量設定</span>
            <span className="settings-accordion-arrow">{openSection === 'sound' ? '▲' : '▼'}</span>
          </button>
          {openSection === 'sound' && (
            <div className="settings-accordion-body">
              <div className="settings-item settings-item--audio">
                <div className="settings-item-header">
                  <span className="settings-item-label">BGM</span>
                  <button
                    type="button"
                    className={`btn-mute ${bgmMuted ? 'btn-mute--off' : 'btn-mute--on'}`}
                    onClick={() => {
                      const next = toggleBgmMute();
                      setBgmMuted(next);
                    }}
                  >
                    {bgmMuted ? '🔇 OFF' : '🔊 ON'}
                  </button>
                </div>
              </div>

              <div className="settings-item settings-item--audio">
                <div className="settings-item-header">
                  <span className="settings-item-label">SE</span>
                  <button
                    type="button"
                    className={`btn-mute ${seMuted ? 'btn-mute--off' : 'btn-mute--on'}`}
                    onClick={() => {
                      const next = toggleSeMute();
                      setSeMuted(next);
                    }}
                  >
                    {seMuted ? '🔇 OFF' : '🔊 ON'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="settings-accordion">
          <button
            type="button"
            className={`settings-accordion-header ${openSection === 'game' ? 'is-open' : ''}`}
            onClick={() => toggleSection('game')}
          >
            <span>⚙️ ゲーム設定</span>
            <span className="settings-accordion-arrow">{openSection === 'game' ? '▲' : '▼'}</span>
          </button>
          {openSection === 'game' && (
            <div className="settings-accordion-body">
              <div className="settings-item settings-item--row">
                <div className="settings-item-info">
                  <p className="settings-item-title">データ初期化</p>
                  <p className="settings-item-desc">
                    ゲームの進行・図鑑・チュートリアルをすべてリセットします。この操作は元に戻せません。
                  </p>
                </div>
                <button type="button" className="settings-btn-danger" onClick={onResetData}>
                  初期化
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="settings-accordion">
          <button
            type="button"
            className={`settings-accordion-header ${openSection === 'purchase' ? 'is-open' : ''}`}
            onClick={() => toggleSection('purchase')}
          >
            <span>💳 購入・課金</span>
            <span className="settings-accordion-arrow">
              {openSection === 'purchase' ? '▲' : '▼'}
            </span>
          </button>
          {openSection === 'purchase' && (
            <div className="settings-accordion-body">
              {!isAdFree && (
                <div className="settings-item settings-item--row">
                  <div className="settings-item-info">
                    <p className="settings-item-title">広告を削除</p>
                    <p className="settings-item-desc">広告表示をオフにします（買い切り）。</p>
                  </div>
                  <button
                    type="button"
                    className="settings-btn-purchase"
                    disabled={iapBusy}
                    onClick={() => void handleIapPurchase(IAP_PRODUCTS.REMOVE_ADS)}
                  >
                    ¥300
                  </button>
                </div>
              )}
              <div className="settings-item settings-item--row">
                <div className="settings-item-info">
                  <p className="settings-item-title">開発者応援パック</p>
                  <p className="settings-item-desc">開発支援のためのオプション購入です。</p>
                </div>
                <button
                  type="button"
                  className="settings-btn-purchase"
                  disabled={iapBusy}
                  onClick={() => void handleIapPurchase(IAP_PRODUCTS.SUPPORTER_PACK)}
                >
                  ¥500
                </button>
              </div>
              <div className="settings-item settings-item--row">
                <div className="settings-item-info">
                  <p className="settings-item-title">お得セット</p>
                  <p className="settings-item-desc">広告削除を含むセットです。</p>
                </div>
                <button
                  type="button"
                  className="settings-btn-purchase"
                  disabled={iapBusy}
                  onClick={() => void handleIapPurchase(IAP_PRODUCTS.BUNDLE_PACK)}
                >
                  ¥700
                </button>
              </div>
              <div className="settings-item settings-item--row">
                <div className="settings-item-info">
                  <p className="settings-item-title">購入の復元</p>
                  <p className="settings-item-desc">以前に購入した内容を復元します。</p>
                </div>
                <button
                  type="button"
                  className="settings-btn-restore"
                  disabled={iapBusy}
                  onClick={() => void handleIapRestore()}
                >
                  復元
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="settings-item settings-item--legal-link">
          <button type="button" className="btn-settings-link" onClick={() => void openUrl(TERMS_URL)}>
            利用規約
          </button>
        </div>

        <div className="settings-item settings-item--legal-link">
          <button type="button" className="btn-settings-link" onClick={() => void openUrl(PRIVACY_URL)}>
            プライバシーポリシー
          </button>
        </div>

        <div className="settings-legal">
          <p className="settings-legal-text">
            広告削除（¥300）は買い切りです。購入後は同一Apple ID / Google アカウントで無制限にご利用いただけます。
          </p>
        </div>

        {import.meta.env.DEV && onDevNavigate && (
          <div className="dev-tools">
            <p className="dev-tools-title">🛠️ 開発用ツール</p>
            <div className="dev-tools-grid">
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('battle_normal')}>
                通常戦闘
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('battle_elite')}>
                エリート戦闘
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('battle_boss_1')}>
                ボス1
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('battle_boss_2')}>
                ボス2
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('battle_boss_3')}>
                ボス3
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('shop')}>
                質屋
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('shrine')}>
                神社
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('hotel')}>
                ホテル
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('event')}>
                イベント
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('card_reward')}>
                カード報酬
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('boss_reward')}>
                ボス報酬
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('story')}>
                ストーリー
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('battle_all_cards')}>
                全カード戦闘
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('battle_expansion_x2')}>
                初期＋拡張バトル開始
              </button>
              <button
                type="button"
                className="btn-dev"
                onClick={() => {
                  const next = !debugEnemyHp1;
                  setDebugEnemyHp1(next);
                  setDebugEnemyHp1Local(next);
                }}
              >
                敵HP1 {debugEnemyHp1 ? 'ON' : 'OFF'}
              </button>
              <button type="button" className="btn-dev" onClick={() => unlockJob('cook')}>
                (料理人解放)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsScreen;
