/**
 * Calculates the recovery fee for one character.
 *
 * Levels 1-10 stay at 1 G per level so that resting is affordable at the
 * beginning of the game. After that, the quadratic curve makes defeat an
 * increasingly meaningful Gold sink in the mid and late game.
 */
export function calculateInnFee(level) {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  return Math.max(normalizedLevel, Math.round((normalizedLevel ** 2) / 10));
}

/** Calculates the combined recovery fee for a group of characters. */
export function calculatePartyInnFee(characters) {
  return characters.reduce((total, character) => {
    return total + calculateInnFee(character?.level);
  }, 0);
}
