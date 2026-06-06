import { GameDB } from '../data/database.js';
import { MONSTERS } from '../definitions/monsters.js';
import { DUNGEONS } from '../definitions/dungeons.js';
import { MATERIALS } from '../definitions/materials.js';
import { calcFinalStats, buildEquipmentMap } from '../data/stat-calculator.js';
import { JOBS } from '../jobs/index.js';

class BattleManager {
  constructor(container) {
    this.container = container;
    this.dungeonDef = null;
    this.currentFloorNum = 1;
    this.party = [];
    this.enemies = [];
    this.activeCharacter = null;
    this.activeEnemy = null;
    this.selectedEnemyTarget = null;
    this.selectedPartyMember = null;
    this.autoBattleMode = sessionStorage.getItem('autoBattleMode') || 'none'; // 'none', 'floor', 'dungeon'
    this.equipMap = {};
    this.isDungeonClear = false;
    this.currentTab = 'skill';
    this.obtainedItems = [];

    this.elements = {
      enemyArea: container.querySelector('#enemy-area'),
      partyArea: container.querySelector('#party-area'),
      commandBlocker: container.querySelector('#command-blocker'),
      btnAttack: container.querySelector('#btn-attack'),
      btnRun: container.querySelector('#btn-run'),
      btnAutoFloor: container.querySelector('#btn-auto-floor'),
      btnAutoDungeon: container.querySelector('#btn-auto-dungeon'),
      resultOverlay: container.querySelector('#battle-result'),
      resultTitle: container.querySelector('#result-title'),
      resultText: container.querySelector('#result-text'),
      btnResultOk: container.querySelector('#btn-result-ok'),
      tabBtnSkill: container.querySelector('#tab-btn-skill'),
      tabBtnItem: container.querySelector('#tab-btn-item'),
      tabBtnInfo: container.querySelector('#tab-btn-info'),
      tabContent: container.querySelector('#tab-content')
    };
    
    this.elements.btnAttack.disabled = false;
    this.elements.btnRun.disabled = false;
    this.elements.btnAutoFloor.disabled = false;
    this.elements.btnAutoDungeon.disabled = false;
    this.autoSkillStates = {};
  }
  
  async init() {
    // Stop existing ATB loop before re-initializing
    if (this.atbLoop) {
      clearInterval(this.atbLoop);
      this.atbLoop = null;
    }

    const isReinit = this.elements.enemyArea.children.length > 0;

    const rawParty = await GameDB.getAllCharacters();
    const rawEquip = await GameDB.getAllEquipment();
    this.equipMap = buildEquipmentMap(rawEquip);

    this.currentDungeonId = await GameDB.getGameState('currentDungeon') || 'slime_forest';
    this.currentFloorNum = await GameDB.getGameState('currentFloor') || 1;
    this.dungeonDef = DUNGEONS.find(d => d.id === this.currentDungeonId);
    this.floorDef = this.dungeonDef.floors.find(f => f.level === this.currentFloorNum) || this.dungeonDef.floors[this.dungeonDef.floors.length - 1];

    // Update Header Location
    const headerLoc = document.getElementById('header-location');
    if (headerLoc && this.dungeonDef) {
      headerLoc.textContent = `${this.dungeonDef.name} ${this.currentFloorNum}F`;
    }

    this.party = rawParty.map((char, index) => {
      const stats = calcFinalStats(char, this.equipMap);
      
      // Cap current HP/MP to true max in case equipment was changed
      const trueMaxHp = stats.hp || char.hp.max;
      const trueMaxMp = stats.mp || char.mp.max;
      char.hp.current = Math.min(char.hp.current, trueMaxHp);
      char.mp.current = Math.min(char.mp.current, trueMaxMp);

      return {
        ...char,
        stats,
        atb: Math.floor(Math.random() * 501),
        index,
        isDead: char.hp.current <= 0,
        elementId: `party-${index}`
      };
    });
    
    this.selectedPartyMember = this.party[0];

    const monsterIds = this.resolveMonsters(this.floorDef.monsters);

    this.enemies = monsterIds.map((monsterId, i) => {
      const monsterDef = MONSTERS.find(m => m.id === monsterId);
      const baseStats = { hp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0, ...(monsterDef.stats || {}) };
      const attackElements = { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 };
      const attackAilments = { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 };
      const elementResist = { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0, ...(monsterDef.elements || {}) };
      const ailmentResist = { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0, ...(monsterDef.ailments || {}) };
      
      return {
        ...monsterDef,
        stats: { ...baseStats, attackElements, attackAilments, elementResist, ailmentResist },
        uniqueId: `enemy-${i}`,
        currentHp: baseStats.hp,
        maxHp: baseStats.hp,
        atb: Math.floor(Math.random() * 501),
        isDead: false,
        elementId: `enemy-${i}`
      };
    });

    // Force full rebuild of enemy area on re-init
    if (isReinit) {
      this.elements.enemyArea.innerHTML = '';
    }
    this.renderEntities();
    // Only setup button listeners once (on first init)
    if (!this._listenersSetup) {
      this.setupListeners();
      this._listenersSetup = true;
    } else {
      // Re-init: just update command UI and tab styles
      this.updateCommandUI();
      this.updateTabStyles();
    }
    this.startAtbLoop();
  }

  /**
   * モンスター出現テーブルを解決する
   * 簡略形式: { 'slime': 2, 'slime_red': 1, weight: 30 }
   * 複合形式: { members: [{id, count}, ...], weight }
   * 単一形式: { id, count, weight }
   * 旧形式: ['monster_id', ...]
   */
  resolveMonsters(monsterDefs) {
    if (!monsterDefs || monsterDefs.length === 0) return [];

    // 旧形式（文字列配列）の場合はそのまま返す
    if (typeof monsterDefs[0] === 'string') {
      return [...monsterDefs];
    }

    // weightに基づいてランダムに1グループを選出
    const totalWeight = monsterDefs.reduce((sum, m) => sum + (m.weight || 0), 0);
    const roll = Math.random() * totalWeight;

    let cumulative = 0;
    let selectedEntry = monsterDefs[monsterDefs.length - 1]; // fallback

    for (const entry of monsterDefs) {
      cumulative += (entry.weight || 0);
      if (roll < cumulative) {
        selectedEntry = entry;
        break;
      }
    }

    const result = [];
    
    if (selectedEntry.members) {
      for (const e of selectedEntry.members) {
        result.push(...Array(e.count || 1).fill(e.id));
      }
    } else if (selectedEntry.id) {
      result.push(...Array(selectedEntry.count || 1).fill(selectedEntry.id));
    } else {
      for (const [key, value] of Object.entries(selectedEntry)) {
        if (key !== 'weight') {
          result.push(...Array(value).fill(key));
        }
      }
    }

    return result;
  }

