import { GameDB } from '../../data/database.js';
import { WEAPONS } from '../../definitions/weapons.js';
import { ARMORS } from '../../definitions/armors.js';
import { SHIELDS } from '../../definitions/shields.js';
import { ACCESSORIES } from '../../definitions/accessories.js';
import { MATERIALS } from '../../definitions/materials.js';
import { MONSTERS } from '../../definitions/monsters.js';
import { STAT_KEYS } from '../../data/constants.js';

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

const ALL_DEFINITIONS = [...WEAPONS, ...ARMORS, ...SHIELDS, ...ACCESSORIES, ...MATERIALS];

// Unified silhouette filter for undiscovered/unacquired entries
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

export function renderItemLibraryTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full animate-fade-in overflow-hidden';

  let activeFilter = 'all';
  let acquiredBaseIds = new Set();
  let discoveredMonsterIds = new Set();

  const FILTERS = [
    { id: 'all', icon: 'apps' },
    { id: 'weapon', icon: 'swords' },
    { id: 'shield', icon: 'shield' },
    { id: 'armor', icon: 'checkroom' },
    { id: 'accessory', icon: 'diamond' },
    { id: 'material', icon: 'category' }
  ];

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
          renderFilters();
          renderGrid();
        }
      };
      filterContainer.appendChild(btn);
    });
  };

  topBar.appendChild(filterContainer);

  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'overflow-y-auto flex-1 pb-6 px-2';

  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid grid-cols-5 gap-1.5 content-start';
  
  scrollContainer.appendChild(gridContainer);

  const renderGrid = () => {
    gridContainer.innerHTML = '';
    
    const filteredItems = activeFilter === 'all' 
      ? ALL_DEFINITIONS 
      : ALL_DEFINITIONS.filter(item => {
          if (activeFilter === 'weapon') return item.slot === 'rightHand';
          if (activeFilter === 'shield') return item.slot === 'leftHand';
          if (activeFilter === 'armor') return item.slot === 'armor';
          if (activeFilter === 'accessory') return item.slot === 'accessory';
          if (activeFilter === 'material') return !item.slot;
          return true;
        });

    if (filteredItems.length === 0) {
      gridContainer.innerHTML = `<div class="col-span-full text-center text-gray-500 text-sm mt-8">アイテムデータがありません</div>`;
      return;
    }

    filteredItems.forEach(item => {
      const isAcquired = acquiredBaseIds.has(item.id);

      const slot = document.createElement('div');
      slot.className = `relative w-full aspect-square flex items-center justify-center bg-gray-900/60 rounded-md border ${isAcquired ? 'border-gray-700/50 hover:border-gray-500 hover:bg-gray-800 cursor-pointer' : 'border-gray-700/80'} overflow-hidden transition-all shadow-sm`;
      
      if (item.image) {
        const imgClass = isAcquired ? 'w-full h-full object-cover' : `w-full h-full object-cover ${SILHOUETTE_FILTER}`;
        slot.innerHTML = `<img src="${item.image}" alt="" class="${imgClass}" onerror="this.style.display='none'">`;
      } else {
        const iconClass = isAcquired ? 'material-symbols-outlined text-gray-600 text-lg' : 'material-symbols-outlined text-gray-800 text-lg';
        slot.innerHTML = `<span class="${iconClass}">category</span>`;
      }
      
      slot.onclick = () => showItemModal(item, isAcquired);
      gridContainer.appendChild(slot);
    });
  };

  const showItemModal = (item, isAcquired) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in px-4 py-8';
    
    const modal = document.createElement('div');
    modal.className = 'bg-[#0c0d19] border border-slate-800 rounded-2xl w-full max-w-[390px] shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] shadow-blue-500/10 flex flex-col overflow-hidden animate-[slide-up_0.25s_cubic-bezier(0.16,1,0.3,1)] max-h-full';
    
    // Header
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center px-4 py-3 border-b border-slate-800/80 bg-slate-900/40 shrink-0';
    header.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-blue-400 text-lg">info</span>
        <span class="font-bold text-gray-200 text-sm tracking-wider uppercase">アイテム詳細</span>
      </div>
      <button class="text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center transition-all cursor-pointer shrink-0" id="close-modal-btn">
        <span class="material-symbols-outlined text-lg">close</span>
      </button>
    `;
      
    // Body
    const body = document.createElement('div');
    body.className = 'p-4 flex flex-col gap-3.5 overflow-y-auto flex-1 min-h-0';
    
    const displayName = isAcquired ? item.name : '？？？';
    let displayImage = '';
    if (item.image) {
        displayImage = isAcquired 
          ? `<img src="${item.image}" class="w-full h-full object-cover" onerror="this.style.display='none'">` 
          : `<img src="${item.image}" class="w-full h-full object-cover ${SILHOUETTE_FILTER}" onerror="this.style.display='none'">`;
    } else {
        displayImage = isAcquired
          ? `<span class="material-symbols-outlined text-3xl text-gray-500 normal-case">category</span>`
          : `<span class="material-symbols-outlined text-3xl text-gray-800 normal-case">category</span>`;
    }
    
    // --- Elements: only non-zero, compact chips ---
    const elements = isAcquired ? (item.elements || {}) : {};
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
    const ailments = isAcquired ? (item.ailments || {}) : {};
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

    // Stats
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
      : `<div class="text-[10px] text-slate-500 italic text-center py-2 bg-slate-900/30 rounded border border-slate-900/40">${item.slot ? '性能変化なし' : '特殊な効果を持たない素材アイテムです。'}</div>`;

    // Ability
    const abilityHtml = isAcquired && item.ability ? `
      <div class="flex flex-col gap-1 p-3 bg-gradient-to-r from-amber-950/20 to-amber-900/10 border border-amber-700/20 rounded-xl relative overflow-hidden shadow-inner mt-1 shrink-0">
        <div class="flex items-center gap-1.5 mb-1 shrink-0">
          <div class="text-[9px] text-amber-300 font-black tracking-wide uppercase px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/25 rounded leading-none shadow-sm">${item.ability.name}</div>
          <span class="text-[8px] text-amber-500/80 font-bold uppercase tracking-wider">アビリティ</span>
        </div>
        <div class="text-[10px] text-slate-300 leading-normal break-words pl-0.5">${item.ability.description}</div>
      </div>
    ` : '';

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
            ${displayImage}
          </div>
          <div class="flex flex-col items-center gap-1 w-full">
            <span class="px-2 py-0.5 rounded text-[9px] font-black border ${slotColor}">${slotLabel}</span>
            <div class="text-xs font-black text-center text-slate-100 tracking-wide w-full break-words leading-tight">${displayName}</div>
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

    const renderListSection = (title, icon, itemsHtml) => {
      if (!itemsHtml) return '';
      return `
        <div class="mt-1 shrink-0">
          <div class="text-[10px] font-bold text-slate-500 tracking-wider mb-1.5 ml-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[12px] normal-case text-slate-500">${icon}</span> ${title}
          </div>
          <div class="flex flex-col gap-1.5">${itemsHtml}</div>
        </div>
      `;
    };

    const createRow = (iconHtml, title, label, value, valueColor) => `
      <div class="flex justify-between items-center bg-slate-950/45 hover:bg-slate-900/60 transition-colors p-2 rounded-lg border border-slate-800/80 animate-fade-in">
        <div class="flex items-center gap-2.5 min-w-0">
          ${iconHtml}
          <span class="text-xs text-slate-200 font-bold truncate">${title}</span>
        </div>
        <div class="flex flex-col items-end shrink-0 pl-2">
          <span class="text-[8px] text-slate-500 font-bold tracking-wider">${label}</span>
          <span class="text-[10px] font-bold ${valueColor} font-mono">${value}</span>
        </div>
      </div>
    `;

    // 1. Required Materials
    let recipeHtml = '';
    if (item.recipe && item.recipe.materials) {
      recipeHtml = item.recipe.materials.map(matReq => {
        const matDef = ALL_DEFINITIONS.find(d => d.id === matReq.id);
        const matAcquired = matDef ? acquiredBaseIds.has(matDef.baseId || matDef.id) : false;
        const imgClass = matAcquired ? 'w-full h-full object-cover' : `w-full h-full object-cover ${SILHOUETTE_FILTER}`;
        const containerClass = 'w-8 h-8 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner';
        const iconSrc = matDef && matDef.image 
          ? `<div class="${containerClass}"><img src="${matDef.image}" class="${imgClass}" onerror="this.style.display='none'"></div>` 
          : `<div class="${containerClass}"><span class="material-symbols-outlined text-[16px] text-slate-400 normal-case">category</span></div>`;
        return createRow(iconSrc, matDef ? matDef.name : matReq.id, '必要数', `x${matReq.amount}`, 'text-orange-400');
      }).join('');
    }
    const recipeSection = renderListSection('作成に必要な素材', 'build', recipeHtml);
    
    // 2. Drop Monsters
    const drops = MONSTERS.filter(m => m.drops && m.drops.some(d => d.itemId === item.id));
    let dropHtml = '';
    if (drops.length > 0) {
      dropHtml = drops.map(m => {
        const dropInfo = m.drops.find(d => d.itemId === item.id);
        const monsterDefeated = discoveredMonsterIds.has(m.id);
        const imgClass = monsterDefeated ? 'w-full h-full object-cover' : `w-full h-full object-cover ${SILHOUETTE_FILTER}`;
        const containerClass = 'w-8 h-8 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner';
        const iconSrc = m.image 
          ? `<div class="${containerClass}"><img src="${m.image}" class="${imgClass}" onerror="this.style.display='none'"></div>` 
          : `<div class="${containerClass}"><span class="material-symbols-outlined text-[16px] text-slate-400 normal-case">skull</span></div>`;
        return createRow(iconSrc, m.name, 'ドロップ率', `${dropInfo.rate}%`, 'text-blue-400');
      }).join('');
    }
    const dropsSection = renderListSection('ドロップするモンスター', 'swords', dropHtml);

    // 4. Material Usages
    const usages = ALL_DEFINITIONS.filter(def => def.recipe && def.recipe.materials && def.recipe.materials.some(mat => mat.id === item.id));
    let usageHtml = '';
    if (usages.length > 0) {
      usageHtml = usages.map(def => {
        const matInfo = def.recipe.materials.find(mat => mat.id === item.id);
        const usageAcquired = acquiredBaseIds.has(def.baseId || def.id);
        const imgClass = usageAcquired ? 'w-full h-full object-cover' : `w-full h-full object-cover ${SILHOUETTE_FILTER}`;
        const containerClass = 'w-8 h-8 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner';
        const iconSrc = def.image 
          ? `<div class="${containerClass}"><img src="${def.image}" class="${imgClass}" onerror="this.style.display='none'"></div>` 
          : `<div class="${containerClass}"><span class="material-symbols-outlined text-[16px] text-slate-400 normal-case">category</span></div>`;
        return createRow(iconSrc, def.name, '必要数', `x${matInfo.amount}`, 'text-green-400');
      }).join('');
    }
    const usageSection = renderListSection('素材としての用途', 'category', usageHtml);

    // Info Sections Container
    let infoSections = recipeSection + dropsSection + usageSection;
    if (!infoSections) {
      infoSections = `
        <div class="flex flex-col items-center justify-center py-6 text-slate-500 bg-slate-950/30 rounded-lg border border-slate-800 border-dashed mt-2 shrink-0">
          <span class="material-symbols-outlined text-2xl mb-1 text-slate-650 normal-case">inventory_2</span>
          <span class="text-[10px] font-bold text-slate-500">関連するレシピやドロップ情報はありません</span>
        </div>
      `;
    }

    body.innerHTML = topSection + infoSections;
    
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Event Listeners
    const closeModal = () => {
      modal.classList.replace('animate-[slide-up_0.25s_cubic-bezier(0.16,1,0.3,1)]', 'animate-[slide-down_0.2s_ease-in]');
      overlay.classList.add('opacity-0');
      setTimeout(() => overlay.remove(), 200);
    };
    overlay.addEventListener('click', (e) => { if(e.target === overlay) closeModal(); });
    modal.querySelector('#close-modal-btn').onclick = closeModal;
  };

  const loadData = async () => {
    const [eq, inv, chars] = await Promise.all([
      GameDB.getAllEquipment(),
      GameDB.getAllInventory(),
      GameDB.getAllCharacters()
    ]);
    
    // Check equipped items too, as getAllEquipment might include them or maybe not if we need them, wait getAllEquipment gets ALL equipment from DB.
    // Yes, getAllEquipment gets ALL equipments in the database.
    eq.forEach(item => acquiredBaseIds.add(item.baseId || getBaseId(item.id)));
    inv.forEach(item => acquiredBaseIds.add(item.id));

    // Try to get discovered_items from gameState if it ever gets implemented
    const discovered = await GameDB.getGameState('discovered_items') || [];
    discovered.forEach(id => acquiredBaseIds.add(id));

    // Load discovered monsters for silhouette logic
    const discoveredMonsters = await GameDB.getGameState('discovered_monsters') || [];
    discoveredMonsters.forEach(id => discoveredMonsterIds.add(id));

    renderGrid();
  };

  container.appendChild(topBar);
  container.appendChild(scrollContainer);
  
  renderFilters();
  loadData();

  return container;
}
