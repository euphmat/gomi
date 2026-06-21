import { DUNGEONS } from '../definitions/dungeons.js';
import { SPECIAL_DUNGEONS } from '../definitions/special_dungeons.js';
import { MONSTERS } from '../definitions/monsters.js';
import { GameDB } from '../data/database.js';
import { calcItemsPerPage } from '../data/page-utils.js';
import { executeSkip, calcDungeonSkipCost } from '../utils/skip-simulator.js';
import { formatNumber } from '../utils/format.js';
import { JOBS } from '../jobs/index.js';

window.enterDungeon = async (dungeonId) => {
  await GameDB.setGameState('currentDungeon', dungeonId);
  await GameDB.setGameState('currentFloor', 1);
  window.location.hash = '/battle';
};

window.openSkipModal = async (dungeonId, isSpecial) => {
  const dungeonList = isSpecial ? SPECIAL_DUNGEONS : DUNGEONS;
  const dungeon = dungeonList.find(d => d.id === dungeonId);
  if (!dungeon) return;
  const skipCost = calcDungeonSkipCost(dungeon);
  const currentGold = await GameDB.getGameState('gold') || 0;

  const overlay = document.createElement('div');
  overlay.id = 'skip-modal-overlay';
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4';
  
    const updateModal = (numSkips) => {
    const totalCost = skipCost * numSkips;
    const canAfford = currentGold >= totalCost && numSkips > 0;
    const isMax = numSkips === Math.floor(currentGold / skipCost);
    
    overlay.innerHTML = `
      <div class="bg-[#11111a]/95 backdrop-blur-xl border border-gray-700/80 rounded-[24px] w-full max-w-sm overflow-hidden shadow-[0_16px_40px_-10px_rgba(0,0,0,0.8)] flex flex-col relative transition-all">
        <!-- Decoration glow -->
        <div class="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none"></div>

        <div class="p-5 pb-0 flex justify-between items-start relative z-10">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-[14px] bg-[#050505] border border-gray-700 flex items-center justify-center shadow-inner relative overflow-hidden">
              <img src="${dungeon.image}" class="w-full h-full object-cover mix-blend-lighten opacity-80" onerror="this.style.display='none'">
            </div>
            <div class="flex flex-col justify-center">
              <h3 class="text-base font-black text-gray-100 tracking-wider">${dungeon.name}</h3>
              <p class="text-[10px] text-yellow-500/80 font-bold uppercase tracking-widest mt-0.5">Skip Execution</p>
            </div>
          </div>
          <button onclick="document.getElementById('skip-modal-overlay').remove()" class="w-8 h-8 rounded-full bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center transition-colors shadow-sm"><span class="material-symbols-outlined text-[18px]">close</span></button>
        </div>

        <div class="p-5 flex flex-col gap-5 relative z-10">
          
          <!-- Segmented Control for Quantity -->
          <div>
            <p class="text-[10px] text-gray-400 font-bold mb-2 ml-1 flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">repeat</span> 実行回数を選択</p>
            <div class="flex items-center bg-[#050505] p-1 rounded-[14px] border border-gray-800/80 shadow-inner">
              ${[1, 10, 100, 1000].map(n => `
                <button onclick="window.updateSkipModalAmount(${n})" class="flex-1 py-2 rounded-xl font-bold text-xs transition-all duration-200 ${numSkips === n && !isMax ? 'bg-gray-800 text-white shadow-md border border-gray-600' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40 border border-transparent'}">x${n}</button>
              `).join('')}
              <button onclick="window.updateSkipModalAmount(Math.floor(${currentGold} / ${skipCost}))" class="flex-1 py-2 rounded-xl font-bold text-xs transition-all duration-200 ${isMax ? 'bg-yellow-600/20 text-yellow-400 shadow-md border border-yellow-600/30' : 'text-gray-500 hover:text-yellow-400/60 hover:bg-yellow-900/20 border border-transparent'}">MAX</button>
            </div>
          </div>

          <!-- Receipt Details -->
          <div class="bg-gray-800/40 rounded-[16px] border border-gray-700/50 p-4 flex flex-col gap-3 shadow-sm">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-400 font-medium flex items-center gap-1.5"><span class="material-symbols-outlined text-[14px]">account_balance_wallet</span>所持ゴールド</span>
              <span class="text-sm font-bold text-gray-200">${formatNumber(currentGold)} G</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-400 font-medium flex items-center gap-1.5"><span class="material-symbols-outlined text-[14px]">payments</span>1周の費用</span>
              <span class="text-sm font-bold text-gray-200">${formatNumber(skipCost)} G</span>
            </div>
            <div class="w-full h-[1px] bg-gray-700/80 my-1 border-t border-gray-600 border-dashed"></div>
            <div class="flex justify-between items-end">
              <span class="text-[11px] text-gray-400 font-bold mb-0.5">予想合計費用</span>
              <span class="text-xl font-black tracking-wide ${canAfford ? 'text-red-400' : 'text-gray-500'}">-${formatNumber(totalCost)} <span class="text-sm font-bold">G</span></span>
            </div>
          </div>
          
          <button onclick="if(${canAfford}) { window.executeSkipFromModal('${dungeonId}', ${isSpecial}, ${numSkips}); } else { alert('ゴールドが足りないか、周回数が0です。'); }" class="relative overflow-hidden w-full py-4 rounded-[14px] font-black text-white transition-all duration-300 ${canAfford ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 shadow-[0_4px_20px_rgba(234,179,8,0.25)] hover:shadow-[0_4px_25px_rgba(234,179,8,0.4)] active:scale-[0.98] cursor-pointer group' : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'}">
            <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            <span class="relative z-10 flex items-center justify-center gap-2 drop-shadow-md">
              <span class="material-symbols-outlined text-[20px]">bolt</span>
              ${numSkips > 0 ? `${formatNumber(numSkips)}周 ` : ''}スキップ実行
            </span>
          </button>
        </div>
      </div>
    `;
  };
  
  window.updateSkipModalAmount = updateModal;
  document.body.appendChild(overlay);
  updateModal(1);
};