  renderEntities() {
    if (this.elements.enemyArea.children.length > 0) {
      this.updateEntities();
      return;
    }

    this.elements.enemyArea.innerHTML = this.enemies.map(e => `
      <div id="${e.elementId}" class="enemy-card relative flex flex-col items-center gap-1 flex-1 min-w-[2.5rem] max-w-[4rem] ${e.isDead ? '' : 'cursor-pointer hover:scale-105 transition-transform'}" data-id="${e.uniqueId}">
        <div class="relative w-full aspect-square bg-gray-800 rounded-lg border-2 ${this.selectedEnemyTarget === e ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'border-gray-700'} overflow-hidden ${e.isDead ? 'opacity-0' : ''} transition-opacity duration-500">
          <img src="${e.image}" class="w-full h-full object-contain p-1 drop-shadow-md" onerror="this.style.display='none'">
        </div>
        <div class="w-full bg-gray-900 h-2 rounded overflow-hidden shadow-inner shrink-0 ${e.isDead ? 'opacity-0' : ''}">
          <div class="bg-red-500 h-full transition-all duration-300" style="width: ${(e.currentHp / e.maxHp) * 100}%"></div>
        </div>
        <div class="w-full bg-gray-900 h-1 rounded overflow-hidden mt-0.5 shadow-inner shrink-0 ${e.isDead ? 'opacity-0' : ''}">
          <div id="${e.elementId}-atb" class="bg-orange-500 h-full" style="width: ${e.atb / 10}%"></div>
        </div>
      </div>
    `).join('');

    if (this.elements.partyArea.children.length === 0) {
      this.elements.partyArea.innerHTML = this.party.map(p => {
        let borderClass = 'border-gray-700';
        if (this.activeCharacter === p) {
          borderClass = 'border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]';
        } else if (this.isAutoBattle && this.selectedPartyMember === p) {
          borderClass = 'border-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]';
        }
        return `
        <div id="${p.elementId}" class="party-card relative flex flex-col bg-gray-800/80 rounded border ${borderClass} p-1 ${p.isDead ? 'opacity-40 grayscale' : 'transition-all cursor-pointer hover:scale-[1.02]'}">
          <div class="flex flex-col mb-1.5 w-full">
            <div class="flex items-center gap-1.5 w-full mb-1 px-0.5">
              <!-- ICON -->
              <div class="w-10 h-10 rounded border border-gray-600 overflow-hidden shadow-md bg-gray-800 shrink-0">
                <img src="${p.iconImage}" class="w-full h-full object-cover" onerror="this.style.display='none'">
              </div>
              <!-- LV / JLV / SP -->
              <div class="flex flex-col flex-1 text-[9px] text-gray-300 font-bold leading-tight justify-center gap-[2px]">
                <div class="flex justify-between items-center bg-gray-900/50 px-1 rounded-sm"><span class="text-gray-400">LV:</span> <span class="${p.elementId}-lv text-gray-100">${p.level || 1}</span></div>
                <div class="flex justify-between items-center bg-gray-900/50 px-1 rounded-sm"><span class="text-gray-400">JLV:</span> <span class="${p.elementId}-jlv text-gray-100">${p.jobLevel || 1}</span></div>
                <div class="flex justify-between items-center bg-gray-900/50 px-1 rounded-sm"><span class="text-gray-400">SP:</span> <span class="${p.elementId}-sp text-gray-100">${p.sp || 0}</span></div>
              </div>
            </div>
            <!-- Name & ATB -->
            <div class="px-0.5">
              <div class="text-[10px] font-bold text-gray-100 truncate w-full drop-shadow mb-0.5">${p.name}</div>
              <div class="w-full h-1.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
                <div id="${p.elementId}-atb" class="bg-yellow-400 h-full" style="width: ${p.atb / 10}%"></div>
              </div>
            </div>
          </div>
          
          <div class="flex flex-col gap-[3px] mb-1.5">
            <div class="flex items-center gap-0.5">
              <span class="text-[9px] font-bold text-red-400 w-3.5">HP</span>
              <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
                <div class="bg-red-600 h-full transition-all duration-300" style="width: ${(p.hp.current / (p.stats.hp || p.hp.max)) * 100}%"></div>
                <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${Math.floor(p.hp.current)}/${p.stats.hp || p.hp.max}</div>
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
                <div class="bg-green-600 h-full transition-all duration-300" style="width: ${(p.exp.current / p.exp.max) * 100}%"></div>
                <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${Math.floor(p.exp.current)}/${p.exp.max}</div>
              </div>
            </div>
            <div class="flex items-center gap-0.5">
              <span class="text-[9px] font-bold text-purple-400 w-3.5">JP</span>
              <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
                <div class="bg-purple-600 h-full transition-all duration-300" style="width: ${(p.jp.current / p.jp.max) * 100}%"></div>
                <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${Math.floor(p.jp.current)}/${p.jp.max}</div>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-[1px] text-[9px] text-gray-400 mt-auto leading-tight w-full px-0.5 pb-0.5">
            <div class="flex justify-between items-center bg-gray-900/40 rounded px-1 py-0.5">
              <div class="flex items-center gap-[3px]"><span class="material-symbols-outlined text-red-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">swords</span><span class="font-bold tracking-wider">ATK</span></div>
              <span class="text-gray-100 font-black drop-shadow-md">${p.stats.atk}</span>
            </div>
            <div class="flex justify-between items-center bg-gray-900/40 rounded px-1 py-0.5">
              <div class="flex items-center gap-[3px]"><span class="material-symbols-outlined text-slate-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">shield</span><span class="font-bold tracking-wider">DEF</span></div>
              <span class="text-gray-100 font-black drop-shadow-md">${p.stats.def}</span>
            </div>
            <div class="flex justify-between items-center bg-gray-900/40 rounded px-1 py-0.5">
              <div class="flex items-center gap-[3px]"><span class="material-symbols-outlined text-purple-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">auto_awesome</span><span class="font-bold tracking-wider">MAT</span></div>
              <span class="text-gray-100 font-black drop-shadow-md">${p.stats.matk}</span>
            </div>
            <div class="flex justify-between items-center bg-gray-900/40 rounded px-1 py-0.5">
              <div class="flex items-center gap-[3px]"><span class="material-symbols-outlined text-indigo-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">security</span><span class="font-bold tracking-wider">MDF</span></div>
              <span class="text-gray-100 font-black drop-shadow-md">${p.stats.mdef}</span>
            </div>
            <div class="flex justify-between items-center bg-gray-900/40 rounded px-1 py-0.5">
              <div class="flex items-center gap-[3px]"><span class="material-symbols-outlined text-yellow-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">directions_run</span><span class="font-bold tracking-wider">SPD</span></div>
              <span class="text-gray-100 font-black drop-shadow-md">${p.stats.spd}</span>
            </div>
          </div>
        </div>
        `;
      }).join('');

      this.elements.partyArea.querySelectorAll('.party-card').forEach(el => {
        el.addEventListener('click', (e) => {
          const elementId = e.currentTarget.id;
          const p = this.party.find(char => char.elementId === elementId);
          if (p && !p.isDead) {
            if (this.isAutoBattle) this.selectedPartyMember = p;
            this.infoTarget = { type: 'party', entity: p };
            this.updateEntities();
          }
        });
      });
    }

    if (this.activeCharacter || this.isAutoBattle) {
      this.elements.commandBlocker.classList.add('hidden');
    } else {
      this.elements.commandBlocker.classList.remove('hidden');
    }

    this.renderTabContent();

    this.elements.enemyArea.querySelectorAll('.enemy-card').forEach(el => {
      el.addEventListener('click', (e) => {
        const uniqueId = e.currentTarget.dataset.id;
        const enemy = this.enemies.find(en => en.uniqueId === uniqueId);
        if (enemy && !enemy.isDead) {
          this.selectedEnemyTarget = enemy;
          this.infoTarget = { type: 'enemy', entity: enemy };
          this.renderEntities();
        }
      });
    });

    this.updateEntities();
  }

  updateEntities() {
    this.enemies.forEach(e => {
      const el = this.container.querySelector(`#${e.elementId}`);
      if (!el) return;
      
      const iconContainer = el.children[0];
      const hpContainer = el.children[1];
      const hpBar = hpContainer.children[0];
      const atbContainer = el.children[2];

      if (e.isDead) {
        el.classList.remove('cursor-pointer', 'hover:scale-105', 'transition-transform');
        iconContainer.classList.add('opacity-0');
        hpContainer.classList.add('opacity-0');
        atbContainer.classList.add('opacity-0');
      }

      if (this.activeEnemy === e) {
        iconContainer.classList.add('border-yellow-400', 'shadow-[0_0_8px_rgba(250,204,21,0.5)]');
        iconContainer.classList.remove('border-gray-700', 'border-red-500', 'shadow-[0_0_8px_rgba(239,68,68,0.8)]');
      } else if (this.selectedEnemyTarget === e) {
        iconContainer.classList.add('border-red-500', 'shadow-[0_0_8px_rgba(239,68,68,0.8)]');
        iconContainer.classList.remove('border-gray-700', 'border-yellow-400', 'shadow-[0_0_8px_rgba(250,204,21,0.5)]');
      } else {
        iconContainer.classList.remove('border-red-500', 'shadow-[0_0_8px_rgba(239,68,68,0.8)]', 'border-yellow-400', 'shadow-[0_0_8px_rgba(250,204,21,0.5)]');
        iconContainer.classList.add('border-gray-700');
      }

      hpBar.style.width = `${(e.currentHp / e.maxHp) * 100}%`;
    });

    this.party.forEach(p => {
      const el = this.container.querySelector(`#${p.elementId}`);
      if (!el) return;

      if (this.activeCharacter === p) {
        el.classList.add('border-yellow-400', 'shadow-[0_0_8px_rgba(250,204,21,0.5)]');
        el.classList.remove('border-gray-700', 'border-blue-400', 'shadow-[0_0_8px_rgba(96,165,250,0.5)]');
      } else if (this.isAutoBattle && this.selectedPartyMember === p) {
        el.classList.add('border-blue-400', 'shadow-[0_0_8px_rgba(96,165,250,0.5)]');
        el.classList.remove('border-gray-700', 'border-yellow-400', 'shadow-[0_0_8px_rgba(250,204,21,0.5)]');
      } else {
        el.classList.remove('border-yellow-400', 'border-blue-400', 'shadow-[0_0_8px_rgba(250,204,21,0.5)]', 'shadow-[0_0_8px_rgba(96,165,250,0.5)]');
        el.classList.add('border-gray-700');
      }

      if (p.isDead) {
        el.classList.add('opacity-40', 'grayscale');
        el.classList.remove('transition-all', 'cursor-pointer', 'hover:scale-[1.02]');
      } else {
        el.classList.remove('opacity-40', 'grayscale');
        el.classList.add('transition-all', 'cursor-pointer', 'hover:scale-[1.02]');
      }

      const lvEl = el.querySelector(`.${p.elementId}-lv`);
      if (lvEl) lvEl.textContent = p.level || 1;

      const jlvEl = el.querySelector(`.${p.elementId}-jlv`);
      if (jlvEl) jlvEl.textContent = p.jobLevel || 1;

      const spEl = el.querySelector(`.${p.elementId}-sp`);
      if (spEl) spEl.textContent = p.sp || 0;

      const hpBar = el.querySelector('.bg-red-600');
      if (hpBar) {
        const trueMaxHp = p.stats.hp || p.hp.max;
        hpBar.style.width = `${(p.hp.current / trueMaxHp) * 100}%`;
        hpBar.nextElementSibling.textContent = `${Math.floor(p.hp.current)}/${trueMaxHp}`;
      }

      const mpBar = el.querySelector('.bg-blue-600');
      if (mpBar) {
        mpBar.style.width = `${(p.mp.current / p.mp.max) * 100}%`;
        mpBar.nextElementSibling.textContent = `${Math.floor(p.mp.current)}/${p.mp.max}`;
      }

      const expBar = el.querySelector('.bg-green-600');
      if (expBar) {
        expBar.style.width = `${(p.exp.current / p.exp.max) * 100}%`;
        expBar.nextElementSibling.textContent = `${Math.floor(p.exp.current)}/${p.exp.max}`;
      }

      const jpBar = el.querySelector('.bg-purple-600');
      if (jpBar) {
        jpBar.style.width = `${(p.jp.current / p.jp.max) * 100}%`;
        jpBar.nextElementSibling.textContent = `${Math.floor(p.jp.current)}/${p.jp.max}`;
      }

      const statBlocks = el.querySelectorAll('.text-gray-100.font-black.drop-shadow-md');
      if (statBlocks.length >= 5) {
        statBlocks[0].textContent = p.stats.atk;
        statBlocks[1].textContent = p.stats.def;
        statBlocks[2].textContent = p.stats.matk;
        statBlocks[3].textContent = p.stats.mdef;
        statBlocks[4].textContent = p.stats.spd;
      }
    });

    if (this.activeCharacter || this.isAutoBattle) {
      this.elements.commandBlocker.classList.add('hidden');
    } else {
      this.elements.commandBlocker.classList.remove('hidden');
    }

    // Refresh tab content in case MP/SP changed or active character changed
    this.renderTabContent();
  }
  
