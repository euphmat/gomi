import { dragoon } from '../js/jobs/dragoon.js';
import { JOBS, JOB_STAT_GROWTH, JOB_STAT_MULTIPLIER } from '../js/jobs/index.js';
import { calcFinalStats } from '../js/data/stat-calculator.js';
import { actionMethods } from '../js/pages/battle/battle-actions.js';
import { AUTO_BATTLE_JOB_TACTICS, selectAutoBattleAction } from '../js/pages/battle/auto-battle-ai.js';
import { NORMAL_ATTACK_ANIMATION_PROFILES } from '../js/pages/battle/normal-attack-animations.js';

if (typeof window === 'undefined') {
  globalThis.localStorage = { getItem: () => null };
  globalThis.document = { hidden: true, body: null, getElementById: () => null };
} else {
  localStorage.removeItem('soundEffectsEnabled');
  localStorage.setItem('disableBattleAnimations', 'true');
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(JOBS.dragoon?.name === 'ドラグーン', 'dragoon is not registered');
assert(dragoon.requirements.some(req => req.jobId === 'knight' && req.level === 100), 'knight requirement is missing');
assert(dragoon.requirements.some(req => req.jobId === 'ranger' && req.level === 100), 'ranger requirement is missing');
assert(JOB_STAT_GROWTH.dragoon && JOB_STAT_MULTIPLIER.dragoon, 'dragoon stats are missing');
assert(Object.keys(AUTO_BATTLE_JOB_TACTICS.dragoon || {}).length === 4, 'dragoon auto-battle tactics are missing');
assert(NORMAL_ATTACK_ANIMATION_PROFILES.dragoon?.kind === 'dragon_lance', 'dragoon normal attack animation is missing');

dragoon.skills.forEach(skill => {
  assert(skill.maxLevel === 10, `${skill.id} max level is invalid`);
  assert(skill.levels.length === 10, `${skill.id} level table is incomplete`);
  skill.levels.forEach((config, index) => {
    assert(config.level === index + 1, `${skill.id} level order is invalid`);
    assert(Number.isFinite(config.spCost), `${skill.id} SP cost is invalid`);
  });
});

const dragoonStats = calcFinalStats({
  jobId: 'dragoon',
  hp: { current: 100, max: 100 }, mp: { current: 50, max: 50 },
  baseStats: { atk: 100, def: 50, matk: 10, mdef: 30, spd: 40 },
  jobSkills: { dragoon: { lance_mastery: 10 } },
  equipment: {}
}, new Map());
assert(dragoonStats.atk === 195, 'lance mastery ATK multiplier was not applied before the job multiplier');

const caster = {
  jobId: 'dragoon', elementId: 'dragoon', isDead: false, activeAilment: null,
  hp: { current: 1000, max: 1000 }, mp: { current: 999, max: 999 },
  stats: { hp: 1000, atk: 500, def: 200, mdef: 120, spd: 180 }
};
const enemies = [
  { elementId: 'enemy-1', isDead: false, currentHp: 1000, maxHp: 1000, stats: { hp: 1000, def: 300 } },
  { elementId: 'enemy-2', isDead: false, currentHp: 800, maxHp: 800, stats: { hp: 800, def: 200 } }
];
const dragonHeart = dragoon.skills.find(skill => skill.id === 'dragon_heart');
const lanceMastery = dragoon.skills.find(skill => skill.id === 'lance_mastery');
const battle = {
  party: [caster], enemies, selectedEnemyTarget: enemies[0], isStopped: false,
  attacks: [],
  showDamage() {}, renderEntities() {},
  executeAttack(attacker, target, isParty, options) {
    this.attacks.push({ attacker, target, isParty, options });
  },
  _findSkill(character, id) {
    if (id === 'dragon_heart') return { level: 10, levelConfig: dragonHeart.levels[9], def: dragonHeart };
    if (id === 'lance_mastery') return { level: 10, levelConfig: lanceMastery.levels[9], def: lanceMastery };
    return { level: 0, levelConfig: null, def: null };
  }
};

const piercingLance = dragoon.skills.find(skill => skill.id === 'piercing_lance');
piercingLance.execute(caster, piercingLance.levels[0], battle);
assert(caster._dragoonSpirit === 1, 'piercing lance did not build dragon spirit');
assert(battle.attacks.at(-1).options.defenseIgnorePercent === 32, 'lance mastery penetration was not added');

const highJump = dragoon.skills.find(skill => skill.id === 'high_jump');
highJump.execute(caster, highJump.levels[0], battle);
assert(caster._dragoonSpirit === 2, 'high jump did not build dragon spirit');
assert(battle.attacks.at(-1).options.element === 'wind', 'high jump is not a wind attack');
assert(battle.attacks.at(-1).options.damageMultiplier === 1.70 * 1.20, 'high jump opening bonus is invalid');

const dragonSweep = dragoon.skills.find(skill => skill.id === 'dragon_sweep');
const attacksBeforeSweep = battle.attacks.length;
dragonSweep.execute(caster, dragonSweep.levels[0], battle);
assert(caster._dragoonSpirit === 3, 'dragon sweep did not build dragon spirit');
assert(battle.attacks.length === attacksBeforeSweep + 2, 'dragon sweep did not hit every enemy');
assert(battle.attacks.slice(-2).every(attack => attack.options.isAoEProcessed), 'dragon sweep is not marked as an area attack');

const skyfallDive = dragoon.skills.find(skill => skill.id === 'skyfall_dive');
skyfallDive.execute(caster, skyfallDive.levels[0], battle);
assert(caster._dragoonSpirit === 0, 'skyfall dive did not consume dragon spirit');
assert(Math.abs(battle.attacks.at(-1).options.damageMultiplier - 3.35) < 1e-9, 'skyfall dive spirit multiplier is invalid');

const usableSkills = dragoon.skills
  .filter(skill => skill.type !== 'passive')
  .map(def => ({ id: def.id, def, levelConfig: def.levels[0] }));
const aiContext = { party: [caster], enemies, selectedEnemyTarget: enemies[0] };
const findSkill = (character, id) => id === 'dragon_heart'
  ? { level: 10, levelConfig: dragonHeart.levels[9], def: dragonHeart }
  : { level: 0, levelConfig: null, def: null };

caster._dragoonSpirit = 2;
let aiAction = selectAutoBattleAction({
  character: caster, usableSkills, context: aiContext, findSkill,
  isSkillEnabled: () => true
});
assert(aiAction.skill?.id !== 'skyfall_dive', 'auto battle spent dragon spirit before it was full');

caster._dragoonSpirit = 5;
aiAction = selectAutoBattleAction({
  character: caster, usableSkills, context: aiContext, findSkill,
  isSkillEnabled: () => true
});
assert(aiAction.skill?.id === 'skyfall_dive', 'auto battle did not spend full dragon spirit');

const makeActionBattle = () => ({
  ...actionMethods,
  party: [], equipMap: new Map(), isStopped: false, _cachedDisableAnim: true, speedMult: 5,
  showActionName() {}, showDamage() {}, renderEntities() {}, checkBattleEnd() {},
  processEnemyDeath() {}, _waitForAttackAnimation() {},
  _scheduleBattleTimeout(callback) { callback(); },
  _findSkill() { return { level: 0, levelConfig: null, def: null }; }
});
const attacker = {
  id: 'dragoon', name: 'dragoon', elementId: 'dragoon', isDead: false, activeAilment: null, atb: 100,
  hp: { current: 1000, max: 1000 }, stats: {
    hp: 1000, atk: 100, def: 0, matk: 0, mdef: 0,
    attackElements: {}, attackAilments: {}, elementResist: {}, ailmentResist: {}
  }
};
const makeDefender = () => ({
  id: 'target', name: 'target', elementId: 'target', isDead: false, activeAilment: null,
  currentHp: 1000, maxHp: 1000,
  stats: { hp: 1000, atk: 0, def: 100, matk: 0, mdef: 0, attackElements: {}, attackAilments: {}, elementResist: {}, ailmentResist: {} }
});
const originalRandom = Math.random;
Math.random = () => .5;
const noPenetrationTarget = makeDefender();
makeActionBattle().executeAttack(attacker, noPenetrationTarget, true, { statDependency: 'ATK', damageType: 'skill' });
const penetrationTarget = makeDefender();
makeActionBattle().executeAttack(attacker, penetrationTarget, true, {
  statDependency: 'ATK', damageType: 'skill', defenseIgnorePercent: 50
});
Math.random = originalRandom;
assert(noPenetrationTarget.currentHp === 950, 'baseline physical damage is invalid');
assert(penetrationTarget.currentHp === 925, 'physical defense penetration was not applied');

if (typeof print === 'function') print('Dragoon tests passed.');
else console.log('Dragoon tests passed.');
if (typeof window !== 'undefined') document.body.textContent = 'Dragoon tests passed.';
