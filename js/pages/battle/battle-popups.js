/**
 * battle-popups.js
 * 統一ポップアップシステム (Lazy DOM Pool)
 * 必要数だけ生成して再利用し、長時間戦闘でもDOM数を上限内に保つ
 */

import { playSoundEffect } from '../../utils/sound-effects.js';

const POPUP_POOL_LIMITS = { float: 150, label: 50 };

export const popupMethods = {
  _initPopupPool() {
    if (this._popupLayer) return;
    this._popupLayer = document.createElement('div');
    this._popupLayer.id = 'battle-popup-layer';
    this._popupLayer.className = 'fixed inset-0 pointer-events-none z-[9999]';
    this._popupLayer.style.contain = 'layout style paint';
    document.body.appendChild(this._popupLayer);

    this._domPool = [];
  },

  _createPoolElement(type) {
    if (type === 'float') {
      const el = document.createElement('div');
      el.className = 'hidden';
      el.style.cssText = 'display: none !important;';
      this._popupLayer.appendChild(el);
      const item = { el, active: false, type };
      this._domPool.push(item);
      return item;
    }

    if (type === 'label') {
      const wrapper = document.createElement('div');
      wrapper.className = 'hidden';
      wrapper.style.cssText = 'display: none !important;';
      const inner = document.createElement('div');
      wrapper.appendChild(inner);
      this._popupLayer.appendChild(wrapper);
      const item = { el: wrapper, inner, active: false, type };
      this._domPool.push(item);
      return item;
    }

    return null;
  },

  _getPoolElement(type = 'float') {
    if (!this._popupLayer) this._initPopupPool();
    
    let poolItem = this._domPool.find(item => !item.active && item.type === type);
    if (!poolItem) {
      const typeCount = this._domPool.reduce((count, item) => count + (item.type === type ? 1 : 0), 0);
      if (typeCount >= POPUP_POOL_LIMITS[type]) return null;
      poolItem = this._createPoolElement(type);
    }
    if (!poolItem) return null;
    
    poolItem.active = true;
    const el = poolItem.el;
    
    // Reset element visually but KEEP it in the DOM tree
    if (type === 'float') {
      el.innerHTML = '';
    }
    el.className = 'pointer-events-none absolute';
    el.style.cssText = 'display: block; position: absolute;';
    if (el.getAnimations) {
      el.getAnimations().forEach(a => a.cancel());
    }
    
    if (type === 'label') {
      poolItem.inner.innerHTML = '';
      poolItem.inner.className = '';
      poolItem.inner.style.cssText = '';
      if (poolItem.inner.getAnimations) {
        poolItem.inner.getAnimations().forEach(a => a.cancel());
      }
      return { wrapper: el, popup: poolItem.inner };
    }
    
    return el;
  },

  _releasePoolElement(elOrWrapper) {
    if (!this._domPool) return;
    const poolItem = this._domPool.find(item => item.el === elOrWrapper);
    if (poolItem) {
      poolItem.active = false;
      poolItem.el.className = 'hidden';
      poolItem.el.style.cssText = 'display: none !important;';
    }
  },

  /**
   * ダメージ用ポップアップ — 上方向に素早く浮遊して消える
   */
  _showFloatingPopup(elementId, config) {
    if (this._cachedDisableAnim) return;
    if (document.hidden) return;

    const speed = this.speedMult || 1;

    // Limit active floating popups at the highest supported speed.
    const maxActive = speed >= 5 ? 30 : 150;
    const activeCount = this._domPool ? this._domPool.filter(p => p.active && p.type === 'float').length : 0;
    if (activeCount >= maxActive) {
      // Release the oldest active float to make room
      const oldest = this._domPool.find(p => p.active && p.type === 'float');
      if (oldest) {
        if (oldest.el.getAnimations) oldest.el.getAnimations().forEach(a => a.cancel());
        this._releasePoolElement(oldest.el);
      }
    }

    const el = this.container.querySelector(`#${elementId}`);
    if (!el) return;

    // Cache rect to avoid severe layout thrashing when hundreds of damage numbers pop
    if (!this._rectCache) this._rectCache = { time: 0, rects: {} };
    const now = performance.now();
    if (now - this._rectCache.time > 16) {
      this._rectCache.time = now;
      this._rectCache.rects = {};
    }
    let rect = this._rectCache.rects[elementId];
    if (!rect) {
      rect = el.getBoundingClientRect();
      this._rectCache.rects[elementId] = rect;
    }

    // Limit popup animation speed at high game speeds so numbers remain readable
    const effectiveSpeed = Math.min(speed, 2.0);
    const dur = (config.duration || 800) / effectiveSpeed;
    const centerX = rect.left + rect.width / 2;
    const baseY = rect.top;
    
    // -- Simple random spread (Lightweight) --
    let spreadX = (Math.random() - 0.5) * 80; 
    let finalX = centerX + spreadX * 0.5;
    let finalY = baseY + (Math.random() - 0.5) * 20;
    const popup = this._getPoolElement('float');
    if (!popup) return;
    
    popup.className = config.className || '';
    popup.style.display = 'block';
    popup.style.left = `${finalX}px`;
    popup.style.top = `${finalY}px`;
    popup.style.transform = ''; // clear
    popup.style.color = config.color || '#fff';
    if (config.fontFamily) popup.style.fontFamily = config.fontFamily;
    if (config.textShadow) popup.style.textShadow = config.textShadow;
    if (config.fontSize) popup.style.fontSize = config.fontSize;
    
    // Most efficient text insertion
    if (config.text !== undefined && config.text !== null) {
      popup.textContent = config.text;
    } else if (config.html) {
      popup.innerHTML = config.html; // fallback if needed
    }
    
    const isParty = elementId.startsWith('party-');
    const floatY = isParty ? 45 : -45; // Move further for smooth drift
    
    const scale = config.scale || 1.0;

    // Ultra-lightweight 3-step animation: Pop -> Drift -> Fade Out
    const anim = popup.animate([
      { opacity: 0, transform: `translate3d(-50%, 0, 0) scale(${scale * 0.5})` },
      { opacity: 1, transform: `translate3d(calc(-50% + ${spreadX * 0.3}px), ${floatY * 0.3}px, 0) scale(${scale})`, offset: 0.15 },
      { opacity: 0, transform: `translate3d(calc(-50% + ${spreadX}px), ${floatY}px, 0) scale(${scale * 0.9})` }
    ], {
      duration: dur,
      easing: 'ease-out',
      fill: 'forwards'
    });

    anim.onfinish = () => {
      anim.cancel();
      this._releasePoolElement(popup);
    };
  },

  /**
   * アクション名用ポップアップ — その場に留まってからフェードアウト
   */
  _showLabelPopup(elementId, config) {
    if (this._cachedDisableAnim) return;
    if (document.hidden) return;

    const speed = this.speedMult || 1;

    const el = this.container.querySelector(`#${elementId}`);
    if (!el) return;

    if (!this._labelStacks) this._labelStacks = {};
    if (!this._labelStacks[elementId]) this._labelStacks[elementId] = [];

    const stack = this._labelStacks[elementId];
    
    // limit stack size — tighter at high speed to prevent severe layout thrashing
    const maxStack = speed >= 5 ? 3 : 8;
    while (stack.length >= maxStack) {
      const oldest = stack.shift();
      if (oldest.anim) oldest.anim.cancel();
      this._releasePoolElement(oldest.el); // wrapper contains popup
      clearTimeout(oldest.timeoutId);
    }

    // Don't speed up popups too much at 5x speed so they remain readable and can stack up
    const effectiveSpeed = Math.min(speed, 2.0);
    const dur = (config.duration || 1000) / effectiveSpeed;
    const itemHeight = config.height || 28;
    const stackGap = 4;

    const bump = itemHeight + stackGap;

    // Reuse shared rect cache to avoid forced layout reflow
    if (!this._rectCache) this._rectCache = { time: 0, rects: {} };
    const now = performance.now();
    if (now - this._rectCache.time > 16) {
      this._rectCache.time = now;
      this._rectCache.rects = {};
    }
    let rect = this._rectCache.rects[elementId];
    if (!rect) {
      rect = el.getBoundingClientRect();
      this._rectCache.rects[elementId] = rect;
    }
    const centerX = rect.left + rect.width / 2;
    const baseY = rect.top - 8;

    const poolElements = this._getPoolElement('label');
    if (!poolElements) return;
    const { wrapper, popup } = poolElements;

    wrapper.className = `fixed z-[10000] pointer-events-none flex flex-col items-center`;
    wrapper.style.display = 'block';
    wrapper.style.left = `${centerX}px`;
    wrapper.style.top = `${baseY}px`;
    wrapper.style.transform = `translate(-50%, -10px)`;
    wrapper.style.transition = `transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)`;

    popup.className = `${config.className || ''}`;
    popup.style.transform = ''; // Clear previous transform
    popup.innerHTML = config.html;

    const anim = popup.animate([
      { opacity: 0, transform: 'scale(0.5) translateY(10px)', offset: 0 },
      { opacity: 1, transform: 'scale(1.1) translateY(-2px)', offset: 0.1 },
      { opacity: 1, transform: 'scale(1.0) translateY(0)', offset: 0.2 },
      { opacity: 0.9, transform: 'scale(1.0) translateY(0)', offset: 0.8 },
      { opacity: 0, transform: 'scale(0.85) translateY(-10px)', offset: 1 }
    ], {
      duration: dur,
      easing: 'ease-out',
      fill: 'forwards'
    });

    const entry = { el: wrapper, popup: popup, baseOffset: 10, timeoutId: null, anim: anim };
    stack.push(entry);

    stack.forEach(e => {
      if (e !== entry) {
        e.baseOffset += bump;
        e.el.style.transform = `translate(-50%, -${e.baseOffset}px)`;
      }
    });

    anim.onfinish = () => {
      anim.cancel();
      this._releasePoolElement(wrapper); // wrapper contains popup
      const idx = stack.indexOf(entry);
      if (idx !== -1) stack.splice(idx, 1);
    };
  },

  // --- showDamage: ダメージポップアップ (上方向に浮遊) ---
  showDamage(elementId, damage, customColorClass = 'text-red-500') {
    const isRecovery = customColorClass.includes('text-green-') || customColorClass.includes('text-blue-');
    playSoundEffect(isRecovery ? 'heal' : 'battleHit', { automatic: this.isAutoBattle });
    if (this._cachedDisableAnim) return;
    
    let color = '#ffffff';
    let textShadow = '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 4px 6px rgba(0,0,0,0.8)';
    let scale = 1.0;
    let fontSize = '32px';
    let duration = 800;
    let className = 'fixed z-[9999] pointer-events-none select-none flex items-center justify-center tracking-wide';
    let fontFamily = "'Anton', sans-serif";

    if (customColorClass.includes('text-red-500')) {
      // 弱点 (Weakness)
      className += ' italic tracking-tighter';
      color = '#ef4444';
      textShadow = '-2.5px -2.5px 0 #fff, 2.5px -2.5px 0 #fff, -2.5px 2.5px 0 #fff, 2.5px 2.5px 0 #fff, 0 6px 8px rgba(0,0,0,0.8)';
      fontSize = '42px';
      scale = 1.25;
      duration = 900;
    } else if (customColorClass.includes('text-purple-400')) {
      // 耐性軽減 (Resist)
      color = '#a855f7';
      textShadow = '-1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff, 0 3px 6px rgba(0,0,0,0.8)';
      scale = 0.85;
      fontSize = '26px';
    } else if (customColorClass.includes('text-green-')) {
      // HP回復
      color = '#4ade80';
      textShadow = '-2px -2px 0 #14532d, 2px -2px 0 #14532d, -2px 2px 0 #14532d, 2px 2px 0 #14532d, 0 4px 6px rgba(0,0,0,0.8)';
    } else if (customColorClass.includes('text-blue-400')) {
      // MP回復
      color = '#60a5fa';
      textShadow = '-2px -2px 0 #1e3a8a, 2px -2px 0 #1e3a8a, -2px 2px 0 #1e3a8a, 2px 2px 0 #1e3a8a, 0 4px 6px rgba(0,0,0,0.8)';
    }

    this._showFloatingPopup(elementId, {
      text: damage,
      className,
      color,
      fontFamily,
      textShadow,
      fontSize,
      scale,
      duration
    });
  },

  // --- showActionName: アクション名ポップアップ (その場に留まる) ---
  showActionName(elementId, actionName, textClass = 'text-green-300', borderClass = 'border-green-500/50') {
    if (this._cachedDisableAnim) return;
    const html = `<span class="font-black text-[15px] ${textClass} tracking-widest whitespace-nowrap bg-black/70 px-4 py-1.5 rounded-full border ${borderClass}" style="box-shadow: 0 4px 10px rgba(0,0,0,0.8); text-shadow: 0 2px 4px rgba(0,0,0,0.9);">${actionName}</span>`;

    this._showLabelPopup(elementId, {
      html,
      duration: 1200,
      height: 34
    });
  },

  // --- showLevelUp: レベルアップポップアップ (その場に留まる) ---
  showLevelUp(elementId, type = 'base') {
    if (this._cachedDisableAnim) return;
    const isJob = type === 'job';
    const textStr = isJob ? 'JOB LEVEL UP' : 'LEVEL UP';
    const iconColor = isJob ? 'text-red-300' : 'text-orange-300';
    const gradient = isJob
      ? 'from-white via-red-400 to-red-600'
      : 'from-white via-orange-400 to-orange-600';

    const html = `
      <div class="flex items-center justify-center gap-0.5 whitespace-nowrap" style="text-shadow: 0 2px 4px rgba(0,0,0,0.8);">
        <span class="material-symbols-outlined text-[15px] ${iconColor}" style="font-variation-settings: 'FILL' 1">auto_awesome</span>
        <span class="font-black text-[13px] italic tracking-widest text-transparent bg-clip-text bg-gradient-to-b ${gradient}">${textStr}</span>
        <span class="material-symbols-outlined text-[15px] ${iconColor}" style="font-variation-settings: 'FILL' 1">auto_awesome</span>
      </div>`;

    this._showLabelPopup(elementId, {
      html,
      duration: 1500,
      height: 28
    });
  }
};
