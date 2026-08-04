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
import { MEDAL_RANKS, calcMedalSpawnBonus } from '../../definitions/medal-definitions.js';
import { renderEnemyCardHtml, renderPartyCardHtml, renderInfoTabHtml, renderItemTabHtml, renderSkillTabHtml, getActiveStateIconsHTML } from './battle-ui.js';
import { renderBattlePetTab } from './battle-pet-tab.js';
import { renderBattleMedalTab } from './battle-medal-tab.js';
import { formatNumber } from '../../utils/format.js';
import { loadTreasureLevels } from '../../data/treasure-manager.js';
import { setScreenLockActivity } from '../../utils/screen-lock.js';
import { configureBattleEffectsLayer } from '../../utils/battle-animation.js';

// --- Mixin imports ---
import { popupMethods } from './battle-popups.js';
import { atbMethods } from './battle-atb.js';
import { actionMethods } from './battle-actions.js';
import { passiveMethods } from './battle-passives.js';
import { ailmentMethods } from './battle-ailments.js';
import { rendererMethods } from './battle-renderer.js';
import { resultMethods } from './battle-results.js';

const MATERIALS_MAP = new Map(MATERIALS.map(m => [m.id, m]));

const DEFAULT_BATTLE_PALETTE = ['42 58 76', '54 78 102', '76 112 142', '112 154 184'];

