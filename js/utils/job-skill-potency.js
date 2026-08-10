export const CURRENT_JOB_SKILL_POTENCY = 1.10;
export const INHERITED_SKILL_POTENCY = 0.90;
export const JOB_SKILL_LIMIT_BREAK_GROWTH = 0.10;

const POTENCY_BY_MODE = Object.freeze({
  current: CURRENT_JOB_SKILL_POTENCY,
  inherited: INHERITED_SKILL_POTENCY,
  base: 1
});

// Only values that express beneficial output belong here. Costs, hit counts and
// durations deliberately keep their authored value.
const INTEGER_EFFECT_KEYS = new Set([
  'amount', 'bonusDef', 'bonusHp', 'bonusMatk', 'bonusMdef', 'bonusMp',
  'bonusSpd', 'harmonyPulse', 'healAmount', 'mdefAmount', 'pulseMp',
  'recoverAmount', 'recoverHp', 'recoverMp', 'regenHp', 'restoreMp'
]);

const DECIMAL_EFFECT_KEYS = new Set([
  'atkReduce', 'barrierMatkPercent', 'barrierPercent', 'bossMultiplier',
  'bonusDefPercent', 'bonusHpPercent', 'bonusMatkPercent', 'bonusMdefPercent',
  'bonusMpPercent', 'buffPercent', 'burnChance', 'burningTargetDamagePercent',
  'chainBonusPerHitPercent', 'chance', 'curseChance', 'defenseRatio', 'defPercent', 'defReduce',
  'corpseDamagePercent',
  'detonationMultiplier', 'drainPercent', 'evadeChance', 'finisherChance',
  'fireDamagePercent', 'fireResistPercent', 'freezeChance', 'frozenTargetDamagePercent',
  'guardChance', 'harmonyMultiplier', 'iceDamagePercent', 'iceResistPercent',
  'healMatkPercent', 'instantDeathBonus', 'instantDeathChance',
  'lowHpDamagePercent', 'matkRatio', 'maxChainBonusPercent', 'multiplier', 'shatterMultiplier',
  'ailmentChance', 'ailmentResistPercent', 'resistancePierce', 'statusDamagePercent',
  'paralysisChance', 'percent', 'reducePercent', 'reduction', 'revivePercent',
  'sleepingTargetDamagePercent', 'spdDown', 'spdPercent', 'statusResist', 'waterDamagePercent',
  'spreadChance',
  'waterResistPercent', 'natureDamagePercent', 'natureResistPercent'
]);

const PERCENTAGE_KEYS = new Set([
  'atkReduce', 'barrierMatkPercent', 'barrierPercent', 'bonusDefPercent',
  'bonusHpPercent', 'bonusMatkPercent', 'bonusMdefPercent', 'bonusMpPercent',
  'buffPercent', 'burnChance', 'burningTargetDamagePercent',
  'chainBonusPerHitPercent', 'chance', 'curseChance', 'defPercent', 'defReduce',
  'corpseDamagePercent',
  'drainPercent', 'evadeChance', 'finisherChance', 'fireDamagePercent',
  'fireResistPercent', 'freezeChance', 'frozenTargetDamagePercent', 'guardChance',
  'healMatkPercent', 'iceDamagePercent', 'iceResistPercent', 'instantDeathBonus',
  'instantDeathChance', 'lowHpDamagePercent', 'maxChainBonusPercent',
  'ailmentChance', 'ailmentResistPercent', 'resistancePierce', 'statusDamagePercent', 'spreadChance',
  'paralysisChance', 'percent', 'reducePercent', 'reduction', 'revivePercent',
  'sleepingTargetDamagePercent', 'spdDown', 'spdPercent', 'statusResist', 'waterDamagePercent',
  'waterResistPercent', 'natureDamagePercent', 'natureResistPercent'
]);

// These values describe improvement away from a neutral/default multiplier.
// Scaling the raw value would make the drawback stronger instead of the skill.
const NEUTRAL_MULTIPLIER_KEYS = new Map([
  ['atkMatkMultiplier', 1],
  ['curseDamageMultiplier', 2],
  ['curseRecoilMultiplier', 0.4]
]);

// Lower values make these effects stronger. At present this is used only by
// Slime Core, whose HP threshold is the passive's entire scalable benefit.
const INVERSE_EFFECT_KEYS = new Set(['threshold']);

// Limit breaks deliberately leave resource costs, animation-heavy hit counts,
// and durations at their authored maximum. Every other numeric field in a
// level config represents skill potency and grows linearly without a level cap.
// Keeping this as an exclusion list also lets future jobs participate without
// having to register every new damage/status field here.
const LIMIT_BREAK_FIXED_KEYS = new Set([
  'level', 'spCost', 'mpCost', 'hits', 'minHits', 'maxHits',
  'turns', 'duration', 'burnTurns', 'freezeTurns', 'extensionTurns',
  // Blood-cost percentage: increasing it would make the skill worse.
  'hpPercent'
]);

