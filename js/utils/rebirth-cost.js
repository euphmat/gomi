const REBIRTH_MIN_COST = 10000;
const VITAL_STAT_WEIGHT = 0.2;
const COST_STEP = 100;

const getStat = (value) => Math.max(0, Number(value) || 0);

/**
 * Returns a character's equipment-free power used to price rebirth.
 * HP and MP are weighted down because their natural values are much larger
 * than the other base stats. Permanent rebirth bonuses are included so that
 * every rebirth becomes progressively more expensive.
 */
export function calculateRebirthPower(character) {
  const bonus = character?.rebirthBonus || {};
  const hp = getStat(character?.hp?.max) + getStat(bonus.hp);
  const mp = getStat(character?.mp?.max) + getStat(bonus.mp);
  const baseStats = character?.baseStats || {};
  const combatStats = ['atk', 'def', 'matk', 'mdef', 'spd'].reduce((total, stat) => {
    return total + getStat(baseStats[stat]) + getStat(bonus[stat]);
  }, 0);

  return Math.max(1, Math.floor((hp + mp) * VITAL_STAT_WEIGHT + combatStats));
}

/**
 * Rebirth costs at least 10,000 G, then grows quadratically with permanent
 * equipment-free power. The result is rounded up to the next 100 G.
 */
export function calculateRebirthCost(character) {
  const power = calculateRebirthPower(character);
  const scaledCost = Math.ceil((power ** 2 / 10) / COST_STEP) * COST_STEP;
  return Math.max(REBIRTH_MIN_COST, scaledCost);
}
