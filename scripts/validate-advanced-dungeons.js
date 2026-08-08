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
  assert(monster.drops.length === 3, `${monsterId}の素材ドロップが3件ではありません`);
  assert(monster.drops.map(drop => drop.rate).join(',') === '5,1,0.1', `${monsterId}のドロップ率が不正です`);
  monster.drops.forEach(drop => assert(materialIds.has(drop.itemId), `${monsterId}が未定義素材を参照しています: ${drop.itemId}`));
  assert(monster.actions.length === 1, `${monsterId}の固有行動が1件ではありません`);
  const attacker = { stats: { attackElements: {}, attackAilments: {} } };
  const defender = { isDead: false };
  let attackCount = 0;
  monster.actions[0].execute(attacker, defender, {
    party: [{ isDead: false }, { isDead: false }, { isDead: true }],
    executeAttack() { attackCount += 1; },
  });
  assert(attackCount === (bossIds.has(monsterId) ? 2 : 1), `${monsterId}の固有行動対象数が不正です`);
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
