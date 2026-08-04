import { FISHING_SPOTS, FISH_RARITY } from '../definitions/fish.js';
import {
  FISHING_TACKLE,
  FISHING_TACKLE_MAX_LEVEL,
  FISHING_TACKLE_ORDER,
  FISHING_TACKLE_RARITIES,
  FISHING_TACKLE_RECIPES,
  getFishingTackleEffect,
  getFishingTackleVisual,
} from '../definitions/fishing-tackle.js';
import {
  getFishingTackleLevel,
  getFishingTackleUpgradeStatus,
  loadFishingData,
  upgradeFishingTackle,
} from '../data/fishing-manager.js';
import { formatNumber } from '../utils/format.js';

const TACKLE_THEME = {
  rod: {
    border: 'border-cyan-400/30',
    bg: 'from-cyan-950/75 via-slate-950 to-blue-950/55',
    text: 'text-cyan-300',
    button: 'border-cyan-300/45 bg-gradient-to-r from-cyan-700 to-blue-700',
  },
  bait: {
    border: 'border-emerald-400/30',
    bg: 'from-emerald-950/75 via-slate-950 to-teal-950/55',
    text: 'text-emerald-300',
    button: 'border-emerald-300/45 bg-gradient-to-r from-emerald-700 to-teal-700',
  },
  lure: {
    border: 'border-violet-400/30',
    bg: 'from-violet-950/75 via-slate-950 to-fuchsia-950/55',
    text: 'text-violet-300',
    button: 'border-violet-300/45 bg-gradient-to-r from-violet-700 to-fuchsia-700',
  },
};

function tackleImage(definition, visual, imageClass = 'h-full w-full object-contain') {
  return `<span class="material-symbols-outlined absolute text-4xl text-white/20 ${visual ? 'hidden' : ''}">${definition.icon}</span>
    ${visual ? `<img src="${visual.image}" onerror="this.previousElementSibling.classList.remove('hidden');this.remove()" class="relative ${imageClass}" alt="${visual.name}">` : ''}`;
}

export function renderFishingTackleSummary(state) {
  const levels = FISHING_TACKLE_ORDER.map(type => getFishingTackleLevel(state, type));
  const totalLevel = levels.reduce((sum, level) => sum + level, 0);
  return `
    <section class="overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-950/55 via-slate-950 to-violet-950/40 shadow-[0_12px_30px_rgba(0,0,0,.28)]">
      <button onclick="window.openFishingTackleWorkshop()" class="w-full p-2.5 text-left active:scale-[.995]">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-1.5 text-lg text-cyan-300">handyman</span>
            <div><div class="text-xs font-black text-white">釣具工房</div><div class="mt-0.5 text-[8px] text-slate-500">魚を納品して釣具を強化</div></div>
          </div>
          <div class="flex items-center gap-1.5"><span class="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[9px] font-black text-slate-300">合計Lv.${formatNumber(totalLevel)}</span><span class="material-symbols-outlined text-slate-500">chevron_right</span></div>
        </div>
        <div class="mt-2 grid grid-cols-3 gap-1.5">
          ${FISHING_TACKLE_ORDER.map(type => {
            const definition = FISHING_TACKLE[type];
            const level = getFishingTackleLevel(state, type);
            const visual = getFishingTackleVisual(type, level);
            const theme = TACKLE_THEME[type];
            const status = getFishingTackleUpgradeStatus(state, type);
            return `<div class="relative flex min-w-0 items-center gap-1.5 rounded-lg border p-1.5 ${status?.canUpgrade ? 'border-emerald-300/70 bg-emerald-400/10 shadow-[0_0_18px_rgba(52,211,153,.28)] ring-1 ring-emerald-300/25' : `${theme.border} bg-black/25`}">
              <div class="relative flex h-8 w-8 shrink-0 items-center justify-center">${tackleImage(definition, visual)}</div>
              <div class="min-w-0"><div class="truncate text-[8px] font-black ${status?.canUpgrade ? 'text-emerald-300' : theme.text}">${definition.shortName}</div><div class="text-[10px] font-black text-white">Lv.${level}</div></div>
              ${status?.canUpgrade ? '<span class="material-symbols-outlined absolute right-1 top-1 animate-pulse text-sm text-emerald-300" role="img" aria-label="強化できます">upgrade</span>' : ''}
            </div>`;
          }).join('')}
        </div>
      </button>
    </section>`;
}

