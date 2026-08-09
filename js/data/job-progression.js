import { getBaseExpToNext } from './level-progression.js';

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
    for (let level = 1; level <= normalizedLevel; level++) {
      const levelConfig = skill.levels.find(candidate => candidate.level === level);
      spentSP += Math.max(0, Number(levelConfig?.spCost) || 0);
    }
  }
  return spentSP;
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
