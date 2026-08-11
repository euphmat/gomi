/**
 * Shared battle-only resources for jobs that predate the dedicated job gauge
 * HUD.  The authored job skills stay focused on their own effects; this module
 * owns resource lifecycle, damage modifiers, ammo validation and AI hints.
 */

import { getJobGaugeCapacityBonus } from '../../jobs/job-gauge-progression.js';

const numeric = value => Math.max(0, Math.floor(Number(value) || 0));
const jobIdOf = entity => entity?.jobId || entity?.job || '';

export const STANDARD_JOB_GAUGES = Object.freeze({
  norvice:       Object.freeze({ label: '経験', icon: 'school', field: '_noviceExperience', max: 5, description: '異なる行動で蓄積し、最大時の次スキルを強化' }),
  knight:        Object.freeze({ label: '防衛意志', icon: 'shield', field: '_knightResolve', max: 5, description: '防御行動と被弾で蓄積し、軽減と盾反撃を強化' }),
  mage:          Object.freeze({ label: '元素連環', icon: 'brightness_7', field: '_mageChain', max: 3, description: '異なる属性を連携させ、次の属性魔法を強化' }),
  priest:        Object.freeze({ label: '信仰', icon: 'flare', field: '_priestFaith', max: 100, description: '回復・解除・蘇生で蓄積し、オールヒールのMPを還元' }),
  ranger:        Object.freeze({ label: '照準', icon: 'my_location', field: '_rangerFocus', max: 5, description: '攻撃で蓄積し、威力と五月雨矢を強化' }),
  magic_knight:  Object.freeze({ label: '魔刃同調', icon: 'swords', field: '_magicKnightSync', max: 6, description: '属性剣を交互に使い、同調完成後の一撃を強化' }),
  slime_master:  Object.freeze({ label: '質量', icon: 'water_drop', field: '_slimeMass', max: 100, description: 'スライム行動と被弾で増え、耐久とハザードを強化' }),
  dancer:        Object.freeze({ label: 'ステップ', icon: 'steps', field: '_dancerSteps', max: 4, description: '異なる舞をつなげ、フィナーレの一撃を強化' }),
  bird:          Object.freeze({ label: '旋律', icon: 'queue_music', field: '_bardMelody', max: 8, description: '歌で旋律を蓄積し、ナイトメアで放出' }),
  black_knight:  Object.freeze({ label: '渇血', icon: 'bloodtype', field: '_blackKnightThirst', max: 100, description: '与被ダメージで高まり、攻撃強化と大技に消費' }),
  paladin:       Object.freeze({ label: '聖印', icon: 'verified', field: '_paladinSeals', max: 3, description: '守護と回復で獲得し、聖撃と自身の守りを強化' }),
  poseidon:      Object.freeze({ label: '潮位', icon: 'waves', field: '_poseidonTide', max: 3, description: '水の行動で潮位を上げ、津波・審判で放出' }),
  pyromancer:    Object.freeze({ label: '炉心温度', icon: 'mode_heat', field: '_pyromancerHeat', max: 100, description: '炎魔法で加熱し、炎威力とメテオを強化' }),
  assassin:      Object.freeze({ label: '殺意', icon: 'gps_fixed', field: '_assassinMarks', max: 5, description: '同じ標的への攻撃で蓄積し、暗殺で放出' }),
  guardian:      Object.freeze({ label: '城壁', icon: 'fort', field: '_guardianWall', max: 5, description: '守護行動と被弾で築き、軽減と盾撃を強化' }),
  cryomancer:    Object.freeze({ label: '氷晶', icon: 'diamond', field: '_cryomancerCrystals', max: 6, description: '氷魔法で結晶を蓄え、絶対零度で粉砕' }),
  magic_archer:  Object.freeze({ label: '魔矢', icon: 'arrow_right_alt', field: '_magicArcherArrows', max: 6, description: 'MPを魔矢に変換し、通常攻撃や大技で放つ' }),
  gunner:        Object.freeze({ label: '弾倉', icon: 'radio_button_checked', field: '_gunnerAmmo', max: 6, initial: 6, startsFull: true, description: '射撃で弾丸を消費し、弾切れ後の通常攻撃でリロード' }),
  plague_doctor: Object.freeze({ label: '培養', icon: 'biotech', field: '_plagueCulture', max: 9, description: '病原スキルで培養し、パンデミック・黒死病で消費' })
});

