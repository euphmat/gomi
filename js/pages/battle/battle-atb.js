/**
 * battle-atb.js
 * ATBループ管理 (startAtbLoop, stopAtbLoop)
 */

export const atbMethods = {
  stopAtbLoop(invalidateInit = true, removeRouteHandler = true) {
    this.isStopped = true;
    if (invalidateInit) {
      this._initGeneration = (this._initGeneration || 0) + 1;
    }
    this._updateEntitiesPending = false;
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
    if (this.autoNextTimer) {
      clearTimeout(this.autoNextTimer);
      this.autoNextTimer = null;
    }
    if (this.autoRetryTimer) {
      clearInterval(this.autoRetryTimer);
      this.autoRetryTimer = null;
    }
    if (this.atbWorker) {
      this.atbWorker.terminate();
      this.atbWorker = null;
    }
    if (this.atbWorkerUrl) {
      URL.revokeObjectURL(this.atbWorkerUrl);
      this.atbWorkerUrl = null;
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
    this._cachedDisableAnim = localStorage.getItem('disableBattleAnimations') === 'true';
    this._cachedBattleSpeed = parseInt(localStorage.getItem('autoBattleSpeed') || '1', 10);
    this._settingsHandler = () => {
      this._cachedDisableAnim = localStorage.getItem('disableBattleAnimations') === 'true';
      this._cachedBattleSpeed = parseInt(localStorage.getItem('autoBattleSpeed') || '1', 10);
    };
    window.addEventListener('settingsChanged', this._settingsHandler);
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

    if (this.atbWorker) {
      this.atbWorker.terminate();
    }
    if (this.atbWorkerUrl) {
      URL.revokeObjectURL(this.atbWorkerUrl);
      this.atbWorkerUrl = null;
    }

    // speedMultが高い場合はtick間隔を極限まで短くする
    let tickInterval = 100;
    if (this.speedMult >= 50) tickInterval = 5;
    else if (this.speedMult >= 20) tickInterval = 15;
    else if (this.speedMult >= 10) tickInterval = 30;
    else if (this.speedMult >= 5) tickInterval = 50;

    const workerCode = `
      let timer = null;
      let interval = ${tickInterval};
      self.onmessage = function(e) {
        if (e.data === 'stop') {
          clearInterval(timer);
          timer = null;
        } else if (e.data === 'start') {
          if (timer) clearInterval(timer);
          timer = setInterval(() => self.postMessage('tick'), interval);
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.atbWorkerUrl = URL.createObjectURL(blob);
    this.atbWorker = new Worker(this.atbWorkerUrl);

    this.atbWorker.onmessage = () => {
      if (this.isStopped) return;

      const disableAnim = this._cachedDisableAnim;
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
      const MAX_LOOPS = disableAnim ? 50 : (this.speedMult >= 10 ? 20 : (this.speedMult >= 5 ? 5 : 1));
      
      while (!nextActor && loops < MAX_LOOPS) {
        loops++;
        let candidates = [];
        
        this.party.forEach(p => {
          if (p.isDead) return;
          const baseSpd = (p.stats && typeof p.stats.spd === 'number' && !isNaN(p.stats.spd)) ? p.stats.spd : 1;
          const spd = Math.floor(baseSpd * (1 + (p._passiveSpdBuffPercent || 0) / 100));
          const speedRatio = spd / avgSpd;
          p.atb += speedRatio * BASE_TICK_RATE * this.speedMult;
          if (p.atb >= 1000) {
            candidates.push({ type: 'party', entity: p, atb: p.atb });
          }
          
          if (!document.hidden && loops === 1) { // 描画更新は最初のループのみ
            const atbEl = this.atbElements[p.elementId];
            if(atbEl) {
               if (disableAnim || this.speedMult >= 5) {
                 if (atbEl.style.opacity !== '0') atbEl.style.opacity = '0';
               } else {
                 if (atbEl.style.opacity !== '1') atbEl.style.opacity = '1';
                 atbEl.style.transform = `scaleX(${Math.min(1000, p.atb) / 1000})`;
               }
            }
          }
        });
        
        this.enemies.forEach(e => {
          if (e.isDead) return;
          const baseSpd = (e.stats && typeof e.stats.spd === 'number' && !isNaN(e.stats.spd)) ? e.stats.spd : 1;
          const spd = Math.floor(baseSpd * (1 + (e._passiveSpdBuffPercent || 0) / 100));
          const speedRatio = spd / avgSpd;
          e.atb += speedRatio * BASE_TICK_RATE * this.speedMult;
          if (e.atb >= 1000) {
            candidates.push({ type: 'enemy', entity: e, atb: e.atb });
          }

          if (!document.hidden && loops === 1) {
            const atbEl = this.atbElements[e.elementId];
            if(atbEl) {
               if (disableAnim || this.speedMult >= 5) {
                 if (atbEl.style.opacity !== '0') atbEl.style.opacity = '0';
               } else {
                 if (atbEl.style.opacity !== '1') atbEl.style.opacity = '1';
                 atbEl.style.transform = `scaleX(${Math.min(1000, e.atb) / 1000})`;
               }
            }
          }
        });
        
        if (candidates.length > 0) {
          candidates.sort((a, b) => b.atb - a.atb);
          nextActor = candidates[0];
          // 待機中のキャラクターのATBを1000に制限すると、
          // 高速戦闘時に1tickで1000以上稼ぐ高速キャラクターが無限に割り込んでしまうため制限を撤廃
        }
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
              if (triggered && !document.hidden) {
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
          
          const enemyDelay = 500 / this.speedMult;
          const executeEnemy = () => {
            if (this.activeEnemy !== nextActor.entity) return;
            this.executeEnemyTurn(nextActor.entity);
          };

          if (this.speedMult >= 5) {
            executeEnemy();
          } else {
            this._scheduleBattleTimeout(executeEnemy, enemyDelay);
          }
        }
      }
    };

    this.atbWorker.postMessage('start');

    // Stop/start worker when page visibility changes to save CPU in background
    this._visibilityHandler = () => {
      if (document.hidden) {
        this.atbWorker?.postMessage('stop');
      } else {
        this.atbWorker?.postMessage('start');
        this.cacheDOMElements();
        this.renderEntities();
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);

  }
};
