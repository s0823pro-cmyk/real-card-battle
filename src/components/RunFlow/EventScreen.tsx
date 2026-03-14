import type { GameEvent } from '../../types/run';

interface Props {
  event: GameEvent;
  onChoose: (index: number) => void;
}

const EventScreen = ({ event, onChoose }: Props) => {
  return (
    <main className="flow-screen">
      <section className="flow-card">
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
