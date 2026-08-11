/**
 * battle-popups.js
 * 統一ポップアップシステム (Lazy DOM Pool)
 * 必要数だけ生成して再利用し、長時間戦闘でもDOM数を上限内に保つ
 */

import { playSoundEffect } from '../../utils/sound-effects.js';
import { shouldSkipBattleAnimations } from '../../utils/battle-animation.js';
import { captureBattleActionLabel, captureBattlePopup } from './battle-statistics.js';

const POPUP_POOL_LIMITS = { float: 150, label: 50 };

export const BATTLE_VALUE_TYPES = Object.freeze({
  PLAYER_DAMAGE: 'player-damage',
  ENEMY_DAMAGE: 'enemy-damage',
  WEAKNESS_DAMAGE: 'weakness-damage',
  RESISTED_DAMAGE: 'resisted-damage',
  CRITICAL_DAMAGE: 'critical-damage',
  POISON_DAMAGE: 'poison-damage',
  CURSE_DAMAGE: 'curse-damage',
  BURN_DAMAGE: 'burn-damage',
  HP_RECOVERY: 'hp-recovery',
  MP_RECOVERY: 'mp-recovery',
  HP_COST: 'hp-cost',
  MP_DAMAGE: 'mp-damage',
  BARRIER: 'barrier'
});

const DEFAULT_TEXT_SHADOW = '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 4px 6px rgba(0,0,0,0.8)';
const LIGHT_OUTLINE_SHADOW = '-2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, 0 4px 6px rgba(0,0,0,0.8)';

export const BATTLE_VALUE_STYLES = Object.freeze({
  [BATTLE_VALUE_TYPES.PLAYER_DAMAGE]: { color: '#ffffff' },
  [BATTLE_VALUE_TYPES.ENEMY_DAMAGE]: { color: '#ef4444' },
  [BATTLE_VALUE_TYPES.HP_RECOVERY]: { color: '#22c55e', textShadow: '-2px -2px 0 #14532d, 2px -2px 0 #14532d, -2px 2px 0 #14532d, 2px 2px 0 #14532d, 0 4px 6px rgba(0,0,0,0.8)', sound: 'heal' },
  [BATTLE_VALUE_TYPES.MP_RECOVERY]: { color: '#3b82f6', textShadow: '-2px -2px 0 #172554, 2px -2px 0 #172554, -2px 2px 0 #172554, 2px 2px 0 #172554, 0 4px 6px rgba(0,0,0,0.8)', sound: 'heal' },
  [BATTLE_VALUE_TYPES.POISON_DAMAGE]: { color: '#a855f7' },
  [BATTLE_VALUE_TYPES.CURSE_DAMAGE]: { color: '#111111', textShadow: LIGHT_OUTLINE_SHADOW },
  [BATTLE_VALUE_TYPES.BURN_DAMAGE]: { color: '#c2410c', textShadow: LIGHT_OUTLINE_SHADOW },
  [BATTLE_VALUE_TYPES.WEAKNESS_DAMAGE]: { color: '#f97316', fontSize: '42px', scale: 1.25, duration: 900, italic: true },
  [BATTLE_VALUE_TYPES.RESISTED_DAMAGE]: { color: '#6366f1', fontSize: '26px', scale: 0.85, textShadow: LIGHT_OUTLINE_SHADOW },
  [BATTLE_VALUE_TYPES.CRITICAL_DAMAGE]: { color: '#facc15' },
  // Additional battle values use their own hues so they cannot be mistaken for
  // the requested damage/recovery categories.
  [BATTLE_VALUE_TYPES.HP_COST]: { color: '#fb7185' },
  [BATTLE_VALUE_TYPES.MP_DAMAGE]: { color: '#06b6d4' },
  [BATTLE_VALUE_TYPES.BARRIER]: { color: '#2dd4bf' }
});

