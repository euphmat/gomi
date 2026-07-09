import { GameDB } from './database.js';

function getJSTDateString() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export const DAILY_QUESTS = [
  {
    id: 'daily_kill_10000',
    label: '任意のモンスターを10,000体討伐する',
    icon: 'swords',
    eventType: 'quest:monster-kill',
    target: 10000,
    progressKey: 'kills',
  },
  {
    id: 'daily_feed_level_5',
    label: '任意のモンスターのレベルを合計5上げる',
    icon: 'pets',
    eventType: 'quest:monster-feed-level',
    target: 5,
    progressKey: 'feedLevels',
  },
  {
    id: 'daily_craft_5',
    label: '任意の装備品を5個合成する',
    icon: 'construction',
    eventType: 'quest:equipment-craft',
    target: 5,
    progressKey: 'crafts',
  },
];

class QuestManagerClass {
  constructor() {
    this.dailyProgress = {
      date: getJSTDateString(),
      kills: 0,
      feedLevels: 0,
      crafts: 0,
      claimed: false,
    };
  }

  async init() {
    const saved = await GameDB.getGameState('quest_daily_progress');
    const today = getJSTDateString();

    if (saved && saved.date === today) {
      this.dailyProgress = { ...this.dailyProgress, ...saved };
    } else {
      // Reset for a new day (or first time)
      this.dailyProgress = {
        date: today,
        kills: 0,
        feedLevels: 0,
        crafts: 0,
        claimed: false,
      };
      await this.saveProgress();
    }

    this._setupEventListeners();
  }

  _setupEventListeners() {
    window.addEventListener('quest:monster-kill', (e) => {
      const { count } = e.detail;
      this.addProgress('kills', count);
    });

    window.addEventListener('quest:monster-feed-level', (e) => {
      const { levelsGained } = e.detail;
      this.addProgress('feedLevels', levelsGained);
    });

    window.addEventListener('quest:equipment-craft', (e) => {
      const { count } = e.detail;
      this.addProgress('crafts', count);
    });
  }

  async addProgress(key, amount) {
    if (this.dailyProgress.claimed) return; // Already claimed, no need to track
    if (typeof this.dailyProgress[key] !== 'number') return;

    this.dailyProgress[key] += amount;
    await this.saveProgress();
    
    // Dispatch event to update UI if quest tab is open
    window.dispatchEvent(new CustomEvent('quest:progress-updated'));
  }

  async saveProgress() {
    await GameDB.setGameState('quest_daily_progress', this.dailyProgress);
  }

  getProgress(questId) {
    const quest = DAILY_QUESTS.find(q => q.id === questId);
    if (!quest) return 0;
    return this.dailyProgress[quest.progressKey] || 0;
  }

  isCompleted(questId) {
    const quest = DAILY_QUESTS.find(q => q.id === questId);
    if (!quest) return false;
    return this.getProgress(questId) >= quest.target;
  }

  isAllDailyCompleted() {
    return DAILY_QUESTS.every(q => this.isCompleted(q.id));
  }

  isClaimed() {
    return this.dailyProgress.claimed;
  }

  async claimDailyReward() {
    if (!this.isAllDailyCompleted() || this.isClaimed()) {
      return false;
    }

    this.dailyProgress.claimed = true;
    await this.saveProgress();

    // Add 1 Prism
    const currentPrism = await GameDB.getGameState('prism') || 0;
    const newPrism = currentPrism + 1;
    await GameDB.setGameState('prism', newPrism);

    // Update Header
    const headerPrismDisplay = document.getElementById('header-prism-display');
    if (headerPrismDisplay) {
      headerPrismDisplay.textContent = newPrism.toString();
    }
    
    window.dispatchEvent(new CustomEvent('quest:reward-claimed'));
    return true;
  }
}

export const QuestManager = new QuestManagerClass();
