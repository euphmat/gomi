/**

 * このファイルはゲーム開始時のキャラクターのステータスや、
 * 初期状態の装備データなどを定義しているファイルです。
 */
// ─── Initial Characters ────────────────────────────────────

import { WEAPONS } from '../definitions/weapons.js';
import { ARMORS } from '../definitions/armors.js';
import { SHIELDS } from '../definitions/shields.js';
import { ACCESSORIES } from '../definitions/accessories.js';

const BASE_TEMPLATE = {
  jobName: 'ノービス',
  jobId: 'norvice',
  level: 1,
  jobLevel: 1,
  sp: 0,
  hp:  { current: 10, max: 10 },
  mp:  { current: 10,  max: 10 },
  exp: { current: 0,   max: 10 },
  jp:  { current: 0,   max: 20 },
  modifiers: [],
  elementResist: { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0, },
  ailmentResist: { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0, },
  iconImage: './assets/job/job_norvice.webp',
  jobSkills: { norvice: { first_aid: 1 } },
};

export const SEED_CHARACTERS = [
  { ...BASE_TEMPLATE, id: 1,
    name: 'アレックス',
    baseStats: { atk: 1, def: 1, matk: 1, mdef: 1, spd: 1 },
    equipment: { rightHand: null, leftHand: null, armor: null, accessory1: null, accessory2: null, },
  },
  { ...BASE_TEMPLATE, id: 2,
    name: 'ベラ',
    baseStats: { atk: 1, def: 1, matk: 1, mdef: 1, spd: 1 },
    equipment: { rightHand: null, leftHand: null, armor: null, accessory1: null, accessory2: null, },
  },
  { ...BASE_TEMPLATE, id: 3,
    name: 'カイン',
    baseStats: { atk: 1, def: 1, matk: 1, mdef: 1, spd: 1 },
    equipment: { rightHand: null, leftHand: null, armor: null, accessory1: null, accessory2: null, },
  },
  { ...BASE_TEMPLATE, id: 4,
    name: 'ディアナ',
    baseStats: { atk: 1, def: 1, matk: 1, mdef: 1, spd: 1 },
    equipment: { rightHand: null, leftHand: null, armor: null, accessory1: null, accessory2: null, },
  },
];

// ─── Initial Equipment ───────────────────────────────────
export const SEED_EQUIPMENT = [ ...WEAPONS, ...ARMORS, ...SHIELDS, ...ACCESSORIES ];
