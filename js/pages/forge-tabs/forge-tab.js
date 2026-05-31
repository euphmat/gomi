import { GameDB } from '../../data/database.js';
import { WEAPONS } from '../../definitions/weapons.js';
import { ARMORS } from '../../definitions/armors.js';
import { SHIELDS } from '../../definitions/shields.js';
import { ACCESSORIES } from '../../definitions/accessories.js';
import { MATERIALS } from '../../definitions/materials.js';

const ALL_DEFINITIONS = [...WEAPONS, ...ARMORS, ...SHIELDS, ...ACCESSORIES, ...MATERIALS];

/**
 * 鍛冶屋（作成）タブ
 */
export function renderForgeTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full animate-fade-in overflow-hidden';

  // 状態管理
  let items = [];
  let activeFilter = 'all';

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

  const sortBtn = document.createElement('button');
  sortBtn.className = 'flex items-center justify-center px-3 py-2 bg-gray-800 text-gray-300 rounded-lg shadow border border-gray-700 hover:bg-gray-700 shrink-0 transition-colors';
  sortBtn.innerHTML = '<span class="text-sm font-bold">Sort</span>';
  sortBtn.onclick = () => alert('ソート機能は準備中です。');

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
  topBar.appendChild(sortBtn);

  // グリッド領域
  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid grid-cols-6 gap-2 overflow-y-auto content-start pb-6 px-2 flex-1';

  const renderGrid = () => {
    gridContainer.innerHTML = '';
    
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

    if (filteredItems.length === 0) {
      gridContainer.innerHTML = `<div class="col-span-full text-center text-gray-500 text-sm mt-8">作成可能なアイテムがありません</div>`;
      return;
    }

    filteredItems.forEach(item => {
      const slot = document.createElement('div');
      slot.className = 'aspect-square bg-black/40 rounded-md border border-gray-700/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-gray-400 hover:bg-gray-800 transition-all shadow-sm relative group';
      
      if (item.image) {
        slot.innerHTML = `<img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">`;
      } else {
        slot.innerHTML = `<span class="material-symbols-outlined text-gray-600 text-lg">category</span>`;
      }
      
      slot.onclick = () => {
        const costStr = item.recipe.materials.map(m => {
          const mDef = ALL_DEFINITIONS.find(d => d.id === m.id);
          return `${mDef ? mDef.name : m.id} x${m.amount}`;
        }).join('\\n');
        alert(`【${item.name}】\n必要素材:\n${costStr}\n作成費用: ${item.recipe.price || 0}G\n\n作成機能は準備中です。`);
      };
      gridContainer.appendChild(slot);
    });
  };

  container.appendChild(topBar);
  container.appendChild(gridContainer);

  renderFilters();
  
  GameDB.getAllInventory().then(inventory => {
    const invMap = {};
    inventory.forEach(item => invMap[item.id] = item.quantity || 0);

    const craftableItems = ALL_DEFINITIONS.filter(def => {
      if (!def.recipe) return false;
      return def.recipe.materials.every(mat => (invMap[mat.id] || 0) >= mat.amount);
    });

    items = craftableItems;
    renderGrid();
  });

  return container;
}
