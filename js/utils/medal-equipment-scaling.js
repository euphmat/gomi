import { DUNGEONS } from '../definitions/dungeons.js';
import { SPECIAL_DUNGEONS } from '../definitions/special_dungeons.js';
import {
  MEDAL_SHOP_REWARDS,
  calculateMedalPoints,
} from '../definitions/medal-shop-definitions.js';

const ALL_DUNGEONS = [...DUNGEONS, ...SPECIAL_DUNGEONS];
const REWARD_MAP = new Map(MEDAL_SHOP_REWARDS.map(reward => [reward.id, reward]));

export function isMedalShopEquipment(item) {
  const baseId = item?.baseId || item?.id;
  return typeof baseId === 'string' && REWARD_MAP.has(baseId);
}

function completedFloorCount(value) {
  if (Array.isArray(value)) return new Set(value.map(Number)).size;
  if (value && typeof value === 'object') {
    return Object.values(value).filter(Boolean).length;
  }
  return 0;
}

export function calculateDungeonProgress({
  completedDungeons = [],
  completedDungeonFloors = {},
  unlockedDungeons = [],
  currentDungeonId = null,
  currentFloor = 1,
} = {}) {
  const completed = new Set(Array.isArray(completedDungeons) ? completedDungeons : []);
  const unlocked = new Set(Array.isArray(unlockedDungeons) ? unlockedDungeons : ['slime_forest']);
  let progressUnits = 0;

  ALL_DUNGEONS.forEach((dungeon, index) => {
    const floorTotal = Math.max(1, dungeon.floors?.length || 1);
    let localProgress = completed.has(dungeon.id)
      ? 1
      : Math.min(1, completedFloorCount(completedDungeonFloors?.[dungeon.id]) / floorTotal);

    if (!completed.has(dungeon.id) && currentDungeonId === dungeon.id) {
      localProgress = Math.max(localProgress, Math.min(1, Math.max(0, Number(currentFloor) - 1) / floorTotal));
    }

    if (completed.has(dungeon.id) || unlocked.has(dungeon.id) || localProgress > 0) {
      progressUnits = Math.max(progressUnits, index + localProgress);
    }
  });

  return {
    progressUnits,
    progressPercent: ALL_DUNGEONS.length > 0 ? Math.min(100, progressUnits / ALL_DUNGEONS.length * 100) : 0,
    dungeonCount: ALL_DUNGEONS.length,
  };
}

export function createMedalEquipmentScalingContext({
  playerMedals = {},
  completedDungeons = [],
  completedDungeonFloors = {},
  unlockedDungeons = [],
  currentDungeonId = null,
  currentFloor = 1,
} = {}) {
  return {
    medalPoints: calculateMedalPoints(playerMedals),
    ...calculateDungeonProgress({
      completedDungeons,
      completedDungeonFloors,
      unlockedDungeons,
      currentDungeonId,
      currentFloor,
    }),
  };
}

export function getMedalEquipmentMultiplier(reward, context = {}) {
  if (!reward) return { medalMultiplier: 1, dungeonMultiplier: 1, totalMultiplier: 1 };
  const requiredPoints = Math.max(1, Number(reward.points) || 1);
  const currentPoints = Math.max(0, Number(context.medalPoints) || 0);

  // Logarithmic growth lets early rewards keep improving when future medals
  // are added, while preventing raw stats from exploding linearly.
  const pointRatio = Math.max(1, currentPoints / requiredPoints);
  const medalMultiplier = 1 + Math.log2(pointRatio) * 0.6;

  const rewardIndex = Math.max(0, ALL_DUNGEONS.findIndex(dungeon => dungeon.id === reward.dungeonId));
  const progressUnits = Math.max(0, Number(context.progressUnits) || 0);
  const remainingUnits = Math.max(1, ALL_DUNGEONS.length - rewardIndex);
  const progressBeyondReward = Math.min(1, Math.max(0, progressUnits - rewardIndex) / remainingUnits);
  const dungeonMultiplier = 1 + progressBeyondReward * 0.25;

  return {
    medalMultiplier,
    dungeonMultiplier,
    totalMultiplier: medalMultiplier * dungeonMultiplier,
  };
}

export function scaleMedalShopEquipment(item, context = {}) {
  if (!item) return item;
  const baseId = item.baseId || item.id;
  const reward = REWARD_MAP.get(baseId);
  if (!reward) return item;

  const scaling = getMedalEquipmentMultiplier(reward, context);
  const baseStats = { ...(reward.stats || {}) };
  const stats = Object.fromEntries(Object.entries(baseStats).map(([key, value]) => [
    key,
    Math.max(0, Math.round((Number(value) || 0) * scaling.totalMultiplier)),
  ]));

  return {
    ...item,
    stats,
    medalBaseStats: baseStats,
    medalScaling: {
      ...scaling,
      medalPoints: Number(context.medalPoints) || 0,
      dungeonProgressPercent: Number(context.progressPercent) || 0,
    },
  };
}

export function scaleMedalShopEquipmentList(items, context = {}) {
  return (items || []).map(item => scaleMedalShopEquipment(item, context));
}
