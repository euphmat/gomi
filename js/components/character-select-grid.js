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
        relative p-2 rounded-xl cursor-pointer transition-all duration-300
        ${isSelected 
          ? 'bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-md border border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] ring-1 ring-cyan-400/50 scale-[1.02]' 
          : 'bg-gray-900/60 backdrop-blur-sm border border-white/5 hover:bg-gray-800/80 hover:border-white/10 hover:shadow-lg'}
        flex items-center gap-2 overflow-hidden group
      `;
      slot.onclick = () => onSelect(char.id);

      let inheritedSkillHtml = '';
      if (char.inheritedSkill) {
        const { jobId, skillId } = char.inheritedSkill;
        const jobDef = JOBS[jobId];
        if (jobDef) {
          const skillDef = jobDef.skills.find(s => s.id === skillId);
          if (skillDef) {
            inheritedSkillHtml = `
              <div class="flex items-center gap-1 mt-1">
                <span class="text-[8px] font-bold text-purple-300 bg-purple-900/40 px-1 py-px rounded border border-purple-500/30 shrink-0">継承</span>
                <span class="text-[10px] text-gray-300 truncate" title="${skillDef.name}">${skillDef.name}</span>
              </div>
            `;
          }
        }
      }

      slot.innerHTML = `
        ${isSelected ? '<div class="absolute inset-0 bg-cyan-400/5 rounded-xl animate-pulse pointer-events-none"></div>' : ''}
        <div class="relative w-11 h-11 flex-shrink-0 rounded-lg overflow-hidden bg-black/60 border ${isSelected ? 'border-cyan-500/50' : 'border-white/10'} shadow-inner">
          <img src="${char.iconImage}" alt="" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" onerror="this.style.display='none'">
        </div>
        <div class="flex flex-col min-w-0 z-10 w-full pr-1">
          <span class="text-[13px] font-bold text-gray-200 truncate leading-tight drop-shadow-sm group-hover:text-white transition-colors mb-0.5">${char.name}</span>
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[9px] font-bold text-cyan-300 bg-cyan-900/40 px-1.5 py-px rounded border border-cyan-500/30 whitespace-nowrap">
              Lv.${char.jobLevel || 1}
            </span>
            <span class="text-[9px] font-bold text-yellow-300 bg-yellow-900/40 px-1.5 py-px rounded border border-yellow-500/30 flex items-center gap-0.5 whitespace-nowrap">
              <span class="material-symbols-outlined !text-[10px]">stars</span>${char.sp || 0}
            </span>
          </div>
          ${inheritedSkillHtml}
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