export const STANDARD_JOB_GAUGE_FIELDS = Object.freeze(
  Object.values(STANDARD_JOB_GAUGES).map(definition => definition.field)
);

const GUNNER_AMMO_COST = Object.freeze({
  reload: 0, charged_shot: 1, elemental_charge: 1, arm_snipe: 2, rapid_fire: 3, bullet_storm: 6
});

const GAUGE_SKILL_HINTS = Object.freeze({
  norvice: {
    heavy_strike: '経験MAX時は全消費し、1つごとに威力+30%',
    cleave: '経験MAX時は全消費し、1つごとに威力+30%'
  },
  knight: { shield_attack: '防衛意志を全消費し、1つごとに威力+25%' },
  mage: {
    fireball: '元素連環MAX時は全消費し、1つごとに威力+42%', ice_lance: '元素連環MAX時は全消費し、1つごとに威力+42%',
    thunder: '元素連環MAX時は全消費し、1つごとに威力+42%', blizzard: '元素連環MAX時は全消費し、1つごとに威力+42%',
    volcano: '元素連環MAX時は全消費し、1つごとに威力+42%', thunderstorm: '元素連環MAX時は全消費し、1つごとに威力+42%'
  },
  priest: { all_heal: '信仰50以上を全消費し、MP全額還元・回復量を大幅強化' },
  ranger: { rain_of_arrows: '照準MAX時は全消費し、1つごとに威力+30%' },
  magic_knight: { flame_tongue: '魔刃同調MAX時は全消費し、1つごとに威力+25%', ice_brand: '魔刃同調MAX時は全消費し、1つごとに威力+25%', thunder_slash: '魔刃同調MAX時は全消費し、1つごとに威力+25%' },
  slime_master: { slime_hazard: '質量を全消費し、1ごとに威力+1%' },
  dancer: {
    poison_salsa: 'ステップMAX時は全消費し、1つごとに威力+32%', juggling_dagger: 'ステップMAX時は全消費し、1つごとに威力+32%',
    confusion_tarantella: 'ステップMAX時は全消費し、1つごとに威力+32%', curse_step: 'ステップMAX時は全消費し、1つごとに威力+32%'
  },
  bird: { nightmare: '旋律3以上を全消費し、1音ごとに威力+15%' },
  black_knight: { blood_saber: '渇血75以上で全消費し、1ごとに威力+1%', hell_gate: '渇血50以上で全消費し、1ごとに威力+1%' },
  paladin: { holy_smite: '聖印を全消費し、1つごとに威力+40%' },
  poseidon: { tidal_wave: '潮位2以上を全消費し、1段階ごとに威力+50%', leviathan_judgment: '潮位2以上を全消費し、1段階ごとに威力+50%' },
  pyromancer: { meteor_catastrophe: '炉心温度を全消費し、温度1ごとに威力+1%' },
  assassin: { assassinate: '殺意を全消費し、1つごとに威力+25%' },
  guardian: { aegis_bash: '城壁を全消費し、1層ごとに威力+30%' },
  cryomancer: { absolute_zero: '氷晶を全消費し、1つごとに威力+20%' },
  magic_archer: { mana_barrage: '魔矢を全消費し、1本ごとに威力+20%', astral_arrow_rain: '魔矢を全消費し、1本ごとに威力+20%' },
  gunner: {
    reload: '弾倉を6発まで補充し、次の射撃を強化', charged_shot: '弾丸1発消費', elemental_charge: '弾丸1発消費',
    arm_snipe: '弾丸2発消費', rapid_fire: '弾丸3発消費', bullet_storm: '弾丸6発以上で全弾消費し、6発で威力2倍（拡張分も加算）'
  },
  plague_doctor: { pandemic: '培養を最大3消費し、1つごとに威力+35%', black_death: '培養を全消費し、1つごとに威力+15%' }
});

