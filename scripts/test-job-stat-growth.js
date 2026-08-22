import assert from 'node:assert/strict';
import { JOBS } from '../js/jobs/index.js';
import {
  JOB_GROWTH_STAT_DEFINITIONS,
  formatJobGrowthRange,
  getJobGrowthStats,
  normalizeJobGrowthRange,
} from '../js/data/job-stat-growth.js';

assert.deepEqual(normalizeJobGrowthRange([3, 1]), [1, 3]);
assert.deepEqual(normalizeJobGrowthRange(2), [2, 2]);
assert.equal(formatJobGrowthRange([1, 3]), '+1〜3');
assert.equal(formatJobGrowthRange([1, 1]), '+1');

assert.equal(JOB_GROWTH_STAT_DEFINITIONS.length, 7);
for (const job of Object.values(JOBS)) {
  const stats = getJobGrowthStats(job);
  assert.equal(stats.length, 7, `${job.name}の成長率が7能力分ありません`);
  for (const stat of stats) {
    const [min, max] = stat.range;
    assert(Number.isInteger(min) && Number.isInteger(max), `${job.name} ${stat.label}の成長率が整数ではありません`);
    assert(min <= max, `${job.name} ${stat.label}の成長率の範囲が不正です`);
    assert.match(stat.displayValue, /^\+\d+(?:〜\d+)?$/);
  }
}

assert.deepEqual(JOBS.dealer.statGrowth, {
  hp: [1, 1],
  mp: [1, 1],
  atk: [1, 1],
  def: [1, 1],
  matk: [1, 1],
  mdef: [1, 1],
  spd: [1, 1],
});

console.log(`Job stat growth display tests passed for ${Object.keys(JOBS).length} jobs.`);
