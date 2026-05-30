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
  hp:  { current: 100, max: 100 },
  mp:  { current: 20,  max: 20 },
  exp: { current: 0,   max: 100 },
  jp:  { current: 0,   max: 50 },
  modifiers: [],
  elementResist: {
    fire: 0, water: 0, grass: 0, ice: 0,
    thunder: 0, wind: 0, earth: 0, light: 0, dark: 0,
  },
  ailmentResist: {
    poison: 0, burn: 0, paralysis: 0, sleep: 0,
    confusion: 0, curse: 0, blind: 0, silence: 0,
  },
  iconImage: './assets/job/job_norvice.webp',
};

export const SEED_CHARACTERS = [
  {
    ...BASE_TEMPLATE,
    id: 1,
    name: 'アレックス',
    baseStats: { atk: 10, def: 10, matk: 10, mdef: 10, spd: 10 },
    equipment: {
      rightHand:  'copper_sword', // 銅の剣
      leftHand:   null,
      armor:      null,
      accessory1: null,
      accessory2: null,
    },
    iconGradient: ['#8B7355', '#C4A776'],
  },
  {
    ...BASE_TEMPLATE,
    id: 2,
    name: 'ベラ',
    baseStats: { atk: 10, def: 10, matk: 10, mdef: 10, spd: 10 },
    equipment: {
      rightHand:  null,
      leftHand:   null,
      armor:      null,
      accessory1: null,
      accessory2: null,
    },
    iconGradient: ['#8B3A62', '#D87093'], // Pinkish for mage
  },
  {
    ...BASE_TEMPLATE,
    id: 3,
    name: 'カイン',
    baseStats: { atk: 10, def: 10, matk: 10, mdef: 10, spd: 10 },
    equipment: {
      rightHand:  null,
      leftHand:   null,
      armor:      null,
      accessory1: null,
      accessory2: null,
    },
    iconGradient: ['#5C4033', '#A0522D'], // Brown/Red for warrior
  },
  {
    ...BASE_TEMPLATE,
    id: 4,
    name: 'ディアナ',
    baseStats: { atk: 10, def: 10, matk: 10, mdef: 10, spd: 10 },
    equipment: {
      rightHand:  null,
      leftHand:   null,
      armor:      null,
      accessory1: null,
      accessory2: null,
    },
    iconGradient: ['#2F4F4F', '#66CDAA'], // Teal/Green for healer
  }
];

// ─── Initial Equipment ───────────────────────────────────
export const SEED_EQUIPMENT = [
  ...WEAPONS,
  ...ARMORS,
  ...SHIELDS,
  ...ACCESSORIES
];
