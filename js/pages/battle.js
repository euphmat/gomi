import { GameDB } from '../data/database.js';
import { MONSTERS } from '../definitions/monsters.js';
import { DUNGEONS } from '../definitions/dungeons.js';
import { MATERIALS } from '../definitions/materials.js';
import { calcFinalStats, buildEquipmentMap } from '../data/stat-calculator.js';
import { JOBS } from '../definitions/jobs.js';

class BattleManager {
  constructor(container) {
    this.container = container;
    this.party = [];
    this.enemies = [];
    
    this.activeCharacter = null;
    this.atbLoop = null;
    
    this.elements = {
      enemyArea: container.querySelector('#enemy-area'),
      partyArea: container.querySelector('#party-area'),
      commandBlocker: container.querySelector('#command-blocker'),
      btnAttack: container.querySelector('#btn-attack'),
      btnRun: container.querySelector('#btn-run'),
      resultOverlay: container.querySelector('#battle-result'),
      resultTitle: container.querySelector('#result-title'),
      resultText: container.querySelector('#result-text'),
      btnResultOk: container.querySelector('#btn-result-ok')
    };
    
    this.selectedEnemyTarget = null;
  }
  
  async init() {
    const rawParty = await GameDB.getAllCharacters();
    const rawEquip = await GameDB.getAllEquipment();
    this.equipMap = buildEquipmentMap(rawEquip);

    this.currentDungeonId = await GameDB.getGameState('currentDungeon') || 'slime_forest';
    this.currentFloorNum = await GameDB.getGameState('currentFloor') || 1;
    this.dungeonDef = DUNGEONS.find(d => d.id === this.currentDungeonId);
    this.floorDef = this.dungeonDef.floors.find(f => f.level === this.currentFloorNum) || this.dungeonDef.floors[this.dungeonDef.floors.length - 1];

    this.party = rawParty.map((char, index) => {
      const stats = calcFinalStats(char, this.equipMap);
      return {
        ...char,
        stats,
        atb: 0,
        index,
        isDead: char.hp.current <= 0,
        elementId: `party-${index}`
      };
    });

    this.enemies = this.floorDef.monsters.map((monsterId, i) => {
      const monsterDef = MONSTERS.find(m => m.id === monsterId);
      return {
        ...monsterDef,
        uniqueId: `enemy-${i}`,
        currentHp: monsterDef.stats.hp,
        maxHp: monsterDef.stats.hp,
        atb: 0,
        isDead: false,
        elementId: `enemy-${i}`
      };
    });

    this.renderEntities();
    this.setupListeners();
    this.startAtbLoop();
  }

