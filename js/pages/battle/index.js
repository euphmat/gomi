/**
 * battle/index.js
 * BattleManager コアクラス定義 + 各モジュールのミックスイン統合
 * エントリポイント: renderBattlePage()
 */

import { GameDB } from '../../data/database.js';
import { MONSTERS } from '../../definitions/monsters.js';
import { DUNGEONS } from '../../definitions/dungeons.js';
import { SPECIAL_DUNGEONS } from '../../definitions/special_dungeons.js';
import { calcFinalStats, buildEquipmentMap, getCharactersWithRanchBonus } from '../../data/stat-calculator.js';
import { JOBS } from '../../jobs/index.js';
import { MEDAL_RANKS, calcMedalSpawnBonus } from '../../definitions/medal-definitions.js';
import { renderEnemyCardHtml, renderPartyCardHtml, renderSkillTabHtml, getActiveStateIconsHTML } from './battle-ui.js';
import { refreshBattlePetInventory, renderBattlePetTab } from './battle-pet-tab.js';
import { renderBattleMedalTab } from './battle-medal-tab.js';
import { renderBattleControlsTab, syncBattleControlsFloor } from './battle-controls.js';
import {
  BattleTelemetry,
  cleanupBattleStatistics,
  renderBattleStatisticsTab,
  scheduleBattleStatisticsRender
} from './battle-statistics.js';
import { NUMBER_NOTATION_CHANGED_EVENT, formatNumber } from '../../utils/format.js';
import { loadTreasureLevels } from '../../data/treasure-manager.js';
import { configureBattleEffectsLayer } from '../../utils/battle-animation.js';
import { setLockScreenActivity } from '../../utils/screen-lock.js';
import { resolveJobSkillLevelConfig } from '../../utils/job-skill-potency.js';
import { getEffectiveMedalEquipmentMpCost } from '../../utils/medal-equipment-effects.js';
import { selectAutoBattleAction } from './auto-battle-ai.js';
import { getJobGaugeSkillUseState } from './job-gauge-system.js';

