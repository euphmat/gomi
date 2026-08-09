import { bird } from '../js/jobs/bird.js';
import { JOBS } from '../js/jobs/index.js';
import { calcFinalStats } from '../js/data/stat-calculator.js';
import { actionMethods } from '../js/pages/battle/battle-actions.js';
import { resolveJobSkillLevelConfig } from '../js/utils/job-skill-potency.js';

globalThis.localStorage = { getItem: () => null };
globalThis.document = { hidden: true, body: null, getElementById: () => null };

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(JOBS.bird?.name === 'バード', 'bird is not registered');
assert(bird.skills.length === 6, 'bird should have six skills');
assert(bird.skills.filter(skill => skill.type === 'passive').length === 3, 'bird should have three passive skills');

bird.skills.forEach(skill => {
  assert(skill.maxLevel === 10, `${skill.id} max level is invalid`);
  assert(skill.levels.length === 10, `${skill.id} level table is incomplete`);
  skill.levels.forEach((config, index) => {
    assert(config.level === index + 1, `${skill.id} level order is invalid`);
    assert(Number.isFinite(config.spCost), `${skill.id} SP cost is invalid`);
  });
});

const bardicMastery = bird.skills.find(skill => skill.id === 'bardic_mastery');
const masteryAtMax = resolveJobSkillLevelConfig(bardicMastery, 10, 'current');
assert(masteryAtMax.bonusMpPercent === 33, 'current-job MP potency is invalid');
assert(masteryAtMax.bonusMatkPercent === 22, 'current-job MATK potency is invalid');

const character = {
  jobId: 'bird',
  hp: { max: 100 }, mp: { max: 100 },
  baseStats: { atk: 100, def: 100, matk: 100, mdef: 100, spd: 100 },
  jobSkills: { bird: { bardic_mastery: 10 } }
};
const stats = calcFinalStats(character, new Map());
assert(stats.mp === 186, 'bardic mastery MP bonus was not applied');
assert(stats.matk === 128, 'bardic mastery MATK bonus was not applied');

const dreamEcho = bird.skills.find(skill => skill.id === 'dream_echo');
const inheritedDreamEcho = resolveJobSkillLevelConfig(dreamEcho, 10, 'inherited');
assert(inheritedDreamEcho.sleepingTargetDamagePercent === 27, 'inherited dream echo potency is invalid');

const attacker = {
  id: 'bird', name: 'bird', elementId: 'bird', isDead: false, activeAilment: null,
  hp: { current: 1000, max: 1000 }, mp: { current: 100, max: 100 }, atb: 100,
  stats: {
    hp: 1000, atk: 100, def: 0, matk: 0, mdef: 0,
    attackElements: {}, attackAilments: {}, elementResist: {}, ailmentResist: {}
  },
  jobSkills: { bird: { dream_echo: 10 } }
};
const sleepingEnemy = {
  id: 'enemy', name: 'enemy', elementId: 'enemy', isDead: false,
  currentHp: 1000, maxHp: 1000,
  activeAilment: { type: 'sleep', duration: 10 },
  stats: { hp: 1000, atk: 0, def: 0, matk: 0, mdef: 0, elementResist: {}, ailmentResist: {} }
};
const battle = {
  ...actionMethods,
  party: [attacker], enemies: [sleepingEnemy], activeCharacter: attacker,
  equipMap: new Map(), isStopped: false, _cachedDisableAnim: true, speedMult: 5,
  showActionName() {}, showDamage() {}, renderEntities() {}, checkBattleEnd() {},
  processEnemyDeath() {}, _waitForAttackAnimation() {},
  _scheduleBattleTimeout(callback) { callback(); },
  _findSkill(_character, id) {
    return id === 'dream_echo'
      ? { level: 10, def: dreamEcho, levelConfig: dreamEcho.levels[9] }
      : { level: 0, def: null, levelConfig: null };
  }
};

const originalRandom = Math.random;
Math.random = () => 0.5;
battle.executeAttack(attacker, sleepingEnemy, true);
Math.random = originalRandom;
assert(sleepingEnemy.currentHp === 870, 'dream echo did not increase sleeping-target damage by 30%');

if (typeof print === 'function') print('Bird tests passed.');
else console.log('Bird tests passed.');
