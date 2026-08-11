import {
  beginJobGaugeSkillAction,
  getJobGaugeAnimationSnapshot,
  resolveJobGaugeAnimationEvent,
  setStandardJobGaugeValue,
} from '../js/pages/battle/job-gauge-system.js';
import {
  getJobGaugeAnimationSpec,
  makeJobGaugeReloadEvent,
  playJobGaugeAnimation,
} from '../js/pages/battle/job-gauge-animation.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const pyro = { jobId: 'pyromancer' };
setStandardJobGaugeValue(pyro, 100);
const pyroBefore = getJobGaugeAnimationSnapshot(pyro);
beginJobGaugeSkillAction(pyro, 'meteor_catastrophe');
const pyroRelease = resolveJobGaugeAnimationEvent(pyroBefore, pyro, 'meteor_catastrophe');
assert(pyroRelease?.type === 'release' && pyroRelease.label === '炉心解放', '炉心消費で放出演出が発火しません');
const pyroSpec = getJobGaugeAnimationSpec(pyroRelease);
assert(pyroSpec?.bannerSuffix === 'BURST' && pyroSpec.particleCount === 10, '特殊技のBURST演出定義が不正です');

const ranger = { jobId: 'ranger' };
setStandardJobGaugeValue(ranger, 4);
const rangerBefore = getJobGaugeAnimationSnapshot(ranger);
beginJobGaugeSkillAction(ranger, 'double_arrow');
const rangerCharged = resolveJobGaugeAnimationEvent(rangerBefore, ranger, 'double_arrow');
assert(rangerCharged?.type === 'charged' && rangerCharged.label.includes('MAX'), 'ゲージ最大到達演出が発火しません');
assert(getJobGaugeAnimationSpec(rangerCharged)?.bannerSuffix === 'READY', 'READY演出定義が不正です');

const legacyCases = [
  ['entertainer', '_entertainerHype', 3, 'grand_finale'],
  ['mana_conductor', '_conductorHarmony', 5, 'resonance_storm'],
  ['slime_singer', '_slimeSingerNotes', 4, 'king_slime_chorus'],
  ['dragoon', '_dragoonSpirit', 5, 'skyfall_dive'],
  ['soul_reaper', '_soulReaperCorpses', 5, 'last_requiem']
];
for (const [jobId, field, value, skillId] of legacyCases) {
  const actor = { jobId, [field]: value };
  const before = getJobGaugeAnimationSnapshot(actor);
  actor[field] = 0;
  const event = resolveJobGaugeAnimationEvent(before, actor, skillId);
  assert(event?.type === 'release', `${jobId} の既存ゲージ放出演出が発火しません`);
}

const sage = { jobId: 'shinra_sage', _shinraSigils: ['grass', 'wind', 'earth'] };
const sageBefore = getJobGaugeAnimationSnapshot(sage);
sage._shinraSigils = [];
assert(resolveJobGaugeAnimationEvent(sageBefore, sage, 'shinra_mandala')?.type === 'release', '三界輪の放出演出が発火しません');

const reloadSpec = getJobGaugeAnimationSpec(makeJobGaugeReloadEvent({ jobId: 'gunner' }));
assert(reloadSpec?.bannerSuffix === 'RELOAD' && reloadSpec.icon === 'refresh', 'リロード演出定義が不正です');
const gunner = { jobId: 'gunner', _gunnerAmmo: 1 };
const gunnerBefore = getJobGaugeAnimationSnapshot(gunner);
beginJobGaugeSkillAction(gunner, 'reload');
assert(resolveJobGaugeAnimationEvent(gunnerBefore, gunner, 'reload')?.type === 'reload',
  'タクティカルリロードでRELOAD演出が発火しません');
assert(playJobGaugeAnimation({ jobId: 'gunner' }, makeJobGaugeReloadEvent({ jobId: 'gunner' })) === false,
  'DOMがない環境で演出が安全にスキップされません');

console.log('Job gauge animation tests passed');
