import { renderInnTab } from './guild-tabs/inn.js';
import { renderChangeJobTab } from './guild-tabs/change-job.js';
import { renderReceiveRewardTab } from './guild-tabs/receive-reward.js';
import { renderAcquireSkillTab } from './guild-tabs/acquire-skill.js';

/**
 * このファイルは「ギルド」画面のメインコンテナです。
 * 内部で複数のタブを切り替えて表示します。
 */
export function renderGuildPage() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full bg-[#0b0b19]';

  // タブの定義 (宿屋を一番左に追加)
  const TABS = [
    { id: 'inn', label: '宿屋' },
    { id: 'skill', label: 'スキル獲得' },
    { id: 'job', label: '転職' },
    { id: 'reward', label: '報酬受け取り' }
  ];
  let activeTabId = 'inn';

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
      case 'inn': tabContent = renderInnTab(); break;
      case 'skill': tabContent = renderAcquireSkillTab(); break;
      case 'job': tabContent = renderChangeJobTab(); break;
      case 'reward': tabContent = renderReceiveRewardTab(); break;
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
