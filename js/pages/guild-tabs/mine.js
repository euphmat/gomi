import { GameDB } from '../../data/database.js';
import { MINES, MINE_UPGRADE_TYPES, MINE_MAX_UPGRADE_LEVEL, getMineStats, getMineUpgradeCost } from '../../definitions/mines.js';
import { MATERIALS } from '../../definitions/materials.js';
import { FISH, FISH_OIL_BOOST_MS } from '../../definitions/fish.js';
import { accrueMine, claimMineGold, loadMineData, unlockMine, upgradeMine, useFishOilFuel } from '../../data/mine-manager.js';
import { convertFishToOil, loadFishingData } from '../../data/fishing-manager.js';
import { formatNumber } from '../../utils/format.js';

const MATERIAL_MAP = new Map(MATERIALS.map(item => [item.id, item]));
const MINE_THEME_CACHE = new Map();

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) return { hue: 210, saturation: 20, lightness: lightness * 100 };
  const delta = max - min;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  return { hue, saturation: saturation * 100, lightness: lightness * 100 };
}

async function showFishOilWorkshop(onUpdate) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm';
  const modal = document.createElement('div');
  modal.className = 'flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-orange-400/30 bg-[#11131a] shadow-[0_24px_80px_rgba(0,0,0,.7)]';
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  let busy = false;
  let lastResult = null;
  const close = () => overlay.remove();
  overlay.onclick = event => { if (event.target === overlay) close(); };

  const renderWorkshop = async () => {
    const fishing = await loadFishingData();
    const available = FISH.filter(fish => (fishing.inventory[fish.id] || 0) > 0);
    modal.innerHTML = `
      <header class="border-b border-orange-400/15 bg-gradient-to-r from-orange-950/65 to-amber-950/30 p-4">
        <div class="flex items-start justify-between gap-3"><div><div class="flex items-center gap-2 text-orange-200"><span class="material-symbols-outlined">precision_manufacturing</span><h3 class="text-base font-black">魚油精製所</h3></div><p class="mt-1 text-[10px] leading-relaxed text-slate-400">魚を選んで魚油へ加工します。魚ごとに精製量が異なります。</p></div><button data-close class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/25 text-slate-400"><span class="material-symbols-outlined text-lg">close</span></button></div>
        <div class="mt-3 grid grid-cols-2 gap-2"><div class="rounded-xl border border-white/10 bg-black/20 p-2.5"><div class="text-[9px] text-slate-500">所持している魚</div><div class="mt-0.5 text-sm font-black text-cyan-300">${formatNumber(FISH.reduce((sum, fish) => sum + (fishing.inventory[fish.id] || 0), 0))}匹</div></div><div class="rounded-xl border border-orange-400/20 bg-orange-950/25 p-2.5"><div class="text-[9px] text-orange-200/60">精製済み魚油</div><div class="mt-0.5 text-sm font-black text-orange-300">${formatNumber(fishing.fishOil || 0)}個</div></div></div>
      </header>
      ${lastResult ? `<div class="border-b border-orange-400/20 bg-orange-950/45 px-4 py-2.5 text-[10px] text-orange-100"><span class="material-symbols-outlined mr-1 align-middle text-base text-orange-300">task_alt</span>魚油を <span class="font-black">${formatNumber(lastResult.oilGained)}個</span> 精製しました</div>` : ''}
      <div class="no-scrollbar flex-1 space-y-2 overflow-y-auto p-3">${available.length ? available.map(fish => {
        const owned = fishing.inventory[fish.id] || 0;
        return `<article data-oil-card="${fish.id}" class="rounded-2xl border border-slate-700/70 bg-slate-950/65 p-3"><div class="flex items-center gap-3"><div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-orange-400/15 bg-orange-950/20 p-1"><img src="${fish.image}" class="h-full w-full object-contain" alt=""></div><div class="min-w-0 flex-1"><div class="flex items-center justify-between gap-2"><div class="truncate text-xs font-black text-slate-100">${fish.name}</div><span class="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[9px] font-black text-cyan-300">${formatNumber(owned)}匹</span></div><div class="mt-1 text-[9px] text-slate-500">1匹 → <span class="font-black text-orange-300">魚油 ${formatNumber(fish.oilYield)}個</span></div><div data-oil-preview class="mt-1.5 rounded-lg border border-orange-400/10 bg-orange-950/20 px-2 py-1.5 text-[9px] font-black text-orange-300"></div></div></div><div class="mt-3 grid grid-cols-[38px_1fr_38px_60px] gap-1.5"><button data-step="-1" class="h-10 rounded-xl border border-slate-700 bg-slate-800 text-lg font-black text-slate-300">−</button><input data-amount type="number" inputmode="numeric" min="1" max="${owned}" value="1" class="h-10 min-w-0 rounded-xl border border-orange-400/25 bg-slate-900 px-2 text-center text-sm font-black text-white outline-none focus:border-orange-400"><button data-step="1" class="h-10 rounded-xl border border-slate-700 bg-slate-800 text-lg font-black text-slate-300">＋</button><button data-max class="h-10 rounded-xl border border-cyan-400/25 bg-cyan-950/40 text-[10px] font-black text-cyan-300">MAX</button></div><button data-convert="${fish.id}" class="mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-orange-300/35 bg-gradient-to-r from-orange-700 to-amber-600 text-[11px] font-black text-white"><span class="material-symbols-outlined text-base">precision_manufacturing</span><span data-convert-label></span></button></article>`;
      }).join('') : '<div class="py-12 text-center"><span class="material-symbols-outlined text-4xl text-slate-700">set_meal</span><p class="mt-2 text-xs font-bold text-slate-500">加工できる魚がありません</p><p class="mt-1 text-[9px] text-slate-600">釣り場で魚を入手してください</p></div>'}</div>
      <footer class="border-t border-slate-800 bg-slate-950/60 px-4 py-3 text-[10px] text-slate-400"><span class="font-black text-orange-300">魚油1個</span>で、投入した鉱山の採掘速度が<span class="font-black text-white">1分間・2倍</span></footer>`;
    modal.querySelector('[data-close]').onclick = close;
    const updateOilCard = card => {
      const fish = FISH.find(item => item.id === card.dataset.oilCard);
      const owned = fishing.inventory[fish.id] || 0;
      const input = card.querySelector('[data-amount]');
      const amount = Math.max(1, Math.min(owned, Math.floor(Number(input.value) || 1)));
      input.value = amount;
      const oil = fish.oilYield * amount;
      card.querySelector('[data-oil-preview]').textContent = `${formatNumber(amount)}匹 → 魚油 ${formatNumber(oil)}個`;
      card.querySelector('[data-convert-label]').textContent = `${formatNumber(amount)}匹をまとめて精製`;
    };
    modal.querySelectorAll('[data-oil-card]').forEach(card => {
      const input = card.querySelector('[data-amount]');
      input.addEventListener('input', () => updateOilCard(card));
      card.querySelectorAll('[data-step]').forEach(button => button.onclick = () => {
        input.value = (Number(input.value) || 1) + Number(button.dataset.step);
        updateOilCard(card);
      });
      card.querySelector('[data-max]').onclick = () => { input.value = input.max; updateOilCard(card); };
      updateOilCard(card);
    });
    modal.querySelectorAll('[data-convert]').forEach(button => button.onclick = async () => {
      if (busy) return;
      busy = true;
      const input = button.closest('[data-oil-card]').querySelector('[data-amount]');
      try {
        const fish = FISH.find(item => item.id === button.dataset.convert);
        const amount = Number(input.value) || 1;
        const result = await convertFishToOil(button.dataset.convert, amount);
        await playFishOilCraftAnimation(fish, amount, result.oilGained, modal);
        lastResult = result;
        await onUpdate?.(result);
        await renderWorkshop();
      } catch (error) { alert(error.message || '魚油の精製に失敗しました。'); }
      finally { busy = false; }
    });
  };
  await renderWorkshop();
}

function playFishOilCraftAnimation(fish, amount, oilGained, sourceModal) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reducedMotion ? 520 : 1250;
  const layer = document.createElement('div');
  layer.className = 'fixed inset-0 z-[140] overflow-hidden bg-black/35 pointer-events-none backdrop-blur-[1px]';
  const rect = sourceModal.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = Math.min(innerHeight - 110, Math.max(120, rect.top + rect.height / 2));
  layer.innerHTML = `
    <div data-oil-reactor class="absolute flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-orange-300/70 bg-orange-950/95 text-orange-200 shadow-[0_0_45px_rgba(249,115,22,.65)]" style="left:${centerX}px;top:${centerY}px"><span class="material-symbols-outlined text-5xl">precision_manufacturing</span></div>
    <img data-oil-fish src="${fish.image}" class="absolute h-20 w-20 object-contain drop-shadow-[0_0_14px_rgba(34,211,238,.65)]" style="left:${centerX - 145}px;top:${centerY - 40}px" alt="">
    <div data-oil-result class="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center opacity-0" style="left:${centerX}px;top:${centerY}px"><span class="material-symbols-outlined text-7xl text-orange-300 drop-shadow-[0_0_24px_rgba(249,115,22,.9)]">oil_barrel</span><div class="mt-1 rounded-full border border-orange-300/40 bg-slate-950/90 px-4 py-1.5 text-sm font-black text-orange-100">魚油 +${formatNumber(oilGained)}</div><div class="mt-1 text-[9px] font-black text-slate-300">${fish.name} × ${formatNumber(amount)}</div><div class="mt-1 text-[9px] font-black tracking-widest text-orange-300/70">REFINING COMPLETE</div></div>`;
  document.body.appendChild(layer);
  const reactor = layer.querySelector('[data-oil-reactor]');
  const fishImage = layer.querySelector('[data-oil-fish]');
  const result = layer.querySelector('[data-oil-result]');
  fishImage.animate(
    [{ transform: 'translateX(0) rotate(0deg) scale(1)', opacity: 1 }, { transform: 'translateX(105px) rotate(180deg) scale(.7)', opacity: 1, offset: .65 }, { transform: 'translateX(105px) rotate(360deg) scale(0)', opacity: 0 }],
    { duration: reducedMotion ? 230 : 620, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }
  );
  reactor.animate(
    [{ transform: 'translate(-50%,-50%) scale(.7) rotate(0deg)', filter: 'brightness(.8)' }, { transform: 'translate(-50%,-50%) scale(1.12) rotate(180deg)', filter: 'brightness(2)', offset: .62 }, { transform: 'translate(-50%,-50%) scale(.25) rotate(360deg)', filter: 'brightness(4)', opacity: 0 }],
    { duration: reducedMotion ? 300 : 760, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
  );
  for (let i = 0; i < (reducedMotion ? 5 : 20); i++) {
    const spark = document.createElement('span');
    spark.className = 'absolute h-1.5 w-1.5 rounded-full bg-orange-300 shadow-[0_0_8px_rgba(251,146,60,.9)]';
    spark.style.left = `${centerX}px`;
    spark.style.top = `${centerY}px`;
    layer.appendChild(spark);
    const angle = Math.random() * Math.PI * 2;
    const distance = 45 + Math.random() * 100;
    spark.animate(
      [{ transform: 'translate(-50%,-50%) scale(0)', opacity: 0 }, { opacity: 1, offset: .2 }, { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px),calc(-50% + ${Math.sin(angle) * distance}px)) scale(0)`, opacity: 0 }],
      { duration: reducedMotion ? 280 : 520 + Math.random() * 380, delay: reducedMotion ? 120 : 380 + Math.random() * 180, easing: 'ease-out', fill: 'forwards' }
    );
  }
  result.animate(
    [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.14)', opacity: 1, offset: .58 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }],
    { duration: reducedMotion ? 360 : 720, delay: reducedMotion ? 170 : 520, easing: 'cubic-bezier(.2,.85,.25,1)', fill: 'forwards' }
  );
  return new Promise(resolve => setTimeout(() => {
    layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }).onfinish = () => layer.remove();
    resolve();
  }, duration));
}

