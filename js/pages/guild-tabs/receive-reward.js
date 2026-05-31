import { GameDB } from '../../data/database.js';
import { ACCESSORIES } from '../../definitions/accessories.js';
import { WEAPONS } from '../../definitions/weapons.js';
import { ARMORS } from '../../definitions/armors.js';
import { SHIELDS } from '../../definitions/shields.js';
import { MATERIALS } from '../../definitions/materials.js';
import { MONSTERS } from '../../definitions/monsters.js';

// すべてのアイテムを一つの配列にまとめる（検索用）
const ALL_ITEMS = [...WEAPONS, ...ARMORS, ...SHIELDS, ...ACCESSORIES, ...MATERIALS];

// 実績報酬の定義（モンスター定義から動的に生成）
const ACHIEVEMENTS = [];
MONSTERS.forEach(monster => {
  if (monster.killRewards) {
    monster.killRewards.forEach(reward => {
      const itemDef = ALL_ITEMS.find(item => item.id === reward.itemId);
      ACHIEVEMENTS.push({
        id: `reward_${monster.id}_${reward.count}`,
        name: `${monster.name}${reward.count}体討伐報酬`,
        itemName: itemDef ? itemDef.name : '不明なアイテム',
        image: itemDef ? itemDef.image : '',
        condition: (killCounts) => (killCounts[monster.id] || 0) >= reward.count,
        progress: (killCounts) => `${Math.min(killCounts[monster.id] || 0, reward.count)} / ${reward.count}`,
        itemId: reward.itemId
      });
    });
  }
});

let showReceived = false;

export async function renderReceiveRewardTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full p-2 animate-fade-in overflow-hidden';

  const listContainer = document.createElement('div');
  listContainer.className = 'flex-1 overflow-y-auto space-y-2 pb-4 pr-1';

  // GameDBから現在の討伐数と受け取り済み報酬を取得
  const killCounts = await GameDB.getGameState('killCounts') || {};
  let receivedRewards = await GameDB.getGameState('receivedRewards') || {};

  const headerContainer = document.createElement('div');
  headerContainer.className = 'flex items-center justify-end mb-2 px-2 shrink-0';
  
  const toggleLabel = document.createElement('label');
  toggleLabel.className = 'flex items-center cursor-pointer gap-2';
  toggleLabel.innerHTML = `
    <span class="text-xs font-bold text-gray-300">受け取り済みを表示</span>
    <div class="relative">
      <input type="checkbox" class="sr-only" id="toggle-received" ${showReceived ? 'checked' : ''}>
      <div id="toggle-block" class="block ${showReceived ? 'bg-blue-600' : 'bg-gray-700'} w-10 h-6 rounded-full transition-colors"></div>
      <div id="toggle-dot" class="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showReceived ? 'translate-x-4' : ''}"></div>
    </div>
  `;
  headerContainer.appendChild(toggleLabel);
  container.appendChild(headerContainer);
  container.appendChild(listContainer);

  const checkbox = toggleLabel.querySelector('#toggle-received');
  const toggleBlock = toggleLabel.querySelector('#toggle-block');
  const toggleDot = toggleLabel.querySelector('#toggle-dot');

  const renderList = () => {
    listContainer.innerHTML = '';
    
    const visibleRewards = ACHIEVEMENTS.filter(reward => {
      const isCompleted = reward.condition(killCounts);
      const isReceived = receivedRewards[reward.id];
      if (!isCompleted) return false;
      if (isReceived && !showReceived) return false;
      return true;
    });

    if (visibleRewards.length === 0) {
      listContainer.innerHTML = '<div class="text-center text-gray-500 mt-4 text-sm font-bold">表示できる報酬がありません</div>';
      return;
    }

    visibleRewards.forEach(reward => {
      const isReceived = receivedRewards[reward.id];

      const row = document.createElement('div');
      row.className = `flex items-center gap-3 p-3 rounded-xl border ${
        isReceived ? 'bg-gray-900 border-gray-800 opacity-70' : 
        'bg-gray-800 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]'
      }`;
      
      let buttonHtml = '';
      if (isReceived) {
        buttonHtml = `<button disabled class="px-4 py-2 bg-gray-700 text-gray-400 text-xs font-bold rounded-lg cursor-not-allowed shrink-0">受け取り済み</button>`;
      } else {
        buttonHtml = `<button data-id="${reward.id}" class="btn-receive px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold rounded-lg shadow transition-colors shrink-0">受け取る</button>`;
      }

      row.innerHTML = `
        <div class="flex items-center justify-center w-12 h-12 bg-gray-900 rounded-lg shrink-0 overflow-hidden ${!isReceived ? 'border border-yellow-500/50' : ''}">
          ${reward.image 
            ? `<img src="${reward.image}" class="w-10 h-10 object-contain ${isReceived ? 'opacity-50 grayscale' : ''}" alt="${reward.name}" />` 
            : `<span class="material-symbols-outlined text-2xl ${!isReceived ? 'text-yellow-400' : 'text-gray-500'}">military_tech</span>`
          }
        </div>
        <div class="flex-1 min-w-0 flex flex-col justify-center">
          <h3 class="text-sm font-bold ${!isReceived ? 'text-yellow-100' : 'text-gray-400'} truncate">${reward.name}</h3>
          <span class="text-xs text-blue-300 truncate mt-0.5">${reward.itemName}</span>
        </div>
        ${buttonHtml}
      `;
      listContainer.appendChild(row);
    });

    // ボタンイベントの設定
    listContainer.querySelectorAll('.btn-receive').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const rewardId = e.currentTarget.dataset.id;
        const reward = ACHIEVEMENTS.find(r => r.id === rewardId);
        if (!reward) return;

        // Prevent double click
        btn.disabled = true;

        // アイテム付与
        let itemDef = ALL_ITEMS.find(item => item.id === reward.itemId);

        if (itemDef) {
          const isMaterial = MATERIALS.some(m => m.id === itemDef.id);
          
          if (isMaterial) {
            const existingItem = await GameDB.getInventoryItem(itemDef.id);
            const currentQuantity = existingItem ? existingItem.quantity : 0;
            await GameDB.putInventoryItem({ ...itemDef, quantity: currentQuantity + 1 });
          } else {
            const uniqueId = `eq_${Date.now()}_${Math.floor(Math.random()*10000)}`;
            const newItem = { ...itemDef, uniqueId, isEquipped: false };
            await GameDB.putEquipment(newItem);
          }
        }

        // フラグ更新
        receivedRewards[rewardId] = true;
        await GameDB.setGameState('receivedRewards', receivedRewards);

        // 再描画
        renderList();
      });
    });
  };

  checkbox.addEventListener('change', (e) => {
    showReceived = e.target.checked;
    
    if (showReceived) {
      toggleBlock.classList.replace('bg-gray-700', 'bg-blue-600');
      toggleDot.classList.add('translate-x-4');
    } else {
      toggleBlock.classList.replace('bg-blue-600', 'bg-gray-700');
      toggleDot.classList.remove('translate-x-4');
    }

    renderList();
  });

  renderList();
  return container;
}
