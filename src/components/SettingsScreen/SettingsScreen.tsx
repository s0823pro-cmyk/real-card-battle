import './SettingsScreen.css';
import { useEffect, useRef, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { getAdsRemoved } from '../../utils/adsRemoved';
import { getDebugEnemyHp1, setDebugEnemyHp1 } from '../../utils/debugEnemyHp1';
import { unlockJob } from '../../utils/jobUnlockSystem';
import { IAP_PRODUCTS, purchaseProduct, restorePurchases } from '../../utils/iapService';
import { useAudioContext } from '../../contexts/AudioContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DevDestination } from '../../hooks/useRunProgress';
import { cardNameKey, enemyNameKey } from '../../i18n/entityKeys';
import type { Locale } from '../../i18n';
import { getAdminSummary, verifyCode } from '../../utils/statsApi';

const TERMS_URL = 'https://s0823pro-cmyk.github.io/real-card-battle/terms.html';
const PRIVACY_URL = 'https://s0823pro-cmyk.github.io/real-card-battle/privacy.html';

const openUrl = async (url: string) => {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
};

type AdminSummaryPayload = {
  total_players: number;
  total_plays: number;
  total_victories: number;
  total_defeats: number;
  job_stats: Array<{ job_id: string; play_count: number; win_count: number; defeat_count: number }>;
  top_cards: Array<{ card_id: string; total_use_count: number }>;
  top_enemies: Array<{ enemy_id: string; total_kill_count: number }>;
  avg_gold_per_play: number;
};

function isAdminSummary(s: unknown): s is AdminSummaryPayload {
  if (typeof s !== 'object' || s === null) return false;
  const o = s as Record<string, unknown>;
  return (
    typeof o.total_players === 'number' &&
    typeof o.total_plays === 'number' &&
    Array.isArray(o.job_stats) &&
    Array.isArray(o.top_cards) &&
    Array.isArray(o.top_enemies)
  );
}

/** `enemy_claimer_0` → `claimer`（表示用） */
function enemyRowTemplateId(enemyId: string): string {
  const m = enemyId.match(/^enemy_(.+)_\d+$/);
  return m ? m[1] : enemyId;
}

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
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const [adminSummary, setAdminSummary] = useState<AdminSummaryPayload | null>(null);
  const [giftToast, setGiftToast] = useState<string | null>(null);
  const giftToastTimerRef = useRef<number | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  useEffect(() => {
    const onAdsRemoved = () => setIsAdFree(getAdsRemoved());
    window.addEventListener('ads-removed-changed', onAdsRemoved);
    return () => window.removeEventListener('ads-removed-changed', onAdsRemoved);
  }, []);

  useEffect(() => {
    return () => {
      if (giftToastTimerRef.current != null) window.clearTimeout(giftToastTimerRef.current);
    };
  }, []);

  const jobLabel = (jobId: string) => {
    if (jobId === 'carpenter') return t('job.carpenter.name');
    if (jobId === 'cook') return t('job.cook.name');
    if (jobId === 'unemployed') return t('job.unemployed.name');
    return jobId;
  };

  const handleVerifyCode = async () => {
    const trimmed = codeInput.trim();
    setCodeError(null);
    if (!trimmed) {
      setCodeError(t('home.settings.codeInvalid'));
      return;
    }
    setCodeBusy(true);
    try {
      const v = await verifyCode(trimmed);
      if (!v.ok || (v.type !== 'admin' && v.type !== 'gift')) {
        setCodeError(t('home.settings.codeInvalid'));
        return;
      }
      if (v.type === 'gift') {
        setGiftToast(t('home.settings.giftReceived'));
        if (giftToastTimerRef.current != null) window.clearTimeout(giftToastTimerRef.current);
        giftToastTimerRef.current = window.setTimeout(() => {
          setGiftToast(null);
          giftToastTimerRef.current = null;
        }, 3200);
        return;
      }
      const raw = await getAdminSummary(trimmed);
      if (raw === null || (typeof raw === 'object' && raw !== null && 'error' in raw)) {
        setCodeError(t('home.settings.summaryLoadError'));
        return;
      }
      if (!isAdminSummary(raw)) {
        setCodeError(t('home.settings.summaryLoadError'));
        return;
      }
      setAdminSummary(raw);
    } finally {
      setCodeBusy(false);
    }
  };

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
            className={`settings-accordion-header ${openSection === 'code' ? 'is-open' : ''}`}
            onClick={() => toggleSection('code')}
          >
            <span>{t('home.settings.codeSection')}</span>
            <span className="settings-accordion-arrow">{openSection === 'code' ? '▲' : '▼'}</span>
          </button>
          {openSection === 'code' && (
            <div className="settings-accordion-body">
              <div className="settings-code-block">
                <input
                  type="text"
                  className="settings-code-input"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder={t('home.settings.codePlaceholder')}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="settings-code-verify-btn"
                  disabled={codeBusy}
                  onClick={() => void handleVerifyCode()}
                >
                  {codeBusy ? t('home.settings.codeBusy') : t('home.settings.codeVerify')}
                </button>
              </div>
              {codeError ? <p className="settings-code-error">{codeError}</p> : null}
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

      {giftToast ? <div className="settings-gift-toast" role="status">{giftToast}</div> : null}

      {adminSummary ? (
        <div
          className="settings-admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-admin-summary-title"
          onClick={() => setAdminSummary(null)}
        >
          <div className="settings-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-admin-modal-header">
              <h3 id="settings-admin-summary-title" className="settings-admin-modal-title">
                {t('home.settings.adminSummaryTitle')}
              </h3>
              <button
                type="button"
                className="settings-admin-modal-close"
                onClick={() => setAdminSummary(null)}
              >
                {t('common.close')}
              </button>
            </div>
            <div className="settings-admin-modal-body">
              <dl className="settings-admin-dl">
                <div>
                  <dt>{t('home.settings.totalPlayers')}</dt>
                  <dd>{adminSummary.total_players}</dd>
                </div>
                <div>
                  <dt>{t('home.settings.totalPlays')}</dt>
                  <dd>{adminSummary.total_plays}</dd>
                </div>
                <div>
                  <dt>{t('home.settings.totalVictories')}</dt>
                  <dd>{adminSummary.total_victories}</dd>
                </div>
                <div>
                  <dt>{t('home.settings.totalDefeats')}</dt>
                  <dd>{adminSummary.total_defeats}</dd>
                </div>
                <div>
                  <dt>{t('home.settings.avgGoldPerPlay')}</dt>
                  <dd>{adminSummary.avg_gold_per_play.toFixed(1)}</dd>
                </div>
              </dl>

              <h4 className="settings-admin-subheading">{t('home.settings.jobStatsTitle')}</h4>
              <ul className="settings-admin-list">
                {adminSummary.job_stats.map((row) => (
                  <li key={row.job_id}>
                    <span className="settings-admin-list-label">{jobLabel(row.job_id)}</span>
                    <span className="settings-admin-list-value">
                      {t('home.settings.jobShortPlays')} {row.play_count} · {t('home.settings.jobShortWins')}{' '}
                      {row.win_count} · {t('home.settings.jobShortLosses')} {row.defeat_count}
                    </span>
                  </li>
                ))}
              </ul>

              <h4 className="settings-admin-subheading">{t('home.settings.topCardsTitle')}</h4>
              <ol className="settings-admin-ol">
                {adminSummary.top_cards.slice(0, 10).map((row, idx) => (
                  <li key={`${row.card_id}-${idx}`}>
                    <span className="settings-admin-list-label">
                      {t(cardNameKey(row.card_id), {}, row.card_id)}
                    </span>
                    <span className="settings-admin-list-num">{row.total_use_count}</span>
                  </li>
                ))}
              </ol>

              <h4 className="settings-admin-subheading">{t('home.settings.topEnemiesTitle')}</h4>
              <ol className="settings-admin-ol">
                {adminSummary.top_enemies.slice(0, 10).map((row, idx) => {
                  const tid = enemyRowTemplateId(row.enemy_id);
                  return (
                    <li key={`${row.enemy_id}-${idx}`}>
                      <span className="settings-admin-list-label">
                        {t(enemyNameKey(tid), {}, tid)}
                      </span>
                      <span className="settings-admin-list-num">{row.total_kill_count}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SettingsScreen;
