import { renderInnTab } from './guild-tabs/inn.js';
import { renderChangeJobTab } from './guild-tabs/change-job.js';
import { renderAcquireSkillTab } from './guild-tabs/acquire-skill.js';
import { renderRanchTab } from './guild-tabs/ranch.js';

/**
 * このファイルは「ギルド」画面のメインコンテナです。
 * 内部で複数のタブを切り替えて表示します。
 */
export function renderGuildPage() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full bg-[#0b0b19]';

  // タブの定義 (宿屋を一番左に追加)
  const TABS = [
    { id: 'inn', label: '宿屋', icon: 'hotel' },
    { id: 'skill', label: '修練場', icon: 'sports_martial_arts' },
    { id: 'job', label: '神殿', icon: 'church' },
    { id: 'ranch', label: '牧場', icon: 'pets' }
  ];
  let activeTabId = 'inn';

  // ヘッダー部分（タブナビゲーション）
  const tabHeader = document.createElement('div');
  tabHeader.className = 'flex items-center gap-2 p-3 bg-slate-950/70 border-b border-slate-900 shrink-0 overflow-x-auto no-scrollbar backdrop-blur-md z-10';
  
  // コンテンツ領域
  const contentArea = document.createElement('div');
  contentArea.className = 'flex-1 overflow-hidden relative';

  const renderTabs = () => {
    tabHeader.innerHTML = '';
    TABS.forEach(tab => {
      const btn = document.createElement('button');
      const isActive = tab.id === activeTabId;
      
      btn.className = `
        flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95
        ${isActive 
          ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),_0_0_12px_rgba(16,185,129,0.25)]' 
          : 'bg-slate-900/40 text-slate-400 border border-slate-800/50 hover:bg-slate-800/30 hover:text-slate-200 hover:border-slate-700/60'}
      `;
      btn.innerHTML = `
        <span class="material-symbols-outlined text-[15px] leading-none ${isActive ? 'text-emerald-400' : 'text-slate-400'}">${tab.icon}</span>
        <span class="leading-none">${tab.label}</span>
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

  return container;
}
