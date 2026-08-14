import { JOBS } from '../js/jobs/index.js';
import { JOB_GAUGE_CAPACITY_PROGRESSION } from '../js/jobs/job-gauge-progression.js';
import {
  STANDARD_JOB_GAUGES,
  addStandardJobGauge,
  applyStandardJobGaugeAi,
  beginJobGaugeNormalAttack,
  beginJobGaugeSkillAction,
  getJobGaugeIncomingMultiplier,
  getJobGaugeOutgoingMultiplier,
  getJobGaugeSkillHint,
  getJobGaugeSkillUseState,
  getStandardJobGaugeMax,
  getStandardJobGaugeValue,
  recordJobGaugeDamage,
  resetStandardJobGauge,
  setStandardJobGaugeValue,
} from '../js/pages/battle/job-gauge-system.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const resourceJobs = new Set([
  'entertainer', 'mana_conductor', 'slime_singer', 'dragoon', 'shinra_sage', 'soul_reaper'
]);
const missingGaugeJobs = Object.keys(JOBS).filter(jobId => !resourceJobs.has(jobId));
assert(missingGaugeJobs.length === 20, '20職のゲージ網羅テストがジョブ一覧と一致しません');
assert(Object.keys(STANDARD_JOB_GAUGES).length === 20, '新規ゲージ定義が20職を網羅していません');
for (const jobId of missingGaugeJobs) {
  assert(STANDARD_JOB_GAUGES[jobId], `${jobId} のゲージ定義がありません`);
}

const builders = {
  norvice: ['heavy_strike', 0], knight: ['provoke', 0], mage: ['fireball', 0],
  priest: ['heal', 20], ranger: ['double_arrow', 0], magic_knight: ['flame_tongue', 0],
  slime_master: ['slime_throw', 0], dancer: ['poison_salsa', 0], bird: ['lullaby', 0],
  paladin: ['divine_shield', 0], poseidon: ['trident_tempest', 0], pyromancer: ['flare_lance', 0],
  guardian: ['guardian_oath', 0], cryomancer: ['frost_spear', 0],
  magic_archer: ['arcane_arrow', 40], plague_doctor: ['pathogen_injection', 0],
  dealer: ['marked_deck', 0]
};
for (const [jobId, [skillId, mpCost]] of Object.entries(builders)) {
  const actor = { jobId, mp: { current: 100, max: 100 } };
  resetStandardJobGauge(actor);
  beginJobGaugeSkillAction(actor, skillId, mpCost);
  assert(getStandardJobGaugeValue(actor) > 0, `${jobId} が対応スキルでゲージを獲得しません`);
}

const darkKnight = { id: 'dark', jobId: 'black_knight' };
recordJobGaugeDamage(darkKnight, { id: 'enemy' }, 100);
assert(getStandardJobGaugeValue(darkKnight) > 0, 'ブラックナイトが与ダメージで渇血を獲得しません');

const assassin = { id: 'killer', jobId: 'assassin' };
recordJobGaugeDamage(assassin, { id: 'enemy-a' }, 100);
recordJobGaugeDamage(assassin, { id: 'enemy-a' }, 100);
assert(getStandardJobGaugeValue(assassin) === 2, 'アサシンの同一対象マークが蓄積されません');
recordJobGaugeDamage(assassin, { id: 'enemy-b' }, 100);
assert(getStandardJobGaugeValue(assassin) === 1, 'アサシンの対象変更でマークが更新されません');

const gunner = { jobId: 'gunner' };
assert(getStandardJobGaugeValue(gunner) === 6, 'ガンナーの弾倉が6発で初期化されません');
beginJobGaugeSkillAction(gunner, 'arm_snipe');
assert(getStandardJobGaugeValue(gunner) === 4, 'アームスナイプが弾丸を2発消費しません');
assert(getJobGaugeSkillUseState(gunner, 'bullet_storm').canUse === false, '残弾不足のバレットストームが使用可能です');
assert(getJobGaugeSkillUseState(gunner, 'reload').canUse, '満タンでない弾倉を手動リロードできません');
beginJobGaugeSkillAction(gunner, 'reload');
assert(getStandardJobGaugeValue(gunner) === 6, 'タクティカルリロードが弾倉を補充しません');
assert(getJobGaugeSkillUseState(gunner, 'reload').canUse === false, '満タン時にリロードできます');
gunner._gunnerReloadBonus = .22;
beginJobGaugeSkillAction(gunner, 'charged_shot');
assert(getStandardJobGaugeValue(gunner) === 5 && gunner._jobGaugeActionMultiplier === 1.22,
  'リロード後の次弾強化が射撃に適用されません');
assert(gunner._gunnerReloadBonus === 0, '次弾強化が消費されません');
setStandardJobGaugeValue(gunner, 0);
const reload = beginJobGaugeNormalAttack(gunner);
assert(reload.cancel && getStandardJobGaugeValue(gunner) === 6, '弾切れ通常攻撃がリロードになりません');