export const ATTACK_DAMAGE_ICONS = Object.freeze({
  physical: { icon: 'explosion', color: '#fb923c', label: '物理' },
  magic: { icon: 'auto_awesome', color: '#c084fc', label: '魔法' },
  hybrid: { icon: 'join_inner', color: '#f0abfc', label: '複合' },
  fire: { icon: 'local_fire_department', color: '#ef4444', label: '炎' },
  water: { icon: 'water_drop', color: '#3b82f6', label: '水' },
  grass: { icon: 'eco', color: '#22c55e', label: '草' },
  ice: { icon: 'ac_unit', color: '#67e8f9', label: '氷' },
  thunder: { icon: 'bolt', color: '#facc15', label: '雷' },
  wind: { icon: 'air', color: '#34d399', label: '風' },
  earth: { icon: 'landscape', color: '#d97706', label: '土' },
  light: { icon: 'light_mode', color: '#fde047', label: '光' },
  dark: { icon: 'dark_mode', color: '#a855f7', label: '闇' }
});

const LEGACY_STATUS_COLORS = Object.freeze({
  red: '#f87171', orange: '#fb923c', amber: '#fbbf24', yellow: '#facc15',
  lime: '#a3e635', green: '#4ade80', emerald: '#34d399', teal: '#2dd4bf',
  cyan: '#22d3ee', sky: '#38bdf8', blue: '#60a5fa', indigo: '#818cf8',
  violet: '#a78bfa', purple: '#c084fc', fuchsia: '#e879f9', pink: '#f472b6',
  rose: '#fb7185', gray: '#9ca3af', white: '#ffffff', black: '#111111'
});

const BATTLE_LABEL_TRANSLATIONS = Object.freeze({
  'ATK/MATK UP': '攻撃・魔攻アップ',
  'ENEMY ATK/MATK UP': '敵の攻撃・魔攻アップ',
  'DEF/MDEF UP': '防御・魔防アップ',
  'ATK UP': '攻撃力アップ',
  'MATK UP': '魔法攻撃アップ',
  'DEF UP': '防御力アップ',
  'MDEF UP': '魔法防御アップ',
  'SPD UP': '素早さアップ',
  'ALL UP': '全能力アップ',
  'RESIST UP': '状態異常耐性アップ',
  'ATK DOWN': '攻撃力ダウン',
  'MATK DOWN': '魔法攻撃ダウン',
  'DEF DOWN': '防御力ダウン',
  'MDEF DOWN': '魔法防御ダウン',
  'SPD DOWN': '素早さダウン',
  'ATB UP': '行動ゲージ上昇',
  'ATB DOWN': '行動ゲージ低下',
  'ATB RESET': '行動ゲージリセット',
  'BUFF BREAK': '強化効果解除',
  'BUFF CLEARED': '強化効果解除',
  'BARRIER BLOCK': 'バリア防御',
  'BARRIER BREAK': 'バリア破壊',
  'MEDAL CRITICAL': 'メダル装備・会心',
  'MISS': 'ミス',
  'CLEANSE': '状態異常回復',
  'REGEN': 'HP自動回復',
  'FREEZE': '凍結',
  'SHATTER': '氷砕',
  'BURN': '燃焼',
  'DETONATE': '爆発',
  'RAISE': '蘇生',
  'INSTANT KILL': '即死',
  'DEATH RESIST': '即死無効',
  'SOUL RETURN': '魂の帰還',
  'MANA FLOW': 'マナフロー',
  'ALL COVER': '全体かばう'
});

export function normalizeBattleLabel(value) {
  const label = String(value ?? '').trim();
  if (BATTLE_LABEL_TRANSLATIONS[label]) return BATTLE_LABEL_TRANSLATIONS[label];

  const barrier = label.match(/^BARRIER\s*\+(.+)$/i);
  if (barrier) return `バリア +${barrier[1]}`;
  const gaiaBarrier = label.match(/^GAIA\s*\+(.+)$/i);
  if (gaiaBarrier) return `ガイア障壁 +${gaiaBarrier[1]}`;
  return label;
}

function escapeBattleBadgeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getBattleBadgeIcon(label, kind) {
  if (label.includes('メダル装備')) return 'workspace_premium';
  if (kind === 'action') return 'auto_awesome';
  if (/アップ|上昇|回復|蘇生|帰還|バリア|かばう|付与/.test(label)) return 'add_circle';
  if (/ダウン|低下|解除|破壊|封じ|不足|不可|ミス|即死|無効/.test(label)) return 'warning';
  if (/毒|呪|燃焼|凍結|麻痺|睡眠|混乱|暗闇|沈黙|病勢/.test(label)) return 'crisis_alert';
  return 'flare';
}