const getDefinition = entity => STANDARD_JOB_GAUGES[jobIdOf(entity)] || null;

export function getStandardJobGaugeMax(entity) {
  const definition = getDefinition(entity);
  if (!definition) return 0;
  const max = definition.max + getJobGaugeCapacityBonus(entity, jobIdOf(entity));
  if (entity && typeof entity === 'object') entity._jobGaugeCapacityMax = max;
  return max;
}

export function ensureStandardJobGauge(entity) {
  const definition = getDefinition(entity);
  if (!definition) return null;
  const max = getStandardJobGaugeMax(entity);
  if (!Number.isFinite(Number(entity[definition.field]))) {
    entity[definition.field] = definition.startsFull ? max : (definition.initial ?? 0);
  }
  entity[definition.field] = Math.min(max, numeric(entity[definition.field]));
  return definition;
}

export function getStandardJobGaugeValue(entity) {
  const definition = ensureStandardJobGauge(entity);
  return definition ? entity[definition.field] : 0;
}

export function setStandardJobGaugeValue(entity, value) {
  const definition = ensureStandardJobGauge(entity);
  if (!definition) return 0;
  entity[definition.field] = Math.min(getStandardJobGaugeMax(entity), numeric(value));
  return entity[definition.field];
}

export function addStandardJobGauge(entity, amount) {
  return setStandardJobGaugeValue(entity, getStandardJobGaugeValue(entity) + amount);
}

export function resetStandardJobGauge(entity) {
  const definition = getDefinition(entity);
  if (!definition) return;
  entity[definition.field] = definition.startsFull ? getStandardJobGaugeMax(entity) : (definition.initial ?? 0);
  entity._jobGaugeActionMultiplier = 1;
  entity._jobGaugeHealingMultiplier = 1;
  entity._jobGaugeActionSkill = null;
  entity._jobGaugeLastSkill = null;
  entity._jobGaugeLastElement = null;
  entity._jobGaugeUsedSkills = [];
  entity._assassinMarkTarget = null;
  entity._gunnerReloadBonus = 0;
}

export function getJobGaugeSkillUseState(caster, skillId) {
  if (jobIdOf(caster) !== 'gunner') return { canUse: true };
  const ammo = getStandardJobGaugeValue(caster);
  const max = getStandardJobGaugeMax(caster);
  if (skillId === 'reload') {
    return ammo < max
      ? { canUse: true }
      : { canUse: false, message: '弾倉は装填済み' };
  }
  const cost = GUNNER_AMMO_COST[skillId] || 0;
  return cost <= ammo
    ? { canUse: true }
    : { canUse: false, message: `弾丸不足（${ammo}/${cost}）` };
}

export function getJobGaugeSkillHint(entity, skillId) {
  return GAUGE_SKILL_HINTS[jobIdOf(entity)]?.[skillId] || '';
}

const spend = (caster, amount) => {
  const current = getStandardJobGaugeValue(caster);
  setStandardJobGaugeValue(caster, Math.max(0, current - amount));
  return Math.min(current, amount);
};

const consumeAll = caster => {
  const current = getStandardJobGaugeValue(caster);
  setStandardJobGaugeValue(caster, 0);
  return current;
};

function setActionMultiplier(caster, multiplier, skillId) {
  caster._jobGaugeActionMultiplier = Math.max(1, Number(multiplier) || 1);
  caster._jobGaugeActionSkill = skillId || null;
  caster._jobGaugeHealingMultiplier = 1;
}

