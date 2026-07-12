import { renderShopTab } from './shop-tabs/shop-tab.js';
import { renderStorageTab } from './shop-tabs/storage-tab.js';
import { renderMedalTab } from './shop-tabs/medal-tab.js';
import { renderGachaTab } from './shop-tabs/gacha-tab.js';

/**
 * このファイルは「ショップ」画面のメインコンテナです。
 * 内部で「ショップ」タブと「倉庫」タブを切り替えて表示します。
 */
export function renderShopPage() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full bg-[#0b0b19]';

  // タブの定義
  const TABS = [
    { id: 'shop', label: 'ショップ', icon: 'storefront', activeClass: 'border-cyan-400/45 bg-cyan-950/55 text-cyan-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),_0_0_12px_rgba(34,211,238,0.18)]', idleClass: 'hover:border-cyan-500/35 hover:bg-cyan-950/30 hover:text-cyan-300' },
    { id: 'storage', label: '倉庫', icon: 'inventory_2', activeClass: 'border-sky-400/45 bg-sky-950/55 text-sky-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),_0_0_12px_rgba(56,189,248,0.18)]', idleClass: 'hover:border-sky-500/35 hover:bg-sky-950/30 hover:text-sky-300' },
    { id: 'medal', label: 'メダル鋳造', icon: 'military_tech', activeClass: 'border-yellow-400/45 bg-yellow-950/55 text-yellow-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),_0_0_12px_rgba(250,204,21,0.18)]', idleClass: 'hover:border-yellow-500/35 hover:bg-yellow-950/30 hover:text-yellow-300' },
    { id: 'gacha', label: '秘宝ガチャ', icon: 'auto_awesome', activeClass: 'border-fuchsia-400/45 bg-fuchsia-950/55 text-fuchsia-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),_0_0_12px_rgba(217,70,239,0.18)]', idleClass: 'hover:border-fuchsia-500/35 hover:bg-fuchsia-950/30 hover:text-fuchsia-300' }
  ];
  
  let activeTabId = 'shop';

  // ヘッダー部分（タブナビゲーション）
  const tabHeader = document.createElement('div');
  tabHeader.className = 'flex items-center gap-1.5 p-2 bg-slate-950/70 border-b border-slate-900 shrink-0 overflow-x-auto no-scrollbar backdrop-blur-md z-10';
  tabHeader.setAttribute('role', 'tablist');
  tabHeader.setAttribute('aria-label', 'ショップ機能');
  
  // コンテンツ領域
  const contentArea = document.createElement('div');
  contentArea.className = 'flex-1 overflow-hidden relative';

  const renderTabs = () => {
    tabHeader.innerHTML = '';
    TABS.forEach(tab => {
      const btn = document.createElement('button');
      const isActive = tab.id === activeTabId;
      
      btn.className = `
        flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95
        ${isActive 
          ? `gap-1.5 px-3 ${tab.activeClass}`
          : `px-2 border-slate-800/70 bg-slate-900/45 text-slate-500 ${tab.idleClass}`}
      `;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(isActive));
      btn.setAttribute('aria-label', tab.label);
      btn.title = tab.label;
      btn.innerHTML = `
        <span class="material-symbols-outlined text-[18px] leading-none">${tab.icon}</span>
        ${isActive ? `<span class="leading-none">${tab.label}</span>` : ''}
      `;
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
      case 'shop':
        tabContent = renderShopTab();
        break;
      case 'storage':
        tabContent = renderStorageTab();
        break;
      case 'medal':
        tabContent = renderMedalTab();
        break;
      case 'gacha':
        tabContent = renderGachaTab();
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