const knight = { jobId: 'knight' };
setStandardJobGaugeValue(knight, 5);
assert(getJobGaugeIncomingMultiplier(knight) === .9, '防衛意志の被ダメージ軽減が不正です');
beginJobGaugeSkillAction(knight, 'shield_attack');
assert(getStandardJobGaugeValue(knight) === 0, 'シールドアタックが防衛意志を消費しません');
assert(getJobGaugeOutgoingMultiplier(knight, {}) > 1, '防衛意志を消費した反撃が強化されません');

const slime = { jobId: 'slime_master' };
setStandardJobGaugeValue(slime, 100);
assert(getJobGaugeIncomingMultiplier(slime) <= .9, 'ぷるぷる質量の軽減が反映されません');

const aiSkills = {
  norvice: 'cleave', knight: 'shield_attack', mage: 'fireball', priest: 'all_heal',
  ranger: 'rain_of_arrows', magic_knight: 'thunder_slash', slime_master: 'slime_hazard',
  dancer: 'curse_step', bird: 'nightmare', black_knight: 'hell_gate', paladin: 'holy_smite',
  poseidon: 'leviathan_judgment', pyromancer: 'meteor_catastrophe', assassin: 'assassinate',
  guardian: 'aegis_bash', cryomancer: 'absolute_zero', magic_archer: 'astral_arrow_rain',
  gunner: 'bullet_storm', plague_doctor: 'black_death', dealer: 'blackjack_finale'
};
for (const [jobId, skillId] of Object.entries(aiSkills)) {
  const actor = { jobId };
  const definition = STANDARD_JOB_GAUGES[jobId];
  setStandardJobGaugeValue(actor, definition.max);
  const candidate = { skill: { id: skillId }, score: 10, priority: 0 };
  applyStandardJobGaugeAi(actor, [candidate]);
  assert(candidate.score > 10 || candidate.priority > 0, `${jobId} の自動戦闘AIがゲージを評価しません`);
  assert(getJobGaugeSkillHint(actor, skillId), `${jobId} のゲージ連携がスキル説明に表示されません`);
}

const capped = { jobId: 'pyromancer' };
addStandardJobGauge(capped, 1000);
assert(getStandardJobGaugeValue(capped) === 100, 'ゲージ値が上限を超えました');

const capacitySkills = {
  norvice: 'cleave', knight: 'shield_attack', mage: 'thunderstorm', priest: 'all_heal',
  ranger: 'rain_of_arrows', magic_knight: 'thunder_slash', slime_master: 'slime_hazard',
  dancer: 'curse_step', bird: 'nightmare', black_knight: 'hell_gate', paladin: 'holy_smite',
  poseidon: 'leviathan_judgment', pyromancer: 'meteor_catastrophe', assassin: 'assassinate',
  guardian: 'aegis_bash', cryomancer: 'absolute_zero', magic_archer: 'astral_arrow_rain',
  gunner: 'bullet_storm', plague_doctor: 'black_death'
};
assert(Object.keys(JOB_GAUGE_CAPACITY_PROGRESSION).length === 20, '固定上限ゲージの限界突破定義が20職を網羅していません');
for (const [jobId, skillId] of Object.entries(capacitySkills)) {
  const baseMax = STANDARD_JOB_GAUGES[jobId].max;
  const firstAwakening = { jobId, jobSkills: { [jobId]: { [skillId]: 20 } } };
  const secondAwakening = { jobId, jobSkills: { [jobId]: { [skillId]: 35 } } };
  assert(getStandardJobGaugeMax(firstAwakening) > baseMax, `${jobId}の限界突破+10でゲージ上限が増えません`);
  assert(getStandardJobGaugeMax(secondAwakening) > getStandardJobGaugeMax(firstAwakening), `${jobId}の限界突破+25でゲージ上限が増えません`);
  const capacitySkill = JOBS[jobId].skills.find(skill => skill.id === skillId);
  assert(capacitySkill?.limitBreakMilestones?.some(milestone => milestone.breaks === 10 && milestone.label.includes('固有ゲージ上限')),
    `${jobId}の限界突破画面にゲージ上限覚醒が表示されません`);
}

const awakenedGunner = { jobId: 'gunner', jobSkills: { gunner: { bullet_storm: 35 } } };
assert(getStandardJobGaugeValue(awakenedGunner) === 8, '限界突破したガンナーが拡張弾倉を満装填で開始しません');
beginJobGaugeSkillAction(awakenedGunner, 'bullet_storm');
assert(getStandardJobGaugeValue(awakenedGunner) === 0 && awakenedGunner._jobGaugeActionMultiplier > 2,
  '拡張弾倉の全弾がフルバーストへ反映されません');