function renderRequirement(entry) {
  const rarity = FISH_RARITY[entry.rarity];
  const progress = entry.required > 0 ? Math.min(100, entry.owned / entry.required * 100) : 100;
  const missing = Math.max(0, entry.required - entry.owned);
  return `<div class="rounded-lg border ${entry.enough ? 'border-emerald-400/20 bg-emerald-950/15' : 'border-white/10 bg-black/20'} px-2 py-1.5">
    <div class="flex items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-1.5"><span class="material-symbols-outlined text-sm ${entry.enough ? 'text-emerald-300' : 'text-slate-600'}">${entry.enough ? 'check_circle' : 'radio_button_unchecked'}</span><span class="truncate text-[9px] font-black ${rarity?.text || 'text-slate-300'}">${rarity?.label || entry.rarity}</span></div>
      <div class="shrink-0 text-[9px] font-black tabular-nums ${entry.enough ? 'text-emerald-300' : 'text-slate-300'}">${formatNumber(entry.owned)}<span class="text-slate-600"> / ${formatNumber(entry.required)}</span></div>
    </div>
    <div class="mt-1 h-1 overflow-hidden rounded-full bg-slate-900"><div class="h-full rounded-full ${entry.enough ? 'bg-emerald-400' : 'bg-cyan-500'}" style="width:${progress}%"></div></div>
    ${entry.enough ? '' : `<div class="mt-1 text-right text-[7px] font-bold text-rose-300">あと ${formatNumber(missing)}匹</div>`}
  </div>`;
}

function renderTackleSelector(state, type, selectedType) {
  const definition = FISHING_TACKLE[type];
  const level = getFishingTackleLevel(state, type);
  const status = getFishingTackleUpgradeStatus(state, type);
  const theme = TACKLE_THEME[type];
  const currentVisual = getFishingTackleVisual(type, level);
  const missingCount = status?.requirements.filter(entry => !entry.enough).length || 0;
  const statusLabel = status?.maxed ? 'MAX' : status?.canUpgrade ? '強化OK' : `${missingCount}項目不足`;
  const statusClass = status?.maxed ? 'text-amber-300' : status?.canUpgrade ? 'text-emerald-300' : 'text-slate-500';
  const selected = selectedType === type;
  const selectorState = status?.canUpgrade
    ? `border-emerald-300/70 bg-emerald-400/10 shadow-[0_0_18px_rgba(52,211,153,.25)] ${selected ? 'ring-1 ring-emerald-200/50' : ''}`
    : selected
      ? `${theme.border} bg-white/[.07] ring-1 ring-white/15`
      : 'border-white/[.07] bg-black/20 opacity-70';
  return `<button data-tackle-select="${type}" aria-pressed="${selected}" class="relative min-w-0 rounded-xl border p-1.5 text-center transition ${selectorState}">
    ${status?.canUpgrade ? '<span class="material-symbols-outlined absolute right-1 top-1 animate-pulse text-sm text-emerald-300">upgrade</span>' : ''}
    <div class="relative mx-auto flex h-10 w-10 items-center justify-center">${tackleImage(definition, currentVisual)}</div>
    <div class="mt-0.5 truncate text-[9px] font-black ${selected ? theme.text : 'text-slate-400'}">${definition.shortName} Lv.${level}</div>
    <div class="mt-0.5 text-[7px] font-black ${statusClass}">${statusLabel}</div>
  </button>`;
}

