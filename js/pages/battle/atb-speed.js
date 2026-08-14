/**
 * ATB speed balancing helpers.
 *
 * Half of every entity's ATB gain is guaranteed regardless of SPD. The other
 * half scales with SPD relative to the living combatants, with an upper bound
 * so an extreme outlier cannot permanently lock everyone else out of turns.
 */
export const MIN_ATB_SPEED_MULTIPLIER = 0.5;
export const MAX_NORMALIZED_SPD = 3;

export function getEffectiveBattleSpd(entity) {
  const rawSpd = entity?.stats?.spd;
  const baseSpd = Number.isFinite(rawSpd) ? rawSpd : 1;
  const buffPercent = Number.isFinite(entity?._passiveSpdBuffPercent)
    ? entity._passiveSpdBuffPercent
    : 0;

  return Math.max(1, Math.floor(baseSpd * (1 + buffPercent / 100)));
}

export function getAverageBattleSpd(entities) {
  let livingCount = 0;
  let totalSpd = 0;
  for (const entity of entities || []) {
    if (!entity || entity.isDead) continue;
    livingCount += 1;
    totalSpd += getEffectiveBattleSpd(entity);
  }
  return livingCount > 0 ? totalSpd / livingCount : 1;
}

export function getAtbSpeedMultiplier(spd, averageSpd) {
  const safeSpd = Number.isFinite(spd) ? Math.max(1, spd) : 1;
  const safeAverage = Number.isFinite(averageSpd) ? Math.max(1, averageSpd) : 1;
  const normalizedSpd = Math.min(safeSpd / safeAverage, MAX_NORMALIZED_SPD);

  return MIN_ATB_SPEED_MULTIPLIER
    + (1 - MIN_ATB_SPEED_MULTIPLIER) * normalizedSpd;
}

/**
 * Return the number of identical ATB advances needed before somebody can act.
 *
 * Fast-forward battle used to repeat the full party/enemy scan up to 50 times
 * per timer callback. ATB gain is constant during that scan, so jumping to the
 * first threshold is mathematically equivalent and keeps the same actor order.
 */
export function getAtbAdvanceSteps(entries, maxSteps = 1) {
  const boundedMax = Math.max(1, Math.floor(Number(maxSteps) || 1));
  let advanceSteps = boundedMax;

  for (const entry of entries || []) {
    const entity = entry?.entity;
    const gain = Number(entry?.gain);
    if (!entity || entity.isDead || !Number.isFinite(gain) || gain <= 0) continue;

    const currentAtb = Number.isFinite(entity.atb) ? entity.atb : 0;
    const stepsToReady = Math.max(1, Math.ceil((1000 - currentAtb) / gain));
    advanceSteps = Math.min(advanceSteps, stepsToReady);
  }

  return advanceSteps;
}