/** Called after MP payment and immediately before the authored skill effect. */
export function beginJobGaugeSkillAction(caster, skillId, effectiveMpCost = 0) {
  const definition = ensureStandardJobGauge(caster);
  if (!definition) return;
  const jobId = jobIdOf(caster);
  const current = getStandardJobGaugeValue(caster);
  const max = getStandardJobGaugeMax(caster);
  setActionMultiplier(caster, 1, skillId);

  switch (jobId) {
    case 'norvice': {
      if (current >= max && ['heavy_strike', 'cleave'].includes(skillId)) {
        setActionMultiplier(caster, 1 + consumeAll(caster) * .3, skillId);
        break;
      }
      const used = Array.isArray(caster._jobGaugeUsedSkills) ? caster._jobGaugeUsedSkills : [];
      if (!used.includes(skillId)) {
        caster._jobGaugeUsedSkills = [...used, skillId];
        addStandardJobGauge(caster, 1);
      }
      break;
    }
    case 'knight':
      if (skillId === 'shield_attack') setActionMultiplier(caster, 1 + consumeAll(caster) * .25, skillId);
      else if (['provoke', 'defense_formation'].includes(skillId)) addStandardJobGauge(caster, 1);
      break;
    case 'mage': {
      const elements = { fireball: 'fire', volcano: 'fire', ice_lance: 'ice', blizzard: 'ice', thunder: 'thunder', thunderstorm: 'thunder' };
      const element = elements[skillId];
      if (!element) break;
      if (current >= max) {
        setActionMultiplier(caster, 1 + consumeAll(caster) * .42, skillId);
      } else {
        setStandardJobGaugeValue(caster, caster._jobGaugeLastElement && caster._jobGaugeLastElement === element ? 1 : current + 1);
      }
      caster._jobGaugeLastElement = element;
      break;
    }
    case 'priest':
      if (skillId === 'all_heal' && current >= 50) {
        const faith = consumeAll(caster);
        caster._jobGaugeHealingMultiplier = 1 + faith / 50;
        if (caster.mp) caster.mp.current += effectiveMpCost;
      } else {
        addStandardJobGauge(caster, ({ heal: 20, restore: 15, raise: 35, holy: 5 }[skillId] || 0));
      }
      break;
    case 'ranger':
      if (skillId === 'rain_of_arrows' && current >= max) {
        setActionMultiplier(caster, 1 + consumeAll(caster) * .3, skillId);
      } else addStandardJobGauge(caster, 1);
      break;
    case 'magic_knight': {
      const element = { flame_tongue: 'fire', ice_brand: 'ice', thunder_slash: 'thunder' }[skillId];
      if (!element) break;
      if (current >= max) {
        setActionMultiplier(caster, 1 + consumeAll(caster) * .25, skillId);
      } else if (caster._jobGaugeLastElement !== element) addStandardJobGauge(caster, 2);
      else setStandardJobGaugeValue(caster, Math.max(1, current - 1));
      caster._jobGaugeLastElement = element;
      break;
    }
    case 'slime_master':
      if (skillId === 'slime_hazard') setActionMultiplier(caster, 1 + consumeAll(caster) / 100, skillId);
      else addStandardJobGauge(caster, 25);
      break;
    case 'dancer':
      if (current >= max) {
        setActionMultiplier(caster, 1 + consumeAll(caster) * .32, skillId);
      } else {
        setStandardJobGaugeValue(caster, caster._jobGaugeLastSkill === skillId ? 1 : current + 1);
      }
      caster._jobGaugeLastSkill = skillId;
      break;
    case 'bird':
      if (skillId === 'nightmare' && current >= 3) setActionMultiplier(caster, 1 + consumeAll(caster) * .15, skillId);
      else addStandardJobGauge(caster, 2);
      break;
    case 'black_knight':
      if ((skillId === 'blood_saber' && current >= 75) || (skillId === 'hell_gate' && current >= 50)) {
        setActionMultiplier(caster, 1 + consumeAll(caster) / 100, skillId);
      }
      break;
    case 'paladin':
      if (skillId === 'holy_smite') setActionMultiplier(caster, 1 + consumeAll(caster) * .4, skillId);
      else addStandardJobGauge(caster, 1);
      break;
    case 'poseidon':
      if (['tidal_wave', 'leviathan_judgment'].includes(skillId) && current >= 2) {
        setActionMultiplier(caster, 1 + consumeAll(caster) * .5, skillId);
      } else addStandardJobGauge(caster, 1);
      break;
    case 'pyromancer':
      if (skillId === 'meteor_catastrophe') setActionMultiplier(caster, 1 + consumeAll(caster) / 100, skillId);
      else addStandardJobGauge(caster, ({ flare_lance: 20, ember_barrage: 20, inferno: 35 }[skillId] || 0));
      break;
    case 'assassin':
      if (skillId === 'assassinate' && current > 0) setActionMultiplier(caster, 1 + consumeAll(caster) * .25, skillId);
      break;
    case 'guardian':
      if (skillId === 'aegis_bash') setActionMultiplier(caster, 1 + consumeAll(caster) * .3, skillId);
      else addStandardJobGauge(caster, 1);
      break;
    case 'cryomancer':
      if (skillId === 'absolute_zero') setActionMultiplier(caster, 1 + consumeAll(caster) * .2, skillId);
      else addStandardJobGauge(caster, skillId === 'whiteout' ? 2 : 1);
      break;
    case 'magic_archer':
      if (['mana_barrage', 'astral_arrow_rain'].includes(skillId)) {
        setActionMultiplier(caster, 1 + consumeAll(caster) * .2, skillId);
      } else addStandardJobGauge(caster, Math.max(1, Math.ceil(effectiveMpCost / 40)));
      break;
    case 'gunner':
      if (skillId === 'reload') {
        setStandardJobGaugeValue(caster, max);
      } else if (skillId === 'bullet_storm') {
        const ammo = consumeAll(caster);
        setActionMultiplier(caster, 1 + ammo / STANDARD_JOB_GAUGES.gunner.max, skillId);
      } else {
        const reloadBonus = Math.max(0, Number(caster._gunnerReloadBonus) || 0);
        spend(caster, GUNNER_AMMO_COST[skillId] || 0);
        if (reloadBonus > 0) {
          setActionMultiplier(caster, 1 + reloadBonus, skillId);
          caster._gunnerReloadBonus = 0;
        }
      }
      break;
    case 'plague_doctor':
      if (skillId === 'black_death') setActionMultiplier(caster, 1 + consumeAll(caster) * .15, skillId);
      else if (skillId === 'pandemic') setActionMultiplier(caster, 1 + spend(caster, 3) * .35, skillId);
      else addStandardJobGauge(caster, ({ pathogen_injection: 1, corrosive_miasma: 2, virulent_mutation: 2 }[skillId] || 0));
      break;
  }
}

