/**
 * battle-controls.js
 * 戦闘画面から、戦闘に関係する設定を即時変更するコントロールタブ。
 */

import { areSoundEffectsEnabled, setSoundEffectsEnabled } from '../../utils/sound-effects.js';
import { activateScreenLock } from '../../utils/screen-lock.js';
import { MONSTERS } from '../../definitions/monsters.js';

const SPEED_OPTIONS = [1, 2, 3, 4, 5];
const MONSTERS_BY_ID = new Map(MONSTERS.map(monster => [monster.id, monster]));

const CONTROL_SETTINGS = [
  {
    id: 'animations',
    label: 'アニメーション',
    description: '戦闘演出を表示',
    icon: 'animation',
    tone: 'purple',
    isEnabled: () => localStorage.getItem('disableBattleAnimations') !== 'true',
    setEnabled: enabled => localStorage.setItem('disableBattleAnimations', String(!enabled)),
  },
  {
    id: 'stats',
    label: 'ステータス表示',
    description: 'ATK・DEFなどを表示',
    icon: 'visibility',
    tone: 'blue',
    isEnabled: () => localStorage.getItem('hideBattleStats') === 'false',
    setEnabled: enabled => localStorage.setItem('hideBattleStats', String(!enabled)),
  },
  {
    id: 'continue',
    label: '全滅後も継続',
    description: '費用を払い周回へ復帰',
    icon: 'heart_plus',
    tone: 'rose',
    isEnabled: () => localStorage.getItem('continueOnDeath') === 'true',
    setEnabled: enabled => localStorage.setItem('continueOnDeath', String(enabled)),
  },
  {
    id: 'sound',
    label: '効果音',
    description: '戦闘・操作音を再生',
    icon: 'volume_up',
    tone: 'orange',
    isEnabled: areSoundEffectsEnabled,
    setEnabled: enabled => setSoundEffectsEnabled(enabled, { preview: true }),
  },
];

const TONE_CLASSES = {
  purple: 'border-purple-400/20 bg-purple-500/10 text-purple-300',
  blue: 'border-blue-400/20 bg-blue-500/10 text-blue-300',
  rose: 'border-rose-400/20 bg-rose-500/10 text-rose-300',
  orange: 'border-orange-400/20 bg-orange-500/10 text-orange-300',
};

function getBattleSpeed() {
  const stored = Number.parseInt(localStorage.getItem('autoBattleSpeed') || '1', 10);
  return SPEED_OPTIONS.includes(stored) ? stored : 1;
}

function dispatchBattleSettingsChanged() {
  window.dispatchEvent(new Event('settingsChanged'));
}

function updateStatsVisibility() {
  const hidden = localStorage.getItem('hideBattleStats') !== 'false';
  document.querySelectorAll('.battle-stats-container').forEach(element => {
    element.classList.toggle('hidden', hidden);
  });
}

function renderSettingButton(setting) {
  const enabled = setting.isEnabled();
  return `
    <button type="button" data-battle-control-setting="${setting.id}"
            aria-pressed="${enabled}"
            class="battle-control-setting flex min-h-[54px] min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-slate-950/45 px-2 py-1.5 text-left shadow-sm transition active:scale-[0.98] active:bg-slate-800/70">
      <span class="battle-control-icon h-8 w-8 shrink-0 rounded-lg border ${TONE_CLASSES[setting.tone]}" style="display: grid; place-items: center">
        <span class="material-symbols-outlined block leading-none" style="font-size: 17px; font-variation-settings: 'FILL' ${enabled ? 1 : 0}">${setting.icon}</span>
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-[10px] font-black text-slate-100">${setting.label}</span>
        <span class="block truncate text-[8px] font-bold text-slate-500">${setting.description}</span>
      </span>
      <span aria-hidden="true" class="setting-toggle ${enabled ? 'active' : ''}" style="--toggle-color: rgb(var(--battle-palette-3)); --toggle-glow: rgb(var(--battle-palette-3) / .35)"></span>
    </button>
  `;
}

function syncSettingButton(button, setting) {
  const enabled = setting.isEnabled();
  button.setAttribute('aria-pressed', String(enabled));
  const toggle = button.querySelector('.setting-toggle');
  toggle?.classList.toggle('active', enabled);
  const icon = button.querySelector('.battle-control-icon .material-symbols-outlined');
  if (icon) icon.style.fontVariationSettings = `'FILL' ${enabled ? 1 : 0}`;
}

