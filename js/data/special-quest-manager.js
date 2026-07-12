import { GameDB } from './database.js';

const STATE_KEY = 'quest_special_progress';

const DEFAULT_PROGRESS = {
  mineFirstUnlock: { completed: false, claimed: false }
};

class SpecialQuestManagerClass {
  constructor() {
    this.progress = structuredClone(DEFAULT_PROGRESS);
    this.listenersReady = false;
  }

  async init() {
    const saved = await GameDB.getGameState(STATE_KEY) || {};
    this.progress = {
      ...structuredClone(DEFAULT_PROGRESS),
      ...saved,
      mineFirstUnlock: { ...DEFAULT_PROGRESS.mineFirstUnlock, ...(saved.mineFirstUnlock || {}) }
    };

    // 機能追加前のセーブで既に鉱山が解放済みなら達成扱いにする。
    const mineData = await GameDB.getGameState('mine_data') || {};
    if (!this.progress.mineFirstUnlock.completed && Object.values(mineData).some(mine => mine?.unlocked)) {
      this.progress.mineFirstUnlock.completed = true;
      await this.save();
    }

    if (!this.listenersReady) {
      window.addEventListener('quest:mine-unlock', () => this.completeMineFirstUnlock());
      this.listenersReady = true;
    }
  }

  async completeMineFirstUnlock() {
    if (this.progress.mineFirstUnlock.completed) return;
    this.progress.mineFirstUnlock.completed = true;
    await this.save();
    window.dispatchEvent(new CustomEvent('quest:special-updated'));
  }

  isMineFirstUnlockCompleted() {
    return this.progress.mineFirstUnlock.completed;
  }

  isMineFirstUnlockClaimed() {
    return this.progress.mineFirstUnlock.claimed;
  }

  async claimMineFirstUnlockReward() {
    const quest = this.progress.mineFirstUnlock;
    if (!quest.completed || quest.claimed) return false;
    quest.claimed = true;
    await this.save();
    const prism = await GameDB.getGameState('prism') || 0;
    const newPrism = prism + 1;
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
