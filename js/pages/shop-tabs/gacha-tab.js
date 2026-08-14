import { GameDB } from '../../data/database.js';
import { PRISM_GACHA_COST, TREASURES, getTreasureRate, getTreasureValue } from '../../definitions/treasures.js';
import { drawPrismGacha, getTreasureLevels, loadTreasureLevels } from '../../data/treasure-manager.js';
import { formatNumber } from '../../utils/format.js';

function updatePrismHeader(prism) {
  const element = document.getElementById('header-prism-display');
  if (element) element.textContent = formatNumber(prism);
}

export async function renderGachaTab() {
  const container = document.createElement('div');
  container.className = 'h-full overflow-y-auto bg-[#080714] px-3 pb-8 pt-3 text-slate-100';
  await loadTreasureLevels();
  let levels = getTreasureLevels();
  let prism = Number(await GameDB.getGameState('prism')) || 0;
  let drawing = false;

  const render = () => {
    const availableCount = TREASURES.filter(treasure => (levels[treasure.id] || 0) < treasure.maxLevel).length;
    const collectionComplete = availableCount === 0;
    container.innerHTML = `
      <div class="mx-auto max-w-2xl space-y-4">
        <section class="relative isolate overflow-hidden rounded-3xl border border-fuchsia-400/35 bg-gradient-to-br from-violet-950 via-slate-950 to-cyan-950 p-5 shadow-[0_0_45px_rgba(168,85,247,0.18)]">
          <div class="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl"></div>
          <div class="pointer-events-none absolute -bottom-20 -right-12 h-52 w-52 rounded-full bg-cyan-400/20 blur-3xl"></div>
          <div class="relative flex flex-col items-center text-center">
            <h2 class="bg-gradient-to-r from-fuchsia-300 via-white to-cyan-300 bg-clip-text text-2xl font-black tracking-wider text-transparent">伝説の秘宝ガチャ</h2>
            <p class="mt-2 max-w-md text-[11px] leading-relaxed text-slate-300">手に入れた瞬間から効果は常時発動。重複すると上限レベルまで効果が強化され、上限到達後は排出対象から外れます。</p>
            <div class="my-4 grid w-full max-w-sm grid-cols-3 gap-2" aria-hidden="true">
              ${['pocket_watch', 'hero_medal', 'rainbow_piggy_bank'].map((id, index) => {
                const treasure = TREASURES.find(item => item.id === id);
                return `<div class="relative aspect-square overflow-hidden rounded-2xl border ${index === 1 ? 'border-fuchsia-300/50 bg-fuchsia-900/25' : 'border-slate-600/50 bg-slate-900/60'} shadow-inner">
                  <img src="${treasure.image}" alt="${treasure.name}" class="h-full w-full object-contain p-2">
                </div>`;
              }).join('')}
            </div>
            <button data-draw class="group flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/60 bg-gradient-to-r from-fuchsia-600 via-violet-600 to-cyan-600 py-3.5 text-sm font-black text-white shadow-[0_0_24px_rgba(192,38,211,0.35)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45" ${prism < PRISM_GACHA_COST || drawing || collectionComplete ? 'disabled' : ''}>
              <span class="material-symbols-outlined text-xl">${drawing ? 'progress_activity' : collectionComplete ? 'workspace_premium' : 'auto_awesome'}</span>
              ${drawing ? '秘宝を召喚中…' : collectionComplete ? '全秘宝 MAX' : `${PRISM_GACHA_COST} Prismで召喚`}
            </button>
          </div>
        </section>

        <section class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/75">
          <div class="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div><h3 class="text-sm font-black text-white">秘宝ラインナップ</h3><p class="mt-0.5 text-[9px] text-slate-500">${collectionComplete ? `全${TREASURES.length}種が上限レベルに到達` : `全${TREASURES.length}種・未上限の${availableCount}種から同率で排出`}</p></div>
            <span class="rounded-full border border-cyan-800/60 bg-cyan-950/40 px-2 py-1 text-[9px] font-bold text-cyan-300">${collectionComplete ? 'COMPLETE' : '合計 100%'}</span>
          </div>
          <div class="divide-y divide-slate-800/75">
            ${TREASURES.map(treasure => {
              const level = levels[treasure.id] || 0;
              const owned = level > 0;
              const maxed = level >= treasure.maxLevel;
              const effectText = treasure.display(getTreasureValue(treasure, owned ? level : 1));
              return `<article class="flex items-center gap-3 px-3 py-3 transition-colors ${owned ? 'bg-gradient-to-r from-fuchsia-950/20 via-slate-950/20 to-cyan-950/10' : 'bg-slate-950/30'}">
                <div class="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${owned ? 'border-fuchsia-500/40 bg-gradient-to-br from-violet-950/70 to-slate-900 shadow-[0_0_14px_rgba(217,70,239,0.14)]' : 'border-slate-800 bg-slate-950'}">
                  <img src="${treasure.image}" alt="${treasure.name}" class="h-full w-full object-contain p-1 ${owned ? 'saturate-100' : 'grayscale opacity-35 brightness-75'}">
                  ${owned ? '<div class="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-cyan-300/10"></div>' : ''}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2"><h4 class="truncate text-xs font-black ${owned ? 'text-white' : 'text-slate-500'}">${treasure.name}</h4>${owned ? `<span class="shrink-0 rounded-md border ${maxed ? 'border-amber-500/60 bg-amber-950/60 text-amber-300' : 'border-fuchsia-700/50 bg-fuchsia-950/70 text-fuchsia-300'} px-1.5 py-0.5 text-[9px] font-black">${maxed ? 'MAX' : `Lv.${level} / ${treasure.maxLevel}`}</span>` : `<span class="shrink-0 rounded-md border border-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">未所持・上限Lv.${treasure.maxLevel}</span>`}</div>
                  <div class="mt-1.5 rounded-lg border px-2 py-1.5 ${owned ? 'border-cyan-900/60 bg-cyan-950/25' : 'border-slate-800/70 bg-slate-900/30'}">
                    <div class="text-[8px] font-black tracking-wider ${owned ? 'text-cyan-500' : 'text-slate-600'}">${owned ? '現在の効果' : 'Lv.1 獲得時'}</div>
                    <p class="mt-0.5 text-[10px] font-bold leading-snug ${owned ? 'text-cyan-100' : 'text-slate-500'}">${effectText}</p>
                  </div>
                </div>
                <div class="shrink-0 text-right"><div class="text-[8px] font-bold text-slate-600">${maxed ? '排出対象' : '現在の排出率'}</div><div class="font-mono text-xs font-black ${maxed ? 'text-amber-400' : 'text-cyan-300'}">${maxed ? 'MAX' : `${(getTreasureRate(treasure, levels) * 100).toFixed(2)}%`}</div></div>
              </article>`;
            }).join('')}
          </div>
        </section>
      </div>`;

    container.querySelector('[data-draw]')?.addEventListener('click', performDraw);
  };

  const showResult = async result => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const overlay = document.createElement('div');
    overlay.className = 'gacha-summon-overlay fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#03000c] p-4';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `${result.treasure.name}の召喚結果`);
    overlay.innerHTML = `
      <style>
        @keyframes gacha-cosmos { 0% { transform: scale(1) rotate(0deg); opacity:.45 } 50% { transform: scale(1.18) rotate(8deg); opacity:.9 } 100% { transform: scale(1.3) rotate(14deg); opacity:.55 } }
        @keyframes gacha-ring-spin { to { transform: rotate(360deg) } }
        @keyframes gacha-ring-reverse { to { transform: rotate(-360deg) } }
        @keyframes gacha-core-charge { 0% { transform: scale(.3) rotate(0deg); opacity:0; filter:brightness(1) } 45% { opacity:1 } 82% { transform:scale(1.25) rotate(180deg); filter:brightness(2.5) } 100% { transform:scale(.05) rotate(270deg); opacity:0; filter:brightness(5) } }
        @keyframes gacha-spark-flight { 0% { transform:rotate(var(--angle)) translateY(0) scale(0); opacity:0 } 25% { opacity:1 } 100% { transform:rotate(var(--angle)) translateY(calc(var(--distance) * -1)) scale(1.3); opacity:0 } }
        @keyframes gacha-flash { 0% { opacity:0 } 18% { opacity:1 } 100% { opacity:0 } }
        @keyframes gacha-result-in { 0% { opacity:0; transform:scale(.2) translateY(50px); filter:brightness(5) blur(10px) } 55% { opacity:1; transform:scale(1.08) translateY(-8px); filter:brightness(1.8) blur(0) } 100% { opacity:1; transform:scale(1) translateY(0); filter:brightness(1) } }
        @keyframes gacha-treasure-float { 0%,100% { transform:translateY(0) rotate(-1deg) } 50% { transform:translateY(-9px) rotate(1deg) } }
        @keyframes gacha-rainbow-border { 0% { box-shadow:0 0 35px #d946ef88, inset 0 0 20px #22d3ee22 } 33% { box-shadow:0 0 50px #22d3ee99, inset 0 0 25px #facc1522 } 66% { box-shadow:0 0 45px #facc1599, inset 0 0 20px #d946ef22 } 100% { box-shadow:0 0 35px #d946ef88, inset 0 0 20px #22d3ee22 } }
        .gacha-cosmos { animation:gacha-cosmos 2.2s ease-in-out both }
        .gacha-ring-a { animation:gacha-ring-spin 2.2s cubic-bezier(.2,.7,.2,1) both }
        .gacha-ring-b { animation:gacha-ring-reverse 1.5s cubic-bezier(.2,.7,.2,1) both }
        .gacha-core { animation:gacha-core-charge 1.9s cubic-bezier(.2,.7,.2,1) both }
        .gacha-spark { animation:gacha-spark-flight 1.35s ease-out var(--delay) both }
        .gacha-flash.is-active { animation:gacha-flash .8s ease-out both }
        .gacha-result.is-visible { animation:gacha-result-in .9s cubic-bezier(.16,1,.3,1) both }
        .gacha-result.is-visible .gacha-treasure-image { animation:gacha-treasure-float 2.8s ease-in-out .9s infinite }
        .gacha-result-frame { animation:gacha-rainbow-border 3s linear infinite }
        @media (prefers-reduced-motion: reduce) { .gacha-cosmos,.gacha-ring-a,.gacha-ring-b,.gacha-core,.gacha-spark,.gacha-flash.is-active,.gacha-result.is-visible,.gacha-result.is-visible .gacha-treasure-image,.gacha-result-frame { animation-duration:.01ms !important; animation-iteration-count:1 !important } }
      </style>
      <div class="gacha-cosmos pointer-events-none absolute -inset-[35%] bg-[conic-gradient(from_20deg,transparent,#7c3aed44,transparent,#0891b244,transparent,#d946ef44,transparent)] blur-3xl"></div>
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,.22),transparent_48%),radial-gradient(circle_at_20%_20%,rgba(34,211,238,.13),transparent_25%),radial-gradient(circle_at_80%_80%,rgba(250,204,21,.10),transparent_25%)]"></div>
      <div data-particles class="pointer-events-none absolute inset-0"></div>
      <div data-summon-stage class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center transition-all duration-500">
        <div class="relative flex h-64 w-64 items-center justify-center">
          <div class="gacha-ring-a absolute inset-3 rounded-full border border-fuchsia-300/70 shadow-[0_0_30px_rgba(217,70,239,.6)] before:absolute before:left-1/2 before:top-[-5px] before:h-2.5 before:w-2.5 before:-translate-x-1/2 before:rounded-full before:bg-white before:shadow-[0_0_18px_6px_#d946ef]"></div>
          <div class="gacha-ring-b absolute inset-10 rounded-full border-2 border-dashed border-cyan-300/70 shadow-[0_0_25px_rgba(34,211,238,.5)]"></div>
          <div class="absolute inset-20 rotate-45 border border-amber-200/60 shadow-[0_0_20px_rgba(250,204,21,.45)]"></div>
          <div class="gacha-core h-20 w-20 rotate-45 bg-gradient-to-br from-white via-fuchsia-300 to-cyan-400 shadow-[0_0_45px_18px_rgba(217,70,239,.75)]"></div>
        </div>
        <div class="mt-4 text-sm font-black tracking-widest text-white drop-shadow-[0_0_12px_rgba(255,255,255,.8)]">5 Prismが秘宝へと姿を変える…</div>
      </div>
      <div data-flash class="gacha-flash pointer-events-none absolute inset-0 z-20 bg-white opacity-0"></div>
      <div data-result class="gacha-result pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4 opacity-0">
        <div class="gacha-result-frame relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-b from-violet-900/95 via-slate-950/98 to-cyan-950/95 p-[1px] text-center">
          <div class="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-fuchsia-400/25 to-transparent"></div>
          <div class="relative rounded-[calc(2rem-1px)] p-5">
            <div class="text-[10px] font-black tracking-[0.3em] ${result.previousLevel > 0 ? 'text-amber-300' : 'text-fuchsia-200'}">${result.previousLevel > 0 ? 'TREASURE UPGRADE' : 'LEGENDARY TREASURE'}</div>
            <div class="mx-auto my-4 flex h-44 w-44 items-center justify-center rounded-3xl border border-white/40 bg-[radial-gradient(circle,rgba(255,255,255,.16),rgba(15,23,42,.75))] shadow-[0_0_35px_rgba(232,121,249,.45)]">
              <img src="${result.treasure.image}" alt="${result.treasure.name}" class="gacha-treasure-image h-full w-full object-contain p-3 drop-shadow-[0_0_16px_rgba(255,255,255,.45)]">
            </div>
            <h3 class="bg-gradient-to-r from-fuchsia-200 via-white to-cyan-200 bg-clip-text text-2xl font-black tracking-wider text-transparent drop-shadow">${result.treasure.name}</h3>
            <div class="mt-1 text-sm font-black text-amber-300">${result.level >= result.treasure.maxLevel ? `Lv.${result.level} MAX` : result.previousLevel > 0 ? `Lv.${result.previousLevel} → Lv.${result.level} / ${result.treasure.maxLevel}` : `Lv.${result.level} / ${result.treasure.maxLevel}`}</div>
            <div class="mt-3 rounded-xl border border-cyan-400/30 bg-slate-950/60 p-3">
              <div class="text-[8px] font-black tracking-widest text-cyan-500">現在の効果</div>
              <p class="mt-1 text-xs font-black text-cyan-100">${result.treasure.display(result.value)}</p>
            </div>
            ${result.refunded ? '<div class="mt-3 rounded-xl border border-cyan-300/50 bg-cyan-950/70 p-2 text-xs font-black text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,.25)]">虹の貯金箱が発動！ 5 Prism返却</div>' : ''}
            <button data-close class="mt-5 w-full translate-y-2 rounded-xl border border-white/30 bg-gradient-to-r from-fuchsia-600 via-violet-600 to-cyan-600 py-3 text-sm font-black text-white opacity-0 shadow-[0_0_22px_rgba(217,70,239,.35)] transition-all duration-500 active:scale-[0.98]" disabled>秘宝を受け取る</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const particles = overlay.querySelector('[data-particles]');
    const particleCount = reducedMotion ? 0 : 42;
    for (let i = 0; i < particleCount; i++) {
      const spark = document.createElement('span');
      spark.className = 'gacha-spark absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-white shadow-[0_0_8px_3px_rgba(232,121,249,.85)]';
      spark.style.setProperty('--angle', `${(360 / particleCount) * i + Math.random() * 12}deg`);
      spark.style.setProperty('--distance', `${100 + Math.random() * 180}px`);
      spark.style.setProperty('--delay', `${Math.random() * 0.7}s`);
      particles.appendChild(spark);
    }

    const wait = duration => new Promise(resolve => setTimeout(resolve, duration));
    await wait(reducedMotion ? 30 : 1750);
    overlay.querySelector('[data-flash]').classList.add('is-active');
    overlay.querySelector('[data-summon-stage]').classList.add('scale-150', 'opacity-0');
    const resultPanel = overlay.querySelector('[data-result]');
    resultPanel.classList.add('is-visible');
    resultPanel.classList.remove('pointer-events-none');

    await wait(reducedMotion ? 30 : 850);
    const closeButton = overlay.querySelector('[data-close]');
    closeButton.disabled = false;
    closeButton.classList.remove('translate-y-2', 'opacity-0');

    const close = () => {
      document.removeEventListener('keydown', onKeyDown);
      overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reducedMotion ? 1 : 250, easing: 'ease-out' }).onfinish = () => overlay.remove();
    };
    const onKeyDown = event => {
      if (event.key === 'Escape') close();
    };
    closeButton.onclick = close;
    document.addEventListener('keydown', onKeyDown);
  };

  const performDraw = async () => {
    if (drawing) return;
    drawing = true;
    render();
    try {
      const result = await drawPrismGacha();
      prism = result.prism;
      levels = getTreasureLevels();
      updatePrismHeader(prism);
      await showResult(result);
    } catch (error) {
      window.alert(error.message || 'ガチャを実行できませんでした。');
    } finally {
      drawing = false;
      render();
    }
  };

  render();
  return container;
}
