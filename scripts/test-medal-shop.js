import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  MEDAL_SHOP_ACCESSORIES,
  MEDAL_SHOP_ARMORS,
  MEDAL_SHOP_DUNGEON_REWARDS,
  MEDAL_SHOP_REWARDS,
  MEDAL_SHOP_WEAPONS,
  calculateMedalPoints,
} from '../js/definitions/medal-shop-definitions.js';
import {
  calculateMedalEquipmentIncomingDamage,
  getEffectiveMedalEquipmentMpCost,
  hasMedalEquipmentImmunity,
  sumMedalEquipmentEffect,
} from '../js/utils/medal-equipment-effects.js';
import { actionMethods } from '../js/pages/battle/battle-actions.js';
import { ailmentMethods } from '../js/pages/battle/battle-ailments.js';
import { calcFinalStats } from '../js/data/stat-calculator.js';
import { DUNGEONS } from '../js/definitions/dungeons.js';
import { SPECIAL_DUNGEONS } from '../js/definitions/special_dungeons.js';
import {
  calculateDungeonProgress,
  getMedalEquipmentMultiplier,
  scaleMedalShopEquipment,
} from '../js/utils/medal-equipment-scaling.js';

assert.equal(MEDAL_SHOP_DUNGEON_REWARDS.length, 17);
assert.equal(MEDAL_SHOP_REWARDS.length, 51);
assert.equal(MEDAL_SHOP_ACCESSORIES.length, 17);
assert.equal(MEDAL_SHOP_ARMORS.length, 17);
assert.equal(MEDAL_SHOP_WEAPONS.length, 17);

for (const reward of MEDAL_SHOP_REWARDS) {
  const imageUrl = new URL(`../assets/${reward.type}/${reward.id}.webp`, import.meta.url);
  assert.equal(existsSync(imageUrl), true, `Missing medal shop image for ${reward.id}`);
}

for (const dungeon of MEDAL_SHOP_DUNGEON_REWARDS) {
  assert.equal(dungeon.rewards.length, 3);
  assert.deepEqual(dungeon.rewards.map(reward => reward.type), ['accessory', 'armor', 'weapon']);
  assert.ok(dungeon.rewards[0].points < dungeon.rewards[1].points);
  assert.ok(dungeon.rewards[1].points < dungeon.rewards[2].points);
  assert.equal(dungeon.rewards[2].points, dungeon.maxPoints);
}

let cumulativeMaxPoints = 0;
for (const dungeon of [...DUNGEONS, ...SPECIAL_DUNGEONS]) {
  const monsterIds = new Set();
  for (const floor of dungeon.floors || []) {
    for (const encounter of floor.monsters || []) {
      for (const [monsterId, count] of Object.entries(encounter || {})) {
        if (monsterId !== 'weight' && Number(count) > 0) monsterIds.add(monsterId);
      }
    }
  }
  cumulativeMaxPoints += monsterIds.size * 10;
  const rewardGroup = MEDAL_SHOP_DUNGEON_REWARDS.find(group => group.dungeonId === dungeon.id);
  assert.ok(rewardGroup, `Missing medal shop rewards for ${dungeon.id}`);
  assert.equal(rewardGroup.maxPoints, cumulativeMaxPoints);
}
assert.equal(cumulativeMaxPoints, 1760);

const fullProgress = calculateDungeonProgress({
  completedDungeons: [...DUNGEONS, ...SPECIAL_DUNGEONS].map(dungeon => dungeon.id),
});
assert.equal(fullProgress.progressUnits, 17);
assert.equal(fullProgress.progressPercent, 100);

const slimeWeapon = MEDAL_SHOP_REWARDS.find(reward => reward.id === 'medal_slime_calibur');
const finalScaling = getMedalEquipmentMultiplier(slimeWeapon, {
  medalPoints: 1760,
  progressUnits: 17,
});
assert.ok(finalScaling.medalMultiplier > 2.9 && finalScaling.medalMultiplier < 3);
assert.equal(finalScaling.dungeonMultiplier, 1.25);
assert.ok(finalScaling.totalMultiplier > 3.6 && finalScaling.totalMultiplier < 3.75);
const scaledSlimeWeapon = scaleMedalShopEquipment(slimeWeapon, {
  medalPoints: 1760,
  progressUnits: 17,
  progressPercent: 100,
});
assert.equal(scaledSlimeWeapon.stats.atk, 966);
assert.equal(scaledSlimeWeapon.medalBaseStats.atk, 260);

