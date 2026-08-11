/**

 * このファイルは画面の一番下にある「ナビゲーションバー（メニュー）」を作るファイルです。
 * ここを押すと別の画面（ギルドやダンジョンなど）に移動できます。
 * 
 * Bottom Navigation Bar Component
 * 
 * 5-tab navigation: Hometown | Guild | Dungeon | Shop | Quest
 * Highlights the active tab based on current route.
 */

const NAV_TABS = [
  { id: 'status',  label: 'ホームタウン', icon: 'home', path: '/status' },
  { id: 'guild',   label: 'ギルド', icon: 'groups', path: '/guild' },
  { id: 'dungeon', label: 'ダンジョン', icon: 'castle', path: '/dungeon' },
  { id: 'shop',    label: 'ショップ', icon: 'storefront', path: '/shop' },
  { id: 'quest',   label: 'クエスト', icon: 'flag', path: '/quest' },
];

/**
 * Render the bottom navigation bar.
 * @param {import('../router.js').Router} router
 * @returns {string} HTML string
 */
export function createNavBar(router) {
  const currentPath = router.getCurrentRoute();

  const isBattle = currentPath === '/battle';

  const tabsHTML = NAV_TABS.map(tab => {
    const isActive = currentPath === tab.path || (tab.id === 'status' && ['/memory-game', '/sudoku', '/minesweeper', '/monster-tower'].includes(currentPath));

    // Selected state stays visible; touch feedback is applied only while pressed.
    const classes = isActive
      ? 'bg-slate-900/95 text-emerald-400 border-t-2 border-emerald-400 shadow-[inset_0_4px_12px_rgba(16,185,129,0.05),_0_-4px_12px_rgba(16,185,129,0.15)] relative z-10'
      : 'bg-slate-950/95 text-slate-500 border-t-2 border-transparent active:text-slate-300 active:bg-slate-900/50';

    const disabledAttr = isBattle ? 'disabled' : '';
    const disabledClass = isBattle ? 'opacity-30 pointer-events-none grayscale' : 'cursor-pointer';

    return `
      <button data-nav-path="${tab.path}"
              id="nav-${tab.id}"
              ${disabledAttr}
              aria-label="${tab.label}"
              ${isActive ? 'aria-current="page"' : ''}
              class="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-1.5
                     ${classes} ${disabledClass} transition-all duration-150 active:scale-[0.96]">
        <span class="material-symbols-outlined text-[22px] leading-none">${tab.icon}</span>
        <span class="text-[9px] font-bold leading-none tracking-tight">${tab.label}</span>
      </button>
    `;
  }).join('');

  return `
    <nav id="game-nav" class="shrink-0 flex border-t border-slate-900 bg-slate-950/95 backdrop-blur-md" aria-label="メインメニュー">
      ${tabsHTML}
    </nav>
  `;
}

/**
 * Attach click event listeners to navigation buttons.
 * Call this after rendering the nav bar into the DOM.
 * @param {import('../router.js').Router} router
 */
export function initNavBar(router) {
  const nav = document.getElementById('game-nav');
  if (!nav) return;

  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-nav-path]');
    if (btn) {
      const path = btn.dataset.navPath;
      if (path !== router.getCurrentRoute()) {
        router.navigate(path);
      }
    }
  });
}
