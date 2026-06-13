import { GameDB } from '../../data/database.js';
import { DUNGEONS } from '../../definitions/dungeons.js';
import { MONSTERS } from '../../definitions/monsters.js';
import { MATERIALS } from '../../definitions/materials.js';
import { getRanchLevelInfo, calculateTotalRanchBonus } from '../../data/stat-calculator.js';

const MATERIALS_MAP = new Map(MATERIALS.map(m => [m.id, m]));
const MONSTERS_MAP = new Map(MONSTERS.map(m => [m.id, m]));

export async function renderRanchTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full bg-[#0b0b19] overflow-y-auto no-scrollbar pb-20 relative';

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
        const dDef = DUNGEONS.find(d => d.id === dId);
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
    fieldContainer.className = 'relative flex-1 min-h-[300px] border-b border-slate-800 overflow-hidden';
    
    const dDef = DUNGEONS.find(d => d.id === currentDungeonId);
    if (dDef && dDef.bgImage) {
      fieldContainer.style.backgroundImage = `linear-gradient(rgba(11, 11, 25, 0.4), rgba(11, 11, 25, 0.8)), url('${dDef.bgImage}')`;
      fieldContainer.style.backgroundSize = 'cover';
      fieldContainer.style.backgroundPosition = 'center';
    }

    const monstersInDungeon = ranchData[currentDungeonId] || {};
    
    // Style for animations
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      @keyframes wander {
        0% { transform: translate(0, 0); }
        25% { transform: translate(30px, -10px); }
        49% { transform: translate(60px, 0); }
        50% { transform: translate(60px, 0); }
        75% { transform: translate(30px, -10px); }
        99% { transform: translate(0, 0); }
        100% { transform: translate(0, 0); }
      }
      @keyframes wander-flip {
        0%, 49% { transform: scaleX(1); }
        50%, 99% { transform: scaleX(-1); }
        100% { transform: scaleX(1); }
      }
      .ranch-monster {
        animation: wander 8s infinite ease-in-out;
      }
      .ranch-monster-img {
        animation: wander-flip 8s infinite;
      }
    `;
    container.appendChild(styleEl);

    Object.keys(monstersInDungeon).forEach((mId, index) => {
      const mDef = MONSTERS_MAP.get(mId);
      if (!mDef) return;

      const mData = monstersInDungeon[mId];
      
      const mEl = document.createElement('div');
      mEl.className = 'absolute cursor-pointer transition-transform hover:scale-110 active:scale-95 group';
      
      // Random initial position
      const left = 10 + Math.random() * 70;
      const top = 20 + Math.random() * 60;
      mEl.style.left = `${left}%`;
      mEl.style.top = `${top}%`;
      
      // Randomize animation delay to prevent sync
      const animDelay = Math.random() * -8;
      
      mEl.innerHTML = `
        <div class="ranch-monster relative" style="animation-delay: ${animDelay}s;">
           <img src="${mDef.image}" class="ranch-monster-img w-16 h-16 object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]" style="animation-delay: ${animDelay}s;" onerror="this.src='assets/monsters/slime.png'">
           <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold text-pink-300 whitespace-nowrap pointer-events-none shadow-md z-10">
             Lv.${getRanchLevelInfo(mData.fedMaterials || 0).level}
           </div>
        </div>
      `;
      
      mEl.onclick = () => {
        showFeedModal(container, currentDungeonId, mId, mDef, mData, render);
      };
      
      fieldContainer.appendChild(mEl);
    });

    container.appendChild(fieldContainer);
    
    // Status Bonus Summary
    const summaryContainer = document.createElement('div');
    summaryContainer.className = 'p-3 shrink-0 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800 w-full';
    
    const titleBox = document.createElement('div');
    titleBox.className = 'flex items-center gap-1 text-pink-400 mb-2.5';
    titleBox.innerHTML = `
      <span class="material-symbols-outlined text-[16px]">monitoring</span>
      <span class="text-xs font-black text-slate-200">現在のボーナス合計</span>
    `;
    summaryContainer.appendChild(titleBox);

    const statsGrid = document.createElement('div');
    statsGrid.className = 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2';
    
    // Calculate total bonus
    const totalBonus = await calculateTotalRanchBonus();
    
    const statConfig = {
      hp:   { label: 'HP',  icon: 'favorite',      color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
      mp:   { label: 'MP',  icon: 'water_drop',    color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
      atk:  { label: 'ATK', icon: 'swords',        color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
      def:  { label: 'DEF', icon: 'shield',        color: 'text-green-400',   bg: 'bg-green-500/10',   border: 'border-green-500/20' },
      matk: { label: 'MAT', icon: 'auto_fix_high', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
      mdef: { label: 'MDF', icon: 'gpp_good',      color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20' },
      spd:  { label: 'SPD', icon: 'speed',         color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20' }
    };
    
    Object.keys(totalBonus).forEach(key => {
      const val = totalBonus[key];
      const cfg = statConfig[key];
      if (!cfg) return;
      const box = document.createElement('div');
      box.className = `flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border ${cfg.bg} ${cfg.border} shadow-sm`;
      box.innerHTML = `
        <span class="material-symbols-outlined text-[14px] ${cfg.color}">${cfg.icon}</span>
        <span class="text-[11px] font-bold text-slate-300">${cfg.label}</span>
        <span class="text-[12px] font-black ${cfg.color} drop-shadow-md ml-0.5">+${val}</span>
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
  const validDrops = monsterDef.drops || [];
  
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';
  
  const modal = document.createElement('div');
  modal.className = 'bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden';
  
  const header = document.createElement('div');
  header.className = 'p-4 border-b border-slate-800 flex justify-between items-center shrink-0';
  header.innerHTML = `
    <h3 class="text-lg font-black text-pink-400 flex items-center gap-2">
      <img src="${monsterDef.image}" class="w-8 h-8 object-contain">
      ${monsterDef.name} にエサをあげる
    </h3>
    <div class="flex items-center gap-2">
      <button class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-pink-300 hover:bg-pink-900/50 hover:text-pink-200 transition-colors border border-slate-700/50 shadow-inner" id="btn-help-modal">
        <span class="material-symbols-outlined text-[18px]">help</span>
      </button>
      <button class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors" id="btn-close-modal">
        <span class="material-symbols-outlined">close</span>
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
      const baseVal = monsterDef.stats[key] || 0;
      const growth = Math.max(level, Math.floor(baseVal * level * 0.01));
      stats[key] = baseVal + growth;
    }
    return stats;
  };
  const getBonusFromStats = (monsterStats) => {
    const bonus = { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 };
    for (const key of Object.keys(bonus)) {
      bonus[key] = Math.max(1, Math.floor((monsterStats[key] || 0) / 10));
    }
    return bonus;
  };

  const initialInfo = getRanchLevelInfo(monsterData.fedMaterials || 0);
  let currentLevel = initialInfo.level;
  
  topSection.innerHTML = `
      <div class="flex items-stretch gap-2 mb-3">
        <!-- Left Column: Image & Level -->
        <div id="feed-modal-img-box" class="w-24 shrink-0 flex flex-col items-center justify-center bg-slate-900/60 rounded-xl border border-slate-700/50 py-3 relative shadow-inner">
          <div class="absolute inset-0 bg-pink-500/10 blur-xl rounded-full"></div>
          <div class="relative w-16 h-16 mb-2 z-10">
            <img src="${monsterDef.image}" class="w-full h-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] animate-bounce" style="animation-duration: 3s;">
          </div>
          <span id="feed-modal-level" class="relative z-10 inline-block text-[11px] text-pink-300 font-black bg-slate-950 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.3)] border border-pink-500/30">Lv.${currentLevel}</span>
        </div>
        
        <!-- Right Column: Stats Panels Side by Side -->
        <div class="flex-1 flex gap-1.5 min-w-0">
          <!-- Left Panel: Monster Stats -->
          <div class="flex-1 bg-slate-900/60 rounded-xl p-1.5 border border-slate-700/50 flex flex-col shadow-inner">
            <div class="text-[9px] text-slate-400 font-bold text-center mb-1 border-b border-slate-700/50 pb-0.5 tracking-wider">ステータス</div>
            <div id="feed-modal-monster-stats" class="flex flex-col gap-y-[3px] flex-1"></div>
          </div>
          <!-- Right Panel: Bonus Stats -->
          <div class="flex-1 bg-slate-900/60 rounded-xl p-1.5 border border-pink-900/30 flex flex-col shadow-inner relative overflow-hidden">
            <div class="absolute inset-0 bg-pink-500/5 pointer-events-none"></div>
            <div class="relative z-10 flex flex-col h-full">
              <div class="text-[9px] text-pink-400 font-bold text-center mb-1 border-b border-pink-900/50 pb-0.5 tracking-wider">ボーナス</div>
              <div id="feed-modal-bonus-stats" class="flex flex-col gap-y-[3px] flex-1"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="w-full bg-slate-900 rounded-full h-2.5 mb-1 overflow-hidden relative shadow-inner border border-slate-800">
        <div id="feed-modal-bar" class="bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 h-full rounded-full transition-all duration-500 ease-out relative" style="width: 0%">
           <div class="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
        </div>
      </div>
      <div class="w-full flex justify-between text-[10px] text-slate-400 font-bold px-1">
        <span>成長まで</span>
        <span id="feed-modal-progress" class="text-slate-300 font-black">0 / 10</span>
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
  const elBonusStats = topSection.querySelector('#feed-modal-bonus-stats');

  const updateTopSection = () => {
    const { level, currentLevelFed, nextLevelRequired } = getRanchLevelInfo(monsterData.fedMaterials || 0);
    currentLevel = level;
    
    elLevel.textContent = `Lv.${level}`;
    const pct = (currentLevelFed / nextLevelRequired) * 100;
    elBar.style.width = `${pct}%`;
    elProgress.textContent = `${currentLevelFed} / ${nextLevelRequired}`;
    
    const mStats = getMonsterStats(level);
    const bStats = getBonusFromStats(mStats);
    
    const labels = { hp: 'HP', mp: 'MP', atk: 'ATK', def: 'DEF', matk: 'MAT', mdef: 'MDF', spd: 'SPD' };
    const colors = { hp: 'text-red-400', mp: 'text-blue-400', atk: 'text-orange-400', def: 'text-green-400', matk: 'text-fuchsia-400', mdef: 'text-indigo-400', spd: 'text-yellow-400' };
    
    elMonsterStats.innerHTML = Object.keys(mStats).map(k => `
      <div id="stat-${k}" class="flex items-center justify-between bg-slate-800/40 px-1 py-0.5 rounded text-[9px] relative transition-all duration-300">
        <span class="${colors[k]} font-bold">${labels[k]}</span>
        <span class="stat-value text-slate-200 font-black">${mStats[k]}</span>
      </div>
    `).join('');

    elBonusStats.innerHTML = Object.keys(bStats).map(k => `
      <div class="flex items-center justify-between bg-slate-800/40 px-1 py-0.5 rounded text-[9px]">
        <span class="${colors[k]} font-bold">${labels[k]}</span>
        <span class="text-pink-300 font-black">+${bStats[k]}</span>
      </div>
    `).join('');
  };
  
  let needsUpdate = false;

  const renderItems = async () => {
    const list = document.createElement('div');
    list.className = 'space-y-2';
    
    if (validDrops.length === 0) {
      list.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">与えられる素材がありません。</p>`;
    } else {
      for (const drop of validDrops) {
        const mat = MATERIALS_MAP.get(drop.itemId);
        if (!mat) continue;
        
        const invItem = await GameDB.getInventoryItem(drop.itemId);
        const quantity = invItem ? invItem.quantity : 0;
        
        const itemRow = document.createElement('div');
        itemRow.className = 'bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600/50 rounded-xl p-3 transition-colors';
        
        const maxFeed = quantity;
        
        itemRow.innerHTML = `
          <div class="flex flex-col gap-2.5 w-full">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="w-10 h-10 bg-slate-900/80 rounded-lg border border-slate-700 flex items-center justify-center p-1 relative shadow-inner shrink-0">
                  <img src="${mat.image}" class="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-black text-slate-100 mb-0.5 truncate">${mat.name}</div>
                  <div class="text-[10px] font-bold text-slate-400">所持: <span class="${quantity > 0 ? 'text-green-400' : 'text-slate-500'}">${quantity}</span> 個</div>
                </div>
              </div>
              <button class="shrink-0 px-4 py-2 h-10 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 rounded-lg text-[11px] font-black text-white transition-all active:scale-95 btn-feed shadow-[0_0_15px_rgba(219,39,119,0.2)] flex items-center justify-center gap-1" ${maxFeed === 0 ? 'disabled' : ''}>
                <span class="material-symbols-outlined text-[14px]">favorite</span> 与える
              </button>
            </div>
            
            <div class="flex items-center gap-1 bg-slate-900/60 rounded-lg border border-slate-700 p-0.5 shadow-inner w-full justify-between">
              <button class="flex-1 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 rounded text-[10px] font-bold text-slate-300 transition-all btn-min" ${maxFeed === 0 ? 'disabled' : ''}>MIN</button>
              <button class="flex-1 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 rounded text-[10px] font-bold text-slate-300 transition-all btn-minus-100" ${maxFeed === 0 ? 'disabled' : ''}>-100</button>
              <input type="number" min="0" max="${maxFeed}" value="${maxFeed > 0 ? 1 : 0}" ${maxFeed === 0 ? 'disabled' : ''} class="w-14 shrink-0 h-8 bg-transparent text-center text-sm font-black text-white outline-none quantity-input appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
              <button class="flex-1 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 rounded text-[10px] font-bold text-slate-300 transition-all btn-plus-100" ${maxFeed === 0 ? 'disabled' : ''}>+100</button>
              <button class="flex-1 h-8 flex items-center justify-center bg-pink-900/30 hover:bg-pink-800/50 text-pink-400 border border-pink-700/50 active:scale-95 rounded text-[10px] font-black transition-all btn-max" ${maxFeed === 0 ? 'disabled' : ''}>MAX</button>
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
            
            // Add to fed materials
            monsterData.fedMaterials = (monsterData.fedMaterials || 0) + amount;
            
            // Save ranch data
            let ranchData = await GameDB.getGameState('ranch_data');
            ranchData[dungeonId][monsterId] = monsterData;
            await GameDB.setGameState('ranch_data', ranchData);
            
            // Refresh underlying field
            needsUpdate = true;
            
            // Update modal UI smoothly
            updateTopSection();
            await renderItems();
            
            // Check level up & show animation
            const newLevelInfo = getRanchLevelInfo(monsterData.fedMaterials);
            if (newLevelInfo.level > oldLevel) {
               const newMStats = getMonsterStats(newLevelInfo.level);
               
               // Image pop animation
               const imgEl = topSection.querySelector('img');
               if (imgEl) {
                 imgEl.classList.add('scale-125', 'brightness-125', 'drop-shadow-[0_0_20px_rgba(236,72,153,0.8)]');
                 imgEl.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                 setTimeout(() => {
                   imgEl.classList.remove('scale-125', 'brightness-125', 'drop-shadow-[0_0_20px_rgba(236,72,153,0.8)]');
                 }, 400);
               }

               // LEVEL UP floating text
               const imgBox = topSection.querySelector('#feed-modal-img-box');
               if (imgBox) {
                 const floater = document.createElement('div');
                 floater.className = 'absolute -top-3 left-1/2 -translate-x-1/2 text-white font-black text-[10px] whitespace-nowrap animate-bounce drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-50 pointer-events-none tracking-widest bg-pink-600 px-2 py-0.5 rounded-full border border-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.8)]';
                 floater.innerHTML = `LEVEL UP!`;
                 imgBox.appendChild(floater);
                 setTimeout(() => floater.remove(), 1500);
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

                       const statFloater = document.createElement('div');
                       statFloater.className = 'absolute -top-2.5 -right-2 text-white font-black text-[9px] whitespace-nowrap animate-bounce drop-shadow-md z-50 pointer-events-none bg-emerald-500 px-1.5 py-0.5 rounded-full border border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.8)] leading-none flex items-center justify-center';
                       statFloater.innerHTML = `+${diff}`;
                       statEl.appendChild(statFloater);
                       
                       setTimeout(() => {
                           statEl.classList.remove('bg-pink-900/50', 'border-pink-500', 'scale-110', 'z-10');
                           if (valEl) valEl.classList.remove('text-pink-300');
                       }, 1000);
                       setTimeout(() => statFloater.remove(), 1200);
                    }
                 }
               }
               
               // Level badge animation
               elLevel.classList.add('scale-125', 'text-white', 'bg-pink-600', 'border-pink-300');
               setTimeout(() => elLevel.classList.remove('scale-125', 'text-white', 'bg-pink-600', 'border-pink-300'), 500);
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
            パーティ編成時、牧場で育てた全モンスターのステータスの <span class="text-white font-bold">10%</span> がパーティ全体のボーナスとして加算されます。<br>色々なモンスターを育てて冒険を有利に進めましょう！
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
