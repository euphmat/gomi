import { GameDB } from '../../data/database.js';
import { createCharacterSelectGrid } from '../../components/character-select-grid.js';

import { JOBS } from '../../jobs/index.js';

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
    
    // ユーザーフレンドリーなヘッダー
    const header = document.createElement('div');
    header.className = 'text-center mb-3 bg-green-900/40 py-2 px-4 rounded-xl border border-green-500/30 shadow-lg shrink-0';
    header.innerHTML = `
      <div class="flex justify-center items-center gap-2 mb-0.5">
        <span class="material-symbols-outlined text-xl text-green-400" style="font-variation-settings: 'FILL' 1">menu_book</span>
        <h2 class="text-lg font-black text-gray-100 tracking-widest drop-shadow-md">スキル獲得</h2>
      </div>
      <p class="text-[11px] text-gray-300">SP（スキルポイント）を消費して新しいスキルを修得・強化します。</p>
    `;
    container.appendChild(header);

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
    
    const selectedChar = characters.find(c => c.id === selectedCharId);
    if (selectedChar) {
      const job = JOBS[selectedChar.jobId || 'norvice'];
      const skills = job ? job.skills : [];
      
      if (skills.length === 0) {
        listContainer.innerHTML = '<div class="text-center text-gray-500 mt-4 text-sm font-bold">習得可能なスキルがありません</div>';
      } else {

        skills.forEach(skill => {
          const currentLevel = (selectedChar.jobSkills && selectedChar.jobSkills[selectedChar.jobId] && selectedChar.jobSkills[selectedChar.jobId][skill.id]) || 0;
          const isMax = currentLevel >= skill.maxLevel;
          const targetLevel = isMax ? currentLevel : currentLevel + 1;
          const levelConfig = skill.levels.find(l => l.level === targetLevel);
          const currentDesc = currentLevel > 0 ? skill.getDescription(skill.levels.find(l => l.level === currentLevel)) : '未習得';
          const nextDesc = isMax ? '最大レベルに達しています' : skill.getDescription(levelConfig);
          const hasEnoughSP = !isMax && selectedChar.sp >= levelConfig.spCost;

          let btnClass = '';
          let btnText = '';
          let isDisabled = isMax || !hasEnoughSP;

          if (isMax) {
            btnClass = 'bg-gray-700 text-gray-500 cursor-not-allowed';
            btnText = 'MAX';
          } else if (currentLevel === 0) {
            btnClass = hasEnoughSP ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-green-900/50 border border-green-800 text-gray-400 cursor-not-allowed';
            btnText = `修得 : SP ${levelConfig.spCost}`;
          } else {
            btnClass = hasEnoughSP ? 'bg-orange-600 hover:bg-orange-500 text-white' : 'bg-orange-900/50 border border-orange-800 text-gray-400 cursor-not-allowed';
            btnText = `強化 : SP ${levelConfig.spCost}`;
          }

          const row = document.createElement('div');
          row.className = 'flex items-center gap-3 p-3 bg-gray-800/80 rounded-xl border border-gray-700/50';
          
          row.innerHTML = `
            <div class="flex items-center justify-center w-12 h-12 bg-gray-900 rounded-lg shrink-0 relative">
              <span class="material-symbols-outlined text-2xl text-orange-400">${skill.icon}</span>
              ${currentLevel > 0 ? `<div class="absolute -bottom-1 -right-1 bg-blue-600 text-[9px] font-black px-1 rounded border border-blue-400">Lv${currentLevel}</div>` : ''}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2">
                <h3 class="text-sm font-bold text-gray-200 truncate">${skill.name}</h3>
              </div>
              <div class="flex flex-col gap-0.5 mt-0.5">
                ${isMax ? `
                  <span class="text-[10px] text-gray-400 leading-tight">${currentDesc}</span>
                ` : `
                  <span class="text-xs text-blue-400 font-bold">消費MP: ${levelConfig.mpCost}</span>
                  <span class="text-[10px] text-gray-400 leading-tight">${nextDesc}</span>
                `}
              </div>
            </div>
            <button class="acquire-btn px-4 py-2 ${btnClass} text-xs font-bold rounded-lg shadow transition-colors shrink-0" ${isDisabled ? 'disabled' : ''}>
              ${btnText}
            </button>
          `;
          
          if (!isMax && hasEnoughSP) {
            const btn = row.querySelector('.acquire-btn');
            btn.onclick = async () => {
              if (selectedChar.sp >= levelConfig.spCost) {
                selectedChar.sp -= levelConfig.spCost;
                
                if (!selectedChar.jobSkills) selectedChar.jobSkills = {};
                if (!selectedChar.jobSkills[selectedChar.jobId]) selectedChar.jobSkills[selectedChar.jobId] = {};
                selectedChar.jobSkills[selectedChar.jobId][skill.id] = targetLevel;
                
                await GameDB.putCharacter(selectedChar);
                render();
              } else {
                alert('SPが足りません！');
              }
            };
          }
          
          listContainer.appendChild(row);
        });
      }
    }

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