  get isAutoBattle() {
    return this.autoBattleMode !== 'none';
  }

  setupListeners() {
    this.elements.btnAutoFloor.onclick = () => {
      this.autoBattleMode = this.autoBattleMode === 'floor' ? 'none' : 'floor';
      sessionStorage.setItem('autoBattleMode', this.autoBattleMode);
      this.updateCommandUI();
      
      if (this.isAutoBattle && this.activeCharacter) {
        this.processAutoBattle(this.activeCharacter);
      }
    };

    this.elements.btnAutoDungeon.onclick = () => {
      this.autoBattleMode = this.autoBattleMode === 'dungeon' ? 'none' : 'dungeon';
      sessionStorage.setItem('autoBattleMode', this.autoBattleMode);
      this.updateCommandUI();
      
      if (this.isAutoBattle && this.activeCharacter) {
        this.processAutoBattle(this.activeCharacter);
      }
    };

    this.elements.btnRun.onclick = () => {
      if (!this.activeCharacter || this.isAutoBattle) return;
      sessionStorage.removeItem('autoBattleMode');
      this.endBattle(false, '逃げ出した！', false);
    };

    this.elements.btnAttack.onclick = () => {
      if (!this.activeCharacter || this.isAutoBattle) return;
      
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
        sessionStorage.removeItem('autoBattleMode');
        window.location.hash = '/dungeon';
      }
    };

    [
      { btn: this.elements.tabBtnSkill, id: 'skill' },
      { btn: this.elements.tabBtnItem, id: 'item' },
      { btn: this.elements.tabBtnInfo, id: 'info' }
    ].forEach(({btn, id}) => {
      btn.onclick = () => {
        this.currentTab = id;
        this.updateTabStyles();
        this.renderTabContent();
      };
    });

