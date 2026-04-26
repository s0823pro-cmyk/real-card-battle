import type { Card } from '../types/game';
import type { Enemy } from '../types/game';

export const cardNameKey = (id: string): string => `card.${id}.name`;
export const cardDescKey = (id: string): string => `card.${id}.description`;

export const enemyNameKey = (templateId: string): string => `enemy.${templateId}.name`;

export const achievementNameKey = (id: string): string => `achievement.${id}.name`;
export const achievementDescKey = (id: string): string => `achievement.${id}.description`;

export const omamoriNameKey = (id: string): string => `omamori.${id}.name`;
export const omamoriDescKey = (id: string): string => `omamori.${id}.description`;

export const storySceneTextKey = (bundleId: string, sceneId: string): string =>
  `story.${bundleId}.${sceneId}.text`;

export const eventNameKey = (eventId: string): string => `event.${eventId}.name`;
export const eventDescKey = (eventId: string): string => `event.${eventId}.description`;
export const eventChoiceTextKey = (eventId: string, choiceIndex: number): string =>
  `event.${eventId}.choice.${choiceIndex}.text`;

export function translatedCardName(
  card: Pick<Card, 'id' | 'name'>,
  t: (key: string, vars?: Record<string, string | number>, fallback?: string) => string,
): string {
  return t(cardNameKey(card.id), undefined, card.name);
}

export function translatedCardDescription(
  card: Pick<Card, 'id' | 'description'>,
  t: (key: string, vars?: Record<string, string | number>, fallback?: string) => string,
): string {
  return t(cardDescKey(card.id), undefined, card.description);
}

export function translatedEnemyName(
  enemy: Pick<Enemy, 'templateId' | 'name'>,
  t: (key: string, vars?: Record<string, string | number>, fallback?: string) => string,
): string {
  return t(enemyNameKey(enemy.templateId), undefined, enemy.name);
}
