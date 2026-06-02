import { GameDB } from '../../data/database.js';
import { STAT_KEYS } from '../../data/constants.js';

/**
 * 倉庫（所持品）タブ
 */
export function renderStorageTab() {
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
      gridContainer.innerHTML = `<div class="col-span-full text-center text-gray-500 text-sm mt-8">所持しているアイテムがありません</div>`;
      return;
    }

    filteredItems.forEach(item => {
      const slot = document.createElement('div');
      slot.className = 'relative w-full pt-[100%] bg-black/40 rounded-md border border-gray-700/50 overflow-hidden cursor-pointer hover:border-gray-400 hover:bg-gray-800 transition-all shadow-sm group';
      
      if (item.image) {
        slot.innerHTML = `<div class="absolute inset-0 flex items-center justify-center"><img src="${item.image}" alt="" class="w-full h-full object-cover" onerror="this.style.display='none'"></div>`;
      } else {
        slot.innerHTML = `<div class="absolute inset-0 flex items-center justify-center"><span class="material-symbols-outlined text-gray-600 text-lg">category</span></div>`;
      }
      
      if (item.quantity && item.quantity > 1) {
        slot.innerHTML += `<div class="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1 rounded border border-gray-600">x${item.quantity}</div>`;
      }
      
      slot.onclick = () => showItemModal(item);
      gridContainer.appendChild(slot);
    });
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
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in px-4';
    
    const modal = document.createElement('div');
    modal.className = 'bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-[slide-up_0.2s_ease-out]';
    
    // Header
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center p-3 border-b border-gray-800 bg-gray-800/50';
    header.innerHTML = `<span class="font-bold text-gray-200 text-sm">アイテム詳細</span>
      <button class="text-gray-400 hover:text-white" id="close-modal-btn">
        <span class="material-symbols-outlined text-xl">close</span>
      </button>`;
      
    // Body
    const body = document.createElement('div');
    body.className = 'p-4 flex flex-col gap-4';
    
    // Top: Icon + Name (left), Stats (right)
    const statsHtml = item.stats 
      ? `<div class="grid grid-cols-4 gap-1 w-full mt-1">` + STAT_KEYS.map(stat => {
          const val = item.stats[stat.key] || 0;
          return `
            <div class="flex flex-col items-center min-w-0 bg-gradient-to-b from-gray-800/80 to-gray-900/90 rounded py-[3px] border border-gray-700/50 shadow-inner">
              <div class="flex items-center justify-center gap-[1px] w-full">
                <span class="material-symbols-outlined ${stat.color}" style="font-size: 10px; font-variation-settings: 'FILL' 1">${stat.icon}</span>
                <span class="text-[7px] text-gray-300 font-bold tracking-wider leading-none">${stat.label}</span>
              </div>
              <span class="text-[11px] font-black text-gray-100 leading-none mt-0.5 drop-shadow-md">${val}</span>
            </div>
          `;
        }).join('') + `</div>`
      : `<div class="text-xs text-gray-400 mt-1">素材アイテム<br>特殊な効果はありません。</div>`;

    const topSection = `
      <div class="flex gap-4">
        <div class="flex flex-col items-center gap-2 w-1/3 shrink-0">
          <div class="w-20 h-20 bg-black/50 rounded border border-gray-700 flex items-center justify-center overflow-hidden">
            ${item.image ? `<img src="${item.image}" class="w-full h-full object-cover" onerror="this.style.display='none'">` : `<span class="material-symbols-outlined text-3xl text-gray-600">category</span>`}
          </div>
          <div class="text-sm font-bold text-center leading-tight text-gray-200 w-full break-words">${item.name}</div>
        </div>
        <div class="flex-1 bg-black/40 border border-gray-700 p-2 rounded flex flex-col">
          <div class="text-xs font-bold text-gray-400 mb-2 pb-1 border-b border-gray-700/50">性能表示</div>
          ${statsHtml}
        </div>
      </div>
    `;
    
    // Sell logic
    let sellCount = 1;
    const maxSell = item.quantity || 1;
    const price = item.price || 0; 
    
    // Middle: Sell quantity
    const middleSection = document.createElement('div');
    middleSection.className = 'bg-black/40 border border-gray-700 rounded p-3';
    middleSection.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-bold text-gray-300">売却数</span>
        <span class="text-xs text-gray-500 font-mono">所持: ${maxSell}</span>
      </div>
      <div class="flex items-center gap-2">
        <button id="btn-minus" class="w-10 h-10 flex items-center justify-center bg-gray-800 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 active:scale-95 text-lg font-bold transition-all">-</button>
        <div class="flex-1 text-center font-mono text-xl font-bold text-white bg-gray-900 border border-gray-700 rounded-lg py-1.5" id="sell-count-disp">${sellCount}</div>
        <button id="btn-plus" class="w-10 h-10 flex items-center justify-center bg-gray-800 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 active:scale-95 text-lg font-bold transition-all">+</button>
        <button id="btn-max" class="px-4 h-10 flex items-center justify-center bg-blue-900/40 border border-blue-700/50 rounded-lg text-sm font-bold text-blue-300 hover:bg-blue-800/50 active:scale-95 transition-all">MAX</button>
      </div>
    `;
    
    // Bottom: Sell Action
    const bottomSection = document.createElement('button');
    
    const updateBottomText = () => {
      if (price === 0) {
        bottomSection.innerHTML = `<span class="material-symbols-outlined text-[20px]">block</span>売却不可`;
        bottomSection.className = 'w-full py-3.5 rounded-lg font-bold text-sm bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed flex justify-center items-center gap-2';
      } else {
        bottomSection.innerHTML = `<span class="material-symbols-outlined text-[20px]">payments</span>売却する（${(price * sellCount).toLocaleString()} G）`;
        bottomSection.className = 'w-full py-3.5 rounded-lg font-bold text-sm bg-red-900/40 border border-red-700/50 text-red-200 hover:bg-red-800/50 hover:text-white transition-all active:scale-95 flex justify-center items-center gap-2 shadow-lg';
      }
    };
    updateBottomText();
    
    body.innerHTML = topSection;
    body.appendChild(middleSection);
    body.appendChild(bottomSection);
    
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Event Listeners
    const closeModal = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if(e.target === overlay) closeModal(); });
    modal.querySelector('#close-modal-btn').onclick = closeModal;
    
    const updateCountDisp = () => {
      modal.querySelector('#sell-count-disp').textContent = sellCount;
      updateBottomText();
    };
    
    modal.querySelector('#btn-minus').onclick = () => {
      if (sellCount > 1) { sellCount--; updateCountDisp(); }
    };
    modal.querySelector('#btn-plus').onclick = () => {
      if (sellCount < maxSell) { sellCount++; updateCountDisp(); }
    };
    modal.querySelector('#btn-max').onclick = () => {
      sellCount = maxSell; updateCountDisp();
    };
    
    bottomSection.onclick = async () => {
      if (price === 0) return;
      
      const currentGold = await GameDB.getGameState('gold') || 0;
      const newGold = currentGold + price * sellCount;
      await GameDB.setGameState('gold', newGold);
      
      const headerGoldEl = document.getElementById('header-gold-display');
      if (headerGoldEl) {
        headerGoldEl.textContent = ` Gold : ${newGold.toLocaleString()} `;
      }
      
      if (item.slot) {
        // Equipment deletion
        const ids = item._ids || [item.id];
        for (let i = 0; i < sellCount; i++) {
          await GameDB.deleteEquipment(ids[i]);
        }
      } else {
        // Inventory update
        const newQuantity = maxSell - sellCount;
        if (newQuantity <= 0) {
          await GameDB.deleteInventoryItem(item.id);
        } else {
          await GameDB.putInventoryItem({ ...item, quantity: newQuantity });
        }
      }
      
      closeModal();
      loadData(); // reload
    };
  };

  container.appendChild(topBar);
  container.appendChild(gridContainer);

  renderFilters();
  loadData();

  return container;
}
