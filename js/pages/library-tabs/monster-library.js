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

export function renderMonsterLibraryTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full p-2 animate-fade-in overflow-hidden';

  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'overflow-y-auto flex-1 pb-6 pr-1 no-scrollbar';

  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid grid-cols-5 gap-1.5 content-start';
  
  scrollContainer.appendChild(gridContainer);

  let acquiredBaseIds = new Set();

  const renderGrid = () => {
    gridContainer.innerHTML = '';
    MONSTERS.forEach(monster => {
      const isDefeated = acquiredBaseIds.has('defeated_' + monster.id);

      const slot = document.createElement('div');
      slot.className = `relative w-full aspect-square flex items-center justify-center bg-gray-900/60 rounded-md border ${isDefeated ? 'border-gray-700/50 hover:border-gray-500 hover:bg-gray-800 cursor-pointer' : 'border-gray-700/80 cursor-pointer'} overflow-hidden transition-all shadow-sm`;
      
      if (monster.image) {
        const imgClass = isDefeated ? 'w-full h-full object-cover' : `w-full h-full object-cover ${SILHOUETTE_FILTER}`;
        slot.innerHTML = `<img src="${monster.image}" alt="" class="${imgClass}" onerror="this.style.display='none'">`;
      } else {
        const iconClass = isDefeated ? 'material-symbols-outlined text-gray-500 text-3xl' : 'material-symbols-outlined text-gray-800 text-3xl';
        slot.innerHTML = `<span class="${iconClass}">pets</span>`;
      }
      slot.onclick = () => showMonsterModal(monster, isDefeated);
      gridContainer.appendChild(slot);
    });
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
    
    const topSection = `
      <div class="flex items-center gap-3 bg-gray-800/40 p-2 rounded-lg border border-gray-700 shadow-sm">
        <div class="w-14 h-14 bg-gray-900 rounded-md border border-gray-600 shadow-inner flex items-center justify-center overflow-hidden shrink-0 relative">
          ${displayImage}
        </div>
        <div class="flex-1 flex flex-col justify-center">
          <div class="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400 leading-tight break-words mb-0.5">${displayName}</div>
          <div class="text-[10px] text-gray-500 font-bold">モンスター</div>
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

        const rateValue = isDefeated ? `${drop.rate}%` : '???%';
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
    const discovered = await GameDB.getGameState('discovered_items') || [];
    discovered.forEach(id => acquiredBaseIds.add(id));

    // Check discovered_monsters to determine if monster was defeated
    const discoveredMonsters = await GameDB.getGameState('discovered_monsters') || [];
    discoveredMonsters.forEach(monsterId => acquiredBaseIds.add('defeated_' + monsterId));

    renderGrid();
  };

  setTimeout(loadData, 0);

  container.appendChild(scrollContainer);
  return container;
}
