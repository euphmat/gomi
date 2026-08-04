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
import { getTreasureEffect, loadTreasureLevels } from '../../data/treasure-manager.js';

const MATERIALS_MAP = new Map(MATERIALS.map(m => [m.id, m]));

// --- モジュールレベルでスライダーの値を保持 (手動で変更した場合のみ) ---
const globalSliderValues = {};
const globalSliderManualFlags = {};
let isLegendaryToggleActive = false;
let currentTargetEntityId = null;

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
  await loadTreasureLevels();
  if (!targetEntity || !targetEntity.id) {
    tabContent.innerHTML = '<div class="text-xs text-slate-500 flex items-center justify-center h-full">対象が選択されていません</div>';
    return;
  }

  // Preserve slider values before re-rendering (only if manually adjusted)
  tabContent.querySelectorAll('.quantity-slider').forEach(slider => {
    if (globalSliderManualFlags[slider.dataset.itemId]) {
      globalSliderValues[slider.dataset.itemId] = slider.value;
    }
  });

  if (targetEntity.id !== currentTargetEntityId) {
    currentTargetEntityId = targetEntity.id;
    isLegendaryToggleActive = !!targetEntity.isLegendary;
    // リクエスト対応: モンスターを切り替えたらスライダーの値をリセットしてMAXに戻す
    Object.keys(globalSliderValues).forEach(k => delete globalSliderValues[k]);
    Object.keys(globalSliderManualFlags).forEach(k => delete globalSliderManualFlags[k]);
  }

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
  const captureRate = Math.min(1.0, (0.0001 + Math.floor(kills / 100) * 0.0001) * getTreasureEffect('captureMultiplier'));
  const legAppRate = Math.min(1.0, 0.00001 + Math.floor(kills / 100) * 0.00001);
  const legCapRate = Math.min(1.0, (0.0001 + Math.floor(kills / 100) * 0.0001)
    * getTreasureEffect('captureMultiplier') * getTreasureEffect('legendaryCaptureMultiplier'));

  const getCapBadge = (captured, rate) => captured
    ? `<span class="text-pink-400 text-[9px] font-black shrink-0">捕獲済</span>`
    : `<span class="text-emerald-400 text-[9px] font-black shrink-0">${(rate * 100).toFixed(3).replace(/\.?0+$/, '')}%</span>`;

  // --- インベントリの一括取得 (ちらつき防止) ---
  const allInv = await GameDB.getAllInventory();
  const inventoryMap = {};
  if (allInv) {
    allInv.forEach(item => inventoryMap[item.id] = item.quantity);
  }

  // --- コンテナ作成 ---
  const container = document.createElement('div');
  container.className = 'w-full flex flex-col gap-1.5 p-1 text-slate-200';

  // (スタイルは index.html のグローバルCSSに移動しました)

  let currentLevel = null;
  if (isLegendaryToggleActive && isLegendaryCaptured) {
    const mData = ranchData[capturedLegDungeonId]?.[`${targetEntity.id}_legendary`];
    if (mData) {
      const info = getRanchLevelInfo(mData.fedMaterials || 0, true);
      currentLevel = info.level;
    }
  } else if (!isLegendaryToggleActive && isNormalCaptured) {
    const mData = ranchData[capturedDungeonId]?.[targetEntity.id];
    if (mData) {
      const info = getRanchLevelInfo(mData.fedMaterials || 0, false);
      currentLevel = info.level;
    }
  }

  // --- ヘッダー (捕獲情報統合・3分割グリッド化) ---
  const isDisplayLegendary = targetEntity.isLegendary || isLegendaryToggleActive;
  const headerHtml = `
    <div class="flex items-center gap-2 bg-slate-900/60 border border-slate-700/60 rounded-xl p-1.5 shadow-inner shrink-0">
      <div class="w-10 h-10 rounded-lg bg-slate-950 border border-slate-600 shadow-md relative flex items-center justify-center p-1 shrink-0">
        ${isDisplayLegendary ? '<div class="absolute inset-0 bg-yellow-500/20 animate-pulse pointer-events-none rounded-lg"></div>' : ''}
        <img src="${targetEntity.image}" class="w-full h-full object-contain relative z-10 ${isDisplayLegendary ? 'animate-rainbow' : ''}" onerror="this.style.display='none'">
      </div>
      <div class="flex flex-col min-w-0 flex-1">
        <div class="flex items-center justify-between border-b border-slate-700/50 pb-0.5 mb-1">
          <div class="flex items-center gap-1.5 min-w-0">
            ${currentLevel !== null ? `<span class="text-[10px] text-pink-300 font-black bg-pink-900/40 px-2 py-0.5 rounded border border-pink-500/40 shrink-0">Lv.${currentLevel}</span>` : ''}
            <span class="font-black text-[13px] text-slate-100 drop-shadow truncate">${targetEntity.name}</span>
            ${isLegendaryCaptured ? `
              <label class="relative inline-flex min-h-7 items-center cursor-pointer shrink-0 px-1">
                <input type="checkbox" class="sr-only peer" id="legendary-toggle" ${isLegendaryToggleActive ? 'checked' : ''}>
                <div class="w-6 h-3 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-slate-300 peer-checked:after:bg-yellow-400 after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-yellow-600/50 border border-slate-600 peer-checked:border-yellow-500/50 shadow-inner"></div>
                <span class="ml-1 text-[8px] font-black ${isLegendaryToggleActive ? 'text-yellow-400 drop-shadow-[0_0_2px_rgba(250,204,21,0.5)]' : 'text-slate-500'}">伝説</span>
              </label>
            ` : ''}
          </div>
          <span class="text-[9px] text-slate-400 font-bold shrink-0 ml-1">討伐数: <span class="text-red-400 font-black">${formatNumber(kills)}</span></span>
        </div>
        <div class="grid grid-cols-3 gap-0.5 w-full">
          <!-- 捕獲率 -->
          <div class="flex items-center justify-center gap-0.5 bg-slate-950/45 border border-slate-800/80 rounded py-1 px-0.5 min-w-0">
            <span class="text-[8px] text-slate-400 font-black shrink-0">捕獲率:</span>
            <div class="flex items-center gap-0.5">
              <span class="material-symbols-outlined text-pink-400 shrink-0" style="font-size: 8px; font-variation-settings: 'FILL' 1;">pets</span>
              ${getCapBadge(isNormalCaptured, captureRate)}
            </div>
          </div>
          <!-- 伝説出現 -->
          <div class="flex items-center justify-center gap-0.5 bg-slate-950/45 border border-slate-800/80 rounded py-1 px-0.5 min-w-0">
            <span class="text-[8px] text-slate-400 font-black shrink-0">伝説出現:</span>
            <div class="flex items-center gap-0.5">
              <span class="material-symbols-outlined text-yellow-400 shrink-0" style="font-size: 8px; font-variation-settings: 'FILL' 1;">auto_awesome</span>
              <span class="text-[9px] text-yellow-400 font-black shrink-0">${(legAppRate * 100).toFixed(3).replace(/\.?0+$/, '')}%</span>
            </div>
          </div>
          <!-- 伝説捕獲 -->
          <div class="flex items-center justify-center gap-0.5 bg-slate-950/45 border border-slate-800/80 rounded py-1 px-0.5 min-w-0">
            <span class="text-[8px] text-slate-400 font-black shrink-0">伝説捕獲:</span>
            <div class="flex items-center gap-0.5">
              <span class="material-symbols-outlined text-pink-400 shrink-0" style="font-size: 8px; font-variation-settings: 'FILL' 1;">pets</span>
              ${getCapBadge(isLegendaryCaptured, legCapRate)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  container.innerHTML = headerHtml;

  const toggleInput = container.querySelector('#legendary-toggle');
  if (toggleInput) {
    toggleInput.addEventListener('change', (e) => {
      isLegendaryToggleActive = e.target.checked;
      renderBattlePetTab(tabContent, targetEntity, monsterKills, ranchData, currentDungeonId, onRanchDataUpdated);
    });
  }

  // --- 餌やりセクション ---
  const variants = [];
  if (isLegendaryToggleActive) {
    if (isLegendaryCaptured) {
      variants.push({ key: `${targetEntity.id}_legendary`, dungeonId: capturedLegDungeonId, isLeg: true, label: `伝説の${targetEntity.name}` });
    }
  } else {
    if (isNormalCaptured) {
      variants.push({ key: targetEntity.id, dungeonId: capturedDungeonId, isLeg: false, label: targetEntity.name });
    }
  }

  if (variants.length > 0) {
    for (const variant of variants) {
      const feedSection = document.createElement('div');
      feedSection.className = 'bg-slate-900/60 border border-slate-700/60 rounded-xl p-2 shadow-inner';
      container.appendChild(feedSection);
      renderFeedSectionSync(feedSection, variant, targetEntity, ranchData, inventoryMap, onRanchDataUpdated, tabContent, monsterKills);
    }
  } else {
    const noCapDiv = document.createElement('div');
    noCapDiv.className = 'bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 shadow-inner flex flex-col items-center justify-center gap-2 text-center';
    noCapDiv.innerHTML = `
      <span class="material-symbols-outlined text-3xl text-slate-600">heart_broken</span>
      <span class="text-[11px] text-slate-400 font-bold">${isLegendaryToggleActive ? '伝説のモンスターは' : ''}まだ仲間になっていません</span>
      <span class="text-[10px] text-slate-500">ダンジョンで討伐を繰り返すと仲間になることがあります</span>
    `;
    container.appendChild(noCapDiv);
  }

  // 同期的に DOM を置換 (ちらつき防止)
  if (tabContent.dataset.renderedTab !== 'pet') return;
  tabContent.innerHTML = '';
  tabContent.appendChild(container);

  // --- リアルタイム反映 (ポーリング) ---
  if (tabContent._petSyncTimer) {
    clearInterval(tabContent._petSyncTimer);
  }
  let syncInProgress = false;
  const petSyncTimer = setInterval(async () => {
    if (!document.body.contains(container)) {
      clearInterval(petSyncTimer);
      if (tabContent._petSyncTimer === petSyncTimer) tabContent._petSyncTimer = null;
      return;
    }
    if (document.hidden) return;
    if (syncInProgress) return;
    syncInProgress = true;

    try {
      const allInvSync = await GameDB.getAllInventory();
      const newInvMap = {};
      if (allInvSync) {
        allInvSync.forEach(item => newInvMap[item.id] = item.quantity);
      }
    
    // update inventoryMap reference for click handlers
    Object.keys(newInvMap).forEach(k => inventoryMap[k] = newInvMap[k]);

    for (const variant of variants) {
      const monsterDef = MONSTERS.find(m => m.id === targetEntity.id);
      if (!monsterDef) continue;
      const validDrops = monsterDef.drops || [];
      
      for (const drop of validDrops) {
        const quantity = newInvMap[drop.itemId] || 0;
        const ownedSpan = container.querySelector(`#battle-pet-mat-owned-${variant.key}-${drop.itemId}`);
        if (ownedSpan && parseInt(ownedSpan.textContent) !== quantity) {
          ownedSpan.textContent = quantity;
          ownedSpan.className = quantity > 0 ? 'text-green-400 font-black' : 'text-slate-500';

          const itemRow = container.querySelector(`#battle-pet-mat-row-${variant.key}-${drop.itemId}`);
          if (itemRow) {
            const slider = itemRow.querySelector('.quantity-slider');
            const input = itemRow.querySelector('.quantity-input');
            const btnFeed = itemRow.querySelector('.btn-feed');
            
            if (slider) slider.max = quantity || 1;
            if (input) input.max = quantity || 1;
            
            if (!globalSliderManualFlags[drop.itemId] && quantity > 0) {
              if (slider) slider.value = quantity;
              if (input) input.value = quantity;
            } else {
              if (slider && parseInt(slider.value) > quantity) slider.value = quantity || 1;
              if (input && parseInt(input.value) > quantity) input.value = quantity || 1;
            }
            
            if (btnFeed) {
              btnFeed.disabled = (quantity === 0);
            }
            const parentFlex = input ? input.closest('.flex.items-center.gap-2.px-1') : null;
            if (parentFlex) {
              if (quantity === 0) {
                parentFlex.classList.add('opacity-50', 'pointer-events-none');
                input.disabled = true;
                if (slider) slider.disabled = true;
              } else {
                parentFlex.classList.remove('opacity-50', 'pointer-events-none');
                input.disabled = false;
                if (slider) slider.disabled = false;
              }
            }
            const sliderProgress = itemRow.querySelector('.slider-progress');
            if (sliderProgress) {
              const currentVal = parseInt(input ? input.value : 1) || 1;
              const maxFeed = quantity || 1;
              const percentage = maxFeed > 1 ? ((currentVal - 1) / (maxFeed - 1)) * 100 : 100;
              sliderProgress.style.width = `${percentage}%`;
            }
          }
        }
      }
    }
    } finally {
      syncInProgress = false;
    }
  }, 500);
  tabContent._petSyncTimer = petSyncTimer;
}

