import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import {
  compactCloudSnapshot,
  expandCloudSnapshot,
} from '../js/data/database.js';
import { WEAPONS } from '../js/definitions/weapons.js';
import { MATERIALS } from '../js/definitions/materials.js';

const equippedId = 'wooden_stick_equipped_1';
const woodenStick = WEAPONS.find(item => item.id === 'wooden_stick');
const material = MATERIALS[0];
assert.ok(woodenStick);
assert.ok(material);

let randomState = 0x12345678;
const nextSuffix = () => {
  randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
  return randomState.toString(36).padStart(7, '0');
};

const equipment = [
  { ...woodenStick, id: equippedId },
  { ...woodenStick, id: 'wooden_stick_init99' },
  { id: `wooden_stick_${nextSuffix()}`, baseId: 'wooden_stick', customLabel: 'preserve-me' },
];
for (let index = 0; index < 20_000; index += 1) {
  equipment.push({ id: `wooden_stick_${nextSuffix()}_${index.toString(36)}`, baseId: 'wooden_stick' });
}

const original = {
  gameState: [{ key: 'gold', value: 123456789 }],
  characters: [{
    id: 1,
    name: 'テスト',
    equipment: { rightHand: equippedId, leftHand: null, armor: null, accessory1: null, accessory2: null },
  }],
  equipment,
  inventory: [{ ...material, type: 'material', quantity: 999_999 }],
};

const compact = compactCloudSnapshot(original);
assert.equal(compact.cloudSnapshotVersion, 2);
assert.deepEqual(compact.equipment.stacks, [['wooden_stick', 20_001]]);
assert.equal(compact.equipment.records.length, 2);

const expanded = expandCloudSnapshot(compact);
assert.equal(expanded.equipment.length, original.equipment.length);
assert.equal(expanded.equipment.some(item => item.id === equippedId), true);
assert.equal(
  expanded.equipment.find(item => item.customLabel === 'preserve-me')?.baseId,
  'wooden_stick',
);
assert.equal(new Set(expanded.equipment.map(item => item.id)).size, expanded.equipment.length);
assert.equal(expanded.characters[0].equipment.rightHand, equippedId);
assert.equal(expanded.inventory[0].name, material.name);
assert.equal(expanded.inventory[0].type, 'material');
assert.equal(expanded.inventory[0].quantity, 999_999);
assert.deepEqual(expanded.gameState, original.gameState);

const originalGzipSize = gzipSync(JSON.stringify(original)).byteLength;
const compactGzipSize = gzipSync(JSON.stringify(compact)).byteLength;
assert.ok(
  compactGzipSize < originalGzipSize / 20,
  `Expected at least 95% reduction, got ${originalGzipSize} -> ${compactGzipSize}`,
);

const legacy = { gameState: [], characters: [], equipment: [], inventory: [] };
assert.equal(expandCloudSnapshot(legacy), legacy);
assert.throws(
  () => expandCloudSnapshot({ ...compact, equipment: { records: [], stacks: [['wooden_stick', -1]] } }),
  /Invalid compact equipment stack/,
);

console.log(`Cloud snapshot compaction tests passed (${originalGzipSize} -> ${compactGzipSize} bytes).`);
