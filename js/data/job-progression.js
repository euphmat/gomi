export const DOUBLE_SP_JOB_LEVEL = 31;
export const TRIPLE_SP_JOB_LEVEL = 41;

/**
 * Return the total SP earned by reaching the given job level.
 *
 * Job levels 2-30 grant 1 SP each, levels 31-40 grant 2 SP each,
 * and reaching job level 41 or higher grants 3 SP per level.
 */
export function getTotalJobSP(jobLevel) {
  const level = Math.max(1, Math.floor(Number(jobLevel) || 1));
  const levelUpCount = level - 1;
  const doubleSpLevelUpCount = Math.max(0, level - DOUBLE_SP_JOB_LEVEL + 1);
  const tripleSpLevelUpCount = Math.max(0, level - TRIPLE_SP_JOB_LEVEL + 1);
  return levelUpCount + doubleSpLevelUpCount + tripleSpLevelUpCount;
}

/** Return the SP granted when a character reaches the given job level. */
export function getJobLevelUpSP(jobLevel) {
  const level = Math.max(1, Math.floor(Number(jobLevel) || 1));
  if (level >= TRIPLE_SP_JOB_LEVEL) return 3;
  return level >= DOUBLE_SP_JOB_LEVEL ? 2 : 1;
}
