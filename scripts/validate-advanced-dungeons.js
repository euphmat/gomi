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
  assert(monster.drops.length === 3, `${monsterId}の素材ドロップが3件ではありません`);
  assert(monster.drops.map(drop => drop.rate).join(',') === '5,1,0.1', `${monsterId}のドロップ率が不正です`);
  monster.drops.forEach(drop => assert(materialIds.has(drop.itemId), `${monsterId}が未定義素材を参照しています: ${drop.itemId}`));
  assert(monster.actions.length === (isBoss ? 2 : 1), `${monsterId}の固有行動数が不正です`);
  assert(monster.actions.every(action => action.description && action.chance > 0), `${monsterId}の行動表示情報が不正です`);
  assert(monster.actions.reduce((sum, action) => sum + action.chance, 0) < 100, `${monsterId}の行動確率合計が100%以上です`);

  monster.actions.forEach((action, actionIndex) => {
    const attacker = {
      stats: { hp: 10000, attackElements: {}, attackAilments: {} },
      currentHp: 5000,
      atb: 800,
      isDead: false,
      elementId: 'attacker',
    };
    const defender = {
      currentHp: 5000,
      atb: 900,
      isDead: false,
      elementId: 'defender',
      _atkBuffPercent: 30,
      _atkBuffTurns: 3,
      _defBuffPercent: 30,
      _defBuffTurns: 3,
    };
    const secondTarget = { currentHp: 5000, atb: 900, isDead: false, elementId: 'second' };
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
    if (actionIndex === 1) assert(attackCount === 0, `${monsterId}の圧力行動が意図せず直接攻撃しています`);
    if (monsterId === 'orbit_golem' && actionIndex === 0) assert(defender.atb < 900, `${monsterId}のATB妨害が機能していません`);
    if (monsterId === 'eclipse_owl' && actionIndex === 0) {
      assert(defender._atkBuffPercent === 0, `${monsterId}のバフ解除が機能していません`);
      assert(defender._defBuffPercent < 0, `${monsterId}の防御低下が機能していません`);
    }
    if (isBoss && actionIndex === 0) {
      assert(defender.atb < 900 && secondTarget.atb < 900, `${monsterId}の全体ATB妨害が機能していません`);
      assert(defender._defBuffPercent < 0, `${monsterId}の全体防御低下が機能していません`);
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
  materials: [...materialIds].filter(id => [...advancedMonsterIds].some(monsterId => id.startsWith(`mat_${monsterId}_`))).length,
  equipment: equipmentGroups.reduce((sum, items, index) => sum + items.filter(item => [...advancedMonsterIds].some(id => item.id === `${id}${suffixes[index]}`)).length, 0),
}));
