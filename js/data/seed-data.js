/**

 * このファイルはゲームを初めて遊ぶ時に、データベースに一番最初に保存する
 * 「初期データ」をまとめているファイルです。
 *
 * Seed Data — Initial Game Data
 *
 * Inserted into IndexedDB on first launch (when DB is empty).
 * Contains the initial character, equipment, and game state.
 */

// ─── Initial Game State ──────────────────────────────────
export const SEED_GAME_STATE = [
  { key: 'gold',     value: 100 },
  { key: 'location', value: 'はじまりの街' },
  { key: 'version',  value: '0.1.0' },
  { key: 'prism',    value: 0 },
];

import { SEED_CHARACTERS, SEED_EQUIPMENT } from './initial-characters.js';

export { SEED_EQUIPMENT, SEED_CHARACTERS };
