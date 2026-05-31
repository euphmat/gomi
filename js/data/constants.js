/**

 * このファイルはゲーム全体で共通して使う「設定値（定数）」をまとめたファイルです。
 * 装備の場所や属性の名前などが定義されています。
 *
 * Game Constants & Type Definitions
 *
 * Shared constants used across the game UI.
 * Character data has been moved to IndexedDB (see database.js / seed-data.js).
 */

// ─── Equipment Slot Definitions ──────────────────────────
export const EQUIPMENT_SLOTS = [
  { key: 'rightHand',  label: '右手' },
  { key: 'leftHand',   label: '左手' },
  { key: 'armor',      label: '鎧' },
  { key: 'accessory1', label: 'アクセサリ1' },
  { key: 'accessory2', label: 'アクセサリ2' },
];

// ─── Stat Definitions ────────────────────────────────────
export const STAT_KEYS = [
  { key: 'hp',   label: 'HP',   fullLabel: '最大HP' },
  { key: 'mp',   label: 'MP',   fullLabel: '最大MP' },
  { key: 'atk',  label: 'ATK',  fullLabel: '物理攻撃' },
  { key: 'def',  label: 'DEF',  fullLabel: '物理防御' },
  { key: 'matk', label: 'MAT', fullLabel: '魔法攻撃' },
  { key: 'mdef', label: 'MDF', fullLabel: '魔法防御' },
  { key: 'spd',  label: 'SPD',  fullLabel: '速度' },
];

// ─── Element Resistance Definitions (9 types) ────────────
export const ELEMENT_TYPES = [
  { key: 'fire',    label: '炎', icon: 'local_fire_department' },
  { key: 'water',   label: '水', icon: 'water_drop' },
  { key: 'grass',   label: '草', icon: 'eco' },
  { key: 'ice',     label: '氷', icon: 'ac_unit' },
  { key: 'thunder', label: '雷', icon: 'bolt' },
  { key: 'wind',    label: '風', icon: 'air' },
  { key: 'earth',   label: '土', icon: 'landscape' },
  { key: 'light',   label: '光', icon: 'light_mode' },
  { key: 'dark',    label: '闇', icon: 'dark_mode' },
];

// ─── Ailment Resistance Definitions (8 types) ────────────
export const AILMENT_TYPES = [
  { key: 'poison',    label: '毒',   icon: 'skull' },
  { key: 'burn',      label: '火傷', icon: 'local_fire_department' },
  { key: 'paralysis', label: '麻痺', icon: 'bolt' },
  { key: 'sleep',     label: '睡眠', icon: 'bedtime' },
  { key: 'confusion', label: '混乱', icon: 'mood_bad' },
  { key: 'curse',     label: '呪い', icon: 'priority_high' },
  { key: 'blind',     label: '暗闇', icon: 'visibility_off' },
  { key: 'silence',   label: '沈黙', icon: 'volume_off' },
];
