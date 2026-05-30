import { renderShopTab } from './shop-tabs/shop-tab.js';
import { renderStorageTab } from './shop-tabs/storage-tab.js';

/**
 * このファイルは「ショップ（お店）」画面のメインコンテナです。
 * 内部で「ショップ」タブと「倉庫」タブを切り替えて表示します。
 */
export function renderShopPage() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full bg-[#0b0b19]';

  // タブの定義
  const TABS = [
    { id: 'shop', label: 'ショップ' },
    { id: 'storage', label: '倉庫' }
  ];
  
  let activeTabId = 'shop';

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
      case 'shop':
        tabContent = renderShopTab();
        break;
      case 'storage':
        tabContent = renderStorageTab();
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

