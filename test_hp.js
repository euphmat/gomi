import { calcFinalStats, buildEquipmentMap } from './js/data/stat-calculator.js';
const equipment = [
  { id: 'ring', slot: 'accessory', stats: { spd: 5, hp: 50 } }
];
const equipmentMap = buildEquipmentMap(equipment);
const char = {
  hp: { current: 10, max: 10 },
  mp: { current: 10, max: 10 },
  baseStats: { atk: 1, def: 1, matk: 1, mdef: 1, spd: 1 },
  equipment: { rightHand: null, leftHand: null, armor: null, accessory1: 'ring', accessory2: null }
};
const finalStats = calcFinalStats(char, equipmentMap);
console.log('finalStats.hp:', finalStats.hp);
