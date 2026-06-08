/**

 * このファイルはアプリ全体の「スタート地点（エントリーポイント）」となるファイルです。
 * データベースの準備をしたり、画面の枠組み（ヘッダーやナビゲーション）を作り、
 * どの画面を表示するかを決定するルーター（router.js）を起動する役割を持っています。
 *
 * App Entry Point
 *
 * Initializes the SPA shell:
 * 1. Opens IndexedDB connection (seeds initial data if first launch)
 * 2. Renders the fixed header and navigation
 * 3. Sets up the router with all page modules
 * 4. Starts routing
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
import { GameDB } from './data/database.js';

// ─── Page Imports ────────────────────────────────────────
import { renderStatusPage }  from './pages/status.js';
import { renderGuildPage }   from './pages/guild.js';
import { renderDungeonPage } from './pages/dungeon.js';
import { renderForgePage }    from './pages/forge.js';
import { renderLibraryPage } from './pages/library.js';
import { renderBattlePage }  from './pages/battle.js';

class App {
  constructor() {
    this.appEl = document.getElementById('app');
    this.router = null;
    this.init();
  }

  async init() {
    // ── 0. Initialize Database ──
    try {
      await GameDB.open();
      console.log('[App] Database initialized.');
    } catch (error) {
      console.error('[App] Failed to open database:', error);
    }

    // ── 1. Read game state from DB ──
    let gameState = { location: 'はじまりの街', version: '0.1.0', gold: 0 };
    try {
      if (GameDB.db) {
        gameState.location = await GameDB.getGameState('location') || 'はじまりの街';
        gameState.version  = await GameDB.getGameState('version')  || '0.1.0';
        gameState.gold     = await GameDB.getGameState('gold')      ?? 0;
      }
    } catch (e) {
      console.warn('[App] Could not read game state, using defaults.', e);
    }

    // ── 2. Render the app shell ──
    this.appEl.innerHTML = `
      <div class="fixed inset-0 flex flex-col bg-[#0b0b19]">
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

    // ── 3. Render Header ──
    document.getElementById('header-container').innerHTML = createHeader(gameState);

    // ── 4. Setup Router ──
    this.router = new Router(document.getElementById('content'));
    this.router
      .register('/status',  renderStatusPage)
      .register('/guild',   renderGuildPage)
      .register('/dungeon', renderDungeonPage)
      .register('/forge',    renderForgePage)
      .register('/library', renderLibraryPage)
      .register('/battle',  renderBattlePage);

    // ── 5. Navigation ──
    this.renderNav();
    window.addEventListener('routechange', (e) => {
      this.renderNav();
      
      // Reset location text if we leave battle
      if (window.location.hash !== '#/battle') {
        const headerLoc = document.getElementById('header-location');
        if (headerLoc) {
          headerLoc.textContent = 'はじまりの街';
        }
      }
    });

    // ── 6. Settings Button (Data Reset) ──
    this.initSettingsButton();

    // ── 7. Start ──
    this.router.start();
  }

  /**
   * Bind the settings button to open a settings modal.
   */
  initSettingsButton() {
    const btn = document.getElementById('btn-setting');
    if (btn) {
      btn.addEventListener('click', () => this.showSettingsModal());
    }

    const refreshBtn = document.getElementById('btn-hard-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        }
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (let reg of regs) {
            await reg.unregister();
          }
        }
        window.location.reload();
      });
    }
  }

  /**
   * Show the settings modal overlay.
   */
  showSettingsModal() {
    // Prevent duplicate modals
    if (document.getElementById('settings-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'settings-modal';
    overlay.className = `
      fixed inset-0 z-50 flex items-center justify-center
      bg-black/70 backdrop-blur-sm
      animate-[fade-in_0.15s_ease-out]
    `;
    overlay.style.animation = 'fade-in 0.15s ease-out';

    overlay.innerHTML = `
      <div class="bg-gray-900 border border-gray-700/60 rounded-xl mx-3 w-full max-w-[calc(100vw-24px)]
                  shadow-2xl shadow-black/50 flex flex-col overflow-hidden
                  animate-[slide-up_0.2s_ease-out]"
           style="animation: slide-up 0.2s ease-out">

        <!-- Modal Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700/40">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-lg text-gray-400">settings</span>
            <span class="text-sm font-bold text-gray-100">設定</span>
            <span class="text-xs text-gray-500 ml-2 font-mono">v0002</span>
          </div>
          <button id="settings-close"
                  class="w-8 h-8 flex items-center justify-center rounded-lg
                         text-gray-400 hover:text-gray-200 hover:bg-gray-800
                         transition-colors duration-150 cursor-pointer">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="px-4 py-4 flex flex-col gap-3">

          <!-- Battle Stats Toggle Section -->
          <div class="bg-gray-800/60 border border-gray-700/40 rounded-lg p-3">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-base text-blue-400">visibility</span>
                <span class="text-xs font-bold text-gray-200">バトル画面のステータス表示</span>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="setting-toggle-battle-stats" class="sr-only peer" ${localStorage.getItem('hideBattleStats') === 'false' ? 'checked' : ''}>
                <div class="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
            <p class="text-[10px] text-gray-500 leading-relaxed">
              バトル画面でプレイヤーのステータス（ATK, DEF, MAT, MDF, SPD）を表示するかどうかを切り替えます。
            </p>
          </div>

          <!-- Battle Animation Toggle Section -->
          <div class="bg-gray-800/60 border border-gray-700/40 rounded-lg p-3">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-base text-purple-400">animation</span>
                <span class="text-xs font-bold text-gray-200">バトルアニメーション非表示</span>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="setting-toggle-battle-anim" class="sr-only peer" ${localStorage.getItem('disableBattleAnimations') === 'true' ? 'checked' : ''}>
                <div class="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
              </label>
            </div>
            <p class="text-[10px] text-gray-500 leading-relaxed">
              ダメージ表記、スキル表示、ATBゲージ、ドロップ演出などのアニメーションを非表示にして処理負荷を軽減します。
            </p>
          </div>

          <!-- Auto Battle Speed Section -->
          <div class="bg-gray-800/60 border border-gray-700/40 rounded-lg p-3">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-base text-yellow-400">speed</span>
                <span class="text-xs font-bold text-gray-200">自動戦闘速度</span>
              </div>
              <span id="setting-speed-value" class="text-xs font-bold text-yellow-400">${localStorage.getItem('autoBattleSpeed') || 1}x</span>
            </div>
            <input type="range" id="setting-speed-slider" min="1" max="5" step="1" value="${localStorage.getItem('autoBattleSpeed') || 1}" class="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer">
            <div class="flex justify-between text-[9px] text-gray-500 mt-1 px-1">
              <span>等倍</span>
              <span>2x</span>
              <span>3x</span>
              <span>4x</span>
              <span>5x</span>
            </div>
          </div>

          <!-- Data Reset Section -->
          <div class="bg-gray-800/60 border border-gray-700/40 rounded-lg p-3">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined text-base text-red-400">delete_forever</span>
              <span class="text-xs font-bold text-gray-200">セーブデータリセット</span>
            </div>
            <p class="text-[10px] text-gray-500 mb-3 leading-relaxed">
              すべてのセーブデータ・キャッシュを削除し、初期状態に戻します。この操作は取り消せません。
            </p>
            <button id="settings-reset"
                    class="w-full py-2.5 rounded-lg text-xs font-bold
                           bg-red-900/40 border border-red-700/50 text-red-300
                           hover:bg-red-800/50 hover:border-red-600/60 hover:text-red-200
                           active:scale-[0.98] transition-all duration-150 cursor-pointer">
              <span class="material-symbols-outlined text-sm align-middle mr-1">warning</span>
              セーブデータを削除してリセット
            </button>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // ── Close button ──
    document.getElementById('settings-close').addEventListener('click', () => {
      overlay.remove();
    });

    // ── Close on backdrop click ──
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // ── Toggle Settings ──
    const toggleBattleStats = document.getElementById('setting-toggle-battle-stats');
    if (toggleBattleStats) {
      toggleBattleStats.addEventListener('change', (e) => {
        localStorage.setItem('hideBattleStats', !e.target.checked);
        window.dispatchEvent(new Event('settingsChanged'));
      });
    }

    const toggleBattleAnim = document.getElementById('setting-toggle-battle-anim');
    if (toggleBattleAnim) {
      toggleBattleAnim.addEventListener('change', (e) => {
        localStorage.setItem('disableBattleAnimations', e.target.checked);
        window.dispatchEvent(new Event('settingsChanged'));
      });
    }

    const speedSlider = document.getElementById('setting-speed-slider');
    const speedValue = document.getElementById('setting-speed-value');
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        speedValue.textContent = val + 'x';
        localStorage.setItem('autoBattleSpeed', val);
        window.dispatchEvent(new Event('settingsChanged'));
      });
    }

    window.addEventListener('settingsChanged', () => {
      const hideStats = localStorage.getItem('hideBattleStats') !== 'false';
      document.querySelectorAll('.battle-stats-container').forEach(el => {
        if (hideStats) {
          el.classList.add('hidden');
        } else {
          el.classList.remove('hidden');
        }
      });
    });

    // ── Reset button ──
    document.getElementById('settings-reset').addEventListener('click', () => {
      if (!window.confirm('本当にリセットしますか？')) return;
      this.performDataReset();
    });
  }

  /**
   * Delete all save data, clear caches, and hard reload.
   */
  async performDataReset() {
    try {
      // 1. Close DB connection
      if (GameDB.db) {
        GameDB.db.close();
        GameDB.db = null;
      }

      // 2. Delete IndexedDB
      await new Promise(resolve => setTimeout(resolve, 100)); // wait for close
      await new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase('rpg_game_db');
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => {
          console.warn('[Settings] DB delete blocked, proceeding...');
          resolve();
        };
      });
      console.log('[Settings] IndexedDB deleted.');

      // 3. Clear Cache API
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
        console.log('[Settings] Caches cleared.');
      }
      
      // Clear localStorage just in case
      localStorage.clear();

      // 4. Hard reload (drop hash to reset view)
      window.location.href = window.location.pathname;
    } catch (error) {
      console.error('[Settings] Reset failed:', error);
      alert('リセットに失敗しました。ページを手動でリロードしてください。');
      window.location.reload();
    }
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

// ─── Disable Global Drag & Drop ──────────────────────────
document.addEventListener('dragstart', (e) => e.preventDefault());
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());
