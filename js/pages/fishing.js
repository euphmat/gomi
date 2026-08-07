import { FISHING_SPOTS, FISH_RARITY, getFishForSpot } from '../definitions/fish.js';
import { FISHING_TACKLE, FISHING_TACKLE_ORDER, getFishingTackleEffect, getFishingTackleVisual } from '../definitions/fishing-tackle.js';
import { getFishingSpotUnlockStatus, getFishingTackleLevel, getRandomCatchDelay, loadFishingData, performFishingCatch, settleFishingSession } from '../data/fishing-manager.js';
import { GameDB } from '../data/database.js';
import { formatNumber } from '../utils/format.js';
import { isScreenLocked, recordLockScreenProgress, setLockScreenActivity } from '../utils/screen-lock.js';
import { playSoundEffect } from '../utils/sound-effects.js';

function updateHeader(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = formatNumber(value);
}

const FISH_TILE_THEME = {
  common: 'border-slate-500/35 from-slate-700/25 via-slate-950/80 to-slate-950 shadow-slate-950/30',
  uncommon: 'border-emerald-500/45 from-emerald-500/20 via-emerald-950/45 to-slate-950 shadow-emerald-950/35',
  rare: 'border-sky-400/50 from-sky-400/20 via-sky-950/45 to-slate-950 shadow-sky-950/35',
  epic: 'border-violet-400/55 from-violet-400/25 via-violet-950/45 to-slate-950 shadow-violet-950/40',
  legendary: 'border-amber-300/60 from-amber-300/25 via-amber-950/45 to-slate-950 shadow-amber-950/40',
  mythic: 'border-fuchsia-300/65 from-fuchsia-300/30 via-fuchsia-950/50 to-slate-950 shadow-fuchsia-950/45',
};

const BONUS_CATCH_META = {
  gold: { label: 'GOLD', icon: 'paid', color: 'text-amber-300', tile: 'border-amber-400/35 from-amber-500/20 via-amber-950/35 to-slate-950' },
  material: { label: '素材', icon: 'category', color: 'text-emerald-300', tile: 'border-emerald-400/35 from-emerald-500/20 via-emerald-950/35 to-slate-950' },
  equipment: { label: '装備', icon: 'swords', color: 'text-sky-300', tile: 'border-sky-400/40 from-sky-500/20 via-sky-950/35 to-slate-950' },
  pet: { label: '仲間', icon: 'pets', color: 'text-pink-300', tile: 'border-pink-400/40 from-pink-500/20 via-pink-950/35 to-slate-950' },
  prism_shard: { label: 'PRISM', icon: 'diamond', color: 'text-fuchsia-300', tile: 'border-fuchsia-400/45 from-fuchsia-500/25 via-fuchsia-950/40 to-slate-950' },
};

