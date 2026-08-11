import { mana_conductor } from '../js/jobs/mana_conductor.js';
import { AUTO_BATTLE_JOB_TACTICS } from '../js/pages/battle/auto-battle-ai.js';

globalThis.document = { hidden: true };

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const recharge = mana_conductor.skills.find(skill => skill.id === 'resonance_recharge');
assert(recharge, '共鳴のMP全回復スキルがありません');
assert(recharge.maxLevel === 10 && recharge.levels.length === 10, 'リチャージのレベル定義が不正です');
assert(AUTO_BATTLE_JOB_TACTICS.mana_conductor?.resonance_recharge?.role === 'recovery',
  'リチャージが自動戦闘AIの回復役に登録されていません');

const caster = {
  jobId: 'mana_conductor', elementId: 'conductor', isDead: false,
  _conductorHarmony: 3,
  mp: { current: 37, max: 200 },
  stats: { mp: 240 }
};
const popups = [];
let renders = 0;
const battle = {
  showDamage(_elementId, text) { popups.push(text); },
  renderEntities() { renders += 1; }
};

assert(recharge.getUseState(caster, recharge.levels[9]).canUse,
  '共鳴がありMPが減っているのに使用できません');
recharge.execute(caster, recharge.levels[9], battle);
assert(caster._conductorHarmony === 0, '共鳴ゲージを全消費していません');
assert(caster.mp.current === 240, '自身のMPが最大値まで回復していません');
assert(popups.includes('+203 MP') && renders === 1, 'MP回復の表示または再描画が行われていません');
assert(!recharge.getUseState(caster, recharge.levels[9]).canUse,
  '共鳴がない状態で使用できてしまいます');

caster._conductorHarmony = 1;
caster.mp.current = 240;
assert(!recharge.getUseState(caster, recharge.levels[9]).canUse,
  'MP最大時に共鳴を無駄消費できてしまいます');

caster.mp.current = 100;
assert(recharge.autoBattle.check(caster, recharge.levels[9])?.target === caster,
  'MPが少ない時に自動戦闘AIがリチャージを候補にしません');
caster.mp.current = 180;
assert(recharge.autoBattle.check(caster, recharge.levels[9]) === null,
  'MPに余裕があるのに自動戦闘AIが共鳴を消費します');

if (typeof print === 'function') print('Mana Conductor tests passed.');
else console.log('Mana Conductor tests passed.');
