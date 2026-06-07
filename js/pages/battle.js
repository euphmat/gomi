import { GameDB } from '../data/database.js';
import { MONSTERS } from '../definitions/monsters.js';
import { DUNGEONS } from '../definitions/dungeons.js';
import { MATERIALS } from '../definitions/materials.js';
import { calcFinalStats, buildEquipmentMap } from '../data/stat-calculator.js';
import { JOBS } from '../jobs/index.js';
import { renderEnemyCardHtml, renderPartyCardHtml, renderInfoTabHtml, renderItemTabHtml, renderSkillTabHtml } from './battle-ui.js';

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
    this.wasVisible = !document.hidden;
    this.atbElements = {};
    this._lastRenderedActiveChar = null;
    this._lastRenderedAutoBattle = false;
    this._visibilityHandler = null;

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
    this.monsterKills = {};
  }
  
  async init() {
    // Stop existing ATB loop before re-initializing
    this.stopAtbLoop();

    this.autoSkillStates = await GameDB.getGameState('autoSkillStates') || {};
    this.monsterKills = await GameDB.getGameState('monster_kills') || {};


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
    
    const prevSelectedId = this.selectedPartyMember ? this.selectedPartyMember.id : null;
    
    if (prevSelectedId) {
      this.selectedPartyMember = this.party.find(p => p.id === prevSelectedId) || this.party[0];
    } else {
      this.selectedPartyMember = this.party[0];
    }

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

    const N = this.enemies.length;
    const cols = N;
    this.elements.enemyArea.style.setProperty('--enemy-cols', cols);

    this.elements.enemyArea.innerHTML = this.enemies.map(e => renderEnemyCardHtml(e, this.selectedEnemyTarget)).join('');

    if (this.elements.partyArea.children.length === 0) {
      this.elements.partyArea.innerHTML = this.party.map(p => renderPartyCardHtml(p, this.activeCharacter, this.isAutoBattle, this.selectedPartyMember)).join('');

      this.elements.partyArea.querySelectorAll('.party-card').forEach(el => {
        el.addEventListener('click', (e) => {
          const elementId = e.currentTarget.id;
          const p = this.party.find(char => char.elementId === elementId);
          if (p && !p.isDead) {
            if (this.isAutoBattle) {
              this.selectedPartyMember = p;
              this.currentTab = 'info';
              this.updateTabStyles();
            }
            this.infoTarget = { type: 'party', entity: p };
            this.updateEntities();
            if (this.currentTab === 'info') {
              this.renderTabContent();
            }
          }
        });
      });
    }

    this.updateCommandBlocker();

    this.renderTabContent();

    this.elements.enemyArea.querySelectorAll('.enemy-card').forEach(el => {
      el.addEventListener('click', (e) => {
        const uniqueId = e.currentTarget.dataset.id;
        const enemy = this.enemies.find(en => en.uniqueId === uniqueId);
        if (enemy && !enemy.isDead) {
          if (this.isAutoBattle) {
            this.currentTab = 'info';
            this.updateTabStyles();
          }
          this.selectedEnemyTarget = enemy;
          this.infoTarget = { type: 'enemy', entity: enemy };
          this.renderEntities();
          if (this.currentTab === 'info') {
            this.renderTabContent();
          }
        }
      });
    });

    this.updateEntities();
    this.cacheAtbElements();
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
        if (el.style.minWidth !== '0px') {
          el.style.minWidth = '0px';
          el.style.maxWidth = '0px';
          el.style.opacity = '0';
          el.style.margin = '0';
          el.style.pointerEvents = 'none';
        }
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

    this.updateCommandBlocker();

    // Refresh tab content only when active character changes or auto-battle toggles
    if (this._lastRenderedActiveChar !== this.activeCharacter || this._lastRenderedAutoBattle !== this.isAutoBattle) {
      this._lastRenderedActiveChar = this.activeCharacter;
      this._lastRenderedAutoBattle = this.isAutoBattle;
      this.renderTabContent();
    }
  }

  cacheAtbElements() {
    this.atbElements = {};
    this.party.forEach(p => {
      const el = this.container.querySelector(`#${p.elementId}-atb`);
      if (el) this.atbElements[p.elementId] = el;
    });
    this.enemies.forEach(e => {
      const el = this.container.querySelector(`#${e.elementId}-atb`);
      if (el) this.atbElements[e.elementId] = el;
    });
  }
  
  get speedMult() {
    return parseInt(localStorage.getItem('autoBattleSpeed') || '1', 10);
  }

  get isAutoBattle() {
    return this.autoBattleMode !== 'none';
  }

  resetBattleState() {
    this.party = [];
    this.enemies = [];
    this.activeCharacter = null;
    this.activeEnemy = null;
    this.selectedEnemyTarget = null;
  }

  _findSkill(character, skillId) {
    for (const [jobId, skills] of Object.entries(character.jobSkills)) {
      if (skills[skillId]) {
        return {
          level: skills[skillId],
          def: JOBS[jobId]?.skills.find(s => s.id === skillId) || null,
          jobId
        };
      }
    }
    return { level: 0, def: null, jobId: null };
  }

  updateCommandBlocker() {
    this.elements.commandBlocker.classList.toggle('hidden', !!(this.activeCharacter || this.isAutoBattle));
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
      if (!this.isAutoBattle && !this.activeCharacter) return;
      sessionStorage.removeItem('autoBattleMode');
      this.autoBattleMode = 'none';
      this.endBattle(false, '撤退した！', false);
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
        this.resetBattleState();
        this.init();
      } else {
        // Return to town
        sessionStorage.removeItem('autoBattleMode');
        this.autoBattleMode = 'none';
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

    this.elements.btnRun.className = "flex-1 bg-teal-900 hover:bg-teal-800 rounded-lg font-bold text-[11px] border border-teal-700 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-teal-100 p-1 cursor-pointer";
    this.elements.btnRun.innerHTML = `<span class="material-symbols-outlined text-[18px] mb-0.5 text-teal-400">home</span>街に戻る`;

    if (this.isAutoBattle) {
      this.elements.btnAttack.disabled = true;
      this.elements.btnAttack.classList.add('opacity-50', 'grayscale', 'cursor-not-allowed');
      this.elements.btnRun.disabled = false;
    } else {
      this.elements.btnAttack.disabled = false;
      this.elements.btnRun.disabled = false;
      this.elements.btnAttack.classList.remove('opacity-50', 'grayscale', 'cursor-not-allowed');
    }
    
    this.updateCommandBlocker();
    
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
          getSkillLevel: (skillId) => this._findSkill(character, skillId).level,
          isSkillAutoEnabled: (skillId) => {
            return this.autoSkillStates[character.id]?.[skillId] !== false;
          },
          getSkillDef: (skillId) => this._findSkill(character, skillId).def,
          executeSkill: (skillId, target = null) => {
            const found = this._findSkill(character, skillId);
            if (found.def) {
               const levelConfig = found.def.levels.find(l => l.level === found.level) || found.def.levels[found.def.levels.length - 1];
               const prevTarget = this.selectedEnemyTarget;
               if (target) this.selectedEnemyTarget = target;
               this.executeSkill(character, found.def, levelConfig);
               if (target) this.selectedEnemyTarget = prevTarget;
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
    }, 500 / this.speedMult);
  }

  updateTabStyles() {
    const tabs = [
      { btn: this.elements.tabBtnSkill, id: 'skill', icon: 'auto_awesome', label: 'スキル' },
      { btn: this.elements.tabBtnItem, id: 'item', icon: 'backpack', label: 'アイテム' },
      { btn: this.elements.tabBtnInfo, id: 'info', icon: 'info', label: 'インフォ' }
    ];

    tabs.forEach(({btn, id, icon, label}) => {
      if (this.currentTab === id) {
        btn.className = 'flex-1 py-2 bg-slate-800/90 text-emerald-300 border-t-2 border-emerald-500 rounded-t-lg text-[10px] font-black shadow-[0_-2px_10px_rgba(16,185,129,0.15)] relative z-10 flex items-center justify-center gap-1 transition-all duration-200 cursor-pointer';
        btn.innerHTML = `<span class="material-symbols-outlined text-[13px] text-emerald-400" style="font-variation-settings: 'FILL' 1">${icon}</span>${label}`;
      } else {
        btn.className = 'flex-1 py-2 bg-slate-950/80 text-slate-500 rounded-t-lg text-[10px] font-bold hover:bg-slate-900/60 hover:text-slate-300 border-b border-slate-900/60 flex items-center justify-center gap-1 transition-colors duration-200 cursor-pointer';
        btn.innerHTML = `<span class="material-symbols-outlined text-[13px] text-slate-500">${icon}</span>${label}`;
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

    const html = renderInfoTabHtml(targetEntity, isParty, this.equipMap, this.currentFloorNum, MATERIALS, this.monsterKills);
    this.elements.tabContent.innerHTML = html;
  }

  renderItemTab() {
    const html = renderItemTabHtml(this.obtainedItems);
    this.elements.tabContent.innerHTML = html;
  }

  renderSkillTab() {
    if (!this.activeCharacter && !this.isAutoBattle) {
      this.elements.tabContent.innerHTML = '<div class="text-xs text-gray-500 flex items-center justify-center h-full">行動順を待っています...</div>';
      return;
    }

    const p = this.isAutoBattle ? (this.selectedPartyMember || this.party.find(char => !char.isDead)) : this.activeCharacter;
    
    const html = renderSkillTabHtml(p, this.isAutoBattle, this.autoSkillStates, JOBS);
    this.elements.tabContent.innerHTML = html;

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
           
           GameDB.setGameState('autoSkillStates', this.autoSkillStates);
           this.renderTabContent();
           return;
        }

        const found = this._findSkill(this.activeCharacter, skillId);

        if (found.def) {
          const levelConfig = found.def.levels.find(l => l.level === level) || found.def.levels[found.def.levels.length - 1];
          if (this.activeCharacter.mp.current < levelConfig.mpCost) return;
          this.executeSkill(this.activeCharacter, found.def, levelConfig);
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
      skillDef.execute(caster, levelConfig, this);
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

  stopAtbLoop() {
    if (this.atbWorker) {
      this.atbWorker.terminate();
      this.atbWorker = null;
    }
    if (this.atbLoop) {
      clearInterval(this.atbLoop);
      this.atbLoop = null;
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
    if (this._routeChangeHandler) {
      window.removeEventListener('hashchange', this._routeChangeHandler);
      this._routeChangeHandler = null;
    }
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
    
    // Doubled from 1000/70 to compensate for 100ms tick interval (was 50ms)
    const BASE_TICK_RATE = 1000 / 35;

    if (this.atbWorker) {
      this.atbWorker.terminate();
    }

    const workerCode = `
      let timer = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (timer) clearInterval(timer);
          timer = setInterval(() => self.postMessage('tick'), 100);
        } else if (e.data === 'stop') {
          clearInterval(timer);
          timer = null;
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.atbWorker = new Worker(URL.createObjectURL(blob));

    this.atbWorker.onmessage = () => {
      if (!document.hidden && !this.wasVisible) {
        this.renderEntities();
        if (this.currentTab === 'skill' || this.currentTab === 'item' || this.currentTab === 'info') {
          this.renderTabContent();
        }
      }
      this.wasVisible = !document.hidden;

      if (this.activeCharacter || this.activeEnemy) return;
      
      let nextActor = null;
      
      this.party.forEach(p => {
        if (p.isDead) return;
        const spd = (p.stats && typeof p.stats.spd === 'number' && !isNaN(p.stats.spd)) ? p.stats.spd : 1;
        const speedRatio = spd / avgSpd;
        p.atb += speedRatio * BASE_TICK_RATE * this.speedMult;
        if (p.atb >= 1000) {
          p.atb = 1000;
          if (!nextActor) nextActor = { type: 'party', entity: p };
        }
        
        if (!document.hidden) {
          const atbEl = this.atbElements[p.elementId];
          if(atbEl) atbEl.style.transform = `scaleX(${p.atb / 1000})`;
        }
      });
      
      this.enemies.forEach(e => {
        if (e.isDead) return;
        const spd = (e.stats && typeof e.stats.spd === 'number' && !isNaN(e.stats.spd)) ? e.stats.spd : 1;
        const speedRatio = spd / avgSpd;
        e.atb += speedRatio * BASE_TICK_RATE * this.speedMult;
        if (e.atb >= 1000) {
          e.atb = 1000;
          if (!nextActor) nextActor = { type: 'enemy', entity: e };
        }

        if (!document.hidden) {
          const atbEl = this.atbElements[e.elementId];
          if(atbEl) atbEl.style.transform = `scaleX(${e.atb / 1000})`;
        }
      });

      if (nextActor) {
        if (nextActor.type === 'party') {
          this.activeCharacter = nextActor.entity;
          if (!document.hidden) this.renderEntities();
          if (this.isAutoBattle) {
            this.processAutoBattle(this.activeCharacter);
          }
        } else {
          this.activeEnemy = nextActor.entity;
          if (!document.hidden) this.updateEntities();
          setTimeout(() => {
            if (this.activeEnemy !== nextActor.entity) return;
            this.executeEnemyTurn(nextActor.entity);
          }, 500 / this.speedMult);
        }
      }
    };

    this.atbWorker.postMessage('start');

    // Stop/start worker when page visibility changes to save CPU in background
    this._visibilityHandler = () => {
      if (document.hidden) {
        this.atbWorker?.postMessage('stop');
      } else {
        this.atbWorker?.postMessage('start');
        this.cacheAtbElements();
        this.renderEntities();
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);

    this._routeChangeHandler = () => {
      if (window.location.hash !== '#/battle') {
        this.stopAtbLoop();
      }
    };
    window.addEventListener('hashchange', this._routeChangeHandler);
  }

  executeAttack(attacker, defender, isParty, options = {}) {
    const actionName = options.actionName || '攻撃';
    this._abilityTriggered = false;

    const isMagic = options.isMagic || false;
    const atkStat = isMagic ? (attacker.stats.matk || 0) : (attacker.stats.atk || 0);
    const defStat = isMagic ? (defender.stats.mdef || 0) : (defender.stats.def || 0);
    let damage = Math.max(1, atkStat - Math.floor(defStat / 2));
    damage = Math.floor(damage * (0.9 + Math.random() * 0.2));
    
    const damageMultiplier = options.damageMultiplier || 1;
    damage = Math.floor(damage * damageMultiplier);

    // --- 武器アビリティの発動 ---
    // 通常攻撃時（options.damageType が指定されていない場合）のみ発動
    if (!options.damageType && attacker.equipment && attacker.equipment.rightHand) {
      const weaponDef = this.equipMap.get(attacker.equipment.rightHand);
      if (weaponDef && weaponDef.ability && weaponDef.ability.execute) {
        const origDamage = damage;
        damage = weaponDef.ability.execute(attacker, defender, damage, this);
        if (damage !== origDamage) {
          options.damageType = 'ability';
        }
      }
    }

    // --- ポップアップの表示 (アビリティが発動しなかった場合のみ基本アクション名を表示) ---
    if (!options.hideActionName && !this._abilityTriggered) {
      if (isParty) {
        this.showActionName(attacker.elementId, actionName, 'text-gray-100', 'border-gray-500/50');
      } else {
        this.showActionName(attacker.elementId, actionName, 'text-red-300', 'border-red-500/50');
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

    let dmgColor = 'text-white';
    if (totalElementPercent > 0) {
      let sumMultiplier = 0;
      for (const [el, val] of Object.entries(attackElements)) {
        if (val > 0) {
          const resist = defenderElementResist[el] || 0;
          const multiplier = Math.max(0, 1 - (resist / 100));
          const portion = val * elementPortionScale;
          sumMultiplier += multiplier * (portion / 100);
        }
      }
      sumMultiplier += 1.0 * (nonElementalPercent / 100);
      
      if (sumMultiplier < 0.999) {
        dmgColor = 'text-purple-400';
      } else if (sumMultiplier > 1.001) {
        dmgColor = 'text-red-500';
      }
    }

    this.showDamage(defender.elementId, damage, dmgColor);

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
      }, 500 / this.speedMult);
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
    if (!this.atbWorker) return;
    if (enemy.atkDebuffTurns > 0) {
      enemy.atkDebuffTurns--;
      if (enemy.atkDebuffTurns <= 0) {
        enemy.stats.atk = enemy.originalAtk;
        this.showDamage(enemy.elementId, 'ATK NORMAL', 'text-green-500');
      }
    }

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

  // =============================================
  // 統一ポップアップシステム
  // ポップアップはエンティティごとにスタック（積み上げ）される
  // =============================================

  /**
   * ダメージ用ポップアップ — 上方向に素早く浮遊して消える
   */
  _showFloatingPopup(elementId, config) {
    if (document.hidden) return;
    const el = this.container.querySelector(`#${elementId}`);
    if (!el) return;

    const speed = this.speedMult || 1;
    const dur = (config.duration || 1200) / speed;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const baseY = rect.top;
    const spreadX = (Math.random() - 0.5) * 30;

    const popup = document.createElement('div');
    popup.className = `fixed z-[9999] pointer-events-none ${config.className || ''}`;
    popup.style.left = `${centerX}px`;
    popup.style.top = `${baseY}px`;
    popup.style.willChange = 'transform, opacity';
    popup.innerHTML = config.html;
    document.body.appendChild(popup);

    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      if (elapsed >= dur) { popup.remove(); return; }
      const t = elapsed / dur; // 0→1

      // プレイヤー側は下降、モンスター側は上昇させる
      const isParty = elementId.startsWith('party-');
      const easeOut = 1 - Math.pow(1 - t, 3);
      const floatY = easeOut * 25;
      const yOffset = isParty ? floatY : -floatY;

      // opacity: 最初10%でフェードイン、後半30%でフェードアウト
      let opacity = 1;
      const fadeInRatio = 0.1;
      const fadeOutRatio = 0.3;
      if (t < fadeInRatio) opacity = t / fadeInRatio;
      else if (t > 1 - fadeOutRatio) opacity = 1 - (t - (1 - fadeOutRatio)) / fadeOutRatio;

      // scale: ポンっと登場 → 1.0
      const scale = t < fadeInRatio ? 0.5 + 0.7 * (t / fadeInRatio) : 1.2 - 0.2 * Math.min(1, (t - fadeInRatio) / 0.15);

      popup.style.transform = `translate(calc(-50% + ${spreadX * easeOut}px), ${yOffset}px) scale(${scale})`;
      popup.style.opacity = opacity;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /**
   * アクション名用ポップアップ — その場に留まってからフェードアウト
   */
  _showLabelPopup(elementId, config) {
    if (document.hidden) return;
    const el = this.container.querySelector(`#${elementId}`);
    if (!el) return;

    // スタック管理
    if (!this._labelStacks) this._labelStacks = {};
    if (!this._labelStacks[elementId]) this._labelStacks[elementId] = [];

    const stack = this._labelStacks[elementId];
    const speed = this.speedMult || 1;
    const dur = (config.duration || 1000) / speed;
    const itemHeight = config.height || 28;
    const stackGap = 4;

    // 既存のラベルを上に押し上げる
    const bump = itemHeight + stackGap;
    stack.forEach(entry => { entry.baseOffset += bump; });

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const baseY = rect.top - 8;

    const popup = document.createElement('div');
    popup.className = `fixed z-[10000] pointer-events-none flex flex-col items-center ${config.className || ''}`;
    popup.style.left = `${centerX}px`;
    popup.style.top = `${baseY}px`;
    popup.style.willChange = 'transform, opacity';
    popup.innerHTML = config.html;
    document.body.appendChild(popup);

    const entry = { el: popup, baseOffset: 0 };
    stack.push(entry);

    const startTime = performance.now();
    const fadeOutStart = dur * 0.7; // 残り30%でフェードアウト
    const fadeInEnd = dur * 0.15; // 最初15%でフェードイン

    const tick = (now) => {
      const elapsed = now - startTime;
      if (elapsed >= dur) {
        popup.remove();
        const idx = stack.indexOf(entry);
        if (idx !== -1) stack.splice(idx, 1);
        return;
      }

      // 上方向にスッと動く (基本押し上げ + 軽快な浮遊)
      // easeOutExpo のような動きで素早く定位置へ
      const t = elapsed / dur;
      const floatEase = 1 - Math.pow(1 - t, 4);
      const floatY = entry.baseOffset + floatEase * 10;

      let opacity = 1;
      if (elapsed < fadeInEnd) opacity = elapsed / fadeInEnd;
      else if (elapsed > fadeOutStart) opacity = 1 - (elapsed - fadeOutStart) / (dur - fadeOutStart);

      // 軽快なバウンス (0.5 -> 1.15 -> 1.0)
      let scale = 1;
      if (elapsed < fadeInEnd) {
        const st = elapsed / fadeInEnd;
        if (st < 0.7) scale = 0.5 + (1.15 - 0.5) * (st / 0.7);
        else scale = 1.15 - (1.15 - 1.0) * ((st - 0.7) / 0.3);
      }

      popup.style.transform = `translate(-50%, -${floatY}px) scale(${scale})`;
      popup.style.opacity = opacity;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // --- showDamage: ダメージポップアップ (上方向に浮遊) ---
  showDamage(elementId, damage, customColorClass = 'text-red-500') {
    let html = '';
    let duration = 1200;

    if (customColorClass.includes('text-red-500')) {
      // 弱点 (Weakness)
      html = `
        <div class="flex items-center justify-center" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.85)) drop-shadow(0 0 8px rgba(239,68,68,0.75)); transform: scale(1.25);">
          <span class="text-[34px] font-black italic select-none animate-pulse" style="color: #ef4444; text-shadow: -1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff, 0 0 10px rgba(239,68,68,0.9); line-height: 1; letter-spacing: -0.03em;">${damage}</span>
        </div>`;
      duration = 1500;
    } else if (customColorClass.includes('text-purple-400')) {
      // 耐性軽減 (Resist)
      html = `
        <div class="flex items-center justify-center" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.85)) drop-shadow(0 0 6px rgba(168,85,247,0.6)); transform: scale(0.85);">
          <span class="text-[22px] font-black select-none" style="color: #a855f7; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 6px rgba(168,85,247,0.8); line-height: 1;">${damage}</span>
        </div>`;
    } else if (customColorClass.includes('text-green-400') || customColorClass.includes('text-green-500')) {
      // HP回復
      html = `
        <div class="flex items-center justify-center" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.7)) drop-shadow(0 0 6px rgba(74,222,128,0.5));">
          <span class="text-[26px] font-black select-none" style="color: #4ade80; text-shadow: -1.2px -1.2px 0 #fff, 1.2px -1.2px 0 #fff, -1.2px 1.2px 0 #fff, 1.2px 1.2px 0 #fff, 0 0 8px rgba(74,222,128,0.8); line-height: 1;">${damage}</span>
        </div>`;
    } else if (customColorClass.includes('text-blue-400')) {
      // MP回復
      html = `
        <div class="flex items-center justify-center" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.7)) drop-shadow(0 0 6px rgba(96,165,250,0.5));">
          <span class="text-[26px] font-black select-none" style="color: #60a5fa; text-shadow: -1.2px -1.2px 0 #fff, 1.2px -1.2px 0 #fff, -1.2px 1.2px 0 #fff, 1.2px 1.2px 0 #fff, 0 0 8px rgba(96,165,250,0.8); line-height: 1;">${damage}</span>
        </div>`;
    } else {
      // 通常ダメージ
      html = `
        <div class="flex items-center justify-center" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.85));">
          <span class="text-[26px] font-black select-none" style="color: #ffffff; text-shadow: -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000; line-height: 1;">${damage}</span>
        </div>`;
    }

    this._showFloatingPopup(elementId, {
      html,
      className: '',
      duration: duration
    });
  }

  // --- showActionName: アクション名ポップアップ (その場に留まる) ---
  showActionName(elementId, actionName, textClass = 'text-green-300', borderClass = 'border-green-500/50') {
    const html = `<span class="font-black text-[13px] ${textClass} tracking-widest whitespace-nowrap bg-black/60 px-3 py-1 rounded-full border ${borderClass}" style="box-shadow: 0 2px 6px rgba(0,0,0,0.7);">${actionName}</span>`;

    this._showLabelPopup(elementId, {
      html,
      duration: 1000,
      height: 28
    });
  }

  // --- showLevelUp: レベルアップポップアップ (その場に留まる) ---
  showLevelUp(elementId, type = 'base') {
    const isJob = type === 'job';
    const textStr = isJob ? 'JOB LEVEL UP' : 'LEVEL UP';
    const shadowColor = isJob ? 'rgba(239,68,68,0.6)' : 'rgba(249,115,22,0.6)';
    const iconColor = isJob ? 'text-red-300' : 'text-orange-300';
    const gradient = isJob
      ? 'from-white via-red-400 to-red-600'
      : 'from-white via-orange-400 to-orange-600';

    const html = `
      <div class="flex items-center justify-center gap-0.5 whitespace-nowrap" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.8)) drop-shadow(0 0 8px ${shadowColor});">
        <span class="material-symbols-outlined text-[15px] ${iconColor}" style="font-variation-settings: 'FILL' 1">auto_awesome</span>
        <span class="font-black text-[13px] italic tracking-widest text-transparent bg-clip-text bg-gradient-to-b ${gradient}">${textStr}</span>
        <span class="material-symbols-outlined text-[15px] ${iconColor}" style="font-variation-settings: 'FILL' 1">auto_awesome</span>
      </div>`;

    this._showLabelPopup(elementId, {
      html,
      duration: 1500,
      height: 28
    });
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

    // Increment and save monster kill counts
    const monsterKills = await GameDB.getGameState('monster_kills') || {};
    monsterKills[enemy.id] = (monsterKills[enemy.id] || 0) + 1;
    await GameDB.setGameState('monster_kills', monsterKills);
    this.monsterKills = monsterKills;

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
              setTimeout(() => this.showLevelUp(p.elementId, 'job'), baseLevelUp ? (400 / this.speedMult) : 0);
            }
            this.renderEntities(); // re-render to update max HP/MP and stats display
          }
        }
      }
      this.savePartyState(); // Save to DB
    }

    // Process Drops
    let hasNewDrops = false;
    if (enemy.drops) {
      const kills = this.monsterKills[enemy.id] || 0;
      const bonus = Math.floor(kills / 100) * 0.1;
      for (const drop of enemy.drops) {
        const adjustedRate = Math.min(100, drop.rate + bonus);
        if (Math.random() * 100 <= adjustedRate) {
          const mat = MATERIALS.find(m => m.id === drop.itemId);
          if (mat) {
            const currentItem = await GameDB.getInventoryItem(mat.id) || { id: mat.id, quantity: 0, type: 'material', ...mat };
            currentItem.quantity = Math.min(9999, currentItem.quantity + 1);
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

    if (hasNewDrops && this.currentTab === 'item' && !document.hidden) {
      this.renderItemTab();
    }

    if (document.hidden) return;
    // Create a drop container overlay for this enemy in the main container
    const el = this.container.querySelector(`#${enemy.elementId}`);
    if (!el) return;
    
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dropContainer = document.createElement('div');
    dropContainer.style.position = 'fixed';
    dropContainer.style.left = `${centerX}px`;
    dropContainer.style.top = `${centerY + rect.height * 0.2}px`; // Start slightly lower (near feet)
    dropContainer.className = `w-0 h-0 z-[9999] pointer-events-none`;
    document.body.appendChild(dropContainer);

    // Show floating elements inside dropContainer
    drops.forEach((drop) => {
      const dropEl = document.createElement('div');
      dropEl.style.position = 'absolute';
      dropEl.style.left = '-20px';
      dropEl.style.top = '-20px';
      dropEl.className = `w-10 h-10 flex items-center justify-center drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] opacity-0`;
      
      let innerHtml = '';
      if (drop.image) {
        innerHtml += `<img src="${drop.image}" class="w-full h-full object-contain drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" onerror="this.style.display='none'">`;
      } else if (drop.icon) {
        innerHtml += `<span class="material-symbols-outlined text-[20px] ${drop.color} drop-shadow-md" style="font-variation-settings: 'FILL' 1">${drop.icon}</span>`;
      }
      
      dropEl.innerHTML = innerHtml;
      dropContainer.appendChild(dropEl);

      const destX = (Math.random() - 0.5) * 40; // Narrow horizontal scatter (-20 to +20)
      const destY = 10 + Math.random() * 20;    // Fall down slightly (10 to 30)

      const randomRot = (Math.random() - 0.5) * 180; // Gentle rotation
      const dur = 1000 + Math.random() * 300; // ドロップもたくさん重ねるために固定
      const del = Math.random() * 100;

      dropEl.animate([
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
    });

    setTimeout(() => {
      dropContainer.remove();
    }, 2000); // 削除も固定
  }

  async endBattle(isWin, text, showModal = true) {
    this.stopAtbLoop();
    this.activeCharacter = null;
    
    await this.savePartyState();

    if (!showModal) {
      sessionStorage.removeItem('autoBattleMode');
      this.autoBattleMode = 'none';
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
      
      if (this.isDungeonClear && this.autoBattleMode !== 'floor') {
        this.elements.btnResultOk.textContent = 'ダンジョン踏破！街へ戻る';
        this.elements.resultText.textContent = 'ダンジョンの最深部に到達しました！';
        this.elements.resultOverlay.classList.remove('hidden');
        return;
      }

      if (this.autoBattleMode === 'floor') {
        setTimeout(async () => {
          this.resetBattleState();
          this.init();
        }, 1500 / this.speedMult);
        return;
      }

      // dungeon mode or manual: advance to next floor
      setTimeout(async () => {
        await GameDB.setGameState('currentFloor', this.currentFloorNum + 1);
        this.resetBattleState();
        this.init();
      }, 1500 / this.speedMult);
      return;
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
      .enemy-card {
        transition: min-width 0.5s ease, max-width 0.5s ease, opacity 0.5s ease, margin 0.5s ease;
      }
      #enemy-area .enemy-card {
        min-width: 0px;
        max-width: min(4rem, calc(100% / var(--enemy-cols, 4) - 0.25rem));
      }
      #enemy-area {
        height: 90px;
        min-height: 90px;
        max-height: 90px;
        overflow-x: hidden;
        overflow-y: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        gap: 0.25rem;
      }
    </style>

    <!-- Scrollable Battle Area (Enemies, Party, Tabs) -->
    <div class="flex-1 flex flex-col overflow-y-auto" style="background: radial-gradient(circle at top, #1a202c 0%, #0b0b19 100%);">
      
      <!-- Enemy Area (Moved higher) -->
      <div id="enemy-area" class="shrink-0 px-2 py-1">
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
      <button id="btn-run" class="flex-1 bg-teal-900 hover:bg-teal-800 rounded-lg font-bold text-[11px] border border-teal-700 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-teal-100 p-1 cursor-pointer">
        <span class="material-symbols-outlined text-[18px] mb-0.5 text-teal-400">home</span>街に戻る
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
