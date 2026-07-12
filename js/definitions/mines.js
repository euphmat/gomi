/**
 * 鉱山の定義。バランス調整値はこのファイルだけで変更できる。
 * upgradeMaterials は [周期短縮, 産出量, 蓄積上限] の順。
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

export const MINE_MAX_UPGRADE_LEVEL = 9999;
export const MINE_MAX_MATERIAL_COST = 99999;

export const MINES = MINE_ROWS.map(([id, name, upgradeMaterials], index) => ({
  id,
  name,
  image: `./assets/mine/${id}.webp`,
  upgradeMaterials,
  unlockPrism: MINE_UNLOCK_PRISM_COSTS[index],
  // 全速度レベルで1回の強化につき1秒以上短縮できるよう、採掘周期は3時間〜5時間20分にする。
  baseIntervalSeconds: 10800 + index * 600,
  baseGoldPerCycle: 10 * Math.pow(3, index),
  baseCapacityCycles: 12
}));

export const MINE_UPGRADE_TYPES = [
  { id: 'interval', label: '採掘速度', icon: 'speed', description: '獲得までの時間を短縮' },
  { id: 'yield', label: '採掘量', icon: 'paid', description: '1回の獲得Goldを増加' },
  { id: 'capacity', label: '貯蔵庫', icon: 'inventory_2', description: '最大蓄積量を増加' }
];

export function getMineStats(mine, state) {
  const intervalLevel = state.intervalLevel || 1;
  const yieldLevel = state.yieldLevel || 1;
  const capacityLevel = state.capacityLevel || 1;
  const maxLevelSteps = MINE_MAX_UPGRADE_LEVEL - 1;
  const intervalProgress = Math.min(1, Math.max(0, intervalLevel - 1) / maxLevelSteps);
  const yieldProgress = Math.min(1, Math.max(0, yieldLevel - 1) / maxLevelSteps);
  const capacityProgress = Math.min(1, Math.max(0, capacityLevel - 1) / maxLevelSteps);

  // 速度はLv.9999で30秒まで短縮する。最短の鉱山でも1レベルにつき1秒以上短くなる。
  const intervalMs = Math.round((mine.baseIntervalSeconds - (mine.baseIntervalSeconds - 30) * intervalProgress) * 1000);
  const goldPerCycle = Math.floor(mine.baseGoldPerCycle * (1 + yieldProgress * 199)) + (yieldLevel - 1);
  const capacityCycles = mine.baseCapacityCycles + (capacityLevel - 1);
  return { intervalMs, goldPerCycle, capacityCycles, maxStoredGold: goldPerCycle * capacityCycles };
}

export function getMineUpgradeCost(mine, type, currentLevel) {
  const mineIndex = MINES.findIndex(item => item.id === mine.id);
  const typeIndex = MINE_UPGRADE_TYPES.findIndex(item => item.id === type);
  // currentLevelは1〜9998。最終強化時に進捗1となり、素材数が正確に99,999へ到達する。
  const costProgress = Math.min(1, Math.max(0, currentLevel - 1) / (MINE_MAX_UPGRADE_LEVEL - 2));
  const maxUpgradeCount = MINE_MAX_UPGRADE_LEVEL - 1;
  // レベル分の線形成長で毎回の増加を保証し、残りを二次曲線で後半ほど大きくする。
  const materialCurveRange = MINE_MAX_MATERIAL_COST - maxUpgradeCount;
  const initialGold = mine.baseGoldPerCycle * (10 + mineIndex * 5);
  // 最大蓄積量は放置効率への影響が大きいため、貯蔵庫だけGoldコストを大幅に上げる。
  const typeGoldMultiplier = type === 'capacity' ? 25 : 1;
  return {
    materialId: mine.upgradeMaterials[typeIndex],
    materialAmount: currentLevel + Math.round(materialCurveRange * Math.pow(costProgress, 2)),
    gold: Math.floor((initialGold * (1 + 999 * Math.pow(costProgress, 2)) + (currentLevel - 1) * mine.baseGoldPerCycle) * typeGoldMultiplier)
  };
}
