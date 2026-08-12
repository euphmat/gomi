import { GameDB } from './database.js';
import { formatNumber } from '../utils/format.js';

function getJSTDateString() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export const DAILY_QUESTS = [
  {
    id: 'daily_kill_10000',
    get label() { return `任意のモンスターを${formatNumber(10000)}体討伐する`; },
    icon: 'swords',
    eventType: 'quest:monster-kill',
    target: 10000,
    progressKey: 'kills',
    destination: { path: '/dungeon?tab=normal', label: 'ダンジョンへ' },
  },
  {
    id: 'daily_feed_level_5',
    label: '任意のモンスターのレベルを合計5上げる',
    icon: 'pets',
    eventType: 'quest:monster-feed-level',
    target: 5,
    progressKey: 'feedLevels',
    destination: { path: '/guild?tab=ranch', label: '牧場へ' },
  },
  {
    id: 'daily_craft_5',
    label: '任意の装備品を5個合成する',
    icon: 'construction',
    eventType: 'quest:equipment-craft',
    target: 5,
    progressKey: 'crafts',
    destination: { path: '/shop?tab=shop', label: 'ショップへ' },
  },
  {
    id: 'daily_mine_upgrade_5',
    label: '任意の鉱山のアップグレードを5回行う',
    icon: 'landscape',
    eventType: 'quest:mine-upgrade',
    target: 5,
    progressKey: 'mineUpgrades',
    destination: { path: '/guild?tab=mine', label: '鉱山へ' },
  },
  {
    id: 'daily_fish_5',
    label: '魚を5匹釣る',
    icon: 'phishing',
    eventType: 'quest:fish-caught',
    target: 5,
    progressKey: 'fishCaught',
    destination: { path: '/fishing', label: '釣り場へ' },
  },
  {
    id: 'daily_play_mini_game',
    label: 'ミニゲームで1回遊ぶ',
    icon: 'sports_esports',
    eventType: 'quest:mini-game-play',
    target: 1,
    progressKey: 'miniGamesPlayed',
    destination: { path: '/status', label: 'ミニゲームへ' },
  },
];

export const DAILY_COMPLETE_REWARD = 3;

class QuestManagerClass {
  constructor() {
    this.dailyProgress = this._createDailyProgress(getJSTDateString());
  }

  _createDailyProgress(date) {
    return {
      date,
      kills: 0,
      feedLevels: 0,
      crafts: 0,
      mineUpgrades: 0,
      fishCaught: 0,
      miniGamesPlayed: 0,
      claimed: false,
    };
  }

  async init() {
    const saved = await GameDB.getGameState('quest_daily_progress');
    const today = getJSTDateString();

    if (saved && saved.date === today) {
      // 旧「神経衰弱で1回遊ぶ」の当日進捗を、共通ミニゲーム進捗へ引き継ぐ。
      const { memoryGamesPlayed, ...savedProgress } = saved;
      this.dailyProgress = {
        ...this.dailyProgress,
        ...savedProgress,
        miniGamesPlayed: Math.max(0, Number(saved.miniGamesPlayed ?? memoryGamesPlayed) || 0),
      };
      if (!Object.prototype.hasOwnProperty.call(saved, 'miniGamesPlayed')) await this.saveProgress();
    } else {
      // Reset for a new day (or first time)
      this.dailyProgress = this._createDailyProgress(today);
      await this.saveProgress();
    }

    this._setupEventListeners();
  }

  _setupEventListeners() {
    window.addEventListener('quest:monster-kill', (e) => {
      const { count } = e.detail || {};
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

    window.addEventListener('quest:mine-upgrade', (e) => {
      const { count } = e.detail;
      this.addProgress('mineUpgrades', count);
    });

    window.addEventListener('quest:fish-caught', (e) => {
      const { count } = e.detail;
      this.addProgress('fishCaught', count);
    });

    window.addEventListener('quest:mini-game-play', () => {
      this.addProgress('miniGamesPlayed', 1);
    });
  }

  async refreshForNewDay() {
    const today = getJSTDateString();
    if (this.dailyProgress.date === today) return false;

    this.dailyProgress = this._createDailyProgress(today);
    await this.saveProgress();
    window.dispatchEvent(new CustomEvent('quest:progress-updated'));
    return true;
  }

  async addProgress(key, amount) {
    await this.refreshForNewDay();
    if (this.dailyProgress.claimed) return; // Already claimed, no need to track
    if (typeof this.dailyProgress[key] !== 'number') return;
    if (!Number.isFinite(amount) || amount <= 0) return;

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
    await this.refreshForNewDay();
    if (!this.isAllDailyCompleted() || this.isClaimed()) {
      return false;
    }

    this.dailyProgress.claimed = true;
    await this.saveProgress();

    // Add the daily completion reward.
    const currentPrism = await GameDB.getGameState('prism') || 0;
    const newPrism = currentPrism + DAILY_COMPLETE_REWARD;
    await GameDB.setGameState('prism', newPrism);

    // Update Header
    const headerPrismDisplay = document.getElementById('header-prism-display');
    if (headerPrismDisplay) {
      headerPrismDisplay.textContent = formatNumber(newPrism);
    }
    
    window.dispatchEvent(new CustomEvent('quest:reward-claimed'));
    return true;
  }
}

export const QuestManager = new QuestManagerClass();
