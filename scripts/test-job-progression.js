import {
  JOB_EXP_REQUIREMENT_MULTIPLIER,
  JOB_SP_PROGRESSION_VERSION,
  getJobExpToNext,
  getJobLevelUpSP,
  getJobTotalSP,
  getTotalJobSP,
  normalizeJobExpProgress,
  normalizeJobSpProgression
} from '../js/data/job-progression.js';
import { getBaseExpToNext } from '../js/data/level-progression.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(JOB_EXP_REQUIREMENT_MULTIPLIER === 1.2, 'job EXP multiplier is invalid');
assert(JOB_SP_PROGRESSION_VERSION === 2, 'job SP progression version is invalid');

for (const level of [1, 2, 10, 30, 50, 100]) {
  assert(
    getJobExpToNext(level) === Math.ceil(getBaseExpToNext(level) * 1.2),
    `level ${level} JP requirement should be 20% above EXP`
  );
}

const legacyCharacter = {
  jobLevel: 10,
  jp: { current: 50, max: 100 },
  jobLevels: {
    mage: { level: 30, jp: { current: 750, max: 3000 } }
  }
};
assert(normalizeJobExpProgress(legacyCharacter), 'legacy JP progress should be migrated');
assert(legacyCharacter.jp.max === getJobExpToNext(10), 'active job JP max was not migrated');
assert(legacyCharacter.jp.current === Math.floor(getJobExpToNext(10) * 0.5), 'active job JP ratio was not preserved');
assert(legacyCharacter.jobLevels.mage.jp.max === getJobExpToNext(30), 'saved job JP max was not migrated');
assert(legacyCharacter.jobLevels.mage.jp.current === Math.floor(getJobExpToNext(30) * 0.25), 'saved job JP ratio was not preserved');
assert(!normalizeJobExpProgress(legacyCharacter), 'normalized JP progress should not migrate twice');

assert(getJobLevelUpSP(1) === 1, 'level 1 should grant 1 SP');
assert(getJobLevelUpSP(30) === 1, 'level 30 should grant 1 SP');
assert(getJobLevelUpSP(31) === 1, 'level 31 should grant 1 SP');
assert(getJobLevelUpSP(40) === 1, 'level 40 should grant 1 SP');
assert(getJobLevelUpSP(41) === 1, 'level 41 should grant 1 SP');
assert(getJobLevelUpSP(50) === 1, 'level 50 should grant 1 SP');
assert(getJobLevelUpSP(51) === 1, 'level 51 should grant 1 SP');

assert(getTotalJobSP(1) === 0, 'level 1 total SP is invalid');
assert(getTotalJobSP(30) === 29, 'level 30 total SP is invalid');
assert(getTotalJobSP(31) === 30, 'level 31 total SP is invalid');
assert(getTotalJobSP(40) === 39, 'level 40 total SP is invalid');
assert(getTotalJobSP(41) === 40, 'level 41 total SP is invalid');
assert(getTotalJobSP(50) === 49, 'level 50 total SP is invalid');
assert(getTotalJobSP(51) === 50, 'level 51 total SP is invalid');

const existingCharacter = {
  jobId: 'gunner',
  jobLevel: 50,
  jobLevels: { mage: { level: 41 } }
};
assert(normalizeJobSpProgression(existingCharacter), 'existing SP progression should be migrated');
assert(existingCharacter.jobSpLegacyBonuses.gunner === 30, 'active job legacy SP was not preserved');
assert(existingCharacter.jobSpLegacyBonuses.mage === 12, 'saved job legacy SP was not preserved');
assert(getJobTotalSP(existingCharacter, 'gunner', 50) === 79, 'existing active job should retain earned SP');
assert(getJobTotalSP(existingCharacter, 'gunner', 51) === 80, 'future job levels should add only 1 SP');
assert(getJobTotalSP(existingCharacter, 'mage', 41) === 52, 'existing saved job should retain earned SP');
assert(!normalizeJobSpProgression(existingCharacter), 'SP progression should not migrate twice');

const newCharacter = {
  jobId: 'norvice',
  jobLevel: 50,
  jobSpProgressionVersion: JOB_SP_PROGRESSION_VERSION,
  jobSpLegacyBonuses: {}
};
assert(!normalizeJobSpProgression(newCharacter), 'new SP progression should not be migrated');
assert(getJobTotalSP(newCharacter, 'norvice', 50) === 49, 'new characters should not receive legacy SP');

if (typeof print === 'function') print('Job progression tests passed.');
else console.log('Job progression tests passed.');
