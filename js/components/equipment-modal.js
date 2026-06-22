/**

 * このファイルは装備を変更するためのポップアップ画面（モーダル）を
 * 表示・操作するためのファイルです。
 */
import { GameDB } from '../data/database.js';
import { EQUIPMENT_SLOTS, STAT_KEYS } from '../data/constants.js';
import { calcFinalStats, buildEquipmentMap } from '../data/stat-calculator.js';
import { formatNumber } from '../utils/format.js';

const ITEMS_PER_PAGE = 30;

const ELEMENT_ICONS = {
  fire: { icon: 'local_fire_department', color: 'text-red-500', label: 'Fire' },
  water: { icon: 'water_drop', color: 'text-blue-500', label: 'Water' },
  grass: { icon: 'eco', color: 'text-green-500', label: 'Grass' },
  ice: { icon: 'ac_unit', color: 'text-cyan-400', label: 'Ice' },
  thunder: { icon: 'bolt', color: 'text-yellow-400', label: 'Thunder' },
  wind: { icon: 'air', color: 'text-teal-400', label: 'Wind' },
  earth: { icon: 'landscape', color: 'text-amber-600', label: 'Earth' },
  light: { icon: 'light_mode', color: 'text-yellow-200', label: 'Light' },
  dark: { icon: 'dark_mode', color: 'text-purple-500', label: 'Dark' },
};

const AILMENT_ICONS = {
  poison: { icon: 'coronavirus', color: 'text-purple-500', label: 'Poison' },
  burn: { icon: 'local_fire_department', color: 'text-red-500', label: 'Burn' },
  paralysis: { icon: 'electric_bolt', color: 'text-yellow-400', label: 'Paralysis' },
  sleep: { icon: 'snooze', color: 'text-indigo-400', label: 'Sleep' },
  confusion: { icon: 'question_mark', color: 'text-pink-400', label: 'Confusion' },
  curse: { icon: 'sentiment_dissatisfied', color: 'text-gray-400', label: 'Curse' },
  blind: { icon: 'visibility_off', color: 'text-slate-400', label: 'Blind' },
  silence: { icon: 'volume_off', color: 'text-blue-300', label: 'Silence' },
};

/**
 * Extract the base item ID from a unique instance ID.
 * e.g. 'wooden_stick_abc123' -> 'wooden_stick'
 * Falls back to the full id if no suffix pattern found.
 */
