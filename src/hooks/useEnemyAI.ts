import type { Enemy, EnemyIntent, EnemyIntentType, PlayerState, StatusEffect } from '../types/game';
import { stripEnemyIntentParenthetical } from '../utils/enemyIntentDisplay';
import { applyEnemyAttack } from '../utils/damage';

/** 敵の火傷・毒 DoT を1スタック分ずつ直列再生するためのキュー要素 */
export type EnemyDotStep = { kind: 'burn' | 'poison'; damage: number };

export interface EnemyTurnResult {
  /** インテント直後・DoT適用前の敵（直列DoT演出用） */
  enemyBeforeDot: Enemy;
  enemy: Enemy;
  player: PlayerState;
  damageToPlayer: number;
  /** 物理攻撃がブロックのみで HP0（反射音用） */
  attackFullyBlocked: boolean;
  mentalDamageToPlayer: number;
  goldStolen: number;
  addCurse: boolean;
  log: string;
  /** 今ターンに実行したインテント（SE 等に使用） */
  intentType: EnemyIntentType;
  /** この敵の行動後に適用した火傷 DoT の合計 */
  enemyDotBurnDamage: number;
  /** この敵の行動後に適用した毒 DoT の合計 */
  enemyDotPoisonDamage: number;
}

/** 敵がプレイヤーに付与するデバフの最低ターン数（duration / value のベース） */
const MIN_PLAYER_DEBUFF_TURNS_FROM_ENEMY = 2;

const upsertStatus = (statuses: StatusEffect[], next: StatusEffect): StatusEffect[] => {
  const found = statuses.find((status) => status.type === next.type);
  if (!found) return [...statuses, next];
  if (next.type === 'burn' || next.type === 'poison') {
    const duration = found.duration + next.duration;
    return statuses.map((status) =>
      status.type === next.type ? { ...status, duration, value: duration } : status,
    );
  }
  return statuses.map((status) =>
    status.type === next.type
      ? {
          ...status,
          value: status.value + next.value,
          duration: status.duration + next.duration,
        }
      : status,
  );
};

const getAvailableIntentsForEnemy = (enemy: Enemy): EnemyIntent[] => {
  if (enemy.templateId === 'monster_customer' && enemy.intentHistory.length >= 5) {
    if (enemy.currentHp > 130) return enemy.intentHistory.slice(0, 2);
    if (enemy.currentHp > 60) return enemy.intentHistory.slice(2, 5);
    return enemy.intentHistory.slice(0, 5);
  }
  if (enemy.templateId === 'evil_ceo' && enemy.intentHistory.length >= 5) {
    if (enemy.currentHp > 140) return enemy.intentHistory.slice(0, 3);
    return enemy.intentHistory.slice(2, 5);
  }
  if (enemy.templateId === 'world_tree_warden' && enemy.intentHistory.length >= 5) {
    if (enemy.currentHp > 220) return enemy.intentHistory.slice(0, 3);
    if (enemy.currentHp > 100) return enemy.intentHistory.slice(2, 5);
    return enemy.intentHistory.slice(0, 5);
  }
  return enemy.intentHistory;
};

/** 表示順・ダメージ量の事前計算（バッチ結果と一致） */
export const buildEnemyDotStepQueue = (enemy: Enemy, extraDot = 0): EnemyDotStep[] => {
  const steps: EnemyDotStep[] = [];
  let hp = enemy.currentHp;
  const burns = enemy.statusEffects.filter((s) => s.type === 'burn' && s.duration > 0);
  const poisons = enemy.statusEffects.filter((s) => s.type === 'poison' && s.duration > 0);
  for (const s of burns) {
    const d = s.duration + extraDot;
    steps.push({ kind: 'burn', damage: d });
    hp = Math.max(0, hp - d);
  }
  if (hp > 0) {
    for (const _ of poisons) {
      const dmg = Math.ceil(hp * 0.05) + extraDot;
      steps.push({ kind: 'poison', damage: dmg });
      hp = Math.max(0, hp - dmg);
    }
  }
  return steps;
};

