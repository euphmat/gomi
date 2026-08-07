let initialized = false;
let locked = false;
let overlay = null;
let sliderThumb = null;
let sliderTrack = null;
let sliderFill = null;
let lockElements = null;
let renderedCompanionSignature = '';
let pointerId = null;
let dragStartX = 0;
let dragStartOffset = 0;
let dragOffset = 0;
let activityRenderTimer = null;

const LOCK_ACTIVITY_RENDER_INTERVAL = 1000;

const ACTIVITY_DEFAULTS = {
  battle: { active: false, mode: 'none' },
  fishing: { active: false, mode: 'auto' },
};

const lockActivity = {
  battle: { ...ACTIVITY_DEFAULTS.battle },
  fishing: { ...ACTIVITY_DEFAULTS.fishing },
  results: {
    defeated: 0,
    fish: 0,
    materials: 0,
    loot: 0,
    gold: 0,
    exp: 0,
  },
  companions: [],
};

export function isScreenLocked() {
  return locked;
}

export function setLockScreenActivity(type, active, options = {}) {
  if (!Object.prototype.hasOwnProperty.call(ACTIVITY_DEFAULTS, type)) return;

  const wasActive = lockActivity[type].active;
  const shouldReset = Boolean(active) && (options.reset === true || !wasActive);
  lockActivity[type] = {
    ...lockActivity[type],
    active: Boolean(active),
    mode: options.mode || lockActivity[type].mode,
  };

  if (active) {
    for (const otherType of Object.keys(ACTIVITY_DEFAULTS)) {
      if (otherType !== type) lockActivity[otherType].active = false;
    }
  }

  if (shouldReset) {
    for (const key of Object.keys(lockActivity.results)) lockActivity.results[key] = 0;
    lockActivity.companions = [];
  }
  requestLockScreenActivityRender();
}

export function recordLockScreenProgress(type, progress = {}) {
  if (!lockActivity[type]?.active) return;
  for (const key of Object.keys(lockActivity.results)) {
    const amount = Number(progress[key]);
    if (Number.isFinite(amount) && amount > 0) lockActivity.results[key] += amount;
  }
  requestLockScreenActivityRender();
}

export function addLockScreenCompanion(monster) {
  if (!lockActivity.battle.active || !monster) return;
  const id = String(monster.id || monster.name || 'monster');
  if (lockActivity.companions.some(item => item.id === id)) return;
  lockActivity.companions.unshift({
    id,
    name: String(monster.name || 'モンスター'),
    image: String(monster.image || ''),
  });
  lockActivity.companions = lockActivity.companions.slice(0, 5);
  requestLockScreenActivityRender();
}

export function activateScreenLock() {
  if (!overlay) createOverlay();
  if (locked) return;

  locked = true;
  resetSlider(false);
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  document.getElementById('app')?.setAttribute('inert', '');
  document.body.classList.add('screen-lock-active');
  finishActiveBattleEffects();
  requestLockScreenActivityRender(true);
  sliderThumb?.focus({ preventScroll: true });
  document.dispatchEvent(new CustomEvent('screenlockchange', { detail: { locked: true } }));
}

export function initScreenLock() {
  if (initialized) return;
  initialized = true;
  localStorage.removeItem('screenLockEnabled');
  injectStyles();
  createOverlay();
}

function unlockScreen() {
  if (!locked) return;

  locked = false;
  overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true');
  document.getElementById('app')?.removeAttribute('inert');
  document.body.classList.remove('screen-lock-active');
  clearTimeout(activityRenderTimer);
  activityRenderTimer = null;
  resetSlider(false);
  document.dispatchEvent(new CustomEvent('screenlockchange', { detail: { locked: false } }));
}

function formatCount(value) {
  return Math.max(0, Number(value) || 0).toLocaleString('ja-JP');
}

function requestLockScreenActivityRender(immediate = false) {
  if (!overlay) return;
  if (immediate) {
    clearTimeout(activityRenderTimer);
    activityRenderTimer = null;
    renderLockScreenActivity();
    return;
  }
  // Hidden overlay content does not need to stay synchronized. Activation
  // performs one immediate render with the latest accumulated state.
  if (!locked || activityRenderTimer != null) return;
  activityRenderTimer = window.setTimeout(() => {
    activityRenderTimer = null;
    if (locked) renderLockScreenActivity();
  }, LOCK_ACTIVITY_RENDER_INTERVAL);
}