function renderTackleDetail(state, type) {
  const definition = FISHING_TACKLE[type];
  const level = getFishingTackleLevel(state, type);
  const status = getFishingTackleUpgradeStatus(state, type);
  const theme = TACKLE_THEME[type];
  const currentVisual = getFishingTackleVisual(type, level);
  const nextVisual = getFishingTackleVisual(type, status?.targetLevel);
  const spot = status?.recipe ? FISHING_SPOTS.find(item => item.id === status.recipe.spotId) : null;
  const missingRequirements = status?.requirements.filter(entry => !entry.enough) || [];
  return `<article class="overflow-hidden rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.bg}">
    <div class="p-3">
      <div class="flex items-center justify-between gap-2">
        <div><div class="text-[8px] font-black ${theme.text}">${definition.shortName.toUpperCase()}</div><h4 class="mt-0.5 text-sm font-black text-white">${currentVisual?.name || definition.name}</h4></div>
        <span class="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[9px] font-black ${theme.text}">Lv.${level} / ${FISHING_TACKLE_MAX_LEVEL}</span>
      </div>
      ${status?.maxed ? `
        <div class="mt-3 flex items-center gap-3 rounded-xl border border-amber-300/25 bg-amber-400/10 p-3">
          <div class="relative flex h-14 w-14 shrink-0 items-center justify-center">${tackleImage(definition, currentVisual)}</div>
          <div class="min-w-0"><div class="text-[10px] font-black text-amber-300">強化完了・MAX</div><div class="mt-1 text-xs font-black text-white">${getFishingTackleEffect(type, level)}</div><p class="mt-1 text-[8px] text-slate-400">この釣具は最大まで強化されています。</p></div>
        </div>
      ` : `
        <div class="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div class="rounded-xl border border-white/10 bg-black/20 p-2 text-center">
            <div class="relative mx-auto flex h-12 w-12 items-center justify-center">${tackleImage(definition, currentVisual)}</div>
            <div class="mt-1 truncate text-[8px] font-black text-slate-400">現在 Lv.${level}</div>
            <div class="mt-0.5 truncate text-[9px] font-black ${theme.text}">${getFishingTackleEffect(type, level)}</div>
          </div>
          <span class="material-symbols-outlined text-lg text-slate-600">arrow_forward</span>
          <div class="rounded-xl border ${theme.border} bg-white/[.04] p-2 text-center">
            <div class="relative mx-auto flex h-12 w-12 items-center justify-center">${tackleImage(definition, nextVisual)}</div>
            <div class="mt-1 truncate text-[8px] font-black text-white">強化後 Lv.${status.targetLevel}</div>
            <div class="mt-0.5 truncate text-[9px] font-black ${theme.text}">${getFishingTackleEffect(type, status.targetLevel)}</div>
          </div>
        </div>
        <div class="mt-2 rounded-xl border ${status.canUpgrade ? 'border-emerald-400/25 bg-emerald-950/25' : 'border-cyan-400/15 bg-cyan-950/15'} p-2.5">
          <div class="flex items-center gap-1.5 text-[9px] font-black ${status.canUpgrade ? 'text-emerald-300' : 'text-cyan-300'}"><span class="material-symbols-outlined text-base">${status.canUpgrade ? 'task_alt' : 'directions'}</span>次にすること</div>
          <p class="mt-1 text-[9px] leading-relaxed text-slate-300">${status.canUpgrade
            ? '必要な魚が揃いました。下のボタンから魚を納品して強化できます。'
            : `<span class="font-black text-white">${spot?.name || '対象の釣り堀'}</span>で魚を釣り、釣り場を離れて倉庫へ持ち帰りましょう。あと${missingRequirements.length}項目が不足しています。`}</p>
        </div>
        <div class="mt-2">
          <div class="mb-1.5 flex items-center justify-between gap-2"><div class="text-[9px] font-black text-white">納品する魚</div><div class="rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[8px] font-black text-slate-400">${spot?.name || ''}・レアリティ別</div></div>
          <div class="grid grid-cols-2 gap-1.5">${status.requirements.map(entry => renderRequirement(entry)).join('')}</div>
        </div>
        ${status.canUpgrade ? `
          <button data-tackle-upgrade="${type}" class="mt-2.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border text-xs font-black text-white ${theme.button}">
            <span class="material-symbols-outlined text-base">upgrade</span>魚を納品して Lv.${status.targetLevel}へ
          </button>
        ` : `
          <button data-return-fishing class="mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-900 text-[10px] font-black text-slate-300">
            <span class="material-symbols-outlined text-base">phishing</span>工房を閉じて釣り場を見る
          </button>
        `}
        <p class="mt-1.5 text-center text-[7px] text-slate-600">納品時は価値の低い魚から自動で消費されます</p>
      `}
    </div>
  </article>`;
}

