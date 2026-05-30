import { GameDB } from '../../data/database.js';
import { createCharacterSelectGrid } from '../../components/character-select-grid.js';

import { JOBS } from '../../jobs/index.js';

/**
 * 「転職」タブの画面
 */
export function renderChangeJobTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full p-2 animate-fade-in overflow-hidden';

  // 状態管理
  let characters = [];
  let selectedCharId = null;

  // 全体レンダリング関数
  const render = () => {
    container.innerHTML = '';
    
    // キャラクター選択グリッド (上部)
    if (characters.length > 0) {
      const grid = createCharacterSelectGrid(characters, selectedCharId, (id) => {
        selectedCharId = id;
        render(); // 選択を更新して再描画
      });
      container.appendChild(grid);
    }

    // ジョブリスト (下部・スクロール可能)
    const listContainer = document.createElement('div');
    listContainer.className = 'flex-1 overflow-y-auto space-y-2 pb-4 pr-1';
    
    // スクロールバーのスタイルはindex.htmlのCSSに依存
    
    Object.values(JOBS).forEach(job => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-3 p-3 bg-gray-800/80 rounded-xl border border-gray-700/50';
      
      row.innerHTML = `
        <div class="flex items-center justify-center w-12 h-12 bg-gray-900 rounded-lg shrink-0">
          <span class="material-symbols-outlined text-2xl text-blue-400">${job.icon}</span>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-bold text-gray-200 truncate">${job.name}</h3>
        </div>
        <button class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow transition-colors shrink-0">
          転職する
        </button>
      `;
      listContainer.appendChild(row);
    });

    container.appendChild(listContainer);
  };

  // 初期データロード
  GameDB.getAllCharacters().then(chars => {
    characters = chars;
    if (characters.length > 0) {
      selectedCharId = characters[0].id;
    }
    render();
  });

  return container;
}
