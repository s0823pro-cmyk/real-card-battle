import type { CSSProperties } from 'react';
import type { Omamori } from '../../types/run';
import { FLOW_BG_SHRINE } from '../../data/flowBackgrounds';

interface Props {
  omamoris: Omamori[];
  onPick: (id: string) => void;
}

const ShrineScreen = ({ omamoris, onPick }: Props) => {
  const mainStyle = {
    '--flow-bg-image': `url(${FLOW_BG_SHRINE})`,
  } as CSSProperties;

  return (
    <main className="flow-screen flow-screen--with-bg" style={mainStyle}>
      <section className="flow-card">
        <h2>⛩️ 神社を発見！</h2>
        <div className="flow-list">
          {omamoris.map((omamori) => (
            <button
              key={omamori.id}
              type="button"
              className="flow-btn flow-btn--omamori"
              onClick={() => onPick(omamori.id)}
            >
              {omamori.imageUrl ? (
                <img
                  src={omamori.imageUrl}
                  alt={omamori.name}
                  className="omamori-reward-img"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              ) : (
                <span className="omamori-reward-icon">{omamori.icon}</span>
              )}
              <span className="omamori-reward-text">
                {omamori.name} - {omamori.description}
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
};

export default ShrineScreen;
