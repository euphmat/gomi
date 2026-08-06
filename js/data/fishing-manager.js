import { GameDB } from './database.js';
import { FISH, FISHING_SPOTS } from '../definitions/fish.js';
import { MONSTERS } from '../definitions/monsters.js';
import { MATERIALS } from '../definitions/materials.js';
import { WEAPONS } from '../definitions/weapons.js';
import { ARMORS } from '../definitions/armors.js';
import { SHIELDS } from '../definitions/shields.js';
import { ACCESSORIES } from '../definitions/accessories.js';
import { DUNGEONS } from '../definitions/dungeons.js';
import { SPECIAL_DUNGEONS } from '../definitions/special_dungeons.js';
import {
  FISHING_BAIT_WEIGHT_PER_LEVEL,
  FISHING_LURE_CHANCE_PER_LEVEL,
  FISHING_LURE_MAX_CATCH,
  FISHING_ROD_SPEED_PER_LEVEL,
  FISHING_TACKLE,
  FISHING_TACKLE_MAX_LEVEL,
  FISHING_TACKLE_MIN_LEVEL,
  FISHING_TACKLE_RARITIES,
  getFishingTackleRecipe,
} from '../definitions/fishing-tackle.js';
import { getRanchLevelInfo } from './stat-calculator.js';

const FISHING_STATE_KEY = 'fishing_data';
const LEGACY_RANCH_FISH_STATE_KEY = 'ranch_fish_data';

const ALL_EQUIPMENT = [...WEAPONS, ...ARMORS, ...SHIELDS, ...ACCESSORIES];
const MATERIAL_MAP = new Map(MATERIALS.map(item => [item.id, item]));
const FISH_MAP = new Map(FISH.map(item => [item.id, item]));
const MATERIAL_CATCH_AMOUNT = 100;
const FISH_RARITY_INDEX = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 5,
};

function createFishingState() {
  return {
    inventory: {},
    sessionInventory: {},
    discovered: {},
    totalCaught: 0,
    prismShards: 0,
    fishFeed: {},
    recentBonusCatches: [],
    tackle: {
      rodLevel: FISHING_TACKLE_MIN_LEVEL,
      baitLevel: FISHING_TACKLE_MIN_LEVEL,
      lureLevel: FISHING_TACKLE_MIN_LEVEL,
    },
  };
}

function normalizeFishCount(entry) {
  if (entry && typeof entry === 'object') {
    return Math.max(0, Object.values(entry).reduce((sum, value) => sum + (Number(value) || 0), 0));
  }
  return Math.max(0, Number(entry) || 0);
}

function normalizeFishDiscovery(entry) {
  return Boolean(
    entry && typeof entry === 'object'
      ? Object.values(entry).some(Boolean)
      : entry
  );
}

export function getDiscoveredFishCount(state) {
  return FISH.reduce(
    (count, fish) => count + (normalizeFishDiscovery(state?.discovered?.[fish.id]) ? 1 : 0),
    0
  );
}

function normalizeTackleLevel(level) {
  return Math.max(
    FISHING_TACKLE_MIN_LEVEL,
    Math.min(FISHING_TACKLE_MAX_LEVEL, Math.floor(Number(level) || FISHING_TACKLE_MIN_LEVEL))
  );
}

function normalizeFishingTackle(tackle) {
  return {
    rodLevel: normalizeTackleLevel(tackle?.rodLevel),
    baitLevel: normalizeTackleLevel(tackle?.baitLevel),
    lureLevel: normalizeTackleLevel(tackle?.lureLevel),
  };
}

export function getFishingTackleLevel(state, type) {
  const definition = FISHING_TACKLE[type];
  return definition ? normalizeTackleLevel(state?.tackle?.[definition.levelKey]) : 0;
}

