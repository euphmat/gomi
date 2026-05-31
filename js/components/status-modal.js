import { createStatusBar, BAR_COLORS } from './status-bar.js';
import { STAT_KEYS } from '../data/constants.js';

const ELEMENT_ICONS = {
  fire: { icon: 'local_fire_department', color: 'text-red-500' },
  water: { icon: 'water_drop', color: 'text-blue-500' },
  grass: { icon: 'eco', color: 'text-green-500' },
  ice: { icon: 'ac_unit', color: 'text-cyan-400' },
  thunder: { icon: 'bolt', color: 'text-yellow-400' },
  wind: { icon: 'air', color: 'text-teal-400' },
  earth: { icon: 'landscape', color: 'text-amber-600' },
  light: { icon: 'light_mode', color: 'text-yellow-200' },
  dark: { icon: 'dark_mode', color: 'text-purple-500' },
};

const AILMENT_ICONS = {
  poison: { icon: 'coronavirus', color: 'text-purple-500' },
  burn: { icon: 'local_fire_department', color: 'text-red-500' },
  paralysis: { icon: 'electric_bolt', color: 'text-yellow-400' },
  sleep: { icon: 'snooze', color: 'text-indigo-400' },
  confusion: { icon: 'question_mark', color: 'text-pink-400' },
  curse: { icon: 'sentiment_dissatisfied', color: 'text-gray-400' },
  blind: { icon: 'visibility_off', color: 'text-slate-400' },
  silence: { icon: 'volume_off', color: 'text-blue-300' },
};

export function showDetailedStatusModal(character, finalStats) {
  if (document.getElementById('detailed-status-modal')) return;

  const overlay = document.createElement('div');
  overlay.id = 'detailed-status-modal';
  overlay.className = `
    fixed inset-0 z-[100] flex items-center justify-center
    bg-black/80 backdrop-blur-md
    animate-[fade-in_0.2s_ease-out] p-4
  `;
  overlay.style.animation = 'fade-in 0.2s ease-out forwards';

  const renderCombinedGrid = (title, attackObj, resistObj, iconMap) => {
    if (!attackObj || !resistObj) return '';
    const items = Object.keys(iconMap).map(k => {
      let atkVal = attackObj[k] || 0;
      let resVal = resistObj[k] || 0;
      
      let atkStr = `${atkVal}%`;
      let resStr = `${resVal}%`;
      
      let atkColor = atkVal > 0 ? 'text-green-400' : (atkVal < 0 ? 'text-red-400' : 'text-gray-500');
      let resColor = resVal > 0 ? 'text-blue-400' : (resVal < 0 ? 'text-red-400' : 'text-gray-500');
      
      if (atkVal > 0) atkStr = `+${atkStr}`;
      if (resVal > 0) resStr = `+${resStr}`;

      const iconDef = iconMap[k] || { icon: 'help', color: 'text-gray-500' };

      return `
        <div class="flex flex-col items-center bg-gray-800/60 rounded border border-gray-700/50 pb-1 overflow-hidden" title="${k}">
          <div class="w-full bg-gray-800 flex flex-col items-center justify-center py-1 border-b border-gray-700/50">
            <span class="text-[9px] text-gray-400 capitalize leading-none mb-1">${k}</span>
            <span class="material-symbols-outlined text-[20px] ${iconDef.color} leading-none">${iconDef.icon}</span>
          </div>
          <div class="flex flex-col w-full px-1.5 mt-1 gap-[2px]">
            <div class="flex justify-between items-end">
              <span class="text-[8px] text-gray-500 leading-none mb-[1px]">攻</span>
              <span class="text-[11px] font-bold ${atkColor} leading-none">${atkStr}</span>
            </div>
            <div class="flex justify-between items-end">
              <span class="text-[8px] text-gray-500 leading-none mb-[1px]">防</span>
              <span class="text-[11px] font-bold ${resColor} leading-none">${resStr}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="flex flex-col gap-1.5 mb-2">
        <div class="text-[11px] font-bold text-gray-300 border-b border-gray-600 pb-0.5">${title}</div>
        <div class="grid grid-cols-5 gap-1.5">${items}</div>
      </div>
    `;
  };

  const statsHTML = STAT_KEYS.filter(s => s.key !== 'hp' && s.key !== 'mp').map(s => `
    <div class="flex flex-col items-center justify-center bg-gray-800/60 rounded px-1 py-1
                border border-gray-700/40 min-w-0 flex-1">
      <span class="text-[8px] text-gray-500 leading-none font-medium mb-0.5">${s.label}</span>
      <span class="text-[11px] text-gray-200 font-bold leading-tight">${finalStats[s.key]}</span>
    </div>
  `).join('');

  overlay.innerHTML = `
    <div class="bg-[#111122] border border-gray-600/50 rounded-2xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl shadow-black/80 animate-[slide-up_0.3s_cubic-bezier(0.16,1,0.3,1)] max-h-[90dvh]">
      
      <!-- Header -->
      <div class="flex items-center justify-between px-3 py-2.5 bg-gray-900/80 border-b border-gray-700/50 relative z-20">
        <div class="flex items-center gap-2">
          <div class="w-9 h-9 rounded-lg overflow-hidden border border-gray-600 shrink-0 bg-gray-800 shadow-md">
            <img src="${character.iconImage}" class="w-full h-full object-contain" />
          </div>
          <div class="flex flex-col">
            <div class="text-[13px] font-bold text-gray-100 leading-tight">${character.name} <span class="text-[9px] text-gray-400 ml-1">${character.jobName}</span></div>
            <div class="text-[9px] text-gray-300 mt-0.5">Lv ${character.level} / JLv ${character.jobLevel}</div>
          </div>
        </div>
        <button id="status-modal-close" class="w-7 h-7 flex items-center justify-center rounded-full bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
          <span class="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 bg-gradient-to-b from-gray-900 to-[#0b0b19] flex flex-col gap-2">
        
        <!-- Bars -->
        <div class="flex flex-col gap-1">
          <div class="grid grid-cols-2 gap-1.5">
            ${createStatusBar({ label: 'HP', current: character.hp.current, max: finalStats.hp || character.hp.max, ...BAR_COLORS.hp })}
            ${createStatusBar({ label: 'MP', current: character.mp.current, max: finalStats.mp || character.mp.max, ...BAR_COLORS.mp })}
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            ${createStatusBar({ label: 'EXP', current: character.exp.current, max: character.exp.max, ...BAR_COLORS.exp })}
            ${createStatusBar({ label: 'JP', current: character.jp.current, max: character.jp.max, ...BAR_COLORS.jobExp })}
          </div>
        </div>

        <!-- Base Stats -->
        <div class="flex gap-1 mt-0.5">
          ${statsHTML}
        </div>

        <div class="w-full h-px bg-gray-700/50 my-0.5"></div>

        <!-- Combined Elements & Ailments Grids -->
        ${renderCombinedGrid('属性 (Elements)', finalStats.attackElements, finalStats.elementResist, ELEMENT_ICONS)}
        ${renderCombinedGrid('状態異常 (Ailments)', finalStats.attackAilments, finalStats.ailmentResist, AILMENT_ICONS)}
        
      </div>
    </div>
  `;

  const closeBtn = overlay.querySelector('#status-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => overlay.remove());
  }
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}
