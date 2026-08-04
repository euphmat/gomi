import { FISH, FISHING_SPOTS, FISH_RARITY, getFishForSpot } from '../../definitions/fish.js';
import { loadFishingData } from '../../data/fishing-manager.js';

export async function renderFishLibraryTab() {
  const state = await loadFishingData();
  const container = document.createElement('div');
  container.className = 'h-full overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(34,211,238,.08),transparent_38%)] p-3 pb-4 no-scrollbar';
  const discoveredCount = FISH.filter(fish => state.discovered[fish.id]).length;
  const spotSections = FISHING_SPOTS.map(spot => {
    const spotFish = getFishForSpot(spot.id);
    const spotDiscovered = spotFish.filter(fish => state.discovered[fish.id]).length;
    const themeColor = spot.theme?.color || '34, 211, 238';
    return `
      <section class="mb-4 overflow-hidden rounded-2xl border bg-slate-950/45" style="border-color:rgba(${themeColor},.22)">
        <div class="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900/75 px-3 py-2.5">
          <div class="min-w-0">
            <div class="flex items-center gap-2"><span class="material-symbols-outlined text-base" style="color:rgba(${themeColor},1)">${spot.theme?.icon || 'water'}</span><h3 class="truncate text-sm font-black text-white">${spot.name}</h3><span class="rounded-full border border-white/10 bg-black/25 px-1.5 py-0.5 text-[8px] font-black text-slate-400">${spot.tier}</span></div>
            <p class="mt-0.5 text-[9px] text-slate-500">この釣り堀で発見できる固有魚</p>
          </div>
          <div class="shrink-0 text-right"><div class="text-sm font-black" style="color:rgba(${themeColor},1)">${spotDiscovered}<span class="text-[10px] text-slate-600"> / ${spotFish.length}</span></div><div class="text-[8px] text-slate-600">発見済み</div></div>
        </div>
        <div class="grid grid-cols-3 gap-2 p-2 sm:grid-cols-4">
          ${spotFish.map(fish => {
            const found = state.discovered[fish.id];
            const rarity = FISH_RARITY[fish.rarity];
            const count = state.inventory[fish.id] || 0;
            return `<article class="relative overflow-hidden rounded-xl border ${found ? rarity.border : 'border-slate-800'} bg-slate-900/70 p-2 text-center">
              <div class="relative mx-auto flex h-16 w-16 items-center justify-center">
                <span class="material-symbols-outlined absolute text-3xl ${found ? rarity.text : 'text-slate-800'}">set_meal</span>
                <img src="${fish.image}" onerror="this.remove()" class="relative h-16 w-16 object-contain ${found ? '' : 'brightness-[.06] saturate-0'}" alt="">
              </div>
              <div class="mt-1 truncate text-[10px] font-black ${found ? rarity.text : 'text-slate-600'}">${found ? fish.name : '？？？'}</div>
              <div class="mt-0.5 text-[8px] font-bold text-slate-500">${found ? `${rarity.label}・所持 ${count}` : '未発見'}</div>
            </article>`;
          }).join('')}
        </div>
      </section>`;
  }).join('');

  container.innerHTML = `
    <div class="mx-auto w-full max-w-2xl">
      <section class="mb-3 rounded-2xl border border-cyan-400/20 bg-slate-900/80 p-4 shadow-xl">
        <div class="flex items-center justify-between gap-3">
          <div><div class="flex items-center gap-2"><span class="material-symbols-outlined text-cyan-300">menu_book</span><h2 class="text-base font-black text-white">魚図鑑</h2></div><p class="mt-1 text-[10px] text-slate-400">1種類発見するごとに味方全体のSPDが恒久的に +1</p></div>
          <div class="text-right"><div class="text-lg font-black text-cyan-300">${discoveredCount}<span class="text-xs text-slate-500"> / ${FISH.length}</span></div><div class="text-[9px] font-bold text-slate-500">発見した魚</div></div>
        </div>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-950"><div class="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400" style="width:${discoveredCount / FISH.length * 100}%"></div></div>
        <div class="mt-2 flex items-center justify-end gap-1 text-[10px] font-black text-yellow-300"><span class="material-symbols-outlined text-sm">speed</span>味方全体 SPD +${discoveredCount}</div>
      </section>
      ${spotSections}
    </div>`;
  return container;
}
