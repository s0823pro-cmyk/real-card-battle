export interface PopupItem {
  id: number;
  text: string;
  target: 'player' | 'enemy' | string;
  kind: 'damage' | 'block' | 'buff' | 'dandori' | 'enemy_action' | 'mystery_pot' | 'burn' | 'poison';
}

interface Props {
  popups: PopupItem[];
}

const DamagePopup = ({ popups }: Props) => {
  return (
    <>
      {popups.map((popup) => (
        <span
          key={popup.id}
          className={`damage-popup target-${popup.target} ${
            popup.kind === 'mystery_pot'
              ? 'damage-popup--mystery-pot'
              : popup.kind === 'damage' || popup.kind === 'burn' || popup.kind === 'poison'
                ? Number.parseInt(popup.text.replace(/[^0-9]/g, ''), 10) >= 10
                  ? 'damage-popup--critical'
                  : 'damage-popup--normal'
                : popup.kind === 'block'
                  ? 'damage-popup--block'
                  : popup.kind === 'dandori'
                    ? 'damage-popup--dandori'
                    : popup.kind === 'enemy_action'
                      ? 'damage-popup--enemy-action'
                      : 'damage-popup--buff'
          }`}
        >
          {popup.text}
        </span>
      ))}
    </>
  );
};

export default DamagePopup;
