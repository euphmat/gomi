import { guardian } from '../js/jobs/guardian.js';
import { JOBS, JOB_STAT_GROWTH, JOB_STAT_MULTIPLIER } from '../js/jobs/index.js';
import { actionMethods } from '../js/pages/battle/battle-actions.js';
import { AUTO_BATTLE_JOB_TACTICS } from '../js/pages/battle/auto-battle-ai.js';

globalThis.localStorage = { getItem: () => null };
globalThis.document = { hidden: true, body: null, getElementById: () => null };

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(JOBS.guardian?.name === 'ガーディアン', 'guardian is not registered');
assert(guardian.requirements.some(req => req.jobId === 'knight' && req.level === 100), 'knight requirement is missing');
assert(guardian.requirements.some(req => req.jobId === 'paladin' && req.level === 100), 'paladin requirement is missing');
assert(JOB_STAT_GROWTH.guardian && JOB_STAT_MULTIPLIER.guardian, 'guardian stats are missing');
assert(Object.keys(AUTO_BATTLE_JOB_TACTICS.guardian || {}).length === 3, 'guardian auto-battle tactics are missing');

guardian.skills.forEach(skill => {
  assert(skill.maxLevel === 10, `${skill.id} max level is invalid`);
  assert(skill.levels.length === 10, `${skill.id} level table is incomplete`);
  skill.levels.forEach((config, index) => {
    assert(config.level === index + 1, `${skill.id} level order is invalid`);
    assert(Number.isFinite(config.spCost), `${skill.id} SP cost is invalid`);
  });
});

const caster = {
  jobId: 'guardian', elementId: 'guardian', isDead: false,
  hp: { current: 1000, max: 1000 }, mp: { current: 500, max: 500 },
  stats: { hp: 1000, atk: 100, def: 300, mdef: 200 }
};
const ally = {
  elementId: 'ally', isDead: false,
  hp: { current: 500, max: 500 }, stats: { hp: 500 }
};
const enemy = { elementId: 'enemy', isDead: false };
const battle = {
  party: [caster, ally], enemies: [enemy], selectedEnemyTarget: enemy,
  showDamage() {}, renderEntities() {}, executeAttack(attacker, target, isParty, options) {
    this.lastAttack = { attacker, target, isParty, options, atkDuringAttack: attacker.stats.atk };
  }
};

const oath = guardian.skills.find(skill => skill.id === 'guardian_oath');
oath.execute(caster, oath.levels[9], battle);
assert(caster._guardianCoverTurns === 5 && caster._guardianCoverReduction === 42, 'guardian oath was not applied');

const wall = guardian.skills.find(skill => skill.id === 'impregnable_wall');
wall.execute(caster, wall.levels[0], battle);
assert(caster._barrierHp === 60 && ally._barrierHp === 60, 'party barrier was not applied');
assert(ally._defBuffPercent === 10 && ally._mdefBuffPercent === 10, 'party defense buffs were not applied');

const bash = guardian.skills.find(skill => skill.id === 'aegis_bash');
bash.execute(caster, bash.levels[9], battle);
assert(battle.lastAttack?.target === enemy, 'aegis bash target is invalid');
assert(battle.lastAttack.atkDuringAttack === 600, 'aegis bash did not add DEF and MDEF');
assert(caster.stats.atk === 100, 'aegis bash did not restore ATK');

const makeCombatant = overrides => ({
  id: 'unit', name: 'unit', elementId: 'unit', isDead: false, activeAilment: null,
  hp: { current: 1000, max: 1000 }, mp: { current: 0, max: 0 },
  stats: {
    hp: 1000, atk: 100, def: 0, matk: 0, mdef: 0,
    attackElements: {}, attackAilments: {}, elementResist: {}, ailmentResist: {}
  },
  jobSkills: {},
  ...overrides
});

const makeActionBattle = party => ({
  ...actionMethods,
  party,
  equipMap: new Map(),
  isStopped: false,
  _cachedDisableAnim: true,
  speedMult: 5,
  showActionName() {}, showDamage() {}, renderEntities() {}, checkBattleEnd() {},
  processEnemyDeath() {}, _waitForAttackAnimation() {},
  _scheduleBattleTimeout(callback) { callback(); },
  _findSkill(character, id) {
    if (id === 'last_bastion' && character.hasLastBastion) {
      return { level: 10, levelConfig: { revivePercent: 25 }, def: { type: 'passive' } };
    }
    return { level: 0, levelConfig: null, def: null };
  }
});

const protectedAlly = makeCombatant({ id: 'ally', elementId: 'ally', hp: { current: 500, max: 500 }, stats: { ...makeCombatant({}).stats, hp: 500 } });
const coveringGuardian = makeCombatant({
  id: 'guardian', elementId: 'guardian',
  _guardianCoverTurns: 3, _guardianCoverReduction: 50
});
const attacker = {
  id: 'monster', name: 'monster', elementId: 'monster', isDead: false, activeAilment: null,
  currentHp: 1000, maxHp: 1000,
  stats: { atk: 100, matk: 0, attackElements: {}, attackAilments: {} }
};
const coverBattle = makeActionBattle([protectedAlly, coveringGuardian]);
coverBattle.executeAttack(attacker, protectedAlly, false, { isAoEProcessed: true });
assert(protectedAlly.hp.current === 500, 'covered ally took damage');
assert(coveringGuardian.hp.current < 1000 && coveringGuardian.hp.current > 930, 'AoE cover damage or reduction is invalid');

const lastStandGuardian = makeCombatant({
  id: 'last-stand', elementId: 'last-stand', hp: { current: 50, max: 1000 },
  hasLastBastion: true
});
const lethalAttacker = { ...attacker, stats: { ...attacker.stats, atk: 5000 } };
const lastStandBattle = makeActionBattle([lastStandGuardian]);
lastStandBattle.executeAttack(lethalAttacker, lastStandGuardian, false);
assert(lastStandGuardian.hp.current === 250, 'last bastion recovery is invalid');
assert(lastStandGuardian._guardianLastBastionUsed === true, 'last bastion use was not recorded');
lastStandBattle.executeAttack(lethalAttacker, lastStandGuardian, false);
assert(lastStandGuardian.isDead && lastStandGuardian.hp.current === 0, 'last bastion triggered more than once');

print('Guardian tests passed.');
