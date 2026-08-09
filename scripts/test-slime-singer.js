import { slime_singer } from '../js/jobs/slime_singer.js';
import { JOBS, JOB_STAT_GROWTH, JOB_STAT_MULTIPLIER } from '../js/jobs/index.js';
import { AUTO_BATTLE_JOB_TACTICS } from '../js/pages/battle/auto-battle-ai.js';
import { NORMAL_ATTACK_ANIMATION_PROFILES } from '../js/pages/battle/normal-attack-animations.js';

globalThis.localStorage = { getItem: () => null };
globalThis.document = { hidden: true, body: null, getElementById: () => null };

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(JOBS.slime_singer?.name === 'スライムシンガー', 'slime singer is not registered');
assert(slime_singer.requirements.some(req => req.jobId === 'bird' && req.level === 100), 'bard requirement is missing');
assert(slime_singer.requirements.some(req => req.jobId === 'slime_master' && req.level === 100), 'slime master requirement is missing');
assert(JOB_STAT_GROWTH.slime_singer && JOB_STAT_MULTIPLIER.slime_singer, 'slime singer stats are missing');
assert(Object.keys(AUTO_BATTLE_JOB_TACTICS.slime_singer || {}).length === 5, 'slime singer auto-battle tactics are missing');
assert(NORMAL_ATTACK_ANIMATION_PROFILES.slime_singer?.kind === 'slime_serenade', 'slime singer normal attack is missing');

slime_singer.skills.forEach(skill => {
  assert(skill.maxLevel === 10, `${skill.id} max level is invalid`);
  assert(skill.levels.length === 10, `${skill.id} level table is incomplete`);
  skill.levels.forEach((config, index) => {
    assert(config.level === index + 1, `${skill.id} level order is invalid`);
    assert(Number.isFinite(config.spCost), `${skill.id} SP cost is invalid`);
  });
});

const caster = {
  jobId: 'slime_singer', elementId: 'singer', isDead: false, activeAilment: null,
  hp: { current: 800, max: 1000 }, mp: { current: 400, max: 500 },
  stats: { hp: 1000, mp: 500, matk: 200, attackAilments: {} }
};
const ally = {
  elementId: 'ally', isDead: false, activeAilment: null,
  hp: { current: 200, max: 600 }, mp: { current: 20, max: 100 },
  stats: { hp: 600, mp: 100 }
};
const enemy = {
  elementId: 'enemy', isDead: false, currentHp: 1000, maxHp: 1000,
  activeAilment: { type: 'sleep', duration: 5 }, stats: { ailmentResist: {} }
};
const passive = slime_singer.skills.find(skill => skill.id === 'resonant_gel');
const battle = {
  party: [caster, ally], enemies: [enemy], selectedEnemyTarget: enemy,
  showDamage() {}, renderEntities() {},
  _findSkill(_character, id) {
    return id === 'resonant_gel' ? { level: 10, def: passive, levelConfig: passive.levels[9] } : null;
  },
  executeAttack(attacker, target, isParty, options) {
    this.lastAttack = { attacker, target, isParty, options };
  }
};

const jellyNote = slime_singer.skills.find(skill => skill.id === 'jelly_note');
jellyNote.execute(caster, jellyNote.levels[0], battle);
assert(caster._slimeSingerNotes === 1, 'jelly note did not build a note');
assert(battle.lastAttack?.options.damageMultiplier === jellyNote.levels[0].multiplier * 1.6, 'sleep bonus is missing');
assert(battle.lastAttack.options.element, 'jelly note element is missing');

const barrier = slime_singer.skills.find(skill => skill.id === 'elastic_refrain');
barrier.execute(caster, barrier.levels[0], battle);
assert(caster._slimeSingerNotes === 2, 'barrier did not build a note');
assert(ally._barrierHp === 70 && ally._ailmentResistBuffAmount === 10, 'elastic refrain effects are invalid');

const healing = slime_singer.skills.find(skill => skill.id === 'healing_refrain');
healing.execute(caster, healing.levels[0], battle);
assert(caster._slimeSingerNotes === 3, 'healing refrain did not build a note');
assert(ally.hp.current === 276 && ally.mp.current === 23, 'healing refrain recovery is invalid');

const chorus = slime_singer.skills.find(skill => skill.id === 'king_slime_chorus');
chorus.execute(caster, chorus.levels[0], battle);
assert(caster._slimeSingerNotes === 0, 'king slime chorus did not consume notes');
assert(battle.lastAttack?.options.damageMultiplier === 1.71, 'king slime chorus note scaling is invalid');
assert(battle.lastAttack.options.element === 'light' && battle.lastAttack.options.isAoEProcessed, 'king slime chorus attack flags are invalid');

if (typeof print === 'function') print('Slime Singer tests passed.');
else console.log('Slime Singer tests passed.');
