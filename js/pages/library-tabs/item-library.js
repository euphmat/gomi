import { GameDB } from '../../data/database.js';
import { WEAPONS } from '../../definitions/weapons.js';
import { ARMORS } from '../../definitions/armors.js';
import { SHIELDS } from '../../definitions/shields.js';
import { ACCESSORIES } from '../../definitions/accessories.js';
import { MATERIALS } from '../../definitions/materials.js';
import { MONSTERS } from '../../definitions/monsters.js';
import { STAT_KEYS } from '../../data/constants.js';

const ALL_DEFINITIONS = [...WEAPONS, ...ARMORS, ...SHIELDS, ...ACCESSORIES, ...MATERIALS];

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
  let killCountsState = {};

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

  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid grid-cols-6 gap-2 overflow-y-auto content-start pb-6 px-2 flex-1';

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
      slot.className = `aspect-square bg-gray-900/60 rounded-md border ${isAcquired ? 'border-gray-700/50 hover:border-gray-500 hover:bg-gray-800 cursor-pointer' : 'border-gray-700/80'} flex items-center justify-center overflow-hidden transition-all shadow-sm relative`;
      
      let innerHTML = '';
      if (item.image) {
        const imgClass = isAcquired ? 'w-full h-full object-cover' : 'w-full h-full object-cover brightness-[0.15] drop-shadow-[0_0_1px_rgba(255,255,255,0.8)]';
        innerHTML = `<img src="${item.image}" alt="${item.name}" class="${imgClass}">`;
      } else {
        const iconClass = isAcquired ? 'material-symbols-outlined text-gray-600 text-lg' : 'material-symbols-outlined text-gray-800 text-lg';
        innerHTML = `<span class="${iconClass}">category</span>`;
      }

      slot.innerHTML = innerHTML;
      
      slot.onclick = () => showItemModal(item, isAcquired, killCountsState);
      gridContainer.appendChild(slot);
    });
  };

  const showItemModal = (item, isAcquired, killCounts) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in px-4';
    
    const modal = document.createElement('div');
    modal.className = 'bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-[slide-up_0.2s_ease-out] max-h-[75vh]';
    
    // Header
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center p-4 border-b border-gray-800 bg-gradient-to-b from-gray-800 to-gray-900';
    header.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-gray-400 text-lg">info</span>
        <span class="font-bold text-gray-100 text-sm tracking-wider">アイテム詳細</span>
      </div>
      <button class="text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 rounded-full p-1" id="close-modal-btn">
        <span class="material-symbols-outlined text-xl block">close</span>
      </button>`;
      
    // Body
    const body = document.createElement('div');
    body.className = 'p-4 flex flex-col gap-5 overflow-y-auto no-scrollbar pb-6';
    
    const displayName = isAcquired ? item.name : '？？？';
    let displayImage = '';
    if (item.image) {
        displayImage = isAcquired 
          ? `<img src="${item.image}" class="w-full h-full object-cover">` 
          : `<img src="${item.image}" class="w-full h-full object-cover brightness-[0.15] drop-shadow-[0_0_1px_rgba(255,255,255,0.8)]">`;
    } else {
        displayImage = isAcquired
          ? `<span class="material-symbols-outlined text-4xl text-gray-500">category</span>`
          : `<span class="material-symbols-outlined text-4xl text-gray-800">category</span>`;
    }
    
    // Stats
    const statsHtml = item.stats 
      ? `<div class="grid grid-cols-4 gap-1 w-full mt-2">` + STAT_KEYS.map(stat => {
          const val = item.stats[stat.key] || 0;
          return `
            <div class="flex flex-col items-center min-w-0 bg-gray-800 rounded-lg py-1 border border-gray-700 shadow-inner">
              <div class="flex items-center justify-center gap-1 w-full">
                <span class="material-symbols-outlined ${stat.color}" style="font-size: 12px; font-variation-settings: 'FILL' 1">${stat.icon}</span>
                <span class="text-[9px] text-gray-400 font-bold tracking-wider leading-none">${stat.label}</span>
              </div>
              <span class="text-xs font-black text-gray-100 leading-none mt-1">${val}</span>
            </div>
          `;
        }).join('') + `</div>`
      : `<div class="text-sm text-gray-400 mt-2 bg-gray-800 p-3 rounded-lg border border-gray-700 text-center">特殊な効果を持たない素材アイテムです。</div>`;

    // Ability
    let abilityHtml = '';
    if (isAcquired && item.ability) {
      abilityHtml = `
        <div class="mt-3 bg-indigo-900/30 border border-indigo-700/50 p-3 rounded-lg shadow-inner">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="material-symbols-outlined text-indigo-400 text-[16px]">stars</span>
            <span class="text-xs font-bold text-indigo-300 tracking-wider">専用アビリティ：${item.ability.name}</span>
          </div>
          <div class="text-xs text-gray-300 leading-relaxed pl-5">
            ${item.ability.description}
          </div>
        </div>
      `;
    }

    const topSection = `
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-4 bg-gray-800/50 p-3 rounded-xl border border-gray-700">
          <div class="w-16 h-16 bg-gray-900 rounded-lg border border-gray-600 shadow-inner flex items-center justify-center overflow-hidden shrink-0 relative">
            ${displayImage}
          </div>
          <div class="flex-1 flex flex-col justify-center">
            <div class="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400 leading-tight break-words mb-1">${displayName}</div>
            <div class="text-xs text-gray-400">${item.slot ? '装備品' : '素材・消費アイテム'}</div>
          </div>
        </div>
        <div>
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px] normal-case">bar_chart</span> 性能・効果
          </div>
          ${statsHtml}
          ${abilityHtml}
        </div>
      </div>
    `;

    // 1. Required Materials (Crafting Recipe)
    let recipeSection = '';
    if (item.recipe && item.recipe.materials) {
      const recipeHtml = item.recipe.materials.map(matReq => {
        const matDef = ALL_DEFINITIONS.find(d => d.id === matReq.id);
        const iconSrc = matDef && matDef.image 
          ? `<img src="${matDef.image}" class="w-10 h-10 rounded-md object-cover border border-gray-600 shadow-sm bg-gray-800">` 
          : `<div class="w-10 h-10 bg-gray-800 rounded-md border border-gray-600 shadow-sm flex items-center justify-center"><span class="material-symbols-outlined text-[20px] text-gray-500">category</span></div>`;
        const matName = matDef ? matDef.name : matReq.id;
        // 未取得状態の場合は素材名も隠すか検討しますが、図鑑の利便性のため表示します
        return `
          <div class="flex justify-between items-center bg-gray-800/60 hover:bg-gray-700 transition-colors p-2 rounded-lg border border-gray-700 mb-1.5">
            <div class="flex items-center gap-3">
              ${iconSrc}
              <span class="text-sm text-gray-200 font-bold">${matName}</span>
            </div>
            <div class="flex flex-col items-end">
              <span class="text-[10px] text-gray-400 font-bold">必要数</span>
              <span class="text-sm font-bold text-orange-400 font-mono">x${matReq.amount}</span>
            </div>
          </div>
        `;
      }).join('');
      
      recipeSection = `
        <div class="mt-2">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px] normal-case">build</span> 作成に必要な素材
          </div>
          <div class="flex flex-col">${recipeHtml}</div>
        </div>
      `;
    }
    
    // 2. Drop Monsters
    const drops = MONSTERS.filter(m => m.drops && m.drops.some(d => d.itemId === item.id));
    let dropsSection = '';
    if (drops.length > 0) {
      const dropHtml = drops.map(m => {
        const dropInfo = m.drops.find(d => d.itemId === item.id);
        const iconSrc = m.image 
          ? `<img src="${m.image}" class="w-10 h-10 rounded-md object-cover border border-gray-600 shadow-sm bg-gray-800">` 
          : `<div class="w-10 h-10 bg-gray-800 rounded-md border border-gray-600 shadow-sm flex items-center justify-center"><span class="material-symbols-outlined text-[20px] text-gray-500">skull</span></div>`;
        return `
          <div class="flex justify-between items-center bg-gray-800/60 hover:bg-gray-700 transition-colors p-2 rounded-lg border border-gray-700 mb-1.5">
            <div class="flex items-center gap-3">
              ${iconSrc}
              <span class="text-sm text-gray-200 font-bold">${m.name}</span>
            </div>
            <div class="flex flex-col items-end">
              <span class="text-[10px] text-gray-400 font-bold">ドロップ率</span>
              <span class="text-sm font-bold text-blue-400 font-mono">${dropInfo.rate}%</span>
            </div>
          </div>
        `;
      }).join('');
      
      dropsSection = `
        <div class="mt-2">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px] normal-case">swords</span> ドロップするモンスター
          </div>
          <div class="flex flex-col">${dropHtml}</div>
        </div>
      `;
    }

    // 3. Material Usages
    const usages = ALL_DEFINITIONS.filter(def => def.recipe && def.recipe.materials && def.recipe.materials.some(mat => mat.id === item.id));
    let usageSection = '';
    if (usages.length > 0) {
      const usageHtml = usages.map(def => {
        const matInfo = def.recipe.materials.find(mat => mat.id === item.id);
        const iconSrc = def.image 
          ? `<img src="${def.image}" class="w-10 h-10 rounded-md object-cover border border-gray-600 shadow-sm bg-gray-800">` 
          : `<div class="w-10 h-10 bg-gray-800 rounded-md border border-gray-600 shadow-sm flex items-center justify-center"><span class="material-symbols-outlined text-[20px] text-gray-500">category</span></div>`;
        return `
          <div class="flex justify-between items-center bg-gray-800/60 hover:bg-gray-700 transition-colors p-2 rounded-lg border border-gray-700 mb-1.5">
            <div class="flex items-center gap-3">
              ${iconSrc}
              <span class="text-sm text-gray-200 font-bold">${def.name}</span>
            </div>
            <div class="flex flex-col items-end">
              <span class="text-[10px] text-gray-400 font-bold">必要数</span>
              <span class="text-sm font-bold text-green-400 font-mono">x${matInfo.amount}</span>
            </div>
          </div>
        `;
      }).join('');
      
      usageSection = `
        <div class="mt-2">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px] normal-case">category</span> 素材としての用途
          </div>
          <div class="flex flex-col">${usageHtml}</div>
        </div>
      `;
    }

    // 4. Guild Rewards (Kill Rewards)
    const killRewardMonsters = MONSTERS.filter(m => m.killRewards && m.killRewards.some(kr => kr.itemId === item.id));
    let guildSection = '';
    if (killRewardMonsters.length > 0) {
      const guildHtml = killRewardMonsters.map(m => {
        const krInfo = m.killRewards.find(kr => kr.itemId === item.id);
        const currentKills = killCounts[m.id] || 0;
        const progressPercent = Math.min(100, Math.floor((currentKills / krInfo.count) * 100));

        const iconSrc = m.image 
          ? `<img src="${m.image}" class="w-10 h-10 rounded-md object-cover border border-gray-600 shadow-sm bg-gray-800 shrink-0">` 
          : `<div class="w-10 h-10 bg-gray-800 rounded-md border border-gray-600 shadow-sm flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[20px] text-gray-500">skull</span></div>`;
        return `
          <div class="flex flex-col bg-gray-800/60 hover:bg-gray-700 transition-colors p-3 rounded-lg border border-gray-700 mb-1.5 gap-2">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-3">
                ${iconSrc}
                <span class="text-sm text-gray-200 font-bold">${m.name}</span>
              </div>
              <div class="flex flex-col items-end">
                <span class="text-[10px] text-gray-400 font-bold">必要討伐数</span>
                <span class="text-sm font-bold text-yellow-400 font-mono">${krInfo.count.toLocaleString()}体</span>
              </div>
            </div>
            <div class="w-full bg-gray-900 rounded-full h-1.5 border border-gray-700 shadow-inner overflow-hidden relative">
              <div class="bg-gradient-to-r from-blue-600 to-blue-400 h-1.5 rounded-full" style="width: ${progressPercent}%"></div>
            </div>
            <div class="flex justify-end -mt-1">
               <span class="text-[10px] text-gray-400 font-mono">進捗: ${currentKills.toLocaleString()} / ${krInfo.count.toLocaleString()} (${progressPercent}%)</span>
            </div>
          </div>
        `;
      }).join('');
      
      guildSection = `
        <div class="mt-2">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px] normal-case">military_tech</span> ギルド討伐報酬
          </div>
          <div class="flex flex-col">${guildHtml}</div>
        </div>
      `;
    }

    // Info Sections Container
    let infoSections = recipeSection + dropsSection + guildSection + usageSection;
    if (!infoSections) {
      infoSections = `
        <div class="flex flex-col items-center justify-center py-6 text-gray-500 bg-gray-800/30 rounded-lg border border-gray-700 border-dashed mt-4">
          <span class="material-symbols-outlined text-3xl mb-2">inventory_2</span>
          <span class="text-xs font-bold">関連するレシピやドロップ情報はありません</span>
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
      modal.classList.replace('animate-[slide-up_0.2s_ease-out]', 'animate-[slide-down_0.2s_ease-in]');
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
    
    killCountsState = await GameDB.getGameState('killCounts') || {};

    renderGrid();
  };

  container.appendChild(topBar);
  container.appendChild(gridContainer);
  
  renderFilters();
  loadData();

  return container;
}
