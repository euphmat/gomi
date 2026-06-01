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

export function renderMonsterLibraryTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full p-2 animate-fade-in overflow-hidden';

  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid grid-cols-6 gap-2 overflow-y-auto content-start pb-6 pr-1 flex-1 no-scrollbar';

  let killCountsState = {};
  let acquiredBaseIds = new Set();

  const renderGrid = () => {
    gridContainer.innerHTML = '';
    MONSTERS.forEach(monster => {
      const kills = killCountsState[monster.id] || 0;
      const isDefeated = kills > 0;

      const slot = document.createElement('div');
      slot.className = `aspect-square bg-gray-800/80 rounded-md border ${isDefeated ? 'border-gray-700/50 hover:border-gray-400 hover:bg-gray-700 cursor-pointer' : 'border-gray-700 cursor-pointer'} flex items-center justify-center overflow-hidden transition-all shadow-sm relative`;
      
      let innerHTML = '';
      if (monster.image) {
        const imgClass = isDefeated ? 'w-full h-full object-cover' : 'w-full h-full object-cover brightness-[0.15] drop-shadow-[0_0_1px_rgba(255,255,255,0.8)]';
        innerHTML = `<img src="${monster.image}" alt="${monster.name}" class="${imgClass}">`;
      } else {
        const iconClass = isDefeated ? 'material-symbols-outlined text-gray-500 text-3xl' : 'material-symbols-outlined text-gray-800 text-3xl';
        innerHTML = `<span class="${iconClass}">pets</span>`;
      }
      
      slot.innerHTML = innerHTML;
      slot.onclick = () => showMonsterModal(monster, isDefeated, kills);
      gridContainer.appendChild(slot);
    });
  };

  const showMonsterModal = (monster, isDefeated, kills) => {
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
    
    const displayName = isDefeated ? monster.name : '？？？';
    let displayImage = '';
    if (monster.image) {
        displayImage = isDefeated 
          ? `<img src="${monster.image}" class="w-full h-full object-cover">` 
          : `<img src="${monster.image}" class="w-full h-full object-cover brightness-[0.15] drop-shadow-[0_0_1px_rgba(255,255,255,0.8)]">`;
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

    // Kill Rewards Section
    let rewardsSection = '';
    if (monster.killRewards && monster.killRewards.length > 0) {
      const rewardsHtml = monster.killRewards.map(reward => {
        const itemDef = ALL_DEFINITIONS.find(d => d.id === reward.itemId);
        const baseId = itemDef ? (itemDef.baseId || itemDef.id) : reward.itemId;
        const isItemAcquired = acquiredBaseIds.has(baseId);
        
        const itemName = itemDef ? itemDef.name : reward.itemId;
        const rewardName = isItemAcquired ? itemName : '？？？';
        
        const progressPercent = Math.min(100, Math.floor((kills / reward.count) * 100));

        let iconSrc = '';
        if (itemDef && itemDef.image) {
          const imgClass = isItemAcquired 
            ? 'w-8 h-8 rounded object-cover border border-gray-600 bg-gray-800 shrink-0' 
            : 'w-8 h-8 rounded object-cover border border-gray-600 bg-gray-800 shrink-0 brightness-[0.15] drop-shadow-[0_0_1px_rgba(255,255,255,0.8)]';
          iconSrc = `<img src="${itemDef.image}" class="${imgClass}">`;
        } else {
          iconSrc = `<div class="w-8 h-8 bg-gray-800 rounded border border-gray-600 flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[16px] text-gray-500 normal-case">category</span></div>`;
        }
        
        return `
          <div class="flex flex-col bg-gray-800/40 p-2 rounded-md border border-gray-700/60 gap-1.5">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                ${iconSrc}
                <span class="text-xs text-gray-200 font-bold">${rewardName}</span>
              </div>
              <div class="flex flex-col items-end">
                <span class="text-[9px] text-gray-500 font-bold">目標討伐数</span>
                <span class="text-[11px] font-bold text-yellow-400 font-mono">${reward.count.toLocaleString()}体</span>
              </div>
            </div>
            <div class="w-full bg-gray-900 rounded-full h-1.5 border border-gray-700 shadow-inner overflow-hidden relative">
              <div class="bg-gradient-to-r from-blue-600 to-blue-400 h-1.5 rounded-full" style="width: ${progressPercent}%"></div>
            </div>
            <div class="flex justify-end">
               <span class="text-[9px] text-gray-400 font-mono leading-none">進捗: ${kills.toLocaleString()} / ${reward.count.toLocaleString()} (${progressPercent}%)</span>
            </div>
          </div>
        `;
      }).join('');
      
      rewardsSection = renderListSection('討伐報酬と進捗', 'military_tech', rewardsHtml);
    } else {
      rewardsSection = renderListSection('討伐実績', 'swords', `
        <div class="bg-gray-800/40 p-2 rounded-md border border-gray-700/60 flex justify-between items-center">
          <span class="text-xs text-gray-300 font-bold">現在の討伐数</span>
          <span class="text-xs font-bold text-yellow-400 font-mono">${kills.toLocaleString()}体</span>
        </div>
      `);
    }

    // Drops Section
    let dropsSection = '';
    if (monster.drops && monster.drops.length > 0) {
      const dropHtml = monster.drops.map(drop => {
        const itemDef = ALL_DEFINITIONS.find(d => d.id === drop.itemId);
        
        if (!isDefeated) {
          return createRow(
            `<div class="w-8 h-8 bg-gray-800 rounded border border-gray-600 flex items-center justify-center"><span class="material-symbols-outlined text-[16px] text-gray-600 normal-case">question_mark</span></div>`,
            '？？？',
            'ドロップ率',
            '???%',
            'text-gray-600'
          );
        }

        const iconSrc = itemDef && itemDef.image 
          ? `<img src="${itemDef.image}" class="w-8 h-8 rounded object-cover border border-gray-600 bg-gray-800">` 
          : `<div class="w-8 h-8 bg-gray-800 rounded border border-gray-600 flex items-center justify-center"><span class="material-symbols-outlined text-[16px] text-gray-500 normal-case">category</span></div>`;
        const itemName = itemDef ? itemDef.name : drop.itemId;
        
        return createRow(iconSrc, itemName, 'ドロップ率', `${drop.rate}%`, 'text-blue-400');
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

    body.innerHTML = topSection + rewardsSection + dropsSection;
    
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
    killCountsState = await GameDB.getGameState('killCounts') || {};
    const discovered = await GameDB.getGameState('discovered_items') || [];
    discovered.forEach(id => acquiredBaseIds.add(id));
    renderGrid();
  };

  setTimeout(loadData, 0);

  container.appendChild(gridContainer);
  return container;
}
