export const CURRENT_JOB_SKILL_POTENCY = 1.10;
export const INHERITED_SKILL_POTENCY = 0.90;
export const JOB_SKILL_LIMIT_BREAK_GROWTH = 0.10;
const LIMIT_BREAK_SATURATION_PROBE = 10000;

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
// durations and structural combat rules at their authored maximum. Scaling a
// primary damage multiplier together with another multiplier applied on top of
// it makes the real result quadratic. Resource caps have the same problem when
// both the cap and the per-resource bonus grow.
const LIMIT_BREAK_FIXED_KEYS = new Set([
  'level', 'spCost', 'mpCost', 'hits', 'minHits', 'maxHits',
  'bossMultiplier', 'detonationMultiplier', 'highHpMultiplier', 'shatterMultiplier',
  'matkRatio', 'defenseRatio', 'harmonyMultiplier', 'hypeMultiplier',
  'noteMultiplier', 'spiritMultiplier', 'sigilBonus',
  'defenseIgnorePercent', 'skillDefenseIgnorePercent',
  'maxDragonSpirit', 'maxHarmony', 'maxHype', 'maxNotes',
  // Blood-cost percentage: increasing it would make the skill worse.
  'hpPercent'
]);

// Turn counts grow in small steps instead of with the full potency factor.
// This keeps support limit breaks worthwhile without allowing long control or
// defensive effects to scale multiplicatively with their strength.
const LIMIT_BREAK_STEPPED_KEYS = new Map([
  ['turns', { every: 5, maxBonus: 5 }],
  ['duration', { every: 5, maxBonus: 5 }],
  ['burnTurns', { every: 5, maxBonus: 5 }],
  ['extensionTurns', { every: 5, maxBonus: 4 }],
  ['freezeTurns', { every: 10, maxBonus: 2 }],
  // Restore gains its first extra target immediately, then one every 5 breaks.
  ['cleanseCount', { every: 5, maxBonus: 3, immediate: true }]
]);

const LIMIT_BREAK_MILESTONE_LABELS = Object.freeze({
  turns: '効果時間 +1ターン',
  duration: '持続回数 +1',
  burnTurns: '火傷時間 +1ターン',
  extensionTurns: '病勢延長 +1ターン',
  freezeTurns: '凍結時間 +1ターン',
  cleanseCount: '状態異常解除数 +1'
});

// Milestones make structural and compound effects grow at memorable break
// points instead of scaling them every level. Values here are cumulative: each
// reached entry is added once to the mastered configuration.
const LIMIT_BREAK_MILESTONE_RULES = Object.freeze([
  { key: 'hits', entries: [[5, 1, '攻撃回数 +1'], [15, 1, '攻撃回数 +1']] },
  { key: 'maxHits', entries: [[5, 1, '最大攻撃回数 +1'], [25, 1, '最大攻撃回数 +1']] },
  { key: 'minHits', entries: [[15, 1, '最低攻撃回数 +1']] },
  { key: 'maxDragonSpirit', entries: [[10, 1, '竜気上限 +1'], [25, 1, '竜気上限 +1']] },
  { key: 'maxHarmony', entries: [[10, 1, '共鳴上限 +1'], [25, 1, '共鳴上限 +1']] },
  { key: 'maxHype', entries: [[10, 1, '舞台熱上限 +1'], [25, 1, '舞台熱上限 +1']] },
  { key: 'maxNotes', entries: [[10, 1, 'ぷるぷる音符上限 +1'], [25, 1, 'ぷるぷる音符上限 +1']] },
  { key: 'detonationMultiplier', entries: [[10, .25, '燃焼爆発倍率 +0.25'], [25, .25, '燃焼爆発倍率 +0.25']] },
  { key: 'shatterMultiplier', entries: [[10, .25, '凍結粉砕倍率 +0.25'], [25, .25, '凍結粉砕倍率 +0.25']] },
  { key: 'highHpMultiplier', entries: [[10, .15, '高HP特効倍率 +0.15'], [25, .15, '高HP特効倍率 +0.15']] },
  { key: 'matkRatio', entries: [[10, .10, 'MATK複合比率 +10%'], [25, .10, 'MATK複合比率 +10%']] },
  { key: 'defenseRatio', entries: [[10, .10, '防御攻撃変換率 +10%'], [25, .10, '防御攻撃変換率 +10%']] },
  { key: 'harmonyMultiplier', entries: [[10, .05, '共鳴1個の威力 +5%'], [25, .05, '共鳴1個の威力 +5%']] },
  { key: 'hypeMultiplier', entries: [[10, .05, '舞台熱1個の威力 +5%'], [25, .05, '舞台熱1個の威力 +5%']] },
  { key: 'noteMultiplier', entries: [[10, .08, '音符1個の威力 +0.08倍'], [25, .08, '音符1個の威力 +0.08倍']] },
  { key: 'spiritMultiplier', entries: [[10, .10, '竜気1個の威力 +0.10倍'], [25, .10, '竜気1個の威力 +0.10倍']] },
  { key: 'sigilBonus', entries: [[10, .05, '属性印の威力 +5%'], [25, .05, '属性印の威力 +5%']] },
  { key: 'defenseIgnorePercent', entries: [[10, 5, '防御無視 +5%'], [25, 5, '防御無視 +5%']] },
  { key: 'skillDefenseIgnorePercent', entries: [[10, 5, 'スキル防御無視 +5%'], [25, 5, 'スキル防御無視 +5%']] },
  { key: 'bossMultiplier', entries: [[10, .10, '即死無効への倍率 +0.10'], [25, .10, '即死無効への倍率 +0.10']] },
  { key: 'spillMultiplier', requiresFixed: true, entries: [[10, .10, '貫通ダメージ +10%'], [25, .10, '貫通ダメージ +10%']] },
  { key: 'refundPercent', requiresFixed: true, entries: [[10, 10, 'MP再装填率 +10%'], [25, 10, 'MP再装填率 +10%']] },
  { key: 'drainPercent', requiresFixed: true, entries: [[10, 10, 'HP吸収率 +10%'], [25, 10, 'HP吸収率 +10%']] },
  { key: 'reduction', requiresFixed: true, entries: [[10, 5, 'ガード軽減率 +5%'], [25, 5, 'ガード軽減率 +5%']] }
]);

