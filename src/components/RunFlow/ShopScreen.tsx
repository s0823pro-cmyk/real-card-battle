import { useMemo, useState } from 'react';
import type { ShopItem } from '../../types/run';
import type { Card } from '../../types/game';

interface Props {
  gold: number;
  items: ShopItem[];
  deck: Card[];
  onBuy: (shopId: string) => void;
  onSell: (cardId: string) => void;
  onClose: () => void;
  canCarryMoreItems: boolean;
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

const ShopScreen = ({ gold, items, deck, onBuy, onSell, onClose, canCarryMoreItems }: Props) => {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const cards = useMemo(() => items.filter((item) => item.type === 'card'), [items]);
  const omamoris = useMemo(() => items.filter((item) => item.type === 'omamori'), [items]);
  const runItems = useMemo(() => items.filter((item) => item.type === 'item'), [items]);

  return (
    <main className="flow-screen">
      <section className="flow-card">
        <h2>🏪 質屋</h2>
        <p>💰 {gold}G</p>
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
          <div className="flow-list">
            <p>カード</p>
            <div className="shop-grid">
              {cards.map((item) => {
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
                    {item.purchased && <small>購入済み</small>}
                  </button>
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
                const disabled =
                  item.purchased || item.price > gold || (item.type === 'item' && !canCarryMoreItems);
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
          <div className="flow-list">
            {deck.map((card) => (
              <button key={card.id} type="button" className="flow-btn" onClick={() => onSell(card.id)}>
                {card.icon ?? '🃏'} {card.name}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="flow-btn ghost" onClick={onClose}>
          閉じる
        </button>
      </section>
    </main>
  );
};

export default ShopScreen;
