import { GameDB } from './database.js';
import { DUNGEONS } from '../definitions/dungeons.js';
import { SPECIAL_DUNGEONS } from '../definitions/special_dungeons.js';
import { MONSTERS } from '../definitions/monsters.js';
import { WEAPONS } from '../definitions/weapons.js';
import { ARMORS } from '../definitions/armors.js';
import { SHIELDS } from '../definitions/shields.js';
import { ACCESSORIES } from '../definitions/accessories.js';
import { MATERIALS } from '../definitions/materials.js';
import { FISH } from '../definitions/fish.js';
import { MINES } from '../definitions/mines.js';
import {
  FISHING_TACKLE_MAX_LEVEL,
  FISHING_TACKLE_MIN_LEVEL,
  FISHING_TACKLE_ORDER,
} from '../definitions/fishing-tackle.js';
import { MEDAL_RANKS } from '../definitions/medal-definitions.js';
import { TREASURES, TREASURE_STATE_KEY } from '../definitions/treasures.js';
import { JOBS } from '../jobs/index.js';
import { getRanchLevelInfo } from './stat-calculator.js';
import { getMemoryLevel, MEMORY_PROGRESS_STATE_KEY } from './memory-game-progression.js';
import { formatNumber } from '../utils/format.js';

const STATE_KEY = 'quest_special_progress';
const COMPLETED_DUNGEONS_KEY = 'completed_dungeons';
const JOB_CHANGE_HISTORY_KEY = 'job_change_history';
const ALL_DUNGEONS = [...DUNGEONS, ...SPECIAL_DUNGEONS];
const ALL_ITEMS = [...WEAPONS, ...ARMORS, ...SHIELDS, ...ACCESSORIES, ...MATERIALS];

const MONSTER_LIBRARY_TARGETS = [10, 20, 30, 50, 75, 100, 125, 150, 176];
const FISH_LIBRARY_TARGETS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
const ITEM_LIBRARY_TARGETS = [25, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1286];
const MEDAL_TARGETS = [1, 5, 10, 20, 30, 50, 75, 100, 125, 150, 176];

const TOTAL_KILL_TARGETS = [100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000];
const TOTAL_CATCH_TARGETS = [10, 100, 1000, 10000, 100000, 1000000];
const CLEARED_FLOOR_TARGETS = [10, 25, 50, 75, 100, 125, 150, 174];
const UNLOCKED_MINE_TARGETS = [3, 5, 8, 10, 15];
const MINE_UPGRADE_TARGETS = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
const COMPANION_TARGETS = [1, 5, 10, 25, 50, 100, 150];
const LEGENDARY_COMPANION_TARGETS = [1, 3, 5, 10, 25, 50];
const COMPANION_LEVEL_TARGETS = [5, 10, 25, 50, 100, 250, 500, 1000];
const JOB_LEVEL_TARGETS = [10, 25, 50, 100, 250, 500, 1000];
const CHANGED_JOB_TARGETS = [3, 5, 10, 15, 20, 25];
const TACKLE_UPGRADE_TARGETS = [3, 6, 12, 21, 30, 42];
const MEMORY_GAME_TARGETS = [1, 10, 50, 100, 500, 1000];
const MEMORY_WIN_TARGETS = [1, 10, 50, 100, 500];
const MEMORY_LEVEL_TARGETS = [5, 10, 20, 30];
const TREASURE_KIND_TARGETS = [1, 5, 10, 15, 21];
const TREASURE_LEVEL_TARGETS = [10, 25, 50, 100, 250, 500, 1000];

const makeMilestoneQuests = (type, targets, options) => targets.map((target, index) => ({
  id: `${type}_${target}`,
  category: type,
  metricKey: type,
  target,
  reward: 1,
  prerequisiteId: index > 0 ? `${type}_${targets[index - 1]}` : null,
  ...options,
  get title() { return `${options.titlePrefix} ${formatNumber(target)}種類達成`; },
  get description() { return `${options.descriptionPrefix}${formatNumber(target)}種類集める`; },
}));