/** Prepare a player-issued normal attack. A gunner with an empty magazine reloads. */
export function beginJobGaugeNormalAttack(attacker) {
  const definition = ensureStandardJobGauge(attacker);
  if (!definition) return { cancel: false };
  const jobId = jobIdOf(attacker);
  setActionMultiplier(attacker, 1, 'normal_attack');

  if (jobId === 'gunner') {
    if (getStandardJobGaugeValue(attacker) <= 0) {
      setStandardJobGaugeValue(attacker, getStandardJobGaugeMax(attacker));
      return { cancel: true, label: 'リロード' };
    }
    spend(attacker, 1);
  } else if (jobId === 'magic_archer' && getStandardJobGaugeValue(attacker) > 0) {
    spend(attacker, 1);
    setActionMultiplier(attacker, 1.25, 'normal_attack');
  } else if (jobId === 'norvice') {
    const used = Array.isArray(attacker._jobGaugeUsedSkills) ? attacker._jobGaugeUsedSkills : [];
    if (!used.includes('normal_attack')) {
      attacker._jobGaugeUsedSkills = [...used, 'normal_attack'];
      addStandardJobGauge(attacker, 1);
    }
  } else if (['ranger', 'black_knight'].includes(jobId)) {
    addStandardJobGauge(attacker, jobId === 'black_knight' ? 5 : 1);
  }
  return { cancel: false };
}

