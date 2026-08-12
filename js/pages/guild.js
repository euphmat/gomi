import { renderInnTab } from './guild-tabs/inn.js';
import { renderChangeJobTab } from './guild-tabs/change-job.js';
import { renderAcquireSkillTab } from './guild-tabs/acquire-skill.js';
import { renderRanchTab } from './guild-tabs/ranch.js';
import { renderMineTab } from './guild-tabs/mine.js';
import { consumeHashRouteParam } from '../utils/route-params.js';

/**
 * このファイルは「ギルド」画面のメインコンテナです。
 * 内部で複数のタブを切り替えて表示します。
 */
export function renderGuildPage() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full bg-[#0b0b19]';

  // タブの定義 (宿屋を一番左に追加)
  const TABS = [
    { id: 'inn', label: '宿屋', icon: 'hotel', activeClass: 'border-rose-400/45 bg-rose-950/55 text-rose-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),_0_0_12px_rgba(251,113,133,0.18)]', idleClass: 'active:border-rose-500/35 active:bg-rose-950/30 active:text-rose-300' },
    { id: 'skill', label: '修練場', icon: 'sports_martial_arts', activeClass: 'border-orange-400/45 bg-orange-950/55 text-orange-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),_0_0_12px_rgba(251,146,60,0.18)]', idleClass: 'active:border-orange-500/35 active:bg-orange-950/30 active:text-orange-300' },
    { id: 'job', label: '神殿', icon: 'church', activeClass: 'border-violet-400/45 bg-violet-950/55 text-violet-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),_0_0_12px_rgba(167,139,250,0.18)]', idleClass: 'active:border-violet-500/35 active:bg-violet-950/30 active:text-violet-300' },
    { id: 'ranch', label: '牧場', icon: 'pets', activeClass: 'border-pink-400/45 bg-pink-950/55 text-pink-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),_0_0_12px_rgba(244,114,182,0.18)]', idleClass: 'active:border-pink-500/35 active:bg-pink-950/30 active:text-pink-300' },
    { id: 'mine', label: '鉱山', icon: 'landscape', activeClass: 'border-amber-400/45 bg-amber-950/55 text-amber-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),_0_0_12px_rgba(251,191,36,0.18)]', idleClass: 'active:border-amber-500/35 active:bg-amber-950/30 active:text-amber-300' }
  ];
  const requestedTabId = consumeHashRouteParam('tab');
  let activeTabId = TABS.some(tab => tab.id === requestedTabId) ? requestedTabId : 'inn';

  // ヘッダー部分（タブナビゲーション）
  const tabHeader = document.createElement('div');
  tabHeader.className = 'flex items-center gap-1.5 p-2 bg-slate-950/70 border-b border-slate-900 shrink-0 overflow-x-auto no-scrollbar backdrop-blur-md z-10';
  tabHeader.setAttribute('role', 'tablist');
  tabHeader.setAttribute('aria-label', '施設');
  
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
      case 'inn': tabContent = renderInnTab(); break;
      case 'skill': tabContent = renderAcquireSkillTab(); break;
      case 'job': tabContent = renderChangeJobTab(); break;
      case 'ranch': tabContent = renderRanchTab(); break;
      case 'mine': tabContent = renderMineTab(); break;
    }

    if (tabContent instanceof Promise) {
      tabContent = await tabContent;
    }

    // タブが切り替わっていた場合は無視
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
