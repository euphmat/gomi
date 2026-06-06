/**
 * ギルド画面のタブで共通使用するキャラクター選択用の2x2グリッドコンポーネント。
 */

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
        relative p-2.5 rounded-2xl cursor-pointer transition-all duration-300
        ${isSelected 
          ? 'bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-md border border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] ring-1 ring-cyan-400/50 scale-[1.02]' 
          : 'bg-gray-900/60 backdrop-blur-sm border border-white/5 hover:bg-gray-800/80 hover:border-white/10 hover:shadow-lg'}
        flex items-center gap-3 overflow-hidden group
      `;
      slot.onclick = () => onSelect(char.id);

      slot.innerHTML = `
        ${isSelected ? '<div class="absolute inset-0 bg-cyan-400/5 rounded-2xl animate-pulse pointer-events-none"></div>' : ''}
        <div class="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-black/60 border ${isSelected ? 'border-cyan-500/50' : 'border-white/10'} shadow-inner">
          <img src="${char.iconImage}" alt="" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" onerror="this.style.display='none'">
        </div>
        <div class="flex flex-col min-w-0 z-10">
          <span class="text-[15px] font-black text-gray-100 truncate leading-tight drop-shadow-sm group-hover:text-white transition-colors mb-1">${char.name}</span>
          <div class="flex items-center">
            <span class="text-[10px] font-bold text-yellow-300 bg-yellow-900/40 px-1.5 py-px rounded flex items-center gap-0.5">
              <span class="material-symbols-outlined !text-[12px]">stars</span>SP: ${char.sp || 0}
            </span>
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