  renderEntities() {
    this.elements.enemyArea.innerHTML = this.enemies.map(e => `
      <div id="${e.elementId}" class="enemy-card relative flex flex-col items-center gap-1 ${e.isDead ? '' : 'cursor-pointer hover:scale-105 transition-transform'}" data-id="${e.uniqueId}">
        <div class="relative w-16 h-16 bg-gray-800 rounded-lg border-2 ${this.selectedEnemyTarget === e ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'border-gray-700'} overflow-hidden ${e.isDead ? 'opacity-0' : ''} transition-opacity duration-500">
          <img src="${e.image}" class="w-full h-full object-contain p-1 drop-shadow-md">
        </div>
        <div class="w-16 bg-gray-900 h-2 rounded overflow-hidden shadow-inner ${e.isDead ? 'opacity-0' : ''}">
          <div class="bg-red-500 h-full transition-all duration-300" style="width: ${(e.currentHp / e.maxHp) * 100}%"></div>
        </div>
        <div class="w-16 bg-gray-900 h-1 rounded overflow-hidden mt-0.5 shadow-inner ${e.isDead ? 'opacity-0' : ''}">
          <div id="${e.elementId}-atb" class="bg-orange-500 h-full" style="width: ${e.atb / 10}%"></div>
        </div>
      </div>
    `).join('');

    this.elements.partyArea.innerHTML = this.party.map(p => `
      <div id="${p.elementId}" class="relative flex flex-col bg-gray-800/80 rounded border ${this.activeCharacter === p ? 'border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'border-gray-700'} p-1 ${p.isDead ? 'opacity-40 grayscale' : 'transition-all'}">
        <div class="flex flex-col items-center mb-1">
          <div class="w-10 h-10 rounded-full border border-gray-600 mb-0.5 overflow-hidden shadow-md bg-gray-800">
            <img src="${p.iconImage}" class="w-full h-full object-cover">
          </div>
          <span class="text-[11px] font-bold text-gray-200 truncate w-full text-center drop-shadow">${p.name}</span>
          <div class="w-[85%] h-1.5 bg-gray-900 rounded overflow-hidden mt-0.5 shadow-inner">
            <div id="${p.elementId}-atb" class="bg-yellow-400 h-full" style="width: ${p.atb / 10}%"></div>
          </div>
        </div>
        
        <div class="flex flex-col gap-[3px] mb-1.5">
          <div class="flex items-center gap-0.5">
            <span class="text-[9px] font-bold text-red-400 w-3.5">HP</span>
            <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
              <div class="bg-red-600 h-full transition-all duration-300" style="width: ${(p.hp.current / p.hp.max) * 100}%"></div>
              <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${Math.floor(p.hp.current)}/${p.hp.max}</div>
            </div>
          </div>
          <div class="flex items-center gap-0.5">
            <span class="text-[9px] font-bold text-blue-400 w-3.5">MP</span>
            <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
              <div class="bg-blue-600 h-full transition-all duration-300" style="width: ${(p.mp.current / p.mp.max) * 100}%"></div>
              <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${Math.floor(p.mp.current)}/${p.mp.max}</div>
            </div>
          </div>
          <div class="flex items-center gap-0.5">
            <span class="text-[9px] font-bold text-green-400 w-3.5">EX</span>
            <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
              <div class="bg-green-600 h-full" style="width: ${(p.exp.current / p.exp.max) * 100}%"></div>
              <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${Math.floor(p.exp.current)}/${p.exp.max}</div>
            </div>
          </div>
          <div class="flex items-center gap-0.5">
            <span class="text-[9px] font-bold text-purple-400 w-3.5">JP</span>
            <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
              <div class="bg-purple-600 h-full" style="width: ${(p.jp.current / p.jp.max) * 100}%"></div>
              <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${Math.floor(p.jp.current)}/${p.jp.max}</div>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-0 text-[11px] text-gray-400 mt-auto leading-tight w-full px-0.5 pb-0.5">
          <div class="flex justify-between items-center"><span>ATK</span><span class="text-gray-200 font-bold">${p.stats.atk}</span></div>
          <div class="flex justify-between items-center"><span>DEF</span><span class="text-gray-200 font-bold">${p.stats.def}</span></div>
          <div class="flex justify-between items-center"><span>MAT</span><span class="text-gray-200 font-bold">${p.stats.matk}</span></div>
          <div class="flex justify-between items-center"><span>MDF</span><span class="text-gray-200 font-bold">${p.stats.mdef}</span></div>
          <div class="flex justify-between items-center"><span>SPD</span><span class="text-gray-200 font-bold">${p.stats.spd}</span></div>
        </div>
      </div>
    `).join('');

    if (this.activeCharacter) {
      this.elements.commandBlocker.classList.add('hidden');
    } else {
      this.elements.commandBlocker.classList.remove('hidden');
    }

    this.elements.enemyArea.querySelectorAll('.enemy-card').forEach(el => {
      el.addEventListener('click', (e) => {
        const uniqueId = e.currentTarget.dataset.id;
        const enemy = this.enemies.find(en => en.uniqueId === uniqueId);
        if (enemy && !enemy.isDead) {
          this.selectedEnemyTarget = enemy;
          this.renderEntities();
        }
      });
    });
  }
  
