import { getBaseExpToNext } from './level-progression.js';

export const JOB_EXP_REQUIREMENT_MULTIPLIER = 1.2;
export const JOB_SP_PROGRESSION_VERSION = 2;

const LEGACY_DOUBLE_SP_JOB_LEVEL = 31;
const LEGACY_TRIPLE_SP_JOB_LEVEL = 41;

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

function getLegacyTotalJobSP(jobLevel) {
  const level = Math.max(1, Math.floor(Number(jobLevel) || 1));
  const levelUpCount = level - 1;
  const doubleSpLevelUpCount = Math.max(0, level - LEGACY_DOUBLE_SP_JOB_LEVEL + 1);
  const tripleSpLevelUpCount = Math.max(0, level - LEGACY_TRIPLE_SP_JOB_LEVEL + 1);
  return levelUpCount + doubleSpLevelUpCount + tripleSpLevelUpCount;
}

/** Return the total usable SP, including SP grandfathered from the old rules. */
export function getJobTotalSP(character, jobId, jobLevel) {
  const legacyBonus = Math.max(0, Math.floor(Number(character?.jobSpLegacyBonuses?.[jobId]) || 0));
  return getTotalJobSP(jobLevel) + legacyBonus;
}

/**
 * Preserve SP already earned under the former 2x/3x high-level rules.
 * Future job levels still add only 1 SP after this one-time migration.
 */
export function normalizeJobSpProgression(character) {
  if (!character || typeof character !== 'object') return false;
  if (Number(character.jobSpProgressionVersion) >= JOB_SP_PROGRESSION_VERSION) return false;

  const legacyBonuses = character.jobSpLegacyBonuses
    && !Array.isArray(character.jobSpLegacyBonuses)
    && typeof character.jobSpLegacyBonuses === 'object'
    ? character.jobSpLegacyBonuses
    : {};

  const preserveLegacyBonus = (jobId, jobLevel) => {
    if (!jobId) return;
    const bonus = Math.max(0, getLegacyTotalJobSP(jobLevel) - getTotalJobSP(jobLevel));
    if (bonus > (Number(legacyBonuses[jobId]) || 0)) legacyBonuses[jobId] = bonus;
  };

  preserveLegacyBonus(character.jobId, character.jobLevel);
  for (const [jobId, savedJob] of Object.entries(character.jobLevels || {})) {
    if (!savedJob || typeof savedJob !== 'object') continue;
    preserveLegacyBonus(jobId, savedJob.level);
  }

  character.jobSpLegacyBonuses = legacyBonuses;
  character.jobSpProgressionVersion = JOB_SP_PROGRESSION_VERSION;
  return true;
}
