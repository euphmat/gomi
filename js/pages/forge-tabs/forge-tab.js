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
export function renderForgeTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full animate-fade-in overflow-hidden';

  // 状態管理
  let allRecipeItems = [];
  let inventoryMap = {};
  let currentGold = 0;
  let currentEquipmentCount = 0;
  let equipmentCountMap = {};
  let activeFilter = 'all';
  let showOnlyCraftable = true;

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

  // 合成可能トグルスイッチ
  const toggleContainer = document.createElement('label');
  toggleContainer.className = 'flex items-center gap-2 shrink-0 cursor-pointer select-none bg-gray-800/40 border border-gray-700/60 rounded-lg px-2.5 h-10 hover:bg-gray-800/80 transition-colors';

  const toggleSwitch = document.createElement('div');
  
  const toggleThumb = document.createElement('div');
  
  toggleSwitch.appendChild(toggleThumb);

  const toggleLabel = document.createElement('span');
  toggleLabel.className = 'text-[11px] font-bold text-gray-300 tracking-wider whitespace-nowrap';
  toggleLabel.textContent = '合成可能';

  toggleContainer.appendChild(toggleSwitch);
  toggleContainer.appendChild(toggleLabel);

  const updateToggleUI = () => {
    if (showOnlyCraftable) {
      toggleSwitch.className = 'relative w-9 h-5 bg-green-600 rounded-full transition-colors duration-200';
      toggleThumb.className = 'absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full transition-transform duration-200 transform translate-x-4';
    } else {
      toggleSwitch.className = 'relative w-9 h-5 bg-gray-700 rounded-full transition-colors duration-200';
      toggleThumb.className = 'absolute top-[2px] left-[2px] w-4 h-4 bg-gray-400 rounded-full transition-transform duration-200 transform translate-x-0';
    }
  };

  updateToggleUI();

  toggleContainer.onclick = (e) => {
    e.preventDefault();
    showOnlyCraftable = !showOnlyCraftable;
    updateToggleUI();
    renderGrid();
  };

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
          renderFilters();
          renderGrid();
        }
      };
      filterContainer.appendChild(btn);
    });
  };

  topBar.appendChild(filterContainer);
  topBar.appendChild(toggleContainer);

  // グリッド領域
  // モンスター図鑑と同じシルエットフィルター
  const SILHOUETTE_FILTER = 'brightness-[0.07] saturate-0 drop-shadow-[0_0_3px_rgba(160,170,220,0.8)]';

  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'overflow-y-auto flex-1 pb-6 px-2';

  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid grid-cols-5 gap-1.5 content-start';
  
  scrollContainer.appendChild(gridContainer);

  const renderGrid = () => {
    gridContainer.innerHTML = '';
    
    let filteredItems = activeFilter === 'all' 
      ? allRecipeItems 
      : allRecipeItems.filter(item => {
          if (activeFilter === 'weapon') return item.slot === 'rightHand';
          if (activeFilter === 'shield') return item.slot === 'leftHand';
          if (activeFilter === 'armor') return item.slot === 'armor';
          if (activeFilter === 'accessory') return item.slot === 'accessory';
          return true;
        });

    if (showOnlyCraftable) {
      filteredItems = filteredItems.filter(item => checkCanCraft(item));
    }

    if (filteredItems.length === 0) {
      gridContainer.innerHTML = `<div class="col-span-full text-center text-gray-500 text-sm mt-8">合成可能なアイテムがありません</div>`;
      return;
    }

    filteredItems.forEach(item => {
      const canCraft = checkCanCraft(item);
      const slot = document.createElement('div');
      slot.className = `relative w-full aspect-square flex items-center justify-center bg-gray-900/60 rounded-md border ${canCraft ? 'border-gray-700/50 hover:border-gray-500 hover:bg-gray-800 cursor-pointer' : 'border-gray-700/80'} overflow-hidden transition-all shadow-sm cursor-pointer`;
      
      if (item.image) {
        const imgClass = canCraft ? 'w-full h-full object-cover' : `w-full h-full object-cover ${SILHOUETTE_FILTER}`;
        slot.innerHTML = `<img src="${item.image}" alt="" class="${imgClass}" onerror="this.style.display='none'">`;
      } else {
        const iconClass = canCraft ? 'material-symbols-outlined text-gray-500 text-lg' : 'material-symbols-outlined text-gray-800 text-lg';
        slot.innerHTML = `<span class="${iconClass}">category</span>`;
      }

      
      slot.onclick = () => showCraftModal(item);
      gridContainer.appendChild(slot);
    });
  };

  /** 合成可能かチェック */
  const checkCanCraft = (item) => {
    if (!item.recipe) return false;
    if (currentGold < (item.recipe.price || 0)) return false;
    const isMaterial = !item.slot;
    const ownedCount = isMaterial ? (inventoryMap[item.id] || 0) : (equipmentCountMap[item.id] || 0);
    if (ownedCount >= 9999) return false;
    return item.recipe.materials.every(mat => (inventoryMap[mat.id] || 0) >= mat.amount);
  };

  /** 合成モーダルを表示 */
  const showCraftModal = async (item) => {
    const isMaterial = !item.slot;
    const ownedCount = isMaterial ? (inventoryMap[item.id] || 0) : (equipmentCountMap[item.id] || 0);
    
    // 計算: 最大合成可能数
    const price = item.recipe.price || 0;
    let maxCraft = 9999 - ownedCount;
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
        <span class="text-[10px] text-slate-500 font-mono tracking-wider">最大: ${maxCraft} / 9999</span>
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
        
        const pct = Math.min(100, requiredAmount > 0 ? (owned / requiredAmount) * 100 : 100);
        const barColor = enough ? 'bg-emerald-500' : 'bg-rose-500';

        materialsHtml += `
          <div class="flex items-center gap-2 py-0.5">
            <div class="w-8 h-8 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              ${matDef && matDef.image ? `<img src="${matDef.image}" class="${matImgClass}" onerror="this.style.display='none'">` : `<span class="material-symbols-outlined text-slate-400 text-sm">category</span>`}
            </div>
            <div class="flex-1 min-w-0 flex flex-col gap-0.5">
              <div class="text-xs font-bold text-slate-300 truncate leading-none mb-0.5">${matDef ? matDef.name : mat.id}</div>
              <div class="w-full h-1 bg-slate-900 rounded-full overflow-hidden mt-0.5">
                <div class="h-full ${barColor} transition-all duration-300" style="width: ${pct}%"></div>
              </div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-xs font-mono font-bold ${enough ? 'text-emerald-400' : 'text-rose-400'} leading-none">
                ${owned} / ${requiredAmount}
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

      if (ownedCount >= 9999) {
        craftBtn.className = 'w-full py-3 rounded-xl font-bold text-sm bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed flex justify-center items-center gap-2 transition-all shrink-0';
        craftBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">block</span>所持上限（9999個）に達しています`;
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
