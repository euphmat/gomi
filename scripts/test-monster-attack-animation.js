import { playMonsterAttackAnimation } from '../js/pages/battle/monster-attack-animation.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const effects = [];
const makeElement = (rect = { left: 0, top: 0, width: 0, height: 0 }) => ({
  children: [],
  style: {},
  textContent: '',
  animations: [],
  classList: { contains: () => false },
  setAttribute() {},
  remove() {},
  appendChild(child) { this.children.push(child); },
  querySelector() { return null; },
  getBoundingClientRect: () => rect,
  animate(keyframes, timing) {
    this.animations.push({ keyframes, timing });
    return { onfinish: null, oncancel: null };
  }
});

const attackerImage = makeElement({ left: 40, top: 40, width: 56, height: 56 });
const attackerEl = makeElement({ left: 35, top: 35, width: 64, height: 72 });
attackerEl.querySelector = selector => selector === 'img' ? attackerImage : null;
const defenderEl = makeElement({ left: 220, top: 250, width: 92, height: 170 });
const effectsLayer = makeElement({ left: 0, top: 0, width: 400, height: 500 });
effectsLayer.appendChild = child => effects.push(child);

globalThis.localStorage = { getItem: () => null };
globalThis.matchMedia = () => ({ matches: false });
globalThis.document = {
  hidden: false,
  body: effectsLayer,
  createElement: () => makeElement(),
  getElementById(id) {
    if (id === 'monster') return attackerEl;
    if (id === 'hero') return defenderEl;
    if (id === 'battle-effects-layer') return effectsLayer;
    return null;
  }
};

const timing = playMonsterAttackAnimation(
  { elementId: 'monster' },
  { elementId: 'hero' }
);

assert(timing.impactDelay > 0, 'monster damage should wait for the visible impact');
assert(timing.completionDelay > timing.impactDelay, 'impact effects need time to complete');
assert(attackerImage.animations.length === 1, 'monster image should lunge toward its target');
assert(defenderEl.animations.length === 1, 'target card should visibly react to the hit');
assert(effects.some(effect => effect.className === 'battle-monster-target-marker'),
  'the attacked party card needs a card-sized target marker');
assert(effects.some(effect => effect.className === 'battle-monster-attack-tracer'),
  'the monster and target need a connecting attack tracer');
assert(effects.some(effect => effect.className === 'battle-monster-impact-ring'),
  'the target needs a clear impact effect');

const targetMarker = effects.find(effect => effect.className === 'battle-monster-target-marker');
assert(targetMarker.children.some(child => child.textContent === '攻撃対象'),
  'target marker should explicitly label the recipient');

console.log('Monster attack animation tests passed.');
