import { GameDB } from '../../data/database.js';
import { WEAPONS } from '../../definitions/weapons.js';
import { ARMORS } from '../../definitions/armors.js';
import { SHIELDS } from '../../definitions/shields.js';
import { ACCESSORIES } from '../../definitions/accessories.js';
import { MATERIALS } from '../../definitions/materials.js';
import { STAT_KEYS } from '../../data/constants.js';

const ALL_DEFINITIONS = [...WEAPONS, ...ARMORS, ...SHIELDS, ...ACCESSORIES, ...MATERIALS];

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
 * ショップ（合成・作成）タブ
 * 
 * SHOPとして素材を消費して装備を合成（購入）できる機能です。
 * レシピを持つすべての装備アイテムが表示され、
 * 必要素材とゴールドが揃っていれば合成できます。
 */
export function renderShopTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full animate-fade-in overflow-hidden';

  // 状態管理
  let allRecipeItems = [];
  let inventoryMap = {};
  let currentGold = 0;
  let currentEquipmentCount = 0;
  let equipmentCountMap = {};
  let activeFilter = 'all';
  let viewMode = 'grid'; // 'grid' | 'list'
  let currentPage = 1;

  const FILTERS = [
    { id: 'all', icon: 'apps' },
    { id: 'weapon', icon: 'swords' },
    { id: 'shield', icon: 'shield' },
    { id: 'armor', icon: 'checkroom' },
    { id: 'accessory', icon: 'diamond' },
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
          ? 'bg-green-600 text-white border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' 
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
  rightControls.className = 'flex items-center gap-3 shrink-0';

  // View Mode Toggles
  const viewModeContainer = document.createElement('div');
  viewModeContainer.className = 'flex items-center bg-gray-800/40 border border-gray-700/60 rounded-lg overflow-hidden shrink-0 h-10';

  const updateViewModeUI = () => {
    viewModeContainer.innerHTML = '';
    
    const gridBtn = document.createElement('button');
    gridBtn.className = `flex items-center justify-center w-8 h-full transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-gray-700 text-emerald-400' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}`;
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
    listBtn.className = `flex items-center justify-center w-8 h-full transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-gray-700 text-emerald-400' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}`;
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

  topBar.appendChild(filterContainer);
  topBar.appendChild(rightControls);

  // グリッド領域
  // モンスター図鑑と同じシルエットフィルター
  const SILHOUETTE_FILTER = 'brightness-[0.07] saturate-0 drop-shadow-[0_0_3px_rgba(160,170,220,0.8)]';

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
    gridContainer.innerHTML = '';
    
    if (viewMode === 'grid') {
      gridContainer.className = 'grid grid-cols-5 gap-1.5 content-start';
    } else {
      gridContainer.className = 'flex flex-col gap-2 content-start';
    }
    
    let filteredItems = activeFilter === 'all' 
      ? allRecipeItems 
      : allRecipeItems.filter(item => {
          if (activeFilter === 'weapon') return item.slot === 'rightHand';
          if (activeFilter === 'shield') return item.slot === 'leftHand';
          if (activeFilter === 'armor') return item.slot === 'armor';
          if (activeFilter === 'accessory') return item.slot === 'accessory';
          return true;
        });

    filteredItems = filteredItems.filter(item => checkCanCraft(item));

    const ITEMS_PER_PAGE = viewMode === 'grid' ? 25 : 5;
    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (filteredItems.length === 0) {
      gridContainer.innerHTML = `<div class="col-span-full text-center text-gray-500 text-sm mt-8">合成可能なアイテムがありません</div>`;
      renderPagination(1);
      return;
    }

    pageItems.forEach(item => {
      const canCraft = checkCanCraft(item);
      const slot = document.createElement('div');
      
      if (viewMode === 'grid') {
        slot.className = `relative w-full aspect-square flex items-center justify-center bg-gray-900/60 rounded-md border ${canCraft ? 'border-gray-700/50 hover:border-gray-500 hover:bg-gray-800' : 'border-gray-700/80'} overflow-hidden transition-all shadow-sm cursor-pointer`;
        
        if (item.image) {
          const imgClass = canCraft ? 'w-full h-full object-cover' : `w-full h-full object-cover ${SILHOUETTE_FILTER}`;
          slot.innerHTML = `<img src="${item.image}" alt="" class="${imgClass}" onerror="this.style.display='none'">`;
        } else {
          const iconClass = canCraft ? 'material-symbols-outlined text-gray-500 text-lg' : 'material-symbols-outlined text-gray-800 text-lg';
          slot.innerHTML = `<span class="${iconClass}">category</span>`;
        }
      } else {
        // list view
        slot.className = `relative w-full flex flex-row items-center gap-3 p-2.5 bg-gray-900/60 rounded-md border ${canCraft ? 'border-gray-700/50 hover:border-gray-500 hover:bg-gray-800' : 'border-gray-700/80'} transition-all shadow-sm cursor-pointer`;
        
        const activeStats = STAT_KEYS.filter(stat => item.stats && (item.stats[stat.key] || 0) !== 0);
        const statsHtml = activeStats.map(stat => {
          return `<span class="inline-flex items-center gap-0.5"><span class="material-symbols-outlined ${stat.color} text-[11px]" style="font-variation-settings: 'FILL' 1">${stat.icon}</span><span class="text-[11px] text-gray-300 font-bold">${item.stats[stat.key]}</span></span>`;
        }).join('<span class="text-gray-600/60 mx-1.5 leading-none font-light">|</span>');
        
        const elements = item.elements || {};
        const elHtml = Object.keys(ELEMENT_ICONS)
          .filter(k => (elements[k] || 0) !== 0)
          .map(k => {
            const val = elements[k];
            const def = ELEMENT_ICONS[k];
            const colorClass = val > 0 ? 'text-emerald-400' : 'text-rose-400';
            return `<span class="inline-flex items-center gap-0.5"><span class="material-symbols-outlined text-[11px] ${def.color}">${def.icon}</span><span class="text-[11px] ${colorClass} font-bold">${val > 0 ? '+' : ''}${val}%</span></span>`;
          }).join('<span class="text-gray-600/60 mx-1.5 leading-none font-light">|</span>');

        const ailments = item.ailments || {};
        const ailHtml = Object.keys(AILMENT_ICONS)
          .filter(k => (ailments[k] || 0) !== 0)
          .map(k => {
            const val = ailments[k];
            const def = AILMENT_ICONS[k];
            const colorClass = val > 0 ? 'text-emerald-400' : 'text-rose-400';
            return `<span class="inline-flex items-center gap-0.5"><span class="material-symbols-outlined text-[11px] ${def.color}">${def.icon}</span><span class="text-[11px] ${colorClass} font-bold">${val > 0 ? '+' : ''}${val}%</span></span>`;
          }).join('<span class="text-gray-600/60 mx-1.5 leading-none font-light">|</span>');
          
        const performanceParts = [statsHtml, elHtml, ailHtml].filter(Boolean);
        let performanceHtml = performanceParts.join('<span class="text-gray-600/60 mx-1.5 leading-none font-light">||</span>');

        if (item.ability) {
           performanceHtml += `${performanceParts.length > 0 ? '<span class="text-gray-600/60 mx-1.5 leading-none font-light">||</span>' : ''}<span class="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold"><span class="material-symbols-outlined text-[12px]">star</span>${item.ability.name}</span>`;
        }

        let slotLabel = '素材';
        let slotColor = 'text-slate-400 bg-slate-800/80 border-slate-700/50';
        if (item.slot === 'rightHand') { slotLabel = '武器'; slotColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20'; }
        else if (item.slot === 'leftHand') { slotLabel = '盾'; slotColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20'; }
        else if (item.slot === 'armor') { slotLabel = '防具'; slotColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'; }
        else if (item.slot === 'accessory') { slotLabel = '装飾品'; slotColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20'; }

        let imgHtml = '';
        if (item.image) {
          const imgClass = canCraft ? 'w-11 h-11 rounded-md object-cover border border-gray-700/50 bg-gray-900 shadow-inner' : `w-11 h-11 rounded-md object-cover border border-gray-700/50 bg-gray-900 shadow-inner ${SILHOUETTE_FILTER}`;
          imgHtml = `<img src="${item.image}" alt="" class="${imgClass}" onerror="this.style.display='none'">`;
        } else {
          const iconClass = canCraft ? 'material-symbols-outlined text-gray-500 text-2xl' : 'material-symbols-outlined text-gray-800 text-2xl';
          imgHtml = `<div class="w-11 h-11 rounded-md border border-gray-700/50 flex items-center justify-center bg-gray-800/50 shrink-0 shadow-inner"><span class="${iconClass}">category</span></div>`;
        }

        slot.innerHTML = `
          <div class="shrink-0 relative">
            ${imgHtml}
          </div>
          <div class="flex flex-col min-w-0 flex-1 justify-center gap-1">
            <div class="flex items-center gap-2">
              <span class="text-[9px] font-black border px-1.5 py-0.5 rounded ${slotColor} leading-none shadow-sm">${slotLabel}</span>
              <span class="text-[13px] font-bold text-gray-100 truncate leading-tight">${item.name}</span>
            </div>
            <div class="flex items-center flex-wrap gap-y-1.5 mt-1">
              ${performanceHtml || '<span class="text-[10px] text-gray-500 italic">性能変化なし</span>'}
            </div>
          </div>
          <div class="flex flex-col items-end shrink-0 pl-3 border-l border-gray-800/60 ml-1 py-1">
            <span class="text-[9px] text-gray-500 font-bold mb-1 uppercase tracking-wider">合成費</span>
            <span class="text-[13px] text-amber-400 font-mono font-black tracking-wide">${item.recipe?.price ? item.recipe.price.toLocaleString() : 0} <span class="text-[10px] text-amber-500/80">G</span></span>
          </div>
        `;
      }

      slot.onclick = () => showCraftModal(item);
      gridContainer.appendChild(slot);
    });
    
    renderPagination(totalPages);
  };

  /** 合成可能かチェック */
  const checkCanCraft = (item) => {
    if (!item.recipe) return false;
    if (currentGold < (item.recipe.price || 0)) return false;
    const isMaterial = !item.slot;
    const ownedCount = isMaterial ? (inventoryMap[item.id] || 0) : (equipmentCountMap[item.id] || 0);
    if (ownedCount >= 99999) return false;
    return item.recipe.materials.every(mat => (inventoryMap[mat.id] || 0) >= mat.amount);
  };

  /** 合成モーダルを表示 */
  const showCraftModal = async (item) => {
    const isMaterial = !item.slot;
    const ownedCount = isMaterial ? (inventoryMap[item.id] || 0) : (equipmentCountMap[item.id] || 0);
    
    // 計算: 最大合成可能数
    const price = item.recipe.price || 0;
    let maxCraft = 99999 - ownedCount;
    if (price > 0) {
      maxCraft = Math.min(maxCraft, Math.floor(currentGold / price));
    }
    item.recipe.materials.forEach(mat => {
      const owned = inventoryMap[mat.id] || 0;
      if (mat.amount > 0) {
        maxCraft = Math.min(maxCraft, Math.floor(owned / mat.amount));
      }
    });
    maxCraft = Math.max(0, maxCraft);
    let craftCount = maxCraft > 0 ? 1 : 0;

    // 取得済みアイテムリストを構築（シルエット判定用 — item-library と同じロジック）
    const [allEquipment, allInventory] = await Promise.all([
      GameDB.getAllEquipment(),
      GameDB.getAllInventory()
    ]);
    const acquiredIds = new Set();
    allEquipment.forEach(eq => acquiredIds.add(eq.baseId || eq.id));
    allInventory.forEach(inv => acquiredIds.add(inv.id));
    const discovered = await GameDB.getGameState('discovered_items') || [];
    discovered.forEach(id => acquiredIds.add(id));
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in px-4';
    
    const modal = document.createElement('div');
    modal.className = 'bg-[#0c0d19] border border-slate-800 rounded-2xl w-full max-w-[390px] shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] shadow-emerald-500/10 flex flex-col overflow-hidden animate-[slide-up_0.25s_cubic-bezier(0.16,1,0.3,1)]';
    
    // Header
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center px-4 py-3 border-b border-slate-800/80 bg-slate-900/40 shrink-0';
    header.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-emerald-400 text-lg">construction</span>
        <span class="font-bold text-gray-200 text-sm tracking-wider uppercase">合成 — SHOP</span>
      </div>
      <button class="text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center transition-all cursor-pointer" id="close-craft-modal">
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
      : '';

    const noEffectHtml = (!item.stats && elChips.length === 0 && ailChips.length === 0) || (activeStats.length === 0 && elChips.length === 0 && ailChips.length === 0)
      ? `<div class="text-[10px] text-slate-500 italic text-center py-2 bg-slate-900/30 rounded border border-slate-900/40">性能変化なし</div>`
      : '';

    const abilityHtml = item.ability ? `
      <div class="flex flex-col gap-1 p-3 bg-gradient-to-r from-amber-950/20 to-amber-900/10 border border-amber-700/20 rounded-xl relative overflow-hidden shadow-inner mt-1 shrink-0">
        <div class="flex items-center gap-1.5 mb-1 shrink-0">
          <div class="text-[9px] text-amber-300 font-black tracking-wide uppercase px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/25 rounded leading-none shadow-sm">${item.ability.name}</div>
          <span class="text-[8px] text-amber-500/80 font-bold uppercase tracking-wider">アビリティ</span>
        </div>
        <div class="text-[10px] text-slate-300 leading-normal break-words pl-0.5">${item.ability.description}</div>
      </div>
    ` : '';

    const canCraftAny = maxCraft > 0;
    const itemImgClass = canCraftAny ? 'w-full h-full object-cover' : `w-full h-full object-cover ${SILHOUETTE_FILTER}`;

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
          <div class="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-950/60 border border-slate-800/80 rounded-full text-[9px] text-slate-400 font-bold">所持: <span class="font-mono text-cyan-400 font-extrabold">${ownedCount}</span></div>
        </div>
        <div class="flex-1 bg-slate-950/40 border border-slate-800/80 p-3 rounded-xl flex flex-col min-w-0">
          <div class="text-[9px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 pb-1 border-b border-slate-800/40">性能表示</div>
          ${statsHtml}
          ${noEffectHtml}
          ${(elSection || ailSection) ? `<div class="flex flex-col gap-1.5 mt-1.5">${elSection}${ailSection}</div>` : ''}
        </div>
      </div>
      ${abilityHtml}
    `;

    // Middle section: Quantity Selector
    const middleSection = document.createElement('div');
    middleSection.className = 'bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 shrink-0';
    middleSection.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <span class="text-xs font-bold text-slate-400">合成数</span>
        <span class="text-[10px] text-slate-500 font-mono tracking-wider">最大: ${maxCraft} / 99999</span>
      </div>
      <div class="flex items-center gap-2">
        <button id="btn-minus" class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-800/85 border border-slate-700/50 text-slate-200 hover:bg-slate-700 hover:text-white hover:border-slate-600 active:scale-90 font-bold transition-all cursor-pointer">-</button>
        <div class="flex-1 text-center font-mono text-base font-black text-emerald-400 bg-slate-950 border border-slate-800 rounded-lg py-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]" id="craft-count-disp">${craftCount}</div>
        <button id="btn-plus" class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-800/85 border border-slate-700/50 text-slate-200 hover:bg-slate-700 hover:text-white hover:border-slate-600 active:scale-90 font-bold transition-all cursor-pointer">+</button>
        <button id="btn-max" class="px-3 h-8 flex items-center justify-center bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-xs font-bold text-emerald-400 hover:bg-emerald-900/60 active:scale-95 transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.05)]">MAX</button>
      </div>
    `;

    // 必要素材セクション
    const materialsSection = document.createElement('div');
    materialsSection.className = 'bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 shrink-0';
    
    // 合成ボタン
    const craftBtn = document.createElement('button');

    const updateCraftInfo = () => {
      const currentCraft = Math.max(1, craftCount);
      let materialsHtml = `
        <div class="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5 pb-1.5 border-b border-slate-800/60">
          <span class="material-symbols-outlined text-sm text-slate-500">inventory_2</span>必要素材
        </div>
      `;
      
      materialsHtml += `<div class="flex flex-col gap-2">`;
      item.recipe.materials.forEach(mat => {
        const matDef = ALL_DEFINITIONS.find(d => d.id === mat.id);
        const owned = inventoryMap[mat.id] || 0;
        const requiredAmount = mat.amount * currentCraft;
        const enough = owned >= requiredAmount;
        const matAcquired = acquiredIds.has(mat.id);
        const showMatSilhouette = !matAcquired;
        const matImgClass = showMatSilhouette ? `w-full h-full object-cover ${SILHOUETTE_FILTER}` : 'w-full h-full object-cover';
        

        materialsHtml += `
          <div class="flex items-center justify-between py-1.5 bg-slate-900/20 hover:bg-slate-900/30 rounded-xl px-2.5 border border-slate-800/30 transition-all duration-200">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-9 h-9 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                ${matDef && matDef.image ? `<img src="${matDef.image}" class="${matImgClass}" onerror="this.style.display='none'">` : `<span class="material-symbols-outlined text-slate-400 text-sm">category</span>`}
              </div>
              <div class="flex flex-col min-w-0">
                <div class="text-xs font-bold text-slate-200 truncate leading-tight mb-0.5">${matDef ? matDef.name : mat.id}</div>
                <div class="text-[10px] text-slate-500 font-bold leading-none">所持: <span class="font-mono font-black ${enough ? 'text-emerald-400' : 'text-rose-400'}">${owned}</span></div>
              </div>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <div class="text-right flex flex-col justify-center">
                <div class="text-[9px] text-slate-400 font-bold leading-none mb-0.5">必要数</div>
                <div class="text-xs font-mono font-black ${enough ? 'text-emerald-400' : 'text-rose-400'} leading-none">
                  ${requiredAmount}
                </div>
              </div>
              <div class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${enough ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.1)]'}">
                <span class="material-symbols-outlined text-[13px] font-black">${enough ? 'check' : 'close'}</span>
              </div>
            </div>
          </div>
        `;
      });
      materialsHtml += `</div>`;

      const totalCost = price * currentCraft;
      const hasEnoughGold = currentGold >= totalCost;
      materialsHtml += `
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-amber-500 text-sm" style="font-variation-settings: 'FILL' 1">paid</span>
            <span class="text-xs font-bold text-slate-400">合成費用</span>
          </div>
          <span class="text-sm font-black font-mono ${hasEnoughGold ? 'text-amber-400' : 'text-rose-400'}">${totalCost.toLocaleString()} G</span>
        </div>
      `;
      materialsSection.innerHTML = materialsHtml;

      if (ownedCount >= 99999) {
        craftBtn.disabled = true;
        craftBtn.className = 'w-full py-3 rounded-xl font-bold text-sm bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed flex justify-center items-center gap-2 transition-all shrink-0';
        craftBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">block</span>所持上限（99999個）に達しています`;
      } else if (craftCount > 0) {
        craftBtn.className = 'w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white transition-all active:scale-[0.98] flex justify-center items-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.4)] border border-emerald-400/20 cursor-pointer shrink-0';
        craftBtn.innerHTML = `<span class="material-symbols-outlined text-[18px] animate-pulse">construction</span>合成する（${craftCount}個）`;
      } else {
        craftBtn.className = 'w-full py-3 rounded-xl font-bold text-sm bg-slate-900 border border-slate-800/85 text-slate-600 cursor-not-allowed flex justify-center items-center gap-2 transition-all shrink-0';
        craftBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">lock</span>素材またはゴールドが不足しています`;
      }
    };
    
    updateCraftInfo();
    
    body.innerHTML = topSection;
    body.appendChild(middleSection);
    body.appendChild(materialsSection);
    body.appendChild(craftBtn);
    
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Event Listeners
    const closeModal = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if(e.target === overlay) closeModal(); });
    modal.querySelector('#close-craft-modal').onclick = closeModal;

    const updateCountDisp = () => {
      modal.querySelector('#craft-count-disp').textContent = craftCount;
      updateCraftInfo();
    };
    
    modal.querySelector('#btn-minus').onclick = () => {
      if (craftCount > 1) { craftCount--; updateCountDisp(); }
    };
    modal.querySelector('#btn-plus').onclick = () => {
      if (craftCount < maxCraft) { craftCount++; updateCountDisp(); }
    };
    modal.querySelector('#btn-max').onclick = () => {
      if (maxCraft > 0) { craftCount = maxCraft; updateCountDisp(); }
    };

    // 合成実行
    craftBtn.onclick = async () => {
      if (craftCount <= 0) return;

      const totalCost = price * craftCount;

      // ゴールドを減らす
      currentGold -= totalCost;
      await GameDB.setGameState('gold', currentGold);

      // ヘッダーのゴールド表示を更新
      const headerGoldEl = document.getElementById('header-gold-display');
      if (headerGoldEl) {
        headerGoldEl.textContent = ` Gold : ${currentGold.toLocaleString()} `;
      }

      // 素材を消費
      for (const mat of item.recipe.materials) {
        const invItem = await GameDB.getInventoryItem(mat.id);
        if (invItem) {
          const totalMatCost = mat.amount * craftCount;
          const newQty = (invItem.quantity || 0) - totalMatCost;
          if (newQty <= 0) {
            await GameDB.deleteInventoryItem(mat.id);
          } else {
            await GameDB.putInventoryItem({ ...invItem, quantity: newQty });
          }
          inventoryMap[mat.id] = Math.max(0, (inventoryMap[mat.id] || 0) - totalMatCost);
        }
      }

      if (isMaterial) {
        const currentQty = inventoryMap[item.id] || 0;
        const newQty = currentQty + craftCount;
        const matItem = ALL_DEFINITIONS.find(d => d.id === item.id) || item;
        await GameDB.putInventoryItem({ ...matItem, quantity: newQty });
        inventoryMap[item.id] = newQty;
      } else {
        // 装備アイテムを作成（ユニークID付与）
        for (let i = 0; i < craftCount; i++) {
          const uniqueId = `${item.id}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
          const newEquipment = {
            id: uniqueId,
            baseId: item.id,
          };
          await GameDB.putEquipment(newEquipment);
        }
        equipmentCountMap[item.id] = (equipmentCountMap[item.id] || 0) + craftCount;
      }

      // 合成成功エフェクト
      closeModal();
      showCraftSuccessEffect(item, craftCount);

      // グリッド再描画
      renderGrid();
    };
  };

  /** 合成成功時のエフェクト */
  const showCraftSuccessEffect = (item, count) => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-green-900/90 border border-green-500/50 rounded-xl shadow-2xl text-sm font-bold text-green-200 animate-[slide-up_0.3s_ease-out] backdrop-blur-sm';
    toast.innerHTML = `
      <span class="material-symbols-outlined text-green-400" style="font-variation-settings: 'FILL' 1">check_circle</span>
      <span>${item.name} を ${count} 個合成しました！</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, -20px)';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  };

  container.appendChild(topBar);
  container.appendChild(scrollContainer);
  container.appendChild(paginationContainer);

  renderFilters();
  
  // データ読み込み
  Promise.all([
    GameDB.getAllInventory(),
    GameDB.getGameState('gold'),
    GameDB.getAllEquipment()
  ]).then(([inventory, gold, equipment]) => {
    inventoryMap = {};
    inventory.forEach(item => inventoryMap[item.id] = item.quantity || 0);
    currentGold = gold || 0;
    // 各装備(baseId)ごとの所持数をカウント
    equipmentCountMap = {};
    equipment.forEach(eq => {
      const bId = eq.baseId || eq.id;
      equipmentCountMap[bId] = (equipmentCountMap[bId] || 0) + 1;
    });

    // レシピを持つすべての装備アイテムをリストに追加
    allRecipeItems = ALL_DEFINITIONS.filter(def => def.recipe);

    renderGrid();
  });

  return container;
}
