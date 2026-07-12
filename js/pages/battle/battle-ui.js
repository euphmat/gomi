import { MEDAL_RANKS } from '../../definitions/medal-definitions.js';
import { EQUIPMENT_DROP_RATE, getEquipmentDropsForMonster } from '../../definitions/equipment-drops.js';
import { formatNumber } from '../../utils/format.js';

export function getActiveStateIconsHTML(entity) {
  if (!entity) return '';
  const icons = [];
  
  if (entity.activeAilment) {
    const AILMENTS = {
      poison: { icon: 'skull', color: 'text-purple-500', name: '毒' },
      burn: { icon: 'mode_heat', color: 'text-red-500', name: '火傷' },
      paralysis: { icon: 'flash_off', color: 'text-yellow-400', name: '麻痺' },
      sleep: { icon: 'bedtime', color: 'text-blue-300', name: '睡眠' },
      blind: { icon: 'visibility_off', color: 'text-gray-400', name: '暗闇' },
      silence: { icon: 'volume_off', color: 'text-indigo-400', name: '沈黙' },
      curse: { icon: 'sentiment_very_dissatisfied', color: 'text-fuchsia-500', name: '呪い' },
      confusion: { icon: 'question_mark', color: 'text-pink-400', name: '混乱' }
    };
    const data = AILMENTS[entity.activeAilment.type];
    if (data) icons.push(data);
  }

  if (entity._provokeTurns > 0) {
    icons.push({ icon: 'shield', color: 'text-amber-500', name: '挑発' });
  }

  if (entity.atkDebuffTurns > 0) {
    icons.push({ icon: 'trending_down', color: 'text-blue-400', name: '攻撃力ダウン' });
  }

  if (entity.defDebuffTurns > 0) {
    icons.push({ icon: 'shield', color: 'text-cyan-400', name: '防御力ダウン' });
  }

  if (entity._regenTurns && entity._regenTurns > 0) {
    icons.push({ icon: 'spa', color: 'text-green-400', name: 'サンクチュアリ' });
  }

  if ((entity._barrierHp && entity._barrierHp > 0) || (entity._mdefBuffTurns && entity._mdefBuffTurns > 0)) {
    icons.push({ icon: 'verified_user', color: 'text-amber-300', name: 'ディバインシールド' });
  }

  if (icons.length === 0) return '';

  return icons.map(data => 
    `<span class="material-symbols-outlined ${data.color} drop-shadow-md flex-shrink-0" style="font-size: 11px; font-variation-settings: 'FILL' 1" title="${data.name}">${data.icon}</span>`
  ).join('');
}

export function renderEnemyCardHtml(e, selectedEnemyTarget) {
  const isSelected = selectedEnemyTarget === e;
  const fastMode = cachedBattleSpeed >= 5;
  const transitionClass = fastMode ? '' : 'transition-transform';
  const deadStyle = e.isDead ? 'min-width: 0px; max-width: 0px; opacity: 0; margin: 0 -0.125rem; pointer-events: none;' : '';
  return `
    <div id="${e.elementId}" class="enemy-card relative flex flex-col items-center gap-0.5 flex-1 min-w-[2.5rem] max-w-[4rem] ${e.isDead ? '' : `cursor-pointer hover:scale-105 ${transitionClass}`}" style="${deadStyle}" data-id="${e.uniqueId}">
      <div class="relative w-full aspect-square ${isSelected ? 'drop-shadow-[0_0_8px_rgba(239,68,68,1)]' : 'drop-shadow-md'} ${e.isDead ? 'opacity-0' : ''}" style="${fastMode ? '' : 'transition: filter 0.3s ease;'}">
        <div class="state-icons-container absolute -top-1.5 -right-1.5 z-20 flex gap-0.5 pointer-events-auto">
          ${!e.isDead ? getActiveStateIconsHTML(e) : ''}
        </div>
        <img src="${e.image}" class="w-full h-full object-contain p-1 ${e.isLegendary ? 'animate-rainbow' : ''}" onerror="this.style.display='none'">
      </div>
      <div class="w-full relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50 shrink-0 ${e.isDead ? 'opacity-0' : ''}">
        <div class="absolute bg-red-600" style="left: 0; top: 0; bottom: 0; width: ${Math.min(100, (e.currentHp / Math.max(1, e.maxHp)) * 100)}%; ${fastMode ? '' : 'transition: width 0.3s ease;'}"></div>
        <div class="hp-barrier-bar absolute shadow-[0_0_8px_rgba(59,130,246,0.8)] z-10 border-l border-blue-300" style="left: ${e._barrierHp && e._barrierHp > 0 ? Math.min(100 - Math.min(100, (e._barrierHp / Math.max(1, e.maxHp)) * 100), (e.currentHp / Math.max(1, e.maxHp)) * 100) : 0}%; width: ${e._barrierHp && e._barrierHp > 0 ? Math.min(100, (e._barrierHp / Math.max(1, e.maxHp)) * 100) : 0}%; top: 0; bottom: 0; opacity: ${e._barrierHp && e._barrierHp > 0 ? 1 : 0}; background-color: rgba(59, 130, 246, 0.6); background-image: repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.2) 4px, rgba(255,255,255,0.2) 8px); ${fastMode ? '' : 'transition: width 0.3s ease, left 0.3s ease, opacity 0.3s ease;'}"></div>
        <div class="hp-text absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter whitespace-nowrap z-20">
          ${formatNumber(Math.floor(e.currentHp))}/${formatNumber(e.maxHp)}
        </div>
      </div>
      <div class="w-full bg-gray-900 h-1.5 rounded overflow-hidden shadow-inner border border-gray-700/50 shrink-0 ${e.isDead ? 'opacity-0' : ''}">
        <div id="${e.elementId}-atb" class="bg-orange-500 h-full w-full origin-left" style="transform: scaleX(${e.atb / 1000}); will-change: transform; transition: transform 100ms linear;"></div>
      </div>
    </div>
  `;
}