export function getJobGaugeOutgoingMultiplier(attacker, defender) {
  const jobId = jobIdOf(attacker);
  const value = getStandardJobGaugeValue(attacker);
  let multiplier = Math.max(1, Number(attacker?._jobGaugeActionMultiplier) || 1);
  if (jobId === 'norvice') multiplier *= 1 + value * .04;
  if (jobId === 'mage') multiplier *= 1 + value * .05;
  if (jobId === 'ranger') multiplier *= 1 + value * .02;
  if (jobId === 'magic_knight') multiplier *= 1 + value * .03;
  if (jobId === 'dancer') multiplier *= 1 + value * .04;
  if (jobId === 'bird') multiplier *= 1 + value * .03;
  if (jobId === 'black_knight') multiplier *= 1 + value * .002;
  if (jobId === 'poseidon') multiplier *= 1 + value * .04;
  if (jobId === 'pyromancer') multiplier *= 1 + value * .003;
  if (jobId === 'cryomancer') multiplier *= 1 + value * .025;
  if (jobId === 'magic_archer') multiplier *= 1 + value * .03;
  if (jobId === 'gunner') multiplier *= 1 + value * .02;
  if (jobId === 'plague_doctor') multiplier *= 1 + value * .02;
  if (jobId === 'assassin' && attacker._assassinMarkTarget === defender?.id) multiplier *= 1 + value * .04;
  return multiplier;
}

export function getJobGaugeIncomingMultiplier(defender) {
  const value = getStandardJobGaugeValue(defender);
  switch (jobIdOf(defender)) {
    case 'knight': return Math.max(.65, 1 - value * .02);
    case 'priest': return Math.max(.85, 1 - value * .0005);
    case 'slime_master': return Math.max(.65, 1 - value * .001);
    case 'paladin': return Math.max(.65, 1 - value * .02);
    case 'guardian': return Math.max(.55, 1 - value * .03);
    default: return 1;
  }
}

/** Award gauges that depend on an actual hit instead of merely selecting a skill. */
export function recordJobGaugeDamage(attacker, defender, damageDealt) {
  if (!(damageDealt > 0)) return;
  const attackerJob = jobIdOf(attacker);
  const defenderJob = jobIdOf(defender);
  if (attackerJob === 'black_knight') addStandardJobGauge(attacker, 5);
  if (attackerJob === 'assassin') {
    if (attacker._assassinMarkTarget !== defender?.id) {
      attacker._assassinMarkTarget = defender?.id || null;
      setStandardJobGaugeValue(attacker, 1);
    } else addStandardJobGauge(attacker, 1);
  }
  if (defenderJob === 'knight') addStandardJobGauge(defender, 1);
  if (defenderJob === 'black_knight') addStandardJobGauge(defender, 10);
  if (defenderJob === 'guardian') addStandardJobGauge(defender, 1);
  if (defenderJob === 'slime_master') addStandardJobGauge(defender, 5);
}

