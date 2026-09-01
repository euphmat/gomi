import assert from 'node:assert/strict';
import { DUNGEONS } from '../js/definitions/dungeons.js';
import { MONSTERS } from '../js/definitions/monsters.js';
import {
  SPECIAL_QUESTS,
  SpecialQuestManager,
  calculateExtendedSpecialQuestMetrics,
} from '../js/data/special-quest-manager.js';
import { GameDB } from '../js/data/database.js';

const ids = SPECIAL_QUESTS.map(quest => quest.id);
assert.equal(new Set(ids).size, ids.length, 'Special achievement ids must be unique.');
assert.equal(SPECIAL_QUESTS.length, 283, 'The complete special achievement catalog changed unexpectedly.');

for (const quest of SPECIAL_QUESTS) {
  assert.ok(quest.id && quest.category && quest.title && quest.description && quest.icon, `Invalid achievement: ${quest.id}`);
  assert.ok(Number.isFinite(quest.target) && quest.target > 0, `Invalid target: ${quest.id}`);
  assert.ok(Number.isFinite(quest.reward) && quest.reward > 0, `Invalid reward: ${quest.id}`);
  if (quest.prerequisiteId) {
    const prerequisite = SPECIAL_QUESTS.find(candidate => candidate.id === quest.prerequisiteId);
    assert.ok(prerequisite, `Missing prerequisite ${quest.prerequisiteId} for ${quest.id}`);
    assert.equal(prerequisite.category, quest.category, `Cross-category prerequisite for ${quest.id}`);
    if (quest.metricKey) {
      assert.equal(prerequisite.metricKey, quest.metricKey, `Metric chain mismatch for ${quest.id}`);
      assert.ok(prerequisite.target < quest.target, `Achievement chain is not increasing for ${quest.id}`);
    }
  }
}

const [monsterA, monsterB, monsterC] = MONSTERS;
const firstDungeon = DUNGEONS[0];
const secondDungeon = DUNGEONS[1];
const metrics = calculateExtendedSpecialQuestMetrics({
  monsterKills: {
    [monsterA.id]: 120,
    [monsterB.id]: 80.9,
    unknown_monster: 999999,
  },
  playerMedals: {
    [monsterA.id]: 6,
    [monsterB.id]: 2,
    [monsterC.id]: 0,
    unknown_monster: 6,
  },
  fishingData: {
    totalCaught: 1234,
    tackle: { rodLevel: 2, baitLevel: 3, lureLevel: 4 },
  },
  mineData: {
    copper_mine: { unlocked: true, machineLevel: 3, yieldLevel: 4, capacityLevel: 5 },
    tin_mine: { unlocked: true, machineLevel: 1, yieldLevel: 1, capacityLevel: 1 },
  },
  completedDungeons: new Set([firstDungeon.id]),
  completedDungeonFloors: {
    [secondDungeon.id]: [1, 2, 999],
  },
  ranchData: {
    [firstDungeon.id]: {
      [monsterA.id]: { fedMaterials: 100 },
      [`${monsterB.id}_legendary`]: { fedMaterials: 150 },
    },
  },
  characters: [{
    jobLevel: 9,
    jobLevels: { knight: { level: 20 }, mage: { level: 12 } },
  }],
  memoryRecord: { gamesPlayed: 42, wins: 17 },
  treasureLevels: { pocket_watch: 3, hero_medal: 7, invalid_treasure: 999 },
  gameRecord: {
    loginDays: 42,
    townGames: {
      sudoku: { clears: 51, clearedDifficulties: ['easy', 'normal', 'hard'] },
      minesweeper: { clears: 12, clearedDifficulties: ['easy', 'very_hard'] },
      'monster-tower': { clears: 7, clearedDifficulties: ['normal'] },
    },
    blackjack: { gamesPlayed: 123, wins: 45, blackjacks: 6 },
  },
});

assert.equal(metrics.totalKills, 200, 'Only valid monster kill counts should be included.');
assert.equal(metrics.totalCaught, 1234);
assert.equal(metrics.clearedFloors, firstDungeon.floors.length + 2, 'Completed dungeons should backfill all of their floors.');
assert.equal(metrics.unlockedMines, 2);
assert.equal(metrics.mineUpgrades, 9);
assert.equal(metrics.companions, 2);
assert.equal(metrics.legendaryCompanions, 1);
assert.ok(metrics.companionLevel > 1);
assert.equal(metrics.jobLevel, 20);
assert.equal(metrics.tackleUpgrades, 6);
assert.equal(metrics.memoryGames, 42);
assert.equal(metrics.memoryWins, 17);
assert.equal(metrics.treasureKinds, 2);
assert.equal(metrics.treasureLevels, 10);
assert.equal(metrics.loginDays, 42);
assert.equal(metrics.sudokuClears, 51);
assert.equal(metrics.sudokuDifficulties, 3);
assert.equal(metrics.minesweeperClears, 12);
assert.equal(metrics.minesweeperDifficulties, 2);
assert.equal(metrics.towerWins, 7);
assert.equal(metrics.towerDifficulties, 1);
assert.equal(metrics.blackjackGames, 123);
assert.equal(metrics.blackjackWins, 45);
assert.equal(metrics.blackjackNaturals, 6);
const cappedTreasureMetrics = calculateExtendedSpecialQuestMetrics({
  treasureLevels: { pocket_watch: 999, hero_medal: 999, invalid_treasure: 999 },
});
assert.equal(cappedTreasureMetrics.treasureLevels, 30, 'Achievement totals must respect treasure maximum levels.');
assert.equal(metrics.medalRank1, 2, 'Upgraded medals should continue counting toward lower-rank goals.');
assert.equal(metrics.medalRank2, 2);
assert.equal(metrics.medalRank3, 1);
assert.equal(metrics.medalRank6, 1);

