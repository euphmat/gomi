import { GameDB } from '../../data/database.js';
import { MONSTERS } from '../../definitions/monsters.js';
import { WEAPONS } from '../../definitions/weapons.js';
import { ARMORS } from '../../definitions/armors.js';
import { SHIELDS } from '../../definitions/shields.js';
import { ACCESSORIES } from '../../definitions/accessories.js';
import { MATERIALS } from '../../definitions/materials.js';

const ALL_DEFINITIONS = [
  ...WEAPONS,
  ...ARMORS,
  ...SHIELDS,
  ...ACCESSORIES,
  ...MATERIALS
];

// Unified silhouette filter for undiscovered/undefeated entries
const SILHOUETTE_FILTER = 'brightness-[0.07] saturate-0 drop-shadow-[0_0_3px_rgba(160,170,220,0.8)]';

function getBaseId(id) {
  const lastUnderscore = id.lastIndexOf('_');
  if (lastUnderscore > 0) {
    const suffix = id.substring(lastUnderscore + 1);
    if (suffix.length >= 4 && /^[a-z0-9]+$/.test(suffix) && suffix !== 'ring') {
      return id.substring(0, lastUnderscore);
    }
  }
  return id;
}

export function renderMonsterLibraryTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full p-2 animate-fade-in overflow-hidden';

  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'overflow-y-auto flex-1 pb-6 pr-1 no-scrollbar';

  const gridContainer = document.createElement('div');
  
  scrollContainer.appendChild(gridContainer);

  let acquiredBaseIds = new Set();
  let monsterKills = {};
  let viewMode = 'grid'; // 'grid' | 'list'
  let currentPage = 1;
  let ranchData = {};

  const topBar = document.createElement('div');
  topBar.className = 'flex items-center justify-end mb-4 shrink-0 pt-2 px-2';

  const rightControls = document.createElement('div');
  rightControls.className = 'flex items-center gap-2 shrink-0';

  const viewModeContainer = document.createElement('div');
  viewModeContainer.className = 'flex items-center bg-gray-800/40 border border-gray-700/60 rounded-lg overflow-hidden shrink-0 h-10';

  const updateViewModeUI = () => {
    viewModeContainer.innerHTML = '';
    
    const gridBtn = document.createElement('button');
    gridBtn.className = `flex items-center justify-center w-8 h-full transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-gray-700 text-blue-400' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}`;
    gridBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">grid_view</span>';
    gridBtn.onclick = () => {
      if (viewMode !== 'grid') {
        viewMode = 'grid';
        currentPage = 1;
        updateViewModeUI();
        renderGrid();
      }
    };

    const listBtn = document.createElement('button');
    listBtn.className = `flex items-center justify-center w-8 h-full transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-gray-700 text-blue-400' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}`;
    listBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">view_list</span>';
    listBtn.onclick = () => {
      if (viewMode !== 'list') {
        viewMode = 'list';
        currentPage = 1;
        updateViewModeUI();
        renderGrid();
      }
    };

    viewModeContainer.appendChild(gridBtn);
    viewModeContainer.appendChild(listBtn);
  };
  updateViewModeUI();

  rightControls.appendChild(viewModeContainer);
  topBar.appendChild(rightControls);

  const paginationContainer = document.createElement('div');
  paginationContainer.className = 'flex items-center justify-center gap-4 py-2 shrink-0 bg-gray-900/80 border-t border-gray-800 pb-4';

  const renderPagination = (totalPages) => {
    paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;
    
    const prevBtn = document.createElement('button');
    prevBtn.className = `w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${currentPage > 1 ? 'bg-gray-800 text-gray-200 hover:bg-gray-700 cursor-pointer' : 'bg-gray-900 text-gray-600 cursor-not-allowed'}`;
    prevBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">chevron_left</span>';
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderGrid();
        scrollContainer.scrollTop = 0;
      }
    };

    const info = document.createElement('div');
    info.className = 'text-xs font-bold text-gray-400 font-mono tracking-widest';
    info.textContent = `${currentPage} / ${totalPages}`;

    const nextBtn = document.createElement('button');
    nextBtn.className = `w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${currentPage < totalPages ? 'bg-gray-800 text-gray-200 hover:bg-gray-700 cursor-pointer' : 'bg-gray-900 text-gray-600 cursor-not-allowed'}`;
    nextBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">chevron_right</span>';
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderGrid();
        scrollContainer.scrollTop = 0;
      }
    };
    
    paginationContainer.appendChild(prevBtn);
    paginationContainer.appendChild(info);
    paginationContainer.appendChild(nextBtn);
  };

  const renderGrid = () => {
    gridContainer.innerHTML = '';
    if (viewMode === 'grid') {
      gridContainer.className = 'grid grid-cols-5 gap-1.5 content-start';
    } else {
      gridContainer.className = 'flex flex-col gap-2 content-start';
    }

    const ITEMS_PER_PAGE = viewMode === 'grid' ? 25 : 5;
    const totalPages = Math.ceil(MONSTERS.length / ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = MONSTERS.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (MONSTERS.length === 0) {
      gridContainer.innerHTML = `<div class="col-span-full text-center text-gray-500 text-sm mt-8">モンスターデータがありません</div>`;
      renderPagination(1);
      return;
    }

    pageItems.forEach(monster => {
      const isDefeated = acquiredBaseIds.has('defeated_' + monster.id);

      const slot = document.createElement('div');
      
      let isCompanion = false;
      for (const dId of Object.keys(ranchData)) {
        if (ranchData[dId] && ranchData[dId][monster.id]) {
          isCompanion = true; break;
        }
      }
      
      const companionBadge = isCompanion 
        ? '<div class="absolute top-1 right-1 bg-pink-900/90 border border-pink-500/50 text-pink-300 text-[8px] font-bold px-1 py-0.5 rounded-full flex items-center shadow-md backdrop-blur-sm z-10"><span class="material-symbols-outlined text-[10px]">pets</span></div>'
        : '';

      if (viewMode === 'grid') {
        slot.className = `relative w-full aspect-square flex items-center justify-center bg-gray-900/60 rounded-md border ${isDefeated ? 'border-gray-700/50 hover:border-gray-500 hover:bg-gray-800 cursor-pointer' : 'border-gray-700/80 cursor-pointer'} overflow-hidden transition-all shadow-sm`;
        
        if (monster.image) {
          const imgClass = isDefeated ? 'w-full h-full object-cover' : `w-full h-full object-cover ${SILHOUETTE_FILTER}`;
          slot.innerHTML = `
            ${companionBadge}
            <img src="${monster.image}" alt="" class="${imgClass}" onerror="this.style.display='none'">
          `;
        } else {
          const iconClass = isDefeated ? 'material-symbols-outlined text-gray-500 text-3xl' : 'material-symbols-outlined text-gray-800 text-3xl';
          slot.innerHTML = `
            ${companionBadge}
            <span class="${iconClass}">pets</span>
          `;
        }
      } else {
        // list view
        const displayName = isDefeated ? monster.name : '？？？';
        
        slot.className = `relative w-full flex flex-row items-center gap-3 p-2.5 bg-gray-900/60 rounded-md border ${isDefeated ? 'border-gray-700/50 hover:border-gray-500 hover:bg-gray-800 cursor-pointer' : 'border-gray-700/80 cursor-pointer'} transition-all shadow-sm`;

        let imgHtml = '';
        if (monster.image) {
          const imgClass = isDefeated ? 'w-11 h-11 rounded-md object-cover border border-gray-700/50 bg-gray-900 shadow-inner' : `w-11 h-11 rounded-md object-cover border border-gray-700/50 bg-gray-900 shadow-inner ${SILHOUETTE_FILTER}`;
          imgHtml = `<img src="${monster.image}" alt="" class="${imgClass}" onerror="this.style.display='none'">`;
        } else {
          const iconClass = isDefeated ? 'material-symbols-outlined text-gray-500 text-2xl' : 'material-symbols-outlined text-gray-800 text-2xl';
          imgHtml = `<div class="w-11 h-11 rounded-md border border-gray-700/50 flex items-center justify-center bg-gray-800/50 shrink-0 shadow-inner"><span class="${iconClass}">pets</span></div>`;
        }

        const kills = monsterKills[monster.id] || 0;

        slot.innerHTML = `
          <div class="shrink-0 relative">
            ${companionBadge}
            ${imgHtml}
          </div>
          <div class="flex flex-col min-w-0 flex-1 justify-center gap-1">
            <div class="flex items-center gap-2">
              <span class="text-[9px] font-black border px-1.5 py-0.5 rounded text-gray-400 bg-gray-800/80 border-gray-700/50 leading-none shadow-sm">モンスター</span>
              <span class="text-[13px] font-bold ${isDefeated ? 'text-gray-100' : 'text-gray-500'} truncate leading-tight">${displayName}</span>
            </div>
            <div class="flex items-center flex-wrap gap-y-1.5 mt-1">
              <span class="text-[10px] text-gray-500 italic">討伐数: <span class="font-bold text-red-400 font-mono text-[11px]">${isDefeated ? kills : '?'}</span> 体</span>
            </div>
          </div>
        `;
      }

      slot.onclick = () => showMonsterModal(monster, isDefeated);
      gridContainer.appendChild(slot);
    });

    renderPagination(totalPages);
  };

  const showMonsterModal = (monster, isDefeated) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in px-4 py-8';
    
    const modal = document.createElement('div');
    modal.className = 'bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-[slide-up_0.2s_ease-out] max-h-full';
    
    // Header
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center px-4 py-3 border-b border-gray-800 bg-gradient-to-b from-gray-800 to-gray-900 shrink-0';
    header.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-gray-400 text-lg normal-case">info</span>
        <span class="font-bold text-gray-100 text-sm tracking-wider">モンスター詳細</span>
      </div>
      <button class="text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 rounded-full p-1 flex items-center justify-center" id="close-modal-btn">
        <span class="material-symbols-outlined text-lg block normal-case">close</span>
      </button>`;
      
    // Body
    const body = document.createElement('div');
    body.className = 'p-4 flex flex-col gap-4 overflow-y-auto no-scrollbar flex-1 min-h-0';
    
    const displayName = monster.name;
    let displayImage = '';
    if (monster.image) {
        displayImage = isDefeated 
          ? `<img src="${monster.image}" class="w-full h-full object-cover" onerror="this.style.display='none'">` 
          : `<img src="${monster.image}" class="w-full h-full object-cover ${SILHOUETTE_FILTER}" onerror="this.style.display='none'">`;
    } else {
        displayImage = isDefeated
          ? `<span class="material-symbols-outlined text-3xl text-gray-500 normal-case">pets</span>`
          : `<span class="material-symbols-outlined text-3xl text-gray-800 normal-case">pets</span>`;
    }
    
    const kills = monsterKills[monster.id] || 0;
    const bonus = Math.floor(kills / 100) * 0.1;

    const topSection = `
      <div class="flex items-center gap-3 bg-gray-800/40 p-2 rounded-lg border border-gray-700 shadow-sm">
        <div class="w-14 h-14 bg-gray-900 rounded-md border border-gray-600 shadow-inner flex items-center justify-center overflow-hidden shrink-0 relative">
          ${displayImage}
        </div>
        <div class="flex-1 flex flex-col justify-center">
          <div class="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400 leading-tight break-words mb-0.5">${displayName}</div>
          <div class="flex items-center justify-between">
            <div class="text-[10px] text-gray-500 font-bold">モンスター</div>
            <div class="text-[10px] text-red-400 font-bold">討伐数: ${kills}体</div>
          </div>
        </div>
      </div>
    `;

    const renderListSection = (title, icon, itemsHtml) => {
      if (!itemsHtml) return '';
      return `
        <div class="mt-1">
          <div class="text-[10px] font-bold text-gray-500 tracking-wider mb-1.5 ml-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[12px] normal-case">${icon}</span> ${title}
          </div>
          <div class="flex flex-col gap-1">${itemsHtml}</div>
        </div>
      `;
    };

    const createRow = (iconHtml, title, label, value, valueColor) => `
      <div class="flex justify-between items-center bg-gray-800/40 hover:bg-gray-700/50 transition-colors p-2 rounded-md border border-gray-700/60">
        <div class="flex items-center gap-2">
          ${iconHtml}
          <span class="text-xs text-gray-200 font-bold">${title}</span>
        </div>
        <div class="flex flex-col items-end">
          <span class="text-[9px] text-gray-500 font-bold">${label}</span>
          <span class="text-[11px] font-bold ${valueColor} font-mono">${value}</span>
        </div>
      </div>
    `;


    // Drops Section
    let dropsSection = '';
    if (monster.drops && monster.drops.length > 0) {
      const dropHtml = monster.drops.map(drop => {
        const itemDef = ALL_DEFINITIONS.find(d => d.id === drop.itemId);
        const itemName = itemDef ? itemDef.name : drop.itemId;
        const baseId = itemDef ? (itemDef.baseId || itemDef.id) : drop.itemId;
        const isItemAcquired = acquiredBaseIds.has(baseId);
        
        // Show silhouette if item not yet acquired, full image if acquired
        const imgClass = isItemAcquired ? 'w-full h-full object-cover' : `w-full h-full object-cover ${SILHOUETTE_FILTER}`;
        const containerClass = 'w-8 h-8 bg-gray-900 rounded border border-gray-600 flex items-center justify-center overflow-hidden shrink-0';
        const iconSrc = itemDef && itemDef.image 
          ? `<div class="${containerClass}"><img src="${itemDef.image}" class="${imgClass}" onerror="this.style.display='none'"></div>` 
          : `<div class="${containerClass}"><span class="material-symbols-outlined text-[16px] text-gray-500 normal-case">category</span></div>`;

        const rate = Math.min(100, parseFloat(drop.rate) + bonus);
        const rateStr = rate.toFixed(2).replace(/\.?0+$/, '');
        const rateValue = isDefeated ? `${rateStr}%` : '???%';
        const rateColor = isDefeated ? 'text-blue-400' : 'text-gray-600';
        
        return createRow(iconSrc, itemName, 'ドロップ率', rateValue, rateColor);
      }).join('');
      
      dropsSection = renderListSection('ドロップアイテム', 'redeem', dropHtml);
    } else {
      dropsSection = `
        <div class="flex flex-col items-center justify-center py-6 text-gray-500 bg-gray-800/30 rounded-lg border border-gray-700 border-dashed mt-2">
          <span class="material-symbols-outlined text-2xl mb-1 normal-case">inventory_2</span>
          <span class="text-[10px] font-bold">ドロップアイテムはありません</span>
        </div>
      `;
    }

    body.innerHTML = topSection + dropsSection;
    
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Event Listeners
    const closeModal = () => {
      modal.classList.replace('animate-[slide-up_0.2s_ease-out]', 'animate-[slide-down_0.2s_ease-in]');
      overlay.classList.add('opacity-0');
      setTimeout(() => overlay.remove(), 200);
    };
    overlay.addEventListener('click', (e) => { if(e.target === overlay) closeModal(); });
    modal.querySelector('#close-modal-btn').onclick = closeModal;
  };

  const loadData = async () => {
    const [eq, inv, discovered, discoveredMonsters, kills, ranch] = await Promise.all([
      GameDB.getAllEquipment(),
      GameDB.getAllInventory(),
      GameDB.getGameState('discovered_items'),
      GameDB.getGameState('discovered_monsters'),
      GameDB.getGameState('monster_kills'),
      GameDB.getGameState('ranch_data')
    ]);

    const discoveredItems = discovered || [];
    discoveredItems.forEach(id => acquiredBaseIds.add(id));

    eq.forEach(item => acquiredBaseIds.add(item.baseId || getBaseId(item.id)));
    inv.forEach(item => acquiredBaseIds.add(item.id));

    const discoveredM = discoveredMonsters || [];
    discoveredM.forEach(monsterId => acquiredBaseIds.add('defeated_' + monsterId));

    monsterKills = kills || {};
    ranchData = ranch || {};

    renderGrid();
  };

  setTimeout(loadData, 0);

  container.appendChild(topBar);
  container.appendChild(scrollContainer);
  container.appendChild(paginationContainer);

  return container;
}
