/**
 * battle-pet-tab.js
 * 戦闘画面の Pet タブ描画ロジック
 * 対象モンスターの捕獲情報表示 + 仲間モンスターへの餌やり機能
 */

import { GameDB } from '../../data/database.js';
import { isScreenLocked } from '../../utils/screen-lock.js';
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

const ELEMENT_DISPLAY = {
  fire: { label: '炎', color: 'text-red-400', icon: 'local_fire_department' },
  water: { label: '水', color: 'text-blue-400', icon: 'water_drop' },
  grass: { label: '草', color: 'text-emerald-400', icon: 'eco' },
  ice: { label: '氷', color: 'text-cyan-300', icon: 'ac_unit' },
  thunder: { label: '雷', color: 'text-yellow-400', icon: 'bolt' },
  wind: { label: '風', color: 'text-green-300', icon: 'air' },
  earth: { label: '土', color: 'text-amber-500', icon: 'landscape' },
  light: { label: '光', color: 'text-yellow-200', icon: 'light_mode' },
  dark: { label: '闇', color: 'text-purple-400', icon: 'dark_mode' }
};

function renderElementBadges(targetEntity) {
  const elements = targetEntity.elementResist || targetEntity.elements || {};
  const entries = Object.entries(elements).filter(([key, value]) => ELEMENT_DISPLAY[key] && Number(value) !== 0);

  return entries.map(([key, value]) => {
    const element = ELEMENT_DISPLAY[key];
    const kind = Number(value) < 0 ? '弱' : '耐';
    return `
      <span class="battle-pet-element inline-flex items-center gap-px rounded border border-slate-600/60 bg-slate-950/70 px-1 py-px" aria-label="${element.label}${kind}性 ${Math.abs(value)}">
        <span class="text-[7px] font-black text-slate-400">${kind}</span>
        <span class="material-symbols-outlined ${element.color}" style="font-size: 11px; font-variation-settings: 'FILL' 1;">${element.icon}</span>
        <span class="text-[8px] font-black ${element.color}">${Math.abs(value)}</span>
      </span>
    `;
  }).join('');
}