function formatFuelDuration(amount) {
  const minutes = Math.max(0, Math.floor(amount));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${formatNumber(rest)}分`;
  if (!rest) return `${formatNumber(hours)}時間`;
  return `${formatNumber(hours)}時間 ${formatNumber(rest)}分`;
}

async function showFishOilFuelModal(mine, initialState, initialFishOil, onUpdate) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm';
  const modal = document.createElement('div');
  modal.className = 'w-full max-w-sm overflow-hidden rounded-3xl border border-orange-300/30 bg-[#11131a] shadow-[0_24px_90px_rgba(0,0,0,.8)]';
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  let fishOil = initialFishOil;
  let fuelUntil = Number(initialState.fuelUntil) || 0;
  let amount = Math.min(1, fishOil);
  let busy = false;
  let lastAdded = 0;
  const close = () => overlay.remove();
  overlay.onclick = event => { if (event.target === overlay) close(); };

  const render = () => {
    const safeAmount = fishOil > 0 ? Math.max(1, Math.min(fishOil, Math.floor(Number(amount) || 1))) : 0;
    amount = safeAmount;
    const projectedUntil = Math.max(Date.now(), fuelUntil) + FISH_OIL_BOOST_MS * safeAmount;
    modal.innerHTML = `
      <header class="border-b border-orange-400/15 bg-gradient-to-br from-orange-950/80 via-slate-950 to-amber-950/55 p-4"><div class="flex items-start justify-between gap-3"><div><div class="flex items-center gap-2"><span class="material-symbols-outlined rounded-xl border border-orange-300/20 bg-orange-400/10 p-2 text-orange-300">oil_barrel</span><div><h3 class="text-base font-black text-orange-100">${mine.name}へ燃料投入</h3><p class="text-[8px] font-black tracking-widest text-orange-300/60">FUEL CONTROL</p></div></div><p class="mt-2 text-[10px] text-slate-400">魚油1個につき採掘速度2倍の時間を1分延長します。</p></div><button data-close class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/25 text-slate-400"><span class="material-symbols-outlined text-lg">close</span></button></div></header>
      ${lastAdded ? `<div class="border-b border-orange-400/20 bg-orange-950/45 px-4 py-2.5 text-[10px] text-orange-100"><span class="material-symbols-outlined mr-1 align-middle text-base text-orange-300">task_alt</span>燃料時間を <span class="font-black">${formatFuelDuration(lastAdded)}</span> 追加しました</div>` : ''}
      <div class="space-y-3 p-4"><div class="grid grid-cols-2 gap-2 text-center"><div class="rounded-xl border border-orange-400/15 bg-orange-950/20 p-2.5"><div class="text-[8px] text-slate-500">所持魚油</div><div class="mt-0.5 text-sm font-black text-orange-300">${formatNumber(fishOil)}個</div></div><div class="rounded-xl border border-white/10 bg-black/20 p-2.5"><div class="text-[8px] text-slate-500">現在の稼働残り</div><div class="mt-0.5 font-mono text-sm font-black text-white">${formatFuelTime(fuelUntil)}</div></div></div>
        <div class="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-3"><div class="mb-2 flex items-center justify-between"><span class="text-[10px] font-black text-slate-300">投入する魚油</span><span class="text-[9px] text-slate-500">1個 = 1分</span></div><div class="grid grid-cols-[42px_1fr_42px_64px] gap-1.5"><button data-step="-1" ${fishOil < 1 ? 'disabled' : ''} class="h-11 rounded-xl border border-slate-700 bg-slate-800 text-xl font-black text-slate-300 disabled:opacity-30">−</button><input data-amount type="number" inputmode="numeric" min="1" max="${Math.max(1, fishOil)}" value="${safeAmount || 1}" ${fishOil < 1 ? 'disabled' : ''} class="h-11 min-w-0 rounded-xl border border-orange-400/30 bg-slate-900 px-2 text-center text-base font-black text-white outline-none disabled:opacity-30"><button data-step="1" ${fishOil < 1 ? 'disabled' : ''} class="h-11 rounded-xl border border-slate-700 bg-slate-800 text-xl font-black text-slate-300 disabled:opacity-30">＋</button><button data-max ${fishOil < 1 ? 'disabled' : ''} class="h-11 rounded-xl border border-orange-400/25 bg-orange-950/40 text-[10px] font-black text-orange-300 disabled:opacity-30">MAX</button></div><div class="mt-2 grid grid-cols-3 gap-1.5">${[1, 10, 60].map(value => `<button data-preset="${value}" ${fishOil < 1 ? 'disabled' : ''} class="rounded-lg border border-slate-700 bg-slate-900 py-1.5 text-[9px] font-black text-slate-400 disabled:opacity-30">${value === 60 ? '1時間' : `${value}個`}</button>`).join('')}</div></div>
        <div class="rounded-2xl border border-orange-400/20 bg-gradient-to-r from-orange-950/35 to-amber-950/20 p-3"><div class="flex items-center justify-between text-[10px]"><span class="text-slate-400">追加される時間</span><span data-added-time class="font-black text-orange-300">+${formatFuelDuration(safeAmount)}</span></div><div class="mt-2 flex items-center justify-between border-t border-white/5 pt-2 text-[10px]"><span class="text-slate-400">投入後の稼働残り</span><span data-after-time class="font-mono font-black text-white">${formatFuelTime(projectedUntil)}</span></div></div>
        <button data-submit ${fishOil < 1 ? 'disabled' : ''} class="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-orange-300/35 bg-gradient-to-r from-orange-700 to-amber-600 text-xs font-black text-white shadow-[0_0_20px_rgba(249,115,22,.2)] disabled:cursor-not-allowed disabled:opacity-35"><span class="material-symbols-outlined">local_fire_department</span><span data-submit-label>${fishOil < 1 ? '魚油がありません' : `${formatNumber(safeAmount)}個の燃料を投入`}</span></button></div>`;
    modal.querySelector('[data-close]').onclick = close;
    const input = modal.querySelector('[data-amount]');
    const clampAmount = value => Math.max(1, Math.min(fishOil, Math.floor(Number(value) || 1)));
    const updatePreview = value => {
      amount = clampAmount(value);
      const after = Math.max(Date.now(), fuelUntil) + FISH_OIL_BOOST_MS * amount;
      const added = modal.querySelector('[data-added-time]');
      const afterTime = modal.querySelector('[data-after-time]');
      const label = modal.querySelector('[data-submit-label]');
      if (added) added.textContent = `+${formatFuelDuration(amount)}`;
      if (afterTime) afterTime.textContent = formatFuelTime(after);
      if (label) label.textContent = `${formatNumber(amount)}個の燃料を投入`;
    };
    const updateAmount = value => { amount = clampAmount(value); render(); };
    input?.addEventListener('input', () => updatePreview(input.value));
    modal.querySelectorAll('[data-step]').forEach(button => button.onclick = () => updateAmount(amount + Number(button.dataset.step)));
    modal.querySelector('[data-max]')?.addEventListener('click', () => updateAmount(fishOil));
    modal.querySelectorAll('[data-preset]').forEach(button => button.onclick = () => updateAmount(Number(button.dataset.preset)));
    modal.querySelector('[data-submit]')?.addEventListener('click', async () => {
      amount = clampAmount(input?.value || amount);
      if (busy || amount < 1) return;
      busy = true;
      try {
        const used = amount;
        const result = await useFishOilFuel(mine.id, used);
        fishOil = result.fishOil;
        fuelUntil = result.fuelUntil;
        amount = Math.min(used, fishOil);
        lastAdded = used;
        await onUpdate?.(result);
        render();
      } catch (error) { alert(error.message || '燃料投入に失敗しました。'); }
      finally { busy = false; }
    });
  };
  render();
}

function extractMineTheme(imageSrc) {
  if (MINE_THEME_CACHE.has(imageSrc)) return MINE_THEME_CACHE.get(imageSrc);
  const promise = new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 48;
        canvas.height = 16;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const hueBins = Array.from({ length: 24 }, () => ({ weight: 0, hue: 0, saturation: 0 }));
        for (let i = 0; i < pixels.length; i += 4) {
          const hsl = rgbToHsl(pixels[i], pixels[i + 1], pixels[i + 2]);
          if (hsl.lightness < 8 || hsl.lightness > 92 || hsl.saturation < 18) continue;
          const weight = (hsl.saturation / 100) * (1 - Math.abs(hsl.lightness - 52) / 52);
          const bin = hueBins[Math.floor(hsl.hue / 15) % hueBins.length];
          bin.weight += weight;
          bin.hue += hsl.hue * weight;
          bin.saturation += hsl.saturation * weight;
        }
        const dominant = hueBins.reduce((best, bin) => bin.weight > best.weight ? bin : best, hueBins[0]);
        const hue = dominant.weight ? dominant.hue / dominant.weight : 210;
        const saturation = dominant.weight ? Math.max(45, Math.min(90, dominant.saturation / dominant.weight)) : 45;
        resolve({ hue, saturation });
      } catch (_) {
        resolve({ hue: 210, saturation: 45 });
      }
    };
    image.onerror = () => resolve({ hue: 210, saturation: 45 });
    image.src = imageSrc;
  });
  MINE_THEME_CACHE.set(imageSrc, promise);
  return promise;
}

async function applyMineTheme(container, card, mine) {
  const { hue, saturation } = await extractMineTheme(mine.image);
  if (!card.isConnected || !container.querySelector(`[data-mine-id="${mine.id}"]`)) return;
  const secondaryHue = (hue + 32) % 360;
  const accent = `hsl(${hue.toFixed(0)} ${saturation.toFixed(0)}% 55%)`;
  const bright = `hsl(${hue.toFixed(0)} ${Math.min(100, saturation + 8).toFixed(0)}% 72%)`;
  const deep = `hsl(${hue.toFixed(0)} ${Math.max(35, saturation - 15).toFixed(0)}% 10%)`;
  const panel = `hsl(${hue.toFixed(0)} ${Math.max(30, saturation - 20).toFixed(0)}% 16% / 0.72)`;
  const border = `hsl(${hue.toFixed(0)} ${saturation.toFixed(0)}% 55% / 0.48)`;
  const secondary = `hsl(${secondaryHue.toFixed(0)} ${saturation.toFixed(0)}% 62%)`;
  container.style.background = `radial-gradient(circle at 50% 8%, hsl(${hue} ${saturation}% 18% / .55), transparent 42%), ${deep}`;
  card.style.background = `linear-gradient(160deg, ${panel}, hsl(${hue} 25% 6% / .96))`;
  card.style.borderColor = border;
  card.style.boxShadow = `0 14px 36px hsl(${hue} ${saturation}% 4% / .65), 0 0 20px hsl(${hue} ${saturation}% 48% / .12)`;
  container.querySelectorAll('[data-theme-panel]').forEach(el => { el.style.background = panel; el.style.borderColor = border; });
  container.querySelectorAll('[data-theme-text]').forEach(el => { el.style.color = bright; });
  container.querySelectorAll('[data-theme-icon]').forEach(el => { el.style.color = accent; });
  container.querySelectorAll('[data-theme-bar]').forEach(el => { el.style.background = `linear-gradient(90deg, ${accent}, ${bright})`; });
  container.querySelectorAll('[data-theme-cycle]').forEach(el => { el.style.background = `linear-gradient(90deg, ${secondary}, ${bright})`; });
  container.querySelectorAll('[data-theme-track]').forEach(el => { el.style.background = deep; el.style.borderColor = border; });
  container.querySelectorAll('[data-theme-action]').forEach(el => {
    el.style.background = `linear-gradient(90deg, hsl(${hue} ${saturation}% 38%), ${accent})`;
    el.style.borderColor = border;
    el.style.boxShadow = `0 0 14px hsl(${hue} ${saturation}% 50% / .22)`;
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

function formatFuelTime(fuelUntil, now = Date.now()) {
  const seconds = Math.max(0, Math.ceil(((Number(fuelUntil) || 0) - now) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
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
    ? 'border-yellow-300/60 bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 shadow-[0_0_16px_rgba(250,204,21,.28)] hover:brightness-110 active:scale-[.98]'
    : 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500 opacity-70 shadow-none'}`;
  button.innerHTML = canClaim
    ? '<span class="material-symbols-outlined mr-1 align-middle text-base">toll</span>Goldを回収'
    : '<span class="material-symbols-outlined mr-1 align-middle text-base">hourglass_empty</span>Goldを回収';
}

