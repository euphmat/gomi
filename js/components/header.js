/**

 * このファイルは画面の一番上にある「ヘッダー」を作るファイルです。
 * 現在の場所や所持金、設定ボタンを表示します。
 * 
 * Header Component
 * 
 * Displays: Location Name | Gold | Prism | Quest | Update Log | Refresh | Settings
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
      <div id="header-location" class="flex items-center gap-1 flex-1 min-w-0" aria-label="現在地: ${gameState.location}">
        <span id="header-location-name" class="min-w-0 truncate text-[11px] sm:text-sm font-bold text-gray-100">${gameState.location}</span>
        <span id="header-location-floor" class="hidden shrink-0 rounded bg-cyan-950/80 border border-cyan-700/60 px-1 py-0.5 text-[10px] sm:text-xs leading-none font-bold font-mono text-cyan-200"></span>
      </div>

      <!-- Balances -->
      <div id="header-wallet" class="flex min-w-0 shrink items-center gap-1 sm:gap-2">
        <div id="header-gold" class="flex min-w-0 shrink items-center gap-0.5 sm:gap-1 bg-gradient-to-r from-amber-500/20 to-yellow-600/20 border border-amber-500/50 shadow-[0_0_6px_rgba(245,158,11,0.15)] rounded-md px-1.5 sm:px-2.5 py-1" aria-label="所持ゴールド ${formatNumber(gameState.gold)}" title="所持ゴールド ${formatNumber(gameState.gold)}"> <span class="material-symbols-outlined shrink-0 text-[14px] text-amber-200 leading-none">toll</span> <span id="header-gold-display" class="min-w-0 truncate text-[11px] sm:text-xs text-amber-200 font-mono font-bold tracking-tight tabular-nums">${formatNumber(gameState.gold)}</span> </div>
        <div id="header-prism" class="flex min-w-0 shrink items-center gap-0.5 sm:gap-1 bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20 border border-fuchsia-400/50 shadow-[0_0_6px_rgba(232,121,249,0.15)] rounded-md px-1.5 sm:px-2.5 py-1" aria-label="プリズム ${formatNumber(gameState.prism || 0)}" title="プリズム ${formatNumber(gameState.prism || 0)}"> <span class="material-symbols-outlined shrink-0 text-[14px] text-fuchsia-200 leading-none">diamond</span> <span id="header-prism-display" class="min-w-0 truncate text-[11px] sm:text-xs text-fuchsia-200 font-mono font-bold tracking-tight tabular-nums">${formatNumber(gameState.prism || 0)}</span> </div>
      </div>

      <!-- Quest -->
      <button id="btn-quest" class="touch-compact relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-500/45 bg-sky-950/70 text-sky-200 transition duration-150 active:scale-95 active:bg-sky-900" aria-label="クエストを開く">
        <span class="material-symbols-outlined text-lg leading-none">assignment</span>
        <span id="header-quest-badge" class="pointer-events-none absolute -right-1.5 -top-1.5 hidden min-w-4 h-4 items-center justify-center rounded-full border border-slate-950 bg-rose-500 px-1 text-[8px] font-black leading-none text-white shadow-[0_2px_6px_rgba(0,0,0,.45)]" aria-hidden="true"></span>
      </button>

      <!-- Update Log -->
      <button id="btn-update-log" class="touch-compact flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-500/45 bg-violet-950/70 text-violet-200 transition duration-150 active:scale-95 active:bg-violet-900" aria-label="Updateログを開く"> <span class="material-symbols-outlined text-lg leading-none">rocket_launch</span> </button>

      <!-- Refresh -->
      <button id="btn-hard-refresh" class="touch-compact flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-700/50 bg-emerald-800/80 text-emerald-100 transition duration-150 active:scale-95 active:bg-emerald-700" aria-label="最新版に更新"> <span class="material-symbols-outlined text-lg leading-none">refresh</span> </button>

      <!-- Settings -->
      <button id="btn-setting" class="touch-compact flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-600/50 bg-gray-700/80 text-gray-200 transition duration-150 active:scale-95 active:bg-gray-600" aria-label="設定を開く"> <span class="material-symbols-outlined text-lg leading-none">settings</span> </button>
    </header>
  `;
}

export function initHeaderNumberDisplays() {
  const observe = (displayId, label) => {
    const display = document.getElementById(displayId);
    const holder = display?.parentElement;
    if (!display || !holder) return;
    const syncAccessibleValue = () => {
      const text = display.textContent || '0';
      holder.setAttribute('aria-label', `${label} ${text}`);
      holder.setAttribute('title', `${label} ${text}`);
    };
    syncAccessibleValue();
    new MutationObserver(syncAccessibleValue).observe(display, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  };
  observe('header-gold-display', '所持ゴールド');
  observe('header-prism-display', 'プリズム');
}
