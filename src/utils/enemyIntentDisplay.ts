/**
 * 敵の行動名の表示用：括弧とその中身を除去（マスタの description は変更しない）
 * 半角 () と全角 （） の両方を対象にする。
 */
export function stripEnemyIntentParenthetical(text: string): string {
  return text.replace(/\(.*?\)/g, '').replace(/（[^（）]*）/g, '').trim();
}
