import { DUNGEONS } from '../definitions/dungeons.js';
import { SPECIAL_DUNGEONS } from '../definitions/special_dungeons.js';
import { FISHING_SPOTS, getFishForSpot } from '../definitions/fish.js';
import { GameDB } from '../data/database.js';
import { getFishingSpotUnlockStatus, loadFishingData } from '../data/fishing-manager.js';
import { calcItemsPerPage, observePageSize } from '../data/page-utils.js';
import { renderFishingTackleSummary, showFishingTackleWorkshop } from './fishing-tackle.js';

import { formatNumber } from '../utils/format.js';

window.enterDungeon = async (dungeonId) => {
  await GameDB.setGameState('currentDungeon', dungeonId);
  await GameDB.setGameState('currentFloor', 1);
  window.location.hash = '/battle';
};

window.enterFishingSpot = async (spotId) => {
  if (!FISHING_SPOTS.some(spot => spot.id === spotId)) return;
  const fishingData = await loadFishingData();
  if (!getFishingSpotUnlockStatus(fishingData, spotId).unlocked) return;
  await GameDB.setGameState('currentFishingSpot', spotId);
  window.location.hash = '/fishing';
};

window.openFishingTackleWorkshop = () => showFishingTackleWorkshop(async () => {
  const contentEl = document.getElementById('content');
  if (contentEl?.querySelector('[data-dungeon-page]') && currentDungeonTab === 'fishing') {
    contentEl.innerHTML = await renderDungeonPage();
  }
});

window.unlockSpecialDungeon = async (dungeonId) => {
  const dungeon = SPECIAL_DUNGEONS.find(d => d.id === dungeonId);
  const cost = dungeon?.unlockCondition?.prism;
  if (!dungeon || !cost) return;

  const unlocked = await GameDB.getGameState('unlockedDungeons') || ['slime_forest'];
  if (unlocked.includes(dungeonId)) return;

  const prism = await GameDB.getGameState('prism') || 0;
  if (prism < cost) return;

  unlocked.push(dungeonId);
  await Promise.all([
    GameDB.setGameState('prism', prism - cost),
    GameDB.setGameState('unlockedDungeons', unlocked)
  ]);
  const prismDisplay = document.getElementById('header-prism-display');
  if (prismDisplay) prismDisplay.textContent = formatNumber(prism - cost);
  const contentEl = document.getElementById('content');
  if (contentEl) contentEl.innerHTML = await renderDungeonPage();
};



let currentDungeonPage = 1;
let currentDungeonTab = 'normal'; // 'normal' | 'special' | 'fishing'
let dungeonItemsPerPage = 3;
let observedDungeonList = null;
let disconnectDungeonObserver = null;

function getItemsPerPage() {
  return dungeonItemsPerPage;
}

function scheduleDungeonPageMeasurement() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const listContainer = document.querySelector('[data-dungeon-list]');
    if (!listContainer) return;

    const update = async () => {
      if (!listContainer.isConnected) return;
      const nextItemsPerPage = calcItemsPerPage({
        viewMode: 'list',
        scrollContainer: listContainer,
        itemContainer: listContainer,
        listItemHeight: 104,
      });
      if (nextItemsPerPage === dungeonItemsPerPage) return;

      dungeonItemsPerPage = nextItemsPerPage;
      const currentList = currentDungeonTab === 'special' ? SPECIAL_DUNGEONS : DUNGEONS;
      currentDungeonPage = Math.min(currentDungeonPage, Math.max(1, Math.ceil(currentList.length / dungeonItemsPerPage)));
      const contentEl = document.getElementById('content');
      if (contentEl?.querySelector('[data-dungeon-page]')) {
        contentEl.innerHTML = await renderDungeonPage();
      }
    };

    if (observedDungeonList !== listContainer) {
      disconnectDungeonObserver?.();
      observedDungeonList = listContainer;
      disconnectDungeonObserver = observePageSize(listContainer, update);
    }
    update();
  }));
}

window.changeDungeonPage = async (delta) => {
  const currentList = currentDungeonTab === 'special' ? SPECIAL_DUNGEONS : DUNGEONS;
  const maxPage = Math.ceil(currentList.length / getItemsPerPage());
  currentDungeonPage += delta;
  if (currentDungeonPage < 1) currentDungeonPage = 1;
  if (currentDungeonPage > maxPage) currentDungeonPage = maxPage;
  
  const contentEl = document.getElementById('content');
  if (contentEl) {
    contentEl.innerHTML = await renderDungeonPage();
  }
};

