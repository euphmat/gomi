import {
  JOB_SKILL_LIMIT_BREAK_GROWTH,
  resolveJobSkillLevelConfig
} from '../js/utils/job-skill-potency.js';
import {
  getJobSkillLevelCost,
  getJobSkillMasterLevel,
  hasMasteredAllJobSkills
} from '../js/data/job-progression.js';
import { JOBS } from '../js/jobs/index.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const skill = {
  maxLevel: 10,
  levels: [
    { level: 9, spCost: 3, mpCost: 40, multiplier: 1.8, hits: 7, chance: 70 },
    { level: 10, spCost: 5, mpCost: 50, multiplier: 2, hits: 8, chance: 80 }
  ]
};

assert(JOB_SKILL_LIMIT_BREAK_GROWTH === 0.1, 'limit break growth is invalid');

const mastered = resolveJobSkillLevelConfig(skill, 10, 'base');
assert(mastered.multiplier === 2, 'mastered skill potency changed');
assert(mastered.mpCost === 50 && mastered.hits === 8, 'mastered skill structure changed');

const firstBreak = resolveJobSkillLevelConfig(skill, 11, 'base');
assert(firstBreak.level === 11, 'resolved limit break level is invalid');
assert(firstBreak.multiplier === 2.2, 'damage did not grow by 10%');
assert(firstBreak.chance === 88, 'chance did not grow by 10%');
assert(firstBreak.mpCost === 50, 'MP cost should stay at mastery value');
assert(firstBreak.hits === 8, 'hit count should stay at mastery value');
assert(firstBreak.spCost === 5, 'resolved SP cost should stay at mastery value');

const currentJobBreak = resolveJobSkillLevelConfig(skill, 11, 'current');
assert(currentJobBreak.multiplier === 2.42, 'current-job potency and limit break did not combine');
assert(currentJobBreak.chance === 96.8, 'current-job chance and limit break did not combine');

const inheritedBreak = resolveJobSkillLevelConfig(skill, 11, 'inherited');
assert(inheritedBreak.multiplier === 1.98, 'inherited potency and limit break did not combine');
assert(inheritedBreak.chance === 79.2, 'inherited chance and limit break did not combine');

const farBreak = resolveJobSkillLevelConfig(skill, 30, 'base');
assert(farBreak.multiplier === 6, 'limit break growth should stay linear and uncapped');
assert(farBreak.chance === 100, 'bounded probability exceeded 100%');

const variedSkill = {
  maxLevel: 10,
  levels: [{
    level: 10,
    spCost: 5,
    mpCost: 100,
    bonusHp: 150,
    bonusAtkPercent: 120,
    barrierPercent: 140,
    maxDragonSpirit: 5,
    threshold: 50,
    atkMatkMultiplier: 1.5,
    hpPercent: 25,
    duration: 6
  }]
};
const variedBreak = resolveJobSkillLevelConfig(variedSkill, 20, 'base');
assert(variedBreak.bonusHp === 300, 'flat stat bonus did not limit break');
assert(variedBreak.bonusAtkPercent === 240, 'stat percentage should grow without a 100% cap');
assert(variedBreak.barrierPercent === 280, 'barrier strength should grow without a 100% cap');
assert(variedBreak.maxDragonSpirit === 10, 'job resource maximum did not limit break');
assert(variedBreak.threshold === 25, 'inverse threshold did not improve');
assert(variedBreak.atkMatkMultiplier === 2, 'neutral multiplier did not improve correctly');
assert(variedBreak.hpPercent === 25, 'HP sacrifice must not increase');
assert(variedBreak.duration === 6, 'duration must stay at mastery value');

assert(Object.keys(JOBS).length === 25, 'the all-job limit break test is missing a job');
for (const job of Object.values(JOBS)) {
  const masteredLevels = Object.fromEntries(
    job.skills.map(jobSkill => [jobSkill.id, getJobSkillMasterLevel(jobSkill)])
  );
  const character = { jobSkills: { [job.id]: masteredLevels } };
  assert(hasMasteredAllJobSkills(character, job), `${job.id} did not unlock limit breaks`);

  for (const jobSkill of job.skills) {
    const masterLevel = getJobSkillMasterLevel(jobSkill);
    const masterConfig = resolveJobSkillLevelConfig(jobSkill, masterLevel, 'base');
    const brokenConfig = resolveJobSkillLevelConfig(jobSkill, masterLevel + 1, 'base');
    assert(getJobSkillLevelCost(jobSkill, masterLevel + 1) > 0, `${job.id}/${jobSkill.id} has no limit break cost`);
    assert(brokenConfig.level === masterLevel + 1, `${job.id}/${jobSkill.id} lost its limit break level`);
    assert(
      Object.values(brokenConfig).every(value => typeof value !== 'number' || Number.isFinite(value)),
      `${job.id}/${jobSkill.id} produced a non-finite effect`
    );
    assert(brokenConfig.mpCost === masterConfig.mpCost, `${job.id}/${jobSkill.id} changed MP cost`);
    assert(brokenConfig.hits === masterConfig.hits, `${job.id}/${jobSkill.id} changed hit count`);
    assert(brokenConfig.turns === masterConfig.turns, `${job.id}/${jobSkill.id} changed turn count`);
    assert(typeof jobSkill.getDescription(brokenConfig) === 'string', `${job.id}/${jobSkill.id} description failed`);
  }
}

if (typeof print === 'function') print('Job skill limit break tests passed.');
else console.log('Job skill limit break tests passed.');
