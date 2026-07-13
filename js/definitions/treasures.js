/**
 * プリズムガチャの秘宝定義。
 * 排出率・レベルごとの成長値・表示文言はこのファイルを唯一の正とする。
 */
export const PRISM_GACHA_COST = 5;
export const TREASURE_STATE_KEY = 'treasure_levels';
export const BASE_MATERIAL_CAPACITY = 99999;

function displayMultiCatchEffect(progressPercent) {
  const guaranteedCount = 1 + Math.floor(progressPercent / 100);
  const nextCatchChance = progressPercent % 100;
  if (guaranteedCount >= 5) return '1度の釣りで魚を5匹同時取得';
  if (nextCatchChance === 0) return `1度の釣りで魚を${guaranteedCount}匹同時取得（最大5匹）`;
  if (guaranteedCount === 1) return `${nextCatchChance}%の確率で魚を2匹同時取得（最大5匹）`;
  return `魚を${guaranteedCount}匹同時取得し、${nextCatchChance}%の確率で${guaranteedCount + 1}匹目も取得（最大5匹）`;
}

export const TREASURES = [
  { id: 'pocket_watch', name: '懐中時計', effect: 'mineYieldMultiplier', perLevel: 0.1, display: v => `すべての鉱山の採掘量が x${v.toFixed(1)}` },
  { id: 'golden_pickaxe', name: '黄金のつるはし', effect: 'mineGoldPercent', perLevel: 5, display: v => `鉱山から獲得するGoldが +${v}%` },
  { id: 'mine_king_blueprint', name: '鉱山王の設計図', effect: 'mineMaterialDiscountPercent', perLevel: 2, cap: 80, display: v => `鉱山強化に必要な素材が ${v}%減少` },
  { id: 'rainbow_mining_machine', name: '虹色の採掘機', effect: 'mineMachineEffectPercent', perLevel: 5, display: v => `採掘機レベルの効果が +${v}%` },
  { id: 'hero_medal', name: '英雄の勲章', effect: 'battleExpPercent', perLevel: 5, display: v => `戦闘で獲得するEXPが +${v}%` },
  { id: 'master_spellbook', name: '達人の魔導書', effect: 'battleJpPercent', perLevel: 5, display: v => `戦闘で獲得するJPが +${v}%` },
  { id: 'midas_coin', name: 'ミダスの金貨', effect: 'monsterGoldPercent', perLevel: 5, display: v => `モンスターから獲得するGoldが +${v}%` },
  { id: 'four_leaf_clover', name: '四つ葉のクローバー', effect: 'materialDropPercent', perLevel: 1, display: v => `素材のドロップ率が +${v}%` },
  { id: 'hunter_monocle', name: '狩人の片眼鏡', effect: 'equipmentDropMultiplier', perLevel: 0.2, display: v => `装備品のドロップ率が x${v.toFixed(1)}` },
  { id: 'monster_tamer_bell', name: '魔物使いの鈴', effect: 'captureMultiplier', perLevel: 0.2, display: v => `モンスターが仲間になる確率が x${v.toFixed(1)}` },
  { id: 'rainbow_collar', name: '虹色の首輪', effect: 'legendaryCaptureMultiplier', perLevel: 0.5, display: v => `伝説モンスターが仲間になる確率が x${v.toFixed(1)}` },
  { id: 'subjugation_king_crown', name: '討伐王の王冠', effect: 'extraKillCount', perLevel: 1, display: v => `モンスター討伐数が追加で +${v}体` },
  { id: 'monster_tamer_flute', name: '魔物使いの笛', effect: 'petStatsPercent', perLevel: 3, display: v => `ペットの全能力が +${v}%` },
  { id: 'miracle_feed_box', name: '奇跡の飼料箱', effect: 'ranchExpPercent', perLevel: 5, display: v => `牧場の素材育成EXPが +${v}%` },
  { id: 'treasury_key', name: '宝物庫の鍵', effect: 'materialCapacityBonus', perLevel: 5000, display: v => `素材の最大所持数が +${v.toLocaleString('ja-JP')}` },
  { id: 'divine_smith_hammer', name: '神匠の金槌', effect: 'craftGoldDiscountPercent', perLevel: 2, cap: 80, display: v => `装備作成に必要なGoldが ${v}%割引` },
  { id: 'alchemist_crucible', name: '錬金術師の坩堝', effect: 'craftMaterialDiscountPercent', perLevel: 2, cap: 80, display: v => `装備作成に必要な素材が ${v}%減少` },
  { id: 'rainbow_piggy_bank', name: '虹の貯金箱', effect: 'prismRefundPercent', perLevel: 2, cap: 10, display: v => `ガチャ時に ${v}%の確率で5 Prism返却` },
  { id: 'water_god_golden_lure', name: '水神の黄金ルアー', effect: 'fishingDelayReductionMs', perLevel: 500, cap: 2900, display: v => `魚を釣るまでの時間が ${(v / 1000).toFixed(1)}秒短縮（最大2.9秒）` },
  { id: 'thousand_hand_bountiful_hook', name: '千手の大漁針', effect: 'fishingMultiCatchProgressPercent', perLevel: 10, cap: 400, display: displayMultiCatchEffect },
].map(treasure => ({
  ...treasure,
  image: `./assets/treasure/${treasure.id}.webp`,
  weight: 1,
}));

export const TREASURE_MAP = new Map(TREASURES.map(treasure => [treasure.id, treasure]));
export const TREASURE_TOTAL_WEIGHT = TREASURES.reduce((sum, treasure) => sum + treasure.weight, 0);

export function getTreasureValue(treasure, level) {
  if (!treasure || level <= 0) {
    return treasure && ['mineYieldMultiplier', 'equipmentDropMultiplier', 'captureMultiplier', 'legendaryCaptureMultiplier'].includes(treasure.effect) ? 1 : 0;
  }
  const raw = treasure.perLevel * level;
  const value = treasure.cap ? Math.min(treasure.cap, raw) : raw;
  return ['mineYieldMultiplier', 'equipmentDropMultiplier', 'captureMultiplier', 'legendaryCaptureMultiplier'].includes(treasure.effect)
    ? 1 + value
    : value;
}

export function getTreasureRate(treasure) {
  return treasure.weight / TREASURE_TOTAL_WEIGHT;
}
