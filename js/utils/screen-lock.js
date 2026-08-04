const SCREEN_LOCK_SETTING_KEY = 'screenLockEnabled';

const activeAutomation = new Map();

let initialized = false;
let locked = false;
let dismissedForCurrentRun = false;
let overlay = null;
let sliderThumb = null;
let sliderTrack = null;
let sliderFill = null;
let activityLabel = null;
let notificationRegion = null;
const lockNotifications = new Map();
let pointerId = null;
let dragStartX = 0;
let dragStartOffset = 0;
let dragOffset = 0;

export function isScreenLockEnabled() {
  return localStorage.getItem(SCREEN_LOCK_SETTING_KEY) === 'true';
}

export function isScreenLocked() {
  return locked;
}

export function setScreenLockEnabled(enabled) {
  localStorage.setItem(SCREEN_LOCK_SETTING_KEY, String(Boolean(enabled)));
  dismissedForCurrentRun = false;

  if (enabled && hasActiveAutomation()) {
    lockScreen();
  } else if (!enabled) {
    unlockScreen();
  }
}

export function setScreenLockActivity(source, active, label = '') {
  const wasActive = hasActiveAutomation();

  if (active) {
    activeAutomation.set(source, label);
  } else {
    activeAutomation.delete(source);
  }

  const isActive = hasActiveAutomation();
  if (!isActive) {
    dismissedForCurrentRun = false;
    unlockScreen();
    return;
  }

  updateActivityLabel();

  // A manual unlock lasts until the current automatic run ends. Starting a
  // new run enables the lock again without changing the saved preference.
  if (!wasActive) dismissedForCurrentRun = false;
  if (isScreenLockEnabled() && !dismissedForCurrentRun) lockScreen();
}

export function initScreenLock() {
  if (initialized) return;
  initialized = true;
  injectStyles();
  createOverlay();

  document.addEventListener('gamenotification', showLockScreenNotification);

  window.addEventListener('routechange', event => {
    const path = event.detail?.path;
    if (path !== '/battle') activeAutomation.delete('battle');
    if (path !== '/fishing') activeAutomation.delete('fishing');
    if (!hasActiveAutomation()) {
      dismissedForCurrentRun = false;
      unlockScreen();
    } else {
      updateActivityLabel();
    }
  });
}

function hasActiveAutomation() {
  return activeAutomation.size > 0;
}

function currentActivityLabel() {
  const labels = [...activeAutomation.values()].filter(Boolean);
  return labels[0] || '自動プレイ中';
}

function updateActivityLabel() {
  if (activityLabel) activityLabel.textContent = currentActivityLabel();
}

function lockScreen() {
  if (!overlay) createOverlay();
  updateActivityLabel();
  if (locked) return;

  locked = true;
  resetSlider(false);
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  document.getElementById('app')?.setAttribute('inert', '');
  document.body.classList.add('screen-lock-active');
  sliderThumb?.focus({ preventScroll: true });
  document.dispatchEvent(new CustomEvent('screenlockchange', { detail: { locked: true } }));
}

function unlockScreen() {
  if (!locked) return;

  locked = false;
  overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true');
  document.getElementById('app')?.removeAttribute('inert');
  document.body.classList.remove('screen-lock-active');
  resetSlider(false);
  clearLockScreenNotifications();
  document.dispatchEvent(new CustomEvent('screenlockchange', { detail: { locked: false } }));
}

function showLockScreenNotification(event) {
  if (!locked || !notificationRegion) return;

  const title = String(event.detail?.title || 'イベント通知');
  const body = String(event.detail?.body || '');
  const key = event.detail?.tag || Symbol('screen-lock-notification');

  removeLockScreenNotification(key);
  while (lockNotifications.size >= 3) {
    removeLockScreenNotification(lockNotifications.keys().next().value);
  }

  const item = document.createElement('div');
  item.className = 'screen-lock__notification';

  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined screen-lock__notification-icon';
  icon.textContent = 'notifications_active';

  const content = document.createElement('div');
  content.className = 'screen-lock__notification-content';

  const titleElement = document.createElement('div');
  titleElement.className = 'screen-lock__notification-title';
  titleElement.textContent = title;

  const bodyElement = document.createElement('div');
  bodyElement.className = 'screen-lock__notification-body';
  bodyElement.textContent = body;

  content.append(titleElement, bodyElement);
  item.append(icon, content);
  notificationRegion.appendChild(item);

  const timeoutId = window.setTimeout(() => removeLockScreenNotification(key), 6000);
  lockNotifications.set(key, { item, timeoutId });
}

function removeLockScreenNotification(key) {
  const notification = lockNotifications.get(key);
  if (!notification) return;
  window.clearTimeout(notification.timeoutId);
  notification.item.remove();
  lockNotifications.delete(key);
}

