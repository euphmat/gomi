import { magic_archer } from '../js/jobs/magic_archer.js';
import { JOBS, JOB_STAT_GROWTH, JOB_STAT_MULTIPLIER } from '../js/jobs/index.js';
import { AUTO_BATTLE_JOB_TACTICS } from '../js/pages/battle/auto-battle-ai.js';

globalThis.localStorage = { getItem: () => null };
globalThis.document = { hidden: true, body: null, getElementById: () => null };

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(JOBS.magic_archer?.name === 'マジックアーチャー', 'magic archer is not registered');
assert(magic_archer.requirements.some(req => req.jobId === 'ranger' && req.level === 100), 'ranger requirement is missing');
assert(magic_archer.requirements.some(req => req.jobId === 'mage' && req.level === 100), 'mage requirement is missing');
assert(JOB_STAT_GROWTH.magic_archer && JOB_STAT_MULTIPLIER.magic_archer, 'magic archer stats are missing');
assert(Object.keys(AUTO_BATTLE_JOB_TACTICS.magic_archer || {}).length === 4, 'magic archer auto-battle tactics are missing');

magic_archer.skills.forEach(skill => {
  assert(skill.maxLevel === 10, `${skill.id} max level is invalid`);
  assert(skill.levels.length === 10, `${skill.id} level table is incomplete`);
  skill.levels.forEach((config, index) => {
    assert(config.level === index + 1, `${skill.id} level order is invalid`);
    assert(Number.isFinite(config.spCost), `${skill.id} SP cost is invalid`);
  });
});

const caster = {
  jobId: 'magic_archer', elementId: 'caster', isDead: false, activeAilment: null,
  hp: { current: 1000, max: 1000 }, mp: { current: 999, max: 999 },
  stats: { matk: 500 }
};
const enemy = {
  elementId: 'enemy', isDead: false, currentHp: 1000, maxHp: 1000,
  stats: {
    elementResist: {
      fire: 20, water: 10, grass: 30, ice: 40, thunder: 15,
      wind: 25, earth: 50, light: 5, dark: -50
    }
  }
};
const battle = {
  party: [caster], enemies: [enemy], selectedEnemyTarget: enemy, isStopped: false,
  showDamage() {}, renderEntities() {},
  executeAttack(attacker, target, isParty, options) {
    this.lastAttack = { attacker, target, isParty, options };
  },
  _scheduleBattleTimeout(callback) { callback(); }
};

const arcaneArrow = magic_archer.skills.find(skill => skill.id === 'arcane_arrow');
arcaneArrow.execute(caster, arcaneArrow.levels[0], battle);
assert(battle.lastAttack?.options.statDependency === 'MAT', 'arcane arrow is not a magic attack');
assert(!battle.lastAttack.options.element, 'arcane arrow should be non-elemental');

const elementalArrow = magic_archer.skills.find(skill => skill.id === 'elemental_arrow');
elementalArrow.execute(caster, elementalArrow.levels[0], battle);
assert(battle.lastAttack?.options.element === 'dark', 'elemental arrow did not choose the weakest resistance');

const astralRain = magic_archer.skills.find(skill => skill.id === 'astral_arrow_rain');
astralRain.execute(caster, astralRain.levels[0], battle);
assert(battle.lastAttack?.options.element === 'light', 'astral rain is not a light attack');
assert(battle.lastAttack?.options.isAoEProcessed === true, 'astral rain is not marked as an area attack');

if (typeof print === 'function') print('Magic Archer tests passed.');
else console.log('Magic Archer tests passed.');
