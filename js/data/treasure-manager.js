import { GameDB } from './database.js';
import {
  BASE_MATERIAL_CAPACITY,
  PRISM_GACHA_COST,
  TREASURES,
  TREASURE_MAP,
  TREASURE_STATE_KEY,
  TREASURE_TOTAL_WEIGHT,
  getTreasureValue,
} from '../definitions/treasures.js';

let cachedLevels = {};
let loaded = false;

function normalizeLevels(value) {
  const normalized = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return normalized;
  for (const treasure of TREASURES) {
    const level = Math.floor(Number(value[treasure.id]) || 0);
    if (level > 0) normalized[treasure.id] = level;
  }
  return normalized;
}

export async function loadTreasureLevels(force = false) {
  if (!loaded || force) {
    cachedLevels = normalizeLevels(await GameDB.getGameState(TREASURE_STATE_KEY));
    loaded = true;
  }
  return { ...cachedLevels };
}

export function getTreasureLevels() {
  return { ...cachedLevels };
}

export function getTreasureLevel(id) {
  return cachedLevels[id] || 0;
}

export function getTreasureEffect(effect) {
  const treasure = TREASURES.find(item => item.effect === effect);
  return getTreasureValue(treasure, treasure ? getTreasureLevel(treasure.id) : 0);
}

export function getMaterialCapacity() {
  return BASE_MATERIAL_CAPACITY + getTreasureEffect('materialCapacityBonus');
}

function selectTreasure(random = Math.random()) {
  let cursor = Math.max(0, Math.min(0.999999999999, random)) * TREASURE_TOTAL_WEIGHT;
  for (const treasure of TREASURES) {
    cursor -= treasure.weight;
    if (cursor < 0) return treasure;
  }
  return TREASURES[TREASURES.length - 1];
}

export async function drawPrismGacha(random = Math.random) {
  await loadTreasureLevels();
  const prism = Number(await GameDB.getGameState('prism')) || 0;
  if (prism < PRISM_GACHA_COST) throw new Error('Prismが足りません。');

  const treasure = selectTreasure(random());
  if (!TREASURE_MAP.has(treasure.id)) throw new Error('秘宝の抽選に失敗しました。');
  const previousLevel = getTreasureLevel(treasure.id);
  cachedLevels[treasure.id] = previousLevel + 1;

  const refundChance = getTreasureEffect('prismRefundPercent') / 100;
  const refunded = random() < refundChance;
  const nextPrism = prism - PRISM_GACHA_COST + (refunded ? PRISM_GACHA_COST : 0);

  await Promise.all([
    GameDB.setGameState(TREASURE_STATE_KEY, { ...cachedLevels }),
    GameDB.setGameState('prism', nextPrism),
  ]);

  return {
    treasure,
    previousLevel,
    level: previousLevel + 1,
    value: getTreasureValue(treasure, previousLevel + 1),
    refunded,
    prism: nextPrism,
  };
}
