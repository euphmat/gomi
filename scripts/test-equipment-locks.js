import assert from 'node:assert/strict';
import { createCharacterCard } from '../js/components/character-card.js';
import { calculateBestEquipmentResults } from '../js/utils/best-equipment.js';

const equipment = [
  { id: 'weak_sword', slot: 'rightHand', name: '弱い剣', stats: { atk: 1 } },
  { id: 'strong_sword', slot: 'rightHand', name: '強い剣', stats: { atk: 10 } },
  { id: 'weak_ring', slot: 'accessory', name: '弱い指輪', stats: { atk: 1 } },
  { id: 'strong_ring', slot: 'accessory', name: '強い指輪', stats: { atk: 10 } },
  { id: 'weak_armor', slot: 'armor', name: '弱い鎧', stats: { def: 1 } },
  { id: 'strong_armor', slot: 'armor', name: '強い鎧', stats: { def: 10 } },
];
const equipmentMap = new Map(equipment.map(item => [item.id, item]));
const character = {
  id: 1,
  name: 'テスト',
  jobName: 'テスター',
  level: 1,
  jobLevel: 1,
  hp: { current: 10, max: 10 },
  mp: { current: 5, max: 5 },
  exp: { current: 0, max: 10 },
  jp: { current: 0, max: 10 },
  iconImage: '',
  equipment: {
    rightHand: 'weak_sword',
    leftHand: null,
    armor: 'weak_armor',
    accessory1: 'strong_ring',
    accessory2: 'weak_ring',
  },
  equipmentLocks: { rightHand: true, accessory1: true },
};

const { results } = calculateBestEquipmentResults(
  character,
  equipment,
  equipmentMap,
  new Set(Object.values(character.equipment).filter(Boolean)),
);

assert.equal(results.overall.newEquipment.rightHand, 'weak_sword', 'ロック中の右手装備を維持する');
assert.equal(results.overall.newEquipment.accessory1, 'strong_ring', 'ロック中のアクセサリを維持する');
assert.equal(results.overall.newEquipment.accessory2, 'weak_ring', 'ロック中の装備を別スロットへ移動しない');
assert.equal(results.overall.newEquipment.armor, 'strong_armor', 'ロックしていないスロットは最強装備へ変更する');
assert.ok(results.overall.changes.every(change => !character.equipmentLocks[change.slot]));

const finalStats = { hp: 10, mp: 5, atk: 1, def: 1, matk: 1, mdef: 1, spd: 1 };
const cardHtml = createCharacterCard(character, finalStats, [
  { slotKey: 'rightHand', item: equipmentMap.get('weak_sword') },
  { slotKey: 'leftHand', item: null },
]);

assert.match(cardHtml, /class="equipment-lock-btn[^\"]*text-amber-300/);
assert.match(cardHtml, /aria-label="右手の自動装備ロックを解除"/);
assert.match(cardHtml, /aria-pressed="true"/);
assert.match(cardHtml, />lock<\/span>/);
assert.match(cardHtml, /aria-label="左手の自動装備ロックを設定"/);
assert.match(cardHtml, />lock_open<\/span>/);

console.log('Equipment lock tests passed.');
