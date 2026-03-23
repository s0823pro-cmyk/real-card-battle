import type { Enemy, EnemyIntent } from '../types/game';
import { ENEMY_TEMPLATES } from '../data/enemies';
import {
  AREA1_BOSS,
  AREA1_ELITES,
  AREA2_BOSS,
  AREA2_ELITES,
  AREA2_NORMAL_ENEMIES,
  AREA3_BOSS,
  AREA3_ELITES,
  AREA3_NORMAL_ENEMIES,
} from '../data/runData';
import { getEnemyAttackValue } from './damage';

const CATALOG: Record<string, EnemyIntent[]> = {};

for (const [key, t] of Object.entries(ENEMY_TEMPLATES)) {
  CATALOG[key] = t.intents;
}

for (const entry of AREA1_ELITES) CATALOG[entry.templateId] = entry.intents;
CATALOG[AREA1_BOSS.templateId] = AREA1_BOSS.intents;
for (const entry of AREA2_NORMAL_ENEMIES) CATALOG[entry.templateId] = entry.intents;
for (const entry of AREA2_ELITES) CATALOG[entry.templateId] = entry.intents;
CATALOG[AREA2_BOSS.templateId] = AREA2_BOSS.intents;
for (const entry of AREA3_NORMAL_ENEMIES) CATALOG[entry.templateId] = entry.intents;
for (const entry of AREA3_ELITES) CATALOG[entry.templateId] = entry.intents;
CATALOG[AREA3_BOSS.templateId] = AREA3_BOSS.intents;

export function getEnemyIntentsForZukan(templateId: string): EnemyIntent[] {
  return CATALOG[templateId] ?? [];
}

const stubEnemy = (templateId: string): Enemy => ({
  id: 'zukan_stub',
  templateId,
  name: '',
  maxHp: 100,
  currentHp: 100,
  block: 0,
  icon: '',
  intentHistory: [],
  currentIntentIndex: 0,
  statusEffects: [],
});

/** 図鑑用：行動の補足説明（ステータスなしの基準値） */
export function formatZukanIntentDetail(intent: EnemyIntent, templateId: string): string {
  const enemy = stubEnemy(templateId);
  if (intent.type === 'attack') {
    const v = getEnemyAttackValue(intent, enemy);
    const mult = templateId === 'wildCat' ? v * 3 : v;
    return `合計ダメージ ${mult}`;
  }
  if (intent.type === 'mental_attack') {
    return `メンタル -${intent.mentalDamage ?? 0}`;
  }
  if (intent.type === 'defend') {
    return intent.value > 0 ? `ブロック +${intent.value}` : '行動なし';
  }
  if (intent.type === 'buff') {
    return `攻撃力+${intent.value}`;
  }
  if (intent.type === 'debuff') {
    const label =
      intent.debuffType === 'vulnerable' ? '脆弱' : intent.debuffType === 'weak' ? '弱体' : '火傷';
    return `${label}（${intent.value}ターン）`;
  }
  if (intent.type === 'steal_gold') {
    return `ゴールド -${intent.value}`;
  }
  if (intent.type === 'regen') {
    return `HP+${intent.value}`;
  }
  if (intent.type === 'random_debuff') {
    return `脆弱・弱体・火傷のいずれか（${intent.value}ターン）`;
  }
  if (intent.type === 'add_curse') {
    return '呪いカードを捨て札へ';
  }
  return '';
}
