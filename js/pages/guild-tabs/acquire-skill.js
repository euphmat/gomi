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
            btnClass = 'bg-gray-800 border border-gray-700 text-gray-500 shadow-inner cursor-not-allowed';
            btnText = '<span class="tracking-widest">MAX</span>';
          } else if (currentLevel === 0) {
            btnClass = hasEnoughSP ? 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white border border-green-400/50 shadow-[0_0_10px_rgba(52,211,153,0.3)] hover:shadow-[0_0_15px_rgba(52,211,153,0.5)] transform hover:-translate-y-0.5 transition-all' : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed';
            btnText = `<div class="flex items-center justify-center gap-1.5"><span class="material-symbols-outlined text-[14px]">school</span>修得 ${levelConfig.spCost} SP</div>`;
          } else {
            btnClass = hasEnoughSP ? 'bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white border border-orange-400/50 shadow-[0_0_10px_rgba(251,146,60,0.3)] hover:shadow-[0_0_15px_rgba(251,146,60,0.5)] transform hover:-translate-y-0.5 transition-all' : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed';
            btnText = `<div class="flex items-center justify-center gap-1.5"><span class="material-symbols-outlined text-[14px]">upgrade</span>強化 ${levelConfig.spCost} SP</div>`;
          }

          const row = document.createElement('div');
          row.className = 'group relative flex items-center gap-4 p-3 bg-gray-800/60 hover:bg-gray-800/90 rounded-2xl border border-gray-700/50 hover:border-green-500/30 shadow-md hover:shadow-lg transition-all duration-300';
          
          row.innerHTML = `
            <div class="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl shrink-0 relative shadow-inner border border-gray-600/50">
              <span class="material-symbols-outlined text-3xl text-orange-400 drop-shadow-md group-hover:scale-110 transition-transform duration-300">${skill.icon}</span>
              ${currentLevel > 0 ? `<div class="absolute -bottom-1.5 -right-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-[10px] font-black text-white px-1.5 py-0.5 rounded-md border border-blue-300/50 shadow-sm z-10">Lv.${currentLevel}</div>` : ''}
            </div>
            <div class="flex-1 min-w-0 py-1">
              <div class="flex items-center justify-between mb-1">
                <h3 class="text-base font-bold text-gray-100 tracking-wide truncate group-hover:text-green-400 transition-colors">${skill.name}</h3>
              </div>
              <div class="flex flex-col gap-1">
                ${isMax ? `
                  <span class="text-xs text-gray-400 leading-snug">${currentDesc}</span>
                ` : `
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] font-bold text-cyan-300 bg-cyan-900/30 px-1.5 py-0.5 rounded border border-cyan-800/50">消費MP: ${levelConfig.mpCost}</span>
                  </div>
                  <span class="text-xs text-gray-400 leading-snug line-clamp-2">${nextDesc}</span>
                `}
              </div>
            </div>
            <div class="shrink-0 flex flex-col items-end justify-center ml-2">
              <button class="acquire-btn w-[120px] relative overflow-hidden px-3 py-2 ${btnClass} text-xs font-bold rounded-xl active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:active:scale-100 transition-all duration-200" ${isDisabled ? 'disabled' : ''}>
                <span class="relative z-10 flex items-center justify-center w-full">${btnText}</span>
              </button>
            </div>
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
