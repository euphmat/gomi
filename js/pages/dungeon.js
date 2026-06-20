import { DUNGEONS } from '../definitions/dungeons.js';
import { SPECIAL_DUNGEONS } from '../definitions/special_dungeons.js';
import { GameDB } from '../data/database.js';
import { calcItemsPerPage } from '../data/page-utils.js';

window.enterDungeon = async (dungeonId) => {
  await GameDB.setGameState('currentDungeon', dungeonId);
  await GameDB.setGameState('currentFloor', 1);
  window.location.hash = '/battle';
};

let currentDungeonPage = 1;
let currentDungeonTab = 'normal'; // 'normal' | 'special'

function getItemsPerPage() {
  return calcItemsPerPage({ viewMode: 'list', listItemHeight: 108, minItems: 2 });
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
    </div>
  `;

  const unlockedDungeons = await GameDB.getGameState('unlockedDungeons') || ['slime_forest'];
  const playerMedals = await GameDB.getGameState('player_medals') || {};
  const medalCount = Object.keys(playerMedals).length;
  
  const filteredDungeons = currentDungeonTab === 'special' ? SPECIAL_DUNGEONS : DUNGEONS;

  const totalItems = filteredDungeons.length;
  const maxPage = Math.ceil(totalItems / getItemsPerPage());
  if (currentDungeonPage > maxPage) currentDungeonPage = maxPage || 1;

  const itemsPerPage = getItemsPerPage();
  const startIndex = (currentDungeonPage - 1) * itemsPerPage;
  const pageDungeons = filteredDungeons.slice(startIndex, startIndex + itemsPerPage);



  const cardsHtml = pageDungeons.map(d => {
    const theme = d.theme || { color: '107, 114, 128', icon: 'swords' };
    const themeRgb = theme.color;

    let isUnlocked = d.unlockCondition 
      ? medalCount >= (d.unlockCondition.medals || 0)
      : (d.isUnlocked || unlockedDungeons.includes(d.id));

    if (isUnlocked) {
      return `
      <!-- ダンジョン: ${d.name} -->
      <div class="relative overflow-hidden flex items-center bg-[#11111a] border rounded-2xl p-4 shadow-lg gap-4 transition-all duration-300 hover:-translate-y-1 group" 
           style="border-color: rgba(${themeRgb}, 0.3); box-shadow: 0 8px 24px -4px rgba(${themeRgb}, 0.15);">
        
        <!-- 背景のぼかしグラデーション -->
        <div class="absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-40" 
             style="background: radial-gradient(circle at 15% 50%, rgba(${themeRgb}, 0.8) 0%, transparent 60%); pointer-events: none;"></div>

        <!-- 画像コンテナ -->
        <div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-[#050505] border-2 relative z-10 transition-transform duration-500 group-hover:scale-105" 
             style="border-color: rgba(${themeRgb}, 0.4); box-shadow: 0 0 15px rgba(${themeRgb}, 0.2);">
          <img src="${d.image}" alt="" class="w-full h-full object-cover mix-blend-lighten opacity-80 group-hover:opacity-100 transition-opacity duration-300" onerror="this.style.display='none'">
        </div>

        <div class="flex-1 relative z-10">
          <h3 class="text-lg font-black tracking-widest flex items-center gap-2" 
              style="color: rgba(${themeRgb}, 1); text-shadow: 0 0 12px rgba(${themeRgb}, 0.6);">
            ${d.name}
          </h3>
          <p class="text-[11px] text-gray-400 mt-1 leading-relaxed font-medium opacity-90">${d.description}</p>
        </div>

        <!-- 探索ボタン -->
        <button onclick="window.enterDungeon('${d.id}')" 
                class="flex flex-col items-center justify-center w-16 h-16 rounded-xl text-white font-bold transition-all duration-200 active:scale-95 cursor-pointer flex-shrink-0 relative z-10 overflow-hidden group/btn hover:brightness-110" 
                style="background: linear-gradient(135deg, rgba(${themeRgb}, 0.8), rgba(${themeRgb}, 0.4)); box-shadow: 0 4px 15px rgba(${themeRgb}, 0.3); border: 1px solid rgba(${themeRgb}, 0.5);">
          <!-- ボタン内の微細なハイライト -->
          <div class="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" 
               style="background: linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 50%);"></div>
          <span class="material-symbols-outlined text-2xl mb-1 drop-shadow-md">${theme.icon}</span>
          <span class="text-[9px] tracking-widest drop-shadow-md uppercase">Explore</span>
        </button>
      </div>`;
    } else {
      return `
      <!-- 未解放ダンジョン: ${d.name} -->
      <div class="relative overflow-hidden flex items-center justify-center bg-[#0a0a10] border border-gray-800/60 rounded-2xl h-24 gap-4 transition-all">
        
        <!-- 背景としてぼかした中身 -->
        <div class="absolute inset-0 flex items-center p-4 gap-4 blur-md opacity-30 select-none">
          <div class="w-16 h-16 rounded-xl flex-shrink-0 bg-black/60 border border-gray-800 flex items-center justify-center">
            <span class="material-symbols-outlined text-gray-700 text-3xl">question_mark</span>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-gray-600 tracking-widest">${d.name}</h3>
            <p class="text-[11px] text-gray-600 mt-1 line-clamp-1">${d.description}</p>
          </div>
          <div class="flex flex-col items-center justify-center w-16 h-16 bg-[#050508] rounded-xl flex-shrink-0 border border-gray-800/80"></div>
        </div>

        <!-- 斜め線のパターン (LOCKED感) -->
        <div class="absolute inset-0 opacity-[0.05]" 
             style="background-image: repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 8px); pointer-events: none;"></div>

        <!-- 前面にハッキリ表示するロック情報と解放条件 -->
        <div class="relative z-10 flex flex-col items-center justify-center w-full h-full p-2">
          <div class="flex items-center justify-center gap-2 mb-2">
            <span class="material-symbols-outlined text-gray-400 text-xl">lock</span>
            <span class="text-sm tracking-widest text-gray-300 font-bold uppercase">Locked</span>
          </div>
          ${d.id === 'golden_slime_island' 
            ? `<div class="bg-amber-900/40 border border-amber-500/50 text-amber-400 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
                 <span class="material-symbols-outlined text-sm">stars</span>
                 解放条件: メダルを18種類以上獲得 (現在: ${medalCount}種類)
               </div>`
            : `<div class="text-[10px] text-gray-400 font-bold bg-black/60 px-4 py-1.5 rounded-full border border-gray-700 shadow-lg">
                 条件を満たすと挑戦可能になります
               </div>`
          }
        </div>
      </div>`;
    }
  }).join('');

  const paginationHtml = maxPage > 1 ? `
    <div class="flex items-center justify-between mt-2 px-2">
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

  return `
    <div class="flex flex-col h-full bg-[#0b0b19] p-4 gap-4 pb-24 overflow-y-auto">
      ${tabsHtml}
      ${cardsHtml}
      ${paginationHtml}
    </div>
  `;
}
