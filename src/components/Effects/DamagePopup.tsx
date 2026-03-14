export interface PopupItem {
  id: number;
  text: string;
  target: 'player' | string;
  kind: 'damage' | 'block' | 'buff' | 'dandori';
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
            popup.kind === 'damage'
              ? Number.parseInt(popup.text.replace(/[^0-9]/g, ''), 10) >= 10
                ? 'damage-popup--critical'
                : 'damage-popup--normal'
              : popup.kind === 'block'
                ? 'damage-popup--block'
                : popup.kind === 'dandori'
                  ? 'damage-popup--dandori'
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