const makeMetricMilestoneQuests = (idPrefix, metricKey, targets, options) => targets.map((target, index) => {
  return {
    id: `${idPrefix}_${target}`,
    category: options.category,
    metricKey,
    target,
    reward: options.reward || 1,
    prerequisiteId: index > 0 ? `${idPrefix}_${targets[index - 1]}` : null,
    get title() { return `${options.titlePrefix}${formatNumber(target)}${options.titleSuffix || ''}`; },
    get description() { return `${options.descriptionPrefix}${formatNumber(target)}${options.descriptionSuffix}`; },
    icon: options.icon,
    destination: options.destination,
  };
});

const metricQuestOptions = (category, titlePrefix, titleSuffix, descriptionPrefix, descriptionSuffix, icon, path, label) => ({
  category,
  titlePrefix,
  titleSuffix,
  descriptionPrefix,
  descriptionSuffix,
  icon,
  destination: { path, label },
});

export const SPECIAL_QUESTS = [
  {
    id: 'mineFirstUnlock',
    category: 'mine',
    title: '鉱山を初めて解放する',
    description: 'いずれかの鉱山をPrismで解放する',
    icon: 'landscape',
    reward: 1,
    target: 1,
    destination: { path: '/guild?tab=mine', label: '鉱山へ' },
  },
  ...Object.values(JOBS).map(job => ({
    id: `job_first_change_${job.id}`,
    category: 'job',
    jobId: job.id,
    title: `${job.name}へ初転職`,
    description: `${job.name}へ初めて転職する`,
    icon: 'badge',
    reward: 1,
    target: 1,
    destination: { path: '/guild?tab=job', label: '神殿へ' },
  })),
  ...DUNGEONS.map((dungeon, index) => ({
    id: `dungeon_${dungeon.id}`,
    category: 'dungeon',
    dungeonId: dungeon.id,
    prerequisiteId: index > 0 ? `dungeon_${DUNGEONS[index - 1].id}` : null,
    title: `${dungeon.name}を踏破`,
    description: `${dungeon.floors.length}Fの最深部を突破する`,
    icon: dungeon.theme?.icon || 'swords',
    reward: 1,
    target: 1,
    destination: { path: '/dungeon?tab=normal', label: 'ダンジョンへ' },
  })),
  // Special dungeons use independent unlock conditions, so they do not block
  // each other or the main-dungeon progression chain.
  ...SPECIAL_DUNGEONS.map(dungeon => ({
    id: `dungeon_${dungeon.id}`,
    category: 'dungeon',
    dungeonId: dungeon.id,
    prerequisiteId: null,
    title: `${dungeon.name}を踏破`,
    description: `${dungeon.floors.length}Fの最深部を突破する`,
    icon: dungeon.theme?.icon || 'swords',
    reward: 1,
    target: 1,
    destination: { path: '/dungeon?tab=special', label: 'スペシャルへ' },
  })),
  ...makeMilestoneQuests('monster', MONSTER_LIBRARY_TARGETS, {
    titlePrefix: 'モンスター図鑑',
    descriptionPrefix: 'モンスター図鑑に',
    icon: 'pets',
    destination: { path: '/quest?tab=monster_lib', label: '図鑑へ' },
  }),
  ...makeMilestoneQuests('fish', FISH_LIBRARY_TARGETS, {
    titlePrefix: '魚図鑑',
    descriptionPrefix: '魚図鑑に',
    icon: 'phishing',
    destination: { path: '/quest?tab=fish_lib', label: '魚図鑑へ' },
  }),
  ...makeMilestoneQuests('item', ITEM_LIBRARY_TARGETS, {
    titlePrefix: 'アイテム図鑑',
    descriptionPrefix: 'アイテム図鑑に',
    icon: 'auto_stories',
    destination: { path: '/quest?tab=item_lib', label: '図鑑へ' },
  }),
  ...makeMilestoneQuests('medal', MEDAL_TARGETS, {
    titlePrefix: 'メダル',
    descriptionPrefix: '異なるモンスターのメダルを',
    icon: 'military_tech',
    destination: { path: '/shop?tab=medal', label: 'メダル鋳造へ' },
  }),
  ...makeMetricMilestoneQuests('total_kills', 'totalKills', TOTAL_KILL_TARGETS,
    metricQuestOptions('battle', '累計討伐 ', '体', 'モンスターの討伐記録を合計', '体にする', 'swords', '/dungeon?tab=normal', 'ダンジョンへ')),
  ...makeMetricMilestoneQuests('cleared_floors', 'clearedFloors', CLEARED_FLOOR_TARGETS,
    metricQuestOptions('battle', 'フロア攻略 ', '階', '異なるダンジョンフロアを', '階クリアする', 'stairs', '/dungeon?tab=normal', 'ダンジョンへ')),
  ...makeMetricMilestoneQuests('total_catches', 'totalCaught', TOTAL_CATCH_TARGETS,
    metricQuestOptions('fish', '累計釣果 ', '匹', '魚を累計', '匹釣り上げる', 'set_meal', '/fishing', '釣り場へ')),
  ...makeMetricMilestoneQuests('unlocked_mines', 'unlockedMines', UNLOCKED_MINE_TARGETS,
    metricQuestOptions('mine', '鉱山解放 ', 'か所', '異なる鉱山を', 'か所解放する', 'landscape', '/guild?tab=mine', '鉱山へ')),
  ...makeMetricMilestoneQuests('mine_upgrades', 'mineUpgrades', MINE_UPGRADE_TARGETS,
    metricQuestOptions('mine', '鉱山強化 ', '回', '全鉱山の強化回数を合計', '回にする', 'precision_manufacturing', '/guild?tab=mine', '鉱山へ')),
  ...makeMetricMilestoneQuests('companions', 'companions', COMPANION_TARGETS,
    metricQuestOptions('ranch', '牧場の仲間 ', '体', '牧場に仲間を', '体迎える', 'pets', '/guild?tab=ranch', '牧場へ')),
  ...makeMetricMilestoneQuests('legendary_companions', 'legendaryCompanions', LEGENDARY_COMPANION_TARGETS,
    metricQuestOptions('ranch', '伝説の仲間 ', '体', '伝説モンスターを', '体仲間にする', 'hotel_class', '/guild?tab=ranch', '牧場へ')),
  ...makeMetricMilestoneQuests('companion_level', 'companionLevel', COMPANION_LEVEL_TARGETS,
    metricQuestOptions('ranch', '仲間育成 Lv.', '', 'いずれかの仲間をLv.', 'まで育てる', 'trending_up', '/guild?tab=ranch', '牧場へ')),
  ...makeMetricMilestoneQuests('job_level', 'jobLevel', JOB_LEVEL_TARGETS,
    metricQuestOptions('growth', 'ジョブ熟練 Lv.', '', 'いずれかのキャラクターのジョブをLv.', 'まで育てる', 'school', '/status', 'ステータスへ')),
  ...makeMetricMilestoneQuests('changed_jobs', 'changedJobs', CHANGED_JOB_TARGETS,
    metricQuestOptions('job', '転職経験 ', '職', '異なるジョブへ', '職転職する', 'badge', '/guild?tab=job', '神殿へ')),
  ...makeMetricMilestoneQuests('tackle_upgrades', 'tackleUpgrades', TACKLE_UPGRADE_TARGETS,
    metricQuestOptions('fish', '釣具強化 ', '段階', '釣竿・エサ・ルアーを合計', '段階強化する', 'construction', '/fishing', '釣り場へ')),
  ...makeMetricMilestoneQuests('memory_games', 'memoryGames', MEMORY_GAME_TARGETS,
    metricQuestOptions('memory', '神経衰弱プレイ ', '回', '神経衰弱を', '回プレイする', 'neurology', '/memory-game', '神経衰弱へ')),
  ...makeMetricMilestoneQuests('memory_wins', 'memoryWins', MEMORY_WIN_TARGETS,
    metricQuestOptions('memory', '神経衰弱勝利 ', '回', '神経衰弱で', '回勝利する', 'emoji_events', '/memory-game', '神経衰弱へ')),
  ...makeMetricMilestoneQuests('memory_level', 'memoryLevel', MEMORY_LEVEL_TARGETS,
    metricQuestOptions('memory', '神経衰弱 Lv.', '', '神経衰弱レベルをLv.', 'まで上げる', 'psychology', '/memory-game', '神経衰弱へ')),
  ...makeMetricMilestoneQuests('treasure_kinds', 'treasureKinds', TREASURE_KIND_TARGETS,
    metricQuestOptions('treasure', '秘宝収集 ', '種類', '異なる秘宝を', '種類獲得する', 'deployed_code', '/shop?tab=gacha', 'ガチャへ')),
  ...makeMetricMilestoneQuests('treasure_levels', 'treasureLevels', TREASURE_LEVEL_TARGETS,
    metricQuestOptions('treasure', '秘宝合計 Lv.', '', '全秘宝のレベル合計を', 'にする', 'auto_awesome', '/shop?tab=gacha', 'ガチャへ')),
  ...MEDAL_RANKS.slice(1).flatMap((rank, rankOffset) => {
    const rankIndex = rankOffset + 1;
    const rankName = rank.name.replace('メダル', '');
    return makeMetricMilestoneQuests(`medal_rank_${rank.id}`, `medalRank${rankIndex}`, [1, 10, 50, 100, 176],
      metricQuestOptions('medal', `${rankName}以上 `, '種類', `${rank.name}以上を`, '種類鋳造する', 'workspace_premium', '/shop?tab=medal', 'メダル鋳造へ'));
  }),
];

