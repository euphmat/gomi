import { actionMethods } from '../js/pages/battle/battle-actions.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const effects = [];
const makeElement = rect => ({
  style: {},
  className: '',
  animations: [],
  classList: { contains: () => false },
  setAttribute() {},
  remove() {},
  appendChild(child) { effects.push(child); },
  getBoundingClientRect: () => rect,
  animate(_keyframes, timing) {
    this.animations.push(timing);
    return { onfinish: null, oncancel: null };
  }
});

const attackerEl = makeElement({ left: 20, top: 40, width: 60, height: 60 });
const defenderEl = makeElement({ left: 300, top: 80, width: 80, height: 80 });
const effectsLayer = makeElement({ left: 0, top: 0, width: 400, height: 300 });

globalThis.localStorage = {
  getItem(key) {
    if (key === 'autoBattleSpeed') return '1';
    return null;
  }
};
globalThis.matchMedia = () => ({ matches: false });
globalThis.document = {
  hidden: false,
  body: effectsLayer,
  createElement: () => makeElement({ left: 0, top: 0, width: 0, height: 0 }),
  getElementById(id) {
    if (id === 'mage') return attackerEl;
    if (id === 'enemy') return defenderEl;
    if (id === 'battle-effects-layer') return effectsLayer;
    return null;
  }
};

const attacker = {
  id: 'mage', jobId: 'mage', elementId: 'mage', isDead: false, activeAilment: null,
  hp: { current: 1000, max: 1000 }, mp: { current: 1000, max: 1000 }, atb: 100,
  stats: {
    hp: 1000, mp: 1000, atk: 100, def: 0, matk: 100, mdef: 0,
    attackElements: {}, attackAilments: {}, elementResist: {}, ailmentResist: {}
  },
  jobSkills: { mage: { magic_missile: 1 }, ranger: { plus_one: 1 } }
};
const defender = {
  id: 'enemy', elementId: 'enemy', isDead: false, activeAilment: null,
  currentHp: 10000, maxHp: 10000,
  stats: { hp: 10000, atk: 0, def: 0, matk: 0, mdef: 0, elementResist: {}, ailmentResist: {} }
};

const calls = [];
const actionNames = [];
const battle = {
  ...actionMethods,
  party: [attacker], enemies: [defender], activeCharacter: attacker,
  equipMap: new Map(), isStopped: false, _cachedDisableAnim: false,
  speedMult: 1, isAutoBattle: false,
  showActionName(_elementId, name) { actionNames.push(name); },
  showDamage() {}, renderEntities() {}, checkBattleEnd() {}, processEnemyDeath() {},
  _waitForAttackAnimation() {},
  _scheduleBattleTimeout(callback) { callback(); },
  _findSkill(_character, id) {
    if (id === 'magic_missile') {
      return { level: 1, levelConfig: { multiplier: .2 }, def: { type: 'passive' } };
    }
    if (id === 'plus_one') {
      return { level: 1, levelConfig: { hits: 2, multiplier: .5 }, def: { type: 'passive' } };
    }
    return { level: 0, levelConfig: null, def: null };
  },
  executeAttack(...args) {
    calls.push(args[3] || {});
    return actionMethods.executeAttack.call(this, ...args);
  }
};

const originalRandom = Math.random;
Math.random = () => .5;
battle.executeAttack(attacker, defender, true);
Math.random = originalRandom;

const normalAttackCalls = calls.filter(options => !options.damageType || options.isNormalAttack === true);
const missileCalls = calls.filter(options => options.actionName === 'マジックミサイル');
const repeatedNormalCalls = calls.filter(options => options.actionName === 'プラスワン');

assert(normalAttackCalls.length === 3, 'base attack and two repeated normal attacks were not all executed');
assert(repeatedNormalCalls.every(options => options.isNormalAttack === true), 'repeated hits are not marked as normal attacks');
assert(missileCalls.length === 3, 'Magic Missile did not trigger once for every normal attack');
assert(actionNames.filter(name => name === 'マジックミサイル').length === 3,
  'Magic Missile action feedback did not run for every normal attack');
assert(attackerEl.animations.filter(timing => timing.duration === 560).length === 3,
  'mage normal attack animation did not run for every normal attack');
assert(attackerEl.animations.filter(timing => timing.duration === 520).length === 3,
  'Magic Missile animation did not run for every normal attack');

if (typeof print === 'function') print('Mage normal follow-up tests passed.');
else console.log('Mage normal follow-up tests passed.');
