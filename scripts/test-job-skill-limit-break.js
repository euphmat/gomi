import {
  canLimitBreakJobSkill,
  JOB_SKILL_LIMIT_BREAK_GROWTH,
  resolveJobSkillLevelConfig
} from '../js/utils/job-skill-potency.js';
import {
  getJobSkillLevelCost,
  getJobSkillMasterLevel,
  getSpentJobSP,
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

const drawbackSkill = {
  maxLevel: 10,
  levels: [{
    level: 10,
    spCost: 5,
    mpCost: 0,
    curseDamageMultiplier: 1,
    curseRecoilMultiplier: .2
  }]
};
for (const mode of ['base', 'current', 'inherited']) {
  const removedDrawback = resolveJobSkillLevelConfig(drawbackSkill, 30, mode);
  assert(removedDrawback.curseDamageMultiplier === 0, `${mode} curse damage multiplier became negative`);
  assert(removedDrawback.curseRecoilMultiplier === 0, `${mode} curse recoil multiplier became negative`);
}

const fixedOnlySkill = {
  id: 'fixed_only',
  maxLevel: 10,
  levels: [{ level: 10, spCost: 5, mpCost: 4 }]
};
assert(!canLimitBreakJobSkill(fixedOnlySkill), 'a skill with no scalable effect allowed SP to be wasted');
assert(getJobSkillLevelCost(fixedOnlySkill, 11) === 0, 'a non-scaling limit break still had an SP cost');
assert(resolveJobSkillLevelConfig(fixedOnlySkill, 11, 'base').level === 10, 'a non-scaling skill exceeded mastery');
const fixedOnlyJob = { id: 'fixed_job', skills: [fixedOnlySkill] };
const masteredFixedCharacter = { jobSkills: { fixed_job: { fixed_only: 10 } } };
const overleveledFixedCharacter = { jobSkills: { fixed_job: { fixed_only: 20 } } };
assert(
  getSpentJobSP(overleveledFixedCharacter, fixedOnlyJob) === getSpentJobSP(masteredFixedCharacter, fixedOnlyJob),
  'SP spent on a non-scaling limit break was not refunded'
);

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
assert(variedBreak.maxDragonSpirit === 5, 'job resource maximum should stay structural');
assert(variedBreak.threshold === 25, 'inverse threshold did not improve');
assert(variedBreak.atkMatkMultiplier === 2, 'neutral multiplier did not improve correctly');
assert(variedBreak.hpPercent === 25, 'HP sacrifice must not increase');
assert(variedBreak.duration === 8, 'duration did not gain one turn per 5 limit breaks');

const compoundSkill = {
  maxLevel: 10,
  limitBreakFixedKeys: ['reduction'],
  levels: [{
    level: 10,
    spCost: 5,
    chance: 25,
    reduction: 40,
    multiplier: 2,
    defenseIgnorePercent: 50,
    detonationMultiplier: 1.75,
    maxHarmony: 5
  }]
};
const compoundBreak = resolveJobSkillLevelConfig(compoundSkill, 20, 'base');
assert(compoundBreak.chance === 50, 'primary proc chance did not limit break');
assert(compoundBreak.multiplier === 4, 'primary damage did not limit break');
assert(compoundBreak.reduction === 40, 'skill-specific secondary strength should stay fixed');
assert(compoundBreak.defenseIgnorePercent === 50, 'defense bypass should stay fixed');
assert(compoundBreak.detonationMultiplier === 1.75, 'conditional multiplier should stay fixed');
assert(compoundBreak.maxHarmony === 5, 'resource cap should stay fixed');

assert(Object.keys(JOBS).length === 25, 'the all-job limit break test is missing a job');
const nonScalingSkills = [];
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
    const farBrokenConfig = resolveJobSkillLevelConfig(jobSkill, masterLevel + 100, 'current');
    const canLimitBreak = canLimitBreakJobSkill(jobSkill);
    if (canLimitBreak) {
      assert(getJobSkillLevelCost(jobSkill, masterLevel + 1) > 0, `${job.id}/${jobSkill.id} has no limit break cost`);
      assert(brokenConfig.level === masterLevel + 1, `${job.id}/${jobSkill.id} lost its limit break level`);
    } else {
      nonScalingSkills.push(`${job.id}/${jobSkill.id}`);
      assert(getJobSkillLevelCost(jobSkill, masterLevel + 1) === 0, `${job.id}/${jobSkill.id} charges for no effect`);
      assert(brokenConfig.level === masterLevel, `${job.id}/${jobSkill.id} exceeded mastery without an effect`);
    }
    assert(
      Object.values(brokenConfig).every(value => typeof value !== 'number' || Number.isFinite(value)),
      `${job.id}/${jobSkill.id} produced a non-finite effect`
    );
    assert(
      Object.values(farBrokenConfig).every(value => typeof value !== 'number' || (Number.isFinite(value) && value >= 0)),
      `${job.id}/${jobSkill.id} produced an invalid effect after repeated limit breaks`
    );
    assert(brokenConfig.mpCost === masterConfig.mpCost, `${job.id}/${jobSkill.id} changed MP cost`);
    assert(brokenConfig.hits === masterConfig.hits, `${job.id}/${jobSkill.id} changed hit count`);
    assert(brokenConfig.turns === masterConfig.turns, `${job.id}/${jobSkill.id} changed turn count`);
    assert(typeof jobSkill.getDescription(brokenConfig) === 'string', `${job.id}/${jobSkill.id} description failed`);
  }
}
assert(nonScalingSkills.length === 0, `unexpected non-scaling skills: ${nonScalingSkills.join(', ')}`);

