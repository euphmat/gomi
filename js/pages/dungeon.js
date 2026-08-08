import { DUNGEONS } from '../definitions/dungeons.js';
import { SPECIAL_DUNGEONS } from '../definitions/special_dungeons.js';
import { MONSTERS } from '../definitions/monsters.js';
import { MEDAL_RANKS } from '../definitions/medal-definitions.js';
import { FISHING_SPOTS, getFishForSpot } from '../definitions/fish.js';
import { GameDB } from '../data/database.js';
import { getFishingSpotUnlockStatus, loadFishingData } from '../data/fishing-manager.js';
import { calcItemsPerPage, observePageSize } from '../data/page-utils.js';
import { renderFishingTackleSummary, showFishingTackleWorkshop } from './fishing-tackle.js';
import { consumeHashRouteParam } from '../utils/route-params.js';

import { formatNumber } from '../utils/format.js';

const ALL_DUNGEONS = [...DUNGEONS, ...SPECIAL_DUNGEONS];
let dungeonModalRequestId = 0;

function getFloorMonsterIds(floor) {
  const ids = new Set();
  for (const encounter of floor?.monsters || []) {
    if (typeof encounter === 'string') {
      ids.add(encounter);
    } else if (Array.isArray(encounter?.members)) {
      encounter.members.forEach(member => {
        if (member?.id && Number(member.count ?? 1) > 0) ids.add(member.id);
      });
    } else if (encounter?.id) {
      if (Number(encounter.count ?? 1) > 0) ids.add(encounter.id);
    } else {
      Object.keys(encounter || {}).forEach(key => {
        if (key !== 'weight' && Number(encounter[key]) > 0) ids.add(key);
      });
    }
  }
  return [...ids];
}

function getOwnedMonsterState(ranchData, monsterId) {
  const ranches = Object.values(ranchData || {});
  return {
    companion: ranches.some(ranch => Boolean(ranch?.[monsterId])),
    legendary: ranches.some(ranch => Boolean(ranch?.[`${monsterId}_legendary`])),
  };
}

function getStoredCompletedFloors(floorProgress, dungeonId) {
  const saved = floorProgress?.[dungeonId];
  if (Array.isArray(saved)) return new Set(saved.map(Number));
  if (saved && typeof saved === 'object') {
    return new Set(Object.entries(saved).filter(([, cleared]) => cleared).map(([floor]) => Number(floor)));
  }
  return new Set();
}

window.closeDungeonFloorModal = () => {
  dungeonModalRequestId += 1;
  const modal = document.querySelector('[data-dungeon-floor-modal]');
  if (!modal) return;
  document.removeEventListener('keydown', modal._escapeHandler);
  window.removeEventListener('hashchange', modal._hashHandler);
  document.body.style.overflow = modal.dataset.previousBodyOverflow || '';
  modal.remove();
  if (modal._returnFocus?.isConnected) modal._returnFocus.focus();
};