const LIMIT_BREAK_INTEGER_KEYS = new Set([
  ...INTEGER_EFFECT_KEYS,
  'bonusAtk', 'maxDragonSpirit', 'maxHarmony', 'maxHype', 'maxNotes'
]);

const LIMIT_BREAK_PERCENTAGE_KEYS = new Set([
  'ailmentChance', 'ailmentResistPercent', 'atkReduce', 'bindChance',
  'burnChance', 'chance', 'curseChance', 'defReduce', 'defenseIgnorePercent',
  'drainPercent', 'evadeChance', 'finisherChance', 'fireResistPercent',
  'freezeChance', 'guardChance', 'iceResistPercent', 'instantDeathBonus',
  'instantDeathChance', 'natureResistPercent', 'paralysisChance',
  'reducePercent', 'reduction', 'refundPercent', 'resistancePierce',
  'revivePercent', 'skillDefenseIgnorePercent', 'spreadChance', 'spdDown',
  'statusResist', 'waterResistPercent'
]);

const round = (value, digits = 3) => {
  const scale = 10 ** digits;
  return Math.round((value + Number.EPSILON) * scale) / scale;
};

export function getJobSkillPotency(mode) {
  return POTENCY_BY_MODE[mode] || 1;
}

export function isJobSkillPotencyEffectKey(key) {
  return INTEGER_EFFECT_KEYS.has(key)
    || DECIMAL_EFFECT_KEYS.has(key)
    || NEUTRAL_MULTIPLIER_KEYS.has(key)
    || INVERSE_EFFECT_KEYS.has(key);
}

export function applyJobSkillPotency(levelConfig, mode = 'base') {
  if (!levelConfig || mode === 'base') return levelConfig;
  const factor = getJobSkillPotency(mode);
  const adjusted = { ...levelConfig };

  for (const [key, value] of Object.entries(levelConfig)) {
    if (!Number.isFinite(value)) continue;

    if (INTEGER_EFFECT_KEYS.has(key)) {
      adjusted[key] = Math.max(0, Math.round(value * factor));
      continue;
    }

    if (DECIMAL_EFFECT_KEYS.has(key)) {
      const scaled = round(value * factor);
      adjusted[key] = PERCENTAGE_KEYS.has(key) ? Math.min(100, Math.max(0, scaled)) : scaled;
      continue;
    }

    if (NEUTRAL_MULTIPLIER_KEYS.has(key)) {
      const neutral = NEUTRAL_MULTIPLIER_KEYS.get(key);
      adjusted[key] = round(neutral + (value - neutral) * factor);
      continue;
    }

    if (INVERSE_EFFECT_KEYS.has(key)) {
      adjusted[key] = Math.min(100, Math.max(0, Math.round(value / factor)));
    }
  }

  return adjusted;
}

/**
 * Scale the authored maximum config for levels beyond a skill's normal cap.
 * Each limit break adds 10% of the mastered effect, so growth stays linear and
 * remains useful indefinitely without making costs, durations, or hit counts
 * explode. Probabilities and percentage reductions are capped at 100%.
 */
export function applyJobSkillLimitBreak(levelConfig, limitBreakLevel = 0) {
  const breaks = Math.max(0, Math.floor(Number(limitBreakLevel) || 0));
  if (!levelConfig || breaks === 0) return levelConfig;

  const factor = 1 + breaks * JOB_SKILL_LIMIT_BREAK_GROWTH;
  const adjusted = { ...levelConfig };

  for (const [key, value] of Object.entries(levelConfig)) {
    if (!Number.isFinite(value) || LIMIT_BREAK_FIXED_KEYS.has(key)) continue;

    if (INVERSE_EFFECT_KEYS.has(key)) {
      adjusted[key] = Math.min(100, Math.max(0, round(value / factor)));
      continue;
    }

    if (NEUTRAL_MULTIPLIER_KEYS.has(key)) {
      const neutral = NEUTRAL_MULTIPLIER_KEYS.get(key);
      adjusted[key] = round(neutral + (value - neutral) * factor);
      continue;
    }

    const scaled = LIMIT_BREAK_INTEGER_KEYS.has(key)
      ? Math.max(0, Math.round(value * factor))
      : round(value * factor);
    adjusted[key] = LIMIT_BREAK_PERCENTAGE_KEYS.has(key)
      ? Math.min(100, Math.max(0, scaled))
      : scaled;
  }

  return adjusted;
}

export function resolveJobSkillLevelConfig(skillDef, level, mode = 'base') {
  if (!skillDef?.levels?.length) return null;
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  const maxLevel = Math.max(
    1,
    Math.floor(Number(skillDef.maxLevel) || skillDef.levels[skillDef.levels.length - 1].level || 1)
  );
  const authoredConfig = skillDef.levels.find(candidate => candidate.level === normalizedLevel)
    || skillDef.levels[skillDef.levels.length - 1];
  const limitBreakLevel = Math.max(0, normalizedLevel - maxLevel);
  const potentConfig = applyJobSkillPotency({ ...authoredConfig, level: normalizedLevel }, mode);
  return applyJobSkillLimitBreak(potentConfig, limitBreakLevel);
}
