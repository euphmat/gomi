/**

 * このファイルはゲーム開始時のアイテム（持ち物）のデータを定義しているファイルです。
 */
// ─── Initial Inventory (Drops, etc.) ───────────────────────
import { MATERIALS } from '../definitions/materials.js';

export const SEED_INVENTORY = MATERIALS.map(mat => ({
  ...mat,
  quantity: mat.id === 'mat_001' ? 5 : 0 // 初期状態でスライムのゼリーを5個持たせる
})).filter(item => item.quantity > 0);
