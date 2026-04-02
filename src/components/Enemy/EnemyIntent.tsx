import type { Enemy, EnemyIntent, PlayerState } from '../../types/game';
import { ICONS } from '../../assets/icons';
import { stripEnemyIntentParenthetical } from '../../utils/enemyIntentDisplay';
import { getEnemyAttackValue, getIncomingPhysicalAttackDisplayNumber } from '../../utils/damage';
import Tooltip from '../Tooltip/Tooltip';

/** 攻撃力が weak / 攻撃デバフで補正されている（getEnemyAttackValue と同じ条件） */
const enemyPhysicalAttackHasDebuffModifier = (enemy: Enemy): boolean => {
  const attackDown = enemy.statusEffects
    .filter((s) => s.type === 'attack_down')
    .reduce((sum, s) => sum + s.value, 0);
  if (attackDown > 0) return true;
  return enemy.statusEffects.some((s) => s.type === 'weak');
};

interface Props {
  enemy: Enemy;
  intent: EnemyIntent;
  /** ドラッグ中のデバフ予測を反映した表示 */
  isPreview?: boolean;
  /** 物理攻撃がこのターン無効化される（数値0・無効表示色）。ドラッグ中の無効化カード予測も含む */
  attackDamageImmunity?: boolean;
  /** 無効化カードをドラッグ中のみ点滅（使用後の表示は点滅なし） */
  attackDamageImmunityPulse?: boolean;
  /** 渡したとき、攻撃数値にプレイヤーの脆弱（1.5倍）を反映 */
  player?: PlayerState | null;
}

const getIntentIconSrc = (intent: EnemyIntent): string => {
  switch (intent.type) {
    case 'attack':
      return ICONS.attack;
    case 'mental_attack':
      return ICONS.mentalAttack;
    case 'defend':
      return ICONS.defend;
    case 'buff':
      return ICONS.buff;
    case 'debuff':
      return ICONS.debuff;
    case 'steal_gold':
      return ICONS.steal;
    case 'regen':
      return ICONS.heal;
    case 'random_debuff':
      return ICONS.random;
    case 'add_curse':
      return ICONS.curse;
    default:
      return ICONS.idle;
  }
};

const getIntentValueText = (intent: EnemyIntent, enemy: Enemy): string => {
  if (intent.type === 'attack') {
    const attackValue = getEnemyAttackValue(intent, enemy);
    if (enemy.templateId === 'wildCat') {
      return `${attackValue * 3}`;
    }
    return `${attackValue}`;
  }
  if (intent.type === 'mental_attack') {
    return `-${intent.mentalDamage ?? 0}`;
  }
  if (intent.type === 'defend') {
    return intent.value > 0 ? `${intent.value}` : '';
  }
  if (intent.type === 'buff') {
    return `強化+${intent.value}`;
  }
  if (intent.type === 'debuff') {
    /* 1行目の enemy-action-label と同じ description を重ねない */
    const kind =
      intent.debuffType === 'vulnerable'
        ? '脆弱'
        : intent.debuffType === 'weak'
          ? '弱体'
          : intent.debuffType === 'poison'
            ? '毒'
            : '火傷';
    return `${kind}×${intent.value}`;
  }
  if (intent.type === 'steal_gold') {
    return `-${intent.value}G`;
  }
  if (intent.type === 'regen') {
    return `+${intent.value}HP`;
  }
  if (intent.type === 'random_debuff') {
    return 'ランダムデバフ';
  }
  if (intent.type === 'add_curse') {
    return '呪いカード追加';
  }
  return '休み';
};

/** 敵のデバフ付与行動：ホバー／タップで各デバフの説明（BattleScreen のプレイヤーデバフ表記と揃える） */
const getDebuffIntentTooltip = (intent: EnemyIntent): { label: string; description: string } => {
  const turns = intent.value;
  const kind = intent.debuffType ?? 'vulnerable';
  if (kind === 'vulnerable') {
    return {
      label: '脆弱',
      description: `受けるダメージ+50%。敵の攻撃表示は1.5倍で表示されます。残り${turns}ターン`,
    };
  }
  if (kind === 'weak') {
    return {
      label: '弱体',
      description: `与えるダメージが25％減少。残り${turns}ターン`,
    };
  }
  return {
    label: '炎上',
    description: `ターン終了時に${turns}ダメージ。残り${turns}ターン`,
  };
};

const getIntentLabelText = (intent: EnemyIntent): string => {
  let label: string;
  if (intent.type === 'attack') {
    label = intent.description
      .replace(/\s*×\d+/g, '')
      .replace(/\s*-?\d+(\.\d+)?$/g, '')
      .trim();
  } else if (intent.type === 'defend') {
    label = intent.description.replace(/\s*-?\d+(\.\d+)?$/g, '').trim();
  } else if (intent.type === 'buff') {
    label = intent.description.replace(/\s*\+?\d+(\.\d+)?$/g, '').trim();
  } else {
    label = intent.description;
  }
  return stripEnemyIntentParenthetical(label);
};

const EnemyIntentView = ({
  enemy,
  intent,
  isPreview = false,
  attackDamageImmunity = false,
  attackDamageImmunityPulse = false,
  player = null,
}: Props) => {
  const attackDebuffedVisual =
    intent.type === 'attack' && !attackDamageImmunity && enemyPhysicalAttackHasDebuffModifier(enemy);

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
      ? attackDamageImmunity
        ? 'enemy-action--damage-immune'
        : attackDebuffedVisual
          ? 'enemy-action--attack enemy-action--attack-debuffed'
          : 'enemy-action--attack'
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

  const attackDisplay =
    intent.type === 'attack' && !attackDamageImmunity && player
      ? getIncomingPhysicalAttackDisplayNumber(intent, enemy, player)
      : null;
  const valueText =
    attackDamageImmunity && intent.type === 'attack'
      ? '0'
      : intent.type === 'attack' && attackDisplay
        ? attackDisplay.text
        : getIntentValueText(intent, enemy);

  const useVulnerableAttackTooltip =
    intent.type === 'attack' &&
    !attackDamageImmunity &&
    Boolean(attackDisplay?.hasPlayerVulnerable);

  const debuffIntentTooltip = intent.type === 'debuff' ? getDebuffIntentTooltip(intent) : null;

  const showValuePulse = isPreview || attackDamageImmunityPulse;

  return (
    <Tooltip
      {...(useVulnerableAttackTooltip
        ? {
            label: '⚔️ 攻撃',
            description: `プレイヤーに${valueText}ダメージ（ブロックで軽減）。あなたの脆弱により受けるダメージが1.5倍になっています。`,
          }
        : debuffIntentTooltip
          ? debuffIntentTooltip
          : { tooltipKey })}
    >
      <div className="enemy-next-action">
        <span className="enemy-action-label">{getIntentLabelText(intent)}</span>
        <span
          className={`enemy-action-value ${valueClass}${showValuePulse ? ' enemy-action-value--preview' : ''}`}
        >
          <img
            src={getIntentIconSrc(intent)}
            alt=""
            className={`intent-icon${attackDebuffedVisual ? ' intent-icon--attack-debuffed' : ''}`}
          />
          {valueText}
        </span>
      </div>
    </Tooltip>
  );
};

export default EnemyIntentView;
