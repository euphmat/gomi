import {
  AUTO_BATTLE_JOB_TACTICS,
  selectAutoBattleAction
} from '../js/pages/battle/auto-battle-ai.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const emptySkill = Object.freeze({ level: 0, def: null, levelConfig: null });

const makeCharacter = (overrides = {}) => ({
  id: 'actor', jobId: 'norvice', isDead: false,
  stats: { hp: 100, mp: 999, atk: 100, def: 10, attackElements: {} },
  hp: { current: 100, max: 100 }, mp: { current: 999, max: 999 },
  skills: {},
  ...overrides
});

const makeEnemy = (overrides = {}) => ({
  id: 'enemy', isDead: false, currentHp: 1000, maxHp: 1000,
  stats: { hp: 1000, def: 10, elementResist: {}, ailmentResist: {} },
  ...overrides
});

const makeUsable = (id, check, levelConfig = { mpCost: 0 }) => ({
  id,
  levelConfig,
  def: { autoBattle: { check } }
});

const select = (character, usableSkills, enemies, party = [character]) =>
  selectAutoBattleAction({
    character,
    usableSkills,
    context: { enemies, party, selectedEnemyTarget: enemies[0] || null },
    findSkill: (entity, id) => entity.skills?.[id] || emptySkill,
    isSkillEnabled: () => true
  });

{
  const enemy = makeEnemy({ currentHp: 10, activeAilment: { type: 'sleep', duration: 10 } });
  const nightmare = makeUsable('nightmare', (_caster, _lc, context) => ({ target: context.enemies[0], score: 1 }), { mpCost: 15 });
  const bard = makeCharacter({
    jobId: 'bird',
    skills: { nightmare: { level: 1, def: nightmare.def, levelConfig: nightmare.levelConfig } }
  });
  assert(select(bard, [nightmare], [enemy]).skill?.id === 'nightmare',
    '睡眠中の敵には通常攻撃よりナイトメアを優先する');
}

{
  const enemy = makeEnemy();
  const nightmare = makeUsable('nightmare', () => null, { mpCost: 15 });
  const lullaby = makeUsable('lullaby', (_caster, _lc, context) => ({ target: context.enemies[0], score: 80 }), { mpCost: 12 });
  const warding = makeUsable('warding_song', (_caster, _lc, context) => ({ target: context.party[0], score: 150 }), { mpCost: 10 });
  const bard = makeCharacter({
    jobId: 'bird',
    skills: { nightmare: { level: 1, def: nightmare.def, levelConfig: nightmare.levelConfig } }
  });
  assert(select(bard, [nightmare, lullaby, warding], [enemy]).skill?.id === 'lullaby',
    'MPを追撃分まで確保できる時はこもりうたをコンボ起点にする');
}

{
  const enemy = makeEnemy({ activeAilment: { type: 'sleep', duration: 10 } });
  const actor = makeCharacter();
  const nightmare = makeUsable('nightmare', () => null, { mpCost: 15 });
  const bard = makeCharacter({
    id: 'bard', jobId: 'bird',
    skills: { nightmare: { level: 1, def: nightmare.def, levelConfig: nightmare.levelConfig } }
  });
  const attack = makeUsable('heavy_strike', (_caster, _lc, context) =>
    context.enemies[0] ? { target: context.enemies[0], score: 999 } : null);
  assert(select(actor, [attack], [enemy], [actor, bard]).type === 'wait',
    'ナイトメア担当以外は最後の睡眠対象を起こさない');
}

{
  const enemy = makeEnemy({ currentHp: 10, activeAilment: { type: 'burn', duration: 5 } });
  const meteor = makeUsable('meteor_catastrophe', (_caster, _lc, context) => ({ target: context.enemies[0], score: 40 }));
  const pyro = makeCharacter({ jobId: 'pyromancer' });
  assert(select(pyro, [meteor], [enemy]).skill?.id === 'meteor_catastrophe',
    '火傷中は通常攻撃よりメテオの起爆を優先する');
}

