import { DUNGEONS } from '../js/definitions/dungeons.js';
import { MONSTERS } from '../js/definitions/monsters.js';
import { MATERIALS } from '../js/definitions/materials.js';
import { WEAPONS } from '../js/definitions/weapons.js';
import { ARMORS } from '../js/definitions/armors.js';
import { SHIELDS } from '../js/definitions/shields.js';
import { ACCESSORIES } from '../js/definitions/accessories.js';

const ADVANCED_DUNGEON_IDS = [
  'stargazer_tower',
  'hell_cave',
  'dragon_lair',
  'sky_demon_castle',
  'moonlit_hall',
  'cloud_altar',
  'dusk_labyrinth',
  'eternal_ruins',
  'subspace',
];

const UNIQUE_ACTIONS = new Map([
  ['orbit_golem', '重力井戸'],
  ['hellfire_witch', '魂炉点火'],
  ['elder_dragon', '始祖の脱皮'],
  ['fallen_seraph', '黒翼結界'],
  ['lunar_knight', '月鏡簒奪'],
  ['rainbow_gryphon', '三相虹嵐'],
  ['paradox_sphinx', '逆理転位'],
  ['chronicle_golem', '年代修復'],
  ['causality_dragon', '因果反転'],
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertUnique(items, label) {
  const ids = items.map(item => item.id);
  assert(new Set(ids).size === ids.length, `${label}に重複IDがあります`);
}

function encounterMonsterIds(floor) {
  return floor.monsters.flatMap(encounter =>
    Object.keys(encounter).filter(key => key !== 'weight' && Number(encounter[key]) > 0)
  );
}

assertUnique(DUNGEONS, 'ダンジョン');
assertUnique(MONSTERS, 'モンスター');
assertUnique(MATERIALS, '素材');
assertUnique(WEAPONS, '武器');
assertUnique(ARMORS, '防具');
assertUnique(SHIELDS, '盾');
assertUnique(ACCESSORIES, 'アクセサリ');

const monsterMap = new Map(MONSTERS.map(monster => [monster.id, monster]));
const materialIds = new Set(MATERIALS.map(material => material.id));
const advancedMonsterIds = new Set();
const bossIds = new Set();

for (const dungeonId of ADVANCED_DUNGEON_IDS) {
  const dungeon = DUNGEONS.find(item => item.id === dungeonId);
  assert(dungeon, `ダンジョンがありません: ${dungeonId}`);
  assert(dungeon.floors.length === 8, `${dungeonId}の階層数が8ではありません`);
  encounterMonsterIds(dungeon.floors[dungeon.floors.length - 1]).forEach(id => bossIds.add(id));
  dungeon.floors.forEach((floor, index) => {
    assert(floor.level === index + 1, `${dungeonId}の階層番号が連番ではありません`);
    for (const monsterId of encounterMonsterIds(floor)) {
      assert(monsterMap.has(monsterId), `${dungeonId}が未定義モンスターを参照しています: ${monsterId}`);
      advancedMonsterIds.add(monsterId);
    }
  });
}

assert(advancedMonsterIds.size === 72, `追加モンスター数が72ではありません: ${advancedMonsterIds.size}`);
for (const monsterId of advancedMonsterIds) {
  const monster = monsterMap.get(monsterId);
  const isBoss = bossIds.has(monsterId);
  const hasUniqueAction = UNIQUE_ACTIONS.has(monsterId);
  assert(monster.drops.length === 3, `${monsterId}の素材ドロップが3件ではありません`);
  assert(monster.drops.map(drop => drop.rate).join(',') === '5,1,0.1', `${monsterId}のドロップ率が不正です`);
  monster.drops.forEach(drop => assert(materialIds.has(drop.itemId), `${monsterId}が未定義素材を参照しています: ${drop.itemId}`));
  assert(monster.actions.length === 1 + Number(isBoss) + Number(hasUniqueAction), `${monsterId}の固有行動数が不正です`);
  assert(monster.actions.every(action => action.description && action.chance > 0), `${monsterId}の行動表示情報が不正です`);
  assert(monster.actions.reduce((sum, action) => sum + action.chance, 0) < 100, `${monsterId}の行動確率合計が100%以上です`);
  if (hasUniqueAction) assert(monster.actions[1].name === UNIQUE_ACTIONS.get(monsterId), `${monsterId}の固有スキル名が不正です`);

  monster.actions.forEach((action, actionIndex) => {
    const attacker = {
      stats: { hp: 10000, attackElements: {}, attackAilments: {} },
      currentHp: 5000,
      atb: 800,
      isDead: false,
      elementId: 'attacker',
      activeAilment: { type: 'poison' },
      _defBuffPercent: -30,
      _defBuffTurns: 3,
    };
    const defender = {
      stats: { hp: 10000 },
      currentHp: 5000,
      maxHp: 10000,
      atb: 900,
      isDead: false,
      elementId: 'defender',
      _atkBuffPercent: 30,
      _atkBuffTurns: 3,
      _defBuffPercent: 30,
      _defBuffTurns: 3,
      _mdefBuffAmount: 500,
      _mdefBuffTurns: 3,
    };
    const secondTarget = { stats: { hp: 10000 }, currentHp: 5000, maxHp: 10000, atb: 900, isDead: false, elementId: 'second' };
    let attackCount = 0;
    const battle = {
      party: [defender, secondTarget, { currentHp: 0, atb: 0, isDead: true }],
      enemies: [attacker],
      executeAttack(source, target) {
        attackCount += 1;
        target.currentHp = Math.max(0, target.currentHp - 100);
        if (target.currentHp === 0) target.isDead = true;
      },
      showActionName() {},
      showDamage() {},
    };
    action.execute(attacker, defender, battle);
    if (actionIndex === 0) assert(attackCount > 0, `${monsterId}の攻撃行動が攻撃を実行しません`);
    if (isBoss && actionIndex === monster.actions.length - 1) assert(attackCount === 0, `${monsterId}の圧力行動が意図せず直接攻撃しています`);
    if (monsterId === 'orbit_golem' && actionIndex === 0) assert(defender.atb < 900, `${monsterId}のATB妨害が機能していません`);
    if (monsterId === 'eclipse_owl' && actionIndex === 0) {
      assert(defender._atkBuffPercent === 0, `${monsterId}のバフ解除が機能していません`);
      assert(defender._defBuffPercent < 0, `${monsterId}の防御低下が機能していません`);
    }
    if (isBoss && actionIndex === 0) {
      assert(defender.atb < 900 && secondTarget.atb < 900, `${monsterId}の全体ATB妨害が機能していません`);
      assert(defender._defBuffPercent < 0, `${monsterId}の全体防御低下が機能していません`);
    }
    if (hasUniqueAction && actionIndex === 1) {
      if (monsterId === 'orbit_golem') assert(defender.atb === 450 && secondTarget.atb === 450, `${monsterId}のATB半減が機能していません`);
      if (monsterId === 'hellfire_witch') assert(attacker.currentHp === 4400 && attackCount === 2, `${monsterId}の自傷全体攻撃が機能していません`);
      if (monsterId === 'elder_dragon') {
        assert(attacker.currentHp === 6200 && attacker.activeAilment === null, `${monsterId}の回復・状態異常解除が機能していません`);
        assert(attacker._defBuffPercent === 0 && attacker._atkBuffPercent === 35, `${monsterId}の能力回復・強化が機能していません`);
      }
      if (monsterId === 'fallen_seraph') assert(attacker._barrierHp === 800 && attacker._atkBuffPercent === 25, `${monsterId}の障壁・強化が機能していません`);
      if (monsterId === 'lunar_knight') {
        assert(defender._atkBuffPercent === 0 && defender._defBuffPercent === 0, `${monsterId}のバフ奪取が対象へ反映されていません`);
        assert(attacker._atkBuffPercent === 30 && attacker._defBuffPercent === 30, `${monsterId}が奪ったバフを獲得していません`);
        assert(defender._mdefBuffAmount === 0 && attacker._mdefBuffAmount === 500, `${monsterId}が固定値バフを奪取していません`);
      }
      if (monsterId === 'rainbow_gryphon') assert(attackCount === 6, `${monsterId}の三属性全体攻撃回数が不正です`);
      if (monsterId === 'paradox_sphinx') assert(defender.atb === 100 && secondTarget.atb === 100, `${monsterId}のATB反転が機能していません`);
      if (monsterId === 'chronicle_golem') {
        assert(attacker.currentHp === 5800 && attacker.atb === 1000, `${monsterId}のHP・ATB回復が機能していません`);
        assert(attacker.activeAilment === null && attacker._defBuffPercent === 0, `${monsterId}の状態巻き戻しが機能していません`);
      }
      if (monsterId === 'causality_dragon') {
        assert(defender._atkBuffPercent === -30 && defender._defBuffPercent === -30, `${monsterId}のバフ反転が機能していません`);
        assert(defender._mdefBuffAmount === -500, `${monsterId}の固定値バフ反転が機能していません`);
      }
    }
  });
}

const finalBoss = monsterMap.get('singularity_origin');
assert(finalBoss.actions[0].chance > monsterMap.get('astraios').actions[0].chance, '終盤で固有行動率が上昇していません');
assert(finalBoss.actions[1].description.includes('ATBを消去'), '最終ボスの法則崩壊が凶悪化していません');

const thematicExpectations = {
  astral_wisp: ['最大2人', '星命効果'],
  comet_hare: ['2連撃', '星命効果'],
  cinder_imp: ['自身の攻撃・魔攻を強化', 'HPが減るほど威力'],
  magma_armor: ['強化効果を解除', '獄炎効果'],
  abyss_minotaur: ['処刑攻撃', 'HPが40%以下'],
  ember_wyvern: ['連撃', '竜血効果'],
  cloud_gargoyle: ['連撃', '魔城効果'],
  moon_moth: ['最大3人', '月鏡効果'],
  cloud_sprite: ['ATB', '風雷効果'],
  twilight_mimic: ['HPを回復', '迷界効果'],
  relic_scarab: ['連撃', '時蝕効果'],
  glitch_slime: ['生存者全員', '亜空効果'],
};
for (const [monsterId, phrases] of Object.entries(thematicExpectations)) {
  const description = monsterMap.get(monsterId).actions[0].description;
  phrases.forEach(phrase => assert(description.includes(phrase), `${monsterId}のテーマ行動に「${phrase}」がありません`));
}

const equipmentGroups = [WEAPONS, ARMORS, SHIELDS, ACCESSORIES];
const suffixes = ['_weapon', '_armor', '_shield', '_accessory'];
equipmentGroups.forEach((equipment, index) => {
  const advanced = equipment.filter(item => [...advancedMonsterIds].some(id => item.id === `${id}${suffixes[index]}`));
  assert(advanced.length === 72, `${suffixes[index]}の追加件数が72ではありません: ${advanced.length}`);
  advanced.forEach(item => {
    assert(item.recipe?.materials?.length === 2, `${item.id}のレシピが不正です`);
    item.recipe.materials.forEach(material => assert(materialIds.has(material.id), `${item.id}が未定義素材を参照しています: ${material.id}`));
  });
});

print(JSON.stringify({
  dungeons: ADVANCED_DUNGEON_IDS.length,
  floors: ADVANCED_DUNGEON_IDS.length * 8,
  monsters: advancedMonsterIds.size,
  uniqueActions: UNIQUE_ACTIONS.size,
  materials: [...materialIds].filter(id => [...advancedMonsterIds].some(monsterId => id.startsWith(`mat_${monsterId}_`))).length,
  equipment: equipmentGroups.reduce((sum, items, index) => sum + items.filter(item => [...advancedMonsterIds].some(id => item.id === `${id}${suffixes[index]}`)).length, 0),
}));