function getFloorMonsterIds(floor) {
  const monsterIds = new Set();
  for (const encounter of floor?.monsters || []) {
    if (typeof encounter === 'string') {
      monsterIds.add(encounter);
    } else if (Array.isArray(encounter?.members)) {
      encounter.members.forEach(member => {
        if (member?.id && Number(member.count ?? 1) > 0) monsterIds.add(member.id);
      });
    } else if (encounter?.id) {
      if (Number(encounter.count ?? 1) > 0) monsterIds.add(encounter.id);
    } else {
      Object.entries(encounter || {}).forEach(([monsterId, count]) => {
        if (monsterId !== 'weight' && Number(count) > 0) monsterIds.add(monsterId);
      });
    }
  }
  return [...monsterIds];
}

function getOwnedMonsterState(ranches, monsterId) {
  return {
    companion: ranches.some(ranch => Boolean(ranch?.[monsterId])),
    legendary: ranches.some(ranch => Boolean(ranch?.[`${monsterId}_legendary`])),
  };
}

function getFloorJumpButtonClass(isCurrentFloor) {
  return `group flex min-h-[46px] min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition ${isCurrentFloor
    ? 'border-cyan-300/50 bg-cyan-400/15 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.12)]'
    : 'border-white/10 bg-slate-950/55 text-slate-300 active:scale-[0.97] active:border-cyan-300/45 active:bg-cyan-950/60'}`;
}

function getFloorJumpBadgeClass(isCurrentFloor) {
  return `flex h-8 w-10 shrink-0 flex-col items-center justify-center rounded-md border ${isCurrentFloor
    ? 'border-cyan-300/35 bg-cyan-400/10'
    : 'border-slate-700 bg-slate-900'}`;
}

function getFloorJumpActionClass(isCurrentFloor, isBossFloor) {
  return `flex w-7 shrink-0 flex-col items-center text-[7px] font-black ${isCurrentFloor
    ? 'text-cyan-300'
    : isBossFloor ? 'text-amber-300' : 'text-slate-500'}`;
}

export function syncBattleControlsFloor(container, currentFloorNum) {
  const section = container.querySelector('[data-battle-floor-jump-section]');
  if (!section || section.dataset.currentFloor === String(currentFloorNum)) return;
  section.dataset.currentFloor = String(currentFloorNum);

  section.querySelectorAll('[data-battle-floor-jump]').forEach(button => {
    const floorLevel = Number(button.dataset.battleFloorJump);
    const isBossFloor = button.dataset.battleFloorBoss === 'true';
    const isCurrentFloor = floorLevel === Number(currentFloorNum);
    button.disabled = isCurrentFloor;
    button.className = getFloorJumpButtonClass(isCurrentFloor);
    button.setAttribute('aria-label', isCurrentFloor
      ? `${floorLevel}階（現在地）`
      : `${floorLevel}階へジャンプ${isBossFloor ? '（最深部）' : ''}`);
    if (isCurrentFloor) button.setAttribute('aria-current', 'location');
    else button.removeAttribute('aria-current');

    const badge = button.querySelector('[data-battle-floor-badge]');
    if (badge) badge.className = getFloorJumpBadgeClass(isCurrentFloor);
    const action = button.querySelector('[data-battle-floor-action]');
    if (action) action.className = getFloorJumpActionClass(isCurrentFloor, isBossFloor);
    const actionIcon = button.querySelector('[data-battle-floor-action-icon]');
    if (actionIcon) actionIcon.textContent = isCurrentFloor ? 'location_on' : 'login';
    const actionLabel = button.querySelector('[data-battle-floor-action-label]');
    if (actionLabel) actionLabel.textContent = isCurrentFloor ? '現在地' : 'GO';
  });

  const status = section.querySelector('[data-battle-floor-jump-status]');
  if (status) status.textContent = '現在の戦闘を中断して選択階へ移動します';
}