function finishActiveBattleEffects() {
  // Effects already in flight when the user locks the screen can otherwise
  // keep compositing behind the black overlay. Finishing them also preserves
  // animation onfinish callbacks that apply damage and advance combat.
  for (const id of ['battle-effects-layer', 'battle-popup-layer']) {
    const layer = document.getElementById(id);
    layer?.getAnimations?.({ subtree: true }).forEach(animation => {
      try {
        animation.finish();
      } catch {
        animation.cancel();
      }
    });
  }
}

function renderLockScreenActivity() {
  if (!overlay) return;

  const modeLabels = {
    floor: '階層周回',
    dungeon: '踏破周回',
    auto: '自動釣り',
  };
  for (const type of ['battle', 'fishing']) {
    const activity = lockActivity[type];
    const row = lockElements?.activities[type]?.row;
    if (!row) continue;
    row.classList.toggle('is-active', activity.active);
    const badge = lockElements.activities[type].badge;
    const badgeText = activity.active ? '稼働中' : '停止中';
    if (badge && badge.textContent !== badgeText) badge.textContent = badgeText;
    const detail = lockElements.activities[type].detail;
    const detailText = activity.active ? (modeLabels[activity.mode] || '有効') : '無効';
    if (detail && detail.textContent !== detailText) detail.textContent = detailText;
  }

  for (const [key, value] of Object.entries(lockActivity.results)) {
    const target = lockElements?.results[key];
    const nextText = formatCount(value);
    if (target && target.textContent !== nextText) target.textContent = nextText;
  }

  const companionSection = lockElements?.companionSection;
  const companionList = lockElements?.companionList;
  if (!companionSection || !companionList) return;
  companionSection.hidden = lockActivity.companions.length === 0;
  const companionSignature = lockActivity.companions.map(monster => `${monster.id}\u0000${monster.name}\u0000${monster.image}`).join('\u0001');
  if (companionSignature === renderedCompanionSignature) return;
  renderedCompanionSignature = companionSignature;
  companionList.replaceChildren(...lockActivity.companions.map(monster => {
    const item = document.createElement('div');
    item.className = 'screen-lock__companion';
    const visual = document.createElement('div');
    visual.className = 'screen-lock__companion-visual';
    if (monster.image) {
      const image = document.createElement('img');
      image.src = monster.image;
      image.alt = '';
      image.addEventListener('error', () => image.remove(), { once: true });
      visual.appendChild(image);
    }
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = 'pets';
    visual.prepend(icon);
    const name = document.createElement('div');
    name.className = 'screen-lock__companion-name';
    name.textContent = monster.name;
    item.append(visual, name);
    return item;
  }));
}

