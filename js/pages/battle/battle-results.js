/**
 * battle-results.js
 * 戦闘結果・報酬・セーブ処理
 */

import { GameDB } from '../../data/database.js';
import { DUNGEONS } from '../../definitions/dungeons.js';
import { MATERIALS } from '../../definitions/materials.js';
import { MEDAL_RANKS } from '../../definitions/medal-definitions.js';
import { EQUIPMENT_DROP_RATE, getEquipmentDropsForMonster } from '../../definitions/equipment-drops.js';
import { calcFinalStats } from '../../data/stat-calculator.js';
import { JOBS } from '../../jobs/index.js';
import { formatNumber } from '../../utils/format.js';
import { calculatePartyInnFee } from '../../utils/inn-cost.js';
import { renderItemTabHtml } from './battle-ui.js';
import { notifyGameEvent } from '../../utils/game-notifications.js';
import { getMaterialCapacity, getTreasureEffect } from '../../data/treasure-manager.js';
import { SpecialQuestManager } from '../../data/special-quest-manager.js';
import { playSoundEffect } from '../../utils/sound-effects.js';
import { addLockScreenCompanion, recordLockScreenProgress, setLockScreenActivity } from '../../utils/screen-lock.js';
import { getBaseExpToNext, normalizeBaseExpProgress } from '../../data/level-progression.js';
import { getAvailableJobSP, getJobExpToNext, normalizeJobExpProgress } from '../../data/job-progression.js';
import { addSoulReaperCorpses } from '../../jobs/soul_reaper.js';
import { sumMedalEquipmentEffect } from '../../utils/medal-equipment-effects.js';

const MATERIALS_MAP = new Map(MATERIALS.map(m => [m.id, m]));

async function recordCompletedDungeonFloor(dungeonId, floorLevel) {
  if (!dungeonId || !Number.isFinite(Number(floorLevel))) return;
  const savedProgress = await GameDB.getGameState('completed_dungeon_floors');
  const completedFloors = savedProgress && !Array.isArray(savedProgress) && typeof savedProgress === 'object'
    ? savedProgress
    : {};
  const savedFloors = completedFloors[dungeonId];
  const normalizedSavedFloors = Array.isArray(savedFloors)
    ? savedFloors
    : Object.entries(savedFloors || {}).filter(([, cleared]) => cleared).map(([floor]) => floor);
  const dungeonFloors = new Set(normalizedSavedFloors.map(Number));
  const normalizedFloor = Number(floorLevel);
  if (dungeonFloors.has(normalizedFloor)) return;
  dungeonFloors.add(normalizedFloor);
  completedFloors[dungeonId] = [...dungeonFloors].sort((a, b) => a - b);
  await GameDB.setGameState('completed_dungeon_floors', completedFloors);
}

