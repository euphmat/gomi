export const CURRENT_JOB_SKILL_POTENCY = 1.10;
export const INHERITED_SKILL_POTENCY = 0.90;

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
  'detonationMultiplier', 'drainPercent', 'evadeChance', 'finisherChance',
  'fireDamagePercent', 'fireResistPercent', 'freezeChance', 'frozenTargetDamagePercent',
  'guardChance', 'harmonyMultiplier', 'iceDamagePercent', 'iceResistPercent',
  'healMatkPercent', 'instantDeathBonus', 'instantDeathChance',
  'lowHpDamagePercent', 'matkRatio', 'maxChainBonusPercent', 'multiplier', 'shatterMultiplier',
  'paralysisChance', 'percent', 'reducePercent', 'reduction', 'revivePercent',
  'sleepingTargetDamagePercent', 'spdDown', 'spdPercent', 'statusResist', 'waterDamagePercent',
  'waterResistPercent', 'natureDamagePercent', 'natureResistPercent'
]);

const PERCENTAGE_KEYS = new Set([
  'atkReduce', 'barrierMatkPercent', 'barrierPercent', 'bonusDefPercent',
  'bonusHpPercent', 'bonusMatkPercent', 'bonusMdefPercent', 'bonusMpPercent',
  'buffPercent', 'burnChance', 'burningTargetDamagePercent',
  'chainBonusPerHitPercent', 'chance', 'curseChance', 'defPercent', 'defReduce',
  'drainPercent', 'evadeChance', 'finisherChance', 'fireDamagePercent',
  'fireResistPercent', 'freezeChance', 'frozenTargetDamagePercent', 'guardChance',
  'healMatkPercent', 'iceDamagePercent', 'iceResistPercent', 'instantDeathBonus',
  'instantDeathChance', 'lowHpDamagePercent', 'maxChainBonusPercent',
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

export function resolveJobSkillLevelConfig(skillDef, level, mode = 'base') {
  if (!skillDef?.levels?.length) return null;
  const config = skillDef.levels.find(candidate => candidate.level === level)
    || skillDef.levels[skillDef.levels.length - 1];
  return applyJobSkillPotency(config, mode);
}
