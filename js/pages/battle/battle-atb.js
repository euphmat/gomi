/**
 * battle-atb.js
 * ATBループ管理 (startAtbLoop, stopAtbLoop)
 */

import { isScreenLocked } from '../../utils/screen-lock.js';

export const atbMethods = {
  stopAtbLoop(invalidateInit = true, removeRouteHandler = true) {
    this.isStopped = true;
    if (invalidateInit) {
      this._initGeneration = (this._initGeneration || 0) + 1;
    }
    this._updateEntitiesPending = false;
    if (this._entityUpdateDelayTimer != null) {
      clearTimeout(this._entityUpdateDelayTimer);
      this._entityUpdateDelayTimer = null;
    }
    if (this._entityUpdateFrame != null) {
      cancelAnimationFrame(this._entityUpdateFrame);
      this._entityUpdateFrame = null;
    }
    this._lastEntityUpdateAt = 0;
    if (this.elements?.tabContent) {
      if (this.elements.tabContent._petSyncTimer) {
        clearInterval(this.elements.tabContent._petSyncTimer);
        this.elements.tabContent._petSyncTimer = null;
      }
      if (this.elements.tabContent._medalSyncTimer) {
        clearInterval(this.elements.tabContent._medalSyncTimer);
        this.elements.tabContent._medalSyncTimer = null;
      }
    }
    if (this._pendingTimers) {
      this._pendingTimers.forEach(id => clearTimeout(id));
      this._pendingTimers = [];
    }
    if (this._pendingVisibilityHandlers) {
      this._pendingVisibilityHandlers.forEach(handler => {
        document.removeEventListener('visibilitychange', handler);
      });
      this._pendingVisibilityHandlers = [];
    }
    if (this.autoNextTimer) {
      clearTimeout(this.autoNextTimer);
      this.autoNextTimer = null;
    }
    if (this.autoRetryTimer) {
      clearTimeout(this.autoRetryTimer);
      this.autoRetryTimer = null;
    }
    if (this.atbLoop) {
      clearInterval(this.atbLoop);
      this.atbLoop = null;
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
    if (removeRouteHandler && this._routeChangeHandler) {
      window.removeEventListener('hashchange', this._routeChangeHandler);
      this._routeChangeHandler = null;
    }
    if (this._settingsHandler) {
      window.removeEventListener('settingsChanged', this._settingsHandler);
      this._settingsHandler = null;
    }
    if (this._screenLockHandler) {
      document.removeEventListener('screenlockchange', this._screenLockHandler);
      this._screenLockHandler = null;
    }
    // Clean up effects layer children (sparkle particles etc.)
    const effectsLayer = document.getElementById('battle-effects-layer');
    if (effectsLayer) effectsLayer.innerHTML = '';
  },

  startAtbLoop() {
    // Guard every restart, including automatic floor/dungeon loops, against a
    // route change that happened during asynchronous battle initialization.
    if (!this.container?.isConnected || window.location.hash !== '#/battle') {
      this.stopAtbLoop();
      return;
    }
    this.isStopped = false;
    // Cache localStorage reads to avoid I/O on every tick
    this._cachedFastForwardAtb = localStorage.getItem('disableBattleAnimations') === 'true';
    this._cachedScreenLocked = isScreenLocked();
    this._cachedDisableAnim = this._cachedFastForwardAtb || this._cachedScreenLocked;
    this._cachedBattleSpeed = parseInt(localStorage.getItem('autoBattleSpeed') || '1', 10);
    this._settingsHandler = () => {
      this._cachedFastForwardAtb = localStorage.getItem('disableBattleAnimations') === 'true';
      this._cachedScreenLocked = isScreenLocked();
      this._cachedDisableAnim = this._cachedFastForwardAtb || this._cachedScreenLocked;
      this._cachedBattleSpeed = parseInt(localStorage.getItem('autoBattleSpeed') || '1', 10);
    };
    window.addEventListener('settingsChanged', this._settingsHandler);
    this._screenLockHandler = event => {
      this._cachedScreenLocked = Boolean(event.detail?.locked);
      this._cachedDisableAnim = this._cachedFastForwardAtb || this._cachedScreenLocked;
      if (this._cachedScreenLocked) {
        if (this.elements?.tabContent?._petSyncTimer) {
          clearInterval(this.elements.tabContent._petSyncTimer);
          this.elements.tabContent._petSyncTimer = null;
        }
        if (this.elements?.tabContent?._medalSyncTimer) {
          clearInterval(this.elements.tabContent._medalSyncTimer);
          this.elements.tabContent._medalSyncTimer = null;
        }
      } else if (!document.hidden && !this.isStopped && window.location.hash === '#/battle') {
        this.cacheDOMElements();
        this.renderEntities();
        this.renderTabContent();
      }
    };
    document.addEventListener('screenlockchange', this._screenLockHandler);
    let totalSpd = 0;
    let entityCount = 0;
    this.party.forEach(p => { 
      const baseSpd = (p.stats && typeof p.stats.spd === 'number' && !isNaN(p.stats.spd)) ? p.stats.spd : 1;
      const spd = Math.floor(baseSpd * (1 + (p._passiveSpdBuffPercent || 0) / 100));
      totalSpd += spd; 
      entityCount++; 
    });
    this.enemies.forEach(e => { 
      const baseSpd = (e.stats && typeof e.stats.spd === 'number' && !isNaN(e.stats.spd)) ? e.stats.spd : 1;
      const spd = Math.floor(baseSpd * (1 + (e._passiveSpdBuffPercent || 0) / 100));
      totalSpd += spd; 
      entityCount++; 
    });
    const avgSpd = entityCount > 0 ? (totalSpd / entityCount) : 1;
    
    // Doubled from 1000/70 to compensate for 100ms tick interval (was 50ms)
    const BASE_TICK_RATE = 1000 / 35;

    // Adjust the tick interval for the highest supported speed.
    let tickInterval = 100;
    if (this.speedMult >= 5) tickInterval = 50;

    // The old implementation created a dedicated Worker only to relay timer
    // messages. All combat work still ran on the main thread, so the Worker
    // added a thread, Blob URL and message dispatch without moving any work off
    // the UI thread. A modest main-thread interval has the same cadence and is
    // automatically paused below while the page is hidden.
    const tick = () => {
      if (this.isStopped || document.hidden) return;

      const disableAnim = this._cachedDisableAnim;
      const battleSpeed = this.speedMult;
      if (!document.hidden && !this.wasVisible) {
        this.renderEntities();
        if (this.currentTab === 'skill' || this.currentTab === 'item' || this.currentTab === 'info') {
          this.renderTabContent();
        }
      }
      this.wasVisible = !document.hidden;

      if (this.activeCharacter || this.activeEnemy) return;
      
      // Catch delayed deaths (e.g. from poison/curse or DOTs) after actions finish
      this.checkBattleEnd();
      if (this.isStopped) return;

      let nextActor = null;
      
      let loops = 0;
      // アニメ無効時はティックを待たずに次の行動者が決まるまで一気に時間を進める
      // The user animation setting intentionally enables ATB fast-forward.
      // Screen lock only suppresses presentation; treating it as fast-forward
      // multiplied both farming speed and CPU use while the display was off.
      const MAX_LOOPS = this._cachedFastForwardAtb ? 50 : (battleSpeed >= 5 ? 5 : 1);
      
      while (!nextActor && loops < MAX_LOOPS) {
        loops++;
        
        this.party.forEach(p => {
          if (p.isDead) return;
          const baseSpd = (p.stats && typeof p.stats.spd === 'number' && !isNaN(p.stats.spd)) ? p.stats.spd : 1;
          const spd = Math.floor(baseSpd * (1 + (p._passiveSpdBuffPercent || 0) / 100));
          const speedRatio = spd / avgSpd;
          p.atb += speedRatio * BASE_TICK_RATE * battleSpeed;
          if (p.atb >= 1000 && (!nextActor || p.atb > nextActor.atb)) {
            nextActor = { type: 'party', entity: p, atb: p.atb };
          }
          
          if (!document.hidden && !this._cachedScreenLocked && loops === 1) { // 描画更新は最初のループのみ
            const atbEl = this.atbElements[p.elementId];
            if(atbEl) {
               if (disableAnim || battleSpeed >= 5) {
                 if (atbEl.style.opacity !== '0') atbEl.style.opacity = '0';
               } else {
                 if (atbEl.style.opacity !== '1') atbEl.style.opacity = '1';
                 const nextTransform = `scaleX(${Math.min(1000, p.atb) / 1000})`;
                 if (atbEl.style.transform !== nextTransform) atbEl.style.transform = nextTransform;
               }
            }
          }
        });
        
        this.enemies.forEach(e => {
          if (e.isDead) return;
          const baseSpd = (e.stats && typeof e.stats.spd === 'number' && !isNaN(e.stats.spd)) ? e.stats.spd : 1;
          const spd = Math.floor(baseSpd * (1 + (e._passiveSpdBuffPercent || 0) / 100));
          const speedRatio = spd / avgSpd;
          e.atb += speedRatio * BASE_TICK_RATE * battleSpeed;
          if (e.atb >= 1000 && (!nextActor || e.atb > nextActor.atb)) {
            nextActor = { type: 'enemy', entity: e, atb: e.atb };
          }

          if (!document.hidden && !this._cachedScreenLocked && loops === 1) {
            const atbEl = this.atbElements[e.elementId];
            if(atbEl) {
               if (disableAnim || battleSpeed >= 5) {
                 if (atbEl.style.opacity !== '0') atbEl.style.opacity = '0';
               } else {
                 if (atbEl.style.opacity !== '1') atbEl.style.opacity = '1';
                 const nextTransform = `scaleX(${Math.min(1000, e.atb) / 1000})`;
                 if (atbEl.style.transform !== nextTransform) atbEl.style.transform = nextTransform;
               }
            }
          }
        });
        
        // 待機中のキャラクターのATBを1000に制限すると、高速戦闘時に
        // 1tickで1000以上稼ぐ高速キャラクターが無限に割り込むため制限しない。
      }

      if (nextActor) {
        if (this.decrementBuffTurns) {
          this.decrementBuffTurns(nextActor.entity);
        }

        if (this.processPreActionAilment(nextActor.entity)) {
          nextActor.entity.atb = 0;
          if (!document.hidden) this.renderEntities();
          this.checkBattleEnd();
          return;
        }

        if (nextActor.type === 'party') {
          if (nextActor.entity.activeAilment && nextActor.entity.activeAilment.type === 'confusion') {
            this.executeConfusionTurn(nextActor.entity, true);
            return;
          }
          this.activeCharacter = nextActor.entity;
          
          // --- Passive: Adhesive Substance (粘着物質) ---
          if (this.activeCharacter.jobSkills && !this.activeCharacter.isDead) {
            const adhesiveSkill = this._findSkill(this.activeCharacter, 'adhesive_substance');
            if (adhesiveSkill && adhesiveSkill.level > 0 && adhesiveSkill.levelConfig) {
              const spdDown = adhesiveSkill.levelConfig.spdDown || 10;
              let triggered = false;
              this.enemies.forEach(enemy => {
                if (!enemy.isDead && enemy.stats && enemy.stats.spd > 1) {
                  enemy.stats.spd = Math.max(1, Math.floor(enemy.stats.spd * (1 - spdDown / 100)));
                  triggered = true;
                }
              });
              if (triggered && !document.hidden && !this._cachedScreenLocked) {
                this.showActionName(this.activeCharacter.elementId, '粘着物質', 'text-amber-500', 'border-amber-600/50');
              }
            }
          }

          if (!document.hidden) this.renderEntities();
          if (this.isAutoBattle) {
            this.processAutoBattle(this.activeCharacter);
          }
        } else {
          if (nextActor.entity.activeAilment && nextActor.entity.activeAilment.type === 'confusion') {
            this.executeConfusionTurn(nextActor.entity, false);
            return;
          }
          this.activeEnemy = nextActor.entity;
          if (!document.hidden) this.updateEntities();
          
          const enemyDelay = 500 / battleSpeed;
          const executeEnemy = () => {
            if (this.activeEnemy !== nextActor.entity) return;
            this.executeEnemyTurn(nextActor.entity);
          };

          if (battleSpeed >= 5) {
            executeEnemy();
          } else {
            this._scheduleBattleTimeout(executeEnemy, enemyDelay);
          }
        }
      }
    };

    this.atbLoop = setInterval(tick, tickInterval);

    // Stop/start the simulation timer when page visibility changes to save CPU
    // in the background and avoid queued catch-up ticks on return.
    this._visibilityHandler = () => {
      if (document.hidden) {
        if (this.atbLoop) {
          clearInterval(this.atbLoop);
          this.atbLoop = null;
        }
      } else {
        if (!this.atbLoop && !this.isStopped) {
          this.atbLoop = setInterval(tick, tickInterval);
        }
        this.cacheDOMElements();
        this.renderEntities();
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);

  }
};
