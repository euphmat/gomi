/**

 * このファイルはゲーム開始時のアイテム（持ち物）のデータを定義しているファイルです。
 */
// ─── Initial Inventory (Drops, etc.) ───────────────────────
import { MATERIALS } from '../definitions/materials.js';

export const SEED_INVENTORY = MATERIALS.map(mat => {
  let initialQuantity = 0;
  if (mat.id === 'slime_jelly') initialQuantity = 100;
  if (mat.id === 'wooden_stock') initialQuantity = 10;
  return {
    ...mat,
    quantity: initialQuantity
  };
}).filter(item => item.quantity > 0);
