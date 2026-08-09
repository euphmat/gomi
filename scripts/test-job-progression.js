import {
  JOB_EXP_REQUIREMENT_MULTIPLIER,
  clearLegacyJobSpBonus,
  getAvailableJobSP,
  getJobExpToNext,
  getJobLevelUpSP,
  getSpentJobSP,
  getTotalJobSP,
  normalizeJobExpProgress
} from '../js/data/job-progression.js';
import { getBaseExpToNext } from '../js/data/level-progression.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(JOB_EXP_REQUIREMENT_MULTIPLIER === 1.2, 'job EXP multiplier is invalid');

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

const testJob = {
  id: 'test_job',
  skills: [
    { id: 'skill_a', levels: [{ level: 1, spCost: 10 }, { level: 2, spCost: 20 }] },
    { id: 'skill_b', levels: [{ level: 1, spCost: 25 }] }
  ]
};
const existingCharacter = {
  jobLevel: 50,
  jobSkills: { test_job: { skill_a: 2, skill_b: 1 } }
};
assert(getSpentJobSP(existingCharacter, testJob) === 55, 'spent job SP is invalid');
assert(getAvailableJobSP(existingCharacter, testJob, 50) === 0, 'over-allocated skills should consume future SP');
assert(getAvailableJobSP(existingCharacter, testJob, 56) === 0, 'SP debt should be settled before SP becomes available');
assert(getAvailableJobSP(existingCharacter, testJob, 57) === 1, 'SP should become available after debt is settled');

const partiallySpentCharacter = {
  jobLevel: 50,
  jobSkills: { test_job: { skill_a: 1 } }
};
assert(getAvailableJobSP(partiallySpentCharacter, testJob) === 39, 'legacy unspent SP should be removed');

const previouslyMigratedCharacter = {
  jobSpProgressionVersion: 2,
  jobSpLegacyBonuses: { test_job: 30 }
};
assert(clearLegacyJobSpBonus(previouslyMigratedCharacter), 'legacy SP metadata should be removed');
assert(!('jobSpProgressionVersion' in previouslyMigratedCharacter), 'legacy SP version was not removed');
assert(!('jobSpLegacyBonuses' in previouslyMigratedCharacter), 'legacy SP bonus was not removed');
assert(!clearLegacyJobSpBonus(previouslyMigratedCharacter), 'legacy SP cleanup should be idempotent');

if (typeof print === 'function') print('Job progression tests passed.');
else console.log('Job progression tests passed.');