const DEFAULT_PROGRESS = Object.fromEntries(
  SPECIAL_QUESTS.map(quest => [quest.id, { completed: false, claimed: false }])
);

function getBaseId(item) {
  if (item?.baseId) return item.baseId;
  const id = String(item?.id || '');
  const lastUnderscore = id.lastIndexOf('_');
  if (lastUnderscore > 0) {
    const suffix = id.substring(lastUnderscore + 1);
    if (suffix.length >= 4 && /^[a-z0-9]+$/.test(suffix) && suffix !== 'ring') {
      return id.substring(0, lastUnderscore);
    }
  }
  return id;
}

function getFinalFloorMonsterIds(dungeon) {
  const floor = dungeon.floors[dungeon.floors.length - 1];
  const ids = new Set();
  for (const encounter of floor?.monsters || []) {
    for (const key of Object.keys(encounter)) {
      if (key !== 'weight') ids.add(key);
    }
  }
  return [...ids];
}

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function savedFloorLevels(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return Object.entries(value).filter(([, cleared]) => Boolean(cleared)).map(([level]) => level);
  }
  return [];
}

export function calculateExtendedSpecialQuestMetrics({
  monsterKills = {},
  playerMedals = {},
  fishingData = {},
  mineData = {},
  completedDungeons = new Set(),
  completedDungeonFloors = {},
  ranchData = {},
  characters = [],
  memoryProgress = {},
  treasureLevels = {},
} = {}) {
  const validMonsterIds = new Set(MONSTERS.map(monster => monster.id));
  const totalKills = Object.entries(monsterKills || {}).reduce(
    (total, [monsterId, count]) => total + (validMonsterIds.has(monsterId) ? nonNegativeInteger(count) : 0),
    0
  );

  const completedDungeonIds = completedDungeons instanceof Set
    ? completedDungeons
    : new Set(Array.isArray(completedDungeons) ? completedDungeons : []);
  const clearedFloorKeys = new Set();
  for (const dungeon of ALL_DUNGEONS) {
    const validLevels = new Set((dungeon.floors || []).map(floor => Number(floor.level)));
    const levels = completedDungeonIds.has(dungeon.id)
      ? validLevels
      : new Set(savedFloorLevels(completedDungeonFloors?.[dungeon.id]).map(Number));
    for (const level of levels) {
      if (validLevels.has(level)) clearedFloorKeys.add(`${dungeon.id}:${level}`);
    }
  }

  const mineStates = MINES.map(mine => mineData?.[mine.id] || {});
  const unlockedMines = mineStates.filter(state => Boolean(state.unlocked)).length;
  const mineUpgrades = mineStates.reduce((total, state) => total
    + Math.max(0, nonNegativeInteger(state.machineLevel || 1) - 1)
    + Math.max(0, nonNegativeInteger(state.yieldLevel || 1) - 1)
    + Math.max(0, nonNegativeInteger(state.capacityLevel || 1) - 1), 0);

  const companionEntries = Object.values(ranchData || {}).flatMap(monsters => Object.entries(monsters || {}));
  const legendaryCompanions = companionEntries.filter(([monsterId]) => monsterId.endsWith('_legendary')).length;
  const companionLevel = companionEntries.reduce((highest, [monsterId, data]) => Math.max(
    highest,
    getRanchLevelInfo(data?.fedMaterials || 0, monsterId.endsWith('_legendary')).level
  ), 0);

  const jobLevel = (characters || []).reduce((highest, character) => {
    const savedLevels = Object.values(character?.jobLevels || {}).map(saved => nonNegativeInteger(saved?.level));
    return Math.max(highest, nonNegativeInteger(character?.jobLevel), ...savedLevels);
  }, 0);

  const tackleUpgrades = FISHING_TACKLE_ORDER.reduce((total, type) => {
    const levelKey = `${type}Level`;
    const level = Math.max(
      FISHING_TACKLE_MIN_LEVEL,
      Math.min(FISHING_TACKLE_MAX_LEVEL, nonNegativeInteger(fishingData?.tackle?.[levelKey]) || FISHING_TACKLE_MIN_LEVEL)
    );
    return total + level - FISHING_TACKLE_MIN_LEVEL;
  }, 0);

  const validTreasureIds = new Set(TREASURES.map(treasure => treasure.id));
  const normalizedTreasureLevels = Object.entries(treasureLevels || {})
    .filter(([id]) => validTreasureIds.has(id))
    .map(([, level]) => nonNegativeInteger(level));

  const metrics = {
    totalKills,
    totalCaught: nonNegativeInteger(fishingData?.totalCaught),
    clearedFloors: clearedFloorKeys.size,
    unlockedMines,
    mineUpgrades,
    companions: companionEntries.length,
    legendaryCompanions,
    companionLevel,
    jobLevel,
    tackleUpgrades,
    memoryGames: nonNegativeInteger(memoryProgress?.gamesPlayed),
    memoryWins: nonNegativeInteger(memoryProgress?.wins),
    memoryLevel: getMemoryLevel(memoryProgress?.xp),
    treasureKinds: normalizedTreasureLevels.filter(level => level > 0).length,
    treasureLevels: normalizedTreasureLevels.reduce((total, level) => total + level, 0),
  };
  MEDAL_RANKS.slice(1).forEach((_, rankOffset) => {
    const rankIndex = rankOffset + 1;
    metrics[`medalRank${rankIndex}`] = Object.entries(playerMedals || {}).filter(
      ([monsterId, medalRank]) => validMonsterIds.has(monsterId) && nonNegativeInteger(medalRank) >= rankIndex
    ).length;
  });
  return metrics;
}