assert.equal(calculateMedalPoints({ a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6 }), 35);
assert.equal(calculateMedalPoints({ a: 6, b: 6, c: 6 }), 30);
assert.equal(calculateMedalPoints({ missing: 99 }), 0);

const equipmentMap = new Map([
  ['one', { specialEffect: { incomingDamageReductionPercent: 8, ailmentImmunities: ['poison'] } }],
  ['two', { specialEffect: { incomingDamageReductionPercent: 15 } }],
]);
const entity = { equipment: { armor: 'one', accessory1: 'two' } };
assert.equal(sumMedalEquipmentEffect(entity, equipmentMap, 'incomingDamageReductionPercent'), 23);
assert.equal(sumMedalEquipmentEffect(entity, equipmentMap, 'incomingDamageReductionPercent', 20), 20);
assert.equal(hasMedalEquipmentImmunity(entity, equipmentMap, 'poison'), true);
assert.equal(hasMedalEquipmentImmunity(entity, equipmentMap, 'sleep'), false);

const moonlitDress = MEDAL_SHOP_REWARDS.find(reward => reward.id === 'medal_moonlit_ceremony_dress');
const slimeCrown = MEDAL_SHOP_REWARDS.find(reward => reward.id === 'medal_slime_crown');
const requiemLocket = MEDAL_SHOP_REWARDS.find(reward => reward.id === 'medal_requiem_locket');
const effectEquipmentMap = new Map([
  [moonlitDress.id, moonlitDress],
  [slimeCrown.id, slimeCrown],
  [requiemLocket.id, requiemLocket],
]);
const effectCharacter = {
  hp: { current: 100, max: 100 },
  stats: { hp: 100 },
  equipment: { armor: moonlitDress.id, accessory1: slimeCrown.id },
};
assert.equal(getEffectiveMedalEquipmentMpCost(effectCharacter, effectEquipmentMap, 100), 75);
assert.equal(calculateMedalEquipmentIncomingDamage(effectCharacter, effectEquipmentMap, 100), 92);

const survivalCharacter = {
  elementId: 'survival-test',
  hp: { current: 10, max: 100 },
  stats: { hp: 100 },
  equipment: { accessory1: requiemLocket.id },
};
const survivalBattle = {
  equipMap: effectEquipmentMap,
  speedMult: 5,
  _scheduleBattleTimeout() {},
  showActionName() {},
  showDamage() {},
};
const survivalResult = actionMethods.applyMedalEquipmentLethalSurvival.call(survivalBattle, survivalCharacter, 20);
assert.deepEqual(survivalResult, { damage: 0, survived: true });
assert.equal(survivalCharacter.hp.current, 25);
assert.equal(survivalCharacter._medalLethalSurvivalUsed, true);

const ailmentCharacter = {
  elementId: 'ailment-test',
  hp: { current: 10, max: 100 },
  stats: { hp: 100 },
  equipment: { accessory1: requiemLocket.id, accessory2: slimeCrown.id },
  _barrierHp: 5,
  isDead: false,
};
const ailmentBattle = {
  ...survivalBattle,
  isStopped: false,
  applyMedalEquipmentIncomingDamage: actionMethods.applyMedalEquipmentIncomingDamage,
  applyMedalEquipmentLethalSurvival: actionMethods.applyMedalEquipmentLethalSurvival,
  battleTelemetry: { recordPrevented() {}, recordDamage() {} },
  clearEntityStatuses() {},
  trySoulReaperDeathDenial() { return false; },
};
ailmentMethods.takeAilmentDamage.call(ailmentBattle, ailmentCharacter, 20, 'POISON');
assert.equal(ailmentCharacter._barrierHp, 0);
assert.equal(ailmentCharacter.hp.current, 25);
assert.equal(ailmentCharacter.isDead, false);

const stats = calcFinalStats({
  hp: { max: 100 }, mp: { max: 20 },
  baseStats: { atk: 10, def: 50, matk: 10, mdef: 50, spd: 10 },
  equipment: { armor: 'percent-armor' },
}, new Map([['percent-armor', {
  slot: 'armor', stats: {}, elements: {}, ailments: {},
  specialEffect: { statPercent: { hp: 10, def: 10, spd: 10 } },
}]]));
assert.equal(stats.hp, 110);
assert.equal(stats.def, 55);
assert.equal(stats.spd, 11);

console.log('Medal shop tests passed.');
