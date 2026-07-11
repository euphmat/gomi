/**
 * battle-renderer.js
 * エンティティ描画・DOM更新 (renderEntities, updateEntities, cacheDOMElements)
 */

import { renderEnemyCardHtml, renderPartyCardHtml, getActiveStateIconsHTML } from './battle-ui.js';
import { formatNumber } from '../../utils/format.js';

export const rendererMethods = {
  renderEntities() {
    if (document.hidden) return;
    if (this.elements.enemyArea.children.length > 0) {
      this.updateEntities();
      return;
    }

    const N = this.enemies.filter(e => !e.isDead).length || 1;
    const cols = N;
    this.elements.enemyArea.style.setProperty('--enemy-cols', cols);

    this.elements.enemyArea.innerHTML = this.enemies.map(e => renderEnemyCardHtml(e, this.selectedEnemyTarget)).join('');

    if (this.elements.partyArea.children.length === 0) {
      this.elements.partyArea.innerHTML = this.party.map(p => renderPartyCardHtml(p, this.activeCharacter, this.isAutoBattle, this.selectedPartyMember)).join('');

      this.elements.partyArea.querySelectorAll('.party-card').forEach(el => {
        el.addEventListener('click', (e) => {
          const elementId = e.currentTarget.id;
          const p = this.party.find(char => char.elementId === elementId);
          if (p && !p.isDead) {
            if (this.isAutoBattle) {
              this.selectedPartyMember = p;
              this.currentTab = 'skill';
              this.updateTabStyles();
              this.renderTabContent();
            }
            this.updateEntities();
          }
        });
      });
    }

    this.updateCommandBlocker();

    this.renderTabContent();
    this.elements.enemyArea.querySelectorAll('.enemy-card').forEach(el => {
      el.addEventListener('click', (e) => {
        const uniqueId = e.currentTarget.dataset.id;
        const enemy = this.enemies.find(en => en.uniqueId === uniqueId);
        if (enemy && !enemy.isDead) {
          this.selectedEnemyTarget = enemy;
          this.infoTarget = { type: 'enemy', entity: enemy };
          this.renderEntities();
        }
      });
    });

    this.updateEntities();
    this.cacheDOMElements();
  },

  updateEntities() {
    if (document.hidden) return;
    if (this._updateEntitiesPending) return;
    this._updateEntitiesPending = true;

    // Auto battle can request several complete entity refreshes during one
    // action. Coalesce them to at most 10fps; combat calculation is untouched.
    const minInterval = this.isAutoBattle ? 100 : 0;
    const elapsed = performance.now() - (this._lastEntityPaintAt || 0);
    const delay = Math.max(0, minInterval - elapsed);
    this._entityPaintTimer = setTimeout(() => {
      this._entityPaintTimer = null;
      requestAnimationFrame(() => {
        this._updateEntitiesPending = false;
        this._lastEntityPaintAt = performance.now();
        this._doUpdateEntities();
      });
    }, delay);
  },

  _doUpdateEntities() {
    if (document.hidden) return;
    const disableAnim = this._cachedDisableAnim;
    const speed = this.speedMult || 1;
    const fastMode = speed >= 5;
    if (!this.domCache) return;

    const aliveEnemiesCount = this.enemies.filter(e => !e.isDead).length || 1;
    this.elements.enemyArea.style.setProperty('--enemy-cols', aliveEnemiesCount);

    this.enemies.forEach(e => {
      const cache = this.domCache.enemies[e.elementId];
      if (!cache) return;
      
      const { root: el, iconContainer, hpContainer, hpBar, hpText, atbContainer, stateIconsContainer } = cache;

      if (stateIconsContainer && !e.isDead) {
        const newHtml = getActiveStateIconsHTML(e);
        if (stateIconsContainer.innerHTML !== newHtml) {
          stateIconsContainer.innerHTML = newHtml;
        }
      }

      if (e.isDead) {
        el.classList.remove('cursor-pointer', 'hover:scale-105');
        if (!fastMode) {
          el.classList.remove('transition-transform');
          el.style.transition = 'opacity 0.3s ease, min-width 0.3s ease 0.6s, max-width 0.3s ease 0.6s, margin 0.3s ease 0.6s';
          iconContainer.style.transition = 'opacity 0.3s ease';
          hpContainer.style.transition = 'opacity 0.3s ease';
          atbContainer.style.transition = 'opacity 0.3s ease';
        } else {
          el.style.transition = '';
          iconContainer.style.transition = '';
          hpContainer.style.transition = '';
          atbContainer.style.transition = '';
        }

        iconContainer.classList.add('opacity-0');
        hpContainer.classList.add('opacity-0');
        atbContainer.classList.add('opacity-0');
        if (el.style.minWidth !== '0px') {
          el.style.minWidth = '0px';
          el.style.maxWidth = '0px';
          el.style.opacity = '0';
          el.style.margin = '0 -0.125rem';
          el.style.pointerEvents = 'none';
        }
      }

      if (this.activeEnemy === e) {
        iconContainer.classList.add('drop-shadow-[0_0_8px_rgba(250,204,21,1)]');
        iconContainer.classList.remove('drop-shadow-md', 'drop-shadow-[0_0_8px_rgba(239,68,68,1)]');
      } else if (this.selectedEnemyTarget === e) {
        iconContainer.classList.add('drop-shadow-[0_0_8px_rgba(239,68,68,1)]');
        iconContainer.classList.remove('drop-shadow-md', 'drop-shadow-[0_0_8px_rgba(250,204,21,1)]');
      } else {
        iconContainer.classList.remove('drop-shadow-[0_0_8px_rgba(239,68,68,1)]', 'drop-shadow-[0_0_8px_rgba(250,204,21,1)]');
        iconContainer.classList.add('drop-shadow-md');
      }

      const hpPct = Math.min(100, (e.currentHp / Math.max(1, e.maxHp)) * 100);
      const newHpWidth = `${hpPct}%`;
      if (hpBar.style.width !== newHpWidth) hpBar.style.width = newHpWidth;
      if (hpBar.style.left !== '0px' && hpBar.style.left !== '0%') hpBar.style.left = '0';
      if (hpBar.style.transform) hpBar.style.transform = '';

      if (cache.hpBarrierBar) {
        const shieldPct = e._barrierHp && e._barrierHp > 0 ? Math.min(100, (e._barrierHp / Math.max(1, e.maxHp)) * 100) : 0;
        if (shieldPct > 0) {
          cache.hpBarrierBar.style.opacity = '1';
          cache.hpBarrierBar.style.width = `${shieldPct}%`;
          cache.hpBarrierBar.style.left = `${Math.min(100 - shieldPct, hpPct)}%`;
        } else {
          cache.hpBarrierBar.style.opacity = '0';
          cache.hpBarrierBar.style.width = '0%';
        }
      }

      if (hpText) {
        const newHpText = `${formatNumber(Math.floor(e.currentHp))}/${formatNumber(e.maxHp)}`;
        if (hpText.textContent !== newHpText) hpText.textContent = newHpText;
      }
    });

    this.party.forEach(p => {
      const cache = this.domCache.party[p.elementId];
      if (!cache) return;
      const { root: el, lvEl, jlvEl, spEl, hpBar, hpText, mpBar, mpText, expBar, expText, jpBar, jpText, statBlocks, stateIconsContainer } = cache;

      if (stateIconsContainer && !p.isDead) {
        const newHtml = getActiveStateIconsHTML(p);
        if (stateIconsContainer.innerHTML !== newHtml) {
          stateIconsContainer.innerHTML = newHtml;
        }
      }

      const allBgClasses = ['bg-purple-900/70', 'bg-red-900/70', 'bg-yellow-900/70', 'bg-blue-900/70', 'bg-stone-900/90', 'bg-slate-300/30', 'bg-black/80', 'bg-pink-900/70', 'bg-gray-800/80'];
      let targetBgClass = 'bg-gray-800/80';
      if (p.activeAilment && !p.isDead) {
        const ailmentBgMap = {
          poison: 'bg-purple-900/70',
          burn: 'bg-red-900/70',
          paralysis: 'bg-yellow-900/70',
          sleep: 'bg-blue-900/70',
          blind: 'bg-stone-900/90',
          silence: 'bg-slate-300/30',
          curse: 'bg-black/80',
          confusion: 'bg-pink-900/70'
        };
        targetBgClass = ailmentBgMap[p.activeAilment.type] || targetBgClass;
      }
      el.classList.remove(...allBgClasses);
      el.classList.add(targetBgClass);

      if (this.activeCharacter === p && !this.isAutoBattle) {
        el.classList.add('border-yellow-400', 'shadow-[0_0_8px_rgba(250,204,21,0.5)]');
        el.classList.remove('border-gray-700', 'border-blue-400', 'shadow-[0_0_8px_rgba(96,165,250,0.5)]');
      } else if (this.isAutoBattle && this.selectedPartyMember === p) {
        el.classList.add('border-blue-400', 'shadow-[0_0_8px_rgba(96,165,250,0.5)]');
        el.classList.remove('border-gray-700', 'border-yellow-400', 'shadow-[0_0_8px_rgba(250,204,21,0.5)]');
      } else {
        el.classList.remove('border-yellow-400', 'border-blue-400', 'shadow-[0_0_8px_rgba(250,204,21,0.5)]', 'shadow-[0_0_8px_rgba(96,165,250,0.5)]');
        el.classList.add('border-gray-700');
      }

      if (p.isDead) {
        el.classList.add('opacity-40', 'grayscale');
        el.classList.remove('cursor-pointer');
        if (!disableAnim && !fastMode) el.classList.remove('transition-transform', 'hover:scale-[1.02]');
      } else {
        el.classList.remove('opacity-40', 'grayscale');
        el.classList.add('cursor-pointer');
        if (!disableAnim && !fastMode) el.classList.add('transition-transform', 'hover:scale-[1.02]');
      }

      if (lvEl && lvEl.textContent !== String(p.level || 1)) lvEl.textContent = p.level || 1;
      if (jlvEl && jlvEl.textContent !== String(p.jobLevel || 1)) jlvEl.textContent = p.jobLevel || 1;
      if (spEl && spEl.textContent !== String(p.sp || 0)) spEl.textContent = p.sp || 0;

      if (hpBar) {
        const trueMaxHp = p.stats.hp || p.hp.max;
        const hpPct = Math.min(100, (p.hp.current / Math.max(1, trueMaxHp)) * 100);
        const newHpWidth = `${hpPct}%`;
        if (hpBar.style.width !== newHpWidth) hpBar.style.width = newHpWidth;
        if (hpBar.style.left !== '0px' && hpBar.style.left !== '0%') hpBar.style.left = '0';
        if (hpBar.style.transform) hpBar.style.transform = '';

        if (cache.hpBarrierBar) {
          const shieldPct = p._barrierHp && p._barrierHp > 0 ? Math.min(100, (p._barrierHp / Math.max(1, trueMaxHp)) * 100) : 0;
          if (shieldPct > 0) {
            cache.hpBarrierBar.style.opacity = '1';
            cache.hpBarrierBar.style.width = `${shieldPct}%`;
            cache.hpBarrierBar.style.left = `${Math.min(100 - shieldPct, hpPct)}%`;
          } else {
            cache.hpBarrierBar.style.opacity = '0';
            cache.hpBarrierBar.style.width = '0%';
          }
        }

        if (hpText) {
          const newHpText = `${formatNumber(Math.floor(p.hp.current))}/${formatNumber(trueMaxHp)}`;
          if (hpText.textContent !== newHpText) hpText.textContent = newHpText;
        }
      }

      if (mpBar) {
        const trueMaxMp = p.stats.mp || p.mp.max;
        const newMpScale = `scaleX(${p.mp.current / trueMaxMp})`;
        if (mpBar.style.transform !== newMpScale) mpBar.style.transform = newMpScale;
        if (mpText) {
          const newMpText = `${formatNumber(Math.floor(p.mp.current))}/${formatNumber(trueMaxMp)}`;
          if (mpText.textContent !== newMpText) mpText.textContent = newMpText;
        }
      }

      if (expBar) {
        const newExpScale = `scaleX(${p.exp.current / p.exp.max})`;
        if (expBar.style.transform !== newExpScale) expBar.style.transform = newExpScale;
        if (expText) {
          const newExpText = `${formatNumber(Math.floor(p.exp.current))}/${formatNumber(p.exp.max)}`;
          if (expText.textContent !== newExpText) expText.textContent = newExpText;
        }
      }

      if (jpBar) {
        const newJpScale = `scaleX(${p.jp.current / p.jp.max})`;
        if (jpBar.style.transform !== newJpScale) jpBar.style.transform = newJpScale;
        if (jpText) {
          const newJpText = `${formatNumber(Math.floor(p.jp.current))}/${formatNumber(p.jp.max)}`;
          if (jpText.textContent !== newJpText) jpText.textContent = newJpText;
        }
      }

      const statVals = cache.statVals;
      const statRows = cache.statRows;
      const statIcons = cache.statIcons;
      const statLabels = cache.statLabels;

      if (statVals && statVals.atk) {
        const applyStatTheme = (type, valElt, rowElt, iconElt, labelElt, isBuff, isDebuff, baseIconColor, isStacked) => {
          const colors = ['text-gray-100', 'text-green-400', 'text-red-400', 'text-purple-400', 'text-slate-400', 'text-indigo-400', 'text-indigo-300', 'text-yellow-400', 'text-teal-300'];
          valElt.classList.remove(...colors);
          iconElt.classList.remove(...colors);
          labelElt.classList.remove(...colors);
          
          if (isBuff) {
            valElt.classList.add('text-green-400');
            iconElt.classList.add('text-green-400');
            labelElt.classList.add('text-green-400');
            rowElt.className = `stat-row-${type} flex justify-between items-center border rounded px-1 py-0.5 transition-colors ${isStacked ? 'bg-green-800/60 border-green-400 shadow-[0_0_5px_rgba(74,222,128,0.4)]' : 'bg-green-900/40 border-green-500/50 shadow-none'}`;
          } else if (isDebuff) {
            valElt.classList.add('text-red-400');
            iconElt.classList.add('text-red-400');
            labelElt.classList.add('text-red-400');
            rowElt.className = `stat-row-${type} flex justify-between items-center border rounded px-1 py-0.5 transition-colors ${isStacked ? 'bg-red-800/60 border-red-400 shadow-[0_0_5px_rgba(248,113,113,0.4)]' : 'bg-red-900/40 border-red-500/50 shadow-none'}`;
          } else {
            valElt.classList.add('text-gray-100');
            iconElt.classList.add(baseIconColor);
            rowElt.className = `stat-row-${type} flex justify-between items-center border rounded px-1 py-0.5 transition-colors bg-gray-900/40 border-transparent shadow-none`;
          }
        };

        const spdTotalPercent = (p._passiveSpdBuffPercent || 0);
        const fSpd = formatNumber(Math.floor(p.stats.spd * (1 + spdTotalPercent / 100)));
        if (statVals.spd.textContent !== fSpd) statVals.spd.textContent = fSpd;
        applyStatTheme('spd', statVals.spd, statRows.spd, statIcons.spd, statLabels.spd, spdTotalPercent > 0, spdTotalPercent < 0, 'text-yellow-400', false);

        let demonPowerMult = 1;
        if (p.hp && p.hp.current / (p.stats?.hp || p.hp.max) <= 0.5) {
          if (p._skillCache && p._skillCache.has('demon_power')) {
            const dpInfo = p._skillCache.get('demon_power');
            if (dpInfo && dpInfo.level > 0 && dpInfo.levelConfig) {
              demonPowerMult = dpInfo.levelConfig.atkMatkMultiplier || 1;
            }
          }
        }

        const atkTotalPercent = (p._passiveAtkBuffPercent || 0) + (p._atkBuffTurns > 0 ? (p._atkBuffPercent || 0) : 0);
        const atkStr = formatNumber(Math.floor((p.stats.atk * demonPowerMult) * (1 + atkTotalPercent / 100)));
        if (statVals.atk.textContent !== atkStr) statVals.atk.textContent = atkStr;
        applyStatTheme('atk', statVals.atk, statRows.atk, statIcons.atk, statLabels.atk, atkTotalPercent > 0 || demonPowerMult > 1, atkTotalPercent < 0, 'text-red-400', p._atkBuffTurns > 0 && p._passiveAtkBuffPercent > 0);

        const matkTotalPercent = (p._passiveMatkBuffPercent || 0) + (p._matkBuffTurns > 0 ? (p._matkBuffPercent || 0) : 0);
        const matStr = formatNumber(Math.floor((p.stats.matk * demonPowerMult) * (1 + matkTotalPercent / 100)));
        if (statVals.mat.textContent !== matStr) statVals.mat.textContent = matStr;
        applyStatTheme('mat', statVals.mat, statRows.mat, statIcons.mat, statLabels.mat, matkTotalPercent > 0 || demonPowerMult > 1, matkTotalPercent < 0, 'text-purple-400', p._matkBuffTurns > 0 && p._passiveMatkBuffPercent > 0);

        const defTotalPercent = (p._passiveDefBuffPercent || 0) + (p._defBuffTurns > 0 ? (p._defBuffPercent || 0) : 0);
        const defStr = formatNumber(Math.floor(p.stats.def * (1 + defTotalPercent / 100)));
        if (statVals.def.textContent !== defStr) statVals.def.textContent = defStr;
        applyStatTheme('def', statVals.def, statRows.def, statIcons.def, statLabels.def, defTotalPercent > 0, defTotalPercent < 0, 'text-slate-400', p._defBuffTurns > 0 && p._passiveDefBuffPercent > 0);

        const mdefPassivePercent = (p._passiveMdefBuffPercent || 0);
        const mdefActiveAmount = (p._mdefBuffTurns > 0 ? (p._mdefBuffAmount || 0) : 0);
        const mdefStr = formatNumber(Math.floor(p.stats.mdef * (1 + mdefPassivePercent / 100)) + mdefActiveAmount);
        if (statVals.mdf.textContent !== mdefStr) statVals.mdf.textContent = mdefStr;
        applyStatTheme('mdf', statVals.mdf, statRows.mdf, statIcons.mdf, statLabels.mdf, mdefPassivePercent > 0 || mdefActiveAmount > 0, mdefPassivePercent < 0 || mdefActiveAmount < 0, 'text-indigo-400', p._mdefBuffTurns > 0 && p._passiveMdefBuffPercent > 0);
      }
    });

    this.updateCommandBlocker();

    // Refresh tab content only when the target character changes or auto-battle toggles
    const targetCharForTab = this.isAutoBattle ? this.selectedPartyMember : this.activeCharacter;
    if (this._lastRenderedTabChar !== targetCharForTab || this._lastRenderedAutoBattle !== this.isAutoBattle) {
      this._lastRenderedTabChar = targetCharForTab;
      this._lastRenderedAutoBattle = this.isAutoBattle;
      // Yield slightly so that current animations (popups, ATB) aren't interrupted by heavy DOM rendering
      setTimeout(() => {
        this.renderTabContent();
      }, 0);
    }
  },

  cacheDOMElements() {
    this.atbElements = {};
    this.domCache = { party: {}, enemies: {} };

    this.enemies.forEach(e => {
      const el = this.container.querySelector(`#${e.elementId}`);
      if (el) {
        this.atbElements[e.elementId] = el.querySelector(`#${e.elementId}-atb`);
        this.domCache.enemies[e.elementId] = {
          root: el,
          iconContainer: el.children[0],
          stateIconsContainer: el.querySelector('.state-icons-container'),
          hpContainer: el.children[1],
          hpBar: el.querySelector('.bg-red-600'),
          hpBarrierBar: el.querySelector('.hp-barrier-bar'),
          hpText: el.querySelector('.hp-text'),
          atbContainer: el.children[2]
        };
      }
    });

    this.party.forEach(p => {
      const el = this.container.querySelector(`#${p.elementId}`);
      if (el) {
        this.atbElements[p.elementId] = el.querySelector(`#${p.elementId}-atb`);
        
        const statBlocks = el.querySelectorAll('.text-gray-100.font-black.drop-shadow-md');
        const hpBarEl = el.querySelector('.bg-red-600');
        const mpBarEl = el.querySelector('.bg-blue-600');
        const expBarEl = el.querySelector('.bg-green-600');
        const jpBarEl = el.querySelector('.bg-purple-600');

        this.domCache.party[p.elementId] = {
          root: el,
          stateIconsContainer: el.querySelector('.state-icons-container'),
          lvEl: el.querySelector(`.${p.elementId}-lv`),
          jlvEl: el.querySelector(`.${p.elementId}-jlv`),
          spEl: el.querySelector(`.${p.elementId}-sp`),
          hpBar: hpBarEl,
          hpBarrierBar: el.querySelector('.hp-barrier-bar'),
          hpText: el.querySelector('.hp-text'),
          mpBar: mpBarEl,
          mpText: mpBarEl ? mpBarEl.nextElementSibling : null,
          expBar: expBarEl,
          expText: expBarEl ? expBarEl.nextElementSibling : null,
          jpBar: jpBarEl,
          jpText: jpBarEl ? jpBarEl.nextElementSibling : null,
          statRows: {
            atk: el.querySelector('.stat-row-atk'),
            def: el.querySelector('.stat-row-def'),
            mat: el.querySelector('.stat-row-mat'),
            mdf: el.querySelector('.stat-row-mdf'),
            spd: el.querySelector('.stat-row-spd')
          },
          statVals: {
            atk: el.querySelector('.stat-val-atk'),
            def: el.querySelector('.stat-val-def'),
            mat: el.querySelector('.stat-val-mat'),
            mdf: el.querySelector('.stat-val-mdf'),
            spd: el.querySelector('.stat-val-spd')
          },
          statIcons: {
            atk: el.querySelector('.stat-icon-atk'),
            def: el.querySelector('.stat-icon-def'),
            mat: el.querySelector('.stat-icon-mat'),
            mdf: el.querySelector('.stat-icon-mdf'),
            spd: el.querySelector('.stat-icon-spd')
          },
          statLabels: {
            atk: el.querySelector('.stat-label-atk'),
            def: el.querySelector('.stat-label-def'),
            mat: el.querySelector('.stat-label-mat'),
            mdf: el.querySelector('.stat-label-mdf'),
            spd: el.querySelector('.stat-label-spd')
          }
        };
      }
    });
  }
};
