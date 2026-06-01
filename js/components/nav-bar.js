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
  { id: 'forge',   label: '鍛冶屋',   icon: 'handyman',   path: '/forge' },
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

    // Active: green background matching mockup (#60a917)
    // Inactive: dark with hover state
    const classes = isActive
      ? 'bg-green-700 text-white border-t-2 border-green-400 shadow-[0_-2px_10px_rgba(96,169,23,0.3)]'
      : 'bg-gray-900/80 text-gray-500 border-t-2 border-transparent hover:text-gray-300 hover:bg-gray-800/80';

    const disabledAttr = isBattle ? 'disabled' : '';
    const disabledClass = isBattle ? 'opacity-30 pointer-events-none grayscale' : 'cursor-pointer';

    return `
      <button data-nav-path="${tab.path}"
              id="nav-${tab.id}"
              ${disabledAttr}
              class="flex-1 flex flex-col items-center justify-center py-3
                     ${classes} ${disabledClass} transition-all duration-200 active:scale-95">
        <span class="material-symbols-outlined text-[24px] leading-none">${tab.icon}</span>
      </button>
    `;
  }).join('');

  return `
    <nav id="game-nav" class="shrink-0 flex border-t border-gray-700/40 bg-gray-900/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]">
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
