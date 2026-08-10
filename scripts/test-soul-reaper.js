import {
  SOUL_REAPER_MAX_CORPSES,
  addSoulReaperCorpses,
  consumeSoulReaperCorpses,
  getSoulReaperCorpseStock,
  soul_reaper
} from '../js/jobs/soul_reaper.js';
import { JOBS, JOB_STAT_GROWTH, JOB_STAT_MULTIPLIER } from '../js/jobs/index.js';
import { actionMethods } from '../js/pages/battle/battle-actions.js';
import { AUTO_BATTLE_JOB_TACTICS } from '../js/pages/battle/auto-battle-ai.js';
import { NORMAL_ATTACK_ANIMATION_PROFILES } from '../js/pages/battle/normal-attack-animations.js';

globalThis.localStorage = { getItem: () => null };
globalThis.document = { hidden: true, body: null, getElementById: () => null };

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(JOBS.soul_reaper?.name === 'ソウルリーパー', 'soul reaper is not registered');
assert(soul_reaper.tier === 'super_advanced', 'soul reaper tier is invalid');
assert(soul_reaper.changeCost === 5000000, 'soul reaper change cost is invalid');
assert(soul_reaper.requirements.some(req => req.jobId === 'black_knight' && req.level === 200), 'black knight requirement is missing');
assert(soul_reaper.requirements.some(req => req.jobId === 'plague_doctor' && req.level === 200), 'plague doctor requirement is missing');
assert(JOB_STAT_GROWTH.soul_reaper && JOB_STAT_MULTIPLIER.soul_reaper, 'soul reaper stats are missing');
assert(Object.keys(AUTO_BATTLE_JOB_TACTICS.soul_reaper || {}).length === 5, 'soul reaper auto tactics are missing');
assert(SOUL_REAPER_MAX_CORPSES === 5, 'corpse stock cap must be 5');
assert(NORMAL_ATTACK_ANIMATION_PROFILES.soul_reaper?.kind === 'soul_reaping', 'soul reaper normal attack animation is missing');

soul_reaper.skills.forEach(skill => {
  assert(skill.maxLevel === 10, `${skill.id} max level is invalid`);
  assert(skill.levels.length === 10, `${skill.id} level table is incomplete`);
  skill.levels.forEach((config, index) => {
    assert(config.level === index + 1, `${skill.id} level order is invalid`);
    assert(Number.isFinite(config.spCost), `${skill.id} SP cost is invalid`);
  });
});

const makeCaster = (corpses = 0) => ({
  id: 'reaper', jobId: 'soul_reaper', elementId: 'reaper', isDead: false, atb: 1000,
  _soulReaperCorpses: corpses,
  hp: { current: 1000, max: 1000 }, mp: { current: 2000, max: 2000 },
  stats: { hp: 1000, mp: 2000, atk: 400, def: 200, matk: 600, mdef: 300, attackAilments: {} }
});
const makeEnemy = id => ({
  id, elementId: id, isDead: false, currentHp: 999999, maxHp: 999999,
  stats: { hp: 999999, def: 100, mdef: 100, elementResist: {}, ailmentResist: {} }
});
const makeBattle = caster => {
  const enemies = [makeEnemy('enemy-a'), makeEnemy('enemy-b')];
  const ally = {
    id: 'ally', elementId: 'ally', isDead: false, atb: 0,
    hp: { current: 500, max: 500 }, stats: { hp: 500, def: 100, mdef: 100 }
  };
  const fallen = {
    id: 'fallen', elementId: 'fallen', isDead: true, atb: 500,
    hp: { current: 0, max: 800 }, stats: { hp: 800, def: 100, mdef: 100 }
  };
  const battle = {
    party: [caster, ally, fallen], enemies, selectedEnemyTarget: enemies[0], attacks: [],
    showDamage() {}, showActionName() {}, renderEntities() {},
    _findSkill() { return { level: 0, levelConfig: null }; },
    executeAttack(attacker, target, isParty, options) {
      this.attacks.push({ attacker, target, isParty, options });
    }
  };
  return { battle, enemies, ally, fallen };
};
const skill = id => soul_reaper.skills.find(candidate => candidate.id === id);

{
  const caster = makeCaster(4);
  addSoulReaperCorpses(caster, 10);
  assert(getSoulReaperCorpseStock(caster) === 5, 'corpse stock exceeded 5');
  assert(consumeSoulReaperCorpses(caster, 2) === 2 && getSoulReaperCorpseStock(caster) === 3, 'corpse consumption is invalid');
}

{
  const caster = makeCaster();
  const { battle } = makeBattle(caster);
  const def = skill('soul_harvest');
  def.execute(caster, def.levels[0], battle);
  assert(getSoulReaperCorpseStock(caster) === 1, 'soul harvest did not summon a corpse');
  assert(battle.attacks.length === 1 && battle.attacks[0].options.element === 'dark', 'soul harvest attack is invalid');
}

{
  const caster = makeCaster(1);
  const { battle } = makeBattle(caster);
  const def = skill('corpse_vanguard');
  def.execute(caster, def.levels[0], battle);
  assert(getSoulReaperCorpseStock(caster) === 0, 'corpse vanguard did not consume a corpse');
  assert(battle.attacks.length === 3, 'corpse vanguard hit count is invalid');
}

{
  const caster = makeCaster(0);
  const { battle } = makeBattle(caster);
  const def = skill('corpse_vanguard');
  def.execute(caster, def.levels[0], battle);
  assert(battle.attacks.length === 0, 'corpse vanguard bypassed its corpse cost');
}

{
  const caster = makeCaster(1);
  const { battle, ally } = makeBattle(caster);
  const def = skill('ossuary_aegis');
  def.execute(caster, def.levels[0], battle);
  assert(getSoulReaperCorpseStock(caster) === 0, 'ossuary aegis did not consume a corpse');
  assert(ally._barrierHp > 0 && ally._defBuffTurns === 3 && ally._mdefBuffTurns === 3, 'ossuary aegis protection is invalid');
}

{
  const caster = makeCaster(3);
  const { battle } = makeBattle(caster);
  const def = skill('march_of_dead');
  def.execute(caster, def.levels[0], battle);
  assert(getSoulReaperCorpseStock(caster) === 0, 'march of dead did not consume 3 corpses');
  assert(battle.attacks.length === 6, 'march of dead should hit two enemies in three waves');
}

{
  const caster = makeCaster(5);
  const { battle, fallen } = makeBattle(caster);
  const def = skill('last_requiem');
  def.execute(caster, def.levels[9], battle);
  assert(getSoulReaperCorpseStock(caster) === 0, 'last requiem did not consume all corpses');
  assert(battle.attacks.length === 10, 'last requiem should hit two enemies five times');
  assert(!fallen.isDead && fallen.hp.current === 560, 'last requiem did not revive the fallen ally at 70% HP');
}

{
  const caster = makeCaster(2);
  caster.hp.current = 0;
  const battle = {
    _findSkill: () => ({ level: 10, levelConfig: { revivePercent: 50 } }),
    showActionName() {}, showDamage() {}, renderEntities() {}
  };
  const survived = actionMethods.trySoulReaperDeathDenial.call(battle, caster);
  assert(survived, 'death denial did not activate');
  assert(caster.hp.current === 500 && getSoulReaperCorpseStock(caster) === 1, 'death denial recovery or cost is invalid');
}

if (typeof print === 'function') print('Soul Reaper tests passed.');
else console.log('Soul Reaper tests passed.');