function renderFloorJumpSection({ dungeonDef, currentFloorNum, canJumpFloors, ranchData, playerMedals }) {
  if (!canJumpFloors || !dungeonDef?.floors?.length) return '';
  const ranches = Object.values(ranchData || {});
  const ownedMonsterStates = new Map();
  const getOwnedState = monsterId => {
    if (!ownedMonsterStates.has(monsterId)) {
      ownedMonsterStates.set(monsterId, getOwnedMonsterState(ranches, monsterId));
    }
    return ownedMonsterStates.get(monsterId);
  };

  const floorButtons = dungeonDef.floors.map((floor, index) => {
    const floorLevel = Number(floor.level);
    const isCurrentFloor = floorLevel === Number(currentFloorNum);
    const isBossFloor = index === dungeonDef.floors.length - 1;
    const monsterIds = getFloorMonsterIds(floor);
    const floorMonsters = monsterIds.map(monsterId => {
      const monster = MONSTERS_BY_ID.get(monsterId);
      const image = monster?.image || `./assets/monster/${monsterId}.webp`;
      const owned = getOwnedState(monsterId);
      const hasMedal = Object.prototype.hasOwnProperty.call(playerMedals || {}, monsterId);
      return `
        <span class="w-7 shrink-0" title="${monster?.name || monsterId}｜仲間: ${owned.companion ? '獲得済み' : '未獲得'}・伝説: ${owned.legendary ? '獲得済み' : '未獲得'}・メダル: ${hasMedal ? '獲得済み' : '未獲得'}">
          <span class="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-black/35 p-0.5"><img src="${image}" alt="" class="h-full w-full object-contain" loading="lazy"></span>
          <span class="mt-0.5 grid grid-cols-3 gap-px px-px">
            <span class="h-[2px] rounded-full ${owned.companion ? 'bg-emerald-300' : 'bg-slate-700'}"></span>
            <span class="h-[2px] rounded-full ${owned.legendary ? 'bg-amber-300' : 'bg-slate-700'}"></span>
            <span class="h-[2px] rounded-full ${hasMedal ? 'bg-cyan-300' : 'bg-slate-700'}"></span>
          </span>
        </span>`;
    }).join('');
    return `
      <button type="button" data-battle-floor-jump="${floorLevel}" data-battle-floor-boss="${isBossFloor}"
              ${isCurrentFloor ? 'disabled aria-current="location"' : ''}
              aria-label="${isCurrentFloor ? `${floorLevel}階（現在地）` : `${floorLevel}階へジャンプ${isBossFloor ? '（最深部）' : ''}`}"
              class="${getFloorJumpButtonClass(isCurrentFloor)}">
        <span data-battle-floor-badge class="${getFloorJumpBadgeClass(isCurrentFloor)}">
          <span class="material-symbols-outlined leading-none ${isBossFloor ? 'text-amber-300' : ''}" style="font-size: 11px">${isBossFloor ? 'skull' : 'layers'}</span>
          <span class="text-[9px] font-black leading-none tabular-nums">${String(floorLevel).padStart(2, '0')}F</span>
        </span>
        <span class="flex min-w-0 flex-1 flex-wrap items-center gap-1" aria-hidden="true">
          ${floorMonsters || '<span class="truncate text-[7px] font-bold text-slate-600">敵情報なし</span>'}
        </span>
        <span data-battle-floor-action class="${getFloorJumpActionClass(isCurrentFloor, isBossFloor)}" aria-hidden="true">
          <span data-battle-floor-action-icon class="material-symbols-outlined leading-none" style="font-size: 14px">${isCurrentFloor ? 'location_on' : 'login'}</span>
          <span data-battle-floor-action-label>${isCurrentFloor ? '現在地' : 'GO'}</span>
        </span>
      </button>`;
  }).join('');

  return `
    <section data-battle-floor-jump-section data-current-floor="${Number(currentFloorNum)}" class="rounded-xl border border-cyan-300/20 bg-gradient-to-r from-cyan-950/35 to-slate-950/50 p-2 shadow-sm" aria-labelledby="battle-floor-jump-label">
      <div class="mb-2 flex items-center gap-2 px-0.5">
        <span class="battle-control-icon h-8 w-8 shrink-0 rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-300" style="display: grid; place-items: center">
          <span class="material-symbols-outlined block leading-none" style="font-size: 18px">route</span>
        </span>
        <span class="min-w-0 flex-1">
          <span id="battle-floor-jump-label" class="block text-[11px] font-black text-slate-100">階層ジャンプ</span>
          <span class="block truncate text-[8px] font-bold text-slate-500">踏破済み｜移動先を選択</span>
        </span>
        <span class="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 text-[7px] font-black text-amber-200">COMPLETE</span>
      </div>
      <div class="grid grid-cols-1 gap-1.5 min-[540px]:grid-cols-2" aria-label="ジャンプ先の階層">
        ${floorButtons}
      </div>
      <p class="mt-1.5 min-h-[12px] px-0.5 text-[8px] font-bold text-cyan-200/70" data-battle-floor-jump-status aria-live="polite">現在の戦闘を中断して選択階へ移動します</p>
    </section>`;
}