{
  const enemy = makeEnemy({ currentHp: 10, activeAilment: { type: 'freeze', duration: 1 } });
  const absoluteZero = makeUsable('absolute_zero', (_caster, _lc, context) => ({ target: context.enemies[0], score: 40 }));
  const cryomancer = makeCharacter({ jobId: 'cryomancer' });
  assert(select(cryomancer, [absoluteZero], [enemy]).skill?.id === 'absolute_zero',
    '凍結中は通常攻撃よりアブソリュートゼロの粉砕を優先する');
}

{
  const enemy = makeEnemy();
  const finale = makeUsable('grand_finale', (_caster, _lc, context) => ({ target: context.enemies[0], score: 999 }));
  const spotlight = makeUsable('spotlight_step', (_caster, _lc, context) => ({ target: context.enemies[0], score: 50 }));
  const entertainer = makeCharacter({
    jobId: 'entertainer', _entertainerHype: 1,
    skills: { showstopper: { level: 1, def: {}, levelConfig: { maxHype: 3 } } }
  });
  assert(select(entertainer, [finale, spotlight], [enemy]).skill?.id === 'spotlight_step',
    '舞台熱が最大になるまではグランドフィナーレを温存する');

  entertainer._entertainerHype = 3;
  finale.def.autoBattle.check = () => null;
  assert(select(entertainer, [finale, spotlight], [enemy]).skill?.id === 'grand_finale',
    '舞台熱が最大なら単体戦でもグランドフィナーレを使う');
}

{
  const enemy = makeEnemy();
  const crescendo = makeUsable('arcane_crescendo', () => null);
  const conductor = makeCharacter({
    jobId: 'mana_conductor', _conductorHarmony: 3,
    skills: { conductor_core: { level: 1, def: {}, levelConfig: { maxHarmony: 3 } } }
  });
  assert(select(conductor, [crescendo], [enemy]).skill?.id === 'arcane_crescendo',
    '共鳴が最大なら単体用の共鳴技を放つ');
}

{
  const enemy = makeEnemy();
  const chorus = makeUsable('king_slime_chorus', (_caster, _lc, context) => ({ target: context.enemies[0], score: 999 }));
  const jellyNote = makeUsable('jelly_note', (_caster, _lc, context) => ({ target: context.enemies[0], score: 50 }));
  const singer = makeCharacter({
    jobId: 'slime_singer', _slimeSingerNotes: 1,
    skills: { resonant_gel: { level: 1, def: {}, levelConfig: { maxNotes: 3 } } }
  });
  assert(select(singer, [chorus, jellyNote], [enemy]).skill?.id === 'jelly_note',
    'ぷるぷる音符が最大になるまではキングスライム大合唱を温存する');

  singer._slimeSingerNotes = 3;
  chorus.def.autoBattle.check = () => null;
  assert(select(singer, [chorus, jellyNote], [enemy]).skill?.id === 'king_slime_chorus',
    'ぷるぷる音符が最大なら単体戦でもキングスライム大合唱を使う');
}

{
  const enemy = makeEnemy({ currentHp: 10 });
  const priest = makeCharacter({ jobId: 'priest' });
  const deadAlly = makeCharacter({ id: 'dead', isDead: true, hp: { current: 0, max: 100 } });
  const raise = makeUsable('raise', () => ({ target: deadAlly, score: 200 }));
  assert(select(priest, [raise], [enemy], [priest, deadAlly]).skill?.id === 'raise',
    '通常攻撃で確殺できても蘇生を先に行う');
}

{
  const enemy = makeEnemy({ currentHp: 10 });
  const novice = makeCharacter();
  assert(select(novice, [], [enemy]).type === 'attack',
    '緊急行動やコンボがなければ通常攻撃の確殺を維持する');
}

assert(Object.keys(AUTO_BATTLE_JOB_TACTICS).length === 23,
  '全23職業の自動戦闘プロファイルを定義する');
assert(Object.values(AUTO_BATTLE_JOB_TACTICS)
  .reduce((count, tactics) => count + Object.keys(tactics).length, 0) === 96,
  '全96アクティブスキルの役割を定義する');

if (typeof print === 'function') print('auto-battle-ai: all tests passed');
else console.log('auto-battle-ai: all tests passed');
