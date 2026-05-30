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
        relative p-2 rounded-xl cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'bg-gray-800 border-2 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
          : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-800 hover:border-gray-600'}
        flex items-center gap-3 overflow-hidden
      `;
      slot.onclick = () => onSelect(char.id);

      slot.innerHTML = `
        <div class="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-black/50 border border-gray-700">
          <img src="${char.iconImage}" alt="${char.name}" class="w-full h-full object-cover">
        </div>
        <div class="flex flex-col min-w-0">
          <span class="text-sm font-bold text-gray-200 truncate leading-tight">${char.name}</span>
          <span class="text-[10px] text-gray-400 truncate mb-1">Lv.${char.level} ${char.jobName}</span>
          <div class="flex items-center gap-1.5">
            <span class="text-[9px] font-bold text-yellow-400 bg-yellow-900/40 border border-yellow-700/50 px-1 rounded shadow-sm">SP: ${char.sp || 0}</span>
            <span class="text-[9px] font-bold text-pink-400 bg-pink-900/40 border border-pink-700/50 px-1 rounded shadow-sm">JP: ${char.jp.current || 0}</span>
          </div>
        </div>
      `;
    } else {
      // Empty slot
      slot.className = 'p-2 rounded-xl bg-gray-800/30 border-2 border-dashed border-gray-700 flex items-center gap-3 opacity-50';
      slot.innerHTML = `
        <div class="w-12 h-12 rounded-lg bg-gray-900/50"></div>
        <span class="text-xs text-gray-600">Empty</span>
      `;
    }

    container.appendChild(slot);
  }

  return container;
}
