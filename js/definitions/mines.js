import { getTreasureEffect } from '../data/treasure-manager.js';

/**
 * 鉱山の定義。バランス調整値はこのファイルだけで変更できる。
 * upgradeMaterials は [採掘機, 秒間採掘量, 蓄積上限] の順。
 */
const MINE_ROWS = [
  ['copper_mine', '赤銅の坑道', ['mat_copper_ore', 'mat_cuprite', 'mat_native_copper']],
  ['tin_mine', '白錫の採掘場', ['mat_tin_ore', 'mat_cassiterite', 'mat_pure_tin']],
  ['iron_mine', '黒鉄の大鉱床', ['mat_iron_ore', 'mat_magnetite', 'mat_pure_iron']],
  ['coal_mine', '黒金剛炭坑', ['mat_coal_ore', 'mat_anthracite', 'mat_black_diamond']],
  ['silver_mine', '輝銀の坑道', ['mat_silver_ore', 'mat_argentite', 'mat_pure_silver']],
  ['gold_mine', '黄金脈の鉱山', ['mat_gold_ore', 'mat_calaverite', 'mat_pure_gold_nugget']],
  ['quartz_mine', '幻晶石英洞', ['mat_quartz_ore', 'mat_smoky_quartz', 'mat_phantom_quartz']],
  ['jade_mine', '帝翠の石切場', ['mat_jade_ore', 'mat_nephrite', 'mat_imperial_jade']],
  ['cobalt_mine', '蒼晶コバルト坑', ['mat_cobalt_ore', 'mat_cobaltite', 'mat_cobalt_crystal']],
  ['mithril_mine', '真銀ミスリル鉱山', ['mat_mithril_ore', 'mat_mithril_ingot', 'mat_true_mithril']],
  ['orichalcum_mine', '神鋼オリハルコン坑', ['mat_orichalcum_ore', 'mat_orichalcum_ingot', 'mat_orichalcum_core']],
  ['adamantite_mine', '不壊の金剛鉱山', ['mat_adamantite_ore', 'mat_adamantite_plate', 'mat_adamantite_heart']],
  ['uranium_mine', '輝放ウラン鉱区', ['mat_uranium_ore', 'mat_pitchblende', 'mat_radiant_uranium']],
  ['star_metal_mine', '星墜の天鉄鉱山', ['mat_star_metal_ore', 'mat_meteoric_iron', 'mat_cosmic_alloy']],
  ['motherlode_mine', '始原の虹色大鉱脈', ['mat_motherlode_ore', 'mat_rainbow_ore', 'mat_primordial_ore_core']]
];

// Prismは1日1個程度の入手を想定。序盤は軽く、最終鉱山でも50に収める。
const MINE_UNLOCK_PRISM_COSTS = [1, 2, 3, 4, 5, 7, 9, 12, 15, 19, 24, 30, 36, 43, 50];
export const MINE_UNLOCK_MATERIAL_AMOUNT = 30;

export const MINE_MAX_UPGRADE_LEVEL = 9999;
export const MINE_MAX_MATERIAL_COST = 99999;
const MINE_BASE_STORAGE_HOURS = 24;
const MINE_MAX_STORAGE_HOURS = 24 * 7;
// 序盤は秒単位で増加を実感できる360倍。上位鉱山は指数報酬の暴騰を防ぐため段階的に倍率を抑える。
const MINE_INITIAL_REWARD_MULTIPLIER = 360;
const MINE_REWARD_MULTIPLIER_DECAY = 0.8;

export const MINES = MINE_ROWS.map(([id, name, upgradeMaterials], index) => ({
  id,
  name,
  image: `./assets/mine/${id}.webp`,
  upgradeMaterials,
  unlockMaterials: upgradeMaterials.map(materialId => ({ materialId, amount: MINE_UNLOCK_MATERIAL_AMOUNT })),
  unlockPrism: MINE_UNLOCK_PRISM_COSTS[index],
  // 赤銅鉱山は1 G/秒、以降は約2.4倍ずつ成長。最終鉱山も旧報酬の約16倍になる。
  baseGoldPerSecond: 30 * Math.pow(3, index) / (10800 + index * 600)
    * MINE_INITIAL_REWARD_MULTIPLIER * Math.pow(MINE_REWARD_MULTIPLIER_DECAY, index),
  upgradeGoldBase: 10 * Math.pow(3, index),
}));

