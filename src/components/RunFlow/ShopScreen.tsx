import { useMemo, useState } from 'react';
import type { ShopItem } from '../../types/run';
import type { Card, JobId } from '../../types/game';
import type { CSSProperties } from 'react';
import type { EffectiveCardValues } from '../../utils/cardPreview';
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

const renderName = (shopItem: ShopItem): string => {
  if (shopItem.type === 'sell_card') return 'カード売却';
  if (!shopItem.item) return '不明';
  return (shopItem.item as Card).name ?? '不明';
};

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
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [showCardRemove, setShowCardRemove] = useState(false);
  const [showCardSell, setShowCardSell] = useState(false);
  const cards = useMemo(() => items.filter((item) => item.type === 'card'), [items]);
  const omamoris = useMemo(() => items.filter((item) => item.type === 'omamori'), [items]);
  const runItems = useMemo(() => items.filter((item) => item.type === 'item'), [items]);
  const noop = () => {};
  const getBaseEffectiveValues = (card: Card): EffectiveCardValues => ({
    damage: card.damage ?? null,
    block: card.block ?? null,
    effectiveTimeCost: card.timeCost,
    isTimeBuffed: false,
    isTimeDebuffed: false,
    isDamageBuffed: false,
    isDamageDebuffed: false,
    isBlockBuffed: false,
    isBlockDebuffed: false,
  });

  return (
    <main className="flow-screen">
      <section className="flow-card shop-flow-card">
        <div className="shop-header">
          <div className="shop-header-left">
            <h2 className="shop-title">🏪 質屋</h2>
            <span className="shop-gold">💰 {gold}G</span>
          </div>
          <button type="button" className="btn-shop-exit" onClick={onClose}>
            退出
          </button>
        </div>
        <div className="shop-tabs">
          <button
            type="button"
            className={`flow-btn ghost ${tab === 'buy' ? 'shop-tab-active' : ''}`}
            onClick={() => setTab('buy')}
          >
            購入
          </button>
          <button
            type="button"
            className={`flow-btn ghost ${tab === 'sell' ? 'shop-tab-active' : ''}`}
            onClick={() => setTab('sell')}
          >
            売却
          </button>
        </div>
        {tab === 'buy' ? (
          <div className="flow-list shop-tab-content">
            <p>カード</p>
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
                      if (!disabled) onBuy(item.id);
                    }}
                    onKeyDown={(event) => {
                      if (disabled) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onBuy(item.id);
                      }
                    }}
                    style={
                      {
                        '--hand-card-width': '90px',
                        '--hand-card-height': '144px',
                      } as CSSProperties
                    }
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
                    />
                    <small className="shop-card-price">
                      {item.price}G {item.purchased ? ' / 購入済み' : ''}
                    </small>
                  </div>
                );
              })}
            </div>
            <p>お守り</p>
            <div className="shop-grid">
              {omamoris.map((item) => {
                const disabled = item.purchased || item.price > gold;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="shop-item"
                    disabled={disabled}
                    onClick={() => onBuy(item.id)}
                  >
                    <strong>
                      {renderIcon(item)} {renderName(item)}
                    </strong>
                    <span>{item.price}G</span>
                  </button>
                );
              })}
            </div>
            <p>アイテム</p>
            <div className="shop-grid">
              {runItems.map((item) => {
                const disabled = item.purchased || item.price > gold;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="shop-item"
                    disabled={disabled}
                    onClick={() => onBuy(item.id)}
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
                <span>カード売却</span>
              </div>
              {hasUsedSellThisVisit ? (
                <p className="shop-sold-text">今回の訪問では売却済みです</p>
              ) : (
                <>
                  <p className="shop-remove-desc">カード1枚を売却する（売却額はカードによる）</p>
                  <button
                    type="button"
                    className="flow-btn ghost"
                    onClick={() => setShowCardSell(true)}
                  >
                    カードを選ぶ
                  </button>
                </>
              )}
            </div>
            <div className="shop-remove-section">
              <div className="shop-remove-header">
                <span>カード削除</span>
                <span>{removeCost}G</span>
              </div>
              <p className="shop-remove-desc">デッキから1枚永久に取り除く</p>
              <button
                type="button"
                className="flow-btn ghost"
                disabled={gold < removeCost}
                onClick={() => setShowCardRemove(true)}
              >
                カードを選ぶ
              </button>
            </div>
          </div>
        )}
      </section>
      {showCardSell && !hasUsedSellThisVisit && (
        <div className="shop-remove-overlay" onClick={() => setShowCardSell(false)}>
          <div className="shop-remove-modal" onClick={(event) => event.stopPropagation()}>
            <div className="shop-remove-modal-header">
              <h2 className="shop-remove-modal-title">売却するカードを選ぶ</h2>
              <button type="button" className="shop-remove-close" onClick={() => setShowCardSell(false)}>
                ✕
              </button>
            </div>
            <div className="shop-remove-grid shop-sell-grid">
              {deck.map((card, idx) => (
                <div
                  key={`${card.id}_${idx}`}
                  className="shop-remove-card-item shop-sell-item card-display-item card-display-item--purchasable"
                  onClick={() => {
                    onSell(card.id);
                    setShowCardSell(false);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSell(card.id);
                      setShowCardSell(false);
                    }
                  }}
                  style={
                    {
                      '--hand-card-width': '90px',
                      '--hand-card-height': '144px',
                    } as CSSProperties
                  }
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
              <h2 className="shop-remove-modal-title">削除するカードを選ぶ（{removeCost}G）</h2>
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
                  style={
                    {
                      '--hand-card-width': '90px',
                      '--hand-card-height': '144px',
                    } as CSSProperties
                  }
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
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ShopScreen;