/**
 * 餌やりセクションを描画 (同期版)
 */
function renderFeedSectionSync(sectionEl, variant, targetEntity, ranchData, inventoryMap, onRanchDataUpdated, tabContent, monsterKills) {
  const monsterData = ranchData[variant.dungeonId][variant.key];
  if (!monsterData) return;

  const monsterDef = MONSTERS.find(m => m.id === targetEntity.id);
  if (!monsterDef) return;

  const validDrops = monsterDef.drops || [];
  const info = getRanchLevelInfo(monsterData.fedMaterials || 0, variant.isLeg);
  const pct = (info.currentLevelFed / info.nextLevelRequired) * 100;

  sectionEl.innerHTML = `
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
      
      // 手動で調整された値があればそれを使う、なければ最大値 (MAX規定)
      let initialVal = maxFeed > 0 ? maxFeed : 1;
      if (globalSliderManualFlags[drop.itemId] && globalSliderValues[drop.itemId] !== undefined) {
        initialVal = parseInt(globalSliderValues[drop.itemId]);
      }
      if (initialVal > maxFeed) initialVal = maxFeed;
      if (initialVal < 1) initialVal = maxFeed > 0 ? maxFeed : 1;

      const itemRow = document.createElement('div');
      itemRow.id = `battle-pet-mat-row-${variant.key}-${drop.itemId}`;
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
              <div class="text-[9px] font-bold text-slate-400 mt-0.5">所持: <span id="battle-pet-mat-owned-${variant.key}-${drop.itemId}" class="${quantity > 0 ? 'text-green-400 font-black' : 'text-slate-500'}">${quantity}</span></div>
            </div>
          </div>
          <button class="px-3 h-7 bg-gradient-to-r from-pink-600 to-rose-600 active:from-pink-500 active:to-rose-500 disabled:opacity-50 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 rounded text-[10px] font-black text-white transition-all active:scale-95 btn-feed shadow-[0_0_8px_rgba(236,72,153,0.3)] shrink-0" ${maxFeed === 0 ? 'disabled' : ''}>
            与える
          </button>
        </div>
        <!-- スライダーエリア (牧場画面と統一) -->
        <div class="flex items-center gap-2 px-1 pt-0.5 ${maxFeed === 0 ? 'opacity-50 pointer-events-none' : ''}">
          <span class="text-[9px] font-bold text-slate-400 w-4 text-right shrink-0">1</span>
          <div class="relative flex-1 flex items-center h-4">
            <div class="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-slate-800 rounded-full pointer-events-none shadow-inner border border-slate-700/50"></div>
            <div class="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-gradient-to-r from-pink-600 to-rose-500 rounded-full pointer-events-none slider-progress shadow-[0_0_8px_rgba(244,114,182,0.4)]" style="width: 0%"></div>
            <input type="range" min="1" max="${maxFeed || 1}" value="${initialVal}" ${maxFeed === 0 ? 'disabled' : ''} class="w-full h-full bg-transparent appearance-none cursor-pointer outline-none quantity-slider z-10 m-0 absolute inset-0" data-item-id="${drop.itemId}">
          </div>
          <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[9px] font-black text-slate-400 cursor-pointer active:bg-slate-800 active:text-slate-200 btn-max">MAX</button>
          <div class="bg-slate-900 border border-slate-700 rounded w-10 h-5 flex items-center justify-center shadow-inner shrink-0 relative overflow-hidden">
            <input type="number" min="1" max="${maxFeed || 1}" value="${initialVal}" ${maxFeed === 0 ? 'disabled' : ''} class="w-full h-full bg-transparent text-center text-[10px] font-black text-pink-300 outline-none quantity-input appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none relative z-10">
          </div>
        </div>
      `;

      const input = itemRow.querySelector('.quantity-input');
      const slider = itemRow.querySelector('.quantity-slider');
      const sliderProgress = itemRow.querySelector('.slider-progress');
      const btnMax = itemRow.querySelector('.btn-max');
      const btnFeed = itemRow.querySelector('.btn-feed');

      const updateValue = (val, isManual = false) => {
        const currentMax = parseInt(slider.max) || 1;
        let parsed = parseInt(val) || 1;
        if (parsed < 1) parsed = 1;
        if (parsed > currentMax) parsed = currentMax;
        if (input) input.value = parsed;
        if (slider) slider.value = parsed;
        globalSliderValues[drop.itemId] = parsed;
        if (isManual) {
          globalSliderManualFlags[drop.itemId] = true;
        }
        const percentage = currentMax > 1 ? ((parsed - 1) / (currentMax - 1)) * 100 : 100;
        if (sliderProgress) sliderProgress.style.width = `${percentage}%`;
      };

      // 初期化
      if (maxFeed > 0) {
        updateValue(initialVal, false);
      }

      if (input) input.onchange = () => updateValue(input.value, true);
      if (slider) slider.oninput = () => updateValue(slider.value, true);
      if (btnMax) {
        btnMax.onclick = () => updateValue(parseInt(slider.max) || 1, true);
      }

      if (btnFeed) {
        btnFeed.onclick = async () => {
          const currentInv = await GameDB.getInventoryItem(drop.itemId);
          const actualMax = currentInv ? currentInv.quantity : 0;
          let amount = parseInt(input.value) || 0;
          if (amount <= 0 || amount > actualMax) amount = actualMax;
          if (amount === 0) return;

          btnFeed.disabled = true;

          // アイテム消費
          if (currentInv) {
            currentInv.quantity -= amount;
            if (currentInv.quantity <= 0) {
              await GameDB.deleteInventoryItem(currentInv.id);
            } else {
              await GameDB.putInventoryItem(currentInv);
            }
            inventoryMap[drop.itemId] = Math.max(0, inventoryMap[drop.itemId] - amount);
          }

          // EXP 加算
          const oldExp = monsterData.fedMaterials || 0;
          const oldLevelInfo = getRanchLevelInfo(oldExp, variant.isLeg);
          
          const expGain = Math.floor(amount * expMultiplier * (1 + getTreasureEffect('ranchExpPercent') / 100));
          monsterData.fedMaterials = oldExp + expGain;

          const newInfo = getRanchLevelInfo(monsterData.fedMaterials, variant.isLeg);
          const levelsGained = newInfo.level - oldLevelInfo.level;
          if (levelsGained > 0) {
            window.dispatchEvent(new CustomEvent('quest:monster-feed-level', { detail: { monsterId: variant.key, levelsGained } }));
          }

          // ranch_data 保存
          let freshRanch = await GameDB.getGameState('ranch_data');
          freshRanch[variant.dungeonId][variant.key] = monsterData;
          await GameDB.setGameState('ranch_data', freshRanch);

          // コールバックで BattleManager のデータを更新
          if (onRanchDataUpdated) {
            onRanchDataUpdated(freshRanch);
          }

          // 再描画 (親タブ全体を更新)
          const latestInv = await GameDB.getAllInventory();
          const latestInvMap = {};
          if (latestInv) latestInv.forEach(item => latestInvMap[item.id] = item.quantity);

          // 餌やり後はスライダーを手動設定状態から解除しMAXに戻す
          delete globalSliderManualFlags[drop.itemId];
          delete globalSliderValues[drop.itemId];

          await renderBattlePetTab(tabContent, targetEntity, monsterKills, freshRanch, variant.dungeonId, onRanchDataUpdated);
        };
      }

      itemsContainer.appendChild(itemRow);
    }
  }

  sectionEl.appendChild(itemsContainer);
}
