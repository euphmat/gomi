import { FISH, FISHING_SPOTS, FISH_RARITY } from '../definitions/fish.js';
import { getRandomCatchDelay, loadFishingData, performFishingCatch, settleFishingSession } from '../data/fishing-manager.js';
import { GameDB } from '../data/database.js';
import { formatNumber } from '../utils/format.js';

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
  const spot = FISHING_SPOTS[0];
  const container = document.createElement('div');
  // スクロールはアプリ共通の #content に一本化し、入れ子スクロールによる操作不能を防ぐ。
  container.className = 'relative min-h-full overflow-hidden bg-[#07101c] text-white';
  container.dataset.fishingPage = spot.id;
  let state = await loadFishingData();
  let gold = Number(await GameDB.getGameState('gold')) || 0;
  let running = false;
  let catchTimer = null;
  let countdownTimer = null;
  let nextCatchAt = 0;
  let activeCatchTab = 'fish';
  let catchInFlight = null;
  let cleanupPromise = null;
  let leaving = false;

  container.innerHTML = `
    <div class="absolute inset-0 bg-cover bg-center" style="background-image:url('${spot.background}')"></div>
    <div class="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/30 to-slate-950/95"></div>
    <div class="relative z-10 pb-4">
      <header class="p-2.5">
        <div class="flex items-center justify-between gap-2 rounded-2xl border border-cyan-300/25 bg-slate-950/70 px-3 py-2.5 shadow-xl backdrop-blur-md">
          <div class="min-w-0">
            <div class="flex items-center gap-2"><span class="material-symbols-outlined text-cyan-300">phishing</span><h1 class="truncate text-lg font-black text-cyan-100">${spot.name}</h1></div>
            <p class="mt-0.5 text-[10px] text-slate-400">餌 ${formatNumber(spot.baitCost)} G / 1匹</p>
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
            <div data-inventory class="grid grid-cols-4 gap-1.5 sm:grid-cols-5"></div>
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
    const ownedFish = FISH.filter(fish => (state.sessionInventory[fish.id] || 0) > 0);
    container.querySelector('[data-owned-species]').textContent = formatNumber(ownedFish.length);
    inventory.innerHTML = ownedFish.length ? ownedFish.map(fish => {
      const count = state.sessionInventory[fish.id];
      const rarity = FISH_RARITY[fish.rarity];
      const tileTheme = FISH_TILE_THEME[fish.rarity] || FISH_TILE_THEME.common;
      return `<article class="group relative isolate flex aspect-square min-w-0 flex-col overflow-hidden rounded-xl border bg-gradient-to-b ${tileTheme} p-1.5 text-center shadow-md">
        <div class="absolute right-1 top-1 z-10 rounded-full border border-white/10 bg-slate-950/80 px-1 py-0.5 text-[7px] font-black tabular-nums text-white">×${formatNumber(count)}</div>
        <div class="flex min-h-0 flex-1 items-center justify-center pt-1">
          <img src="${fish.image}" class="h-10 w-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,.55)] transition-transform duration-200 group-hover:scale-110" alt="${fish.name}">
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
    const display = container.querySelector('[data-catch-display]');
    if (!display) return;
    const stage = display.closest('section');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const fishCatches = result.type === 'fish' && Array.isArray(result.catches) ? result.catches : [];
    const visual = fishCatches.length > 1
      ? `<div data-catch-visual class="flex h-24 items-center justify-center -space-x-9">${fishCatches.map((fish, index) => `<img src="${fish.image}" class="h-20 w-20 object-contain drop-shadow-[0_5px_7px_rgba(0,0,0,.7)]" style="z-index:${index}" alt="">`).join('')}</div>`
      : result.image
        ? `<img data-catch-visual src="${result.image}" class="h-24 w-24 object-contain" alt="">`
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

    // 3. 黒い魚影を解除し、取得アイテムを正式に公開する。
    const revealedVisual = fishCatches.length > 1
      ? `<div data-reveal class="flex h-24 items-center justify-center -space-x-9">${fishCatches.map((fish, index) => `<img src="${fish.image}" class="h-20 w-20 object-contain drop-shadow-[0_0_14px_rgba(103,232,249,.65)]" style="z-index:${index}" alt="${fish.name}">`).join('')}</div>`
      : result.image
        ? `<img data-reveal src="${result.image}" class="h-24 w-24 object-contain drop-shadow-[0_0_20px_rgba(103,232,249,.7)]" alt="">`
        : `<span data-reveal class="material-symbols-outlined text-6xl ${result.type === 'prism_shard' ? 'text-fuchsia-300' : 'text-amber-300'}">${result.icon || 'redeem'}</span>`;
    display.innerHTML = `${revealedVisual}
      <p data-reveal-name class="mt-1 text-sm font-black text-white">${result.name}</p>
      <p class="text-[9px] font-bold uppercase tracking-widest text-cyan-200/70">${result.type === 'fish' ? ' ' : 'BONUS CATCH'}</p>`;
    display.querySelector('[data-reveal]').animate(
      [{ transform: 'scale(.25) rotate(-18deg)', filter: 'brightness(3)', opacity: 0 }, { transform: 'scale(1.18) rotate(5deg)', filter: 'brightness(1.7)', opacity: 1, offset: .55 }, { transform: 'scale(1) rotate(0)', filter: 'brightness(1)', opacity: 1 }],
      { duration: reducedMotion ? 260 : 620, easing: 'cubic-bezier(.2,.85,.25,1)', fill: 'forwards' }
    );
    display.querySelector('[data-reveal-name]').animate(
      [{ transform: 'translateY(10px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
      { duration: reducedMotion ? 180 : 420, delay: reducedMotion ? 0 : 160, fill: 'both' }
    );
    await wait(reducedMotion ? 230 : 520);
  };

  const schedule = () => {
    if (!running || !container.isConnected || window.location.hash !== '#/fishing') return stop();
    const delay = getRandomCatchDelay(spot.id);
    const startedAt = Date.now();
    nextCatchAt = startedAt + delay;
    container.querySelector('[data-status]').textContent = 'アタリを待っています…';
    countdownTimer = setInterval(() => {
      const remaining = Math.max(0, nextCatchAt - Date.now());
      container.querySelector('[data-countdown]').textContent = `${(remaining / 1000).toFixed(1)}秒`;
      container.querySelector('[data-progress]').style.width = `${Math.min(100, ((Date.now() - startedAt) / delay) * 100)}%`;
    }, 100);
    catchTimer = setTimeout(() => {
      clearInterval(countdownTimer);
      catchInFlight = (async () => {
        try {
          const caught = await performFishingCatch(spot.id);
          state = caught.state;
          gold = caught.gold;
          updateHeader('header-gold-display', gold);
          if (caught.result.prismGained) {
            const prism = await GameDB.getGameState('prism') || 0;
            updateHeader('header-prism-display', prism);
          }
          if (!leaving && container.isConnected) {
            await showCatch(caught.result);
            if (!leaving && container.isConnected) {
              renderState();
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
    stop();
    cleanupPromise = (async () => {
      if (catchInFlight) await catchInFlight;
      await settleFishingSession();
    })();
    return cleanupPromise;
  };
  container.cleanup = cleanup;

  container.querySelector('[data-toggle]').addEventListener('click', () => {
    if (running) return stop('釣りを中断しました');
    if (gold < spot.baitCost) return stop('Goldが足りません');
    running = true;
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
