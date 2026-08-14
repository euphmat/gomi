import {
  getAtbAdvanceSteps,
  getAtbSpeedMultiplier,
  getAverageBattleSpd,
  getEffectiveBattleSpd,
  MAX_NORMALIZED_SPD,
  MIN_ATB_SPEED_MULTIPLIER
} from '../js/pages/battle/atb-speed.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const slow = { stats: { spd: 1 }, isDead: false };
const fast = { stats: { spd: 1000 }, isDead: false };
const defeatedOutlier = { stats: { spd: 1000000 }, isDead: true };

assert(getEffectiveBattleSpd({ stats: { spd: 100 }, _passiveSpdBuffPercent: 50 }) === 150,
  'SPD buffs were not applied');
assert(getEffectiveBattleSpd({ stats: { spd: 10 }, _passiveSpdBuffPercent: -200 }) === 1,
  'SPD could fall below the minimum action speed');
assert(getEffectiveBattleSpd({ stats: { spd: Number.NaN } }) === 1,
  'invalid SPD did not use a safe fallback');

const averageSpd = getAverageBattleSpd([slow, fast, defeatedOutlier]);
assert(averageSpd === 500.5, 'dead entities affected the live SPD baseline');
assert(getAverageBattleSpd([]) === 1, 'empty combat did not use a safe baseline');
assert(getAtbSpeedMultiplier(100, 100) === 1, 'average SPD did not retain normal ATB speed');

const slowMultiplier = getAtbSpeedMultiplier(getEffectiveBattleSpd(slow), averageSpd);
const fastMultiplier = getAtbSpeedMultiplier(getEffectiveBattleSpd(fast), averageSpd);
assert(slowMultiplier >= MIN_ATB_SPEED_MULTIPLIER,
  'low SPD lost its guaranteed ATB gain');
assert(fastMultiplier > slowMultiplier,
  'higher SPD did not retain an action-speed advantage');
assert(fastMultiplier / slowMultiplier < 3,
  'an extreme SPD gap still prevented the slower entity from participating');
assert(getAtbSpeedMultiplier(1000000, 1)
  === MIN_ATB_SPEED_MULTIPLIER + (1 - MIN_ATB_SPEED_MULTIPLIER) * MAX_NORMALIZED_SPD,
  'extreme SPD was not capped safely');

// With the old direct ratio, SPD 1 needed roughly 17,518 ticks here. The new
// guaranteed gain must fill its gauge within a normal-length encounter.
const ticksUntilSlowActs = Math.ceil(1000 / (slowMultiplier * (1000 / 35)));
assert(ticksUntilSlowActs <= 70, 'low SPD still takes too long to receive a turn');

const fastForwardEntries = [
  { entity: { atb: 120, isDead: false }, gain: 20 },
  { entity: { atb: 520, isDead: false }, gain: 60 },
  { entity: { atb: 999, isDead: true }, gain: 500 }
];
assert(getAtbAdvanceSteps(fastForwardEntries, 50) === 8,
  'fast-forward did not jump directly to the first living actor threshold');
assert(getAtbAdvanceSteps([{ entity: { atb: 1000, isDead: false }, gain: 20 }], 50) === 1,
  'an already-ready actor skipped an ATB advance');
assert(getAtbAdvanceSteps([{ entity: { atb: 0, isDead: false }, gain: 1 }], 5) === 5,
  'fast-forward exceeded its configured maximum');

console.log('ATB speed balance tests passed');
