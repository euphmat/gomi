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
    overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in px-4';
    
    const modal = document.createElement('div');
    modal.className = 'bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-[slide-up_0.2s_ease-out] max-h-[75vh]';
    
    // Header
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center p-4 border-b border-gray-800 bg-gradient-to-b from-gray-800 to-gray-900';
    header.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-gray-400 text-lg normal-case">info</span>
        <span class="font-bold text-gray-100 text-sm tracking-wider">モンスター詳細</span>
      </div>
      <button class="text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 rounded-full p-1" id="close-modal-btn">
        <span class="material-symbols-outlined text-xl block normal-case">close</span>
      </button>`;
      
    // Body
    const body = document.createElement('div');
    body.className = 'p-4 flex flex-col gap-5 overflow-y-auto no-scrollbar pb-6';
    
    const displayName = isDefeated ? monster.name : '？？？';
    let displayImage = '';
    if (monster.image) {
        displayImage = isDefeated 
          ? `<img src="${monster.image}" class="w-full h-full object-cover">` 
          : `<img src="${monster.image}" class="w-full h-full object-cover brightness-[0.15] drop-shadow-[0_0_1px_rgba(255,255,255,0.8)]">`;
    } else {
        displayImage = isDefeated
          ? `<span class="material-symbols-outlined text-4xl text-gray-500 normal-case">pets</span>`
          : `<span class="material-symbols-outlined text-4xl text-gray-800 normal-case">pets</span>`;
    }
    
    const topSection = `
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-4 bg-gray-800/50 p-3 rounded-xl border border-gray-700">
          <div class="w-16 h-16 bg-gray-900 rounded-lg border border-gray-600 shadow-inner flex items-center justify-center overflow-hidden shrink-0 relative">
            ${displayImage}
          </div>
          <div class="flex-1 flex flex-col justify-center gap-2">
            <div class="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400 leading-tight break-words">${displayName}</div>
          </div>
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
            ? 'w-10 h-10 rounded-md object-cover border border-gray-600 shadow-sm bg-gray-800 shrink-0' 
            : 'w-10 h-10 rounded-md object-cover border border-gray-600 shadow-sm bg-gray-800 shrink-0 brightness-[0.15] drop-shadow-[0_0_1px_rgba(255,255,255,0.8)]';
          iconSrc = `<img src="${itemDef.image}" class="${imgClass}">`;
        } else {
          iconSrc = `<div class="w-10 h-10 bg-gray-800 rounded-md border border-gray-600 shadow-sm flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[20px] text-gray-500 normal-case">category</span></div>`;
        }
        
        return `
          <div class="flex flex-col bg-gray-800/60 hover:bg-gray-700 transition-colors p-3 rounded-lg border border-gray-700 mb-1.5 gap-2">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-3">
                ${iconSrc}
                <span class="text-sm text-gray-200 font-bold">${rewardName}</span>
              </div>
              <div class="flex flex-col items-end">
                <span class="text-[10px] text-gray-400 font-bold">目標討伐数</span>
                <span class="text-sm font-bold text-yellow-400 font-mono">${reward.count.toLocaleString()}体</span>
              </div>
            </div>
            <div class="w-full bg-gray-900 rounded-full h-1.5 border border-gray-700 shadow-inner overflow-hidden relative">
              <div class="bg-gradient-to-r from-blue-600 to-blue-400 h-1.5 rounded-full" style="width: ${progressPercent}%"></div>
            </div>
            <div class="flex justify-end -mt-1">
               <span class="text-[10px] text-gray-400 font-mono">進捗: ${kills.toLocaleString()} / ${reward.count.toLocaleString()} (${progressPercent}%)</span>
            </div>
          </div>
        `;
      }).join('');
      
      rewardsSection = `
        <div class="mt-2">
          <div class="text-xs font-bold text-gray-500 tracking-wider mb-2 ml-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px] normal-case">military_tech</span> 討伐報酬と進捗
          </div>
          <div class="flex flex-col">${rewardsHtml}</div>
        </div>
      `;
    } else {
      rewardsSection = `
        <div class="mt-2">
          <div class="text-xs font-bold text-gray-500 tracking-wider mb-2 ml-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px] normal-case">swords</span> 討伐実績
          </div>
          <div class="bg-gray-800/60 p-3 rounded-lg border border-gray-700 flex justify-between items-center">
            <span class="text-sm text-gray-300 font-bold">現在の討伐数</span>
            <span class="text-sm font-bold text-yellow-400 font-mono">${kills.toLocaleString()}体</span>
          </div>
        </div>
      `;
    }

    // Drops Section
    let dropsSection = '';
    if (monster.drops && monster.drops.length > 0) {
      const dropHtml = monster.drops.map(drop => {
        const itemDef = ALL_DEFINITIONS.find(d => d.id === drop.itemId);
        
        if (!isDefeated) {
          return `
            <div class="flex justify-between items-center bg-gray-800/60 p-2 rounded-lg border border-gray-700 mb-1.5">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gray-800 rounded-md border border-gray-600 shadow-sm flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[20px] text-gray-600 normal-case">question_mark</span>
                </div>
                <span class="text-sm text-gray-500 font-bold">？？？</span>
              </div>
              <div class="flex flex-col items-end">
                <span class="text-[10px] text-gray-500 font-bold">ドロップ率</span>
                <span class="text-sm font-bold text-gray-600 font-mono">???%</span>
              </div>
            </div>
          `;
        }

        const iconSrc = itemDef && itemDef.image 
          ? `<img src="${itemDef.image}" class="w-10 h-10 rounded-md object-cover border border-gray-600 shadow-sm bg-gray-800 shrink-0">` 
          : `<div class="w-10 h-10 bg-gray-800 rounded-md border border-gray-600 shadow-sm flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[20px] text-gray-500 normal-case">category</span></div>`;
        const itemName = itemDef ? itemDef.name : drop.itemId;
        
        return `
          <div class="flex justify-between items-center bg-gray-800/60 hover:bg-gray-700 transition-colors p-2 rounded-lg border border-gray-700 mb-1.5">
            <div class="flex items-center gap-3">
              ${iconSrc}
              <span class="text-sm text-gray-200 font-bold">${itemName}</span>
            </div>
            <div class="flex flex-col items-end">
              <span class="text-[10px] text-gray-400 font-bold">ドロップ率</span>
              <span class="text-sm font-bold text-blue-400 font-mono">${drop.rate}%</span>
            </div>
          </div>
        `;
      }).join('');
      
      dropsSection = `
        <div class="mt-2">
          <div class="text-xs font-bold text-gray-500 tracking-wider mb-2 ml-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px] normal-case">redeem</span> ドロップアイテム
          </div>
          <div class="flex flex-col">${dropHtml}</div>
        </div>
      `;
    } else {
      dropsSection = `
        <div class="flex flex-col items-center justify-center py-6 text-gray-500 bg-gray-800/30 rounded-lg border border-gray-700 border-dashed mt-4">
          <span class="material-symbols-outlined text-3xl mb-2 normal-case">inventory_2</span>
          <span class="text-xs font-bold">ドロップアイテムはありません</span>
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
