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
  const livingEntities = entities.filter(entity => entity && !entity.isDead);
  if (livingEntities.length === 0) return 1;

  const totalSpd = livingEntities.reduce(
    (total, entity) => total + getEffectiveBattleSpd(entity),
    0
  );
  return totalSpd / livingEntities.length;
}

export function getAtbSpeedMultiplier(spd, averageSpd) {
  const safeSpd = Number.isFinite(spd) ? Math.max(1, spd) : 1;
  const safeAverage = Number.isFinite(averageSpd) ? Math.max(1, averageSpd) : 1;
  const normalizedSpd = Math.min(safeSpd / safeAverage, MAX_NORMALIZED_SPD);

  return MIN_ATB_SPEED_MULTIPLIER
    + (1 - MIN_ATB_SPEED_MULTIPLIER) * normalizedSpd;
}
