export function renderBookLibraryTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full p-2 animate-fade-in overflow-hidden';

  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid grid-cols-7 gap-2 overflow-y-auto content-start pb-6 pr-1 flex-1';

  // ダミーの書物データ
  const books = Array.from({ length: 15 }).map((_, i) => ({
    id: `book_${i}`,
    name: `古文書 第${i+1}巻`
  }));

  books.forEach(item => {
    const slot = document.createElement('div');
    slot.className = 'aspect-square bg-black/40 rounded-md border border-gray-700/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-gray-400 hover:bg-gray-800 transition-all shadow-sm';
    
    slot.innerHTML = `<span class="material-symbols-outlined text-gray-400 text-lg">menu_book</span>`;
    
    slot.onclick = () => alert(`【${item.name}】\n読む機能は準備中です。`);
    gridContainer.appendChild(slot);
  });

  container.appendChild(gridContainer);
  return container;
}
