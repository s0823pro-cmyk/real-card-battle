import type { Omamori } from '../../types/run';

interface Props {
  omamoris: Omamori[];
  onPick: (id: string) => void;
}

const ShrineScreen = ({ omamoris, onPick }: Props) => {
  return (
    <main className="flow-screen">
      <section className="flow-card">
        <h2>⛩️ 神社を発見！</h2>
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

export default ShrineScreen;
