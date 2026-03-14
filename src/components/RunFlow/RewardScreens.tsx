import type { Card } from '../../types/game';
import type { Omamori } from '../../types/run';

interface CardRewardProps {
  cards: Card[];
  onPick: (cardId: string) => void;
  onSkip: () => void;
}

export const CardRewardScreen = ({ cards, onPick, onSkip }: CardRewardProps) => {
  return (
    <main className="flow-screen">
      <section className="flow-card">
        <h2>戦利品を選べ！</h2>
        <div className="reward-cards">
          {cards.map((card) => (
            <button key={card.id} type="button" className="reward-card" onClick={() => onPick(card.id)}>
              <span className="reward-card-icon">{card.icon ?? '🃏'}</span>
              <strong>{card.name}</strong>
              <small>{card.description}</small>
              <small>
                ⏱{card.timeCost}s {card.damage ? `⚔${card.damage}` : ''} {card.block ? `🛡${card.block}` : ''}
              </small>
              {card.reserveBonus && <em>✨温存で強化</em>}
            </button>
          ))}
        </div>
        <button type="button" className="flow-btn ghost" onClick={onSkip}>
          スキップ
        </button>
      </section>
    </main>
  );
};

interface OmamoriProps {
  omamoris: Omamori[];
  onPick: (id: string) => void;
}

export const OmamoriRewardScreen = ({ omamoris, onPick }: OmamoriProps) => {
  return (
    <main className="flow-screen">
      <section className="flow-card">
        <h2>お守りを選べ！</h2>
        <div className="flow-list">
          {omamoris.map((omamori) => (
            <button key={omamori.id} type="button" className="flow-btn" onClick={() => onPick(omamori.id)}>
              {omamori.icon} {omamori.name} - {omamori.description}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
};

interface CardUpgradeProps {
  mode: 'upgrade' | 'remove';
  cards: Card[];
  onSelect: (cardId: string) => void;
}

export const CardUpgradeScreen = ({ mode, cards, onSelect }: CardUpgradeProps) => {
  return (
    <main className="flow-screen">
      <section className="flow-card">
        <h2>{mode === 'upgrade' ? 'カードを強化' : 'カードを削除'}</h2>
        <div className="flow-list">
          {cards.map((card) => (
            <button key={card.id} type="button" className="flow-btn" onClick={() => onSelect(card.id)}>
              {card.icon ?? '🃏'} {card.name} / ⏱{card.timeCost}s
            </button>
          ))}
        </div>
      </section>
    </main>
  );
};

interface TextResultProps {
  title: string;
  text: string;
  onClose: () => void;
}

export const SimpleResultScreen = ({ title, text, onClose }: TextResultProps) => {
  return (
    <main className="flow-screen">
      <section className="flow-card">
        <h2>{title}</h2>
        <p>{text}</p>
        <button type="button" className="flow-btn" onClick={onClose}>
          戻る
        </button>
      </section>
    </main>
  );
};

interface FinalProps {
  onReset: () => void;
}

export const RunClearScreen = ({ onReset }: FinalProps) => (
  <main className="flow-screen">
    <section className="flow-card">
      <h2>エリア1クリア！</h2>
      <p>商店街を守り抜いた！</p>
      <button type="button" className="flow-btn" onClick={onReset}>
        もう一度挑戦
      </button>
    </section>
  </main>
);

export const RunGameOverScreen = ({ onReset }: FinalProps) => (
  <main className="flow-screen">
    <section className="flow-card">
      <h2>GAME OVER</h2>
      <p>立て直して再挑戦しよう。</p>
      <button type="button" className="flow-btn" onClick={onReset}>
        リトライ
      </button>
    </section>
  </main>
);