const offensiveHoldingJobs = [
  'norvice', 'mage', 'ranger', 'magic_knight', 'dancer', 'bird', 'black_knight',
  'poseidon', 'pyromancer', 'assassin', 'cryomancer', 'magic_archer', 'gunner', 'plague_doctor', 'dealer'
];
for (const jobId of offensiveHoldingJobs) {
  const actor = { id: `actor-${jobId}`, jobId };
  const defender = { id: 'marked-target' };
  if (jobId === 'assassin') actor._assassinMarkTarget = defender.id;
  setStandardJobGaugeValue(actor, 1);
  const low = getJobGaugeOutgoingMultiplier(actor, defender);
  setStandardJobGaugeValue(actor, STANDARD_JOB_GAUGES[jobId].max);
  const high = getJobGaugeOutgoingMultiplier(actor, defender);
  assert(high > low && low > 1, `${jobId}のゲージ保持量が増えても与ダメージ恩恵が増えません`);
}

for (const jobId of ['knight', 'priest', 'slime_master', 'paladin', 'guardian', 'dealer']) {
  const actor = { jobId };
  setStandardJobGaugeValue(actor, 1);
  const low = getJobGaugeIncomingMultiplier(actor);
  setStandardJobGaugeValue(actor, STANDARD_JOB_GAUGES[jobId].max);
  const high = getJobGaugeIncomingMultiplier(actor);
  assert(high < low && low < 1, `${jobId}のゲージ保持量が増えても防御恩恵が増えません`);
}

const releaseSkills = {
  norvice: 'cleave', knight: 'shield_attack', mage: 'fireball', ranger: 'rain_of_arrows',
  magic_knight: 'flame_tongue', slime_master: 'slime_hazard', dancer: 'curse_step',
  bird: 'nightmare', black_knight: 'blood_saber', paladin: 'holy_smite',
  poseidon: 'leviathan_judgment', pyromancer: 'meteor_catastrophe', assassin: 'assassinate',
  guardian: 'aegis_bash', cryomancer: 'absolute_zero', magic_archer: 'astral_arrow_rain',
  gunner: 'bullet_storm', plague_doctor: 'black_death', dealer: 'blackjack_finale'
};
for (const [jobId, skillId] of Object.entries(releaseSkills)) {
  const actor = { jobId };
  setStandardJobGaugeValue(actor, STANDARD_JOB_GAUGES[jobId].max);
  beginJobGaugeSkillAction(actor, skillId, 100);
  assert(actor._jobGaugeActionMultiplier >= 2, `${jobId}の最大ゲージ解放が絶大な効果（2倍以上）になっていません`);
}

const faithfulPriest = { jobId: 'priest', mp: { current: 0, max: 999 } };
setStandardJobGaugeValue(faithfulPriest, 100);
beginJobGaugeSkillAction(faithfulPriest, 'all_heal', 110);
assert(faithfulPriest.mp.current === 110 && faithfulPriest._jobGaugeHealingMultiplier === 3,
  '信仰最大解放がMP全額還元と回復量3倍になっていません');

const awakenedGuardianAi = {
  jobId: 'guardian', jobSkills: { guardian: { aegis_bash: 20 } }, _guardianWall: 5
};
const prematureBash = { skill: { id: 'aegis_bash' }, score: 10, priority: 0 };
applyStandardJobGaugeAi(awakenedGuardianAi, [prematureBash]);
assert(prematureBash.priority === 0, 'AIが上限覚醒後も旧上限で城壁を解放します');
setStandardJobGaugeValue(awakenedGuardianAi, 6);
const awakenedBash = { skill: { id: 'aegis_bash' }, score: 10, priority: 0 };
applyStandardJobGaugeAi(awakenedGuardianAi, [awakenedBash]);
assert(awakenedBash.priority >= 465, 'AIが拡張後の城壁MAXを解放しません');

const priestAi = { jobId: 'priest' };
setStandardJobGaugeValue(priestAi, 50);
const urgentPrayer = { skill: { id: 'all_heal' }, score: 10, priority: 0 };
applyStandardJobGaugeAi(priestAi, [urgentPrayer]);
assert(urgentPrayer.score > 10 && urgentPrayer.priority < 465,
  'AIが信仰50以上の緊急回復を考慮できません');
setStandardJobGaugeValue(priestAi, 100);
const fullPrayer = { skill: { id: 'all_heal' }, score: 10, priority: 0 };
applyStandardJobGaugeAi(priestAi, [fullPrayer]);
assert(fullPrayer.priority >= 465, 'AIが信仰MAXの奇跡を最優先で解放しません');

const slimeAi = { jobId: 'slime_master' };
setStandardJobGaugeValue(slimeAi, 75);
const prematureHazard = { skill: { id: 'slime_hazard' }, score: 10, priority: 0 };
applyStandardJobGaugeAi(slimeAi, [prematureHazard]);
assert(prematureHazard.priority < 465, 'AIが質量MAXになる前に巨大スライム化を最優先にします');
setStandardJobGaugeValue(slimeAi, 100);
const fullHazard = { skill: { id: 'slime_hazard' }, score: 10, priority: 0 };
applyStandardJobGaugeAi(slimeAi, [fullHazard]);
assert(fullHazard.priority >= 465, 'AIが質量MAXの巨大スライム化を解放しません');

console.log('Job gauge system tests passed');