class SpecialQuestManagerClass {
  constructor() {
    this.progress = structuredClone(DEFAULT_PROGRESS);
    this.metrics = {
      monster: 0,
      fish: 0,
      item: 0,
      medal: 0,
      completedDungeons: new Set(),
      changedJobs: 0,
      changedJobIds: new Set(),
    };
    this.listenersReady = false;
    this.claimQueue = Promise.resolve();
  }

  async init() {
    const saved = await GameDB.getGameState(STATE_KEY) || {};
    this.progress = structuredClone(DEFAULT_PROGRESS);
    for (const quest of SPECIAL_QUESTS) {
      this.progress[quest.id] = {
        ...DEFAULT_PROGRESS[quest.id],
        ...(saved[quest.id] || {}),
      };
    }

    // Older saves used the same key for this first quest, so its claimed state
    // is retained by the generic migration above.
    await this.refreshAchievements();

    if (!this.listenersReady) {
      window.addEventListener('quest:mine-unlock', () => this.completeMineFirstUnlock());
      this.listenersReady = true;
    }
  }

  async refreshAchievements() {
    const [
      mineData,
      completedDungeonsValue,
      unlockedDungeonsValue,
      monsterKillsValue,
      discoveredMonstersValue,
      playerMedalsValue,
      fishingDataValue,
      discoveredItemsValue,
      equipment,
      inventory,
      jobChangeHistoryValue,
      characters,
      completedDungeonFloorsValue,
      ranchDataValue,
      memoryProgressValue,
      treasureLevelsValue,
    ] = await Promise.all([
      GameDB.getGameState('mine_data'),
      GameDB.getGameState(COMPLETED_DUNGEONS_KEY),
      GameDB.getGameState('unlockedDungeons'),
      GameDB.getGameState('monster_kills'),
      GameDB.getGameState('discovered_monsters'),
      GameDB.getGameState('player_medals'),
      GameDB.getGameState('fishing_data'),
      GameDB.getGameState('discovered_items'),
      GameDB.getAllEquipment(),
      GameDB.getAllInventory(),
      GameDB.getGameState(JOB_CHANGE_HISTORY_KEY),
      GameDB.getAllCharacters(),
      GameDB.getGameState('completed_dungeon_floors'),
      GameDB.getGameState('ranch_data'),
      GameDB.getGameState(MEMORY_PROGRESS_STATE_KEY),
      GameDB.getGameState(TREASURE_STATE_KEY),
    ]);

    const completedDungeons = new Set(Array.isArray(completedDungeonsValue) ? completedDungeonsValue : []);
    const unlockedDungeons = new Set(Array.isArray(unlockedDungeonsValue) ? unlockedDungeonsValue : ['slime_forest']);
    const monsterKills = monsterKillsValue || {};

    // Before completed_dungeons existed, clearing a normal dungeon unlocked the
    // next one. The final-floor defeat record covers the last normal dungeon and
    // special dungeons, which have no next-unlock marker.
    DUNGEONS.forEach((dungeon, index) => {
      const nextDungeon = DUNGEONS[index + 1];
      if (nextDungeon && unlockedDungeons.has(nextDungeon.id)) completedDungeons.add(dungeon.id);
    });
    for (const dungeon of ALL_DUNGEONS) {
      if (dungeon.id === 'golden_slime_island') continue;
      const finalMonsterIds = getFinalFloorMonsterIds(dungeon);
      const defeatedFinalEncounter = finalMonsterIds.length > 0 && finalMonsterIds.every(id => Number(monsterKills[id]) > 0);
      if (defeatedFinalEncounter) {
        completedDungeons.add(dungeon.id);
      }
    }
    // The same monster appears on floors 11-15 of this legacy dungeon. A full
    // first clear defeats 1+2+3+4+5 of them, so 15 is its reliable old-save mark.
    if (Number(monsterKills.slime_gold_kaiser) >= 15) completedDungeons.add('golden_slime_island');

    const monsterIds = new Set(MONSTERS.map(monster => monster.id));
    const discoveredMonsters = new Set(
      (Array.isArray(discoveredMonstersValue) ? discoveredMonstersValue : []).filter(id => monsterIds.has(id))
    );
    const medalCount = Object.keys(playerMedalsValue || {}).filter(id => monsterIds.has(id)).length;

    const discoveredFish = fishingDataValue?.discovered || {};
    const fishCount = FISH.filter(fish => {
      const value = discoveredFish[fish.id];
      return value && typeof value === 'object' ? Object.values(value).some(Boolean) : Boolean(value);
    }).length;

    const itemIds = new Set(ALL_ITEMS.map(item => item.id));
    const acquiredItemIds = new Set(
      (Array.isArray(discoveredItemsValue) ? discoveredItemsValue : []).filter(id => itemIds.has(id))
    );
    for (const item of equipment || []) {
      const id = getBaseId(item);
      if (itemIds.has(id)) acquiredItemIds.add(id);
    }
    for (const item of inventory || []) {
      if (itemIds.has(item.id)) acquiredItemIds.add(item.id);
    }
    const storedDiscoveredItems = Array.isArray(discoveredItemsValue) ? discoveredItemsValue : [];
    const normalizedDiscoveredItems = [...new Set([...storedDiscoveredItems, ...acquiredItemIds])];
    const discoveredItemsChanged = JSON.stringify([...storedDiscoveredItems].sort()) !== JSON.stringify([...normalizedDiscoveredItems].sort());
    if (discoveredItemsChanged) await GameDB.setGameState('discovered_items', normalizedDiscoveredItems);

    const validJobIds = new Set(Object.keys(JOBS));
    const changedJobs = new Set(
      (Array.isArray(jobChangeHistoryValue) ? jobChangeHistoryValue : []).filter(id => validJobIds.has(id))
    );
    for (const character of characters || []) {
      const jobLevels = character?.jobLevels && typeof character.jobLevels === 'object'
        ? Object.keys(character.jobLevels)
        : [];
      const unlockedJobs = Array.isArray(character?.unlockedJobs) ? character.unlockedJobs : [];

      // A non-Novice unlocked job is only added when a character actually
      // changes into it. jobLevels proves a character previously used that job.
      for (const jobId of [...unlockedJobs, ...jobLevels]) {
        if (jobId !== 'norvice' && validJobIds.has(jobId)) changedJobs.add(jobId);
      }
      if (character?.jobId !== 'norvice' && validJobIds.has(character?.jobId)) {
        changedJobs.add(character.jobId);
      }
      // Novice is the initial job, so count it only when another job has been
      // used and the character has subsequently changed back to Novice.
      if (character?.jobId === 'norvice' && jobLevels.some(jobId => jobId !== 'norvice' && validJobIds.has(jobId))) {
        changedJobs.add('norvice');
      }
    }
    const normalizedChangedJobs = [...changedJobs];
    const storedChangedJobs = Array.isArray(jobChangeHistoryValue) ? jobChangeHistoryValue : [];
    const jobHistoryChanged = JSON.stringify([...storedChangedJobs].sort()) !== JSON.stringify([...normalizedChangedJobs].sort());
    if (jobHistoryChanged) await GameDB.setGameState(JOB_CHANGE_HISTORY_KEY, normalizedChangedJobs);

    const extendedMetrics = calculateExtendedSpecialQuestMetrics({
      monsterKills,
      playerMedals: playerMedalsValue,
      fishingData: fishingDataValue,
      mineData,
      completedDungeons,
      completedDungeonFloors: completedDungeonFloorsValue,
      ranchData: ranchDataValue,
      characters,
      memoryProgress: memoryProgressValue,
      treasureLevels: treasureLevelsValue,
    });

    this.metrics = {
      monster: discoveredMonsters.size,
      fish: fishCount,
      item: acquiredItemIds.size,
      medal: medalCount,
      completedDungeons,
      changedJobs: changedJobs.size,
      changedJobIds: changedJobs,
      ...extendedMetrics,
    };

    let changed = false;
    if (Object.values(mineData || {}).some(mine => mine?.unlocked)) {
      changed = this.markCompleted('mineFirstUnlock') || changed;
    }
    for (const quest of SPECIAL_QUESTS) {
      if (quest.category === 'dungeon' && completedDungeons.has(quest.dungeonId)) {
        changed = this.markCompleted(quest.id) || changed;
      } else if (quest.category === 'job' && quest.jobId && changedJobs.has(quest.jobId)) {
        changed = this.markCompleted(quest.id) || changed;
      } else if (quest.metricKey && (this.metrics[quest.metricKey] || 0) >= quest.target) {
        changed = this.markCompleted(quest.id) || changed;
      }
    }

    const normalizedCompleted = [...completedDungeons].filter(id => ALL_DUNGEONS.some(dungeon => dungeon.id === id));
    const storedCompleted = Array.isArray(completedDungeonsValue) ? completedDungeonsValue : [];
    const dungeonHistoryChanged = JSON.stringify([...storedCompleted].sort()) !== JSON.stringify([...normalizedCompleted].sort());
    if (dungeonHistoryChanged) await GameDB.setGameState(COMPLETED_DUNGEONS_KEY, normalizedCompleted);
    if (changed) {
      await this.save();
      window.dispatchEvent(new CustomEvent('quest:special-updated'));
    }
    return changed || dungeonHistoryChanged || discoveredItemsChanged || jobHistoryChanged;
  }

