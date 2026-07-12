import { GameDB } from '../../data/database.js';
import { STAT_KEYS } from '../../data/constants.js';
import { calcItemsPerPage, observePageSize } from '../../data/page-utils.js';
import { formatNumber } from '../../utils/format.js';
import { showSettingsModal } from '../../components/settings-modal.js';

const STORAGE_SETTINGS_KEYS = {
  viewMode: 'shop.storage.viewMode',
};

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
 * 倉庫（所持品）タブ
 */
export function renderStorageTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full animate-fade-in overflow-hidden';

  // 状態管理
  let items = [];
  let activeFilter = 'all';
  const storedViewMode = localStorage.getItem(STORAGE_SETTINGS_KEYS.viewMode);
  let viewMode = storedViewMode === 'list' ? 'list' : 'grid'; // 'grid' | 'list'
  let currentPage = 1;

  const FILTERS = [
    { id: 'all', icon: 'apps' },
    { id: 'weapon', icon: 'swords' },
    { id: 'shield', icon: 'shield' },
    { id: 'armor', icon: 'checkroom' },
    { id: 'accessory', icon: 'diamond' },
    { id: 'material', icon: 'category' }
  ];

  // トップバー領域
  const topBar = document.createElement('div');
  topBar.className = 'flex items-center justify-between gap-2 mb-4 shrink-0 pt-2 px-2';

  const filterContainer = document.createElement('div');
  filterContainer.className = 'flex items-center gap-2 overflow-x-auto no-scrollbar pb-1';

  const renderFilters = () => {
    filterContainer.innerHTML = '';
    FILTERS.forEach(f => {
      const btn = document.createElement('button');
      const isActive = activeFilter === f.id;
      btn.className = `
        flex items-center justify-center w-10 h-10 rounded-lg transition-colors shrink-0 border
        ${isActive 
          ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]' 
          : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-gray-200'}
      `;
      btn.innerHTML = `<span class="material-symbols-outlined text-[20px]">${f.icon}</span>`;
      btn.onclick = () => {
        if (activeFilter !== f.id) {
          activeFilter = f.id;
          currentPage = 1;
          renderFilters();
          renderGrid();
        }
      };
      filterContainer.appendChild(btn);
    });
  };

  const rightControls = document.createElement('div');
  rightControls.className = 'flex items-center gap-2 shrink-0';

  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800/60 border border-gray-700/60 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 transition-colors cursor-pointer shadow-sm';
  settingsBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">settings</span>';
  settingsBtn.onclick = () => {
    showSettingsModal({
      items: [
        {
          id: 'viewMode', label: '表示形式', type: 'radio', icon: 'grid_view', activeColor: 'bg-blue-600 text-white',
          getValue: () => viewMode,
          options: [{icon: 'grid_view', value: 'grid'}, {icon: 'view_list', value: 'list'}],
          onChange: (val) => { viewMode = val; localStorage.setItem(STORAGE_SETTINGS_KEYS.viewMode, val); currentPage = 1; renderGrid(); }
        }
      ]
    });
  };
  rightControls.appendChild(settingsBtn);

  topBar.appendChild(filterContainer);
  topBar.appendChild(rightControls);

  // グリッド領域
  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'overflow-y-auto flex-1 pb-6 px-2';

  const gridContainer = document.createElement('div');
  
  scrollContainer.appendChild(gridContainer);

  const paginationContainer = document.createElement('div');
  paginationContainer.className = 'flex items-center justify-center gap-4 py-2 shrink-0 bg-slate-950/80 border-t border-slate-800 pb-4';

  const renderPagination = (totalPages) => {
    paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;
    
    const prevBtn = document.createElement('button');
    prevBtn.className = `w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${currentPage > 1 ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer' : 'bg-slate-900 text-slate-600 cursor-not-allowed'}`;
    prevBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">chevron_left</span>';
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderGrid();
        scrollContainer.scrollTop = 0;
      }
    };

    const info = document.createElement('div');
    info.className = 'text-xs font-bold text-slate-400 font-mono tracking-widest';
    info.textContent = `${currentPage} / ${totalPages}`;

    const nextBtn = document.createElement('button');
    nextBtn.className = `w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${currentPage < totalPages ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer' : 'bg-slate-900 text-slate-600 cursor-not-allowed'}`;
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
    const measuredItemContainer = gridContainer.dataset.viewMode === viewMode ? gridContainer : null;
    gridContainer.innerHTML = '';
    
    if (viewMode === 'grid') {
      gridContainer.className = 'grid grid-cols-5 gap-1.5 content-start';
    } else {
      gridContainer.className = 'flex flex-col gap-2 content-start';
    }
    gridContainer.dataset.viewMode = viewMode;
    
    const filteredItems = activeFilter === 'all' 
      ? items 
      : items.filter(item => {
          if (activeFilter === 'weapon') return item.slot === 'rightHand';
          if (activeFilter === 'shield') return item.slot === 'leftHand';
          if (activeFilter === 'armor') return item.slot === 'armor';
          if (activeFilter === 'accessory') return item.slot === 'accessory';
          if (activeFilter === 'material') return !item.slot;
          return true;
        });

    const ITEMS_PER_PAGE = calcItemsPerPage({ viewMode, scrollContainer, itemContainer: measuredItemContainer, listItemHeight: 64, gridItemHeight: 76, gridCols: 5 });
    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (filteredItems.length === 0) {
      gridContainer.innerHTML = `<div class="col-span-full text-center text-gray-500 text-sm mt-8">所持しているアイテムがありません</div>`;
      renderPagination(1);
      return;
    }

    pageItems.forEach(item => {
      const slot = document.createElement('div');
      
      if (viewMode === 'grid') {
        slot.className = 'relative w-full aspect-square flex items-center justify-center rounded-md border border-gray-700/50 hover:border-gray-500 hover:bg-gray-800 bg-gray-900/60 overflow-hidden cursor-pointer transition-all shadow-sm';
        
        if (item.image) {
          slot.innerHTML = `<img src="${item.image}" alt="" class="w-full h-full object-cover" onerror="this.style.display='none'">`;
        } else {
          slot.innerHTML = `<span class="material-symbols-outlined text-gray-600 text-lg">category</span>`;
        }
        
        if (item.quantity && item.quantity > 1) {
          slot.innerHTML += `<div class="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1 rounded border border-gray-600 shadow-sm leading-tight">x${formatNumber(item.quantity)}</div>`;
        }
      } else {
        // list view
        slot.className = 'group relative w-full flex items-center gap-2.5 p-2 bg-gradient-to-r from-slate-900/90 to-slate-800/50 rounded-lg border border-slate-700/80 hover:border-blue-500/50 hover:shadow-[0_0_10px_rgba(59,130,246,0.15)] transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-sm';
        
        const activeStats = STAT_KEYS.filter(stat => item.stats && (item.stats[stat.key] || 0) !== 0);
        const statsHtml = activeStats.map(stat => {
          return `<div class="flex items-center shrink-0"><span class="material-symbols-outlined ${stat.color} mr-0.5" style="font-size: 11px; font-variation-settings: 'FILL' 1">${stat.icon}</span><span class="text-slate-200 font-mono font-bold drop-shadow-sm" style="font-size: 10px;">${item.stats[stat.key]}</span></div>`;
        }).join('');
        
        const elements = item.elements || {};
        const elHtml = Object.keys(ELEMENT_ICONS)
          .filter(k => (elements[k] || 0) !== 0)
          .map(k => {
            const val = elements[k];
            const def = ELEMENT_ICONS[k];
            const colorClass = val > 0 ? 'text-emerald-400' : 'text-rose-400';
            return `<div class="flex items-center shrink-0"><span class="material-symbols-outlined ${def.color} mr-0.5" style="font-size: 11px;">${def.icon}</span><span class="${colorClass} font-mono font-bold drop-shadow-sm" style="font-size: 10px;">${val > 0 ? '+' : ''}${val}%</span></div>`;
          }).join('');

        const ailments = item.ailments || {};
        const ailHtml = Object.keys(AILMENT_ICONS)
          .filter(k => (ailments[k] || 0) !== 0)
          .map(k => {
            const val = ailments[k];
            const def = AILMENT_ICONS[k];
            const colorClass = val > 0 ? 'text-emerald-400' : 'text-rose-400';
            return `<div class="flex items-center shrink-0"><span class="material-symbols-outlined ${def.color} mr-0.5" style="font-size: 11px;">${def.icon}</span><span class="${colorClass} font-mono font-bold drop-shadow-sm" style="font-size: 10px;">${val > 0 ? '+' : ''}${val}%</span></div>`;
          }).join('');

        const performanceParts = [statsHtml, elHtml, ailHtml].filter(Boolean);
        const performanceHtml = performanceParts.join('<div class="w-px h-2 bg-slate-700/60 mx-1 shrink-0"></div>');

        let slotLabel = '素材';
        let slotColor = 'text-slate-400';
        if (item.slot === 'rightHand') { slotLabel = '武器'; slotColor = 'text-rose-400'; }
        else if (item.slot === 'leftHand') { slotLabel = '盾'; slotColor = 'text-blue-400'; }
        else if (item.slot === 'armor') { slotLabel = '防具'; slotColor = 'text-indigo-400'; }
        else if (item.slot === 'accessory') { slotLabel = '装飾品'; slotColor = 'text-amber-400'; }

        let imgHtml = '';
        if (item.image) {
          imgHtml = `<img src="${item.image}" alt="" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" onerror="this.style.display='none'">`;
        } else {
          imgHtml = `<span class="material-symbols-outlined text-slate-500 text-2xl">category</span>`;
        }

        const quantityText = (item.quantity && item.quantity > 1) ? `x${formatNumber(item.quantity)}` : (item.quantity === 1 ? 'x1' : '');

        slot.innerHTML = `
          <div class="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          <div class="w-9 h-9 shrink-0 relative flex items-center justify-center rounded-md bg-slate-950 border border-slate-700/80 shadow-inner overflow-hidden z-10">
            ${imgHtml}
          </div>
          
          <div class="flex-1 min-w-0 flex flex-col justify-center py-0.5 z-10">
            <div class="flex items-baseline gap-1.5 mb-1">
              <span class="${slotColor} font-bold tracking-widest shrink-0" style="font-size: 9px;">${slotLabel}</span>
              <span class="text-slate-100 font-black truncate group-hover:text-blue-200 drop-shadow-md transition-colors leading-none" style="font-size: 12px;">${item.name}</span>
            </div>
            
            <div class="flex items-center gap-1 overflow-hidden whitespace-nowrap" style="-webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%); mask-image: linear-gradient(to right, black 90%, transparent 100%);">
              ${performanceHtml || '<span class="text-slate-500 italic" style="font-size: 10px;">性能変化なし</span>'}
            </div>
          </div>
          
          <div class="shrink-0 flex flex-col items-end justify-center gap-1 pl-2 ml-1 border-l border-slate-700/50 z-10 min-w-[3.5rem]">
            <div class="flex items-center gap-1.5">
              <span class="text-slate-500 font-bold uppercase tracking-widest" style="font-size: 8px;">所持</span>
              <span class="text-cyan-400 font-mono font-bold leading-none drop-shadow-sm" style="font-size: 11px;">${quantityText || '-'}</span>
            </div>
          </div>
        `;
      }
      
      slot.onclick = () => showItemModal(item);
      gridContainer.appendChild(slot);
    });
    
    renderPagination(totalPages);
    if (!measuredItemContainer) requestAnimationFrame(renderGrid);
  };

  const loadData = () => {
    Promise.all([
      GameDB.getWarehouseEquipment(),
      GameDB.getAllInventory()
    ]).then(([eq, inv]) => {
      const groupedEquipment = {};
      eq.forEach(item => {
        if (!groupedEquipment[item.name]) {
          groupedEquipment[item.name] = { ...item, quantity: 1, _ids: [item.id] };
        } else {
          groupedEquipment[item.name].quantity += 1;
          groupedEquipment[item.name]._ids.push(item.id);
        }
      });
      
      items = [...Object.values(groupedEquipment), ...inv];
      renderGrid();
    });
  };

  const showItemModal = (item) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in px-4';
    
    const modal = document.createElement('div');
    modal.className = 'bg-[#0c0d19] border border-slate-800 rounded-2xl w-full max-w-[390px] shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] shadow-rose-500/10 flex flex-col overflow-hidden animate-[slide-up_0.25s_cubic-bezier(0.16,1,0.3,1)]';
    
    // Header
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center px-4 py-3 border-b border-slate-800/80 bg-slate-900/40 shrink-0';
    header.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-rose-400 text-lg">info</span>
        <span class="font-bold text-gray-200 text-sm tracking-wider uppercase">アイテム詳細</span>
      </div>
      <button class="text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center transition-all cursor-pointer" id="close-modal-btn">
        <span class="material-symbols-outlined text-lg">close</span>
      </button>
    `;
      
    // Body
    const body = document.createElement('div');
    body.className = 'p-4 flex flex-col gap-3.5 max-h-[82vh] overflow-y-auto';
    
    // --- Elements: only non-zero, compact chips ---
    const elements = item.elements || {};
    const isWeapon = item.slot === 'rightHand';
    const elLabel = isWeapon ? '属性攻撃' : '属性防御';
    const elChips = Object.keys(ELEMENT_ICONS)
      .filter(k => (elements[k] || 0) !== 0)
      .map(k => {
        const val = elements[k];
        const def = ELEMENT_ICONS[k];
        const c = val > 0 ? 'text-emerald-400' : 'text-rose-400';
        const s = val > 0 ? '+' : '';
        return `
          <span class="inline-flex items-center gap-0.5 bg-slate-900/60 rounded px-1.5 py-[2px] border border-slate-800/50">
            <span class="material-symbols-outlined text-[10px] ${def.color} leading-none">${def.icon}</span>
            <span class="text-[9px] font-bold ${c} leading-none font-mono">${s}${val}%</span>
          </span>
        `;
      });

    // --- Ailments: only non-zero, compact chips ---
    const ailments = item.ailments || {};
    const ailLabel = isWeapon ? '状態異常付与' : '状態異常耐性';
    const ailChips = Object.keys(AILMENT_ICONS)
      .filter(k => (ailments[k] || 0) !== 0)
      .map(k => {
        const val = ailments[k];
        const def = AILMENT_ICONS[k];
        const c = val > 0 ? 'text-emerald-400' : 'text-rose-400';
        const s = val > 0 ? '+' : '';
        return `
          <span class="inline-flex items-center gap-0.5 bg-slate-900/60 rounded px-1.5 py-[2px] border border-slate-800/50">
            <span class="material-symbols-outlined text-[10px] ${def.color} leading-none">${def.icon}</span>
            <span class="text-[9px] font-bold ${c} leading-none font-mono">${s}${val}%</span>
          </span>
        `;
      });

    const elSection = elChips.length > 0 ? `
      <div class="flex flex-col gap-1 mt-1">
        <span class="text-[8px] text-slate-500 font-bold leading-none uppercase tracking-wider">${elLabel}</span>
        <div class="flex flex-wrap gap-1">${elChips.join('')}</div>
      </div>` : '';

    const ailSection = ailChips.length > 0 ? `
      <div class="flex flex-col gap-1 mt-1">
        <span class="text-[8px] text-slate-500 font-bold leading-none uppercase tracking-wider">${ailLabel}</span>
        <div class="flex flex-wrap gap-1">${ailChips.join('')}</div>
      </div>` : '';

    // Filter out status display with value 0
    const activeStats = STAT_KEYS.filter(stat => item.stats && (item.stats[stat.key] || 0) !== 0);
    const statsHtml = activeStats.length > 0
      ? `<div class="grid grid-cols-2 gap-1.5 w-full">` + activeStats.map(stat => {
          const val = item.stats[stat.key];
          return `
            <div class="flex items-center justify-between min-w-0 bg-slate-900/60 rounded px-2 py-1 border border-slate-800/40">
              <div class="flex items-center gap-1 min-w-0">
                <span class="material-symbols-outlined ${stat.color} text-[11px] leading-none" style="font-variation-settings: 'FILL' 1">${stat.icon}</span>
                <span class="text-[9px] text-slate-400 font-bold leading-none truncate">${stat.label}</span>
              </div>
              <span class="text-[11px] font-black text-slate-100 leading-none pl-1">${val}</span>
            </div>
          `;
        }).join('') + `</div>`
      : `<div class="text-[10px] text-slate-500 italic text-center py-2 bg-slate-900/30 rounded border border-slate-900/40">${item.slot ? '性能変化なし' : '素材アイテム<br>特殊な効果はありません。'}</div>`;

    const abilityHtml = '';

    const itemImgClass = 'w-full h-full object-cover';

    let slotLabel = '素材';
    let slotColor = 'bg-slate-800/80 text-slate-400 border-slate-700/50';
    if (item.slot === 'rightHand') {
      slotLabel = '武器';
      slotColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    } else if (item.slot === 'leftHand') {
      slotLabel = '盾';
      slotColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    } else if (item.slot === 'armor') {
      slotLabel = '防具';
      slotColor = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    } else if (item.slot === 'accessory') {
      slotLabel = '装飾品';
      slotColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }

    const topSection = `
      <div class="flex gap-3 shrink-0">
        <div class="flex flex-col items-center gap-2 w-1/3 shrink-0">
          <div class="relative w-20 h-20 bg-gradient-to-b from-slate-950 to-slate-900 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner group">
            ${item.image ? `<img src="${item.image}" class="${itemImgClass}" onerror="this.style.display='none'">` : `<span class="material-symbols-outlined text-3xl text-slate-650">category</span>`}
          </div>
          <div class="flex flex-col items-center gap-1 w-full">
            <span class="px-2 py-0.5 rounded text-[9px] font-black border ${slotColor}">${slotLabel}</span>
            <div class="text-xs font-black text-center text-slate-100 tracking-wide w-full break-words leading-tight">${item.name}</div>
          </div>
        </div>
        <div class="flex-1 bg-slate-950/40 border border-slate-800/80 p-3 rounded-xl flex flex-col min-w-0">
          <div class="text-[9px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 pb-1 border-b border-slate-800/40">性能表示</div>
          ${statsHtml}
          ${(elSection || ailSection) ? `<div class="flex flex-col gap-1.5 mt-1.5">${elSection}${ailSection}</div>` : ''}
        </div>
      </div>
      ${abilityHtml}
    `;
    
    body.innerHTML = topSection;
    
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Event Listeners
    const closeModal = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if(e.target === overlay) closeModal(); });
    modal.querySelector('#close-modal-btn').onclick = closeModal;
    
  };

  container.appendChild(topBar);
  container.appendChild(scrollContainer);
  container.appendChild(paginationContainer);

  observePageSize(scrollContainer, renderGrid);

  renderFilters();
  loadData();

  return container;
}
