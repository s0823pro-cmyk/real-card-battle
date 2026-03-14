import type { Enemy, EnemyIntent, PlayerState, StatusEffect } from '../types/game';
import { applyEnemyAttack, getEnemyAttackValue } from '../utils/damage';

interface EnemyTurnResult {
  enemy: Enemy;
  player: PlayerState;
  damageToPlayer: number;
  mentalDamageToPlayer: number;
  log: string;
}

const upsertStatus = (statuses: StatusEffect[], next: StatusEffect): StatusEffect[] => {
  const found = statuses.find((status) => status.type === next.type);
  if (!found) return [...statuses, next];
  return statuses.map((status) =>
    status.type === next.type
      ? {
          ...status,
          value: status.value + next.value,
        }
      : status,
  );
};

export const useEnemyAI = () => {
  const getBossPhaseIntents = (enemy: Enemy): EnemyIntent[] => {
    if (enemy.currentHp > 130) {
      return enemy.intentHistory.slice(0, 2);
    }
    if (enemy.currentHp > 60) {
      return enemy.intentHistory.slice(2, 5);
    }
    return enemy.intentHistory.slice(5, 8);
  };

  const getAvailableIntents = (enemy: Enemy): EnemyIntent[] => {
    if (enemy.templateId === 'monster_customer' && enemy.intentHistory.length >= 8) {
      return getBossPhaseIntents(enemy);
    }
    return enemy.intentHistory;
  };

  const getEnemyIntent = (enemy: Enemy): EnemyIntent => {
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
    let updatedEnemy: Enemy = { ...enemy, statusEffects: [...enemy.statusEffects] };
    let updatedPlayer: PlayerState = { ...player, statusEffects: [...player.statusEffects] };

    if (intent.type === 'attack') {
      if (enemy.name === '野良猫') {
        for (let hit = 0; hit < 3; hit += 1) {
          damage += applyEnemyAttack(intent, updatedEnemy, updatedPlayer);
        }
      } else {
        damage = applyEnemyAttack(intent, updatedEnemy, updatedPlayer);
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
    }

    const nextAvailable = getAvailableIntents(updatedEnemy);
    const nextRandomIndex = nextAvailable.length > 0 ? Math.floor(Math.random() * 1000000) : 0;
    updatedEnemy = {
      ...updatedEnemy,
      currentIntentIndex: nextRandomIndex,
    };

    return {
      enemy: updatedEnemy,
      player: updatedPlayer,
      damageToPlayer: damage,
      mentalDamageToPlayer: mentalDamage,
      log:
        intent.type === 'attack'
          ? `${updatedEnemy.name}：攻撃 ${getEnemyAttackValue(intent, updatedEnemy)}`
          : `${updatedEnemy.name}：${intent.description}`,
    };
  };

  return { getEnemyIntent, executeEnemyTurn };
};