function renderRecipeGuide() {
  return `<details class="mt-3 rounded-xl border border-white/10 bg-black/20">
    <summary class="cursor-pointer list-none px-3 py-2 text-[9px] font-black text-slate-300"><span class="material-symbols-outlined mr-1 align-middle text-sm text-cyan-300">receipt_long</span>Lv.2〜${FISHING_TACKLE_MAX_LEVEL}の強化条件を確認</summary>
    <div class="max-h-48 space-y-1.5 overflow-y-auto border-t border-white/10 p-2">
      ${FISHING_TACKLE_RECIPES.map(recipe => {
        const spot = FISHING_SPOTS.find(item => item.id === recipe.spotId);
        return `<div class="rounded-lg border border-white/[.07] bg-slate-950/70 p-2">
          <div class="flex items-center justify-between gap-2"><span class="text-[9px] font-black text-white">Lv.${recipe.level}</span><span class="text-[8px] font-black text-slate-500">${spot?.name || recipe.spotId}</span></div>
          <div class="mt-1 flex flex-wrap gap-1">${FISHING_TACKLE_RARITIES.filter(rarity => recipe.requirements[rarity]).map(rarity => `<span class="rounded-md border border-white/[.07] bg-black/25 px-1.5 py-1 text-[7px] font-black ${FISH_RARITY[rarity]?.text || 'text-slate-300'}">${FISH_RARITY[rarity]?.label || rarity} ${formatNumber(recipe.requirements[rarity])}</span>`).join('')}</div>
        </div>`;
      }).join('')}
    </div>
  </details>`;
}

function askUpgradeConfirmation(overlay, status) {
  return new Promise(resolve => {
    const definition = status.definition;
    const nextVisual = getFishingTackleVisual(status.type, status.targetLevel);
    const spot = FISHING_SPOTS.find(item => item.id === status.recipe?.spotId);
    const confirmation = document.createElement('div');
    confirmation.className = 'absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm';
    confirmation.innerHTML = `
      <div class="w-full max-w-sm rounded-2xl border border-cyan-300/25 bg-slate-950 p-4 shadow-2xl">
        <div class="flex items-center gap-3"><div class="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25 p-1">${tackleImage(definition, nextVisual)}</div><div class="min-w-0"><div class="text-[9px] font-black text-cyan-300">Lv.${status.currentLevel} → Lv.${status.targetLevel}</div><div class="truncate text-sm font-black text-white">${nextVisual?.name || definition.name}</div></div></div>
        <div class="mt-3 rounded-xl border border-white/10 bg-black/20 p-2">
          <div class="mb-1.5 flex items-center justify-between text-[8px] font-black"><span class="text-slate-400">倉庫から納品</span><span class="text-slate-500">${spot?.name || ''}</span></div>
          <div class="flex flex-wrap gap-1">${status.requirements.map(entry => `<span class="rounded-md border border-white/[.07] bg-slate-900 px-1.5 py-1 text-[8px] font-black ${FISH_RARITY[entry.rarity]?.text || 'text-slate-300'}">${FISH_RARITY[entry.rarity]?.label || entry.rarity} ${formatNumber(entry.required)}匹</span>`).join('')}</div>
        </div>
        <p class="mt-2 text-[9px] leading-relaxed text-rose-200/70">納品した魚は倉庫から消費され、取り消せません。</p>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <button data-cancel class="h-11 rounded-xl border border-slate-700 bg-slate-900 text-xs font-black text-slate-300">キャンセル</button>
          <button data-confirm class="h-11 rounded-xl border border-cyan-300/40 bg-gradient-to-r from-cyan-700 to-blue-700 text-xs font-black text-white">納品して強化</button>
        </div>
      </div>`;
    overlay.appendChild(confirmation);
    confirmation.querySelector('[data-cancel]').onclick = () => {
      confirmation.remove();
      resolve(false);
    };
    confirmation.querySelector('[data-confirm]').onclick = () => {
      confirmation.remove();
      resolve(true);
    };
  });
}