  markCompleted(questId) {
    const quest = this.progress[questId];
    if (!quest || quest.completed) return false;
    quest.completed = true;
    return true;
  }

  async completeMineFirstUnlock() {
    if (!this.markCompleted('mineFirstUnlock')) return;
    await this.save();
    window.dispatchEvent(new CustomEvent('quest:special-updated'));
  }

  async completeFirstJobChange(jobId) {
    if (!JOBS[jobId]) return false;

    const storedHistory = await GameDB.getGameState(JOB_CHANGE_HISTORY_KEY);
    const changedJobs = new Set([
      ...(Array.isArray(storedHistory) ? storedHistory : []),
      ...this.metrics.changedJobIds,
    ].filter(id => JOBS[id]));
    const historyChanged = !changedJobs.has(jobId);
    changedJobs.add(jobId);
    this.metrics.changedJobIds = changedJobs;
    this.metrics.changedJobs = changedJobs.size;

    if (historyChanged) await GameDB.setGameState(JOB_CHANGE_HISTORY_KEY, [...changedJobs]);
    const questChanged = this.markCompleted(`job_first_change_${jobId}`);
    if (questChanged) await this.save();
    if (historyChanged || questChanged) window.dispatchEvent(new CustomEvent('quest:special-updated'));
    return historyChanged || questChanged;
  }

