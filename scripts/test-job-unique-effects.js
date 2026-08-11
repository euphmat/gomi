import { JOBS } from '../js/jobs/index.js';
import {
  JOB_UNIQUE_RELEASE_EFFECTS,
  applyJobUniqueReleaseEffect
} from '../js/pages/battle/job-unique-effects.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const jobIds = Object.keys(JOBS);
assert(jobIds.length === 25, '全職業の固有解放テストが職業一覧と一致しません');
assert(Object.keys(JOB_UNIQUE_RELEASE_EFFECTS).length === jobIds.length,
  '強力な固有解放効果が全職業を網羅していません');

const legacyMax = {
  entertainer: 5, mana_conductor: 5, slime_singer: 5,
  dragoon: 5, shinra_sage: 3, soul_reaper: 5
};

for (const jobId of jobIds) {
  const definition = JOB_UNIQUE_RELEASE_EFFECTS[jobId];
  assert(definition?.name && definition.skillIds.length > 0 && typeof definition.apply === 'function',
    `${jobId} の固有解放定義が不完全です`);

  const actor = {
    id: `actor-${jobId}`, elementId: `actor-${jobId}`, jobId, atb: 0,
    hp: { current: 500, max: 1000 }, mp: { current: 250, max: 500 },
    stats: { hp: 1000, mp: 500, atk: 300, def: 250, matk: 320, mdef: 240 },
    activeAilment: { type: 'confusion', duration: 4 }
  };
  const ally = {
    id: `ally-${jobId}`, elementId: `ally-${jobId}`, jobId: 'norvice', atb: 100,
    hp: { current: 400, max: 1000 }, mp: { current: 100, max: 500 },
    stats: { hp: 1000, mp: 500, atk: 200, def: 180, matk: 200, mdef: 180 },
    activeAilment: { type: 'blind', duration: 4 }
  };
  const enemy = {
    id: `enemy-${jobId}`, elementId: `enemy-${jobId}`, currentHp: 5000, maxHp: 5000,
    stats: { hp: 5000, mp: 0, atk: 200, def: 150, matk: 200, mdef: 150 },
    activeAilment: null, isDead: false
  };
  const battle = {
    party: [actor, ally], enemies: [enemy],
    showDamage() {}, showActionName() {}, renderEntities() {}
  };
  const max = legacyMax[jobId] || ({ priest: 100, slime_master: 100, black_knight: 100, pyromancer: 100 }[jobId] ||
    { mage: 3, magic_knight: 6, bird: 8, paladin: 3, poseidon: 3, cryomancer: 6,
      magic_archer: 6, gunner: 6, plague_doctor: 9 }[jobId] || 5);
  const skillId = definition.skillIds[definition.skillIds.length - 1] === '*'
    ? 'curse_step'
    : definition.skillIds[definition.skillIds.length - 1];
  const before = { jobId, current: max, max };
  const after = { jobId, current: 0, max };
  const stateBefore = JSON.stringify({ actor, ally, enemy });
  const result = applyJobUniqueReleaseEffect(battle, actor, skillId, before, after);
  const stateAfter = JSON.stringify({ actor, ally, enemy });

  assert(result?.spent === max, `${jobId} の固有解放が発動しません`);
  assert(stateAfter !== stateBefore, `${jobId} の固有解放が戦闘状態へ効果を与えません`);

  const hasVisibleSpecification = JOBS[jobId].uniqueSkills.some(skill =>
    skill.mechanics.some(item => item.label === '強力な固有解放'));
  assert(hasVisibleSpecification, `${JOBS[jobId].name}の強力な固有解放が画面仕様へ表示されません`);
}

const gunner = {
  jobId: 'gunner', elementId: 'gunner', _gunnerAmmo: 0,
  hp: { current: 1000, max: 1000 }, mp: { current: 500, max: 500 },
  stats: { hp: 1000, mp: 500 }
};
applyJobUniqueReleaseEffect(
  { party: [gunner], enemies: [], showActionName() {}, renderEntities() {} },
  gunner,
  'bullet_storm',
  { jobId: 'gunner', current: 8, max: 8 },
  { jobId: 'gunner', current: 0, max: 8 }
);
assert(gunner._gunnerAmmo === 4 && gunner._gunnerReloadBonus === .35,
  '薬莢再錬成が拡張弾倉の半数と次弾強化を返しません');

assert(applyJobUniqueReleaseEffect(
  {}, { jobId: 'knight' }, 'shield_attack',
  { jobId: 'knight', current: 0, max: 5 }, { jobId: 'knight', current: 0, max: 5 }
) === null, 'ゲージを消費していない行動で固有解放が発動します');

console.log('Job unique release effect tests passed');
