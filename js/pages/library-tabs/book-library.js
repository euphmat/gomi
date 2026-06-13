import { calcItemsPerPage } from '../../data/page-utils.js';

export function renderBookLibraryTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full animate-fade-in overflow-hidden';

  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'overflow-y-auto flex-1 p-2 pb-6';

  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid grid-cols-7 gap-2 content-start';

  scrollContainer.appendChild(gridContainer);

  const paginationContainer = document.createElement('div');
  paginationContainer.className = 'flex items-center justify-center gap-4 py-2 shrink-0 bg-slate-950/80 border-t border-slate-800 pb-4';

  // ダミーの書物データ (テスト用に少し多めに生成)
  const books = Array.from({ length: 45 }).map((_, i) => ({
    id: `book_${i}`,
    name: `古文書 第${i+1}巻`
  }));

  let currentPage = 1;

  const renderPagination = (totalPages) => {
    paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;
    
    const prevBtn = document.createElement('button');
    prevBtn.className = `w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${currentPage > 1 ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer' : 'bg-slate-900 text-slate-600 cursor-not-allowed'}`;
    prevBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">chevron_left</span>';
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderGrid();
        scrollContainer.scrollTop = 0;
      }
    };

    const info = document.createElement('div');
    info.className = 'text-xs font-bold text-slate-400 font-mono tracking-widest';
    info.textContent = `${currentPage} / ${totalPages}`;

    const nextBtn = document.createElement('button');
    nextBtn.className = `w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${currentPage < totalPages ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer' : 'bg-slate-900 text-slate-600 cursor-not-allowed'}`;
    nextBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">chevron_right</span>';
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderGrid();
        scrollContainer.scrollTop = 0;
      }
    };
    
    paginationContainer.appendChild(prevBtn);
    paginationContainer.appendChild(info);
    paginationContainer.appendChild(nextBtn);
  };

  const renderGrid = () => {
    gridContainer.innerHTML = '';
    
    // 書物タブはグリッド専用 (7列)
    const ITEMS_PER_PAGE = calcItemsPerPage({ viewMode: 'grid', scrollContainer, gridCols: 7 });
    const totalPages = Math.ceil(books.length / ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = books.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (books.length === 0) {
      gridContainer.innerHTML = `<div class="col-span-full text-center text-gray-500 text-sm mt-8">書物データがありません</div>`;
      renderPagination(1);
      return;
    }

    pageItems.forEach(item => {
      const slot = document.createElement('div');
      slot.className = 'relative w-full aspect-square bg-black/40 rounded-md border border-gray-700/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-gray-400 hover:bg-gray-800 transition-all shadow-sm';
      
      slot.innerHTML = `<span class="material-symbols-outlined text-gray-400 text-lg">menu_book</span>`;
      
      slot.onclick = () => alert(`【${item.name}】\n読む機能は準備中です。`);
      gridContainer.appendChild(slot);
    });

    renderPagination(totalPages);
  };

  // 初期レンダリング (DOMマウント後に実測値で再計算させるため遅延実行)
  setTimeout(() => {
    renderGrid();
  }, 0);

  container.appendChild(scrollContainer);
  container.appendChild(paginationContainer);
  
  return container;
}