const restore = JOBS.priest.skills.find(candidate => candidate.id === 'restore');
const masteredRestore = resolveJobSkillLevelConfig(restore, 10, 'base');
const firstRestoreBreak = resolveJobSkillLevelConfig(restore, 11, 'base');
const farRestoreBreak = resolveJobSkillLevelConfig(restore, 21, 'base');
assert(masteredRestore.cleanseCount === 1, 'mastered restore target count changed');
assert(firstRestoreBreak.cleanseCount === 2, 'restore did not gain a second cleanse target');
assert(farRestoreBreak.cleanseCount === 4, 'restore target growth exceeded its intended steps');

const timedSkill = {
  maxLevel: 10,
  levels: [{ level: 10, spCost: 5, turns: 5, duration: 4, burnTurns: 6, freezeTurns: 1 }]
};
const fourthTimedBreak = resolveJobSkillLevelConfig(timedSkill, 14, 'base');
const fifthTimedBreak = resolveJobSkillLevelConfig(timedSkill, 15, 'base');
const deepTimedBreak = resolveJobSkillLevelConfig(timedSkill, 30, 'base');
assert(fourthTimedBreak.turns === 5, 'turn duration grew before its fifth break');
assert(fifthTimedBreak.turns === 6 && fifthTimedBreak.duration === 5, 'timed effects did not grow at five breaks');
assert(fifthTimedBreak.burnTurns === 7, 'burn duration did not grow at five breaks');
assert(fifthTimedBreak.freezeTurns === 1, 'hard control duration grew too early');
assert(deepTimedBreak.turns === 8 && deepTimedBreak.duration === 7, 'timed effect bonus cap is invalid');
assert(deepTimedBreak.burnTurns === 9, 'burn duration bonus cap is invalid');
assert(deepTimedBreak.freezeTurns === 2, 'freeze duration should cap at one extra turn');

const expectedFixedEffects = {
  'norvice/guard': { reduction: 40 },
  'paladin/holy_smite': { drainPercent: 50 },
  'gunner/penetrator': { spillMultiplier: .6 },
  'gunner/quick_reload': { refundPercent: 50 },
  'dragoon/dragon_heart': { maxDragonSpirit: 5 },
  'mana_conductor/conductor_core': { maxHarmony: 5 },
  'entertainer/showstopper': { maxHype: 5 },
  'slime_singer/resonant_gel': { maxNotes: 5 }
};
for (const [skillPath, expected] of Object.entries(expectedFixedEffects)) {
  const [jobId, skillId] = skillPath.split('/');
  const jobSkill = JOBS[jobId].skills.find(candidate => candidate.id === skillId);
  const brokenConfig = resolveJobSkillLevelConfig(jobSkill, getJobSkillMasterLevel(jobSkill) + 10, 'base');
  for (const [key, value] of Object.entries(expected)) {
    assert(brokenConfig[key] === value, `${skillPath} scaled compound effect ${key}`);
  }
}

if (typeof print === 'function') print('Job skill limit break tests passed.');
else console.log('Job skill limit break tests passed.');
