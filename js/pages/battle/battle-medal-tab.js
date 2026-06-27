/**
 * battle-medal-tab.js
 * 戦闘画面の Medal タブ描画ロジック
 * 対象モンスターのメダル情報表示 + 鋳造/ランクアップ機能
 */

import { GameDB } from '../../data/database.js';
import { MATERIALS } from '../../definitions/materials.js';
import { MEDAL_RANKS, getMedalImageFilter } from '../../definitions/medal-definitions.js';
import { formatNumber } from '../../utils/format.js';

/**
 * Medal タブを描画する
 * @param {HTMLElement} tabContent - タブコンテンツコンテナ
 * @param {object} targetEntity - 対象モンスターエンティティ
 * @param {object} playerMedals - プレイヤーメダルマップ
 * @param {number} currentGold - 現在のゴールド
 * @param {Function} onMedalUpdated - メダル更新時コールバック (updatedMedals, updatedGold) => void
 */
export async function renderBattleMedalTab(tabContent, targetEntity, playerMedals, currentGold, onMedalUpdated) {
  if (!targetEntity || !targetEntity.id) {
    tabContent.innerHTML = '<div class="text-xs text-slate-500 flex items-center justify-center h-full">対象が選択されていません</div>';
    return;
  }

  const container = document.createElement('div');
  container.className = 'w-full flex flex-col gap-1.5 p-1 text-slate-200';

  const currentRankIndex = playerMedals[targetEntity.id] !== undefined ? playerMedals[targetEntity.id] : -1;
  const nextRankIndex = currentRankIndex + 1;
  const isMaxRank = nextRankIndex >= MEDAL_RANKS.length;
  const currentRank = currentRankIndex >= 0 ? MEDAL_RANKS[currentRankIndex] : null;
  const nextRank = !isMaxRank ? MEDAL_RANKS[nextRankIndex] : null;

  // --- メダルビジュアル + モンスター情報 ---
  const topPanel = document.createElement('div');
  topPanel.className = 'flex items-center gap-3 bg-slate-900/60 border border-slate-700/60 rounded-xl p-2 shadow-inner shrink-0';

  // メダルビジュアル
  const medalVisual = document.createElement('div');
  medalVisual.className = 'relative w-14 h-14 shrink-0 flex items-center justify-center';

  if (currentRank) {
    const filter = getMedalImageFilter(currentRank.id);

    let particlesHtml = '';
    if (currentRank.id === 'diamond') {
      particlesHtml = `
        <div class="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
          <div class="absolute w-1 h-1 bg-cyan-300 rounded-full animate-pulse" style="top: 20%; left: 30%; animation-delay: 0s; box-shadow: 0 0 4px 1px rgba(103,232,249,0.6)"></div>
          <div class="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse" style="top: 60%; left: 70%; animation-delay: 0.3s; box-shadow: 0 0 3px 1px rgba(255,255,255,0.6)"></div>
          <div class="absolute w-1 h-1 bg-cyan-200 rounded-full animate-pulse" style="top: 40%; left: 55%; animation-delay: 0.7s; box-shadow: 0 0 4px 1px rgba(165,243,252,0.6)"></div>
        </div>
      `;
    }

    let saintGlow = '';
    if (currentRank.id === 'saint') {
      saintGlow = `<div class="absolute inset-0 rounded-full bg-yellow-100/20 blur-md animate-pulse pointer-events-none"></div>`;
    }

    medalVisual.innerHTML = `
      ${saintGlow}
      <div class="absolute inset-0 flex items-center justify-center p-[22%]">
        <img src="${targetEntity.image}" class="w-full h-full object-contain" style="filter: ${filter}" onerror="this.style.display='none'">
      </div>
      <img src="${currentRank.image}" class="absolute inset-0 w-full h-full object-contain z-10 drop-shadow-lg pointer-events-none">
      ${particlesHtml}
    `;
  } else {
    medalVisual.innerHTML = `
      <div class="w-12 h-12 rounded-full bg-slate-800/80 border-2 border-dashed border-slate-600/50 flex items-center justify-center">
        <img src="${targetEntity.image}" class="w-7 h-7 object-contain opacity-30" onerror="this.style.display='none'">
      </div>
    `;
  }

  // モンスター名 + ランクバッジ
  const infoSection = document.createElement('div');
  infoSection.className = 'flex flex-col flex-1 min-w-0 gap-1';

  let rankBadge = '';
  if (currentRank) {
    rankBadge = `
      <div class="flex items-center gap-1.5">
        <span class="text-[10px] font-black px-1.5 py-0.5 rounded" style="background: ${currentRank.color}20; color: ${currentRank.color}; border: 1px solid ${currentRank.color}40">${currentRank.name}</span>
        <span class="text-[9px] text-emerald-400 font-bold">+${currentRank.killBonus}体/討伐</span>
      </div>
    `;
  } else {
    rankBadge = `<span class="text-[10px] text-slate-500 font-bold">メダル未所持</span>`;
  }

  infoSection.innerHTML = `
    <div class="font-black text-slate-100 text-[13px] tracking-wide truncate">${targetEntity.name}</div>
    ${rankBadge}
  `;

  topPanel.appendChild(medalVisual);
  topPanel.appendChild(infoSection);
  container.appendChild(topPanel);

  // --- 鋳造/ランクアップセクション ---
  if (!isMaxRank && nextRank) {
    const craftPanel = document.createElement('div');
    craftPanel.className = 'bg-slate-900/60 border border-slate-700/60 rounded-xl p-2 shadow-inner flex flex-col gap-2';

    const actionLabel = currentRank ? 'ランクアップ' : '鋳造';
    const goldCost = (targetEntity.rewards?.gold || 0) * nextRank.goldMultiplier;
    const materialDrops = targetEntity.drops || [];

    // 素材チェック
    let canCraft = true;
    const inventoryMap = {};
    const allInv = await GameDB.getAllInventory();
    (allInv || []).forEach(item => { inventoryMap[item.id] = item.quantity || 0; });

    const materialRequirements = materialDrops.map(drop => {
      const mat = MATERIALS.find(m => m.id === drop.itemId);
      const owned = inventoryMap[drop.itemId] || 0;
      const required = nextRank.materialQty;
      const sufficient = owned >= required;
      if (!sufficient) canCraft = false;
      return { mat, itemId: drop.itemId, owned, required, sufficient };
    });

    if (currentGold < goldCost) canCraft = false;

    // ヘッダー
    craftPanel.innerHTML = `
      <div class="flex items-center gap-1.5 border-b border-slate-700/50 pb-1">
        <span class="material-symbols-outlined text-amber-400 text-[14px]" style="font-variation-settings: 'FILL' 1">${currentRank ? 'upgrade' : 'auto_awesome'}</span>
        <span class="font-bold text-[12px] text-slate-300">${actionLabel}: <span style="color: ${nextRank.color}" class="font-black">${nextRank.name}</span></span>
      </div>
    `;

    // 素材グリッド
    const materialsGrid = document.createElement('div');
    materialsGrid.className = 'grid grid-cols-2 gap-1.5';

    materialRequirements.forEach(({ mat, owned, required, sufficient }) => {
      const row = document.createElement('div');
      row.className = `flex items-center justify-between p-1.5 rounded-lg border transition-colors ${
        sufficient ? 'bg-slate-950/40 border-slate-800/50' : 'bg-red-950/20 border-red-800/30'
      }`;

      const matName = mat ? mat.name : '不明な素材';
      const matImage = mat && mat.image
        ? `<img src="${mat.image}" class="w-5 h-5 object-contain shrink-0 drop-shadow-sm">`
        : `<span class="material-symbols-outlined text-slate-500 text-[14px] shrink-0">category</span>`;

      row.innerHTML = `
        <div class="flex items-center gap-1 min-w-0 flex-1 pr-1">
          <div class="w-6 h-6 rounded bg-slate-900 flex items-center justify-center border border-slate-800 shrink-0">${matImage}</div>
          <span class="text-[9px] font-bold text-slate-300 truncate leading-tight">${matName}</span>
        </div>
        <div class="flex items-center gap-0.5 shrink-0">
          <span class="text-[11px] font-black ${sufficient ? 'text-emerald-400' : 'text-red-400'}">${formatNumber(owned)}</span>
          <span class="text-gray-500 text-[9px]">/</span>
          <span class="text-[11px] font-bold text-slate-400">${formatNumber(required)}</span>
        </div>
      `;
      materialsGrid.appendChild(row);
    });

    // ゴールドコスト
    const goldSufficient = currentGold >= goldCost;
    const goldRow = document.createElement('div');
    goldRow.className = `flex items-center justify-between p-1.5 rounded-lg border transition-colors ${
      goldSufficient ? 'bg-slate-950/40 border-slate-800/50' : 'bg-red-950/20 border-red-800/30'
    }`;
    goldRow.innerHTML = `
      <div class="flex items-center gap-1 min-w-0 flex-1 pr-1">
        <div class="w-6 h-6 rounded bg-slate-900 flex items-center justify-center border border-slate-800 shrink-0">
          <span class="material-symbols-outlined text-amber-400 text-[14px]" style="font-variation-settings: 'FILL' 1">paid</span>
        </div>
        <span class="text-[9px] font-bold text-slate-300 truncate leading-tight">ゴールド</span>
      </div>
      <div class="flex items-center gap-0.5 shrink-0">
        <span class="text-[11px] font-black ${goldSufficient ? 'text-emerald-400' : 'text-red-400'}">${formatNumber(currentGold)}</span>
        <span class="text-gray-500 text-[9px]">/</span>
        <span class="text-[11px] font-bold text-slate-400">${formatNumber(goldCost)}</span>
      </div>
    `;
    materialsGrid.appendChild(goldRow);
    craftPanel.appendChild(materialsGrid);

    // 鋳造/ランクアップボタン
    const craftBtn = document.createElement('button');
    craftBtn.className = `
      w-full py-2 rounded-lg text-[11px] font-black tracking-wide transition-all duration-200
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
        craftBtn.disabled = true;
        craftBtn.className = 'w-full py-2 rounded-lg text-[11px] font-black tracking-wide bg-slate-800/60 text-slate-500 border border-slate-700/40 cursor-not-allowed';

        // 素材消費
        for (const drop of materialDrops) {
          const invItem = await GameDB.getInventoryItem(drop.itemId);
          if (invItem) {
            invItem.quantity -= nextRank.materialQty;
            if (invItem.quantity <= 0) {
              await GameDB.deleteInventoryItem(invItem.id);
            } else {
              await GameDB.putInventoryItem(invItem);
            }
          }
        }

        // ゴールド消費
        let updatedGold = currentGold - goldCost;
        await GameDB.setGameState('gold', updatedGold);

        // メダルランク保存
        playerMedals[targetEntity.id] = nextRankIndex;
        await GameDB.setGameState('player_medals', playerMedals);

        // ヘッダーのゴールド表示更新
        const goldDisplay = document.getElementById('header-gold-display');
        if (goldDisplay) goldDisplay.textContent = ` Gold : ${formatNumber(updatedGold)} `;

        // 成功演出
        showMedalCraftAnimation(nextRank, targetEntity);

        // コールバック
        if (onMedalUpdated) {
          onMedalUpdated(playerMedals, updatedGold);
        }

        // 再描画
        setTimeout(() => {
          renderBattleMedalTab(tabContent, targetEntity, playerMedals, updatedGold, onMedalUpdated);
        }, 500);
      };
    }

    craftPanel.appendChild(craftBtn);
    container.appendChild(craftPanel);
  } else if (isMaxRank) {
    // 最高ランク到達
    const maxSection = document.createElement('div');
    maxSection.className = 'bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 shadow-inner flex flex-col items-center justify-center gap-2 text-center';
    maxSection.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-lg text-amber-400 animate-pulse" style="font-variation-settings: 'FILL' 1">stars</span>
        <span class="text-sm font-black text-amber-300 tracking-wide">最高ランク到達</span>
        <span class="material-symbols-outlined text-lg text-amber-400 animate-pulse" style="font-variation-settings: 'FILL' 1">stars</span>
      </div>
      <span class="text-[10px] text-slate-400 font-bold">このモンスターのメダルは最高ランクに到達しています</span>
    `;
    container.appendChild(maxSection);
  }

  // --- メダルランク一覧 ---
  const rankListPanel = document.createElement('div');
  rankListPanel.className = 'bg-slate-900/60 border border-slate-700/60 rounded-xl p-2 shadow-inner';
  rankListPanel.innerHTML = `
    <div class="flex items-center gap-1.5 border-b border-slate-700/50 pb-1 mb-1.5">
      <span class="material-symbols-outlined text-amber-400 text-[14px]" style="font-variation-settings: 'FILL' 1">format_list_bulleted</span>
      <span class="font-bold text-[11px] text-slate-300">メダルランク</span>
    </div>
    <div class="grid grid-cols-4 gap-1">
      ${MEDAL_RANKS.map((r, idx) => {
        const isCurrentRank = idx === currentRankIndex;
        return `
          <div class="flex flex-col items-center gap-0.5 p-1 rounded border ${
            isCurrentRank ? 'bg-amber-950/40 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]' : 'bg-slate-800/30 border-slate-700/50'
          }">
            <img src="${r.image}" class="w-6 h-6 object-contain ${idx > currentRankIndex ? 'opacity-30 grayscale' : ''}" onerror="this.style.display='none'">
            <span class="text-[7px] font-bold leading-tight text-center" style="color: ${r.color}">${r.name.replace('メダル', '')}</span>
            <span class="text-[7px] text-emerald-400 font-bold">+${r.killBonus}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
  container.appendChild(rankListPanel);

  tabContent.innerHTML = '';
  tabContent.appendChild(container);
}

/**
 * メダル鋳造/ランクアップ成功時のアニメーション
 */
function showMedalCraftAnimation(rank, monster) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none';
  overlay.style.animation = 'fade-in 0.3s ease-out';

  const bg = document.createElement('div');
  bg.className = 'absolute inset-0';
  bg.style.background = `radial-gradient(circle at center, ${rank.color}20 0%, transparent 70%)`;
  overlay.appendChild(bg);

  const medalContainer = document.createElement('div');
  medalContainer.className = 'relative flex flex-col items-center gap-3';
  medalContainer.style.animation = 'slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';

  const filter = getMedalImageFilter(rank.id);

  medalContainer.innerHTML = `
    <div class="relative w-24 h-24">
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

  setTimeout(() => {
    overlay.style.transition = 'opacity 0.5s ease-out';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 500);
  }, 2000);
}
