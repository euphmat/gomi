import { getBaseExpToNext } from './level-progression.js';
import { canLimitBreakJobSkill } from '../utils/job-skill-potency.js';

export const JOB_EXP_REQUIREMENT_MULTIPLIER = 1.2;

/**
 * Return the JP required to advance from the supplied job level.
 *
 * Job levels use the same quadratic curve as base levels, with a small 20%
 * premium so job progression remains slightly slower than EXP progression.
 */
export function getJobExpToNext(jobLevel) {
  return Math.ceil(getBaseExpToNext(jobLevel) * JOB_EXP_REQUIREMENT_MULTIPLIER);
}

function normalizeProgress(progress, level) {
  const expectedMax = getJobExpToNext(level);
  const savedCurrent = Math.max(0, Math.floor(Number(progress?.current) || 0));
  const savedMax = Math.floor(Number(progress?.max) || 0);

  if (!progress || savedMax <= 0) {
    return { changed: true, value: { current: 0, max: expectedMax } };
  }

  if (savedMax === expectedMax) {
    if (progress.current === savedCurrent) return { changed: false, value: progress };
    progress.current = savedCurrent;
    return { changed: true, value: progress };
  }

  const progressRatio = Math.min(1, savedCurrent / savedMax);
  progress.current = Math.min(expectedMax - 1, Math.floor(expectedMax * progressRatio));
  progress.max = expectedMax;
  return { changed: true, value: progress };
}

/**
 * Migrate the active job and saved jobs from the old exponential JP curve.
 * Progress toward each job's next level is preserved as a percentage.
 */
export function normalizeJobExpProgress(character) {
  if (!character || typeof character !== 'object') return false;

  let changed = false;
  const active = normalizeProgress(character.jp, character.jobLevel);
  if (active.changed) {
    character.jp = active.value;
    changed = true;
  }

  for (const savedJob of Object.values(character.jobLevels || {})) {
    if (!savedJob || typeof savedJob !== 'object') continue;
    const saved = normalizeProgress(savedJob.jp, savedJob.level);
    if (!saved.changed) continue;
    savedJob.jp = saved.value;
    changed = true;
  }

  return changed;
}

/**
 * Return the total SP earned by reaching the given job level.
 *
 * Every job level gained after level 1 grants exactly 1 SP.
 */
export function getTotalJobSP(jobLevel) {
  const level = Math.max(1, Math.floor(Number(jobLevel) || 1));
  return level - 1;
}

/** Return the SP granted when a character reaches the given job level. */
export function getJobLevelUpSP() {
  return 1;
}

/** Return the authored mastery level for a job skill. */
export function getJobSkillMasterLevel(skill) {
  if (!skill?.levels?.length) return 0;
  return Math.max(
    0,
    Math.floor(Number(skill.maxLevel) || skill.levels[skill.levels.length - 1]?.level || 0)
  );
}

/**
 * Return the SP cost of a skill level. Limit breaks reuse the mastered level's
 * cost forever; this makes their SP accounting deterministic and uncapped.
 */
export function getJobSkillLevelCost(skill, level) {
  if (!skill?.levels?.length) return 0;
  const normalizedLevel = Math.max(0, Math.floor(Number(level) || 0));
  if (normalizedLevel <= 0) return 0;

  const authoredConfig = skill.levels.find(candidate => candidate.level === normalizedLevel);
  if (authoredConfig) return Math.max(0, Number(authoredConfig.spCost) || 0);

  if (normalizedLevel > getJobSkillMasterLevel(skill)) {
    if (!canLimitBreakJobSkill(skill)) return 0;
    const masterConfig = skill.levels.find(candidate => candidate.level === getJobSkillMasterLevel(skill))
      || skill.levels[skill.levels.length - 1];
    return Math.max(0, Number(masterConfig?.spCost) || 0);
  }

  return 0;
}

/** Limit breaks unlock only after every skill belonging to the job is mastered. */
export function hasMasteredAllJobSkills(character, job) {
  if (!character || !job?.id || !Array.isArray(job.skills) || job.skills.length === 0) return false;
  const acquiredSkills = character.jobSkills?.[job.id];
  if (!acquiredSkills || typeof acquiredSkills !== 'object') return false;
  return job.skills.every(skill => {
    const level = Math.max(0, Math.floor(Number(acquiredSkills[skill.id]) || 0));
    return level >= getJobSkillMasterLevel(skill);
  });
}

