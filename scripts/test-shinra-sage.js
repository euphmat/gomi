import { shinra_sage } from '../js/jobs/shinra_sage.js';
import { JOBS, JOB_STAT_GROWTH, JOB_STAT_MULTIPLIER } from '../js/jobs/index.js';
import { AUTO_BATTLE_JOB_TACTICS, selectAutoBattleAction } from '../js/pages/battle/auto-battle-ai.js';
import { NORMAL_ATTACK_ANIMATION_PROFILES } from '../js/pages/battle/normal-attack-animations.js';

globalThis.localStorage = { getItem: () => null };
globalThis.document = { hidden: true, body: null, getElementById: () => null };

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(JOBS.shinra_sage?.name === '森羅導師', 'shinra sage is not registered');
assert(shinra_sage.requirements.some(req => req.jobId === 'ranger' && req.level === 100), 'ranger requirement is missing');
assert(shinra_sage.requirements.some(req => req.jobId === 'mage' && req.level === 100), 'mage requirement is missing');
assert(JOB_STAT_GROWTH.shinra_sage && JOB_STAT_MULTIPLIER.shinra_sage, 'shinra sage stats are missing');
assert(Object.keys(AUTO_BATTLE_JOB_TACTICS.shinra_sage || {}).length === 5, 'shinra sage tactics are incomplete');
assert(NORMAL_ATTACK_ANIMATION_PROFILES.shinra_sage?.kind === 'shinra_invocation', 'shinra sage normal attack is missing');

shinra_sage.skills.forEach(skill => {
  assert(skill.maxLevel === 10, `${skill.id} max level is invalid`);
  assert(skill.levels.length === 10, `${skill.id} level table is incomplete`);
  skill.levels.forEach((config, index) => {
    assert(config.level === index + 1, `${skill.id} level order is invalid`);
    assert(Number.isFinite(config.spCost), `${skill.id} SP cost is invalid`);
  });
});

const caster = {
  id: 'sage', jobId: 'shinra_sage', elementId: 'sage', isDead: false, activeAilment: null,
  hp: { current: 800, max: 1000 }, mp: { current: 999, max: 999 },
  stats: { hp: 1000, mp: 999, matk: 500 }, skills: {}, _shinraSigils: []
};
const ally = {
  id: 'ally', elementId: 'ally', isDead: false,
  hp: { current: 600, max: 1000 }, mp: { current: 100, max: 100 }, stats: { hp: 1000 }
};
const enemy = {
  id: 'enemy', elementId: 'enemy', isDead: false, currentHp: 10000, maxHp: 10000,
  stats: { elementResist: { grass: 0, wind: 0, earth: 0 } }
};
const attacks = [];
const battle = {
  party: [caster, ally], enemies: [enemy], selectedEnemyTarget: enemy,
  showDamage() {}, renderEntities() {},
  executeAttack(_attacker, _target, _isParty, options) { attacks.push(options); }
};

const skill = id => shinra_sage.skills.find(candidate => candidate.id === id);
skill('verdant_spear').execute(caster, { multiplier: 2 }, battle);
assert(caster._shinraSigils.includes('grass'), 'grass sigil was not added');
assert(attacks.at(-1)?.element === 'grass', 'verdant spear is not grass damage');

skill('sylph_cyclone').execute(caster, { multiplier: 1 }, battle);
assert(caster._shinraSigils.includes('wind'), 'wind sigil was not added');
assert(attacks.at(-1)?.element === 'wind', 'sylph cyclone is not wind damage');

skill('gaia_rampart').execute(caster, { barrierMatkPercent: 50, defPercent: 20, turns: 3 }, battle);
assert(caster._shinraSigils.includes('earth'), 'earth sigil was not added');
assert(ally._barrierHp === 250, 'gaia rampart barrier is invalid');
assert(ally._defBuffPercent === 20 && ally._mdefBuffPercent === 20, 'gaia rampart defenses are invalid');

const beforeHeal = ally.hp.current;
skill('shinra_mandala').execute(caster, { multiplier: 1, sigilBonus: .2, healMatkPercent: 40 }, battle);
assert(caster._shinraSigils.length === 0, 'trinity sigils were not consumed');
assert(attacks.slice(-3).map(attack => attack.element).join(',') === 'grass,wind,earth', 'mandala elements are invalid');
assert(attacks.slice(-3).every(attack => attack.damageMultiplier === 1.2), 'mandala sigil bonus is invalid');
assert(ally.hp.current === beforeHeal + 200, 'mandala trinity heal is invalid');

const usable = ['verdant_spear', 'sylph_cyclone', 'gaia_rampart', 'shinra_mandala'].map(id => {
  const def = skill(id);
  return { id, def, levelConfig: def.levels[0] };
});
caster._shinraSigils = ['grass', 'wind', 'earth'];
const choice = selectAutoBattleAction({
  character: caster,
  usableSkills: usable,
  context: { party: [caster, ally], enemies: [enemy], selectedEnemyTarget: enemy },
  findSkill: () => null,
  isSkillEnabled: () => true
});
assert(choice.skill?.id === 'shinra_mandala', 'auto battle did not prioritize the completed trinity');

if (typeof print === 'function') print('Shinra Sage tests passed.');
else console.log('Shinra Sage tests passed.');