// --- Mixin imports ---
import { popupMethods } from './battle-popups.js';
import { atbMethods } from './battle-atb.js';
import { actionMethods } from './battle-actions.js';
import { passiveMethods } from './battle-passives.js';
import { ailmentMethods } from './battle-ailments.js';
import { rendererMethods } from './battle-renderer.js';
import { resultMethods } from './battle-results.js';

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
    setLockScreenActivity('battle', this.autoBattleMode !== 'none', {
      mode: this.autoBattleMode,
      reset: this.autoBattleMode !== 'none',
    });
    this.equipMap = {};
    this.isDungeonClear = false;
    this.completedDungeonIds = [];
    this._floorJumpPending = false;
    this.currentTab = 'skill';
    this.skillSubTab = 'active';
    this.jobDefinitions = JOBS;
    this.battleStatisticsCharacterKey = null;
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
    this._petInventoryRefreshPending = false;
    this._tabInteractionTimer = null;
    this._battleReady = false;
    this._pendingTabRender = false;
    this._scheduledTabRenderTimer = null;
    this._lastSkillRenderKey = null;
    this.battleTelemetry = new BattleTelemetry({
      onChange: () => scheduleBattleStatisticsRender(this)
    });
    this._numberNotationHandler = () => {
      if (!this.container?.isConnected) return;
      this._lastSkillRenderKey = null;
      this.updateEntities();
      this.renderTabContent(true);
    };
    window.addEventListener(NUMBER_NOTATION_CHANGED_EVENT, this._numberNotationHandler);

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
      tabBtnStats: container.querySelector('#tab-btn-stats'),
      tabBtnControls: container.querySelector('#tab-btn-controls'),
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

    // Tab navigation must be usable as soon as the battle shell is visible.
    // Waiting for the asynchronous IndexedDB initialization made the first
    // tap disappear on slower mobile devices.
    this.setupTabListeners();
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
    this._battleReady = false;

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
          if (this._petInventoryRefreshPending) {
            this._petInventoryRefreshPending = false;
            this.refreshPetTabResources().catch(error => {
              console.warn('Pet inventory refresh failed:', error);
            });
          }
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
    this.completedDungeonIds = await GameDB.getGameState('completed_dungeons') || [];
    const rawEquipment = await GameDB.getAllEquipment();
    this.equipMap = buildEquipmentMap(rawEquipment);
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
      sceneBg.style.backgroundImage = `linear-gradient(to bottom, rgba(2, 6, 23, 0.28) 0%, rgba(2, 6, 23, 0.5) 42%, rgba(2, 6, 23, 0.84) 100%), url('${this.dungeonDef.bgImage}')`;
      sceneBg.style.backgroundSize = 'cover';
      sceneBg.style.backgroundPosition = 'center top';
      this.applyBattleTheme(this.dungeonDef.bgImage);
    } else if (sceneBg) {
      sceneBg.style.backgroundImage = 'radial-gradient(circle at top, #1a202c 0%, #0b0b19 100%)';
    }

    if (!this.party || this.party.length === 0) {
      const rawParty = await getCharactersWithRanchBonus();

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
      // Re-use party in memory while refreshing equipment-derived stats. Medal
      // shop equipment can grow after every cleared floor.
      this.party.forEach(char => {
        char.stats = calcFinalStats(char, this.equipMap);
        char.hp.current = Math.min(char.hp.current, char.stats.hp || char.hp.max);
        char.mp.current = Math.min(char.mp.current, char.stats.mp || char.mp.max);
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
    const selectableMonsterIds = this.getSubTabMonsterIds();
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
    this._battleReady = true;

    if (this._pendingTabRender) {
      this._pendingTabRender = false;
      this.renderTabContent(true);
    }
    
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
        setLockScreenActivity('battle', false, { mode: 'none' });
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

  async jumpToFloor(floorLevel) {
    const targetFloor = Number(floorLevel);
    const floorExists = this.dungeonDef?.floors?.some(floor => Number(floor.level) === targetFloor);
    const canJumpFloors = Array.isArray(this.completedDungeonIds)
      && this.completedDungeonIds.includes(this.currentDungeonId);
    if (this._floorJumpPending || !canJumpFloors || !floorExists || targetFloor === Number(this.currentFloorNum)) {
      return false;
    }

    this._floorJumpPending = true;
    this._battleReady = false;
    this.stopAtbLoop();

    try {
      const completedDungeonIds = await GameDB.getGameState('completed_dungeons') || [];
      if (!Array.isArray(completedDungeonIds) || !completedDungeonIds.includes(this.currentDungeonId)) {
        throw new Error('Dungeon is not completed');
      }

      await this.saveDeferredData();
      await this.savePartyState();
      await GameDB.setGameState('currentFloor', targetFloor);
      this.elements.resultOverlay.classList.add('hidden');
      this.resetBattleState(true);
      await this.init();
      return true;
    } catch (error) {
      if (this.container.isConnected && window.location.hash === '#/battle') {
        this.init();
      }
      throw error;
    } finally {
      this._floorJumpPending = false;
    }
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
    cleanupBattleStatistics(this);
    clearTimeout(this._scheduledTabRenderTimer);
    this._scheduledTabRenderTimer = null;
    clearTimeout(this._tabInteractionTimer);
    this._tabInteractionTimer = null;
    this.isTabInteracting = false;
    this._petInventoryRefreshPending = false;
    if (this._numberNotationHandler) {
      window.removeEventListener(NUMBER_NOTATION_CHANGED_EVENT, this._numberNotationHandler);
      this._numberNotationHandler = null;
    }
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
              const levelConfig = resolveJobSkillLevelConfig(skillDef, level, 'current');
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
              const levelConfig = resolveJobSkillLevelConfig(skillDef, level, 'inherited');
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
    const state = this.isAutoBattle ? 'auto' : (this.activeCharacter ? 'ready' : 'waiting');
    if (this.elements.btnAttack.dataset.state === state) return;

    const isDisabled = state !== 'ready';

    this.elements.commandBlocker.classList.toggle('hidden', state !== 'waiting');
    this.elements.btnAttack.disabled = isDisabled;
    this.elements.btnAttack.classList.toggle('opacity-50', isDisabled);
    this.elements.btnAttack.classList.toggle('grayscale', isDisabled);
    this.elements.btnAttack.classList.toggle('cursor-not-allowed', isDisabled);

    this.elements.btnAttack.dataset.state = state;
    if (state === 'waiting') {
      this.elements.btnAttack.innerHTML = '<span class="material-symbols-outlined text-[17px]">hourglass_top</span><span>待機中</span>';
    } else if (state === 'auto') {
      this.elements.btnAttack.innerHTML = '<span class="material-symbols-outlined text-[17px]">smart_toy</span><span>自動中</span>';
    } else {
      this.elements.btnAttack.innerHTML = '<span class="material-symbols-outlined text-[17px] text-red-300">swords</span><span>攻撃</span>';
    }
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
      setLockScreenActivity('battle', false, { mode: 'none' });
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
        setLockScreenActivity('battle', false, { mode: 'none' });
        window.location.hash = '/dungeon';
      }
    };

    // 初期状態のタブスタイルを適用
    this.updateTabStyles();
    this.updateCommandUI();
  }

  setupTabListeners() {
    const tabs = [
      { btn: this.elements.tabBtnSkill, id: 'skill' },
      { btn: this.elements.tabBtnStats, id: 'stats' },
      { btn: this.elements.tabBtnControls, id: 'controls' },
      { btn: this.elements.tabBtnPet, id: 'pet' },
      { btn: this.elements.tabBtnMedal, id: 'medal' }
    ];

    tabs.forEach(({ btn, id }) => {
      let lastPointerActivation = 0;

      const activate = () => {
        if (this.currentTab === id) return;
        this.currentTab = id;
        this.updateTabStyles();

        if (this._battleReady) {
          this.renderTabContent(true);
        } else {
          this._pendingTabRender = true;
        }
      };

      // Mobile Safari can defer or discard the synthesized click while the
      // surrounding battle UI is updating. Pointerdown provides a single,
      // immediate activation for this fixed (non-scrollable) tab bar.
      btn.addEventListener('pointerdown', event => {
        if (event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
        lastPointerActivation = Date.now();
        event.preventDefault();
        activate();
      });

      // Keyboard activation and browsers without usable pointer events.
      btn.addEventListener('click', () => {
        if (Date.now() - lastPointerActivation < 500) return;
        activate();
      });
    });
  }

  updateCommandUI() {
    setLockScreenActivity('battle', this.isAutoBattle, { mode: this.autoBattleMode });
    this.elements.btnAutoFloor.className = "battle-command flex-1 min-w-0 bg-blue-950/90 active:bg-blue-800 rounded-lg font-bold text-[9px] border border-blue-700/80 flex items-center justify-center gap-1 transition-all active:scale-[0.97] shadow-md text-blue-100 px-1";
    this.elements.btnAutoFloor.innerHTML = `<span class="material-symbols-outlined text-[17px] text-blue-400">autorenew</span><span>階層周回</span>`;

    this.elements.btnAutoDungeon.className = "battle-command flex-1 min-w-0 bg-purple-950/90 active:bg-purple-800 rounded-lg font-bold text-[9px] border border-purple-700/80 flex items-center justify-center gap-1 transition-all active:scale-[0.97] shadow-md text-purple-100 px-1";
    this.elements.btnAutoDungeon.innerHTML = `<span class="material-symbols-outlined text-[17px] text-purple-400">all_inclusive</span><span>踏破周回</span>`;

    if (this.autoBattleMode === 'floor') {
      this.elements.btnAutoFloor.className = "battle-command flex-1 min-w-0 bg-blue-600 rounded-lg font-bold text-[9px] border-2 border-blue-200 flex items-center justify-center gap-1 transition-all shadow-[0_0_12px_rgba(59,130,246,0.75)] text-white px-1 z-10";
      this.elements.btnAutoFloor.innerHTML = `<span class="material-symbols-outlined text-[17px] text-white">autorenew</span><span>階層周回中</span>`;
    } else if (this.autoBattleMode === 'dungeon') {
      this.elements.btnAutoDungeon.className = "battle-command flex-1 min-w-0 bg-purple-600 rounded-lg font-bold text-[9px] border-2 border-purple-200 flex items-center justify-center gap-1 transition-all shadow-[0_0_12px_rgba(168,85,247,0.75)] text-white px-1 z-10";
      this.elements.btnAutoDungeon.innerHTML = `<span class="material-symbols-outlined text-[17px] text-white">all_inclusive</span><span>踏破周回中</span>`;
    }

    this.elements.btnRun.className = "battle-command flex-1 min-w-0 bg-teal-950/90 active:bg-teal-800 rounded-lg font-bold text-[9px] border border-teal-700/80 flex items-center justify-center gap-1 transition-all active:scale-[0.97] shadow-md text-teal-100 px-1 cursor-pointer";
    this.elements.btnRun.innerHTML = `<span class="material-symbols-outlined text-[17px] text-teal-400">home</span><span>街に戻る</span>`;

    if (this.isAutoBattle) {
      this.elements.btnAttack.disabled = true;
      this.elements.btnRun.disabled = false;
    } else {
      this.elements.btnRun.disabled = false;
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
              const effectiveMpCost = getEffectiveMedalEquipmentMpCost(character, this.equipMap, levelConfig.mpCost);
              const isBlockedBySilence = character.activeAilment?.type === 'silence' && effectiveMpCost > 0;
              const authoredUseState = def.getUseState?.(character, levelConfig) || { canUse: true };
              const gaugeUseState = getJobGaugeSkillUseState(character, skillId);
              const useState = authoredUseState.canUse === false ? authoredUseState : gaugeUseState;
              if (isAutoEnabled && !isBlockedBySilence && character.mp.current >= effectiveMpCost && useState.canUse !== false) {
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
          equipMap: this.equipMap,
          getEffectiveMpCost: (entity, baseCost) => getEffectiveMedalEquipmentMpCost(entity, this.equipMap, baseCost),
          selectedEnemyTarget: (this.selectedEnemyTarget && !this.selectedEnemyTarget.isDead) ? this.selectedEnemyTarget : null
        };

        const bestAction = selectAutoBattleAction({
          character,
          usableSkills,
          context,
          findSkill: (entity, skillId) => this._findSkill(entity, skillId),
          isSkillEnabled: (entity, skillId) => this.autoSkillStates[entity.id]?.[skillId] !== false,
          onSkillCheckError: (skillId, error) => {
            console.error(`AutoBattle skill check error [${skillId}]:`, error);
          }
        });

        if (bestAction.type === 'skill' && bestAction.skill && bestAction.target) {
          const prevTarget = this.selectedEnemyTarget;
          this.selectedEnemyTarget = bestAction.target;
          this.executeSkill(character, bestAction.skill.def, bestAction.skill.levelConfig, { autoTarget: bestAction.target });
          this.selectedEnemyTarget = prevTarget;
        } else if (bestAction.target) {
          this.executeAttack(character, bestAction.target, true);
        } else {
          // 対象がすべて睡眠中でナイトメア担当が控えている場合などは行動を譲る。
          this.activeCharacter = null;
          character.atb = 0;
        }
      } catch (err) {
        console.error("AutoBattle execution error:", err);
        this.activeCharacter = null;
        character.atb = 0;
      }
    };

    // At maximum speed, keep the simulation fast but split actor selection and
    // AI/effect work across event-loop turns. A single display-frame yield is
    // enough to prevent the visible pre-attack hitch on mobile devices.
    this._scheduleBattleTimeout(executeAuto, this.speedMult >= 5 ? 16 : delay);
  }

  updateTabStyles() {
    const tabs = [
      { btn: this.elements.tabBtnSkill, id: 'skill', icon: 'auto_awesome', palette: 1, label: 'スキル' },
      { btn: this.elements.tabBtnStats, id: 'stats', icon: 'monitoring', palette: 2, label: '統計' },
      { btn: this.elements.tabBtnControls, id: 'controls', icon: 'tune', palette: 3, label: 'コントロール' },
      { btn: this.elements.tabBtnPet, id: 'pet', icon: 'pets', palette: 4, label: '仲間' },
      { btn: this.elements.tabBtnMedal, id: 'medal', icon: 'military_tech', palette: 2, label: 'メダル' }
    ];

    tabs.forEach(({btn, id, icon, palette, label}) => {
      const labelSize = id === 'controls' ? 'text-[8px]' : '';
      btn.style.setProperty('--tab-color', `var(--battle-palette-${palette})`);
      btn.setAttribute('aria-selected', String(this.currentTab === id));
      btn.setAttribute('aria-label', label);
      if (this.currentTab === id) {
        btn.className = `battle-tab battle-tab--active flex-1 min-w-0 px-0.5 border-t-2 border-x border-b rounded-t-lg text-[9px] font-bold relative z-10 flex items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer`;
        btn.innerHTML = `<span class="material-symbols-outlined pointer-events-none" style="font-size: 14px; font-variation-settings: 'FILL' 1">${icon}</span><span class="pointer-events-none truncate ${labelSize}">${label}</span>`;
      } else {
        btn.className = `battle-tab flex-1 min-w-0 px-0.5 backdrop-blur-sm border-t-2 border-x border-b rounded-t-lg text-[9px] font-bold flex items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer`;
        btn.innerHTML = `<span class="material-symbols-outlined pointer-events-none" style="font-size: 14px;">${icon}</span><span class="pointer-events-none truncate ${labelSize}">${label}</span>`;
      }
    });
  }

  getSubTabMonsterIds(tab = this.currentTab) {
    // 自動戦闘中は戦闘の進行で階層が切り替わっても選択対象が欠けないよう、
    // コレクション系のタブには現在のダンジョンに登場する全種を並べる。
    if (this.isAutoBattle && ['pet', 'medal'].includes(tab)) {
      return this.dungeonUniqueMonsterIds || [];
    }

    if (tab === 'pet') return this.dungeonUniqueMonsterIds || [];
    if (tab === 'medal') return this.dungeonCompanionMonsterIds || [];
    return this.floorUniqueMonsterIds || [];
  }

  getDungeonMedalAvailability(allInventory = [], gold = this.currentGold) {
    const inventoryMap = {};
    (allInventory || []).forEach(item => { inventoryMap[item.id] = item.quantity || 0; });

    const medalAvailability = {};
    this.getSubTabMonsterIds('medal').forEach(monsterId => {
      const monster = MONSTERS.find(m => m.id === monsterId);
      if (!monster) return;

      const currentRankIndex = this.playerMedals[monsterId] !== undefined ? this.playerMedals[monsterId] : -1;
      const isMaxRank = currentRankIndex >= MEDAL_RANKS.length - 1;
      const nextRank = !isMaxRank ? MEDAL_RANKS[currentRankIndex + 1] : null;
      const goldCost = nextRank ? (monster.rewards?.gold || 0) * nextRank.goldMultiplier : 0;
      const hasMaterials = nextRank && (monster.drops || []).every(
        drop => (inventoryMap[drop.itemId] || 0) >= nextRank.materialQty
      );
      const canAcquireOrUpgrade = Boolean(nextRank && hasMaterials && gold >= goldCost);

      medalAvailability[monsterId] = {
        isMaxRank,
        canAcquireOrUpgrade
      };
    });

    return medalAvailability;
  }

  renderTabContent(force = false) {
    if (this.currentTab !== 'stats') cleanupBattleStatistics(this);

    if (this.currentTab === 'skill') {
      const p = this.isAutoBattle
        ? (this.selectedPartyMember || this.party.find(char => !char.isDead))
        : (this.activeCharacter || this.selectedPartyMember || this.party.find(char => !char.isDead));
      const canAct = this.isAutoBattle || this.activeCharacter === p;
      const autoState = p ? this.autoSkillStates[p.id] || {} : {};
      const skillRenderKey = [
        p?.id || 'none',
        this.isAutoBattle ? 'auto' : 'manual',
        canAct ? 'act' : 'view',
        this.skillSubTab,
        p?.mp?.current ?? 0,
        p?.activeAilment?.type || '',
        Object.entries(autoState).sort(([a], [b]) => a.localeCompare(b)).map(([id, enabled]) => `${id}:${enabled}`).join(',')
      ].join('|');
      if (this.elements.tabContent.dataset.renderedTab === 'skill'
          && this._lastSkillRenderKey === skillRenderKey) return;
      this._lastSkillRenderKey = skillRenderKey;
      this.elements.tabContent.dataset.renderedTab = 'skill';
      this.renderSkillTab();
    } else if (this.currentTab === 'stats') {
      this.elements.tabContent.dataset.renderedTab = 'stats';
      renderBattleStatisticsTab(this, force);
    } else if (this.currentTab === 'controls') {
      if (!force && this.elements.tabContent.dataset.renderedTab === 'controls') {
        syncBattleControlsFloor(this.elements.tabContent, this.currentFloorNum);
        return;
      }
      this.elements.tabContent.dataset.renderedTab = 'controls';
      renderBattleControlsTab(this.elements.tabContent, {
        dungeonDef: this.dungeonDef,
        currentFloorNum: this.currentFloorNum,
        canJumpFloors: Array.isArray(this.completedDungeonIds)
          && this.completedDungeonIds.includes(this.currentDungeonId),
        ranchData: this.ranchData,
        playerMedals: this.playerMedals,
        onFloorJump: floorLevel => this.jumpToFloor(floorLevel),
      });
    } else if (this.currentTab === 'pet') {
      const targetId = this.subTabSelectedMonsterId || 'none';
      const monsterScope = this.isAutoBattle ? 'auto-dungeon' : 'manual';

      // Pet の内容は行動中のキャラクターには依存しない。自動戦闘中は
      // renderEntities() から頻繁に呼ばれるため、同じモンスターを表示中に
      // タブ全体を作り直すとスクロール領域が置換されてちらついてしまう。
      // 所持素材は Pet 側のポーリングで差分更新されるので、明示的な更新
      // (モンスター切替・餌やり等) があるまでは現在の DOM を維持する。
      if (!force &&
          this.elements.tabContent.dataset.renderedTab === 'pet' &&
          this.elements.tabContent.dataset.petTargetId === targetId &&
          this.elements.tabContent.dataset.petMonsterScope === monsterScope) {
        return;
      }
      
      this.elements.tabContent.dataset.renderedTab = 'pet';
      this.elements.tabContent.dataset.petTargetId = targetId;
      this.elements.tabContent.dataset.petMonsterScope = monsterScope;
      this.renderPetTab();
    } else if (this.currentTab === 'medal') {
      const targetId = this.subTabSelectedMonsterId || 'none';
      const monsterScope = this.isAutoBattle ? 'auto-dungeon' : 'manual';

      if (!force &&
          this.elements.tabContent.dataset.renderedTab === 'medal' &&
          this.elements.tabContent.dataset.medalTargetId === targetId &&
          this.elements.tabContent.dataset.medalMonsterScope === monsterScope) {
        return;
      }
      
      this.elements.tabContent.dataset.renderedTab = 'medal';
      this.elements.tabContent.dataset.medalTargetId = targetId;
      this.elements.tabContent.dataset.medalMonsterScope = monsterScope;
      this.renderMedalTab();
    }
  }

  scheduleTabContentRender() {
    if (this._scheduledTabRenderTimer != null) return;
    this._scheduledTabRenderTimer = setTimeout(() => {
      this._scheduledTabRenderTimer = null;
      if (!document.hidden && this.container?.isConnected) this.renderTabContent();
    }, 0);
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
    const body = document.createElement('div');
    body.className = 'sub-tab-body flex-1 min-h-0 overflow-y-auto custom-scrollbar relative bg-transparent pr-1';
    // The Pet / Medal renderers receive this inner body and use its marker to
    // discard stale async results. Keep the marker on the actual render target,
    // not only on the outer #tab-content element.
    body.dataset.renderedTab = this.currentTab;
    previousBody.replaceWith(body);

    const availableMonsterIds = this.getSubTabMonsterIds();

    if (!availableMonsterIds.includes(this.subTabSelectedMonsterId)) {
      this.subTabSelectedMonsterId = availableMonsterIds[0] || null;
    }

    const monsterDefs = availableMonsterIds.map(mId => MONSTERS.find(m => m.id === mId)).filter(Boolean);
    
    header.innerHTML = monsterDefs.map(m => {
      const isSelected = this.subTabSelectedMonsterId === m.id;
      const medalStatus = this.currentTab === 'medal' ? medalAvailability[m.id] : null;
      const isPetCompanion = this.currentTab === 'pet' && Object.values(this.ranchData || {}).some(
        dungeonRanch => dungeonRanch?.[m.id] || dungeonRanch?.[`${m.id}_legendary`]
      );
      const hasLegendaryCompanion = this.currentTab === 'pet' && Object.values(this.ranchData || {}).some(
        dungeonRanch => dungeonRanch?.[`${m.id}_legendary`]
      );
      const hasMedal = Object.prototype.hasOwnProperty.call(this.playerMedals || {}, m.id);
      const isLockedIcon = this.currentTab === 'pet'
        ? !isPetCompanion
        : this.isAutoBattle && this.currentTab === 'medal'
          ? !hasMedal
          : false;
      const monsterImageStyle = isLockedIcon
        ? 'filter: brightness(0); opacity: 0.9;'
        : '';
      const lockedLabel = this.currentTab === 'pet' ? '仲間未獲得' : 'メダル未所持';
      const monsterAriaLabel = isLockedIcon ? `${m.name}（${lockedLabel}）` : m.name;
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
          <button type="button" class="sub-tab-item flex min-h-11 items-center justify-center gap-1.5 px-3 py-1 rounded-full cursor-pointer border ${bgClass} ${shadowClass} ${opacity} transition-all mb-1 backdrop-blur-sm shrink-0" data-id="${m.id}" aria-label="${monsterAriaLabel}" aria-pressed="true">
            <img src="${m.image}" class="w-4 h-4 shrink-0 object-contain pointer-events-none" style="${monsterImageStyle}" onerror="this.style.display='none'">
            <span class="text-[11px] font-bold tracking-wide whitespace-nowrap pointer-events-none ${selectedTextClass}">${m.name}</span>
          </button>
        `;
      } else {
        return `
          <button type="button" class="sub-tab-item flex h-11 w-11 items-center justify-center rounded-full cursor-pointer border ${bgClass} ${shadowClass} ${opacity} transition-all mb-1 backdrop-blur-sm shrink-0" data-id="${m.id}" aria-label="${monsterAriaLabel}" aria-pressed="false">
            <img src="${m.image}" class="w-4 h-4 shrink-0 object-contain pointer-events-none" style="${monsterImageStyle}" onerror="this.style.display='none'">
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

  async refreshPetTabResources() {
    if (this.currentTab !== 'pet' || !this.container?.isConnected) return false;
    if (this.isTabInteracting) {
      this._petInventoryRefreshPending = true;
      return true;
    }
    const body = this.elements.tabContent.querySelector('.sub-tab-body');
    return refreshBattlePetInventory(body);
  }

  async renderMedalTab() {
    const [allInventory, latestGold] = await Promise.all([
      GameDB.getAllInventory(),
      GameDB.getGameState('gold')
    ]);
    if (this.currentTab !== 'medal' || !this.container.isConnected) return;

    this.currentGold = latestGold || 0;
    const medalAvailability = this.getDungeonMedalAvailability(allInventory, this.currentGold);

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
      },
      allInventory
    );
  }

  renderSkillTab() {
    const p = this.isAutoBattle
      ? (this.selectedPartyMember || this.party.find(char => !char.isDead))
      : (this.activeCharacter || this.selectedPartyMember || this.party.find(char => !char.isDead));
    const canAct = this.isAutoBattle || this.activeCharacter === p;
    
    const html = renderSkillTabHtml(p, this.isAutoBattle, this.autoSkillStates, JOBS, this.equipMap, this.skillSubTab, canAct);
    this.elements.tabContent.innerHTML = html;

    this.elements.tabContent.querySelectorAll('.skill-subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextKind = btn.dataset.skillKind;
        if (!['active', 'passive', 'unique'].includes(nextKind) || this.skillSubTab === nextKind) return;
        this.skillSubTab = nextKind;
        this.renderTabContent();
      });
    });

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
          const effectiveMpCost = getEffectiveMedalEquipmentMpCost(this.activeCharacter, this.equipMap, levelConfig.mpCost);
          if (this.activeCharacter.mp.current < effectiveMpCost) {
            this.showDamage(this.activeCharacter.elementId, 'MP不足', 'text-blue-400');
            return;
          }
          const authoredUseState = found.def.getUseState?.(this.activeCharacter, levelConfig) || { canUse: true };
          const gaugeUseState = getJobGaugeSkillUseState(this.activeCharacter, skillId);
          const useState = authoredUseState.canUse === false ? authoredUseState : gaugeUseState;
          if (useState.canUse === false) {
            this.showDamage(this.activeCharacter.elementId, useState.message || '使用不可', 'text-violet-300');
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
        max-width: min(3.75rem, calc(100% / var(--enemy-cols, 4) - 0.25rem));
      }
      #enemy-area {
        height: 88px;
        min-height: 88px;
        max-height: 88px;
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
        isolation: isolate;
      }
      #battle-scene-bg {
        background-color: #07101c;
      }
      #party-area {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        align-items: stretch;
      }
      #party-area .party-card {
        height: 100%;
      }
      .battle-tab,
      #tab-content,
      #command-area,
      #command-blocker {
        transition: color .3s ease, background-color .3s ease, border-color .3s ease, box-shadow .3s ease, transform .15s ease;
      }
      .battle-tab {
        min-height: 36px;
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
        background: linear-gradient(145deg, rgb(4 10 18 / .94), rgb(var(--battle-palette-1) / .72));
        border-color: rgb(var(--battle-palette-3) / .5);
        box-shadow: inset 0 1px 0 rgb(var(--battle-palette-4) / .18), 0 10px 28px rgb(0 0 0 / .35);
        overscroll-behavior: contain;
        touch-action: pan-y;
      }
      .battle-switch {
        position: relative;
        display: inline-flex;
        width: 36px;
        height: 20px;
        flex: 0 0 auto;
        align-items: center;
        border-radius: 999px;
      }
      .battle-switch-knob {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 14px;
        height: 14px;
        border-radius: 999px;
        box-shadow: 0 1px 3px rgb(0 0 0 / .4);
        transition: transform .2s ease, background-color .2s ease;
      }
      .battle-switch.is-active .battle-switch-knob {
        transform: translateX(16px);
      }
      .battle-item-heading {
        min-height: 32px;
      }
      .battle-item-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
        gap: .375rem;
      }
      .battle-item-card {
        width: 100%;
        min-width: 0;
        aspect-ratio: 1;
      }
      .battle-item-image {
        width: min(36px, 76%);
        aspect-ratio: 1;
      }
      .battle-slider-shell {
        height: 24px;
        min-width: 0;
        touch-action: none;
      }
      .battle-slider-shell .quantity-slider {
        min-height: 0;
        touch-action: none;
      }
      .battle-quantity-input-shell {
        width: 44px;
        height: 28px;
      }
      .battle-max-button {
        width: 36px;
        height: 28px;
      }
      .battle-quantity-input-shell .quantity-input {
        min-height: 0;
      }
      .battle-feed-button {
        min-height: 30px;
      }
      .battle-medal-button {
        min-height: 40px;
      }
      .battle-legendary-track {
        position: relative;
        width: 36px;
        height: 20px;
        flex: 0 0 auto;
      }
      .battle-legendary-knob {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 12px;
        height: 12px;
        border-radius: 999px;
        box-shadow: 0 1px 3px rgb(0 0 0 / .45);
        transition: transform .2s ease, background-color .2s ease;
      }
      #legendary-toggle:checked + .battle-legendary-track .battle-legendary-knob {
        transform: translateX(16px);
        background: rgb(250 204 21);
      }
      @media (max-width: 540px), (max-height: 760px) {
        #tab-content { padding: .3rem; }
        .sub-tab-header { padding: .2rem .2rem .1rem; margin-bottom: .15rem; }
      }
      @media (max-width: 540px) {
        .battle-tab {
          min-height: 44px;
          gap: .1rem;
          padding-inline: .15rem;
          font-size: 8px;
        }
        .battle-tab .material-symbols-outlined { font-size: 13px !important; }
        #tab-btn-controls > span:last-child { font-size: 7px; }
        .sub-tab-body { padding-right: 0; }

        /* Skill: preserve readable names while keeping MP and auto controls tappable. */
        .battle-skill-card {
          min-height: 68px;
          gap: .375rem;
          padding: .5rem;
        }
        .battle-skill-icon { width: 36px; height: 36px; }
        .battle-skill-info > div:first-child { gap: .25rem; }
        .battle-skill-info > div:last-child { font-size: 10px; line-height: 1.25; }
        .battle-skill-controls { min-width: 0; }
        .battle-skill-mp { min-width: 38px; padding-inline: .25rem; }
        .battle-skill-mp > span:last-child { font-size: 15px; }
        .battle-skill-auto { min-width: 46px; padding-left: .375rem; }
        .battle-skill-passive-state { min-width: 46px; padding-left: .375rem; }

        /* Items: use the full phone width and never leave 40px-only tiles. */
        .battle-item-root { padding: .25rem; }
        .battle-item-grid { grid-template-columns: repeat(auto-fill, minmax(52px, 1fr)); }
        .battle-item-heading { min-height: 36px; }

        /* Companion: status and feeding controls stay dense on phones. */
        .battle-pet-root { padding: .125rem; }
        .battle-pet-title-row { gap: .25rem; }
        .battle-feed-button { min-height: 32px; }
        .battle-quantity-control {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 36px 44px;
          gap: .25rem;
          padding-inline: 0;
        }
        .battle-quantity-min { display: none; }
        .battle-max-button { width: 36px; height: 32px; }
        .battle-quantity-input-shell { width: 44px; height: 32px; }
        .battle-slider-shell { height: 32px; }

        /* Medal requirements are easier to scan as full-width touch rows. */
        .battle-medal-materials { grid-template-columns: minmax(0, 1fr); }
        .battle-medal-button { min-height: 44px; font-size: 12px; }
      }
      @media (max-width: 380px) {
        .battle-pet-portrait-column { width: 52px; }
        .battle-pet-title-row { flex-wrap: wrap; }
        .battle-pet-status-metric { padding-inline: .2rem; }
        .battle-pet-status-metric .material-symbols-outlined { display: none; }
        .battle-skill-card { gap: .25rem; padding-inline: .375rem; }
        .battle-skill-icon { width: 32px; height: 32px; }
        .battle-skill-mp { min-width: 34px; }
        .battle-skill-auto { min-width: 42px; padding-left: .25rem; }
        .battle-skill-passive-state { min-width: 42px; padding-left: .25rem; }
      }
      #command-area {
        box-sizing: border-box;
        height: calc(
          60px + env(safe-area-inset-bottom, 0px) +
          max(0px, calc(100lvh - 100dvh))
        );
        padding-bottom: calc(
          0.375rem + env(safe-area-inset-bottom, 0px) +
          max(0px, calc(100lvh - 100dvh))
        );
        background: linear-gradient(135deg, rgb(15 23 42 / .98), rgb(30 41 59 / .96));
        border-color: rgb(112 154 184 / .55);
        box-shadow: 0 -5px 18px rgb(42 58 76 / .5);
      }
      @media (max-height: 640px) {
        #enemy-area {
          height: 72px;
          min-height: 72px;
          max-height: 72px;
        }
        #enemy-area .enemy-card {
          max-width: min(3rem, calc(100% / var(--enemy-cols, 4) - 0.25rem));
        }
        .party-card > div:first-child > div:first-child {
          width: 1.75rem;
          height: 1.75rem;
        }
      }
    </style>

    <!-- Fixed Battle Area (Enemies, Party, Tabs) -->
    <div id="battle-scene-bg" class="relative flex flex-1 flex-col overflow-hidden" style="background: #0b0b19;">
      
      <!-- Enemy Area (Moved higher) -->
      <div id="enemy-area" class="relative z-10 shrink-0 px-1 py-0.5">
        <!-- Enemies will be injected here -->
      </div>

      <!-- Party Area -->
      <div id="party-area" class="relative z-10 mt-0.5 grid shrink-0 gap-1 px-1">
        <!-- Party will be injected here -->
      </div>
      
      <!-- Tabs & Tab Content Area -->
      <div class="relative z-10 mt-1 mb-1 flex min-h-0 flex-1 flex-col px-1">
        <!-- Tabs -->
        <div class="flex shrink-0 items-end gap-0.5 px-0.5" role="tablist" aria-label="戦闘メニュー">
          <button id="tab-btn-skill" role="tab" aria-selected="true" aria-label="スキル" class="battle-tab battle-tab--active relative z-10 flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-t-lg border-x border-b border-t-2 px-0.5 text-[9px] font-bold" style="--tab-color: var(--battle-palette-1)"><span class="material-symbols-outlined pointer-events-none" style="font-size: 14px; font-variation-settings: 'FILL' 1">auto_awesome</span><span class="pointer-events-none truncate">スキル</span></button>
          <button id="tab-btn-stats" role="tab" aria-selected="false" aria-label="統計" class="battle-tab flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-t-lg border-x border-b border-t-2 px-0.5 text-[9px] font-bold" style="--tab-color: var(--battle-palette-2)"><span class="material-symbols-outlined pointer-events-none" style="font-size: 14px;">monitoring</span><span class="pointer-events-none truncate">統計</span></button>
          <button id="tab-btn-controls" role="tab" aria-selected="false" aria-label="コントロール" class="battle-tab flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-t-lg border-x border-b border-t-2 px-0.5 text-[9px] font-bold" style="--tab-color: var(--battle-palette-3)"><span class="material-symbols-outlined pointer-events-none" style="font-size: 14px;">tune</span><span class="pointer-events-none truncate text-[8px]">コントロール</span></button>
          <button id="tab-btn-pet" role="tab" aria-selected="false" aria-label="仲間" class="battle-tab flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-t-lg border-x border-b border-t-2 px-0.5 text-[9px] font-bold" style="--tab-color: var(--battle-palette-4)"><span class="material-symbols-outlined pointer-events-none" style="font-size: 14px;">pets</span><span class="pointer-events-none truncate">仲間</span></button>
          <button id="tab-btn-medal" role="tab" aria-selected="false" aria-label="メダル" class="battle-tab flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-t-lg border-x border-b border-t-2 px-0.5 text-[9px] font-bold" style="--tab-color: var(--battle-palette-2)"><span class="material-symbols-outlined pointer-events-none" style="font-size: 14px;">military_tech</span><span class="pointer-events-none truncate">メダル</span></button>
        </div>
        <!-- Tab Content -->
        <div id="tab-content" class="relative z-0 min-h-[96px] flex-1 overflow-y-auto rounded-b-xl border p-2 shadow-xl">
          <!-- Example content to fill space -->
          <div class="text-xs text-gray-500 flex items-center justify-center h-full">
            （コマンドタブのコンテンツエリア）
          </div>
        </div>
      </div>
      
    </div>

    <!-- Command Area (Fixed at bottom of main, above footer) -->
    <div id="command-area" class="relative flex h-[60px] shrink-0 gap-1.5 border-t p-1.5 backdrop-blur-[2px]" aria-label="戦闘操作">
      <div id="command-blocker" class="sr-only" role="status" aria-live="polite">行動順を待っています</div>

      <!-- Actions -->
      <button id="btn-run" class="battle-command flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-teal-700/80 bg-teal-950/90 px-1 text-[9px] font-bold text-teal-100 shadow-md transition-all active:scale-[0.97] active:bg-teal-800">
        <span class="material-symbols-outlined text-[17px] text-teal-400">home</span><span>街に戻る</span>
      </button>
      <button id="btn-auto-dungeon" class="battle-command flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-purple-700/80 bg-purple-950/90 px-1 text-[9px] font-bold text-purple-100 shadow-md transition-all active:scale-[0.97] active:bg-purple-800">
        <span class="material-symbols-outlined text-[17px] text-purple-400">all_inclusive</span><span>踏破周回</span>
      </button>
      <button id="btn-auto-floor" class="battle-command flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-blue-700/80 bg-blue-950/90 px-1 text-[9px] font-bold text-blue-100 shadow-md transition-all active:scale-[0.97] active:bg-blue-800">
        <span class="material-symbols-outlined text-[17px] text-blue-400">autorenew</span><span>階層周回</span>
      </button>
      <button id="btn-attack" class="battle-command flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-red-500 bg-red-700 px-1 text-[9px] font-bold text-red-50 shadow-lg transition-all active:scale-[0.97] active:bg-red-600">
        <span class="material-symbols-outlined text-[17px] text-red-300">swords</span><span>攻撃</span>
      </button>
    </div>
    
    <!-- Result Overlay -->
    <div id="battle-result" class="hidden absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
       <h2 id="result-title" class="mb-3 text-4xl font-black tracking-widest text-yellow-400 drop-shadow-lg">VICTORY</h2>
       <p id="result-text" class="mb-7 px-4 text-center text-xs font-bold text-gray-300">経験値とゴールドを獲得しました。</p>
       <button id="btn-result-ok" class="cursor-pointer rounded-xl bg-blue-600 px-10 py-3 text-base font-black shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-transform active:scale-90 active:bg-blue-500">
         街へ戻る
       </button>
    </div>
  `;

  setTimeout(() => {
    new BattleManager(container).init();
  }, 0);

  return container;
}