window.executeSkipFromModal = async (dungeonId, isSpecial, numSkips) => {
  document.getElementById('skip-modal-overlay').remove();
  
  const party = await GameDB.getAllCharacters();
  const partyImages = party.slice(0, 4).map(p => p.iconImage || './assets/job/job_norvice.webp');
  
  const dungeonList = isSpecial ? SPECIAL_DUNGEONS : DUNGEONS;
  const dungeon = dungeonList.find(d => d.id === dungeonId);
  const firstEncounter = dungeon.floors[0].monsters[0];
  const targetMonsterId = Object.keys(firstEncounter).find(k => k !== 'weight');
  const monsterDef = MONSTERS.find(m => m.id === targetMonsterId);
  const monsterImage = monsterDef?.image || 'assets/monsters/slime_blue.png';

  const loading = document.createElement('div');
  loading.id = 'skip-loading';
  loading.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm flex-col gap-6 px-4';
  loading.innerHTML = `
    <h3 class="text-xl font-black text-yellow-400 tracking-widest animate-pulse mb-2">戦闘中...</h3>
    <div class="relative w-full max-w-sm h-32 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex items-center justify-between px-6 shadow-inner">
      <div class="flex items-center">
        ${partyImages.map((img, i) => `
          <div class="w-12 h-12 -ml-4 first:ml-0 relative z-[${10-i}] animate-bounce" style="animation-delay: ${i*0.1}s">
            <img src="${img}" class="w-full h-full object-contain drop-shadow-md">
          </div>
        `).join('')}
      </div>
      <div class="text-yellow-400 font-black italic text-2xl drop-shadow-lg absolute left-1/2 -translate-x-1/2">VS</div>
      <div class="w-16 h-16 animate-bounce" style="animation-delay: 0.2s">
        <img src="${monsterImage}" class="w-full h-full object-contain drop-shadow-md" style="transform: scaleX(-1);">
      </div>
    </div>
    
    <div class="w-full max-w-sm bg-gray-800 rounded-full h-4 border border-gray-700 overflow-hidden relative shadow-inner">
      <div id="skip-progress-bar" class="h-full bg-yellow-500 transition-all duration-100 ease-out" style="width: 0%; box-shadow: 0 0 10px rgba(234,179,8,0.5);"></div>
      <div class="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
    </div>
    <div id="skip-progress-text" class="text-yellow-400 font-bold tracking-widest text-sm">0%</div>
  `;
  document.body.appendChild(loading);
  
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 5 + 2;
    if (progress > 95) progress = 95;
    const bar = document.getElementById('skip-progress-bar');
    const text = document.getElementById('skip-progress-text');
    if (bar) bar.style.width = `${progress}%`;
    if (text) text.textContent = `${Math.floor(progress)}%`;
  }, 50);

  const startTime = Date.now();
  
  setTimeout(async () => {
    const result = await executeSkip(dungeonId, isSpecial, numSkips);
    
    const elapsed = Date.now() - startTime;
    if (elapsed < 1500) {
      await new Promise(r => setTimeout(r, 1500 - elapsed));
    }
    
    clearInterval(progressInterval);
    const bar = document.getElementById('skip-progress-bar');
    const text = document.getElementById('skip-progress-text');
    if (bar) bar.style.width = `100%`;
    if (text) text.textContent = `100%`;
    
    setTimeout(async () => {
      document.getElementById('skip-loading').remove();
      if (result && result.success) {
        const currentGold = await GameDB.getGameState('gold') || 0;
        const goldDisplay = document.getElementById('header-gold-display');
        if (goldDisplay) {
          goldDisplay.textContent = ` Gold : ${formatNumber(currentGold)} `;
        }
        window.showSkipResultModal(result, numSkips);
      } else {
        alert("エラーが発生しました。");
      }
    }, 200);
  }, 50);
};

