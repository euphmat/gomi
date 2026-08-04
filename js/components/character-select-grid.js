/**
 * ギルド画面のタブで共通使用するキャラクター選択用の2x2グリッドコンポーネント。
 */
import { JOBS } from '../jobs/index.js';

export function createCharacterSelectGrid(characters, selectedCharId, onSelect) {
  const container = document.createElement('div');
  container.className = 'grid grid-cols-2 gap-2 mb-4 shrink-0';

  const MAX_PARTY_SIZE = 4;

  for (let i = 0; i < MAX_PARTY_SIZE; i++) {
    const char = characters[i];
    const slot = document.createElement('div');
    
    if (char) {
      const isSelected = char.id === selectedCharId;
      slot.className = `
        relative p-1.5 rounded-xl cursor-pointer transition-all duration-300
        ${isSelected 
          ? 'bg-gradient-to-br from-gray-800 to-gray-900 backdrop-blur-xl border border-cyan-400/80 shadow-[0_4px_15px_rgba(34,211,238,0.25)] ring-1 ring-cyan-400/50 z-10' 
          : 'bg-gradient-to-br from-gray-900/80 to-black/60 backdrop-blur-md border border-white/10 active:border-white/20 active:bg-gray-800 active:shadow-lg'}
        flex items-start gap-2 overflow-hidden group
      `;
      slot.onclick = () => onSelect(char.id);

      let inheritedSkillHtml = '';
      
      const renderSkill = (inheritedSkillData, typeLabel, iconName, classes) => {
        let skillName = '未継承';
        let opacityClass = 'opacity-50 grayscale-[30%]';
        
        if (inheritedSkillData) {
          const { jobId, skillId } = inheritedSkillData;
          const jobDef = JOBS[jobId];
          if (jobDef) {
            const skillDef = jobDef.skills.find(s => s.id === skillId);
            if (skillDef) {
              skillName = skillDef.name;
              opacityClass = '';
            }
          }
        }

        return `
          <div class="flex items-center bg-black/40 rounded border ${classes.borderBox} py-0.5 px-1 shadow-inner w-full mb-[2px] group/skill active:bg-gray-800 transition-colors ${opacityClass}">
            <div class="flex items-center justify-center w-[18px] h-[18px] rounded ${classes.bgIcon} shrink-0 border ${classes.borderIcon} mr-1.5 shadow-sm">
              <span class="material-symbols-outlined !text-[11px] ${classes.text}">${iconName}</span>
            </div>
            <div class="flex flex-col min-w-0 justify-center">
              <span class="text-[6px] font-black ${classes.textLabel} tracking-wide leading-none mb-px">${typeLabel}</span>
              <span class="text-[9px] font-bold text-gray-200 truncate leading-none group-active/skill:text-white transition-colors">${skillName}</span>
            </div>
          </div>
        `;
      };

      inheritedSkillHtml += renderSkill(
        char.inheritedActiveSkill, 
        '継承アクティブ', 
        'swords', 
        {
          text: 'text-cyan-400',
          bgIcon: 'bg-cyan-900/40',
          borderIcon: 'border-cyan-500/30',
          textLabel: 'text-cyan-400/90',
          borderBox: 'border-cyan-500/20'
        }
      );
      inheritedSkillHtml += renderSkill(
        char.inheritedPassiveSkill, 
        '継承パッシブ', 
        'psychology', 
        {
          text: 'text-emerald-400',
          bgIcon: 'bg-emerald-900/40',
          borderIcon: 'border-emerald-500/30',
          textLabel: 'text-emerald-400/90',
          borderBox: 'border-emerald-500/20'
        }
      );

      slot.innerHTML = `
        ${isSelected ? '<div class="absolute inset-0 bg-cyan-400/5 rounded-xl animate-pulse pointer-events-none"></div>' : ''}
        
        <div class="relative w-9 h-9 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-black border ${isSelected ? 'border-cyan-400/80' : 'border-gray-600'} shadow-md mt-0.5">
          <img src="${char.iconImage}" alt="" class="w-full h-full object-cover transition-transform duration-500 group-active:scale-110" onerror="this.style.display='none'">
          ${isSelected ? '<div class="absolute inset-0 ring-inset ring-2 ring-cyan-400/20 rounded-lg"></div>' : ''}
        </div>
        
        <div class="flex flex-col min-w-0 z-10 w-full pr-0.5">
          <div class="flex items-center justify-between mb-1 gap-1">
            <span class="text-[11px] font-black text-gray-100 truncate drop-shadow-md group-active:text-white transition-colors leading-tight">${char.name}</span>
            <div class="flex gap-1 shrink-0">
              <span class="text-[8px] font-bold text-orange-300 bg-orange-900/40 px-1 py-px rounded border border-orange-500/30 shadow-inner">Lv ${char.level || 1}</span>
              <span class="text-[8px] font-bold text-pink-300 bg-pink-900/40 px-1 py-px rounded border border-pink-500/30 shadow-inner">Job ${char.jobLevel || 1}</span>
              <span class="text-[8px] font-bold text-yellow-300 bg-yellow-900/40 px-1 py-px rounded border border-yellow-500/30 flex items-center gap-0.5 shadow-inner">
                <span class="material-symbols-outlined !text-[8px]">stars</span>${char.sp || 0}
              </span>
            </div>
          </div>
          <div class="flex flex-col w-full">
            ${inheritedSkillHtml}
          </div>
        </div>
      `;
    } else {
      // Empty slot
      slot.className = 'p-2.5 rounded-2xl bg-gray-900/40 backdrop-blur-sm border-2 border-dashed border-white/10 flex items-center gap-3 opacity-60';
      slot.innerHTML = `
        <div class="w-12 h-12 rounded-xl bg-black/40 border border-white/5 shadow-inner flex items-center justify-center">
          <span class="material-symbols-outlined text-gray-600 text-xl">person_off</span>
        </div>
        <span class="text-xs font-bold text-gray-500 tracking-wider">Empty</span>
      `;
    }

    container.appendChild(slot);
  }

  return container;
}
