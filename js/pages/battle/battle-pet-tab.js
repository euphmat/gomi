/**
 * battle-pet-tab.js
 * 戦闘画面の Pet タブ描画ロジック
 * 対象モンスターの捕獲情報表示 + 仲間モンスターへの餌やり機能
 */

import { GameDB } from '../../data/database.js';
import { MATERIALS } from '../../definitions/materials.js';
import { MONSTERS } from '../../definitions/monsters.js';
import { getRanchLevelInfo } from '../../data/stat-calculator.js';
import { formatNumber } from '../../utils/format.js';

const MATERIALS_MAP = new Map(MATERIALS.map(m => [m.id, m]));

/**
 * Pet タブの HTML を生成して tabContent に描画する
 * @param {HTMLElement} tabContent - タブコンテンツコンテナ
 * @param {object} targetEntity - 対象モンスターエンティティ
 * @param {object} monsterKills - 討伐数マップ
 * @param {object} ranchData - 牧場データ
 * @param {string} currentDungeonId - 現在のダンジョンID
 * @param {Function} onRanchDataUpdated - ranch_data 更新時コールバック
 */
export async function renderBattlePetTab(tabContent, targetEntity, monsterKills, ranchData, currentDungeonId, onRanchDataUpdated) {
  if (!targetEntity || !targetEntity.id) {
    tabContent.innerHTML = '<div class="text-xs text-slate-500 flex items-center justify-center h-full">対象が選択されていません</div>';
    return;
  }

  // Preserve slider values before re-rendering
  const preservedValues = {};
  tabContent.querySelectorAll('.quantity-slider').forEach(slider => {
    preservedValues[slider.dataset.itemId] = slider.value;
  });

  const kills = monsterKills[targetEntity.id] || 0;

  // --- 捕獲状態判定 ---
  let isNormalCaptured = false;
  let isLegendaryCaptured = false;
  let capturedDungeonId = null;
  let capturedLegDungeonId = null;
  for (const dId of Object.keys(ranchData)) {
    if (ranchData[dId] && ranchData[dId][targetEntity.id]) {
      isNormalCaptured = true;
      capturedDungeonId = dId;
    }
    if (ranchData[dId] && ranchData[dId][`${targetEntity.id}_legendary`]) {
      isLegendaryCaptured = true;
      capturedLegDungeonId = dId;
    }
  }

  // --- 捕獲率計算 ---
  const captureRate = Math.min(1.0, 0.0001 + Math.floor(kills / 100) * 0.0001);
  const legAppRate = Math.min(1.0, 0.00001 + Math.floor(kills / 100) * 0.00001);
  const legCapRate = Math.min(1.0, 0.0001 + Math.floor(kills / 100) * 0.0001);

  const getCapBadge = (captured, rate) => captured
    ? `<span class="text-pink-400 text-[9px] font-black shrink-0 ml-1">捕獲済</span>`
    : `<span class="text-emerald-400 text-[9px] font-black shrink-0 ml-1">${(rate * 100).toFixed(3).replace(/\.?0+$/, '')}%</span>`;

  // --- インベントリの一括取得 (ちらつき防止) ---
  const allInv = await GameDB.getAllInventory();
  const inventoryMap = {};
  if (allInv) {
    allInv.forEach(item => inventoryMap[item.id] = item.quantity);
  }

  // --- コンテナ作成 ---
  const container = document.createElement('div');
  container.className = 'w-full flex flex-col gap-1.5 p-1 text-slate-200';

  // --- ヘッダー (捕獲情報統合) ---
  const headerHtml = `
    <div class="flex items-center gap-2 bg-slate-900/60 border border-slate-700/60 rounded-xl p-1.5 shadow-inner shrink-0">
      <div class="w-10 h-10 rounded-lg bg-slate-950 border border-slate-600 shadow-md relative flex items-center justify-center p-1 shrink-0">
        ${targetEntity.isLegendary ? '<div class="absolute inset-0 bg-yellow-500/20 animate-pulse pointer-events-none rounded-lg"></div>' : ''}
        <img src="${targetEntity.image}" class="w-full h-full object-contain relative z-10 ${targetEntity.isLegendary ? 'animate-rainbow' : ''}" onerror="this.style.display='none'">
      </div>
      <div class="flex flex-col min-w-0 flex-1">
        <div class="flex items-center justify-between border-b border-slate-700/50 pb-0.5 mb-0.5">
          <span class="font-black text-[13px] text-slate-100 drop-shadow truncate">${targetEntity.name}</span>
          <span class="text-[9px] text-slate-400 font-bold shrink-0">討伐: <span class="text-red-400 font-black">${formatNumber(kills)}</span></span>
        </div>
        <div class="flex items-center gap-1 overflow-hidden">
          <div class="flex items-center bg-slate-950/40 px-1 py-0.5 rounded border border-slate-700/50 min-w-0">
            <span class="material-symbols-outlined text-[10px] text-pink-400 shrink-0" style="font-variation-settings: 'FILL' 1;">pets</span>
            ${getCapBadge(isNormalCaptured, captureRate)}
          </div>
          <div class="flex items-center bg-slate-950/40 px-1 py-0.5 rounded border border-slate-700/50 min-w-0">
            <span class="material-symbols-outlined text-[10px] text-yellow-400 shrink-0" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
            <span class="text-[9px] text-yellow-400 font-black shrink-0 ml-1">${(legAppRate * 100).toFixed(3).replace(/\.?0+$/, '')}%</span>
          </div>
          <div class="flex items-center bg-slate-950/40 px-1 py-0.5 rounded border border-slate-700/50 min-w-0">
            <span class="material-symbols-outlined text-[10px] text-pink-400 shrink-0" style="font-variation-settings: 'FILL' 1;">pets</span>
            ${getCapBadge(isLegendaryCaptured, legCapRate)}
          </div>
        </div>
      </div>
    </div>
  `;
  container.innerHTML = headerHtml;

  // --- 餌やりセクション ---
  if (isNormalCaptured || isLegendaryCaptured) {
    const variants = [];
    if (isNormalCaptured) variants.push({ key: targetEntity.id, dungeonId: capturedDungeonId, isLeg: false, label: targetEntity.name });
    if (isLegendaryCaptured) variants.push({ key: `${targetEntity.id}_legendary`, dungeonId: capturedLegDungeonId, isLeg: true, label: `伝説の${targetEntity.name}` });

    for (const variant of variants) {
      const feedSection = document.createElement('div');
      feedSection.className = 'bg-slate-900/60 border border-slate-700/60 rounded-xl p-2 shadow-inner';
      container.appendChild(feedSection);
      renderFeedSectionSync(feedSection, variant, targetEntity, ranchData, inventoryMap, preservedValues, onRanchDataUpdated, tabContent);
    }
  } else {
    const noCapDiv = document.createElement('div');
    noCapDiv.className = 'bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 shadow-inner flex flex-col items-center justify-center gap-2 text-center';
    noCapDiv.innerHTML = `
      <span class="material-symbols-outlined text-3xl text-slate-600">heart_broken</span>
      <span class="text-[11px] text-slate-400 font-bold">まだ仲間になっていません</span>
      <span class="text-[10px] text-slate-500">ダンジョンで討伐を繰り返すと仲間になることがあります</span>
    `;
    container.appendChild(noCapDiv);
  }

  // 同期的に DOM を置換 (ちらつき防止)
  tabContent.innerHTML = '';
  tabContent.appendChild(container);
}