/** Apply resource-aware priorities after each skill's authored AI check. */
export function applyStandardJobGaugeAi(character, candidates) {
  const definition = ensureStandardJobGauge(character);
  if (!definition) return;
  const value = getStandardJobGaugeValue(character);
  const max = getStandardJobGaugeMax(character);
  const byId = new Map(candidates.map(candidate => [candidate.skill.id, candidate]));
  const boost = (ids, score) => ids.forEach(id => { if (byId.has(id)) byId.get(id).score += score; });
  const finish = (id, threshold = max) => {
    const candidate = byId.get(id);
    if (candidate && value >= threshold) {
      candidate.priority = Math.max(candidate.priority, 465);
      candidate.score += 350 + value * 20;
    }
  };

  switch (jobIdOf(character)) {
    case 'norvice': finish('cleave'); boost(['first_aid', 'heavy_strike', 'focus', 'intimidate'], value < max ? 35 : 0); break;
    case 'knight': finish('shield_attack'); boost(['provoke', 'defense_formation'], value < max ? 40 : 0); break;
    case 'mage': boost(['fireball', 'ice_lance', 'thunder'], value < max ? 45 : 90); break;
    case 'priest':
      finish('all_heal');
      boost(['all_heal'], value >= 50 && value < max ? 150 + value * 2 : 0);
      boost(['heal', 'restore', 'raise'], value < max ? 25 : 0);
      break;
    case 'ranger': finish('rain_of_arrows'); boost(['double_arrow', 'arrow_rain'], value < max ? 30 : 0); break;
    case 'magic_knight': finish('thunder_slash'); boost(['flame_tongue', 'ice_brand'], value < max ? 40 : 0); break;
    case 'slime_master': finish('slime_hazard'); boost(['slime_throw'], value < max ? 45 : 0); break;
    case 'dancer': finish('curse_step'); boost(['poison_salsa', 'juggling_dagger', 'confusion_tarantella'], value < max ? 35 : 0); break;
    case 'bird': finish('nightmare'); boost(['lullaby', 'warding_song'], value < max ? 35 : 0); break;
    case 'black_knight': finish('hell_gate'); finish('blood_saber'); break;
    case 'paladin': finish('holy_smite'); boost(['divine_shield', 'sanctuary'], value < max ? 35 : 0); break;
    case 'poseidon': finish('leviathan_judgment'); boost(['trident_tempest', 'abyssal_dominion'], value < max ? 30 : 0); break;
    case 'pyromancer': finish('meteor_catastrophe'); boost(['flare_lance', 'ember_barrage', 'inferno'], value < max ? 40 : 0); break;
    case 'assassin': finish('assassinate'); boost(['razor_rush', 'phantom_barrage'], value < max ? 35 : 0); break;
    case 'guardian': finish('aegis_bash'); boost(['guardian_oath', 'impregnable_wall'], value < max ? 40 : 0); break;
    case 'cryomancer': finish('absolute_zero'); boost(['frost_spear', 'hail_barrage', 'whiteout'], value < max ? 35 : 0); break;
    case 'magic_archer': finish('astral_arrow_rain'); boost(['arcane_arrow', 'elemental_arrow'], value < max ? 35 : 0); break;
    case 'gunner':
      boost(['charged_shot', 'elemental_charge'], value <= 2 ? 90 : 0);
      boost(['reload'], value <= 2 ? 220 : 0);
      finish('bullet_storm');
      break;
    case 'plague_doctor': finish('black_death'); boost(['pathogen_injection', 'corrosive_miasma', 'virulent_mutation'], value < max ? 35 : 0); break;
  }
}

const LEGACY_GAUGE_SNAPSHOTS = Object.freeze({
  entertainer: { field: '_entertainerHype', max: 3, passiveId: 'showstopper', maxKey: 'maxHype', label: '舞台熱', icon: 'theater_comedy' },
  mana_conductor: { field: '_conductorHarmony', max: 5, passiveId: 'conductor_core', maxKey: 'maxHarmony', label: '共鳴', icon: 'hub' },
  slime_singer: { field: '_slimeSingerNotes', max: 4, passiveId: 'resonant_gel', maxKey: 'maxNotes', label: 'ぷるぷる音符', icon: 'music_note' },
  dragoon: { field: '_dragoonSpirit', max: 5, passiveId: 'dragon_heart', maxKey: 'maxDragonSpirit', label: '竜気', icon: 'air' },
  shinra_sage: { field: '_shinraSigils', max: 3, array: true, label: '三界印', icon: 'nature' },
  soul_reaper: { field: '_soulReaperCorpses', max: 5, label: '亡骸', icon: 'skull' }
});

