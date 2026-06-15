import { GameDB } from '../../data/database.js';
import { MONSTERS } from '../../definitions/monsters.js';
import { MATERIALS } from '../../definitions/materials.js';
import { MEDAL_RANKS, getMedalImageFilter } from '../../definitions/medal-definitions.js';
import { DUNGEONS } from '../../definitions/dungeons.js';
import { calcItemsPerPage } from '../../data/page-utils.js';
import { formatNumber } from '../../utils/format.js';

/**
 * メダル鋳造タブ
 * 
 * モンスターの素材とゴールドを消費してメダルを作成・ランクアップできる機能です。
 * メダルを所持していると、対象モンスターの討伐時に討伐数ボーナスが加算されます。
 */
export function renderMedalTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full overflow-hidden';

  // --- 状態管理 ---
  let playerMedals = {};
  let currentGold = 0;
  let inventoryMap = {};
  let discoveredMonsters = [];
  let unlockedDungeons = [];
  let allAvailableMonsters = [];
  const monsterToDungeonMap = {};

  let selectedDungeonId = 'all';
  let currentPage = 1;
  let selectedMonsterId = null;

  // --- ヘッダー ---
  const headerEl = document.createElement('div');
  headerEl.className = 'flex items-center justify-between p-3 bg-slate-950/70 border-b border-slate-800/60 shrink-0';

  const updateHeader = () => {
    const dungeonOptions = ['<option value="all">全てのダンジョン</option>'];
    DUNGEONS.forEach(d => {
      if (d.isUnlocked || unlockedDungeons.includes(d.id)) {
        dungeonOptions.push(`<option value="${d.id}" ${selectedDungeonId === d.id ? 'selected' : ''}>${d.name}</option>`);
      }
    });

    headerEl.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-amber-400 text-lg" style="font-variation-settings: 'FILL' 1">military_tech</span>
        <span class="text-sm font-black text-slate-200 tracking-wide">メダル鋳造</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative flex items-center">
          <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style="font-size: 16px;">filter_alt</span>
          <select id="medal-dungeon-filter" class="appearance-none bg-slate-900/80 border border-slate-700/60 text-slate-300 text-xs font-bold rounded pl-7 pr-6 py-1 cursor-pointer outline-none focus:border-amber-500/50 shadow-inner w-40 hover:bg-slate-800 transition-colors">
            ${dungeonOptions.join('')}
          </select>
          <span class="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style="font-size: 16px;">arrow_drop_down</span>
        </div>
        <button id="btn-medal-help" class="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60 hover:bg-slate-700 hover:text-white transition-colors">
          <span class="material-symbols-outlined text-[16px]">help</span>
        </button>
      </div>
    `;

    const filterSelect = headerEl.querySelector('#medal-dungeon-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        selectedDungeonId = e.target.value;
        currentPage = 1;
        const availableNow = selectedDungeonId === 'all' 
          ? allAvailableMonsters 
          : allAvailableMonsters.filter(m => monsterToDungeonMap[m.id] === selectedDungeonId);
        
        if (selectedMonsterId && !availableNow.find(m => m.id === selectedMonsterId)) {
          selectedMonsterId = availableNow.length > 0 ? availableNow[0].id : null;
        }
        render();
      });
    }

    const helpBtn = headerEl.querySelector('#btn-medal-help');
    if (helpBtn) {
      helpBtn.onclick = showMedalHelpModal;
    }
  };
  updateHeader();

  // --- コンテナ分割 ---
  const detailContainer = document.createElement('div');
  detailContainer.className = 'shrink-0 p-3 pb-2 border-b border-slate-800/60 bg-slate-900/40 z-10 shadow-sm';

  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'flex-1 overflow-y-auto p-3 pt-2';

  const paginationContainer = document.createElement('div');
  paginationContainer.className = 'flex items-center justify-center gap-4 py-1.5 shrink-0 bg-slate-950/80 border-t border-slate-800';

  const renderPagination = (totalPages) => {
    paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.className = `flex items-center justify-center w-8 h-6 rounded bg-slate-800/80 border border-slate-700/60 transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700/80 cursor-pointer'}`;
    prevBtn.innerHTML = '<span class="material-symbols-outlined text-[14px] text-slate-300">chevron_left</span>';
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        render();
        scrollContainer.scrollTop = 0;
      }
    };

    const pageIndicator = document.createElement('span');
    pageIndicator.className = 'text-[10px] font-bold text-slate-400';
    pageIndicator.textContent = `${currentPage} / ${totalPages}`;

    const nextBtn = document.createElement('button');
    nextBtn.className = `flex items-center justify-center w-8 h-6 rounded bg-slate-800/80 border border-slate-700/60 transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700/80 cursor-pointer'}`;
    nextBtn.innerHTML = '<span class="material-symbols-outlined text-[14px] text-slate-300">chevron_right</span>';
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        render();
        scrollContainer.scrollTop = 0;
      }
    };

    paginationContainer.appendChild(prevBtn);
    paginationContainer.appendChild(pageIndicator);
    paginationContainer.appendChild(nextBtn);
  };

  // --- 描画関数 ---
  const render = () => {
    detailContainer.innerHTML = '';
    scrollContainer.innerHTML = '';
    paginationContainer.innerHTML = '';

    const availableMonsters = selectedDungeonId === 'all' 
      ? allAvailableMonsters 
      : allAvailableMonsters.filter(m => monsterToDungeonMap[m.id] === selectedDungeonId);

    if (availableMonsters.length === 0) {
      scrollContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full gap-4 text-center">
          <span class="material-symbols-outlined text-5xl text-slate-600">explore_off</span>
          <div class="text-slate-400 text-sm font-bold">モンスターが未発見です</div>
          <div class="text-slate-500 text-xs">ダンジョンでモンスターと戦闘して発見してください</div>
        </div>
      `;
      return;
    }

    // --- 選択モンスター詳細 (Top) ---
    if (selectedMonsterId) {
      const monster = MONSTERS.find(m => m.id === selectedMonsterId);
      if (monster) {
        const currentRankIndex = playerMedals[selectedMonsterId] !== undefined ? playerMedals[selectedMonsterId] : -1;
        const nextRankIndex = currentRankIndex + 1;
        const isMaxRank = nextRankIndex >= MEDAL_RANKS.length;
        const currentRank = currentRankIndex >= 0 ? MEDAL_RANKS[currentRankIndex] : null;
        const nextRank = !isMaxRank ? MEDAL_RANKS[nextRankIndex] : null;

        // --- メダル詳細パネル ---
        const detailPanel = document.createElement('div');
        detailPanel.className = 'bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 flex flex-col gap-3 shadow-lg';

        // 上部: モンスター情報 + メダルビジュアル
        const topSection = document.createElement('div');
        topSection.className = 'flex items-center gap-3';

        // メダルビジュアル
        const medalVisual = document.createElement('div');
        medalVisual.className = 'relative w-16 h-16 shrink-0 flex items-center justify-center';

        if (currentRank) {
          const filter = getMedalImageFilter(currentRank.id);
          
          // パーティクルアニメーション（ダイアモンド）
          let particlesHtml = '';
          if (currentRank.id === 'diamond') {
            particlesHtml = `
              <div class="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
                <div class="absolute w-1 h-1 bg-cyan-300 rounded-full animate-pulse" style="top: 20%; left: 30%; animation-delay: 0s; box-shadow: 0 0 4px 1px rgba(103,232,249,0.6)"></div>
                <div class="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse" style="top: 60%; left: 70%; animation-delay: 0.3s; box-shadow: 0 0 3px 1px rgba(255,255,255,0.6)"></div>
                <div class="absolute w-1 h-1 bg-cyan-200 rounded-full animate-pulse" style="top: 40%; left: 55%; animation-delay: 0.7s; box-shadow: 0 0 4px 1px rgba(165,243,252,0.6)"></div>
                <div class="absolute w-0.5 h-0.5 bg-blue-200 rounded-full animate-pulse" style="top: 75%; left: 25%; animation-delay: 1.1s; box-shadow: 0 0 3px 1px rgba(191,219,254,0.6)"></div>
              </div>
            `;
          }

          // セイントの聖なるグロー
          let saintGlow = '';
          if (currentRank.id === 'saint') {
            saintGlow = `<div class="absolute inset-0 rounded-full bg-yellow-100/20 blur-md animate-pulse pointer-events-none"></div>`;
          }

          medalVisual.innerHTML = `
            ${saintGlow}
            <div class="absolute inset-0 flex items-center justify-center p-[22%]">
              <img src="${monster.image}" class="w-full h-full object-contain" style="filter: ${filter}" onerror="this.style.display='none'">
            </div>
            <img src="${currentRank.image}" class="absolute inset-0 w-full h-full object-contain z-10 drop-shadow-lg pointer-events-none">
            ${particlesHtml}
          `;
        } else {
          // メダルなし → モンスター画像のみ（シルエット風）
          medalVisual.innerHTML = `
            <div class="w-14 h-14 rounded-full bg-slate-800/80 border-2 border-dashed border-slate-600/50 flex items-center justify-center">
              <img src="${monster.image}" class="w-8 h-8 object-contain opacity-30" onerror="this.style.display='none'">
            </div>
          `;
        }

        // モンスター名・ランク情報
        const infoSection = document.createElement('div');
        infoSection.className = 'flex flex-col flex-1 min-w-0 gap-1';

        let currentRankBadge = '';
        if (currentRank) {
          currentRankBadge = `
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-black px-1.5 py-0.5 rounded" style="background: ${currentRank.color}20; color: ${currentRank.color}; border: 1px solid ${currentRank.color}40">${currentRank.name}</span>
            </div>
          `;
        } else {
          currentRankBadge = `<span class="text-[10px] text-slate-500 font-bold">メダル未所持</span>`;
        }

        infoSection.innerHTML = `
          <div class="font-black text-slate-100 text-sm tracking-wide truncate">${monster.name}</div>
          ${currentRankBadge}
        `;

        topSection.appendChild(medalVisual);
        topSection.appendChild(infoSection);
        detailPanel.appendChild(topSection);

        // --- ランクアップ/作成セクション ---
        if (!isMaxRank && nextRank) {
          const craftSection = document.createElement('div');
          craftSection.className = 'border-t border-slate-700/60 pt-2 flex flex-col gap-1.5 h-[134px]';

          const actionLabel = currentRank ? 'ランクアップ' : '鋳造';
          const goldCost = monster.rewards.gold * nextRank.goldMultiplier;
          const materialDrops = monster.drops || [];

          // 必要素材チェック
          let canCraft = true;
          const materialRequirements = materialDrops.map(drop => {
            const mat = MATERIALS.find(m => m.id === drop.itemId);
            const owned = inventoryMap[drop.itemId] || 0;
            const required = nextRank.materialQty;
            const sufficient = owned >= required;
            if (!sufficient) canCraft = false;
            return { mat, itemId: drop.itemId, owned, required, sufficient };
          });

          if (currentGold < goldCost) canCraft = false;

          // 素材リスト
          const materialsGrid = document.createElement('div');
          materialsGrid.className = 'grid grid-cols-2 gap-1.5';

          materialRequirements.forEach(({ mat, owned, required, sufficient }) => {
            const row = document.createElement('div');
            row.className = `flex items-center justify-between p-1.5 rounded-lg border transition-colors ${
              sufficient
                ? 'bg-slate-950/40 border-slate-800/50'
                : 'bg-red-950/20 border-red-800/30'
            }`;
            
            const matName = mat ? mat.name : '不明な素材';
            const matImage = mat && mat.image
              ? `<img src="${mat.image}" class="w-5 h-5 object-contain shrink-0 drop-shadow-sm">`
              : `<span class="material-symbols-outlined text-slate-500 text-[14px] shrink-0">category</span>`;

            row.innerHTML = `
              <div class="flex items-center gap-1 min-w-0 flex-1 pr-1">
                <div class="w-6 h-6 rounded bg-slate-900 flex items-center justify-center border border-slate-800 shrink-0">${matImage}</div>
                <span class="text-[10px] font-bold text-slate-300 truncate leading-tight">${matName}</span>
              </div>
              <div class="flex items-center gap-0.5 shrink-0">
                <span class="text-[12px] font-black ${sufficient ? 'text-emerald-400' : 'text-red-400'}">${formatNumber(owned)}</span>
                <span class="text-gray-500 text-[10px]">/</span>
                <span class="text-[12px] font-bold text-slate-400">${formatNumber(required)}</span>
              </div>
            `;
            materialsGrid.appendChild(row);
          });

          // ゴールドコスト
          const goldRow = document.createElement('div');
          const goldSufficient = currentGold >= goldCost;
          goldRow.className = `flex items-center justify-between p-1.5 rounded-lg border transition-colors ${
            goldSufficient
              ? 'bg-slate-950/40 border-slate-800/50'
              : 'bg-red-950/20 border-red-800/30'
          }`;
          goldRow.innerHTML = `
            <div class="flex items-center gap-1 min-w-0 flex-1 pr-1">
              <div class="w-6 h-6 rounded bg-slate-900 flex items-center justify-center border border-slate-800 shrink-0">
                <span class="material-symbols-outlined text-amber-400 text-[14px]" style="font-variation-settings: 'FILL' 1">paid</span>
              </div>
              <span class="text-[10px] font-bold text-slate-300 truncate leading-tight">ゴールド</span>
            </div>
            <div class="flex items-center gap-0.5 shrink-0">
              <span class="text-[12px] font-black ${goldSufficient ? 'text-emerald-400' : 'text-red-400'}">${formatNumber(currentGold)}</span>
              <span class="text-gray-500 text-[10px]">/</span>
              <span class="text-[12px] font-bold text-slate-400">${formatNumber(goldCost)}</span>
            </div>
          `;
          materialsGrid.appendChild(goldRow);

          craftSection.appendChild(materialsGrid);

          // 作成/ランクアップボタン
          const craftBtn = document.createElement('button');
          craftBtn.className = `
            w-full py-2 mt-0.5 rounded-lg text-xs font-black tracking-wide transition-all duration-200
            ${canCraft
              ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white border border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.3)] hover:from-amber-500 hover:to-amber-400 active:scale-[0.98] cursor-pointer'
              : 'bg-slate-800/60 text-slate-500 border border-slate-700/40 cursor-not-allowed'}
          `;
          craftBtn.innerHTML = `
            <div class="flex items-center justify-center gap-1.5">
              <span class="material-symbols-outlined text-[14px]">${currentRank ? 'upgrade' : 'auto_awesome'}</span>
              <span>${currentRank ? `${nextRank.name}へランクアップ` : `${nextRank.name}を鋳造`}</span>
            </div>
          `;

          if (canCraft) {
            craftBtn.onclick = async () => {
              // 素材消費
              for (const drop of materialDrops) {
                const invItem = await GameDB.getInventoryItem(drop.itemId);
                if (invItem) {
                  invItem.quantity -= nextRank.materialQty;
                  if (invItem.quantity <= 0) {
                    await GameDB.deleteInventoryItem(drop.itemId);
                  } else {
                    await GameDB.putInventoryItem(invItem);
                  }
                  inventoryMap[drop.itemId] = Math.max(0, (inventoryMap[drop.itemId] || 0) - nextRank.materialQty);
                }
              }

              // ゴールド消費
              currentGold -= goldCost;
              await GameDB.setGameState('gold', currentGold);

              // メダルランクを保存
              playerMedals[selectedMonsterId] = nextRankIndex;
              await GameDB.setGameState('player_medals', playerMedals);

              // ヘッダーのゴールド表示も更新
              const goldDisplay = document.getElementById('header-gold-display');
              if (goldDisplay) goldDisplay.textContent = ` Gold : ${formatNumber(currentGold)} `;

              // 成功演出
              showCraftSuccessAnimation(container, nextRank, monster);

              // UI再描画
              updateHeader();
              render();
            };
          }

          craftSection.appendChild(craftBtn);
          detailPanel.appendChild(craftSection);
        } else if (isMaxRank) {
          // 最大ランク到達
          const maxSection = document.createElement('div');
          maxSection.className = 'border-t border-slate-700/60 pt-3 flex flex-col items-center justify-center gap-2 text-center h-[134px]';
          maxSection.innerHTML = `
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-lg text-amber-400 animate-pulse" style="font-variation-settings: 'FILL' 1">stars</span>
              <span class="text-sm font-black text-amber-300 tracking-wide">最高ランク到達</span>
              <span class="material-symbols-outlined text-lg text-amber-400 animate-pulse" style="font-variation-settings: 'FILL' 1">stars</span>
            </div>
            <span class="text-[10px] text-slate-400 font-bold">このモンスターのメダルは最高ランクに到達しています</span>
          `;
          detailPanel.appendChild(maxSection);
        }

        detailContainer.appendChild(detailPanel);
      }
    }

    // --- モンスター選択グリッド (Bottom) ---
    const monsterGrid = document.createElement('div');
    monsterGrid.className = 'grid grid-cols-5 gap-1.5 content-start';

    // Tailwind .w-11 .h-11 corresponds to 44px + text = roughly 66px cell height. gap-1.5 is 6px.
    const ITEMS_PER_PAGE = calcItemsPerPage({ viewMode: 'grid', scrollContainer, gridItemHeight: 76, gridCols: 5 });
    const totalPages = Math.ceil(availableMonsters.length / ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
    
    const pageMonsters = availableMonsters.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    pageMonsters.forEach(monster => {
      const isSelected = monster.id === selectedMonsterId;
      const currentRankIndex = playerMedals[monster.id] !== undefined ? playerMedals[monster.id] : -1;
      const hasMedal = currentRankIndex >= 0;
      const isMaxRank = currentRankIndex >= MEDAL_RANKS.length - 1;

      const btn = document.createElement('button');
      btn.className = `
        relative flex flex-col items-center justify-center p-1 rounded-lg transition-all duration-200 cursor-pointer active:scale-95 border
        ${isSelected
          ? 'bg-amber-950/60 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
          : 'bg-slate-900/60 border-slate-800/50 hover:bg-slate-800/40 hover:border-slate-700/60'}
      `;

      // メダルビジュアル or 未所持の薄い画像
      let gridVisualHtml = '';
      if (hasMedal) {
        const rank = MEDAL_RANKS[currentRankIndex];
        const filter = getMedalImageFilter(rank.id);

        // パーティクル（ダイアモンド以上）
        let miniParticles = '';
        if (rank.id === 'diamond') {
          miniParticles = `
            <div class="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
              <div class="absolute w-0.5 h-0.5 bg-cyan-300 rounded-full animate-pulse" style="top:25%;left:35%;box-shadow:0 0 2px 1px rgba(103,232,249,0.5)"></div>
              <div class="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse" style="top:65%;left:60%;animation-delay:0.4s;box-shadow:0 0 2px 1px rgba(255,255,255,0.5)"></div>
            </div>`;
        }
        // セイントのグロー
        let miniGlow = '';
        if (rank.id === 'saint') {
          miniGlow = `<div class="absolute inset-0 rounded-full bg-yellow-100/15 blur-sm animate-pulse pointer-events-none"></div>`;
        }

        gridVisualHtml = `
          <div class="relative w-11 h-11 flex items-center justify-center">
            ${miniGlow}
            <div class="absolute inset-0 flex items-center justify-center p-[22%]">
              <img src="${monster.image}" class="w-full h-full object-contain" style="filter: ${filter}" onerror="this.style.display='none'">
            </div>
            <img src="${rank.image}" class="absolute inset-0 w-full h-full object-contain z-10 drop-shadow pointer-events-none">
            ${miniParticles}
          </div>
        `;
      } else {
        // 未所持: モンスター画像を薄く表示
        gridVisualHtml = `
          <div class="relative w-11 h-11 flex items-center justify-center">
            <img src="${monster.image}" class="w-8 h-8 object-contain opacity-20 grayscale" onerror="this.style.display='none'">
          </div>
        `;
      }

      btn.innerHTML = `
        ${gridVisualHtml}
        <span class="text-[7px] font-bold ${isSelected ? 'text-amber-300' : hasMedal ? 'text-slate-300' : 'text-slate-500'} break-words line-clamp-2 w-full text-center leading-tight mt-0.5">${monster.name}</span>
      `;

      btn.onclick = () => {
        selectedMonsterId = monster.id;
        render();
      };

      monsterGrid.appendChild(btn);
    });

    scrollContainer.appendChild(monsterGrid);
    renderPagination(totalPages);
  };

  Promise.all([
    GameDB.getGameState('player_medals'),
    GameDB.getGameState('gold'),
    GameDB.getAllInventory(),
    GameDB.getGameState('discovered_monsters'),
    GameDB.getGameState('unlockedDungeons')
  ]).then(([pMedals, gold, invItems, dMonsters, uDungeons]) => {
    playerMedals = pMedals || {};
    currentGold = gold || 0;
    
    (invItems || []).forEach(item => { inventoryMap[item.id] = item.quantity || 0; });
    discoveredMonsters = dMonsters || [];
    unlockedDungeons = uDungeons || [];

    // モンスターID -> ダンジョンIDのマッピングを作成
    DUNGEONS.forEach(d => {
      d.floors?.forEach(f => {
        f.monsters?.forEach(mGroup => {
          Object.keys(mGroup).forEach(key => {
            if (key !== 'weight') {
              if (!monsterToDungeonMap[key]) monsterToDungeonMap[key] = d.id;
            }
          });
        });
      });
    });

    // 発見済みモンスターのみ抽出
    allAvailableMonsters = MONSTERS.filter(m => discoveredMonsters.includes(m.id));
    selectedMonsterId = allAvailableMonsters.find(m => m.id === 'slime_blue') ? 'slime_blue' : (allAvailableMonsters.length > 0 ? allAvailableMonsters[0].id : null);

    updateHeader();
    render();
  });

  container.appendChild(headerEl);
  container.appendChild(detailContainer);
  container.appendChild(scrollContainer);
  container.appendChild(paginationContainer);

  return container;
}

/**
 * メダル鋳造成功時のアニメーション演出
 */
function showCraftSuccessAnimation(parentEl, rank, monster) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none';
  overlay.style.animation = 'fade-in 0.3s ease-out';

  // 背景エフェクト
  const bg = document.createElement('div');
  bg.className = 'absolute inset-0';
  bg.style.background = `radial-gradient(circle at center, ${rank.color}20 0%, transparent 70%)`;
  overlay.appendChild(bg);

  // メダル表示
  const medalContainer = document.createElement('div');
  medalContainer.className = 'relative flex flex-col items-center gap-3';
  medalContainer.style.animation = 'slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';

  const filter = getMedalImageFilter(rank.id);

  medalContainer.innerHTML = `
    <div class="relative w-28 h-28">
      <div class="absolute inset-0 flex items-center justify-center p-[22%]">
        <img src="${monster.image}" class="w-full h-full object-contain" style="filter: ${filter}">
      </div>
      <img src="${rank.image}" class="absolute inset-0 w-full h-full object-contain z-10 drop-shadow-[0_0_20px_${rank.color}80]">
    </div>
    <div class="bg-slate-900/90 border border-amber-500/40 rounded-xl px-4 py-2 text-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
      <div class="text-base font-black tracking-wide" style="color: ${rank.color}">${rank.name}</div>
      <div class="text-[10px] text-amber-400 font-bold mt-0.5">討伐数 +${rank.totalKillCount}/討伐</div>
    </div>
  `;

  overlay.appendChild(medalContainer);
  document.body.appendChild(overlay);

  // 自動で消える
  setTimeout(() => {
    overlay.style.transition = 'opacity 0.5s ease-out';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 500);
  }, 2000);
}

/**
 * メダルシステムのヘルプモーダルを表示する
 */
function showMedalHelpModal() {
  if (document.getElementById('medal-help-modal')) return;

  const overlay = document.createElement('div');
  overlay.id = 'medal-help-modal';
  overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]';

  const modal = document.createElement('div');
  modal.className = 'bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden';

  // ヘッダー
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50 shrink-0';
  header.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="material-symbols-outlined text-amber-400">military_tech</span>
      <h3 class="text-sm font-black text-slate-200 tracking-wide">メダルシステムについて</h3>
    </div>
    <button class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors" id="btn-close-medal-help">
      <span class="material-symbols-outlined text-lg">close</span>
    </button>
  `;

  // コンテンツ
  const content = document.createElement('div');
  content.className = 'p-5 overflow-y-auto flex flex-col gap-5 text-sm text-slate-300 leading-relaxed';
  content.innerHTML = `
    <p>メダルは、特定のモンスター専用の証です。素材とゴールドを消費してメダルを「鋳造」または「ランクアップ」することができます。</p>
    
    <div class="bg-slate-950/40 border border-slate-800/60 p-4 rounded-xl flex flex-col gap-2 shadow-inner">
      <div class="flex items-center gap-2 mb-1">
        <span class="material-symbols-outlined text-emerald-400">trending_up</span>
        <span class="font-black text-slate-200">討伐数 & 報酬ボーナス</span>
      </div>
      <p class="text-xs">メダルを所持していると、対象のモンスターを倒した際に得られる<strong>討伐数</strong>にボーナスが加算され、さらに獲得できる<strong>EXP・JP・GOLD</strong>もランクに応じて倍増します。</p>
      <div class="text-[11px] text-amber-300 bg-amber-950/30 p-2 rounded border border-amber-900/50 flex flex-col gap-1">
        <span>例：シルバーメダル（討伐ボーナス+3 / 報酬4.0倍）の場合</span>
        <ul class="list-disc list-inside ml-1">
          <li>1匹倒すだけで <strong>4匹分</strong>（基本1 + ボーナス3）の討伐数がカウント</li>
          <li>そのモンスターから得られる EXP / JP / GOLD が <strong>4.0倍</strong> に増加</li>
        </ul>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="font-black text-slate-200 border-b border-slate-800 pb-1">メダルランクと効果</div>
      <div class="grid grid-cols-2 gap-2 mt-1">
        ${MEDAL_RANKS.map(r => `
          <div class="flex items-center gap-2 bg-slate-800/30 p-2 rounded-lg border border-slate-700/50">
            <img src="${r.image}" class="w-6 h-6 object-contain shrink-0" onerror="this.style.display='none'">
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] font-bold leading-tight" style="color: ${r.color}">${r.name}</span>
              <div class="flex flex-col">
                <span class="text-[9px] text-emerald-400 leading-tight">討伐数 +${r.killBonus}</span>
                <span class="text-[9px] text-yellow-400 leading-tight">報酬 ${r.rewardMultiplier.toFixed(1)}倍</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  modal.appendChild(header);
  modal.appendChild(content);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeModal = () => {
    overlay.style.animation = 'fade-out 0.2s ease-out forwards';
    setTimeout(() => overlay.remove(), 200);
  };

  header.querySelector('#btn-close-medal-help').onclick = closeModal;
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };
}