    // 初期状態のタブスタイルを適用
    this.updateTabStyles();
    this.updateCommandUI();
  }

  updateCommandUI() {
    this.elements.btnAutoFloor.className = "flex-1 bg-blue-900 hover:bg-blue-800 rounded-lg font-bold text-[10px] border border-blue-700 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-blue-100 p-1";
    this.elements.btnAutoFloor.innerHTML = `<span class="material-symbols-outlined text-[18px] mb-0.5 text-blue-400">autorenew</span>階層周回`;

    this.elements.btnAutoDungeon.className = "flex-1 bg-purple-900 hover:bg-purple-800 rounded-lg font-bold text-[10px] border border-purple-700 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-purple-100 p-1";
    this.elements.btnAutoDungeon.innerHTML = `<span class="material-symbols-outlined text-[18px] mb-0.5 text-purple-400">all_inclusive</span>踏破周回`;

    if (this.autoBattleMode === 'floor') {
      this.elements.btnAutoFloor.className = "flex-1 bg-blue-600 rounded-lg font-bold text-[10px] border-2 border-blue-300 flex flex-col items-center justify-center transition-all shadow-[0_0_15px_rgba(59,130,246,0.9)] text-white p-1 scale-105 z-10 animate-pulse";
      this.elements.btnAutoFloor.innerHTML = `<span class="material-symbols-outlined text-[18px] mb-0.5 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">autorenew</span>階層周回中`;
    } else if (this.autoBattleMode === 'dungeon') {
      this.elements.btnAutoDungeon.className = "flex-1 bg-purple-600 rounded-lg font-bold text-[10px] border-2 border-purple-300 flex flex-col items-center justify-center transition-all shadow-[0_0_15px_rgba(168,85,247,0.9)] text-white p-1 scale-105 z-10 animate-pulse";
      this.elements.btnAutoDungeon.innerHTML = `<span class="material-symbols-outlined text-[18px] mb-0.5 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">all_inclusive</span>踏破周回中`;
    }

    if (this.isAutoBattle) {
      this.elements.btnAttack.disabled = true;
      this.elements.btnRun.disabled = true;
      
      this.elements.btnAttack.classList.add('opacity-50', 'grayscale', 'cursor-not-allowed');
      this.elements.btnRun.classList.add('opacity-50', 'grayscale', 'cursor-not-allowed');
    } else {
      this.elements.btnAttack.disabled = false;
      this.elements.btnRun.disabled = false;
      this.elements.btnAttack.classList.remove('opacity-50', 'grayscale', 'cursor-not-allowed');
      this.elements.btnRun.classList.remove('opacity-50', 'grayscale', 'cursor-not-allowed');
    }
    
    if (this.activeCharacter || this.isAutoBattle) {
      this.elements.commandBlocker.classList.add('hidden');
    } else {
      this.elements.commandBlocker.classList.remove('hidden');
    }
    
    if (this.currentTab === 'skill') {
      this.renderTabContent();
    }
  }

  processAutoBattle(character) {
    if (character.isDead) return;
    
    setTimeout(() => {
      if (!this.isAutoBattle || this.activeCharacter !== character) return;
      
      const jobDef = JOBS[character.jobId];
      if (jobDef && jobDef.autoBattle) {
        jobDef.autoBattle(character, {
          getSkillLevel: (skillId) => {
            for (const [jId, skills] of Object.entries(character.jobSkills)) {
              if (skills[skillId]) return skills[skillId];
            }
            return 0;
          },
          isSkillAutoEnabled: (skillId) => {
            return this.autoSkillStates[character.id]?.[skillId] !== false;
          },
          getSkillDef: (skillId) => {
            for (const jId of Object.keys(character.jobSkills)) {
               const jDef = JOBS[jId];
               const sDef = jDef?.skills.find(s => s.id === skillId);
               if (sDef) return sDef;
            }
            return null;
          },
          executeSkill: (skillId, target = null) => {
            let foundSkillDef = null;
            let level = 0;
            for (const [jId, skills] of Object.entries(character.jobSkills)) {
              if (skills[skillId]) {
                foundSkillDef = JOBS[jId]?.skills.find(s => s.id === skillId);
                level = skills[skillId];
                break;
              }
            }
            if (foundSkillDef) {
               const levelConfig = foundSkillDef.levels.find(l => l.level === level) || foundSkillDef.levels[foundSkillDef.levels.length - 1];
               this.executeSkill(character, foundSkillDef, levelConfig);
            } else {
               this.executeAttack(character, target || this.enemies.find(e => !e.isDead), true);
            }
          },
          executeAttack: (target = null) => {
            if (!target || target.isDead) {
              target = this.selectedEnemyTarget;
              if (!target || target.isDead) {
                target = this.enemies.find(e => !e.isDead);
              }
            }
            if (target) {
              this.executeAttack(character, target, true);
            }
          },
          enemies: this.enemies,
          party: this.party
        });
      } else {
        // Fallback
        let target = this.selectedEnemyTarget;
        if (!target || target.isDead) target = this.enemies.find(e => !e.isDead);
        if (target) this.executeAttack(character, target, true);
      }
    }, 500);
  }

  updateTabStyles() {
    const tabs = [
      { btn: this.elements.tabBtnSkill, id: 'skill', icon: 'auto_awesome', label: 'スキル' },
      { btn: this.elements.tabBtnItem, id: 'item', icon: 'backpack', label: 'アイテム' },
      { btn: this.elements.tabBtnInfo, id: 'info', icon: 'info', label: 'インフォ' }
    ];

    tabs.forEach(({btn, id, icon, label}) => {
      if (this.currentTab === id) {
        btn.className = 'flex-1 py-1 bg-gradient-to-t from-gray-800 to-gray-700 text-white rounded-t text-[9px] font-black shadow-[0_-1px_3px_rgba(0,0,0,0.3)] border-t-2 border-green-400 relative z-10 flex items-center justify-center gap-0.5 transition-all';
        btn.innerHTML = `<span class="material-symbols-outlined text-[12px] text-green-400" style="font-variation-settings: 'FILL' 1">${icon}</span>${label}`;
      } else {
        btn.className = 'flex-1 py-1 bg-gray-900/80 text-gray-500 rounded-t text-[9px] font-bold hover:bg-gray-800 hover:text-gray-300 transition-colors border-b border-gray-700 flex items-center justify-center gap-0.5';
        btn.innerHTML = `<span class="material-symbols-outlined text-[12px]">${icon}</span>${label}`;
      }
    });
  }

  renderTabContent() {
    if (this.currentTab === 'skill') {
      this.renderSkillTab();
    } else if (this.currentTab === 'item') {
      this.renderItemTab();
    } else if (this.currentTab === 'info') {
      this.renderInfoTab();
    }
  }

  renderInfoTab() {
    let targetEntity = null;
    let isParty = false;
    
    if (this.infoTarget) {
      targetEntity = this.infoTarget.entity;
      isParty = this.infoTarget.type === 'party';
    } else if (this.selectedEnemyTarget) {
      targetEntity = this.selectedEnemyTarget;
      isParty = false;
    } else if (this.selectedPartyMember) {
      targetEntity = this.selectedPartyMember;
      isParty = true;
    } else {
      targetEntity = this.party.find(p => !p.isDead) || this.party[0];
      isParty = true;
    }

    if (!targetEntity) {
      this.elements.tabContent.innerHTML = '<div class="text-xs text-gray-500 flex items-center justify-center h-full">対象が選択されていません</div>';
      return;
    }

    let html = '';
    if (isParty) {
      const currentHp = targetEntity.hp?.current || 0;
      const maxHp = targetEntity.stats?.hp || targetEntity.hp?.max || 0;
      const hpPct = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
      
      const currentMp = targetEntity.mp?.current || 0;
      const maxMp = targetEntity.mp?.max || 0;
      const mpPct = maxMp > 0 ? (currentMp / maxMp) * 100 : 0;

      const getEquipHtml = (id, label) => {
        const item = id ? this.equipMap.get(id) : null;
        if (item && item.image) {
          return `<div class="flex items-center gap-1 bg-gray-900/60 p-0.5 rounded border border-gray-700">
              <img src="${item.image}" class="w-4 h-4 object-contain" onerror="this.style.display='none'">
              <div class="flex flex-col min-w-0">
                <span class="text-[7px] text-gray-500 leading-none">${label}</span>
                <span class="text-[8px] text-gray-200 truncate leading-tight">${item.name}</span>
              </div>
            </div>`;
        } else {
          const itemName = item ? item.name : (id || 'なし');
          return `<div class="flex items-center gap-1 bg-gray-900/60 p-0.5 rounded border border-gray-700">
              <span class="material-symbols-outlined text-gray-600" style="font-size: 12px;">category</span>
              <div class="flex flex-col min-w-0">
                <span class="text-[7px] text-gray-500 leading-none">${label}</span>
                <span class="text-[8px] text-gray-400 truncate leading-tight">${itemName}</span>
              </div>
            </div>`;
        }
      };

      html = `
        <div class="h-full overflow-y-auto p-1.5 text-gray-300 text-[9px] flex flex-col gap-1.5 custom-scrollbar">
          <div class="flex items-center gap-2 pb-1 border-b border-gray-700 shrink-0">
            <div class="w-8 h-8 rounded-full border-2 border-gray-600 overflow-hidden bg-gray-800 shrink-0">
              <img src="${targetEntity.iconImage}" class="w-full h-full object-cover" onerror="this.src='./assets/job/job_norvice.webp'">
            </div>
            <div class="flex flex-col flex-1">
              <div class="flex justify-between items-baseline">
                <span class="font-bold text-gray-100 text-[11px] drop-shadow-md">${targetEntity.name}</span>
                <span class="text-gray-400 text-[8px]">Lv.${targetEntity.level || 1} / JLV.${targetEntity.jobLevel || 1}</span>
              </div>
              <div class="flex flex-col gap-[2px] mt-0.5">
                <div class="relative h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-700/50">
                  <div class="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 to-red-400" style="width: ${hpPct}%"></div>
                </div>
                <div class="relative h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-700/50">
                  <div class="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-blue-400" style="width: ${mpPct}%"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-1.5 shrink-0">
            <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-1 rounded border border-gray-700/50 flex flex-col gap-[2px] shadow-inner">
              <div class="text-gray-500 text-[8px] mb-0.5 border-b border-gray-700 pb-0.5">ステータス</div>
              <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-red-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">swords</span><span class="text-gray-400">ATK</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.atk || 0}</span></div>
              <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-slate-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">shield</span><span class="text-gray-400">DEF</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.def || 0}</span></div>
              <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-purple-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">auto_awesome</span><span class="text-gray-400">MATK</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.matk || 0}</span></div>
              <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-indigo-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">security</span><span class="text-gray-400">MDEF</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.mdef || 0}</span></div>
              <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-yellow-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">directions_run</span><span class="text-gray-400">SPD</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.spd || 0}</span></div>
            </div>
            <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-1 rounded border border-gray-700/50 flex flex-col gap-[2px] shadow-inner">
              <div class="text-gray-500 text-[8px] mb-0.5 border-b border-gray-700 pb-0.5">装備</div>
              <div class="flex flex-col gap-[2px] mt-0.5">
                ${getEquipHtml(targetEntity.equipment?.rightHand, '右手')}
                ${getEquipHtml(targetEntity.equipment?.leftHand, '左手')}
                ${getEquipHtml(targetEntity.equipment?.head, '頭')}
                ${getEquipHtml(targetEntity.equipment?.body, '体')}
                ${getEquipHtml(targetEntity.equipment?.accessory, '装飾品')}
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      let dropsHtml = '';
      if (targetEntity.drops && targetEntity.drops.length > 0) {
        dropsHtml = targetEntity.drops.map(d => {
          const mat = MATERIALS.find(m => m.id === d.itemId);
          const itemName = mat ? mat.name : d.itemId;
          const itemImg = mat && mat.image ? `<img src="${mat.image}" class="w-4 h-4 object-contain">` : `<span class="material-symbols-outlined text-gray-500" style="font-size: 12px;">category</span>`;
          return `<div class="flex justify-between items-center bg-gray-900/60 p-0.5 rounded border border-gray-700/50 hover:bg-gray-800 transition-colors">
              <div class="flex items-center gap-1 overflow-hidden">
                ${itemImg}
                <span class="truncate text-gray-200 text-[8px]">${itemName}</span>
              </div>
              <span class="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1 rounded-sm shrink-0 text-[7px] font-bold">${d.rate}%</span>
            </div>`;
        }).join('');
      } else {
        dropsHtml = '<div class="text-gray-500 text-center py-1 text-[8px]">なし</div>';
      }

      const hpPct = targetEntity.maxHp > 0 ? (targetEntity.currentHp / targetEntity.maxHp) * 100 : 0;

      html = `
        <div class="h-full overflow-y-auto p-1.5 text-gray-300 text-[9px] flex flex-col gap-1.5 custom-scrollbar relative">
          <!-- Background Glow Effect -->
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-red-500/10 rounded-full blur-xl pointer-events-none"></div>
          
          <div class="flex items-center gap-2 pb-1 border-b border-gray-700 shrink-0 relative z-10">
            <div class="w-10 h-10 rounded bg-gray-900/80 border border-gray-600 overflow-hidden shrink-0 flex items-center justify-center p-0.5 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
              <img src="${targetEntity.image}" class="w-full h-full object-contain drop-shadow-md" onerror="this.style.display='none'">
            </div>
            <div class="flex flex-col flex-1 justify-center">
              <div class="flex justify-between items-baseline">
                <span class="font-bold text-red-300 text-[11px] drop-shadow-md">${targetEntity.name}</span>
                <span class="text-gray-400 text-[8px] bg-gray-800 px-1 rounded">Lv.${this.currentFloorNum || 1}</span>
              </div>
              <div class="flex flex-col gap-0.5 mt-1">
                <div class="flex justify-between items-end mb-[1px]">
                  <span class="text-[7px] text-gray-500 font-bold leading-none">HP</span>
                  <span class="text-[8px] text-red-200 font-bold leading-none">${Math.floor(targetEntity.currentHp || 0)} / ${targetEntity.maxHp || 0}</span>
                </div>
                <div class="relative h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-700/50">
                  <div class="absolute inset-y-0 left-0 bg-gradient-to-r from-red-700 to-red-500" style="width: ${hpPct}%"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-1.5 min-h-0 flex-1 relative z-10">
            <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-1 rounded border border-gray-700/50 flex flex-col gap-[2px] overflow-y-auto custom-scrollbar shadow-inner">
              <div class="text-gray-500 text-[8px] mb-0.5 border-b border-gray-700 pb-0.5 shrink-0">ステータス</div>
              <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-red-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">swords</span><span class="text-gray-400">ATK</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.atk || 0}</span></div>
              <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-slate-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">shield</span><span class="text-gray-400">DEF</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.def || 0}</span></div>
              <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-purple-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">auto_awesome</span><span class="text-gray-400">MATK</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.matk || 0}</span></div>
              <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-indigo-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">security</span><span class="text-gray-400">MDEF</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.mdef || 0}</span></div>
              <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-yellow-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">directions_run</span><span class="text-gray-400">SPD</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.spd || 0}</span></div>
              <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm mt-0.5"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-green-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">star</span><span class="text-gray-400">EXP</span></div><span class="font-bold text-green-400">${targetEntity.rewards?.exp || 0}</span></div>
              <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-yellow-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">monetization_on</span><span class="text-gray-400">GOLD</span></div><span class="font-bold text-yellow-400">${targetEntity.rewards?.gold || 0}</span></div>
            </div>
            <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-1 rounded border border-gray-700/50 flex flex-col min-h-0 shadow-inner">
              <div class="text-gray-500 text-[8px] mb-1 border-b border-gray-700 pb-0.5 shrink-0 flex items-center gap-0.5"><span class="material-symbols-outlined" style="font-size: 10px;">shopping_bag</span>ドロップ</div>
              <div class="flex-1 overflow-y-auto custom-scrollbar pr-0.5 flex flex-col gap-[2px]">
                ${dropsHtml}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    this.elements.tabContent.innerHTML = html;
  }

  renderItemTab() {
    if (!this.obtainedItems || this.obtainedItems.length === 0) {
      this.elements.tabContent.innerHTML = '<div class="text-xs text-gray-500 flex items-center justify-center h-full">獲得したアイテムはありません</div>';
      return;
    }
    let html = '<div class="grid grid-cols-5 gap-1.5 p-1 content-start overflow-y-auto h-full">';
    this.obtainedItems.forEach(item => {
      html += `
        <div class="relative w-full aspect-square bg-gray-800 border border-gray-600 rounded flex flex-col group hover:border-blue-400 transition-colors overflow-hidden">
          <div class="relative flex-1 w-full min-h-0 p-1">
            <img src="${item.image}" class="w-full h-full object-contain drop-shadow-md" onerror="this.style.display='none'">
            <div class="absolute bottom-0 right-0 bg-black/80 text-[8px] text-white font-bold px-1 rounded-tl shadow-sm z-10">x${item.quantity}</div>
          </div>
          <div class="w-full bg-gray-900 border-t border-gray-700 text-[8px] text-gray-300 text-center break-all px-0.5 py-[1px] leading-tight shrink-0">
            ${item.name}
          </div>
          <div class="absolute inset-x-0 bottom-full mb-1 hidden group-hover:block bg-black/90 text-white text-[9px] p-1 rounded z-20 text-center whitespace-nowrap border border-gray-700 pointer-events-none z-30">${item.name}</div>
        </div>
      `;
    });
    html += '</div>';
    this.elements.tabContent.innerHTML = html;
  }

  renderSkillTab() {
    if (!this.activeCharacter && !this.isAutoBattle) {
      this.elements.tabContent.innerHTML = '<div class="text-xs text-gray-500 flex items-center justify-center h-full">行動順を待っています...</div>';
      return;
    }

    const p = this.isAutoBattle ? (this.selectedPartyMember || this.party.find(char => !char.isDead)) : this.activeCharacter;
    if (!p || !p.jobSkills) {
      this.elements.tabContent.innerHTML = '<div class="text-xs text-gray-500 flex items-center justify-center h-full">覚えているスキルがありません</div>';
      return;
    }

    let skillListHtml = '';
    const learnedSkills = [];

    // Gather learned skills from all jobs
    for (const [jobId, skillsMap] of Object.entries(p.jobSkills)) {
      const jobDef = JOBS[jobId];
      if (!jobDef) continue;
      
      for (const [skillId, level] of Object.entries(skillsMap)) {
        if (level > 0) {
          const skillDef = jobDef.skills.find(s => s.id === skillId);
          if (skillDef) {
            learnedSkills.push({ skillDef, level });
          }
        }
      }
    }

    if (learnedSkills.length === 0) {
      this.elements.tabContent.innerHTML = '<div class="text-xs text-gray-500 flex items-center justify-center h-full">覚えているスキルがありません</div>';
      return;
    }

    skillListHtml += '<div class="grid grid-cols-2 gap-1.5">';
    learnedSkills.forEach(({ skillDef, level }) => {
      const levelConfig = skillDef.levels.find(l => l.level === level) || skillDef.levels[skillDef.levels.length - 1];
      const canCast = p.mp.current >= levelConfig.mpCost;
      const desc = skillDef.getDescription ? skillDef.getDescription(levelConfig) : '';

      const isAutoBattle = this.isAutoBattle;
      const autoEnabled = this.autoSkillStates[p.id]?.[skillDef.id] !== false; // default true
      
      const grayscaleClass = (!canCast && !isAutoBattle) ? 'grayscale opacity-60 cursor-not-allowed' : '';
      
      let btnClass = "skill-btn relative w-full flex items-center gap-1.5 p-1.5 border rounded-lg transition-all group overflow-hidden ";
      if (isAutoBattle) {
        if (autoEnabled) {
          btnClass += "bg-gradient-to-r from-blue-900/30 to-blue-800/10 border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.15)] hover:border-blue-400 hover:shadow-[0_0_8px_rgba(59,130,246,0.3)] active:scale-[0.98]";
        } else {
          btnClass += "bg-gray-900 border-gray-800 opacity-40 grayscale hover:opacity-60 hover:border-gray-600 cursor-pointer";
        }
      } else {
        btnClass += "bg-gradient-to-r from-gray-800 to-gray-800/50 border-gray-600 hover:border-green-400 hover:shadow-[0_0_8px_rgba(74,222,128,0.15)] active:scale-[0.98] " + grayscaleClass;
      }

      skillListHtml += `
        <button class="${btnClass}" data-skill-id="${skillDef.id}" data-level="${level}">
          <div class="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div class="w-8 h-8 rounded bg-gray-900 flex items-center justify-center border border-gray-700 shrink-0 shadow-inner group-hover:border-green-500/40 transition-colors z-10">
            <span class="material-symbols-outlined ${canCast ? 'text-green-400' : 'text-gray-500'} text-[18px] group-hover:scale-110 transition-transform" style="font-variation-settings: 'FILL' 1">${skillDef.icon || 'star'}</span>
          </div>
          <div class="flex flex-col text-left flex-1 min-w-0 z-10">
            <div class="flex justify-between items-center mb-0.5">
              <div class="text-[10px] font-bold ${canCast ? 'text-gray-100' : 'text-gray-400'} truncate pr-1">${skillDef.name} <span class="${canCast ? 'text-green-400' : 'text-gray-500'} text-[9px] ml-0.5">Lv${level}</span></div>
              ${levelConfig.mpCost > 0 ? `<div class="text-[9px] font-bold ${canCast ? 'text-blue-300 bg-blue-900/40 border-blue-700/50' : 'text-red-400 bg-red-900/20 border-red-900/50'} px-1 py-[1px] rounded border shadow-inner shrink-0">${canCast ? `MP ${levelConfig.mpCost}` : 'MP不足'}</div>` : ''}
            </div>
            <div class="text-[9px] text-gray-400 leading-none truncate">${desc}</div>
          </div>
        </button>
      `;
    });
    skillListHtml += '</div>';

    this.elements.tabContent.innerHTML = skillListHtml;

    this.elements.tabContent.querySelectorAll('.skill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!this.activeCharacter && !this.isAutoBattle) return;
        
        const skillId = btn.dataset.skillId;
        const level = parseInt(btn.dataset.level, 10);
        
        if (this.isAutoBattle) {
           const pId = p.id;
           if (!this.autoSkillStates[pId]) this.autoSkillStates[pId] = {};
           
           if (this.autoSkillStates[pId][skillId] === false) {
             this.autoSkillStates[pId][skillId] = true;
           } else {
             this.autoSkillStates[pId][skillId] = false;
           }
           
           this.renderTabContent();
           return;
        }

        let foundSkillDef = null;
        let foundJobId = null;
        for (const [jobId, skillsMap] of Object.entries(this.activeCharacter.jobSkills)) {
          if (skillsMap[skillId]) {
            foundSkillDef = JOBS[jobId]?.skills.find(s => s.id === skillId);
            foundJobId = jobId;
            break;
          }
        }

        if (foundSkillDef) {
          const levelConfig = foundSkillDef.levels.find(l => l.level === level) || foundSkillDef.levels[foundSkillDef.levels.length - 1];
          if (this.activeCharacter.mp.current < levelConfig.mpCost) return;
          this.executeSkill(this.activeCharacter, foundSkillDef, levelConfig);
        }
      });
    });
  }

  executeSkill(caster, skillDef, levelConfig) {
    if (caster.mp && caster.mp.current < levelConfig.mpCost) return;

    if (caster.mp) {
      caster.mp.current -= levelConfig.mpCost;
    }

    // Execution Logic
    // For now, we assume skills like first_aid don't need a specific target besides caster
    // If a skill needs a target, we would check selectedEnemyTarget or allow party target.
    // However, first_aid's execute logic currently handles its own effect:
    
    // Show action name animation
    this.showActionName(caster.elementId, skillDef.name);

    if (skillDef.execute) {
      skillDef.execute(caster, levelConfig);
    }
    
    // Some visual effect (e.g. heal popup)
    if (skillDef.id === 'first_aid') {
      this.showDamage(caster.elementId, `+${levelConfig.healAmount}`, 'text-green-400');
    }

    caster.atb = 0;
    this.activeCharacter = null;
    this.renderEntities();
    this.checkBattleEnd();
  }

  startAtbLoop() {
    let totalSpd = 0;
    let entityCount = 0;
    this.party.forEach(p => { 
      const spd = (p.stats && typeof p.stats.spd === 'number' && !isNaN(p.stats.spd)) ? p.stats.spd : 1;
      totalSpd += spd; 
      entityCount++; 
    });
    this.enemies.forEach(e => { 
      const spd = (e.stats && typeof e.stats.spd === 'number' && !isNaN(e.stats.spd)) ? e.stats.spd : 1;
      totalSpd += spd; 
      entityCount++; 
    });
    const avgSpd = entityCount > 0 ? (totalSpd / entityCount) : 1;
    
    const BASE_TICK_RATE = 1000 / 70;

    this.atbLoop = setInterval(() => {
      if (this.activeCharacter || this.activeEnemy) return;
      
      let nextActor = null;
      
      this.party.forEach(p => {
        if (p.isDead) return;
        const spd = (p.stats && typeof p.stats.spd === 'number' && !isNaN(p.stats.spd)) ? p.stats.spd : 1;
        const speedRatio = spd / avgSpd;
        p.atb += speedRatio * BASE_TICK_RATE;
        if (p.atb >= 1000) {
          p.atb = 1000;
          if (!nextActor) nextActor = { type: 'party', entity: p };
        }
        
        const atbEl = this.container.querySelector(`#${p.elementId}-atb`);
        if(atbEl) atbEl.style.width = `${p.atb / 10}%`;
      });
      
      this.enemies.forEach(e => {
        if (e.isDead) return;
        const spd = (e.stats && typeof e.stats.spd === 'number' && !isNaN(e.stats.spd)) ? e.stats.spd : 1;
        const speedRatio = spd / avgSpd;
        e.atb += speedRatio * BASE_TICK_RATE;
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
          if (this.isAutoBattle) {
            this.processAutoBattle(this.activeCharacter);
          }
        } else {
          this.activeEnemy = nextActor.entity;
          this.updateEntities();
          setTimeout(() => {
            if (this.activeEnemy !== nextActor.entity) return;
            this.executeEnemyTurn(nextActor.entity);
          }, 500);
        }
      }
    }, 50);
  }

  executeAttack(attacker, defender, isParty, options = {}) {
    const actionName = options.actionName || '攻撃';

    if (isParty) {
      this.showActionName(attacker.elementId, actionName, 'text-gray-100', 'border-gray-500/50');
    } else {
      this.showActionName(attacker.elementId, actionName, 'text-red-300', 'border-red-500/50');
    }

    const isMagic = options.isMagic || false;
    const atkStat = isMagic ? (attacker.stats.matk || 0) : (attacker.stats.atk || 0);
    const defStat = isMagic ? (defender.stats.mdef || 0) : (defender.stats.def || 0);
    let damage = Math.max(1, atkStat - Math.floor(defStat / 2));
    damage = Math.floor(damage * (0.9 + Math.random() * 0.2));
    
    const damageMultiplier = options.damageMultiplier || 1;
    damage = Math.floor(damage * damageMultiplier);

    // --- 武器アビリティの発動 ---
    if (attacker.equipment && attacker.equipment.rightHand) {
      const weaponDef = this.equipMap.get(attacker.equipment.rightHand);
      if (weaponDef && weaponDef.ability && weaponDef.ability.execute) {
        damage = weaponDef.ability.execute(attacker, defender, damage, this);
      }
    }

    // --- 属性ダメージ計算 (比例方式) ---
    const attackElements = attacker.stats.attackElements || {};
    const defenderElementResist = defender.stats.elementResist || {};
    
    let totalElementPercent = 0;
    for (const val of Object.values(attackElements)) {
      if (val > 0) totalElementPercent += val;
    }

    // もし属性合計が100%を超えるなら正規化し、100%未満なら残りは無属性とする
    let elementPortionScale = 1.0;
    if (totalElementPercent > 100) {
      elementPortionScale = 100 / totalElementPercent;
    }
    
    let nonElementalPercent = Math.max(0, 100 - totalElementPercent);
    if (totalElementPercent > 100) nonElementalPercent = 0;

    let finalDamage = 0;

    // 各属性ごとのダメージ計算
    for (const [el, val] of Object.entries(attackElements)) {
      if (val > 0) {
        const resist = defenderElementResist[el] || 0;
        const multiplier = Math.max(0, 1 - (resist / 100));
        const portionDamage = damage * (val * elementPortionScale / 100);
        finalDamage += portionDamage * multiplier;
      }
    }

    // 無属性分のダメージ加算
    finalDamage += damage * (nonElementalPercent / 100);

    damage = Math.floor(finalDamage);
    if (damage < 1) damage = 1;

    this.showDamage(defender.elementId, damage);

    // --- 状態異常付与判定 ---
    const attackAilments = attacker.stats.attackAilments || {};
    const defenderAilmentResist = defender.stats.ailmentResist || {};
    const inflictedAilments = [];
    
    for (const [ailment, chance] of Object.entries(attackAilments)) {
      if (chance > 0) {
        const resist = defenderAilmentResist[ailment] || 0;
        const finalChance = Math.max(0, chance - resist);
        if (Math.random() * 100 < finalChance) {
          inflictedAilments.push(ailment);
        }
      }
    }

    if (inflictedAilments.length > 0) {
      setTimeout(() => {
        const ailmentName = inflictedAilments[0].toUpperCase();
        this.showActionName(defender.elementId, ailmentName, 'text-purple-300', 'border-purple-500/50');
      }, 500);
      // 将来的に defender.activeAilments 等へ状態異常を保存する
    }

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
    if (aliveParty.length === 0) {
      this.activeEnemy = null;
      return;
    }
    
    const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];

    if (enemy.actions && enemy.actions.length > 0) {
      const rand = Math.random() * 100;
      let cumulative = 0;
      for (const action of enemy.actions) {
        cumulative += action.chance;
        if (rand < cumulative) {
          if (action.execute) {
            action.execute(enemy, target, this);
            this.activeEnemy = null;
            this.updateEntities();
            return;
          }
        }
      }
    }

    this.executeAttack(enemy, target, false);
    this.activeEnemy = null;
    this.updateEntities();
  }

  showDamage(elementId, damage, customColorClass = 'text-red-500') {
    const el = this.container.querySelector(`#${elementId}`);
    if (!el) return;

    // Apply shake to the element on the next tick so it survives renderEntities()
    setTimeout(() => {
      const newEl = this.container.querySelector(`#${elementId}`);
      if (newEl) {
        newEl.classList.add('animate-[shake_0.4s_ease-in-out]');
        setTimeout(() => newEl.classList.remove('animate-[shake_0.4s_ease-in-out]'), 400);
      }
    }, 0);

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const topY = rect.top + 10;

    const dmgText = document.createElement('div');
    dmgText.textContent = damage;
    dmgText.className = `fixed font-black text-3xl z-[9999] pointer-events-none ${customColorClass}`;
    dmgText.style.left = `${centerX}px`;
    dmgText.style.top = `${topY}px`;
    dmgText.style.webkitTextStroke = '1px white';
    dmgText.style.textShadow = '0 2px 4px rgba(0,0,0,0.8)';
    
    const spreadX = (Math.random() - 0.5) * 40;

    dmgText.animate([
      { transform: `translate(-50%, 0) scale(0.5)`, opacity: 0 },
      { transform: `translate(calc(-50% + ${spreadX}px), -40px) scale(1.5)`, opacity: 1, offset: 0.2 },
      { transform: `translate(calc(-50% + ${spreadX * 1.5}px), -50px) scale(1)`, opacity: 1, offset: 0.8 },
      { transform: `translate(calc(-50% + ${spreadX * 1.8}px), -30px) scale(0.5)`, opacity: 0 }
    ], {
      duration: 800,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      fill: 'forwards'
    });

    document.body.appendChild(dmgText);
    setTimeout(() => dmgText.remove(), 800);
  }

  showActionName(elementId, actionName, textClass = 'text-green-300', borderClass = 'border-green-500/50') {
    const el = this.container.querySelector(`#${elementId}`);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const topY = rect.top - 20;

    const textEl = document.createElement('div');
    textEl.textContent = actionName;
    textEl.className = `fixed font-black text-[13px] ${textClass} z-[9999] pointer-events-none tracking-widest whitespace-nowrap bg-black/50 px-2 py-0.5 rounded-full border ${borderClass}`;
    textEl.style.left = `${centerX}px`;
    textEl.style.top = `${topY}px`;
    textEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.8)';
    
    textEl.animate([
      { transform: `translate(-50%, 10px)`, opacity: 0 },
      { transform: `translate(-50%, -10px)`, opacity: 1, offset: 0.2 },
      { transform: `translate(-50%, -15px)`, opacity: 1, offset: 0.8 },
      { transform: `translate(-50%, -25px)`, opacity: 0 }
    ], {
      duration: 1200,
      easing: 'ease-out',
      fill: 'forwards'
    });

    document.body.appendChild(textEl);
    setTimeout(() => textEl.remove(), 1200);
  }

  showLevelUp(elementId, type = 'base') {
    const el = this.container.querySelector(`#${elementId}`);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const topY = rect.top - 5;

    const isJob = type === 'job';
    const textStr = isJob ? 'JOB LEVEL UP' : 'LEVEL UP';
    const shadowColor = isJob ? 'rgba(239,68,68,0.6)' : 'rgba(249,115,22,0.6)'; // red vs orange
    const iconColor = isJob ? 'text-red-300' : 'text-orange-300';
    const gradient = isJob 
      ? 'from-white via-red-400 to-red-600'
      : 'from-white via-orange-400 to-orange-600';

    const lvlText = document.createElement('div');
    lvlText.className = 'fixed flex items-center justify-center gap-0.5 z-[9999] pointer-events-none whitespace-nowrap';
    lvlText.style.left = `${centerX}px`;
    lvlText.style.top = `${topY}px`;
    lvlText.style.filter = `drop-shadow(0 2px 3px rgba(0,0,0,0.8)) drop-shadow(0 0 8px ${shadowColor})`;

    lvlText.innerHTML = `
      <span class="material-symbols-outlined text-[15px] ${iconColor}" style="font-variation-settings: 'FILL' 1">auto_awesome</span>
      <span class="font-black text-[13px] italic tracking-widest text-transparent bg-clip-text bg-gradient-to-b ${gradient}">${textStr}</span>
      <span class="material-symbols-outlined text-[15px] ${iconColor}" style="font-variation-settings: 'FILL' 1">auto_awesome</span>
    `;
    
    lvlText.animate([
      { opacity: 0, transform: `translate(-50%, 10px) scale(0.5)` },
      { opacity: 1, transform: `translate(-50%, -15px) scale(1.2)`, offset: 0.2 },
      { opacity: 1, transform: `translate(-50%, -20px) scale(1)`, offset: 0.7 },
      { opacity: 0, transform: `translate(-50%, -30px) scale(0.8)` }
    ], { duration: 1600, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' });

    document.body.appendChild(lvlText);
    setTimeout(() => lvlText.remove(), 1600);
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

    // Track that this monster has been encountered/defeated (for monster library)
    const discoveredMonsters = await GameDB.getGameState('discovered_monsters') || [];
    if (!discoveredMonsters.includes(enemy.id)) {
      discoveredMonsters.push(enemy.id);
      await GameDB.setGameState('discovered_monsters', discoveredMonsters);
    }

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

          let baseLevelUp = false;
          let jobLevelUp = false;

          // Level Up Logic
          while (p.exp.current >= p.exp.max) {
            p.exp.current -= p.exp.max;
            p.exp.max = Math.floor(p.exp.max * 1.2);
            p.level = (p.level || 1) + 1;
            
            const jobGrowth = JOBS[p.jobId]?.statGrowth;
            if (jobGrowth) {
              const getGrowth = (val) => Array.isArray(val) ? Math.floor(Math.random() * (val[1] - val[0] + 1)) + val[0] : (val || 0);
              
              const hpGrowth = getGrowth(jobGrowth.hp);
              const mpGrowth = getGrowth(jobGrowth.mp);
              p.hp.max += hpGrowth;
              p.hp.current += hpGrowth;
              p.mp.max += mpGrowth;
              p.mp.current += mpGrowth;
              p.baseStats.atk += getGrowth(jobGrowth.atk);
              p.baseStats.def += getGrowth(jobGrowth.def);
              p.baseStats.matk += getGrowth(jobGrowth.matk);
              p.baseStats.mdef += getGrowth(jobGrowth.mdef);
              p.baseStats.spd += getGrowth(jobGrowth.spd);
            }
            baseLevelUp = true;
          }

          // Job Level Up Logic
          while (p.jp.current >= p.jp.max) {
            p.jp.current -= p.jp.max;
            p.jp.max = Math.floor(p.jp.max * 1.2);
            p.jobLevel = (p.jobLevel || 1) + 1;
            p.sp = (p.sp || 0) + 1;
            jobLevelUp = true;
          }

          if (baseLevelUp || jobLevelUp) {
            p.stats = calcFinalStats(p, this.equipMap);
            if (baseLevelUp) this.showLevelUp(p.elementId, 'base');
            if (jobLevelUp) {
              setTimeout(() => this.showLevelUp(p.elementId, 'job'), baseLevelUp ? 400 : 0);
            }
            this.renderEntities(); // re-render to update max HP/MP and stats display
          }
        }
      }
      this.savePartyState(); // Save to DB
      if (exp > 0) drops.push({ text: `+${exp} EXP`, icon: 'star', color: 'text-blue-300' });
      if (jp > 0) drops.push({ text: `+${jp} JP`, icon: 'star', color: 'text-purple-300' });
    }

    // Process Drops
    let hasNewDrops = false;
    if (enemy.drops) {
      for (const drop of enemy.drops) {
        if (Math.random() * 100 <= drop.rate) {
          const mat = MATERIALS.find(m => m.id === drop.itemId);
          if (mat) {
            const currentItem = await GameDB.getInventoryItem(mat.id) || { id: mat.id, quantity: 0, type: 'material', ...mat };
            currentItem.quantity += 1;
            await GameDB.putInventoryItem(currentItem);
            drops.push({ text: mat.name, image: mat.image, color: 'text-white' });
            
            const existingDrop = this.obtainedItems.find(i => i.id === mat.id);
            if (existingDrop) {
              existingDrop.quantity++;
            } else {
              this.obtainedItems.push({ id: mat.id, name: mat.name, image: mat.image, quantity: 1 });
            }
            hasNewDrops = true;
          }
        }
      }
    }

    if (hasNewDrops && this.currentTab === 'item') {
      this.renderItemTab();
    }

    // Create a drop container overlay for this enemy in the main container
    const el = this.container.querySelector(`#${enemy.elementId}`);
    if (!el) return;
    
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dropContainer = document.createElement('div');
    dropContainer.style.position = 'fixed';
    dropContainer.style.left = `${centerX}px`;
    dropContainer.style.top = `${centerY}px`;
    dropContainer.className = `w-40 -translate-x-1/2 -translate-y-1/2 flex flex-wrap justify-center items-center gap-1.5 z-[9999] pointer-events-none transition-opacity duration-1000`;
    document.body.appendChild(dropContainer);

    // Show floating elements inside dropContainer
    drops.forEach((drop, i) => {
      const dropEl = document.createElement('div');
      dropEl.className = `flex flex-row items-center gap-[2px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] bg-black/60 px-1.5 py-[2px] rounded-full border border-gray-700/50 opacity-0`;
      
      let innerHtml = '';
      if (drop.image) {
        innerHtml += `<img src="${drop.image}" class="w-3 h-3 object-contain" onerror="this.style.display='none'">`;
      } else if (drop.icon) {
        innerHtml += `<span class="material-symbols-outlined text-[11px] ${drop.color} drop-shadow-md" style="font-variation-settings: 'FILL' 1">${drop.icon}</span>`;
      }
      
      if (drop.text) {
        innerHtml += `<span class="font-bold text-[8px] tracking-wide ${drop.color} drop-shadow-[0_1px_1px_rgba(0,0,0,1)] leading-none mt-0.5">${drop.text}</span>`;
      }
      
      dropEl.innerHTML = innerHtml;
      dropContainer.appendChild(dropEl);

      dropEl.animate([
        { opacity: 0, transform: `translateY(15px) scale(0.5)` },
        { opacity: 1, transform: `translateY(-5px) scale(1.1)`, offset: 0.5 },
        { opacity: 1, transform: `translateY(0) scale(1)` }
      ], { 
        duration: 600, 
        delay: i * 100, 
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', 
        fill: 'both' 
      });
    });

    // Fade out and remove the entire container after 2.5 seconds
    setTimeout(() => {
      dropContainer.style.opacity = '0';
      setTimeout(() => dropContainer.remove(), 1000);
    }, 2500);
  }

  async endBattle(isWin, text, showModal = true) {
    clearInterval(this.atbLoop);
    this.activeCharacter = null;
    
    await this.savePartyState();

    if (!showModal) {
      sessionStorage.removeItem('autoBattleMode');
      window.location.hash = '/dungeon';
      return;
    }

    this.elements.resultTitle.textContent = isWin ? 'VICTORY' : 'DEFEAT';
    this.elements.resultTitle.className = isWin 
      ? 'text-5xl font-black mb-4 tracking-widest text-yellow-400 drop-shadow-lg' 
      : 'text-5xl font-black mb-4 tracking-widest text-red-500 drop-shadow-lg';
    
    let resultText = text;
    if (isWin) {
      this.isDungeonClear = this.currentFloorNum >= this.dungeonDef.floors.length;
      
      if (this.autoBattleMode === 'floor') {
        setTimeout(async () => {
          this.party = [];
          this.enemies = [];
          this.activeCharacter = null;
          this.activeEnemy = null;
          this.selectedEnemyTarget = null;
          this.init();
        }, 1500);
        return;
      } else if (this.autoBattleMode === 'dungeon') {
        setTimeout(async () => {
          if (this.isDungeonClear) {
            await GameDB.setGameState('currentFloor', 1);
          } else {
            await GameDB.setGameState('currentFloor', this.currentFloorNum + 1);
          }
          this.party = [];
          this.enemies = [];
          this.activeCharacter = null;
          this.activeEnemy = null;
          this.selectedEnemyTarget = null;
          this.init();
        }, 1500);
        return;
      } else {
        if (this.isDungeonClear) {
          this.elements.btnResultOk.textContent = 'ダンジョン踏破！街へ戻る';
          this.elements.resultText.textContent = 'ダンジョンの最深部に到達しました！';
          this.elements.resultOverlay.classList.remove('hidden');
        } else {
          setTimeout(async () => {
            await GameDB.setGameState('currentFloor', this.currentFloorNum + 1);
            this.party = [];
            this.enemies = [];
            this.activeCharacter = null;
            this.activeEnemy = null;
            this.selectedEnemyTarget = null;
            this.init();
          }, 1500);
          return;
        }
      }
    } else {
      let innFee = 0;
      for (const p of this.party) {
        innFee += (p.level || 1);
        const stats = calcFinalStats(p, this.equipMap);
        p.hp.current = stats.hp || p.hp.max;
        p.mp.current = stats.mp || p.mp.max;
        p.isDead = false;
      }
      
      const currentGold = await GameDB.getGameState('gold') || 0;
      const actualFee = Math.min(innFee, currentGold);
      const newGold = currentGold - actualFee;
      await GameDB.setGameState('gold', newGold);
      await this.savePartyState(); // Save healed state
      
      const goldDisplay = document.getElementById('header-gold-display');
      if (goldDisplay) goldDisplay.textContent = ` Gold : ${newGold.toLocaleString()} `;

      this.isDungeonClear = false;
      this.elements.btnResultOk.textContent = '街へ戻る';
      this.elements.resultText.innerHTML = `${resultText}<br><br><span class="text-[13px] text-gray-300">パーティーは救出され、治療を受けました。<br>（救出・治療費: <span class="text-red-400">-${actualFee} G</span>）</span>`;
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
      <div id="enemy-area" class="flex justify-center items-start gap-1 sm:gap-2 md:gap-4 lg:gap-6 w-full max-w-full mt-1 px-2 pt-1 pb-2">
        <!-- Enemies will be injected here -->
      </div>

      <!-- Party Area -->
      <div id="party-area" class="grid grid-cols-4 gap-1 px-1 mt-1">
        <!-- Party will be injected here -->
      </div>
      
      <!-- Tabs & Tab Content Area -->
      <div class="flex flex-col flex-1 mt-4 px-2 mb-4">
        <!-- Tabs -->
        <div class="flex px-1 gap-[2px]">
          <button id="tab-btn-skill" class="flex-1 py-1 bg-gradient-to-t from-gray-800 to-gray-700 text-white rounded-t text-[9px] font-black shadow-[0_-1px_3px_rgba(0,0,0,0.3)] border-t-2 border-green-400 relative z-10 flex items-center justify-center gap-0.5 transition-all"><span class="material-symbols-outlined text-[12px] text-green-400" style="font-variation-settings: 'FILL' 1">auto_awesome</span>スキル</button>
          <button id="tab-btn-item" class="flex-1 py-1 bg-gray-900/80 text-gray-500 rounded-t text-[9px] font-bold hover:bg-gray-800 hover:text-gray-300 transition-colors border-b border-gray-700 flex items-center justify-center gap-0.5"><span class="material-symbols-outlined text-[12px]">backpack</span>アイテム</button>
          <button id="tab-btn-info" class="flex-1 py-1 bg-gray-900/80 text-gray-500 rounded-t text-[9px] font-bold hover:bg-gray-800 hover:text-gray-300 transition-colors border-b border-gray-700 flex items-center justify-center gap-0.5"><span class="material-symbols-outlined text-[12px]">info</span>インフォ</button>
        </div>
        <!-- Tab Content -->
        <div id="tab-content" class="flex-1 bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-b-lg rounded-tr-lg p-2 min-h-[120px] overflow-y-auto shadow-inner mb-2">
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
      <button id="btn-run" class="flex-1 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold text-[11px] border border-gray-600 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-gray-300 p-1">
        <span class="material-symbols-outlined text-[18px] mb-0.5 text-gray-400">directions_run</span>逃げる
      </button>
      <button id="btn-auto-dungeon" class="flex-1 bg-purple-900 hover:bg-purple-800 rounded-lg font-bold text-[10px] border border-purple-700 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-purple-100 p-1">
        <span class="material-symbols-outlined text-[18px] mb-0.5 text-purple-400">all_inclusive</span>踏破周回
      </button>
      <button id="btn-auto-floor" class="flex-1 bg-blue-900 hover:bg-blue-800 rounded-lg font-bold text-[10px] border border-blue-700 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-blue-100 p-1">
        <span class="material-symbols-outlined text-[18px] mb-0.5 text-blue-400">autorenew</span>階層周回
      </button>
      <button id="btn-attack" class="flex-1 bg-red-700 hover:bg-red-600 rounded-lg font-bold text-[11px] shadow-lg border border-red-500 flex flex-col items-center justify-center transition-all active:scale-95 text-red-50 p-1">
        <span class="material-symbols-outlined text-[18px] mb-0.5 text-red-300">swords</span>攻撃
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