window.switchDungeonTab = async (tab) => {
  if (currentDungeonTab === tab) return;
  currentDungeonTab = tab;
  currentDungeonPage = 1;
  
  const contentEl = document.getElementById('content');
  if (contentEl) {
    contentEl.innerHTML = await renderDungeonPage();
  }
};

/**
 * このファイルは「ダンジョン」画面の中身を作って表示するためのファイルです。
 *
 * Dungeon Page
 */
export async function renderDungeonPage() {
  const tabsHtml = `
    <div class="flex gap-1 p-1 bg-[#11111a] rounded-lg shadow-inner border border-gray-800/80 sticky top-0 z-20 flex-shrink-0 mx-auto w-full max-w-md">
      <button onclick="window.switchDungeonTab('normal')" 
              class="flex-1 py-1.5 px-2 rounded-md font-bold text-xs transition-all duration-300 flex items-center justify-center gap-1 ${
                currentDungeonTab === 'normal' 
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(37,99,235,0.1)]' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border border-transparent'
              }">
        <span class="material-symbols-outlined text-[14px]">swords</span>
        ノーマル
      </button>
      <button onclick="window.switchDungeonTab('special')" 
              class="flex-1 py-1.5 px-2 rounded-md font-bold text-xs transition-all duration-300 flex items-center justify-center gap-1 ${
                currentDungeonTab === 'special' 
                  ? 'bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 shadow-[0_0_10px_rgba(217,70,239,0.1)]' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border border-transparent'
              }">
        <span class="material-symbols-outlined text-[14px]">auto_awesome</span>
        スペシャル
      </button>
      <button onclick="window.switchDungeonTab('fishing')"
              class="flex-1 py-1.5 px-2 rounded-md font-bold text-xs transition-all duration-300 flex items-center justify-center gap-1 ${
                currentDungeonTab === 'fishing'
                  ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.14)]'
                  : 'text-gray-500 hover:text-cyan-300 hover:bg-cyan-950/30 border border-transparent'
              }">
        <span class="material-symbols-outlined text-[14px]">phishing</span>
        フィッシング
      </button>
    </div>
  `;

  if (currentDungeonTab === 'fishing') {
    const fishingData = await loadFishingData();
    const fishingSpotCards = FISHING_SPOTS.map((spot, index) => {
      const theme = spot.theme || { color: '34, 211, 238', icon: 'water' };
      const fishCount = getFishForSpot(spot.id).length;
      const unlockStatus = getFishingSpotUnlockStatus(fishingData, spot.id);
      const isUnlocked = unlockStatus.unlocked;
      const unlockLabel = `${unlockStatus.prerequisiteSpot?.name || '前の釣り堀'}の魚図鑑`;
      return `
        <button ${isUnlocked ? `onclick="window.enterFishingSpot('${spot.id}')"` : 'disabled'}
                aria-label="${isUnlocked ? `${spot.name}で釣りをする` : `${spot.name}は未解放。${unlockLabel}を${unlockStatus.required}種類発見すると解放`}"
                class="group relative isolate min-h-[150px] w-full shrink-0 overflow-hidden rounded-2xl border text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b19] ${isUnlocked ? 'cursor-pointer hover:-translate-y-0.5 hover:brightness-110 active:scale-[.985]' : 'cursor-not-allowed saturate-[.55]'}"
                style="border-color:rgba(${theme.color},${isUnlocked ? '.62' : '.24'});background-color:#080a12;box-shadow:${isUnlocked ? `0 16px 38px -18px rgba(${theme.color},.9)` : '0 12px 28px -20px rgba(0,0,0,.9)'},inset 0 0 0 1px rgba(255,255,255,.04);animation-delay:${index * 55}ms">
          <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 ${isUnlocked ? 'group-hover:scale-105' : 'grayscale opacity-45'}" style="background-image:url('${spot.background}')"></div>
          <div class="absolute inset-0" style="background:linear-gradient(90deg,rgba(3,5,14,.96) 0%,rgba(3,5,14,.82) 52%,rgba(3,5,14,.35) 100%),radial-gradient(circle at 88% 25%,rgba(${theme.color},.68),transparent 36%)"></div>
          ${isUnlocked ? '' : '<div class="absolute inset-0 z-[1] bg-slate-950/35"></div>'}
          <div class="absolute inset-x-0 bottom-0 h-px" style="background:linear-gradient(90deg,transparent,rgba(${theme.color},1),transparent)"></div>
          <div class="relative z-10 flex min-h-[150px] flex-col justify-between gap-3 p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="mb-1 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.22em]" style="color:rgba(${theme.color},1)">
                  <span class="material-symbols-outlined text-base">${theme.icon}</span>
                  ${spot.tier || '釣り場'} FISHING AREA
                </div>
                <h2 class="truncate text-xl font-black tracking-wider text-white" style="text-shadow:0 2px 12px #000,0 0 18px rgba(${theme.color},.55)">${spot.name}</h2>
                <p class="mt-1 line-clamp-2 max-w-md text-[10px] font-medium leading-relaxed text-slate-300/85 sm:text-xs">${spot.description}</p>
                ${isUnlocked ? '' : `
                  <div class="mt-2 max-w-xs rounded-lg border border-slate-500/30 bg-slate-950/75 px-2.5 py-2">
                    <div class="flex items-center justify-between gap-3 text-[9px] font-black text-slate-300">
                      <span>${unlockLabel}</span>
                      <span class="tabular-nums text-white">${unlockStatus.current} / ${unlockStatus.required}種類</span>
                    </div>
                    <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div class="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-400" style="width:${Math.min(100, (unlockStatus.current / unlockStatus.required) * 100)}%"></div>
                    </div>
                  </div>`}
              </div>
              <span class="material-symbols-outlined shrink-0 text-4xl" style="color:rgba(${theme.color},.85);filter:drop-shadow(0 0 14px rgba(${theme.color},.7))">${isUnlocked ? theme.icon : 'lock'}</span>
            </div>
            <div class="flex items-end justify-between gap-3">
              <div class="flex flex-wrap gap-1.5 text-[9px] font-black text-slate-200">
                <span class="rounded-full border border-white/15 bg-black/45 px-2.5 py-1">餌 ${formatNumber(spot.baitCost)} G</span>
                <span class="rounded-full border border-white/15 bg-black/45 px-2.5 py-1">固有魚 ${fishCount}種</span>
                <span class="rounded-full border border-white/15 bg-black/45 px-2.5 py-1">${(spot.minCatchMs / 1000).toFixed(0)}〜${(spot.maxCatchMs / 1000).toFixed(0)}秒</span>
              </div>
              <span class="flex shrink-0 items-center gap-1 rounded-full border ${isUnlocked ? 'border-white/25 text-white group-hover:border-white/60' : 'border-slate-600/40 text-slate-400'} bg-black/50 py-2 pl-3 pr-2 text-[10px] font-black tracking-wider backdrop-blur-sm transition-colors">
                ${isUnlocked ? '釣りをする' : '未解放'}<span class="material-symbols-outlined text-base transition-transform ${isUnlocked ? 'group-hover:translate-x-1' : ''}">${isUnlocked ? 'arrow_forward' : 'lock'}</span>
              </span>
            </div>
          </div>
        </button>`;
    }).join('');

    return `
      <div data-dungeon-page class="flex h-full min-h-0 flex-col gap-4 overflow-hidden bg-[#0b0b19] p-4 pb-24">
        ${tabsHtml}
        <div class="min-h-0 flex-1 overflow-y-auto no-scrollbar">
          <div class="mb-3 flex items-end justify-between gap-3 px-1">
            <div><h1 class="text-base font-black text-white">釣り堀を選択</h1><p class="mt-0.5 text-[10px] text-slate-500">釣り堀ごとに釣れる魚と餌代が異なります</p></div>
            <div class="shrink-0 rounded-full border border-cyan-400/20 bg-cyan-950/30 px-2.5 py-1 text-[9px] font-black text-cyan-300">${FISHING_SPOTS.length} AREAS</div>
          </div>
          <div class="flex flex-col gap-3">
            ${renderFishingTackleSummary(fishingData)}
            ${fishingSpotCards}
          </div>
        </div>
      </div>`;
  }

  const unlockedDungeons = await GameDB.getGameState('unlockedDungeons') || ['slime_forest'];
  const playerMedals = await GameDB.getGameState('player_medals') || {};
  const medalCount = Object.keys(playerMedals).length;
  const prism = await GameDB.getGameState('prism') || 0;
  
  const filteredDungeons = currentDungeonTab === 'special' ? SPECIAL_DUNGEONS : DUNGEONS;

  const totalItems = filteredDungeons.length;
  const itemsPerPage = getItemsPerPage();
  const maxPage = Math.ceil(totalItems / itemsPerPage);
  if (currentDungeonPage > maxPage) currentDungeonPage = maxPage || 1;

  const startIndex = (currentDungeonPage - 1) * itemsPerPage;
  const pageDungeons = filteredDungeons.slice(startIndex, startIndex + itemsPerPage);



  const cardsHtml = pageDungeons.map((d, index) => {
    const theme = d.theme || { color: '107, 114, 128', icon: 'swords' };
    const themeRgb = theme.color;

    let isUnlocked = d.isUnlocked || unlockedDungeons.includes(d.id) ||
      (d.unlockCondition?.medals != null && medalCount >= d.unlockCondition.medals);
      

    if (isUnlocked) {
      return `
      <!-- ダンジョン: ${d.name} -->
      <button onclick="window.enterDungeon('${d.id}')"
              aria-label="${d.name}を探索する"
              class="group relative isolate min-h-[92px] sm:min-h-[108px] w-full cursor-pointer overflow-hidden rounded-2xl border text-left transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b19] active:translate-y-0 active:scale-[0.985]"
              style="border-color: rgba(${themeRgb}, .65); background-color: rgb(8, 10, 18); box-shadow: 0 12px 32px -16px rgba(${themeRgb}, .8), inset 0 0 0 1px rgba(255,255,255,.04); animation-delay: ${index * 45}ms;">
        <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
             style="background-image: url('${d.bgImage}');"></div>
        <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,12,.96)_0%,rgba(3,5,12,.82)_43%,rgba(3,5,12,.35)_72%,rgba(3,5,12,.68)_100%)]"></div>
        <div class="absolute inset-0 opacity-50 transition-opacity duration-300 group-hover:opacity-80"
             style="background: radial-gradient(circle at 88% 50%, rgba(${themeRgb}, .55), transparent 31%);"></div>
        <div class="absolute inset-x-0 bottom-0 h-px opacity-80" style="background: linear-gradient(90deg, transparent, rgba(${themeRgb}, 1), transparent);"></div>

        <div class="relative z-10 flex min-h-[92px] sm:min-h-[108px] items-center gap-3 px-4 py-3 sm:px-5">
          <div class="min-w-0 flex-1">
            <div class="mb-1 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.24em] text-white/55">
              <span class="h-px w-5" style="background-color: rgba(${themeRgb}, 1);"></span>
              Destination
            </div>
            <h3 class="truncate text-base font-black tracking-[0.12em] text-white sm:text-xl"
                style="text-shadow: 0 2px 12px #000, 0 0 18px rgba(${themeRgb}, .55);">${d.name}</h3>
            <p class="mt-1 line-clamp-1 text-[10px] font-medium leading-relaxed text-slate-300/80 sm:text-xs">${d.description}</p>
          </div>

          <div class="flex shrink-0 items-center gap-1.5 rounded-full border border-white/25 bg-black/45 py-2 pl-3 pr-2 text-white shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:border-white/55 group-hover:bg-black/60 sm:gap-2 sm:py-2.5 sm:pl-4 sm:pr-3">
            <span class="material-symbols-outlined text-lg sm:text-xl" style="font-variation-settings: 'FILL' 1; color: rgba(${themeRgb}, 1);">${theme.icon}</span>
            <span class="text-[10px] font-black tracking-[0.16em] sm:text-xs">探索する</span>
            <span class="material-symbols-outlined text-base transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
          </div>
        </div>
      </button>`;
    } else {
      return `
      <!-- 未解放ダンジョン: ${d.name} -->
      <div class="relative isolate min-h-[92px] sm:min-h-[108px] overflow-hidden rounded-2xl border border-slate-700/60 bg-[#080a11] shadow-lg">
        <div class="absolute inset-0 scale-105 bg-cover bg-center grayscale" style="background-image: url('${d.bgImage}');"></div>
        <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]"></div>
        <div class="absolute inset-0 opacity-[0.08]" style="background-image: repeating-linear-gradient(135deg, #fff 0, #fff 1px, transparent 1px, transparent 9px);"></div>

        <!-- 前面にハッキリ表示するロック情報と解放条件 -->
        <div class="relative z-10 flex min-h-[92px] sm:min-h-[108px] flex-col items-center justify-center p-2.5">
          <div class="mb-1.5 flex items-center justify-center gap-1.5 sm:gap-2">
            <span class="material-symbols-outlined text-gray-400 text-lg sm:text-xl">lock</span>
            <span class="text-xs sm:text-sm tracking-widest text-gray-300 font-bold uppercase">Locked</span>
          </div>
          ${d.unlockCondition?.medals != null
            ? `<div class="bg-amber-900/40 border border-amber-500/50 text-amber-400 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold shadow-lg flex items-center gap-1.5 sm:gap-2">
                 <span class="material-symbols-outlined text-[12px] sm:text-sm">stars</span>
                 解放条件: メダルを${d.unlockCondition.medals}種類以上獲得 (現在: ${medalCount}種類)
               </div>`
            : d.unlockCondition?.prism != null
              ? `<button onclick="window.unlockSpecialDungeon('${d.id}')"
                   ${prism < d.unlockCondition.prism ? 'disabled' : ''}
                   aria-label="${d.name}を${d.unlockCondition.prism}プリズムで解放"
                   class="group/unlock relative min-w-[190px] overflow-hidden rounded-xl border px-4 py-2 text-white transition-all duration-200
                          ${prism >= d.unlockCondition.prism
                            ? 'cursor-pointer border-fuchsia-300/80 bg-gradient-to-r from-fuchsia-600 via-violet-600 to-cyan-500 shadow-[0_0_20px_rgba(217,70,239,0.45)] hover:scale-[1.03] hover:brightness-110 active:scale-[0.98]'
                            : 'cursor-not-allowed border-slate-600/60 bg-slate-800/90 text-slate-500 shadow-inner'}">
                   <span class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover/unlock:translate-x-full"></span>
                   <span class="relative flex items-center justify-center gap-2">
                     <span class="material-symbols-outlined text-[21px] ${prism >= d.unlockCondition.prism ? 'text-fuchsia-100 drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]' : 'text-slate-600'}">diamond</span>
                     <span class="whitespace-nowrap text-xs sm:text-sm font-black tracking-wide">
                       ${prism >= d.unlockCondition.prism
                         ? `${formatNumber(d.unlockCondition.prism)}プリズムで解放`
                         : 'プリズム不足'}
                     </span>
                   </span>
                 </button>`
            : `<div class="text-[9px] sm:text-[10px] text-gray-400 font-bold bg-black/60 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-gray-700 shadow-lg text-center leading-tight">
                 条件を満たすと<br class="sm:hidden" />挑戦可能になります
               </div>`
          }
        </div>
      </div>`;
    }
  }).join('');

  const paginationHtml = maxPage > 1 ? `
    <div class="flex shrink-0 items-center justify-between px-2">
      <button onclick="window.changeDungeonPage(-1)" 
              class="w-12 h-12 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              ${currentDungeonPage === 1 ? 'disabled' : ''}>
        <span class="material-symbols-outlined text-2xl">chevron_left</span>
      </button>
      <span class="text-gray-400 text-sm font-bold bg-gray-900 border border-gray-700 px-4 py-2 rounded-lg">
        ${currentDungeonPage} / ${maxPage}
      </span>
      <button onclick="window.changeDungeonPage(1)" 
              class="w-12 h-12 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              ${currentDungeonPage === maxPage ? 'disabled' : ''}>
        <span class="material-symbols-outlined text-2xl">chevron_right</span>
      </button>
    </div>
  ` : '';

  scheduleDungeonPageMeasurement();
  return `
    <div data-dungeon-page class="flex flex-col h-full min-h-0 bg-[#0b0b19] p-4 gap-4 pb-24 overflow-hidden">
      ${tabsHtml}
      <div data-dungeon-list class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        ${cardsHtml}
      </div>
      ${paginationHtml}
    </div>
  `;
}
