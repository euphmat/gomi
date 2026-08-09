import { cryomancer } from '../js/jobs/cryomancer.js';
import { JOBS, JOB_STAT_GROWTH, JOB_STAT_MULTIPLIER } from '../js/jobs/index.js';
import { ailmentMethods } from '../js/pages/battle/battle-ailments.js';
import { AUTO_BATTLE_JOB_TACTICS } from '../js/pages/battle/auto-battle-ai.js';

globalThis.localStorage = { getItem: () => null };
globalThis.document = { hidden: true, body: null, getElementById: () => null };

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(JOBS.cryomancer?.name === 'クライオマンサー', 'cryomancer is not registered');
assert(cryomancer.requirements.some(req => req.jobId === 'mage' && req.level === 100), 'mage requirement is missing');
assert(cryomancer.requirements.some(req => req.jobId === 'poseidon' && req.level === 100), 'poseidon requirement is missing');
assert(JOB_STAT_GROWTH.cryomancer && JOB_STAT_MULTIPLIER.cryomancer, 'cryomancer stats are missing');
assert(Object.keys(AUTO_BATTLE_JOB_TACTICS.cryomancer || {}).length === 4, 'cryomancer auto-battle tactics are missing');

cryomancer.skills.forEach(skill => {
  assert(skill.maxLevel === 10, `${skill.id} max level is invalid`);
  assert(skill.levels.length === 10, `${skill.id} level table is incomplete`);
  skill.levels.forEach((config, index) => {
    assert(config.level === index + 1, `${skill.id} level order is invalid`);
    assert(Number.isFinite(config.spCost), `${skill.id} SP cost is invalid`);
  });
});

const frozen = { activeAilment: { type: 'freeze', duration: 1 }, isDead: false };
const battle = {
  ...ailmentMethods,
  speedMult: 5,
  _scheduleBattleTimeout(callback) { callback(); },
  renderEntities() {}
};
assert(battle.processPreActionAilment(frozen) === true, 'freeze did not skip the action');
assert(frozen.activeAilment === null, 'expired freeze was not cleared');

const absoluteZero = cryomancer.skills.find(skill => skill.id === 'absolute_zero');
assert(absoluteZero.levels[9].shatterMultiplier === 1.70, 'absolute zero shatter scaling is invalid');

const caster = {
  jobId: 'cryomancer', elementId: 'caster', isDead: false, activeAilment: null,
  hp: { current: 1000, max: 1000 }, mp: { current: 999, max: 999 },
  stats: { matk: 500 }
};
const enemy = {
  elementId: 'enemy', isDead: false, currentHp: 1000, maxHp: 1000,
  activeAilment: null, stats: { ailmentResist: { paralysis: 0 }, elementResist: { ice: 0 } }
};
const actionBattle = {
  party: [caster], enemies: [enemy], selectedEnemyTarget: enemy,
  showDamage() {}, renderEntities() {},
  _findSkill: () => ({ level: 0, levelConfig: null }),
  executeAttack(attacker, target, isParty, options) {
    this.lastAttack = { attacker, target, isParty, options };
  }
};

const frostSpear = cryomancer.skills.find(skill => skill.id === 'frost_spear');
frostSpear.execute(caster, { multiplier: 2, freezeChance: 100, freezeTurns: 1 }, actionBattle);
assert(actionBattle.lastAttack?.options.element === 'ice', 'frost spear is not an ice attack');
assert(enemy.activeAilment?.type === 'freeze', 'frost spear did not apply freeze');

absoluteZero.execute(caster, { multiplier: 2, shatterMultiplier: 1.5 }, actionBattle);
assert(actionBattle.lastAttack?.options.damageMultiplier === 3, 'absolute zero did not apply shatter damage');
assert(enemy.activeAilment === null, 'absolute zero did not shatter freeze');

if (typeof print === 'function') print('Cryomancer tests passed.');
else console.log('Cryomancer tests passed.');
