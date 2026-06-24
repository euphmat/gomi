import { GameDB } from '../../data/database.js';
import { DUNGEONS } from '../../definitions/dungeons.js';
import { SPECIAL_DUNGEONS } from '../../definitions/special_dungeons.js';
import { MONSTERS } from '../../definitions/monsters.js';
import { MATERIALS } from '../../definitions/materials.js';
import { getRanchLevelInfo, calculateTotalRanchBonus } from '../../data/stat-calculator.js';

const MATERIALS_MAP = new Map(MATERIALS.map(m => [m.id, m]));
const MONSTERS_MAP = new Map(MONSTERS.map(m => [m.id, m]));

export async function renderRanchTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full bg-[#0b0b19] overflow-hidden relative';

  let ranchData = await GameDB.getGameState('ranch_data') || {};
  let currentDungeonId = Object.keys(ranchData).length > 0 ? Object.keys(ranchData)[0] : null;

  const render = async () => {
    container.innerHTML = '';
    
    // Header
    const header = document.createElement('div');
    header.className = 'p-4 border-b border-slate-800 shrink-0';
    header.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-xl font-black text-pink-400 flex items-center gap-2">
          <span class="material-symbols-outlined">pets</span>モンスター牧場
        </h2>
        <button class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-pink-300 hover:bg-pink-900/50 hover:text-pink-200 transition-colors border border-slate-700/50 shadow-inner" id="btn-ranch-help">
          <span class="material-symbols-outlined text-[18px]">help</span>
        </button>
      </div>
    `;

    header.querySelector('#btn-ranch-help').onclick = () => {
      const helpOverlay = document.createElement('div');
      helpOverlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[100] animate-fade-in p-4 backdrop-blur-sm';
      
      const helpModal = document.createElement('div');
      helpModal.className = 'bg-slate-900 border border-pink-500/30 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden';
      
      helpModal.innerHTML = `
        <div class="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 class="text-md font-black text-pink-400 flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px]">help</span>
            牧場・テイムについて
          </h3>
          <button class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors btn-close-help">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="p-4 space-y-4 text-sm text-slate-300">
          <div>
            <h4 class="font-bold text-pink-300 mb-1 flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">favorite</span> 仲間（テイム）について
            </h4>
            <p class="text-xs leading-relaxed text-slate-400">
              ダンジョンでモンスターを討伐した際、一定確率でモンスターが仲間になり牧場へ送られます。<br>
              牧場では仲間になったモンスターにエサをあげて育成することができます。
            </p>
          </div>
          <div>
            <h4 class="font-bold text-pink-300 mb-1 flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">psychology</span> 仲間になる確率
            </h4>
            <p class="text-xs leading-relaxed text-slate-400">
              モンスターが仲間になる初期確率は一律で <span class="text-white font-bold">0.01%</span> に設定されています。<br>
              ただし、<span class="text-pink-300 font-bold">同じモンスターを100体討伐するごとに仲間になる確率が上昇</span>していきます！根気よく討伐を繰り返しましょう。
            </p>
          </div>
        </div>
      `;
      
      helpOverlay.appendChild(helpModal);
      document.body.appendChild(helpOverlay);
      
      const closeHelp = () => {
        helpOverlay.classList.replace('animate-fade-in', 'animate-fade-out');
        setTimeout(() => helpOverlay.remove(), 200);
      };
      
      helpModal.querySelector('.btn-close-help').onclick = closeHelp;
      helpOverlay.onclick = (e) => {
        if (e.target === helpOverlay) closeHelp();
      };
    };

    // Dungeon Selector
    if (Object.keys(ranchData).length > 0) {
      const selectWrapper = document.createElement('div');
      selectWrapper.className = 'relative max-w-xs';
      
      const select = document.createElement('select');
      select.className = 'w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 appearance-none focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500';
      
      Object.keys(ranchData).forEach(dId => {
        const dDef = DUNGEONS.find(d => d.id === dId) || SPECIAL_DUNGEONS.find(d => d.id === dId);
        const option = document.createElement('option');
        option.value = dId;
        option.textContent = dDef ? dDef.name : dId;
        if (dId === currentDungeonId) option.selected = true;
        select.appendChild(option);
      });
      
      select.onchange = (e) => {
        currentDungeonId = e.target.value;
        render();
      };
      
      const selectIcon = document.createElement('span');
      selectIcon.className = 'material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none';
      selectIcon.textContent = 'expand_more';
      
      selectWrapper.appendChild(select);
      selectWrapper.appendChild(selectIcon);
      header.appendChild(selectWrapper);
    } else {
      const noCompanions = document.createElement('div');
      noCompanions.className = 'bg-slate-900/50 rounded-xl p-4 text-center border border-slate-800';
      noCompanions.innerHTML = `<p class="text-slate-400 text-sm font-bold">まだ仲間になったモンスターはいません。<br>ダンジョンでモンスターを討伐して仲間にしましょう！</p>`;
      header.appendChild(noCompanions);
      container.appendChild(header);
      return;
    }

    container.appendChild(header);

    // Field Area
    const fieldContainer = document.createElement('div');
    fieldContainer.className = 'relative flex-1 min-h-[300px] border-b border-slate-800 overflow-y-auto no-scrollbar';
    
    const dDef = DUNGEONS.find(d => d.id === currentDungeonId) || SPECIAL_DUNGEONS.find(d => d.id === currentDungeonId);
    if (dDef && dDef.bgImage) {
      fieldContainer.style.backgroundImage = `linear-gradient(rgba(11, 11, 25, 0.4), rgba(11, 11, 25, 0.8)), url('${dDef.bgImage}')`;
      fieldContainer.style.backgroundSize = 'cover';
      fieldContainer.style.backgroundPosition = 'center';
      fieldContainer.style.backgroundAttachment = 'local';
    }

    const monstersInDungeon = ranchData[currentDungeonId] || {};
    
    // Style for animations (optimized for grid cells)
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      @keyframes float-idle {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
      .ranch-monster-idle {
        animation: float-idle 3s infinite ease-in-out;
      }
    `;
    container.appendChild(styleEl);

    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-2 gap-y-12 p-6 pb-12 pt-10 place-items-center w-full';

    const monsterKeys = Object.keys(monstersInDungeon);
    
    monsterKeys.forEach((mId, index) => {
      const isLegendary = mId.endsWith('_legendary');
      const baseId = isLegendary ? mId.replace('_legendary', '') : mId;
      const baseDef = MONSTERS_MAP.get(baseId);
      if (!baseDef) return;

      const mDef = isLegendary ? { ...baseDef, name: `伝説の${baseDef.name}` } : baseDef;
      const mData = monstersInDungeon[mId];
      
      const mEl = document.createElement('div');
      mEl.className = 'relative cursor-pointer transition-transform hover:scale-105 active:scale-95 group w-full flex justify-center';
      
      // Randomize animation delay to prevent sync
      const animDelay = Math.random() * -3;
      
      mEl.innerHTML = `
        <div class="relative flex flex-col items-center justify-center w-[72px] h-[72px] bg-slate-900/40 rounded-2xl border border-slate-700/50 shadow-inner group-hover:bg-slate-800/60 group-hover:border-pink-500/50 transition-colors backdrop-blur-sm">
           <div class="ranch-monster-idle relative" style="animation-delay: ${animDelay}s;">
             <img src="${mDef.image}" class="w-14 h-14 object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] ${isLegendary ? 'animate-rainbow' : ''}" onerror="this.src='assets/monsters/slime.png'">
           </div>
           <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold text-pink-300 whitespace-nowrap pointer-events-none shadow-md z-10">
             Lv.${getRanchLevelInfo(mData.fedMaterials || 0, isLegendary).level}
           </div>
           <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded-full text-[9px] font-bold ${isLegendary ? 'text-yellow-300 drop-shadow-[0_0_2px_rgba(253,224,71,0.8)]' : 'text-slate-200'} whitespace-nowrap pointer-events-none shadow-md z-10 text-center w-max">
             ${mDef.name}
           </div>
        </div>
      `;
      
      let isOpening = false;
      let touchStartY = 0;
      let touchStartX = 0;
      mEl.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });
      
      mEl.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
          if (e.cancelable) e.preventDefault();
          if (isOpening) return;
          isOpening = true;
          setTimeout(() => {
            showFeedModal(container, currentDungeonId, mId, mDef, mData, render);
            setTimeout(() => { isOpening = false; }, 300);
          }, 10);
        }
      });

      mEl.onclick = (e) => {
        if (isOpening) return;
        isOpening = true;
        showFeedModal(container, currentDungeonId, mId, mDef, mData, render);
        setTimeout(() => { isOpening = false; }, 300);
      };
      
      gridContainer.appendChild(mEl);
    });

    fieldContainer.appendChild(gridContainer);
    container.appendChild(fieldContainer);
    
    // Status Bonus Summary
    const summaryContainer = document.createElement('div');
    summaryContainer.className = 'p-1.5 shrink-0 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800 w-full flex flex-row items-center gap-2';
    
    const titleBox = document.createElement('div');
    titleBox.className = 'flex items-center gap-1 text-pink-400 shrink-0';
    titleBox.innerHTML = `
      <span class="material-symbols-outlined text-[14px]">monitoring</span>
      <span class="text-[10px] font-black text-slate-200">ボーナス合計</span>
    `;
    summaryContainer.appendChild(titleBox);

    const statsGrid = document.createElement('div');
    statsGrid.className = 'flex flex-nowrap items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar pr-2';
    
    // Calculate total bonus
    const totalBonus = await calculateTotalRanchBonus();
    
    const statConfig = {
      hp:   { label: 'HP',  color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
      mp:   { label: 'MP',  color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
      atk:  { label: 'ATK', color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
      def:  { label: 'DEF', color: 'text-green-400',   bg: 'bg-green-500/10',   border: 'border-green-500/20' },
      matk: { label: 'MAT', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
      mdef: { label: 'MDF', color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20' },
      spd:  { label: 'SPD', color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20' }
    };
    
    Object.keys(totalBonus).forEach(key => {
      const val = totalBonus[key];
      const cfg = statConfig[key];
      if (!cfg) return;
      const box = document.createElement('div');
      box.className = `flex items-baseline gap-1 px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.border}`;
      box.innerHTML = `
        <span class="text-[9px] font-bold text-slate-300">${cfg.label}</span>
        <span class="text-[10px] font-black ${cfg.color}">+${val}</span>
      `;
      statsGrid.appendChild(box);
    });
    
    summaryContainer.appendChild(statsGrid);
    container.appendChild(summaryContainer);
  };

  await render();
  return container;
}

function showNotification(container, text, type = 'info') {
  const el = document.createElement('div');
  el.className = `fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-sm font-bold shadow-lg z-[9999] animate-fade-in-up text-white flex items-center gap-2 ${
    type === 'success' ? 'bg-emerald-600 shadow-[0_0_15px_rgba(5,150,105,0.5)]' : 
    type === 'error' ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 
    'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]'
  }`;
  el.innerHTML = `
    <span class="material-symbols-outlined text-[18px]">
      ${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}
    </span>
    ${text}
  `;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%, -10px)';
    el.style.transition = 'all 0.3s';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

async function showFeedModal(container, dungeonId, monsterId, monsterDef, monsterData, onUpdate) {
  const isLegendary = monsterId.endsWith('_legendary');
  const validDrops = monsterDef.drops || [];
  
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';
  
  const modal = document.createElement('div');
  modal.className = 'bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden';
  
  const header = document.createElement('div');
  header.className = 'p-3 border-b border-slate-800 flex justify-between items-center shrink-0 bg-slate-800/50';
  header.innerHTML = `
    <h3 class="text-sm font-black text-pink-400 flex items-center gap-2 relative" id="feed-modal-img-box">
      <div class="relative w-8 h-8">
        <img src="${monsterDef.image}" class="w-full h-full object-contain drop-shadow-md ${isLegendary ? 'animate-rainbow' : ''}">
      </div>
      ${monsterDef.name}
    </h3>
    <div class="flex items-center gap-1.5">
      <button class="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800 text-pink-300 hover:bg-pink-900/50 hover:text-pink-200 transition-colors border border-slate-700/50 shadow-inner" id="btn-help-modal">
        <span class="material-symbols-outlined text-[16px]">help</span>
      </button>
      <button class="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors" id="btn-close-modal">
        <span class="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  `;
  
  const content = document.createElement('div');
  content.className = 'p-4 overflow-y-auto no-scrollbar flex-1 flex flex-col relative';

  const topSection = document.createElement('div');
  topSection.className = 'mb-4 flex flex-col items-center';
  
  // Base stats calculation helpers
  const getMonsterStats = (level) => {
    const stats = { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 };
    if (!monsterDef.stats) return stats;
    for (const key of Object.keys(stats)) {
      const originalBaseVal = monsterDef.stats[key] || 0;
      let baseVal = originalBaseVal;
      let growth = Math.max(level, Math.floor(originalBaseVal * level * 0.01));
      
      if (isLegendary) {
        if (key === 'hp') {
          baseVal *= 10;
          growth *= 10;
        } else if (key !== 'mp') {
          baseVal *= 3;
          growth *= 3;
        }
      }
      stats[key] = baseVal + growth;
    }
    return stats;
  };
  const getBonusFromStats = (monsterStats) => {
    const bonus = { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 };
    for (const key of Object.keys(bonus)) {
      const divisor = 100;
      bonus[key] = Math.max(1, Math.floor((monsterStats[key] || 0) / divisor));
    }
    return bonus;
  };

  const initialInfo = getRanchLevelInfo(monsterData.fedMaterials || 0, isLegendary);
  let currentLevel = initialInfo.level;
  
  topSection.innerHTML = `
      <!-- Stats Area Combined -->
      <div class="bg-slate-900/60 rounded-xl p-2 border border-slate-700/50 flex flex-col shadow-inner relative overflow-hidden mb-2 w-full">
        <div class="absolute inset-0 bg-blue-500/5 pointer-events-none"></div>
        <div class="relative z-10">
          <div class="flex items-center justify-between border-b border-slate-700/50 pb-1 mb-1.5">
            <div class="text-[10px] text-slate-300 font-black flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[14px] text-blue-400">bar_chart</span> ステータス & ボーナス
            </div>
            <div class="flex items-center gap-2">
               <span id="feed-modal-level" class="text-[10px] text-pink-300 font-black bg-pink-900/40 px-2 py-0.5 rounded border border-pink-500/40 shadow-[0_0_10px_rgba(236,72,153,0.2)]">Lv.${currentLevel}</span>
            </div>
          </div>
          <div id="feed-modal-monster-stats" class="grid grid-cols-4 sm:grid-cols-7 gap-1"></div>
        </div>
      </div>
      
      <!-- EXP Bar -->
      <div class="w-full bg-slate-900 rounded-full h-3 overflow-hidden relative shadow-inner border border-slate-700/50 flex items-center justify-center">
        <div id="feed-modal-bar" class="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 transition-all duration-500 ease-out" style="width: 0%">
           <div class="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
        </div>
        <span id="feed-modal-progress" class="relative z-10 text-[9px] text-white font-black tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">0 / 10</span>
      </div>
  `;
  
  const itemsContainer = document.createElement('div');
  
  content.appendChild(topSection);
  content.appendChild(itemsContainer);
  modal.appendChild(header);
  modal.appendChild(content);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const elLevel = topSection.querySelector('#feed-modal-level');
  const elBar = topSection.querySelector('#feed-modal-bar');
  const elProgress = topSection.querySelector('#feed-modal-progress');
  const elMonsterStats = topSection.querySelector('#feed-modal-monster-stats');

  const triggerLevelUpAnimation = (newLevel, oldLevel) => {
    const oldMStats = getMonsterStats(oldLevel);
    const newMStats = getMonsterStats(newLevel);
    
    // Image pop animation
    const imgEl = header.querySelector('img');
    if (imgEl) {
      imgEl.classList.add('scale-125', 'brightness-125', 'drop-shadow-[0_0_20px_rgba(236,72,153,0.8)]');
      imgEl.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      setTimeout(() => {
        imgEl.classList.remove('scale-125', 'brightness-125', 'drop-shadow-[0_0_20px_rgba(236,72,153,0.8)]');
      }, 400);
    }

    // LEVEL UP floating text
    const imgBox = header.querySelector('#feed-modal-img-box');
    if (imgBox) {
      let oldFloater = imgBox.querySelector('.level-up-floater');
      if (oldFloater) oldFloater.remove();
      
      const floater = document.createElement('div');
      floater.className = 'level-up-floater absolute -top-3 left-1/2 -translate-x-1/2 text-white font-black text-[10px] whitespace-nowrap animate-bounce drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-50 pointer-events-none tracking-widest bg-pink-600 px-2 py-0.5 rounded-full border border-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.8)]';
      floater.innerHTML = `LEVEL UP!`;
      imgBox.appendChild(floater);
      setTimeout(() => { if (floater.parentElement) floater.remove(); }, 1500);
    }
    
    // Stat floating texts and highlight
    for (const key of Object.keys(newMStats)) {
      const diff = newMStats[key] - (oldMStats[key] || 0);
      if (diff > 0) {
         const statEl = elMonsterStats.querySelector(`#stat-${key}`);
         if (statEl) {
            statEl.classList.add('bg-pink-900/50', 'border-pink-500', 'scale-110', 'z-10');
            
            const valEl = statEl.querySelector('.stat-value');
            if (valEl) valEl.classList.add('text-pink-300');

            let statFloater = statEl.querySelector('.stat-floater');
            if (!statFloater) {
               statFloater = document.createElement('div');
               statFloater.className = 'stat-floater absolute -top-2.5 -right-2 text-white font-black text-[9px] whitespace-nowrap drop-shadow-md z-50 pointer-events-none bg-emerald-500 px-1.5 py-0.5 rounded-full border border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.8)] leading-none flex items-center justify-center';
               statFloater.dataset.diff = '0';
               statEl.appendChild(statFloater);
            }
            
            const currentDiff = parseInt(statFloater.dataset.diff) + diff;
            statFloater.dataset.diff = currentDiff;
            statFloater.innerHTML = `+${currentDiff}`;
            
            // Re-trigger animation
            statFloater.style.animation = 'none';
            statFloater.offsetHeight; // force reflow
            statFloater.style.animation = 'bounce 1s ease-in-out';
            
            if (statFloater.removalTimer) clearTimeout(statFloater.removalTimer);
            statFloater.removalTimer = setTimeout(() => {
                if (statFloater.parentElement) statFloater.remove();
            }, 1200);
            
            if (statEl.highlightTimer) clearTimeout(statEl.highlightTimer);
            statEl.highlightTimer = setTimeout(() => {
                statEl.classList.remove('bg-pink-900/50', 'border-pink-500', 'scale-110', 'z-10');
                if (valEl) valEl.classList.remove('text-pink-300');
            }, 1000);
         }
      }
    }
    
    // Level badge animation
    elLevel.classList.add('scale-125', 'text-white', 'bg-pink-600', 'border-pink-300');
    setTimeout(() => elLevel.classList.remove('scale-125', 'text-white', 'bg-pink-600', 'border-pink-300'), 500);
  };

  const updateTopSection = (overrideExp = null) => {
    const expToUse = overrideExp !== null ? overrideExp : (monsterData.fedMaterials || 0);
    const { level, currentLevelFed, nextLevelRequired } = getRanchLevelInfo(expToUse, isLegendary);
    
    const mStats = getMonsterStats(level);
    const bStats = getBonusFromStats(mStats);
    
    const labels = { hp: 'HP', mp: 'MP', atk: 'ATK', def: 'DEF', matk: 'MAT', mdef: 'MDF', spd: 'SPD' };
    const colors = { hp: 'text-red-400', mp: 'text-blue-400', atk: 'text-orange-400', def: 'text-green-400', matk: 'text-fuchsia-400', mdef: 'text-indigo-400', spd: 'text-yellow-400' };
    
    if (elMonsterStats.children.length === 0) {
      elMonsterStats.innerHTML = Object.keys(mStats).map(k => `
        <div id="stat-${k}" class="flex flex-col items-center justify-center bg-slate-800/60 rounded py-1 border border-slate-700/50 relative transition-all duration-300">
          <span class="${colors[k]} font-bold text-[8px] leading-none mb-0.5">${labels[k]}</span>
          <div class="flex items-baseline gap-0.5">
            <span class="stat-value text-slate-100 font-black text-[11px] leading-none">${mStats[k]}</span>
            <span class="stat-bonus text-pink-400 font-bold text-[8px] leading-none">(+${bStats[k]})</span>
          </div>
        </div>
      `).join('');
    } else {
      Object.keys(mStats).forEach(k => {
        const statEl = elMonsterStats.querySelector(`#stat-${k}`);
        if (statEl) {
          const valEl = statEl.querySelector('.stat-value');
          const bonusEl = statEl.querySelector('.stat-bonus');
          if (valEl) valEl.textContent = mStats[k];
          if (bonusEl) bonusEl.textContent = `(+${bStats[k]})`;
        }
      });
    }

    if (level > currentLevel) {
       triggerLevelUpAnimation(level, currentLevel);
    }
    currentLevel = level;
    
    elLevel.textContent = `Lv.${level}`;
    const pct = (currentLevelFed / nextLevelRequired) * 100;
    elBar.style.width = `${pct}%`;
    elProgress.textContent = `${currentLevelFed} / ${nextLevelRequired}`;
  };
  
  let needsUpdate = false;

  const balloonPool = [];
  function getBalloon(expText, parentDiv) {
    let el = balloonPool.pop();
    if (!el) {
      el = document.createElement('div');
      el.className = 'absolute top-full left-4 text-white font-black text-[10px] whitespace-nowrap shadow-lg z-[60] pointer-events-none tracking-widest bg-gradient-to-r from-pink-600 to-rose-500 px-2 py-0.5 rounded-full border border-pink-400/50';
      el.style.willChange = 'transform, opacity';
      if (parentDiv) parentDiv.appendChild(el);
    }
    el.style.visibility = 'visible';
    el.innerHTML = `+${expText} EXP`;
    return el;
  }
  
  const flyImgPool = [];
  function getFlyImg(src, parentDiv) {
    let el = flyImgPool.pop();
    if (!el) {
      el = document.createElement('img');
      el.className = 'absolute z-10 pointer-events-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]';
      el.style.width = '28px';
      el.style.height = '28px';
      el.style.objectFit = 'contain';
      el.style.willChange = 'transform, opacity';
      if (parentDiv) parentDiv.appendChild(el);
    }
    el.style.visibility = 'visible';
    el.src = src;
    return el;
  }

  const renderItems = async () => {
    const list = document.createElement('div');
    list.className = 'space-y-2';
    
    if (validDrops.length === 0) {
      list.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">与えられる素材がありません。</p>`;
    } else {
      for (let i = 0; i < validDrops.length; i++) {
        const drop = validDrops[i];
        const expMultiplier = Math.pow(2, i);
        const mat = MATERIALS_MAP.get(drop.itemId);
        if (!mat) continue;
        
        const invItem = await GameDB.getInventoryItem(drop.itemId);
        const quantity = invItem ? invItem.quantity : 0;
        
        const itemRow = document.createElement('div');
        itemRow.className = 'bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600/50 rounded-xl p-3 transition-colors';
        
        const maxFeed = quantity;
        
        itemRow.innerHTML = `
          <div class="flex flex-col sm:flex-row items-center gap-2 w-full">
            <div class="flex items-center gap-2 min-w-0 flex-1 w-full sm:w-auto">
              <div class="w-8 h-8 bg-slate-900/80 rounded border border-slate-700 flex items-center justify-center p-1 relative shadow-inner shrink-0">
                <img src="${mat.image}" class="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-[10px] font-black text-slate-100 truncate flex items-center gap-1">
                  ${mat.name}
                  <span class="text-[8px] bg-pink-900/50 text-pink-300 px-1 py-0.5 rounded border border-pink-700/50">${expMultiplier} EXP</span>
                </div>
                <div class="text-[9px] font-bold text-slate-400">所持: <span class="${quantity > 0 ? 'text-green-400' : 'text-slate-500'}">${quantity}</span></div>
              </div>
            </div>
            
            <div class="flex items-center gap-1 shrink-0 w-full sm:w-auto justify-end">
              <div class="flex items-center bg-slate-900/60 rounded border border-slate-700 p-0.5 shadow-inner">
                <button class="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 rounded text-[8px] font-bold text-slate-300 btn-min" ${maxFeed === 0 ? 'disabled' : ''}>MIN</button>
                <button class="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 rounded text-[10px] font-bold text-slate-300 btn-minus-100" ${maxFeed === 0 ? 'disabled' : ''}>-</button>
                <input type="number" min="0" max="${maxFeed}" value="${maxFeed > 0 ? 1 : 0}" ${maxFeed === 0 ? 'disabled' : ''} class="w-10 h-7 bg-transparent text-center text-[10px] font-black text-white outline-none quantity-input appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
                <button class="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 rounded text-[10px] font-bold text-slate-300 btn-plus-100" ${maxFeed === 0 ? 'disabled' : ''}>+</button>
                <button class="w-7 h-7 flex items-center justify-center bg-pink-900/30 hover:bg-pink-800/50 text-pink-400 border border-pink-700/50 active:scale-95 rounded text-[8px] font-black btn-max" ${maxFeed === 0 ? 'disabled' : ''}>MAX</button>
              </div>
              <button class="px-3 h-8 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 rounded text-[10px] font-black text-white transition-all active:scale-95 btn-feed flex items-center justify-center shadow-md" ${maxFeed === 0 ? 'disabled' : ''}>
                与える
              </button>
            </div>
          </div>
        `;
        
        const input = itemRow.querySelector('.quantity-input');
        const btnMin = itemRow.querySelector('.btn-min');
        const btnMinus100 = itemRow.querySelector('.btn-minus-100');
        const btnPlus100 = itemRow.querySelector('.btn-plus-100');
        const btnMax = itemRow.querySelector('.btn-max');
        const btnFeed = itemRow.querySelector('.btn-feed');
        
        if (maxFeed > 0) {
          input.onchange = () => {
            let val = parseInt(input.value) || 0;
            if (val < 0) val = 0;
            if (val > maxFeed) val = maxFeed;
            input.value = val;
          };
          
          btnMin.onclick = () => { input.value = 1; input.onchange(); };
          btnMinus100.onclick = () => { input.value = Math.max(1, (parseInt(input.value) || 0) - 100); input.onchange(); };
          btnPlus100.onclick = () => { input.value = Math.min(maxFeed, (parseInt(input.value) || 0) + 100); input.onchange(); };
          btnMax.onclick = () => { input.value = maxFeed; input.onchange(); };
          
          btnFeed.onclick = async () => {
            const amount = parseInt(input.value) || 0;
            if (amount <= 0 || amount > maxFeed) return;
            
            btnFeed.disabled = true;
            
            // Consume items
            invItem.quantity -= amount;
            if (invItem.quantity <= 0) {
              await GameDB.deleteInventoryItem(invItem.id);
            } else {
              await GameDB.putInventoryItem(invItem);
            }
            
            const oldLevel = currentLevel;
            const oldMStats = getMonsterStats(oldLevel);
            
            const expGain = amount * expMultiplier;
            const oldExp = monsterData.fedMaterials || 0;
            
            // Add to fed materials
            monsterData.fedMaterials = oldExp + expGain;
            
            // Save ranch data
            let ranchData = await GameDB.getGameState('ranch_data');
            ranchData[dungeonId][monsterId] = monsterData;
            await GameDB.setGameState('ranch_data', ranchData);
            
            needsUpdate = true;
            
            const startImg = itemRow.querySelector('img');
            const targetImg = header.querySelector('img');
            const startRect = startImg ? startImg.getBoundingClientRect() : null;
            const endRect = targetImg ? targetImg.getBoundingClientRect() : null;
            
            const animCount = Math.min(30, Math.max(1, amount));
            const spreadTime = Math.min(800, animCount * 20);
            
            if (startRect && endRect) {
              const contentDiv = topSection.parentElement;
              const contentRect = contentDiv.getBoundingClientRect();
              const imgBoxContainer = header.querySelector('#feed-modal-img-box');

              for (let j = 0; j < animCount; j++) {
                const delay = Math.random() * spreadTime;
                
                const flyImg = getFlyImg(mat.image, contentDiv);
                flyImg.style.opacity = '0';
                
                const startX = startRect.left - contentRect.left + contentDiv.scrollLeft + startRect.width / 2 - 14 + (Math.random() - 0.5) * 30;
                const startY = startRect.top - contentRect.top + contentDiv.scrollTop + startRect.height / 2 - 14 + (Math.random() - 0.5) * 30;
                const endX = endRect.left - contentRect.left + contentDiv.scrollLeft + endRect.width / 2 - 14 + (Math.random() - 0.5) * 40;
                const endY = endRect.top - contentRect.top + contentDiv.scrollTop + endRect.height / 2 - 14 + (Math.random() * 20);
                
                // Position & Scale animation
                const flyAnim = flyImg.animate([
                  { transform: `translate(${startX}px, ${startY}px) scale(0.5)` },
                  { transform: `translate(${endX}px, ${endY}px) scale(1) rotate(${(Math.random() - 0.5) * 360}deg)`, offset: 0.8 },
                  { transform: `translate(${endX}px, ${endY}px) scale(1.5) rotate(${(Math.random() - 0.5) * 360}deg)` }
                ], {
                  duration: 700,
                  delay: delay,
                  easing: 'ease-out',
                  fill: 'both'
                });

                // Opacity animation
                flyImg.animate([
                  { opacity: 0, offset: 0 },
                  { opacity: 1, offset: 0.1 },
                  { opacity: 1, offset: 0.8 },
                  { opacity: 0, offset: 1 }
                ], {
                  duration: 700,
                  delay: delay,
                  fill: 'both'
                });
                
                flyAnim.onfinish = () => {
                  flyImg.style.visibility = 'hidden';
                  flyImgPool.push(flyImg);
                };
              }
              
              // Spawn single total EXP balloon
              setTimeout(() => {
                const imgBoxContainer = header.querySelector('#feed-modal-img-box');
                if (!imgBoxContainer) return;
                
                const expPopup = getBalloon(expGain, imgBoxContainer);
                expPopup.style.opacity = '0';
                
                const popAnim = expPopup.animate([
                  { transform: `translate(-50%, -5px) scale(0.5)`, opacity: 0 },
                  { transform: `translate(-50%, 15px) scale(1.1)`, opacity: 1, offset: 0.2 },
                  { transform: `translate(-50%, 35px) scale(1)`, opacity: 1, offset: 0.8 },
                  { transform: `translate(-50%, 45px) scale(0.8)`, opacity: 0 }
                ], {
                  duration: 1500,
                  easing: 'ease-out',
                  fill: 'both'
                });
                
                popAnim.onfinish = () => {
                  expPopup.style.visibility = 'hidden';
                  balloonPool.push(expPopup);
                };
              }, spreadTime + 400);

              // Add small pop animation to monster image at the end
              setTimeout(() => {
                  const mImg = header.querySelector('img');
                  if (mImg) {
                     mImg.style.transition = 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                     mImg.style.transform = 'scale(1.15) translateY(-5px)';
                     mImg.style.filter = 'brightness(1.3)';
                     setTimeout(() => {
                        mImg.style.transform = '';
                        mImg.style.filter = '';
                     }, 200);
                  }
              }, spreadTime + 400);
            }
            
            needsUpdate = true;
            await renderItems();
            
            const targetExp = monsterData.fedMaterials;
            const startExp = oldExp;
            const duration = (startRect && endRect) ? (spreadTime + 400) : 0;
            
            if (duration > 0) {
              const startTime = performance.now();
              elBar.style.transition = 'none';
              
              const animateBar = (time) => {
                 const elapsed = time - startTime;
                 let progress = elapsed / duration;
                 if (progress > 1) progress = 1;
                 
                 const ease = 1 - Math.pow(1 - progress, 3);
                 const currentVisExp = Math.floor(startExp + (targetExp - startExp) * ease);
                 
                 updateTopSection(currentVisExp);
                 
                 if (progress < 1) {
                    requestAnimationFrame(animateBar);
                 } else {
                    elBar.style.transition = 'all 0.5s ease-out';
                    updateTopSection(targetExp);
                 }
              };
              requestAnimationFrame(animateBar);
            } else {
              updateTopSection(targetExp);
            }
          };
        }
        list.appendChild(itemRow);
      }
    }
    itemsContainer.innerHTML = `
      <div class="flex items-center gap-2 mb-3 mt-2 px-1">
        <span class="material-symbols-outlined text-pink-400 text-[18px]">restaurant</span>
        <h4 class="text-sm font-black text-slate-200">好物（ドロップ素材）</h4>
      </div>
    `;
    itemsContainer.appendChild(list);
  };
  
  updateTopSection();
  await renderItems();
  
  const closeModal = () => {
    overlay.classList.replace('animate-fade-in', 'animate-fade-out');
    setTimeout(() => {
      overlay.remove();
      if (needsUpdate && onUpdate) onUpdate();
    }, 200);
  };

  header.querySelector('#btn-close-modal').onclick = closeModal;
  
  header.querySelector('#btn-help-modal').onclick = () => {
    const helpOverlay = document.createElement('div');
    helpOverlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[100] animate-fade-in p-4 backdrop-blur-sm';
    
    const helpModal = document.createElement('div');
    helpModal.className = 'bg-slate-900 border border-pink-500/30 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden';
    
    helpModal.innerHTML = `
      <div class="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
        <h3 class="text-md font-black text-pink-400 flex items-center gap-2">
          <span class="material-symbols-outlined text-[20px]">help</span>
          育成のヒント
        </h3>
        <button class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors btn-close-help">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="p-4 space-y-4 text-sm text-slate-300">
        <div>
          <h4 class="font-bold text-pink-300 mb-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">trending_up</span> 成長について
          </h4>
          <p class="text-xs leading-relaxed text-slate-400">
            モンスターに「好物」である素材を与えると成長度が上がります。成長度が最大になるとレベルアップし、ステータスが上昇します。
          </p>
        </div>
        <div>
          <h4 class="font-bold text-pink-300 mb-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">group_add</span> ボーナスについて
          </h4>
          <p class="text-xs leading-relaxed text-slate-400">
            パーティ編成時、牧場で育てた全モンスターからパーティ全体にボーナスが加算されます。<br>
            <span class="text-pink-200 font-bold">【基本恩恵】</span>各ステータスの <span class="text-white font-bold">1%</span>（最低保証+1）<br>
            <span class="text-pink-200 font-bold">【レベル恩恵】</span>レベルが上がった分（Lv-1）だけ、SPD以外に <span class="text-white font-bold">+1</span> ずつ追加<br>
            色々なモンスターを育てて冒険を有利に進めましょう！
          </p>
        </div>
      </div>
    `;
    
    helpOverlay.appendChild(helpModal);
    document.body.appendChild(helpOverlay);
    
    const closeHelp = () => {
      helpOverlay.classList.replace('animate-fade-in', 'animate-fade-out');
      setTimeout(() => helpOverlay.remove(), 200);
    };
    
    helpModal.querySelector('.btn-close-help').onclick = closeHelp;
    helpOverlay.onclick = (e) => {
      if (e.target === helpOverlay) closeHelp();
    };
  };
  
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  };
}
