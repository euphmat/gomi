import {
  DOUBLE_SP_JOB_LEVEL,
  TRIPLE_SP_JOB_LEVEL,
  getJobLevelUpSP,
  getTotalJobSP
} from '../js/data/job-progression.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(DOUBLE_SP_JOB_LEVEL === 31, 'double-SP threshold is invalid');
assert(TRIPLE_SP_JOB_LEVEL === 41, 'triple-SP threshold is invalid');

assert(getJobLevelUpSP(1) === 1, 'level 1 should grant 1 SP');
assert(getJobLevelUpSP(30) === 1, 'level 30 should grant 1 SP');
assert(getJobLevelUpSP(31) === 2, 'level 31 should grant 2 SP');
assert(getJobLevelUpSP(40) === 2, 'level 40 should grant 2 SP');
assert(getJobLevelUpSP(41) === 3, 'level 41 should grant 3 SP');
assert(getJobLevelUpSP(50) === 3, 'level 50 should grant 3 SP');
assert(getJobLevelUpSP(51) === 3, 'level 51 should grant 3 SP');

assert(getTotalJobSP(1) === 0, 'level 1 total SP is invalid');
assert(getTotalJobSP(30) === 29, 'level 30 total SP is invalid');
assert(getTotalJobSP(31) === 31, 'level 31 total SP is invalid');
assert(getTotalJobSP(40) === 49, 'level 40 total SP is invalid');
assert(getTotalJobSP(41) === 52, 'level 41 total SP is invalid');
assert(getTotalJobSP(50) === 79, 'level 50 total SP is invalid');
assert(getTotalJobSP(51) === 82, 'level 51 total SP is invalid');

if (typeof print === 'function') print('Job progression tests passed.');
else console.log('Job progression tests passed.');