window.showSkipResultModal = (res, numSkips) => {
  const overlay = document.createElement('div');
  overlay.id = 'skip-result-overlay';
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4';
  
  const capturedIds = res.captures.map(c => c.id);

  const dropsHtml = res.drops.map(d => `
    <div class="relative bg-gray-800 p-1.5 rounded-lg border border-gray-700 flex flex-col items-center justify-between shadow-sm">
      <div class="w-12 h-12 relative flex-shrink-0">
        <img src="${d.image}" class="w-full h-full object-contain drop-shadow-md" alt="${d.name}">
        <div class="absolute -bottom-1 -right-1 bg-black/80 border border-gray-600 text-gray-200 text-[9px] font-black px-1 rounded">x${formatNumber(d.quantity)}</div>
      </div>
      <p class="text-[9px] text-gray-300 font-bold truncate w-full text-center mt-2">${d.name}</p>
    </div>
  `).join('');

  const monstersHtml = (res.monsters || []).map(m => {
    const isCaptured = capturedIds.includes(m.id);
    return `
      <div class="relative bg-gray-800 p-1.5 rounded-lg border border-gray-700 flex flex-col items-center justify-between shadow-sm">
        <div class="w-12 h-12 relative flex-shrink-0">
          <img src="${m.image}" class="w-full h-full object-contain drop-shadow-md ${m.isLegendary ? 'animate-rainbow' : ''}" alt="${m.name}">
          <div class="absolute -bottom-1 -right-1 bg-black/80 border border-gray-600 text-gray-200 text-[9px] font-black px-1 rounded">x${formatNumber(m.quantity)}</div>
        </div>
        <p class="text-[9px] text-gray-300 font-bold truncate w-full text-center mt-2">${m.name}</p>
        ${isCaptured ? '<div class="absolute -top-2 -right-2 text-pink-400 drop-shadow-[0_0_4px_rgba(244,114,182,0.8)] z-10 bg-gray-900 rounded-full w-5 h-5 flex items-center justify-center border border-pink-500/50"><span class="material-symbols-outlined !text-[12px]">pets</span></div>' : ''}
      </div>
    `;
  }).join('');

  overlay.innerHTML = `
    <div class="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
      <div class="bg-gray-800 p-4 border-b border-gray-700 flex justify-center items-center">
        <h3 class="text-xl font-black text-yellow-400 tracking-widest drop-shadow-md flex items-center gap-2">SKIP RESULTS</h3>
      </div>
      <div class="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        <div class="text-center text-sm text-gray-300 font-bold">スキップ完了: ${formatNumber(numSkips)}周</div>
        
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-gray-800 border border-gray-700 p-2 rounded-lg flex flex-col items-center">
            <span class="text-[9px] text-gray-400 font-bold">獲得 EXP</span>
            <span class="text-sm text-blue-400 font-bold">+${formatNumber(res.totalExp)}</span>
          </div>
          <div class="bg-gray-800 border border-gray-700 p-2 rounded-lg flex flex-col items-center">
            <span class="text-[9px] text-gray-400 font-bold">獲得 JP</span>
            <span class="text-sm text-purple-400 font-bold">+${formatNumber(res.totalJp)}</span>
          </div>
          <div class="bg-gray-800 border border-gray-700 p-2 rounded-lg flex flex-col items-center col-span-2">
            <span class="text-[9px] text-gray-400 font-bold">獲得 GOLD</span>
            <span class="text-sm text-yellow-400 font-bold">+${formatNumber(res.totalGold)}</span>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="text-[11px] font-black text-gray-300 border-b border-gray-700 pb-1 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">swords</span>討伐したモンスター</div>
          <div class="grid grid-cols-4 gap-2">${monstersHtml || '<div class="col-span-4 text-center text-xs text-gray-500 py-2">なし</div>'}</div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="text-[11px] font-black text-gray-300 border-b border-gray-700 pb-1 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">backpack</span>ドロップアイテム</div>
          <div class="grid grid-cols-4 gap-2">${dropsHtml || '<div class="col-span-4 text-center text-xs text-gray-500 py-2">なし</div>'}</div>
        </div>
      </div>
      <div class="p-4 border-t border-gray-700 bg-gray-800">
        <button onclick="document.getElementById('skip-result-overlay').remove()" class="w-full py-3 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer">
          閉じる
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
};

let currentDungeonPage = 1;
let currentDungeonTab = 'normal'; // 'normal' | 'special'

function getItemsPerPage() {
  return calcItemsPerPage({ viewMode: 'list', listItemHeight: 88, minItems: 2 });
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
      
    const dungeonMonsters = new Set();
    d.floors.forEach(f => f.monsters.forEach(enc => {
      Object.keys(enc).forEach(k => {
        if (k !== 'weight') dungeonMonsters.add(k);
      });
    }));
    
    let canSkip = true;
    for (const mId of dungeonMonsters) {
      if (playerMedals[mId] === undefined || playerMedals[mId] < 0) {
        canSkip = false;
        break;
      }
    }

    if (isUnlocked) {
      return `
      <!-- ダンジョン: ${d.name} -->
      <div class="relative overflow-hidden flex items-center bg-[#11111a] border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-lg gap-2.5 sm:gap-4 transition-all duration-300 hover:-translate-y-1 group" 
           style="border-color: rgba(${themeRgb}, 0.3); box-shadow: 0 8px 24px -4px rgba(${themeRgb}, 0.15);">
        
        <!-- 背景のぼかしグラデーション -->
        <div class="absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-40" 
             style="background: radial-gradient(circle at 15% 50%, rgba(${themeRgb}, 0.8) 0%, transparent 60%); pointer-events: none;"></div>

        <!-- 画像コンテナ -->
        <div class="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden flex-shrink-0 bg-[#050505] border-2 relative z-10 transition-transform duration-500 group-hover:scale-105" 
             style="border-color: rgba(${themeRgb}, 0.4); box-shadow: 0 0 15px rgba(${themeRgb}, 0.2);">
          <img src="${d.image}" alt="" class="w-full h-full object-cover mix-blend-lighten opacity-80 group-hover:opacity-100 transition-opacity duration-300" onerror="this.style.display='none'">
        </div>

        <div class="flex-1 min-w-0 relative z-10">
          <h3 class="text-sm sm:text-lg font-black tracking-widest flex items-center gap-1 sm:gap-2 truncate" 
              style="color: rgba(${themeRgb}, 1); text-shadow: 0 0 12px rgba(${themeRgb}, 0.6);">
            ${d.name}
          </h3>
          <p class="text-[9px] sm:text-[11px] text-gray-400 mt-0.5 sm:mt-1 leading-tight sm:leading-relaxed font-medium opacity-90 line-clamp-2 sm:line-clamp-none">${d.description}</p>
        </div>

        <!-- アクションボタン領域 -->
        <div class="flex gap-1.5 sm:gap-2 relative z-10 flex-shrink-0">
          <!-- スキップボタン -->
          ${canSkip ? `
          <button onclick="window.openSkipModal('${d.id}', ${currentDungeonTab === 'special'})" 
                  class="relative flex flex-col items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl text-white font-bold transition-all duration-200 active:scale-95 cursor-pointer overflow-hidden group/btn hover:brightness-110" 
                  style="background: linear-gradient(135deg, rgba(${themeRgb}, 0.8), rgba(${themeRgb}, 0.4)); box-shadow: 0 4px 15px rgba(${themeRgb}, 0.3); border: 1px solid rgba(${themeRgb}, 0.5);">
            <div class="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" 
                 style="background: linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 50%); pointer-events: none;"></div>
            <span class="material-symbols-outlined text-xl sm:text-2xl mb-0.5 sm:mb-1 drop-shadow-md relative z-10 pointer-events-none">fast_forward</span>
            <span class="text-[8px] sm:text-[9px] tracking-widest drop-shadow-md uppercase relative z-10 pointer-events-none">Skip</span>
          </button>
          ` : ''}

          <!-- 探索ボタン -->
          <button onclick="window.enterDungeon('${d.id}')" 
                  class="relative flex flex-col items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl text-white font-bold transition-all duration-200 active:scale-95 cursor-pointer overflow-hidden group/btn hover:brightness-110" 
                  style="background: linear-gradient(135deg, rgba(${themeRgb}, 0.8), rgba(${themeRgb}, 0.4)); box-shadow: 0 4px 15px rgba(${themeRgb}, 0.3); border: 1px solid rgba(${themeRgb}, 0.5);">
            <div class="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" 
                 style="background: linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 50%); pointer-events: none;"></div>
            <span class="material-symbols-outlined text-xl sm:text-2xl mb-0.5 sm:mb-1 drop-shadow-md relative z-10 pointer-events-none">${theme.icon}</span>
            <span class="text-[8px] sm:text-[9px] tracking-widest drop-shadow-md uppercase relative z-10 pointer-events-none">Explore</span>
          </button>
        </div>
      </div>`;
    } else {
      return `
      <!-- 未解放ダンジョン: ${d.name} -->
      <div class="relative overflow-hidden flex items-center justify-center bg-[#0a0a10] border border-gray-800/60 rounded-xl sm:rounded-2xl h-20 sm:h-24 gap-2.5 sm:gap-4 transition-all">
        
        <!-- 背景としてぼかした中身 -->
        <div class="absolute inset-0 flex items-center p-2.5 sm:p-4 gap-2.5 sm:gap-4 blur-md opacity-30 select-none">
          <div class="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl flex-shrink-0 bg-black/60 border border-gray-800 flex items-center justify-center">
            <span class="material-symbols-outlined text-gray-700 text-2xl sm:text-3xl">question_mark</span>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm sm:text-lg font-bold text-gray-600 tracking-widest truncate">${d.name}</h3>
            <p class="text-[9px] sm:text-[11px] text-gray-600 mt-0.5 sm:mt-1 line-clamp-1">${d.description}</p>
          </div>
          <div class="flex flex-col items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-[#050508] rounded-lg sm:rounded-xl flex-shrink-0 border border-gray-800/80"></div>
        </div>

        <!-- 斜め線のパターン (LOCKED感) -->
        <div class="absolute inset-0 opacity-[0.05]" 
             style="background-image: repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 8px); pointer-events: none;"></div>

        <!-- 前面にハッキリ表示するロック情報と解放条件 -->
        <div class="relative z-10 flex flex-col items-center justify-center w-full h-full p-2">
          <div class="flex items-center justify-center gap-1 sm:gap-2 mb-1 sm:mb-2">
            <span class="material-symbols-outlined text-gray-400 text-lg sm:text-xl">lock</span>
            <span class="text-xs sm:text-sm tracking-widest text-gray-300 font-bold uppercase">Locked</span>
          </div>
          ${d.id === 'golden_slime_island' 
            ? `<div class="bg-amber-900/40 border border-amber-500/50 text-amber-400 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold shadow-lg flex items-center gap-1.5 sm:gap-2">
                 <span class="material-symbols-outlined text-[12px] sm:text-sm">stars</span>
                 解放条件: メダルを18種類以上獲得 (現在: ${medalCount}種類)
               </div>`
            : `<div class="text-[9px] sm:text-[10px] text-gray-400 font-bold bg-black/60 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-gray-700 shadow-lg text-center leading-tight">
                 条件を満たすと<br class="sm:hidden" />挑戦可能になります
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
