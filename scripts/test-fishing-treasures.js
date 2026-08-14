import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FISHING_SPOTS } from '../js/definitions/fish.js';
import { FISHING_ROD_SPEED_PER_LEVEL } from '../js/definitions/fishing-tackle.js';
import {
  applySameFishCatchBonus,
  getRandomCatchDelay,
} from '../js/data/fishing-manager.js';

const spot = FISHING_SPOTS[0];
const delayWithoutTreasure = getRandomCatchDelay(spot.id, 1, 0, () => 0);
const delayAtMaximum = getRandomCatchDelay(spot.id, 1, 10, () => 0);
assert.equal(delayWithoutTreasure, Math.floor(spot.minCatchMs * (1 - FISHING_ROD_SPEED_PER_LEVEL)));
assert.equal(delayAtMaximum, Math.floor(spot.minCatchMs * (1 - FISHING_ROD_SPEED_PER_LEVEL) * 0.9));
assert.ok(delayAtMaximum < delayWithoutTreasure, 'the Sea Echo stopwatch did not shorten fishing time');

const fish = { id: 'test_fish', name: 'Test Fish' };
const original = [fish, { id: 'lure_fish' }];
const triggered = applySameFishCatchBonus(original, 20, () => 0.1999);
assert.equal(triggered.bonusTriggered, true);
assert.equal(triggered.fishes.length, 3);
assert.equal(triggered.fishes[2], fish, 'the Rainbow float must duplicate the first fish');
assert.equal(original.length, 2, 'the Rainbow float helper must not mutate lure catches');
assert.equal(applySameFishCatchBonus(original, 20, () => 0.2).bonusTriggered, false);
assert.equal(applySameFishCatchBonus([], 100, () => 0).fishes.length, 0);

const pageSource = readFileSync(new URL('../js/pages/fishing.js', import.meta.url), 'utf8');
assert.match(pageSource, /result\.fishes\.slice\(0, 4\)/, 'four-fish presentation is missing');
assert.match(pageSource, /RAINBOW FLOAT BONUS/, 'Rainbow float presentation is missing');

console.log('Fishing treasure tests passed.');
