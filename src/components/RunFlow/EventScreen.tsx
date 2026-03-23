import type { CSSProperties } from 'react';
import type { GameEvent } from '../../types/run';
import { getEventBackgroundUrl } from '../../data/eventScreenBackgrounds';

interface Props {
  event: GameEvent;
  onChoose: (index: number) => void;
}

const EventScreen = ({ event, onChoose }: Props) => {
  const bgUrl = getEventBackgroundUrl(event.id);
  const mainStyle = (
    bgUrl
      ? {
          '--flow-bg-image': `url(${bgUrl})`,
          '--flow-bg-overlay': 'rgba(0, 0, 0, 0.45)',
        }
      : undefined
  ) as CSSProperties | undefined;

  return (
    <main
      className={`flow-screen${bgUrl ? ' flow-screen--with-bg' : ''}`}
      style={mainStyle}
    >
      <section className="flow-card event-screen-card">
        <h2>❓ {event.name}</h2>
        <p>{event.description}</p>
        <div className="flow-list">
          {event.choices.map((choice, idx) => (
            <button key={`${event.id}_${idx}`} type="button" className="flow-btn" onClick={() => onChoose(idx)}>
              {choice.text}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
};

export default EventScreen;
