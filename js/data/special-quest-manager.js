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
import { JOBS } from '../jobs/index.js';

const STATE_KEY = 'quest_special_progress';
const COMPLETED_DUNGEONS_KEY = 'completed_dungeons';
const JOB_CHANGE_HISTORY_KEY = 'job_change_history';
const ALL_DUNGEONS = [...DUNGEONS, ...SPECIAL_DUNGEONS];
const ALL_ITEMS = [...WEAPONS, ...ARMORS, ...SHIELDS, ...ACCESSORIES, ...MATERIALS];

const MONSTER_LIBRARY_TARGETS = [30, 50, 75, 100];
const FISH_LIBRARY_TARGETS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
const ITEM_LIBRARY_TARGETS = [50, 100, 150, 200, 300, 400, 500, 600, 700];
const MEDAL_TARGETS = [10, 20, 30, 50, 75, 100];

const makeMilestoneQuests = (type, targets, options) => targets.map((target, index) => ({
  id: `${type}_${target}`,
  category: type,
  target,
  reward: 1,
  prerequisiteId: index > 0 ? `${type}_${targets[index - 1]}` : null,
  ...options,
  title: `${options.titlePrefix} ${target}種類達成`,
  description: `${options.descriptionPrefix}${target}種類集める`,
}));

export const SPECIAL_QUESTS = [
  {
    id: 'mineFirstUnlock',
    category: 'other',
    title: '鉱山を初めて解放する',
    description: 'いずれかの鉱山をPrismで解放する',
    icon: 'landscape',
    reward: 1,
    target: 1,
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
  })),
  ...makeMilestoneQuests('monster', MONSTER_LIBRARY_TARGETS, {
    titlePrefix: 'モンスター図鑑',
    descriptionPrefix: 'モンスター図鑑に',
    icon: 'pets',
  }),
  ...makeMilestoneQuests('fish', FISH_LIBRARY_TARGETS, {
    titlePrefix: '魚図鑑',
    descriptionPrefix: '魚図鑑に',
    icon: 'phishing',
  }),
  ...makeMilestoneQuests('item', ITEM_LIBRARY_TARGETS, {
    titlePrefix: 'アイテム図鑑',
    descriptionPrefix: 'アイテム図鑑に',
    icon: 'auto_stories',
  }),
  ...makeMilestoneQuests('medal', MEDAL_TARGETS, {
    titlePrefix: 'メダル',
    descriptionPrefix: '異なるモンスターのメダルを',
    icon: 'military_tech',
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

class SpecialQuestManagerClass {
  constructor() {
    this.progress = structuredClone(DEFAULT_PROGRESS);
    this.metrics = { monster: 0, fish: 0, item: 0, medal: 0, completedDungeons: new Set(), changedJobs: new Set() };
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

    this.metrics = {
      monster: discoveredMonsters.size,
      fish: fishCount,
      item: acquiredItemIds.size,
      medal: medalCount,
      completedDungeons,
      changedJobs,
    };

    let changed = false;
    if (Object.values(mineData || {}).some(mine => mine?.unlocked)) {
      changed = this.markCompleted('mineFirstUnlock') || changed;
    }
    for (const quest of SPECIAL_QUESTS) {
      if (quest.category === 'dungeon' && completedDungeons.has(quest.dungeonId)) {
        changed = this.markCompleted(quest.id) || changed;
      } else if (quest.category === 'job' && changedJobs.has(quest.jobId)) {
        changed = this.markCompleted(quest.id) || changed;
      } else if (['monster', 'fish', 'item', 'medal'].includes(quest.category) && this.metrics[quest.category] >= quest.target) {
        changed = this.markCompleted(quest.id) || changed;
      }
    }

    const normalizedCompleted = [...completedDungeons].filter(id => ALL_DUNGEONS.some(dungeon => dungeon.id === id));
    const storedCompleted = Array.isArray(completedDungeonsValue) ? completedDungeonsValue : [];
    const dungeonHistoryChanged = JSON.stringify([...storedCompleted].sort()) !== JSON.stringify([...normalizedCompleted].sort());
    if (dungeonHistoryChanged) await GameDB.setGameState(COMPLETED_DUNGEONS_KEY, normalizedCompleted);
    if (changed) await this.save();
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
      ...this.metrics.changedJobs,
    ].filter(id => JOBS[id]));
    const historyChanged = !changedJobs.has(jobId);
    changedJobs.add(jobId);
    this.metrics.changedJobs = changedJobs;

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
    });
  }

  getState(questId) {
    return this.progress[questId] || { completed: false, claimed: false };
  }

  getCurrentValue(quest) {
    if (quest.category === 'dungeon') return this.metrics.completedDungeons.has(quest.dungeonId) ? 1 : 0;
    if (quest.category === 'job') return this.metrics.changedJobs.has(quest.jobId) ? 1 : 0;
    if (['monster', 'fish', 'item', 'medal'].includes(quest.category)) return this.metrics[quest.category] || 0;
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
    if (header) header.textContent = newPrism.toLocaleString();
    window.dispatchEvent(new CustomEvent('quest:special-updated'));
    return true;
  }

  async save() {
    await GameDB.setGameState(STATE_KEY, this.progress);
  }
}

export const SpecialQuestManager = new SpecialQuestManagerClass();
