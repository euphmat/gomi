import { renderDailyQuestTab } from './quest-tabs/daily-quest.js';
import { renderSpecialQuestTab } from './quest-tabs/special-quest.js';
import { renderItemLibraryTab } from './library-tabs/item-library.js';
import { renderMonsterLibraryTab } from './library-tabs/monster-library.js';
import { renderFishLibraryTab } from './library-tabs/fish-library.js';
import { consumeHashRouteParam } from '../utils/route-params.js';

/**
 * クエスト画面のメインコンテナ
 * 内部でクエストと各種図鑑のタブを切り替えて表示します。
 */
export function renderQuestPage() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full bg-[#0b0b19]';

  const TABS = [
    { id: 'daily', label: 'デイリー', icon: 'today', activeClass: 'border-sky-400/45 bg-sky-950/55 text-sky-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),_0_0_12px_rgba(56,189,248,0.18)]', idleClass: 'active:border-sky-500/35 active:bg-sky-950/30 active:text-sky-300' },
    { id: 'special', label: 'スペシャル', icon: 'stars', activeClass: 'border-fuchsia-400/45 bg-fuchsia-950/55 text-fuchsia-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),_0_0_12px_rgba(232,121,249,0.18)]', idleClass: 'active:border-fuchsia-500/35 active:bg-fuchsia-950/30 active:text-fuchsia-300' },
    { id: 'item_lib', label: 'アイテム図鑑', icon: 'auto_stories', activeClass: 'border-indigo-400/45 bg-indigo-950/55 text-indigo-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),_0_0_12px_rgba(129,140,248,0.18)]', idleClass: 'active:border-indigo-500/35 active:bg-indigo-950/30 active:text-indigo-300' },
    { id: 'monster_lib', label: 'モンスター図鑑', icon: 'pets', activeClass: 'border-emerald-400/45 bg-emerald-950/55 text-emerald-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),_0_0_12px_rgba(52,211,153,0.18)]', idleClass: 'active:border-emerald-500/35 active:bg-emerald-950/30 active:text-emerald-300' },
    { id: 'fish_lib', label: '魚図鑑', icon: 'phishing', activeClass: 'border-cyan-400/45 bg-cyan-950/55 text-cyan-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),_0_0_12px_rgba(34,211,238,0.18)]', idleClass: 'active:border-cyan-500/35 active:bg-cyan-950/30 active:text-cyan-300' }
  ];
  
  const requestedTabId = consumeHashRouteParam('tab');
  let activeTabId = TABS.some(tab => tab.id === requestedTabId) ? requestedTabId : 'daily';

  // ヘッダー部分（タブナビゲーション）
  const tabHeader = document.createElement('div');
  tabHeader.className = 'flex items-center gap-1.5 p-2 bg-slate-950/70 border-b border-slate-900 shrink-0 overflow-x-auto no-scrollbar backdrop-blur-md z-10';
  tabHeader.setAttribute('role', 'tablist');
  tabHeader.setAttribute('aria-label', 'クエストと図鑑');
  
  // コンテンツ領域
  const contentArea = document.createElement('div');
  contentArea.className = 'flex-1 overflow-hidden relative';

  const renderTabs = () => {
    tabHeader.innerHTML = '';
    TABS.forEach(tab => {
      const btn = document.createElement('button');
      const isActive = tab.id === activeTabId;
      
      btn.className = `
        flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-95
        ${isActive 
          ? `gap-1.5 px-3 ${tab.activeClass}`
          : `px-2 border-slate-800/70 bg-slate-900/45 text-slate-500 ${tab.idleClass}`}
      `;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(isActive));
      btn.setAttribute('aria-label', tab.label);
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
      case 'daily':
        tabContent = renderDailyQuestTab();
        break;
      case 'special':
        tabContent = renderSpecialQuestTab();
        break;
      case 'item_lib':
        tabContent = renderItemLibraryTab();
        break;
      case 'monster_lib':
        tabContent = renderMonsterLibraryTab();
        break;
      case 'fish_lib':
        tabContent = renderFishLibraryTab();
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
  container.refreshNumberNotation = () => renderContent();

  return container;
}
