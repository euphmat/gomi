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
import { JOBS } from './jobs/index.js';

// ─── Page Imports ────────────────────────────────────────
import { renderStatusPage }  from './pages/status.js';
import { renderGuildPage }   from './pages/guild.js';
import { renderDungeonPage } from './pages/dungeon.js';
import { renderShopPage }    from './pages/shop.js';
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

      // ── SP Correction Logic (Global) ──
      const chars = await GameDB.getAllCharacters();
      for (const char of chars) {
        let spentSP = 0;
        if (char.jobSkills && char.jobId) {
          const skills = char.jobSkills[char.jobId];
          const job = JOBS[char.jobId];
          if (skills && job) {
            for (const [skillId, level] of Object.entries(skills)) {
              const skill = job.skills.find(s => s.id === skillId);
              if (!skill) continue;
              for (let i = 1; i <= level; i++) {
                const lConf = skill.levels.find(l => l.level === i);
                if (lConf && lConf.spCost) spentSP += lConf.spCost;
              }
            }
          }
        }
        const earnedSP = Math.max(0, (char.jobLevel || 1) - 1);
        const correctSP = earnedSP - spentSP;
        if (char.sp !== correctSP) {
          console.log(`[App] SP Correction for ${char.name}: ${char.sp} -> ${correctSP}`);
          char.sp = correctSP;
          await GameDB.putCharacter(char);
        }
      }

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
      <div class="fixed top-0 left-0 w-full h-[100dvh] flex flex-col bg-[#0b0b19]">
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
      .register('/shop',    renderShopPage)
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
      <div class="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl mx-3 w-full max-w-[calc(100vw-24px)]
                  shadow-2xl shadow-black/60 flex flex-col overflow-hidden
                  animate-[slide-up_0.25s_ease-out]"
           style="animation: slide-up 0.25s ease-out">

        <!-- Modal Header -->
        <div class="relative px-5 py-4 border-b border-gray-700/30 overflow-hidden">
          <!-- Header gradient accent -->
          <div class="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/8 to-cyan-600/10"></div>
          <div class="relative flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-700/80 to-gray-800/80 border border-gray-600/40
                          flex items-center justify-center shadow-lg">
                <span class="material-symbols-outlined text-lg text-gray-300" style="font-variation-settings: 'FILL' 1">settings</span>
              </div>
              <div>
                <span class="text-sm font-bold text-gray-100 tracking-wide">設定</span>
                <span class="text-[9px] text-gray-500 ml-2 font-mono bg-gray-800/60 px-1.5 py-0.5 rounded">v0035</span>
              </div>
            </div>
            <button id="settings-close"
                    class="w-9 h-9 flex items-center justify-center rounded-xl
                           text-gray-500 hover:text-gray-200 bg-gray-800/40 hover:bg-gray-700/60
                           border border-transparent hover:border-gray-600/40
                           transition-all duration-200 cursor-pointer">
              <span class="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        <!-- Modal Body -->
        <div class="px-4 py-4 flex flex-col gap-2.5 max-h-[75vh] overflow-y-auto">

          <!-- ═══ GAMEPLAY SETTINGS GROUP ═══ -->
          <div class="text-[9px] text-gray-500 uppercase tracking-[0.15em] font-bold px-1 flex items-center gap-2">
            <span class="material-symbols-outlined text-xs text-gray-600">tune</span>
            ゲームプレイ
            <div class="flex-1 h-px bg-gradient-to-r from-gray-700/40 to-transparent"></div>
          </div>

          <!-- Battle Stats Toggle -->
          <div class="settings-section bg-gray-800/40 border border-gray-700/30 rounded-xl p-3.5
                      hover:bg-gray-800/55 hover:border-gray-600/40 transition-all duration-200">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20
                            flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-base text-blue-400">visibility</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold text-gray-200 leading-tight">ステータス表示</div>
                  <div class="text-[9px] text-gray-500 mt-0.5 leading-relaxed">バトル中のATK, DEF等のステータスを表示</div>
                </div>
              </div>
              <div id="toggle-battle-stats"
                   class="setting-toggle ${localStorage.getItem('hideBattleStats') === 'false' ? 'active' : ''}"
                   style="--toggle-color: #3b82f6; --toggle-glow: rgba(59,130,246,0.4)"></div>
            </div>
          </div>

          <!-- Battle Animation Toggle -->
          <div class="settings-section bg-gray-800/40 border border-gray-700/30 rounded-xl p-3.5
                      hover:bg-gray-800/55 hover:border-gray-600/40 transition-all duration-200">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/20
                            flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-base text-purple-400">animation</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold text-gray-200 leading-tight">アニメーション非表示</div>
                  <div class="text-[9px] text-gray-500 mt-0.5 leading-relaxed">演出を省略して処理を軽量化</div>
                </div>
              </div>
              <div id="toggle-battle-anim"
                   class="setting-toggle ${localStorage.getItem('disableBattleAnimations') === 'true' ? 'active' : ''}"
                   style="--toggle-color: #a855f7; --toggle-glow: rgba(168,85,247,0.4)"></div>
            </div>
          </div>

          <!-- Continue on Death Toggle -->
          <div class="settings-section bg-gray-800/40 border border-gray-700/30 rounded-xl p-3.5
                      hover:bg-gray-800/55 hover:border-gray-600/40 transition-all duration-200">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/20
                            flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-base text-rose-400">heart_broken</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold text-gray-200 leading-tight">周回中の死亡時の探索継続</div>
                  <div class="text-[9px] text-gray-500 mt-0.5 leading-relaxed">全滅時に宿屋費用を払い自動で再突入</div>
                </div>
              </div>
              <div id="toggle-continue-on-death"
                   class="setting-toggle ${localStorage.getItem('continueOnDeath') === 'true' ? 'active' : ''}"
                   style="--toggle-color: #f43f5e; --toggle-glow: rgba(244,63,94,0.4)"></div>
            </div>
          </div>

          <!-- Auto Battle Speed -->
          <div class="settings-section bg-gray-800/40 border border-gray-700/30 rounded-xl p-3.5
                      hover:bg-gray-800/55 hover:border-gray-600/40 transition-all duration-200">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 rounded-lg bg-yellow-500/15 border border-yellow-500/20
                          flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-base text-yellow-400">speed</span>
              </div>
              <div class="flex-1">
                <div class="text-xs font-bold text-gray-200 leading-tight">自動戦闘速度</div>
                <div class="text-[9px] text-gray-500 mt-0.5">戦闘のテンポを調整</div>
              </div>
              <div class="bg-yellow-500/15 border border-yellow-500/25 rounded-lg px-2.5 py-1
                          flex items-center gap-0.5">
                <span id="setting-speed-value" class="text-sm font-bold text-yellow-400">${localStorage.getItem('autoBattleSpeed') || 1}</span>
                <span class="text-[9px] text-yellow-500/70 font-bold">×</span>
              </div>
            </div>
            <div class="px-1">
              <input type="range" id="setting-speed-slider"
                     min="1" max="5" step="1"
                     value="${localStorage.getItem('autoBattleSpeed') || 1}"
                     class="setting-slider">
              <div class="flex justify-between mt-2.5 px-0.5">
                ${[1,2,3,4,5].map(v => `
                  <div class="speed-step ${parseInt(localStorage.getItem('autoBattleSpeed') || 1) >= v ? 'active' : ''}"
                       data-speed="${v}">
                    <span class="text-[9px] ${parseInt(localStorage.getItem('autoBattleSpeed') || 1) >= v ? 'text-yellow-400 font-bold' : 'text-gray-600'} transition-colors">${v === 1 ? '等倍' : v + 'x'}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- ═══ DATA MANAGEMENT GROUP ═══ -->
          <div class="text-[9px] text-gray-500 uppercase tracking-[0.15em] font-bold px-1 mt-2 flex items-center gap-2">
            <span class="material-symbols-outlined text-xs text-gray-600">database</span>
            データ管理
            <div class="flex-1 h-px bg-gradient-to-r from-gray-700/40 to-transparent"></div>
          </div>

          <!-- Save Data Management -->
          <div class="settings-section bg-gray-800/40 border border-gray-700/30 rounded-xl p-3.5
                      hover:bg-gray-800/55 hover:border-gray-600/40 transition-all duration-200">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20
                          flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-base text-emerald-400">save</span>
              </div>
              <div>
                <div class="text-xs font-bold text-gray-200 leading-tight">セーブデータ管理</div>
                <div class="text-[9px] text-gray-500 mt-0.5 leading-relaxed">データのエクスポート・インポート</div>
              </div>
            </div>
            <div class="flex gap-2">
              <button id="settings-export"
                      class="settings-action-btn flex-1 py-2.5 rounded-xl text-xs font-bold
                             bg-gradient-to-b from-gray-700/80 to-gray-800/80
                             border border-gray-600/40 text-gray-300
                             hover:text-white hover:border-gray-500/50
                             cursor-pointer flex items-center justify-center gap-1.5">
                <span class="material-symbols-outlined text-sm">file_upload</span>
                エクスポート
              </button>
              <button id="settings-import"
                      class="settings-action-btn flex-1 py-2.5 rounded-xl text-xs font-bold
                             bg-gradient-to-b from-gray-700/80 to-gray-800/80
                             border border-gray-600/40 text-gray-300
                             hover:text-white hover:border-gray-500/50
                             cursor-pointer flex items-center justify-center gap-1.5">
                <span class="material-symbols-outlined text-sm">file_download</span>
                インポート
              </button>
            </div>
          </div>

          <!-- Data Reset -->
          <div class="settings-section bg-red-950/20 border border-red-900/25 rounded-xl p-3.5
                      hover:bg-red-950/30 hover:border-red-800/30 transition-all duration-200">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/20
                          flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-base text-red-400">delete_forever</span>
              </div>
              <div>
                <div class="text-xs font-bold text-red-300/90 leading-tight">データリセット</div>
                <div class="text-[9px] text-red-400/50 mt-0.5 leading-relaxed">全データを削除して初期状態に戻す（取り消し不可）</div>
              </div>
            </div>
            <button id="settings-reset"
                    class="settings-action-btn w-full py-2.5 rounded-xl text-xs font-bold
                           bg-gradient-to-b from-red-900/50 to-red-950/60
                           border border-red-700/40 text-red-300/90
                           hover:border-red-600/50 hover:text-red-200
                           cursor-pointer flex items-center justify-center gap-1.5">
              <span class="material-symbols-outlined text-sm">warning</span>
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

    // ── Toggle Settings (Custom Div Toggles) ──
    const toggleBattleStats = document.getElementById('toggle-battle-stats');
    if (toggleBattleStats) {
      toggleBattleStats.addEventListener('click', () => {
        const isActive = toggleBattleStats.classList.toggle('active');
        localStorage.setItem('hideBattleStats', !isActive);
        window.dispatchEvent(new Event('settingsChanged'));
      });
    }

    const toggleBattleAnim = document.getElementById('toggle-battle-anim');
    if (toggleBattleAnim) {
      toggleBattleAnim.addEventListener('click', () => {
        const isActive = toggleBattleAnim.classList.toggle('active');
        localStorage.setItem('disableBattleAnimations', isActive);
        window.dispatchEvent(new Event('settingsChanged'));
      });
    }

    const toggleContinueOnDeath = document.getElementById('toggle-continue-on-death');
    if (toggleContinueOnDeath) {
      toggleContinueOnDeath.addEventListener('click', () => {
        const isActive = toggleContinueOnDeath.classList.toggle('active');
        localStorage.setItem('continueOnDeath', isActive);
      });
    }

    // ── Speed Slider & Step Dots ──
    const speedSlider = document.getElementById('setting-speed-slider');
    const speedValue = document.getElementById('setting-speed-value');
    const speedSteps = overlay.querySelectorAll('.speed-step');

    const updateSpeedUI = (val) => {
      speedValue.textContent = val;
      speedSteps.forEach(step => {
        const stepVal = parseInt(step.dataset.speed);
        const label = step.querySelector('span');
        if (stepVal <= val) {
          step.classList.add('active');
          label.classList.remove('text-gray-600');
          label.classList.add('text-yellow-400', 'font-bold');
        } else {
          step.classList.remove('active');
          label.classList.remove('text-yellow-400', 'font-bold');
          label.classList.add('text-gray-600');
        }
      });
    };

    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        updateSpeedUI(val);
        localStorage.setItem('autoBattleSpeed', val);
        window.dispatchEvent(new Event('settingsChanged'));
      });
    }

    // Allow clicking on speed step dots to set speed
    speedSteps.forEach(step => {
      step.addEventListener('click', () => {
        const val = parseInt(step.dataset.speed);
        speedSlider.value = val;
        updateSpeedUI(val);
        localStorage.setItem('autoBattleSpeed', val);
        window.dispatchEvent(new Event('settingsChanged'));
      });
    });

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

    // ── Export / Import buttons ──
    const btnExport = document.getElementById('settings-export');
    if (btnExport) {
      btnExport.addEventListener('click', async () => {
        try {
          const exportStr = await GameDB.exportData();
          this.showDataModal('エクスポート', '以下のテキストをコピーして保存してください。', exportStr, true);
        } catch (e) {
          console.error(e);
          alert('エクスポートに失敗しました。');
        }
      });
    }

    const btnImport = document.getElementById('settings-import');
    if (btnImport) {
      btnImport.addEventListener('click', () => {
        this.showDataModal('インポート', 'セーブデータのテキストを貼り付けて、「復元」を押してください。', '', false, async (inputStr) => {
          if (!inputStr) return;
          const success = await GameDB.importData(inputStr.trim());
          if (success) {
            alert('セーブデータの復元が完了しました。ページをリロードします。');
            window.location.reload();
          } else {
            alert('セーブデータの復元に失敗しました。テキストが正しくない可能性があります。');
          }
        });
      });
    }

    // ── Reset button ──
    document.getElementById('settings-reset').addEventListener('click', () => {
      if (!window.confirm('本当にリセットしますか？')) return;
      this.performDataReset();
    });
  }

  /**
   * Show a sub-modal for viewing/copying exported data or pasting import data.
   */
  showDataModal(title, desc, initialValue, isExport, onConfirm = null) {
    const overlay = document.createElement('div');
    overlay.className = `
      fixed inset-0 z-[60] flex items-center justify-center
      bg-black/80 backdrop-blur-sm
      animate-[fade-in_0.15s_ease-out]
    `;
    
    overlay.innerHTML = `
      <div class="bg-gray-900 border border-gray-700 rounded-xl mx-3 w-full max-w-sm flex flex-col overflow-hidden shadow-2xl">
        <div class="px-4 py-3 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
          <span class="text-sm font-bold text-gray-200">${title}</span>
          <button id="data-close" class="text-gray-400 hover:text-white cursor-pointer"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="p-4 flex flex-col gap-3">
          <p class="text-[10px] text-gray-400 leading-relaxed">${desc}</p>
          <textarea id="data-textarea"
                    class="w-full h-32 bg-gray-950 border border-gray-700 rounded p-2 text-[10px] text-gray-300 font-mono outline-none focus:border-blue-500 resize-none"
                    ${isExport ? 'readonly' : ''}
                    placeholder="${isExport ? '' : 'ここにテキストを貼り付け'}">${initialValue}</textarea>
          
          <div class="flex gap-2 mt-2">
            ${isExport ? `
              <button id="data-copy" class="flex-1 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded text-xs font-bold transition-colors cursor-pointer">コピー</button>
              <button id="data-share" class="w-10 flex-none py-2 bg-gray-700/80 hover:bg-gray-600 text-white rounded transition-colors cursor-pointer flex items-center justify-center" title="共有">
                <span class="material-symbols-outlined text-[16px]">share</span>
              </button>
            ` : `
              <button id="data-confirm" class="flex-1 py-2 bg-green-600/80 hover:bg-green-600 text-white rounded text-xs font-bold transition-colors cursor-pointer">復元</button>
            `}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('data-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    if (isExport) {
      document.getElementById('data-copy').addEventListener('click', async () => {
        const textarea = document.getElementById('data-textarea');
        textarea.select();
        try {
          await navigator.clipboard.writeText(textarea.value);
          const btn = document.getElementById('data-copy');
          btn.textContent = 'コピーしました！';
          btn.classList.replace('bg-blue-600/80', 'bg-green-600/80');
          setTimeout(() => {
            btn.textContent = 'コピー';
            btn.classList.replace('bg-green-600/80', 'bg-blue-600/80');
          }, 2000);
        } catch (err) {
          document.execCommand('copy');
          alert('コピーしました。');
        }
      });
      document.getElementById('data-share').addEventListener('click', async () => {
        const textarea = document.getElementById('data-textarea');
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'セーブデータ',
              text: textarea.value
            });
          } catch (err) {
            console.error('Share failed:', err);
          }
        } else {
          alert('お使いの環境は共有機能に対応していません。');
        }
      });
    } else {
      document.getElementById('data-confirm').addEventListener('click', () => {
        const val = document.getElementById('data-textarea').value;
        if (onConfirm) onConfirm(val);
      });
    }
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
