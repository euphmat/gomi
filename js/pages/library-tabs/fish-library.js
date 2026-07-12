import { FISH, FISH_RARITY } from '../../definitions/fish.js';
import { loadFishingData } from '../../data/fishing-manager.js';

export async function renderFishLibraryTab() {
  const state = await loadFishingData();
  const container = document.createElement('div');
  container.className = 'h-full overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(34,211,238,.08),transparent_38%)] p-3 pb-24 no-scrollbar';
  const discoveredCount = FISH.filter(fish => state.discovered[fish.id]).length;
  container.innerHTML = `
    <div class="mx-auto w-full max-w-2xl">
      <section class="mb-3 rounded-2xl border border-cyan-400/20 bg-slate-900/80 p-4 shadow-xl">
        <div class="flex items-center justify-between gap-3">
          <div><div class="flex items-center gap-2"><span class="material-symbols-outlined text-cyan-300">menu_book</span><h2 class="text-base font-black text-white">魚図鑑</h2></div><p class="mt-1 text-[10px] text-slate-400">湖に棲む魚を見つけよう</p></div>
          <div class="text-right"><div class="text-lg font-black text-cyan-300">${discoveredCount}<span class="text-xs text-slate-500"> / ${FISH.length}</span></div><div class="text-[9px] font-bold text-slate-500">発見した魚</div></div>
        </div>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-950"><div class="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400" style="width:${discoveredCount / FISH.length * 100}%"></div></div>
      </section>
      <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
        ${FISH.map(fish => {
          const found = state.discovered[fish.id];
          const rarity = FISH_RARITY[fish.rarity];
          const count = state.inventory[fish.id] || 0;
          return `<article class="relative overflow-hidden rounded-xl border ${found ? rarity.border : 'border-slate-800'} bg-slate-900/70 p-2 text-center">
            <img src="${fish.image}" class="mx-auto h-16 w-16 object-contain ${found ? '' : 'brightness-[.06] saturate-0'}" alt="">
            <div class="mt-1 truncate text-[10px] font-black ${found ? rarity.text : 'text-slate-600'}">${found ? fish.name : '？？？'}</div>
            <div class="mt-0.5 text-[8px] font-bold text-slate-500">${found ? `${rarity.label}・所持 ${count}` : '未発見'}</div>
          </article>`;
        }).join('')}
      </div>
    </div>`;
  return container;
}
