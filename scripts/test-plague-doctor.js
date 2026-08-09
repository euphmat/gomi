import { plague_doctor } from '../js/jobs/plague_doctor.js';
import { JOBS, JOB_STAT_GROWTH, JOB_STAT_MULTIPLIER } from '../js/jobs/index.js';
import { AUTO_BATTLE_JOB_TACTICS, selectAutoBattleAction } from '../js/pages/battle/auto-battle-ai.js';
import { NORMAL_ATTACK_ANIMATION_PROFILES } from '../js/pages/battle/normal-attack-animations.js';
import { calcFinalStats } from '../js/data/stat-calculator.js';

globalThis.localStorage = { getItem: () => null };
globalThis.document = { hidden: true, body: null, getElementById: () => null };

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(JOBS.plague_doctor?.name === 'ペスト医師', 'plague doctor is not registered');
assert(plague_doctor.changeCost === 1500000, 'change cost is not strict enough');
assert(plague_doctor.requirements.some(req => req.jobId === 'priest' && req.level === 150), 'priest requirement is missing');
assert(plague_doctor.requirements.some(req => req.jobId === 'dancer' && req.level === 150), 'dancer requirement is missing');
assert(JOB_STAT_GROWTH.plague_doctor && JOB_STAT_MULTIPLIER.plague_doctor, 'plague doctor stats are missing');
assert(Object.keys(AUTO_BATTLE_JOB_TACTICS.plague_doctor || {}).length === 5, 'plague doctor tactics are incomplete');
assert(NORMAL_ATTACK_ANIMATION_PROFILES.plague_doctor?.kind === 'plague_ritual', 'plague doctor normal attack is missing');

const protectedStats = calcFinalStats({
  jobId: 'plague_doctor',
  hp: { max: 100 }, mp: { max: 100 },
  baseStats: { atk: 10, def: 10, matk: 10, mdef: 10, spd: 10 },
  ailmentResist: {}, equipment: {},
  jobSkills: { plague_doctor: { sealed_mask: 10 } }
}, new Map());
assert(Object.values(protectedStats.ailmentResist).every(value => value === 66), 'sealed mask resistance is invalid');

plague_doctor.skills.forEach(skill => {
  assert(skill.maxLevel === 10, `${skill.id} max level is invalid`);
  assert(skill.levels.length === 10, `${skill.id} level table is incomplete`);
  skill.levels.forEach((config, index) => {
    assert(config.level === index + 1, `${skill.id} level order is invalid`);
    assert(Number.isFinite(config.spCost), `${skill.id} SP cost is invalid`);
  });
});

const caster = {
  id: 'doctor', jobId: 'plague_doctor', elementId: 'doctor', isDead: false, activeAilment: null,
  hp: { current: 800, max: 800 }, mp: { current: 999, max: 999 }, stats: { matk: 500 }
};
const makeEnemy = id => ({
  id, elementId: id, isDead: false, currentHp: 10000, maxHp: 10000, activeAilment: null,
  stats: { ailmentResist: { poison: 100, burn: 100, paralysis: 100, sleep: 100, confusion: 100, curse: 100, blind: 100, silence: 100 } }
});
const enemyA = makeEnemy('enemy-a');
const enemyB = makeEnemy('enemy-b');
const attacks = [];
const passiveConfigs = {
  pathology_mastery: { resistancePierce: 30 },
  virulence_theory: { statusDamagePercent: 40, extensionTurns: 5 }
};
const battle = {
  party: [caster], enemies: [enemyA, enemyB], selectedEnemyTarget: enemyA,
  showDamage() {}, renderEntities() {},
  _findSkill(_character, id) {
    return passiveConfigs[id] ? { level: 10, levelConfig: passiveConfigs[id] } : null;
  },
  executeAttack(_attacker, _target, _isParty, options) { attacks.push(options); }
};
const skill = id => plague_doctor.skills.find(candidate => candidate.id === id);
const originalRandom = Math.random;
Math.random = () => 0;

skill('pathogen_injection').execute(caster, skill('pathogen_injection').levels[9], battle);
assert(enemyA.activeAilment, 'pathogen injection did not pierce 100 ailment resistance');
assert(attacks.at(-1)?.damageMultiplier === 3.45, 'pathogen injection damage is invalid');

const originalType = enemyA.activeAilment.type;
const originalDuration = enemyA.activeAilment.duration;
skill('virulent_mutation').execute(caster, skill('virulent_mutation').levels[9], battle);
assert(enemyA.activeAilment.type !== originalType, 'virulent mutation did not change the ailment');
assert(enemyA.activeAilment.duration > originalDuration, 'virulent mutation did not extend the ailment');
assert(attacks.at(-1)?.damageMultiplier > 6, 'status damage bonuses were not applied');

skill('pandemic').execute(caster, skill('pandemic').levels[9], battle);
assert(enemyB.activeAilment?.type === enemyA.activeAilment.type, 'pandemic did not spread the active ailment');

const usable = ['pathogen_injection', 'corrosive_miasma', 'virulent_mutation', 'pandemic', 'black_death'].map(id => {
  const def = skill(id);
  return { id, def, levelConfig: def.levels[9] };
});
const choice = selectAutoBattleAction({
  character: caster,
  usableSkills: usable,
  context: { party: [caster], enemies: [enemyA, enemyB], selectedEnemyTarget: enemyA },
  findSkill: (_character, id) => passiveConfigs[id] ? { level: 10, levelConfig: passiveConfigs[id] } : null,
  isSkillEnabled: () => true
});
assert(choice.skill?.id === 'black_death', 'auto battle did not prioritize black death against an infected group');

Math.random = originalRandom;

if (typeof print === 'function') print('Plague Doctor tests passed.');
else console.log('Plague Doctor tests passed.');
