import {
  canLimitBreakJobSkill,
  getJobSkillLimitBreakMilestones,
  getNextJobSkillLimitBreakMilestone,
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
import { calcFinalStats } from '../js/data/stat-calculator.js';
import {
  getDefenseAfterIgnore,
  getStackedAttackNegationStep,
  MAX_STACKED_ATTACK_NEGATION_CHANCE
} from '../js/pages/battle/battle-actions.js';

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
assert(currentJobBreak.chance === 95, 'current-job chance exceeded its safe cap');

const inheritedBreak = resolveJobSkillLevelConfig(skill, 11, 'inherited');
assert(inheritedBreak.multiplier === 1.98, 'inherited potency and limit break did not combine');
assert(inheritedBreak.chance === 79.2, 'inherited chance and limit break did not combine');

const farBreak = resolveJobSkillLevelConfig(skill, 30, 'base');
assert(farBreak.multiplier === 6, 'limit break growth should stay linear and uncapped');
assert(farBreak.chance === 95, 'generic proc chance became guaranteed');
assert(farBreak.hits === 10, 'multi-hit milestones did not add attacks');

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
    barrierPercent: 60,
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
assert(variedBreak.barrierPercent === 100, 'maximum-HP barrier exceeded its safe cap');
assert(variedBreak.maxDragonSpirit === 6, 'job resource awakening did not increase its cap');
assert(variedBreak.threshold === 25, 'inverse threshold did not improve');
assert(variedBreak.atkMatkMultiplier === 2, 'neutral multiplier did not improve correctly');
assert(variedBreak.hpPercent === 25, 'HP sacrifice must not increase');
assert(variedBreak.duration === 8, 'duration did not gain one turn per 5 limit breaks');

const dangerousEffectSkill = {
  maxLevel: 10,
  levels: [{
    level: 10,
    spCost: 5,
    evadeChance: 40,
    guardChance: 35,
    reduction: 45,
    drainPercent: 20,
    resistancePierce: 40,
    statusResist: 25,
    instantDeathChance: 35,
    spdDown: 40,
    spdPercent: 45,
    buffPercent: 35,
    recoverMp: 20,
    pulseMp: 10,
    restoreMp: 60,
    harmonyPulse: 5,
    revivePercent: 50,
    threshold: 30
  }]
};
const safeDeepBreak = resolveJobSkillLevelConfig(dangerousEffectSkill, 1010, 'base');
assert(safeDeepBreak.evadeChance === 75, 'evasion became effectively permanent');
assert(safeDeepBreak.guardChance === 80, 'auto guard became guaranteed');
assert(safeDeepBreak.reduction === 80, 'damage reduction reached immunity');
assert(safeDeepBreak.drainPercent === 80, 'life drain reached full damage');
assert(safeDeepBreak.resistancePierce === 80, 'resistance pierce erased all resistance');
assert(safeDeepBreak.statusResist === 90, 'status resistance reached immunity');
assert(safeDeepBreak.instantDeathChance === 60, 'instant death chance exceeded its safe cap');
assert(safeDeepBreak.spdDown === 80, 'enemy SPD reduction reached a full shutdown');
assert(safeDeepBreak.spdPercent === 100, 'party SPD bonus grew without a limit');
assert(safeDeepBreak.buffPercent === 100, 'party stat buff grew without a limit');
assert(safeDeepBreak.recoverMp === 80, 'turn-based MP recovery grew without a limit');
assert(safeDeepBreak.pulseMp === 40, 'per-hit MP recovery grew without a limit');
assert(safeDeepBreak.restoreMp === 200, 'direct MP restoration grew without a limit');
assert(safeDeepBreak.harmonyPulse === 20, 'resource-amplified MP recovery grew without a limit');
assert(safeDeepBreak.revivePercent === 80, 'revival became a full heal');
assert(safeDeepBreak.threshold === 10, 'survival threshold reached functional immortality');

const cappedOnlySkill = {
  id: 'capped_only',
  maxLevel: 10,
  limitBreakMaximums: { chance: 30 },
  levels: [{ level: 10, spCost: 5, mpCost: 0, chance: 25 }]
};
assert(canLimitBreakJobSkill(cappedOnlySkill, 10), 'the final useful limit break was blocked');
assert(resolveJobSkillLevelConfig(cappedOnlySkill, 11, 'current').chance === 30, 'custom cap was not applied');
assert(!canLimitBreakJobSkill(cappedOnlySkill, 11), 'a saturated skill still accepted limit breaks');
assert(getJobSkillLevelCost(cappedOnlySkill, 11) === 5, 'the final useful limit break lost its cost');
assert(getJobSkillLevelCost(cappedOnlySkill, 12) === 0, 'a saturated limit break still consumed SP');
const cappedOnlyJob = { id: 'capped_job', skills: [cappedOnlySkill] };
const cappedCharacter = { jobSkills: { capped_job: { capped_only: 11 } } };
const overleveledCappedCharacter = { jobSkills: { capped_job: { capped_only: 50 } } };
assert(
  getSpentJobSP(overleveledCappedCharacter, cappedOnlyJob) === getSpentJobSP(cappedCharacter, cappedOnlyJob),
  'SP spent beyond a semantic cap was not refunded'
);

let negationStep = getStackedAttackNegationStep(0, 75);
assert(negationStep.rollChance === 75 && negationStep.combinedChance === 75,
  'the first attack-negation skill changed probability');
negationStep = getStackedAttackNegationStep(negationStep.combinedChance, 95);
assert(negationStep.rollChance === 40, 'stacked attack-negation conditional chance is invalid');
assert(negationStep.combinedChance === MAX_STACKED_ATTACK_NEGATION_CHANCE,
  'stacked attack-negation skills exceeded the combined cap');
assert(getDefenseAfterIgnore(100, 20) === 80, 'hybrid defense penetration was not applied');
assert(getDefenseAfterIgnore(100, 150) === 0, 'defense penetration exceeded its safe range');

const authoredGuaranteedSkill = {
  maxLevel: 10,
  levels: [{ level: 10, spCost: 5, chance: 100, ailmentChance: 100 }]
};
const preservedAuthoredGuarantee = resolveJobSkillLevelConfig(authoredGuaranteedSkill, 20, 'base');
assert(preservedAuthoredGuarantee.chance === 100, 'authored guaranteed chance was reduced');
assert(preservedAuthoredGuarantee.ailmentChance === 100, 'authored guaranteed ailment was reduced');

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
assert(compoundBreak.reduction === 45, 'guard awakening did not improve fixed reduction');
assert(compoundBreak.defenseIgnorePercent === 55, 'defense bypass awakening is invalid');
assert(compoundBreak.detonationMultiplier === 2, 'conditional multiplier awakening is invalid');
assert(compoundBreak.maxHarmony === 6, 'resource cap awakening is invalid');

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

let milestoneSkillCount = 0;
let milestoneCount = 0;
for (const job of Object.values(JOBS)) {
  for (const jobSkill of job.skills) {
    const milestones = getJobSkillLimitBreakMilestones(jobSkill);
    if (milestones.length > 0) milestoneSkillCount += 1;
    milestoneCount += milestones.length;
    const masterLevel = getJobSkillMasterLevel(jobSkill);
    for (const milestone of milestones.filter(candidate => candidate.bonuses)) {
      const beforeConfig = resolveJobSkillLevelConfig(jobSkill, masterLevel + milestone.breaks - 1, 'base');
      const awakenedConfig = resolveJobSkillLevelConfig(jobSkill, masterLevel + milestone.breaks, 'base');
      for (const key of Object.keys(milestone.bonuses)) {
        assert(
          (Number(awakenedConfig[key]) || 0) > (Number(beforeConfig[key]) || 0),
          `${job.id}/${jobSkill.id} did not apply milestone ${milestone.label}`
        );
      }
      assert(typeof jobSkill.getDescription(awakenedConfig) === 'string',
        `${job.id}/${jobSkill.id} milestone description failed`);
    }
  }
}
assert(milestoneSkillCount >= 75, 'too few skills received awakening milestones');
assert(milestoneCount >= 250, 'the awakening milestone catalogue is incomplete');

const doubleArrow = JOBS.ranger.skills.find(candidate => candidate.id === 'double_arrow');
assert(resolveJobSkillLevelConfig(doubleArrow, 14, 'base').hits === 5,
  'double arrow awakened before its milestone');
assert(resolveJobSkillLevelConfig(doubleArrow, 15, 'base').hits === 6,
  'double arrow did not unlock its first extra hit');
assert(resolveJobSkillLevelConfig(doubleArrow, 25, 'base').hits === 7,
  'double arrow did not unlock its second extra hit');
const nextDoubleArrowMilestone = getNextJobSkillLimitBreakMilestone(doubleArrow, 10);
assert(nextDoubleArrowMilestone?.level === 15 && nextDoubleArrowMilestone.label.includes('攻撃回数'),
  'the next awakening milestone is not visible to the UI');

const slimeThrow = JOBS.slime_master.skills.find(candidate => candidate.id === 'slime_throw');
const awakenedSlimeThrow = resolveJobSkillLevelConfig(slimeThrow, 25, 'base');
assert(awakenedSlimeThrow.slimeThrowsBonus === 2, 'slime throw did not unlock its unique throws');
assert(slimeThrow.getDescription(awakenedSlimeThrow).includes('12回'),
  'slime throw still used the unbounded skill level as its throw count');
const slimeHazard = JOBS.slime_master.skills.find(candidate => candidate.id === 'slime_hazard');
const awakenedSlimeHazard = resolveJobSkillLevelConfig(slimeHazard, 25, 'base');
assert(slimeHazard.getDescription(awakenedSlimeHazard).includes('40体'),
  'slime hazard did not unlock its unique swarm milestone');

const flameTongue = JOBS.magic_knight.skills.find(candidate => candidate.id === 'flame_tongue');
assert(!resolveJobSkillLevelConfig(flameTongue, 19, 'base').defenseIgnorePercent,
  'hybrid defense penetration unlocked before its awakening');
assert(resolveJobSkillLevelConfig(flameTongue, 20, 'base').defenseIgnorePercent === 10,
  'hybrid defense penetration did not unlock');
assert(resolveJobSkillLevelConfig(flameTongue, 35, 'base').defenseIgnorePercent === 20,
  'hybrid defense penetration did not receive its second awakening');

const skyfallDive = JOBS.dragoon.skills.find(candidate => candidate.id === 'skyfall_dive');
assert(resolveJobSkillLevelConfig(skyfallDive, 20, 'base').spiritMultiplier === .78,
  'dragon-spirit finisher did not receive its unique milestone');

let saturatedSkillCount = 0;
for (const job of Object.values(JOBS)) {
  for (const jobSkill of job.skills) {
    const masterLevel = getJobSkillMasterLevel(jobSkill);
    let saturatedLevel = null;
    for (let level = masterLevel; level <= masterLevel + 200; level += 1) {
      if (!canLimitBreakJobSkill(jobSkill, level)) {
        saturatedLevel = level;
        break;
      }
    }
    if (saturatedLevel === null) continue;

    saturatedSkillCount += 1;
    const saturatedConfig = resolveJobSkillLevelConfig(jobSkill, saturatedLevel, 'current');
    const distantConfig = resolveJobSkillLevelConfig(jobSkill, saturatedLevel + 1000, 'current');
    assert(
      Object.keys(distantConfig).every(
        key => key === 'level' || distantConfig[key] === saturatedConfig[key]
      ),
      `${job.id}/${jobSkill.id} was blocked before its final useful limit break`
    );
    assert(
      getJobSkillLevelCost(jobSkill, saturatedLevel + 1) === 0,
      `${job.id}/${jobSkill.id} charged SP after reaching its final effect cap`
    );
  }
}
assert(saturatedSkillCount > 0, 'the all-job audit did not find any semantically capped skill');

const deepConfig = (jobId, skillId) => {
  const jobSkill = JOBS[jobId].skills.find(candidate => candidate.id === skillId);
  return resolveJobSkillLevelConfig(jobSkill, getJobSkillMasterLevel(jobSkill) + 1000, 'current');
};
const stigma = deepConfig('black_knight', 'stigma_of_atonement');
assert(stigma.curseDamageMultiplier === .5, 'atonement stigma erased its damage drawback');
assert(stigma.curseRecoilMultiplier === .1, 'atonement stigma erased its recoil drawback');
assert(deepConfig('black_knight', 'demon_power').atkMatkMultiplier === 3,
  'demon power created an unbounded secondary multiplier');
assert(deepConfig('bird', 'warding_song').amount === 90, 'warding song granted status immunity');
assert(deepConfig('entertainer', 'inspiring_revue').amount === 90,
  'inspiring revue granted status immunity');
assert(deepConfig('slime_singer', 'elastic_refrain').amount === 90,
  'elastic refrain granted status immunity');
assert(deepConfig('slime_master', 'adhesive_substance').spdDown === 80,
  'adhesive substance reduced enemy SPD to its minimum');
assert(deepConfig('dancer', 'opening_act').spdPercent === 100,
  'opening act grew party SPD without a limit');
for (const auraId of ['protection', 'magic_barrier', 'weapon_bless', 'magic_bless']) {
  assert(deepConfig('magic_knight', auraId).percent === 100, `${auraId} grew without a limit`);
}
assert(deepConfig('magic_knight', 'mp_absorb').percent === 80, 'MP absorb reached full damage conversion');

const resistanceCharacter = {
  jobId: 'norvice',
  hp: { max: 100 }, mp: { max: 100 },
  baseStats: { atk: 10, def: 10, matk: 10, mdef: 10, spd: 10 },
  elementResist: { fire: 80 }, ailmentResist: { poison: 80 },
  equipment: { armor: 'test_resistance_armor' }
};
const resistanceEquipment = new Map([['test_resistance_armor', {
  slot: 'armor', elements: { fire: 40 }, ailments: { poison: 40 }
}]]);
const cappedResistanceStats = calcFinalStats(resistanceCharacter, resistanceEquipment);
assert(cappedResistanceStats.elementResist.fire === 90, 'combined elemental resistance reached immunity');
assert(cappedResistanceStats.ailmentResist.poison === 95, 'combined ailment resistance reached immunity');

const restore = JOBS.priest.skills.find(candidate => candidate.id === 'restore');
const masteredRestore = resolveJobSkillLevelConfig(restore, 10, 'base');
const firstRestoreBreak = resolveJobSkillLevelConfig(restore, 11, 'base');
const farRestoreBreak = resolveJobSkillLevelConfig(restore, 21, 'base');
assert(masteredRestore.cleanseCount === 1, 'mastered restore target count changed');
assert(firstRestoreBreak.cleanseCount === 2, 'restore did not gain a second cleanse target');
assert(farRestoreBreak.cleanseCount === 4, 'restore target growth exceeded its intended steps');
assert(canLimitBreakJobSkill(restore, 11), 'a temporary stepped-effect plateau was treated as MAX');

const timedSkill = {
  maxLevel: 10,
  levels: [{ level: 10, spCost: 5, turns: 5, duration: 4, burnTurns: 6, freezeTurns: 1 }]
};
const fourthTimedBreak = resolveJobSkillLevelConfig(timedSkill, 14, 'base');
const fifthTimedBreak = resolveJobSkillLevelConfig(timedSkill, 15, 'base');
const deepTimedBreak = resolveJobSkillLevelConfig(timedSkill, 40, 'base');
assert(fourthTimedBreak.turns === 5, 'turn duration grew before its fifth break');
assert(fifthTimedBreak.turns === 6 && fifthTimedBreak.duration === 5, 'timed effects did not grow at five breaks');
assert(fifthTimedBreak.burnTurns === 7, 'burn duration did not grow at five breaks');
assert(fifthTimedBreak.freezeTurns === 1, 'hard control duration grew too early');
assert(deepTimedBreak.turns === 10 && deepTimedBreak.duration === 9, 'timed effect bonus cap is invalid');
assert(deepTimedBreak.burnTurns === 11, 'burn duration bonus cap is invalid');
assert(deepTimedBreak.freezeTurns === 3, 'freeze duration milestone cap is invalid');

const expectedMilestoneEffects = {
  'norvice/guard': { reduction: 45 },
  'paladin/holy_smite': { drainPercent: 60 },
  'gunner/penetrator': { spillMultiplier: .7 },
  'gunner/quick_reload': { refundPercent: 60 },
  'dragoon/dragon_heart': { maxDragonSpirit: 6 },
  'mana_conductor/conductor_core': { maxHarmony: 6 },
  'entertainer/showstopper': { maxHype: 6 },
  'slime_singer/resonant_gel': { maxNotes: 6 }
};
for (const [skillPath, expected] of Object.entries(expectedMilestoneEffects)) {
  const [jobId, skillId] = skillPath.split('/');
  const jobSkill = JOBS[jobId].skills.find(candidate => candidate.id === skillId);
  const brokenConfig = resolveJobSkillLevelConfig(jobSkill, getJobSkillMasterLevel(jobSkill) + 10, 'base');
  for (const [key, value] of Object.entries(expected)) {
    assert(brokenConfig[key] === value, `${skillPath} scaled compound effect ${key}`);
  }
}

if (typeof print === 'function') print('Job skill limit break tests passed.');
else console.log('Job skill limit break tests passed.');