function clearLockScreenNotifications() {
  for (const key of [...lockNotifications.keys()]) removeLockScreenNotification(key);
}

function dismissLock() {
  dismissedForCurrentRun = true;
  unlockScreen();
}

function createOverlay() {
  if (overlay || !document.body) return;

  overlay = document.createElement('div');
  overlay.id = 'game-screen-lock';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '画面ロック');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <div class="screen-lock__status" aria-live="polite">
      <span class="material-symbols-outlined screen-lock__lock-icon">lock</span>
      <div class="screen-lock__title">画面ロック中</div>
      <div class="screen-lock__activity">自動プレイ中</div>
      <div class="screen-lock__saving">
        <span class="material-symbols-outlined">eco</span>
        省エネ表示で動作しています
      </div>
      <div class="screen-lock__notifications" aria-live="polite" aria-label="イベント通知"></div>
    </div>
    <div class="screen-lock__unlock-area">
      <div class="screen-lock__instruction">右へスライドしてロック解除</div>
      <div class="screen-lock__track">
        <div class="screen-lock__fill"></div>
        <div class="screen-lock__track-label" aria-hidden="true">slide to unlock</div>
        <button type="button" class="screen-lock__thumb" aria-label="右へスライドして画面ロックを解除">
          <span class="material-symbols-outlined">keyboard_double_arrow_right</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  sliderTrack = overlay.querySelector('.screen-lock__track');
  sliderThumb = overlay.querySelector('.screen-lock__thumb');
  sliderFill = overlay.querySelector('.screen-lock__fill');
  activityLabel = overlay.querySelector('.screen-lock__activity');
  notificationRegion = overlay.querySelector('.screen-lock__notifications');

  overlay.addEventListener('contextmenu', event => event.preventDefault());
  overlay.addEventListener('touchmove', event => event.preventDefault(), { passive: false });
  sliderThumb.addEventListener('pointerdown', beginDrag);
  sliderThumb.addEventListener('pointermove', continueDrag);
  sliderThumb.addEventListener('pointerup', finishDrag);
  sliderThumb.addEventListener('pointercancel', cancelDrag);
  sliderThumb.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      dismissLock();
    }
  });
}

function maxDragOffset() {
  if (!sliderTrack || !sliderThumb) return 0;
  const trackStyle = getComputedStyle(sliderTrack);
  const inset = parseFloat(trackStyle.paddingLeft) || 0;
  return Math.max(0, sliderTrack.clientWidth - sliderThumb.offsetWidth - inset * 2);
}

function beginDrag(event) {
  if (!locked || event.button !== 0) return;
  pointerId = event.pointerId;
  dragStartX = event.clientX;
  dragStartOffset = dragOffset;
  sliderThumb.setPointerCapture(pointerId);
  sliderThumb.classList.add('is-dragging');
  event.preventDefault();
}

function continueDrag(event) {
  if (event.pointerId !== pointerId) return;
  const maxOffset = maxDragOffset();
  dragOffset = Math.max(0, Math.min(maxOffset, dragStartOffset + event.clientX - dragStartX));
  paintSlider(maxOffset);
  event.preventDefault();
}

function finishDrag(event) {
  if (event.pointerId !== pointerId) return;
  const maxOffset = maxDragOffset();
  const completed = maxOffset > 0 && dragOffset >= maxOffset * 0.82;
  pointerId = null;
  sliderThumb.classList.remove('is-dragging');
  if (completed) {
    dismissLock();
  } else {
    resetSlider(true);
  }
}

function cancelDrag(event) {
  if (event.pointerId !== pointerId) return;
  pointerId = null;
  sliderThumb.classList.remove('is-dragging');
  resetSlider(true);
}

function paintSlider(maxOffset = maxDragOffset()) {
  const progress = maxOffset > 0 ? dragOffset / maxOffset : 0;
  sliderThumb.style.transform = `translate3d(${dragOffset}px, 0, 0)`;
  sliderFill.style.width = `${Math.max(0, Math.min(100, progress * 100))}%`;
}

function resetSlider(animate) {
  if (!sliderThumb || !sliderFill) return;
  pointerId = null;
  sliderThumb.classList.toggle('is-resetting', animate);
  sliderFill.classList.toggle('is-resetting', animate);
  dragOffset = 0;
  paintSlider(0);
  if (animate) {
    window.setTimeout(() => {
      sliderThumb?.classList.remove('is-resetting');
      sliderFill?.classList.remove('is-resetting');
    }, 240);
  }
}