window.openDungeonFloorModal = async (dungeonId) => {
  const dungeon = ALL_DUNGEONS.find(item => item.id === dungeonId);
  if (!dungeon) return;

  window.closeDungeonFloorModal();
  const requestId = ++dungeonModalRequestId;
  const [completedDungeonIds, floorProgress, ranchData, playerMedals, currentDungeonId, currentFloorLevel] = await Promise.all([
    GameDB.getGameState('completed_dungeons'),
    GameDB.getGameState('completed_dungeon_floors'),
    GameDB.getGameState('ranch_data'),
    GameDB.getGameState('player_medals'),
    GameDB.getGameState('currentDungeon'),
    GameDB.getGameState('currentFloor'),
  ]);
  if (requestId !== dungeonModalRequestId) return;

  const isDungeonCleared = Array.isArray(completedDungeonIds) && completedDungeonIds.includes(dungeon.id);
  const completedFloors = isDungeonCleared
    ? new Set(dungeon.floors.map(floor => Number(floor.level)))
    : getStoredCompletedFloors(floorProgress, dungeon.id);
  // Older saves predate per-floor history. Reaching a later floor proves that
  // every earlier floor in the currently selected dungeon was cleared.
  if (!isDungeonCleared && currentDungeonId === dungeon.id && Number(currentFloorLevel) > 1) {
    dungeon.floors.forEach(floor => {
      if (Number(floor.level) < Number(currentFloorLevel)) completedFloors.add(Number(floor.level));
    });
  }
  const clearedCount = dungeon.floors.filter(floor => completedFloors.has(Number(floor.level))).length;
  const theme = dungeon.theme || { color: '107, 114, 128', icon: 'swords' };
  const themeRgb = theme.color;

  const floorsHtml = dungeon.floors.length ? dungeon.floors.map(floor => {
    const isFloorCleared = completedFloors.has(Number(floor.level));
    const monsterIds = getFloorMonsterIds(floor);
    const monstersHtml = isFloorCleared ? monsterIds.map(monsterId => {
      const monster = MONSTERS.find(item => item.id === monsterId) || {
        id: monsterId,
        name: monsterId,
        image: `./assets/monster/${monsterId}.webp`,
      };
      const owned = getOwnedMonsterState(ranchData, monsterId);
      const hasMedal = Object.prototype.hasOwnProperty.call(playerMedals || {}, monsterId);
      const medalRankIndex = Number(playerMedals?.[monsterId]);
      const medal = hasMedal && Number.isInteger(medalRankIndex) ? MEDAL_RANKS[medalRankIndex] : null;
      return `
        <div class="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-2">
          <div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-950/80">
            <img src="${monster.image}" alt="" class="h-full w-full object-contain p-0.5" loading="lazy">
            ${owned.legendary ? '<span class="material-symbols-outlined absolute right-0 top-0 text-[14px] text-amber-300 drop-shadow-[0_0_5px_#f59e0b]" style="font-variation-settings:\'FILL\' 1">auto_awesome</span>' : ''}
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-[11px] font-black text-slate-100">${monster.name}</div>
            <div class="mt-1 flex flex-wrap gap-1">
              <span class="inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[8px] font-bold ${owned.companion ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 bg-slate-900/70 text-slate-500'}">
                <span class="material-symbols-outlined text-[10px]">${owned.companion ? 'check_circle' : 'cancel'}</span>仲間
              </span>
              <span class="inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[8px] font-bold ${owned.legendary ? 'border-amber-300/55 bg-amber-400/15 text-amber-200' : 'border-slate-700 bg-slate-900/70 text-slate-500'}">
                <span class="material-symbols-outlined text-[10px]">${owned.legendary ? 'auto_awesome' : 'remove'}</span>伝説
              </span>
              <span class="inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[8px] font-bold ${medal ? 'border-cyan-300/50 bg-cyan-400/15 text-cyan-200' : 'border-slate-700 bg-slate-900/70 text-slate-500'}" ${medal ? `title="${medal.name}"` : ''}>
                <span class="material-symbols-outlined text-[10px]">military_tech</span>${medal ? medal.name.replace('メダル', '') : '未取得'}
              </span>
            </div>
          </div>
        </div>`;
    }).join('') : '';

    return `
      <section class="overflow-hidden rounded-2xl border ${isFloorCleared ? 'border-white/15 bg-slate-900/75' : 'border-slate-800 bg-slate-950/65'}">
        <div class="flex items-center gap-3 border-b ${isFloorCleared ? 'border-white/10' : 'border-slate-800'} px-3 py-2.5">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${isFloorCleared ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-500'}">
            ${floor.level}F
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 text-[10px] font-black ${isFloorCleared ? 'text-white' : 'text-slate-500'}">
              <span class="material-symbols-outlined text-sm">${isFloorCleared ? 'verified' : 'lock'}</span>
              ${isFloorCleared ? `クリア済み・出現 ${monsterIds.length}種` : '未クリア・モンスター情報未解放'}
            </div>
          </div>
          <button onclick="window.enterDungeonFloor('${dungeon.id}', ${Number(floor.level)})"
                  ${isDungeonCleared ? '' : 'disabled'}
                  aria-label="${dungeon.name} ${floor.level}階へ潜入"
                  class="flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-2 text-[9px] font-black transition-all ${isDungeonCleared ? 'border-cyan-300/50 bg-cyan-500/15 text-cyan-200 active:scale-95 active:bg-cyan-500/30' : 'border-slate-800 bg-slate-900/70 text-slate-600'}">
            <span class="material-symbols-outlined text-sm">${isDungeonCleared ? 'login' : 'lock'}</span>${isDungeonCleared ? '潜入' : '踏破後'}
          </button>
        </div>
        ${isFloorCleared
          ? `<div class="grid grid-cols-1 gap-1.5 p-2 sm:grid-cols-2">${monstersHtml || '<p class="p-2 text-[10px] text-slate-500">出現モンスターなし</p>'}</div>`
          : '<div class="flex items-center justify-center gap-2 px-3 py-5 text-[10px] font-bold text-slate-600"><span class="material-symbols-outlined text-lg">visibility_off</span>この階層をクリアすると表示されます</div>'}
      </section>`;
  }).join('') : `
    <div class="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 text-slate-500">
      <span class="material-symbols-outlined text-3xl">construction</span>
      <p class="text-xs font-bold">階層データは準備中です</p>
    </div>`;

  const modal = document.createElement('div');
  modal._returnFocus = document.activeElement;
  modal.dataset.dungeonFloorModal = '';
  modal.dataset.previousBodyOverflow = document.body.style.overflow;
  modal.className = 'fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'dungeon-floor-modal-title');
  modal.innerHTML = `
    <div data-dungeon-floor-panel class="flex h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-[#090b15] shadow-2xl sm:h-[min(88vh,760px)] sm:rounded-3xl" style="box-shadow:0 0 60px rgba(${themeRgb},.2),0 28px 80px rgba(0,0,0,.8)">
      <header class="relative isolate shrink-0 overflow-hidden border-b border-white/10 px-4 pb-3 pt-4 sm:px-5">
        <div class="absolute inset-0 -z-20 bg-cover bg-center opacity-50" style="background-image:url('${dungeon.bgImage}')"></div>
        <div class="absolute inset-0 -z-10" style="background:linear-gradient(90deg,rgba(5,7,16,.98),rgba(5,7,16,.82)),linear-gradient(0deg,#090b15,transparent)"></div>
        <div class="flex items-start gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.2em]" style="color:rgb(${themeRgb})"><span class="material-symbols-outlined text-sm">format_list_numbered</span>Floor archive</div>
            <h2 id="dungeon-floor-modal-title" class="mt-1 truncate text-lg font-black tracking-wider text-white sm:text-xl">${dungeon.name}・階層一覧</h2>
            <p class="mt-1 text-[9px] font-bold text-slate-400">クリアした階層では、出現モンスターと収集状況を確認できます</p>
          </div>
          <button data-close-dungeon-floor-modal aria-label="閉じる" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/45 text-slate-300 active:scale-95 active:bg-white/15">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="mt-3 flex items-center gap-2">
          <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800"><div class="h-full rounded-full" style="width:${dungeon.floors.length ? (clearedCount / dungeon.floors.length) * 100 : 0}%;background:linear-gradient(90deg,rgb(${themeRgb}),#67e8f9)"></div></div>
          <span class="shrink-0 text-[9px] font-black tabular-nums text-slate-300">${clearedCount} / ${dungeon.floors.length}F</span>
          <span class="shrink-0 rounded-full border px-2 py-1 text-[8px] font-black ${isDungeonCleared ? 'border-amber-300/40 bg-amber-400/15 text-amber-200' : 'border-slate-700 bg-slate-900/75 text-slate-500'}">${isDungeonCleared ? '踏破済み' : '攻略中'}</span>
        </div>
      </header>
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-4">
        <div class="flex flex-col gap-2.5">${floorsHtml}</div>
      </div>
      <footer class="shrink-0 border-t border-white/10 bg-slate-950/95 px-4 py-2.5 text-center text-[9px] font-bold ${isDungeonCleared ? 'text-cyan-300' : 'text-slate-500'}">
        ${isDungeonCleared ? '<span class="material-symbols-outlined mr-1 align-middle text-sm">route</span>踏破済みのため、好きな階層から潜入できます' : '<span class="material-symbols-outlined mr-1 align-middle text-sm">lock</span>指定階層への潜入は、ダンジョン踏破後に解放されます'}
      </footer>
    </div>`;

  modal.addEventListener('click', event => {
    if (event.target === modal || event.target.closest('[data-close-dungeon-floor-modal]')) {
      window.closeDungeonFloorModal();
    }
  });
  modal._escapeHandler = event => {
    if (event.key === 'Escape') window.closeDungeonFloorModal();
  };
  modal._hashHandler = () => window.closeDungeonFloorModal();
  document.addEventListener('keydown', modal._escapeHandler);
  window.addEventListener('hashchange', modal._hashHandler, { once: true });
  document.body.style.overflow = 'hidden';
  document.body.appendChild(modal);
  modal.querySelector('[data-close-dungeon-floor-modal]')?.focus();
};

