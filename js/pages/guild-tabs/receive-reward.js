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
        image: itemDef ? itemDef.image : '',
        condition: (killCounts) => (killCounts[monster.id] || 0) >= reward.count,
        progress: (killCounts) => `${Math.min(killCounts[monster.id] || 0, reward.count)} / ${reward.count}`,
        itemId: reward.itemId
      });
    });
  }
});

export async function renderReceiveRewardTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full p-2 animate-fade-in overflow-hidden';

  const listContainer = document.createElement('div');
  listContainer.className = 'flex-1 overflow-y-auto space-y-2 pb-4 pr-1';

  // GameDBから現在の討伐数と受け取り済み報酬を取得
  const killCounts = await GameDB.getGameState('killCounts') || {};
  const receivedRewards = await GameDB.getGameState('receivedRewards') || {};

  ACHIEVEMENTS.forEach(reward => {
    const isCompleted = reward.condition(killCounts);
    const isReceived = receivedRewards[reward.id];

    const row = document.createElement('div');
    row.className = `flex items-center gap-3 p-3 rounded-xl border ${
      isReceived ? 'bg-gray-900 border-gray-800 opacity-70' : 
      isCompleted ? 'bg-gray-800 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 
      'bg-gray-800/50 border-gray-700/50'
    }`;
    
    let buttonHtml = '';
    if (isReceived) {
      buttonHtml = `<button disabled class="px-4 py-2 bg-gray-700 text-gray-400 text-xs font-bold rounded-lg cursor-not-allowed shrink-0">受け取り済み</button>`;
    } else if (isCompleted) {
      buttonHtml = `<button data-id="${reward.id}" class="btn-receive px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold rounded-lg shadow transition-colors shrink-0">受け取る</button>`;
    } else {
      buttonHtml = `<div class="px-2 py-1 text-xs text-gray-400 shrink-0 bg-gray-900 rounded">${reward.progress(killCounts)}</div>`;
    }

    row.innerHTML = `
      <div class="flex items-center justify-center w-12 h-12 bg-gray-900 rounded-lg shrink-0 overflow-hidden ${isCompleted && !isReceived ? 'border border-yellow-500/50' : ''}">
        ${reward.image 
          ? `<img src="${reward.image}" class="w-10 h-10 object-contain ${!isCompleted || isReceived ? 'opacity-50 grayscale' : ''}" alt="${reward.name}" />` 
          : `<span class="material-symbols-outlined text-2xl ${isCompleted && !isReceived ? 'text-yellow-400' : 'text-gray-500'}">military_tech</span>`
        }
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-bold ${isCompleted && !isReceived ? 'text-yellow-100' : 'text-gray-400'} truncate">${reward.name}</h3>
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

      // アイテム付与
      let itemDef = ALL_ITEMS.find(item => item.id === reward.itemId);

      if (itemDef) {
        const isMaterial = MATERIALS.some(m => m.id === itemDef.id);
        
        if (isMaterial) {
          const existingItem = await GameDB.getInventoryItem(itemDef.id);
          const currentAmount = existingItem ? existingItem.amount : 0;
          await GameDB.putInventoryItem({ ...itemDef, amount: currentAmount + 1 });
        } else {
          const uniqueId = `eq_${Date.now()}_${Math.floor(Math.random()*10000)}`;
          const newItem = { ...itemDef, uniqueId, isEquipped: false };
          await GameDB.putEquipment(newItem);
        }
        alert(`${itemDef.name} を受け取りました！`);
      }

      // フラグ更新
      const updatedReceived = await GameDB.getGameState('receivedRewards') || {};
      updatedReceived[rewardId] = true;
      await GameDB.setGameState('receivedRewards', updatedReceived);

      // 再描画 (親コンポーネントによる再描画が望ましいが、簡易的に中身を置き換える)
      const newContent = await renderReceiveRewardTab();
      container.innerHTML = '';
      container.appendChild(newContent.firstChild); // flex-1...
    });
  });

  container.appendChild(listContainer);
  return container;
}