const LIMIT_BREAK_INTEGER_KEYS = new Set([
  ...INTEGER_EFFECT_KEYS,
  'bonusAtk'
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

// Limit breaks must never turn a probabilistic or mitigating effect into a
// permanent combat rule. Authored mastery values are preserved even when they
// already exceed one of these caps; the caps only restrict additional growth.
const LIMIT_BREAK_MAXIMUMS = new Map([
  ['chance', 95],
  ['evadeChance', 75],
  ['guardChance', 80],
  ['instantDeathChance', 60],
  ['finisherChance', 60],
  ['instantDeathBonus', 40],
  ['reduction', 80],
  ['reducePercent', 80],
  ['atkReduce', 80],
  ['defReduce', 80],
  ['drainPercent', 80],
  ['refundPercent', 80],
  ['resistancePierce', 80],
  ['statusResist', 90],
  ['ailmentResistPercent', 90],
  ['fireResistPercent', 90],
  ['iceResistPercent', 90],
  ['natureResistPercent', 90],
  ['waterResistPercent', 90],
  ['ailmentChance', 95],
  ['bindChance', 95],
  ['burnChance', 95],
  ['curseChance', 95],
  ['freezeChance', 95],
  ['paralysisChance', 95],
  ['spreadChance', 95],
  ['spdDown', 80],
  ['spdPercent', 100],
  ['percent', 100],
  ['barrierPercent', 100],
  ['barrierMatkPercent', 200],
  ['buffPercent', 100],
  ['defPercent', 100],
  ['atkMatkMultiplier', 3],
  ['revivePercent', 80],
  ['recoverMp', 80],
  ['pulseMp', 40],
  ['recoverAmount', 100],
  ['restoreMp', 200],
  ['harmonyPulse', 20]
]);

const LIMIT_BREAK_MINIMUMS = new Map([
  // At zero, Slime Core would trigger again even from 1 HP and make its owner
  // functionally immortal. Keeping a real HP threshold preserves counterplay.
  ['threshold', 10]
]);

const round = (value, digits = 3) => {
  const scale = 10 ** digits;
  return Math.round((value + Number.EPSILON) * scale) / scale;
};

function getMasteredJobSkillConfig(skillDef) {
  if (!skillDef?.levels?.length) return null;
  const maxLevel = Math.max(
    1,
    Math.floor(Number(skillDef.maxLevel) || skillDef.levels[skillDef.levels.length - 1].level || 1)
  );
  return skillDef.levels.find(candidate => candidate.level === maxLevel)
    || skillDef.levels[skillDef.levels.length - 1];
}

/** Return every structural/unique bonus unlocked at limit-break milestones. */
export function getJobSkillLimitBreakMilestones(skillDef) {
  const masterConfig = getMasteredJobSkillConfig(skillDef);
  if (!masterConfig) return [];
  const milestones = [];

  for (const [key, rule] of LIMIT_BREAK_STEPPED_KEYS) {
    if (!Number.isFinite(masterConfig[key])) continue;
    for (let bonus = 1; bonus <= rule.maxBonus; bonus += 1) {
      const breaks = rule.immediate ? 1 + (bonus - 1) * rule.every : bonus * rule.every;
      milestones.push({
        breaks,
        label: LIMIT_BREAK_MILESTONE_LABELS[key] || `${key} +1`,
        bonuses: null
      });
    }
  }

  for (const rule of LIMIT_BREAK_MILESTONE_RULES) {
    if (!Number.isFinite(masterConfig[rule.key])) continue;
    if (rule.requiresFixed && !(skillDef.limitBreakFixedKeys || []).includes(rule.key)) continue;
    for (const [breaks, amount, label] of rule.entries) {
      milestones.push({ breaks, label, bonuses: { [rule.key]: amount } });
    }
  }

  for (const milestone of skillDef.limitBreakMilestones || []) {
    const breaks = Math.max(1, Math.floor(Number(milestone.breaks) || 0));
    const bonuses = milestone.bonuses && typeof milestone.bonuses === 'object'
      ? { ...milestone.bonuses }
      : null;
    if (!breaks || (!bonuses && !milestone.label)) continue;
    milestones.push({ breaks, label: milestone.label || '固有効果解放', bonuses });
  }

  return milestones.sort((a, b) => a.breaks - b.breaks || a.label.localeCompare(b.label, 'ja'));
}

/** Return the next visible awakening milestone after the supplied skill level. */
export function getNextJobSkillLimitBreakMilestone(skillDef, currentLevel) {
  if (!skillDef?.levels?.length) return null;
  const maxLevel = Math.max(
    1,
    Math.floor(Number(skillDef.maxLevel) || skillDef.levels[skillDef.levels.length - 1].level || 1)
  );
  const currentBreaks = Math.max(0, Math.floor(Number(currentLevel) || maxLevel) - maxLevel);
  const milestones = getJobSkillLimitBreakMilestones(skillDef);
  const nextBreaks = milestones.find(milestone => milestone.breaks > currentBreaks)?.breaks;
  if (!nextBreaks) return null;
  const labels = milestones
    .filter(milestone => milestone.breaks === nextBreaks)
    .map(milestone => milestone.label);
  return { breaks: nextBreaks, level: maxLevel + nextBreaks, label: labels.join(' / ') };
}

function applyJobSkillLimitBreakMilestones(levelConfig, breaks, skillDef) {
  if (!levelConfig || breaks <= 0) return levelConfig;
  const adjusted = { ...levelConfig };
  for (const milestone of getJobSkillLimitBreakMilestones(skillDef)) {
    if (milestone.breaks > breaks || !milestone.bonuses) continue;
    for (const [key, amount] of Object.entries(milestone.bonuses)) {
      if (!Number.isFinite(amount)) continue;
      adjusted[key] = round((Number(adjusted[key]) || 0) + amount);
    }
  }
  return adjusted;
}

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
      adjusted[key] = Math.max(0, round(neutral + (value - neutral) * factor));
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
 * explode. Effects that could become guaranteed prevention, control, or
 * resource loops use stricter per-effect caps.
 */
export function applyJobSkillLimitBreak(
  levelConfig,
  limitBreakLevel = 0,
  fixedKeys = [],
  customMaximums = {},
  customMinimums = {}
) {
  const breaks = Math.max(0, Math.floor(Number(limitBreakLevel) || 0));
  if (!levelConfig || breaks === 0) return levelConfig;

  const factor = 1 + breaks * JOB_SKILL_LIMIT_BREAK_GROWTH;
  const adjusted = { ...levelConfig };

  for (const [key, value] of Object.entries(levelConfig)) {
    if (!Number.isFinite(value) || LIMIT_BREAK_FIXED_KEYS.has(key) || fixedKeys.includes(key)) continue;

    if (LIMIT_BREAK_STEPPED_KEYS.has(key)) {
      const { every, maxBonus, immediate = false } = LIMIT_BREAK_STEPPED_KEYS.get(key);
      const step = immediate ? Math.ceil(breaks / every) : Math.floor(breaks / every);
      adjusted[key] = value + Math.min(maxBonus, step);
      continue;
    }

    if (INVERSE_EFFECT_KEYS.has(key)) {
      const minimum = Number.isFinite(customMinimums[key])
        ? customMinimums[key]
        : (LIMIT_BREAK_MINIMUMS.get(key) ?? 0);
      adjusted[key] = Math.min(100, Math.max(minimum, round(value / factor)));
      continue;
    }

    if (NEUTRAL_MULTIPLIER_KEYS.has(key)) {
      const neutral = NEUTRAL_MULTIPLIER_KEYS.get(key);
      // Drawback multipliers such as Stigma of Atonement improve downward
      // from their neutral value. Unlimited linear growth must stop at zero;
      // a negative damage multiplier would otherwise turn the drawback into
      // permanent minimum damage.
      const minimum = Number.isFinite(customMinimums[key]) ? customMinimums[key] : 0;
      const bounded = Math.max(minimum, round(neutral + (value - neutral) * factor));
      const configuredMaximum = Number.isFinite(customMaximums[key])
        ? customMaximums[key]
        : LIMIT_BREAK_MAXIMUMS.get(key);
      adjusted[key] = configuredMaximum === undefined
        ? bounded
        : Math.min(Math.max(value, configuredMaximum), bounded);
      continue;
    }

    const scaled = LIMIT_BREAK_INTEGER_KEYS.has(key)
      ? Math.max(0, Math.round(value * factor))
      : round(value * factor);
    const bounded = LIMIT_BREAK_PERCENTAGE_KEYS.has(key)
      ? Math.min(100, Math.max(0, scaled))
      : scaled;
    const configuredMaximum = Number.isFinite(customMaximums[key])
      ? customMaximums[key]
      : LIMIT_BREAK_MAXIMUMS.get(key);
    adjusted[key] = configuredMaximum === undefined
      ? bounded
      : Math.min(Math.max(value, configuredMaximum), bounded);
  }

  return adjusted;
}

/** Return whether a skill has at least one effect that limit breaks can improve. */
export function canLimitBreakJobSkill(skillDef, currentLevel = null) {
  if (!skillDef?.levels?.length) return false;
  const maxLevel = Math.max(
    1,
    Math.floor(Number(skillDef.maxLevel) || skillDef.levels[skillDef.levels.length - 1].level || 1)
  );
  const masterConfig = skillDef.levels.find(candidate => candidate.level === maxLevel)
    || skillDef.levels[skillDef.levels.length - 1];
  const fixedKeys = skillDef.limitBreakFixedKeys || [];
  const hasScalableEffect = Object.entries(masterConfig).some(([key, value]) =>
    Number.isFinite(value) && !LIMIT_BREAK_FIXED_KEYS.has(key) && !fixedKeys.includes(key)
  ) || getJobSkillLimitBreakMilestones(skillDef).some(milestone => milestone.bonuses);
  if (!hasScalableEffect || currentLevel === null || currentLevel === undefined) {
    return hasScalableEffect;
  }

  const normalizedLevel = Math.max(maxLevel, Math.floor(Number(currentLevel) || maxLevel));
  const currentConfig = resolveLimitBreakConfig(skillDef, normalizedLevel, 'current');
  // Some integer and duration effects improve only every few levels. Compare
  // against their eventual value so a temporary plateau is not mistaken for
  // the final semantic cap.
  const futureConfig = resolveLimitBreakConfig(
    skillDef,
    normalizedLevel + LIMIT_BREAK_SATURATION_PROBE,
    'current'
  );
  return Object.keys(futureConfig).some(
    key => key !== 'level' && futureConfig[key] !== currentConfig[key]
  );
}

function resolveLimitBreakConfig(skillDef, level, mode) {
  const maxLevel = Math.max(
    1,
    Math.floor(Number(skillDef.maxLevel) || skillDef.levels[skillDef.levels.length - 1].level || 1)
  );
  const authoredConfig = skillDef.levels.find(candidate => candidate.level === level)
    || skillDef.levels.find(candidate => candidate.level === maxLevel)
    || skillDef.levels[skillDef.levels.length - 1];
  const potentConfig = applyJobSkillPotency({ ...authoredConfig, level }, mode);
  const breaks = Math.max(0, level - maxLevel);
  const scaledConfig = applyJobSkillLimitBreak(
    potentConfig,
    breaks,
    skillDef.limitBreakFixedKeys,
    skillDef.limitBreakMaximums,
    skillDef.limitBreakMinimums
  );
  return applyJobSkillLimitBreakMilestones(scaledConfig, breaks, skillDef);
}

export function resolveJobSkillLevelConfig(skillDef, level, mode = 'base') {
  if (!skillDef?.levels?.length) return null;
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  const maxLevel = Math.max(
    1,
    Math.floor(Number(skillDef.maxLevel) || skillDef.levels[skillDef.levels.length - 1].level || 1)
  );
  const resolvedLevel = normalizedLevel > maxLevel && !canLimitBreakJobSkill(skillDef)
    ? maxLevel
    : normalizedLevel;
  return resolveLimitBreakConfig(skillDef, resolvedLevel, mode);
}