  async completeDungeon(dungeonId) {
    if (!ALL_DUNGEONS.some(dungeon => dungeon.id === dungeonId)) return false;
    const completed = new Set(await GameDB.getGameState(COMPLETED_DUNGEONS_KEY) || []);
    const historyChanged = !completed.has(dungeonId);
    if (historyChanged) {
      completed.add(dungeonId);
      await GameDB.setGameState(COMPLETED_DUNGEONS_KEY, [...completed]);
    }
    this.metrics.completedDungeons.add(dungeonId);
    const questChanged = this.markCompleted(`dungeon_${dungeonId}`);
    if (questChanged) await this.save();
    if (historyChanged || questChanged) window.dispatchEvent(new CustomEvent('quest:special-updated'));
    return historyChanged || questChanged;
  }

  getQuests(category = 'all') {
    return SPECIAL_QUESTS.filter(quest => {
      const state = this.getState(quest.id);
      const matchesCategory = category === 'all' || quest.category === category;
      const prerequisiteCompleted = !quest.prerequisiteId || this.getState(quest.prerequisiteId).completed;
      // Keep achieved quests visible until their Prism has been received, then
      // remove them from every list and page count.
      return matchesCategory && prerequisiteCompleted && !state.claimed;
    }).sort((first, second) => {
      // Array#sort is stable, so the catalog order remains unchanged inside
      // each group while every immediately claimable achievement moves first.
      const firstClaimable = this.getState(first.id).completed ? 1 : 0;
      const secondClaimable = this.getState(second.id).completed ? 1 : 0;
      return secondClaimable - firstClaimable;
    });
  }