const SPECIAL_GAUGE_ACTIONS = Object.freeze({
  norvice: { '*': 'ひらめき' },
  knight: { shield_attack: '決意の盾撃' },
  mage: { fireball: '元素連環', ice_lance: '元素連環', thunder: '元素連環', blizzard: '元素連環', volcano: '元素連環', thunderstorm: '元素連環' },
  priest: { all_heal: '奇跡の祈り' },
  ranger: { rain_of_arrows: '完全照準' },
  magic_knight: { flame_tongue: '魔刃同調', ice_brand: '魔刃同調', thunder_slash: '魔刃同調' },
  slime_master: { slime_hazard: '巨大スライム化' },
  dancer: { '*': 'フィナーレ' },
  bird: { nightmare: '夢幻残響' },
  black_knight: { blood_saber: '渇血解放', hell_gate: '渇血解放' },
  paladin: { holy_smite: '聖印解放' },
  poseidon: { tidal_wave: '満潮解放', leviathan_judgment: '満潮解放' },
  pyromancer: { meteor_catastrophe: '炉心解放' },
  assassin: { assassinate: '処刑照準' },
  guardian: { aegis_bash: '城壁崩撃' },
  cryomancer: { absolute_zero: '氷晶粉砕' },
  magic_archer: { mana_barrage: '魔矢斉射', astral_arrow_rain: '魔矢斉射' },
  gunner: { reload: 'タクティカルリロード', bullet_storm: 'フルバースト' },
  plague_doctor: { pandemic: '病原解放', black_death: '病原解放' },
  entertainer: { grand_finale: 'グランド・フィナーレ' },
  mana_conductor: {
    resonance_recharge: '共鳴還元', arcane_crescendo: '共鳴解放',
    resonance_storm: '共鳴解放', grand_symphony: 'グランド・シンフォニー'
  },
  slime_singer: { king_slime_chorus: 'キングスライム大合唱' },
  dragoon: { skyfall_dive: '竜気解放' },
  shinra_sage: { shinra_mandala: '三界輪' },
  soul_reaper: {
    corpse_vanguard: '亡骸召集', ossuary_aegis: '納骨守護',
    march_of_dead: '死者行軍', last_requiem: '最後の葬列'
  }
});

function getCachedGaugeMax(entity, legacy) {
  const cached = entity?._skillCache?.get?.(legacy.passiveId);
  return numeric(cached?.levelConfig?.[legacy.maxKey]) || legacy.max;
}

/** Capture a small immutable state used to detect charged/released transitions. */
export function getJobGaugeAnimationSnapshot(entity) {
  const jobId = jobIdOf(entity);
  const standard = STANDARD_JOB_GAUGES[jobId];
  if (standard) {
    return { jobId, current: getStandardJobGaugeValue(entity), max: getStandardJobGaugeMax(entity), label: standard.label, icon: standard.icon };
  }
  const legacy = LEGACY_GAUGE_SNAPSHOTS[jobId];
  if (!legacy) return null;
  const value = legacy.array
    ? new Set(Array.isArray(entity?.[legacy.field]) ? entity[legacy.field] : []).size
    : numeric(entity?.[legacy.field]);
  const max = legacy.passiveId
    ? getCachedGaugeMax(entity, legacy)
    : legacy.max + getJobGaugeCapacityBonus(entity, jobId);
  return { jobId, current: Math.min(max, value), max, label: legacy.label, icon: legacy.icon };
}

export function resolveJobGaugeAnimationEvent(before, entity, skillId = '') {
  if (!before) return null;
  const after = getJobGaugeAnimationSnapshot(entity);
  if (!after || after.jobId !== before.jobId || after.current === before.current) return null;
  const specialActions = SPECIAL_GAUGE_ACTIONS[before.jobId] || {};
  const specialLabel = specialActions[skillId] || specialActions['*'];
  if (skillId === 'reload' && before.jobId === 'gunner' && after.current > before.current) {
    return {
      type: 'reload', jobId: before.jobId, label: specialLabel, icon: 'refresh',
      amount: after.current - before.current, max: before.max
    };
  }
  if (specialLabel && after.current < before.current) {
    return {
      type: 'release', jobId: before.jobId, label: specialLabel, icon: before.icon,
      amount: before.current - after.current, max: before.max
    };
  }
  if (before.current < before.max && after.current >= after.max) {
    return {
      type: 'charged', jobId: before.jobId, label: `${after.label} MAX`, icon: after.icon,
      amount: after.current, max: after.max
    };
  }
  return null;
}
