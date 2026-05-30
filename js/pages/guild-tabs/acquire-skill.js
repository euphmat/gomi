import { GameDB } from '../../data/database.js';
import { createCharacterSelectGrid } from '../../components/character-select-grid.js';

// モック用のスキルデータ
const MOCK_SKILLS = [
  { id: 'fireball', name: 'ファイアボール', icon: 'local_fire_department', sp: 10 },
  { id: 'heal', name: 'ヒール', icon: 'healing', sp: 15 },
  { id: 'slash', name: '強斬り', icon: 'swords', sp: 5 },
  { id: 'protect', name: 'プロテクト', icon: 'shield', sp: 20 },
  { id: 'haste', name: 'ヘイスト', icon: 'speed', sp: 25 },
];

/**
 * 「スキル獲得」タブの画面
 */
export function renderAcquireSkillTab() {
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

    // スキルリスト (下部・スクロール可能)
    const listContainer = document.createElement('div');
    listContainer.className = 'flex-1 overflow-y-auto space-y-2 pb-4 pr-1';
    
    MOCK_SKILLS.forEach(skill => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-3 p-3 bg-gray-800/80 rounded-xl border border-gray-700/50';
      
      row.innerHTML = `
        <div class="flex items-center justify-center w-12 h-12 bg-gray-900 rounded-lg shrink-0">
          <span class="material-symbols-outlined text-2xl text-orange-400">${skill.icon}</span>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-bold text-gray-200 truncate">${skill.name}</h3>
          <span class="text-xs text-gray-400">消費SP: ${skill.sp}</span>
        </div>
        <button class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg shadow transition-colors shrink-0">
          習得
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
