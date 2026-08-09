import {
  DOUBLE_SP_JOB_LEVEL,
  TRIPLE_SP_JOB_LEVEL,
  getJobLevelUpSP,
  getTotalJobSP
} from '../js/data/job-progression.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(DOUBLE_SP_JOB_LEVEL === 40, 'double-SP threshold is invalid');
assert(TRIPLE_SP_JOB_LEVEL === 50, 'triple-SP threshold is invalid');

assert(getJobLevelUpSP(39) === 1, 'level 39 should grant 1 SP');
assert(getJobLevelUpSP(40) === 2, 'level 40 should grant 2 SP');
assert(getJobLevelUpSP(49) === 2, 'level 49 should grant 2 SP');
assert(getJobLevelUpSP(50) === 3, 'level 50 should grant 3 SP');
assert(getJobLevelUpSP(51) === 3, 'level 51 should grant 3 SP');

assert(getTotalJobSP(1) === 0, 'level 1 total SP is invalid');
assert(getTotalJobSP(39) === 38, 'level 39 total SP is invalid');
assert(getTotalJobSP(40) === 40, 'level 40 total SP is invalid');
assert(getTotalJobSP(49) === 58, 'level 49 total SP is invalid');
assert(getTotalJobSP(50) === 61, 'level 50 total SP is invalid');
assert(getTotalJobSP(51) === 64, 'level 51 total SP is invalid');

if (typeof print === 'function') print('Job progression tests passed.');
else console.log('Job progression tests passed.');
