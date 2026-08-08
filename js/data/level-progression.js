const BASE_LEVEL_INITIAL_EXP = 10;

/**
 * Return the EXP required to advance from the supplied base level.
 *
 * The old system multiplied the previous requirement by 1.2, causing an
 * exponential runaway. This curve is quadratic instead, so long-term growth
 * remains predictable while the early game stays close to its original pace.
 */
export function getBaseExpToNext(level) {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  return BASE_LEVEL_INITIAL_EXP + Math.floor(((normalizedLevel * normalizedLevel) - 1) / 3);
}

/**
 * Migrate a character's saved EXP threshold to the level-derived curve.
 * The percentage already earned toward the next level is preserved, rather
 * than turning an old oversized EXP remainder into free levels or discarding it.
 */
export function normalizeBaseExpProgress(character) {
  if (!character || typeof character !== 'object') return false;

  const expectedMax = getBaseExpToNext(character.level);
  const savedCurrent = Math.max(0, Math.floor(Number(character.exp?.current) || 0));
  const savedMax = Math.floor(Number(character.exp?.max) || 0);

  if (!character.exp || savedMax <= 0) {
    character.exp = { current: 0, max: expectedMax };
    return true;
  }

  if (savedMax === expectedMax) {
    if (character.exp.current === savedCurrent) return false;
    character.exp.current = savedCurrent;
    return true;
  }

  const progressRatio = Math.min(1, savedCurrent / savedMax);
  character.exp.current = Math.min(expectedMax - 1, Math.floor(expectedMax * progressRatio));
  character.exp.max = expectedMax;
  return true;
}
