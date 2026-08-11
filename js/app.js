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
import { syncMineOfflineProgress } from './data/mine-manager.js';
import { loadTreasureLevels } from './data/treasure-manager.js';
import { SpecialQuestManager } from './data/special-quest-manager.js';
import { DailyLoginManager } from './data/daily-login-manager.js';
import { areGameNotificationsEnabled, initGameNotificationSound, setGameNotificationsEnabled } from './utils/game-notifications.js';
import { APP_VERSION } from './definitions/update-log.js';
import { checkForAvailableUpdate, showUpdateLogModal } from './components/update-log-modal.js';
import { initQuestHeaderBadge, showQuestModal } from './components/quest-modal.js';
import { activateScreenLock, initScreenLock } from './utils/screen-lock.js';
import { initTouchFeedback } from './utils/touch-feedback.js';
import { areSoundEffectsEnabled, initSoundEffects, setSoundEffectsEnabled } from './utils/sound-effects.js';
import { createCloudSavePanel, initCloudSavePanel } from './components/cloud-save-panel.js';
import { initDailyCloudSave } from './data/daily-cloud-save-manager.js';
import { clearLegacyJobSpBonus, getAvailableJobSP } from './data/job-progression.js';

// Clamp values left by older versions to the supported speed range.
localStorage.removeItem('devModeEnabled');
if (parseInt(localStorage.getItem('autoBattleSpeed') || 1) > 5) {
  localStorage.setItem('autoBattleSpeed', 5);
}

// ─── Page Imports ────────────────────────────────────────
import { renderStatusPage }  from './pages/status.js';
import { renderGuildPage }   from './pages/guild.js';
import { renderDungeonPage } from './pages/dungeon.js';
import { renderShopPage }    from './pages/shop.js';
import { renderQuestPage }   from './pages/quest.js';
import { renderBattlePage }  from './pages/battle/index.js';
import { renderFishingPage } from './pages/fishing.js';
import { renderMemoryGamePage } from './pages/memory-game.js';
import { renderSudokuPage }     from './pages/sudoku.js';
import { renderMinesweeperPage } from './pages/minesweeper.js';
import { QuestManager }      from './data/quest-manager.js';
import { settleLegacyFishFeed } from './data/fishing-manager.js';

class App {
  constructor() {
    this.appEl = document.getElementById('app');
    this.router = null;
    initTouchFeedback();
    initSoundEffects();
    initScreenLock();
    this.init();
  }