export const applyOneEnemyDotTick = (
  enemy: Enemy,
  extraDot = 0,
): { nextEnemy: Enemy; step: EnemyDotStep } | null => {
  const rest = enemy.statusEffects.filter((s) => s.type !== 'burn' && s.type !== 'poison');
  const burns = enemy.statusEffects.filter((s) => s.type === 'burn' && s.duration > 0);
  if (burns.length > 0) {
    const s = burns[0];
    const dmg = s.duration + extraDot;
    const hp = Math.max(0, enemy.currentHp - dmg);
    const nd = s.duration - 1;
    const newFirst = nd > 0 ? [{ ...s, duration: nd, value: nd }] : [];
    const otherBurns = burns.slice(1);
    const poisons = enemy.statusEffects.filter((x) => x.type === 'poison' && x.duration > 0);
    return {
      nextEnemy: {
        ...enemy,
        currentHp: hp,
        statusEffects: [...rest, ...newFirst, ...otherBurns, ...poisons],
      },
      step: { kind: 'burn', damage: dmg },
    };
  }
  const poisons = enemy.statusEffects.filter((s) => s.type === 'poison' && s.duration > 0);
  if (enemy.currentHp > 0 && poisons.length > 0) {
    const s = poisons[0];
    const dmg = Math.ceil(enemy.currentHp * 0.05) + extraDot;
    const hp = Math.max(0, enemy.currentHp - dmg);
    const nd = s.duration - 1;
    const newFirst = nd > 0 ? [{ ...s, duration: nd, value: nd }] : [];
    const otherPoisons = poisons.slice(1);
    const burnRemain = enemy.statusEffects.filter((x) => x.type === 'burn' && x.duration > 0);
    return {
      nextEnemy: {
        ...enemy,
        currentHp: hp,
        statusEffects: [...rest, ...burnRemain, ...newFirst, ...otherPoisons],
      },
      step: { kind: 'poison', damage: dmg },
    };
  }
  return null;
};

export const applyEnemyBurnPoisonBatch = (
  enemy: Enemy,
  extraDot = 0,
): { enemy: Enemy; burnTotal: number; poisonTotal: number } => {
  let e = enemy;
  let burnTotal = 0;
  let poisonTotal = 0;
  while (true) {
    const r = applyOneEnemyDotTick(e, extraDot);
    if (!r) break;
    if (r.step.kind === 'burn') burnTotal += r.step.damage;
    else poisonTotal += r.step.damage;
    e = r.nextEnemy;
  }
  return { enemy: e, burnTotal, poisonTotal };
};

/** 火傷・毒のターン処理後：脆弱等の経過とインデント更新 */
export const finalizeEnemyAfterDotTicks = (enemy: Enemy): Enemy => {
  const nextStatuses: StatusEffect[] = [];
  for (const status of enemy.statusEffects) {
    if (status.type === 'burn' || status.type === 'poison') {
      nextStatuses.push(status);
      continue;
    }
    if (status.type === 'vulnerable' || status.type === 'weak') {
      const nextDuration = Math.max(0, status.duration - 1);
      const nextValue = Math.max(0, status.value - 1);
      if (nextDuration > 0 && nextValue > 0) {
        nextStatuses.push({ ...status, duration: nextDuration, value: nextValue });
      }
      continue;
    }
    if (status.type === 'attack_down') {
      const nextDuration = Math.max(0, status.duration - 1);
      if (nextDuration > 0 && status.value > 0) {
        nextStatuses.push({ ...status, duration: nextDuration });
      }
      continue;
    }
    nextStatuses.push(status);
  }
  let updatedEnemy: Enemy = {
    ...enemy,
    statusEffects: nextStatuses,
  };
  const nextAvailable = getAvailableIntentsForEnemy(updatedEnemy);
  const nextRandomIndex =
    updatedEnemy.templateId === 'lost_soul'
      ? (updatedEnemy.currentIntentIndex + 1) % 3
      : nextAvailable.length > 0
        ? Math.floor(Math.random() * 1000000)
        : 0;
  updatedEnemy = {
    ...updatedEnemy,
    currentIntentIndex: nextRandomIndex,
  };
  return updatedEnemy;
};

