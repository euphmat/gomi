/**
 * battle/index.js
 * BattleManager コアクラス定義 + 各モジュールのミックスイン統合
 * エントリポイント: renderBattlePage()
 */

import { GameDB } from '../../data/database.js';
import { MONSTERS } from '../../definitions/monsters.js';
import { DUNGEONS } from '../../definitions/dungeons.js';
import { SPECIAL_DUNGEONS } from '../../definitions/special_dungeons.js';
import { MATERIALS } from '../../definitions/materials.js';
import { calcFinalStats, buildEquipmentMap, getCharactersWithRanchBonus } from '../../data/stat-calculator.js';
import { JOBS } from '../../jobs/index.js';
import { MEDAL_RANKS } from '../../definitions/medal-definitions.js';
import { renderEnemyCardHtml, renderPartyCardHtml, renderInfoTabHtml, renderItemTabHtml, renderSkillTabHtml, getActiveStateIconsHTML } from './battle-ui.js';
import { formatNumber } from '../../utils/format.js';

// --- Mixin imports ---
import { popupMethods } from './battle-popups.js';
import { atbMethods } from './battle-atb.js';
import { actionMethods } from './battle-actions.js';
import { passiveMethods } from './battle-passives.js';
import { ailmentMethods } from './battle-ailments.js';
import { rendererMethods } from './battle-renderer.js';
import { resultMethods } from './battle-results.js';

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
    this.playerMedals = await GameDB.getGameState('player_medals') || {};
    this.discoveredMonsters = await GameDB.getGameState('discovered_monsters') || [];
    this.currentGold = await GameDB.getGameState('gold') || 0;
    this.ranchData = await GameDB.getGameState('ranch_data') || {};
    this._needsSave = false;

    const isReinit = this.elements.enemyArea.children.length > 0;

    this.currentDungeonId = await GameDB.getGameState('currentDungeon') || 'slime_forest';
    this.currentFloorNum = await GameDB.getGameState('currentFloor') || 1;
    this.dungeonDef = DUNGEONS.find(d => d.id === this.currentDungeonId) || SPECIAL_DUNGEONS.find(d => d.id === this.currentDungeonId);
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

    if (!this.party || this.party.length === 0) {
      const rawParty = await getCharactersWithRanchBonus();
      const rawEquip = await GameDB.getAllEquipment();
      this.equipMap = buildEquipmentMap(rawEquip);

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
    } else {
      // Re-use party in memory, just reset ATB for the next battle
      this.party.forEach(char => {
        char.atb = Math.floor(Math.random() * 501);
      });
    }
    

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
      
      const kills = this.monsterKills[monsterDef.id] || 0;
      const legAppRate = Math.min(1.0, 0.00001 + Math.floor(kills / 100) * 0.00001);
      const isLegendary = Math.random() < legAppRate;
      if (isLegendary) {
        baseStats.hp *= 10;
        baseStats.atk *= 3;
        baseStats.def *= 3;
        baseStats.matk *= 3;
        baseStats.mdef *= 3;
        baseStats.spd *= 3;
      }
      
      return {
        ...monsterDef,
        name: isLegendary ? `伝説の${monsterDef.name}` : monsterDef.name,
        isLegendary,
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
    
    this.applyStartOfBattlePassives();
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

  get speedMult() {
    return parseInt(localStorage.getItem('autoBattleSpeed') || '1', 10);
  }

  get isAutoBattle() {
    return this.autoBattleMode !== 'none';
  }

  resetBattleState(keepParty = false) {
    if (!keepParty) {
      this.party = [];
    }
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
      
      // Inherited skills
      const processInherited = (inheritedData) => {
        if (!inheritedData) return;
        const { jobId, skillId } = inheritedData;
        if (jobId !== character.jobId && character.jobSkills[jobId]) {
          const level = character.jobSkills[jobId][skillId];
          if (level > 0) {
            const jobDef = JOBS[jobId];
            if (jobDef) {
              const skillDef = jobDef.skills.find(s => s.id === skillId);
              const levelConfig = skillDef ? (skillDef.levels.find(l => l.level === level) || skillDef.levels[skillDef.levels.length - 1]) : null;
              character._skillCache.set(skillId, { level, def: skillDef || null, levelConfig, jobId, isInherited: true });
            }
          }
        }
      };

      if (character.jobSkills) {
        processInherited(character.inheritedActiveSkill);
        processInherited(character.inheritedPassiveSkill);
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
      if (this.isStopped) return;
      if (!this.isAutoBattle || this.activeCharacter !== character) return;
      
      // Gather all available skills
      const usableSkills = [];
      if (character._skillCache) {
        for (const [skillId, cacheData] of character._skillCache.entries()) {
          const { level, def, levelConfig } = cacheData;
          if (level > 0 && def && levelConfig && def.type !== 'passive') {
            const isAutoEnabled = this.autoSkillStates[character.id]?.[skillId] !== false;
            if (isAutoEnabled && character.mp.current >= levelConfig.mpCost) {
              if (def.autoBattle && typeof def.autoBattle.check === 'function') {
                usableSkills.push({
                  id: skillId,
                  def,
                  levelConfig
                });
              }
            }
          }
        }
      }

      const context = {
        enemies: this.enemies,
        party: this.party,
        selectedEnemyTarget: this.selectedEnemyTarget
      };

      let bestAction = {
        type: 'attack',
        score: 30,
        target: context.selectedEnemyTarget || (this.enemies.find(e => !e.isDead) || null),
        skill: null
      };

      for (const skill of usableSkills) {
        const checkResult = skill.def.autoBattle.check(character, skill.levelConfig, context);
        if (checkResult) {
          let target = checkResult;
          let score = 50;
          
          if (typeof checkResult === 'object' && checkResult.score !== undefined) {
             score = checkResult.score;
             target = checkResult.target;
          } else if (checkResult === true) {
             target = context.selectedEnemyTarget || this.enemies.find(e => !e.isDead);
          }

          if (score > bestAction.score && target) {
            bestAction = {
              type: 'skill',
              score,
              target,
              skill
            };
          }
        }
      }

      if (bestAction.type === 'skill' && bestAction.skill && bestAction.target) {
        const prevTarget = this.selectedEnemyTarget;
        this.selectedEnemyTarget = bestAction.target;
        this.executeSkill(character, bestAction.skill.def, bestAction.skill.levelConfig, { autoTarget: bestAction.target });
        this.selectedEnemyTarget = prevTarget;
      } else if (bestAction.target) {
        this.executeAttack(character, bestAction.target, true);
      }
    }, 500 / this.speedMult);
  }

  updateTabStyles() {
    const tabs = [
      { btn: this.elements.tabBtnSkill, id: 'skill', icon: 'auto_awesome', label: 'Skill' },
      { btn: this.elements.tabBtnItem, id: 'item', icon: 'backpack', label: 'Item' },
      { btn: this.elements.tabBtnInfo, id: 'info', icon: 'info', label: 'Info' }
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

    const html = renderInfoTabHtml(targetEntity, false, this.equipMap, this.currentFloorNum, MATERIALS, this.monsterKills, this.ranchData, this.playerMedals);
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
}

// --- Apply mixins ---
Object.assign(BattleManager.prototype,
  popupMethods,
  atbMethods,
  actionMethods,
  passiveMethods,
  ailmentMethods,
  rendererMethods,
  resultMethods
);

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

    <!-- Fixed Battle Area (Enemies, Party, Tabs) -->
    <div id="battle-scene-bg" class="flex-1 flex flex-col overflow-hidden" style="background: #0b0b19;">
      
      <!-- Enemy Area (Moved higher) -->
      <div id="enemy-area" class="shrink-0 px-2 py-1 relative z-10">
        <!-- Enemies will be injected here -->
      </div>

      <!-- Party Area -->
      <div id="party-area" class="shrink-0 grid grid-cols-4 gap-1 px-1 mt-1 relative z-10">
        <!-- Party will be injected here -->
      </div>
      
      <!-- Tabs & Tab Content Area -->
      <div class="flex flex-col flex-1 mt-4 px-2 mb-4 relative z-10 min-h-0">
        <!-- Tabs -->
        <div class="flex px-1 gap-1 items-end shrink-0">
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
