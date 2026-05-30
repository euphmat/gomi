import { DUNGEONS } from '../definitions/dungeons.js';
import { GameDB } from '../data/database.js';

window.enterDungeon = async (dungeonId) => {
  await GameDB.setGameState('currentDungeon', dungeonId);
  await GameDB.setGameState('currentFloor', 1);
  window.location.hash = '/battle';
};

/**
 * このファイルは「ダンジョン」画面の中身を作って表示するためのファイルです。
 *
 * Dungeon Page
 */
export function renderDungeonPage() {
  const cardsHtml = DUNGEONS.map(d => {
    if (d.isUnlocked) {
      const totalFloors = d.floors ? d.floors.length : 0;
      return `
      <!-- ダンジョン: ${d.name} -->
      <div class="flex items-center bg-gray-800/80 border border-gray-700 rounded-xl p-3 shadow-md gap-4 transition-transform hover:scale-[1.01]">
        <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-900 border border-gray-600 relative">
          <img src="${d.image}" alt="${d.name}" class="w-full h-full object-cover">
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-bold text-gray-100 flex items-center gap-2">
            ${d.name}
            <span class="text-[10px] bg-gray-900 border border-gray-700 px-1.5 py-0.5 rounded text-gray-300 font-normal">全${totalFloors}F</span>
          </h3>
          <p class="text-xs text-gray-400 mt-1">${d.description}</p>
        </div>
        <button onclick="window.enterDungeon('${d.id}')" class="flex flex-col items-center justify-center w-16 h-16 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold transition-colors shadow-lg active:scale-95 cursor-pointer flex-shrink-0">
          <span class="material-symbols-outlined text-2xl mb-1">swords</span>
          <span class="text-[10px]">探索</span>
        </button>
      </div>`;
    } else {
      return `
      <!-- 未解放ダンジョン: ${d.name} -->
      <div class="flex items-center bg-gray-900/60 border border-gray-800 rounded-xl p-3 shadow-sm gap-4 opacity-60">
        <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-900 border border-gray-800 flex items-center justify-center">
          <span class="material-symbols-outlined text-gray-700 text-3xl">question_mark</span>
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-bold text-gray-500">${d.name}</h3>
          <p class="text-xs text-gray-600 mt-1">${d.description}</p>
        </div>
        <div class="flex flex-col items-center justify-center w-16 h-16 bg-gray-800 rounded-xl text-gray-600 font-bold flex-shrink-0 border border-gray-700/50">
          <span class="material-symbols-outlined text-2xl mb-1">lock</span>
          <span class="text-[10px]">Locked</span>
        </div>
      </div>`;
    }
  }).join('');

  return `
    <div class="flex flex-col h-full bg-[#0b0b19] p-4 gap-4 pb-24 overflow-y-auto">
      ${cardsHtml}
      
      <div class="flex justify-center py-4">
        <span class="material-symbols-outlined text-gray-700">more_horiz</span>
      </div>
    </div>
  `;
}
