import {
  getJobResourceSignature,
  getJobResourceState,
  renderJobResourceHtml
} from '../js/pages/battle/job-resource-ui.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const makeCharacter = (jobId, skillId, skillLevel, field, value) => ({
  jobId,
  jobSkills: skillId ? { [jobId]: { [skillId]: skillLevel } } : { [jobId]: {} },
  [field]: value
});

const entertainer = getJobResourceState(
  makeCharacter('entertainer', 'showstopper', 4, '_entertainerHype', 2)
);
assert(entertainer?.current === 2 && entertainer.max === 3, '舞台熱の現在値または上限が不正です');
assert(entertainer.slots.filter(slot => slot.filled).length === 2, '舞台熱の点灯数が不正です');
assert(renderJobResourceHtml({
  ...makeCharacter('entertainer', 'showstopper', 4, '_entertainerHype', 2)
}).includes('舞台熱'), '舞台熱パネルが描画されません');

const conductor = getJobResourceState(
  makeCharacter('mana_conductor', 'conductor_core', 10, '_conductorHarmony', 5)
);
assert(conductor?.current === 5 && conductor.max === 5, '共鳴ゲージが不正です');

const singer = getJobResourceState(
  makeCharacter('slime_singer', 'resonant_gel', 7, '_slimeSingerNotes', 3)
);
assert(singer?.current === 3 && singer.max === 4, 'ぷるぷる音符ゲージが不正です');

const dragoon = getJobResourceState(
  makeCharacter('dragoon', 'dragon_heart', 1, '_dragoonSpirit', 99)
);
assert(dragoon?.current === 2 && dragoon.max === 2, '竜気が上限内に正規化されません');

const sage = getJobResourceState({
  jobId: 'shinra_sage',
  _shinraSigils: ['grass', 'grass', 'invalid', 'earth']
});
assert(sage?.current === 2 && sage.max === 3, '三界印の種類が正規化されません');
assert(sage.slots.find(slot => slot.id === 'grass')?.filled, '草の印が表示されません');
assert(!sage.slots.find(slot => slot.id === 'wind')?.filled, '未獲得の風の印が点灯しています');

const reaper = getJobResourceState({ jobId: 'soul_reaper', _soulReaperCorpses: 9 });
assert(reaper?.current === 5 && reaper.max === 5, 'ソウルリーパーの亡骸ストック上限が不正です');
assert(renderJobResourceHtml({ jobId: 'soul_reaper', _soulReaperCorpses: 3 }).includes('亡骸'), '亡骸パネルが描画されません');

const locked = getJobResourceState(makeCharacter('entertainer', null, 0, '_entertainerHype', 3));
assert(locked && !locked.unlocked && locked.current === 0, '未習得の固有システムが有効表示されています');
assert(renderJobResourceHtml(makeCharacter('entertainer', null, 0, '_entertainerHype', 3)).includes('未開放'), '未開放表示がありません');

assert(getJobResourceState({ jobId: 'norvice' }) === null, '通常職に固有ゲージが表示されています');
assert(getJobResourceSignature(entertainer) !== getJobResourceSignature({ ...entertainer, current: 3 }), 'ゲージ更新シグネチャが変化しません');

globalThis.localStorage = { getItem: () => null };
globalThis.window = { addEventListener() {} };
const { renderPartyCardHtml } = await import('../js/pages/battle/battle-ui.js');
const cardHtml = renderPartyCardHtml({
  ...makeCharacter('soul_reaper', null, 0, '_soulReaperCorpses', 3),
  id: 'reaper', elementId: 'reaper', name: 'ソウルリーパー', iconImage: '',
  level: 1, jobLevel: 1, sp: 0, atb: 0, isDead: false,
  hp: { current: 100, max: 100 }, mp: { current: 100, max: 100 },
  exp: { current: 0, max: 1 }, jp: { current: 0, max: 1 },
  stats: { hp: 100, mp: 100, atk: 10, def: 10, matk: 10, mdef: 10, spd: 10 }
}, null, false, null);
assert(
  cardHtml.indexOf('job-resource-container') < cardHtml.indexOf('>HP</span>'),
  '職業固有パネルがHPゲージの上に配置されていません'
);

console.log('Job resource UI tests passed');