function getBattleBadgeBorderClass(textClass) {
  const match = String(textClass || '').match(/(?:^|\s)text-([a-z]+)(?:-(\d+))?/);
  if (!match) return 'border-cyan-400/50';
  return match[2] ? `border-${match[1]}-${match[2]}/60` : `border-${match[1]}/60`;
}

export function resolveBattleValueType(elementId, value, typeOrColorClass) {
  if (BATTLE_VALUE_STYLES[typeOrColorClass]) return typeOrColorClass;

  const text = String(value ?? '').trim();
  const isNumeric = /^-?[\d,]+(?:\.\d+)?$/.test(text);
  if (/^\+[\d,]+(?:\.\d+)?\s*MP$/i.test(text)) return BATTLE_VALUE_TYPES.MP_RECOVERY;
  if (/^MP\s*-[\d,]+(?:\.\d+)?$/i.test(text)) return BATTLE_VALUE_TYPES.MP_DAMAGE;
  if (/^BARRIER\s*\+[\d,]+/i.test(text)) return BATTLE_VALUE_TYPES.BARRIER;
  if (/^\+[\d,]+(?:\.\d+)?$/.test(text) || /^HP\s+[\d,]+$/i.test(text)) {
    return BATTLE_VALUE_TYPES.HP_RECOVERY;
  }
  if (/^-[\d,]+(?:\.\d+)?\s*HP$/i.test(text)) return BATTLE_VALUE_TYPES.HP_COST;

  // Older direct-damage calls did not carry a semantic type. Party card IDs
  // identify incoming enemy damage; bare values over enemies are outgoing damage.
  if (isNumeric && String(elementId).startsWith('party-')) return BATTLE_VALUE_TYPES.ENEMY_DAMAGE;
  if (isNumeric && /text-red-/.test(typeOrColorClass || '')) return BATTLE_VALUE_TYPES.HP_COST;
  if (isNumeric) return BATTLE_VALUE_TYPES.PLAYER_DAMAGE;
  return null;
}

export function resolveAttackValueType(isPartyAttack, elementMultiplier = 1, isCritical = false) {
  if (!isPartyAttack) return BATTLE_VALUE_TYPES.ENEMY_DAMAGE;
  if (isCritical) return BATTLE_VALUE_TYPES.CRITICAL_DAMAGE;
  if (elementMultiplier > 1.001) return BATTLE_VALUE_TYPES.WEAKNESS_DAMAGE;
  if (elementMultiplier < 0.999) return BATTLE_VALUE_TYPES.RESISTED_DAMAGE;
  return BATTLE_VALUE_TYPES.PLAYER_DAMAGE;
}

export function resolveAttackDamageIconType(
  isPartyAttack,
  attackElements = {},
  elementPortionScale = 1,
  nonElementalPercent = 100,
  fallbackType = 'physical'
) {
  if (!isPartyAttack) return null;

  let dominantType = ATTACK_DAMAGE_ICONS[fallbackType] ? fallbackType : 'physical';
  let dominantPercent = Math.max(0, Number(nonElementalPercent) || 0);
  for (const [element, rawPercent] of Object.entries(attackElements || {})) {
    if (!ATTACK_DAMAGE_ICONS[element]) continue;
    const percent = Math.max(0, Number(rawPercent) || 0) * elementPortionScale;
    if (percent >= dominantPercent) {
      dominantType = element;
      dominantPercent = percent;
    }
  }
  return dominantType;
}

