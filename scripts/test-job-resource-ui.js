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
const awakenedConductor = getJobResourceState(
  makeCharacter('mana_conductor', 'conductor_core', 20, '_conductorHarmony', 6)
);
assert(awakenedConductor?.current === 6 && awakenedConductor.max === 6,
  '限界突破した共鳴上限がゲージへ反映されません');

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

const novice = getJobResourceState({ jobId: 'norvice' });
assert(novice?.current === 0 && novice.max === 5, 'ノービスの経験ゲージが表示されません');
const gunner = getJobResourceState({ jobId: 'gunner' });
assert(gunner?.current === 6 && gunner.max === 6, 'ガンナーの弾倉が装填状態で初期化されません');
const awakenedGunner = getJobResourceState(makeCharacter('gunner', 'bullet_storm', 35, '_gunnerAmmo', 8));
assert(awakenedGunner?.current === 8 && awakenedGunner.max === 8, '限界突破した拡張弾倉がHUDへ反映されません');
const awakenedGuardian = getJobResourceState(makeCharacter('guardian', 'aegis_bash', 20, '_guardianWall', 6));
assert(awakenedGuardian?.current === 6 && awakenedGuardian.max === 6, '限界突破した城壁上限がHUDへ反映されません');
const awakenedReaper = getJobResourceState(makeCharacter('soul_reaper', 'grave_sovereignty', 35, '_soulReaperCorpses', 7));
assert(awakenedReaper?.current === 7 && awakenedReaper.max === 7, '限界突破した亡骸上限がHUDへ反映されません');
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

const standardCardHtml = renderPartyCardHtml({
  ...makeCharacter('norvice', null, 0, '_unused', 0),
  id: 'standard', elementId: 'standard', name: '見習い', iconImage: '',
  level: 1, jobLevel: 1, sp: 0, atb: 0, isDead: false,
  hp: { current: 100, max: 100 }, mp: { current: 100, max: 100 },
  exp: { current: 0, max: 1 }, jp: { current: 0, max: 1 },
  stats: { hp: 100, mp: 100, atk: 10, def: 10, matk: 10, mdef: 10, spd: 10 }
}, null, false, null);
assert(standardCardHtml.includes('data-has-job-resource="true"'), 'ノービスの職業ゲージがありません');
assert(standardCardHtml.includes('job-resource-shell') && standardCardHtml.includes('h-[18px]'), '通常職のリソーススロット寸法が不正です');
assert(cardHtml.includes('job-resource-shell') && cardHtml.includes('h-[18px]'), '固有職のリソーススロット寸法が不正です');
assert(
  standardCardHtml.indexOf('job-resource-shell') < standardCardHtml.indexOf('>HP</span>'),
  '通常職の固定リソーススロットがHPゲージの上にありません'
);

console.log('Job resource UI tests passed');
