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
  const getToneClass = (popup: PopupItem): string => {
    if (popup.kind === 'buff' && /HP|💚|🍖/.test(popup.text)) return 'damage-popup--heal';
    if (popup.kind === 'buff' && /火傷|毒|弱体|脆弱|呪い|debuff/i.test(popup.text)) return 'damage-popup--debuff';
    if (popup.kind === 'buff' && /G|💰/.test(popup.text)) return 'damage-popup--gold';
    if (popup.kind === 'enemy_action') return 'damage-popup--enemy-action';
    if (popup.kind === 'mystery_pot') return 'damage-popup--mystery-pot';
    if (popup.kind === 'damage' || popup.kind === 'burn' || popup.kind === 'poison') {
      return Number.parseInt(popup.text.replace(/[^0-9]/g, ''), 10) >= 10
        ? 'damage-popup--critical'
        : 'damage-popup--normal';
    }
    if (popup.kind === 'block') return 'damage-popup--block';
    if (popup.kind === 'dandori') return 'damage-popup--dandori';
    return 'damage-popup--buff';
  };

  return (
    <>
      {popups.map((popup) => (
        <span
          key={popup.id}
          className={`damage-popup target-${popup.target} ${getToneClass(popup)}`}
        >
          {popup.text}
        </span>
      ))}
    </>
  );
};

export default DamagePopup;