/**
 * 餌やりセクションを描画 (同期版)
 */
function renderFeedSectionSync(sectionEl, variant, targetEntity, ranchData, inventoryMap, preservedValues, onRanchDataUpdated, tabContent) {
  const monsterData = ranchData[variant.dungeonId][variant.key];
  if (!monsterData) return;

  const monsterDef = MONSTERS.find(m => m.id === targetEntity.id);
  if (!monsterDef) return;

  const validDrops = monsterDef.drops || [];
  const info = getRanchLevelInfo(monsterData.fedMaterials || 0, variant.isLeg);
  const pct = (info.currentLevelFed / info.nextLevelRequired) * 100;

  // ヘッダー + レベル + EXPバー
  sectionEl.innerHTML = `
    <div class="flex items-center justify-between border-b border-slate-700/50 pb-1 mb-2">
      <div class="flex items-center gap-1.5">
        <span class="material-symbols-outlined text-pink-400 text-[14px]" style="font-variation-settings: 'FILL' 1">restaurant</span>
        <span class="font-bold text-[12px] text-slate-300">餌やり</span>
        ${variant.isLeg ? '<span class="text-[9px] font-black text-yellow-300 bg-yellow-900/50 px-1.5 py-0.5 rounded border border-yellow-700/50">伝説</span>' : ''}
      </div>
      <span class="text-[10px] text-pink-300 font-black bg-pink-900/40 px-2 py-0.5 rounded border border-pink-500/40">Lv.${info.level}</span>
    </div>
    <div class="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden relative shadow-inner border border-slate-700/50 flex items-center justify-center mb-2">
      <div class="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 transition-all duration-500 ease-out" style="width: ${pct}%">
        <div class="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
      </div>
      <span class="relative z-10 text-[8px] text-white font-black tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">${info.currentLevelFed} / ${info.nextLevelRequired}</span>
    </div>
  `;

  // 素材リスト
  const itemsContainer = document.createElement('div');
  itemsContainer.className = 'flex flex-col gap-1.5';

  if (validDrops.length === 0) {
    itemsContainer.innerHTML = '<p class="text-[10px] text-slate-500 text-center py-2">与えられる素材がありません。</p>';
  } else {
    for (let i = 0; i < validDrops.length; i++) {
      const drop = validDrops[i];
      const expMultiplier = Math.pow(2, i);
      const mat = MATERIALS_MAP.get(drop.itemId);
      if (!mat) continue;

      const quantity = inventoryMap[drop.itemId] || 0;
      const maxFeed = quantity;
      
      // 復元値があればそれを使う、なければ最大値または1
      let initialVal = preservedValues[drop.itemId] !== undefined ? parseInt(preservedValues[drop.itemId]) : (maxFeed > 0 ? 1 : 1);
      if (initialVal > maxFeed) initialVal = maxFeed;
      if (initialVal < 1) initialVal = maxFeed > 0 ? 1 : 1;

      const itemRow = document.createElement('div');
      itemRow.className = 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-2 transition-colors flex flex-col gap-1.5';

      itemRow.innerHTML = `
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <div class="w-8 h-8 bg-slate-900/80 rounded-lg border border-slate-700 flex items-center justify-center p-1 shrink-0">
              <img src="${mat.image}" class="w-full h-full object-contain drop-shadow-sm">
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-[10px] font-black text-slate-100 truncate flex items-center gap-1.5">
                ${mat.name}
                <span class="text-[8px] bg-pink-900/50 text-pink-300 px-1 py-0.5 rounded border border-pink-700/50">${expMultiplier} EXP</span>
              </div>
              <div class="text-[9px] font-bold text-slate-400 mt-0.5">所持: <span class="${quantity > 0 ? 'text-green-400 font-black' : 'text-slate-500'}">${quantity}</span></div>
            </div>
          </div>
          <button class="px-3 h-7 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 rounded text-[10px] font-black text-white transition-all active:scale-95 btn-feed shadow-[0_0_8px_rgba(236,72,153,0.3)] shrink-0" ${maxFeed === 0 ? 'disabled' : ''}>
            与える
          </button>
        </div>
        <!-- スライダーエリア -->
        <div class="flex items-center gap-2 pl-[40px]">
          <input type="range" min="1" max="${maxFeed || 1}" value="${initialVal}" ${maxFeed === 0 ? 'disabled' : ''} class="flex-1 quantity-slider accent-pink-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer" data-item-id="${drop.itemId}">
          <div class="w-10 h-5 bg-slate-900 border border-slate-700 rounded flex items-center justify-center shrink-0">
            <span class="text-[10px] font-black text-pink-300 quantity-display">${initialVal}</span>
          </div>
        </div>
      `;

      const slider = itemRow.querySelector('.quantity-slider');
      const display = itemRow.querySelector('.quantity-display');
      const btnFeed = itemRow.querySelector('.btn-feed');

      if (maxFeed > 0 && slider) {
        slider.oninput = (e) => {
          display.textContent = e.target.value;
        };
      }

      if (maxFeed > 0 && btnFeed) {
        btnFeed.onclick = async () => {
          const amount = parseInt(slider.value) || 0;
          if (amount <= 0 || amount > maxFeed) return;

          btnFeed.disabled = true;

          // アイテム消費
          const currentInv = await GameDB.getInventoryItem(drop.itemId);
          if (currentInv) {
            currentInv.quantity -= amount;
            if (currentInv.quantity <= 0) {
              await GameDB.deleteInventoryItem(currentInv.id);
            } else {
              await GameDB.putInventoryItem(currentInv);
            }
          }

          // EXP 加算
          const expGain = amount * expMultiplier;
          monsterData.fedMaterials = (monsterData.fedMaterials || 0) + expGain;

          // ranch_data 保存
          let freshRanch = await GameDB.getGameState('ranch_data');
          freshRanch[variant.dungeonId][variant.key] = monsterData;
          await GameDB.setGameState('ranch_data', freshRanch);

          // コールバックで BattleManager のデータを更新
          if (onRanchDataUpdated) {
            onRanchDataUpdated(freshRanch);
          }

          // レベルアップチェック＆通知
          const newInfo = getRanchLevelInfo(monsterData.fedMaterials, variant.isLeg);
          if (newInfo.level > info.level) {
            showBattleFeedNotification(`${variant.label} が Lv.${newInfo.level} になりました！`, 'success');
          } else {
            showBattleFeedNotification(`${variant.label} に ${amount} 個の ${mat.name} を与えました (+${expGain} EXP)`, 'info');
          }

          // 再描画 (親タブ全体を更新)
          const latestInv = await GameDB.getAllInventory();
          const latestInvMap = {};
          if (latestInv) latestInv.forEach(item => latestInvMap[item.id] = item.quantity);
          
          // Slider value reset to 1 after feeding to avoid confusion
          preservedValues[drop.itemId] = 1;
          renderBattlePetTab(tabContent, targetEntity, monsterKills, freshRanch, variant.dungeonId, onRanchDataUpdated);
        };
      }

      itemsContainer.appendChild(itemRow);
    }
  }

  sectionEl.appendChild(itemsContainer);
}

/**
 * 戦闘中の餌やり通知
 */
function showBattleFeedNotification(text, type = 'info') {
  const el = document.createElement('div');
  el.className = `fixed top-20 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-[11px] font-bold shadow-lg z-[9999] text-white flex items-center gap-2 ${
    type === 'success' ? 'bg-emerald-600 shadow-[0_0_15px_rgba(5,150,105,0.5)]' :
    'bg-pink-600 shadow-[0_0_15px_rgba(236,72,153,0.5)]'
  }`;
  el.style.animation = 'fade-in 0.3s ease-out';
  el.innerHTML = `
    <span class="material-symbols-outlined text-[16px]">
      ${type === 'success' ? 'celebration' : 'restaurant'}
    </span>
    ${text}
  `;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%, -10px)';
    el.style.transition = 'all 0.3s';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}
