import { renderForgeTab } from './forge-tabs/forge-tab.js';
import { renderStorageTab } from './forge-tabs/storage-tab.js';

/**
 * このファイルは「鍛冶屋」画面のメインコンテナです。
 * 内部で「鍛冶屋」タブと「倉庫」タブを切り替えて表示します。
 */
export function renderForgePage() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full bg-[#0b0b19]';

  // タブの定義
  const TABS = [
    { id: 'forge', label: '鍛冶屋' },
    { id: 'storage', label: '倉庫' }
  ];
  
  let activeTabId = 'forge';

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

  const renderContent = async () => {
    // Smooth Fade-out transition
    contentArea.style.transition = 'opacity 0.15s ease-out, transform 0.15s ease-out';
    contentArea.style.opacity = '0';
    contentArea.style.transform = 'translateY(4px) scale(0.99)';

    await new Promise(r => setTimeout(r, 150));
    contentArea.innerHTML = ''; // クリア
    const currentTabId = activeTabId;
    let tabContent;

    switch (currentTabId) {
      case 'forge':
        tabContent = renderForgeTab();
        break;
      case 'storage':
        tabContent = renderStorageTab();
        break;
    }

    if (tabContent instanceof Promise) {
      tabContent = await tabContent;
    }

    if (activeTabId !== currentTabId) return;

    if (tabContent) {
      contentArea.appendChild(tabContent);
      
      // Smooth Fade-in transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          contentArea.style.opacity = '1';
          contentArea.style.transform = 'translateY(0) scale(1)';
        });
      });
    }
  };

  // 初期レンダリング
  renderTabs();
  renderContent();

  container.appendChild(tabHeader);
  container.appendChild(contentArea);

  return container;
}

