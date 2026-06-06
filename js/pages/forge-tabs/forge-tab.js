import { GameDB } from '../../data/database.js';
import { WEAPONS } from '../../definitions/weapons.js';
import { ARMORS } from '../../definitions/armors.js';
import { SHIELDS } from '../../definitions/shields.js';
import { ACCESSORIES } from '../../definitions/accessories.js';
import { MATERIALS } from '../../definitions/materials.js';
import { STAT_KEYS } from '../../data/constants.js';

const ALL_DEFINITIONS = [...WEAPONS, ...ARMORS, ...SHIELDS, ...ACCESSORIES, ...MATERIALS];

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
          renderFilters();
          renderGrid();
        }
      };
      filterContainer.appendChild(btn);
    });
  };

  topBar.appendChild(filterContainer);

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
    
    const filteredItems = activeFilter === 'all' 
      ? allRecipeItems 
      : allRecipeItems.filter(item => {
          if (activeFilter === 'weapon') return item.slot === 'rightHand';
          if (activeFilter === 'shield') return item.slot === 'leftHand';
          if (activeFilter === 'armor') return item.slot === 'armor';
          if (activeFilter === 'accessory') return item.slot === 'accessory';
          return true;
        });

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
    const ownedCount = equipmentCountMap[item.id] || 0;
    if (ownedCount >= 9999) return false;
    return item.recipe.materials.every(mat => (inventoryMap[mat.id] || 0) >= mat.amount);
  };

  /** 合成モーダルを表示 */
  const showCraftModal = async (item) => {
    const canCraft = checkCanCraft(item);
    const ownedCount = equipmentCountMap[item.id] || 0;
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
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in px-4';
    
    const modal = document.createElement('div');
    modal.className = 'bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-[slide-up_0.2s_ease-out]';
    
    // Header
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center p-3 border-b border-gray-800 bg-gray-800/50';
    header.innerHTML = `<span class="font-bold text-gray-200 text-sm">合成 — SHOP</span>
      <button class="text-gray-400 hover:text-white" id="close-craft-modal">
        <span class="material-symbols-outlined text-xl">close</span>
      </button>`;
      
    // Body
    const body = document.createElement('div');
    body.className = 'p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto';
    
    // Top: Icon + Name + Stats
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
      : '';

    const itemImgClass = canCraft ? 'w-full h-full object-cover' : `w-full h-full object-cover ${SILHOUETTE_FILTER}`;
    const topSection = `
      <div class="flex gap-4">
        <div class="flex flex-col items-center gap-2 w-1/3 shrink-0">
          <div class="w-20 h-20 bg-black/50 rounded border border-gray-700 flex items-center justify-center overflow-hidden">
            ${item.image ? `<img src="${item.image}" class="${itemImgClass}" onerror="this.style.display='none'">` : `<span class="material-symbols-outlined text-3xl text-gray-600">category</span>`}
          </div>
          <div class="text-sm font-bold text-center leading-tight text-gray-200 w-full break-words">${item.name}</div>
          <div class="text-[10px] text-gray-400 font-bold mt-1">所持数: <span class="font-mono text-blue-400">${ownedCount}</span> / 9999</div>
        </div>
        <div class="flex-1 bg-black/40 border border-gray-700 p-2 rounded flex flex-col">
          <div class="text-xs font-bold text-gray-400 mb-2 pb-1 border-b border-gray-700/50">性能表示</div>
          ${statsHtml}
        </div>
      </div>
    `;

    // 必要素材セクション
    const materialsSection = document.createElement('div');
    materialsSection.className = 'bg-black/40 border border-gray-700 rounded p-3';
    
    let materialsHtml = `<div class="text-xs font-bold text-gray-400 mb-2 pb-1 border-b border-gray-700/50 flex items-center gap-1">
      <span class="material-symbols-outlined text-sm">inventory_2</span>必要素材
    </div>`;
    
    materialsHtml += `<div class="flex flex-col gap-1.5">`;
    item.recipe.materials.forEach(mat => {
      const matDef = ALL_DEFINITIONS.find(d => d.id === mat.id);
      const owned = inventoryMap[mat.id] || 0;
      const enough = owned >= mat.amount;
      const matAcquired = acquiredIds.has(mat.id);
      const showMatSilhouette = !matAcquired;
      const matImgClass = showMatSilhouette ? `w-full h-full object-cover ${SILHOUETTE_FILTER}` : 'w-full h-full object-cover';
      materialsHtml += `
        <div class="flex items-center gap-2 py-1">
          <div class="w-8 h-8 bg-black/50 rounded border border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
            ${matDef && matDef.image ? `<img src="${matDef.image}" class="${matImgClass}" onerror="this.style.display='none'">` : `<span class="material-symbols-outlined text-gray-600 text-sm">category</span>`}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-bold text-gray-300 truncate">${matDef ? matDef.name : mat.id}</div>
          </div>
          <div class="text-xs font-mono font-bold shrink-0 ${enough ? 'text-green-400' : 'text-red-400'}">
            ${owned} / ${mat.amount}
          </div>
        </div>
      `;
    });
    materialsHtml += `</div>`;

    // 合成費用
    const price = item.recipe.price || 0;
    const hasEnoughGold = currentGold >= price;
    materialsHtml += `
      <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-700/50">
        <div class="flex items-center gap-1">
          <span class="material-symbols-outlined text-yellow-400 text-sm" style="font-variation-settings: 'FILL' 1">paid</span>
          <span class="text-xs font-bold text-gray-400">合成費用</span>
        </div>
        <span class="text-sm font-bold font-mono ${hasEnoughGold ? 'text-yellow-300' : 'text-red-400'}">${price.toLocaleString()} G</span>
      </div>
    `;
    materialsSection.innerHTML = materialsHtml;

    // 合成ボタン
    const craftBtn = document.createElement('button');
    
    if (ownedCount >= 9999) {
      craftBtn.className = 'w-full py-3.5 rounded-lg font-bold text-sm bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed flex justify-center items-center gap-2';
      craftBtn.innerHTML = `<span class="material-symbols-outlined text-[20px]">block</span>所持上限（9999個）に達しています`;
    } else if (canCraft) {
      craftBtn.className = 'w-full py-3.5 rounded-lg font-bold text-sm bg-green-900/40 border border-green-700/50 text-green-200 hover:bg-green-800/50 hover:text-white transition-all active:scale-95 flex justify-center items-center gap-2 shadow-lg';
      craftBtn.innerHTML = `<span class="material-symbols-outlined text-[20px]">construction</span>合成する`;
    } else {
      craftBtn.className = 'w-full py-3.5 rounded-lg font-bold text-sm bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed flex justify-center items-center gap-2';
      craftBtn.innerHTML = `<span class="material-symbols-outlined text-[20px]">block</span>素材またはゴールドが不足しています`;
    }
    
    body.innerHTML = topSection;
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

    // 合成実行
    craftBtn.onclick = async () => {
      if (!canCraft) return;

      // ゴールドを減らす
      currentGold -= price;
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
          const newQty = (invItem.quantity || 0) - mat.amount;
          if (newQty <= 0) {
            await GameDB.deleteInventoryItem(mat.id);
          } else {
            await GameDB.putInventoryItem({ ...invItem, quantity: newQty });
          }
          inventoryMap[mat.id] = Math.max(0, (inventoryMap[mat.id] || 0) - mat.amount);
        }
      }

      // 装備アイテムを作成（ユニークID付与）
      const uniqueId = `${item.id}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const newEquipment = {
        id: uniqueId,
        baseId: item.id,
      };
      await GameDB.putEquipment(newEquipment);

      equipmentCountMap[item.id] = (equipmentCountMap[item.id] || 0) + 1;

      // 合成成功エフェクト
      closeModal();
      showCraftSuccessEffect(item);

      // グリッド再描画
      renderGrid();
    };
  };

  /** 合成成功時のエフェクト */
  const showCraftSuccessEffect = (item) => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-green-900/90 border border-green-500/50 rounded-xl shadow-2xl text-sm font-bold text-green-200 animate-[slide-up_0.3s_ease-out] backdrop-blur-sm';
    toast.innerHTML = `
      <span class="material-symbols-outlined text-green-400" style="font-variation-settings: 'FILL' 1">check_circle</span>
      <span>${item.name} を合成しました！</span>
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
