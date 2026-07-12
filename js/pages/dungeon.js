import { DUNGEONS } from '../definitions/dungeons.js';
import { SPECIAL_DUNGEONS } from '../definitions/special_dungeons.js';
import { GameDB } from '../data/database.js';
import { calcItemsPerPage, observePageSize } from '../data/page-utils.js';

import { formatNumber } from '../utils/format.js';

window.enterDungeon = async (dungeonId) => {
  await GameDB.setGameState('currentDungeon', dungeonId);
  await GameDB.setGameState('currentFloor', 1);
  window.location.hash = '/battle';
};

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
    return `
      <div data-dungeon-page class="flex h-full min-h-0 flex-col gap-4 overflow-hidden bg-[#0b0b19] p-4 pb-24">
        ${tabsHtml}
        <div class="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-cyan-300/40 bg-slate-950 shadow-[0_20px_60px_rgba(0,0,0,.45)]">
          <div class="absolute inset-0 bg-cover bg-center" style="background-image:url('assets/dungeon/bg_fishing_spot.webp')"></div>
          <div class="absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/20 to-slate-950/95"></div>
          <div class="relative flex h-full flex-col items-center justify-end p-5 text-center">
            <div class="mb-auto mt-4 rounded-full border border-cyan-200/30 bg-slate-950/65 px-3 py-1 text-[10px] font-black tracking-[.2em] text-cyan-200 backdrop-blur-md">FISHING AREA</div>
            <div class="w-full rounded-2xl border border-white/15 bg-slate-950/75 p-4 backdrop-blur-md">
              <div class="mb-2 flex items-center justify-center gap-2"><span class="material-symbols-outlined text-2xl text-cyan-300">water</span><h2 class="text-xl font-black tracking-wider text-white">月影の湖</h2></div>
              <p class="text-[11px] leading-relaxed text-slate-300">Goldで釣り餌を用意して、魚や珍しいお宝を釣り上げよう。</p>
              <button onclick="window.location.hash='/fishing'" class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200/60 bg-gradient-to-r from-cyan-600 to-blue-600 py-3 text-sm font-black text-white shadow-[0_0_24px_rgba(6,182,212,.35)] active:scale-[.99]">
                <span class="material-symbols-outlined">phishing</span>釣り場へ向かう<span class="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>
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
