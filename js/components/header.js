/**

 * このファイルは画面の一番上にある「ヘッダー」を作るファイルです。
 * 現在の場所や所持金、設定ボタンを表示します。
 * 
 * Header Component
 * 
 * Displays: Location Name | Version | Gold | Settings Button
 * 
 * @param {Object} gameState
 * @param {string} gameState.location - Current location name
 * @param {string} gameState.version - Game version string
 * @param {number} gameState.gold - Gold amount
 * @returns {string} HTML string
 */
import { formatNumber } from '../utils/format.js';

export function createHeader(gameState) {
  return `
    <header id="game-header" class="shrink-0 flex items-center gap-2 px-3 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)] bg-gray-900/95 backdrop-blur-md border-b border-gray-700/40">
      <!-- Location -->
      <div class="flex items-center gap-1.5 flex-1 min-w-0">
        <span id="header-location" class="text-sm font-bold text-gray-100 truncate">${gameState.location}</span>
      </div>

      <!-- Gold -->
      <div class="flex items-center gap-1 bg-gray-800/80 border border-gray-700/50 rounded-md px-2.5 py-1 shrink-0"> <span class="material-symbols-outlined text-amber-400 text-sm leading-none">paid</span> <span id="header-gold-display" class="text-xs text-gray-200 font-mono font-medium tracking-tight"> Gold : ${formatNumber(gameState.gold)} </span> </div>

      <!-- Refresh -->
      <button id="btn-hard-refresh" class="shrink-0 bg-gray-800/80 border border-gray-700/50 rounded-md px-2.5 py-1 text-xs text-gray-300 font-medium hover:bg-gray-700 active:bg-gray-600 transition-colors duration-150" title="最新版に更新"> <span class="material-symbols-outlined text-base leading-none align-middle">refresh</span> </button>

      <!-- Settings -->
      <button id="btn-setting" class="shrink-0 bg-gray-800/80 border border-gray-700/50 rounded-md px-2.5 py-1 text-xs text-gray-300 font-medium hover:bg-gray-700 active:bg-gray-600 transition-colors duration-150" title="設定"> <span class="material-symbols-outlined text-base leading-none align-middle">settings</span> </button>
    </header>
  `;
}