async function showMineUnlockAnimation(mine) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { hue, saturation } = await extractMineTheme(mine.image);
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
  const accent = `hsl(${hue} ${saturation}% 62%)`;
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
  const { hue, saturation } = await extractMineTheme(mine.image);
  const typeInfo = MINE_UPGRADE_TYPES.find(item => item.id === type);
  const accent = `hsl(${hue} ${saturation}% 64%)`;
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
  flash.style.background = `radial-gradient(circle at center, hsl(${hue} ${saturation}% 55% / .28), transparent 68%)`;
  flash.style.boxShadow = `0 0 35px ${accent}, inset 0 0 24px hsl(${hue} ${saturation}% 55% / .35)`;
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
  badge.style.boxShadow = `0 0 32px hsl(${hue} ${saturation}% 50% / .45)`;
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
  let currentFishing = await loadFishingData();
  let currentFishOil = currentFishing.fishOil || 0;
  let busy = false;
  let timer = null;
  let currentPage = 0;

  const render = () => {
    container.innerHTML = `
      <div class="mx-auto flex min-h-full max-w-xl flex-col">
        <div data-theme-panel class="mb-3 overflow-hidden rounded-2xl border p-4 shadow-xl">
          <div class="flex items-center gap-3">
            <span data-theme-icon class="material-symbols-outlined text-3xl">landscape</span>
            <div><h2 data-theme-text class="text-base font-black tracking-wider">鉱山開発</h2><p class="mt-0.5 text-[10px] text-stone-400">鉱脈を開発し、時間経過で蓄積したGoldを回収しよう。</p></div>
          </div>
        </div>
        <button data-oil-workshop class="mb-3 overflow-hidden rounded-2xl border border-orange-400/25 bg-gradient-to-r from-orange-950/70 via-slate-900 to-amber-950/45 p-3 text-left shadow-lg active:scale-[.99]">
          <div class="flex items-center gap-3"><div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-300/25 bg-orange-500/10"><span class="material-symbols-outlined text-2xl text-orange-300">oil_barrel</span></div><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><span class="text-xs font-black text-orange-100">魚油精製所</span><span class="rounded-full bg-orange-400/10 px-2 py-0.5 text-[9px] font-black text-orange-300">所持 ${formatNumber(currentFishOil)}</span></div><p class="mt-1 text-[9px] text-slate-400">魚を魚油へ加工し、採掘機の燃料を作る</p></div><span class="material-symbols-outlined text-slate-500">chevron_right</span></div>
        </button>
        <div class="flex-1" data-mine-list></div>
        <nav data-theme-panel class="sticky bottom-0 z-10 mt-4 rounded-2xl border p-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md" aria-label="鉱山ページ">
          <div class="flex items-center gap-2">
            <button data-page-prev data-theme-action class="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border text-xs font-black text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30" ${currentPage === 0 ? 'disabled' : ''}><span class="material-symbols-outlined text-lg">chevron_left</span>前へ</button>
            <div data-theme-text class="min-w-16 text-center text-[10px] font-black tracking-widest">${currentPage + 1} / ${MINES.length}</div>
            <button data-page-next data-theme-action class="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border text-xs font-black text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30" ${currentPage === MINES.length - 1 ? 'disabled' : ''}>次へ<span class="material-symbols-outlined text-lg">chevron_right</span></button>
          </div>
        </nav>
      </div>`;
    const list = container.querySelector('[data-mine-list]');
    container.querySelector('[data-oil-workshop]').addEventListener('click', () => showFishOilWorkshop(result => {
      currentFishing = result.state;
      currentFishOil = currentFishing.fishOil || 0;
      render();
    }));
    const currentMine = MINES[currentPage];
    const card = createMineCard(currentMine);
    list.appendChild(card);
    applyMineTheme(container, card, currentMine);

    const changePage = (page) => {
      if (page < 0 || page >= MINES.length || page === currentPage) return;
      currentPage = page;
      render();
      container.scrollTo({ top: 0, behavior: 'smooth' });
    };
    container.querySelector('[data-page-prev]')?.addEventListener('click', () => changePage(currentPage - 1));
    container.querySelector('[data-page-next]')?.addEventListener('click', () => changePage(currentPage + 1));
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
          <div data-theme-panel class="rounded-xl border p-2.5">
            <div class="mb-1.5 flex items-center justify-between"><span class="text-[10px] font-bold text-stone-400">蓄積Gold</span><span data-theme-text class="font-mono text-sm font-black" data-stored>${formatMineAmount(state.storedGold, 2)} / ${formatMineAmount(stats.maxStoredGold, 2)}</span></div>
            <div data-theme-track class="h-2 overflow-hidden rounded-full border" role="progressbar" aria-label="貯蔵庫の使用量" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${storageProgress.toFixed(1)}"><div data-theme-bar data-storage-progress class="h-full transition-all" style="width:${storageProgress}%"></div></div>
            <div class="mt-2 flex items-center justify-between text-[9px] text-stone-500"><span>${formatMineAmount(stats.goldPerSecond)} G / 秒</span><span>満杯まで約 ${formatMineAmount(stats.storageHours, 2)}時間</span></div>
            <button data-claim></button>
          </div>
          <div data-theme-panel class="rounded-xl border p-2.5">
            <div class="flex items-center gap-2"><span class="material-symbols-outlined text-orange-300">oil_barrel</span><div class="min-w-0 flex-1"><div class="text-[10px] font-black text-orange-200">魚油燃料</div><div class="text-[9px] text-slate-400">1個で1分間、採掘スピード2倍</div></div><span class="text-xs font-black text-orange-300">所持 ${formatNumber(currentFishOil)}</span></div>
            <div class="mt-2 flex items-center gap-2"><div class="flex-1 rounded-lg border border-orange-500/20 bg-orange-950/20 px-2 py-2 text-[10px] text-slate-300">稼働残り <span data-fuel-time class="font-mono font-black ${state.fuelUntil > Date.now() ? 'text-orange-300' : 'text-slate-500'}">${formatFuelTime(state.fuelUntil)}</span></div><button data-fuel-open class="flex items-center gap-1 rounded-lg border border-orange-400/40 bg-gradient-to-r from-orange-700 to-amber-600 px-3 py-2 text-[10px] font-black text-white"><span class="material-symbols-outlined text-sm">tune</span>数量を選んで投入</button></div>
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
    card.querySelector('[data-fuel-open]')?.addEventListener('click', () => showFishOilFuelModal(mine, state, currentFishOil, result => {
      mineData = result.data;
      currentFishOil = result.fishOil;
      render();
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
      const claim = card.querySelector('[data-claim]');
      const fuelTime = card.querySelector('[data-fuel-time]');
      if (stored) stored.textContent = `${formatMineAmount(state.storedGold, 2)} / ${formatMineAmount(stats.maxStoredGold, 2)}`;
      if (storageProgress) {
        const percentage = getStorageProgress(state, stats);
        storageProgress.style.width = `${percentage}%`;
        storageProgress.parentElement?.setAttribute('aria-valuenow', percentage.toFixed(1));
      }
      updateClaimButtonAppearance(claim, state.storedGold >= 1);
      if (fuelTime) {
        fuelTime.textContent = formatFuelTime(state.fuelUntil, now);
        fuelTime.className = `font-mono font-black ${state.fuelUntil > now ? 'text-orange-300' : 'text-slate-500'}`;
      }
    }
    if (notificationStateChanged) {
      GameDB.setGameState('mine_data', mineData).catch(error => console.warn('[Mine] Failed to save notification state:', error));
    }
  };

  render();
  tick();
  timer = setInterval(tick, 1000);
  return container;
}