function extractBattlePalette(imageUrl) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 48;
        canvas.height = 48;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const buckets = new Map();
        for (let i = 0; i < pixels.length; i += 16) {
          if (pixels[i + 3] < 128) continue;
          const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
          const max = Math.max(...rgb);
          const min = Math.min(...rgb);
          const saturation = max ? (max - min) / max : 0;
          const luminance = (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722) / 255;
          // Near-black and near-white pixels add little useful dungeon identity.
          if (luminance < 0.06 || luminance > 0.94) continue;
          const key = rgb.map(value => Math.round(value / 32) * 32).join('-');
          const bucket = buckets.get(key) || { count: 0, score: 0, rgb: [0, 0, 0] };
          bucket.count += 1;
          bucket.score += 0.35 + saturation + (1 - Math.abs(luminance - 0.5));
          rgb.forEach((value, channel) => { bucket.rgb[channel] += value; });
          buckets.set(key, bucket);
        }

        const colors = [...buckets.values()]
          .filter(bucket => bucket.count > 1)
          .sort((a, b) => b.score - a.score)
          .map(bucket => bucket.rgb.map(value => Math.round(value / bucket.count)))
          .filter((color, index, list) => list.slice(0, index).every(other =>
            Math.hypot(...color.map((value, channel) => value - other[channel])) > 54
          ))
          .slice(0, 4);

        if (!colors.length) return resolve(DEFAULT_BATTLE_PALETTE);
        while (colors.length < 4) {
          const source = colors[0];
          const factor = 0.78 + colors.length * 0.12;
          colors.push(source.map(value => Math.min(255, Math.round(value * factor))));
        }
        resolve(colors.map(color => color.join(' ')));
      } catch (error) {
        console.warn('Battle palette extraction failed:', error);
        resolve(DEFAULT_BATTLE_PALETTE);
      }
    };
    image.onerror = () => resolve(DEFAULT_BATTLE_PALETTE);
    image.src = imageUrl;
  });
}

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
    this._initGeneration = 0;
    this.isTabInteracting = false;
    this._tabInteractionTimer = null;

    // Register lifecycle cleanup before any asynchronous initialization starts.
    // Otherwise a quick route change can occur while init() is awaiting IndexedDB,
    // and the detached battle page would start a Worker after it has been removed.
    this._attachRouteChangeHandler();

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
      tabBtnPet: container.querySelector('#tab-btn-pet'),
      tabBtnMedal: container.querySelector('#tab-btn-medal'),
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
    if (!this.container.isConnected || window.location.hash !== '#/battle') {
      this.stopAtbLoop();
      this.cleanupBattleDOM();
      return;
    }
    // endBattle() removes the previous handler while the result/transition is
    // pending, so automatic retries and floor changes must attach it again.
    this._attachRouteChangeHandler();
    // Stop existing ATB loop before re-initializing
    this.stopAtbLoop(false, false);
    const initGeneration = ++this._initGeneration;

    let effectsLayer = document.getElementById('battle-effects-layer');
    if (!effectsLayer) {
      effectsLayer = document.createElement('div');
      effectsLayer.id = 'battle-effects-layer';
      effectsLayer.className = 'fixed inset-0 pointer-events-none z-[9998]';
      effectsLayer.style.contain = 'layout style paint';
      effectsLayer.style.overflow = 'hidden';
      document.body.appendChild(effectsLayer);
    } else {
      effectsLayer.innerHTML = '';
    }
    configureBattleEffectsLayer(effectsLayer);

    if (!this.elements.tabContent.dataset.touchListenerAdded) {
      const holdTabUpdates = () => {
        this.isTabInteracting = true;
        clearTimeout(this._tabInteractionTimer);
      };
      const releaseTabUpdates = (delay = 250) => {
        clearTimeout(this._tabInteractionTimer);
        this._tabInteractionTimer = setTimeout(() => {
          this.isTabInteracting = false;
        }, delay);
      };

      this.elements.tabContent.addEventListener('pointerdown', holdTabUpdates, { passive: true });
      this.elements.tabContent.addEventListener('pointerup', () => releaseTabUpdates(), { passive: true });
      this.elements.tabContent.addEventListener('pointercancel', () => releaseTabUpdates(), { passive: true });
      this.elements.tabContent.addEventListener('scroll', () => {
        holdTabUpdates();
        releaseTabUpdates(600);
      }, { passive: true, capture: true });
      this.elements.tabContent.dataset.touchListenerAdded = 'true';
    }

    await loadTreasureLevels();
    this.autoSkillStates = await GameDB.getGameState('autoSkillStates') || {};
    this.monsterKills = await GameDB.getGameState('monster_kills') || {};
    this.playerMedals = await GameDB.getGameState('player_medals') || {};
    this.discoveredMonsters = await GameDB.getGameState('discovered_monsters') || [];
    this.currentGold = await GameDB.getGameState('gold') || 0;
    this.ranchData = await GameDB.getGameState('ranch_data') || {};
    this._needsSave = false;

    // The page may have been replaced while the database reads above were in
    // flight. Never attach listeners or start a Worker for detached content.
    if (initGeneration !== this._initGeneration ||
        !this.container.isConnected ||
        window.location.hash !== '#/battle') {
      this.stopAtbLoop();
      this.cleanupBattleDOM();
      return;
    }

    const isReinit = this.elements.enemyArea.children.length > 0;

    this.currentDungeonId = await GameDB.getGameState('currentDungeon') || 'slime_forest';
    this.currentFloorNum = await GameDB.getGameState('currentFloor') || 1;
    this.dungeonDef = DUNGEONS.find(d => d.id === this.currentDungeonId) || SPECIAL_DUNGEONS.find(d => d.id === this.currentDungeonId);
    this.floorDef = this.dungeonDef.floors.find(f => f.level === this.currentFloorNum) || this.dungeonDef.floors[this.dungeonDef.floors.length - 1];

    // Update Header Location
    const headerLoc = document.getElementById('header-location');
    const headerLocName = document.getElementById('header-location-name');
    const headerLocFloor = document.getElementById('header-location-floor');
    if (headerLoc && headerLocName && headerLocFloor && this.dungeonDef) {
      headerLocName.textContent = this.dungeonDef.name;
      headerLocFloor.textContent = `${this.currentFloorNum}F`;
      headerLocFloor.classList.remove('hidden');
      headerLoc.setAttribute('aria-label', `現在地: ${this.dungeonDef.name} ${this.currentFloorNum}F`);
    }

    // Update Background Image
    const sceneBg = document.getElementById('battle-scene-bg');
    if (sceneBg && this.dungeonDef && this.dungeonDef.bgImage) {
      // 視認性を確保しつつ、もう少し背景が見えるようにグラデーションの暗さを微調整
      sceneBg.style.backgroundImage = `linear-gradient(rgba(11, 11, 25, 0.5), rgba(11, 11, 25, 0.7)), url('${this.dungeonDef.bgImage}')`;
      sceneBg.style.backgroundSize = 'cover';
      sceneBg.style.backgroundPosition = 'center top';
      this.applyBattleTheme(this.dungeonDef.bgImage);
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

    const maxMonstersPerType = 4;
    const resolvedMonsterIds = this.resolveMonsters(this.floorDef.monsters);
    const initialMonsterCounts = new Map();
    const monsterIds = resolvedMonsterIds.filter(monsterId => {
      const count = initialMonsterCounts.get(monsterId) || 0;
      if (count >= maxMonstersPerType) return false;
      initialMonsterCounts.set(monsterId, count + 1);
      return true;
    });

    const allFloorMonsterIds = this.getAllPossibleMonsters(this.floorDef.monsters);
    this.floorUniqueMonsterIds = allFloorMonsterIds;
    this.dungeonUniqueMonsterIds = [...new Set(
      this.dungeonDef.floors.flatMap(floor => this.getAllPossibleMonsters(floor.monsters))
    )];
    const companionsInDungeon = this.ranchData[this.currentDungeonId] || {};
    this.dungeonCompanionMonsterIds = this.dungeonUniqueMonsterIds.filter(monsterId =>
      companionsInDungeon[monsterId] || companionsInDungeon[`${monsterId}_legendary`]
    );
    const usesDungeonCompanionList = this.currentTab === 'pet' || this.currentTab === 'medal';
    const selectableMonsterIds = usesDungeonCompanionList
      ? this.dungeonCompanionMonsterIds
      : allFloorMonsterIds;
    if (!this.subTabSelectedMonsterId || !selectableMonsterIds.includes(this.subTabSelectedMonsterId)) {
      this.subTabSelectedMonsterId = selectableMonsterIds[0];
    }

    const uniqueMonsterIds = [...new Set(monsterIds)];

    for (const mId of uniqueMonsterIds) {
      const medalRankIndex = this.playerMedals[mId] !== undefined ? this.playerMedals[mId] : -1;
      const spawnBonus = calcMedalSpawnBonus(medalRankIndex);
      const currentCount = initialMonsterCounts.get(mId) || 0;
      const bonusToAdd = Math.min(spawnBonus, maxMonstersPerType - currentCount);
      for (let j = 0; j < bonusToAdd; j++) {
        monsterIds.push(mId);
      }
    }

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
      
      baseStats.spd = Math.max(1, baseStats.spd);
      
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

  async applyBattleTheme(imageUrl) {
    const palette = await extractBattlePalette(imageUrl);
    if (!this.container.isConnected || this.dungeonDef?.bgImage !== imageUrl) return;
    palette.forEach((color, index) => {
      this.container.style.setProperty(`--battle-palette-${index + 1}`, color);
    });
  }

  _attachRouteChangeHandler() {
    if (this._routeChangeHandler) return;
    this._routeChangeHandler = () => {
      if (window.location.hash !== '#/battle') {
        setScreenLockActivity('battle', false);
        this.stopAtbLoop();
        this.cleanupBattleDOM();
      }
    };
    window.addEventListener('hashchange', this._routeChangeHandler);
  }

  getAllPossibleMonsters(monsterDefs) {
    if (!monsterDefs || monsterDefs.length === 0) return [];
    if (typeof monsterDefs[0] === 'string') {
      return [...new Set(monsterDefs)];
    }
    const allIds = new Set();
    for (const entry of monsterDefs) {
      if (entry.members) {
        for (const e of entry.members) {
          allIds.add(e.id);
        }
      } else if (entry.id) {
        allIds.add(entry.id);
      } else {
        for (const key of Object.keys(entry)) {
          if (key !== 'weight') allIds.add(key);
        }
      }
    }
    return [...allIds];
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
    // Battle code reads this value many times per tick. Keep the storage read
    // out of the hot path; startAtbLoop refreshes it when settings change.
    if (this._cachedBattleSpeed == null) {
      this._cachedBattleSpeed = parseInt(localStorage.getItem('autoBattleSpeed') || '1', 10);
    }
    return this._cachedBattleSpeed;
  }

  get isAutoBattle() {
    return this.autoBattleMode !== 'none';
  }

  resetBattleState(keepParty = false) {
    if (!keepParty) {
      this.party = [];
      this.obtainedItems = [];
      this.obtainedGold = 0;
      this.obtainedExp = 0;
      this.obtainedItemsMap = new Map();
    }
    this.enemies = [];
    this.activeCharacter = null;
    this.activeEnemy = null;
    this.selectedEnemyTarget = null;
    this.lastKilledBy = null;
  }

  _scheduleBattleTimeout(fn, delay, allowWhenStopped = false) {
    if (!this._pendingTimers) this._pendingTimers = [];
    if (!this._pendingVisibilityHandlers) this._pendingVisibilityHandlers = [];

    const id = setTimeout(() => {
      const idx = this._pendingTimers.indexOf(id);
      if (idx !== -1) this._pendingTimers.splice(idx, 1);

      if (!allowWhenStopped && this.isStopped) return;
      if (!document.hidden) {
        fn();
        return;
      }

      // Timers that became due while the app was backgrounded must resume only
      // after WebKit and IndexedDB are active again.
      const handleVisibilityChange = () => {
        if (document.hidden) return;
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        const handlerIdx = this._pendingVisibilityHandlers.indexOf(handleVisibilityChange);
        if (handlerIdx !== -1) this._pendingVisibilityHandlers.splice(handlerIdx, 1);
        if (!allowWhenStopped && this.isStopped) return;
        fn();
      };
      this._pendingVisibilityHandlers.push(handleVisibilityChange);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }, delay);
    this._pendingTimers.push(id);
    return id;
  }

  cleanupBattleDOM() {
    clearTimeout(this._tabInteractionTimer);
    this._tabInteractionTimer = null;
    this.isTabInteracting = false;
    if (this._popupLayer) {
      this._popupLayer.remove();
      this._popupLayer = null;
      this._domPool = null;
      this._labelStacks = null;
    }
    const effectsLayer = document.getElementById('battle-effects-layer');
    if (effectsLayer) effectsLayer.remove();
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
    this.elements.btnAutoFloor.onpointerdown = (e) => {
      e.preventDefault();
      this.autoBattleMode = this.autoBattleMode === 'floor' ? 'none' : 'floor';
      sessionStorage.setItem('autoBattleMode', this.autoBattleMode);
      this.updateCommandUI();
      
      if (this.isAutoBattle && this.activeCharacter) {
        this.processAutoBattle(this.activeCharacter);
      }
    };

    this.elements.btnAutoDungeon.onpointerdown = (e) => {
      e.preventDefault();
      this.autoBattleMode = this.autoBattleMode === 'dungeon' ? 'none' : 'dungeon';
      sessionStorage.setItem('autoBattleMode', this.autoBattleMode);
      this.updateCommandUI();
      
      if (this.isAutoBattle && this.activeCharacter) {
        this.processAutoBattle(this.activeCharacter);
      }
    };

    this.elements.btnRun.onpointerdown = (e) => {
      e.preventDefault();
      if (!this.isAutoBattle && !this.activeCharacter) return;
      sessionStorage.removeItem('autoBattleMode');
      this.autoBattleMode = 'none';
      setScreenLockActivity('battle', false);
      this.endBattle(false, '撤退した！', false);
    };

    this.elements.btnAttack.onpointerdown = (e) => {
      e.preventDefault();
      if (!this.activeCharacter || this.isAutoBattle) return;
      
      if (!this.selectedEnemyTarget || this.selectedEnemyTarget.isDead) {
        this.selectedEnemyTarget = this.enemies.find(en => !en.isDead);
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
        setScreenLockActivity('battle', false);
        window.location.hash = '/dungeon';
      }
    };

    [
      { btn: this.elements.tabBtnSkill, id: 'skill' },
      { btn: this.elements.tabBtnItem, id: 'item' },
      { btn: this.elements.tabBtnInfo, id: 'info' },
      { btn: this.elements.tabBtnPet, id: 'pet' },
      { btn: this.elements.tabBtnMedal, id: 'medal' }
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
    setScreenLockActivity(
      'battle',
      this.isAutoBattle,
      this.autoBattleMode === 'dungeon' ? '踏破周回で自動戦闘中' : '階層周回で自動戦闘中'
    );
    this.elements.btnAutoFloor.className = "flex-1 bg-blue-900 active:bg-blue-800 rounded-lg font-bold text-[10px] border border-blue-700 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-blue-100 p-1";
    this.elements.btnAutoFloor.innerHTML = `<span class="material-symbols-outlined text-[18px] mb-0.5 text-blue-400">autorenew</span>階層周回`;

    this.elements.btnAutoDungeon.className = "flex-1 bg-purple-900 active:bg-purple-800 rounded-lg font-bold text-[10px] border border-purple-700 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-purple-100 p-1";
    this.elements.btnAutoDungeon.innerHTML = `<span class="material-symbols-outlined text-[18px] mb-0.5 text-purple-400">all_inclusive</span>踏破周回`;

    if (this.autoBattleMode === 'floor') {
      this.elements.btnAutoFloor.className = "flex-1 bg-blue-600 rounded-lg font-bold text-[10px] border-2 border-blue-300 flex flex-col items-center justify-center transition-all shadow-[0_0_15px_rgba(59,130,246,0.9)] text-white p-1 scale-105 z-10 animate-pulse";
      this.elements.btnAutoFloor.innerHTML = `<span class="material-symbols-outlined text-[18px] mb-0.5 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">autorenew</span>階層周回中`;
    } else if (this.autoBattleMode === 'dungeon') {
      this.elements.btnAutoDungeon.className = "flex-1 bg-purple-600 rounded-lg font-bold text-[10px] border-2 border-purple-300 flex flex-col items-center justify-center transition-all shadow-[0_0_15px_rgba(168,85,247,0.9)] text-white p-1 scale-105 z-10 animate-pulse";
      this.elements.btnAutoDungeon.innerHTML = `<span class="material-symbols-outlined text-[18px] mb-0.5 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">all_inclusive</span>踏破周回中`;
    }

    this.elements.btnRun.className = "flex-1 bg-teal-900 active:bg-teal-800 rounded-lg font-bold text-[11px] border border-teal-700 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-teal-100 p-1 cursor-pointer";
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
    
    const delay = 500 / this.speedMult;
    
    const executeAuto = () => {
      try {
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
          selectedEnemyTarget: (this.selectedEnemyTarget && !this.selectedEnemyTarget.isDead) ? this.selectedEnemyTarget : null
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
            let score = 0;
            let target = null;
            if (typeof checkResult === 'object' && checkResult.score !== undefined) {
              score = checkResult.score;
              target = checkResult.target;
            } else if (checkResult === true) {
              target = context.selectedEnemyTarget || this.enemies.find(e => !e.isDead) || null;
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
        } else {
          // Fallback if no target exists but battle hasn't ended yet
          this.activeCharacter = null;
          character.atb = 0;
        }
      } catch (err) {
        console.error("AutoBattle execution error:", err);
        this.activeCharacter = null;
        character.atb = 0;
      }
    };

    if (this.speedMult >= 5) {
      executeAuto();
    } else {
      this._scheduleBattleTimeout(executeAuto, delay);
    }
  }

  updateTabStyles() {
    const tabs = [
      { btn: this.elements.tabBtnSkill, id: 'skill', icon: 'auto_awesome', palette: 1, label: 'Skill' },
      { btn: this.elements.tabBtnItem, id: 'item', icon: 'backpack', palette: 2, label: 'Item' },
      { btn: this.elements.tabBtnInfo, id: 'info', icon: 'info', palette: 3, label: 'Info' },
      { btn: this.elements.tabBtnPet, id: 'pet', icon: 'pets', palette: 4, label: 'Pet' },
      { btn: this.elements.tabBtnMedal, id: 'medal', icon: 'military_tech', palette: 2, label: 'Medal' }
    ];

    tabs.forEach(({btn, id, icon, palette, label}) => {
      btn.style.setProperty('--tab-color', `var(--battle-palette-${palette})`);
      if (this.currentTab === id) {
        btn.className = 'battle-tab battle-tab--active flex-1 py-1.5 border-t-[3px] border-x border-b rounded-t-lg text-[10px] font-bold relative z-10 flex items-center justify-center gap-1 transition-all duration-300 cursor-pointer';
        btn.innerHTML = `<span class="material-symbols-outlined pointer-events-none" style="font-size: 13px; font-variation-settings: 'FILL' 1">${icon}</span><span class="pointer-events-none">${label}</span>`;
      } else {
        btn.className = 'battle-tab flex-1 py-1.5 backdrop-blur-sm border-t-[3px] border-x border-b rounded-t-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all duration-300 cursor-pointer';
        btn.innerHTML = `<span class="material-symbols-outlined pointer-events-none" style="font-size: 13px;">${icon}</span><span class="pointer-events-none">${label}</span>`;
      }
    });
  }

  renderTabContent(force = false) {
    // Polling belongs only to its visible tab. Stop it immediately on a tab
    // change instead of retaining detached containers until the next tick.
    const tabBodies = [this.elements.tabContent, ...this.elements.tabContent.querySelectorAll('.sub-tab-body')];
    tabBodies.forEach(body => {
      if (this.currentTab !== 'pet' && body._petSyncTimer) {
        clearInterval(body._petSyncTimer);
        body._petSyncTimer = null;
      }
      if (this.currentTab !== 'medal' && body._medalSyncTimer) {
        clearInterval(body._medalSyncTimer);
        body._medalSyncTimer = null;
      }
    });

    if (this.currentTab === 'skill') {
      this.elements.tabContent.dataset.renderedTab = 'skill';
      this.renderSkillTab();
    } else if (this.currentTab === 'item') {
      this.elements.tabContent.dataset.renderedTab = 'item';
      this.renderItemTab();
    } else if (this.currentTab === 'info') {
      this.elements.tabContent.dataset.renderedTab = 'info';
      this.renderInfoTab();
    } else if (this.currentTab === 'pet') {
      const targetId = this.subTabSelectedMonsterId || 'none';

      // Pet の内容は行動中のキャラクターには依存しない。自動戦闘中は
      // renderEntities() から頻繁に呼ばれるため、同じモンスターを表示中に
      // タブ全体を作り直すとスクロール領域が置換されてちらついてしまう。
      // 所持素材は Pet 側のポーリングで差分更新されるので、明示的な更新
      // (モンスター切替・餌やり等) があるまでは現在の DOM を維持する。
      if (!force && this.elements.tabContent.dataset.renderedTab === 'pet' && this.elements.tabContent.dataset.petTargetId === targetId) {
        return;
      }
      
      this.elements.tabContent.dataset.renderedTab = 'pet';
      this.elements.tabContent.dataset.petTargetId = targetId;
      this.renderPetTab();
    } else if (this.currentTab === 'medal') {
      const targetId = this.subTabSelectedMonsterId || 'none';
      const now = Date.now();
      const lastRendered = parseInt(this.elements.tabContent.dataset.lastMedalRenderTime || '0');

      if (!force && this.elements.tabContent.dataset.renderedTab === 'medal' && this.elements.tabContent.dataset.medalTargetId === targetId) {
        if (this.isTabInteracting) return;
        if (now - lastRendered < 1000) return;
      }
      
      this.elements.tabContent.dataset.renderedTab = 'medal';
      this.elements.tabContent.dataset.medalTargetId = targetId;
      this.elements.tabContent.dataset.lastMedalRenderTime = now;
      this.renderMedalTab();
    }
  }

  renderSubTabsUI(medalAvailability = {}) {
    let wrapper = this.elements.tabContent.querySelector('.sub-tab-wrapper');
    if (!wrapper) {
      this.elements.tabContent.innerHTML = `
        <div class="sub-tab-wrapper flex flex-col h-full w-full bg-transparent">
          <div class="sub-tab-header flex gap-1.5 px-1.5 pt-1.5 pb-1 shrink-0 border-b border-slate-700/50 mb-1 w-full overflow-x-auto custom-scrollbar"></div>
          <div class="sub-tab-body flex-1 min-h-0 overflow-y-auto custom-scrollbar relative bg-transparent pr-1"></div>
        </div>
      `;
      wrapper = this.elements.tabContent.querySelector('.sub-tab-wrapper');
    }
    const header = wrapper.querySelector('.sub-tab-header');
    const previousBody = wrapper.querySelector('.sub-tab-body');

    // Pet / Medal render asynchronously. Give every render its own body so a
    // slower, older render can only update a detached node after a tab change.
    if (previousBody?._petSyncTimer) clearInterval(previousBody._petSyncTimer);
    if (previousBody?._medalSyncTimer) clearInterval(previousBody._medalSyncTimer);
    const body = document.createElement('div');
    body.className = 'sub-tab-body flex-1 min-h-0 overflow-y-auto custom-scrollbar relative bg-transparent pr-1';
    // The Pet / Medal renderers receive this inner body and use its marker to
    // discard stale async results. Keep the marker on the actual render target,
    // not only on the outer #tab-content element.
    body.dataset.renderedTab = this.currentTab;
    previousBody.replaceWith(body);

    // Pet / Medal では現在のダンジョンで仲間になっているモンスターのみ選択可能にする。
    // Info は従来どおり現在階層のモンスターのみを表示する。
    const usesDungeonCompanionList = this.currentTab === 'pet' || this.currentTab === 'medal';
    const availableMonsterIds = usesDungeonCompanionList
      ? (this.dungeonCompanionMonsterIds || [])
      : (this.floorUniqueMonsterIds || []);

    if (!availableMonsterIds.includes(this.subTabSelectedMonsterId)) {
      this.subTabSelectedMonsterId = availableMonsterIds[0] || null;
    }

    const monsterDefs = availableMonsterIds.map(mId => MONSTERS.find(m => m.id === mId)).filter(Boolean);
    
    header.innerHTML = monsterDefs.map(m => {
      const isSelected = this.subTabSelectedMonsterId === m.id;
      const medalStatus = this.currentTab === 'medal' ? medalAvailability[m.id] : null;
      const hasLegendaryCompanion = this.currentTab === 'pet' && Object.values(this.ranchData || {}).some(
        dungeonRanch => dungeonRanch?.[`${m.id}_legendary`]
      );
      const bgClass = medalStatus?.isMaxRank
        ? (isSelected
          ? 'bg-yellow-500/40 border-yellow-200'
          : 'bg-yellow-900/70 border-yellow-500/70 active:bg-yellow-800/80 active:border-yellow-300')
        : medalStatus?.canAcquireOrUpgrade
          ? (isSelected
            ? 'bg-emerald-500/35 border-emerald-200'
            : 'bg-emerald-900/70 border-emerald-500/70 active:bg-emerald-800/80 active:border-emerald-300')
          : hasLegendaryCompanion
        ? (isSelected
          ? 'bg-yellow-600/30 border-yellow-300'
          : 'bg-yellow-900/70 border-yellow-500/70 active:bg-yellow-800/80 active:border-yellow-300')
        : (isSelected
          ? 'bg-blue-600/20 border-blue-400'
          : 'bg-slate-900/50 border-slate-700/50 active:bg-slate-800/80 active:border-slate-600');
      const shadowClass = medalStatus?.isMaxRank
        ? (isSelected
          ? 'shadow-[0_0_14px_rgba(250,204,21,0.45)]'
          : 'shadow-[inset_0_0_8px_rgba(250,204,21,0.18)]')
        : medalStatus?.canAcquireOrUpgrade
          ? (isSelected
            ? 'shadow-[0_0_14px_rgba(52,211,153,0.45)]'
            : 'shadow-[inset_0_0_8px_rgba(52,211,153,0.18)]')
          : hasLegendaryCompanion
            ? (isSelected
              ? 'shadow-[0_0_14px_rgba(250,204,21,0.45)]'
              : 'shadow-[inset_0_0_8px_rgba(250,204,21,0.18)]')
        : (isSelected ? 'shadow-[0_0_12px_rgba(96,165,250,0.25)]' : 'shadow-inner');
      const opacity = isSelected ? 'opacity-100 scale-[1.02]' : (medalStatus?.isMaxRank || medalStatus?.canAcquireOrUpgrade ? 'opacity-100' : 'opacity-80');
      const selectedTextClass = medalStatus?.isMaxRank
        ? 'text-yellow-100 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]'
        : medalStatus?.canAcquireOrUpgrade
          ? 'text-emerald-100 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]'
          : hasLegendaryCompanion
            ? 'text-yellow-100 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]'
        : 'text-blue-100 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]';
      
      if (isSelected) {
        return `
          <button type="button" class="sub-tab-item flex min-h-11 items-center justify-center gap-1.5 px-3 py-1 rounded-full cursor-pointer border ${bgClass} ${shadowClass} ${opacity} transition-all mb-1 backdrop-blur-sm shrink-0" data-id="${m.id}" aria-label="${m.name}" aria-pressed="true">
            <img src="${m.image}" class="w-4 h-4 shrink-0 object-contain pointer-events-none" onerror="this.style.display='none'">
            <span class="text-[11px] font-bold tracking-wide whitespace-nowrap pointer-events-none ${selectedTextClass}">${m.name}</span>
          </button>
        `;
      } else {
        return `
          <button type="button" class="sub-tab-item flex h-11 w-11 items-center justify-center rounded-full cursor-pointer border ${bgClass} ${shadowClass} ${opacity} transition-all mb-1 backdrop-blur-sm shrink-0" data-id="${m.id}" aria-label="${m.name}" aria-pressed="false">
            <img src="${m.image}" class="w-4 h-4 shrink-0 object-contain pointer-events-none" onerror="this.style.display='none'">
          </button>
        `;
      }
    }).join('');

    header.querySelectorAll('.sub-tab-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (this.subTabSelectedMonsterId !== id) {
          this.subTabSelectedMonsterId = id;
          this.renderTabContent(true);
        }
      });
    });

    return body;
  }

  getSubTabTargetEntity() {
    const id = this.subTabSelectedMonsterId;
    if (!id) return null;
    const monsterDef = MONSTERS.find(m => m.id === id);
    if (!monsterDef) return null;
    
    return {
      ...monsterDef,
      stats: { hp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0, ...(monsterDef.stats || {}) },
      elementResist: { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0, ...(monsterDef.elements || {}) },
      ailmentResist: { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0, ...(monsterDef.ailments || {}) }
    };
  }

  renderInfoTab() {
    const body = this.renderSubTabsUI();
    const targetEntity = this.getSubTabTargetEntity();
    if (!targetEntity) {
      body.innerHTML = '<div class="text-xs text-slate-500 flex items-center justify-center h-full">対象が存在しません</div>';
      return;
    }

    const html = renderInfoTabHtml(targetEntity, false, this.equipMap, this.currentFloorNum, MATERIALS, this.monsterKills, this.ranchData, this.playerMedals);
    body.innerHTML = html;
  }

  async renderPetTab() {
    const body = this.renderSubTabsUI();
    const targetEntity = this.getSubTabTargetEntity();
    if (!targetEntity) {
      body.innerHTML = '<div class="text-xs text-slate-500 flex items-center justify-center h-full">対象が存在しません</div>';
      return;
    }

    await renderBattlePetTab(
      body,
      targetEntity,
      this.monsterKills,
      this.ranchData,
      this.currentDungeonId,
      async (updatedRanchData) => {
        this.ranchData = updatedRanchData;
        if (this._pendingRanchSave) {
          this._pendingRanchSave = updatedRanchData;
        }
        
        // 牧場ボーナスを再計算してパーティメンバーのステータスを更新
        const rawParty = await getCharactersWithRanchBonus();
        this.party.forEach(char => {
          const updatedChar = rawParty.find(c => c.id === char.id);
          if (updatedChar) {
            const oldMaxHp = char.stats.hp;
            const oldMaxMp = char.stats.mp;
            
            char.ranchBonus = updatedChar.ranchBonus;
            char.stats = calcFinalStats(char, this.equipMap);
            
            // 最大HP/MPの上昇分を現在のHP/MPにも加算
            const hpDiff = char.stats.hp - oldMaxHp;
            const mpDiff = char.stats.mp - oldMaxMp;
            if (hpDiff > 0) char.hp.current += hpDiff;
            if (mpDiff > 0) char.mp.current += mpDiff;
            
            char.hp.current = Math.min(char.hp.current, char.stats.hp);
            char.mp.current = Math.min(char.mp.current, char.stats.mp);
          }
        });
        
        // パーティカードを完全に再描画して最新ステータスを表示 (崩れを防止するため、クリアせずに直接上書き)
        const newHtml = this.party.map(p => renderPartyCardHtml(p, this.activeCharacter, this.isAutoBattle, this.selectedPartyMember)).join('');
        this.elements.partyArea.innerHTML = newHtml;
        
        // リスナーを再アタッチ
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
        
        this.cacheDOMElements();
      }
    );
  }

  async renderMedalTab() {
    const [allInventory, latestGold] = await Promise.all([
      GameDB.getAllInventory(),
      GameDB.getGameState('gold')
    ]);
    if (this.currentTab !== 'medal' || !this.container.isConnected) return;

    const inventoryMap = {};
    (allInventory || []).forEach(item => { inventoryMap[item.id] = item.quantity || 0; });
    this.currentGold = latestGold || 0;

    const medalAvailability = {};
    (this.dungeonCompanionMonsterIds || []).forEach(monsterId => {
      const monster = MONSTERS.find(m => m.id === monsterId);
      if (!monster) return;

      const currentRankIndex = this.playerMedals[monsterId] !== undefined ? this.playerMedals[monsterId] : -1;
      const isMaxRank = currentRankIndex >= MEDAL_RANKS.length - 1;
      const nextRank = !isMaxRank ? MEDAL_RANKS[currentRankIndex + 1] : null;
      const goldCost = nextRank ? (monster.rewards?.gold || 0) * nextRank.goldMultiplier : 0;
      const hasMaterials = nextRank && (monster.drops || []).every(
        drop => (inventoryMap[drop.itemId] || 0) >= nextRank.materialQty
      );
      const canCraft = Boolean(nextRank && hasMaterials && this.currentGold >= goldCost);

      medalAvailability[monsterId] = {
        isMaxRank,
        canAcquireOrUpgrade: canCraft
      };
    });

    const body = this.renderSubTabsUI(medalAvailability);
    const targetEntity = this.getSubTabTargetEntity();
    if (!targetEntity) {
      body.innerHTML = '<div class="text-xs text-slate-500 flex items-center justify-center h-full">対象が存在しません</div>';
      return;
    }

    await renderBattleMedalTab(
      body,
      targetEntity,
      this.playerMedals,
      this.currentGold,
      (updatedMedals, updatedGold) => {
        this.playerMedals = updatedMedals;
        this.currentGold = updatedGold;
        setTimeout(() => {
          if (this.currentTab === 'medal' && this.container.isConnected) {
            this.renderTabContent(true);
          }
        }, 500);
      }
    );
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
          if (this.activeCharacter.mp.current < levelConfig.mpCost) {
            this.showDamage(this.activeCharacter.elementId, 'MP不足', 'text-blue-400');
            return;
          }
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
  container.className = 'battle-page flex flex-col h-full bg-[#0b0b19] relative z-20 text-white font-sans overflow-hidden';
  
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
        transition: opacity 0.5s ease, transform 0.3s ease;
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
      .battle-page {
        --battle-palette-1: ${DEFAULT_BATTLE_PALETTE[0]};
        --battle-palette-2: ${DEFAULT_BATTLE_PALETTE[1]};
        --battle-palette-3: ${DEFAULT_BATTLE_PALETTE[2]};
        --battle-palette-4: ${DEFAULT_BATTLE_PALETTE[3]};
      }
      .battle-tab,
      #tab-content,
      #command-area,
      #command-blocker {
        transition: color .3s ease, background-color .3s ease, border-color .3s ease, box-shadow .3s ease, transform .15s ease;
      }
      .battle-tab {
        color: rgb(255 255 255 / .78);
        background-color: rgb(4 10 18 / .72);
        border-color: rgb(255 255 255 / .16);
        border-top-color: transparent;
        text-shadow: 0 1px 3px rgb(0 0 0 / .9);
      }
      .battle-tab:active { background-color: rgb(8 16 26 / .9); color: white; }
      .battle-tab--active {
        color: white;
        background-color: rgb(8 16 26 / .94);
        border-color: rgb(255 255 255 / .28);
        border-top-color: rgb(255 255 255 / .88);
        box-shadow: 0 -5px 20px rgb(var(--tab-color) / .42), inset 0 1px 0 rgb(255 255 255 / .08);
      }
      .battle-tab .material-symbols-outlined {
        color: rgb(255 255 255 / .88);
        filter: drop-shadow(0 0 6px rgb(var(--tab-color) / .8));
      }
      #tab-content {
        color: white;
        background-color: rgb(var(--battle-palette-1) / .76);
        border-color: rgb(var(--battle-palette-3) / .5);
        box-shadow: inset 0 1px 0 rgb(var(--battle-palette-4) / .18), 0 10px 28px rgb(0 0 0 / .35);
      }
      @media (max-width: 540px), (max-height: 760px) {
        #tab-content { padding: .3rem; }
        .sub-tab-header { padding: .2rem .2rem .1rem; margin-bottom: .15rem; }
        .battle-info-stat { min-height: 18px; }
        .battle-info-action-desc { display: none; }
        .battle-info-actions > div:last-child { max-height: 48px; }
        .battle-info-drop-card { height: 40px; padding: 1px; }
        .battle-info-drop-image { width: 21px; height: 21px; }
        .battle-info-drop-image img { width: 19px; height: 19px; }
      }
      #command-area {
        background: linear-gradient(135deg, rgb(42 58 76 / .92), rgb(54 78 102 / .84));
        border-color: rgb(112 154 184 / .55);
        box-shadow: 0 -5px 18px rgb(42 58 76 / .5);
      }
      #command-blocker { background-color: rgb(42 58 76 / .8); }
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
        <div class="flex px-0.5 gap-0.5 items-end shrink-0">
          <button id="tab-btn-skill" class="battle-tab battle-tab--active flex-1 py-1.5 border-t-[3px] border-x border-b rounded-t-lg text-[10px] font-bold relative z-10 flex items-center justify-center gap-1" style="--tab-color: var(--battle-palette-1)"><span class="material-symbols-outlined pointer-events-none" style="font-size: 13px; font-variation-settings: 'FILL' 1">auto_awesome</span><span class="pointer-events-none">Skill</span></button>
          <button id="tab-btn-item" class="battle-tab flex-1 py-1.5 border-t-[3px] border-x border-b rounded-t-lg text-[10px] font-bold flex items-center justify-center gap-1" style="--tab-color: var(--battle-palette-2)"><span class="material-symbols-outlined pointer-events-none" style="font-size: 13px;">backpack</span><span class="pointer-events-none">Item</span></button>
          <button id="tab-btn-info" class="battle-tab flex-1 py-1.5 border-t-[3px] border-x border-b rounded-t-lg text-[10px] font-bold flex items-center justify-center gap-1" style="--tab-color: var(--battle-palette-3)"><span class="material-symbols-outlined pointer-events-none" style="font-size: 13px;">info</span><span class="pointer-events-none">Info</span></button>
          <button id="tab-btn-pet" class="battle-tab flex-1 py-1.5 border-t-[3px] border-x border-b rounded-t-lg text-[10px] font-bold flex items-center justify-center gap-1" style="--tab-color: var(--battle-palette-4)"><span class="material-symbols-outlined pointer-events-none" style="font-size: 13px;">pets</span><span class="pointer-events-none">Pet</span></button>
          <button id="tab-btn-medal" class="battle-tab flex-1 py-1.5 border-t-[3px] border-x border-b rounded-t-lg text-[10px] font-bold flex items-center justify-center gap-1" style="--tab-color: var(--battle-palette-2)"><span class="material-symbols-outlined pointer-events-none" style="font-size: 13px;">military_tech</span><span class="pointer-events-none">Medal</span></button>
        </div>
        <!-- Tab Content -->
        <div id="tab-content" class="flex-1 border rounded-b-xl p-2.5 min-h-[120px] overflow-y-auto shadow-xl mb-2 relative z-0">
          <!-- Example content to fill space -->
          <div class="text-xs text-gray-500 flex items-center justify-center h-full">
            （コマンドタブのコンテンツエリア）
          </div>
        </div>
      </div>
      
    </div>

    <!-- Command Area (Fixed at bottom of main, above footer) -->
    <div id="command-area" class="backdrop-blur-[2px] border-t p-2 flex gap-2 shrink-0 h-[72px] relative">
      <!-- Overlay block when no active character -->
      <div id="command-blocker" class="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[2px]">
        <span class="text-sm font-bold text-white/80 animate-pulse tracking-wide">行動順を待っています...</span>
      </div>

      <!-- Actions -->
      <button id="btn-run" class="flex-1 bg-teal-900 active:bg-teal-800 rounded-lg font-bold text-[11px] border border-teal-700 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-teal-100 p-1 cursor-pointer">
        <span class="material-symbols-outlined text-[18px] mb-0.5 text-teal-400">home</span>街に戻る
      </button>
      <button id="btn-auto-dungeon" class="flex-1 bg-purple-900 active:bg-purple-800 rounded-lg font-bold text-[10px] border border-purple-700 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-purple-100 p-1">
        <span class="material-symbols-outlined text-[18px] mb-0.5 text-purple-400">all_inclusive</span>踏破周回
      </button>
      <button id="btn-auto-floor" class="flex-1 bg-blue-900 active:bg-blue-800 rounded-lg font-bold text-[10px] border border-blue-700 flex flex-col items-center justify-center transition-all active:scale-95 shadow-md text-blue-100 p-1">
        <span class="material-symbols-outlined text-[18px] mb-0.5 text-blue-400">autorenew</span>階層周回
      </button>
      <button id="btn-attack" class="flex-1 bg-red-700 active:bg-red-600 rounded-lg font-bold text-[11px] shadow-lg border border-red-500 flex flex-col items-center justify-center transition-all active:scale-95 text-red-50 p-1">
        <span class="material-symbols-outlined text-[18px] mb-0.5 text-red-300">swords</span>攻撃
      </button>
    </div>
    
    <!-- Result Overlay -->
    <div id="battle-result" class="hidden absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
       <h2 id="result-title" class="text-5xl font-black mb-4 tracking-widest text-yellow-400 drop-shadow-lg">VICTORY</h2>
       <p id="result-text" class="text-gray-300 mb-10 text-sm font-bold">経験値とゴールドを獲得しました。</p>
       <button id="btn-result-ok" class="px-10 py-4 bg-blue-600 active:bg-blue-500 rounded-2xl font-black text-lg transition-transform active:scale-90 cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.5)]">
         街へ戻る
       </button>
    </div>
  `;

  setTimeout(() => {
    new BattleManager(container).init();
  }, 0);

  return container;
}
