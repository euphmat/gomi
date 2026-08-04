import { GameDB } from '../../data/database.js';
import { getCharactersWithRanchBonus } from '../../data/stat-calculator.js';
import { createCharacterSelectGrid } from '../../components/character-select-grid.js';
import { showInheritanceHelpModal } from '../../components/inheritance-help-modal.js';

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
  let inheritJobFilter = 'all';
  
  const tabContainer = document.createElement('div');
  tabContainer.className = 'flex gap-2 px-1 mb-2 shrink-0';
  const renderTabs = () => {
    tabContainer.innerHTML = `
      <button id="btn-tab-active" class="flex-1 py-1.5 text-[12px] font-black rounded-lg transition-all duration-200 border ${currentTab === 'active' ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_10px_rgba(79,70,229,0.4)]' : 'bg-gray-800 text-gray-400 border-white/5 active:bg-gray-700'}">アクティブスキル</button>
      <button id="btn-tab-passive" class="flex-1 py-1.5 text-[12px] font-black rounded-lg transition-all duration-200 border ${currentTab === 'passive' ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_10px_rgba(79,70,229,0.4)]' : 'bg-gray-800 text-gray-400 border-white/5 active:bg-gray-700'}">パッシブスキル</button>
      <button id="btn-tab-inheritance" class="flex-1 py-1.5 text-[12px] font-black rounded-lg transition-all duration-200 border ${currentTab === 'inheritance' ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_10px_rgba(79,70,229,0.4)]' : 'bg-gray-800 text-gray-400 border-white/5 active:bg-gray-700'}">継承</button>
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
    tabContainer.querySelector('#btn-tab-inheritance').onclick = () => {
      if (currentTab !== 'inheritance') {
        currentTab = 'inheritance';
        inheritJobFilter = 'all'; // Reset filter when entering inheritance tab
        renderTabs();
        render(true);
      }
    };
  };
  renderTabs();

  const filterContainer = document.createElement('div');
  filterContainer.style.display = 'none';
  filterContainer.className = 'px-1 mb-2 shrink-0';

  const listContainer = document.createElement('div');
  listContainer.className = 'flex-1 overflow-y-auto space-y-3 pb-4 pr-1 scroll-smooth';

  container.appendChild(gridContainer);
  container.appendChild(tabContainer);
  container.appendChild(filterContainer);
  container.appendChild(listContainer);

  const updateSkillRow = (row, skill, selectedChar, index, isInitial) => {
    const currentLevel = (selectedChar.jobSkills && selectedChar.jobSkills[selectedChar.jobId] && selectedChar.jobSkills[selectedChar.jobId][skill.id]) || 0;
    const isMax = currentLevel >= skill.maxLevel;
    const targetLevel = isMax ? currentLevel : currentLevel + 1;
    const levelConfig = skill.levels.find(l => l.level === targetLevel);
    const currentDesc = currentLevel > 0 ? skill.getDescription(skill.levels.find(l => l.level === currentLevel)) : '未習得';
    const nextDesc = isMax ? '最大レベルに達しています' : skill.getDescription(levelConfig);
    const hasEnoughSP = !isMax && selectedChar.sp >= levelConfig.spCost;

    let maxPossibleLevel = currentLevel;
    let totalMaxCost = 0;
    if (!isMax) {
      for (let l = currentLevel + 1; l <= skill.maxLevel; l++) {
        const cost = skill.levels.find(lvl => lvl.level === l)?.spCost || 0;
        if (selectedChar.sp >= totalMaxCost + cost) {
          totalMaxCost += cost;
          maxPossibleLevel = l;
        } else {
          break;
        }
      }
    }

    const highlightDesc = (desc) => {
      if (!desc) return '';
      return desc.replace(/(\d+(?:\.\d+)?)/g, '<span class="text-yellow-300 font-black px-0.5">$1</span>');
    };

    const currentDescHtml = highlightDesc(currentDesc);
    const nextDescHtml = highlightDesc(nextDesc);

    let btnClass = '';
    let btnText = '';
    let isDisabled = isMax || !hasEnoughSP;

    if (isMax) {
      btnClass = 'bg-gray-800/80 border-gray-600/50 text-gray-500 cursor-not-allowed';
      btnText = '<span class="font-black tracking-widest">MAX</span>';
    } else if (currentLevel === 0) {
      btnClass = hasEnoughSP 
        ? 'bg-gradient-to-r from-emerald-600 to-teal-500 active:from-emerald-500 active:to-teal-400 text-white shadow-md shadow-emerald-500/20 border-emerald-400/50'
        : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed';
      btnText = `<div class="flex items-center justify-center gap-1"><span class="font-bold">修得</span> <span class="ml-0.5 text-[9px] font-black bg-black/30 px-1 py-0.5 rounded">${levelConfig.spCost} SP</span></div>`;
    } else {
      btnClass = hasEnoughSP 
        ? 'bg-gradient-to-r from-orange-600 to-rose-500 active:from-orange-500 active:to-rose-400 text-white shadow-md shadow-orange-500/20 border-orange-400/50'
        : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed';
      btnText = `<div class="flex items-center justify-center gap-1"><span class="font-bold">強化</span> <span class="ml-0.5 text-[9px] font-black bg-black/30 px-1 py-0.5 rounded">${levelConfig.spCost} SP</span></div>`;
    }

    row.className = 'group relative p-2.5 bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-md rounded-xl border border-white/10 active:border-white/20 shadow-lg transition-all duration-300 overflow-hidden';

    row.innerHTML = `
      <div class="absolute inset-0 bg-gradient-to-br ${currentLevel === 0 ? 'from-emerald-500/5' : (isMax ? 'from-gray-500/5' : 'from-orange-500/5')} to-transparent opacity-0 group-active:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      
      <div class="flex items-center gap-3 relative z-10">
        <!-- Icon -->
        <div class="flex items-center justify-center w-11 h-11 bg-black/50 rounded-xl shrink-0 relative shadow-inner border border-white/10 group-active:border-white/20 transition-colors">
          <span class="material-symbols-outlined text-2xl ${currentLevel === 0 ? 'text-gray-400' : (isMax ? 'text-yellow-400' : 'text-orange-400')} drop-shadow-md group-active:scale-110 transition-transform duration-300">${skill.icon}</span>
          <div class="absolute -bottom-1.5 -right-1.5 bg-gradient-to-br ${isMax ? 'from-yellow-500 to-amber-600' : (currentLevel === 0 ? 'from-gray-600 to-gray-700' : 'from-blue-600 to-indigo-600')} text-[9px] font-black ${currentLevel === 0 ? 'text-gray-300' : 'text-white'} px-1 py-0.5 rounded shadow-md border border-white/20">Lv.${currentLevel}</div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0 py-0.5">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-[13px] font-black text-gray-100 tracking-wide truncate group-active:text-white transition-colors">${skill.name}</h3>
              ${skill.type === 'passive' 
                ? `<span class="text-[9px] font-bold text-emerald-300 bg-emerald-900/40 border border-emerald-700/50 px-1 py-px rounded flex items-center gap-0.5"><span class="material-symbols-outlined !text-[11px]">psychology</span>パッシブ</span>`
                : `<span class="text-[9px] font-bold text-cyan-300 bg-cyan-900/40 border border-cyan-700/50 px-1 py-px rounded flex items-center gap-0.5"><span class="material-symbols-outlined !text-[11px]">water_drop</span>MP ${levelConfig ? levelConfig.mpCost : 0}</span>`
              }
              ${skill.statDependency === 'ATK' ? `<span class="text-[9px] font-bold text-red-300 bg-red-900/40 border border-red-700/50 px-1 py-px rounded flex items-center gap-0.5"><span class="material-symbols-outlined !text-[11px]">swords</span>物理</span>` : ''}
              ${skill.statDependency === 'MAT' ? `<span class="text-[9px] font-bold text-fuchsia-300 bg-fuchsia-900/40 border border-fuchsia-700/50 px-1 py-px rounded flex items-center gap-0.5"><span class="material-symbols-outlined !text-[11px]">auto_awesome</span>魔法</span>` : ''}
              ${skill.statDependency === 'BOTH' ? `<span class="text-[9px] font-bold text-yellow-300 bg-yellow-900/40 border border-yellow-700/50 px-1 py-px rounded flex items-center gap-0.5"><span class="material-symbols-outlined !text-[11px]">flare</span>複合</span>` : ''}
            </div>
            <div class="text-[9px] font-bold text-gray-500 tracking-wider hidden sm:block">
              MAX Lv.${skill.maxLevel}
            </div>
          </div>
          
          <div class="flex flex-col gap-1 bg-black/20 p-1.5 rounded-lg border border-white/5">
            ${currentLevel > 0 ? `
              <div class="flex gap-1.5 items-start text-[10px] leading-tight">
                <span class="font-black text-gray-500 shrink-0 w-7 mt-px">現在</span>
                <span class="${isMax ? 'text-yellow-100/90' : 'text-gray-400'} break-words whitespace-pre-wrap flex-1">${currentDescHtml}</span>
              </div>
            ` : ''}
            ${!isMax ? `
              <div class="flex gap-1.5 items-start text-[10px] leading-tight">
                <span class="font-black ${currentLevel === 0 ? 'text-emerald-400' : 'text-orange-400'} shrink-0 w-7 mt-px">次Lv</span>
                <span class="text-white break-words whitespace-pre-wrap font-medium flex-1">${nextDescHtml}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Buttons -->
        <div class="shrink-0 flex flex-col gap-1.5 w-[85px] sm:w-[90px]">
          <button class="acquire-btn w-full relative overflow-hidden py-1 border ${btnClass} text-[11px] rounded-lg active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-all duration-200" ${isDisabled ? 'disabled' : ''}>
            ${!isDisabled ? '<div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-active:animate-[shimmer_1.5s_infinite] skew-x-12"></div>' : ''}
            <span class="relative z-10 flex items-center justify-center w-full">${btnText}</span>
          </button>
          
          ${!isMax && maxPossibleLevel > currentLevel ? `
          <button class="max-btn w-full relative overflow-hidden py-1 bg-gradient-to-r from-purple-600 to-indigo-600 active:from-purple-500 active:to-indigo-500 text-white shadow-md shadow-purple-500/20 border border-purple-400/50 text-[11px] rounded-lg active:scale-[0.98] transition-all duration-200">
            <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-active:animate-[shimmer_1.5s_infinite] skew-x-12"></div>
            <span class="relative z-10 flex items-center justify-center w-full gap-1">
              <span class="font-bold">MAX</span>
              <span class="ml-0.5 text-[9px] font-black bg-black/30 px-1 py-0.5 rounded">${totalMaxCost} SP</span>
            </span>
          </button>
          ` : `
          <button class="w-full py-1 bg-gray-800/50 border border-gray-700/50 text-gray-600 text-[11px] font-black tracking-widest rounded-lg cursor-not-allowed" disabled>
            MAX
          </button>
          `}
        </div>
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

          // Simple Flash effect on the row background
          const flashOverlay = document.createElement('div');
          flashOverlay.className = `absolute inset-0 z-20 pointer-events-none mix-blend-screen`;
          flashOverlay.style.background = isAcquire 
              ? 'linear-gradient(90deg, rgba(16,185,129,0) 0%, rgba(16,185,129,0.4) 50%, rgba(16,185,129,0) 100%)' 
              : 'linear-gradient(90deg, rgba(249,115,22,0) 0%, rgba(249,115,22,0.4) 50%, rgba(249,115,22,0) 100%)';
          row.appendChild(flashOverlay);

          flashOverlay.animate([
            { opacity: 0 },
            { opacity: 1, offset: 0.3 },
            { opacity: 0 }
          ], {
            duration: 300,
            easing: 'ease-out',
            fill: 'forwards'
          });

          // Wait for short effect
          await new Promise(resolve => setTimeout(resolve, 150));

          render(false); // false means soft render
        } else {
          alert('SPが足りません！');
        }
      };
    }

    if (!isMax && maxPossibleLevel > currentLevel) {
      const maxBtn = row.querySelector('.max-btn');
      if (maxBtn) {
        maxBtn.onclick = async () => {
          if (maxBtn.disabled) return;
          
          maxBtn.classList.add('scale-95', 'opacity-80');
          setTimeout(() => maxBtn.classList.remove('scale-95', 'opacity-80'), 150);

          if (selectedChar.sp >= totalMaxCost) {
            maxBtn.disabled = true;
            const acquireBtn = row.querySelector('.acquire-btn');
            if (acquireBtn) acquireBtn.disabled = true;

            selectedChar.sp -= totalMaxCost;
            if (!selectedChar.jobSkills) selectedChar.jobSkills = {};
            if (!selectedChar.jobSkills[selectedChar.jobId]) selectedChar.jobSkills[selectedChar.jobId] = {};
            selectedChar.jobSkills[selectedChar.jobId][skill.id] = maxPossibleLevel;
            
            await GameDB.putCharacter(selectedChar);

            // Simple Flash effect
            const flashOverlay = document.createElement('div');
            flashOverlay.className = `absolute inset-0 z-20 pointer-events-none mix-blend-screen`;
            flashOverlay.style.background = 'linear-gradient(90deg, rgba(147,51,234,0) 0%, rgba(147,51,234,0.4) 50%, rgba(147,51,234,0) 100%)';
            row.appendChild(flashOverlay);

            flashOverlay.animate([
              { opacity: 0 },
              { opacity: 1, offset: 0.3 },
              { opacity: 0 }
            ], {
              duration: 300,
              easing: 'ease-out',
              fill: 'forwards'
            });

            await new Promise(resolve => setTimeout(resolve, 150));
            render(false);
          }
        };
      }
    }
  };

  const updateInheritedSkillRow = (row, inheritedData, selectedChar, index) => {
    const { skill, level, jobId } = inheritedData;
    const levelConfig = skill.levels.find(l => l.level === level) || skill.levels[skill.levels.length - 1];
    const jobDef = JOBS[jobId];
    
    const isSelected = skill.type === 'passive'
      ? selectedChar.inheritedPassiveSkill && selectedChar.inheritedPassiveSkill.skillId === skill.id && selectedChar.inheritedPassiveSkill.jobId === jobId
      : selectedChar.inheritedActiveSkill && selectedChar.inheritedActiveSkill.skillId === skill.id && selectedChar.inheritedActiveSkill.jobId === jobId;

    const highlightDesc = (desc) => {
      if (!desc) return '';
      return desc.replace(/(\d+(?:\.\d+)?)/g, '<span class="text-yellow-300 font-black px-0.5">$1</span>');
    };

    let btnClass = isSelected 
        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400 text-white shadow-md shadow-indigo-500/30' 
        : 'bg-gray-800 border-gray-600 text-gray-400 active:bg-gray-700 active:text-white';
    let btnText = isSelected ? '選択中' : '選択する';

    row.className = `group relative p-2.5 backdrop-blur-md rounded-xl border transition-all duration-300 overflow-hidden ${isSelected ? 'bg-indigo-900/20 border-indigo-500/50 shadow-lg shadow-indigo-900/20' : 'bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-white/10 active:border-white/20 shadow-md'}`;

    row.innerHTML = `
      <div class="flex items-center gap-3 relative z-10">
        <div class="flex items-center justify-center w-11 h-11 bg-black/50 rounded-xl shrink-0 relative shadow-inner border border-white/10">
          <span class="material-symbols-outlined text-2xl text-indigo-400 drop-shadow-md">${skill.icon}</span>
          <div class="absolute -bottom-1.5 -right-1.5 bg-gradient-to-br from-indigo-600 to-purple-600 text-[9px] font-black text-white px-1 py-0.5 rounded shadow-md border border-white/20">Lv.${level}</div>
        </div>
        
        <div class="flex-1 min-w-0 py-0.5">
          <div class="flex items-center mb-1 gap-2 flex-wrap">
            <h3 class="text-[13px] font-black ${isSelected ? 'text-white' : 'text-gray-100'} tracking-wide truncate">${skill.name}</h3>
            <span class="text-[9px] font-bold text-purple-300 bg-purple-900/40 border border-purple-700/50 px-1 py-px rounded flex items-center gap-0.5"><span class="material-symbols-outlined !text-[11px]">badge</span>${jobDef ? jobDef.name : ''}</span>
            ${skill.type !== 'passive' ? `<span class="text-[9px] font-bold text-cyan-300 bg-cyan-900/40 border border-cyan-700/50 px-1 py-px rounded flex items-center gap-0.5"><span class="material-symbols-outlined !text-[11px]">water_drop</span>MP ${levelConfig ? levelConfig.mpCost : 0}</span>` : ''}
            ${skill.statDependency === 'ATK' ? `<span class="text-[9px] font-bold text-red-300 bg-red-900/40 border border-red-700/50 px-1 py-px rounded flex items-center gap-0.5"><span class="material-symbols-outlined !text-[11px]">swords</span>物理</span>` : ''}
            ${skill.statDependency === 'MAT' ? `<span class="text-[9px] font-bold text-fuchsia-300 bg-fuchsia-900/40 border border-fuchsia-700/50 px-1 py-px rounded flex items-center gap-0.5"><span class="material-symbols-outlined !text-[11px]">auto_awesome</span>魔法</span>` : ''}
            ${skill.statDependency === 'BOTH' ? `<span class="text-[9px] font-bold text-yellow-300 bg-yellow-900/40 border border-yellow-700/50 px-1 py-px rounded flex items-center gap-0.5"><span class="material-symbols-outlined !text-[11px]">flare</span>複合</span>` : ''}
          </div>
          
          <div class="flex flex-col gap-1 bg-black/20 p-1.5 rounded-lg border border-white/5">
            <div class="text-[10px] text-gray-300 leading-tight font-medium break-words whitespace-pre-wrap">${highlightDesc(skill.getDescription(levelConfig))}</div>
          </div>
        </div>
      
        <div class="shrink-0 flex flex-col gap-1.5 w-[85px] sm:w-[90px]">
          <button class="inheritance-btn w-full py-1.5 border ${btnClass} text-[11px] font-bold rounded-lg active:scale-[0.98] transition-all duration-200">
            ${btnText}
          </button>
        </div>
      </div>
    `;

    const btn = row.querySelector('.inheritance-btn');
    btn.onclick = async () => {
      if (isSelected) {
        if (skill.type === 'passive') selectedChar.inheritedPassiveSkill = null;
        else selectedChar.inheritedActiveSkill = null;
      } else {
        if (skill.type === 'passive') selectedChar.inheritedPassiveSkill = { jobId, skillId: skill.id };
        else selectedChar.inheritedActiveSkill = { jobId, skillId: skill.id };
      }
      await GameDB.putCharacter(selectedChar);
      render(false);
    };
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
      if (currentTab === 'inheritance') {
        filterContainer.style.display = 'block';
        
        let inheritedSkillsList = [];
        let availableJobs = new Set();
        if (selectedChar.jobSkills) {
            for (const [jId, skillsMap] of Object.entries(selectedChar.jobSkills)) {
                if (jId !== selectedChar.jobId) {
                    const jobDef = JOBS[jId];
                    if (jobDef) {
                        let hasSkills = false;
                        for (const [sId, level] of Object.entries(skillsMap)) {
                            if (level > 0) {
                                const skillDef = jobDef.skills.find(s => s.id === sId);
                                if (skillDef && level >= skillDef.maxLevel) {
                                    inheritedSkillsList.push({ skill: skillDef, level, jobId: jId });
                                    hasSkills = true;
                                }
                            }
                        }
                        if (hasSkills) availableJobs.add(jId);
                    }
                }
            }
        }
        
        if (isInitial || !filterContainer.querySelector('#job-filter-select')) {
          filterContainer.innerHTML = `
            <div class="flex items-center justify-between gap-2 pb-1">
              <div class="flex-1 min-w-0">
                <div class="relative">
                  <select id="job-filter-select" class="w-full appearance-none bg-gray-800 text-gray-100 text-[12px] font-bold py-1.5 pl-3 pr-8 rounded-lg border border-white/10 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm cursor-pointer">
                    <option value="all" ${inheritJobFilter === 'all' ? 'selected' : ''}>すべて</option>
                    ${Array.from(availableJobs).map(jId => {
                      const jobDef = JOBS[jId];
                      return `<option value="${jId}" ${inheritJobFilter === jId ? 'selected' : ''}>${jobDef.name}</option>`;
                    }).join('')}
                  </select>
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <span class="material-symbols-outlined !text-[18px]">arrow_drop_down</span>
                  </div>
                </div>
              </div>
              <button id="btn-inheritance-help" class="shrink-0 flex items-center justify-center w-[26px] h-[26px] rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 active:bg-indigo-800 transition-colors shadow-sm active:scale-95">
                <span class="material-symbols-outlined !text-[16px]">help</span>
              </button>
            </div>
          `;
          
          const selectEl = filterContainer.querySelector('#job-filter-select');
          if (selectEl) {
            selectEl.onchange = (e) => {
              inheritJobFilter = e.target.value;
              render(true);
            };
          }
          const helpBtn = filterContainer.querySelector('#btn-inheritance-help');
          if (helpBtn) {
            helpBtn.onclick = () => {
              showInheritanceHelpModal();
            };
          }
        }
        
        if (inheritJobFilter !== 'all') {
          inheritedSkillsList = inheritedSkillsList.filter(d => d.jobId === inheritJobFilter);
        }

        if (inheritedSkillsList.length === 0) {
            listContainer.innerHTML = '<div class="flex flex-col items-center justify-center h-32 opacity-60"><span class="material-symbols-outlined text-4xl text-gray-500 mb-2">auto_awesome</span><span class="text-sm font-bold text-gray-400 tracking-wider">継承可能なスキルがありません</span></div>';
        } else {
            const activeSkills = inheritedSkillsList.filter(d => d.skill.type !== 'passive');
            const passiveSkills = inheritedSkillsList.filter(d => d.skill.type === 'passive');

            if (isInitial || !listContainer.querySelector('.group')) {
                listContainer.innerHTML = '';
                
                if (activeSkills.length > 0) {
                  const header = document.createElement('div');
                  header.className = 'text-[11px] font-black text-cyan-300 border-b border-cyan-500/30 pb-1 mb-1 flex items-center gap-1 opacity-90 tracking-widest';
                  header.innerHTML = '<span class="material-symbols-outlined !text-[14px]">swords</span>アクティブスキル';
                  listContainer.appendChild(header);
                  
                  activeSkills.forEach((data, index) => {
                      const row = document.createElement('div');
                      row.style.animation = `card-in 0.4s ease-out ${index * 0.05}s both`;
                      row.className = 'group relative flex items-center gap-2.5 p-2 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-md rounded-xl border border-white/5 shadow-md overflow-hidden';
                      updateInheritedSkillRow(row, data, selectedChar, index);
                      listContainer.appendChild(row);
                  });
                }
                
                if (passiveSkills.length > 0) {
                  const header = document.createElement('div');
                  header.className = 'text-[11px] font-black text-emerald-300 border-b border-emerald-500/30 pb-1 mb-1 mt-3 flex items-center gap-1 opacity-90 tracking-widest';
                  header.innerHTML = '<span class="material-symbols-outlined !text-[14px]">psychology</span>パッシブスキル';
                  listContainer.appendChild(header);
                  
                  passiveSkills.forEach((data, index) => {
                      const row = document.createElement('div');
                      row.style.animation = `card-in 0.4s ease-out ${index * 0.05}s both`;
                      row.className = 'group relative flex items-center gap-2.5 p-2 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-md rounded-xl border border-white/5 shadow-md overflow-hidden';
                      updateInheritedSkillRow(row, data, selectedChar, index);
                      listContainer.appendChild(row);
                  });
                }
            } else {
                let rowIndex = 0;
                const rows = listContainer.querySelectorAll('.group');
                activeSkills.forEach((data, index) => {
                    if (rows[rowIndex]) updateInheritedSkillRow(rows[rowIndex++], data, selectedChar, index);
                });
                passiveSkills.forEach((data, index) => {
                    if (rows[rowIndex]) updateInheritedSkillRow(rows[rowIndex++], data, selectedChar, index);
                });
            }
        }
      } else {
        filterContainer.style.display = 'none';
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
              row.className = 'group relative flex items-center gap-2.5 p-2 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-md rounded-xl border border-white/5 active:border-white/10 shadow-md active:shadow-lg transition-all duration-300 overflow-hidden';
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
    }
  };

  // 初期データロード
  getCharactersWithRanchBonus().then(async chars => {
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

      let needSave = false;

      if (char.sp !== correctSP) {
        console.log(`[SP Correction] ${char.name}: ${char.sp} -> ${correctSP} (Job: ${char.jobName})`);
        char.sp = correctSP;
        needSave = true;
      }

      if (char.inheritedActiveSkill) {
        const { jobId, skillId } = char.inheritedActiveSkill;
        if (!char.jobSkills || !char.jobSkills[jobId] || !char.jobSkills[jobId][skillId] || char.jobSkills[jobId][skillId] <= 0) {
          char.inheritedActiveSkill = null;
          needSave = true;
        }
      }

      if (char.inheritedPassiveSkill) {
        const { jobId, skillId } = char.inheritedPassiveSkill;
        if (!char.jobSkills || !char.jobSkills[jobId] || !char.jobSkills[jobId][skillId] || char.jobSkills[jobId][skillId] <= 0) {
          char.inheritedPassiveSkill = null;
          needSave = true;
        }
      }

      if (needSave) {
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