function getLegacyStatusColor(colorClass) {
  const match = String(colorClass || '').match(/text-([a-z]+)(?:-|$)/);
  return match ? LEGACY_STATUS_COLORS[match[1]] : null;
}

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
    poolItem.generation = (poolItem.generation || 0) + 1;
    const el = poolItem.el;
    el._popupPoolGeneration = poolItem.generation;
    
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

  _releasePoolElement(elOrWrapper, generation = null) {
    if (!this._domPool) return;
    const poolItem = this._domPool.find(item => item.el === elOrWrapper);
    if (poolItem) {
      // A canceled animation can dispatch its callback after this element has
      // already been reused. Never let that stale callback hide the new popup.
      if (generation !== null && poolItem.generation !== generation) return;
      poolItem.active = false;
      poolItem.el.className = 'hidden';
      poolItem.el.style.cssText = 'display: none !important;';
    }
  },

  /**
   * ダメージ用ポップアップ — 上方向に素早く浮遊して消える
   */
  _showFloatingPopup(elementId, config) {
    if (shouldSkipBattleAnimations()) return;

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
    const popupGeneration = popup._popupPoolGeneration;
    
    popup.className = config.className || '';
    popup.style.display = 'block';
    popup.style.left = `${finalX}px`;
    popup.style.top = `${finalY}px`;
    popup.style.transform = ''; // clear
    popup.style.color = config.color || '#fff';
    if (config.fontFamily) popup.style.fontFamily = config.fontFamily;
    if (config.textShadow) popup.style.textShadow = config.textShadow;
    if (config.fontSize) popup.style.fontSize = config.fontSize;
    
    if (config.damageIcon && config.text !== undefined && config.text !== null) {
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined shrink-0';
      icon.textContent = config.damageIcon.icon;
      icon.setAttribute('aria-hidden', 'true');
      icon.style.color = config.damageIcon.color;
      icon.style.fontSize = '0.78em';
      icon.style.lineHeight = '1';
      icon.style.fontVariationSettings = "'FILL' 1, 'wght' 650, 'GRAD' 0, 'opsz' 24";
      icon.style.textShadow = `0 0 8px ${config.damageIcon.color}, 1px 2px 2px rgba(0,0,0,0.95)`;

      const value = document.createElement('span');
      value.textContent = config.text;
      value.style.lineHeight = '1';
      popup.append(icon, value);
      popup.style.gap = '4px';
    } else if (config.text !== undefined && config.text !== null) {
      // Most efficient text insertion when an icon is not needed.
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
      delay: Math.max(0, config.delay || 0),
      easing: 'ease-out',
      // Keep the first, transparent frame applied during an impact delay.
      fill: 'both'
    });

    const releasePopup = () => {
      anim.onfinish = null;
      anim.oncancel = null;
      anim.cancel();
      this._releasePoolElement(popup, popupGeneration);
    };
    anim.onfinish = releasePopup;
    anim.oncancel = releasePopup;
  },

  /**
   * アクション名用ポップアップ — その場に留まってからフェードアウト
   */
  _showLabelPopup(elementId, config) {
    if (shouldSkipBattleAnimations()) return;

    const speed = this.speedMult || 1;

    const el = this.container.querySelector(`#${elementId}`);
    if (!el) return;

    if (!this._labelStacks) this._labelStacks = {};
    if (!this._labelStacks[elementId]) this._labelStacks[elementId] = [];

    const stack = this._labelStacks[elementId];
    
    // limit stack size — tighter at high speed to prevent severe layout thrashing
    const maxStack = speed >= 5 ? 5 : 10;
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
    const popupGeneration = wrapper._popupPoolGeneration;

    wrapper.className = `fixed z-[10000] pointer-events-none flex flex-col items-center`;
    wrapper.style.display = 'block';
    wrapper.style.left = `${centerX}px`;
    wrapper.style.top = `${baseY}px`;
    wrapper.style.transform = `translate(-50%, -10px)`;
    wrapper.style.transition = `transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)`;

    popup.className = `${config.className || ''}`;
    popup.style.transform = ''; // Clear previous transform
    popup.innerHTML = config.html;

    const anim = popup.animate([
      { opacity: 0, transform: 'translateY(8px) scale(0.92)', offset: 0 },
      { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.14 },
      { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.78 },
      { opacity: 0, transform: 'translateY(-8px) scale(0.98)', offset: 1 }
    ], {
      duration: dur,
      easing: 'cubic-bezier(0.2, 0.75, 0.25, 1)',
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

    const releasePopup = () => {
      anim.onfinish = null;
      anim.oncancel = null;
      anim.cancel();
      this._releasePoolElement(wrapper, popupGeneration); // wrapper contains popup
      const idx = stack.indexOf(entry);
      if (idx !== -1) stack.splice(idx, 1);
    };
    anim.onfinish = releasePopup;
    anim.oncancel = releasePopup;
  },

  // --- showDamage: ダメージポップアップ (上方向に浮遊) ---
  showDamage(elementId, damage, valueTypeOrColorClass = BATTLE_VALUE_TYPES.PLAYER_DAMAGE, delay = 0, damageIconType = null) {
    captureBattlePopup(this, elementId, damage);
    const valueType = resolveBattleValueType(elementId, damage, valueTypeOrColorClass);
    if (!valueType || valueType === BATTLE_VALUE_TYPES.BARRIER) {
      const badgeTextClass = String(valueTypeOrColorClass).startsWith('text-')
        ? valueTypeOrColorClass
        : 'text-cyan-200';
      this.showEffectBadge(elementId, damage, badgeTextClass);
      return;
    }
    const valueStyle = BATTLE_VALUE_STYLES[valueType] || {};
    const playPopupSound = () => playSoundEffect(valueStyle.sound || 'battleHit', { automatic: this.isAutoBattle });
    if (delay > 0) {
      // This timer is intentionally independent from the combat timer list:
      // the killing blow still needs its impact sound after endBattle stops ATB.
      window.setTimeout(() => {
        if (this.container?.isConnected) playPopupSound();
      }, delay);
    } else {
      playPopupSound();
    }
    if (shouldSkipBattleAnimations()) return;
    
    let color = valueStyle.color || getLegacyStatusColor(valueTypeOrColorClass) || '#ffffff';
    let textShadow = valueStyle.textShadow || DEFAULT_TEXT_SHADOW;
    let scale = valueStyle.scale || 1.0;
    let fontSize = valueStyle.fontSize || '32px';
    let duration = valueStyle.duration || 800;
    let className = 'fixed z-[9999] pointer-events-none select-none flex items-center justify-center tracking-wide';
    let fontFamily = "'Anton', sans-serif";
    const damageIcon = ATTACK_DAMAGE_ICONS[damageIconType] || null;

    if (valueStyle.italic) {
      className += ' italic tracking-tighter';
    }

    this._showFloatingPopup(elementId, {
      text: damage,
      className,
      color,
      fontFamily,
      textShadow,
      fontSize,
      scale,
      duration,
      delay,
      damageIcon
    });
  },

  showEffectBadge(elementId, effectName, textClass = 'text-cyan-200', borderClass = null) {
    if (shouldSkipBattleAnimations()) return;
    const label = normalizeBattleLabel(effectName);
    const icon = getBattleBadgeIcon(label, 'effect');
    const safeLabel = escapeBattleBadgeHtml(label);
    const resolvedBorderClass = borderClass || getBattleBadgeBorderClass(textClass);
    const html = `<div class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border ${resolvedBorderClass} bg-slate-950/90 px-3 py-1.5 ${textClass} backdrop-blur-sm" style="box-shadow: 0 5px 14px rgba(0,0,0,0.72); text-shadow: 0 2px 4px rgba(0,0,0,0.9);"><span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1">${icon}</span><span class="text-[14px] font-black tracking-wide">${safeLabel}</span></div>`;

    this._showLabelPopup(elementId, {
      html,
      duration: 1450,
      height: 34
    });
  },

  // --- showActionName: アクション名ポップアップ (その場に留まる) ---
  showActionName(elementId, actionName, textClass = 'text-green-300', borderClass = 'border-green-500/50') {
    captureBattleActionLabel(this, elementId, actionName);
    if (shouldSkipBattleAnimations()) return;
    const label = normalizeBattleLabel(actionName);
    const icon = getBattleBadgeIcon(label, 'action');
    const safeLabel = escapeBattleBadgeHtml(label);
    const html = `<div class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border ${borderClass} bg-black/85 px-3.5 py-1.5 ${textClass} backdrop-blur-sm" style="box-shadow: 0 5px 14px rgba(0,0,0,0.78); text-shadow: 0 2px 4px rgba(0,0,0,0.9);"><span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1">${icon}</span><span class="text-[14px] font-black tracking-wide">${safeLabel}</span></div>`;

    this._showLabelPopup(elementId, {
      html,
      duration: 1450,
      height: 34
    });
  },

  // --- showLevelUp: レベルアップポップアップ (その場に留まる) ---
  showLevelUp(elementId, type = 'base') {
    if (shouldSkipBattleAnimations()) return;
    const isJob = type === 'job';
    const textStr = isJob ? 'ジョブレベルアップ' : 'レベルアップ';
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