export function getFishingSpotUnlockStatus(state, spotId) {
  const spot = FISHING_SPOTS.find(item => item.id === spotId);
  if (!spot) return { unlocked: false, current: 0, required: 0, prerequisiteSpot: null };

  const condition = spot.unlockCondition;
  if (!condition) return { unlocked: true, current: 0, required: 0, prerequisiteSpot: null };

  const prerequisiteSpot = FISHING_SPOTS.find(item => item.id === condition.spotId) || null;
  const required = Math.max(1, Number(condition.discoveredSpecies) || 1);
  const current = FISH
    .filter(fish => fish.spotId === condition.spotId)
    .reduce((count, fish) => count + (normalizeFishDiscovery(state?.discovered?.[fish.id]) ? 1 : 0), 0);

  return {
    unlocked: current >= required,
    current,
    required,
    prerequisiteSpot,
  };
}

function bonusGroupKey(item) {
  if (item?.type === 'gold') return 'gold';
  if (item?.type === 'material' && item.itemId) return `material:${item.itemId}`;
  return null;
}

function materialCatchAmount(item) {
  const savedAmount = Number(item?.amount);
  if (Number.isFinite(savedAmount) && savedAmount > 0) return savedAmount;
  const nameAmount = String(item?.name || '').match(/×([\d,]+)\s*$/)?.[1];
  return nameAmount ? Number(nameAmount.replaceAll(',', '')) : 1;
}

function groupRecentBonuses(items) {
  const grouped = [];
  for (const savedItem of items) {
    if (!savedItem || typeof savedItem !== 'object') continue;
    const item = { ...savedItem, catchCount: Math.max(1, Number(savedItem.catchCount) || 1) };
    const key = bonusGroupKey(item);
    if (!key) {
      grouped.push(item);
      continue;
    }

    const existing = grouped.find(entry => bonusGroupKey(entry) === key);
    const amount = item.type === 'material' ? materialCatchAmount(item) : Math.max(0, Number(item.amount) || 0);
    if (existing) {
      existing.amount += amount;
      existing.catchCount += item.catchCount;
      continue;
    }

    item.amount = amount;
    if (item.type === 'material') {
      item.baseName = item.baseName || String(item.name || '素材').replace(/\s*×[\d,]+\s*$/, '');
    }
    grouped.push(item);
  }

  for (const item of grouped) {
    if (item.type === 'gold') item.name = `Gold袋（${item.amount.toLocaleString()} G）`;
    if (item.type === 'material') item.name = `${item.baseName} ×${item.amount.toLocaleString()}`;
  }
  return grouped;
}

export async function loadFishingData() {
  const saved = await GameDB.getGameState(FISHING_STATE_KEY) || {};
  const hasDeprecatedFishOil = Object.prototype.hasOwnProperty.call(saved, 'fishOil');
  const state = { ...createFishingState(), ...saved };
  // 旧バージョンで所持していた魚油は、廃止後の状態へ持ち込まない。
  delete state.fishOil;
  state.inventory = { ...(saved.inventory || {}) };
  state.sessionInventory = { ...(saved.sessionInventory || {}) };
  state.fishFeed = { ...(saved.fishFeed || {}) };
  state.discovered = { ...(saved.discovered || {}) };
  state.tackle = normalizeFishingTackle(saved.tackle);
  const savedBonuses = Array.isArray(saved.recentBonusCatches)
    ? saved.recentBonusCatches
    : (Array.isArray(saved.recentCatches) ? saved.recentCatches.filter(item => item?.type !== 'fish') : []);
  state.recentBonusCatches = groupRecentBonuses(savedBonuses).slice(0, 12);
  delete state.recentCatches;
  for (const fish of FISH) {
    state.inventory[fish.id] = normalizeFishCount(state.inventory[fish.id]);
    state.sessionInventory[fish.id] = normalizeFishCount(state.sessionInventory[fish.id]);
    state.fishFeed[fish.id] = normalizeFishCount(state.fishFeed[fish.id]);
    state.discovered[fish.id] = normalizeFishDiscovery(state.discovered[fish.id]);
  }
  if (hasDeprecatedFishOil) await saveFishingData(state);
  return state;
}

async function saveFishingData(state) {
  await GameDB.setGameState(FISHING_STATE_KEY, state);
  return state;
}

