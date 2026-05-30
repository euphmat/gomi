/**
 * このファイルは「ダンジョン」画面の中身を作って表示するためのファイルです。
 *
 * Dungeon Page
 */
export function renderDungeonPage() {
  return `
    <div class="flex flex-col h-full bg-[#0b0b19] p-4 gap-4 pb-24">
      
      <!-- ダンジョン: スライムの森 -->
      <div class="flex items-center bg-gray-800/80 border border-gray-700 rounded-xl p-3 shadow-md gap-4 transition-transform hover:scale-[1.01]">
        <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-900 border border-gray-600">
          <img src="assets/dungeon/slime_forest.webp" alt="スライムの森" class="w-full h-full object-cover">
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-bold text-gray-100">スライムの森</h3>
          <p class="text-xs text-gray-400 mt-1">初心者向けの安全な森。スライムが多数生息している。</p>
        </div>
        <button onclick="window.location.hash='/battle'" class="flex flex-col items-center justify-center w-16 h-16 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold transition-colors shadow-lg active:scale-95 cursor-pointer flex-shrink-0">
          <span class="material-symbols-outlined text-2xl mb-1">swords</span>
          <span class="text-[10px]">探索</span>
        </button>
      </div>

      <!-- 未解放ダンジョン 1 -->
      <div class="flex items-center bg-gray-900/60 border border-gray-800 rounded-xl p-3 shadow-sm gap-4 opacity-70">
        <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-900 border border-gray-800 flex items-center justify-center">
          <span class="material-symbols-outlined text-gray-700 text-3xl">question_mark</span>
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-bold text-gray-500">???</h3>
          <p class="text-xs text-gray-600 mt-1">未解放のエリア</p>
        </div>
        <div class="flex flex-col items-center justify-center w-16 h-16 bg-gray-800 rounded-xl text-gray-600 font-bold flex-shrink-0">
          <span class="material-symbols-outlined text-2xl mb-1">lock</span>
          <span class="text-[10px]">Locked</span>
        </div>
      </div>

      <!-- 未解放ダンジョン 2 -->
      <div class="flex items-center bg-gray-900/60 border border-gray-800 rounded-xl p-3 shadow-sm gap-4 opacity-50">
        <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-900 border border-gray-800 flex items-center justify-center">
          <span class="material-symbols-outlined text-gray-700 text-3xl">question_mark</span>
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-bold text-gray-600">???</h3>
          <p class="text-xs text-gray-700 mt-1">未解放のエリア</p>
        </div>
        <div class="flex flex-col items-center justify-center w-16 h-16 bg-gray-800/50 rounded-xl text-gray-700 font-bold flex-shrink-0">
          <span class="material-symbols-outlined text-xl">lock</span>
        </div>
      </div>
      
      <!-- 続く... -->
      <div class="flex justify-center py-4">
        <span class="material-symbols-outlined text-gray-700">more_horiz</span>
      </div>

    </div>
  `;
}
