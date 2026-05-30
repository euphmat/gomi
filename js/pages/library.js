import { renderItemLibraryTab } from './library-tabs/item-library.js';
import { renderMonsterLibraryTab } from './library-tabs/monster-library.js';
import { renderBookLibraryTab } from './library-tabs/book-library.js';

/**
 * このファイルは「図鑑（ライブラリ）」画面のメインコンテナです。
 * 内部で3つのタブ（アイテム図鑑、モンスター図鑑、書物）を切り替えて表示します。
 */
export function renderLibraryPage() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full bg-[#0b0b19]';

  // タブの定義
  const TABS = [
    { id: 'item', label: 'アイテム図鑑' },
    { id: 'monster', label: 'モンスター図鑑' },
    { id: 'book', label: '書物' }
  ];
  
  let activeTabId = 'item';

  // ヘッダー部分（タブナビゲーション）
  const tabHeader = document.createElement('div');
  tabHeader.className = 'flex items-center gap-1 p-2 bg-gray-900/50 border-b border-gray-800 shrink-0 overflow-x-auto no-scrollbar';
  
  // コンテンツ領域
  const contentArea = document.createElement('div');
  contentArea.className = 'flex-1 overflow-hidden relative';

  const renderTabs = () => {
    tabHeader.innerHTML = '';
    TABS.forEach(tab => {
      const btn = document.createElement('button');
      const isActive = tab.id === activeTabId;
      
      btn.className = `
        px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors
        ${isActive 
          ? 'bg-green-600 text-white shadow-md' 
          : 'bg-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-200'}
      `;
      btn.textContent = tab.label;
      btn.onclick = () => {
        if (activeTabId !== tab.id) {
          activeTabId = tab.id;
          renderTabs();
          renderContent();
        }
      };
      tabHeader.appendChild(btn);
    });
  };

  const renderContent = () => {
    contentArea.innerHTML = ''; // クリア
    let tabContent;

    switch (activeTabId) {
      case 'item':
        tabContent = renderItemLibraryTab();
        break;
      case 'monster':
        tabContent = renderMonsterLibraryTab();
        break;
      case 'book':
        tabContent = renderBookLibraryTab();
        break;
    }

    if (tabContent) {
      contentArea.appendChild(tabContent);
    }
  };

  // 初期レンダリング
  renderTabs();
  renderContent();

  container.appendChild(tabHeader);
  container.appendChild(contentArea);

  return container;
}