/** Return SP already spent on the supplied job's acquired skill levels. */
export function getSpentJobSP(character, job) {
  if (!character || !job?.id || !Array.isArray(job.skills)) return 0;
  const acquiredSkills = character.jobSkills?.[job.id];
  if (!acquiredSkills || typeof acquiredSkills !== 'object') return 0;

  let spentSP = 0;
  for (const [skillId, acquiredLevel] of Object.entries(acquiredSkills)) {
    const skill = job.skills.find(candidate => candidate.id === skillId);
    if (!skill) continue;
    const normalizedLevel = Math.max(0, Math.floor(Number(acquiredLevel) || 0));
    const masterLevel = getJobSkillMasterLevel(skill);
    for (const levelConfig of skill.levels) {
      if (levelConfig.level > normalizedLevel || levelConfig.level > masterLevel) continue;
      spentSP += Math.max(0, Number(levelConfig.spCost) || 0);
    }
    if (normalizedLevel > masterLevel) {
      spentSP += (normalizedLevel - masterLevel) * getJobSkillLevelCost(skill, masterLevel + 1);
    }
  }
  return spentSP;
}

/** Return the remaining spent-SP excess that future job levels must offset. */
export function getJobSPOffset(character, job, jobLevel = character?.jobLevel) {
  return Math.max(0, getSpentJobSP(character, job) - getTotalJobSP(jobLevel));
}

/**
 * Return currently spendable SP under the 1-SP-per-level rule.
 *
 * Existing skills are never removed. If their cost exceeds the new total,
 * later level-up SP pays down that over-allocation before becoming spendable.
 */
export function getAvailableJobSP(character, job, jobLevel = character?.jobLevel) {
  return Math.max(0, getTotalJobSP(jobLevel) - getSpentJobSP(character, job));
}

/**
 * Plan a balanced SP allocation across every authored skill in a job.
 *
 * Lower-level skills are raised first, one level at a time. Skills whose next
 * level is currently unaffordable are skipped so the remaining SP can still be
 * used. Limit-break levels are deliberately excluded because they have no cap.
 */
export function planBalancedJobSkillAcquisition(character, job, availableSp = character?.sp) {
  const remainingSkills = Array.isArray(job?.skills)
    ? job.skills.map((skill, index) => ({
      skill,
      index,
      level: Math.max(0, Math.floor(Number(character?.jobSkills?.[job.id]?.[skill.id]) || 0)),
      masterLevel: getJobSkillMasterLevel(skill)
    }))
    : [];
  let remainingSp = Math.max(0, Math.floor(Number(availableSp) || 0));
  let spentSp = 0;
  let levelsGained = 0;
  const updates = {};

  while (remainingSp > 0) {
    const candidates = remainingSkills
      .filter(candidate => candidate.level < candidate.masterLevel)
      .sort((a, b) => a.level - b.level || a.index - b.index);
    const candidate = candidates.find(({ skill, level }) => (
      getJobSkillLevelCost(skill, level + 1) <= remainingSp
    ));
    if (!candidate) break;

    const cost = getJobSkillLevelCost(candidate.skill, candidate.level + 1);
    candidate.level += 1;
    remainingSp -= cost;
    spentSp += cost;
    levelsGained += 1;
    updates[candidate.skill.id] = candidate.level;
  }

  return {
    updates,
    spentSp,
    remainingSp,
    levelsGained,
    affectedSkills: Object.keys(updates).length
  };
}

/** Remove legacy-bonus metadata written by the superseded migration. */
export function clearLegacyJobSpBonus(character) {
  if (!character || typeof character !== 'object') return false;
  let changed = false;
  for (const key of ['jobSpLegacyBonuses', 'jobSpProgressionVersion']) {
    if (!Object.prototype.hasOwnProperty.call(character, key)) continue;
    delete character[key];
    changed = true;
  }
  return changed;
}