export function renderBattleControlsTab(container, battleContext = {}) {
  const speed = getBattleSpeed();
  container.innerHTML = `
    <div class="battle-controls-root mx-auto flex h-full w-full max-w-2xl flex-col gap-2 overflow-y-auto p-0.5">
      <section class="rounded-xl border border-amber-300/20 bg-gradient-to-r from-amber-950/45 to-slate-950/50 px-2.5 py-2 shadow-sm" aria-labelledby="battle-control-speed-label">
        <div class="mb-1.5 flex items-center gap-2">
          <span class="battle-control-icon h-8 w-8 shrink-0 rounded-lg border border-amber-300/20 bg-amber-400/10 text-amber-300" style="display: grid; place-items: center">
            <span class="material-symbols-outlined block leading-none" style="font-size: 18px">speed</span>
          </span>
          <span class="min-w-0 flex-1">
            <span id="battle-control-speed-label" class="block text-[11px] font-black text-slate-100">戦闘速度</span>
            <span class="block text-[8px] font-bold text-slate-500">変更は進行中の戦闘へすぐに反映されます</span>
          </span>
          <span class="rounded-lg border border-amber-300/20 bg-amber-400/10 px-2 py-0.5 text-sm font-black text-amber-300"><span data-battle-control-speed-value>${speed}</span><span class="ml-0.5 text-[9px]">×</span></span>
        </div>
        <input type="range" min="1" max="5" step="1" value="${speed}"
               aria-labelledby="battle-control-speed-label" data-battle-control-speed class="setting-slider">
        <div class="mt-1 flex justify-between px-0.5 text-[8px] font-black text-slate-500" aria-hidden="true">
          ${SPEED_OPTIONS.map(value => `<span data-battle-control-speed-step="${value}" class="${value <= speed ? 'text-amber-300' : ''}">${value === 1 ? '等倍' : `${value}x`}</span>`).join('')}
        </div>
      </section>

      <button type="button" data-battle-screen-lock
              class="flex min-h-[54px] w-full items-center gap-2 rounded-xl border border-emerald-300/25 bg-gradient-to-r from-emerald-950/55 to-slate-950/50 px-2.5 py-1.5 text-left shadow-sm transition active:scale-[0.99] active:border-emerald-300/45 active:bg-emerald-900/40">
        <span class="battle-control-icon h-8 w-8 shrink-0 rounded-lg border border-emerald-300/20 bg-emerald-400/10 text-emerald-300" style="display: grid; place-items: center">
          <span class="material-symbols-outlined block leading-none" style="font-size: 18px; font-variation-settings: 'FILL' 1">screen_lock_portrait</span>
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-[10px] font-black text-emerald-100">画面ロック</span>
          <span class="block truncate text-[8px] font-bold text-emerald-200/55">省エネ表示で誤操作を防止</span>
        </span>
        <span class="flex shrink-0 items-center gap-0.5 rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[9px] font-black text-emerald-300">
          <span class="material-symbols-outlined leading-none" style="font-size: 13px">lock</span>ロック
        </span>
      </button>

      <section class="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2" aria-label="戦闘設定">
        ${CONTROL_SETTINGS.map(renderSettingButton).join('')}
      </section>

      ${renderFloorJumpSection(battleContext)}
    </div>
  `;

  const speedSlider = container.querySelector('[data-battle-control-speed]');
  const speedValue = container.querySelector('[data-battle-control-speed-value]');
  const speedSteps = container.querySelectorAll('[data-battle-control-speed-step]');
  speedSlider?.addEventListener('input', event => {
    const nextSpeed = Number.parseInt(event.currentTarget.value, 10);
    localStorage.setItem('autoBattleSpeed', String(nextSpeed));
    if (speedValue) speedValue.textContent = String(nextSpeed);
    speedSteps.forEach(step => {
      step.classList.toggle('text-amber-300', Number.parseInt(step.dataset.battleControlSpeedStep, 10) <= nextSpeed);
    });
    dispatchBattleSettingsChanged();
  });

  container.querySelector('[data-battle-screen-lock]')?.addEventListener('click', activateScreenLock);

  container.querySelectorAll('[data-battle-control-setting]').forEach(button => {
    const setting = CONTROL_SETTINGS.find(item => item.id === button.dataset.battleControlSetting);
    if (!setting) return;
    button.addEventListener('click', () => {
      setting.setEnabled(!setting.isEnabled());
      if (setting.id === 'stats') updateStatsVisibility();
      syncSettingButton(button, setting);
      dispatchBattleSettingsChanged();
    });
  });

  const floorJumpStatus = container.querySelector('[data-battle-floor-jump-status]');
  container.querySelectorAll('[data-battle-floor-jump]').forEach(button => {
    button.addEventListener('click', async () => {
      if (typeof battleContext.onFloorJump !== 'function') return;
      const targetFloor = Number(button.dataset.battleFloorJump);
      const jumpButtons = container.querySelectorAll('[data-battle-floor-jump]');
      const restoreJumpButtons = () => {
        jumpButtons.forEach(item => {
          item.disabled = item.hasAttribute('aria-current');
        });
      };
      jumpButtons.forEach(item => { item.disabled = true; });
      if (floorJumpStatus) floorJumpStatus.textContent = `${targetFloor}Fへ移動しています…`;
      try {
        const didJump = await battleContext.onFloorJump(targetFloor);
        if (!didJump) {
          if (floorJumpStatus) floorJumpStatus.textContent = 'この階層には移動できません';
          restoreJumpButtons();
        }
      } catch (error) {
        console.error('Battle floor jump failed:', error);
        if (floorJumpStatus) floorJumpStatus.textContent = '移動に失敗しました。もう一度お試しください';
        restoreJumpButtons();
      }
    });
  });
}
