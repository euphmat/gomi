/**

 * このファイルはゲーム開始時のキャラクターのステータスや、
 * 初期状態の装備データなどを定義しているファイルです。
 */
// ─── Initial Characters ────────────────────────────────────

import { WEAPONS } from '../definitions/weapons.js';
import { ARMORS } from '../definitions/armors.js';
import { SHIELDS } from '../definitions/shields.js';
import { ACCESSORIES } from '../definitions/accessories.js';

// ─── Initial Equipment ───────────────────────────────────
// 決定論的なIDを生成して、キャラクターに事前割り当てできるようにする
const woodenStick = WEAPONS.find(w => w.id === 'wooden_stick');
const clothArmor = ARMORS.find(a => a.id === 'cloth_armor');
const woodenShield = SHIELDS.find(s => s.id === 'wooden_shield');
const powerRing = ACCESSORIES.find(a => a.id === 'power_ring');

const SEED_EQUIPMENT_LIST = [];
const equipIds = { rightHand: [], leftHand: [], armor: [], accessory1: [] };

for (let i = 0; i < 4; i++) {
  const wId = `wooden_stick_init${i + 1}`;
  const aId = `cloth_armor_init${i + 1}`;
  const sId = `wooden_shield_init${i + 1}`;
  const rId = `power_ring_init${i + 1}`;

  if (woodenStick) { SEED_EQUIPMENT_LIST.push({ ...woodenStick, id: wId }); equipIds.rightHand.push(wId); }
  if (clothArmor)  { SEED_EQUIPMENT_LIST.push({ ...clothArmor, id: aId });  equipIds.armor.push(aId); }
  if (woodenShield) { SEED_EQUIPMENT_LIST.push({ ...woodenShield, id: sId }); equipIds.leftHand.push(sId); }
  if (powerRing)   { SEED_EQUIPMENT_LIST.push({ ...powerRing, id: rId });   equipIds.accessory1.push(rId); }
}

export const SEED_EQUIPMENT = SEED_EQUIPMENT_LIST;

// ─── Characters ──────────────────────────────────────────
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
    equipment: { rightHand: equipIds.rightHand[0] || null, leftHand: equipIds.leftHand[0] || null, armor: equipIds.armor[0] || null, accessory1: equipIds.accessory1[0] || null, accessory2: null, },
  },
  { ...BASE_TEMPLATE, id: 2,
    name: 'ベラ',
    baseStats: { atk: 1, def: 1, matk: 1, mdef: 1, spd: 1 },
    equipment: { rightHand: equipIds.rightHand[1] || null, leftHand: equipIds.leftHand[1] || null, armor: equipIds.armor[1] || null, accessory1: equipIds.accessory1[1] || null, accessory2: null, },
  },
  { ...BASE_TEMPLATE, id: 3,
    name: 'カイン',
    baseStats: { atk: 1, def: 1, matk: 1, mdef: 1, spd: 1 },
    equipment: { rightHand: equipIds.rightHand[2] || null, leftHand: equipIds.leftHand[2] || null, armor: equipIds.armor[2] || null, accessory1: equipIds.accessory1[2] || null, accessory2: null, },
  },
  { ...BASE_TEMPLATE, id: 4,
    name: 'ディアナ',
    baseStats: { atk: 1, def: 1, matk: 1, mdef: 1, spd: 1 },
    equipment: { rightHand: equipIds.rightHand[3] || null, leftHand: equipIds.leftHand[3] || null, armor: equipIds.armor[3] || null, accessory1: equipIds.accessory1[3] || null, accessory2: null, },
  },
];