export const MINE_UPGRADE_TYPES = [
  { id: 'machine', label: '採掘機', icon: 'precision_manufacturing', description: '採掘量にかかる稼働効率を上昇' },
  { id: 'yield', label: '採掘量', icon: 'paid', description: '1秒あたりの基礎採掘量を増加' },
  { id: 'capacity', label: '貯蔵庫', icon: 'inventory_2', description: 'Goldを貯められる時間を延長' }
];

export function getMineStats(mine, state) {
  const machineLevel = state.machineLevel || 1;
  const yieldLevel = state.yieldLevel || 1;
  const capacityLevel = state.capacityLevel || 1;
  const maxLevelSteps = MINE_MAX_UPGRADE_LEVEL - 1;
  const machineProgress = Math.min(1, Math.max(0, machineLevel - 1) / maxLevelSteps);
  const yieldProgress = Math.min(1, Math.max(0, yieldLevel - 1) / maxLevelSteps);
  const capacityProgress = Math.min(1, Math.max(0, capacityLevel - 1) / maxLevelSteps);

  // 初期値は旧仕様と同じ時間あたり収益。採掘量100倍 × 採掘機効率10倍で最大1,000倍に抑える。
  const treasureYieldMultiplier = getTreasureEffect('mineYieldMultiplier');
  const machineTreasureMultiplier = 1 + getTreasureEffect('mineMachineEffectPercent') / 100;
  const baseGoldPerSecond = mine.baseGoldPerSecond * (1 + yieldProgress * 99) * treasureYieldMultiplier;
  // 秘宝は採掘機レベルによる増加分だけを強化し、Lv.1の基礎効率は変えない。
  const machineEfficiency = 1 + machineProgress * 9 * machineTreasureMultiplier;
  const goldPerSecond = baseGoldPerSecond * machineEfficiency;
  const storageHours = MINE_BASE_STORAGE_HOURS + (MINE_MAX_STORAGE_HOURS - MINE_BASE_STORAGE_HOURS) * capacityProgress;
  const maxStoredGold = goldPerSecond * storageHours * 60 * 60;
  return { baseGoldPerSecond, machineEfficiency, goldPerSecond, storageHours, maxStoredGold };
}

export function getMineUpgradeCost(mine, type, currentLevel) {
  const mineIndex = MINES.findIndex(item => item.id === mine.id);
  const typeIndex = MINE_UPGRADE_TYPES.findIndex(item => item.id === type);
  // currentLevelは1〜9998。最終強化時に進捗1となり、素材数が正確に99,999へ到達する。
  const costProgress = Math.min(1, Math.max(0, currentLevel - 1) / (MINE_MAX_UPGRADE_LEVEL - 2));
  const maxUpgradeCount = MINE_MAX_UPGRADE_LEVEL - 1;
  // レベル分の線形成長で毎回の増加を保証し、残りを二次曲線で後半ほど大きくする。
  const materialCurveRange = MINE_MAX_MATERIAL_COST - maxUpgradeCount;
  const initialGold = mine.upgradeGoldBase * (10 + mineIndex * 5);
  // 最大蓄積量は放置効率への影響が大きいため、貯蔵庫だけGoldコストを大幅に上げる。
  const typeGoldMultiplier = type === 'capacity' ? 25 : 1;
  const materialDiscount = getTreasureEffect('mineMaterialDiscountPercent') / 100;
  return {
    materialId: mine.upgradeMaterials[typeIndex],
    materialAmount: Math.max(1, Math.ceil((currentLevel + Math.round(materialCurveRange * Math.pow(costProgress, 2))) * (1 - materialDiscount))),
    gold: Math.floor((initialGold * (1 + 999 * Math.pow(costProgress, 2)) + (currentLevel - 1) * mine.upgradeGoldBase) * typeGoldMultiplier)
  };
}
