import { GameDB } from '../../data/database.js';
import { MINES, MINE_UPGRADE_TYPES, MINE_MAX_UPGRADE_LEVEL, getMineStats, getMineUpgradeCost } from '../../definitions/mines.js';
import { MATERIALS } from '../../definitions/materials.js';
import { accrueMine, claimAllMineGold, claimMineGold, loadMineData, unlockMine, upgradeMine } from '../../data/mine-manager.js';
import { formatNumber } from '../../utils/format.js';

const MATERIAL_MAP = new Map(MATERIALS.map(item => [item.id, item]));
const MINE_THEME = Object.freeze({
  accent: '#a68a64',
  bright: '#d9c6a5',
  deep: '#090806',
  panel: 'rgba(35, 31, 25, 0.9)',
  border: 'rgba(166, 138, 100, 0.42)',
  secondary: '#89907b'
});

function applyMineTheme(container, card) {
  const { accent, bright, deep, panel, border, secondary } = MINE_THEME;
  container.style.background = 'radial-gradient(circle at 50% 6%, rgba(91, 74, 51, .34), transparent 42%), linear-gradient(180deg, #0f0d0a 0%, #070706 100%)';
  card.style.background = `linear-gradient(160deg, ${panel}, rgba(10, 9, 7, .98))`;
  card.style.borderColor = border;
  card.style.boxShadow = '0 14px 36px rgba(0, 0, 0, .72), 0 0 20px rgba(166, 138, 100, .1)';
  container.querySelectorAll('[data-theme-panel]').forEach(el => { el.style.background = panel; el.style.borderColor = border; });
  container.querySelectorAll('[data-theme-text]').forEach(el => { el.style.color = bright; });
  container.querySelectorAll('[data-theme-icon]').forEach(el => { el.style.color = accent; });
  container.querySelectorAll('[data-theme-bar]').forEach(el => { el.style.background = `linear-gradient(90deg, ${accent}, ${bright})`; });
  container.querySelectorAll('[data-theme-cycle]').forEach(el => { el.style.background = `linear-gradient(90deg, ${secondary}, ${bright})`; });
  container.querySelectorAll('[data-theme-track]').forEach(el => { el.style.background = deep; el.style.borderColor = border; });
  container.querySelectorAll('[data-theme-action]').forEach(el => {
    el.style.background = `linear-gradient(90deg, #594831, ${accent})`;
    el.style.borderColor = border;
    el.style.boxShadow = '0 0 14px rgba(166, 138, 100, .2)';
  });
}

function updateHeader(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = formatNumber(value);
}

function formatMineAmount(value, maximumFractionDigits = 3) {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 1000) return formatNumber(value);
  return value.toLocaleString('ja-JP', { maximumFractionDigits });
}