export const resultMethods = {
  checkBattleEnd() {
    if (this.isStopped) return;
    if (this._pendingAttackAnimations > 0) return;

    const allEnemiesDead = this.enemies.every(e => e.isDead);
    if (allEnemiesDead) {
      this._updateEntitiesPending = false;
      this._doUpdateEntities();
      this.endBattle(true, '勝利！');
      return;
    }
    
    const allPartyDead = this.party.every(p => p.isDead);
    if (allPartyDead) {
      this._updateEntitiesPending = false;
      this._doUpdateEntities();
      this.endBattle(false, '全滅した...');
      return;
    }
  },

  async processEnemyDeath(enemy) {
    let drops = [];

    // 墓標の王: every defeated enemy leaves one usable corpse behind.
    for (const member of this.party) {
      if (member.isDead || member.jobId !== 'soul_reaper') continue;
      const sovereignty = this._findSkill?.(member, 'grave_sovereignty');
      if (sovereignty?.level > 0 && sovereignty.levelConfig) {
        addSoulReaperCorpses(member, 1, this);
      }
    }

    // Track that this monster has been encountered/defeated (for monster library)
    if (this.discoveredMonsters && !this.discoveredMonsters.includes(enemy.id)) {
      this.discoveredMonsters.push(enemy.id);
      this._needsSave = true;
    }

    // Increment and save monster kill counts (with medal bonus)
    let medalRankIndex = -1;
    if (this.playerMedals && this.playerMedals[enemy.id] !== undefined) {
      medalRankIndex = this.playerMedals[enemy.id];
    }

    if (this.monsterKills) {
      const medalBonus = medalRankIndex >= 0 ? MEDAL_RANKS[medalRankIndex].killBonus : 0;
      const countToAdd = 1 + medalBonus + getTreasureEffect('extraKillCount');
      this.monsterKills[enemy.id] = (this.monsterKills[enemy.id] || 0) + countToAdd;
      // Daily quest progress counts actual defeats, not the medal kill bonus.
      window.dispatchEvent(new CustomEvent('quest:monster-kill', { detail: { monsterId: enemy.id, count: 1 } }));
      this._needsSave = true;
    }

    // Add Gold
    const equipmentGoldPercent = Math.max(0, ...this.party
      .filter(member => !member.isDead)
      .map(member => sumMedalEquipmentEffect(member, this.equipMap, 'goldRewardPercent', 100)));
    let gold = Math.floor((enemy.rewards.gold || 0) * (1 + (getTreasureEffect('monsterGoldPercent') + equipmentGoldPercent) / 100));
    if (gold > 0) {
      this.currentGold += gold;
      this.obtainedGold += gold;
      this._needsSave = true;
      const goldDisplay = document.getElementById('header-gold-display');
      if (goldDisplay) goldDisplay.textContent = `${formatNumber(this.currentGold)}`;
      drops.push({ text: `+${gold}`, icon: 'paid', color: 'text-yellow-400' });
    }

    // Add EXP / JP to party members
    let exp = Math.floor((enemy.rewards.exp || 0) * (1 + getTreasureEffect('battleExpPercent') / 100));
    let jp = Math.floor((enemy.rewards.jp || 0) * (1 + getTreasureEffect('battleJpPercent') / 100));

    if (exp > 0) this.obtainedExp += exp;
    recordLockScreenProgress('battle', { defeated: 1, gold, exp });
    
    if (exp > 0 || jp > 0) {
      for (const p of this.party) {
        if (!p.isDead) {
          normalizeBaseExpProgress(p);
          normalizeJobExpProgress(p);
          p.exp.current += exp;
          p.jp.current += jp;

          let baseLevelUp = false;
          let jobLevelUp = false;

          const oldMaxHp = p.stats ? p.stats.hp : (p.hp.max || 0);
          const oldMaxMp = p.stats ? p.stats.mp : (p.mp.max || 0);

          // Level Up Logic
          let loopGuardExp = 0;
          while (p.exp.current >= p.exp.max && loopGuardExp++ < 1000) {
            p.exp.current -= p.exp.max;
            p.level = (p.level || 1) + 1;
            p.exp.max = getBaseExpToNext(p.level);
            
            const jobGrowth = JOBS[p.jobId]?.statGrowth;
            if (jobGrowth) {
              const getGrowth = (val) => Array.isArray(val) ? Math.floor(Math.random() * (val[1] - val[0] + 1)) + val[0] : (val || 0);
              
              const hpGrowth = getGrowth(jobGrowth.hp);
              const mpGrowth = getGrowth(jobGrowth.mp);
              p.hp.max += hpGrowth;
              p.mp.max += mpGrowth;
              p.baseStats.atk += getGrowth(jobGrowth.atk);
              p.baseStats.def += getGrowth(jobGrowth.def);
              p.baseStats.matk += getGrowth(jobGrowth.matk);
              p.baseStats.mdef += getGrowth(jobGrowth.mdef);
              p.baseStats.spd += getGrowth(jobGrowth.spd);
            }
            baseLevelUp = true;
          }

          // Job Level Up Logic
          let loopGuardJp = 0;
          while (p.jp.current >= p.jp.max && loopGuardJp++ < 1000) {
            p.jp.current -= p.jp.max;
            p.jobLevel = (p.jobLevel || 1) + 1;
            p.jp.max = getJobExpToNext(p.jobLevel);
            jobLevelUp = true;
          }

          if (jobLevelUp) p.sp = getAvailableJobSP(p, JOBS[p.jobId], p.jobLevel);

          if (baseLevelUp || jobLevelUp) {
            p.stats = calcFinalStats(p, this.equipMap);
            if (baseLevelUp) {
              p.hp.current += Math.max(0, p.stats.hp - oldMaxHp);
              p.mp.current += Math.max(0, p.stats.mp - oldMaxMp);
              this.showLevelUp(p.elementId, 'base');
            }
            if (jobLevelUp) {
              p._skillCache = null; // Invalidate cache on job level up
              setTimeout(() => this.showLevelUp(p.elementId, 'job'), baseLevelUp ? (400 / this.speedMult) : 0);
            }
            if (!document.hidden) this.renderEntities(); // re-render to update max HP/MP and stats display
          }
        }
      }
      // savePartyState() is deferred to endBattle()
    }

    // --- 牧場 (Ranch) コンパニオン化抽選 ---
    const enemyKills = this.monsterKills[enemy.id] || 0;
    // 基本確率は0.01%。100体討伐ごとに0.01%上昇する
    const baseCaptureRate = 0.0001 + Math.floor(enemyKills / 100) * 0.0001;
    const captureMultiplier = getTreasureEffect('captureMultiplier')
      * (enemy.isLegendary ? getTreasureEffect('legendaryCaptureMultiplier') : 1);
    const captureRate = Math.min(1.0, baseCaptureRate * captureMultiplier);
    
    if (Math.random() < captureRate) {
      const dungeonId = this.currentDungeonId;
      if (!this.ranchData[dungeonId]) {
        this.ranchData[dungeonId] = {};
      }
      
      const saveId = enemy.isLegendary ? `${enemy.id}_legendary` : enemy.id;
      
      // まだ仲間になっていない場合のみ
      if (!this.ranchData[dungeonId][saveId]) {
        this.ranchData[dungeonId][saveId] = { fedMaterials: 0, level: 1 };
        this._pendingRanchSave = this.ranchData; // Deferred saving like other properties
        this._needsSave = true;

        notifyGameEvent('モンスター捕獲', `${enemy.name}を牧場に迎え入れました！`, `monster-captured-${saveId}`);
        addLockScreenCompanion({ id: saveId, name: enemy.name, image: enemy.image });

        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none bg-black/50 transition-opacity duration-300';
        overlay.innerHTML = `
          <div class="bg-slate-900 border-2 border-pink-500 rounded-2xl p-6 text-center shadow-[0_0_30px_rgba(236,72,153,0.6)] animate-bounce">
            <h2 class="text-2xl font-black text-pink-400 mb-2">${enemy.name} が仲間になりたそうにこちらを見ている！</h2>
            <p class="text-white font-bold">${enemy.name} を牧場に迎え入れた！</p>
          </div>
        `;
        document.body.appendChild(overlay);
        setTimeout(() => {
          overlay.style.opacity = '0';
          setTimeout(() => overlay.remove(), 300);
        }, 3000);
      }
    }

    // Process Drops
    if (enemy.drops) {
      const kills = this.monsterKills[enemy.id] || 0;
      const bonus = Math.floor(kills / 100) * 0.1;
      for (const drop of enemy.drops) {
        const adjustedRate = drop.rate + bonus + getTreasureEffect('materialDropPercent');
        
        let dropCount = 0;
        if (enemy.isLegendary) {
          dropCount = 100;
        } else {
          dropCount = Math.floor(adjustedRate / 100);
          if (Math.random() * 100 <= (adjustedRate % 100)) {
            dropCount += 1;
          }
          dropCount = Math.min(dropCount, 100);
        }

        if (dropCount > 0) {
          const mat = MATERIALS_MAP.get(drop.itemId);
          if (mat) {
            if (!this._pendingItemDrops) this._pendingItemDrops = {};
            this._pendingItemDrops[mat.id] = (this._pendingItemDrops[mat.id] || 0) + dropCount;
            this._needsSave = true;

            drops.push({ text: mat.name + (dropCount > 1 ? ` x${dropCount}` : ''), image: mat.image, color: 'text-white' });
            
            const existingDrop = this.obtainedItemsMap.get(mat.id);
            if (existingDrop) {
              existingDrop.quantity += dropCount;
            } else {
              const newDrop = { id: mat.id, name: mat.name, image: mat.image, quantity: dropCount, type: 'material' };
              this.obtainedItems.push(newDrop);
              this.obtainedItemsMap.set(mat.id, newDrop);
            }
            recordLockScreenProgress('battle', { materials: dropCount });
          }
        }
      }
    }

    // Equipment uses its own fixed roll and is never affected by kill-count bonuses.
    const equipmentCandidates = getEquipmentDropsForMonster(enemy);
    for (const equipment of equipmentCandidates) {
      const equipmentDropRate = EQUIPMENT_DROP_RATE * getTreasureEffect('equipmentDropMultiplier');
      if (Math.random() * 100 >= equipmentDropRate) continue;
      const uniqueId = `${equipment.id}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

      if (!this._pendingEquipmentDrops) this._pendingEquipmentDrops = [];
      this._pendingEquipmentDrops.push({ id: uniqueId, baseId: equipment.id });
      this._needsSave = true;

      drops.push({ text: equipment.name, image: equipment.image, color: 'text-amber-300' });
      notifyGameEvent('装備アイテム獲得', `${equipment.name}がドロップしました！`, `equipment-drop-${uniqueId}`);

      const obtainedKey = `equipment:${equipment.id}`;
      const existingEquipment = this.obtainedItemsMap.get(obtainedKey);
      if (existingEquipment) {
        existingEquipment.quantity += 1;
      } else {
        const newEquipment = {
          id: equipment.id,
          name: equipment.name,
          image: equipment.image,
          quantity: 1,
          type: 'equipment'
        };
        this.obtainedItems.push(newEquipment);
        this.obtainedItemsMap.set(obtainedKey, newEquipment);
      }
      recordLockScreenProgress('battle', { loot: 1 });
    }

    if (document.hidden || this._cachedDisableAnim) return;
    const el = this.container.querySelector(`#${enemy.elementId}`);
    if (!el) return;
    
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const startX = centerX - 20;
    const startY = centerY + rect.height * 0.2 - 20;

    // Show floating elements using global pool
    drops.forEach((drop) => {
      const dropEl = this._getPoolElement('float');
      if (!dropEl) return;
      const popupGeneration = dropEl._popupPoolGeneration;
      
      dropEl.className = `w-10 h-10 flex items-center justify-center drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] opacity-0`;
      dropEl.style.display = 'block';
      dropEl.style.left = `${startX}px`;
      dropEl.style.top = `${startY}px`;
      
      let innerHtml = '';
      if (drop.image) {
        innerHtml += `<img src="${drop.image}" class="w-full h-full object-contain drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" onerror="this.style.display='none'">`;
      } else if (drop.icon) {
        innerHtml += `<span class="material-symbols-outlined text-[20px] ${drop.color} drop-shadow-md" style="font-variation-settings: 'FILL' 1">${drop.icon}</span>`;
      }
      
      dropEl.innerHTML = innerHtml;

      const destX = (Math.random() - 0.5) * 40; // Narrow horizontal scatter (-20 to +20)
      const destY = 10 + Math.random() * 20;    // Fall down slightly (10 to 30)

      const randomRot = (Math.random() - 0.5) * 180; // Gentle rotation
      const dur = 1000 + Math.random() * 300; // ドロップもたくさん重ねるために固定
      const del = Math.random() * 100;

      const anim = dropEl.animate([
        { opacity: 0, transform: `translate(0px, 0px) scale(0.5) rotate(0deg)` },
        { opacity: 1, transform: `translate(${destX * 0.4}px, -20px) scale(1.2) rotate(${randomRot * 0.3}deg)`, offset: 0.2 },
        { opacity: 1, transform: `translate(${destX * 0.7}px, ${destY}px) scale(1) rotate(${randomRot * 0.6}deg)`, offset: 0.4 }, // Hit ground
        { opacity: 1, transform: `translate(${destX * 0.85}px, ${destY - 8}px) scale(1) rotate(${randomRot * 0.8}deg)`, offset: 0.6 }, // Small bounce up
        { opacity: 1, transform: `translate(${destX}px, ${destY}px) scale(1) rotate(${randomRot}deg)`, offset: 0.8 }, // Hit ground again
        { opacity: 0, transform: `translate(${destX}px, ${destY}px) scale(0.8) rotate(${randomRot}deg)` } // Fade out
      ], { 
        duration: dur, 
        delay: del, 
        easing: 'ease-out', 
        fill: 'both' 
      });

      const releasePopup = () => {
        anim.onfinish = null;
        anim.oncancel = null;
        anim.cancel();
        this._releasePoolElement(dropEl, popupGeneration);
      };
      anim.onfinish = releasePopup;
      anim.oncancel = releasePopup;
    });
  },

  async saveDeferredData() {
    if (!this._needsSave) return;
    if (this.discoveredMonsters) await GameDB.setGameState('discovered_monsters', this.discoveredMonsters);
    if (this.monsterKills) await GameDB.setGameState('monster_kills', this.monsterKills);
    if (this._pendingRanchSave) {
      await GameDB.setGameState('ranch_data', this._pendingRanchSave);
      this._pendingRanchSave = null;
    }
    if (this.currentGold !== undefined) await GameDB.setGameState('gold', this.currentGold);
    if (this._pendingItemDrops) {
      const materialCapacity = getMaterialCapacity();
      for (const [itemId, qty] of Object.entries(this._pendingItemDrops)) {
        const mat = MATERIALS_MAP.get(itemId);
        if (mat) {
          const currentItem = await GameDB.getInventoryItem(itemId) || { id: itemId, quantity: 0, type: 'material', ...mat };
          const currentQuantity = Math.max(0, Number(currentItem.quantity) || 0);
          const newQuantity = currentQuantity + qty;
          // 旧バージョンですでに上限を超えた在庫は、ドロップ保存時にも減らさない。
          currentItem.quantity = currentQuantity >= materialCapacity
            ? currentQuantity
            : Math.min(newQuantity, materialCapacity);
          await GameDB.putInventoryItem(currentItem);
        }
      }
      this._pendingItemDrops = {};
    }
    if (this._pendingEquipmentDrops) {
      for (const equipment of this._pendingEquipmentDrops) {
        await GameDB.putEquipment(equipment);
      }
      this._pendingEquipmentDrops = [];
    }
    this._needsSave = false;
  },

  async endBattle(isWin, text, showModal = true) {
    this.stopAtbLoop();
    this.activeCharacter = null;
    if (showModal) playSoundEffect(isWin ? 'victory' : 'defeat', { automatic: this.isAutoBattle });
    
    await this.saveDeferredData();
    await this.savePartyState();

    if (isWin) {
      await recordCompletedDungeonFloor(this.currentDungeonId, this.currentFloorNum);
    }

    if (!showModal) {
      sessionStorage.removeItem('autoBattleMode');
      this.autoBattleMode = 'none';
      setLockScreenActivity('battle', false, { mode: 'none' });
      window.location.hash = '/dungeon';
      return;
    }

    if (isWin) {
      this.isDungeonClear = this.currentFloorNum >= this.dungeonDef.floors.length;
      
      if (this.isDungeonClear) {

        // Store a durable clear marker before moving floors or starting another
        // automatic lap. This also completes the matching special quest.
        await SpecialQuestManager.completeDungeon(this.currentDungeonId);

        // 解放済みのダンジョンIDのリストを取得
        let unlocked = await GameDB.getGameState('unlockedDungeons') || ['slime_forest'];
        const dungeonIndex = DUNGEONS.findIndex(d => d.id === this.currentDungeonId);
        if (dungeonIndex !== -1 && dungeonIndex + 1 < DUNGEONS.length) {
          const nextDungeon = DUNGEONS[dungeonIndex + 1];
          if (!unlocked.includes(nextDungeon.id)) {
            unlocked.push(nextDungeon.id);
            await GameDB.setGameState('unlockedDungeons', unlocked);
          }
        }
      }
      
      if (this.isDungeonClear && this.autoBattleMode !== 'floor') {
        if (this.autoBattleMode === 'dungeon') {
          this.autoNextTimer = this._scheduleBattleTimeout(async () => {
            await GameDB.setGameState('currentFloor', 1);
            this.isDungeonClear = false;
            this.resetBattleState(true);
            this.init();
          }, 1500 / this.speedMult, true);
          return;
        }

        this.elements.resultOverlay.innerHTML = `
          <div class="flex flex-col items-center w-full max-w-[340px] px-4 py-6 overflow-y-auto max-h-full scrollbar-none text-center">
            <h2 class="text-4xl font-black tracking-widest text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-bounce mb-6">VICTORY</h2>
            <p class="text-gray-255 font-bold mb-8 text-sm">ダンジョンの最深部に到達しました！</p>
            <button id="btn-result-ok" class="w-full py-3.5 bg-yellow-600 active:bg-yellow-500 active:scale-95 text-white rounded-xl font-bold text-sm transition-all shadow-[0_4px_15px_rgba(250,204,21,0.3)] cursor-pointer">
              ダンジョン踏破！街へ戻る
            </button>
          </div>
        `;
        const okBtn = this.elements.resultOverlay.querySelector('#btn-result-ok');
        if (okBtn) {
          okBtn.onclick = () => {
            this.elements.resultOverlay.classList.add('hidden');
            sessionStorage.removeItem('autoBattleMode');
            this.autoBattleMode = 'none';
            setLockScreenActivity('battle', false, { mode: 'none' });
            window.location.hash = '/dungeon';
          };
        }
        this.elements.resultOverlay.classList.remove('hidden');
        return;
      }

      if (this.autoBattleMode === 'floor') {
        this.autoNextTimer = this._scheduleBattleTimeout(async () => {
          this.resetBattleState(true);
          this.init();
        }, 1500 / this.speedMult, true);
        return;
      }

      // dungeon mode or manual: advance to next floor
      this.autoNextTimer = this._scheduleBattleTimeout(async () => {
        await GameDB.setGameState('currentFloor', this.currentFloorNum + 1);
        this.resetBattleState(true);
        this.init();
      }, 1500 / this.speedMult, true);
      return;
    } else {
      const innFee = calculatePartyInnFee(this.party);
      for (const p of this.party) {
        const stats = calcFinalStats(p, this.equipMap);
        p.hp.current = stats.hp || p.hp.max;
        p.mp.current = stats.mp || p.mp.max;
        p.isDead = false;
        if (this.clearEntityStatuses) {
          this.clearEntityStatuses(p);
        }
      }
      
      const currentGold = await GameDB.getGameState('gold') || 0;
      const actualFee = Math.min(innFee, currentGold);
      const newGold = currentGold - actualFee;
      await GameDB.setGameState('gold', newGold);
      await this.savePartyState(); // Save healed state
      
      const goldDisplay = document.getElementById('header-gold-display');
      if (goldDisplay) goldDisplay.textContent = `${formatNumber(newGold)}`;

      this.isDungeonClear = false;

      // ── 周回中の死亡時の探索継続 ──
      const continueOnDeath = localStorage.getItem('continueOnDeath') === 'true';
      let willAutoRetry = false;
      if (continueOnDeath && this.autoBattleMode !== 'none') {
        if (actualFee >= innFee) {
          // Gold was sufficient — will auto-retry after showing defeat screen
          willAutoRetry = true;
          if (this.autoBattleMode === 'dungeon') {
            await GameDB.setGameState('currentFloor', 1);
          }
        } else {
          // Gold insufficient — disable the setting
          localStorage.setItem('continueOnDeath', 'false');
        }
      }
      // 敗北時のUIをカスタム構築
      const lastKilledBy = this.lastKilledBy || {
        monsterName: '未知のモンスター',
        actionName: '不明な攻撃',
        monsterImage: './assets/job/job_norvice.webp'
      };

      let itemsHtml = '';
      if (this.obtainedItems && this.obtainedItems.length > 0) {
        itemsHtml = renderItemTabHtml(this.obtainedItems, 'grid-cols-4');
      } else {
        itemsHtml = '<div class="text-[10px] text-gray-500 flex items-center justify-center h-20">獲得したアイテムはありません</div>';
      }

      this.elements.resultOverlay.innerHTML = `
        <div class="flex flex-col items-center w-full max-w-[340px] px-4 py-6 overflow-y-auto max-h-full scrollbar-none">
          <h2 class="text-4xl font-black tracking-widest text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-pulse mb-5">DEFEAT</h2>
          
          <!-- 死因セクション -->
          <div class="w-full bg-red-950/20 border border-red-900/40 rounded-xl p-3 mb-4 flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <div class="w-12 h-12 bg-gray-900 rounded-lg border border-red-500/30 overflow-hidden flex items-center justify-center shrink-0 p-1 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <img src="${lastKilledBy.monsterImage}" class="w-full h-full object-contain" onerror="this.src='./assets/job/job_norvice.webp'">
            </div>
            <div class="flex-1 flex flex-col justify-center min-w-0 text-left">
              <span class="text-[8px] text-red-400/80 font-bold uppercase tracking-wider">戦闘不能原因</span>
              <p class="text-[11px] text-gray-250 font-bold leading-tight mt-0.5 break-words">
                <span class="text-red-400 font-extrabold">${lastKilledBy.monsterName}</span> の<br>
                <span class="text-amber-400 font-extrabold">${lastKilledBy.actionName}</span> によって全滅した...
              </p>
            </div>
          </div>

          <!-- 今回の探索結果 (Gold / EXP) -->
          <div class="w-full bg-gray-800/80 p-2 rounded-lg border border-gray-700 shadow-sm mb-4 flex justify-around">
            <div class="flex flex-col items-center">
              <span class="text-[9px] text-gray-400 font-bold mb-1">獲得 Gold</span>
              <span class="text-xs text-yellow-400 font-bold">+ ${this.obtainedGold || 0} G</span>
            </div>
            <div class="flex flex-col items-center">
              <span class="text-[9px] text-gray-400 font-bold mb-1">獲得 EXP</span>
              <span class="text-xs text-blue-400 font-bold">+ ${this.obtainedExp || 0} EXP</span>
            </div>
          </div>

          <!-- 獲得アイテムセクション -->
          <div class="w-full flex flex-col mb-5">
            <div class="flex items-center gap-1 text-[11px] font-black text-gray-300 tracking-wider mb-2 border-b border-gray-850 pb-1">
              <span class="material-symbols-outlined text-[14px] text-cyan-400">backpack</span>
              <span>獲得したアイテム</span>
            </div>
            <div class="max-h-[160px] overflow-y-auto w-full bg-gray-900/60 p-2 border border-gray-850 rounded-lg shadow-inner custom-scrollbar">
              ${itemsHtml}
            </div>
          </div>

          <!-- 救出・治療費の表示 -->
          <div class="text-center mb-5 px-2">
            <p class="text-[10px] text-gray-400 leading-relaxed">
              パーティーは救出され、治療を受けました。<br>
              <span class="text-gray-300 font-bold bg-slate-950/60 border border-slate-850 px-2 py-0.5 rounded inline-block mt-1">
                救出・治療費: <span class="text-red-400 font-black">-${actualFee.toLocaleString()} G</span>
              </span>
            </p>
          </div>

          <!-- 戻るボタン -->
          <button id="btn-result-ok" class="w-full py-3 bg-red-950/80 active:bg-red-900 active:scale-95 text-red-100 border border-red-800/40 rounded-xl font-bold text-xs transition-all shadow-[0_4px_12px_rgba(239,68,68,0.15)] cursor-pointer">
            街へ戻る
          </button>
        </div>
      `;

      const okBtn = this.elements.resultOverlay.querySelector('#btn-result-ok');

      if (willAutoRetry) {
        // Show countdown on the button
        let remaining = 5;
        const countdownInterval = 1000 / Math.max(1, this.speedMult);
        okBtn.textContent = `再突入まで ${remaining} 秒... (タップで中止)`;
        const tickAutoRetry = () => {
          remaining--;
          if (remaining <= 0) {
            this.autoRetryTimer = null;
            this.elements.resultOverlay.classList.add('hidden');
            this.resetBattleState(true);
            this.init();
          } else {
            okBtn.textContent = `再突入まで ${remaining} 秒... (タップで中止)`;
            this.autoRetryTimer = this._scheduleBattleTimeout(tickAutoRetry, countdownInterval, true);
          }
        };
        this.autoRetryTimer = this._scheduleBattleTimeout(tickAutoRetry, countdownInterval, true);
      }

      if (okBtn) {
        okBtn.onclick = () => {
          if (this.autoRetryTimer) {
            clearTimeout(this.autoRetryTimer);
            this.autoRetryTimer = null;
          }
          this.elements.resultOverlay.classList.add('hidden');
          sessionStorage.removeItem('autoBattleMode');
          this.autoBattleMode = 'none';
          setLockScreenActivity('battle', false, { mode: 'none' });
          window.location.hash = '/dungeon';
        };
      }

      this.elements.resultOverlay.classList.remove('hidden');
    }
  },

  async savePartyState() {
    const TRANSIENT_FIELDS = [
      'activeAilment',
      '_defBuffTurns', '_defBuffPercent', '_defBuffAmount',
      '_mdefBuffTurns', '_mdefBuffPercent', '_mdefBuffAmount',
      '_atkBuffTurns', '_atkBuffPercent', '_atkBuffAmount',
      '_matkBuffTurns', '_matkBuffPercent', '_matkBuffAmount',
      '_provokeTurns', '_provokeChance',
      '_guardianCoverTurns', '_guardianCoverReduction', '_guardianLastBastionUsed',
      '_ailmentResistBuffTurns', '_ailmentResistBuffAmount',
      '_barrierTurns', '_barrierHp',
      'atkDebuffTurns', 'atkDebuffPercent',
      'defDebuffTurns', 'defDebuffPercent',
      '_regenTurns', '_regenHp',
      '_manaFlowTurns', '_manaFlowAmount', '_conductorHarmony', '_entertainerHype', '_slimeSingerNotes',
      '_dragoonSpirit', '_shinraSigils', '_soulReaperCorpses'
    ];

    for (const p of this.party) {
      const original = await GameDB.getCharacter(p.id);
      if (original) {
        original.level = p.level;
        original.jobLevel = p.jobLevel;
        original.sp = p.sp;
        original.baseStats = p.baseStats;
        original.hp = p.hp;
        original.mp = p.mp;
        original.exp = p.exp;
        original.jp = p.jp;

        for (const field of TRANSIENT_FIELDS) {
          if (p[field] !== undefined) {
            original[field] = p[field];
          } else {
            delete original[field];
          }
        }

        await GameDB.putCharacter(original);
      }
    }
  },
};
