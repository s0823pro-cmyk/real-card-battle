import type { Enemy, EnemyIntent, EnemyIntentType, PlayerState, StatusEffect } from '../types/game';
import { stripEnemyIntentParenthetical } from '../utils/enemyIntentDisplay';
import { applyEnemyAttack } from '../utils/damage';

export interface EnemyTurnResult {
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
}

/** 敵がプレイヤーに付与するデバフの最低ターン数（duration / value のベース） */
const MIN_PLAYER_DEBUFF_TURNS_FROM_ENEMY = 2;

const upsertStatus = (statuses: StatusEffect[], next: StatusEffect): StatusEffect[] => {
  const found = statuses.find((status) => status.type === next.type);
  if (!found) return [...statuses, next];
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

export const useEnemyAI = () => {
  const getAvailableIntents = (enemy: Enemy): EnemyIntent[] => {
    // エリア1ボス：monster_customer — 技5種。序盤は穏やか、終盤は全パターン
    if (enemy.templateId === 'monster_customer' && enemy.intentHistory.length >= 5) {
      if (enemy.currentHp > 130) return enemy.intentHistory.slice(0, 2);
      if (enemy.currentHp > 60) return enemy.intentHistory.slice(2, 5);
      return enemy.intentHistory.slice(0, 5);
    }
    // エリア2ボス：evil_ceo — 技5種
    if (enemy.templateId === 'evil_ceo' && enemy.intentHistory.length >= 5) {
      if (enemy.currentHp > 140) return enemy.intentHistory.slice(0, 3);
      return enemy.intentHistory.slice(2, 5);
    }
    // エリア3ボス：world_tree_warden — 技5種
    if (enemy.templateId === 'world_tree_warden' && enemy.intentHistory.length >= 5) {
      if (enemy.currentHp > 220) return enemy.intentHistory.slice(0, 3);
      if (enemy.currentHp > 100) return enemy.intentHistory.slice(2, 5);
      return enemy.intentHistory.slice(0, 5);
    }
    return enemy.intentHistory;
  };

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
      const debuffTypes: Array<'vulnerable' | 'weak' | 'burn'> = ['vulnerable', 'weak', 'burn'];
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

    // 行動後に状態異常を更新。火傷は行動後ダメージを与えて消去。
    const nextStatuses: StatusEffect[] = [];
    for (const status of updatedEnemy.statusEffects) {
      if (status.type === 'burn') {
        updatedEnemy.currentHp = Math.max(0, updatedEnemy.currentHp - status.value);
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
    updatedEnemy = {
      ...updatedEnemy,
      statusEffects: nextStatuses,
    };

    const nextAvailable = getAvailableIntents(updatedEnemy);
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

    return {
      enemy: updatedEnemy,
      player: updatedPlayer,
      damageToPlayer: damage,
      attackFullyBlocked,
      mentalDamageToPlayer: mentalDamage,
      goldStolen,
      addCurse,
      intentType: intent.type,
      log:
        intent.type === 'attack'
          ? `${enemy.name}：攻撃 ${damage}`
          : `${enemy.name}：${stripEnemyIntentParenthetical(intent.description)}`,
    };
  };

  return { getEnemyIntent, executeEnemyTurn };
};