export async function showFishingTackleWorkshop(onClose) {
  let state = await loadFishingData();
  let selectedType = FISHING_TACKLE_ORDER.find(type => getFishingTackleUpgradeStatus(state, type)?.canUpgrade)
    || FISHING_TACKLE_ORDER.find(type => !getFishingTackleUpgradeStatus(state, type)?.maxed)
    || FISHING_TACKLE_ORDER[0];
  let changed = false;
  let busy = false;
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-4';
  const modal = document.createElement('div');
  modal.className = 'flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-cyan-400/25 bg-[#07101b] shadow-2xl sm:max-h-[calc(100dvh-2rem)]';
  overlay.appendChild(modal);

  const close = async () => {
    if (busy) return;
    document.removeEventListener('keydown', onKeyDown);
    overlay.remove();
    if (changed) await onClose?.();
  };
  const onKeyDown = event => {
    if (event.key === 'Escape') close();
  };

  const render = (message = '', messageType = 'success') => {
    modal.innerHTML = `
      <header class="shrink-0 border-b border-cyan-400/15 bg-gradient-to-br from-cyan-950/80 via-slate-950 to-violet-950/55 p-3">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2"><span class="material-symbols-outlined rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-1.5 text-lg text-cyan-300">handyman</span><div><h3 class="text-sm font-black text-white">釣具工房</h3><p class="text-[8px] text-slate-400">魚を集めて、釣具をLv.15まで強化</p></div></div>
          <button data-close class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/25 text-slate-400"><span class="material-symbols-outlined text-lg">close</span></button>
        </div>
        <div class="mt-2 flex items-center gap-1 text-[8px] font-black text-slate-500"><span class="rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-cyan-300">1</span>釣具を選ぶ<span class="material-symbols-outlined text-xs text-slate-700">chevron_right</span><span class="rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-cyan-300">2</span>魚を集める<span class="material-symbols-outlined text-xs text-slate-700">chevron_right</span><span class="rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-cyan-300">3</span>納品して強化</div>
        <div class="mt-2 grid grid-cols-3 gap-1.5">${FISHING_TACKLE_ORDER.map(type => renderTackleSelector(state, type, selectedType)).join('')}</div>
      </header>
      <div class="no-scrollbar flex-1 overflow-y-auto p-2.5">
        ${message ? `<div class="mb-2 rounded-xl border px-3 py-2 text-[10px] font-black ${messageType === 'error' ? 'border-rose-400/25 bg-rose-950/35 text-rose-300' : 'border-emerald-400/25 bg-emerald-950/35 text-emerald-300'}">${message}</div>` : ''}
        ${renderTackleDetail(state, selectedType)}
        ${renderRecipeGuide()}
      </div>`;
    modal.querySelector('[data-close]').onclick = close;
    modal.querySelectorAll('[data-tackle-select]').forEach(button => {
      button.onclick = () => {
        if (busy || button.dataset.tackleSelect === selectedType) return;
        selectedType = button.dataset.tackleSelect;
        render();
      };
    });
    modal.querySelector('[data-return-fishing]')?.addEventListener('click', close);
    modal.querySelectorAll('[data-tackle-upgrade]').forEach(button => {
      button.onclick = async () => {
        if (busy) return;
        const type = button.dataset.tackleUpgrade;
        selectedType = type;
        const status = getFishingTackleUpgradeStatus(state, type);
        if (!status?.canUpgrade) return;
        if (!await askUpgradeConfirmation(overlay, status)) return;
        busy = true;
        modal.querySelectorAll('button').forEach(item => { item.disabled = true; });
        try {
          const result = await upgradeFishingTackle(type);
          state = result.state;
          changed = true;
          const visual = getFishingTackleVisual(type, result.level);
          render(`${visual?.name || status.definition.name}が Lv.${result.level} になりました。`);
        } catch (error) {
          render(error.message || '釣具を強化できませんでした。', 'error');
        } finally {
          busy = false;
        }
      };
    });
  };

  overlay.addEventListener('click', event => {
    if (event.target === overlay) close();
  });
  document.addEventListener('keydown', onKeyDown);
  document.body.appendChild(overlay);
  render();
}
