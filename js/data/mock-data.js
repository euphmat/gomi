/**
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
  { key: 'atk',  label: 'ATK',  fullLabel: '物理攻撃' },
  { key: 'def',  label: 'DEF',  fullLabel: '物理防御' },
  { key: 'matk', label: 'MATK', fullLabel: '魔法攻撃' },
  { key: 'mdef', label: 'MDEF', fullLabel: '魔法防御' },
  { key: 'spd',  label: 'SPD',  fullLabel: '速度' },
];

// ─── Element Resistance Definitions (9 types) ────────────
export const ELEMENT_TYPES = [
  { key: 'fire',    label: '炎', icon: '🔥' },
  { key: 'water',   label: '水', icon: '💧' },
  { key: 'grass',   label: '草', icon: '🌿' },
  { key: 'ice',     label: '氷', icon: '❄️' },
  { key: 'thunder', label: '雷', icon: '⚡' },
  { key: 'wind',    label: '風', icon: '🌪️' },
  { key: 'earth',   label: '土', icon: '🪨' },
  { key: 'light',   label: '光', icon: '✨' },
  { key: 'dark',    label: '闇', icon: '🌑' },
];

// ─── Ailment Resistance Definitions (8 types) ────────────
export const AILMENT_TYPES = [
  { key: 'poison',    label: '毒',   icon: '☠️' },
  { key: 'burn',      label: '火傷', icon: '🔥' },
  { key: 'paralysis', label: '麻痺', icon: '⚡' },
  { key: 'sleep',     label: '睡眠', icon: '💤' },
  { key: 'confusion', label: '混乱', icon: '💫' },
  { key: 'curse',     label: '呪い', icon: '💀' },
  { key: 'blind',     label: '暗闇', icon: '🌑' },
  { key: 'silence',   label: '沈黙', icon: '🔇' },
];
