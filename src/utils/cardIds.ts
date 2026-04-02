/**
 * スターター複製（`id_1`）、報酬複製（`id_reward_N`）など、同一カード定義の派生 id かどうか。
 */
export function isCardIdVariantOf(cardId: string, baseId: string): boolean {
  return cardId === baseId || cardId.startsWith(`${baseId}_`);
}
