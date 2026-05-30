/**
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
];

// ─── Initial Equipment ───────────────────────────────────
export const SEED_EQUIPMENT = [
  {
    id: 'eq_001',
    name: '銅の剣',
    icon: '⚔️',
    slot: 'rightHand',
    stats: { atk: 5, def: 0, matk: 0, mdef: 0, spd: 0 },
  },
  {
    id: 'eq_002',
    name: '布の服',
    icon: '👕',
    slot: 'armor',
    stats: { atk: 0, def: 3, matk: 0, mdef: 1, spd: 0 },
  },
];

// ─── Initial Character ───────────────────────────────────
export const SEED_CHARACTERS = [
  {
    id: 1,
    name: 'アレックス',
    jobName: 'ヒーロー',
    level: 1,
    jobLevel: 1,
    hp:  { current: 100, max: 100 },
    mp:  { current: 20,  max: 20 },
    exp: { current: 0,   max: 100 },
    jp:  { current: 0,   max: 50 },

    // Base stats (before equipment & modifiers)
    baseStats: { atk: 12, def: 10, matk: 5, mdef: 6, spd: 8 },

    // Equipment slots — reference equipment IDs (null = empty)
    equipment: {
      rightHand:  'eq_001',
      leftHand:   null,
      armor:      'eq_002',
      accessory1: null,
      accessory2: null,
    },

    // Modifiers — extensible buff system (passive skills, etc.)
    // Each entry: { source: string, label: string, stats: { atk?, def?, matk?, mdef?, spd? } }
    modifiers: [],

    // Elemental resistances (%)  — 0 = neutral, + = resist, - = weakness
    elementResist: {
      fire: 0, water: 0, grass: 0, ice: 0,
      thunder: 0, wind: 0, earth: 0, light: 0, dark: 0,
    },

    // Ailment resistances (%)  — 0 = no resist, 100 = immune
    ailmentResist: {
      poison: 0, burn: 0, paralysis: 0, sleep: 0,
      confusion: 0, curse: 0, blind: 0, silence: 0,
    },

    // Display
    iconGradient: ['#ef4444', '#f97316'],
    iconEmoji: '⚔️',
  },
];