function dismissLock() {
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
      <div class="screen-lock__activity">タッチ操作を無効化しています</div>
      <div class="screen-lock__saving">
        <span class="material-symbols-outlined">eco</span>
        省エネ表示で動作しています
      </div>
      <div class="screen-lock__activity-panel" aria-label="自動機能の稼働状況">
        <div class="screen-lock__panel-label">AUTO STATUS</div>
        <div class="screen-lock__activity-list">
          <div class="screen-lock__activity-row" data-lock-activity="battle">
            <span class="material-symbols-outlined">swords</span>
            <span class="screen-lock__activity-name">自動戦闘</span>
            <span class="screen-lock__activity-detail" data-lock-activity-detail>無効</span>
            <span class="screen-lock__activity-badge" data-lock-activity-state>停止中</span>
          </div>
          <div class="screen-lock__activity-row" data-lock-activity="fishing">
            <span class="material-symbols-outlined">phishing</span>
            <span class="screen-lock__activity-name">自動釣り</span>
            <span class="screen-lock__activity-detail" data-lock-activity-detail>無効</span>
            <span class="screen-lock__activity-badge" data-lock-activity-state>停止中</span>
          </div>
        </div>
      </div>
      <div class="screen-lock__results" aria-label="自動機能の成果">
        <div class="screen-lock__panel-label">SESSION RESULT</div>
        <div class="screen-lock__result-grid">
          <div class="screen-lock__result"><span class="material-symbols-outlined">skull</span><span class="screen-lock__result-label">討伐</span><strong><span data-lock-result="defeated">0</span><small>体</small></strong></div>
          <div class="screen-lock__result"><span class="material-symbols-outlined">set_meal</span><span class="screen-lock__result-label">釣果</span><strong><span data-lock-result="fish">0</span><small>匹</small></strong></div>
          <div class="screen-lock__result"><span class="material-symbols-outlined">category</span><span class="screen-lock__result-label">素材</span><strong><span data-lock-result="materials">0</span><small>個</small></strong></div>
          <div class="screen-lock__result"><span class="material-symbols-outlined">inventory_2</span><span class="screen-lock__result-label">装備・お宝</span><strong><span data-lock-result="loot">0</span><small>個</small></strong></div>
          <div class="screen-lock__result"><span class="material-symbols-outlined">paid</span><span class="screen-lock__result-label">獲得Gold</span><strong><span data-lock-result="gold">0</span><small>G</small></strong></div>
          <div class="screen-lock__result"><span class="material-symbols-outlined">trending_up</span><span class="screen-lock__result-label">獲得EXP</span><strong><span data-lock-result="exp">0</span><small>EXP</small></strong></div>
        </div>
      </div>
      <div class="screen-lock__companions" data-lock-companions hidden>
        <div class="screen-lock__companion-heading"><span class="material-symbols-outlined">favorite</span>新しく仲間になったモンスター</div>
        <div class="screen-lock__companion-list" data-lock-companion-list></div>
      </div>
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
  lockElements = {
    activities: Object.fromEntries(['battle', 'fishing'].map(type => {
      const row = overlay.querySelector(`[data-lock-activity="${type}"]`);
      return [type, {
        row,
        badge: row?.querySelector('[data-lock-activity-state]'),
        detail: row?.querySelector('[data-lock-activity-detail]'),
      }];
    })),
    results: Object.fromEntries(Object.keys(lockActivity.results).map(key => [
      key,
      overlay.querySelector(`[data-lock-result="${key}"]`),
    ])),
    companionSection: overlay.querySelector('[data-lock-companions]'),
    companionList: overlay.querySelector('[data-lock-companion-list]'),
  };
  requestLockScreenActivityRender(true);

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
    body.screen-lock-active #app {
      visibility: hidden !important;
      content-visibility: hidden;
    }
    body.screen-lock-active #battle-effects-layer,
    body.screen-lock-active #battle-popup-layer {
      visibility: hidden !important;
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
      gap: 14px;
      padding: max(24px, env(safe-area-inset-top)) 14px max(18px, env(safe-area-inset-bottom));
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
      width: min(100%, 380px);
      min-height: 0;
      flex-direction: column;
      align-items: center;
      margin-top: 0;
      text-align: center;
    }
    .screen-lock__lock-icon {
      margin-bottom: 5px;
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
      margin-top: 9px;
      color: #334155;
      font-size: 9px;
    }
    .screen-lock__saving .material-symbols-outlined { font-size: 14px; }
    .screen-lock__activity-panel,
    .screen-lock__results,
    .screen-lock__companions {
      width: 100%;
      margin-top: 10px;
      border: 1px solid #17202c;
      border-radius: 13px;
      background: #070a0f;
      box-shadow: inset 0 1px rgba(255, 255, 255, .025);
    }
    .screen-lock__panel-label {
      padding: 6px 9px 4px;
      color: #475569;
      font-family: system-ui, sans-serif;
      font-size: 8px;
      font-weight: 800;
      letter-spacing: .18em;
      text-align: left;
    }
    .screen-lock__activity-list { padding: 0 7px 7px; }
    .screen-lock__activity-row {
      display: grid;
      grid-template-columns: 20px 1fr auto auto;
      gap: 7px;
      align-items: center;
      min-height: 31px;
      padding: 4px 6px;
      border-top: 1px solid #111923;
      text-align: left;
    }
    .screen-lock__activity-row:first-child { border-top: 0; }
    .screen-lock__activity-row > .material-symbols-outlined {
      color: #475569;
      font-size: 17px;
    }
    .screen-lock__activity-name {
      color: #94a3b8;
      font-size: 10px;
      font-weight: 700;
    }
    .screen-lock__activity-detail {
      color: #475569;
      font-size: 8px;
    }
    .screen-lock__activity-badge {
      min-width: 46px;
      padding: 2px 5px;
      border: 1px solid #273244;
      border-radius: 999px;
      color: #64748b;
      background: #0c1119;
      font-size: 8px;
      font-weight: 700;
      text-align: center;
    }
    .screen-lock__activity-row.is-active > .material-symbols-outlined,
    .screen-lock__activity-row.is-active .screen-lock__activity-name { color: #67e8f9; }
    .screen-lock__activity-row.is-active .screen-lock__activity-detail { color: #94a3b8; }
    .screen-lock__activity-row.is-active .screen-lock__activity-badge {
      border-color: rgba(16, 185, 129, .38);
      color: #6ee7b7;
      background: rgba(6, 78, 59, .22);
      box-shadow: 0 0 12px rgba(16, 185, 129, .08);
    }
    .screen-lock__result-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1px;
      overflow: hidden;
      border-top: 1px solid #111923;
      border-radius: 0 0 12px 12px;
      background: #111923;
    }
    .screen-lock__result {
      display: grid;
      grid-template-columns: 16px 1fr;
      align-items: center;
      gap: 1px 4px;
      min-width: 0;
      padding: 7px 6px;
      text-align: left;
      background: #070a0f;
    }
    .screen-lock__result > .material-symbols-outlined {
      grid-row: span 2;
      color: #475569;
      font-size: 15px;
    }
    .screen-lock__result-label {
      overflow: hidden;
      color: #64748b;
      font-size: 7px;
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .screen-lock__result strong {
      overflow: hidden;
      color: #cbd5e1;
      font-family: system-ui, sans-serif;
      font-size: 12px;
      line-height: 1;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .screen-lock__result small {
      margin-left: 2px;
      color: #475569;
      font-size: 7px;
      font-weight: 700;
    }
    .screen-lock__companions[hidden] { display: none; }
    .screen-lock__companion-heading {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 6px 8px 4px;
      color: #f9a8d4;
      font-size: 9px;
      font-weight: 700;
      text-align: left;
    }
    .screen-lock__companion-heading .material-symbols-outlined {
      font-size: 14px;
      font-variation-settings: 'FILL' 1;
    }
    .screen-lock__companion-list {
      display: flex;
      gap: 6px;
      overflow: hidden;
      padding: 2px 7px 7px;
    }
    .screen-lock__companion {
      width: 64px;
      flex: 0 0 auto;
      min-width: 0;
      text-align: center;
    }
    .screen-lock__companion-visual {
      position: relative;
      display: flex;
      height: 43px;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(244, 114, 182, .24);
      border-radius: 9px;
      color: #831843;
      background: rgba(80, 7, 36, .2);
    }
    .screen-lock__companion-visual > .material-symbols-outlined { font-size: 24px; }
    .screen-lock__companion-visual img {
      position: absolute;
      inset: 2px;
      width: calc(100% - 4px);
      height: calc(100% - 4px);
      object-fit: contain;
      filter: drop-shadow(0 3px 4px rgba(0, 0, 0, .8));
    }
    .screen-lock__companion-name {
      margin-top: 3px;
      overflow: hidden;
      color: #cbd5e1;
      font-size: 7px;
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
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
      #game-screen-lock { padding-top: 8px; padding-bottom: 8px; gap: 7px; }
      .screen-lock__lock-icon { display: none; }
      .screen-lock__title { font-size: 13px; }
      .screen-lock__activity { margin-top: 2px; }
      .screen-lock__saving { display: none; }
      .screen-lock__activity-panel,
      .screen-lock__results,
      .screen-lock__companions { margin-top: 5px; }
      .screen-lock__result { padding-top: 4px; padding-bottom: 4px; }
      .screen-lock__companion-visual { height: 32px; }
      .screen-lock__instruction { margin-bottom: 4px; }
      .screen-lock__track { height: 50px; }
      .screen-lock__thumb { width: 38px; height: 38px; }
    }
  `;
  document.head.appendChild(style);
}
