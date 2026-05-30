import { MONSTERS } from '../../definitions/monsters.js';

export function renderMonsterLibraryTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full p-2 animate-fade-in overflow-hidden';

  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid grid-cols-7 gap-2 overflow-y-auto content-start pb-6 pr-1 flex-1';

  let items = [...MONSTERS];
  // 開発中のテスト用にモンスターを複製してグリッド感を出す
  if (items.length > 0 && items.length < 30) {
      const dummyItems = [];
      for(let i=0; i<30; i++) {
          dummyItems.push({...items[i % items.length], id: items[i % items.length].id + '_' + i});
      }
      items = dummyItems;
  }

  items.forEach(item => {
    const slot = document.createElement('div');
    slot.className = 'aspect-square bg-black/40 rounded-md border border-gray-700/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-gray-400 hover:bg-gray-800 transition-all shadow-sm';
    
    if (item.image) {
      slot.innerHTML = `<img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">`;
    } else {
      slot.innerHTML = `<span class="material-symbols-outlined text-gray-600 text-lg">pets</span>`;
    }
    
    slot.onclick = () => alert(`【${item.name}】\nHP: ${item.stats?.hp || '?'}\n詳細画面は準備中です。`);
    gridContainer.appendChild(slot);
  });

  container.appendChild(gridContainer);
  return container;
}