function formatMineRateUpgrade(current, next) {
  let fractionDigits = Math.abs(current) >= 1000 ? 2 : 3;
  while (fractionDigits < 8 && current.toFixed(fractionDigits) === next.toFixed(fractionDigits)) {
    fractionDigits += 1;
  }
  const format = value => value.toLocaleString('ja-JP', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
  const increase = next - current;
  let increaseFractionDigits = fractionDigits;
  while (increaseFractionDigits < 8 && increase.toFixed(increaseFractionDigits) === (0).toFixed(increaseFractionDigits)) {
    increaseFractionDigits += 1;
  }
  const formatIncrease = value => value.toLocaleString('ja-JP', {
    minimumFractionDigits: increaseFractionDigits,
    maximumFractionDigits: increaseFractionDigits
  });
  const increasePercent = current > 0 ? increase / current * 100 : 0;
  return {
    current: format(current),
    next: format(next),
    increase: formatIncrease(increase),
    increasePercent: increasePercent.toFixed(2)
  };
}

function getStorageProgress(state, stats) {
  if (stats.maxStoredGold <= 0) return 0;
  return Math.min(100, Math.max(0, (state.storedGold || 0) / stats.maxStoredGold * 100));
}

function getStorageRemainingMs(state, stats) {
  const remainingGold = Math.max(0, stats.maxStoredGold - (state.storedGold || 0));
  if (remainingGold <= 0 || stats.goldPerSecond <= 0) return 0;
  return remainingGold / stats.goldPerSecond * 1000;
}

function formatStorageRemaining(state, stats) {
  const remainingMs = getStorageRemainingMs(state, stats);
  if (remainingMs <= 0) return '満杯';
  const seconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return `${formatNumber(hours)}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function showMineMessage(container, message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `fixed left-1/2 top-20 z-[10000] -translate-x-1/2 rounded-xl border px-4 py-2 text-xs font-bold shadow-xl ${isError ? 'border-red-500/60 bg-red-950/95 text-red-200' : 'border-emerald-500/60 bg-emerald-950/95 text-emerald-200'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
}

function updateClaimButtonAppearance(button, canClaim) {
  if (!button) return;
  if (button.dataset.canClaim === String(canClaim)) return;
  button.dataset.canClaim = String(canClaim);
  button.disabled = !canClaim;
  button.className = `mt-2 w-full rounded-lg border py-2.5 text-sm font-black shadow transition-all ${canClaim
    ? 'border-yellow-300/60 bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 shadow-[0_0_16px_rgba(250,204,21,.28)] active:brightness-110 active:scale-[.98]'
    : 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500 opacity-70 shadow-none'}`;
  button.innerHTML = canClaim
    ? '<span class="material-symbols-outlined mr-1 align-middle text-base">toll</span>Goldを回収'
    : '<span class="material-symbols-outlined mr-1 align-middle text-base">hourglass_empty</span>Goldを回収';
}

function updateClaimAllButtonAppearance(button, canClaim) {
  if (!button) return;
  if (button.dataset.canClaim === String(canClaim)) return;
  button.dataset.canClaim = String(canClaim);
  button.disabled = !canClaim;
  button.className = `mb-2.5 flex w-full items-center justify-center gap-1 rounded-xl border py-2.5 text-sm font-black shadow transition-all ${canClaim
    ? 'border-yellow-300/70 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 text-amber-950 shadow-[0_0_18px_rgba(250,204,21,.3)] active:scale-[.98] active:brightness-110'
    : 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500 opacity-70 shadow-none'}`;
  button.innerHTML = canClaim
    ? '<span class="material-symbols-outlined text-lg">payments</span>全鉱山から一括回収'
    : '<span class="material-symbols-outlined text-lg">hourglass_empty</span>全鉱山から一括回収';
}

async function showMineUnlockAnimation(mine) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[12000] overflow-hidden bg-black pointer-events-none';
  overlay.innerHTML = `
    <img src="${mine.image}" class="absolute inset-0 h-full w-full object-cover opacity-45" alt="">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,.25)_45%,rgba(0,0,0,.95)_100%)]"></div>
    <div data-unlock-ring class="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 opacity-0"></div>
    <div data-unlock-title class="absolute inset-0 flex scale-75 flex-col items-center justify-center opacity-0">
      <span class="material-symbols-outlined text-6xl text-white drop-shadow-[0_0_24px_currentColor]">landscape</span>
      <div class="mt-4 text-[11px] font-black tracking-[.45em] text-white/70">MINE UNLOCKED</div>
      <div class="mt-2 px-5 text-center text-2xl font-black text-white drop-shadow-[0_3px_12px_rgba(0,0,0,.9)]">${mine.name}</div>
      <div class="mt-4 rounded-full border border-white/30 bg-black/45 px-5 py-2 text-sm font-black text-white backdrop-blur-md">鉱山解放！</div>
    </div>`;
  document.body.appendChild(overlay);
  const accent = MINE_THEME.bright;
  const ring = overlay.querySelector('[data-unlock-ring]');
  ring.style.borderColor = accent;
  ring.style.boxShadow = `0 0 35px ${accent}, inset 0 0 35px ${accent}`;
  overlay.querySelector('img').animate(
    [{ transform: 'scale(1.18)', filter: 'brightness(.45)' }, { transform: 'scale(1)', filter: 'brightness(1)' }],
    { duration: reducedMotion ? 400 : 1800, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
  );
  ring.animate(
    [{ transform: 'translate(-50%,-50%) scale(.15)', opacity: 0 }, { opacity: 1, offset: .35 }, { transform: 'translate(-50%,-50%) scale(2.6)', opacity: 0 }],
    { duration: reducedMotion ? 500 : 1500, easing: 'ease-out', fill: 'forwards' }
  );
  overlay.querySelector('[data-unlock-title]').animate(
    [{ transform: 'scale(.72) translateY(20px)', opacity: 0 }, { transform: 'scale(1.06) translateY(0)', opacity: 1, offset: .55 }, { transform: 'scale(1)', opacity: 1 }],
    { duration: reducedMotion ? 450 : 1200, easing: 'cubic-bezier(.2,.85,.25,1)', fill: 'forwards' }
  );
  const particleCount = reducedMotion ? 8 : 42;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('span');
    particle.className = 'absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full';
    particle.style.background = i % 3 === 0 ? '#fff' : accent;
    particle.style.boxShadow = `0 0 10px ${particle.style.background}`;
    overlay.appendChild(particle);
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * Math.max(innerWidth, innerHeight) * .55;
    particle.animate(
      [{ transform: 'translate(-50%,-50%) scale(0)', opacity: 0 }, { opacity: 1, offset: .15 }, { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(${.4 + Math.random() * 1.8})`, opacity: 0 }],
      { duration: 700 + Math.random() * 1100, delay: 100 + Math.random() * 350, easing: 'ease-out', fill: 'forwards' }
    );
  }
  setTimeout(() => {
    overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'forwards' }).onfinish = () => overlay.remove();
  }, reducedMotion ? 850 : 2100);
}

function showGoldClaimAnimation(amount, originRect) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layer = document.createElement('div');
  layer.className = 'fixed inset-0 z-[11000] overflow-hidden pointer-events-none';
  document.body.appendChild(layer);
  const target = document.getElementById('header-gold-display')?.getBoundingClientRect();
  const startX = originRect.left + originRect.width / 2;
  const startY = originRect.top + Math.min(originRect.height * .45, 190);
  const endX = target ? target.left + target.width / 2 : innerWidth - 70;
  const endY = target ? target.top + target.height / 2 : 30;
  const popup = document.createElement('div');
  popup.className = 'absolute flex -translate-x-1/2 items-center gap-1 rounded-full border border-yellow-300/50 bg-amber-950/95 px-4 py-2 text-lg font-black text-yellow-200 shadow-[0_0_30px_rgba(250,204,21,.5)]';
  popup.style.left = `${startX}px`;
  popup.style.top = `${startY}px`;
  popup.innerHTML = `<span class="material-symbols-outlined">toll</span>+${formatNumber(amount)} G`;
  layer.appendChild(popup);
  popup.animate(
    [{ transform: 'translate(-50%,20px) scale(.65)', opacity: 0 }, { transform: 'translate(-50%,-15px) scale(1.08)', opacity: 1, offset: .35 }, { transform: 'translate(-50%,-55px) scale(1)', opacity: 0 }],
    { duration: reducedMotion ? 650 : 1250, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
  );
  const coinCount = reducedMotion ? 5 : 24;
  for (let i = 0; i < coinCount; i++) {
    const coin = document.createElement('span');
    coin.className = 'material-symbols-outlined absolute text-xl text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,.9)]';
    coin.textContent = 'toll';
    coin.style.left = `${startX}px`;
    coin.style.top = `${startY}px`;
    layer.appendChild(coin);
    const spreadX = (Math.random() - .5) * 150;
    const spreadY = (Math.random() - .5) * 90;
    coin.animate(
      [{ transform: `translate(${spreadX}px,${spreadY}px) scale(.35) rotate(0deg)`, opacity: 0 }, { opacity: 1, offset: .18 }, { transform: `translate(${endX - startX}px,${endY - startY}px) scale(.8) rotate(${360 + Math.random() * 720}deg)`, opacity: 0 }],
      { duration: reducedMotion ? 450 : 750 + Math.random() * 450, delay: i * (reducedMotion ? 20 : 35), easing: 'cubic-bezier(.35,.05,.3,1)', fill: 'forwards' }
    );
  }
  if (target) {
    const headerGold = document.getElementById('header-gold-display')?.parentElement;
    headerGold?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)', filter: 'brightness(1.8)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 650, delay: reducedMotion ? 250 : 850 });
  }
  setTimeout(() => layer.remove(), reducedMotion ? 1000 : 1900);
}

async function showMineUpgradeAnimation(mine, type, newLevel, originRect) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const typeInfo = MINE_UPGRADE_TYPES.find(item => item.id === type);
  const accent = MINE_THEME.bright;
  const layer = document.createElement('div');
  layer.className = 'fixed inset-0 z-[11500] overflow-hidden pointer-events-none';
  document.body.appendChild(layer);
  const centerX = originRect.left + originRect.width / 2;
  const centerY = Math.min(innerHeight - 110, Math.max(110, originRect.top + originRect.height / 2));

  const flash = document.createElement('div');
  flash.className = 'absolute rounded-3xl border-2 opacity-0';
  flash.style.left = `${originRect.left}px`;
  flash.style.top = `${Math.max(0, originRect.top)}px`;
  flash.style.width = `${originRect.width}px`;
  flash.style.height = `${Math.min(originRect.height, innerHeight)}px`;
  flash.style.borderColor = accent;
  flash.style.background = 'radial-gradient(circle at center, rgba(166, 138, 100, .28), transparent 68%)';
  flash.style.boxShadow = `0 0 35px ${accent}, inset 0 0 24px rgba(166, 138, 100, .35)`;
  layer.appendChild(flash);
  flash.animate(
    [{ transform: 'scale(.96)', opacity: 0 }, { transform: 'scale(1.025)', opacity: 1, offset: .32 }, { transform: 'scale(1)', opacity: 0 }],
    { duration: reducedMotion ? 450 : 900, easing: 'ease-out', fill: 'forwards' }
  );

  const badge = document.createElement('div');
  badge.className = 'absolute flex -translate-x-1/2 flex-col items-center rounded-2xl border border-white/25 bg-slate-950/95 px-6 py-3 text-center opacity-0 shadow-2xl backdrop-blur-md';
  badge.style.left = `${centerX}px`;
  badge.style.top = `${centerY}px`;
  badge.style.color = accent;
  badge.style.boxShadow = '0 0 32px rgba(166, 138, 100, .45)';
  badge.innerHTML = `<div class="flex items-center gap-2"><span class="material-symbols-outlined text-3xl">${typeInfo?.icon || 'upgrade'}</span><span class="text-xs font-black tracking-[.22em] text-white/60">LEVEL UP</span></div><div class="mt-1 text-base font-black text-white">${typeInfo?.label || '鉱山強化'}</div><div class="mt-0.5 text-xl font-black tabular-nums">Lv.${formatNumber(newLevel)}</div>`;
  layer.appendChild(badge);
  badge.animate(
    [{ transform: 'translate(-50%,20px) scale(.65)', opacity: 0 }, { transform: 'translate(-50%,-50px) scale(1.08)', opacity: 1, offset: .45 }, { transform: 'translate(-50%,-65px) scale(1)', opacity: 0 }],
    { duration: reducedMotion ? 700 : 1350, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
  );

  const particleCount = reducedMotion ? 5 : 18;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('span');
    particle.className = `material-symbols-outlined absolute text-lg`;
    particle.textContent = i % 3 === 0 ? (typeInfo?.icon || 'upgrade') : 'diamond';
    particle.style.left = `${centerX}px`;
    particle.style.top = `${centerY}px`;
    particle.style.color = i % 4 === 0 ? '#fff' : accent;
    particle.style.filter = `drop-shadow(0 0 7px ${accent})`;
    layer.appendChild(particle);
    const angle = Math.random() * Math.PI * 2;
    const distance = 55 + Math.random() * 135;
    particle.animate(
      [{ transform: 'translate(-50%,-50%) scale(0) rotate(0deg)', opacity: 0 }, { opacity: 1, offset: .2 }, { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(${.4 + Math.random()}) rotate(${180 + Math.random() * 360}deg)`, opacity: 0 }],
      { duration: reducedMotion ? 450 : 700 + Math.random() * 500, delay: 80 + Math.random() * 180, easing: 'ease-out', fill: 'forwards' }
    );
  }
  setTimeout(() => layer.remove(), reducedMotion ? 900 : 1600);
}

export async function renderMineTab() {
  const container = document.createElement('div');
  container.className = 'h-full overflow-y-auto bg-[#080b12] p-3 sm:p-4';
  let mineData = await loadMineData();
  let inventory = new Map((await GameDB.getAllInventory()).map(item => [item.id, item.quantity || 0]));
  let currentGold = await GameDB.getGameState('gold') || 0;
  let currentPrism = await GameDB.getGameState('prism') || 0;
  let busy = false;
  let timer = null;
  let currentPage = 0;

  const render = () => {
    container.innerHTML = `
      <div class="mx-auto flex min-h-full max-w-xl flex-col">
        <div class="flex-1" data-mine-list></div>
        <nav data-theme-panel class="sticky bottom-0 z-10 mt-4 rounded-2xl border p-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md" aria-label="鉱山ページ">
          <button data-claim-all></button>
          <div class="flex items-center gap-2">
            <button data-page-prev data-theme-action class="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border text-xs font-black text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30" ${currentPage === 0 ? 'disabled' : ''}><span class="material-symbols-outlined text-lg">chevron_left</span>前へ</button>
            <div data-theme-text class="min-w-16 text-center text-[10px] font-black tracking-widest">${currentPage + 1} / ${MINES.length}</div>
            <button data-page-next data-theme-action class="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border text-xs font-black text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30" ${currentPage === MINES.length - 1 ? 'disabled' : ''}>次へ<span class="material-symbols-outlined text-lg">chevron_right</span></button>
          </div>
        </nav>
      </div>`;
    const list = container.querySelector('[data-mine-list]');
    const currentMine = MINES[currentPage];
    const card = createMineCard(currentMine);
    list.appendChild(card);
    const claimAllButton = container.querySelector('[data-claim-all]');
    updateClaimAllButtonAppearance(claimAllButton, MINES.some(mine => mineData[mine.id]?.unlocked && Math.floor(mineData[mine.id].storedGold || 0) > 0));
    applyMineTheme(container, card);

    const changePage = (page) => {
      if (page < 0 || page >= MINES.length || page === currentPage) return;
      currentPage = page;
      render();
      container.scrollTo({ top: 0, behavior: 'smooth' });
    };
    container.querySelector('[data-page-prev]')?.addEventListener('click', () => changePage(currentPage - 1));
    container.querySelector('[data-page-next]')?.addEventListener('click', () => changePage(currentPage + 1));
    claimAllButton?.addEventListener('click', () => runAction(async () => {
      const originRect = claimAllButton.getBoundingClientRect();
      const result = await claimAllMineGold();
      mineData = result.data;
      currentGold = result.gold;
      updateHeader('header-gold-display', result.gold);
      showGoldClaimAnimation(result.amount, originRect);
      showMineMessage(container, `${formatNumber(result.claimedMineCount)}か所の鉱山から${formatNumber(result.amount)} Goldを回収しました。`);
    }));
  };

  const createMineCard = (mine) => {
    const state = mineData[mine.id];
    const mineIndex = MINES.indexOf(mine);
    const lockedLowerMine = MINES.slice(0, mineIndex).find(item => !mineData[item.id]?.unlocked);
    const stats = getMineStats(mine, state);
    const card = document.createElement('section');
    card.dataset.mineId = mine.id;
    card.className = 'overflow-hidden rounded-2xl border shadow-lg';
    const storageProgress = getStorageProgress(state, stats);
    const unlockRequirements = mine.unlockMaterials.map(cost => {
      const material = MATERIAL_MAP.get(cost.materialId);
      const owned = inventory.get(cost.materialId) || 0;
      return { ...cost, material, owned, sufficient: owned >= cost.amount };
    });
    const hasUnlockPrism = currentPrism >= mine.unlockPrism;
    const hasUnlockMaterials = unlockRequirements.every(cost => cost.sufficient);
    const canUnlock = !lockedLowerMine && hasUnlockPrism && hasUnlockMaterials;
    card.innerHTML = `
      <div class="relative h-28 overflow-hidden bg-gradient-to-br from-stone-900 to-slate-950">
        <img src="${mine.image}" alt="${mine.name}" class="h-full w-full object-cover ${state.unlocked ? '' : 'grayscale opacity-35'}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="absolute inset-0 hidden items-center justify-center"><span class="material-symbols-outlined text-5xl text-stone-600">landscape</span></div>
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
        <div class="absolute bottom-2 left-3 right-3 flex items-end justify-between"><h3 class="text-sm font-black text-white drop-shadow">${mine.name}</h3><span class="rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-bold text-stone-300">鉱山 ${MINES.indexOf(mine) + 1}</span></div>
      </div>
      ${state.unlocked ? `
        <div class="space-y-3 p-3">
          <div data-theme-panel class="rounded-xl border p-3">
            <div class="mb-1.5 flex items-center justify-between"><span class="text-[10px] font-bold text-stone-400">蓄積Gold</span><span data-theme-text class="font-mono text-sm font-black" data-stored>${formatMineAmount(state.storedGold, 2)} / ${formatMineAmount(stats.maxStoredGold, 2)}</span></div>
            <div data-theme-track class="h-2 overflow-hidden rounded-full border" role="progressbar" aria-label="貯蔵庫の使用量" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${storageProgress.toFixed(1)}"><div data-theme-bar data-storage-progress class="h-full transition-all" style="width:${storageProgress}%"></div></div>
            <div class="mt-3 grid grid-cols-[1fr_auto] items-stretch gap-2">
              <div class="flex min-w-0 flex-col justify-center rounded-xl border border-white/10 bg-black/25 px-3 py-2"><span data-current-rate-label class="text-[8px] font-black tracking-wider text-stone-500">現在の採掘速度</span><span data-current-rate class="mt-0.5 text-sm font-black tabular-nums text-stone-300">${formatMineAmount(stats.goldPerSecond)} G / 秒</span></div>
              <div data-storage-countdown class="min-w-[138px] rounded-xl border border-amber-300/25 bg-gradient-to-br from-amber-950/55 to-black/35 px-3 py-2 text-right shadow-[inset_0_0_18px_rgba(245,158,11,.08)]"><div class="flex items-center justify-end gap-1 text-[9px] font-black tracking-wider text-amber-200/75"><span class="material-symbols-outlined text-sm">hourglass_top</span><span data-storage-label>${storageProgress >= 100 ? '貯蔵状態' : '満杯まで'}</span></div><div data-storage-time class="mt-0.5 font-mono text-lg font-black leading-none tabular-nums text-amber-100">${formatStorageRemaining(state, stats)}</div></div>
            </div>
            <div data-storage-speed-note class="mt-1.5 text-right text-[8px] font-bold text-stone-500">現在の速度から計算した予測時間</div>
            <button data-claim></button>
          </div>
          <div class="space-y-2">${MINE_UPGRADE_TYPES.map(type => createUpgradeRow(mine, state, type)).join('')}</div>
        </div>` : `
        <div class="p-3 text-center">
          <p class="mb-2 text-[10px] leading-relaxed ${lockedLowerMine ? 'text-amber-400' : 'text-slate-400'}">${lockedLowerMine ? `解放条件：${lockedLowerMine.name}を先に解放` : 'Prismと3種類の素材を消費して解放します。'}</p>
          <div class="mb-2 grid grid-cols-2 gap-1.5 text-left">
            <div class="rounded-lg border ${hasUnlockPrism ? 'border-emerald-700/40 bg-emerald-950/20' : 'border-red-700/50 bg-red-950/20'} px-2 py-1.5">
              <div class="flex items-center gap-2">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-fuchsia-400/30 bg-fuchsia-950/50">
                  <span class="material-symbols-outlined block text-xl leading-none text-fuchsia-300">diamond</span>
                </div>
                <div class="min-w-0">
                  <div class="truncate text-[10px] font-bold text-slate-300">Prism</div>
                  <div class="text-xs font-black tabular-nums ${hasUnlockPrism ? 'text-emerald-400' : 'text-red-400'}">${formatNumber(currentPrism)} <span class="text-slate-600">/</span> ${formatNumber(mine.unlockPrism)}</div>
                </div>
              </div>
            </div>
            ${unlockRequirements.map(cost => `
              <div class="rounded-lg border ${cost.sufficient ? 'border-emerald-700/40 bg-emerald-950/20' : 'border-red-700/50 bg-red-950/20'} px-2 py-1.5">
                <div class="flex items-center gap-2">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/25">
                    <img src="${cost.material?.image || ''}" alt="" class="h-7 w-7 object-contain drop-shadow" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                    <span class="material-symbols-outlined text-xl text-slate-500" style="display:none">category</span>
                  </div>
                  <div class="min-w-0">
                    <div class="truncate text-[10px] font-bold text-slate-300">${cost.material?.name || cost.materialId}</div>
                    <div class="text-xs font-black tabular-nums ${cost.sufficient ? 'text-emerald-400' : 'text-red-400'}">${formatNumber(cost.owned)} <span class="text-slate-600">/</span> ${formatNumber(cost.amount)}</div>
                  </div>
                </div>
              </div>`).join('')}
          </div>
          <button data-theme-action data-unlock class="w-full rounded-xl border py-2.5 text-xs font-black text-white shadow active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35" ${canUnlock ? '' : 'disabled'}><span class="material-symbols-outlined mr-1 align-middle text-sm">${lockedLowerMine ? 'lock' : 'diamond'}</span>${lockedLowerMine ? '下位鉱山の解放が必要' : canUnlock ? '鉱山を解放' : '解放条件が不足'}</button>
        </div>`}
    `;
    const claimButton = card.querySelector('[data-claim]');
    updateClaimButtonAppearance(claimButton, state.storedGold >= 1);
    card.querySelector('[data-unlock]')?.addEventListener('click', () => runAction(async () => {
      const result = await unlockMine(mine.id);
      mineData = result.data;
      inventory = new Map((await GameDB.getAllInventory()).map(item => [item.id, item.quantity || 0]));
      currentPrism = result.prism;
      updateHeader('header-prism-display', result.prism);
      showMineUnlockAnimation(mine);
      showMineMessage(container, `${mine.name}を解放しました。`);
    }));
    claimButton?.addEventListener('click', () => runAction(async () => {
      const originRect = card.getBoundingClientRect();
      const result = await claimMineGold(mine.id);
      mineData = result.data;
      currentGold = result.gold;
      updateHeader('header-gold-display', result.gold);
      showGoldClaimAnimation(result.amount, originRect);
      showMineMessage(container, `${formatNumber(result.amount)} Goldを回収しました。`);
    }));
    card.querySelectorAll('[data-upgrade]').forEach(button => button.addEventListener('click', () => runAction(async () => {
      const originRect = card.getBoundingClientRect();
      const upgradeType = button.dataset.upgrade;
      const result = await upgradeMine(mine.id, upgradeType); mineData = result.data;
      inventory = new Map((await GameDB.getAllInventory()).map(item => [item.id, item.quantity || 0]));
      currentGold = result.gold;
      updateHeader('header-gold-display', result.gold);
      showMineUpgradeAnimation(mine, upgradeType, mineData[mine.id][`${upgradeType}Level`], originRect);
      const upgradedStats = getMineStats(mine, mineData[mine.id]);
      showMineMessage(container, upgradeType === 'yield'
        ? `採掘量が ${formatMineAmount(upgradedStats.baseGoldPerSecond, 6)} G/秒に上昇しました。`
        : `${mine.name}を強化しました。`);
    })));
    return card;
  };

  const createUpgradeRow = (mine, state, type) => {
    const level = state[`${type.id}Level`];
    const isMax = level >= MINE_MAX_UPGRADE_LEVEL;
    const cost = isMax ? null : getMineUpgradeCost(mine, type.id, level);
    const material = cost ? MATERIAL_MAP.get(cost.materialId) : null;
    const owned = cost ? (inventory.get(cost.materialId) || 0) : 0;
    const currentStats = getMineStats(mine, state);
    const nextState = isMax ? state : { ...state, [`${type.id}Level`]: level + 1 };
    const nextStats = getMineStats(mine, nextState);
    const yieldUpgrade = type.id === 'yield' && !isMax
      ? formatMineRateUpgrade(currentStats.baseGoldPerSecond, nextStats.baseGoldPerSecond)
      : null;
    const effects = type.id === 'machine'
      ? { current: `効率 ${(currentStats.machineEfficiency * 100).toFixed(2)}%`, next: `効率 ${(nextStats.machineEfficiency * 100).toFixed(2)}%` }
      : type.id === 'yield'
        ? { current: `${yieldUpgrade?.current || formatMineAmount(currentStats.baseGoldPerSecond, 6)} G/秒`, next: `${yieldUpgrade?.next || formatMineAmount(nextStats.baseGoldPerSecond, 6)} G/秒` }
        : { current: `${formatMineAmount(currentStats.storageHours, 2)}時間 / ${formatMineAmount(currentStats.maxStoredGold, 2)} G`, next: `${formatMineAmount(nextStats.storageHours, 2)}時間 / ${formatMineAmount(nextStats.maxStoredGold, 2)} G` };
    const hasMaterial = isMax || owned >= cost.materialAmount;
    const hasGold = isMax || currentGold >= cost.gold;
    return `<div data-theme-panel class="rounded-xl border p-3 shadow-inner">
      <div class="flex items-start gap-2.5">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20"><span data-theme-icon class="material-symbols-outlined text-xl">${type.icon}</span></div>
        <div class="min-w-0 flex-1"><div class="flex items-center justify-between gap-2"><span class="text-sm font-black text-slate-100">${type.label}</span><span data-theme-text class="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-xs font-black">Lv.${formatNumber(level)}${isMax ? ' MAX' : ''}</span></div><p class="mt-0.5 text-[11px] font-medium text-slate-400">${type.description}</p></div>
      </div>
      <div class="no-scrollbar mt-2.5 flex min-h-11 items-center gap-2 overflow-x-auto whitespace-nowrap rounded-xl border border-white/10 bg-black/25 px-3 py-2">
        <span class="text-[11px] font-black text-slate-400">現在</span>
        <span data-theme-text class="text-sm font-black tabular-nums">${effects.current}</span>
        ${isMax ? '<span class="ml-auto rounded-md bg-white/5 px-2 py-1 text-[11px] font-black text-slate-400">MAX</span>' : `<span class="material-symbols-outlined mx-1 text-xl text-slate-500">arrow_forward</span><span class="text-[11px] font-black text-slate-400">次</span><span data-theme-text class="text-sm font-black tabular-nums">${effects.next}</span>`}
      </div>
      ${yieldUpgrade ? `<div class="mt-2 flex items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-2 py-1.5 text-[11px] font-black text-emerald-300"><span class="material-symbols-outlined text-sm">trending_up</span>強化効果 +${yieldUpgrade.increase} G/秒（+${yieldUpgrade.increasePercent}%）</div>` : ''}
      ${isMax ? '' : `<div class="mt-2.5 grid grid-cols-2 gap-2">
        <div class="rounded-lg border ${hasMaterial ? 'border-emerald-700/40 bg-emerald-950/20' : 'border-red-700/50 bg-red-950/20'} p-2">
          <div class="mb-1 text-[10px] font-black tracking-wider text-slate-400">必要素材</div>
          <div class="flex items-center gap-2"><img src="${material?.image || ''}" class="h-9 w-9 shrink-0 object-contain" onerror="this.style.visibility='hidden'"><div class="min-w-0"><div class="truncate text-xs font-bold text-slate-200">${material?.name || cost.materialId}</div><div class="mt-0.5 text-sm font-black tabular-nums ${hasMaterial ? 'text-emerald-400' : 'text-red-400'}">${formatNumber(owned)} <span class="text-slate-600">/</span> ${formatNumber(cost.materialAmount)}</div></div></div>
        </div>
        <div class="rounded-lg border ${hasGold ? 'border-emerald-700/40 bg-emerald-950/20' : 'border-red-700/50 bg-red-950/20'} p-2">
          <div class="mb-1 text-[10px] font-black tracking-wider text-slate-400">必要GOLD</div>
          <div class="flex items-center gap-2"><span data-theme-icon class="material-symbols-outlined text-3xl">toll</span><div><div class="text-[11px] font-bold text-slate-400">所持 ${formatNumber(currentGold)} G</div><div class="mt-0.5 text-sm font-black tabular-nums ${hasGold ? 'text-emerald-400' : 'text-red-400'}">${formatNumber(cost.gold)} G</div></div></div>
        </div>
      </div>
      <button data-theme-action data-upgrade="${type.id}" class="mt-2.5 w-full rounded-lg border py-2.5 text-sm font-black text-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35" ${!hasMaterial || !hasGold ? 'disabled' : ''}><span class="material-symbols-outlined mr-1 align-middle text-base">upgrade</span>Lv.${formatNumber(level + 1)}へ強化</button>`}
    </div>`;
  };

  const runAction = async (action) => {
    if (busy) return;
    busy = true;
    try { await action(); render(); }
    catch (error) { showMineMessage(container, error.message || '処理に失敗しました。', true); }
    finally { busy = false; }
  };

  const tick = () => {
    if (!container.isConnected && timer) { clearInterval(timer); timer = null; return; }
    const now = Date.now();
    let notificationStateChanged = false;
    for (const mine of MINES) {
      const state = mineData[mine.id];
      if (!state?.unlocked) continue;
      const wasMaxNotified = state.maxNotified;
      accrueMine(mine, state, now);
      if (!wasMaxNotified && state.maxNotified) notificationStateChanged = true;
      const stats = getMineStats(mine, state);
      const card = container.querySelector(`[data-mine-id="${mine.id}"]`);
      if (!card) continue;
      const stored = card.querySelector('[data-stored]');
      const storageProgress = card.querySelector('[data-storage-progress]');
      const storageTime = card.querySelector('[data-storage-time]');
      const storageLabel = card.querySelector('[data-storage-label]');
      const claim = card.querySelector('[data-claim]');
      if (stored) stored.textContent = `${formatMineAmount(state.storedGold, 2)} / ${formatMineAmount(stats.maxStoredGold, 2)}`;
      if (storageProgress) {
        const percentage = getStorageProgress(state, stats);
        storageProgress.style.width = `${percentage}%`;
        storageProgress.parentElement?.setAttribute('aria-valuenow', percentage.toFixed(1));
      }
      if (storageTime) storageTime.textContent = formatStorageRemaining(state, stats);
      if (storageLabel) storageLabel.textContent = getStorageProgress(state, stats) >= 100 ? '貯蔵状態' : '満杯まで';
      updateClaimButtonAppearance(claim, state.storedGold >= 1);
    }
    updateClaimAllButtonAppearance(
      container.querySelector('[data-claim-all]'),
      MINES.some(mine => mineData[mine.id]?.unlocked && Math.floor(mineData[mine.id].storedGold || 0) > 0)
    );
    if (notificationStateChanged) {
      GameDB.setGameState('mine_data', mineData).catch(error => console.warn('[Mine] Failed to save notification state:', error));
    }
  };

  render();
  tick();
  timer = setInterval(tick, 1000);
  return container;
}
