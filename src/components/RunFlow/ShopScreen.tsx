import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Omamori, RunItem, ShopItem } from '../../types/run';
import { FLOW_BG_SHOP } from '../../data/flowBackgrounds';
import { getSellPrice } from '../../data/runData';
import type { Card, JobId } from '../../types/game';
import type { EffectiveCardValues } from '../../utils/cardPreview';
import { useAudioContext } from '../../contexts/AudioContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { omamoriDescKey, omamoriNameKey, translatedCardDescription, translatedCardName } from '../../i18n/entityKeys';
import CardComponent from '../Hand/CardComponent';

interface Props {
  gold: number;
  items: ShopItem[];
  deck: Card[];
  jobId: JobId;
  onBuy: (shopId: string) => void;
  onSell: (cardId: string) => void;
  onRemoveCard: (cardId: string) => void;
  removeCost: number;
  hasUsedSellThisVisit: boolean;
  onClose: () => void;
}

const renderIcon = (shopItem: ShopItem): string => {
  if (shopItem.type === 'sell_card') return '💸';
  if (!shopItem.item) return '❔';
  return ((shopItem.item as Card).icon ?? (shopItem.item as { icon?: string }).icon ?? '🃏') as string;
};

const ShopScreen = ({
  gold,
  items,
  deck,
  jobId,
  onBuy,
  onSell,
  onRemoveCard,
  removeCost,
  hasUsedSellThisVisit,
  onClose,
}: Props) => {
  const { t } = useLanguage();
  const { playSe } = useAudioContext();

  const renderName = (shopItem: ShopItem): string => {
    if (shopItem.type === 'sell_card') return t('shop.sellCardType');
    if (!shopItem.item) return t('shop.unknownType');
    if (shopItem.type === 'omamori') {
      const om = shopItem.item as Omamori;
      return t(omamoriNameKey(om.id), undefined, om.name);
    }
    if (shopItem.type === 'item') {
      return (shopItem.item as RunItem).name;
    }
    return translatedCardName(shopItem.item as Card, t);
  };
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [showCardRemove, setShowCardRemove] = useState(false);
  const [showCardSell, setShowCardSell] = useState(false);
  const [sellConfirmCard, setSellConfirmCard] = useState<Card | null>(null);
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const cards = useMemo(() => items.filter((item) => item.type === 'card'), [items]);
  const omamoris = useMemo(() => items.filter((item) => item.type === 'omamori'), [items]);
  const runItems = useMemo(() => items.filter((item) => item.type === 'item'), [items]);
  const noop = () => {};
  const shopCardStyle: CSSProperties = {
    width: 72,
    height: 115,
    position: 'relative',
    transform: 'none',
    transition: 'none',
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
  };
  const getBaseEffectiveValues = (card: Card): EffectiveCardValues => ({
    damage: card.damage ?? null,
    block: card.block ?? null,
    heal:
      (card.effects ?? []).filter((effect) => effect.type === 'heal').reduce((sum, effect) => sum + effect.value, 0) ||
      null,
    effectiveTimeCost: card.timeCost,
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
  });

  const mainStyle = {
    '--flow-bg-image': `url(${FLOW_BG_SHOP})`,
  } as CSSProperties;

  return (
    <main className="flow-screen flow-screen--with-bg" style={mainStyle}>
      <section className="flow-card shop-flow-card">
        <div className="shop-header">
          <div className="shop-header-left">
            <h2 className="shop-title">{t('shop.title')}</h2>
            <span className="shop-gold">💰 {gold}G</span>
          </div>
          <button type="button" className="btn-shop-exit" onClick={onClose}>
            {t('shop.leave')}
          </button>
        </div>
        <div className="shop-tabs">
          <button
            type="button"
            className={`flow-btn ghost ${tab === 'buy' ? 'shop-tab-active' : ''}`}
            onClick={() => setTab('buy')}
          >
            {t('shop.buy')}
          </button>
          <button
            type="button"
            className={`flow-btn ghost ${tab === 'sell' ? 'shop-tab-active' : ''}`}
            onClick={() => setTab('sell')}
          >
            {t('shop.sell')}
          </button>
        </div>
        {tab === 'buy' ? (
          <div className="flow-list shop-tab-content">
            <p>{t('shop.tabCards')}</p>
            <div className="shop-cards-grid">
              {cards.map((item) => {
                const disabled = item.purchased || item.price > gold;
                const card = item.item as Card;
                return (
                  <div
                    key={item.id}
                    className={`shop-card-item ${!disabled ? 'card-display-item--purchasable' : ''} ${
                      disabled ? 'card-display-item--unaffordable' : ''
                    }`}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    onClick={() => {
                      if (!disabled) setConfirmItem(item);
                    }}
                    onKeyDown={(event) => {
                      if (disabled) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setConfirmItem(item);
                      }
                    }}
                  >
                    <CardComponent
                      card={card}
                      jobId={jobId}
                      selected={false}
                      disabled={false}
                      locked={false}
                      isSelling={false}
                      isReturning={false}
                      isGhost={false}
                      isDragging={false}
                      isDragUnavailable={false}
                      effectiveValues={getBaseEffectiveValues(card)}
                      onSelect={noop}
                      onPointerDown={noop}
                      onPointerMove={noop}
                      onPointerUp={noop}
                      onPointerCancel={noop}
                      onMouseEnter={noop}
                      onMouseLeave={noop}
                      style={shopCardStyle}
                    />
                    <small className="shop-card-price">
                      {item.price}G
                      {item.purchased ? t('shop.purchasedSuffix') : ''}
                    </small>
                  </div>
                );
              })}
            </div>
            <p>{t('shop.tabOmamori')}</p>
            <div className="shop-grid">
              {omamoris.map((item) => {
                const disabled = item.purchased || item.price > gold;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="shop-item"
                    disabled={disabled}
                    onClick={() => { if (!disabled) setConfirmItem(item); }}
                  >
                    <strong>
                      {renderIcon(item)} {renderName(item)}
                    </strong>
                    <span>{item.price}G</span>
                  </button>
                );
              })}
            </div>
            <p>{t('shop.tabItems')}</p>
            <div className="shop-grid">
              {runItems.map((item) => {
                const disabled = item.purchased || item.price > gold;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="shop-item"
                    disabled={disabled}
                    onClick={() => { if (!disabled) setConfirmItem(item); }}
                  >
                    <strong>
                      {renderIcon(item)} {renderName(item)}
                    </strong>
                    <span>{item.price}G</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flow-list shop-tab-content">
            <div className="shop-remove-section">
              <div className="shop-remove-header">
                <span>{t('shop.cardSell')}</span>
              </div>
              {hasUsedSellThisVisit ? (
                <p className="shop-sold-text">{t('shop.sellUsedUp')}</p>
              ) : (
                <>
                  <p className="shop-remove-desc">{t('shop.sellOneDesc')}</p>
                  <button
                    type="button"
                    className="flow-btn ghost"
                    onClick={() => setShowCardSell(true)}
                  >
                    {t('shop.pickCard')}
                  </button>
                </>
              )}
            </div>
            <div className="shop-remove-section">
              <div className="shop-remove-header">
                <span>{t('shop.removeRow')}</span>
                <span>{removeCost}G</span>
              </div>
              <p className="shop-remove-desc">{t('shop.removeOneDesc')}</p>
              <button
                type="button"
                className="flow-btn ghost"
                disabled={gold < removeCost}
                onClick={() => setShowCardRemove(true)}
              >
                {t('shop.pickCard')}
              </button>
            </div>
          </div>
        )}
      </section>
      {showCardSell && !hasUsedSellThisVisit && (
        <div className="shop-remove-overlay" onClick={() => setShowCardSell(false)}>
          <div className="shop-remove-modal" onClick={(event) => event.stopPropagation()}>
            <div className="shop-remove-modal-header">
              <h2 className="shop-remove-modal-title">{t('shop.modalPickSell')}</h2>
              <button type="button" className="shop-remove-close" onClick={() => setShowCardSell(false)}>
                ✕
              </button>
            </div>
            <div className="shop-remove-grid shop-sell-grid">
              {deck.map((card, idx) => (
                <div
                  key={`${card.id}_${idx}`}
                  className="shop-remove-card-item shop-sell-item card-display-item card-display-item--purchasable"
                  onClick={() => setSellConfirmCard(card)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSellConfirmCard(card);
                    }
                  }}
                >
                  <CardComponent
                    card={card}
                    jobId={jobId}
                    selected={false}
                    disabled={false}
                    locked={false}
                    isSelling={false}
                    isReturning={false}
                    isGhost={false}
                    isDragging={false}
                    isDragUnavailable={false}
                    effectiveValues={getBaseEffectiveValues(card)}
                    onSelect={noop}
                    onPointerDown={noop}
                    onPointerMove={noop}
                    onPointerUp={noop}
                    onPointerCancel={noop}
                    onMouseEnter={noop}
                    onMouseLeave={noop}
                    style={shopCardStyle}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {showCardRemove && (
        <div className="shop-remove-overlay" onClick={() => setShowCardRemove(false)}>
          <div className="shop-remove-modal" onClick={(event) => event.stopPropagation()}>
            <div className="shop-remove-modal-header">
              <h2 className="shop-remove-modal-title">{t('shop.modalPickRemove', { cost: removeCost })}</h2>
              <button type="button" className="shop-remove-close" onClick={() => setShowCardRemove(false)}>
                ✕
              </button>
            </div>
            <div className="shop-remove-grid shop-sell-grid">
              {deck.map((card, idx) => (
                <div
                  key={`${card.id}_${idx}`}
                  className="shop-remove-card-item shop-sell-item card-display-item card-display-item--purchasable"
                  onClick={() => {
                    onRemoveCard(card.id);
                    setShowCardRemove(false);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRemoveCard(card.id);
                      setShowCardRemove(false);
                    }
                  }}
                >
                  <CardComponent
                    card={card}
                    jobId={jobId}
                    selected={false}
                    disabled={false}
                    locked={false}
                    isSelling={false}
                    isReturning={false}
                    isGhost={false}
                    isDragging={false}
                    isDragUnavailable={false}
                    effectiveValues={getBaseEffectiveValues(card)}
                    onSelect={noop}
                    onPointerDown={noop}
                    onPointerMove={noop}
                    onPointerUp={noop}
                    onPointerCancel={noop}
                    onMouseEnter={noop}
                    onMouseLeave={noop}
                    style={shopCardStyle}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {sellConfirmCard && (
        <div className="reserve-confirm-overlay" onClick={() => setSellConfirmCard(null)}>
          <div className="reserve-confirm-dialog" onClick={(event) => event.stopPropagation()}>
            <p className="reserve-confirm-title" style={{ marginBottom: 16 }}>
              {t('shop.sellConfirm', {
                name: translatedCardName(sellConfirmCard, t),
                gold: getSellPrice(sellConfirmCard),
              })}
            </p>
            <div className="reserve-confirm-buttons">
              <button type="button" className="btn-reserve-cancel" onClick={() => setSellConfirmCard(null)}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn-reserve-ok"
                onClick={() => {
                  playSe('shop_sell');
                  onSell(sellConfirmCard.id);
                  setSellConfirmCard(null);
                  setShowCardSell(false);
                }}
              >
                {t('shop.sellDo')}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmItem && (
        <div className="shop-remove-overlay" onClick={() => setConfirmItem(null)}>
          <div className="shop-remove-modal" onClick={(event) => event.stopPropagation()}>
            <div className="shop-remove-modal-header">
              <h2 className="shop-remove-modal-title">{t('shop.purchaseTitle')}</h2>
              <button type="button" className="shop-remove-close" onClick={() => setConfirmItem(null)}>
                ✕
              </button>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {confirmItem.type === 'card' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <CardComponent
                      card={confirmItem.item as Card}
                      jobId={jobId}
                      selected={false}
                      disabled={false}
                      locked={false}
                      isSelling={false}
                      isReturning={false}
                      isGhost={false}
                      isDragging={false}
                      isDragUnavailable={false}
                      effectiveValues={getBaseEffectiveValues(confirmItem.item as Card)}
                      onSelect={noop}
                      onPointerDown={noop}
                      onPointerMove={noop}
                      onPointerUp={noop}
                      onPointerCancel={noop}
                      onMouseEnter={noop}
                      onMouseLeave={noop}
                      style={shopCardStyle}
                    />
                  </div>
                  <p className="shop-confirm-effect-desc">
                    {translatedCardDescription(confirmItem.item as Card, t)}
                  </p>
                </>
              ) : (
                <>
                  <p style={{ textAlign: 'center', fontSize: 14 }}>
                    {renderIcon(confirmItem)} {renderName(confirmItem)}
                  </p>
                  {confirmItem.type === 'omamori' && confirmItem.item && (
                    <p className="shop-confirm-effect-desc">
                      {t(
                        omamoriDescKey((confirmItem.item as Omamori).id),
                        undefined,
                        (confirmItem.item as Omamori).description,
                      )}
                    </p>
                  )}
                  {confirmItem.type === 'item' && confirmItem.item && (
                    <p className="shop-confirm-effect-desc">{(confirmItem.item as RunItem).description}</p>
                  )}
                </>
              )}
              <p style={{ textAlign: 'center', color: '#f0b429', fontWeight: 700 }}>
                {confirmItem.price}G
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="flow-btn ghost"
                  style={{ flex: 1 }}
                  onClick={() => setConfirmItem(null)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="flow-btn"
                  style={{ flex: 1 }}
                  onClick={() => {
                    playSe('shop_buy');
                    onBuy(confirmItem.id);
                    setConfirmItem(null);
                  }}
                >
                  {t('shop.purchaseDo', { price: confirmItem.price })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ShopScreen;
