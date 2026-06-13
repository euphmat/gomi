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
      <h2 class="text-xl font-black text-pink-400 flex items-center gap-2 mb-2">
        <span class="material-symbols-outlined">pets</span>モンスター牧場
      </h2>
      <p class="text-xs text-slate-400 mb-4 leading-relaxed">
        ダンジョンで仲間にしたモンスターがここで過ごしています。<br>
        好物（ドロップ素材）を与えるごとに成長し、パーティ全員に恩恵をもたらします！
      </p>
    `;

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
    <button class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors" id="btn-close-modal">
      <span class="material-symbols-outlined">close</span>
    </button>
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
      <div class="relative w-24 h-24 mb-2">
        <img src="${monsterDef.image}" class="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(236,72,153,0.4)] animate-bounce">
      </div>
      <div class="text-center mb-2">
        <span id="feed-modal-level" class="inline-block text-xs text-slate-400 font-bold bg-slate-800 px-3 py-1 rounded-full transition-all duration-300 shadow-sm border border-slate-700">Lv.${currentLevel}</span>
      </div>
      
      <!-- Current Stats Box -->
      <div class="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-2 mb-3 shadow-inner flex flex-col gap-2">
        <div>
          <div class="text-[9px] text-slate-400 font-bold text-center mb-1">モンスターのステータス</div>
          <div id="feed-modal-monster-stats" class="flex flex-wrap justify-center gap-1"></div>
        </div>
        <div class="border-t border-slate-700/50 pt-1">
          <div class="text-[9px] text-pink-400 font-bold text-center mb-1">パーティ恩恵ボーナス (10%)</div>
          <div id="feed-modal-bonus-stats" class="flex flex-wrap justify-center gap-1"></div>
        </div>
      </div>
      
      <div class="w-full mt-1 bg-slate-800 rounded-full h-2.5 mb-1 overflow-hidden relative shadow-inner">
        <div id="feed-modal-bar" class="bg-gradient-to-r from-pink-500 to-rose-500 h-2.5 rounded-full transition-all duration-500 ease-out" style="width: 0%"></div>
      </div>
      <div class="w-full flex justify-between text-[10px] text-slate-400 font-bold">
        <span>成長まで</span>
        <span id="feed-modal-progress">0 / 10</span>
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
      <div class="flex items-center gap-1 bg-slate-900/60 border border-slate-700/50 px-1.5 py-0.5 rounded text-[9px] shadow-sm">
        <span class="${colors[k]} font-bold">${labels[k]}</span>
        <span class="text-slate-200 font-black">${mStats[k]}</span>
      </div>
    `).join('');

    elBonusStats.innerHTML = Object.keys(bStats).map(k => `
      <div class="flex items-center gap-1 bg-slate-900/60 border border-slate-700/50 px-1.5 py-0.5 rounded text-[9px] shadow-sm">
        <span class="${colors[k]} font-bold">${labels[k]}</span>
        <span class="text-slate-200 font-black">+${bStats[k]}</span>
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
        itemRow.className = 'bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between';
        
        const maxFeed = quantity;
        
        itemRow.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center p-1 relative shadow-inner">
              <img src="${mat.image}" class="w-full h-full object-contain">
            </div>
            <div>
              <div class="text-sm font-bold text-white">${mat.name}</div>
              <div class="text-[10px] text-slate-400">所持: <span class="${quantity > 0 ? 'text-green-400 font-bold' : 'text-slate-500'}">${quantity}</span> 個</div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1">
            <div class="flex items-center gap-1 bg-slate-900 rounded-lg border border-slate-700 p-0.5">
              <input type="number" min="0" max="${maxFeed}" value="${maxFeed > 0 ? 1 : 0}" ${maxFeed === 0 ? 'disabled' : ''} class="w-14 bg-transparent text-center text-sm font-bold text-white outline-none quantity-input">
              <button class="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold text-white transition-colors btn-max" ${maxFeed === 0 ? 'disabled' : ''}>MAX</button>
            </div>
            <button class="px-4 py-1.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:bg-slate-700 rounded-lg text-xs font-bold text-white transition-all active:scale-95 btn-feed shadow-md" ${maxFeed === 0 ? 'disabled' : ''}>与える</button>
          </div>
        `;
        
        const input = itemRow.querySelector('.quantity-input');
        const btnMax = itemRow.querySelector('.btn-max');
        const btnFeed = itemRow.querySelector('.btn-feed');
        
        if (maxFeed > 0) {
          input.onchange = () => {
            let val = parseInt(input.value) || 0;
            if (val < 0) val = 0;
            if (val > maxFeed) val = maxFeed;
            input.value = val;
          };
          
          btnMax.onclick = () => {
            input.value = maxFeed;
          };
          
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
            
            // Check level up & show notification
            const newLevelInfo = getRanchLevelInfo(monsterData.fedMaterials);
            if (newLevelInfo.level > oldLevel) {
               const newMStats = getMonsterStats(newLevelInfo.level);
               let diffTexts = [];
               const labels = { hp: 'HP', mp: 'MP', atk: 'ATK', def: 'DEF', matk: 'MAT', mdef: 'MDF', spd: 'SPD' };
               for (const key of Object.keys(newMStats)) {
                 if (newMStats[key] > (oldMStats[key] || 0)) {
                    diffTexts.push(`${labels[key]} +${newMStats[key] - (oldMStats[key] || 0)}`);
                 }
               }
               const diffStr = diffTexts.length > 0 ? `<br><span class="text-[11px] font-bold text-yellow-300 bg-yellow-900/50 px-1 py-0.5 rounded border border-yellow-700/50">ステータス成長: ${diffTexts.join(', ')}</span>` : '';
               
               // Optional: Show floating stat text directly above monster
               const floater = document.createElement('div');
               floater.className = 'absolute -top-4 left-1/2 -translate-x-1/2 text-yellow-300 font-black text-sm whitespace-nowrap animate-fade-in-up drop-shadow-md z-50 pointer-events-none';
               floater.innerHTML = `Level Up!`;
               topSection.querySelector('.relative.w-24').appendChild(floater);
               setTimeout(() => floater.remove(), 1500);

               showNotification(document.body, `${monsterDef.name} がレベルアップ！${diffStr}`, 'success');
               
               elLevel.classList.add('scale-125', 'text-white', 'bg-pink-600', 'border-pink-400');
               setTimeout(() => elLevel.classList.remove('scale-125', 'text-white', 'bg-pink-600', 'border-pink-400'), 400);
            }
          };
        }
        list.appendChild(itemRow);
      }
    }
    itemsContainer.innerHTML = '<h4 class="text-sm font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1 mt-2">好物（ドロップ素材）</h4>';
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
  
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  };
}
