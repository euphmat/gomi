export const DOUBLE_SP_JOB_LEVEL = 40;

/**
 * Return the total SP earned by reaching the given job level.
 *
 * Job levels 2-39 grant 1 SP each. Reaching job level 40 and every
 * subsequent job level grants 2 SP.
 */
export function getTotalJobSP(jobLevel) {
  const level = Math.max(1, Math.floor(Number(jobLevel) || 1));
  const levelUpCount = level - 1;
  const doubleSpLevelUpCount = Math.max(0, level - DOUBLE_SP_JOB_LEVEL + 1);
  return levelUpCount + doubleSpLevelUpCount;
}

/** Return the SP granted when a character reaches the given job level. */
export function getJobLevelUpSP(jobLevel) {
  const level = Math.max(1, Math.floor(Number(jobLevel) || 1));
  return level >= DOUBLE_SP_JOB_LEVEL ? 2 : 1;
}
