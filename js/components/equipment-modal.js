/**

 * このファイルは装備を変更するためのポップアップ画面（モーダル）を
 * 表示・操作するためのファイルです。
 */
import { GameDB } from '../data/database.js';
import { EQUIPMENT_SLOTS, STAT_KEYS } from '../data/constants.js';

const ITEMS_PER_PAGE = 30;

/**
 * Show the equipment modal for a specific character.
 * @param {Object} character - The character object
 * @param {string} targetSlot - The specific equipment slot clicked (e.g. 'rightHand', 'armor')
 * @param {Function} onEquipmentChanged - Callback when equipment is changed
 */
export async function showEquipmentModal(character, targetSlot, onEquipmentChanged) {
  // Prevent duplicate modals
  if (document.getElementById('equipment-modal')) return;

  // Fetch available equipment (Warehouse)
  const warehouseItems = await GameDB.getWarehouseEquipment();
  
  // Also get currently equipped items for this character so they can be unequipped/selected
  const equippedIds = Object.values(character.equipment).filter(id => id !== null);
  const allEquipment = await GameDB.getAllEquipment();
  const equippedItems = allEquipment.filter(eq => equippedIds.includes(eq.id));

  // Combine them: currently equipped items + warehouse items
  let availableItems = [...equippedItems, ...warehouseItems];

  // Filter items matching the target slot
  availableItems = availableItems.filter(item => {
    // If target is accessory1/2, it can equip items with slot 'accessory'
    if (targetSlot.startsWith('accessory') && item.slot === 'accessory') return true;
    return item.slot === targetSlot;
  });

  let currentPage = 1;
  const totalPages = Math.max(1, Math.ceil(availableItems.length / ITEMS_PER_PAGE));
  
  // Initially select the first available item, or null
  let selectedItem = availableItems.length > 0 ? availableItems[0] : null;

  const overlay = document.createElement('div');
  overlay.id = 'equipment-modal';
  overlay.className = `
    fixed inset-0 z-[100] flex items-center justify-center
    bg-black/80 backdrop-blur-md
    animate-[fade-in_0.2s_ease-out]
  `;
  overlay.style.animation = 'fade-in 0.2s ease-out forwards';

  // Helper to render stats
  const renderItemStats = (item) => {
    if (!item) return '<div class="text-gray-500 text-xs italic flex h-full items-center justify-center">アイテムが選択されていません</div>';
    
    const statsHtml = STAT_KEYS.map(stat => {
      const val = item.stats[stat.key] || 0;
      if (val === 0) return '';
      const colorClass = val > 0 ? 'text-green-400' : 'text-red-400';
      const sign = val > 0 ? '+' : '';
      return `
        <div class="flex justify-between items-center bg-gray-800/50 rounded px-2 py-1 border border-gray-700/50">
          <span class="text-[10px] text-gray-400">${stat.label}</span>
          <span class="text-xs font-bold ${colorClass}">${sign}${val}</span>
        </div>
      `;
    }).join('');

    const slotLabel = EQUIPMENT_SLOTS.find(s => s.key === item.slot)?.label || item.slot;
    const isEquipped = equippedIds.includes(item.id);

    return `
      <div class="flex flex-col h-full gap-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded border border-blue-700/50">${slotLabel}</span>
          ${isEquipped ? '<span class="text-[10px] font-bold text-yellow-500 bg-yellow-900/40 px-1.5 py-0.5 rounded">装備中</span>' : ''}
        </div>
        <div class="grid grid-cols-2 gap-1.5 mt-1 overflow-y-auto pr-1 custom-scrollbar">
          ${statsHtml || '<div class="text-[10px] text-gray-500 col-span-2">ステータス補正なし</div>'}
        </div>
        <div class="mt-auto pt-2 flex gap-2">
          ${isEquipped 
            ? `<button id="btn-unequip" class="flex-1 py-2 bg-red-900/60 hover:bg-red-800/80 text-red-100 rounded-lg text-sm font-bold border border-red-700/50 transition-all active:scale-95 shadow-lg">外す</button>`
            : `<button id="btn-equip" class="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-sm font-bold border border-blue-400/30 transition-all active:scale-95 shadow-lg shadow-blue-900/50">装備する</button>`
          }
        </div>
      </div>
    `;
  };

  const renderContent = () => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = availableItems.slice(startIdx, startIdx + ITEMS_PER_PAGE);
    
    // Fill empty slots for grid consistency
    const gridItems = [...pageItems];
    while (gridItems.length < ITEMS_PER_PAGE) {
      gridItems.push(null);
    }

    const gridHtml = gridItems.map((item, idx) => {
      if (!item) {
        return `<div class="aspect-square rounded-lg bg-gray-800/30 border border-dashed border-gray-700/30"></div>`;
      }
      
      const isSelected = selectedItem && selectedItem.id === item.id;
      const isEquipped = equippedIds.includes(item.id);
      
      let innerContent = '';
      if (item.image) {
        innerContent = `<img src="${item.image}" class="w-3/4 h-3/4 object-contain drop-shadow-md" alt="${item.name}" />`;
      } else {
        innerContent = `<span class="material-symbols-outlined text-2xl text-gray-300 drop-shadow-md">${item.icon}</span>`;
      }

      return `
        <div data-idx="${startIdx + idx}" 
             class="item-slot relative aspect-square rounded-lg cursor-pointer transition-all duration-200
                    flex items-center justify-center
                    ${isSelected 
                      ? 'bg-blue-900/40 border-2 border-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.4)] scale-105 z-10' 
                      : 'bg-gray-800/60 border border-gray-600/50 hover:bg-gray-700/80 hover:border-gray-400'}">
          ${innerContent}
          ${isEquipped ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border border-gray-900 shadow-sm"></div>' : ''}
        </div>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="bg-[#111122] border border-gray-600/50 rounded-2xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl shadow-black/80
                  animate-[slide-up_0.3s_cubic-bezier(0.16,1,0.3,1)] m-4"
           style="height: 85dvh;">
        
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-gray-700/50 relative z-20">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full overflow-hidden border border-gray-600 shrink-0"
                 style="background: linear-gradient(135deg, ${character.iconGradient[0]}, ${character.iconGradient[1]});">
              <img src="${character.iconImage}" class="w-full h-full object-contain" />
            </div>
            <div>
              <div class="text-sm font-bold text-gray-100 leading-tight">装備変更</div>
              <div class="text-[10px] text-gray-400 leading-tight">${character.name}</div>
            </div>
          </div>
          <button id="eq-modal-close" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <!-- Selected Item Detail (Top Area) -->
        <div class="p-3 bg-gray-800/30 border-b border-gray-700/50 flex gap-3 h-[140px] shrink-0">
          <div class="flex flex-col items-center gap-2 w-1/3 shrink-0">
            <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 border border-gray-600 shadow-inner 
                        flex items-center justify-center relative overflow-hidden group">
              <div class="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              ${selectedItem ? 
                  (selectedItem.image 
                    ? `<img src="${selectedItem.image}" class="w-12 h-12 object-contain drop-shadow-lg" />` 
                    : `<span class="material-symbols-outlined text-3xl text-gray-200 drop-shadow-lg">${selectedItem.icon}</span>`) 
                  : ''
              }
            </div>
            <div class="text-[11px] font-bold text-center text-gray-200 leading-tight line-clamp-2 w-full px-1">
              ${selectedItem ? selectedItem.name : '---'}
            </div>
          </div>
          
          <div class="flex-1 bg-gray-900/60 rounded-xl border border-gray-700/50 p-2 relative overflow-hidden">
             <!-- decorative glow -->
            <div class="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/10 blur-xl rounded-full"></div>
            ${renderItemStats(selectedItem)}
          </div>
        </div>

        <!-- Pagination (Middle Area) -->
        <div class="flex items-center justify-between px-4 py-2 bg-gray-900/40 border-b border-gray-700/30 shrink-0">
          <button id="eq-page-prev" class="p-1 rounded-lg hover:bg-gray-700/50 text-gray-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" ${currentPage === 1 ? 'disabled' : ''}>
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <span class="text-xs font-mono text-gray-400 tracking-widest">PAGE <span class="text-gray-200 font-bold">${currentPage}</span> / ${totalPages}</span>
          <button id="eq-page-next" class="p-1 rounded-lg hover:bg-gray-700/50 text-gray-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" ${currentPage === totalPages ? 'disabled' : ''}>
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <!-- Grid (Bottom Area) -->
        <div class="flex-1 p-3 overflow-y-auto custom-scrollbar bg-[#0b0b19]">
          <div class="grid grid-cols-5 gap-2">
            ${gridHtml}
          </div>
        </div>
      </div>
    `;

    // Bind events
    document.getElementById('eq-modal-close').addEventListener('click', () => overlay.remove());
    
    document.getElementById('eq-page-prev')?.addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderContent(); }
    });
    document.getElementById('eq-page-next')?.addEventListener('click', () => {
      if (currentPage < totalPages) { currentPage++; renderContent(); }
    });

    const slots = overlay.querySelectorAll('.item-slot');
    slots.forEach(slot => {
      slot.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        if (!isNaN(idx) && availableItems[idx]) {
          selectedItem = availableItems[idx];
          renderContent();
        }
      });
    });

    const btnEquip = document.getElementById('btn-equip');
    if (btnEquip && selectedItem) {
      btnEquip.addEventListener('click', async () => {
        // Equip item
        character.equipment[targetSlot] = selectedItem.id;
        await GameDB.putCharacter(character);
        overlay.remove();
        if (onEquipmentChanged) onEquipmentChanged();
      });
    }

    const btnUnequip = document.getElementById('btn-unequip');
    if (btnUnequip && selectedItem) {
      btnUnequip.addEventListener('click', async () => {
        // Unequip item
        character.equipment[targetSlot] = null;
        await GameDB.putCharacter(character);
        overlay.remove();
        if (onEquipmentChanged) onEquipmentChanged();
      });
    }
  };

  document.body.appendChild(overlay);
  renderContent();
}
