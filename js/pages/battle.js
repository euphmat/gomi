import { GameDB } from '../data/database.js';
import { MONSTERS } from '../definitions/monsters.js';
import { DUNGEONS } from '../definitions/dungeons.js';
import { MATERIALS } from '../definitions/materials.js';
import { calcFinalStats, buildEquipmentMap, getCharactersWithRanchBonus } from '../data/stat-calculator.js';
import { JOBS } from '../jobs/index.js';
import { MEDAL_RANKS } from '../definitions/medal-definitions.js';
import { renderEnemyCardHtml, renderPartyCardHtml, renderInfoTabHtml, renderItemTabHtml, renderSkillTabHtml, getActiveStateIconsHTML } from './battle-ui.js';
import { formatNumber } from '../utils/format.js';

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

    const rawParty = await getCharactersWithRanchBonus();
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

  applyStartOfBattlePassives() {
    const aliveParty = this.party.filter(p => !p.isDead);
    let protectionConfig = null;
    let magicBarrierConfig = null;
    let weaponBlessConfig = null;
    let magicBlessConfig = null;
    let openingActConfig = null;

    aliveParty.forEach(p => {
      if (p.jobSkills) {
        const prot = this._findSkill(p, 'protection');
        if (prot && prot.level > 0 && prot.levelConfig) {
          if (!protectionConfig || prot.levelConfig.percent > protectionConfig.percent) {
            protectionConfig = prot.levelConfig;
          }
        }
        const mb = this._findSkill(p, 'magic_barrier');
        if (mb && mb.level > 0 && mb.levelConfig) {
          if (!magicBarrierConfig || mb.levelConfig.percent > magicBarrierConfig.percent) {
            magicBarrierConfig = mb.levelConfig;
          }
        }
        const wb = this._findSkill(p, 'weapon_bless');
        if (wb && wb.level > 0 && wb.levelConfig) {
          if (!weaponBlessConfig || wb.levelConfig.percent > weaponBlessConfig.percent) {
            weaponBlessConfig = wb.levelConfig;
          }
        }
        const magb = this._findSkill(p, 'magic_bless');
        if (magb && magb.level > 0 && magb.levelConfig) {
          if (!magicBlessConfig || magb.levelConfig.percent > magicBlessConfig.percent) {
            magicBlessConfig = magb.levelConfig;
          }
        }
        const oa = this._findSkill(p, 'opening_act');
        if (oa && oa.level > 0 && oa.levelConfig) {
          if (!openingActConfig || oa.levelConfig.spdPercent > openingActConfig.spdPercent) {
            openingActConfig = oa.levelConfig;
          }
        }
      }
    });

    let delay = 500;
    const isFirstFloor = this.currentFloorNum === 1;

    if (protectionConfig) {
      aliveParty.forEach(p => {
        p._passiveDefBuffPercent = Math.max(p._passiveDefBuffPercent || 0, protectionConfig.percent);
        
        if (isFirstFloor) {
          setTimeout(() => {
            this.showDamage(p.elementId, `DEF UP`, 'text-green-400');
          }, delay);
        }
      });
      if (isFirstFloor) delay += 500;
    }

    if (magicBarrierConfig) {
      aliveParty.forEach(p => {
        p._passiveMdefBuffAmount = Math.max(p._passiveMdefBuffAmount || 0, Math.floor((p.stats?.mdef || 0) * (magicBarrierConfig.percent / 100)));
        
        if (isFirstFloor) {
          setTimeout(() => {
            this.showDamage(p.elementId, `MDEF UP`, 'text-indigo-300');
          }, delay);
        }
      });
      if (isFirstFloor) delay += 500;
    }

    if (weaponBlessConfig) {
      aliveParty.forEach(p => {
        p._passiveAtkBuffPercent = Math.max(p._passiveAtkBuffPercent || 0, weaponBlessConfig.percent);
        
        if (isFirstFloor) {
          setTimeout(() => {
            this.showDamage(p.elementId, `ATK UP`, 'text-red-400');
          }, delay);
        }
      });
      if (isFirstFloor) delay += 500;
    }

    if (magicBlessConfig) {
      aliveParty.forEach(p => {
        p._passiveMatkBuffPercent = Math.max(p._passiveMatkBuffPercent || 0, magicBlessConfig.percent);
        
        if (isFirstFloor) {
          setTimeout(() => {
            this.showDamage(p.elementId, `MATK UP`, 'text-purple-400');
          }, delay);
        }
      });
      if (isFirstFloor) delay += 500;
    }

    if (openingActConfig) {
      aliveParty.forEach(p => {
        if (p.stats && p.stats.spd) {
          p.stats.spd = Math.floor(p.stats.spd * (1 + openingActConfig.spdPercent / 100));
        }
        
        if (isFirstFloor) {
          setTimeout(() => {
            this.showDamage(p.elementId, `SPD UP`, 'text-teal-300');
          }, delay);
        }
      });
      if (isFirstFloor) delay += 500;
    }
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

    const N = this.enemies.filter(e => !e.isDead).length || 1;
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
    if (this._updateEntitiesPending) return;
    this._updateEntitiesPending = true;
    requestAnimationFrame(() => {
      this._updateEntitiesPending = false;
      this._doUpdateEntities();
    });
  }

  _doUpdateEntities() {
    if (document.hidden) return;
    const disableAnim = localStorage.getItem('disableBattleAnimations') === 'true';
    if (!this.domCache) return;

    const aliveEnemiesCount = this.enemies.filter(e => !e.isDead).length || 1;
    this.elements.enemyArea.style.setProperty('--enemy-cols', aliveEnemiesCount);

    this.enemies.forEach(e => {
      const cache = this.domCache.enemies[e.elementId];
      if (!cache) return;
      
      const { root: el, iconContainer, hpContainer, hpBar, hpText, atbContainer, stateIconsContainer } = cache;

      if (stateIconsContainer && !e.isDead) {
        const newHtml = getActiveStateIconsHTML(e);
        if (stateIconsContainer.innerHTML !== newHtml) {
          stateIconsContainer.innerHTML = newHtml;
        }
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

      const newHpScale = `scaleX(${e.currentHp / e.maxHp})`;
      if (hpBar.style.transform !== newHpScale) hpBar.style.transform = newHpScale;
      if (hpText) {
        const newHpText = `${formatNumber(Math.floor(e.currentHp))}/${formatNumber(e.maxHp)}`;
        if (hpText.textContent !== newHpText) hpText.textContent = newHpText;
      }
    });

    this.party.forEach(p => {
      const cache = this.domCache.party[p.elementId];
      if (!cache) return;
      const { root: el, lvEl, jlvEl, spEl, hpBar, hpText, mpBar, mpText, expBar, expText, jpBar, jpText, statBlocks, stateIconsContainer } = cache;

      if (stateIconsContainer && !p.isDead) {
        const newHtml = getActiveStateIconsHTML(p);
        if (stateIconsContainer.innerHTML !== newHtml) {
          stateIconsContainer.innerHTML = newHtml;
        }
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

      if (lvEl && lvEl.textContent !== String(p.level || 1)) lvEl.textContent = p.level || 1;
      if (jlvEl && jlvEl.textContent !== String(p.jobLevel || 1)) jlvEl.textContent = p.jobLevel || 1;
      if (spEl && spEl.textContent !== String(p.sp || 0)) spEl.textContent = p.sp || 0;

      if (hpBar) {
        const trueMaxHp = p.stats.hp || p.hp.max;
        const newHpScale = `scaleX(${p.hp.current / trueMaxHp})`;
        if (hpBar.style.transform !== newHpScale) hpBar.style.transform = newHpScale;
        if (hpText) {
          const newHpText = `${formatNumber(Math.floor(p.hp.current))}/${formatNumber(trueMaxHp)}`;
          if (hpText.textContent !== newHpText) hpText.textContent = newHpText;
        }
      }

      if (mpBar) {
        const trueMaxMp = p.stats.mp || p.mp.max;
        const newMpScale = `scaleX(${p.mp.current / trueMaxMp})`;
        if (mpBar.style.transform !== newMpScale) mpBar.style.transform = newMpScale;
        if (mpText) {
          const newMpText = `${formatNumber(Math.floor(p.mp.current))}/${formatNumber(trueMaxMp)}`;
          if (mpText.textContent !== newMpText) mpText.textContent = newMpText;
        }
      }

      if (expBar) {
        const newExpScale = `scaleX(${p.exp.current / p.exp.max})`;
        if (expBar.style.transform !== newExpScale) expBar.style.transform = newExpScale;
        if (expText) {
          const newExpText = `${formatNumber(Math.floor(p.exp.current))}/${formatNumber(p.exp.max)}`;
          if (expText.textContent !== newExpText) expText.textContent = newExpText;
        }
      }

      if (jpBar) {
        const newJpScale = `scaleX(${p.jp.current / p.jp.max})`;
        if (jpBar.style.transform !== newJpScale) jpBar.style.transform = newJpScale;
        if (jpText) {
          const newJpText = `${formatNumber(Math.floor(p.jp.current))}/${formatNumber(p.jp.max)}`;
          if (jpText.textContent !== newJpText) jpText.textContent = newJpText;
        }
      }

      const statVals = cache.statVals;
      const statRows = cache.statRows;
      const statIcons = cache.statIcons;
      const statLabels = cache.statLabels;

      if (statVals && statVals.atk) {
        const fSpd = formatNumber(p.stats.spd);
        if (statVals.spd.textContent !== fSpd) statVals.spd.textContent = fSpd;

        if (p._atkBuffTurns > 0 || p._passiveAtkBuffPercent > 0) {
          const isStackedAtk = p._atkBuffTurns > 0 && p._passiveAtkBuffPercent > 0;
          const totalAtkPercent = (p._passiveAtkBuffPercent || 0) + (p._atkBuffTurns > 0 ? (p._atkBuffPercent || 0) : 0);
          const atkStr = formatNumber(Math.floor(p.stats.atk * (1 + totalAtkPercent / 100)));
          if (statVals.atk.textContent !== atkStr) statVals.atk.textContent = atkStr;
          statVals.atk.classList.remove('text-gray-100');
          statVals.atk.classList.add('text-red-400');
          statRows.atk.className = `stat-row-atk flex justify-between items-center border rounded px-1 py-0.5 transition-colors ${isStackedAtk ? 'bg-red-800/60 border-red-400 shadow-[0_0_5px_rgba(248,113,113,0.4)]' : 'bg-red-900/40 border-red-500/50 shadow-none'}`;
          statIcons.atk.classList.remove('text-slate-400');
          statIcons.atk.classList.add('text-red-400');
          statLabels.atk.classList.add('text-red-400');
        } else {
          const atkStr = formatNumber(p.stats.atk);
          if (statVals.atk.textContent !== atkStr) statVals.atk.textContent = atkStr;
          statVals.atk.classList.remove('text-red-400');
          statVals.atk.classList.add('text-gray-100');
          statRows.atk.className = `stat-row-atk flex justify-between items-center border rounded px-1 py-0.5 transition-colors bg-gray-900/40 border-transparent shadow-none`;
          statIcons.atk.classList.remove('text-red-400');
          statIcons.atk.classList.add('text-slate-400');
          statLabels.atk.classList.remove('text-red-400');
        }

        if (p._matkBuffTurns > 0 || p._passiveMatkBuffPercent > 0) {
          const isStackedMatk = p._matkBuffTurns > 0 && p._passiveMatkBuffPercent > 0;
          const totalMatkPercent = (p._passiveMatkBuffPercent || 0) + (p._matkBuffTurns > 0 ? (p._matkBuffPercent || 0) : 0);
          const matStr = formatNumber(Math.floor(p.stats.matk * (1 + totalMatkPercent / 100)));
          if (statVals.mat.textContent !== matStr) statVals.mat.textContent = matStr;
          statVals.mat.classList.remove('text-gray-100');
          statVals.mat.classList.add('text-purple-400');
          statRows.mat.className = `stat-row-mat flex justify-between items-center border rounded px-1 py-0.5 transition-colors ${isStackedMatk ? 'bg-purple-800/60 border-purple-400 shadow-[0_0_5px_rgba(192,132,252,0.4)]' : 'bg-purple-900/40 border-purple-500/50 shadow-none'}`;
          statIcons.mat.classList.remove('text-slate-400');
          statIcons.mat.classList.add('text-purple-400');
          statLabels.mat.classList.add('text-purple-400');
        } else {
          const matStr = formatNumber(p.stats.matk);
          if (statVals.mat.textContent !== matStr) statVals.mat.textContent = matStr;
          statVals.mat.classList.remove('text-purple-400');
          statVals.mat.classList.add('text-gray-100');
          statRows.mat.className = `stat-row-mat flex justify-between items-center border rounded px-1 py-0.5 transition-colors bg-gray-900/40 border-transparent shadow-none`;
          statIcons.mat.classList.remove('text-purple-400');
          statIcons.mat.classList.add('text-slate-400');
          statLabels.mat.classList.remove('text-purple-400');
        }

        if (p._defBuffTurns > 0 || p._passiveDefBuffPercent > 0) {
          const isStackedDef = p._defBuffTurns > 0 && p._passiveDefBuffPercent > 0;
          const totalDefPercent = (p._passiveDefBuffPercent || 0) + (p._defBuffTurns > 0 ? (p._defBuffPercent || 0) : 0);
          const defStr = formatNumber(Math.floor(p.stats.def * (1 + totalDefPercent / 100)));
          if (statVals.def.textContent !== defStr) statVals.def.textContent = defStr;
          statVals.def.classList.remove('text-gray-100');
          statVals.def.classList.add('text-green-400');
          statRows.def.className = `stat-row-def flex justify-between items-center border rounded px-1 py-0.5 transition-colors ${isStackedDef ? 'bg-green-800/60 border-green-400 shadow-[0_0_5px_rgba(74,222,128,0.4)]' : 'bg-green-900/40 border-green-500/50 shadow-none'}`;
          statIcons.def.classList.remove('text-slate-400');
          statIcons.def.classList.add('text-green-400');
          statLabels.def.classList.add('text-green-400');
        } else {
          const defStr = formatNumber(p.stats.def);
          if (statVals.def.textContent !== defStr) statVals.def.textContent = defStr;
          statVals.def.classList.remove('text-green-400');
          statVals.def.classList.add('text-gray-100');
          statRows.def.className = `stat-row-def flex justify-between items-center border rounded px-1 py-0.5 transition-colors bg-gray-900/40 border-transparent shadow-none`;
          statIcons.def.classList.remove('text-green-400');
          statIcons.def.classList.add('text-slate-400');
          statLabels.def.classList.remove('text-green-400');
        }

        if (p._mdefBuffTurns > 0 || p._passiveMdefBuffAmount > 0) {
          const isStackedMdef = p._mdefBuffTurns > 0 && p._passiveMdefBuffAmount > 0;
          const totalMdefAmount = (p._passiveMdefBuffAmount || 0) + (p._mdefBuffTurns > 0 ? (p._mdefBuffAmount || 0) : 0);
          const mdefStr = String(p.stats.mdef + totalMdefAmount);
          if (statVals.mdf.textContent !== mdefStr) statVals.mdf.textContent = mdefStr;
          statVals.mdf.classList.remove('text-gray-100');
          statVals.mdf.classList.add('text-indigo-300');
          statRows.mdf.className = `stat-row-mdf flex justify-between items-center border rounded px-1 py-0.5 transition-colors ${isStackedMdef ? 'bg-indigo-800/60 border-indigo-400 shadow-[0_0_5px_rgba(129,140,248,0.4)]' : 'bg-indigo-900/40 border-indigo-500/50 shadow-none'}`;
          statIcons.mdf.classList.remove('text-indigo-400');
          statIcons.mdf.classList.add('text-indigo-300');
          statLabels.mdf.classList.add('text-indigo-300');
        } else {
          const mdefStr = formatNumber(p.stats.mdef);
          if (statVals.mdf.textContent !== mdefStr) statVals.mdf.textContent = mdefStr;
          statVals.mdf.classList.remove('text-indigo-300');
          statVals.mdf.classList.add('text-gray-100');
          statRows.mdf.className = `stat-row-mdf flex justify-between items-center border rounded px-1 py-0.5 transition-colors bg-gray-900/40 border-transparent shadow-none`;
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
      // Yield slightly so that current animations (popups, ATB) aren't interrupted by heavy DOM rendering
      setTimeout(() => {
        this.renderTabContent();
      }, 0);
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
            atk: el.querySelector('.stat-icon-atk'),
            def: el.querySelector('.stat-icon-def'),
            mat: el.querySelector('.stat-icon-mat'),
            mdf: el.querySelector('.stat-icon-mdf')
          },
          statLabels: {
            atk: el.querySelector('.stat-label-atk'),
            def: el.querySelector('.stat-label-def'),
            mat: el.querySelector('.stat-label-mat'),
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
      if (!this.isAutoBattle || this.activeCharacter !== character) return;
      
      // Gather all available skills
      const usableSkills = [];
      if (character._skillCache) {
        for (const [skillId, cacheData] of character._skillCache.entries()) {
          const { level, def, levelConfig } = cacheData;
          if (level > 0 && def && levelConfig && def.type !== 'passive') {
            const isAutoEnabled = this.autoSkillStates[character.id]?.[skillId] !== false;
            if (isAutoEnabled && character.mp.current >= levelConfig.mpCost) {
              if (def.autoBattle && typeof def.autoBattle.priority === 'number' && typeof def.autoBattle.check === 'function') {
                usableSkills.push({
                  id: skillId,
                  priority: def.autoBattle.priority,
                  def,
                  levelConfig
                });
              }
            }
          }
        }
      }

      // Sort by priority descending
      usableSkills.sort((a, b) => b.priority - a.priority);

      const context = {
        enemies: this.enemies,
        party: this.party,
        selectedEnemyTarget: this.selectedEnemyTarget
      };

      let skillExecuted = false;
      for (const skill of usableSkills) {
        const targetResult = skill.def.autoBattle.check(character, skill.levelConfig, context);
        if (targetResult) {
          const targetEntity = (typeof targetResult === 'object' && targetResult.id) ? targetResult : null;
          
          const prevTarget = this.selectedEnemyTarget;
          if (targetEntity) this.selectedEnemyTarget = targetEntity;
          this.executeSkill(character, skill.def, skill.levelConfig);
          if (targetEntity) this.selectedEnemyTarget = prevTarget;
          
          skillExecuted = true;
          break;
        }
      }

      if (!skillExecuted) {
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

    const html = renderInfoTabHtml(targetEntity, false, this.equipMap, this.currentFloorNum, MATERIALS, this.monsterKills, this.ranchData, this.playerMedals);
    this.elements.tabContent.innerHTML = html;
  }

  renderItemTab() {
    const html = renderItemTabHtml(this.obtainedItems);
    this.elements.tabContent.innerHTML = html;

    this.elements.tabContent.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        e.stopPropagation();
        const itemId = card.dataset.itemId;
        const itemIndex = this.obtainedItems.findIndex(i => i.id === itemId);
        if (itemIndex > -1) {
          const item = this.obtainedItems[itemIndex];
          const mat = MATERIALS_MAP.get(item.id);
          if (mat) {
             const sellPrice = mat.sellPrice || 0;
             const totalGold = sellPrice * item.quantity;
             
             let toSell = item.quantity;

             // Remove from pending drops
             if (this._pendingItemDrops && this._pendingItemDrops[itemId]) {
                 const pending = this._pendingItemDrops[itemId];
                 if (toSell <= pending) {
                     this._pendingItemDrops[itemId] -= toSell;
                     toSell = 0;
                 } else {
                     toSell -= pending;
                     this._pendingItemDrops[itemId] = 0;
                 }
             }

             // If any remaining amount was already saved to DB, subtract it
             if (toSell > 0) {
                 const invKey = `inventory_material_${itemId}`;
                 const currentCount = await GameDB.getGameState(invKey) || 0;
                 await GameDB.setGameState(invKey, Math.max(0, currentCount - toSell));
             }

             // Add gold
             if (totalGold > 0) {
               const currentGold = await GameDB.getGameState('gold') || 0;
               await GameDB.setGameState('gold', currentGold + totalGold);
               const goldDisplay = document.getElementById('header-gold-display');
              if (goldDisplay) goldDisplay.textContent = ` Gold : ${formatNumber(currentGold + totalGold)} `;
               
               // Show visual feedback (gold gain) near the click
               const popup = document.createElement('div');
               popup.className = `fixed z-[9999] pointer-events-none text-yellow-400 font-black text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]`;
               popup.style.left = `${e.clientX}px`;
               popup.style.top = `${e.clientY}px`;
               popup.textContent = `+${totalGold} G`;
               document.body.appendChild(popup);
               
               const anim = popup.animate([
                 { opacity: 0, transform: `translate(-50%, 0) scale(0.5)` },
                 { opacity: 1, transform: `translate(-50%, -15px) scale(1.2)`, offset: 0.15 },
                 { opacity: 1, transform: `translate(-50%, -20px) scale(1.0)`, offset: 0.3 },
                 { opacity: 0.9, transform: `translate(-50%, -25px) scale(1.0)`, offset: 0.7 },
                 { opacity: 0, transform: `translate(-50%, -30px) scale(0.9)` }
               ], { duration: 800, easing: 'ease-out', fill: 'forwards' });
               
               anim.onfinish = () => popup.remove();
             }

             // Remove from obtainedItems map and array
             this.obtainedItems.splice(itemIndex, 1);
             this.obtainedItemsMap.delete(itemId);

             // Re-render
             this.renderItemTab();
          }
        }
      });
    });
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

  executeSkill(caster, skillDef, levelConfig, options = {}) {
    if (!options.isDoubleAct && caster.mp && caster.mp.current < levelConfig.mpCost) return;
    if (!options.isDoubleAct && levelConfig.mpCost > 0 && caster.activeAilment && caster.activeAilment.type === 'silence') {
      this.showActionName(caster.elementId, '沈黙', 'text-indigo-400', 'border-indigo-500/50');
      caster.atb = 0;
      this.activeCharacter = null;
      this.renderEntities();
      return;
    }

    if (!options.isDoubleAct && caster.mp) {
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
    

    // --- Passive: Double Act ---
    if (!options.isDoubleAct && caster.jobSkills) {
      const doubleActSkill = this._findSkill(caster, 'double_act');
      if (doubleActSkill && doubleActSkill.level > 0 && doubleActSkill.levelConfig) {
        if (Math.random() * 100 < doubleActSkill.levelConfig.chance) {
          setTimeout(() => {
            if (caster.hp !== undefined && !caster.isDead) {
              this.showActionName(caster.elementId, 'ダブルアクト', 'text-cyan-300', 'border-cyan-500/50');
              this.executeSkill(caster, skillDef, levelConfig, { isDoubleAct: true });
            }
          }, 600 / this.speedMult);
        }
      }
    }

    // --- Passive: Mana Regen ---
    const regenSkill = this._findSkill(caster, 'mana_regen');
    if (regenSkill && regenSkill.level > 0 && regenSkill.levelConfig) {
      const amount = regenSkill.levelConfig.recoverMp;
      caster.mp.current = Math.min(caster.stats?.mp || caster.mp.max, caster.mp.current + amount);
      setTimeout(() => {
        this.showDamage(caster.elementId, `+${amount} MP`, 'text-blue-400');
      }, 300 / this.speedMult);
    }
    
    // --- Passive: Regen (HP) ---
    const hpRegenSkill = this._findSkill(caster, 'regen');
    if (hpRegenSkill && hpRegenSkill.level > 0 && hpRegenSkill.levelConfig) {
      const amount = hpRegenSkill.levelConfig.recoverHp;
      caster.hp.current = Math.min(caster.stats?.hp || caster.hp.max, caster.hp.current + amount);
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
    this.isStopped = true;
    if (this.autoNextTimer) {
      clearTimeout(this.autoNextTimer);
      this.autoNextTimer = null;
    }
    if (this.autoRetryTimer) {
      clearInterval(this.autoRetryTimer);
      this.autoRetryTimer = null;
    }
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
    this.isStopped = false;
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
               if (atbEl.style.opacity !== '0') atbEl.style.opacity = '0';
             } else {
               if (atbEl.style.opacity !== '1') atbEl.style.opacity = '1';
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
               if (atbEl.style.opacity !== '0') atbEl.style.opacity = '0';
             } else {
               if (atbEl.style.opacity !== '1') atbEl.style.opacity = '1';
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
          
          // --- Passive: Adhesive Substance (粘着物質) ---
          if (this.activeCharacter.jobSkills && !this.activeCharacter.isDead) {
            const adhesiveSkill = this._findSkill(this.activeCharacter, 'adhesive_substance');
            if (adhesiveSkill && adhesiveSkill.level > 0 && adhesiveSkill.levelConfig) {
              const spdDown = adhesiveSkill.levelConfig.spdDown || 10;
              let triggered = false;
              this.enemies.forEach(enemy => {
                if (!enemy.isDead && enemy.stats && enemy.stats.spd > 1) {
                  enemy.stats.spd = Math.max(1, Math.floor(enemy.stats.spd * (1 - spdDown / 100)));
                  triggered = true;
                }
              });
              if (triggered && !document.hidden) {
                this.showActionName(this.activeCharacter.elementId, '粘着物質', 'text-amber-500', 'border-amber-600/50');
              }
            }
          }

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

    // --- 沈黙 (Silence) の判定 ---
    if (isMagic && attacker.activeAilment && attacker.activeAilment.type === 'silence' && !options.hideActionName) {
      this.showActionName(attacker.elementId, '魔法不発', 'text-indigo-400', 'border-indigo-500/50');
      attacker.atb = 0;
      if (attacker.hp !== undefined) this.activeCharacter = null;
      else this.activeEnemy = null;
      this.renderEntities();
      return;
    }

    // --- 華麗なる見切り (Splendid Evasion) の判定 ---
    if (!isMagic && defender.hp !== undefined) {
      const evadeSkill = this._findSkill(defender, 'splendid_evasion');
      if (evadeSkill && evadeSkill.level > 0 && evadeSkill.levelConfig) {
        if (Math.random() < (evadeSkill.levelConfig.evadeChance / 100)) {
          this.showActionName(defender.elementId, 'DODGE', 'text-green-400', 'border-green-500/50');
          if (!options.skipAtbReset && !options.isAoEProcessed) {
            attacker.atb = 0;
            if (attacker.hp !== undefined) this.activeCharacter = null;
            else this.activeEnemy = null;
            this.renderEntities();
          }
          return;
        }
      }
    }

    let atkStat = isMagic ? (attacker.stats.matk || 0) : (attacker.stats.atk || 0);
    if (!isMagic) {
      const totalAtkPercent = (attacker._passiveAtkBuffPercent || 0) + (attacker._atkBuffTurns > 0 ? (attacker._atkBuffPercent || 0) : 0);
      if (totalAtkPercent !== 0) {
        atkStat = Math.floor(atkStat * (1 + totalAtkPercent / 100));
      }
    }
    if (isMagic) {
      const totalMatkPercent = (attacker._passiveMatkBuffPercent || 0) + (attacker._matkBuffTurns > 0 ? (attacker._matkBuffPercent || 0) : 0);
      if (totalMatkPercent !== 0) {
        atkStat = Math.floor(atkStat * (1 + totalMatkPercent / 100));
      }
    }
    
    let defStat = isMagic ? (defender.stats.mdef || 0) : (defender.stats.def || 0);

    // --- 防御バフ適用 (物理防御陣形 + プロテクション) ---
    if (!isMagic) {
      const totalDefPercent = (defender._passiveDefBuffPercent || 0) + (defender._defBuffTurns > 0 ? (defender._defBuffPercent || 0) : 0);
      if (totalDefPercent !== 0) {
        defStat = Math.floor(defStat * (1 + totalDefPercent / 100));
      }
    }
    // --- 魔法防御バフ適用 (マジックバリア) ---
    if (isMagic) {
      const totalMdefAmount = (defender._passiveMdefBuffAmount || 0) + (defender._mdefBuffTurns > 0 ? (defender._mdefBuffAmount || 0) : 0);
      defStat += totalMdefAmount;
    }

    let damage = 0;
    if (options.isHybrid) {
      let physAtk = attacker.stats.atk || 0;
      const hTotalAtkPercent = (attacker._passiveAtkBuffPercent || 0) + (attacker._atkBuffTurns > 0 ? (attacker._atkBuffPercent || 0) : 0);
      if (hTotalAtkPercent !== 0) {
        physAtk = Math.floor(physAtk * (1 + hTotalAtkPercent / 100));
      }
      
      let physDef = defender.stats.def || 0;
      const hTotalDefPercent = (defender._passiveDefBuffPercent || 0) + (defender._defBuffTurns > 0 ? (defender._defBuffPercent || 0) : 0);
      if (hTotalDefPercent !== 0) {
        physDef = Math.floor(physDef * (1 + hTotalDefPercent / 100));
      }
      
      let magAtk = attacker.stats.matk || 0;
      const hTotalMatkPercent = (attacker._passiveMatkBuffPercent || 0) + (attacker._matkBuffTurns > 0 ? (attacker._matkBuffPercent || 0) : 0);
      if (hTotalMatkPercent !== 0) {
        magAtk = Math.floor(magAtk * (1 + hTotalMatkPercent / 100));
      }
      
      let magDef = defender.stats.mdef || 0;
      const hTotalMdefAmount = (defender._passiveMdefBuffAmount || 0) + (defender._mdefBuffTurns > 0 ? (defender._mdefBuffAmount || 0) : 0);
      magDef += hTotalMdefAmount;
      
      const physDamage = Math.max(0, physAtk - Math.floor(physDef / 2));
      const magDamage = Math.max(0, magAtk - Math.floor(magDef / 2));
      damage = Math.max(1, physDamage + magDamage);
    } else {
      damage = Math.max(1, atkStat - Math.floor(defStat / 2));
    }
    damage = Math.floor(damage * (0.9 + Math.random() * 0.2));
    
    const damageMultiplier = options.damageMultiplier || 1;
    damage = Math.floor(damage * damageMultiplier);

    // --- 呪い (Curse) の被ダメージ増加判定 ---
    if (defender.activeAilment && defender.activeAilment.type === 'curse') {
      damage = Math.floor(damage * 1.5);
    }

    // --- ポップアップの表示 ---
    if (!options.hideActionName) {
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

    // --- Passive: Slime Body (スライムボディ) ---
    if (!isParty && defender.jobSkills) {
      const slimeBodySkill = this._findSkill(defender, 'slime_body');
      if (slimeBodySkill && slimeBodySkill.level > 0 && slimeBodySkill.levelConfig) {
        const reduction = slimeBodySkill.levelConfig.reduction || 15;
        damage = Math.floor(damage * (1 - reduction / 100));
        if (damage < 1) damage = 1;
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

    // --- 汎用攻撃アニメーション (通常攻撃のみ) ---
    if ((!options.damageType || options.damageType === 'ability') && localStorage.getItem('disableBattleAnimations') !== 'true') {
      const defenderEl = document.getElementById(defender.elementId);
      if (defenderEl) {
        const rect = defenderEl.getBoundingClientRect();
        const tx = rect.left + rect.width / 2;
        const ty = rect.top + rect.height / 2;

        const slash = document.createElement('div');
        slash.style.position = 'fixed';
        slash.style.left = `${tx}px`;
        slash.style.top = `${ty}px`;
        slash.style.width = '120px';
        slash.style.height = '6px';
        slash.style.background = 'linear-gradient(to right, transparent, rgba(255,255,255,0.8), #fff, rgba(255,255,255,0.8), transparent)';
        slash.style.boxShadow = '0 0 8px rgba(255,255,255,0.5)';
        slash.style.zIndex = '9998';
        slash.style.pointerEvents = 'none';
        document.body.appendChild(slash);

        const anim = slash.animate([
          { transform: 'translate(-50%, -50%) rotate(45deg) scaleX(0.1) scaleY(0.2)', opacity: 0 },
          { transform: 'translate(-50%, -50%) rotate(45deg) scaleX(1.0) scaleY(1.0)', opacity: 1, offset: 0.3 },
          { transform: 'translate(-50%, -50%) rotate(45deg) scaleX(1.5) scaleY(0.1)', opacity: 0 }
        ], { duration: 200, easing: 'ease-out' });

        anim.onfinish = () => slash.remove();
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
      let survivedBySlimeCore = false;
      if (defender.hp.current - damage <= 0 && defender.jobSkills) {
        const slimeCoreSkill = this._findSkill(defender, 'slime_core');
        if (slimeCoreSkill && slimeCoreSkill.level > 0 && slimeCoreSkill.levelConfig) {
          const thresholdPercent = slimeCoreSkill.levelConfig.threshold || 50;
          const currentPercent = (prevHp / (defender.stats.hp || defender.hp.max)) * 100;
          if (currentPercent >= thresholdPercent) {
            damage = prevHp - 1;
            survivedBySlimeCore = true;
            setTimeout(() => {
              this.showActionName(defender.elementId, 'スライムコア', 'text-green-300', 'border-green-500/50');
            }, 300 / this.speedMult);
          }
        }
      }

      defender.hp.current -= damage;
      if (defender.hp.current <= 0 && !survivedBySlimeCore) {
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
        if (this.activeCharacter === attacker) {
          this.activeCharacter = null;
        }
        
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
                  hideActionName: true,
                  skipAtbReset: true
                });
              }
            }, 300 / this.speedMult);
          }
        }
        
        // --- Passive: Plus One ---
        if (!options.damageType && !isMagic && !defender.isDead) {
          const plusOneSkill = this._findSkill(attacker, 'plus_one');
          if (plusOneSkill && plusOneSkill.level > 0 && plusOneSkill.levelConfig) {
            const hits = plusOneSkill.levelConfig.hits || 1;
            for (let i = 0; i < hits; i++) {
              setTimeout(() => {
                let currentTarget = defender;
                if (currentTarget.isDead) {
                  currentTarget = this.enemies.find(e => !e.isDead);
                }
                if (currentTarget && !currentTarget.isDead && !attacker.isDead) {
                  if (i === 0) {
                    this.showActionName(attacker.elementId, '追撃', 'text-yellow-400', 'border-yellow-500/50');
                  }
                  this.executeAttack(attacker, currentTarget, true, {
                    actionName: '追撃',
                    damageMultiplier: plusOneSkill.levelConfig.multiplier || 0.5,
                    damageType: 'ability',
                    hideActionName: true,
                    skipAtbReset: true
                  });
                }
              }, (400 + i * 200) / this.speedMult);
            }
          }
        }
        
        // --- Passive: MP Absorb ---
        if (!options.damageType && !isMagic) {
          const mpAbsorbSkill = this._findSkill(attacker, 'mp_absorb');
          if (mpAbsorbSkill && mpAbsorbSkill.level > 0 && mpAbsorbSkill.levelConfig) {
             const mpRecover = Math.floor(damage * (mpAbsorbSkill.levelConfig.percent / 100));
             if (mpRecover > 0) {
                 attacker.mp.current = Math.min((attacker.stats?.mp || attacker.mp.max), attacker.mp.current + mpRecover);
                 setTimeout(() => {
                   this.showDamage(attacker.elementId, `+${mpRecover} MP`, 'text-blue-400');
                 }, 400 / this.speedMult);
             }
          }
        }

        // --- Passive: Mana Regen & HP Regen ---
        if (!options.damageType && !options.hideActionName) {
          const manaRegenSkill = this._findSkill(attacker, 'mana_regen');
          if (manaRegenSkill && manaRegenSkill.level > 0 && manaRegenSkill.levelConfig) {
            const amount = manaRegenSkill.levelConfig.recoverMp;
            attacker.mp.current = Math.min(attacker.stats?.mp || attacker.mp.max, attacker.mp.current + amount);
            setTimeout(() => {
              this.showDamage(attacker.elementId, `+${amount} MP`, 'text-blue-400');
            }, 600 / this.speedMult);
          }
          
          const hpRegenSkill = this._findSkill(attacker, 'regen');
          if (hpRegenSkill && hpRegenSkill.level > 0 && hpRegenSkill.levelConfig) {
            const amount = hpRegenSkill.levelConfig.recoverHp;
            attacker.hp.current = Math.min(attacker.stats?.hp || attacker.hp.max, attacker.hp.current + amount);
            setTimeout(() => {
              this.showDamage(attacker.elementId, `+${amount}`, 'text-green-400');
            }, 600 / this.speedMult);
          }

          // --- Passive: Energizing ---
          const energizingSkill = this._findSkill(attacker, 'energizing');
          if (energizingSkill && energizingSkill.level > 0 && energizingSkill.levelConfig) {
            const amount = energizingSkill.levelConfig.recoverMp;
            let applied = false;
            this.party.forEach(p => {
              if (!p.isDead && p.mp && (p.mp.current < (p.stats?.mp || p.mp.max))) {
                p.mp.current = Math.min(p.stats?.mp || p.mp.max, p.mp.current + amount);
                setTimeout(() => {
                  this.showDamage(p.elementId, `+${amount} MP`, 'text-blue-400');
                }, 600 / this.speedMult);
                applied = true;
              }
            });
            // Optional: If we want to show a party-wide effect indicator
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
      if (p._atkBuffTurns > 0) {
        p._atkBuffTurns--;
        if (p._atkBuffTurns <= 0) {
          p._atkBuffPercent = 0;
        }
      }
      if (p._matkBuffTurns > 0) {
        p._matkBuffTurns--;
        if (p._matkBuffTurns <= 0) {
          p._matkBuffPercent = 0;
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
  // 統一ポップアップシステム (Pre-allocated DOM Pool)
  // DOMの生成・破棄を完全になくし、表示・非表示のみ切り替える
  // =============================================

  _initPopupPool() {
    if (this._popupLayer) return;
    this._popupLayer = document.createElement('div');
    this._popupLayer.id = 'battle-popup-layer';
    this._popupLayer.className = 'fixed inset-0 pointer-events-none z-[9999]';
    document.body.appendChild(this._popupLayer);

    this._domPool = [];
    // Pre-allocate 150 generic floating popups
    for (let i = 0; i < 150; i++) {
      const el = document.createElement('div');
      el.className = 'hidden';
      el.style.cssText = 'display: none !important;';
      this._popupLayer.appendChild(el);
      this._domPool.push({ el, active: false, type: 'float' });
    }

    // Pre-allocate 50 wrapper-based popups for labels
    for (let i = 0; i < 50; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'hidden';
      wrapper.style.cssText = 'display: none !important;';
      const inner = document.createElement('div');
      wrapper.appendChild(inner);
      this._popupLayer.appendChild(wrapper);
      this._domPool.push({ el: wrapper, inner, active: false, type: 'label' });
    }
  }

  _getPoolElement(type = 'float') {
    if (!this._popupLayer) this._initPopupPool();
    
    const poolItem = this._domPool.find(item => !item.active && item.type === type);
    if (!poolItem) return null; // If pool exhausted, ignore to prevent DOM growth
    
    poolItem.active = true;
    const el = poolItem.el;
    
    // Reset element visually but KEEP it in the DOM tree
    if (type === 'float') {
      el.innerHTML = '';
    }
    el.className = 'pointer-events-none absolute';
    el.style.cssText = 'display: block; position: absolute;';
    if (el.getAnimations) {
      el.getAnimations().forEach(a => a.cancel());
    }
    
    if (type === 'label') {
      poolItem.inner.innerHTML = '';
      poolItem.inner.className = '';
      poolItem.inner.style.cssText = '';
      if (poolItem.inner.getAnimations) {
        poolItem.inner.getAnimations().forEach(a => a.cancel());
      }
      return { wrapper: el, popup: poolItem.inner };
    }
    
    return el;
  }

  _releasePoolElement(elOrWrapper) {
    if (!this._domPool) return;
    const poolItem = this._domPool.find(item => item.el === elOrWrapper);
    if (poolItem) {
      poolItem.active = false;
      poolItem.el.className = 'hidden';
      poolItem.el.style.cssText = 'display: none !important;';
    }
  }

  /**
   * ダメージ用ポップアップ — 上方向に素早く浮遊して消える
   */
  _showFloatingPopup(elementId, config) {
    if (localStorage.getItem('disableBattleAnimations') === 'true') return;
    if (document.hidden) return;
    const el = this.container.querySelector(`#${elementId}`);
    if (!el) return;

    // Cache rect to avoid severe layout thrashing when hundreds of damage numbers pop
    if (!this._rectCache) this._rectCache = { time: 0, rects: {} };
    const now = performance.now();
    if (now - this._rectCache.time > 16) {
      this._rectCache.time = now;
      this._rectCache.rects = {};
    }
    let rect = this._rectCache.rects[elementId];
    if (!rect) {
      rect = el.getBoundingClientRect();
      this._rectCache.rects[elementId] = rect;
    }

    const speed = this.speedMult || 1;
    const dur = (config.duration || 800) / speed;
    const centerX = rect.left + rect.width / 2;
    const baseY = rect.top;
    const spreadX = (Math.random() - 0.5) * 60; // Spread horizontally

    const popup = this._getPoolElement('float');
    if (!popup) return;
    
    popup.className = config.className || '';
    popup.style.display = 'block';
    popup.style.left = `${centerX}px`;
    popup.style.top = `${baseY}px`;
    popup.style.transform = ''; // clear
    popup.style.color = config.color || '#fff';
    if (config.textShadow) popup.style.textShadow = config.textShadow;
    if (config.fontSize) popup.style.fontSize = config.fontSize;
    
    // Most efficient text insertion
    if (config.text !== undefined && config.text !== null) {
      popup.textContent = config.text;
    } else if (config.html) {
      popup.innerHTML = config.html; // fallback if needed
    }
    
    const isParty = elementId.startsWith('party-');
    const floatY = isParty ? 45 : -45; // Move further for smooth drift
    
    const scale = config.scale || 1.0;

    // Ultra-lightweight 3-step animation: Pop -> Drift -> Fade Out
    const anim = popup.animate([
      { opacity: 0, transform: `translate3d(-50%, 0, 0) scale(${scale * 0.5})` },
      { opacity: 1, transform: `translate3d(calc(-50% + ${spreadX * 0.3}px), ${floatY * 0.3}px, 0) scale(${scale})`, offset: 0.15 },
      { opacity: 0, transform: `translate3d(calc(-50% + ${spreadX}px), ${floatY}px, 0) scale(${scale * 0.9})` }
    ], {
      duration: dur,
      easing: 'ease-out',
      fill: 'forwards'
    });

    anim.onfinish = () => {
      anim.cancel();
      this._releasePoolElement(popup);
    };
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
      if (oldest.anim) oldest.anim.cancel();
      this._releasePoolElement(oldest.el); // wrapper contains popup
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

    const poolElements = this._getPoolElement('label');
    if (!poolElements) return;
    const { wrapper, popup } = poolElements;

    wrapper.className = `fixed z-[10000] pointer-events-none flex flex-col items-center`;
    wrapper.style.display = 'block';
    wrapper.style.left = `${centerX}px`;
    wrapper.style.top = `${baseY}px`;
    wrapper.style.transform = `translate(-50%, -10px)`;
    wrapper.style.transition = `transform 0.2s ease-out`;

    popup.className = `${config.className || ''}`;
    popup.style.transform = ''; // Clear previous transform
    popup.innerHTML = config.html;

    const anim = popup.animate([
      { opacity: 0, transform: 'scale(0.5) translateY(5px)' },
      { opacity: 1, transform: 'scale(1.25) translateY(-2px)', offset: 0.15 },
      { opacity: 1, transform: 'scale(1.0) translateY(0)', offset: 0.3 },
      { opacity: 0.9, transform: 'scale(1.0) translateY(0)', offset: 0.6 },
      { opacity: 0, transform: 'scale(0.85) translateY(-8px)' }
    ], {
      duration: dur,
      easing: 'ease-out',
      fill: 'forwards'
    });

    const entry = { el: wrapper, popup: popup, baseOffset: 10, timeoutId: null, anim: anim };
    stack.push(entry);

    stack.forEach(e => {
      if (e !== entry) {
        e.baseOffset += bump;
        e.el.style.transform = `translate(-50%, -${e.baseOffset}px)`;
      }
    });

    anim.onfinish = () => {
      anim.cancel();
      this._releasePoolElement(wrapper); // wrapper contains popup
      const idx = stack.indexOf(entry);
      if (idx !== -1) stack.splice(idx, 1);
    };
  }

  // --- showDamage: ダメージポップアップ (上方向に浮遊) ---
  showDamage(elementId, damage, customColorClass = 'text-red-500') {
    if (localStorage.getItem('disableBattleAnimations') === 'true') return;
    
    let color = '#ffffff';
    let textShadow = '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 2px 4px rgba(0,0,0,0.8)';
    let scale = 1.0;
    let fontSize = '26px';
    let duration = 800;
    let className = 'fixed z-[9999] pointer-events-none font-black select-none flex items-center justify-center';

    if (customColorClass.includes('text-red-500')) {
      // 弱点 (Weakness)
      className += ' italic tracking-tighter';
      color = '#ef4444';
      textShadow = '-2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, 0 4px 6px rgba(0,0,0,0.8)';
      fontSize = '34px';
      scale = 1.25;
      duration = 900;
    } else if (customColorClass.includes('text-purple-400')) {
      // 耐性軽減 (Resist)
      color = '#a855f7';
      textShadow = '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 2px 4px rgba(0,0,0,0.8)';
      scale = 0.85;
      fontSize = '22px';
    } else if (customColorClass.includes('text-green-')) {
      // HP回復
      color = '#4ade80';
      textShadow = '-1.2px -1.2px 0 #fff, 1.2px -1.2px 0 #fff, -1.2px 1.2px 0 #fff, 1.2px 1.2px 0 #fff, 0 2px 4px rgba(0,0,0,0.8)';
    } else if (customColorClass.includes('text-blue-400')) {
      // MP回復
      color = '#60a5fa';
      textShadow = '-1.2px -1.2px 0 #fff, 1.2px -1.2px 0 #fff, -1.2px 1.2px 0 #fff, 1.2px 1.2px 0 #fff, 0 2px 4px rgba(0,0,0,0.8)';
    }

    this._showFloatingPopup(elementId, {
      text: damage,
      className,
      color,
      textShadow,
      fontSize,
      scale,
      duration
    });
  }

  // --- showActionName: アクション名ポップアップ (その場に留まる) ---
  showActionName(elementId, actionName, textClass = 'text-green-300', borderClass = 'border-green-500/50') {
    if (localStorage.getItem('disableBattleAnimations') === 'true') return;
    const html = `<span class="font-black text-[15px] ${textClass} tracking-widest whitespace-nowrap bg-black/70 px-4 py-1.5 rounded-full border ${borderClass}" style="box-shadow: 0 4px 10px rgba(0,0,0,0.8); text-shadow: 0 2px 4px rgba(0,0,0,0.9);">${actionName}</span>`;

    this._showLabelPopup(elementId, {
      html,
      duration: 1200,
      height: 34
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

    // Increment and save monster kill counts (with medal bonus)
    let medalRankIndex = -1;
    if (this.playerMedals && this.playerMedals[enemy.id] !== undefined) {
      medalRankIndex = this.playerMedals[enemy.id];
    }

    if (this.monsterKills) {
      const medalBonus = medalRankIndex >= 0 ? MEDAL_RANKS[medalRankIndex].killBonus : 0;
      this.monsterKills[enemy.id] = (this.monsterKills[enemy.id] || 0) + 1 + medalBonus;
      this._needsSave = true;
    }

    // Add Gold
    let gold = enemy.rewards.gold || 0;
    if (gold > 0) {
      this.currentGold += gold;
      this.obtainedGold += gold;
      this._needsSave = true;
      const goldDisplay = document.getElementById('header-gold-display');
      if (goldDisplay) goldDisplay.textContent = ` Gold : ${formatNumber(this.currentGold)} `;
      drops.push({ text: `+${gold}`, icon: 'paid', color: 'text-yellow-400' });
    }

    // Add EXP / JP to party members
    let exp = enemy.rewards.exp || 0;
    let jp = enemy.rewards.jp || 0;

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
          if (!p.exp.max || p.exp.max <= 0) p.exp.max = 10;
          let loopGuardExp = 0;
          while (p.exp.current >= p.exp.max && loopGuardExp++ < 1000) {
            p.exp.current -= p.exp.max;
            p.exp.max = Math.max(p.exp.max + 1, Math.floor(p.exp.max * 1.2));
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
          if (!p.jp.max || p.jp.max <= 0) p.jp.max = 20;
          let loopGuardJp = 0;
          while (p.jp.current >= p.jp.max && loopGuardJp++ < 1000) {
            p.jp.current -= p.jp.max;
            p.jp.max = Math.max(p.jp.max + 1, Math.floor(p.jp.max * 1.2));
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

    // --- 牧場 (Ranch) コンパニオン化抽選 ---
    const enemyKills = this.monsterKills[enemy.id] || 0;
    // 基本確率は0.01%。100体討伐ごとに0.01%上昇する
    const captureRate = Math.min(1.0, 0.0001 + Math.floor(enemyKills / 100) * 0.0001);
    
    if (Math.random() < captureRate) {
      const dungeonId = this.currentDungeonId;
      if (!this.ranchData[dungeonId]) {
        this.ranchData[dungeonId] = {};
      }
      
      const saveId = enemy.isLegendary ? `${enemy.id}_legendary` : enemy.id;
      
      // まだ仲間になっていない場合のみ
      if (!this.ranchData[dungeonId][saveId]) {
        this.ranchData[dungeonId][saveId] = { fedMaterials: 0, level: 0 };
        this._pendingRanchSave = this.ranchData; // Deferred saving like other properties
        this._needsSave = true;

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
    let hasNewDrops = false;
    if (enemy.drops) {
      const kills = this.monsterKills[enemy.id] || 0;
      const bonus = Math.floor(kills / 100) * 0.1;
      for (const drop of enemy.drops) {
        const adjustedRate = drop.rate + bonus;
        
        let dropCount = 0;
        if (enemy.isLegendary) {
          dropCount = 100;
        } else {
          dropCount = Math.floor(adjustedRate / 100);
          if (Math.random() * 100 <= (adjustedRate % 100)) {
            dropCount += 1;
          }
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
              const newDrop = { id: mat.id, name: mat.name, image: mat.image, quantity: dropCount };
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

      anim.onfinish = () => {
        anim.cancel();
        this._releasePoolElement(dropEl);
      };
    });
  }

  async saveDeferredData() {
    if (!this._needsSave) return;
    if (this.discoveredMonsters) await GameDB.setGameState('discovered_monsters', this.discoveredMonsters);
    if (this.monsterKills) await GameDB.setGameState('monster_kills', this.monsterKills);
    if (this._pendingRanchSave) await GameDB.setGameState('ranch_data', this._pendingRanchSave);
    if (this.currentGold !== undefined) await GameDB.setGameState('gold', this.currentGold);
    if (this._pendingItemDrops) {
      for (const [itemId, qty] of Object.entries(this._pendingItemDrops)) {
        const mat = MATERIALS_MAP.get(itemId);
        if (mat) {
          const currentItem = await GameDB.getInventoryItem(itemId) || { id: itemId, quantity: 0, type: 'material', ...mat };
          currentItem.quantity = Math.min(99999, currentItem.quantity + qty);
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
        if (this.autoBattleMode === 'dungeon') {
          this.autoNextTimer = setTimeout(async () => {
            await GameDB.setGameState('currentFloor', 1);
            this.isDungeonClear = false;
            this.resetBattleState();
            this.init();
          }, 1500 / this.speedMult);
          return;
        }

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
        this.autoNextTimer = setTimeout(async () => {
          this.resetBattleState();
          this.init();
        }, 1500 / this.speedMult);
        return;
      }

      // dungeon mode or manual: advance to next floor
      this.autoNextTimer = setTimeout(async () => {
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
      if (goldDisplay) goldDisplay.textContent = ` Gold : ${formatNumber(newGold)} `;

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

      if (willAutoRetry) {
        // Show countdown on the button
        let remaining = 5;
        okBtn.textContent = `再突入まで ${remaining} 秒... (タップで中止)`;
        this.autoRetryTimer = setInterval(() => {
          remaining--;
          if (remaining <= 0) {
            clearInterval(this.autoRetryTimer);
            this.autoRetryTimer = null;
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
          if (this.autoRetryTimer) {
            clearInterval(this.autoRetryTimer);
            this.autoRetryTimer = null;
          }
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
