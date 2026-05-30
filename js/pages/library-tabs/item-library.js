import { GameDB } from '../../data/database.js';

export function renderItemLibraryTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full p-2 animate-fade-in overflow-hidden';

  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid grid-cols-7 gap-2 overflow-y-auto content-start pb-6 pr-1 flex-1';

  const renderGrid = (items) => {
    gridContainer.innerHTML = '';
    
    if (items.length === 0) {
      gridContainer.innerHTML = `<div class="col-span-full text-center text-gray-500 text-sm mt-8">アイテムデータがありません</div>`;
      return;
    }

    items.forEach(item => {
      const slot = document.createElement('div');
      slot.className = 'aspect-square bg-black/40 rounded-md border border-gray-700/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-gray-400 hover:bg-gray-800 transition-all shadow-sm';
      
      if (item.image) {
        slot.innerHTML = `<img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">`;
      } else {
        slot.innerHTML = `<span class="material-symbols-outlined text-gray-600 text-lg">category</span>`;
      }
      
      slot.onclick = () => alert(`【${item.name}】\n詳細画面は準備中です。`);
      gridContainer.appendChild(slot);
    });
  };

  GameDB.getAllEquipment().then(eq => {
    let items = eq;
    // テスト用に水増し
    if (items.length > 0 && items.length < 30) {
        const dummyItems = [];
        for(let i=0; i<30; i++) {
            dummyItems.push({...items[i % items.length], id: items[i % items.length].id + '_' + i});
        }
        items = dummyItems;
    }
    renderGrid(items);
  });

  container.appendChild(gridContainer);
  return container;
}
