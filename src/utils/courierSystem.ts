import type { Card, PlayerState } from '../types/game';

export const COURIER_MAX_STAMINA = 10;
export const COURIER_COST_STEP = 0.5;
export const COURIER_DOWN_TURNS = 4;
export const COURIER_DOWN_FIXED_COST = 3.5;
export const COURIER_RECOVERY_STAMINA = 6;
export const COURIER_MAX_STAMINA_RECOVER_CARDS_PER_TURN = 2;

export const isCourierJob = (player?: Pick<PlayerState, 'jobId'> | null): boolean =>
  player?.jobId === 'courier';

export const clampCourierStamina = (value: number): number =>
  Math.max(0, Math.min(COURIER_MAX_STAMINA, Math.floor(value)));

export const getCourierStamina = (player: PlayerState): number =>
  clampCourierStamina(player.deliveryStamina ?? COURIER_MAX_STAMINA);

export const getCourierDownTurns = (player: PlayerState): number =>
  Math.max(0, Math.floor(player.deliveryDownTurns ?? 0));

export const isCourierDown = (player?: PlayerState | null): boolean =>
  Boolean(player && isCourierJob(player) && getCourierDownTurns(player) > 0);

export const isCourierDownOnlyCard = (card: Card): boolean =>
  Boolean(card.badges?.includes('immovable') || card.usableOnlyWhileExhausted);

export const isCourierDownUsableCard = (card: Card): boolean =>
  Boolean(card.badges?.includes('unyielding') || card.usableWhileExhausted);

export const canUseCardDuringCourierDown = (card: Card): boolean =>
  Boolean(card.block && card.block > 0) || isCourierDownUsableCard(card) || isCourierDownOnlyCard(card);

export const isCourierStaminaRecoverCard = (card: Card): boolean =>
  Boolean(card.effects?.some((effect) => effect.type === 'stamina_recover' && effect.value > 0));

export const canUseCourierStaminaRecoverCardThisTurn = (player: PlayerState, card: Card): boolean => {
  if (!isCourierJob(player) || !isCourierStaminaRecoverCard(card)) return true;
  return (player.staminaRecoverCardsUsedThisTurn ?? 0) < COURIER_MAX_STAMINA_RECOVER_CARDS_PER_TURN;
};

export const getCourierCostPenalty = (player: PlayerState): number => {
  if (!isCourierJob(player) || isCourierDown(player)) return 0;
  return (COURIER_MAX_STAMINA - getCourierStamina(player)) * COURIER_COST_STEP;
};

export const recoverCourierStamina = (player: PlayerState, amount: number): PlayerState => {
  if (!isCourierJob(player) || amount <= 0) return player;
  const nextStamina = clampCourierStamina(getCourierStamina(player) + amount);
  return {
    ...player,
    deliveryStamina: nextStamina,
    deliveryDownTurns: nextStamina > 0 ? 0 : getCourierDownTurns(player),
  };
};

export const consumeCourierStamina = (player: PlayerState, amount: number): PlayerState => {
  if (!isCourierJob(player) || amount <= 0 || isCourierDown(player)) return player;
  const nextStamina = clampCourierStamina(getCourierStamina(player) - amount);
  return {
    ...player,
    deliveryStamina: nextStamina,
    deliveryDownTurns: nextStamina <= 0 ? COURIER_DOWN_TURNS : getCourierDownTurns(player),
  };
};

export const noteCourierStaminaRecoverCardPlayed = (player: PlayerState, card: Card): PlayerState => {
  if (!isCourierJob(player) || !isCourierStaminaRecoverCard(card)) return player;
  return {
    ...player,
    staminaRecoverCardsUsedThisTurn: (player.staminaRecoverCardsUsedThisTurn ?? 0) + 1,
  };
};

export const advanceCourierTurnStart = (player: PlayerState): PlayerState => {
  if (!isCourierJob(player)) return player;

  const downTurns = getCourierDownTurns(player);
  if (downTurns > 0) {
    const nextDownTurns = downTurns - 1;
    if (nextDownTurns <= 0) {
      return {
        ...player,
        deliveryStamina: COURIER_RECOVERY_STAMINA,
        deliveryDownTurns: 0,
        staminaRecoverCardsUsedThisTurn: 0,
      };
    }
    return {
      ...player,
      deliveryStamina: 0,
      deliveryDownTurns: nextDownTurns,
      staminaRecoverCardsUsedThisTurn: 0,
    };
  }

  const nextStamina = getCourierStamina(player) - 1;
  if (nextStamina <= 0) {
    return {
      ...player,
      deliveryStamina: 0,
      deliveryDownTurns: COURIER_DOWN_TURNS,
      staminaRecoverCardsUsedThisTurn: 0,
    };
  }

  return {
    ...player,
    deliveryStamina: nextStamina,
    deliveryDownTurns: 0,
    staminaRecoverCardsUsedThisTurn: 0,
  };
};