  setupListeners() {
    this.elements.btnRun.onclick = () => {
      if (!this.activeCharacter) return;
      this.endBattle(false, '逃げ出した！');
    };

    this.elements.btnAttack.onclick = () => {
      if (!this.activeCharacter) return;
      
      if (!this.selectedEnemyTarget || this.selectedEnemyTarget.isDead) {
        this.selectedEnemyTarget = this.enemies.find(e => !e.isDead);
      }
      
      if (!this.selectedEnemyTarget) return;

      this.executeAttack(this.activeCharacter, this.selectedEnemyTarget, true);
    };

    this.elements.btnResultOk.onclick = async () => {
      const isWin = this.enemies.every(e => e.isDead);
      
      if (isWin && !this.isDungeonClear) {
        // Proceed to next floor
        await GameDB.setGameState('currentFloor', this.currentFloorNum + 1);
        this.elements.resultOverlay.classList.add('hidden');
        this.party = [];
        this.enemies = [];
        this.activeCharacter = null;
        this.selectedEnemyTarget = null;
        this.init();
      } else {
        // Return to town
        window.location.hash = '/dungeon';
      }
    };
  }

  startAtbLoop() {
    this.atbLoop = setInterval(() => {
      if (this.activeCharacter) return;
      
      let nextActor = null;
      
      this.party.forEach(p => {
        if (p.isDead) return;
        p.atb += p.stats.spd * 1.5;
        if (p.atb >= 1000) {
          p.atb = 1000;
          if (!nextActor) nextActor = { type: 'party', entity: p };
        }
        
        const atbEl = this.container.querySelector(`#${p.elementId}-atb`);
        if(atbEl) atbEl.style.width = `${p.atb / 10}%`;
      });
      
      this.enemies.forEach(e => {
        if (e.isDead) return;
        e.atb += e.stats.spd * 1.5;
        if (e.atb >= 1000) {
          e.atb = 1000;
          if (!nextActor) nextActor = { type: 'enemy', entity: e };
        }

        const atbEl = this.container.querySelector(`#${e.elementId}-atb`);
        if(atbEl) atbEl.style.width = `${e.atb / 10}%`;
      });

      if (nextActor) {
        if (nextActor.type === 'party') {
          this.activeCharacter = nextActor.entity;
          this.renderEntities();
        } else {
          this.executeEnemyTurn(nextActor.entity);
        }
      }
    }, 50);
  }

  executeAttack(attacker, defender, isParty) {
    let damage = Math.max(1, attacker.stats.atk - Math.floor(defender.stats.def / 2));
    damage = Math.floor(damage * (0.9 + Math.random() * 0.2));
    
    this.showDamage(defender.elementId, damage);

    if (isParty) {
      defender.currentHp -= damage;
      if (defender.currentHp <= 0) {
        defender.currentHp = 0;
        defender.isDead = true;
        this.processEnemyDeath(defender);
      }
      attacker.atb = 0;
      this.activeCharacter = null;
    } else {
      defender.hp.current -= damage;
      if (defender.hp.current <= 0) {
        defender.hp.current = 0;
        defender.isDead = true;
      }
      attacker.atb = 0;
    }

    this.renderEntities();
    this.checkBattleEnd();
  }

