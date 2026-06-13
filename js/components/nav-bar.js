/**

 * このファイルは画面の一番下にある「ナビゲーションバー（メニュー）」を作るファイルです。
 * ここを押すと別の画面（ギルドやダンジョンなど）に移動できます。
 * 
 * Bottom Navigation Bar Component
 * 
 * 5-tab navigation: Status | Guild | Dungeon | Shop | Library
 * Highlights the active tab based on current route.
 */

const NAV_TABS = [
  { id: 'status',  label: 'Status',  icon: 'person',     path: '/status' },
  { id: 'guild',   label: 'Guild',   icon: 'groups',     path: '/guild' },
  { id: 'dungeon', label: 'Dungeon', icon: 'castle',     path: '/dungeon' },
  { id: 'shop',   label: 'ショップ',   icon: 'storefront',   path: '/shop' },
  { id: 'library', label: 'Library', icon: 'menu_book',  path: '/library' },
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
    const isActive = currentPath === tab.path;

    // Active: glowing emerald and dark slate
    // Inactive: dark translucent slate with hover state
    const classes = isActive
      ? 'bg-slate-900/95 text-emerald-400 border-t-2 border-emerald-400 shadow-[inset_0_4px_12px_rgba(16,185,129,0.05),_0_-4px_12px_rgba(16,185,129,0.15)] relative z-10'
      : 'bg-slate-950/95 text-slate-500 border-t-2 border-transparent hover:text-slate-300 hover:bg-slate-900/50';

    const disabledAttr = isBattle ? 'disabled' : '';
    const disabledClass = isBattle ? 'opacity-30 pointer-events-none grayscale' : 'cursor-pointer';

    return `
      <button data-nav-path="${tab.path}"
              id="nav-${tab.id}"
              ${disabledAttr}
              style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);"
              class="flex-1 flex flex-col items-center justify-center pt-3
                     ${classes} ${disabledClass} transition-all duration-200 active:scale-95">
        <span class="material-symbols-outlined text-[24px] leading-none">${tab.icon}</span>
      </button>
    `;
  }).join('');

  return `
    <nav id="game-nav" class="shrink-0 flex border-t border-slate-900 bg-slate-950/95 backdrop-blur-md">
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
