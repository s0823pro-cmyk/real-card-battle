import type { EnemyIntent } from '../../types/game';
import type { Enemy } from '../../types/game';
import { getEnemyAttackValue } from '../../utils/damage';
import Tooltip from '../Tooltip/Tooltip';

interface Props {
  enemy: Enemy;
  intent: EnemyIntent;
}

const getIntentValueText = (intent: EnemyIntent, enemy: Enemy): string => {
  if (intent.type === 'attack') {
    const attackValue = getEnemyAttackValue(intent, enemy);
    if (enemy.templateId === 'wildCat') {
      return `⚔️ ${attackValue * 3}`;
    }
    return `⚔️ ${attackValue}`;
  }
  if (intent.type === 'mental_attack') {
    return `🧠 -${intent.mentalDamage ?? 0}`;
  }
  if (intent.type === 'defend') {
    return intent.value > 0 ? `🛡 ${intent.value}` : '🛡';
  }
  if (intent.type === 'buff') {
    return `⬆️ 強化+${intent.value}`;
  }
  if (intent.type === 'debuff') {
    return intent.description;
  }
  if (intent.type === 'steal_gold') {
    return `💰 -${intent.value}G`;
  }
  if (intent.type === 'regen') {
    return `💚 +${intent.value}HP`;
  }
  if (intent.type === 'random_debuff') {
    return '🎲 ランダムデバフ';
  }
  if (intent.type === 'add_curse') {
    return '🌑 呪いカード追加';
  }
  return '💤 休み';
};

const getIntentLabelText = (intent: EnemyIntent): string => {
  if (intent.type === 'attack') {
    return intent.description
      .replace(/\s*×\d+/g, '')
      .replace(/\s*-?\d+(\.\d+)?$/g, '')
      .trim();
  }
  if (intent.type === 'defend') {
    return intent.description.replace(/\s*-?\d+(\.\d+)?$/g, '').trim();
  }
  if (intent.type === 'buff') {
    return intent.description.replace(/\s*\+?\d+(\.\d+)?$/g, '').trim();
  }
  return intent.description;
};

const EnemyIntentView = ({ enemy, intent }: Props) => {
  const tooltipKey =
    intent.type === 'attack' ||
    intent.type === 'mental_attack' ||
    intent.type === 'defend' ||
    intent.type === 'buff' ||
    intent.type === 'debuff' ||
    intent.type === 'steal_gold' ||
    intent.type === 'regen' ||
    intent.type === 'random_debuff' ||
    intent.type === 'add_curse'
      ? intent.type
      : 'idle';

  const valueClass =
    intent.type === 'attack'
      ? 'enemy-action--attack'
      : intent.type === 'mental_attack'
        ? 'enemy-action--mental'
        : intent.type === 'buff'
          ? 'enemy-action--buff'
          : intent.type === 'defend'
            ? 'enemy-action--defend'
            : intent.type === 'debuff' || intent.type === 'random_debuff'
              ? 'enemy-action--debuff'
              : intent.type === 'steal_gold'
                ? 'enemy-action--steal'
                : intent.type === 'regen'
                  ? 'enemy-action--regen'
                  : intent.type === 'add_curse'
                    ? 'enemy-action--curse'
                    : '';

  return (
    <Tooltip tooltipKey={tooltipKey}>
      <div className="enemy-next-action">
        <span className="enemy-action-label">{getIntentLabelText(intent)}</span>
        <span className={`enemy-action-value ${valueClass}`}>{getIntentValueText(intent, enemy)}</span>
      </div>
    </Tooltip>
  );
};

export default EnemyIntentView;