function weightedFish(spotId, baitLevel = 0) {
  const candidates = FISH.filter(fish => fish.spotId === spotId);
  const pool = candidates.length ? candidates : FISH.filter(fish => fish.spotId === FISHING_SPOTS[0].id);
  const normalizedBaitLevel = normalizeTackleLevel(baitLevel);
  const weightedPool = pool.map(fish => ({
    fish,
    effectiveWeight: fish.weight * (
      1 + FISHING_BAIT_WEIGHT_PER_LEVEL * normalizedBaitLevel * (FISH_RARITY_INDEX[fish.rarity] || 0)
    ),
  }));
  const total = weightedPool.reduce((sum, entry) => sum + entry.effectiveWeight, 0);
  let roll = Math.random() * total;
  for (const entry of weightedPool) {
    roll -= entry.effectiveWeight;
    if (roll <= 0) return entry.fish;
  }
  return pool[0];
}

function dungeonForMonster(monsterId) {
  const all = [...DUNGEONS, ...SPECIAL_DUNGEONS];
  return all.find(dungeon => dungeon.floors?.some(floor => floor.monsters?.some(encounter =>
    Object.keys(encounter).some(key => key !== 'weight' && key === monsterId)
  )))?.id || 'slime_forest';
}

function addRecentBonus(state, result) {
  state.recentBonusCatches = groupRecentBonuses([
    { ...result, caughtAt: Date.now(), catchCount: 1 },
    ...state.recentBonusCatches,
  ]).slice(0, 12);
}

async function catchFish(state, spotId) {
  const baitLevel = getFishingTackleLevel(state, 'bait');
  const lureLevel = getFishingTackleLevel(state, 'lure');
  const lureChance = FISHING_LURE_CHANCE_PER_LEVEL * lureLevel;
  const fishes = [weightedFish(spotId, baitLevel)];
  while (fishes.length < FISHING_LURE_MAX_CATCH && Math.random() < lureChance) {
    fishes.push(weightedFish(spotId, baitLevel));
  }
  for (const fish of fishes) {
    state.sessionInventory[fish.id] = normalizeFishCount(state.sessionInventory[fish.id]) + 1;
    state.discovered[fish.id] = true;
  }
  state.totalCaught += fishes.length;
  const fish = fishes[0];
  const result = {
    type: 'fish',
    fishId: fish.id,
    name: fish.name,
    image: fish.image,
    fishes: fishes.map(item => ({
      fishId: item.id,
      name: item.name,
      image: item.image,
      rarity: item.rarity,
    })),
    catchCount: fishes.length,
  };
  window.dispatchEvent(new CustomEvent('quest:fish-caught', {
    detail: {
      count: fishes.length,
      fishId: fish.id,
      fishIds: fishes.map(item => item.id),
    },
  }));
  return result;
}

async function catchGoldBag(state) {
  const amount = (5 + Math.floor(Math.random() * 46)) * 100;
  const gold = Number(await GameDB.getGameState('gold')) || 0;
  await GameDB.setGameState('gold', gold + amount);
  const result = { type: 'gold', name: `Gold袋（${amount.toLocaleString()} G）`, amount, icon: 'paid' };
  addRecentBonus(state, result);
  return result;
}

async function catchMonsterMaterial(state, spotId) {
  const discovered = new Set(await GameDB.getGameState('discovered_monsters') || []);
  const candidates = MONSTERS.filter(monster => discovered.has(monster.id))
    .flatMap(monster => (monster.drops || []).map(drop => MATERIAL_MAP.get(drop.itemId)).filter(Boolean));
  if (!candidates.length) return catchFish(state, spotId);
  const material = candidates[Math.floor(Math.random() * candidates.length)];
  const current = await GameDB.getInventoryItem(material.id) || { ...material, type: 'material', quantity: 0 };
  current.quantity = (current.quantity || 0) + MATERIAL_CATCH_AMOUNT;
  await GameDB.putInventoryItem(current);
  const result = { type: 'material', name: `${material.name} ×${MATERIAL_CATCH_AMOUNT}`, baseName: material.name, image: material.image, itemId: material.id, amount: MATERIAL_CATCH_AMOUNT };
  addRecentBonus(state, result);
  return result;
}

