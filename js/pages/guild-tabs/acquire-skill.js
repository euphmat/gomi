import { GameDB } from '../../data/database.js';
import { createCharacterSelectGrid } from '../../components/character-select-grid.js';

import { JOBS } from '../../jobs/index.js';

/**
 * 「修練場」タブの画面
 */
export function renderAcquireSkillTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full p-2 animate-fade-in overflow-hidden';

  // 状態管理
  let characters = [];
  let selectedCharId = null;

  const gridContainer = document.createElement('div');

  let currentTab = 'active';
  const tabContainer = document.createElement('div');
  tabContainer.className = 'flex gap-2 px-1 mb-2 shrink-0';
  const renderTabs = () => {
    tabContainer.innerHTML = `
      <button id="btn-tab-active" class="flex-1 py-1.5 text-[12px] font-black rounded-lg transition-all duration-200 border ${currentTab === 'active' ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_10px_rgba(79,70,229,0.4)]' : 'bg-gray-800 text-gray-400 border-white/5 hover:bg-gray-700'}">アクティブスキル</button>
      <button id="btn-tab-passive" class="flex-1 py-1.5 text-[12px] font-black rounded-lg transition-all duration-200 border ${currentTab === 'passive' ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_10px_rgba(79,70,229,0.4)]' : 'bg-gray-800 text-gray-400 border-white/5 hover:bg-gray-700'}">パッシブスキル</button>
    `;
    tabContainer.querySelector('#btn-tab-active').onclick = () => {
      if (currentTab !== 'active') {
        currentTab = 'active';
        renderTabs();
        render(true);
      }
    };
    tabContainer.querySelector('#btn-tab-passive').onclick = () => {
      if (currentTab !== 'passive') {
        currentTab = 'passive';
        renderTabs();
        render(true);
      }
    };
  };
  renderTabs();

  const listContainer = document.createElement('div');
  listContainer.className = 'flex-1 overflow-y-auto space-y-3 pb-4 pr-1 scroll-smooth';

  container.appendChild(gridContainer);
  container.appendChild(tabContainer);
  container.appendChild(listContainer);

  const updateSkillRow = (row, skill, selectedChar, index, isInitial) => {
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
      btnClass = 'bg-gray-800/80 border border-white/5 text-gray-500 cursor-not-allowed';
      btnText = '<span class="tracking-widest font-black opacity-80">MAX</span>';
    } else if (currentLevel === 0) {
      btnClass = hasEnoughSP ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.5)] transform hover:-translate-y-0.5 border border-white/20' : 'bg-gray-800/80 border border-white/5 text-gray-500 cursor-not-allowed';
      btnText = `<div class="flex items-center justify-center gap-1"><span class="material-symbols-outlined text-[16px]">school</span><span class="font-bold">修得</span> <span class="ml-1 text-[11px] font-black bg-black/20 px-1.5 py-0.5 rounded-md">${levelConfig.spCost} SP</span></div>`;
    } else {
      btnClass = hasEnoughSP ? 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white shadow-[0_4px_15px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.5)] transform hover:-translate-y-0.5 border border-white/20' : 'bg-gray-800/80 border border-white/5 text-gray-500 cursor-not-allowed';
      btnText = `<div class="flex items-center justify-center gap-1"><span class="material-symbols-outlined text-[16px]">upgrade</span><span class="font-bold">強化</span> <span class="ml-1 text-[11px] font-black bg-black/20 px-1.5 py-0.5 rounded-md">${levelConfig.spCost} SP</span></div>`;
    }

    row.innerHTML = `
      <!-- Highlight Accent -->
      <div class="absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${currentLevel === 0 ? 'from-emerald-400/50' : 'from-orange-400/50'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div class="flex items-center justify-center w-11 h-11 bg-black/40 rounded-lg shrink-0 relative shadow-inner border border-white/5 overflow-hidden group-hover:border-white/10 transition-colors">
        <!-- Glow effect behind icon -->
        <div class="absolute inset-0 bg-gradient-to-tr ${currentLevel === 0 ? 'from-emerald-500/20 to-transparent' : 'from-orange-500/20 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <span class="material-symbols-outlined text-2xl ${currentLevel === 0 ? 'text-gray-400' : 'text-orange-400'} drop-shadow-md group-hover:scale-110 transition-transform duration-300 relative z-10">${skill.icon}</span>
        ${currentLevel > 0 ? `<div class="absolute -bottom-0 -right-0 bg-gradient-to-tl from-blue-600 to-indigo-500 text-[9px] font-black text-white px-1 py-0.5 rounded-tl shadow-sm z-20">Lv.${currentLevel}</div>` : ''}
      </div>
      
      <div class="flex-1 min-w-0 py-0.5 pr-1">
        <div class="flex items-center mb-0.5 gap-x-2 flex-wrap">
          <h3 class="text-[13px] font-black text-gray-100 tracking-wide truncate group-hover:text-white transition-colors drop-shadow-sm">${skill.name}</h3>
          ${skill.type === 'passive' 
            ? `<span class="text-[9px] font-bold text-emerald-300 bg-emerald-900/30 px-1 py-px rounded flex items-center gap-0.5 shrink-0"><span class="material-symbols-outlined !text-[11px]">psychology</span>パッシブ</span>`
            : `<span class="text-[9px] font-bold text-cyan-300 bg-cyan-900/30 px-1 py-px rounded flex items-center gap-0.5 shrink-0"><span class="material-symbols-outlined !text-[11px]">water_drop</span>MP ${levelConfig.mpCost}</span>`
          }
        </div>
        <div class="flex flex-col gap-0.5">
          ${isMax ? `
            <span class="text-[10px] text-gray-400 leading-snug font-medium break-words whitespace-pre-wrap">${currentDesc}</span>
          ` : `
            <span class="text-[10px] text-gray-400/90 leading-tight font-medium break-words whitespace-pre-wrap">${nextDesc}</span>
          `}
        </div>
      </div>
      
      <div class="shrink-0 flex flex-col items-end justify-center ml-1">
        <button class="acquire-btn min-w-[85px] sm:min-w-[90px] relative overflow-hidden px-2 py-1.5 ${btnClass} text-[11px] rounded-lg active:scale-95 disabled:opacity-60 disabled:transform-none disabled:active:scale-100 transition-all duration-200" ${isDisabled ? 'disabled' : ''}>
          <!-- Button Shine Effect -->
          <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite] skew-x-12"></div>
          <span class="relative z-10 flex items-center justify-center w-full">${btnText}</span>
        </button>
      </div>
    `;
    
    if (!isMax && hasEnoughSP) {
      const btn = row.querySelector('.acquire-btn');
      btn.onclick = async () => {
        if (btn.disabled) return;
        
        // Add simple ripple/pulse effect on click before logic
        btn.classList.add('scale-95', 'opacity-80');
        setTimeout(() => btn.classList.remove('scale-95', 'opacity-80'), 150);

        if (selectedChar.sp >= levelConfig.spCost) {
          const isAcquire = currentLevel === 0;
          btn.disabled = true;

          // -------------------------------------------------------------
          // FIX: Deduct SP and save immediately to prevent spam click issues
          // -------------------------------------------------------------
          selectedChar.sp -= levelConfig.spCost;
          if (!selectedChar.jobSkills) selectedChar.jobSkills = {};
          if (!selectedChar.jobSkills[selectedChar.jobId]) selectedChar.jobSkills[selectedChar.jobId] = {};
          selectedChar.jobSkills[selectedChar.jobId][skill.id] = targetLevel;
          
          await GameDB.putCharacter(selectedChar);
          // -------------------------------------------------------------

          // 1. Flash effect on the row background
          const flashOverlay = document.createElement('div');
          flashOverlay.className = `absolute inset-0 z-20 pointer-events-none mix-blend-screen`;
          flashOverlay.style.background = isAcquire 
              ? 'linear-gradient(90deg, rgba(16,185,129,0) 0%, rgba(16,185,129,0.8) 50%, rgba(16,185,129,0) 100%)' 
              : 'linear-gradient(90deg, rgba(249,115,22,0) 0%, rgba(249,115,22,0.8) 50%, rgba(249,115,22,0) 100%)';
          row.appendChild(flashOverlay);

          flashOverlay.animate([
            { opacity: 0, transform: 'scaleX(0)' },
            { opacity: 1, transform: 'scaleX(1)' },
            { opacity: 0, transform: 'scaleX(1.5)' }
          ], {
            duration: 600,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'forwards'
          });

          // 2. Text Popup effect
          const textPopup = document.createElement('div');
          textPopup.className = `absolute z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-black text-2xl tracking-widest pointer-events-none drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] ${isAcquire ? 'text-emerald-300' : 'text-orange-300'}`;
          textPopup.innerHTML = isAcquire ? 'ACQUIRED!' : 'UPGRADED!';
          row.appendChild(textPopup);

          textPopup.animate([
            { opacity: 0, transform: 'translate(-50%, 0%) scale(0.5)' },
            { opacity: 1, transform: 'translate(-50%, -50%) scale(1.2)', offset: 0.2 },
            { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: 0.4 },
            { opacity: 0, transform: 'translate(-50%, -100%) scale(1.1)' }
          ], {
            duration: 1000,
            easing: 'ease-out',
            fill: 'forwards'
          });

          // 3. Icon spin/glow effect
          const iconContainer = row.querySelector('.w-11.h-11');
          if (iconContainer) {
            iconContainer.animate([
              { transform: 'scale(1)', boxShadow: '0 0 0 rgba(255,255,255,0)' },
              { transform: 'scale(1.2)', boxShadow: isAcquire ? '0 0 20px rgba(16,185,129,0.8)' : '0 0 20px rgba(249,115,22,0.8)' },
              { transform: 'scale(1)', boxShadow: '0 0 0 rgba(255,255,255,0)' }
            ], {
              duration: 600,
              easing: 'ease-out'
            });
          }

          // 4. Particles
          for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            const color = isAcquire ? '#34d399' : '#fb923c';
            particle.className = 'absolute w-1.5 h-1.5 rounded-full z-40 pointer-events-none';
            particle.style.backgroundColor = color;
            particle.style.boxShadow = `0 0 8px ${color}`;
            
            particle.style.left = '50%';
            particle.style.top = '50%';
            
            row.appendChild(particle);
            
            const angle = Math.random() * Math.PI * 2;
            const velocity = 40 + Math.random() * 60;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;
            
            particle.animate([
              { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
              { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: 0 }
            ], {
              duration: 600 + Math.random() * 400,
              easing: 'cubic-bezier(0, .9, .57, 1)',
              fill: 'forwards'
            });
          }

          // Wait for effects
          await new Promise(resolve => setTimeout(resolve, 800));

          render(false); // false means soft render
        } else {
          alert('SPが足りません！');
        }
      };
    }
  };

  // 全体レンダリング関数
  const render = (isInitial = false) => {
    // キャラクター選択グリッド (上部)
    gridContainer.innerHTML = '';
    if (characters.length > 0) {
      const grid = createCharacterSelectGrid(characters, selectedCharId, (id) => {
        selectedCharId = id;
        render(true); // キャラクター切り替え時はInitialとみなす
      });
      gridContainer.appendChild(grid);
    }

    const selectedChar = characters.find(c => c.id === selectedCharId);
    if (selectedChar) {
      const job = JOBS[selectedChar.jobId || 'norvice'];
      let skills = job ? job.skills : [];
      
      // 選択中のタブに合わせてスキルをフィルタリング
      skills = skills.filter(skill => {
        const isPassive = skill.type === 'passive';
        return currentTab === 'passive' ? isPassive : !isPassive;
      });

      if (skills.length === 0) {
        listContainer.innerHTML = '<div class="flex flex-col items-center justify-center h-32 opacity-60"><span class="material-symbols-outlined text-4xl text-gray-500 mb-2">auto_awesome</span><span class="text-sm font-bold text-gray-400 tracking-wider">習得可能なスキルがありません</span></div>';
      } else {
        if (isInitial || listContainer.children.length !== skills.length) {
          // Full render
          listContainer.innerHTML = '';
          skills.forEach((skill, index) => {
            const row = document.createElement('div');
            // Add cascade animation only on initial render
            row.style.animation = `card-in 0.4s ease-out ${index * 0.05}s both`;
            row.className = 'group relative flex items-center gap-2.5 p-2 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-md rounded-xl border border-white/5 hover:border-white/10 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden';
            updateSkillRow(row, skill, selectedChar, index, true);
            listContainer.appendChild(row);
          });
        } else {
          // Soft update (DOMを再構築せず中身だけ更新)
          skills.forEach((skill, index) => {
            const row = listContainer.children[index];
            updateSkillRow(row, skill, selectedChar, index, false);
          });
        }
      }
    }
  };

  // 初期データロード
  GameDB.getAllCharacters().then(async chars => {
    // FIX: Check and correct SP based ONLY on current Job Lv and current acquired skills
    // -------------------------------------------------------------
    for (const char of chars) {
      let spentSP = 0;
      if (char.jobSkills && char.jobSkills[char.jobId]) {
        const job = JOBS[char.jobId];
        if (job) {
          for (const [skillId, level] of Object.entries(char.jobSkills[char.jobId])) {
            const skill = job.skills.find(s => s.id === skillId);
            if (!skill) continue;
            for (let i = 1; i <= level; i++) {
              const lConf = skill.levels.find(l => l.level === i);
              if (lConf && lConf.spCost) {
                spentSP += lConf.spCost;
              }
            }
          }
        }
      }

      const earnedSP = Math.max(0, (char.jobLevel || 1) - 1);
      const correctSP = earnedSP - spentSP;

      if (char.sp !== correctSP) {
        console.log(`[SP Correction] ${char.name}: ${char.sp} -> ${correctSP} (Job: ${char.jobName})`);
        char.sp = correctSP;
        await GameDB.putCharacter(char);
      }
    }
    // -------------------------------------------------------------

    characters = chars;
    if (characters.length > 0) {
      selectedCharId = characters[0].id;
    }
    render(true);
  });

  return container;
}
