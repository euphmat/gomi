import { GameDB } from '../data/database.js';
import { MONSTERS } from '../definitions/monsters.js';
import { DUNGEONS } from '../definitions/dungeons.js';
import { MATERIALS } from '../definitions/materials.js';
import { calcFinalStats, buildEquipmentMap } from '../data/stat-calculator.js';
import { JOBS } from '../jobs/index.js';
import { renderEnemyCardHtml, renderPartyCardHtml, renderInfoTabHtml, renderItemTabHtml, renderSkillTabHtml, getActiveStateIconsHTML } from './battle-ui.js';

const MATERIALS_MAP = new Map(MATERIALS.map(m => [m.id, m]));

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
    this.obtainedGold = 0;
    this.obtainedExp = 0;
    this.obtainedItemsMap = new Map();
    this.wasVisible = !document.hidden;
    this.atbElements = {};
    this._lastRenderedActiveChar = null;
    this._lastRenderedAutoBattle = false;
    this._visibilityHandler = null;
    this._skillCache = new Map();

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
    this.discoveredMonsters = await GameDB.getGameState('discovered_monsters') || [];
    this.currentGold = await GameDB.getGameState('gold') || 0;
    this._needsSave = false;

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

    // Update Background Image
    const sceneBg = document.getElementById('battle-scene-bg');
    if (sceneBg && this.dungeonDef && this.dungeonDef.bgImage) {
      // 視認性を確保しつつ、もう少し背景が見えるようにグラデーションの暗さを微調整
      sceneBg.style.backgroundImage = `linear-gradient(rgba(11, 11, 25, 0.5), rgba(11, 11, 25, 0.7)), url('${this.dungeonDef.bgImage}')`;
      sceneBg.style.backgroundSize = 'cover';
      sceneBg.style.backgroundPosition = 'center top';
    } else if (sceneBg) {
      sceneBg.style.backgroundImage = 'radial-gradient(circle at top, #1a202c 0%, #0b0b19 100%)';
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
    if (document.hidden) return;
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
              this.currentTab = 'skill';
              this.updateTabStyles();
              this.renderTabContent();
            }
            this.updateEntities();
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
          this.currentTab = 'info';
          this.updateTabStyles();
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
    this.cacheDOMElements();
  }

  updateEntities() {
    if (document.hidden) return;
    const disableAnim = localStorage.getItem('disableBattleAnimations') === 'true';
    if (!this.domCache) return;

    this.enemies.forEach(e => {
      const cache = this.domCache.enemies[e.elementId];
      if (!cache) return;
      
      const { root: el, iconContainer, hpContainer, hpBar, hpText, atbContainer, stateIconsContainer } = cache;

      if (stateIconsContainer && !e.isDead) {
        stateIconsContainer.innerHTML = getActiveStateIconsHTML(e);
      }

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
        iconContainer.classList.add('drop-shadow-[0_0_8px_rgba(250,204,21,1)]');
        iconContainer.classList.remove('drop-shadow-md', 'drop-shadow-[0_0_8px_rgba(239,68,68,1)]');
      } else if (this.selectedEnemyTarget === e) {
        iconContainer.classList.add('drop-shadow-[0_0_8px_rgba(239,68,68,1)]');
        iconContainer.classList.remove('drop-shadow-md', 'drop-shadow-[0_0_8px_rgba(250,204,21,1)]');
      } else {
        iconContainer.classList.remove('drop-shadow-[0_0_8px_rgba(239,68,68,1)]', 'drop-shadow-[0_0_8px_rgba(250,204,21,1)]');
        iconContainer.classList.add('drop-shadow-md');
      }

      hpBar.style.transform = `scaleX(${e.currentHp / e.maxHp})`;
      if (hpText) hpText.textContent = `${Math.floor(e.currentHp)}/${e.maxHp}`;
    });

    this.party.forEach(p => {
      const cache = this.domCache.party[p.elementId];
      if (!cache) return;
      const { root: el, lvEl, jlvEl, spEl, hpBar, hpText, mpBar, mpText, expBar, expText, jpBar, jpText, statBlocks, stateIconsContainer } = cache;

      if (stateIconsContainer && !p.isDead) {
        stateIconsContainer.innerHTML = getActiveStateIconsHTML(p);
      }

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
        el.classList.remove('cursor-pointer');
        if (!disableAnim) el.classList.remove('transition-all', 'hover:scale-[1.02]');
      } else {
        el.classList.remove('opacity-40', 'grayscale');
        el.classList.add('cursor-pointer');
        if (!disableAnim) el.classList.add('transition-all', 'hover:scale-[1.02]');
      }

      if (lvEl) lvEl.textContent = p.level || 1;
      if (jlvEl) jlvEl.textContent = p.jobLevel || 1;
      if (spEl) spEl.textContent = p.sp || 0;

      if (hpBar) {
        const trueMaxHp = p.stats.hp || p.hp.max;
        hpBar.style.transform = `scaleX(${p.hp.current / trueMaxHp})`;
        if (hpText) hpText.textContent = `${Math.floor(p.hp.current)}/${trueMaxHp}`;
      }

      if (mpBar) {
        mpBar.style.transform = `scaleX(${p.mp.current / p.mp.max})`;
        if (mpText) mpText.textContent = `${Math.floor(p.mp.current)}/${p.mp.max}`;
      }

      if (expBar) {
        expBar.style.transform = `scaleX(${p.exp.current / p.exp.max})`;
        if (expText) expText.textContent = `${Math.floor(p.exp.current)}/${p.exp.max}`;
      }

      if (jpBar) {
        jpBar.style.transform = `scaleX(${p.jp.current / p.jp.max})`;
        if (jpText) jpText.textContent = `${Math.floor(p.jp.current)}/${p.jp.max}`;
      }

      const statVals = cache.statVals;
      const statRows = cache.statRows;
      const statIcons = cache.statIcons;
      const statLabels = cache.statLabels;

      if (statVals && statVals.atk) {
        statVals.atk.textContent = p.stats.atk;
        statVals.mat.textContent = p.stats.matk;
        statVals.mdf.textContent = p.stats.mdef;
        statVals.spd.textContent = p.stats.spd;

        if (p._defBuffTurns > 0) {
          statVals.def.textContent = Math.floor(p.stats.def * (1 + p._defBuffPercent / 100));
          statVals.def.classList.remove('text-gray-100');
          statVals.def.classList.add('text-green-400');
          statRows.def.classList.remove('bg-gray-900/40');
          statRows.def.classList.add('bg-green-900/40', 'border', 'border-green-500/50');
          statIcons.def.classList.remove('text-slate-400');
          statIcons.def.classList.add('text-green-400');
          statLabels.def.classList.add('text-green-400');
        } else {
          statVals.def.textContent = p.stats.def;
          statVals.def.classList.remove('text-green-400');
          statVals.def.classList.add('text-gray-100');
          statRows.def.classList.remove('bg-green-900/40', 'border', 'border-green-500/50');
          statRows.def.classList.add('bg-gray-900/40');
          statIcons.def.classList.remove('text-green-400');
          statIcons.def.classList.add('text-slate-400');
          statLabels.def.classList.remove('text-green-400');
        }

        if (p._mdefBuffTurns > 0) {
          statVals.mdf.textContent = p.stats.mdef + p._mdefBuffAmount;
          statVals.mdf.classList.remove('text-gray-100');
          statVals.mdf.classList.add('text-indigo-300');
          statRows.mdf.classList.remove('bg-gray-900/40');
          statRows.mdf.classList.add('bg-indigo-900/40', 'border', 'border-indigo-500/50');
          statIcons.mdf.classList.remove('text-indigo-400');
          statIcons.mdf.classList.add('text-indigo-300');
          statLabels.mdf.classList.add('text-indigo-300');
        } else {
          statVals.mdf.textContent = p.stats.mdef;
          statVals.mdf.classList.remove('text-indigo-300');
          statVals.mdf.classList.add('text-gray-100');
          statRows.mdf.classList.remove('bg-indigo-900/40', 'border', 'border-indigo-500/50');
          statRows.mdf.classList.add('bg-gray-900/40');
          statIcons.mdf.classList.remove('text-indigo-300');
          statIcons.mdf.classList.add('text-indigo-400');
          statLabels.mdf.classList.remove('text-indigo-300');
        }
      }
    });

    this.updateCommandBlocker();

    // Refresh tab content only when the target character changes or auto-battle toggles
    const targetCharForTab = this.isAutoBattle ? this.selectedPartyMember : this.activeCharacter;
    if (this._lastRenderedTabChar !== targetCharForTab || this._lastRenderedAutoBattle !== this.isAutoBattle) {
      this._lastRenderedTabChar = targetCharForTab;
      this._lastRenderedAutoBattle = this.isAutoBattle;
      this.renderTabContent();
    }
  }

  cacheDOMElements() {
    this.atbElements = {};
    this.domCache = { party: {}, enemies: {} };

    this.enemies.forEach(e => {
      const el = this.container.querySelector(`#${e.elementId}`);
      if (el) {
        this.atbElements[e.elementId] = el.querySelector(`#${e.elementId}-atb`);
        this.domCache.enemies[e.elementId] = {
          root: el,
          iconContainer: el.children[0],
          stateIconsContainer: el.querySelector('.state-icons-container'),
          hpContainer: el.children[1],
          hpBar: el.children[1].children[0],
          hpText: el.children[1].children[1],
          atbContainer: el.children[2]
        };
      }
    });

    this.party.forEach(p => {
      const el = this.container.querySelector(`#${p.elementId}`);
      if (el) {
        this.atbElements[p.elementId] = el.querySelector(`#${p.elementId}-atb`);
        
        const statBlocks = el.querySelectorAll('.text-gray-100.font-black.drop-shadow-md');
        const hpBarEl = el.querySelector('.bg-red-600');
        const mpBarEl = el.querySelector('.bg-blue-600');
        const expBarEl = el.querySelector('.bg-green-600');
        const jpBarEl = el.querySelector('.bg-purple-600');

        this.domCache.party[p.elementId] = {
          root: el,
          stateIconsContainer: el.querySelector('.state-icons-container'),
          lvEl: el.querySelector(`.${p.elementId}-lv`),
          jlvEl: el.querySelector(`.${p.elementId}-jlv`),
          spEl: el.querySelector(`.${p.elementId}-sp`),
          hpBar: hpBarEl,
          hpText: hpBarEl ? hpBarEl.nextElementSibling : null,
          mpBar: mpBarEl,
          mpText: mpBarEl ? mpBarEl.nextElementSibling : null,
          expBar: expBarEl,
          expText: expBarEl ? expBarEl.nextElementSibling : null,
          jpBar: jpBarEl,
          jpText: jpBarEl ? jpBarEl.nextElementSibling : null,
          statRows: {
            atk: el.querySelector('.stat-row-atk'),
            def: el.querySelector('.stat-row-def'),
            mat: el.querySelector('.stat-row-mat'),
            mdf: el.querySelector('.stat-row-mdf'),
            spd: el.querySelector('.stat-row-spd')
          },
          statVals: {
            atk: el.querySelector('.stat-val-atk'),
            def: el.querySelector('.stat-val-def'),
            mat: el.querySelector('.stat-val-mat'),
            mdf: el.querySelector('.stat-val-mdf'),
            spd: el.querySelector('.stat-val-spd')
          },
          statIcons: {
            def: el.querySelector('.stat-icon-def'),
            mdf: el.querySelector('.stat-icon-mdf')
          },
          statLabels: {
            def: el.querySelector('.stat-label-def'),
            mdf: el.querySelector('.stat-label-mdf')
          }
        };
      }
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
    this.lastKilledBy = null;
  }

  _findSkill(character, skillId) {
    if (!character._skillCache) {
      character._skillCache = new Map();
      if (character.jobId && character.jobSkills && character.jobSkills[character.jobId]) {
        const jobId = character.jobId;
        const skills = character.jobSkills[jobId];
        const jobDef = JOBS[jobId];
        if (jobDef) {
          for (const [sId, level] of Object.entries(skills)) {
            if (level > 0) {
              const skillDef = jobDef.skills.find(s => s.id === sId);
              const levelConfig = skillDef ? (skillDef.levels.find(l => l.level === level) || skillDef.levels[skillDef.levels.length - 1]) : null;
              character._skillCache.set(sId, { level, def: skillDef || null, levelConfig, jobId });
            }
          }
        }
      }
      
      // Inherited skill
      if (character.inheritedSkill && character.jobSkills) {
        const { jobId, skillId } = character.inheritedSkill;
        if (jobId !== character.jobId) {
          const level = character.jobSkills[jobId] && character.jobSkills[jobId][skillId];
          if (level > 0) {
            const jobDef = JOBS[jobId];
            if (jobDef) {
              const skillDef = jobDef.skills.find(s => s.id === skillId);
              const levelConfig = skillDef ? (skillDef.levels.find(l => l.level === level) || skillDef.levels[skillDef.levels.length - 1]) : null;
              character._skillCache.set(skillId, { level, def: skillDef || null, levelConfig, jobId, isInherited: true });
            }
          }
        }
      }
    }
    const cached = character._skillCache.get(skillId);
    if (cached) return cached;
    return { level: 0, def: null, levelConfig: null, jobId: null };
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
            if (found.def && found.levelConfig) {
               const levelConfig = found.levelConfig;
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
        btn.className = 'flex-1 py-2 bg-slate-800 border-t-[3px] border-t-cyan-400 border-x border-x-slate-600/50 border-b border-b-slate-800 rounded-t-xl text-[11px] font-bold shadow-[0_-5px_20px_rgba(34,211,238,0.25)] relative z-10 flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer';
        btn.innerHTML = `<span class="material-symbols-outlined text-[15px] text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" style="font-variation-settings: 'FILL' 1">${icon}</span>${label}`;
      } else {
        btn.className = 'flex-1 py-2 bg-slate-900/60 backdrop-blur-sm text-slate-400 border-t-[3px] border-t-transparent border-x border-x-slate-700/50 border-b border-b-slate-600/50 rounded-t-xl text-[11px] font-bold hover:bg-slate-800/70 hover:text-slate-300 flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer opacity-80 hover:opacity-100';
        btn.innerHTML = `<span class="material-symbols-outlined text-[15px] text-slate-500">${icon}</span>${label}`;
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
    
    if (this.infoTarget && this.infoTarget.type === 'enemy') {
      targetEntity = this.infoTarget.entity;
    } else if (this.selectedEnemyTarget) {
      targetEntity = this.selectedEnemyTarget;
    } else {
      targetEntity = this.enemies.find(e => !e.isDead) || this.enemies[0];
    }

    const html = renderInfoTabHtml(targetEntity, false, this.equipMap, this.currentFloorNum, MATERIALS, this.monsterKills);
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

        if (found.def && found.levelConfig) {
          const levelConfig = found.levelConfig;
          if (this.activeCharacter.mp.current < levelConfig.mpCost) return;
          this.executeSkill(this.activeCharacter, found.def, levelConfig);
        }
      });
    });
  }

  executeSkill(caster, skillDef, levelConfig) {
    if (caster.mp && caster.mp.current < levelConfig.mpCost) return;
    if (levelConfig.mpCost > 0 && caster.activeAilment && caster.activeAilment.type === 'silence') {
      this.showActionName(caster.elementId, '沈黙', 'text-indigo-400', 'border-indigo-500/50');
      caster.atb = 0;
      this.activeCharacter = null;
      this.renderEntities();
      return;
    }

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

    // --- Passive: Mana Regen ---
    const regenSkill = this._findSkill(caster, 'mana_regen');
    if (regenSkill && regenSkill.level > 0 && regenSkill.levelConfig) {
      const amount = regenSkill.levelConfig.recoverMp;
      caster.mp.current = Math.min(caster.mp.max, caster.mp.current + amount);
      setTimeout(() => {
        this.showDamage(caster.elementId, `+${amount} MP`, 'text-blue-400');
      }, 300 / this.speedMult);
    }
    
    // --- Passive: Regen (HP) ---
    const hpRegenSkill = this._findSkill(caster, 'regen');
    if (hpRegenSkill && hpRegenSkill.level > 0 && hpRegenSkill.levelConfig) {
      const amount = hpRegenSkill.levelConfig.recoverHp;
      caster.hp.current = Math.min(caster.hp.max, caster.hp.current + amount);
      setTimeout(() => {
        this.showDamage(caster.elementId, `+${amount}`, 'text-green-400');
      }, 300 / this.speedMult);
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
    if (this.atbWorkerUrl) {
      URL.revokeObjectURL(this.atbWorkerUrl);
      this.atbWorkerUrl = null;
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
    if (this.atbWorkerUrl) {
      URL.revokeObjectURL(this.atbWorkerUrl);
      this.atbWorkerUrl = null;
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
    this.atbWorkerUrl = URL.createObjectURL(blob);
    this.atbWorker = new Worker(this.atbWorkerUrl);

    this.atbWorker.onmessage = () => {
      const disableAnim = localStorage.getItem('disableBattleAnimations') === 'true';
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
          if(atbEl) {
             if (disableAnim) {
               atbEl.style.opacity = '0';
             } else {
               atbEl.style.opacity = '1';
               atbEl.style.transform = `scaleX(${p.atb / 1000})`;
             }
          }
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
          if(atbEl) {
             if (disableAnim) {
               atbEl.style.opacity = '0';
             } else {
               atbEl.style.opacity = '1';
               atbEl.style.transform = `scaleX(${e.atb / 1000})`;
             }
          }
        }
      });

      if (nextActor) {
        if (this.processPreActionAilment(nextActor.entity)) {
          nextActor.entity.atb = 0;
          if (!document.hidden) this.renderEntities();
          this.checkBattleEnd();
          return;
        }

        if (nextActor.type === 'party') {
          if (nextActor.entity.activeAilment && nextActor.entity.activeAilment.type === 'confusion') {
            this.executeConfusionTurn(nextActor.entity, true);
            return;
          }
          this.activeCharacter = nextActor.entity;
          if (!document.hidden) this.renderEntities();
          if (this.isAutoBattle) {
            this.processAutoBattle(this.activeCharacter);
          }
        } else {
          if (nextActor.entity.activeAilment && nextActor.entity.activeAilment.type === 'confusion') {
            this.executeConfusionTurn(nextActor.entity, false);
            return;
          }
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
        this.cacheDOMElements();
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

    // --- Passive: Divine Protection (神の加護) ---
    if (isParty && options.isMagic && !options.skipAtbReset && !options.isAoEProcessed) {
      const divineSkill = this._findSkill(attacker, 'divine_protection');
      if (divineSkill && divineSkill.level > 0 && Math.random() * 100 < divineSkill.levelConfig.chance) {
        options.isAoEProcessed = true;
        this.showActionName(attacker.elementId, '神の加護', 'text-yellow-400', 'border-yellow-500/50');
        
        const aliveEnemies = this.enemies.filter(e => !e.isDead);
        aliveEnemies.forEach(e => {
            if (e !== defender) {
                this.executeAttack(attacker, e, isParty, { ...options, skipAtbReset: true, hideActionName: true });
            }
        });
      }
    }

    // --- 暗闇 (Blind) の判定 ---
    const isMagic = options.isMagic || false;
    if (!isMagic && attacker.activeAilment && attacker.activeAilment.type === 'blind' && !options.hideActionName) {
      if (Math.random() < 0.5) {
        this.showActionName(attacker.elementId, 'MISS', 'text-gray-400', 'border-gray-500/50');
        attacker.atb = 0;
        if (attacker.hp !== undefined) this.activeCharacter = null;
        else this.activeEnemy = null;
        this.renderEntities();
        return;
      }
    }

    const atkStat = isMagic ? (attacker.stats.matk || 0) : (attacker.stats.atk || 0);
    let defStat = isMagic ? (defender.stats.mdef || 0) : (defender.stats.def || 0);

    // --- 防御バフ適用 (物理防御陣形) ---
    if (!isMagic && defender._defBuffPercent && defender._defBuffTurns > 0) {
      defStat = Math.floor(defStat * (1 + defender._defBuffPercent / 100));
    }
    // --- 魔法防御バフ適用 (マジックバリア) ---
    if (isMagic && defender._mdefBuffAmount && defender._mdefBuffTurns > 0) {
      defStat += defender._mdefBuffAmount;
    }

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
    const attackElements = options.element 
      ? { [options.element]: 100 }
      : (attacker.stats.attackElements || {});
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

    // --- Passive: Guard ---
    if (!isParty && defender.jobSkills) {
      const guardSkill = this._findSkill(defender, 'guard');
      if (guardSkill && guardSkill.level > 0 && guardSkill.def && guardSkill.levelConfig) {
        const levelConfig = guardSkill.levelConfig;
        if (Math.random() * 100 < levelConfig.chance) {
          const reduction = levelConfig.reduction;
          damage = Math.floor(damage * (1 - reduction / 100));
          if (damage < 1) damage = 1;
          this.showActionName(defender.elementId, 'ガード', 'text-blue-300', 'border-blue-500/50');
        }
      }
    }

    // --- Passive: Parry (物理攻撃を無効化) ---
    if (!isParty && !isMagic && defender.jobSkills) {
      const parrySkill = this._findSkill(defender, 'parry');
      if (parrySkill && parrySkill.level > 0 && parrySkill.levelConfig) {
        if (Math.random() * 100 < parrySkill.levelConfig.chance) {
          damage = 0;
          this.showActionName(defender.elementId, 'パリィ', 'text-cyan-300', 'border-cyan-500/50');
        }
      }
    }

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

    if (inflictedAilments.length > 0 && !defender.activeAilment) {
      const ailment = inflictedAilments[0];
      defender.activeAilment = { type: ailment, duration: 3 };
      setTimeout(() => {
        const ailmentName = ailment.toUpperCase();
        this.showActionName(defender.elementId, ailmentName, 'text-purple-300', 'border-purple-500/50');
      }, 500 / this.speedMult);
    }

    const isDefenderParty = defender.hp !== undefined;
    const prevHp = isDefenderParty ? defender.hp.current : defender.currentHp;
    
    if (!isDefenderParty) {
      defender.currentHp -= damage;
      if (defender.currentHp <= 0) {
        defender.currentHp = 0;
        defender.isDead = true;
        this.processEnemyDeath(defender);
      }
    } else {
      defender.hp.current -= damage;
      if (defender.hp.current <= 0) {
        defender.hp.current = 0;
        defender.isDead = true;
        this.lastKilledBy = {
          monsterId: attacker.id,
          monsterName: attacker.name,
          monsterImage: attacker.image,
          actionName: actionName
        };
      } else if (defender.jobSkills) {
        // --- Passive: Counter ---
        const counterSkill = this._findSkill(defender, 'counter');
        if (counterSkill && counterSkill.level > 0 && counterSkill.def && counterSkill.levelConfig) {
          const levelConfig = counterSkill.levelConfig;
          if (Math.random() * 100 < levelConfig.chance) {
            setTimeout(() => {
              if (!defender.isDead && !attacker.isDead) {
                this.showActionName(defender.elementId, 'カウンター', 'text-orange-400', 'border-orange-500/50');
                this.executeAttack(defender, attacker, true, { actionName: 'カウンター', hideActionName: true });
              }
            }, 500 / this.speedMult);
          }
        }
      }
    }
    
    const newHp = isDefenderParty ? defender.hp.current : defender.currentHp;
    if (newHp < prevHp && defender.activeAilment && defender.activeAilment.type === 'sleep') {
      defender.activeAilment = null;
      setTimeout(() => {
        if (!defender.isDead) this.showActionName(defender.elementId, 'WAKE UP', 'text-blue-300', 'border-blue-500/50');
      }, 500 / this.speedMult);
    }

    if (!options.skipAtbReset) {
      attacker.atb = 0;
      if (attacker.hp !== undefined) {
        this.activeCharacter = null;
        
        // --- Passive: Magic Missile ---
        if (!options.damageType && !isMagic && !defender.isDead) {
          const missileSkill = this._findSkill(attacker, 'magic_missile');
          if (missileSkill && missileSkill.level > 0 && missileSkill.levelConfig) {
            setTimeout(() => {
              if (!defender.isDead && !attacker.isDead) {
                this.showActionName(attacker.elementId, 'マジックミサイル', 'text-fuchsia-400', 'border-fuchsia-500/50');
                this.executeAttack(attacker, defender, true, { 
                  actionName: 'マジックミサイル', 
                  damageMultiplier: missileSkill.levelConfig.multiplier, 
                  damageType: 'skill', 
                  isMagic: true, 
                  hideActionName: true 
                });
              }
            }, 300 / this.speedMult);
          }
        }
        
        // --- Passive: Mana Regen & HP Regen ---
        if (!options.damageType && !options.hideActionName) {
          const manaRegenSkill = this._findSkill(attacker, 'mana_regen');
          if (manaRegenSkill && manaRegenSkill.level > 0 && manaRegenSkill.levelConfig) {
            const amount = manaRegenSkill.levelConfig.recoverMp;
            attacker.mp.current = Math.min(attacker.mp.max, attacker.mp.current + amount);
            setTimeout(() => {
              this.showDamage(attacker.elementId, `+${amount} MP`, 'text-blue-400');
            }, 600 / this.speedMult);
          }
          
          const hpRegenSkill = this._findSkill(attacker, 'regen');
          if (hpRegenSkill && hpRegenSkill.level > 0 && hpRegenSkill.levelConfig) {
            const amount = hpRegenSkill.levelConfig.recoverHp;
            attacker.hp.current = Math.min(attacker.hp.max, attacker.hp.current + amount);
            setTimeout(() => {
              this.showDamage(attacker.elementId, `+${amount}`, 'text-green-400');
            }, 600 / this.speedMult);
          }
        }
      } else {
        this.activeEnemy = null;
      }
    }

    // --- 呪い (Curse) の反動ダメージ ---
    if (attacker.activeAilment && attacker.activeAilment.type === 'curse' && !attacker.isDead) {
      const recoil = Math.max(1, Math.floor(damage * 0.2));
      setTimeout(() => {
        this.takeAilmentDamage(attacker, recoil, 'CURSE');
      }, 500 / this.speedMult);
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
      }
    }

    // --- 挑発/防御バフのターンデクリメント ---
    this.party.forEach(p => {
      if (p._provokeTurns > 0) {
        p._provokeTurns--;
        if (p._provokeTurns <= 0) {
          p._provokeChance = 0;
        }
      }
      if (p._defBuffTurns > 0) {
        p._defBuffTurns--;
        if (p._defBuffTurns <= 0) {
          p._defBuffPercent = 0;
        }
      }
      if (p._mdefBuffTurns > 0) {
        p._mdefBuffTurns--;
        if (p._mdefBuffTurns <= 0) {
          p._mdefBuffAmount = 0;
        }
      }
    });

    const aliveParty = this.party.filter(p => !p.isDead);
    if (aliveParty.length === 0) {
      this.activeEnemy = null;
      return;
    }
    
    let target = aliveParty[Math.floor(Math.random() * aliveParty.length)];

    // --- 挑発 (カバー): 挑発中のナイトがターゲットを庇う ---
    const provoker = aliveParty.find(p =>
      p._provokeTurns > 0 && p._provokeChance > 0 && p !== target && !p.isDead
    );
    if (provoker) {
      if (Math.random() * 100 < provoker._provokeChance) {
        target = provoker;
        this.showActionName(provoker.elementId, '挑発', 'text-amber-400', 'border-amber-500/50');
      }
    }

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

  processPreActionAilment(entity) {
    if (!entity.activeAilment) return false;
    
    const ailment = entity.activeAilment.type;
    let skipTurn = false;
    
    entity.activeAilment.duration--;
    
    if (ailment === 'poison') {
      const maxHp = entity.hp ? (entity.stats?.hp || entity.hp.max) : entity.maxHp;
      const dmg = Math.max(1, Math.floor(maxHp * 0.1));
      this.takeAilmentDamage(entity, dmg, 'POISON');
    } else if (ailment === 'burn') {
      const maxHp = entity.hp ? (entity.stats?.hp || entity.hp.max) : entity.maxHp;
      const dmg = Math.max(1, Math.floor(maxHp * 0.05));
      this.takeAilmentDamage(entity, dmg, 'BURN');
      // Burn attack reduction is handled in executeAttack/executeSkill by modifying stats or damage?
      // Actually, we'll just apply it dynamically there if needed.
    } else if (ailment === 'paralysis') {
      if (Math.random() < 0.5) {
        this.showActionName(entity.elementId, '麻痺', 'text-yellow-400', 'border-yellow-500/50');
        skipTurn = true;
      }
    } else if (ailment === 'sleep') {
      this.showActionName(entity.elementId, '睡眠中', 'text-blue-300', 'border-blue-500/50');
      skipTurn = true;
    }
    
    if (entity.activeAilment && entity.activeAilment.duration <= 0 && !skipTurn) {
      setTimeout(() => {
        if (!entity.isDead) this.showActionName(entity.elementId, `${ailment.toUpperCase()}回復`, 'text-green-300', 'border-green-500/50');
      }, 500 / this.speedMult);
      entity.activeAilment = null;
    } else if (entity.activeAilment && entity.activeAilment.duration <= 0 && skipTurn) {
      setTimeout(() => {
        if (!entity.isDead) this.showActionName(entity.elementId, `${ailment.toUpperCase()}回復`, 'text-green-300', 'border-green-500/50');
        entity.activeAilment = null;
        if (!document.hidden) this.renderEntities();
      }, 1000 / this.speedMult);
    }
    
    return skipTurn || entity.isDead;
  }

  takeAilmentDamage(entity, damage, ailmentName) {
    if (entity.isDead) return;
    damage = Math.max(1, damage);
    if (entity.hp) {
      entity.hp.current -= damage;
      if (entity.hp.current <= 0) {
         entity.hp.current = 0;
         entity.isDead = true;
         this.lastKilledBy = {
           monsterId: 'ailment', monsterName: ailmentName, monsterImage: '', actionName: ailmentName
         };
      }
    } else {
      entity.currentHp -= damage;
      if (entity.currentHp <= 0) {
         entity.currentHp = 0;
         entity.isDead = true;
         this.processEnemyDeath(entity);
      }
    }
    this.showDamage(entity.elementId, damage, 'text-purple-400');
  }

  executeConfusionTurn(entity, isParty) {
    this.showActionName(entity.elementId, '混乱', 'text-pink-300', 'border-pink-500/50');
    entity.atb = 0;
    if (isParty) this.activeCharacter = null;
    else this.activeEnemy = null;
    
    const aliveParty = this.party.filter(p => !p.isDead);
    const aliveEnemies = this.enemies.filter(e => !e.isDead);
    const allAlive = [...aliveParty, ...aliveEnemies];
    if (allAlive.length === 0) return;
    
    const target = allAlive[Math.floor(Math.random() * allAlive.length)];
    
    setTimeout(() => {
      this.executeAttack(entity, target, isParty);
    }, 500 / this.speedMult);
  }

  // =============================================
  // 統一ポップアップシステム
  // ポップアップはエンティティごとにスタック（積み上げ）される
  // =============================================

  _getPoolElement() {
    if (!this._domPool) this._domPool = [];
    if (this._domPool.length > 0) {
      const el = this._domPool.pop();
      el.innerHTML = '';
      el.className = '';
      el.style.cssText = '';
      return el;
    }
    return document.createElement('div');
  }

  _releasePoolElement(el) {
    if (el.parentNode) el.parentNode.removeChild(el);
    if (!this._domPool) this._domPool = [];
    if (this._domPool.length < 100) this._domPool.push(el);
  }

  /**
   * ダメージ用ポップアップ — 上方向に素早く浮遊して消える
   */
  _showFloatingPopup(elementId, config) {
    if (localStorage.getItem('disableBattleAnimations') === 'true') return;
    if (document.hidden) return;
    const el = this.container.querySelector(`#${elementId}`);
    if (!el) return;

    const speed = this.speedMult || 1;
    const dur = (config.duration || 1200) / speed;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const baseY = rect.top;
    const spreadX = (Math.random() - 0.5) * 30;

    const popup = this._getPoolElement();
    popup.className = `fixed z-[9999] pointer-events-none animate-float-popup ${config.className || ''}`;
    popup.style.left = `${centerX}px`;
    popup.style.top = `${baseY}px`;
    
    const isParty = elementId.startsWith('party-');
    const floatY = isParty ? 25 : -25;
    
    popup.style.setProperty('--spread-x', `${spreadX}px`);
    popup.style.setProperty('--float-y', `${floatY}px`);
    popup.style.setProperty('--popup-dur', `${dur}ms`);
    popup.innerHTML = config.html;
    document.body.appendChild(popup);

    setTimeout(() => {
      this._releasePoolElement(popup);
    }, dur);
  }

  /**
   * アクション名用ポップアップ — その場に留まってからフェードアウト
   */
  _showLabelPopup(elementId, config) {
    if (localStorage.getItem('disableBattleAnimations') === 'true') return;
    if (document.hidden) return;
    const el = this.container.querySelector(`#${elementId}`);
    if (!el) return;

    if (!this._labelStacks) this._labelStacks = {};
    if (!this._labelStacks[elementId]) this._labelStacks[elementId] = [];

    const stack = this._labelStacks[elementId];
    
    // limit stack size to prevent infinite growth and severe layout thrashing
    if (stack.length > 5) {
      const oldest = stack.shift();
      this._releasePoolElement(oldest.popup);
      this._releasePoolElement(oldest.el);
      clearTimeout(oldest.timeoutId);
    }

    const speed = this.speedMult || 1;
    const dur = (config.duration || 1000) / speed;
    const itemHeight = config.height || 28;
    const stackGap = 4;

    const bump = itemHeight + stackGap;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const baseY = rect.top - 8;

    const wrapper = this._getPoolElement();
    wrapper.className = `fixed z-[10000] pointer-events-none flex flex-col items-center`;
    wrapper.style.left = `${centerX}px`;
    wrapper.style.top = `${baseY}px`;
    wrapper.style.transform = `translate(-50%, -10px)`;
    wrapper.style.transition = `transform 0.2s ease-out`;

    const popup = this._getPoolElement();
    popup.className = `animate-label-popup ${config.className || ''}`;
    popup.style.setProperty('--popup-dur', `${dur}ms`);
    popup.innerHTML = config.html;
    
    wrapper.appendChild(popup);
    document.body.appendChild(wrapper);

    const entry = { el: wrapper, popup: popup, baseOffset: 10, timeoutId: null };
    stack.push(entry);

    stack.forEach(e => {
      if (e !== entry) {
        e.baseOffset += bump;
        e.el.style.transform = `translate(-50%, -${e.baseOffset}px)`;
      }
    });

    entry.timeoutId = setTimeout(() => {
      this._releasePoolElement(popup);
      this._releasePoolElement(wrapper);
      const idx = stack.indexOf(entry);
      if (idx !== -1) stack.splice(idx, 1);
    }, dur);
  }

  // --- showDamage: ダメージポップアップ (上方向に浮遊) ---
  showDamage(elementId, damage, customColorClass = 'text-red-500') {
    if (localStorage.getItem('disableBattleAnimations') === 'true') return;
    let html = '';
    let duration = 1200;

    if (customColorClass.includes('text-red-500')) {
      // 弱点 (Weakness)
      html = `
        <div class="flex items-center justify-center" style="transform: scale(1.25);">
          <span class="text-[34px] font-black italic select-none animate-pulse" style="color: #ef4444; text-shadow: -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, 0 4px 6px rgba(0,0,0,0.8); line-height: 1; letter-spacing: -0.03em;">${damage}</span>
        </div>`;
      duration = 1500;
    } else if (customColorClass.includes('text-purple-400')) {
      // 耐性軽減 (Resist)
      html = `
        <div class="flex items-center justify-center" style="transform: scale(0.85);">
          <span class="text-[22px] font-black select-none" style="color: #a855f7; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 2px 4px rgba(0,0,0,0.8); line-height: 1;">${damage}</span>
        </div>`;
    } else if (customColorClass.includes('text-green-400') || customColorClass.includes('text-green-500')) {
      // HP回復
      html = `
        <div class="flex items-center justify-center">
          <span class="text-[26px] font-black select-none" style="color: #4ade80; text-shadow: -1.2px -1.2px 0 #fff, 1.2px -1.2px 0 #fff, -1.2px 1.2px 0 #fff, 1.2px 1.2px 0 #fff, 0 2px 4px rgba(0,0,0,0.8); line-height: 1;">${damage}</span>
        </div>`;
    } else if (customColorClass.includes('text-blue-400')) {
      // MP回復
      html = `
        <div class="flex items-center justify-center">
          <span class="text-[26px] font-black select-none" style="color: #60a5fa; text-shadow: -1.2px -1.2px 0 #fff, 1.2px -1.2px 0 #fff, -1.2px 1.2px 0 #fff, 1.2px 1.2px 0 #fff, 0 2px 4px rgba(0,0,0,0.8); line-height: 1;">${damage}</span>
        </div>`;
    } else {
      // 通常ダメージ
      html = `
        <div class="flex items-center justify-center">
          <span class="text-[26px] font-black select-none" style="color: #ffffff; text-shadow: -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 2px 4px rgba(0,0,0,0.8); line-height: 1;">${damage}</span>
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
    if (localStorage.getItem('disableBattleAnimations') === 'true') return;
    const html = `<span class="font-black text-[13px] ${textClass} tracking-widest whitespace-nowrap bg-black/60 px-3 py-1 rounded-full border ${borderClass}" style="box-shadow: 0 2px 6px rgba(0,0,0,0.7);">${actionName}</span>`;

    this._showLabelPopup(elementId, {
      html,
      duration: 1000,
      height: 28
    });
  }

  // --- showLevelUp: レベルアップポップアップ (その場に留まる) ---
  showLevelUp(elementId, type = 'base') {
    if (localStorage.getItem('disableBattleAnimations') === 'true') return;
    const isJob = type === 'job';
    const textStr = isJob ? 'JOB LEVEL UP' : 'LEVEL UP';
    const iconColor = isJob ? 'text-red-300' : 'text-orange-300';
    const gradient = isJob
      ? 'from-white via-red-400 to-red-600'
      : 'from-white via-orange-400 to-orange-600';

    const html = `
      <div class="flex items-center justify-center gap-0.5 whitespace-nowrap" style="text-shadow: 0 2px 4px rgba(0,0,0,0.8);">
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
    if (this.discoveredMonsters && !this.discoveredMonsters.includes(enemy.id)) {
      this.discoveredMonsters.push(enemy.id);
      this._needsSave = true;
    }

    // Increment and save monster kill counts
    if (this.monsterKills) {
      this.monsterKills[enemy.id] = (this.monsterKills[enemy.id] || 0) + 1;
      this._needsSave = true;
    }

    // Add Gold
    const gold = enemy.rewards.gold || 0;
    if (gold > 0) {
      this.currentGold += gold;
      this.obtainedGold += gold;
      this._needsSave = true;
      const goldDisplay = document.getElementById('header-gold-display');
      if (goldDisplay) goldDisplay.textContent = ` Gold : ${this.currentGold.toLocaleString()} `;
      drops.push({ text: `+${gold}`, icon: 'paid', color: 'text-yellow-400' });
    }

    // Add EXP / JP to party members
    const exp = enemy.rewards.exp || 0;
    const jp = enemy.rewards.jp || 0;
    if (exp > 0) this.obtainedExp += exp;
    
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
              p._skillCache = null; // Invalidate cache on job level up
              setTimeout(() => this.showLevelUp(p.elementId, 'job'), baseLevelUp ? (400 / this.speedMult) : 0);
            }
            if (!document.hidden) this.renderEntities(); // re-render to update max HP/MP and stats display
          }
        }
      }
      // savePartyState() is deferred to endBattle()
    }

    // Process Drops
    let hasNewDrops = false;
    if (enemy.drops) {
      const kills = this.monsterKills[enemy.id] || 0;
      const bonus = Math.floor(kills / 100) * 0.1;
      for (const drop of enemy.drops) {
        const adjustedRate = Math.min(100, drop.rate + bonus);
        if (Math.random() * 100 <= adjustedRate) {
          const mat = MATERIALS_MAP.get(drop.itemId);
          if (mat) {
            if (!this._pendingItemDrops) this._pendingItemDrops = {};
            this._pendingItemDrops[mat.id] = (this._pendingItemDrops[mat.id] || 0) + 1;
            this._needsSave = true;

            drops.push({ text: mat.name, image: mat.image, color: 'text-white' });
            
            const existingDrop = this.obtainedItemsMap.get(mat.id);
            if (existingDrop) {
              existingDrop.quantity++;
            } else {
              const newDrop = { id: mat.id, name: mat.name, image: mat.image, quantity: 1 };
              this.obtainedItems.push(newDrop);
              this.obtainedItemsMap.set(mat.id, newDrop);
            }
            hasNewDrops = true;
          }
        }
      }
    }

    if (hasNewDrops && this.currentTab === 'item' && !document.hidden) {
      this.renderItemTab();
    }

    if (document.hidden || localStorage.getItem('disableBattleAnimations') === 'true') return;
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

  async saveDeferredData() {
    if (!this._needsSave) return;
    if (this.discoveredMonsters) await GameDB.setGameState('discovered_monsters', this.discoveredMonsters);
    if (this.monsterKills) await GameDB.setGameState('monster_kills', this.monsterKills);
    if (this.currentGold !== undefined) await GameDB.setGameState('gold', this.currentGold);
    if (this._pendingItemDrops) {
      for (const [itemId, qty] of Object.entries(this._pendingItemDrops)) {
        const mat = MATERIALS_MAP.get(itemId);
        if (mat) {
          const currentItem = await GameDB.getInventoryItem(itemId) || { id: itemId, quantity: 0, type: 'material', ...mat };
          currentItem.quantity = Math.min(9999, currentItem.quantity + qty);
          await GameDB.putInventoryItem(currentItem);
        }
      }
      this._pendingItemDrops = {};
    }
    this._needsSave = false;
  }

  async endBattle(isWin, text, showModal = true) {
    this.stopAtbLoop();
    this.activeCharacter = null;
    
    await this.saveDeferredData();
    await this.savePartyState();

    if (!showModal) {
      sessionStorage.removeItem('autoBattleMode');
      this.autoBattleMode = 'none';
      window.location.hash = '/dungeon';
      return;
    }

    if (isWin) {
      this.isDungeonClear = this.currentFloorNum >= this.dungeonDef.floors.length;
      
      if (this.isDungeonClear) {
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
        this.elements.resultOverlay.innerHTML = `
          <div class="flex flex-col items-center w-full max-w-[340px] px-4 py-6 overflow-y-auto max-h-full scrollbar-none text-center">
            <h2 class="text-4xl font-black tracking-widest text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-bounce mb-6">VICTORY</h2>
            <p class="text-gray-255 font-bold mb-8 text-sm">ダンジョンの最深部に到達しました！</p>
            <button id="btn-result-ok" class="w-full py-3.5 bg-yellow-600 hover:bg-yellow-500 active:scale-95 text-white rounded-xl font-bold text-sm transition-all shadow-[0_4px_15px_rgba(250,204,21,0.3)] cursor-pointer">
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
            window.location.hash = '/dungeon';
          };
        }
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
                救出・治療費: <span class="text-red-400 font-black">-${actualFee} G</span>
              </span>
            </p>
          </div>

          <!-- 戻るボタン -->
          <button id="btn-result-ok" class="w-full py-3 bg-red-950/80 hover:bg-red-900 active:scale-95 text-red-100 border border-red-800/40 rounded-xl font-bold text-xs transition-all shadow-[0_4px_12px_rgba(239,68,68,0.15)] cursor-pointer">
            街へ戻る
          </button>
        </div>
      `;

      const okBtn = this.elements.resultOverlay.querySelector('#btn-result-ok');
      let autoRetryTimer = null;

      if (willAutoRetry) {
        // Show countdown on the button
        let remaining = 5;
        okBtn.textContent = `再突入まで ${remaining} 秒... (タップで中止)`;
        autoRetryTimer = setInterval(() => {
          remaining--;
          if (remaining <= 0) {
            clearInterval(autoRetryTimer);
            this.elements.resultOverlay.classList.add('hidden');
            this.resetBattleState();
            this.init();
          } else {
            okBtn.textContent = `再突入まで ${remaining} 秒... (タップで中止)`;
          }
        }, 1000);
      }

      if (okBtn) {
        okBtn.onclick = () => {
          if (autoRetryTimer) clearInterval(autoRetryTimer);
          this.elements.resultOverlay.classList.add('hidden');
          sessionStorage.removeItem('autoBattleMode');
          this.autoBattleMode = 'none';
          window.location.hash = '/dungeon';
        };
      }

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
        height: 105px;
        min-height: 105px;
        max-height: 105px;
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
    <div id="battle-scene-bg" class="flex-1 flex flex-col overflow-y-auto" style="background: #0b0b19;">
      
      <!-- Enemy Area (Moved higher) -->
      <div id="enemy-area" class="shrink-0 px-2 py-1 relative z-10">
        <!-- Enemies will be injected here -->
      </div>

      <!-- Party Area -->
      <div id="party-area" class="grid grid-cols-4 gap-1 px-1 mt-1 relative z-10">
        <!-- Party will be injected here -->
      </div>
      
      <!-- Tabs & Tab Content Area -->
      <div class="flex flex-col flex-1 mt-4 px-2 mb-4 relative z-10">
        <!-- Tabs -->
        <div class="flex px-1 gap-1 items-end">
          <button id="tab-btn-skill" class="flex-1 py-2 bg-slate-800 border-t-[3px] border-t-cyan-400 border-x border-x-slate-600/50 border-b border-b-slate-800 rounded-t-xl text-[11px] font-bold shadow-[0_-5px_20px_rgba(34,211,238,0.25)] relative z-10 flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer"><span class="material-symbols-outlined text-[15px] text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" style="font-variation-settings: 'FILL' 1">auto_awesome</span>スキル</button>
          <button id="tab-btn-item" class="flex-1 py-2 bg-slate-900/60 backdrop-blur-sm text-slate-400 border-t-[3px] border-t-transparent border-x border-x-slate-700/50 border-b border-b-slate-600/50 rounded-t-xl text-[11px] font-bold hover:bg-slate-800/70 hover:text-slate-300 flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer opacity-80 hover:opacity-100"><span class="material-symbols-outlined text-[15px] text-slate-500">backpack</span>アイテム</button>
          <button id="tab-btn-info" class="flex-1 py-2 bg-slate-900/60 backdrop-blur-sm text-slate-400 border-t-[3px] border-t-transparent border-x border-x-slate-700/50 border-b border-b-slate-600/50 rounded-t-xl text-[11px] font-bold hover:bg-slate-800/70 hover:text-slate-300 flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer opacity-80 hover:opacity-100"><span class="material-symbols-outlined text-[15px] text-slate-500">info</span>インフォ</button>
        </div>
        <!-- Tab Content -->
        <div id="tab-content" class="flex-1 bg-slate-800 border border-slate-600/50 rounded-b-xl rounded-tr-xl p-2.5 min-h-[120px] overflow-y-auto shadow-xl mb-2 relative z-0">
          <!-- Example content to fill space -->
          <div class="text-xs text-gray-500 flex items-center justify-center h-full">
            （コマンドタブのコンテンツエリア）
          </div>
        </div>
      </div>
      
    </div>

    <!-- Command Area (Fixed at bottom of main, above footer) -->
    <div id="command-area" class="bg-slate-900/85 backdrop-blur-[2px] border-t border-slate-700/80 p-2 flex gap-2 shrink-0 h-[72px] relative shadow-[0_-4px_10px_rgba(0,0,0,0.5)]">
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