  executeEnemyTurn(enemy) {
    const aliveParty = this.party.filter(p => !p.isDead);
    if (aliveParty.length === 0) return;
    
    const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];
    this.executeAttack(enemy, target, false);
  }

  showDamage(elementId, damage) {
    const el = this.container.querySelector(`#${elementId}`);
    if (!el) return;

    el.classList.add('animate-[shake_0.4s_ease-in-out]');
    setTimeout(() => el.classList.remove('animate-[shake_0.4s_ease-in-out]'), 400);

    const dmgText = document.createElement('div');
    dmgText.textContent = damage;
    dmgText.className = 'absolute top-0 left-1/2 -translate-x-1/2 text-white font-black text-2xl z-30 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pointer-events-none animate-[slide-up_0.6s_ease-out_forwards] text-red-500';
    el.appendChild(dmgText);
    setTimeout(() => dmgText.remove(), 600);
  }

  showLevelUp(elementId) {
    const el = this.container.querySelector(`#${elementId}`);
    if (!el) return;
    const lvlText = document.createElement('div');
    lvlText.textContent = 'LEVEL UP!';
    lvlText.className = 'absolute -top-4 left-1/2 -translate-x-1/2 text-white font-black text-xl z-30 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pointer-events-none animate-[slide-up_1s_ease-out_forwards] text-green-400';
    el.appendChild(lvlText);
    setTimeout(() => lvlText.remove(), 1000);
  }

  checkBattleEnd() {
    const allEnemiesDead = this.enemies.every(e => e.isDead);
    if (allEnemiesDead) {
      this.endBattle(true, '勝利！');
      return;
    }
    
    const allPartyDead = this.party.every(p => p.isDead);
    if (allPartyDead) {
      this.endBattle(false, '全滅した...');
      return;
    }
  }

  async processEnemyDeath(enemy) {
    let drops = [];
    
    // Add Gold
    const gold = enemy.rewards.gold || 0;
    if (gold > 0) {
      const currentGold = await GameDB.getGameState('gold') || 0;
      const newGold = currentGold + gold;
      await GameDB.setGameState('gold', newGold);
      const goldDisplay = document.getElementById('header-gold-display');
      if (goldDisplay) goldDisplay.textContent = ` Gold : ${newGold.toLocaleString()} `;
      drops.push({ text: `+${gold}`, icon: 'paid', color: 'text-yellow-400' });
    }

    // Add EXP / JP to party members
    const exp = enemy.rewards.exp || 0;
    const jp = enemy.rewards.jp || 0;
    if (exp > 0 || jp > 0) {
      for (const p of this.party) {
        if (!p.isDead) {
          if (!p.exp) p.exp = { current: 0, max: 100 };
          if (!p.jp) p.jp = { current: 0, max: 100 };
          p.exp.current += exp;
          p.jp.current += jp;

          let leveledUp = false;

          // Level Up Logic
          while (p.exp.current >= p.exp.max) {
            p.exp.current -= p.exp.max;
            p.exp.max = Math.floor(p.exp.max * 1.2);
            p.level = (p.level || 1) + 1;
            
            const jobGrowth = JOBS[p.jobId]?.statGrowth;
            if (jobGrowth) {
              p.hp.max += jobGrowth.hp;
              p.hp.current += jobGrowth.hp;
              p.mp.max += jobGrowth.mp;
              p.mp.current += jobGrowth.mp;
              p.baseStats.atk += jobGrowth.atk;
              p.baseStats.def += jobGrowth.def;
              p.baseStats.matk += jobGrowth.matk;
              p.baseStats.mdef += jobGrowth.mdef;
              p.baseStats.spd += jobGrowth.spd;
            }
            leveledUp = true;
          }

          // Job Level Up Logic
          while (p.jp.current >= p.jp.max) {
            p.jp.current -= p.jp.max;
            p.jp.max = Math.floor(p.jp.max * 1.2);
            p.jobLevel = (p.jobLevel || 1) + 1;
            p.sp = (p.sp || 0) + 1;
            leveledUp = true;
          }

          if (leveledUp) {
            p.stats = calcFinalStats(p, this.equipMap);
            this.showLevelUp(p.elementId);
            this.renderEntities(); // re-render to update max HP/MP and stats display
          }
        }
      }
      this.savePartyState(); // Save to DB
      if (exp > 0) drops.push({ text: `+${exp} EXP`, icon: 'star', color: 'text-blue-300' });
      if (jp > 0) drops.push({ text: `+${jp} JP`, icon: 'star', color: 'text-purple-300' });
    }

    // Process Drops
    if (enemy.drops) {
      for (const drop of enemy.drops) {
        if (Math.random() <= drop.rate) {
          const mat = MATERIALS.find(m => m.id === drop.itemId);
          if (mat) {
            const currentItem = await GameDB.getInventoryItem(mat.id) || { id: mat.id, quantity: 0, type: 'material', ...mat };
            currentItem.quantity += 1;
            await GameDB.putInventoryItem(currentItem);
            drops.push({ text: mat.name, image: mat.image, color: 'text-white' });
          }
        }
      }
    }

    // Create a drop container overlay for this enemy in the main container
    const el = this.container.querySelector(`#${enemy.elementId}`);
    if (!el) return;
    
    const rect = el.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    const centerX = rect.left - containerRect.left + rect.width / 2;
    const centerY = rect.top - containerRect.top + rect.height / 2;

    const dropContainer = document.createElement('div');
    dropContainer.style.position = 'absolute';
    dropContainer.style.left = `${centerX}px`;
    dropContainer.style.top = `${centerY}px`;
    dropContainer.className = `w-40 -translate-x-1/2 -translate-y-1/2 flex flex-wrap justify-center items-center gap-1.5 z-50 pointer-events-none transition-opacity duration-1000`;
    this.container.appendChild(dropContainer);

    // Show floating elements inside dropContainer
    drops.forEach((drop, i) => {
      setTimeout(() => {
        const dropEl = document.createElement('div');
        dropEl.className = `flex flex-row items-center gap-0.5 animate-[drop-bounce_0.3s_ease-out_forwards] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] bg-black/40 px-1.5 py-0.5 rounded-full`;
        
        let innerHtml = '';
        if (drop.image) {
          innerHtml += `<img src="${drop.image}" class="w-3.5 h-3.5 object-contain">`;
        } else if (drop.icon) {
          innerHtml += `<span class="material-symbols-outlined text-[13px] ${drop.color} drop-shadow-md" style="font-variation-settings: 'FILL' 1">${drop.icon}</span>`;
        }
        
        if (drop.text) {
          innerHtml += `<span class="font-bold text-[9px] tracking-wide ${drop.color} drop-shadow-[0_1px_1px_rgba(0,0,0,1)] leading-none mt-0.5">${drop.text}</span>`;
        }
        
        dropEl.innerHTML = innerHtml;
        dropContainer.appendChild(dropEl);
      }, 150 + i * 70); 
    });

    // Fade out and remove the entire container after 2.5 seconds
    setTimeout(() => {
      dropContainer.style.opacity = '0';
      setTimeout(() => dropContainer.remove(), 1000);
    }, 2500);
  }

  endBattle(isWin, text) {
    clearInterval(this.atbLoop);
    this.activeCharacter = null;
    
    this.savePartyState();

    this.elements.resultTitle.textContent = isWin ? 'VICTORY' : 'DEFEAT';
    this.elements.resultTitle.className = isWin 
      ? 'text-5xl font-black mb-4 tracking-widest text-yellow-400 drop-shadow-lg' 
      : 'text-5xl font-black mb-4 tracking-widest text-red-500 drop-shadow-lg';
    
    let resultText = text;
    if (isWin) {
      this.isDungeonClear = this.currentFloorNum >= this.dungeonDef.floors.length;
      if (this.isDungeonClear) {
        this.elements.btnResultOk.textContent = 'ダンジョン踏破！街へ戻る';
        this.elements.resultText.textContent = 'ダンジョンの最深部に到達しました！';
        this.elements.resultOverlay.classList.remove('hidden');
      } else {
        // Auto-proceed to the next floor after a short delay
        setTimeout(async () => {
          await GameDB.setGameState('currentFloor', this.currentFloorNum + 1);
          this.party = [];
          this.enemies = [];
          this.activeCharacter = null;
          this.selectedEnemyTarget = null;
          this.init();
        }, 1500); // 1.5秒待機してドロップをしっかり見せる
        return; // Don't show modal
      }
    } else {
      this.isDungeonClear = false;
      this.elements.btnResultOk.textContent = '街へ戻る';
      this.elements.resultText.textContent = resultText;
      this.elements.resultOverlay.classList.remove('hidden');
    }
  }

  async addRewards(gold) {
    const currentGold = await GameDB.getGameState('gold') || 0;
    await GameDB.setGameState('gold', currentGold + gold);
  }

  async savePartyState() {
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
        await GameDB.putCharacter(original);
      }
    }
  }
}

