import type { Enemy, EnemyIntent, EnemyIntentType } from '../types/game';
import type { EnemyTemplateLike } from '../types/run';
import claimerImage from '../assets/enemies/claimer.png';
import drunkImage from '../assets/enemies/drunk.png';
import strayCatImage from '../assets/enemies/stray_cat.png';
import abandonedBikeImage from '../assets/enemies/abandoned_bike.png';
import solicitorImage from '../assets/enemies/solicitor.png';

interface EnemyTemplate {
  name: string;
  icon: string;
  imageUrl?: string;
  maxHp: number;
  intents: EnemyIntent[];
}

type TemplateKey = 'claimer' | 'drunk' | 'wildCat' | 'bicycle' | 'solicitor';
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
    imageUrl: claimerImage,
    maxHp: 30,
    intents: [
      intent('attack', 8, '大声で詰め寄る', '⚔️'),
      { type: 'mental_attack', value: 0, mentalDamage: 1, description: '文句のオンパレード', icon: '😤' },
      { type: 'debuff', value: 2, debuffType: 'weak', description: '上げ足取り', icon: '👆' },
    ],
  },
  drunk: {
    name: '酔っぱらい',
    icon: '🍺',
    imageUrl: drunkImage,
    maxHp: 35,
    intents: [
      intent('attack', 11, '空き缶を投げつける', '⚔️'),
      intent('defend', 0, '千鳥足で空振り', '💫'),
      { type: 'regen', value: 2, description: '路肩で一服（HP+2）', icon: '🍺' },
    ],
  },
  wildCat: {
    name: '野良猫',
    icon: '🐱',
    imageUrl: strayCatImage,
    maxHp: 20,
    intents: [
      intent('defend', 0, 'ひなたぼっこ（何もしない）', '☀️'),
      { type: 'regen', value: 2, description: '毛づくろい（HP+2）', icon: '🐱' },
      intent('attack', 3, '肉球パンチ ×3', '🐾'),
    ],
  },
  bicycle: {
    name: '放置自転車',
    icon: '🚲',
    imageUrl: abandonedBikeImage,
    maxHp: 24,
    intents: [
      intent('attack', 6, '転倒アタック', '💥'),
      intent('defend', 5, 'スタンドを盾にする', '🛡️'),
      intent('attack', 5, 'ペダルで薙ぎ払い', '🚲'),
    ],
  },
  solicitor: {
    name: '勧誘員',
    icon: '🧑‍💼',
    imageUrl: solicitorImage,
    maxHp: 28,
    intents: [
      intent('attack', 7, 'チラシの束で殴る', '📄'),
      { type: 'debuff', value: 2, debuffType: 'weak', description: 'しつこい追いかけ話', icon: '🗣️' },
      intent('attack', 6, '契約書を突きつける', '⚔️'),
    ],
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
    block: 0,
    icon: template.icon,
    imageUrl: template.imageUrl,
    intentHistory: template.intents,
    currentIntentIndex: templateId === 'lost_soul' ? 0 : Math.floor(Math.random() * 1000000),
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
