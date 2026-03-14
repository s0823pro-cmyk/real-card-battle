import type { Enemy, EnemyIntent, EnemyIntentType } from '../types/game';
import type { EnemyTemplateLike } from '../types/run';

interface EnemyTemplate {
  name: string;
  icon: string;
  imageUrl?: string;
  maxHp: number;
  intents: EnemyIntent[];
}

type TemplateKey = 'claimer' | 'drunk' | 'wildCat';
export type BuiltInEnemyTemplateKey = TemplateKey;

const intent = (
  type: EnemyIntentType,
  value: number,
  description: string,
  icon: string,
): EnemyIntent => ({ type, value, description, icon });

export const ENEMY_TEMPLATES: Record<TemplateKey, EnemyTemplate> = {
  claimer: {
    name: 'クレーマー',
    icon: '😤',
    maxHp: 30,
    intents: [
      intent('attack', 12, '攻撃 12', '⚔️'),
      { type: 'mental_attack', value: 0, mentalDamage: 1, description: '文句を言う', icon: '😤' },
    ],
  },
  drunk: {
    name: '酔っぱらい',
    icon: '🍺',
    maxHp: 35,
    intents: [intent('attack', 16, '攻撃 16', '⚔️'), intent('defend', 0, '千鳥足...', '💫')],
  },
  wildCat: {
    name: '野良猫',
    icon: '🐱',
    maxHp: 20,
    intents: [intent('attack', 5, '引っかく ×3', '🐱'), intent('attack', 5, '引っかく ×3', '🐱')],
  },
};

export const BATTLE_ENCOUNTERS: TemplateKey[][] = [
  ['claimer'],
  ['drunk'],
  ['wildCat', 'wildCat'],
  ['claimer', 'drunk'],
];

let enemySerial = 0;

const createEnemy = (
  templateId: string,
  template: {
    name: string;
    icon: string;
    imageUrl?: string;
    maxHp: number;
    intents: EnemyIntent[];
  },
): Enemy => {
  enemySerial += 1;
  return {
    id: `enemy_${templateId}_${enemySerial}`,
    templateId,
    name: template.name,
    maxHp: template.maxHp,
    currentHp: template.maxHp,
    icon: template.icon,
    imageUrl: template.imageUrl,
    intentHistory: template.intents,
    currentIntentIndex: Math.floor(Math.random() * 1000000),
    statusEffects: [],
  };
};

export const createEncounterFromTemplateIds = (keys: string[]): Enemy[] =>
  keys.map((key) => {
    const builtIn = ENEMY_TEMPLATES[key as TemplateKey];
    if (builtIn) return createEnemy(key, builtIn);
    return createEnemy(
      key,
      ENEMY_TEMPLATES.claimer,
    );
  });

export const createEncounterFromTemplates = (templates: EnemyTemplateLike[]): Enemy[] =>
  templates.map((template) => createEnemy(template.templateId, template));

export const createRandomEncounter = (): Enemy[] => {
  const pick = BATTLE_ENCOUNTERS[Math.floor(Math.random() * BATTLE_ENCOUNTERS.length)];
  return createEncounterFromTemplateIds(pick);
};