export function renderBattlePage() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full bg-[#0b0b19] relative z-20 text-white font-sans overflow-hidden';
  
  // Basic structure
  container.innerHTML = `
    <style>
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-4px); }
        75% { transform: translateX(4px); }
      }
      @keyframes drop-bounce {
        0% { transform: translateY(-10px) scale(0.5); opacity: 0; }
        50% { transform: translateY(0) scale(1.1); opacity: 1; }
        75% { transform: translateY(-3px) scale(1); }
        100% { transform: translateY(0) scale(1); opacity: 1; }
      }
    </style>

    <!-- Scrollable Battle Area (Enemies, Party, Tabs) -->
    <div class="flex-1 flex flex-col overflow-y-auto" style="background: radial-gradient(circle at top, #1a202c 0%, #0b0b19 100%);">
      
      <!-- Enemy Area (Moved higher) -->
      <div id="enemy-area" class="flex justify-center items-start gap-6 mt-1 px-2 pt-1 pb-8">
        <!-- Enemies will be injected here -->
      </div>

      <!-- Party Area -->
      <div id="party-area" class="grid grid-cols-4 gap-1 px-1 mt-1">
        <!-- Party will be injected here -->
      </div>
      
      <!-- Tabs & Tab Content Area -->
      <div class="flex flex-col flex-1 mt-4 px-2 mb-4">
        <!-- Tabs -->
        <div class="flex gap-2">
          <button class="flex-1 py-1.5 bg-green-700 text-white rounded-t-lg text-[11px] font-bold shadow-md">スキル</button>
          <button class="flex-1 py-1.5 bg-gray-800 border-t border-x border-gray-700 text-gray-400 rounded-t-lg text-[11px] font-bold">バックパック</button>
          <button class="flex-1 py-1.5 bg-gray-800 border-t border-x border-gray-700 text-gray-400 rounded-t-lg text-[11px] font-bold">インフォ</button>
        </div>
        <!-- Tab Content -->
        <div class="flex-1 bg-gray-800/40 border border-gray-700 rounded-b-lg rounded-tr-lg p-2 min-h-[120px]">
          <!-- Example content to fill space -->
          <div class="text-xs text-gray-500 flex items-center justify-center h-full">
            （コマンドタブのコンテンツエリア）
          </div>
        </div>
      </div>
      
    </div>

    <!-- Command Area (Fixed at bottom of main, above footer) -->
    <div id="command-area" class="bg-gray-900 border-t border-gray-700 p-2 flex gap-2 shrink-0 h-[72px] relative shadow-[0_-4px_10px_rgba(0,0,0,0.5)]">
      <!-- Overlay block when no active character -->
      <div id="command-blocker" class="absolute inset-0 bg-gray-900/70 z-10 flex items-center justify-center backdrop-blur-[2px]">
        <span class="text-sm font-bold text-gray-300 animate-pulse tracking-wide">行動順を待っています...</span>
      </div>

      <!-- Actions -->
      <button id="btn-auto" class="flex-1 bg-blue-900 hover:bg-blue-800 rounded-lg font-bold text-[11px] border border-blue-700 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-blue-100">
        <span class="material-symbols-outlined text-[20px] mb-0.5 text-blue-400">auto_awesome</span>自動戦闘
      </button>
      <button id="btn-attack" class="flex-[1.5] bg-red-700 hover:bg-red-600 rounded-lg font-bold text-sm shadow-lg border border-red-500 flex flex-col items-center justify-center transition-all active:scale-95 text-red-50">
        <span class="material-symbols-outlined text-[24px] mb-0.5 text-red-300">swords</span>攻撃
      </button>
      <button id="btn-run" class="flex-1 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold text-[11px] border border-gray-600 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-gray-300">
        <span class="material-symbols-outlined text-[20px] mb-0.5 text-gray-400">directions_run</span>逃げる
      </button>
    </div>
    
    <!-- Result Overlay -->
    <div id="battle-result" class="hidden absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
       <h2 id="result-title" class="text-5xl font-black mb-4 tracking-widest text-yellow-400 drop-shadow-lg">VICTORY</h2>
       <p id="result-text" class="text-gray-300 mb-10 text-sm font-bold">経験値とゴールドを獲得しました。</p>
       <button id="btn-result-ok" class="px-10 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-lg transition-transform active:scale-90 cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.5)]">
         街へ戻る
       </button>
    </div>
  `;

  setTimeout(() => {
    new BattleManager(container).init();
  }, 0);

  return container;
}
