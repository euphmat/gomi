// モック用の報酬アイテムデータ
const MOCK_REWARDS = [
  { id: 'r1', name: 'ログインボーナス（1日目）', icon: 'redeem' },
  { id: 'r2', name: '初心者クエスト達成報酬', icon: 'military_tech' },
  { id: 'r3', name: 'スライムの森 踏破報酬', icon: 'forest' },
  { id: 'r4', name: '特別支給品パック', icon: 'inventory_2' },
];

/**
 * 「報酬受け取り」タブの画面
 */
export function renderReceiveRewardTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full p-2 animate-fade-in overflow-hidden';

  const listContainer = document.createElement('div');
  listContainer.className = 'flex-1 overflow-y-auto space-y-2 pb-4 pr-1';
  
  MOCK_REWARDS.forEach(reward => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3 p-3 bg-gray-800/80 rounded-xl border border-gray-700/50';
    
    row.innerHTML = `
      <div class="flex items-center justify-center w-12 h-12 bg-gray-900 rounded-lg shrink-0">
        <span class="material-symbols-outlined text-2xl text-yellow-400">${reward.icon}</span>
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-bold text-gray-200 truncate">${reward.name}</h3>
      </div>
      <button class="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold rounded-lg shadow transition-colors shrink-0">
        受け取り
      </button>
    `;
    listContainer.appendChild(row);
  });

  container.appendChild(listContainer);

  return container;
}