  getState(questId) {
    return this.progress[questId] || { completed: false, claimed: false };
  }

  getCurrentValue(quest) {
    if (this.getState(quest.id).completed) return quest.target;
    if (quest.category === 'dungeon') return this.metrics.completedDungeons.has(quest.dungeonId) ? 1 : 0;
    if (quest.category === 'job' && quest.jobId) return this.metrics.changedJobIds.has(quest.jobId) ? 1 : 0;
    if (quest.metricKey) return this.metrics[quest.metricKey] || 0;
    return this.getState(quest.id).completed ? 1 : 0;
  }

  getSummary() {
    const completed = SPECIAL_QUESTS.filter(quest => this.getState(quest.id).completed).length;
    const claimed = SPECIAL_QUESTS.filter(quest => this.getState(quest.id).claimed).length;
    return { completed, claimed, total: SPECIAL_QUESTS.length };
  }

  claimReward(questId) {
    const run = () => this._claimReward(questId);
    const queuedClaim = this.claimQueue.then(run, run);
    this.claimQueue = queuedClaim.catch(() => undefined);
    return queuedClaim;
  }

  async _claimReward(questId) {
    const definition = SPECIAL_QUESTS.find(quest => quest.id === questId);
    const quest = this.progress[questId];
    if (!definition || !quest?.completed || quest.claimed) return false;
    quest.claimed = true;
    await this.save();
    const prism = Number(await GameDB.getGameState('prism')) || 0;
    const newPrism = prism + definition.reward;
    await GameDB.setGameState('prism', newPrism);
    const header = document.getElementById('header-prism-display');
    if (header) header.textContent = formatNumber(newPrism);
    window.dispatchEvent(new CustomEvent('quest:special-updated'));
    return true;
  }

  async save() {
    await GameDB.setGameState(STATE_KEY, this.progress);
  }
}

export const SpecialQuestManager = new SpecialQuestManagerClass();
