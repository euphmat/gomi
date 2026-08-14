/**
 * プリズムガチャの秘宝定義。
 * 排出率・レベルごとの成長値・表示文言はこのファイルを唯一の正とする。
 */
import { formatNumber } from '../utils/format.js';

export const PRISM_GACHA_COST = 5;
export const TREASURE_STATE_KEY = 'treasure_levels';
export const BASE_MATERIAL_CAPACITY = 99999;

export const TREASURES = [
  { id: 'pocket_watch', name: '懐中時計', effect: 'mineYieldMultiplier', perLevel: 0.1, maxLevel: 10, display: v => `すべての鉱山の採掘量が x${v.toFixed(1)}` },
  { id: 'golden_pickaxe', name: '黄金のつるはし', effect: 'mineGoldPercent', perLevel: 5, maxLevel: 20, display: v => `鉱山から獲得するGoldが +${v}%` },
  { id: 'mine_king_blueprint', name: '鉱山王の設計図', effect: 'mineMaterialDiscountPercent', perLevel: 2, maxLevel: 25, display: v => `鉱山強化に必要な素材が ${v}%減少` },
  { id: 'rainbow_mining_machine', name: '虹色の採掘機', effect: 'mineMachineEffectPercent', perLevel: 5, maxLevel: 20, display: v => `採掘機レベルの効果が +${v}%` },
  { id: 'hero_medal', name: '英雄の勲章', effect: 'battleExpPercent', perLevel: 5, maxLevel: 20, display: v => `戦闘で獲得するEXPが +${v}%` },
  { id: 'master_spellbook', name: '達人の魔導書', effect: 'battleJpPercent', perLevel: 5, maxLevel: 20, display: v => `戦闘で獲得するJPが +${v}%` },
  { id: 'midas_coin', name: 'ミダスの金貨', effect: 'monsterGoldPercent', perLevel: 5, maxLevel: 20, display: v => `モンスターから獲得するGoldが +${v}%` },
  { id: 'four_leaf_clover', name: '四つ葉のクローバー', effect: 'materialDropPercent', perLevel: 1, maxLevel: 10, display: v => `素材のドロップ率が +${v}%` },
  { id: 'hunter_monocle', name: '狩人の片眼鏡', effect: 'equipmentDropMultiplier', perLevel: 0.2, maxLevel: 20, display: v => `装備品のドロップ率が x${v.toFixed(1)}` },
  { id: 'monster_tamer_bell', name: '魔物使いの鈴', effect: 'captureMultiplier', perLevel: 0.2, maxLevel: 20, display: v => `モンスターが仲間になる確率が x${v.toFixed(1)}` },
  { id: 'rainbow_collar', name: '虹色の首輪', effect: 'legendaryCaptureMultiplier', perLevel: 0.5, maxLevel: 10, display: v => `伝説モンスターが仲間になる確率が x${v.toFixed(1)}` },
  { id: 'subjugation_king_crown', name: '討伐王の王冠', effect: 'extraKillCount', perLevel: 1, maxLevel: 10, display: v => `モンスター討伐数が追加で +${v}体` },
  { id: 'monster_tamer_flute', name: '魔物使いの笛', effect: 'petStatsPercent', perLevel: 3, maxLevel: 20, display: v => `ペットの全能力が +${v}%` },
  { id: 'miracle_feed_box', name: '奇跡の飼料箱', effect: 'ranchExpPercent', perLevel: 5, maxLevel: 20, display: v => `牧場の素材育成EXPが +${v}%` },
  { id: 'treasury_key', name: '宝物庫の鍵', effect: 'materialCapacityBonus', perLevel: 5000, maxLevel: 20, display: v => `素材の最大所持数が +${formatNumber(v)}` },
  { id: 'divine_smith_hammer', name: '神匠の金槌', effect: 'craftGoldDiscountPercent', perLevel: 2, maxLevel: 25, display: v => `装備作成に必要なGoldが ${v}%割引` },
  { id: 'alchemist_crucible', name: '錬金術師の坩堝', effect: 'craftMaterialDiscountPercent', perLevel: 2, maxLevel: 25, display: v => `装備作成に必要な素材が ${v}%減少` },
  { id: 'rainbow_piggy_bank', name: '虹の貯金箱', effect: 'prismRefundPercent', perLevel: 2, maxLevel: 10, display: v => `ガチャ時に ${v}%の確率で5 Prism返却` },
  { id: 'clairvoyant_crystal', name: '千里眼の水晶', effect: 'memoryClairvoyancePercent', perLevel: 10, maxLevel: 5, display: v => `神経衰弱でペアを外すと、めくった各カードを${v}%の確率で透視` },
  { id: 'forgetting_hourglass', name: '忘却の砂時計', effect: 'memoryCpuForgetPercent', perLevel: 5, maxLevel: 10, display: v => `神経衰弱のCPU記憶力を${v}%低下` },
  { id: 'resonance_compass', name: '共鳴の羅針盤', effect: 'memoryHintPercent', perLevel: 5, maxLevel: 10, display: v => `神経衰弱で1枚目をめくると${v}%の確率でペアが光る` },
  { id: 'royal_forging_seal', name: '王立鋳造印', effect: 'medalCraftDiscountPercent', perLevel: 2, maxLevel: 10, display: v => `メダル鋳造・強化に必要な素材とGoldが ${v}%減少` },
  { id: 'number_sage_quill', name: '数聖の羽根筆', effect: 'sudokuHintBonus', perLevel: 1, maxLevel: 2, display: v => `数独の開始時ヒントが +${v}回` },
  { id: 'prospector_canary', name: '探鉱師のカナリア', effect: 'minesweeperMineGuardPercent', perLevel: 5, maxLevel: 4, display: v => `マインスイーパーで1プレイに1度、地雷を${v}%の確率で無効化` },
  { id: 'sea_echo_stopwatch', name: '海鳴りのストップウォッチ', effect: 'fishingWaitReductionPercent', perLevel: 1, maxLevel: 10, display: v => `釣りの待ち時間が ${v}%短縮` },
  { id: 'rainbow_float', name: '七色の浮き', effect: 'sameFishBonusPercent', perLevel: 2, maxLevel: 10, display: v => `釣った魚と同じ魚を${v}%の確率でもう1匹獲得` },
  { id: 'beast_tower_plumb', name: '獣塔の下げ振り', effect: 'towerPlacementGuideLevel', perLevel: 1, maxLevel: 3, display: v => `モンスタータワーの配置予測 Lv.${v}` },
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
  const normalizedLevel = Math.min(treasure.maxLevel, Math.max(0, Math.floor(Number(level) || 0)));
  const value = treasure.perLevel * normalizedLevel;
  return ['mineYieldMultiplier', 'equipmentDropMultiplier', 'captureMultiplier', 'legendaryCaptureMultiplier'].includes(treasure.effect)
    ? 1 + value
    : value;
}

export function getTreasureRate(treasure, levels = null) {
  if (!levels) return treasure.weight / TREASURE_TOTAL_WEIGHT;
  const available = TREASURES.filter(item => (levels[item.id] || 0) < item.maxLevel);
  if (!available.includes(treasure)) return 0;
  const availableWeight = available.reduce((sum, item) => sum + item.weight, 0);
  return availableWeight > 0 ? treasure.weight / availableWeight : 0;
}