window.enterDungeonFloor = async (dungeonId, floorLevel) => {
  const dungeon = ALL_DUNGEONS.find(item => item.id === dungeonId);
  const completedDungeonIdsValue = await GameDB.getGameState('completed_dungeons');
  const completedDungeonIds = Array.isArray(completedDungeonIdsValue) ? completedDungeonIdsValue : [];
  const floorExists = dungeon?.floors.some(floor => Number(floor.level) === Number(floorLevel));
  if (!floorExists || !completedDungeonIds.includes(dungeonId)) return;
  await Promise.all([
    GameDB.setGameState('currentDungeon', dungeonId),
    GameDB.setGameState('currentFloor', Number(floorLevel)),
  ]);
  window.closeDungeonFloorModal();
  window.location.hash = '/battle';
};

window.enterDungeon = async (dungeonId) => {
  window.closeDungeonFloorModal();
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
  window.closeDungeonFloorModal();
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
  window.closeDungeonFloorModal();
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
  const requestedTab = consumeHashRouteParam('tab');
  if (['normal', 'special', 'fishing'].includes(requestedTab)) {
    if (currentDungeonTab !== requestedTab) currentDungeonPage = 1;
    currentDungeonTab = requestedTab;
  }

  const tabsHtml = `
    <div class="flex gap-1 p-1 bg-[#11111a] rounded-lg shadow-inner border border-gray-800/80 sticky top-0 z-20 flex-shrink-0 mx-auto w-full max-w-md">
      <button onclick="window.switchDungeonTab('normal')" 
              class="flex-1 py-1.5 px-2 rounded-md font-bold text-xs transition-all duration-300 flex items-center justify-center gap-1 ${
                currentDungeonTab === 'normal' 
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(37,99,235,0.1)]' 
                  : 'text-gray-500 active:text-gray-300 active:bg-gray-800/50 border border-transparent'
              }">
        <span class="material-symbols-outlined text-[14px]">swords</span>
        ノーマル
      </button>
      <button onclick="window.switchDungeonTab('special')" 
              class="flex-1 py-1.5 px-2 rounded-md font-bold text-xs transition-all duration-300 flex items-center justify-center gap-1 ${
                currentDungeonTab === 'special' 
                  ? 'bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 shadow-[0_0_10px_rgba(217,70,239,0.1)]' 
                  : 'text-gray-500 active:text-gray-300 active:bg-gray-800/50 border border-transparent'
              }">
        <span class="material-symbols-outlined text-[14px]">auto_awesome</span>
        スペシャル
      </button>
      <button onclick="window.switchDungeonTab('fishing')"
              class="flex-1 py-1.5 px-2 rounded-md font-bold text-xs transition-all duration-300 flex items-center justify-center gap-1 ${
                currentDungeonTab === 'fishing'
                  ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.14)]'
                  : 'text-gray-500 active:text-cyan-300 active:bg-cyan-950/30 border border-transparent'
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
                class="group relative isolate min-h-[150px] w-full shrink-0 overflow-hidden rounded-2xl border text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b19] ${isUnlocked ? 'cursor-pointer active:-translate-y-0.5 active:brightness-110 active:scale-[.985]' : 'cursor-not-allowed saturate-[.55]'}"
                style="border-color:rgba(${theme.color},${isUnlocked ? '.62' : '.24'});background-color:#080a12;box-shadow:${isUnlocked ? `0 16px 38px -18px rgba(${theme.color},.9)` : '0 12px 28px -20px rgba(0,0,0,.9)'},inset 0 0 0 1px rgba(255,255,255,.04);animation-delay:${index * 55}ms">
          <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 ${isUnlocked ? 'group-active:scale-105' : 'grayscale opacity-45'}" style="background-image:url('${spot.background}')"></div>
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
              <span class="flex shrink-0 items-center gap-1 rounded-full border ${isUnlocked ? 'border-white/25 text-white group-active:border-white/60' : 'border-slate-600/40 text-slate-400'} bg-black/50 py-2 pl-3 pr-2 text-[10px] font-black tracking-wider backdrop-blur-sm transition-colors">
                ${isUnlocked ? '釣りをする' : '未解放'}<span class="material-symbols-outlined text-base transition-transform ${isUnlocked ? 'group-active:translate-x-1' : ''}">${isUnlocked ? 'arrow_forward' : 'lock'}</span>
              </span>
            </div>
          </div>
        </button>`;
    }).join('');

    return `
      <div data-dungeon-page class="flex h-full min-h-0 flex-col gap-3 overflow-hidden bg-[#0b0b19] p-2.5 pb-3 sm:gap-4 sm:p-4">
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

  const [unlockedDungeonsValue, playerMedalsValue, completedDungeonIdsValue] = await Promise.all([
    GameDB.getGameState('unlockedDungeons'),
    GameDB.getGameState('player_medals'),
    GameDB.getGameState('completed_dungeons'),
  ]);
  const unlockedDungeons = Array.isArray(unlockedDungeonsValue) ? unlockedDungeonsValue : ['slime_forest'];
  const playerMedals = playerMedalsValue || {};
  const completedDungeonIds = Array.isArray(completedDungeonIdsValue) ? completedDungeonIdsValue : [];
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
    const isCleared = completedDungeonIds.includes(d.id);
    const hasFloors = d.floors.length > 0;
      

    if (isUnlocked) {
      return `
      <!-- ダンジョン: ${d.name} -->
      <div class="group relative isolate min-h-[92px] sm:min-h-[108px] w-full overflow-hidden rounded-2xl border text-left transition-all duration-300"
              style="border-color: rgba(${themeRgb}, .65); background-color: rgb(8, 10, 18); box-shadow: 0 12px 32px -16px rgba(${themeRgb}, .8), inset 0 0 0 1px rgba(255,255,255,.04); animation-delay: ${index * 45}ms;">
        <div class="pointer-events-none absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-active:scale-105"
             style="background-image: url('${d.bgImage}');"></div>
        <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,12,.96)_0%,rgba(3,5,12,.82)_43%,rgba(3,5,12,.35)_72%,rgba(3,5,12,.68)_100%)]"></div>
        <div class="pointer-events-none absolute inset-0 opacity-50 transition-opacity duration-300 group-active:opacity-80"
             style="background: radial-gradient(circle at 88% 50%, rgba(${themeRgb}, .55), transparent 31%);"></div>
        <div class="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-80" style="background: linear-gradient(90deg, transparent, rgba(${themeRgb}, 1), transparent);"></div>

        <div class="relative z-10 flex min-h-[92px] items-stretch gap-1.5 p-2 sm:min-h-[108px] sm:gap-2 sm:p-2.5">
          <button ${hasFloors ? `onclick="window.enterDungeon('${d.id}')"` : 'disabled'} aria-label="${hasFloors ? `${d.name}を1階から探索する` : `${d.name}は準備中`}"
                  class="min-w-0 flex-1 rounded-xl px-2 text-left transition-all ${hasFloors ? 'active:scale-[.985] active:bg-white/5' : 'cursor-not-allowed opacity-70'} sm:px-2.5">
            <div class="mb-1 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.24em] text-white/55">
              <span class="h-px w-5" style="background-color: rgba(${themeRgb}, 1);"></span>
              Destination
            </div>
            <div class="flex min-w-0 items-center gap-1.5">
              <h3 class="truncate text-base font-black tracking-[0.12em] text-white sm:text-xl"
                  style="text-shadow: 0 2px 12px #000, 0 0 18px rgba(${themeRgb}, .55);">${d.name}</h3>
              ${isCleared ? '<span class="shrink-0 rounded-full border border-amber-300/40 bg-amber-400/15 px-1.5 py-0.5 text-[7px] font-black text-amber-200">踏破済</span>' : ''}
            </div>
            <p class="mt-1 line-clamp-1 text-[10px] font-medium leading-relaxed text-slate-300/80 sm:text-xs">${d.description}</p>
          </button>

          <div class="flex w-[74px] shrink-0 flex-col gap-1.5 sm:w-[92px] sm:gap-2">
            <button onclick="window.openDungeonFloorModal('${d.id}')" aria-label="${d.name}の階層一覧を開く"
                    class="flex min-h-[42px] flex-1 items-center justify-center gap-1 rounded-xl border border-white/20 bg-black/55 px-1.5 text-[9px] font-black text-slate-100 backdrop-blur-sm active:scale-95 active:border-cyan-300/60 active:bg-cyan-950/65 sm:text-[10px]">
              <span class="material-symbols-outlined text-base text-cyan-300">format_list_numbered</span><span>階層</span>
            </button>
            <button ${hasFloors ? `onclick="window.enterDungeon('${d.id}')"` : 'disabled'} aria-label="${hasFloors ? `${d.name}を1階から探索する` : `${d.name}は準備中`}"
                    class="flex min-h-[42px] flex-1 items-center justify-center gap-0.5 rounded-xl border px-1 text-[9px] font-black shadow-lg backdrop-blur-sm ${hasFloors ? 'border-white/25 bg-black/55 text-white active:scale-95 active:border-white/60 active:bg-black/75' : 'border-slate-700/60 bg-slate-900/70 text-slate-500'} sm:text-[10px]">
              <span class="material-symbols-outlined text-base" style="font-variation-settings:'FILL' 1;color:rgba(${themeRgb},1)">${hasFloors ? theme.icon : 'construction'}</span><span>${hasFloors ? '探索' : '準備中'}</span>
            </button>
          </div>
        </div>
      </div>`;
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
                            ? 'cursor-pointer border-fuchsia-300/80 bg-gradient-to-r from-fuchsia-600 via-violet-600 to-cyan-500 shadow-[0_0_20px_rgba(217,70,239,0.45)] active:scale-[1.03] active:brightness-110 active:scale-[0.98]'
                            : 'cursor-not-allowed border-slate-600/60 bg-slate-800/90 text-slate-500 shadow-inner'}">
                   <span class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-active/unlock:translate-x-full"></span>
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
              class="w-12 h-12 flex items-center justify-center bg-gray-800 active:bg-gray-700 rounded-xl text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              ${currentDungeonPage === 1 ? 'disabled' : ''}>
        <span class="material-symbols-outlined text-2xl">chevron_left</span>
      </button>
      <span class="text-gray-400 text-sm font-bold bg-gray-900 border border-gray-700 px-4 py-2 rounded-lg">
        ${currentDungeonPage} / ${maxPage}
      </span>
      <button onclick="window.changeDungeonPage(1)" 
              class="w-12 h-12 flex items-center justify-center bg-gray-800 active:bg-gray-700 rounded-xl text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              ${currentDungeonPage === maxPage ? 'disabled' : ''}>
        <span class="material-symbols-outlined text-2xl">chevron_right</span>
      </button>
    </div>
  ` : '';

  scheduleDungeonPageMeasurement();
  return `
    <div data-dungeon-page class="flex h-full min-h-0 flex-col gap-2.5 overflow-hidden bg-[#0b0b19] p-2.5 pb-3 sm:gap-4 sm:p-4">
      ${tabsHtml}
      <div data-dungeon-list class="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden sm:gap-4">
        ${cardsHtml}
      </div>
      ${paginationHtml}
    </div>
  `;
}