let cachedDisableAnimations = localStorage.getItem('disableBattleAnimations') === 'true';
let cachedBattleSpeed = parseInt(localStorage.getItem('autoBattleSpeed') || '1', 10);
window.addEventListener('settingsChanged', () => {
  cachedDisableAnimations = localStorage.getItem('disableBattleAnimations') === 'true';
  cachedBattleSpeed = parseInt(localStorage.getItem('autoBattleSpeed') || '1', 10);
});

export function renderPartyCardHtml(p, activeCharacter, isAutoBattle, selectedPartyMember) {
  let borderClass = 'border-gray-700';
  let bgClass = 'bg-gray-800/80';

  if (activeCharacter === p && !isAutoBattle) {
    borderClass = 'border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]';
  } else if (isAutoBattle && selectedPartyMember === p) {
    borderClass = 'border-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]';
  }
  
  if (p.activeAilment && !p.isDead) {
    const ailmentBgMap = {
      poison: 'bg-purple-900/70',
      burn: 'bg-red-900/70',
      paralysis: 'bg-yellow-900/70',
      sleep: 'bg-blue-900/70',
      blind: 'bg-stone-900/90',
      silence: 'bg-slate-300/30',
      curse: 'bg-black/80',
      confusion: 'bg-pink-900/70'
    };
    bgClass = ailmentBgMap[p.activeAilment.type] || bgClass;
  }
  
  let demonPowerMult = 1;
  if (p.hp && p.hp.current / (p.stats?.hp || p.hp.max) <= 0.5) {
    if (p._skillCache && p._skillCache.has('demon_power')) {
      const dpInfo = p._skillCache.get('demon_power');
      if (dpInfo && dpInfo.level > 0 && dpInfo.levelConfig) {
        demonPowerMult = dpInfo.levelConfig.atkMatkMultiplier || 1;
      }
    }
  }

  const atkTotalPercent = (p._passiveAtkBuffPercent || 0) + (p._atkBuffTurns > 0 ? (p._atkBuffPercent || 0) : 0);
  const defTotalPercent = (p._passiveDefBuffPercent || 0) + (p._defBuffTurns > 0 ? (p._defBuffPercent || 0) : 0);
  const matkTotalPercent = (p._passiveMatkBuffPercent || 0) + (p._matkBuffTurns > 0 ? (p._matkBuffPercent || 0) : 0);
  const mdefPassivePercent = (p._passiveMdefBuffPercent || 0);
  const mdefActiveAmount = (p._mdefBuffTurns > 0 ? (p._mdefBuffAmount || 0) : 0);
  const spdTotalPercent = (p._passiveSpdBuffPercent || 0);

  const getStatTheme = (isBuff, isDebuff, baseIconColor) => {
    if (isBuff) return { bg: 'bg-green-900/40 border-green-500/50 shadow-none', text: 'text-green-400', val: 'text-green-400', icon: 'text-green-400' };
    if (isDebuff) return { bg: 'bg-red-900/40 border-red-500/50 shadow-none', text: 'text-red-400', val: 'text-red-400', icon: 'text-red-400' };
    return { bg: 'bg-gray-900/40 border-transparent shadow-none', text: '', val: 'text-gray-100', icon: baseIconColor };
  };

  const atkTheme = getStatTheme(atkTotalPercent > 0 || demonPowerMult > 1, atkTotalPercent < 0, 'text-red-400');
  const defTheme = getStatTheme(defTotalPercent > 0, defTotalPercent < 0, 'text-slate-400');
  const matkTheme = getStatTheme(matkTotalPercent > 0 || demonPowerMult > 1, matkTotalPercent < 0, 'text-purple-400');
  const mdefTheme = getStatTheme(mdefPassivePercent > 0 || mdefActiveAmount > 0, mdefPassivePercent < 0 || mdefActiveAmount < 0, 'text-indigo-400');
  const spdTheme = getStatTheme(spdTotalPercent > 0, spdTotalPercent < 0, 'text-yellow-400');

  const finalAtk = Math.floor((p.stats.atk * demonPowerMult) * (1 + atkTotalPercent / 100));
  const finalDef = Math.floor(p.stats.def * (1 + defTotalPercent / 100));
  const finalMatk = Math.floor((p.stats.matk * demonPowerMult) * (1 + matkTotalPercent / 100));
  const finalMdef = Math.floor(p.stats.mdef * (1 + mdefPassivePercent / 100)) + mdefActiveAmount;
  const finalSpd = Math.floor(p.stats.spd * (1 + spdTotalPercent / 100));

  const fastMode = cachedBattleSpeed >= 5;
  const transClass = fastMode ? '' : 'transition-transform';
  const transColorClass = fastMode ? '' : 'transition-colors';
  const hpTransStyle = fastMode ? '' : 'transition: width 0.3s ease;';
  const barrierTransStyle = fastMode ? '' : 'transition: width 0.3s ease, left 0.3s ease, opacity 0.3s ease;';
  const barTransStyle = fastMode ? '' : 'transition: transform 0.3s ease;';

  return `
    <div id="${p.elementId}" class="party-card relative flex flex-col ${bgClass} rounded border ${borderClass} p-1 ${p.isDead ? 'opacity-40 grayscale' : `${transClass} cursor-pointer hover:scale-[1.02]`}">
      <div class="flex flex-col mb-1.5 w-full">
        <div class="flex items-center gap-1.5 w-full mb-1 px-0.5">
          <!-- ICON -->
          <div class="w-10 h-10 rounded border border-gray-600 overflow-hidden shadow-md bg-gray-800 shrink-0">
            <img src="${p.iconImage}" class="w-full h-full object-cover" onerror="this.style.display='none'">
          </div>
          <!-- LV / JLV / SP -->
          <div class="flex flex-col flex-1 text-[9px] text-gray-300 font-bold leading-tight justify-center gap-[2px]">
            <div class="flex justify-between items-center bg-gray-900/50 px-1 rounded-sm"><span class="text-gray-400">LV:</span> <span class="${p.elementId}-lv text-gray-100">${p.level || 1}</span></div>
            <div class="flex justify-between items-center bg-gray-900/50 px-1 rounded-sm"><span class="text-gray-400">JLV:</span> <span class="${p.elementId}-jlv text-gray-100">${p.jobLevel || 1}</span></div>
            <div class="flex justify-between items-center bg-gray-900/50 px-1 rounded-sm"><span class="text-gray-400">SP:</span> <span class="${p.elementId}-sp text-gray-100">${p.sp || 0}</span></div>
          </div>
        </div>
        <!-- Name & ATB -->
        <div class="px-0.5">
          <div class="flex items-center mb-0.5 relative min-w-0 justify-start">
            <div class="text-[10px] font-bold text-gray-100 truncate drop-shadow shrink">${p.name}</div>
            <div class="state-icons-container flex items-center gap-[2px] shrink-0 z-20 pointer-events-auto ml-1">
              ${!p.isDead ? getActiveStateIconsHTML(p) : ''}
            </div>
          </div>
          <div class="w-full h-1.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
            <div id="${p.elementId}-atb" class="bg-yellow-400 h-full w-full origin-left" style="transform: scaleX(${p.atb / 1000}); will-change: transform; transition: transform 100ms linear;"></div>
          </div>
        </div>
      </div>
      
      <div class="flex flex-col gap-[3px] mb-1.5">
        <div class="flex items-center gap-0.5">
          <span class="text-[9px] font-bold text-red-400 w-3.5">HP</span>
          <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
            <div class="absolute bg-red-600" style="left: 0; top: 0; bottom: 0; width: ${Math.min(100, (p.hp.current / Math.max(1, p.stats.hp || p.hp.max)) * 100)}%; ${hpTransStyle}"></div>
            <div class="hp-barrier-bar absolute shadow-[0_0_8px_rgba(59,130,246,0.8)] z-10 border-l border-blue-300" style="left: ${p._barrierHp && p._barrierHp > 0 ? Math.min(100 - Math.min(100, (p._barrierHp / Math.max(1, p.stats.hp || p.hp.max)) * 100), (p.hp.current / Math.max(1, p.stats.hp || p.hp.max)) * 100) : 0}%; width: ${p._barrierHp && p._barrierHp > 0 ? Math.min(100, (p._barrierHp / Math.max(1, p.stats.hp || p.hp.max)) * 100) : 0}%; top: 0; bottom: 0; opacity: ${p._barrierHp && p._barrierHp > 0 ? 1 : 0}; background-color: rgba(59, 130, 246, 0.6); background-image: repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.2) 4px, rgba(255,255,255,0.2) 8px); ${barrierTransStyle}"></div>
            <div class="hp-text absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter whitespace-nowrap z-20">
              ${formatNumber(Math.floor(p.hp.current))}/${formatNumber(p.stats.hp || p.hp.max)}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-0.5">
          <span class="text-[9px] font-bold text-blue-400 w-3.5">MP</span>
          <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
            <div class="bg-blue-600 h-full w-full origin-left" style="transform: scaleX(${p.mp.current / (p.stats.mp || p.mp.max)}); ${barTransStyle}"></div>
            <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${formatNumber(Math.floor(p.mp.current))}/${formatNumber(p.stats.mp || p.mp.max)}</div>
          </div>
        </div>
        <div class="flex items-center gap-0.5">
          <span class="text-[9px] font-bold text-green-400 w-3.5">EX</span>
          <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
            <div class="bg-green-600 h-full w-full origin-left" style="transform: scaleX(${p.exp.current / p.exp.max}); ${barTransStyle}"></div>
            <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${formatNumber(Math.floor(p.exp.current))}/${formatNumber(p.exp.max)}</div>
          </div>
        </div>
        <div class="flex items-center gap-0.5">
          <span class="text-[9px] font-bold text-purple-400 w-3.5">JP</span>
          <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
            <div class="bg-purple-600 h-full w-full origin-left" style="transform: scaleX(${p.jp.current / p.jp.max}); ${barTransStyle}"></div>
            <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${formatNumber(Math.floor(p.jp.current))}/${formatNumber(p.jp.max)}</div>
          </div>
        </div>
      </div>

      <div class="battle-stats-container flex flex-col gap-[1px] text-[9px] text-gray-400 mt-auto leading-tight w-full px-0.5 pb-0.5 ${localStorage.getItem('hideBattleStats') !== 'false' ? 'hidden' : ''}">
        <div class="stat-row-atk flex justify-between items-center ${atkTheme.bg} border rounded px-1 py-0.5 ${transColorClass}">
          <div class="flex items-center gap-[3px]"><span class="stat-icon-atk material-symbols-outlined ${atkTheme.icon}" style="font-size: 10px; font-variation-settings: 'FILL' 1">swords</span><span class="stat-label-atk font-bold tracking-wider ${atkTheme.text}">ATK</span></div>
          <span class="stat-val-atk ${atkTheme.val} font-black drop-shadow-md">${formatNumber(finalAtk)}</span>
        </div>
        <div class="stat-row-def flex justify-between items-center ${defTheme.bg} border rounded px-1 py-0.5 ${transColorClass}">
          <div class="flex items-center gap-[3px]"><span class="stat-icon-def material-symbols-outlined ${defTheme.icon}" style="font-size: 10px; font-variation-settings: 'FILL' 1">shield</span><span class="stat-label-def font-bold tracking-wider ${defTheme.text}">DEF</span></div>
          <span class="stat-val-def ${defTheme.val} font-black drop-shadow-md">${formatNumber(finalDef)}</span>
        </div>
        <div class="stat-row-mat flex justify-between items-center ${matkTheme.bg} border rounded px-1 py-0.5 ${transColorClass}">
          <div class="flex items-center gap-[3px]"><span class="stat-icon-mat material-symbols-outlined ${matkTheme.icon}" style="font-size: 10px; font-variation-settings: 'FILL' 1">auto_awesome</span><span class="stat-label-mat font-bold tracking-wider ${matkTheme.text}">MAT</span></div>
          <span class="stat-val-mat ${matkTheme.val} font-black drop-shadow-md">${formatNumber(finalMatk)}</span>
        </div>
        <div class="stat-row-mdf flex justify-between items-center ${mdefTheme.bg} border rounded px-1 py-0.5 ${transColorClass}">
          <div class="flex items-center gap-[3px]"><span class="stat-icon-mdf material-symbols-outlined ${mdefTheme.icon}" style="font-size: 10px; font-variation-settings: 'FILL' 1">security</span><span class="stat-label-mdf font-bold tracking-wider ${mdefTheme.text}">MDF</span></div>
          <span class="stat-val-mdf ${mdefTheme.val} font-black drop-shadow-md">${formatNumber(finalMdef)}</span>
        </div>
        <div class="stat-row-spd flex justify-between items-center ${spdTheme.bg} border rounded px-1 py-0.5 ${transColorClass}">
          <div class="flex items-center gap-[3px]"><span class="stat-icon-spd material-symbols-outlined ${spdTheme.icon}" style="font-size: 10px; font-variation-settings: 'FILL' 1">directions_run</span><span class="stat-label-spd font-bold tracking-wider ${spdTheme.text}">SPD</span></div>
          <span class="stat-val-spd ${spdTheme.val} font-black drop-shadow-md">${formatNumber(finalSpd)}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderInfoTabHtml(targetEntity, isParty, equipMap, currentFloorNum, materials, monsterKills, ranchData = {}, playerMedals = {}) {
  if (!targetEntity) {
    return '<div class="text-xs text-slate-500 flex items-center justify-center h-full">対象が選択されていません</div>';
  }

  const kills = (monsterKills && targetEntity.id) ? (monsterKills[targetEntity.id] || 0) : 0;
  const bonus = Math.floor(kills / 100) * 0.1;
  const medalRankIndex = (playerMedals && targetEntity.id && playerMedals[targetEntity.id] !== undefined) ? playerMedals[targetEntity.id] : -1;

  // 1. Stats & Rewards Grid
  const stats = targetEntity.stats || {};
  const rewards = targetEntity.rewards || {};
  const statPills = [
    { label: 'HP', val: stats.hp || 0, icon: 'favorite', color: 'text-red-400', bg: 'bg-red-950/30 border-red-900/40' },
    { label: 'ATK', val: stats.atk || 0, icon: 'swords', color: 'text-orange-400', bg: 'bg-orange-950/30 border-orange-900/40' },
    { label: 'DEF', val: stats.def || 0, icon: 'shield', color: 'text-slate-300', bg: 'bg-slate-800/30 border-slate-700/40' },
    { label: 'MAT', val: stats.matk || 0, icon: 'auto_awesome', color: 'text-purple-400', bg: 'bg-purple-950/30 border-purple-900/40' },
    { label: 'MDF', val: stats.mdef || 0, icon: 'security', color: 'text-indigo-400', bg: 'bg-indigo-950/30 border-indigo-900/40' },
    { label: 'SPD', val: stats.spd || 0, icon: 'directions_run', color: 'text-amber-400', bg: 'bg-amber-950/30 border-amber-900/40' }
  ];

  const renderStatBadge = (p) => `
    <div class="battle-info-stat flex items-center justify-between px-1 py-0.5 rounded border ${p.bg} shadow-inner shrink-0 min-w-0">
      <div class="flex items-center gap-1 min-w-0 shrink-0">
        <div class="flex items-center justify-center w-[12px] h-[12px] shrink-0"><span class="material-symbols-outlined ${p.color}" style="font-size: 16px; font-variation-settings: 'FILL' 1; transform: scale(0.75);">${p.icon}</span></div>
        <span class="text-[11px] font-bold text-slate-300 drop-shadow truncate">${p.label}</span>
      </div>
      <span class="text-[13px] font-black text-slate-100 drop-shadow ml-1 shrink-0">${formatNumber(p.val)}</span>
    </div>
  `;
  const statPillsHtml = statPills.map(renderStatBadge).join('');

  const rewardPills = [
    { label: 'EXP', val: rewards.exp || 0, icon: 'star', color: 'text-emerald-400', bg: 'bg-emerald-950/30 border-emerald-900/40' },
    { label: 'JP', val: rewards.jp || 0, icon: 'psychology', color: 'text-fuchsia-400', bg: 'bg-fuchsia-950/30 border-fuchsia-900/40' },
    { label: 'GOLD', val: rewards.gold || 0, icon: 'monetization_on', color: 'text-yellow-400', bg: 'bg-yellow-950/30 border-yellow-900/40' }
  ];
  const rewardsHtml = rewardPills.map(renderStatBadge).join('');

  // 1.5 Resistances & Weaknesses
  const elementMap = {
    fire: { label: '炎', color: 'text-red-400', icon: 'local_fire_department' }, water: { label: '水', color: 'text-blue-400', icon: 'water_drop' },
    grass: { label: '草', color: 'text-emerald-400', icon: 'eco' }, ice: { label: '氷', color: 'text-cyan-300', icon: 'ac_unit' },
    thunder: { label: '雷', color: 'text-yellow-400', icon: 'bolt' }, wind: { label: '風', color: 'text-green-300', icon: 'air' },
    earth: { label: '土', color: 'text-amber-500', icon: 'landscape' }, light: { label: '光', color: 'text-yellow-200', icon: 'light_mode' },
    dark: { label: '闇', color: 'text-purple-400', icon: 'dark_mode' }
  };
  const ailmentMap = {
    poison: { label: '毒', color: 'text-purple-500', icon: 'skull' }, burn: { label: '火傷', color: 'text-red-500', icon: 'mode_heat' },
    paralysis: { label: '麻痺', color: 'text-yellow-400', icon: 'flash_off' }, sleep: { label: '睡眠', color: 'text-blue-300', icon: 'bedtime' },
    confusion: { label: '混乱', color: 'text-pink-400', icon: 'mood_bad' }, curse: { label: '呪い', color: 'text-fuchsia-500', icon: 'priority_high' },
    blind: { label: '暗闇', color: 'text-gray-400', icon: 'visibility_off' }, silence: { label: '沈黙', color: 'text-indigo-400', icon: 'volume_off' }
  };

  const getResistBadges = (source, map) => {
    if (!source) return [];
    return Object.keys(source).map(key => {
      const val = source[key];
      if (!val || val === 0 || !map[key]) return null;
      return { ...map[key], val: val, isWeak: val < 0 };
    }).filter(Boolean);
  };

  const allResists = [
    ...getResistBadges(targetEntity.elementResist || targetEntity.elements, elementMap)
  ];

  const weakBadges = allResists.filter(r => r.isWeak);
  const resistBadges = allResists.filter(r => !r.isWeak);

  const renderResistGroup = (label, badges, colorClass) => {
    if (badges.length === 0) return '';
    const badgeHtml = badges.map(r => `
      <div class="flex items-center px-1.5 py-[1px] rounded border border-slate-600/60 bg-slate-950/60 shadow-inner" title="${r.label}">
        <div class="flex items-center justify-center w-[10px] h-[10px] shrink-0"><span class="material-symbols-outlined ${r.color}" style="font-size: 14px; font-variation-settings: 'FILL' 1; transform: scale(0.7);">${r.icon}</span></div>
        <span class="text-[10px] font-black ${r.color} drop-shadow ml-[1px]">${Math.abs(r.val)}</span>
      </div>
    `).join('');
    
    return `
      <div class="flex flex-wrap items-center justify-center w-full mt-1 gap-0.5">
        <span class="text-[9px] font-bold ${colorClass} shrink-0 leading-none bg-slate-800/80 px-1 py-0.5 rounded border border-slate-600/50 shadow-inner">${label}</span>
        ${badgeHtml}
      </div>
    `;
  };

  const resistHtml = renderResistGroup('耐', resistBadges, 'text-slate-200');
  const weakHtml = renderResistGroup('弱', weakBadges, 'text-slate-200');

  // 2. Actions (List)
  let actionsHtml = '';
  if (targetEntity.actions && targetEntity.actions.length > 0) {
    actionsHtml = targetEntity.actions.map(a => {
      const desc = a.description || '特殊な行動を行います。';
      const isMagic = a.isMagic === true || (a.execute && /isMagic:\s*true/.test(a.execute.toString())) || (a.description && a.description.includes('魔法'));
      const isPhysical = a.isMagic === false || (a.execute && /isMagic:\s*false/.test(a.execute.toString())) || (a.description && a.description.includes('物理'));
      
      let icon = 'star';
      let colorClass = 'text-slate-300';
      if (isMagic) { icon = 'auto_awesome'; colorClass = 'text-purple-400'; }
      else if (isPhysical) { icon = 'swords'; colorClass = 'text-orange-400'; }

      let typeLabel = '特殊';
      let typeBadgeClass = 'text-slate-300 bg-slate-800/80 border-slate-600/50';
      if (a.type === 'physical') { typeLabel = '物理'; typeBadgeClass = 'text-orange-300 bg-orange-950/60 border-orange-800/50'; }
      else if (a.type === 'magic') { typeLabel = '魔法'; typeBadgeClass = 'text-purple-300 bg-purple-950/60 border-purple-800/50'; }
      else if (a.type === 'heal') { typeLabel = '回復'; typeBadgeClass = 'text-emerald-300 bg-emerald-950/60 border-emerald-800/50'; }
      else if (a.type === 'support') { typeLabel = '補助'; typeBadgeClass = 'text-cyan-300 bg-cyan-950/60 border-cyan-800/50'; }

      return `
        <div class="flex flex-col gap-0 px-1.5 py-0.5 rounded border border-slate-700/50 bg-slate-900/40 hover:bg-slate-800/60 transition-colors">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <div class="flex items-center justify-center w-[14px] h-[14px] shrink-0"><span class="material-symbols-outlined ${colorClass}" style="font-size: 18px; font-variation-settings: 'FILL' 1; transform: scale(0.8);">${icon}</span></div>
              <span class="text-[13px] font-black text-slate-100 leading-tight">${a.name}</span>
              <span class="text-[9px] font-bold px-1 py-[1px] rounded border ${typeBadgeClass} ml-0.5 leading-none shadow-inner shrink-0">${typeLabel}</span>
            </div>
            <span class="text-[10px] font-black text-blue-300 bg-blue-950/80 px-1.5 rounded border border-blue-800/50 shrink-0 ml-1 py-[1px]">${a.chance}%</span>
          </div>
          <div class="battle-info-action-desc text-[10px] text-slate-400 pl-[20px] leading-tight break-words">${desc}</div>
        </div>
      `;
    }).join('');
  } else {
    actionsHtml = '<div class="text-[10px] text-slate-500 italic p-2 text-center bg-slate-950/30 rounded border border-slate-800/50">通常攻撃のみ</div>';
  }

  // 3. Drops (List)
  let dropsHtml = '';
  const getDropRateStyle = (rate) => {
    if (rate <= 0.1) {
      return {
        card: 'border-amber-700/60 bg-gradient-to-br from-amber-950/45 to-slate-950/80',
        rate: 'text-amber-300 bg-amber-950/90 border-amber-700/70'
      };
    }
    if (rate <= 2.0) {
      return {
        card: 'border-purple-800/60 bg-gradient-to-br from-purple-950/35 to-slate-950/80',
        rate: 'text-purple-300 bg-purple-950/90 border-purple-700/60'
      };
    }
    return {
      card: 'border-slate-700/60 bg-slate-950/65',
      rate: 'text-emerald-300 bg-emerald-950/80 border-emerald-800/60'
    };
  };

  const materialDropRows = (targetEntity.drops || []).map(d => {
      const mat = materials.find(m => m.id === d.itemId);
      const itemName = mat ? mat.name : d.itemId;
      const itemImg = mat && mat.image 
        ? `<img src="${mat.image}" class="w-7 max-w-full h-7 object-contain drop-shadow-sm">`
        : `<div class="flex items-center justify-center w-[14px] h-[14px] shrink-0"><span class="material-symbols-outlined text-slate-500" style="font-size: 18px; transform: scale(0.65);">category</span></div>`;
      
      const rate = targetEntity.isLegendary ? 100 : parseFloat(d.rate) + bonus;
      const rateStyle = getDropRateStyle(rate);

      return `
        <div class="battle-info-drop-card h-[52px] min-w-0 flex flex-col items-center justify-center border ${rateStyle.card} rounded-lg p-1 hover:brightness-125 transition-all gap-0.5 shadow-inner" title="${itemName}：ドロップ率 ${rate.toFixed(3).replace(/\.?0+$/, '')}%" aria-label="${itemName}、ドロップ率 ${rate.toFixed(3).replace(/\.?0+$/, '')}%">
          <div class="battle-info-drop-image w-full max-w-7 h-7 rounded-md bg-slate-900/90 flex items-center justify-center border border-slate-700/70 shrink-0 shadow-sm">
            ${itemImg}
          </div>
          <span class="max-w-full overflow-hidden text-[9px] leading-none font-black ${rateStyle.rate} px-1 py-0.5 rounded border tabular-nums whitespace-nowrap">${rate.toFixed(3).replace(/\.?0+$/, '')}%</span>
        </div>
      `;
    });
  const equipmentDropRows = getEquipmentDropsForMonster(targetEntity).map(equipment => `
    <div class="battle-info-drop-card h-[52px] min-w-0 flex flex-col items-center justify-center border border-amber-700/60 bg-gradient-to-br from-amber-950/45 to-slate-950/80 rounded-lg p-1 hover:brightness-125 transition-all gap-0.5 shadow-inner" title="${equipment.name}：ドロップ率 ${EQUIPMENT_DROP_RATE}%" aria-label="${equipment.name}、ドロップ率 ${EQUIPMENT_DROP_RATE}%">
      <div class="battle-info-drop-image w-full max-w-7 h-7 rounded-md bg-slate-900/90 flex items-center justify-center border border-amber-700/60 shrink-0 shadow-sm">
        <img src="${equipment.image}" class="w-7 max-w-full h-7 object-contain drop-shadow-sm" onerror="this.style.display='none'">
      </div>
      <span class="max-w-full overflow-hidden text-[9px] leading-none font-black text-amber-300 bg-amber-950/90 border-amber-700/70 px-1 py-0.5 rounded border tabular-nums whitespace-nowrap">${EQUIPMENT_DROP_RATE}%</span>
    </div>
  `);
  const dropRows = [...materialDropRows, ...equipmentDropRows];
  if (dropRows.length > 0) {
    dropsHtml = dropRows.join('');
  } else {
    dropsHtml = '<div class="text-[10px] text-slate-500 italic p-2 text-center bg-slate-950/30 rounded border border-slate-800/50">ドロップ情報なし</div>';
  }

  // Master Layout Assembly
  let html = `
    <div class="battle-info-root w-full h-full min-h-0 flex flex-col gap-1 p-0.5 text-slate-200">
      
      <!-- 1. Top Panel (Header + Stats/Rewards) -->
      <div class="battle-info-summary flex gap-1.5 bg-slate-900/60 border border-slate-700/60 rounded-lg p-1 shadow-inner shrink-0 backdrop-blur-sm relative overflow-hidden">
        <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <!-- Left: Avatar & Resists -->
        <div class="battle-info-portrait-column flex flex-col items-center w-[76px] shrink-0 relative z-10 justify-start">
          <div class="battle-info-portrait w-10 h-10 rounded-lg bg-slate-950 border border-slate-600 shadow-[0_4px_12px_rgba(0,0,0,0.5)] relative flex items-center justify-center p-0.5">
            ${targetEntity.isLegendary ? '<div class="absolute inset-0 bg-yellow-500/20 animate-pulse pointer-events-none rounded-xl"></div>' : ''}
            <img src="${targetEntity.image}" class="w-full h-full object-contain relative z-10 ${targetEntity.isLegendary ? 'animate-rainbow' : ''}" onerror="this.style.display='none'">
          </div>
          <div class="flex flex-col w-full mt-0.5">
            ${resistHtml}
            ${weakHtml}
          </div>
        </div>
        
        <!-- Right: Name & Stats Grid -->
        <div class="flex-1 flex flex-col justify-start relative z-10 min-w-0">
          <div class="flex items-center px-0.5 mb-0.5 shrink-0 min-w-0">
            <span class="font-black text-[12px] text-slate-100 drop-shadow truncate">${targetEntity.name}</span>
          </div>
          <div class="grid grid-cols-3 gap-1 content-start flex-1">
            ${statPillsHtml}
            ${rewardsHtml}
          </div>
        </div>
      </div>

      <!-- 2. Actions: compact, independently scrollable -->
      <div class="battle-info-actions flex flex-col bg-slate-900/50 border border-slate-700/50 rounded-lg p-1 overflow-hidden shadow-inner shrink-0">
        <div class="flex items-center justify-between border-b border-slate-700/50 pb-1 mb-1 shrink-0">
          <div class="flex items-center gap-1">
            <div class="flex items-center justify-center w-[14px] h-[14px] shrink-0"><span class="material-symbols-outlined text-blue-400" style="font-size: 18px; font-variation-settings: 'FILL' 1; transform: scale(0.8);">psychology</span></div>
            <span class="font-bold text-[12px] text-slate-300">行動パターン</span>
          </div>
          <span class="text-[9px] text-slate-500">発動率</span>
        </div>
        <div class="grid grid-cols-2 gap-0.5 max-h-[68px] overflow-y-auto custom-scrollbar">
          ${actionsHtml}
        </div>
      </div>

      <!-- 3. Drop inventory: materials and equipment stay visually separate -->
      <div class="battle-info-drops shrink-0 flex flex-col bg-slate-900/55 border border-slate-700/50 rounded-lg p-1 overflow-hidden shadow-inner">
        <div class="flex items-center justify-between border-b border-slate-700/50 pb-1 mb-1 shrink-0 gap-2">
          <div class="flex items-center gap-1 min-w-0 shrink-0">
            <div class="flex items-center justify-center w-[14px] h-[14px] shrink-0"><span class="material-symbols-outlined text-emerald-400" style="font-size: 18px; font-variation-settings: 'FILL' 1; transform: scale(0.8);">shopping_bag</span></div>
            <span class="font-bold text-[12px] text-slate-200">ドロップ</span>
            <span class="text-[9px] font-black text-emerald-300 bg-emerald-950/70 border border-emerald-800/50 rounded-full px-1.5 py-0.5">${dropRows.length}種</span>
          </div>
          <div class="flex items-center gap-1.5 min-w-0">
            ${bonus > 0 ? `<span class="text-[8px] text-blue-300 bg-blue-950/50 border border-blue-900/50 rounded px-1 py-0.5 whitespace-nowrap">討伐補正 +${bonus.toFixed(1)}%</span>` : ''}
          </div>
        </div>
        <div class="overflow-x-hidden">
          ${dropRows.length > 0 ? `
            <div class="grid gap-0.5 w-full shrink-0" style="grid-template-columns: repeat(${dropRows.length}, minmax(0, 1fr));" aria-label="ドロップ一覧">
              ${dropsHtml}
            </div>
          ` : ''}
          ${dropRows.length === 0 ? dropsHtml : ''}
        </div>
      </div>

    </div>
  `;

  return html;
}

export function renderItemTabHtml(obtainedItems, gridClass = 'grid-cols-5') {
  if (!obtainedItems || obtainedItems.length === 0) {
    return '<div class="text-xs text-gray-500 flex items-center justify-center h-full">獲得したアイテムはありません</div>';
  }
  let html = `<div class="grid ${gridClass} gap-1.5 p-1 content-start w-full">`;
  obtainedItems.forEach(item => {
    html += `
      <div class="item-card relative w-full h-full bg-gray-800 border border-gray-600 rounded flex flex-col group overflow-hidden" data-item-id="${item.id}">
        <div class="relative w-full aspect-square p-1 shrink-0">
          <img src="${item.image}" class="w-full h-full object-contain drop-shadow-md pointer-events-none" onerror="this.style.display='none'">
          <div class="absolute bottom-0 right-0 bg-black/80 text-[8px] text-white font-bold px-1 rounded-tl shadow-sm z-10 pointer-events-none">x${formatNumber(item.quantity)}</div>
        </div>
        <div class="w-full bg-gray-900 border-t border-gray-700 text-[8px] text-gray-300 text-center break-all px-0.5 py-1 leading-tight flex-1 flex items-center justify-center pointer-events-none">
          ${item.name}
        </div>
        <div class="absolute inset-x-0 bottom-full mb-1 hidden group-hover:block bg-black/90 text-white text-[9px] p-1 rounded z-20 text-center whitespace-nowrap border border-gray-700 pointer-events-none z-30">${item.name}</div>
      </div>
    `;
  });
  html += '</div>';
  return html;
}

export function renderSkillTabHtml(p, isAutoBattle, autoSkillStates, jobs) {
  if (!p || !p.jobSkills) {
    return '<div class="text-xs text-gray-500 flex items-center justify-center h-full">覚えているスキルがありません</div>';
  }

  let skillListHtml = '';
  const learnedSkills = [];

  if (p.jobId && p.jobSkills[p.jobId]) {
    const jobId = p.jobId;
    const skillsMap = p.jobSkills[jobId];
    const jobDef = jobs[jobId];
    
    if (jobDef) {
      for (const [skillId, level] of Object.entries(skillsMap)) {
        if (level > 0) {
          const skillDef = jobDef.skills.find(s => s.id === skillId);
          if (skillDef && skillDef.type !== 'passive') {
            learnedSkills.push({ skillDef, level, jobId });
          }
        }
      }
    }
  }

  // Add inherited active skill
  if (p.inheritedActiveSkill && p.jobSkills) {
    const { jobId, skillId } = p.inheritedActiveSkill;
    if (jobId !== p.jobId) {
      const level = p.jobSkills[jobId] && p.jobSkills[jobId][skillId];
      if (level > 0) {
        const jobDef = jobs[jobId];
        if (jobDef) {
          const skillDef = jobDef.skills.find(s => s.id === skillId);
          if (skillDef && skillDef.type !== 'passive') {
            learnedSkills.push({ skillDef, level, jobId, isInherited: true });
          }
        }
      }
    }
  }

  // ジョブID、スキルIDの順でソートし、並び順を統一する
  learnedSkills.sort((a, b) => {
    if (a.jobId !== b.jobId) return a.jobId.localeCompare(b.jobId);
    return a.skillDef.id.localeCompare(b.skillDef.id);
  });

  if (learnedSkills.length === 0) {
    return '<div class="text-xs text-gray-500 flex items-center justify-center h-full">覚えているスキルがありません</div>';
  }

  skillListHtml += '<div class="flex flex-col gap-2 p-1.5">';
  learnedSkills.forEach(({ skillDef, level, isInherited }) => {
    const levelConfig = skillDef.levels.find(l => l.level === level) || skillDef.levels[skillDef.levels.length - 1];
    const isSilenced = levelConfig.mpCost > 0 && p.activeAilment && p.activeAilment.type === 'silence';
    const canCast = p.mp.current >= levelConfig.mpCost && !isSilenced;
    const desc = skillDef.getDescription ? skillDef.getDescription(levelConfig) : '';

    let typeLabel = '特殊';
    let typeBadgeClass = 'text-slate-300 bg-slate-800/80 border-slate-600/50';
    if (desc.includes('回復') || desc.includes('蘇生') || desc.includes('吸収')) {
      typeLabel = '回復'; typeBadgeClass = 'text-emerald-300 bg-emerald-950/60 border-emerald-800/50';
    } else if (desc.includes('アップ') || desc.includes('ダウン') || desc.includes('挑発') || desc.includes('庇う') || desc.includes('軽減') || desc.includes('状態異常')) {
      typeLabel = '補助'; typeBadgeClass = 'text-cyan-300 bg-cyan-950/60 border-cyan-800/50';
    } else if (skillDef.statDependency === 'BOTH' || desc.includes('複合攻撃')) {
      typeLabel = '複合'; typeBadgeClass = 'text-yellow-300 bg-yellow-950/60 border-yellow-800/50';
    } else if (skillDef.statDependency === 'MAT' || desc.includes('魔法攻撃')) {
      typeLabel = '魔法'; typeBadgeClass = 'text-purple-300 bg-purple-950/60 border-purple-800/50';
    } else if (skillDef.statDependency === 'ATK' || desc.includes('物理攻撃')) {
      typeLabel = '物理'; typeBadgeClass = 'text-orange-300 bg-orange-950/60 border-orange-800/50';
    }
    const typeBadgeHtml = `<div class="text-[9px] font-bold px-1 py-[1px] rounded border ${typeBadgeClass} ml-0.5 leading-none shadow-inner shrink-0">${typeLabel}</div>`;

    const autoEnabled = autoSkillStates[p.id]?.[skillDef.id] !== false;
    
    // Aesthetic states
    const grayscaleClass = (!canCast && !isAutoBattle) ? 'opacity-50 saturate-50 cursor-not-allowed' : '';
    
    // Core Card Design
    let btnClass = "skill-btn relative w-full flex items-stretch gap-2.5 p-2 border rounded-xl transition-all duration-300 group overflow-hidden ";
    
    let toggleHtml = '';
    
    if (isAutoBattle) {
      if (autoEnabled) {
        // Active Auto state: Glassmorphism blue/cyan, glowing borders
        btnClass += "bg-slate-900/60 backdrop-blur-md border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.1)] hover:border-cyan-400/80 hover:shadow-[0_0_25px_rgba(34,211,238,0.25)] hover:-translate-y-0.5 active:scale-[0.98] ";
        
        toggleHtml = `
          <div class="flex flex-col items-center justify-center pl-2 border-l border-cyan-500/20 shrink-0 min-w-[60px]">
            <span class="text-[9px] text-cyan-300 font-bold tracking-wider mb-0.5 uppercase drop-shadow-[0_0_2px_rgba(34,211,238,0.5)]">Auto</span>
            <div class="relative inline-flex h-4 w-8 shrink-0 items-center rounded-full bg-cyan-500 transition-colors ease-in-out duration-300 shadow-[0_0_10px_rgba(34,211,238,0.4)]">
              <span class="translate-x-4 inline-block h-3 w-3 transform rounded-full bg-white transition ease-in-out duration-300 shadow-sm"></span>
            </div>
          </div>
        `;
      } else {
        // Disabled Auto state: Muted glassmorphism
        btnClass += "bg-slate-900/40 backdrop-blur-md border-slate-700/50 opacity-80 hover:opacity-100 hover:border-slate-500/80 hover:-translate-y-0.5 active:scale-[0.98] ";
        
        toggleHtml = `
          <div class="flex flex-col items-center justify-center pl-2 border-l border-slate-700/50 shrink-0 min-w-[60px]">
            <span class="text-[9px] text-slate-500 font-bold tracking-wider mb-0.5 uppercase">Manual</span>
            <div class="relative inline-flex h-4 w-8 shrink-0 items-center rounded-full bg-slate-700 transition-colors ease-in-out duration-300">
              <span class="translate-x-1 inline-block h-3 w-3 transform rounded-full bg-slate-400 transition ease-in-out duration-300 shadow-sm"></span>
            </div>
          </div>
        `;
      }
    } else {
      // Manual battle state
      btnClass += "bg-slate-900/60 backdrop-blur-md border-slate-700/60 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:-translate-y-0.5 active:scale-[0.98] " + grayscaleClass;
    }

    // MP Cost Display
    let mpCostHtml = '';
    if (levelConfig.mpCost > 0) {
      if (canCast) {
        mpCostHtml = `
          <div class="flex flex-col items-end justify-center px-2 min-w-[50px]">
            <span class="text-[9px] text-cyan-400/80 font-bold tracking-wider uppercase mb-[1px]">MP</span>
            <span class="text-lg font-mono font-black text-cyan-100 drop-shadow-[0_0_5px_rgba(34,211,238,0.3)] leading-none">${levelConfig.mpCost}</span>
          </div>
        `;
      } else {
        mpCostHtml = `
          <div class="flex flex-col items-end justify-center px-2 min-w-[50px]">
            <span class="text-[9px] text-rose-500/80 font-bold tracking-wider uppercase mb-[1px]">MP</span>
            <span class="text-lg font-mono font-black text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.3)] leading-none">${levelConfig.mpCost}</span>
          </div>
        `;
      }
    } else {
      mpCostHtml = `
        <div class="flex flex-col items-end justify-center px-2 min-w-[50px]">
          <span class="text-[9px] text-slate-500/80 font-bold tracking-wider uppercase mb-[1px]">MP</span>
          <span class="text-lg font-mono font-black text-slate-400 leading-none">0</span>
        </div>
      `;
    }

    skillListHtml += `
      <button class="${btnClass}" data-skill-id="${skillDef.id}" data-level="${level}">
        <!-- Subtle background glow on hover -->
        <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <!-- Left: Icon -->
        <div class="flex items-center justify-center shrink-0 z-10">
          <div class="w-10 h-10 rounded-lg bg-slate-950/80 flex items-center justify-center border border-slate-700/80 shadow-inner group-hover:border-cyan-500/50 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all duration-300">
            <span class="material-symbols-outlined ${canCast ? 'text-cyan-400 drop-shadow-[0_0_3px_rgba(34,211,238,0.5)]' : 'text-slate-500'} text-[22px] group-hover:scale-110 transition-transform duration-300" style="font-variation-settings: 'FILL' 1">${skillDef.icon || 'star'}</span>
          </div>
        </div>
        
        <!-- Middle: Info -->
        <div class="flex flex-col text-left flex-1 min-w-0 justify-center z-10 py-0">
          <div class="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <div class="text-[13px] font-bold tracking-wide ${canCast ? 'text-slate-50' : 'text-slate-400'} leading-tight">
              ${skillDef.name}
            </div>
            <div class="${canCast ? 'text-cyan-400' : 'text-slate-500'} text-[9px] font-bold bg-slate-900/50 px-1 py-[1px] rounded border border-slate-700/50">Lv${level}</div>
            ${typeBadgeHtml}
            ${isInherited ? `<div class="text-[9px] font-black text-fuchsia-300 bg-fuchsia-900/30 border border-fuchsia-500/30 px-1 py-[1px] rounded uppercase tracking-wider">継承</div>` : ''}
          </div>
          <div class="text-[11px] ${canCast ? 'text-slate-300' : 'text-slate-500'} leading-tight whitespace-normal pr-1 opacity-90">${desc}</div>
        </div>

        <!-- Right: MP Cost & Auto Switch (Horizontal Layout) -->
        <div class="flex items-stretch justify-end shrink-0 z-10">
          ${mpCostHtml}
          ${toggleHtml}
        </div>
      </button>
    `;
  });
  skillListHtml += '</div>';

  return skillListHtml;
}