function renderStatusMetric({ label, value, icon, color, background, valueClass = 'text-slate-100' }) {
  return `
    <div class="battle-pet-status-metric flex min-w-0 items-center justify-between gap-0.5 rounded border px-1 py-0.5 shadow-inner ${background}">
      <span class="flex min-w-0 items-center gap-0.5">
        <span class="material-symbols-outlined shrink-0 ${color}" style="font-size: 12px; font-variation-settings: 'FILL' 1;">${icon}</span>
        <span class="truncate text-[8px] font-black text-slate-400">${label}</span>
      </span>
      <span class="shrink-0 whitespace-nowrap text-[10px] font-black tabular-nums ${valueClass}">${value}</span>
    </div>
  `;
}

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

  const hasAnyCompanion = isNormalCaptured || isLegendaryCaptured;
  const monsterImageStyle = hasAnyCompanion ? '' : 'filter: brightness(0); opacity: 0.9;';

  // --- インベントリの一括取得 (ちらつき防止) ---
  // 未捕獲の表示では餌UIを出さないため、所持品も読み込まない。
  const canFeedDisplayedVariant = isLegendaryToggleActive ? isLegendaryCaptured : isNormalCaptured;
  const allInv = canFeedDisplayedVariant ? await GameDB.getAllInventory() : [];
  const inventoryMap = {};
  if (allInv) {
    allInv.forEach(item => inventoryMap[item.id] = item.quantity);
  }

  // --- コンテナ作成 ---
  const container = document.createElement('div');
  container.className = 'battle-pet-root w-full flex flex-col gap-1.5 p-1 text-slate-200';

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

  // --- モンスターステータス + 捕獲情報 ---
  const isDisplayLegendary = targetEntity.isLegendary || isLegendaryToggleActive;
  const stats = targetEntity.stats || {};
  const rewards = targetEntity.rewards || {};
  const elementBadgesHtml = renderElementBadges(targetEntity);
  const statusMetrics = [
    { label: 'HP', value: formatNumber(stats.hp || 0), icon: 'favorite', color: 'text-red-400', background: 'bg-red-950/30 border-red-900/40' },
    { label: 'ATK', value: formatNumber(stats.atk || 0), icon: 'swords', color: 'text-orange-400', background: 'bg-orange-950/30 border-orange-900/40' },
    { label: 'DEF', value: formatNumber(stats.def || 0), icon: 'shield', color: 'text-slate-300', background: 'bg-slate-800/30 border-slate-700/40' },
    { label: 'MAT', value: formatNumber(stats.matk || 0), icon: 'auto_awesome', color: 'text-purple-400', background: 'bg-purple-950/30 border-purple-900/40' },
    { label: 'MDF', value: formatNumber(stats.mdef || 0), icon: 'security', color: 'text-indigo-400', background: 'bg-indigo-950/30 border-indigo-900/40' },
    { label: 'SPD', value: formatNumber(stats.spd || 0), icon: 'directions_run', color: 'text-amber-400', background: 'bg-amber-950/30 border-amber-900/40' },
    {
      label: '捕獲率',
      value: isNormalCaptured ? '捕獲済' : `${(captureRate * 100).toFixed(3).replace(/\.?0+$/, '')}%`,
      icon: 'pets',
      color: 'text-pink-400',
      background: 'bg-pink-950/30 border-pink-900/40',
      valueClass: isNormalCaptured ? 'text-pink-300' : 'text-emerald-300'
    },
    {
      label: '伝説出現',
      value: `${(legAppRate * 100).toFixed(3).replace(/\.?0+$/, '')}%`,
      icon: 'auto_awesome',
      color: 'text-yellow-400',
      background: 'bg-yellow-950/30 border-yellow-900/40',
      valueClass: 'text-yellow-300'
    },
    {
      label: '伝説捕獲',
      value: isLegendaryCaptured ? '捕獲済' : `${(legCapRate * 100).toFixed(3).replace(/\.?0+$/, '')}%`,
      icon: 'pets',
      color: 'text-yellow-400',
      background: 'bg-yellow-950/30 border-yellow-900/40',
      valueClass: isLegendaryCaptured ? 'text-pink-300' : 'text-yellow-300'
    },
    { label: 'EXP', value: formatNumber(rewards.exp || 0), icon: 'star', color: 'text-emerald-400', background: 'bg-emerald-950/30 border-emerald-900/40' },
    { label: 'JP', value: formatNumber(rewards.jp || 0), icon: 'psychology', color: 'text-fuchsia-400', background: 'bg-fuchsia-950/30 border-fuchsia-900/40' },
    { label: 'GOLD', value: formatNumber(rewards.gold || 0), icon: 'monetization_on', color: 'text-yellow-400', background: 'bg-yellow-950/30 border-yellow-900/40' }
  ].map(renderStatusMetric).join('');

  const headerHtml = `
    <section class="battle-pet-header flex gap-1.5 rounded-lg border border-slate-700/60 bg-slate-900/60 p-1 shadow-inner shrink-0" aria-label="${targetEntity.name}のステータスと捕獲情報">
      <div class="battle-pet-portrait-column flex w-[64px] shrink-0 flex-col items-center gap-1">
        <div class="relative flex h-11 w-11 items-center justify-center rounded-lg border border-slate-600 bg-slate-950 p-1 shadow-md">
          ${isDisplayLegendary ? '<div class="absolute inset-0 bg-yellow-500/20 animate-pulse pointer-events-none rounded-lg"></div>' : ''}
          <img src="${targetEntity.image}" class="relative z-10 h-full w-full object-contain ${isDisplayLegendary ? 'animate-rainbow' : ''}" style="${monsterImageStyle}" onerror="this.style.display='none'">
        </div>
        <div class="flex w-full flex-wrap justify-center gap-px">${elementBadgesHtml}</div>
      </div>
      <div class="battle-pet-header-body flex min-w-0 flex-1 flex-col">
        <div class="battle-pet-title-row mb-1 flex min-h-[22px] items-center justify-between gap-1 border-b border-slate-700/50 pb-0.5">
          <div class="flex min-w-0 items-center gap-1">
            ${currentLevel !== null ? `<span class="text-[10px] text-pink-300 font-black bg-pink-900/40 px-2 py-0.5 rounded border border-pink-500/40 shrink-0">Lv.${currentLevel}</span>` : ''}
            <span class="truncate text-[12px] font-black text-slate-100 drop-shadow">${targetEntity.name}</span>
            ${isLegendaryCaptured ? `
              <label class="battle-legendary-toggle inline-flex items-center cursor-pointer shrink-0 px-0.5">
                <input type="checkbox" class="sr-only peer" id="legendary-toggle" ${isLegendaryToggleActive ? 'checked' : ''}>
                <div class="battle-legendary-track bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:bg-yellow-600/50 border border-slate-600 peer-checked:border-yellow-500/50 shadow-inner"><span class="battle-legendary-knob bg-slate-300 peer-checked:bg-yellow-400"></span></div>
                <span class="ml-1 text-[8px] font-black ${isLegendaryToggleActive ? 'text-yellow-400 drop-shadow-[0_0_2px_rgba(250,204,21,0.5)]' : 'text-slate-500'}">伝説</span>
              </label>
            ` : ''}
          </div>
          <span class="ml-1 shrink-0 text-[8px] font-bold text-slate-400">討伐 <span class="font-black text-red-400">${formatNumber(kills)}</span></span>
        </div>
        <div class="battle-pet-status-grid grid w-full grid-cols-3 gap-0.5">
          ${statusMetrics}
        </div>
      </div>
    </section>
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
      feedSection.className = 'battle-pet-feed rounded-lg border border-slate-700/60 bg-slate-900/60 p-1 shadow-inner';
      container.appendChild(feedSection);
      renderFeedSectionSync(feedSection, variant, targetEntity, ranchData, inventoryMap, onRanchDataUpdated, tabContent, monsterKills);
    }
  } else {
    const noCapDiv = document.createElement('div');
    noCapDiv.className = 'bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 shadow-inner flex flex-col items-center justify-center gap-2 text-center';
    noCapDiv.innerHTML = `
      <span class="material-symbols-outlined text-3xl text-slate-600">heart_broken</span>
      <span class="text-[11px] text-slate-400 font-bold">${isLegendaryToggleActive ? '伝説のモンスターは' : ''}まだ仲間になっていません</span>
      <span class="text-[10px] text-slate-500">捕獲前は捕獲率の確認のみ可能で、餌は与えられません</span>
    `;
    container.appendChild(noCapDiv);
  }

  // 同期的に DOM を置換 (ちらつき防止)
  if (tabContent.dataset.renderedTab !== 'pet') return;
  tabContent.innerHTML = '';
  tabContent.appendChild(container);

  if (tabContent._petSyncTimer) {
    clearInterval(tabContent._petSyncTimer);
    tabContent._petSyncTimer = null;
  }

  // 餌UIがない未捕獲モンスターでは所持品の監視も不要。
  if (variants.length === 0) return;

  // --- リアルタイム反映 (ポーリング) ---
  let syncInProgress = false;
  const petSyncTimer = setInterval(async () => {
    if (!document.body.contains(container)) {
      clearInterval(petSyncTimer);
      if (tabContent._petSyncTimer === petSyncTimer) tabContent._petSyncTimer = null;
      return;
    }
    if (document.hidden || isScreenLocked()) return;
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
            const parentFlex = input ? input.closest('.battle-quantity-control') : null;
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
    <div class="relative mb-1 flex h-2 w-full items-center justify-center overflow-hidden rounded-full border border-slate-700/50 bg-slate-900 shadow-inner">
      <div class="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 transition-all duration-500 ease-out" style="width: ${pct}%">
        <div class="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
      </div>
      <span class="relative z-10 text-[7px] font-black tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">${info.currentLevelFed} / ${info.nextLevelRequired}</span>
    </div>
  `;

  // 素材リスト
  const itemsContainer = document.createElement('div');
  itemsContainer.className = 'flex flex-col gap-1';

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
      itemRow.className = 'battle-pet-material flex flex-col gap-1 rounded-md border border-slate-700/50 bg-slate-800/40 p-1 transition-colors';

      itemRow.innerHTML = `
        <div class="flex items-center justify-between gap-1">
          <div class="flex min-w-0 flex-1 items-center gap-1.5">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-900/80 p-0.5">
              <img src="${mat.image}" class="w-full h-full object-contain drop-shadow-sm">
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1 truncate text-[9px] font-black text-slate-100">
                ${mat.name}
                <span class="rounded border border-pink-700/50 bg-pink-900/50 px-1 py-px text-[7px] text-pink-300">${expMultiplier} EXP</span>
              </div>
              <div class="text-[8px] font-bold text-slate-400">所持 <span id="battle-pet-mat-owned-${variant.key}-${drop.itemId}" class="${quantity > 0 ? 'text-green-400 font-black' : 'text-slate-500'}">${quantity}</span></div>
            </div>
          </div>
          <button class="battle-feed-button shrink-0 rounded-md bg-gradient-to-r from-pink-600 to-rose-600 px-2 text-[9px] font-black text-white shadow-[0_0_8px_rgba(236,72,153,0.3)] transition-all active:scale-95 active:from-pink-500 active:to-rose-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:opacity-50 btn-feed" ${maxFeed === 0 ? 'disabled' : ''}>
            与える
          </button>
        </div>
        <!-- スライダーエリア (牧場画面と統一) -->
        <div class="battle-quantity-control flex items-center gap-1 ${maxFeed === 0 ? 'opacity-50 pointer-events-none' : ''}">
          <span class="battle-quantity-min w-3 shrink-0 text-right text-[8px] font-bold text-slate-400">1</span>
          <div class="battle-slider-shell relative flex-1 flex items-center">
            <div class="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-slate-800 rounded-full pointer-events-none shadow-inner border border-slate-700/50"></div>
            <div class="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-gradient-to-r from-pink-600 to-rose-500 rounded-full pointer-events-none slider-progress shadow-[0_0_8px_rgba(244,114,182,0.4)]" style="width: 0%"></div>
            <input type="range" min="1" max="${maxFeed || 1}" value="${initialVal}" ${maxFeed === 0 ? 'disabled' : ''} class="w-full h-full bg-transparent appearance-none cursor-pointer outline-none quantity-slider z-10 m-0 absolute inset-0" data-item-id="${drop.itemId}">
          </div>
          <button type="button" class="battle-max-button flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-slate-700/60 bg-slate-900/60 text-[8px] font-black text-slate-300 active:bg-slate-700 active:text-white btn-max">MAX</button>
          <div class="battle-quantity-input-shell relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-700 bg-slate-900 shadow-inner">
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
