import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  TREASURES,
  TREASURE_STATE_KEY,
  getTreasureRate,
  getTreasureValue,
} from '../js/definitions/treasures.js';
import {
  drawPrismGacha,
  getTreasureLevels,
  loadTreasureLevels,
} from '../js/data/treasure-manager.js';
import { GameDB } from '../js/data/database.js';

assert.equal(TREASURES.length, 24);
assert.equal(new Set(TREASURES.map(treasure => treasure.id)).size, TREASURES.length);
assert.equal(TREASURES.reduce((sum, treasure) => sum + treasure.maxLevel, 0), 366);

for (const treasure of TREASURES) {
  assert.ok(Number.isInteger(treasure.maxLevel) && treasure.maxLevel > 0, `${treasure.id} needs a maximum level`);
  assert.equal(
    existsSync(new URL(`../assets/treasure/${treasure.id}.webp`, import.meta.url)),
    true,
    `${treasure.id} needs a treasure image`,
  );
  assert.equal(
    getTreasureValue(treasure, treasure.maxLevel + 999),
    getTreasureValue(treasure, treasure.maxLevel),
    `${treasure.id} effect must stop at its maximum level`,
  );
}

const treasureById = new Map(TREASURES.map(treasure => [treasure.id, treasure]));
const expectedMaximumEffects = {
  pocket_watch: 2,
  golden_pickaxe: 100,
  mine_king_blueprint: 50,
  rainbow_mining_machine: 100,
  hero_medal: 100,
  master_spellbook: 100,
  midas_coin: 100,
  four_leaf_clover: 10,
  hunter_monocle: 5,
  monster_tamer_bell: 5,
  rainbow_collar: 6,
  subjugation_king_crown: 10,
  monster_tamer_flute: 60,
  miracle_feed_box: 100,
  treasury_key: 100000,
  divine_smith_hammer: 50,
  alchemist_crucible: 50,
  rainbow_piggy_bank: 20,
  clairvoyant_crystal: 50,
  forgetting_hourglass: 50,
  resonance_compass: 50,
  royal_forging_seal: 20,
  number_sage_quill: 2,
  prospector_canary: 20,
};
assert.equal(Object.keys(expectedMaximumEffects).length, TREASURES.length);
for (const [id, expected] of Object.entries(expectedMaximumEffects)) {
  const treasure = treasureById.get(id);
  assert.equal(getTreasureValue(treasure, treasure.maxLevel), expected, `${id} balance cap changed`);
}

const rateLevels = Object.fromEntries(TREASURES.map(treasure => [treasure.id, treasure.maxLevel]));
rateLevels.pocket_watch -= 1;
rateLevels.hero_medal -= 1;
assert.equal(getTreasureRate(treasureById.get('pocket_watch'), rateLevels), 0.5);
assert.equal(getTreasureRate(treasureById.get('hero_medal'), rateLevels), 0.5);
assert.equal(getTreasureRate(treasureById.get('golden_pickaxe'), rateLevels), 0);

const storedLevels = Object.fromEntries(TREASURES.map(treasure => [treasure.id, treasure.maxLevel]));
storedLevels.rainbow_piggy_bank = 999;
storedLevels.invalid_treasure = 999;
const state = new Map([
  [TREASURE_STATE_KEY, storedLevels],
  ['prism', 10],
]);
GameDB.getGameState = async key => state.get(key);
GameDB.setGameState = async (key, value) => state.set(key, structuredClone(value));

await loadTreasureLevels(true);
assert.equal(getTreasureLevels().rainbow_piggy_bank, 10, 'legacy over-level saves must be clamped');
assert.equal('invalid_treasure' in getTreasureLevels(), false);
assert.deepEqual(state.get(TREASURE_STATE_KEY), getTreasureLevels(), 'normalized levels must be persisted');

state.get(TREASURE_STATE_KEY).rainbow_piggy_bank = 9;
await loadTreasureLevels(true);
const rolls = [0.5, 0.19];
const result = await drawPrismGacha(() => rolls.shift());
assert.equal(result.treasure.id, 'rainbow_piggy_bank', 'max-level treasures must be skipped during selection');
assert.equal(result.level, 10);
assert.equal(result.value, 20);
assert.equal(result.refunded, true, 'the Prism refund chance must reach 20% at maximum level');
assert.equal(result.prism, 10);

await assert.rejects(
  drawPrismGacha(() => 0),
  /すべての秘宝が上限レベル/,
  'a completed collection must not spend Prism',
);
assert.equal(state.get('prism'), 10);

const pageSource = readFileSync(new URL('../js/pages/shop-tabs/gacha-tab.js', import.meta.url), 'utf8');
assert.match(pageSource, /全秘宝 MAX/);
assert.match(pageSource, /上限到達後は排出対象から外れます/);
assert.match(pageSource, /getTreasureRate\(treasure, levels\)/);

console.log('Treasure level cap and balance checks passed.');