function getBaseId(item) {
  const id = item.id;
  const lastUnderscore = id.lastIndexOf('_');
  if (lastUnderscore > 0) {
    const suffix = id.substring(lastUnderscore + 1);
    if (suffix.length >= 4 && /^[a-z0-9]+$/.test(suffix) && suffix !== 'ring') {
      return id.substring(0, lastUnderscore);
    }
  }
  return id;
}

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

  // --- Group identical items ---
  const groupMap = new Map();
  for (const item of availableItems) {
    const baseId = getBaseId(item);
    if (!groupMap.has(baseId)) {
      groupMap.set(baseId, {
        baseId,
        representative: item,
        instances: [item],
        count: 1,
        equippedCount: equippedIds.includes(item.id) ? 1 : 0,
      });
    } else {
      const group = groupMap.get(baseId);
      group.instances.push(item);
      group.count++;
      if (equippedIds.includes(item.id)) group.equippedCount++;
    }
  }
  const groupedItems = Array.from(groupMap.values());

  let currentPage = 1;
  let sortKey = null;
  let sortOrder = 'desc';
  const totalPages = Math.max(1, Math.ceil(groupedItems.length / ITEMS_PER_PAGE));
  
  // Initially select the first available group, or null
  let selectedGroup = groupedItems.length > 0 ? groupedItems[0] : null;

  const overlay = document.createElement('div');
  overlay.id = 'equipment-modal';
  overlay.className = `
    fixed inset-0 z-[100] flex items-center justify-center
    bg-black/80 backdrop-blur-md
    animate-[fade-in_0.2s_ease-out]
  `;
  overlay.style.animation = 'fade-in 0.2s ease-out forwards';

  const modalContainer = document.createElement('div');
  modalContainer.className = "bg-[#111122] border border-gray-600/50 rounded-2xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl shadow-black/80 animate-[slide-up_0.3s_cubic-bezier(0.16,1,0.3,1)] m-4";
  modalContainer.style.height = "85dvh";
  overlay.appendChild(modalContainer);

  // Helper to render the detail panel
  const renderDetailPanel = (group) => {
    if (!group) {
      return `<div class="text-gray-500 text-xs italic flex items-center justify-center py-4">アイテムが選択されていません</div>`;
    }
    
    const item = group.representative;

    // --- Stats: compact horizontal row ---
    const statsChips = STAT_KEYS.map(stat => {
      const val = (item.stats && item.stats[stat.key]) || 0;
      let valColor = 'text-gray-500';
      let sign = '';
      if (val > 0) { valColor = 'text-green-400'; sign = '+'; }
      else if (val < 0) { valColor = 'text-red-400'; }
      return `
        <div class="flex flex-col items-center flex-1 min-w-0 bg-gradient-to-b from-gray-800/80 to-gray-900/90 rounded-lg py-1 border border-gray-700/50 shadow-inner">
          <div class="flex items-center justify-center gap-[2px] w-full">
            <span class="material-symbols-outlined ${stat.color}" style="font-size: 11px; font-variation-settings: 'FILL' 1">${stat.icon}</span>
            <span class="text-[8px] text-gray-300 font-bold tracking-wider leading-none">${stat.label}</span>
          </div>
          <span class="text-[12px] font-black ${valColor} leading-tight mt-0.5 drop-shadow-md">${sign}${val}</span>
        </div>
      `;
    }).join('');

    // --- Elements: only non-zero, compact chips ---
    const elements = item.elements || {};
    const isWeapon = item.slot === 'rightHand';
    const elLabel = isWeapon ? '属性攻撃' : '属性防御';
    const elChips = Object.keys(ELEMENT_ICONS)
      .filter(k => (elements[k] || 0) !== 0)
      .map(k => {
        const val = elements[k];
        const def = ELEMENT_ICONS[k];
        const c = val > 0 ? 'text-green-400' : 'text-red-400';
        const s = val > 0 ? '+' : '';
        return `<span class="inline-flex items-center gap-0.5 bg-gray-800/60 rounded px-1 py-[1px] border border-gray-700/40"><span class="material-symbols-outlined text-[11px] ${def.color}">${def.icon}</span><span class="text-[9px] font-bold ${c}">${s}${val}%</span></span>`;
      });

    // --- Ailments: only non-zero, compact chips ---
    const ailments = item.ailments || {};
    const ailLabel = isWeapon ? '状態異常付与' : '状態異常耐性';
    const ailChips = Object.keys(AILMENT_ICONS)
      .filter(k => (ailments[k] || 0) !== 0)
      .map(k => {
        const val = ailments[k];
        const def = AILMENT_ICONS[k];
        const c = val > 0 ? 'text-green-400' : 'text-red-400';
        const s = val > 0 ? '+' : '';
        return `<span class="inline-flex items-center gap-0.5 bg-gray-800/60 rounded px-1 py-[1px] border border-gray-700/40"><span class="material-symbols-outlined text-[11px] ${def.color}">${def.icon}</span><span class="text-[9px] font-bold ${c}">${s}${val}%</span></span>`;
      });

    const elSection = elChips.length > 0 ? `
      <div class="flex items-start gap-1.5">
        <span class="text-[8px] text-gray-500 font-bold shrink-0 pt-[2px] w-8 leading-tight">${elLabel}</span>
        <div class="flex flex-wrap gap-0.5">${elChips.join('')}</div>
      </div>` : '';

    const ailSection = ailChips.length > 0 ? `
      <div class="flex items-start gap-1.5">
        <span class="text-[8px] text-gray-500 font-bold shrink-0 pt-[2px] w-8 leading-tight">${ailLabel}</span>
        <div class="flex flex-wrap gap-0.5">${ailChips.join('')}</div>
      </div>` : '';

    return `
      <div class="flex gap-1 shrink-0">${statsChips}</div>
      ${(elSection || ailSection) ? `<div class="flex flex-col gap-1 mt-1">${elSection}${ailSection}</div>` : ''}
    `;
  };

  const renderContent = () => {
    // --- Sort groupedItems ---
    groupedItems.sort((a, b) => {
      if (sortKey) {
        const aVal = (a.representative.stats && a.representative.stats[sortKey]) || 0;
        const bVal = (b.representative.stats && b.representative.stats[sortKey]) || 0;
        if (aVal !== bVal) {
          return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
        }
      }
      // Fallback to ID sorting
      return a.baseId.localeCompare(b.baseId);
    });

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = groupedItems.slice(startIdx, startIdx + ITEMS_PER_PAGE);
    
    // Fill empty slots for grid consistency
    const gridItems = [...pageItems];
    while (gridItems.length < ITEMS_PER_PAGE) {
      gridItems.push(null);
    }

    const gridHtml = gridItems.map((group, idx) => {
      if (!group) {
        return `<div class="aspect-square rounded-lg bg-gray-800/30 border border-dashed border-gray-700/30"></div>`;
      }
      
      const item = group.representative;
      const isSelected = selectedGroup && selectedGroup.baseId === group.baseId;
      
      let innerContent = '';
      if (item.image) {
        innerContent = `<img src="${item.image}" class="w-3/4 h-3/4 object-contain drop-shadow-md" alt=""  onerror="this.style.display='none'" />`;
      } else {
        innerContent = `<span class="material-symbols-outlined text-2xl text-gray-300 drop-shadow-md">${item.icon}</span>`;
      }

      // Count badge
      const countBadge = group.count > 1 
        ? `<div class="absolute bottom-0 right-0 bg-black/80 text-[8px] text-white font-bold px-1 rounded-tl shadow-sm z-10">x${formatNumber(group.count)}</div>` 
        : '';

      // Equipped indicator
      const equippedBadge = group.equippedCount > 0 
        ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border border-gray-900 shadow-sm z-10"></div>' 
        : '';

      return `
        <div data-idx="${startIdx + idx}" 
             class="item-slot relative aspect-square rounded-lg cursor-pointer transition-all duration-200
                    flex items-center justify-center
                    ${isSelected 
                      ? 'bg-blue-900/40 border-2 border-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.4)] scale-105 z-10' 
                      : 'bg-gray-800/60 border border-gray-600/50 hover:bg-gray-700/80 hover:border-gray-400'}">
          ${innerContent}
          ${countBadge}
          ${equippedBadge}
        </div>
      `;
    }).join('');

    // Determine selected item and equip state
    const selectedItem = selectedGroup ? selectedGroup.representative : null;
    const isCurrentlyEquipped = selectedGroup 
      ? selectedGroup.instances.some(i => i.id === character.equipment[targetSlot]) 
      : false;
    // Find the actual equipped instance for unequip
    const equippedInstance = selectedGroup 
      ? selectedGroup.instances.find(i => i.id === character.equipment[targetSlot]) 
      : null;
    // Find a non-equipped instance for equip
    const freeInstance = selectedGroup 
      ? selectedGroup.instances.find(i => !equippedIds.includes(i.id)) 
      : null;

    // Equip/Unequip buttons
    let actionBtns = '';
    if (selectedGroup) {
      const unequipBtn = isCurrentlyEquipped
        ? `<button id="btn-unequip" class="py-1 px-3 bg-red-900/60 hover:bg-red-800/80 text-red-100 rounded border border-red-700/50 transition-all active:scale-95 shadow text-[10px] font-bold">外す</button>`
        : '';
      const equipBtn = freeInstance
        ? `<button id="btn-equip" class="py-1 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded border border-blue-400/30 transition-all active:scale-95 shadow text-[10px] font-bold">装備する</button>`
        : '';
      actionBtns = `${equipBtn}${unequipBtn}`;
    }

    modalContainer.innerHTML = `
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-gray-700/50 relative z-20">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full overflow-hidden border border-gray-600 shrink-0 bg-gray-800">
              <img src="${character.iconImage}" class="w-full h-full object-contain"  onerror="this.style.display='none'" />
            </div>
            <div>
              <div class="text-sm font-bold text-gray-100 leading-tight">装備変更</div>
            </div>
          </div>
          <button id="eq-modal-close" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <!-- Selected Item Detail (Top Area) -->
        <div class="px-3 pt-2.5 pb-2 bg-gray-800/30 border-b border-gray-700/50 shrink-0 flex flex-col gap-1.5">
          <!-- Row 1: icon + name + count + action buttons -->
          <div class="flex items-center gap-2">
            <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 border border-gray-600 shadow-inner 
                        flex items-center justify-center shrink-0 overflow-hidden">
              ${selectedItem ? 
                  (selectedItem.image 
                    ? `<img src="${selectedItem.image}" class="w-8 h-8 object-contain drop-shadow-md"  onerror="this.style.display='none'" />` 
                    : `<span class="material-symbols-outlined text-xl text-gray-200 drop-shadow-md">${selectedItem.icon}</span>`) 
                  : '<span class="material-symbols-outlined text-lg text-gray-600">remove</span>'
              }
            </div>
            <div class="flex flex-col min-w-0 flex-1">
              <div class="flex items-center min-w-0 flex-wrap gap-y-0.5">
                <div class="text-[13px] font-bold text-gray-100 leading-tight shrink-0 mr-1.5 truncate max-w-full">
                  ${selectedItem ? selectedItem.name : '---'}
                  ${selectedGroup && selectedGroup.count > 1 ? `<span class="text-[10px] text-gray-400 ml-1 font-normal">x${formatNumber(selectedGroup.count)}</span>` : ''}
                </div>
              </div>
              ${selectedItem ? `<div class="text-[10px] text-gray-500 leading-tight mt-0.5">${EQUIPMENT_SLOTS.find(s => s.key === selectedItem.slot || (selectedItem.slot === 'accessory' && s.key.startsWith('accessory')))?.label || selectedItem.slot}</div>` : ''}
            </div>
            <div class="flex items-center gap-1 shrink-0">
              ${actionBtns}
            </div>
          </div>
          <!-- Ability Info Removed -->
          <!-- Row 2: Stats + element/ailment chips -->
          ${renderDetailPanel(selectedGroup)}
        </div>

        <!-- Sort Buttons (Middle Area) -->
        <div class="flex items-center gap-1 px-3 py-2 bg-gray-900/40 border-b border-gray-700/30 shrink-0">
          ${STAT_KEYS.map(stat => {
            const isSelected = sortKey === stat.key;
            const orderIcon = isSelected 
              ? (sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward') 
              : '';
            return `
              <button data-sort="${stat.key}" class="sort-btn flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 rounded-lg border transition-colors ${isSelected ? 'border-blue-400 bg-blue-900/40' : 'border-gray-700 bg-gray-800/80 hover:bg-gray-700'}">
                <span class="material-symbols-outlined ${stat.color}" style="font-size: 14px;">${stat.icon}</span>
                <div class="flex items-center mt-0.5">
                  <span class="text-[9px] text-gray-300 font-bold leading-none">${stat.label}</span>
                  ${isSelected ? `<span class="material-symbols-outlined text-blue-300 ml-0.5" style="font-size: 10px;">${orderIcon}</span>` : ''}
                </div>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Grid (Bottom Area) -->
        <div class="flex-1 p-3 overflow-y-auto custom-scrollbar bg-[#0b0b19]">
          <div class="grid grid-cols-5 gap-2">
            ${gridHtml}
          </div>
        </div>

        <!-- Pagination (Bottom Bar) -->
        <div class="flex items-center justify-between px-4 py-2 bg-gray-900/40 border-t border-gray-700/30 shrink-0">
          <button id="eq-page-prev" class="p-1 rounded-lg hover:bg-gray-700/50 text-gray-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" ${currentPage === 1 ? 'disabled' : ''}>
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <span class="text-xs font-mono text-gray-400 tracking-widest">PAGE <span class="text-gray-200 font-bold">${currentPage}</span> / ${totalPages}</span>
          <button id="eq-page-next" class="p-1 rounded-lg hover:bg-gray-700/50 text-gray-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" ${currentPage === totalPages ? 'disabled' : ''}>
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
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

    const sortBtns = overlay.querySelectorAll('.sort-btn');
    sortBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const clickedKey = e.currentTarget.getAttribute('data-sort');
        if (sortKey === clickedKey) {
          sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
        } else {
          sortKey = clickedKey;
          sortOrder = 'desc';
        }
        currentPage = 1;
        renderContent();
      });
    });

    const slots = overlay.querySelectorAll('.item-slot');
    slots.forEach(slot => {
      slot.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        if (!isNaN(idx) && groupedItems[idx]) {
          selectedGroup = groupedItems[idx];
          renderContent();
        }
      });
    });

    const btnEquip = document.getElementById('btn-equip');
    if (btnEquip && freeInstance) {
      btnEquip.addEventListener('click', async () => {
        const equipmentMap = buildEquipmentMap(allEquipment);
        const statsBefore = calcFinalStats(character, equipmentMap);

        // Equip item
        character.equipment[targetSlot] = freeInstance.id;

        const statsAfter = calcFinalStats(character, equipmentMap);
        const hpDiff = statsAfter.hp - statsBefore.hp;
        if (hpDiff !== 0) {
          character.hp.current = Math.max(1, character.hp.current + hpDiff);
          character.hp.current = Math.min(character.hp.current, statsAfter.hp);
        }
        const mpDiff = statsAfter.mp - statsBefore.mp;
        if (mpDiff !== 0) {
          character.mp.current = Math.max(0, character.mp.current + mpDiff);
          character.mp.current = Math.min(character.mp.current, statsAfter.mp);
        }

        await GameDB.putCharacter(character);
        overlay.remove();
        if (onEquipmentChanged) onEquipmentChanged();
      });
    }

    const btnUnequip = document.getElementById('btn-unequip');
    if (btnUnequip && equippedInstance) {
      btnUnequip.addEventListener('click', async () => {
        const equipmentMap = buildEquipmentMap(allEquipment);
        const statsBefore = calcFinalStats(character, equipmentMap);

        // Unequip item
        character.equipment[targetSlot] = null;

        const statsAfter = calcFinalStats(character, equipmentMap);
        const hpDiff = statsAfter.hp - statsBefore.hp;
        if (hpDiff !== 0) {
          character.hp.current = Math.max(1, character.hp.current + hpDiff);
          character.hp.current = Math.min(character.hp.current, statsAfter.hp);
        }
        const mpDiff = statsAfter.mp - statsBefore.mp;
        if (mpDiff !== 0) {
          character.mp.current = Math.max(0, character.mp.current + mpDiff);
          character.mp.current = Math.min(character.mp.current, statsAfter.mp);
        }

        await GameDB.putCharacter(character);
        overlay.remove();
        if (onEquipmentChanged) onEquipmentChanged();
      });
    }
  };

  document.body.appendChild(overlay);
  renderContent();
}
