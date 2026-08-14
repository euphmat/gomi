import { GameDB } from './database.js';
import {
  BASE_MATERIAL_CAPACITY,
  PRISM_GACHA_COST,
  TREASURES,
  TREASURE_MAP,
  TREASURE_STATE_KEY,
  getTreasureValue,
} from '../definitions/treasures.js';

let cachedLevels = {};
let loaded = false;

function normalizeLevels(value) {
  const normalized = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return normalized;
  for (const treasure of TREASURES) {
    const level = Math.min(treasure.maxLevel, Math.floor(Number(value[treasure.id]) || 0));
    if (level > 0) normalized[treasure.id] = level;
  }
  return normalized;
}

export async function loadTreasureLevels(force = false) {
  if (!loaded || force) {
    const savedLevels = await GameDB.getGameState(TREASURE_STATE_KEY);
    cachedLevels = normalizeLevels(savedLevels);
    const isStoredRecord = savedLevels && typeof savedLevels === 'object' && !Array.isArray(savedLevels);
    const savedEntries = isStoredRecord
      ? Object.entries(savedLevels)
      : [];
    const needsCleanup = savedLevels != null && (
      !isStoredRecord
      || savedEntries.length !== Object.keys(cachedLevels).length
      || savedEntries.some(([id, level]) => cachedLevels[id] !== Math.floor(Number(level) || 0))
    );
    if (needsCleanup) {
      await GameDB.setGameState(TREASURE_STATE_KEY, { ...cachedLevels });
    }
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

function selectTreasure(levels, random = Math.random()) {
  const available = TREASURES.filter(treasure => (levels[treasure.id] || 0) < treasure.maxLevel);
  const totalWeight = available.reduce((sum, treasure) => sum + treasure.weight, 0);
  if (totalWeight <= 0) return null;
  let cursor = Math.max(0, Math.min(0.999999999999, random)) * totalWeight;
  for (const treasure of available) {
    cursor -= treasure.weight;
    if (cursor < 0) return treasure;
  }
  return available[available.length - 1];
}

export async function drawPrismGacha(random = Math.random) {
  await loadTreasureLevels();
  const treasure = selectTreasure(cachedLevels, random());
  if (!treasure) throw new Error('すべての秘宝が上限レベルに到達しています。');

  const prism = Number(await GameDB.getGameState('prism')) || 0;
  if (prism < PRISM_GACHA_COST) throw new Error('Prismが足りません。');

  if (!TREASURE_MAP.has(treasure.id)) throw new Error('秘宝の抽選に失敗しました。');
  const previousLevel = getTreasureLevel(treasure.id);
  const level = Math.min(treasure.maxLevel, previousLevel + 1);
  cachedLevels[treasure.id] = level;

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
    level,
    value: getTreasureValue(treasure, level),
    refunded,
    prism: nextPrism,
  };
}
