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
    <header id="game-header" class="shrink-0 flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)] bg-gray-900/95 backdrop-blur-md border-b border-gray-700/40">
      <!-- Location -->
      <div id="header-location" class="flex items-center gap-1 flex-1 min-w-0" title="${gameState.location}">
        <span id="header-location-name" class="min-w-0 truncate text-[11px] sm:text-sm font-bold text-gray-100">${gameState.location}</span>
        <span id="header-location-floor" class="hidden shrink-0 rounded bg-cyan-950/80 border border-cyan-700/60 px-1 py-0.5 text-[10px] sm:text-xs leading-none font-bold font-mono text-cyan-200"></span>
      </div>

      <!-- Gold -->
      <div class="flex items-center gap-0.5 sm:gap-1 bg-gradient-to-r from-amber-500/20 to-yellow-600/20 border border-amber-500/50 shadow-[0_0_6px_rgba(245,158,11,0.15)] rounded-md px-1.5 sm:px-2.5 py-1 shrink-0"> <span class="material-symbols-outlined text-[14px] text-amber-200 leading-none">toll</span> <span id="header-gold-display" class="text-[11px] sm:text-xs text-amber-200 font-mono font-bold tracking-tight">${formatNumber(gameState.gold)}</span> </div>

      <!-- Prism -->
      <div class="flex items-center gap-0.5 sm:gap-1 bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20 border border-fuchsia-400/50 shadow-[0_0_6px_rgba(232,121,249,0.15)] rounded-md px-1.5 sm:px-2.5 py-1 shrink-0" title="プリズム"> <span class="material-symbols-outlined text-[14px] text-fuchsia-200 leading-none">diamond</span> <span id="header-prism-display" class="text-[11px] sm:text-xs text-fuchsia-200 font-mono font-bold tracking-tight">${formatNumber(gameState.prism || 0)}</span> </div>

      <!-- Refresh -->
      <button id="btn-hard-refresh" class="shrink-0 bg-emerald-800/80 border border-emerald-700/50 rounded-md px-1.5 sm:px-2.5 py-1 text-xs text-emerald-100 font-medium hover:bg-emerald-700 active:bg-emerald-900 transition-colors duration-150" title="最新版に更新"> <span class="material-symbols-outlined text-base leading-none align-middle">refresh</span> </button>

      <!-- Settings -->
      <button id="btn-setting" class="shrink-0 bg-gray-700/80 border border-gray-600/50 rounded-md px-1.5 sm:px-2.5 py-1 text-xs text-gray-200 font-medium hover:bg-gray-600 active:bg-gray-700 transition-colors duration-150" title="設定"> <span class="material-symbols-outlined text-base leading-none align-middle">settings</span> </button>
    </header>
  `;
}