  async init() {
    let dailyLoginAwarded = false;

    // ── 0. Initialize Database ──
    try {
      await GameDB.open();
      console.log('[App] Database initialized.');

      // セーブ内の表示用バージョンも、現在実行中のアプリと同期する。
      await GameDB.setGameState('version', APP_VERSION);

      const dailyLogin = await DailyLoginManager.claim();
      dailyLoginAwarded = dailyLogin.awarded;
      if (dailyLoginAwarded) {
        console.log('[App] Daily login bonus awarded.');
      }

      await QuestManager.init();
      console.log('[App] QuestManager initialized.');

      // 常時発動する秘宝効果を、放置報酬などの計算より先に読み込む。
      await loadTreasureLevels(true);
      console.log('[App] Treasure effects initialized.');

      // アプリを閉じていた間の鉱山採掘を未回収Goldへ反映する。
      // 所持Goldへの加算は鉱山画面の回収ボタンでのみ行う。
      await syncMineOfflineProgress();
      console.log('[App] Mine offline progress synchronized.');

      await settleLegacyFishFeed();
      console.log('[App] Legacy ranch fish feed settled.');

      await SpecialQuestManager.init();
      console.log('[App] SpecialQuestManager initialized.');

      // ── SP Correction Logic (Global) ──
      const chars = await GameDB.getAllCharacters();
      for (const char of chars) {
        let needSave = clearLegacyJobSpBonus(char);
        const correctSP = getAvailableJobSP(char, JOBS[char.jobId], char.jobLevel);
        if (char.sp !== correctSP) {
          console.log(`[App] SP Correction for ${char.name}: ${char.sp} -> ${correctSP}`);
          char.sp = correctSP;
          needSave = true;
        }
        if (needSave) await GameDB.putCharacter(char);
      }

      // ── Ranch Level 0 Correction Logic (Global) ──
      const ranchData = await GameDB.getGameState('ranch_data');
      if (ranchData) {
        let ranchChanged = false;
        for (const dId of Object.keys(ranchData)) {
          for (const mId of Object.keys(ranchData[dId])) {
            if (ranchData[dId][mId] && ranchData[dId][mId].level === 0) {
              ranchData[dId][mId].level = 1;
              ranchChanged = true;
            }
          }
        }
        if (ranchChanged) {
          console.log('[App] Ranch Level Correction applied.');
          await GameDB.setGameState('ranch_data', ranchData);
        }
      }

    } catch (error) {
      console.error('[App] Failed to open database:', error);
    }

    // ── 1. Read game state from DB ──
    let gameState = { location: 'ホームタウン', version: APP_VERSION, gold: 0, prism: 0 };
    try {
      if (GameDB.db) {
        gameState.location = 'ホームタウン';
        gameState.version  = APP_VERSION;
        gameState.gold     = await GameDB.getGameState('gold')      ?? 0;
        gameState.prism    = await GameDB.getGameState('prism')     ?? 0;
      }
    } catch (e) {
      console.warn('[App] Could not read game state, using defaults.', e);
    }

    // ── 2. Render the app shell ──
    this.appEl.innerHTML = `
      <div class="flex h-full min-h-0 w-full flex-col bg-[#0b0b19]">
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
      .register('/quest',   renderQuestPage)
      .register('/battle',  renderBattlePage)
      .register('/fishing', renderFishingPage)
      .register('/memory-game', renderMemoryGamePage)
      .register('/sudoku', renderSudokuPage)
      .register('/minesweeper', renderMinesweeperPage);

    // ── 5. Navigation ──
    this.renderNav();
    window.addEventListener('routechange', (e) => {
      this.renderNav();
      
      // Reset location text if we leave battle
      if (window.location.hash !== '#/battle') {
        const headerLoc = document.getElementById('header-location');
        const headerLocName = document.getElementById('header-location-name');
        const headerLocFloor = document.getElementById('header-location-floor');
        if (headerLoc && headerLocName && headerLocFloor) {
          headerLocName.textContent = 'ホームタウン';
          headerLocFloor.textContent = '';
          headerLocFloor.classList.add('hidden');
          headerLoc.setAttribute('aria-label', '現在地: ホームタウン');
        }
      }
    });

    // ── 6. Header Buttons ──
    this.initHeaderButtons();

    // ── 7. Start ──
    this.router.start();

    // Firebaseの読み込みはゲーム起動をブロックしない。ログイン済みの場合のみ、
    // ローカル日付ごとの初回起動時に安全確認をしてクラウド保存する。
    initDailyCloudSave().catch(error => {
      console.warn('[App] Could not initialize daily cloud save.', error);
    });

    if (dailyLoginAwarded) {
      DailyLoginManager.showReward();
    }
  }

  /**
   * Bind the settings, Update log, and refresh controls in the global header.
   */
  initHeaderButtons() {
    initGameNotificationSound();
    initQuestHeaderBadge();

    const questBtn = document.getElementById('btn-quest');
    if (questBtn) {
      questBtn.addEventListener('click', () => showQuestModal());
    }

    const btn = document.getElementById('btn-setting');
    if (btn) {
      btn.addEventListener('click', () => this.showSettingsModal());
    }

    const updateLogBtn = document.getElementById('btn-update-log');
    if (updateLogBtn) {
      updateLogBtn.addEventListener('click', showUpdateLogModal);
    }

    const refreshBtn = document.getElementById('btn-hard-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.setAttribute('aria-busy', 'true');
        const icon = refreshBtn.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.textContent = 'progress_activity';
          icon.classList.add('animate-spin');
        }
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
        const updateUrl = new URL(window.location.href);
        updateUrl.searchParams.set('updatedAt', Date.now().toString());
        window.location.replace(updateUrl.toString());
      });

      const updateRefreshState = async () => {
        const result = await checkForAvailableUpdate();
        if (!refreshBtn.isConnected) return;
        refreshBtn.classList.toggle('is-update-available', result.available);
        refreshBtn.dataset.latestVersion = result.latestVersion;
        refreshBtn.setAttribute('aria-label', result.available ? `新しいUpdate v${result.latestVersion}を適用` : `最新版です。現在のバージョンはv${APP_VERSION}`);
      };
      updateRefreshState();
      window.setInterval(updateRefreshState, 5 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) updateRefreshState();
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
      <div class="settings-modal-card bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl mx-3 w-full max-w-sm max-h-[calc(100dvh-24px)]
                  shadow-2xl shadow-black/60 flex flex-col overflow-hidden
                  animate-[slide-up_0.25s_ease-out]"
           style="animation: slide-up 0.25s ease-out">

        <!-- Modal Header -->
        <div class="settings-modal-header relative px-4 py-2.5 border-b border-gray-700/30 overflow-hidden shrink-0">
          <!-- Header gradient accent -->
          <div class="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/8 to-cyan-600/10"></div>
          <div class="relative flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-700/80 to-gray-800/80 border border-gray-600/40
                          flex items-center justify-center shadow-lg">
                <span class="material-symbols-outlined text-base text-gray-300" style="font-variation-settings: 'FILL' 1">settings</span>
              </div>
              <div>
                <span class="text-sm font-bold text-gray-100 tracking-wide">設定</span>
              </div>
            </div>
            <button id="settings-close" type="button" aria-label="設定を閉じる"
                    class="w-8 h-8 flex items-center justify-center rounded-lg
                           text-gray-500 active:text-gray-200 bg-gray-800/40 active:bg-gray-700/60
                           border border-transparent active:border-gray-600/40
                           transition-all duration-200 cursor-pointer">
              <span class="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        <!-- Modal Body -->
        <div class="settings-modal-body px-3 py-3 flex min-h-0 flex-col gap-2 overflow-y-auto">

          <!-- Screen Lock -->
          <button id="setting-screen-lock-button" type="button"
                  class="settings-screen-lock settings-section w-full bg-emerald-950/30 border border-emerald-500/25 rounded-xl px-2.5 py-2 text-left
                         active:bg-emerald-900/35 active:border-emerald-400/40 active:scale-[0.99]
                         transition-all duration-200 cursor-pointer">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5 flex-1 min-w-0">
                <div class="settings-compact-icon bg-emerald-500/15 border border-emerald-500/20">
                  <span class="material-symbols-outlined text-base text-emerald-400">screen_lock_portrait</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold text-gray-100 leading-tight">自動ロック</div>
                  <div class="settings-row-description text-[9px] text-gray-400 mt-0.5 leading-relaxed">タップすると画面を暗くして誤操作を防止</div>
                </div>
              </div>
              <div class="flex items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/25 px-2 py-1
                          text-[9px] font-bold text-emerald-300 shrink-0">
                <span class="material-symbols-outlined text-sm">lock</span>
                ロック
              </div>
            </div>
          </button>

          <!-- ═══ GAMEPLAY SETTINGS GROUP ═══ -->
          <div class="settings-section-label text-[9px] text-gray-500 uppercase tracking-[0.15em] font-bold px-1 flex items-center gap-2">
            <span class="material-symbols-outlined text-xs text-gray-600">tune</span>
            ゲームプレイ
            <div class="flex-1 h-px bg-gradient-to-r from-gray-700/40 to-transparent"></div>
          </div>

          <div class="settings-section settings-group">

          <!-- Battle Stats Toggle -->
          <div id="setting-row-battle-stats" class="settings-compact-row cursor-pointer">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 flex-1 min-w-0">
                <div class="settings-compact-icon bg-blue-500/15 border border-blue-500/20">
                  <span class="material-symbols-outlined text-base text-blue-400">visibility</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold text-gray-200 leading-tight">ステータス表示</div>
                  <div class="settings-row-description text-[9px] text-gray-500 mt-0.5 leading-relaxed">バトル中のATK, DEF等のステータスを表示</div>
                </div>
              </div>
              <div id="toggle-battle-stats"
                   class="setting-toggle ${localStorage.getItem('hideBattleStats') === 'false' ? 'active' : ''}"
                   style="--toggle-color: #3b82f6; --toggle-glow: rgba(59,130,246,0.4)"></div>
            </div>
          </div>

          <!-- Battle Animation Toggle -->
          <div id="setting-row-battle-anim" class="settings-compact-row cursor-pointer">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 flex-1 min-w-0">
                <div class="settings-compact-icon bg-purple-500/15 border border-purple-500/20">
                  <span class="material-symbols-outlined text-base text-purple-400">animation</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold text-gray-200 leading-tight">アニメーション非表示</div>
                  <div class="settings-row-description text-[9px] text-gray-500 mt-0.5 leading-relaxed">演出を省略して処理を軽量化</div>
                </div>
              </div>
              <div id="toggle-battle-anim"
                   class="setting-toggle ${localStorage.getItem('disableBattleAnimations') === 'true' ? 'active' : ''}"
                   style="--toggle-color: #a855f7; --toggle-glow: rgba(168,85,247,0.4)"></div>
            </div>
          </div>

          <!-- Continue on Death Toggle -->
          <div id="setting-row-continue" class="settings-compact-row cursor-pointer">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 flex-1 min-w-0">
                <div class="settings-compact-icon bg-rose-500/15 border border-rose-500/20">
                  <span class="material-symbols-outlined text-base text-rose-400">heart_broken</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold text-gray-200 leading-tight">周回中の死亡時の探索継続</div>
                  <div class="settings-row-description text-[9px] text-gray-500 mt-0.5 leading-relaxed">全滅時に宿屋費用を払い自動で再突入</div>
                </div>
              </div>
              <div id="toggle-continue-on-death"
                   class="setting-toggle ${localStorage.getItem('continueOnDeath') === 'true' ? 'active' : ''}"
                   style="--toggle-color: #f43f5e; --toggle-glow: rgba(244,63,94,0.4)"></div>
            </div>
          </div>

          <!-- Event Notifications -->
          <div id="setting-row-notifications" class="settings-compact-row cursor-pointer">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 flex-1 min-w-0">
                <div class="settings-compact-icon bg-cyan-500/15 border border-cyan-500/20">
                  <span class="material-symbols-outlined text-base text-cyan-400">notifications</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold text-gray-200 leading-tight">イベント通知</div>
                  <div id="setting-notifications-help" class="settings-row-description text-[9px] text-gray-500 mt-0.5 leading-relaxed">捕獲・装備ドロップ・鉱山MAXを通知</div>
                </div>
              </div>
              <div id="toggle-notifications" class="setting-toggle ${areGameNotificationsEnabled() && 'Notification' in window && Notification.permission === 'granted' ? 'active' : ''}"
                   style="--toggle-color: #06b6d4; --toggle-glow: rgba(6,182,212,0.4)"></div>
            </div>
          </div>

          <!-- Sound Effects Toggle -->
          <div id="setting-row-sound-effects" data-sound="none" class="settings-compact-row cursor-pointer">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 flex-1 min-w-0">
                <div class="settings-compact-icon bg-orange-500/15 border border-orange-500/20">
                  <span class="material-symbols-outlined text-base text-orange-400">volume_up</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold text-gray-200 leading-tight">効果音</div>
                  <div class="settings-row-description text-[9px] text-gray-500 mt-0.5 leading-relaxed">ボタン操作・戦闘・釣りの効果音（初期設定はOFF）</div>
                </div>
              </div>
              <div id="toggle-sound-effects"
                   role="switch" aria-checked="${areSoundEffectsEnabled()}"
                   class="setting-toggle ${areSoundEffectsEnabled() ? 'active' : ''}"
                   style="--toggle-color: #f97316; --toggle-glow: rgba(249,115,22,0.4)"></div>
            </div>
          </div>

          </div>

          <!-- Auto Battle Speed -->
          <div class="settings-speed-panel settings-section bg-gray-800/40 border border-gray-700/30 rounded-xl px-2.5 py-2
                      active:bg-gray-800/55 active:border-gray-600/40 transition-all duration-200">
            <div class="flex items-center gap-2.5 mb-1.5">
              <div class="settings-compact-icon bg-yellow-500/15 border border-yellow-500/20">
                <span class="material-symbols-outlined text-base text-yellow-400">speed</span>
              </div>
              <div class="flex-1">
                <div class="text-xs font-bold text-gray-200 leading-tight">自動戦闘速度</div>
                <div class="settings-row-description text-[9px] text-gray-500 mt-0.5">戦闘のテンポを調整</div>
              </div>
              <div class="bg-yellow-500/15 border border-yellow-500/25 rounded-lg px-2 py-0.5
                          flex items-center gap-0.5">
                <span id="setting-speed-value" class="text-sm font-bold text-yellow-400">${localStorage.getItem('autoBattleSpeed') || 1}</span>
                <span class="text-[9px] text-yellow-500/70 font-bold">×</span>
              </div>
            </div>
            <div class="px-1 pb-0.5">
              ${(() => {
                const speeds = [1, 2, 3, 4, 5];
                const current = parseInt(localStorage.getItem('autoBattleSpeed') || 1);
                let idx = speeds.indexOf(current);
                if (idx === -1) idx = speeds.length - 1;

                return `
                  <input type="range" id="setting-speed-slider"
                         min="0" max="${speeds.length - 1}" step="1"
                         value="${idx}"
                         class="setting-slider"
                         data-speeds='${JSON.stringify(speeds)}'>
                  <div class="flex justify-between mt-1.5 px-0.5">
                    ${speeds.map((v, i) => `
                      <div class="speed-step ${current >= v ? 'active' : ''}"
                           data-speed="${v}" data-idx="${i}">
                        <span class="text-[9px] ${current >= v ? 'text-yellow-400 font-bold' : 'text-gray-600'} transition-colors">${v === 1 ? '等倍' : v + 'x'}</span>
                      </div>
                    `).join('')}
                  </div>
                `;
              })()}
            </div>
          </div>

          <!-- ═══ DATA MANAGEMENT GROUP ═══ -->
          <div class="settings-section-label text-[9px] text-gray-500 uppercase tracking-[0.15em] font-bold px-1 mt-0.5 flex items-center gap-2">
            <span class="material-symbols-outlined text-xs text-gray-600">database</span>
            データ管理
            <div class="flex-1 h-px bg-gradient-to-r from-gray-700/40 to-transparent"></div>
          </div>

          <div class="settings-section settings-group">

          <!-- Authenticated manual cloud save -->
          ${createCloudSavePanel()}

          <!-- Data Reset -->
          <div class="settings-compact-row bg-red-950/20">
            <div class="flex items-center gap-2">
              <div class="settings-compact-icon bg-red-500/15 border border-red-500/20">
                <span class="material-symbols-outlined text-base text-red-400">delete_forever</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-bold text-red-300/90 leading-tight">端末データリセット</div>
                <div class="text-[9px] text-red-400/50 mt-0.5 leading-tight">この端末のデータを削除（クラウドは維持）</div>
              </div>
              <button id="settings-reset" type="button" aria-label="セーブデータを削除してリセット"
                    class="settings-action-btn shrink-0 px-2.5 py-2 rounded-lg text-[9px] font-bold
                           bg-gradient-to-b from-red-900/50 to-red-950/60
                           border border-red-700/40 text-red-300/90
                           active:border-red-600/50 active:text-red-200
                           cursor-pointer flex items-center justify-center gap-1">
                <span class="material-symbols-outlined text-xs">warning</span>
                リセット
              </button>
            </div>
          </div>

          </div>

        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const disposeCloudSavePanel = initCloudSavePanel(overlay, {
      onRestored: () => {
        alert('クラウドセーブを復元しました。ページを再読み込みします。');
        window.location.reload();
      }
    });
    const closeSettings = () => {
      disposeCloudSavePanel();
      overlay.remove();
    };

    // ── Close button ──
    document.getElementById('settings-close').addEventListener('click', closeSettings);

    // ── Close on backdrop click ──
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSettings();
    });

    // ── Toggle Settings (Custom Div Toggles) ──
    const rowBattleStats = document.getElementById('setting-row-battle-stats');
    const toggleBattleStats = document.getElementById('toggle-battle-stats');
    if (rowBattleStats && toggleBattleStats) {
      rowBattleStats.addEventListener('click', () => {
        const isActive = toggleBattleStats.classList.toggle('active');
        localStorage.setItem('hideBattleStats', !isActive);
        window.dispatchEvent(new Event('settingsChanged'));
      });
    }

    const rowBattleAnim = document.getElementById('setting-row-battle-anim');
    const toggleBattleAnim = document.getElementById('toggle-battle-anim');
    if (rowBattleAnim && toggleBattleAnim) {
      rowBattleAnim.addEventListener('click', () => {
        const isActive = toggleBattleAnim.classList.toggle('active');
        localStorage.setItem('disableBattleAnimations', isActive);
        window.dispatchEvent(new Event('settingsChanged'));
      });
    }

    const rowContinue = document.getElementById('setting-row-continue');
    const toggleContinueOnDeath = document.getElementById('toggle-continue-on-death');
    if (rowContinue && toggleContinueOnDeath) {
      rowContinue.addEventListener('click', () => {
        const isActive = toggleContinueOnDeath.classList.toggle('active');
        localStorage.setItem('continueOnDeath', isActive);
      });
    }

    const rowNotifications = document.getElementById('setting-row-notifications');
    const toggleNotifications = document.getElementById('toggle-notifications');
    if (rowNotifications && toggleNotifications) {
      rowNotifications.addEventListener('click', async () => {
        const enabled = await setGameNotificationsEnabled(!areGameNotificationsEnabled());
        toggleNotifications.classList.toggle('active', enabled);
        const help = document.getElementById('setting-notifications-help');
        if (help && !enabled && 'Notification' in window && Notification.permission === 'denied') {
          help.textContent = 'ブラウザの設定から通知を許可してください';
          help.classList.add('text-rose-400');
        }
      });
    }

    document.getElementById('setting-screen-lock-button')?.addEventListener('click', activateScreenLock);

    const rowSoundEffects = document.getElementById('setting-row-sound-effects');
    const toggleSoundEffects = document.getElementById('toggle-sound-effects');
    if (rowSoundEffects && toggleSoundEffects) {
      rowSoundEffects.addEventListener('click', () => {
        const enabled = setSoundEffectsEnabled(!areSoundEffectsEnabled(), { preview: true });
        toggleSoundEffects.classList.toggle('active', enabled);
        toggleSoundEffects.setAttribute('aria-checked', String(enabled));
      });
    }

    // ── Speed Slider & Step Dots ──
    const speedSlider = document.getElementById('setting-speed-slider');
    const speedValue = document.getElementById('setting-speed-value');
    const speedSteps = overlay.querySelectorAll('.speed-step');
    let speedOptions = [1, 2, 3, 4, 5];
    if (speedSlider && speedSlider.dataset.speeds) {
      speedOptions = JSON.parse(speedSlider.dataset.speeds);
    }

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

    const applySpeedSetting = (val) => {
      updateSpeedUI(val);
      localStorage.setItem('autoBattleSpeed', val);
      window.dispatchEvent(new Event('settingsChanged'));
    };

    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        const idx = parseInt(e.target.value);
        const val = speedOptions[idx];
        applySpeedSetting(val);
      });
    }

    // Allow clicking on speed step dots to set speed
    speedSteps.forEach(step => {
      step.addEventListener('click', () => {
        const val = parseInt(step.dataset.speed);
        const idx = parseInt(step.dataset.idx);
        speedSlider.value = idx;
        applySpeedSetting(val);
      });
    });

    if (!window._battleStatsSettingsHandler) {
      window._battleStatsSettingsHandler = () => {
        const hideStats = localStorage.getItem('hideBattleStats') !== 'false';
        document.querySelectorAll('.battle-stats-container').forEach(el => {
          if (hideStats) {
            el.classList.add('hidden');
          } else {
            el.classList.remove('hidden');
          }
        });
      };
      window.addEventListener('settingsChanged', window._battleStatsSettingsHandler);
    }

    // ── Reset button ──
    document.getElementById('settings-reset').addEventListener('click', () => {
      if (!window.confirm('この端末のセーブデータをリセットしますか？クラウドセーブは削除されません。')) return;
      this.performDataReset();
    });
  }

  /**
   * Delete all save data, clear caches, and hard reload.
   */
  async performDataReset() {
    try {
      // 1. Close DB connection
      GameDB.close();

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
    const isBattle = this.router.getCurrentRoute() === '/battle';

    // 戦闘中は専用の「街に戻る」操作があるため、無効化された共通ナビを
    // 画面下に残さない。小さい端末でもコマンドと戦況表示に高さを使える。
    navContainer.classList.toggle('hidden', isBattle);
    document.documentElement.classList.toggle('battle-route', isBattle);
    if (isBattle) {
      navContainer.innerHTML = '';
      return;
    }

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
