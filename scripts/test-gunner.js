import { gunner } from '../js/jobs/gunner.js';
import { JOBS, JOB_STAT_GROWTH, JOB_STAT_MULTIPLIER } from '../js/jobs/index.js';
import { calcFinalStats } from '../js/data/stat-calculator.js';
import { AUTO_BATTLE_JOB_TACTICS } from '../js/pages/battle/auto-battle-ai.js';
import { NORMAL_ATTACK_ANIMATION_PROFILES } from '../js/pages/battle/normal-attack-animations.js';

globalThis.localStorage = { getItem: () => null };
globalThis.document = { hidden: true, body: null, getElementById: () => null };

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(JOBS.gunner?.name === 'ガンナー', 'gunner is not registered');
assert(gunner.requirements.some(req => req.jobId === 'ranger' && req.level === 100), 'ranger requirement is missing');
assert(gunner.requirements.some(req => req.jobId === 'assassin' && req.level === 100), 'assassin requirement is missing');
assert(JOB_STAT_GROWTH.gunner && JOB_STAT_MULTIPLIER.gunner, 'gunner stats are missing');
assert(Object.keys(AUTO_BATTLE_JOB_TACTICS.gunner || {}).length === 5, 'gunner auto-battle tactics are missing');
assert(NORMAL_ATTACK_ANIMATION_PROFILES.gunner?.kind === 'gun_shot', 'gunner normal attack animation is missing');

gunner.skills.forEach(skill => {
  assert(skill.maxLevel === 10, `${skill.id} max level is invalid`);
  assert(skill.levels.length === 10, `${skill.id} level table is incomplete`);
  skill.levels.forEach((config, index) => {
    assert(config.level === index + 1, `${skill.id} level order is invalid`);
    assert(Number.isFinite(config.spCost), `${skill.id} SP cost is invalid`);
  });
});

const gunnerStats = calcFinalStats({
  jobId: 'gunner',
  hp: { current: 100, max: 100 }, mp: { current: 50, max: 50 },
  baseStats: { atk: 100, def: 50, matk: 10, mdef: 30, spd: 40 },
  jobSkills: { gunner: { gun_mastery: 10, quick_reload: 10 } },
  equipment: {}
}, new Map());
assert(gunnerStats.atk === 214, `gun mastery ATK bonus or gunner multiplier is invalid: ${gunnerStats.atk}`);
assert(gunnerStats.spd === 64, `quick reload SPD bonus or gunner multiplier is invalid: ${gunnerStats.spd}`);

const caster = {
  jobId: 'gunner', elementId: 'gunner', isDead: false, activeAilment: null,
  hp: { current: 1000, max: 1000 }, mp: { current: 100, max: 200 },
  stats: { hp: 1000, mp: 200, atk: 500, def: 100, mdef: 100, spd: 150 }
};
const enemies = [
  { elementId: 'enemy-1', isDead: false, activeAilment: null, currentHp: 1000, maxHp: 1000,
    stats: { def: 200, elementResist: { fire: 20, ice: 10, thunder: -20 }, ailmentResist: {} } },
  { elementId: 'enemy-2', isDead: false, activeAilment: null, currentHp: 900, maxHp: 900,
    stats: { def: 180, elementResist: {}, ailmentResist: {} } },
  { elementId: 'enemy-3', isDead: false, activeAilment: null, currentHp: 800, maxHp: 800,
    stats: { def: 160, elementResist: {}, ailmentResist: {} } }
];
const byId = Object.fromEntries(gunner.skills.map(skill => [skill.id, skill]));
const battle = {
  party: [caster], enemies, selectedEnemyTarget: enemies[0], isStopped: false, speedMult: 5,
  attacks: [],
  showActionName() {}, showDamage() {},
  executeAttack(attacker, target, isParty, options) {
    this.attacks.push({ attacker, target, isParty, options });
  },
  _scheduleBattleTimeout(callback) { callback(); },
  _findSkill(character, id) {
    const def = byId[id];
    return def ? { level: 10, levelConfig: def.levels[9], def } : { level: 0, levelConfig: null, def: null };
  }
};

const originalRandom = Math.random;
Math.random = () => 0;

const elementalCharge = byId.elemental_charge;
elementalCharge.execute(caster, elementalCharge.levels[0], battle);
assert(battle.attacks.length === 3, 'penetrator did not hit every secondary enemy');
assert(battle.attacks[0].options.element === 'thunder', 'elemental charge did not choose the weakest element');
assert(Math.abs(battle.attacks[1].options.damageMultiplier - .81) < 1e-9, 'penetrator spill damage is invalid');
assert(battle.attacks.every(attack => attack.options.defenseIgnorePercent === 20), 'gun mastery penetration is missing');

const armSnipe = byId.arm_snipe;
armSnipe.execute(caster, armSnipe.levels[9], battle);
assert(enemies[0].activeAilment?.type === 'paralysis', 'arm snipe did not apply paralysis');

const bulletStorm = byId.bullet_storm;
const attacksBeforeStorm = battle.attacks.length;
bulletStorm.execute(caster, bulletStorm.levels[9], battle);
const stormAttacks = battle.attacks.slice(attacksBeforeStorm);
assert(stormAttacks.length === 3, 'bullet storm did not hit every enemy');
assert(stormAttacks.every(attack => attack.options.isAoEProcessed), 'bullet storm is not marked as an area attack');
assert(stormAttacks.every(attack => attack.options.defenseIgnorePercent === 50), 'bullet storm penetration is invalid');

caster.mp.current = 100;
const chargedShot = byId.charged_shot;
chargedShot.execute(caster, chargedShot.levels[9], battle);
assert(caster.mp.current === 141, 'quick reload did not refund half the skill cost');

Math.random = originalRandom;

if (typeof print === 'function') print('Gunner tests passed.');
else console.log('Gunner tests passed.');
if (typeof window !== 'undefined') document.body.textContent = 'Gunner tests passed.';
