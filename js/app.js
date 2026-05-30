/**
 * App Entry Point
 * 
 * Initializes the SPA shell:
 * 1. Renders the fixed header and navigation
 * 2. Sets up the router with all page modules
 * 3. Starts routing
 * 
 * To add a new page:
 *   1. Create js/pages/your-page.js with a render function
 *   2. Import it here
 *   3. Register it with router.register('/your-path', renderFn)
 *   4. Add a tab to NAV_TABS in js/components/nav-bar.js
 */
import { Router } from './router.js';
import { createHeader } from './components/header.js';
import { createNavBar, initNavBar } from './components/nav-bar.js';
import { gameState } from './data/mock-data.js';

// ─── Page Imports ────────────────────────────────────────
import { renderStatusPage }  from './pages/status.js';
import { renderGuildPage }   from './pages/guild.js';
import { renderDungeonPage } from './pages/dungeon.js';
import { renderShopPage }    from './pages/shop.js';
import { renderLibraryPage } from './pages/library.js';

class App {
  constructor() {
    this.appEl = document.getElementById('app');
    this.router = null;
    this.init();
  }

  init() {
    // ── 1. Render the app shell ──
    this.appEl.innerHTML = `
      <div class="flex flex-col h-dvh bg-[#0b0b19]">
        <!-- Header (fixed) -->
        <div id="header-container"></div>

        <!-- Main Content (scrollable) -->
        <main id="content"
              class="flex-1 overflow-y-auto overflow-x-hidden
                     transition-[opacity,transform] duration-150 ease-out
                     scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        </main>

        <!-- Bottom Navigation (fixed) -->
        <div id="nav-container"></div>
      </div>
    `;

    // ── 2. Render Header ──
    document.getElementById('header-container').innerHTML = createHeader(gameState);

    // ── 3. Setup Router ──
    this.router = new Router(document.getElementById('content'));
    this.router
      .register('/status',  renderStatusPage)
      .register('/guild',   renderGuildPage)
      .register('/dungeon', renderDungeonPage)
      .register('/shop',    renderShopPage)
      .register('/library', renderLibraryPage);

    // ── 4. Navigation ──
    this.renderNav();
    window.addEventListener('routechange', () => this.renderNav());

    // ── 5. Start ──
    this.router.start();
  }

  renderNav() {
    const navContainer = document.getElementById('nav-container');
    navContainer.innerHTML = createNavBar(this.router);
    initNavBar(this.router);
  }
}

// ─── Bootstrap ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