export async function renderFishingPage() {
  const [selectedSpotId, initialState] = await Promise.all([
    GameDB.getGameState('currentFishingSpot'),
    loadFishingData(),
  ]);
  const selectedSpot = FISHING_SPOTS.find(item => item.id === selectedSpotId) || FISHING_SPOTS[0];
  const spot = getFishingSpotUnlockStatus(initialState, selectedSpot.id).unlocked
    ? selectedSpot
    : FISHING_SPOTS[0];
  const spotFish = getFishForSpot(spot.id);
  const themeColor = spot.theme?.color || '34, 211, 238';
  const container = document.createElement('div');
  // スクロールはアプリ共通の #content に一本化し、入れ子スクロールによる操作不能を防ぐ。
  container.className = 'relative min-h-full overflow-hidden bg-[#07101c] text-white';
  container.dataset.fishingPage = spot.id;
  let state = initialState;
  let gold = Number(await GameDB.getGameState('gold')) || 0;
  let running = false;
  let catchTimer = null;
  let countdownTimer = null;
  let nextCatchAt = 0;
  let catchStartedAt = 0;
  let catchDelay = 0;
  let activeCatchTab = 'fish';
  let catchInFlight = null;
  let cleanupPromise = null;
  let leaving = false;
  setLockScreenActivity('fishing', false, { mode: 'auto' });

  container.innerHTML = `
    <div class="absolute inset-0 bg-cover bg-center" style="background-image:url('${spot.background}')"></div>
    <div class="absolute inset-0" style="background:linear-gradient(to bottom,rgba(2,6,23,.88),rgba(2,6,23,.32),rgba(2,6,23,.96)),radial-gradient(circle at 82% 12%,rgba(${themeColor},.36),transparent 35%)"></div>
    <div class="relative z-10 pb-4">
      <header class="p-2.5">
        <div class="flex items-center justify-between gap-2 rounded-2xl border bg-slate-950/70 px-3 py-2.5 shadow-xl backdrop-blur-md" style="border-color:rgba(${themeColor},.3)">
          <div class="min-w-0">
            <div class="flex items-center gap-2"><span class="material-symbols-outlined" style="color:rgba(${themeColor},1)">phishing</span><h1 class="truncate text-lg font-black text-white">${spot.name}</h1><span class="rounded-full border border-white/15 bg-black/30 px-1.5 py-0.5 text-[8px] font-black text-slate-300">${spot.tier}</span></div>
            <p class="mt-0.5 text-[10px] text-slate-400">餌 ${formatNumber(spot.baitCost)} G / 1匹 ・ 固有魚 ${spotFish.length}種</p>
          </div>
          <button data-back class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/35 text-slate-200"><span class="material-symbols-outlined">arrow_back</span></button>
        </div>
      </header>

      <main class="flex flex-col gap-2.5 px-2.5 pb-3">
        <section class="relative flex min-h-[155px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/25 bg-cyan-950/20 shadow-[0_14px_40px_rgba(0,0,0,.35)] backdrop-blur-[2px]">
          <div data-ripple class="absolute h-28 w-28 rounded-full border border-cyan-200/20 opacity-0"></div>
          <div data-catch-display class="relative z-10 flex flex-col items-center px-4 text-center">
            <span class="material-symbols-outlined text-4xl text-cyan-100/80 drop-shadow-[0_0_15px_rgba(103,232,249,.7)]">water</span>
            <p class="mt-1 text-xs font-black text-cyan-50">釣りを開始してください</p>
            <p class="mt-1 text-[10px] text-cyan-100/60">魚以外のお宝が釣れることもあります</p>
          </div>
          <div class="absolute inset-x-3 bottom-3">
            <div class="mb-1 flex justify-between text-[10px] font-bold text-cyan-100/70"><span data-status>待機中</span><span data-countdown>--</span></div>
            <div class="h-1.5 overflow-hidden rounded-full bg-slate-950/70"><div data-progress class="h-full w-0 rounded-full bg-gradient-to-r from-cyan-500 to-sky-300"></div></div>
          </div>
        </section>

        <button data-toggle class="rounded-xl border border-cyan-200/60 bg-gradient-to-r from-cyan-600 to-blue-600 py-2.5 text-xs font-black shadow-[0_0_20px_rgba(6,182,212,.3)] active:scale-[.99]">
          <span class="material-symbols-outlined mr-1 align-middle">play_arrow</span><span data-toggle-label>自動釣りを開始</span>
        </button>

        <section class="grid grid-cols-3 gap-1.5 rounded-xl border border-white/10 bg-slate-950/75 p-2 backdrop-blur-md">
          ${FISHING_TACKLE_ORDER.map(type => {
            const definition = FISHING_TACKLE[type];
            const level = getFishingTackleLevel(state, type);
            const visual = getFishingTackleVisual(type, level);
            return `<div class="min-w-0 rounded-lg border border-white/10 bg-black/20 p-1.5 text-center">
              <div class="relative mx-auto flex h-9 w-9 items-center justify-center"><span class="material-symbols-outlined absolute text-2xl text-white/15">${definition.icon}</span>${visual ? `<img src="${visual.image}" onerror="this.remove()" class="relative h-full w-full object-contain" alt="${visual.name}">` : ''}</div>
              <div class="mt-0.5 truncate text-[8px] font-black text-slate-400">${visual?.name || definition.shortName}</div>
              <div class="text-[9px] font-black text-white">Lv.${level}</div>
              <div class="mt-0.5 truncate text-[7px] font-bold text-cyan-300/75">${getFishingTackleEffect(type, level)}</div>
            </div>`;
          }).join('')}
        </section>

        <section class="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-slate-950/75 p-2 backdrop-blur-md">
          <div class="text-center"><div class="text-[9px] text-slate-500">所持G</div><div data-gold class="mt-1 text-xs font-black text-amber-300">${formatNumber(gold)}</div></div>
          <div class="text-center"><div class="text-[9px] text-slate-500">累計釣果</div><div data-total class="mt-1 text-xs font-black text-cyan-300">${formatNumber(state.totalCaught)}</div></div>
          <div class="text-center"><div class="text-[9px] text-slate-500">欠片</div><div data-shards class="mt-1 text-xs font-black text-fuchsia-300">${state.prismShards}/10</div></div>
        </section>

        <section class="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 backdrop-blur-md">
          <div class="grid grid-cols-2 gap-1.5 border-b border-white/10 bg-slate-950/65 p-1.5" role="tablist" aria-label="釣果の種類">
            <button data-catch-tab="fish" role="tab" aria-selected="true" class="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-2 py-2 text-[10px] font-black text-cyan-200"><span class="material-symbols-outlined text-base">set_meal</span>魚 <span data-owned-species class="rounded-full bg-black/25 px-1.5 py-0.5 text-[8px]">0</span></button>
            <button data-catch-tab="bonus" role="tab" aria-selected="false" class="flex items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-2 text-[10px] font-black text-slate-500"><span class="material-symbols-outlined text-base">redeem</span>魚以外 <span data-bonus-count class="rounded-full bg-black/25 px-1.5 py-0.5 text-[8px]">0</span></button>
          </div>
          <div data-catch-panel="fish" role="tabpanel" class="p-2">
            <p class="mb-1.5 px-0.5 text-[8px] text-slate-500">今回の釣果です。釣り場を離れると倉庫へ移動します</p>
            <div data-inventory class="grid gap-1.5" style="grid-template-columns:repeat(4,minmax(0,1fr))"></div>
          </div>
          <div data-catch-panel="bonus" role="tabpanel" class="hidden p-2">
            <div data-recent class="grid grid-cols-3 gap-1.5 sm:grid-cols-4"></div>
          </div>
        </section>
      </main>
    </div>`;

  const renderState = () => {
    container.querySelector('[data-gold]').textContent = formatNumber(gold);
    container.querySelector('[data-total]').textContent = formatNumber(state.totalCaught);
    container.querySelector('[data-shards]').textContent = `${state.prismShards}/10`;
    const inventory = container.querySelector('[data-inventory]');
    const ownedFish = spotFish.filter(fish => (state.sessionInventory[fish.id] || 0) > 0);
    container.querySelector('[data-owned-species]').textContent = formatNumber(ownedFish.length);
    inventory.innerHTML = ownedFish.length ? ownedFish.map(fish => {
      const count = state.sessionInventory[fish.id];
      const rarity = FISH_RARITY[fish.rarity];
      const tileTheme = FISH_TILE_THEME[fish.rarity] || FISH_TILE_THEME.common;
      return `<article data-fish-card="${fish.id}" class="group relative isolate flex aspect-square min-w-0 flex-col overflow-hidden rounded-xl border bg-gradient-to-b ${tileTheme} p-1.5 text-center shadow-md">
        <div data-fish-count class="absolute right-1 top-1 z-10 rounded-full border border-white/10 bg-slate-950/80 px-1 py-0.5 text-[7px] font-black tabular-nums text-white">×${formatNumber(count)}</div>
        <div class="relative flex min-h-0 flex-1 items-center justify-center pt-1">
          <img src="${fish.image}" onerror="this.remove()" class="relative h-14 w-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,.55)] transition-transform duration-200 group-active:scale-110 sm:h-16 md:h-20" alt="${fish.name}">
        </div>
        <div class="truncate rounded-lg bg-black/30 px-1 py-1 text-[9px] font-black leading-tight ${rarity.text}">${fish.name}</div>
      </article>`;
    }).join('') : '<div class="col-span-full flex flex-col items-center py-8 text-center"><span class="material-symbols-outlined text-4xl text-cyan-950">set_meal</span><p class="mt-2 text-xs font-bold text-slate-500">まだ魚を釣っていません</p><p class="mt-1 text-[9px] text-slate-600">自動釣りを開始すると、ここに魚が並びます</p></div>';

    const recent = container.querySelector('[data-recent]');
    const bonusCatches = state.recentBonusCatches.slice(0, 6);
    container.querySelector('[data-bonus-count]').textContent = formatNumber(bonusCatches.length);
    recent.innerHTML = bonusCatches.length ? bonusCatches.map(item => {
      const meta = BONUS_CATCH_META[item.type] || { label: 'BONUS', icon: 'redeem', color: 'text-amber-300', tile: 'border-amber-400/30 from-amber-500/15 via-amber-950/30 to-slate-950' };
      return `<article class="relative flex aspect-square min-w-0 flex-col overflow-hidden rounded-xl border bg-gradient-to-b ${meta.tile} p-1.5 text-center shadow-md">
        ${item.catchCount > 1 ? `<div class="absolute right-1 top-1 z-10 rounded-full border border-white/10 bg-slate-950/80 px-1 py-0.5 text-[7px] font-black tabular-nums text-white">${formatNumber(item.catchCount)}回</div>` : ''}
        <div class="flex min-h-0 flex-1 items-center justify-center pt-1">
          ${item.image ? `<img src="${item.image}" class="h-11 w-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,.55)]" alt="${item.name}">` : `<span class="material-symbols-outlined text-4xl drop-shadow ${meta.color}">${item.icon || meta.icon}</span>`}
        </div>
        <div class="min-w-0 rounded-lg bg-black/30 px-1 py-1">
          <div class="truncate text-[9px] font-black leading-tight text-slate-100">${item.name}</div>
          <div class="mt-0.5 truncate text-[7px] font-black tracking-wide ${meta.color}">${meta.label}</div>
        </div>
      </article>`;
    }).join('') : '<p class="col-span-full py-6 text-center text-[10px] text-slate-500">魚以外の釣果はまだありません</p>';
  };

  const switchCatchTab = tab => {
    activeCatchTab = tab === 'bonus' ? 'bonus' : 'fish';
    container.querySelectorAll('[data-catch-tab]').forEach(button => {
      const active = button.dataset.catchTab === activeCatchTab;
      button.setAttribute('aria-selected', String(active));
      button.className = `flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[10px] font-black transition-colors ${active
        ? activeCatchTab === 'fish' ? 'border-cyan-300/30 bg-cyan-400/15 text-cyan-200' : 'border-amber-300/30 bg-amber-400/15 text-amber-200'
        : 'border-transparent text-slate-500'}`;
    });
    container.querySelectorAll('[data-catch-panel]').forEach(panel => panel.classList.toggle('hidden', panel.dataset.catchPanel !== activeCatchTab));
  };

  const stop = (message = '待機中') => {
    running = false;
    setLockScreenActivity('fishing', false, { mode: 'auto' });
    clearTimeout(catchTimer);
    clearInterval(countdownTimer);
    catchTimer = null;
    countdownTimer = null;
    container.querySelector('[data-status]').textContent = message;
    container.querySelector('[data-countdown]').textContent = '--';
    container.querySelector('[data-progress]').style.width = '0%';
    container.querySelector('[data-toggle-label]').textContent = '自動釣りを開始';
    container.querySelector('[data-toggle] .material-symbols-outlined').textContent = 'play_arrow';
  };

  const showCatch = async result => {
    // The result is still applied to state while locked; only the expensive
    // reveal/splash/card-flight presentation is omitted.
    if (isScreenLocked()) return;
    playSoundEffect('fishBite', { automatic: true });
    const display = container.querySelector('[data-catch-display]');
    if (!display) return;
    const stage = display.closest('section');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const caughtFishes = result.type === 'fish' && Array.isArray(result.fishes) && result.fishes.length
      ? result.fishes.slice(0, 3)
      : result.type === 'fish'
        ? [{ fishId: result.fishId, name: result.name, image: result.image }]
        : [];
    const visual = result.image
      ? result.type === 'fish'
        ? `<div data-catch-visual class="relative flex h-24 w-24 items-center justify-center"><span class="material-symbols-outlined absolute text-6xl text-cyan-200">set_meal</span><img src="${result.image}" onerror="this.remove()" class="relative h-24 w-24 object-contain" alt=""></div>`
        : `<img data-catch-visual src="${result.image}" class="h-24 w-24 object-contain" alt="">`
      : `<span data-catch-visual class="material-symbols-outlined text-6xl">${result.icon || 'redeem'}</span>`;

    // 1. 釣れた物の正体を隠した魚影を先に見せる。
    display.innerHTML = `<div class="relative">${visual}<div class="absolute inset-x-2 bottom-1 h-2 rounded-full bg-black/50 blur-sm"></div></div><p class="mt-1 text-xs font-black tracking-widest text-cyan-100">魚影が浮かんだ…</p>`;
    const shadow = display.querySelector('[data-catch-visual]');
    shadow.style.filter = 'brightness(0) drop-shadow(0 12px 8px rgba(0,0,0,.8))';
    shadow.animate(
      [{ transform: 'translateY(18px) scale(.68) rotate(-7deg)', opacity: 0 }, { transform: 'translateY(-4px) scale(1.05) rotate(5deg)', opacity: 1, offset: .65 }, { transform: 'translateY(0) scale(1)', opacity: 1 }],
      { duration: reducedMotion ? 180 : 480, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
    );
    await wait(reducedMotion ? 170 : 430);
    if (!display.isConnected || leaving) return;

    // 2. ヒット時に水しぶき、画面揺れ、フラッシュを発生させる。
    display.insertAdjacentHTML('beforeend', '<div data-hit class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl font-black italic tracking-[.18em] text-white drop-shadow-[0_0_18px_rgba(34,211,238,1)]">HIT!</div>');
    display.querySelector('[data-hit]').animate(
      [{ transform: 'translate(-50%,-50%) scale(.25) rotate(-12deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.25) rotate(3deg)', opacity: 1, offset: .45 }, { transform: 'translate(-50%,-70%) scale(1)', opacity: 0 }],
      { duration: reducedMotion ? 220 : 520, easing: 'cubic-bezier(.2,.85,.25,1)', fill: 'forwards' }
    );
    stage?.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
      { duration: reducedMotion ? 160 : 330, easing: 'ease-out' }
    );
    const ripple = container.querySelector('[data-ripple]');
    ripple.animate([{ opacity: 0.9, transform: 'scale(.2)' }, { opacity: 0, transform: 'scale(2.5)' }], { duration: reducedMotion ? 300 : 700 });
    for (let i = 0; i < (reducedMotion ? 4 : 14); i++) {
      const splash = document.createElement('span');
      splash.className = 'absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-cyan-100 shadow-[0_0_8px_rgba(103,232,249,.9)]';
      stage?.appendChild(splash);
      const angle = Math.PI * (1.08 + Math.random() * .84);
      const distance = 38 + Math.random() * 80;
      splash.animate(
        [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { opacity: 1, offset: .18 }, { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(0)`, opacity: 0 }],
        { duration: reducedMotion ? 260 : 480 + Math.random() * 260, easing: 'ease-out', fill: 'forwards' }
      ).onfinish = () => splash.remove();
    }
    await wait(reducedMotion ? 190 : 390);
    if (!display.isConnected || leaving) return;

    // 3. 複数釣果時だけ、ルアーが魚群を引き分ける専用演出を挟む。
    const isMultiCatch = caughtFishes.length > 1;
    if (isMultiCatch) {
      const lureVisual = getFishingTackleVisual('lure', getFishingTackleLevel(state, 'lure'));
      const shadowPositions = caughtFishes.length === 2
        ? [{ x: -58, y: -4, rotate: -12 }, { x: 58, y: -4, rotate: 12 }]
        : [{ x: -72, y: 2, rotate: -14 }, { x: 0, y: -22, rotate: 0 }, { x: 72, y: 2, rotate: 14 }];
      display.innerHTML = `
        <div data-multi-stage class="relative h-20 w-[230px] overflow-visible">
          <div data-multi-flash class="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400/40 blur-xl"></div>
          <span data-multi-ring class="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/80"></span>
          <span data-multi-ring class="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/70"></span>
          ${shadowPositions.map((_, index) => `
            <div data-multi-shadow="${index}" class="absolute left-1/2 top-1/2 flex h-11 w-14 items-center justify-center text-cyan-950 opacity-0 drop-shadow-[0_0_8px_rgba(167,139,250,.95)]">
              <span class="material-symbols-outlined text-5xl">set_meal</span>
            </div>
          `).join('')}
          <div data-multi-lure class="absolute left-1/2 top-1/2 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-violet-200/70 bg-slate-950/90 shadow-[0_0_24px_rgba(167,139,250,.95)]">
            <span class="material-symbols-outlined absolute text-3xl text-violet-200">waves</span>
            ${lureVisual?.image ? `<img src="${lureVisual.image}" onerror="this.remove()" class="relative h-10 w-10 object-contain drop-shadow-[0_0_10px_rgba(103,232,249,.9)]" alt="">` : ''}
          </div>
        </div>
        <p data-multi-copy class="-mt-1 text-xs font-black tracking-wide text-white">集魚ルアーが魚群を捉えた！</p>
        <p class="text-[9px] font-black tracking-[.24em] text-violet-300">FISH SHADOW ×${caughtFishes.length}</p>`;

      const multiStage = display.querySelector('[data-multi-stage]');
      const multiLure = display.querySelector('[data-multi-lure]');
      const multiFlash = display.querySelector('[data-multi-flash]');
      multiLure.animate(
        [{ transform: 'translate(-50%,-50%) scale(.35) rotate(-24deg)', filter: 'brightness(2.8)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.28) rotate(9deg)', filter: 'brightness(2)', opacity: 1, offset: .55 }, { transform: 'translate(-50%,-50%) scale(1) rotate(0)', filter: 'brightness(1)', opacity: 1 }],
        { duration: reducedMotion ? 180 : 480, easing: 'cubic-bezier(.2,.85,.25,1)', fill: 'forwards' }
      );
      multiFlash.animate(
        [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.8)', opacity: 1, offset: .38 }, { transform: 'translate(-50%,-50%) scale(2.5)', opacity: .15 }],
        { duration: reducedMotion ? 190 : 600, easing: 'ease-out', fill: 'forwards' }
      );
      display.querySelectorAll('[data-multi-ring]').forEach((ring, index) => ring.animate(
        [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 }, { opacity: .95, offset: .2 }, { transform: 'translate(-50%,-50%) scale(3.7)', opacity: 0 }],
        { duration: reducedMotion ? 220 : 620, delay: index * (reducedMotion ? 35 : 90), easing: 'ease-out', fill: 'both' }
      ));
      display.querySelectorAll('[data-multi-shadow]').forEach((fishShadow, index) => {
        const position = shadowPositions[index];
        fishShadow.animate(
          [
            { transform: 'translate(-50%,-50%) scale(.15) rotate(0)', filter: 'brightness(0) blur(3px)', opacity: 0 },
            { transform: 'translate(-50%,-50%) scale(.72) rotate(0)', filter: 'brightness(0) blur(0)', opacity: .9, offset: .28 },
            { transform: `translate(calc(-50% + ${position.x * 1.12}px), calc(-50% + ${position.y}px)) scale(1.12) rotate(${position.rotate * 1.2}deg)`, filter: 'brightness(0) blur(0)', opacity: 1, offset: .72 },
            { transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(1) rotate(${position.rotate}deg)`, filter: 'brightness(0) blur(0)', opacity: 1 },
          ],
          { duration: reducedMotion ? 210 : 590, delay: index * (reducedMotion ? 20 : 45), easing: 'cubic-bezier(.18,.82,.25,1)', fill: 'forwards' }
        );
      });
      for (let i = 0; i < (reducedMotion ? 4 : 12); i++) {
        const spark = document.createElement('span');
        spark.className = `absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full ${i % 2 ? 'bg-violet-200' : 'bg-cyan-100'} shadow-[0_0_7px_currentColor]`;
        multiStage.appendChild(spark);
        const angle = (Math.PI * 2 * i) / (reducedMotion ? 4 : 12) + Math.random() * .18;
        const distance = 40 + Math.random() * 62;
        spark.animate(
          [{ transform: 'translate(-50%,-50%) scale(0)', opacity: 0 }, { opacity: 1, offset: .22 }, { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance * .55}px)) scale(0)`, opacity: 0 }],
          { duration: reducedMotion ? 220 : 440 + Math.random() * 230, delay: reducedMotion ? 0 : 70, easing: 'ease-out', fill: 'forwards' }
        ).onfinish = () => spark.remove();
      }
      stage?.animate(
        [{ boxShadow: '0 0 0 rgba(139,92,246,0)' }, { boxShadow: 'inset 0 0 38px rgba(139,92,246,.34)', offset: .42 }, { boxShadow: '0 0 0 rgba(139,92,246,0)' }],
        { duration: reducedMotion ? 220 : 650, easing: 'ease-out' }
      );
      await wait(reducedMotion ? 230 : 650);
      if (!display.isConnected || leaving) return;
    }

    // 4. 黒い魚影を解除し、取得アイテムを正式に公開する。
    playSoundEffect('catch', {
      automatic: true,
      rate: isMultiCatch ? 1.12 : result.type === 'fish' ? 1 : 1.2,
    });
    const revealedVisual = result.image
      ? result.type === 'fish'
        ? caughtFishes.length > 1
          ? `<div data-reveal class="flex items-start justify-center gap-1.5">${caughtFishes.map((fish, index) => `<div data-multi-card class="relative w-[72px] min-w-0 overflow-hidden rounded-xl border border-violet-300/40 bg-gradient-to-b from-violet-950/80 to-cyan-950/70 p-1 shadow-[0_0_18px_rgba(103,232,249,.22)]"><span class="absolute left-1 top-0.5 text-[7px] font-black text-violet-200/70">0${index + 1}</span><div class="relative flex h-14 items-center justify-center"><span class="material-symbols-outlined absolute text-4xl text-cyan-800">set_meal</span><img src="${fish.image}" onerror="this.remove()" class="relative h-14 w-full object-contain drop-shadow-[0_0_15px_rgba(103,232,249,.75)]" alt=""></div><div class="truncate rounded-md bg-black/25 px-0.5 py-0.5 text-[8px] font-black text-cyan-50">${fish.name}</div></div>`).join('')}</div>`
          : `<div data-reveal class="relative flex h-24 w-24 items-center justify-center"><span class="material-symbols-outlined absolute text-6xl text-cyan-200">set_meal</span><img src="${result.image}" onerror="this.remove()" class="relative h-24 w-24 object-contain drop-shadow-[0_0_20px_rgba(103,232,249,.7)]" alt=""></div>`
        : `<img data-reveal src="${result.image}" class="h-24 w-24 object-contain drop-shadow-[0_0_20px_rgba(103,232,249,.7)]" alt="">`
      : `<span data-reveal class="material-symbols-outlined text-6xl ${result.type === 'prism_shard' ? 'text-fuchsia-300' : 'text-amber-300'}">${result.icon || 'redeem'}</span>`;
    display.innerHTML = `${revealedVisual}
      <p data-reveal-name class="mt-1 text-sm font-black text-white">${caughtFishes.length > 1 ? `同時釣果 ×${caughtFishes.length}` : result.name}</p>
      <p class="text-[9px] font-bold uppercase tracking-widest ${caughtFishes.length > 1 ? 'text-violet-300' : 'text-cyan-200/70'}">${caughtFishes.length > 1 ? 'LURE MULTI CATCH' : result.type === 'fish' ? ' ' : 'BONUS CATCH'}</p>`;
    if (isMultiCatch) {
      const fanAngles = caughtFishes.length === 2 ? [-5, 5] : [-7, 0, 7];
      display.querySelectorAll('[data-multi-card]').forEach((card, index) => {
        const angle = fanAngles[index];
        card.animate(
          [
            { transform: `translateY(20px) scale(.45) rotate(${angle * -1.6}deg)`, filter: 'brightness(3) blur(2px)', opacity: 0 },
            { transform: `translateY(-4px) scale(1.13) rotate(${angle * 1.4}deg)`, filter: 'brightness(1.7) blur(0)', opacity: 1, offset: .62 },
            { transform: `translateY(0) scale(1) rotate(${angle}deg)`, filter: 'brightness(1) blur(0)', opacity: 1 },
          ],
          { duration: reducedMotion ? 220 : 520, delay: index * (reducedMotion ? 45 : 115), easing: 'cubic-bezier(.16,.86,.25,1)', fill: 'both' }
        );
      });
    } else {
      display.querySelector('[data-reveal]').animate(
        [{ transform: 'scale(.25) rotate(-18deg)', filter: 'brightness(3)', opacity: 0 }, { transform: 'scale(1.18) rotate(5deg)', filter: 'brightness(1.7)', opacity: 1, offset: .55 }, { transform: 'scale(1) rotate(0)', filter: 'brightness(1)', opacity: 1 }],
        { duration: reducedMotion ? 260 : 620, easing: 'cubic-bezier(.2,.85,.25,1)', fill: 'forwards' }
      );
    }
    display.querySelector('[data-reveal-name]').animate(
      [{ transform: 'translateY(10px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
      { duration: reducedMotion ? 180 : 420, delay: isMultiCatch ? (reducedMotion ? 100 : 300) : (reducedMotion ? 0 : 160), fill: 'both' }
    );
    await wait(isMultiCatch ? (reducedMotion ? 330 : 820) : (reducedMotion ? 230 : 520));

    // 5. 魚だけを1匹ずつ、画面下の「今回の釣果」にある該当カードへ移す。
    if (caughtFishes.length && !leaving) {
      const cards = isMultiCatch
        ? Array.from(display.querySelectorAll('[data-multi-card]'))
        : [display.querySelector('[data-reveal]')].filter(Boolean);
      const caughtByFishId = caughtFishes.reduce((counts, fish) => {
        counts[fish.fishId] = (counts[fish.fishId] || 0) + 1;
        return counts;
      }, {});

      // 新しく釣れた魚のカードを着地点として先に用意し、表示数だけを釣る前へ戻す。
      renderState();
      switchCatchTab('fish');
      const inventoryCards = new Map(
        Array.from(container.querySelectorAll('[data-fish-card]')).map(card => [card.dataset.fishCard, card])
      );
      const displayedCounts = {};
      Object.entries(caughtByFishId).forEach(([fishId, catchCount]) => {
        const targetCard = inventoryCards.get(fishId);
        const finalCount = Number(state.sessionInventory[fishId]) || 0;
        displayedCounts[fishId] = Math.max(0, finalCount - catchCount);
        const countDisplay = targetCard?.querySelector('[data-fish-count]');
        if (countDisplay) countDisplay.textContent = `×${formatNumber(displayedCounts[fishId])}`;
        if (targetCard && displayedCounts[fishId] < 1) {
          targetCard.style.opacity = '.28';
          targetCard.style.transform = 'scale(.94)';
        }
      });

      const catchItems = cards.map((card, index) => ({
        card,
        fish: caughtFishes[index],
        source: card.querySelector('img') || card,
      })).filter(item => item.fish);
      const revealName = display.querySelector('[data-reveal-name]');
      if (revealName) revealName.textContent = caughtFishes.length > 1 ? '釣果へ1匹ずつ追加！' : '今回の釣果へ追加！';

      const playInventoryImpact = (targetCard, fishId) => {
        if (!targetCard) return;
        targetCard.style.opacity = '1';
        targetCard.style.transform = '';
        targetCard.animate(
          [
            { transform: 'scale(.94)', filter: 'brightness(1)' },
            { transform: 'scale(1.08)', filter: 'brightness(1.8)', boxShadow: '0 0 28px rgba(52,211,153,.7)', offset: .48 },
            { transform: 'scale(1)', filter: 'brightness(1)', boxShadow: '0 0 0 rgba(52,211,153,0)' },
          ],
          { duration: reducedMotion ? 160 : 360, easing: 'cubic-bezier(.2,.8,.2,1)' }
        );
        const countDisplay = targetCard.querySelector('[data-fish-count]');
        displayedCounts[fishId] = (displayedCounts[fishId] || 0) + 1;
        if (countDisplay) {
          countDisplay.textContent = `×${formatNumber(displayedCounts[fishId])}`;
          countDisplay.animate(
            [{ transform: 'scale(.65)', backgroundColor: 'rgba(16,185,129,.9)' }, { transform: 'scale(1.4)', offset: .5 }, { transform: 'scale(1)' }],
            { duration: reducedMotion ? 140 : 300, easing: 'ease-out' }
          );
        }
        const flash = document.createElement('span');
        flash.className = 'pointer-events-none absolute inset-0 rounded-xl bg-emerald-300/25';
        targetCard.appendChild(flash);
        flash.animate(
          [{ opacity: 0 }, { opacity: 1, offset: .25 }, { opacity: 0 }],
          { duration: reducedMotion ? 150 : 330, easing: 'ease-out' }
        ).onfinish = () => flash.remove();
      };

      await Promise.all(catchItems.map(({ card, fish, source }, index) => new Promise(resolve => {
        const targetCard = inventoryCards.get(fish.fishId);
        const target = targetCard || container.querySelector('[data-inventory]');
        if (!target) {
          resolve();
          return;
        }
        const sourceRect = source.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const clone = source.cloneNode(true);
        clone.removeAttribute('data-reveal');
        clone.style.position = 'fixed';
        clone.style.left = `${sourceRect.left}px`;
        clone.style.top = `${sourceRect.top}px`;
        clone.style.width = `${sourceRect.width}px`;
        clone.style.height = `${sourceRect.height}px`;
        clone.style.margin = '0';
        clone.style.zIndex = '200';
        clone.style.pointerEvents = 'none';
        clone.style.objectFit = 'contain';
        clone.style.filter = 'drop-shadow(0 0 12px rgba(103,232,249,.85))';
        document.body.appendChild(clone);
        const deltaX = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
        const deltaY = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);
        const animation = clone.animate(
          reducedMotion
            ? [{ opacity: 1 }, { transform: `translate(${deltaX}px, ${deltaY}px) scale(.25)`, opacity: 0 }]
            : [
                { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
                { transform: `translate(${deltaX * .48}px, ${deltaY * .42 - 38}px) scale(.84) rotate(${index % 2 ? -11 : 11}deg)`, opacity: 1, offset: .48 },
                { transform: `translate(${deltaX}px, ${deltaY}px) scale(.22) rotate(${index % 2 ? -24 : 24}deg)`, opacity: .2 },
              ],
          { duration: reducedMotion ? 180 : 430, delay: index * (reducedMotion ? 55 : 145), easing: 'cubic-bezier(.35,.05,.55,1)', fill: 'forwards' }
        );
        animation.onfinish = () => {
          clone.remove();
          card.style.opacity = '0';
          playInventoryImpact(targetCard, fish.fishId);
          resolve();
        };
        animation.oncancel = () => {
          clone.remove();
          resolve();
        };
      })));
      if (!display.isConnected || leaving) return;
      display.innerHTML = `<span class="material-symbols-outlined text-4xl text-cyan-100/80 drop-shadow-[0_0_15px_rgba(103,232,249,.7)]">water</span>
        <p class="mt-1 text-xs font-black text-cyan-50">次のアタリを待っています</p>
        <p class="mt-1 text-[9px] font-black text-cyan-200/60">魚は下の「今回の釣果」に追加されました</p>`;
      display.animate(
        [{ transform: 'translateY(5px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
        { duration: reducedMotion ? 120 : 260, easing: 'ease-out' }
      );
      await wait(reducedMotion ? 170 : 380);
    }
  };

  const startCountdown = () => {
    clearInterval(countdownTimer);
    countdownTimer = null;
    if (isScreenLocked() || !running || nextCatchAt <= Date.now()) return;
    const renderCountdown = () => {
      const remaining = Math.max(0, nextCatchAt - Date.now());
      container.querySelector('[data-countdown]').textContent = `${(remaining / 1000).toFixed(1)}秒`;
      container.querySelector('[data-progress]').style.width = `${Math.min(100, ((Date.now() - catchStartedAt) / catchDelay) * 100)}%`;
    };
    renderCountdown();
    countdownTimer = setInterval(renderCountdown, 100);
  };

  const schedule = () => {
    if (!running || !container.isConnected || window.location.hash !== '#/fishing') return stop();
    const delay = getRandomCatchDelay(spot.id, getFishingTackleLevel(state, 'rod'));
    const startedAt = Date.now();
    catchStartedAt = startedAt;
    catchDelay = delay;
    nextCatchAt = startedAt + delay;
    if (!isScreenLocked()) container.querySelector('[data-status]').textContent = 'アタリを待っています…';
    startCountdown();
    catchTimer = setTimeout(() => {
      clearInterval(countdownTimer);
      catchInFlight = (async () => {
        try {
          const caught = await performFishingCatch(spot.id);
          state = caught.state;
          gold = caught.gold;
          const catchResult = caught.result;
          recordLockScreenProgress('fishing', {
            fish: catchResult.type === 'fish'
              ? Math.max(1, Number(catchResult.catchCount) || catchResult.fishes?.length || 1)
              : 0,
            materials: catchResult.type === 'material' ? Math.max(0, Number(catchResult.amount) || 0) : 0,
            loot: ['equipment', 'pet', 'prism_shard'].includes(catchResult.type) ? 1 : 0,
            gold: catchResult.type === 'gold' ? Math.max(0, Number(catchResult.amount) || 0) : 0,
          });
          if (!isScreenLocked()) updateHeader('header-gold-display', gold);
          if (caught.result.prismGained) {
            const prism = await GameDB.getGameState('prism') || 0;
            if (!isScreenLocked()) updateHeader('header-prism-display', prism);
          }
          if (!leaving && container.isConnected) {
            await showCatch(caught.result);
            if (!leaving && container.isConnected) {
              if (!isScreenLocked()) renderState();
              catchTimer = setTimeout(schedule, 250);
            }
          }
        } catch (error) {
          if (!leaving) stop(error.message || '釣りを続けられません。');
        }
      })().finally(() => { catchInFlight = null; });
    }, delay);
  };

  const cleanup = () => {
    if (cleanupPromise) return cleanupPromise;
    leaving = true;
    document.removeEventListener('screenlockchange', handleScreenLockChange);
    stop();
    cleanupPromise = (async () => {
      if (catchInFlight) await catchInFlight;
      await settleFishingSession();
    })();
    return cleanupPromise;
  };
  container.cleanup = cleanup;

  const handleScreenLockChange = event => {
    if (event.detail?.locked) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      return;
    }
    if (!leaving && container.isConnected) {
      renderState();
      updateHeader('header-gold-display', gold);
      GameDB.getGameState('prism')
        .then(prism => updateHeader('header-prism-display', Number(prism) || 0))
        .catch(error => console.warn('[Fishing] Failed to refresh Prism header:', error));
      if (running && nextCatchAt > Date.now()) {
        container.querySelector('[data-status]').textContent = 'アタリを待っています…';
        startCountdown();
      }
    }
  };
  document.addEventListener('screenlockchange', handleScreenLockChange);

  container.querySelector('[data-toggle]').addEventListener('click', () => {
    if (running) return stop('釣りを中断しました');
    if (gold < spot.baitCost) return stop('Goldが足りません');
    running = true;
    setLockScreenActivity('fishing', true, { mode: 'auto', reset: true });
    container.querySelector('[data-toggle-label]').textContent = '自動釣りを停止';
    container.querySelector('[data-toggle] .material-symbols-outlined').textContent = 'stop';
    schedule();
  });
  container.querySelectorAll('[data-catch-tab]').forEach(button => {
    button.addEventListener('click', () => switchCatchTab(button.dataset.catchTab));
  });
  container.querySelector('[data-back]').addEventListener('click', async () => {
    await cleanup();
    window.location.hash = '/dungeon';
  });
  renderState();
  switchCatchTab(activeCatchTab);
  return container;
}