async function catchEquipment(state, spotId) {
  const [ownedEquipment, discoveredItems] = await Promise.all([
    GameDB.getAllEquipment(),
    GameDB.getGameState('discovered_items'),
  ]);
  const acquiredBaseIds = new Set(Array.isArray(discoveredItems) ? discoveredItems : []);
  ownedEquipment.forEach(item => {
    if (item.baseId) acquiredBaseIds.add(item.baseId);
    const definition = ALL_EQUIPMENT.find(def => def.id === item.id || def.name === item.name);
    if (definition) acquiredBaseIds.add(definition.id);
  });
  const candidates = ALL_EQUIPMENT.filter(item => acquiredBaseIds.has(item.id));
  if (!candidates.length) return catchFish(state, spotId);
  const equipment = candidates[Math.floor(Math.random() * candidates.length)];
  const uniqueId = `${equipment.id}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await GameDB.putEquipment({ id: uniqueId, baseId: equipment.id });
  const result = { type: 'equipment', name: equipment.name, image: equipment.image, itemId: uniqueId };
  addRecentBonus(state, result);
  return result;
}

async function catchPet(state, spotId) {
  const discovered = new Set(await GameDB.getGameState('discovered_monsters') || []);
  const candidates = MONSTERS.filter(monster => discovered.has(monster.id));
  if (!candidates.length) return catchFish(state, spotId);
  const monster = candidates[Math.floor(Math.random() * candidates.length)];
  const ranchData = await GameDB.getGameState('ranch_data') || {};
  const dungeonId = dungeonForMonster(monster.id);
  ranchData[dungeonId] = ranchData[dungeonId] || {};
  const alreadyOwned = Boolean(ranchData[dungeonId][monster.id]);
  if (!alreadyOwned) ranchData[dungeonId][monster.id] = { level: 1, fedMaterials: 0 };
  await GameDB.setGameState('ranch_data', ranchData);
  const result = { type: 'pet', name: alreadyOwned ? `${monster.name}（牧場で発見済み）` : `${monster.name}が仲間になった`, image: monster.image, monsterId: monster.id };
  addRecentBonus(state, result);
  return result;
}

async function catchPrismShard(state) {
  state.prismShards += 1;
  let prismGained = 0;
  if (state.prismShards >= 10) {
    prismGained = Math.floor(state.prismShards / 10);
    state.prismShards %= 10;
    const prism = Number(await GameDB.getGameState('prism')) || 0;
    await GameDB.setGameState('prism', prism + prismGained);
  }
  const result = { type: 'prism_shard', name: `Prismの欠片${prismGained ? `（Prism +${prismGained}）` : ''}`, icon: 'diamond', prismGained };
  addRecentBonus(state, result);
  return result;
}

export async function performFishingCatch(spotId = FISHING_SPOTS[0].id) {
  const spot = FISHING_SPOTS.find(item => item.id === spotId);
  if (!spot) throw new Error('釣り場が見つかりません。');
  const state = await loadFishingData();
  const unlockStatus = getFishingSpotUnlockStatus(state, spot.id);
  if (!unlockStatus.unlocked) {
    throw new Error(`${unlockStatus.prerequisiteSpot?.name || '前の釣り堀'}の魚を${unlockStatus.required}種類発見すると解放されます。`);
  }
  const gold = Number(await GameDB.getGameState('gold')) || 0;
  if (gold < spot.baitCost) throw new Error('釣り餌を買うGoldが足りません。');
  await GameDB.setGameState('gold', gold - spot.baitCost);

  const roll = Math.random();
  let result;
  if (roll < 0.00005) result = await catchPrismShard(state);
  else if (roll < 0.00025) result = await catchPet(state, spot.id);
  else if (roll < 0.00105) result = await catchEquipment(state, spot.id);
  else if (roll < 0.00805) result = await catchMonsterMaterial(state, spot.id);
  else if (roll < 0.02805) result = await catchGoldBag(state);
  else result = await catchFish(state, spot.id);
  await saveFishingData(state);
  return { state, result, gold: (Number(await GameDB.getGameState('gold')) || 0) };
}

/**
 * 今回の釣行で釣った魚を倉庫在庫へ移し、釣果表示を空にする。
 * すでに倉庫にある魚や累計釣果は維持する。
 */
export async function settleFishingSession() {
  const state = await loadFishingData();
  let movedCount = 0;
  for (const fish of FISH) {
    const count = normalizeFishCount(state.sessionInventory[fish.id]);
    if (count > 0) {
      state.inventory[fish.id] = normalizeFishCount(state.inventory[fish.id]) + count;
      movedCount += count;
    }
    state.sessionInventory[fish.id] = 0;
  }
  state.recentBonusCatches = [];
  await saveFishingData(state);
  return { state, movedCount };
}

export function getRandomCatchDelay(spotId = FISHING_SPOTS[0].id, rodLevel = 0) {
  const spot = FISHING_SPOTS.find(item => item.id === spotId) || FISHING_SPOTS[0];
  const baseDelay = spot.minCatchMs + Math.random() * (spot.maxCatchMs - spot.minCatchMs + 1);
  const speedMultiplier = Math.max(
    1 - FISHING_ROD_SPEED_PER_LEVEL * FISHING_TACKLE_MAX_LEVEL,
    1 - FISHING_ROD_SPEED_PER_LEVEL * normalizeTackleLevel(rodLevel)
  );
  return Math.floor(baseDelay * speedMultiplier);
}

export function getFishingTackleUpgradeStatus(state, type) {
  const definition = FISHING_TACKLE[type];
  if (!definition) return null;
  const currentLevel = getFishingTackleLevel(state, type);
  const targetLevel = currentLevel + 1;
  const recipe = getFishingTackleRecipe(targetLevel);
  if (!recipe) {
    return {
      type,
      definition,
      currentLevel,
      targetLevel: null,
      recipe: null,
      requirements: [],
      canUpgrade: false,
      maxed: true,
    };
  }

  const requirements = FISHING_TACKLE_RARITIES
    .filter(rarity => Number(recipe.requirements[rarity]) > 0)
    .map(rarity => {
      const owned = FISH
        .filter(fish => fish.spotId === recipe.spotId && fish.rarity === rarity)
        .reduce((sum, fish) => sum + normalizeFishCount(state?.inventory?.[fish.id]), 0);
      const required = Number(recipe.requirements[rarity]) || 0;
      return { rarity, owned, required, enough: owned >= required };
    });

  return {
    type,
    definition,
    currentLevel,
    targetLevel,
    recipe,
    requirements,
    canUpgrade: requirements.every(entry => entry.enough),
    maxed: false,
  };
}

export async function upgradeFishingTackle(type) {
  const state = await loadFishingData();
  const status = getFishingTackleUpgradeStatus(state, type);
  if (!status) throw new Error('強化する釣具が見つかりません。');
  if (status.maxed) throw new Error('この釣具は最大レベルです。');
  const missing = status.requirements.filter(entry => !entry.enough);
  if (missing.length) throw new Error('交換に必要な魚が足りません。');

  const consumed = [];
  for (const requirement of status.requirements) {
    let remaining = requirement.required;
    const candidates = FISH
      .filter(fish => fish.spotId === status.recipe.spotId && fish.rarity === requirement.rarity)
      .sort((a, b) => a.ranchExp - b.ranchExp || a.id.localeCompare(b.id));
    for (const fish of candidates) {
      if (remaining <= 0) break;
      const owned = normalizeFishCount(state.inventory[fish.id]);
      if (!owned) continue;
      const amount = Math.min(owned, remaining);
      state.inventory[fish.id] = owned - amount;
      remaining -= amount;
      consumed.push({ fishId: fish.id, name: fish.name, rarity: fish.rarity, amount });
    }
    if (remaining > 0) throw new Error('魚の納品処理に失敗しました。もう一度お試しください。');
  }

  state.tackle[status.definition.levelKey] = status.targetLevel;
  await saveFishingData(state);
  return {
    state,
    type,
    level: status.targetLevel,
    consumed,
  };
}

export async function convertFishToFeed(fishId, amount = 1, dungeonId) {
  const fish = FISH_MAP.get(fishId);
  if (!fish) throw new Error('魚の指定が不正です。');
  if (!dungeonId) throw new Error('魚餌を与えるダンジョンを選択してください。');
  await settleLegacyFishFeed();
  const [state, ranchData] = await Promise.all([
    loadFishingData(),
    GameDB.getGameState('ranch_data').then(value => value || {}),
  ]);
  const companions = getRanchCompanions(ranchData, dungeonId);
  if (!companions.length) throw new Error('選択中のダンジョンに魚餌を与える仲間がいません。');
  const quantity = Math.max(1, Math.floor(amount));
  if ((state.inventory[fishId] || 0) < quantity) throw new Error('魚が足りません。');

  const expPerCompanion = fish.ranchExp * quantity;
  state.inventory[fishId] -= quantity;
  const levelsGained = applyFeedExpToCompanions(companions, expPerCompanion);
  await Promise.all([
    saveFishingData(state),
    GameDB.setGameState('ranch_data', ranchData),
  ]);
  notifyFeedLevels(levelsGained);
  return {
    state,
    ranchData,
    feedUsed: quantity,
    expPerCompanion,
    companionCount: companions.length,
    levelsGained,
    targetDungeonId: dungeonId,
  };
}

function getRanchCompanions(ranchData, dungeonId = null) {
  const companions = [];
  const dungeonEntries = dungeonId
    ? [[dungeonId, ranchData?.[dungeonId] || {}]]
    : Object.entries(ranchData || {});
  for (const [targetDungeonId, monsters] of dungeonEntries) {
    for (const [monsterId, data] of Object.entries(monsters || {})) {
      companions.push({ dungeonId: targetDungeonId, monsterId, data });
    }
  }
  return companions;
}

function applyFeedExpToCompanions(companions, expPerCompanion) {
  let levelsGained = 0;
  for (const target of companions) {
    const isLegendary = target.monsterId.endsWith('_legendary');
    const before = getRanchLevelInfo(target.data.fedMaterials || 0, isLegendary).level;
    target.data.fedMaterials = (target.data.fedMaterials || 0) + expPerCompanion;
    const after = getRanchLevelInfo(target.data.fedMaterials, isLegendary).level;
    levelsGained += Math.max(0, after - before);
  }
  return levelsGained;
}

function notifyFeedLevels(levelsGained) {
  if (levelsGained > 0) {
    window.dispatchEvent(new CustomEvent('quest:monster-feed-level', { detail: { levelsGained } }));
  }
}

// 旧仕様の加工済み・設置済み魚餌を、時間経過なしで一度だけ即時精算する。
export async function settleLegacyFishFeed() {
  const [fishing, legacyRanchFish, ranchData] = await Promise.all([
    loadFishingData(),
    GameDB.getGameState(LEGACY_RANCH_FISH_STATE_KEY).then(value => value || {}),
    GameDB.getGameState('ranch_data').then(value => value || {}),
  ]);
  const companions = getRanchCompanions(ranchData);
  if (!companions.length) {
    return { consumed: 0, expPerCompanion: 0, levelsGained: 0, ranchData };
  }

  let consumed = 0;
  let expPerCompanion = 0;
  let levelsGained = 0;
  for (const fish of FISH) {
    const quantity = normalizeFishCount(fishing.fishFeed[fish.id])
      + normalizeFishCount(legacyRanchFish.feedStock?.[fish.id])
      + (legacyRanchFish.feedMigrationVersion ? 0 : normalizeFishCount(legacyRanchFish.stock?.[fish.id]));
    if (!quantity) continue;
    consumed += quantity;
    expPerCompanion += fish.ranchExp * quantity;
    fishing.fishFeed[fish.id] = 0;
  }
  if (!consumed) return { consumed: 0, expPerCompanion: 0, levelsGained: 0, ranchData };

  levelsGained = applyFeedExpToCompanions(companions, expPerCompanion);
  await Promise.all([
    saveFishingData(fishing),
    GameDB.setGameState('ranch_data', ranchData),
    GameDB.setGameState(LEGACY_RANCH_FISH_STATE_KEY, {
      instantFeedMigrationVersion: 1,
      migratedCount: consumed,
    }),
  ]);
  notifyFeedLevels(levelsGained);
  return {
    consumed,
    expPerCompanion,
    companionCount: companions.length,
    levelsGained,
    ranchData,
  };
}
