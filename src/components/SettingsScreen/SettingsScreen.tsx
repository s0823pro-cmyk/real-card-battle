import './SettingsScreen.css';
import { useEffect, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { getAdsRemoved } from '../../utils/adsRemoved';
import { getDebugEnemyHp1, setDebugEnemyHp1 } from '../../utils/debugEnemyHp1';
import { unlockJob } from '../../utils/jobUnlockSystem';
import { IAP_PRODUCTS, purchaseProduct, restorePurchases } from '../../utils/iapService';
import { useAudioContext } from '../../contexts/AudioContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DevDestination } from '../../hooks/useRunProgress';
import type { Locale } from '../../i18n';

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
  /** 用語集を開く（未指定のときはデータセクションに用語集ボタンを出さない） */
  onOpenGlossary?: () => void;
  onDevNavigate?: (destination: DevDestination) => void;
}

const SettingsScreen = ({ onBack, onResetData, onOpenGlossary, onDevNavigate }: SettingsScreenProps) => {
  const { t, locale, switchLocale, isLocaleLoading } = useLanguage();
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
      window.alert(t('home.settings.iapNativeOnly'));
      return;
    }
    setIapBusy(true);
    try {
      await purchaseProduct(productId);
      setIsAdFree(getAdsRemoved());
    } catch {
      window.alert(t('home.settings.iapPurchaseFail'));
    } finally {
      setIapBusy(false);
    }
  };

  const handleIapRestore = async () => {
    if (!Capacitor.isNativePlatform()) {
      window.alert(t('home.settings.iapRestoreNativeOnly'));
      return;
    }
    setIapBusy(true);
    try {
      await restorePurchases();
      setIsAdFree(getAdsRemoved());
    } catch {
      window.alert(t('home.settings.iapRestoreFail'));
    } finally {
      setIapBusy(false);
    }
  };

  const langOptions: { code: Locale; labelKey: 'lang.ja' | 'lang.en' | 'lang.ko' }[] = [
    { code: 'ja', labelKey: 'lang.ja' },
    { code: 'en', labelKey: 'lang.en' },
    { code: 'ko', labelKey: 'lang.ko' },
  ];

  return (
    <div className="settings-screen">
      <div className="settings-header">
        <button type="button" className="btn-settings-back" onClick={onBack}>
          {t('common.back')}
        </button>
        <h2 className="settings-title">{t('common.settings')}</h2>
      </div>

      <div className="settings-content">
        <div className="settings-accordion">
          <button
            type="button"
            className={`settings-accordion-header ${openSection === 'sound' ? 'is-open' : ''}`}
            onClick={() => toggleSection('sound')}
          >
            <span>{t('common.volumeSettings')}</span>
            <span className="settings-accordion-arrow">{openSection === 'sound' ? '▲' : '▼'}</span>
          </button>
          {openSection === 'sound' && (
            <div className="settings-accordion-body">
              <div className="settings-item settings-item--audio">
                <div className="settings-item-header">
                  <span className="settings-item-label">{t('common.bgm')}</span>
                  <button
                    type="button"
                    className={`btn-mute ${bgmMuted ? 'btn-mute--off' : 'btn-mute--on'}`}
                    onClick={() => {
                      const next = toggleBgmMute();
                      setBgmMuted(next);
                    }}
                  >
                    {bgmMuted ? t('common.audioOff') : t('common.audioOn')}
                  </button>
                </div>
              </div>

              <div className="settings-item settings-item--audio">
                <div className="settings-item-header">
                  <span className="settings-item-label">{t('common.se')}</span>
                  <button
                    type="button"
                    className={`btn-mute ${seMuted ? 'btn-mute--off' : 'btn-mute--on'}`}
                    onClick={() => {
                      const next = toggleSeMute();
                      setSeMuted(next);
                    }}
                  >
                    {seMuted ? t('common.audioOff') : t('common.audioOn')}
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
            <span>{t('home.settings.dataSection')}</span>
            <span className="settings-accordion-arrow">{openSection === 'game' ? '▲' : '▼'}</span>
          </button>
          {openSection === 'game' && (
            <div className="settings-accordion-body">
              {onOpenGlossary ? (
                <button type="button" className="settings-btn-block" onClick={() => onOpenGlossary()}>
                  <span className="settings-btn-block-title">{t('home.settings.glossaryTitle')}</span>
                  <span className="settings-btn-block-desc">{t('home.settings.glossaryDesc')}</span>
                </button>
              ) : null}
              <div className="settings-item settings-item--audio settings-language-block">
                <span className="settings-language-label">{t('common.language')}</span>
                {isLocaleLoading && <p className="settings-locale-loading">{t('common.localeLoading')}</p>}
                <div className="settings-language-row" role="group" aria-label={t('common.language')}>
                  {langOptions.map(({ code, labelKey }) => (
                    <button
                      key={code}
                      type="button"
                      disabled={isLocaleLoading}
                      className={`settings-lang-btn ${locale === code ? 'settings-lang-btn--active' : ''}`}
                      onClick={() => void switchLocale(code)}
                    >
                      {t(labelKey)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-item settings-item--row">
                <div className="settings-item-info">
                  <p className="settings-item-title">{t('home.settings.dataResetTitle')}</p>
                  <p className="settings-item-desc">{t('home.settings.dataResetDesc')}</p>
                </div>
                <button type="button" className="settings-btn-danger" onClick={onResetData}>
                  {t('home.settings.dataResetBtn')}
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
            <span>{t('home.settings.purchaseSection')}</span>
            <span className="settings-accordion-arrow">
              {openSection === 'purchase' ? '▲' : '▼'}
            </span>
          </button>
          {openSection === 'purchase' && (
            <div className="settings-accordion-body">
              {!isAdFree && (
                <div className="settings-item settings-item--row">
                  <div className="settings-item-info">
                    <p className="settings-item-title">{t('home.settings.removeAdsTitle')}</p>
                    <p className="settings-item-desc">{t('home.settings.removeAdsDesc')}</p>
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
                  <p className="settings-item-title">{t('home.settings.supporterTitle')}</p>
                  <p className="settings-item-desc">{t('home.settings.supporterDesc')}</p>
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
              {!isAdFree && (
                <div className="settings-item settings-item--row">
                  <div className="settings-item-info">
                    <p className="settings-item-title">{t('home.settings.bundleTitle')}</p>
                    <p className="settings-item-desc">{t('home.settings.bundleDesc')}</p>
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
              )}
              <div className="settings-item settings-item--row">
                <div className="settings-item-info">
                  <p className="settings-item-title">{t('home.settings.restoreTitle')}</p>
                  <p className="settings-item-desc">{t('home.settings.restoreDesc')}</p>
                </div>
                <button
                  type="button"
                  className="settings-btn-restore"
                  disabled={iapBusy}
                  onClick={() => void handleIapRestore()}
                >
                  {t('home.settings.restoreBtn')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="settings-item settings-item--legal-link">
          <button type="button" className="btn-settings-link" onClick={() => void openUrl(TERMS_URL)}>
            {t('home.settings.terms')}
          </button>
        </div>

        <div className="settings-item settings-item--legal-link">
          <button type="button" className="btn-settings-link" onClick={() => void openUrl(PRIVACY_URL)}>
            {t('home.settings.privacy')}
          </button>
        </div>

        <div className="settings-legal">
          <p className="settings-legal-text">{t('home.settings.adRemoveLegal')}</p>
        </div>

        {import.meta.env.DEV && onDevNavigate && (
          <div className="dev-tools">
            <p className="dev-tools-title">{t('settings.devTools')}</p>
            <div className="dev-tools-grid">
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('battle_normal')}>
                {t('settings.dev.normalBattle')}
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('battle_elite')}>
                {t('settings.dev.eliteBattle')}
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('battle_boss_1')}>
                {t('settings.dev.boss1')}
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('battle_boss_2')}>
                {t('settings.dev.boss2')}
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('battle_boss_3')}>
                {t('settings.dev.boss3')}
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('shop')}>
                {t('settings.dev.pawnshop')}
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('shrine')}>
                {t('settings.dev.shrine')}
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('hotel')}>
                {t('settings.dev.hotel')}
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('event')}>
                {t('settings.dev.event')}
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('card_reward')}>
                {t('settings.dev.cardReward')}
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('boss_reward')}>
                {t('settings.dev.bossReward')}
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('story')}>
                {t('settings.dev.story')}
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('battle_all_cards')}>
                {t('settings.dev.allCardsBattle')}
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('battle_cook_all_x2')}>
                {t('settings.dev.cookAllX2')}
              </button>
              <button type="button" className="btn-dev" onClick={() => onDevNavigate('battle_expansion_x2')}>
                {t('settings.dev.expansionBattle')}
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
                {t('settings.dev.enemyHp1')} {debugEnemyHp1 ? 'ON' : 'OFF'}
              </button>
              <button type="button" className="btn-dev" onClick={() => unlockJob('cook')}>
                {t('settings.dev.unlockCook')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsScreen;
