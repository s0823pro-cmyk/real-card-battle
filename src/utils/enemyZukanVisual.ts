import { ENEMY_ZUKAN_DATA } from '../data/enemyZukanData';

const enemyVisualById = new Map(
  ENEMY_ZUKAN_DATA.map((e) => [e.id, { imageUrl: e.imageUrl, icon: e.icon }]),
);

/** 図鑑データに載っている敵テンプレID向け。統計表示用の画像・絵文字フォールバック。 */
export function getEnemyZukanVisualForTemplateId(
  templateId: string,
): { imageUrl: string; icon: string } | null {
  return enemyVisualById.get(templateId) ?? null;
}
