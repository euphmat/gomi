/**
 * battle-controls.js
 * 戦闘画面から、戦闘に関係する設定を即時変更するコントロールタブ。
 */

import { areSoundEffectsEnabled, setSoundEffectsEnabled } from '../../utils/sound-effects.js';

const SPEED_OPTIONS = [1, 2, 3, 4, 5];

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
      <span class="material-symbols-outlined flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${TONE_CLASSES[setting.tone]}" style="font-size: 17px; font-variation-settings: 'FILL' ${enabled ? 1 : 0}">${setting.icon}</span>
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
  const icon = button.querySelector('.material-symbols-outlined');
  if (icon) icon.style.fontVariationSettings = `'FILL' ${enabled ? 1 : 0}`;
}

export function renderBattleControlsTab(container) {
  const speed = getBattleSpeed();
  container.innerHTML = `
    <div class="battle-controls-root mx-auto flex h-full w-full max-w-2xl flex-col gap-2 overflow-y-auto p-0.5">
      <section class="rounded-xl border border-amber-300/20 bg-gradient-to-r from-amber-950/45 to-slate-950/50 px-2.5 py-2 shadow-sm" aria-labelledby="battle-control-speed-label">
        <div class="mb-1.5 flex items-center gap-2">
          <span class="material-symbols-outlined flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-400/10 text-amber-300" style="font-size: 18px">speed</span>
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

      <section class="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2" aria-label="戦闘設定">
        ${CONTROL_SETTINGS.map(renderSettingButton).join('')}
      </section>
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
}
