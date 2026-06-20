/**
 * battle-atb.js
 * ATBループ管理 (startAtbLoop, stopAtbLoop)
 */

export const atbMethods = {
  stopAtbLoop() {
    this.isStopped = true;
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
    if (this._routeChangeHandler) {
      window.removeEventListener('hashchange', this._routeChangeHandler);
      this._routeChangeHandler = null;
    }
    if (this._settingsHandler) {
      window.removeEventListener('settingsChanged', this._settingsHandler);
      this._settingsHandler = null;
    }
  },

  startAtbLoop() {
    this.isStopped = false;
    // Cache localStorage reads to avoid I/O on every tick
    this._cachedDisableAnim = localStorage.getItem('disableBattleAnimations') === 'true';
    this._settingsHandler = () => {
      this._cachedDisableAnim = localStorage.getItem('disableBattleAnimations') === 'true';
    };
    window.addEventListener('settingsChanged', this._settingsHandler);
    let totalSpd = 0;
    let entityCount = 0;
    this.party.forEach(p => { 
      const spd = (p.stats && typeof p.stats.spd === 'number' && !isNaN(p.stats.spd)) ? p.stats.spd : 1;
      totalSpd += spd; 
      entityCount++; 
    });
    this.enemies.forEach(e => { 
      const spd = (e.stats && typeof e.stats.spd === 'number' && !isNaN(e.stats.spd)) ? e.stats.spd : 1;
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

    const workerCode = `
      let timer = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (timer) clearInterval(timer);
          timer = setInterval(() => self.postMessage('tick'), 100);
        } else if (e.data === 'stop') {
          clearInterval(timer);
          timer = null;
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
      
      let nextActor = null;
      
      this.party.forEach(p => {
        if (p.isDead) return;
        const spd = (p.stats && typeof p.stats.spd === 'number' && !isNaN(p.stats.spd)) ? p.stats.spd : 1;
        const speedRatio = spd / avgSpd;
        p.atb += speedRatio * BASE_TICK_RATE * this.speedMult;
        if (p.atb >= 1000) {
          p.atb = 1000;
          if (!nextActor) nextActor = { type: 'party', entity: p };
        }
        
        if (!document.hidden) {
          const atbEl = this.atbElements[p.elementId];
          if(atbEl) {
             if (disableAnim) {
               if (atbEl.style.opacity !== '0') atbEl.style.opacity = '0';
             } else {
               if (atbEl.style.opacity !== '1') atbEl.style.opacity = '1';
               atbEl.style.transform = `scaleX(${p.atb / 1000})`;
             }
          }
        }
      });
      
      this.enemies.forEach(e => {
        if (e.isDead) return;
        const spd = (e.stats && typeof e.stats.spd === 'number' && !isNaN(e.stats.spd)) ? e.stats.spd : 1;
        const speedRatio = spd / avgSpd;
        e.atb += speedRatio * BASE_TICK_RATE * this.speedMult;
        if (e.atb >= 1000) {
          e.atb = 1000;
          if (!nextActor) nextActor = { type: 'enemy', entity: e };
        }

        if (!document.hidden) {
          const atbEl = this.atbElements[e.elementId];
          if(atbEl) {
             if (disableAnim) {
               if (atbEl.style.opacity !== '0') atbEl.style.opacity = '0';
             } else {
               if (atbEl.style.opacity !== '1') atbEl.style.opacity = '1';
               atbEl.style.transform = `scaleX(${e.atb / 1000})`;
             }
          }
        }
      });

      if (nextActor) {
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
          setTimeout(() => {
            if (this.activeEnemy !== nextActor.entity) return;
            this.executeEnemyTurn(nextActor.entity);
          }, 500 / this.speedMult);
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

    this._routeChangeHandler = () => {
      if (window.location.hash !== '#/battle') {
        this.stopAtbLoop();
      }
    };
    window.addEventListener('hashchange', this._routeChangeHandler);
  }
};