function injectStyles() {
  if (document.getElementById('screen-lock-styles')) return;
  const style = document.createElement('style');
  style.id = 'screen-lock-styles';
  style.textContent = `
    body.screen-lock-active {
      overflow: hidden !important;
      overscroll-behavior: none;
    }
    body.screen-lock-active #app *,
    body.screen-lock-active #battle-effects-layer *,
    body.screen-lock-active #battle-popup-layer * {
      animation-play-state: paused !important;
      transition: none !important;
    }
    #game-screen-lock[hidden] { display: none !important; }
    #game-screen-lock {
      position: fixed;
      inset: 0;
      z-index: 100000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: max(56px, env(safe-area-inset-top)) 22px max(34px, env(safe-area-inset-bottom));
      color: #9ca3af;
      background: #020305;
      font-family: 'DotGothic16', system-ui, sans-serif;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      touch-action: none;
      cursor: default;
    }
    .screen-lock__status {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: min(18vh, 130px);
      text-align: center;
    }
    .screen-lock__lock-icon {
      margin-bottom: 12px;
      color: #64748b;
      font-size: 30px;
      font-variation-settings: 'FILL' 1;
    }
    .screen-lock__title {
      color: #cbd5e1;
      font-size: 17px;
      font-weight: 700;
      letter-spacing: .14em;
    }
    .screen-lock__activity {
      margin-top: 7px;
      color: #64748b;
      font-size: 11px;
      font-weight: 700;
    }
    .screen-lock__saving {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 18px;
      color: #334155;
      font-size: 9px;
    }
    .screen-lock__saving .material-symbols-outlined { font-size: 14px; }
    .screen-lock__notifications {
      display: flex;
      width: min(calc(100vw - 44px), 360px);
      flex-direction: column;
      gap: 7px;
      margin-top: 18px;
    }
    .screen-lock__notification {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      padding: 10px 12px;
      border: 1px solid rgba(34, 211, 238, .22);
      border-radius: 12px;
      text-align: left;
      background: rgba(8, 19, 27, .94);
      box-shadow: 0 8px 28px rgba(0, 0, 0, .38), inset 0 1px rgba(255, 255, 255, .025);
      animation: screen-lock-notification-in .24s ease-out;
    }
    .screen-lock__notification-icon {
      flex: 0 0 auto;
      color: #22d3ee;
      font-size: 19px;
      font-variation-settings: 'FILL' 1;
    }
    .screen-lock__notification-content { min-width: 0; }
    .screen-lock__notification-title {
      color: #cffafe;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .04em;
    }
    .screen-lock__notification-body {
      margin-top: 3px;
      overflow-wrap: anywhere;
      color: #94a3b8;
      font-family: system-ui, sans-serif;
      font-size: 10px;
      line-height: 1.45;
    }
    @keyframes screen-lock-notification-in {
      from { opacity: 0; transform: translateY(-7px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .screen-lock__unlock-area {
      width: min(100%, 330px);
    }
    .screen-lock__instruction {
      margin-bottom: 10px;
      color: #475569;
      font-size: 9px;
      text-align: center;
    }
    .screen-lock__track {
      position: relative;
      height: 62px;
      overflow: hidden;
      padding: 5px;
      border: 1px solid #222a35;
      border-radius: 13px;
      background: #0a0d12;
      box-shadow: inset 0 1px 5px rgba(0, 0, 0, .9);
    }
    .screen-lock__fill {
      position: absolute;
      inset: 5px auto 5px 5px;
      width: 0;
      border-radius: 9px;
      background: #111923;
    }
    .screen-lock__track-label {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-left: 48px;
      color: #3f4a59;
      font-family: system-ui, sans-serif;
      font-size: 15px;
      font-weight: 400;
      letter-spacing: .03em;
    }
    .screen-lock__thumb {
      position: relative;
      z-index: 2;
      display: flex;
      width: 50px;
      height: 50px;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 1px solid #77808d;
      border-radius: 9px;
      color: #26303c;
      background: linear-gradient(#e8eaed, #9ba2ab);
      box-shadow: 0 1px 2px rgba(255, 255, 255, .45) inset, 0 1px 4px rgba(0, 0, 0, .8);
      touch-action: none;
    }
    .screen-lock__thumb .material-symbols-outlined {
      color: #34404e;
      font-size: 27px;
      font-weight: 700;
    }
    .screen-lock__thumb.is-dragging { background: linear-gradient(#f3f4f6, #b7bdc5); }
    .screen-lock__thumb.is-resetting,
    .screen-lock__fill.is-resetting { transition: transform .22s ease-out, width .22s ease-out !important; }
    @media (max-height: 520px) {
      .screen-lock__status { margin-top: 20px; }
      .screen-lock__saving { margin-top: 10px; }
      .screen-lock__notifications { margin-top: 9px; }
      .screen-lock__notification { padding: 7px 9px; }
    }
  `;
  document.head.appendChild(style);
}