const state = new Map([
  ['mine_data', {
    copper_mine: { unlocked: true, machineLevel: 3, yieldLevel: 4, capacityLevel: 5 },
    tin_mine: { unlocked: true, machineLevel: 1, yieldLevel: 1, capacityLevel: 1 },
  }],
  ['completed_dungeons', []],
  ['unlockedDungeons', ['slime_forest']],
  ['monster_kills', { [monsterA.id]: 120, [monsterB.id]: 80 }],
  ['discovered_monsters', [monsterA.id, monsterB.id, monsterC.id]],
  ['player_medals', { [monsterA.id]: 6, [monsterB.id]: 2 }],
  ['fishing_data', { totalCaught: 1234, discovered: {}, tackle: { rodLevel: 2, baitLevel: 3, lureLevel: 4 } }],
  ['discovered_items', []],
  ['job_change_history', ['knight']],
  ['completed_dungeon_floors', { [secondDungeon.id]: [1, 2] }],
  ['ranch_data', { [firstDungeon.id]: { [monsterA.id]: { fedMaterials: 100 } } }],
  ['memoryGameProgress', { gamesPlayed: 42, wins: 17, draws: 4, losses: 21 }],
  ['treasure_levels', { pocket_watch: 3, hero_medal: 7 }],
  ['special_quest_game_record', {
    loginDays: 42,
    townGames: {
      sudoku: { clears: 51, clearedDifficulties: ['easy', 'normal', 'hard'] },
      minesweeper: { clears: 12, clearedDifficulties: ['easy', 'very_hard'] },
      'monster-tower': { clears: 7, clearedDifficulties: ['normal'] },
    },
    blackjack: { gamesPlayed: 123, wins: 45, blackjacks: 6 },
  }],
  ['quest_special_progress', {
    monster_30: { completed: true, claimed: true },
    memory_level_10: { completed: true, claimed: true },
    treasure_levels_500: { completed: true, claimed: true },
  }],
]);

GameDB.getGameState = async key => state.get(key);
GameDB.setGameState = async (key, value) => { state.set(key, structuredClone(value)); };
GameDB.getAllEquipment = async () => [];
GameDB.getAllInventory = async () => [];
GameDB.getAllCharacters = async () => [{
  jobId: 'knight',
  jobLevel: 9,
  unlockedJobs: ['norvice', 'knight'],
  jobLevels: { mage: { level: 20 } },
}];

globalThis.window = new EventTarget();
await SpecialQuestManager.init();

assert.equal(SpecialQuestManager.getState('total_kills_100').completed, true);
assert.equal(SpecialQuestManager.getState('total_catches_1000').completed, true);
assert.equal(SpecialQuestManager.getState('mineFirstUnlock').completed, true);
assert.equal(SpecialQuestManager.getState('medal_rank_stela_1').completed, true);
assert.equal(SpecialQuestManager.getState('login_days_30').completed, true);
assert.equal(SpecialQuestManager.getState('sudoku_clears_50').completed, true);
assert.equal(SpecialQuestManager.getState('blackjack_naturals_5').completed, true);
assert.equal(SpecialQuestManager.getState('monster_30').claimed, true, 'Existing claimed achievements must survive catalog migration.');
assert.equal(SpecialQuestManager.getState('treasure_levels_300').claimed, true, 'Legacy treasure-level rewards must migrate to reachable targets.');
assert.equal(state.get('quest_special_progress').treasure_levels_300.claimed, true, 'Migrated treasure progress must be persisted.');
assert.equal(state.get('quest_special_progress').memory_level_10, undefined, 'Removed memory-level progress must be deleted.');
assert.ok(state.get('quest_special_progress').total_kills_100, 'New achievement state should be persisted.');

for (const category of ['all', 'battle', 'fish', 'medal']) {
  const quests = SpecialQuestManager.getQuests(category);
  const firstIncompleteIndex = quests.findIndex(quest => !SpecialQuestManager.getState(quest.id).completed);
  const lastCompletedIndex = quests.findLastIndex(quest => SpecialQuestManager.getState(quest.id).completed);
  assert.ok(
    firstIncompleteIndex < 0 || lastCompletedIndex < firstIncompleteIndex,
    `Claimable achievements must be listed first in ${category}.`
  );
}
assert.ok(
  !SpecialQuestManager.getQuests().some(quest => quest.id === 'monster_30'),
  'Claimed achievements must remain hidden after sorting.'
);

console.log('Special achievement tests passed.');