export const useEnemyAI = () => {
  const getAvailableIntents = getAvailableIntentsForEnemy;

  const getEnemyIntent = (enemy: Enemy): EnemyIntent => {
    if (enemy.templateId === 'lost_soul' && enemy.intentHistory.length >= 3) {
      return enemy.intentHistory[enemy.currentIntentIndex % 3];
    }
    const available = getAvailableIntents(enemy);
    if (available.length === 0) return enemy.intentHistory[0];
    return available[enemy.currentIntentIndex % available.length];
  };

  const executeEnemyTurn = (
    enemy: Enemy,
    player: PlayerState,
  ): EnemyTurnResult => {
    const intent = getEnemyIntent(enemy);
    let damage = 0;
    let mentalDamage = 0;
    let goldStolen = 0;
    let addCurse = false;
    // ターン開始時に前ターンのブロックをリセット
    let updatedEnemy: Enemy = { ...enemy, block: 0, statusEffects: [...enemy.statusEffects] };
    const updatedPlayer: PlayerState = { ...player, statusEffects: [...player.statusEffects] };

    let attackFullyBlocked = false;
    if (intent.type === 'attack') {
      if (enemy.name === '野良猫') {
        for (let hit = 0; hit < 3; hit += 1) {
          const out = applyEnemyAttack(intent, updatedEnemy, updatedPlayer);
          damage += out.hpDamage;
          attackFullyBlocked = attackFullyBlocked || out.fullyBlocked;
        }
      } else {
        const out = applyEnemyAttack(intent, updatedEnemy, updatedPlayer);
        damage = out.hpDamage;
        attackFullyBlocked = out.fullyBlocked;
      }
    } else if (intent.type === 'buff') {
      updatedEnemy = {
        ...updatedEnemy,
        statusEffects: upsertStatus(updatedEnemy.statusEffects, {
          type: 'strength_up',
          duration: 99,
          value: intent.value,
        }),
      };
    } else if (intent.type === 'mental_attack') {
      mentalDamage = intent.mentalDamage ?? 0;
      updatedPlayer.mental = Math.max(0, updatedPlayer.mental - mentalDamage);
    } else if (intent.type === 'steal_gold') {
      goldStolen = Math.min(updatedPlayer.gold, intent.value);
      updatedPlayer.gold = Math.max(0, updatedPlayer.gold - intent.value);
    } else if (intent.type === 'regen') {
      updatedEnemy = {
        ...updatedEnemy,
        currentHp: Math.min(updatedEnemy.maxHp, updatedEnemy.currentHp + intent.value),
      };
    } else if (intent.type === 'random_debuff') {
      const debuffTypes: Array<'vulnerable' | 'weak' | 'burn' | 'poison'> = [
        'vulnerable',
        'weak',
        'burn',
        'poison',
      ];
      const picked = debuffTypes[Math.floor(Math.random() * debuffTypes.length)];
      updatedPlayer.statusEffects = upsertStatus(updatedPlayer.statusEffects, {
        type: picked,
        duration: intent.value,
        value: intent.value,
      });
    } else if (intent.type === 'add_curse') {
      addCurse = true;
    } else if (intent.type === 'defend') {
      updatedEnemy = {
        ...updatedEnemy,
        block: updatedEnemy.block + intent.value,
      };
    } else if (intent.type === 'debuff') {
      const statusType = intent.debuffType ?? 'vulnerable';
      const turns = Math.max(MIN_PLAYER_DEBUFF_TURNS_FROM_ENEMY, intent.value);
      updatedPlayer.statusEffects = upsertStatus(updatedPlayer.statusEffects, {
        type: statusType,
        duration: turns,
        value: turns,
      });
    }

    const enemyBeforeDot: Enemy = {
      ...updatedEnemy,
      statusEffects: [...updatedEnemy.statusEffects],
    };
    const batch = applyEnemyBurnPoisonBatch(enemyBeforeDot);
    const enemyDotBurnDamage = batch.burnTotal;
    const enemyDotPoisonDamage = batch.poisonTotal;
    updatedEnemy = finalizeEnemyAfterDotTicks(batch.enemy);

    return {
      enemyBeforeDot,
      enemy: updatedEnemy,
      player: updatedPlayer,
      damageToPlayer: damage,
      attackFullyBlocked,
      mentalDamageToPlayer: mentalDamage,
      goldStolen,
      addCurse,
      intentType: intent.type,
      enemyDotBurnDamage,
      enemyDotPoisonDamage,
      log:
        intent.type === 'attack'
          ? `${enemy.name}：攻撃 ${damage}`
          : `${enemy.name}：${stripEnemyIntentParenthetical(intent.description)}`,
    };
  };

  return { getEnemyIntent, executeEnemyTurn };
};
