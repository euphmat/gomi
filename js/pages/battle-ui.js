import { MEDAL_RANKS } from '../definitions/medal-definitions.js';
import { formatNumber } from '../utils/format.js';

export function getActiveStateIconsHTML(entity) {
  if (!entity) return '';
  const icons = [];
  
  if (entity.activeAilment) {
    const map = {
      poison: { icon: 'water_drop', color: 'text-purple-500', name: '毒' },
      burn: { icon: 'local_fire_department', color: 'text-red-500', name: '火傷' },
      paralysis: { icon: 'bolt', color: 'text-yellow-400', name: '麻痺' },
      sleep: { icon: 'snooze', color: 'text-blue-300', name: '睡眠' },
      blind: { icon: 'visibility_off', color: 'text-gray-400', name: '暗闇' },
      silence: { icon: 'volume_off', color: 'text-indigo-400', name: '沈黙' },
      curse: { icon: 'sentiment_very_dissatisfied', color: 'text-fuchsia-500', name: '呪い' },
      confusion: { icon: 'question_mark', color: 'text-pink-400', name: '混乱' }
    };
    const data = map[entity.activeAilment.type];
    if (data) icons.push(data);
  }

  if (entity._provokeTurns > 0) {
    icons.push({ icon: 'shield', color: 'text-amber-500', name: '挑発' });
  }

  if (entity.atkDebuffTurns > 0) {
    icons.push({ icon: 'trending_down', color: 'text-blue-400', name: '攻撃力ダウン' });
  }

  if (icons.length === 0) return '';

  return icons.map(data => 
    `<span class="material-symbols-outlined ${data.color} drop-shadow-md flex-shrink-0" style="font-size: 11px; font-variation-settings: 'FILL' 1" title="${data.name}">${data.icon}</span>`
  ).join('');
}

export function renderEnemyCardHtml(e, selectedEnemyTarget) {
  const isSelected = selectedEnemyTarget === e;
  const deadStyle = e.isDead ? 'min-width: 0px; max-width: 0px; opacity: 0; margin: 0; pointer-events: none;' : '';
  return `
    <div id="${e.elementId}" class="enemy-card relative flex flex-col items-center gap-0.5 flex-1 min-w-[2.5rem] max-w-[4rem] ${e.isDead ? '' : 'cursor-pointer hover:scale-105 transition-transform'}" style="${deadStyle}" data-id="${e.uniqueId}">
      <div class="relative w-full aspect-square ${isSelected ? 'drop-shadow-[0_0_8px_rgba(239,68,68,1)]' : 'drop-shadow-md'} ${e.isDead ? 'opacity-0' : ''} transition-all duration-300">
        <div class="state-icons-container absolute -top-1.5 -right-1.5 z-20 flex gap-0.5 pointer-events-auto">
          ${!e.isDead ? getActiveStateIconsHTML(e) : ''}
        </div>
        <img src="${e.image}" class="w-full h-full object-contain p-1 ${e.isLegendary ? 'animate-rainbow' : ''}" onerror="this.style.display='none'">
      </div>
      <div class="w-full relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50 shrink-0 ${e.isDead ? 'opacity-0' : ''}">
        <div class="bg-red-600 h-full w-full transition-transform duration-300 origin-left" style="transform: scaleX(${e.currentHp / e.maxHp})"></div>
        <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${formatNumber(Math.floor(e.currentHp))}/${formatNumber(e.maxHp)}</div>
      </div>
      <div class="w-full bg-gray-900 h-1.5 rounded overflow-hidden shadow-inner border border-gray-700/50 shrink-0 ${e.isDead ? 'opacity-0' : ''}">
        <div id="${e.elementId}-atb" class="bg-orange-500 h-full w-full origin-left" style="transform: scaleX(${e.atb / 1000}); will-change: transform; transition: transform 100ms linear;"></div>
      </div>
    </div>
  `;
}

export function renderPartyCardHtml(p, activeCharacter, isAutoBattle, selectedPartyMember) {
  let borderClass = 'border-gray-700';
  const disableAnimations = localStorage.getItem('disableBattleAnimations') === 'true';

  if (activeCharacter === p && !(isAutoBattle && disableAnimations)) {
    borderClass = 'border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]';
  } else if (isAutoBattle && selectedPartyMember === p) {
    borderClass = 'border-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]';
  }
  
  return `
    <div id="${p.elementId}" class="party-card relative flex flex-col bg-gray-800/80 rounded border ${borderClass} p-1 ${p.isDead ? 'opacity-40 grayscale' : 'transition-all cursor-pointer hover:scale-[1.02]'}">
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
            <div class="bg-red-600 h-full w-full transition-transform duration-300 origin-left" style="transform: scaleX(${p.hp.current / (p.stats.hp || p.hp.max)})"></div>
            <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${formatNumber(Math.floor(p.hp.current))}/${formatNumber(p.stats.hp || p.hp.max)}</div>
          </div>
        </div>
        <div class="flex items-center gap-0.5">
          <span class="text-[9px] font-bold text-blue-400 w-3.5">MP</span>
          <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
            <div class="bg-blue-600 h-full w-full transition-transform duration-300 origin-left" style="transform: scaleX(${p.mp.current / (p.stats.mp || p.mp.max)})"></div>
            <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${formatNumber(Math.floor(p.mp.current))}/${formatNumber(p.stats.mp || p.mp.max)}</div>
          </div>
        </div>
        <div class="flex items-center gap-0.5">
          <span class="text-[9px] font-bold text-green-400 w-3.5">EX</span>
          <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
            <div class="bg-green-600 h-full w-full transition-transform duration-300 origin-left" style="transform: scaleX(${p.exp.current / p.exp.max})"></div>
            <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${formatNumber(Math.floor(p.exp.current))}/${formatNumber(p.exp.max)}</div>
          </div>
        </div>
        <div class="flex items-center gap-0.5">
          <span class="text-[9px] font-bold text-purple-400 w-3.5">JP</span>
          <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
            <div class="bg-purple-600 h-full w-full transition-transform duration-300 origin-left" style="transform: scaleX(${p.jp.current / p.jp.max})"></div>
            <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${formatNumber(Math.floor(p.jp.current))}/${formatNumber(p.jp.max)}</div>
          </div>
        </div>
      </div>

      <div class="battle-stats-container flex flex-col gap-[1px] text-[9px] text-gray-400 mt-auto leading-tight w-full px-0.5 pb-0.5 ${localStorage.getItem('hideBattleStats') !== 'false' ? 'hidden' : ''}">
        <div class="stat-row-atk flex justify-between items-center ${p._atkBuffTurns > 0 || p._passiveAtkBuffPercent > 0 ? 'bg-red-900/40 border-red-500/50' : 'bg-gray-900/40 border-transparent'} border rounded px-1 py-0.5 transition-colors">
          <div class="flex items-center gap-[3px]"><span class="stat-icon-atk material-symbols-outlined ${p._atkBuffTurns > 0 || p._passiveAtkBuffPercent > 0 ? 'text-red-400' : 'text-slate-400'}" style="font-size: 10px; font-variation-settings: 'FILL' 1">swords</span><span class="stat-label-atk font-bold tracking-wider ${p._atkBuffTurns > 0 || p._passiveAtkBuffPercent > 0 ? 'text-red-400' : ''}">ATK</span></div>
          <span class="stat-val-atk ${p._atkBuffTurns > 0 || p._passiveAtkBuffPercent > 0 ? 'text-red-400' : 'text-gray-100'} font-black drop-shadow-md">${formatNumber(p._atkBuffTurns > 0 || p._passiveAtkBuffPercent > 0 ? Math.floor(p.stats.atk * (1 + ((p._passiveAtkBuffPercent || 0) + (p._atkBuffTurns > 0 ? (p._atkBuffPercent || 0) : 0)) / 100)) : p.stats.atk)}</span>
        </div>
        <div class="stat-row-def flex justify-between items-center ${p._defBuffTurns > 0 || p._passiveDefBuffPercent > 0 ? 'bg-green-900/40 border-green-500/50' : 'bg-gray-900/40 border-transparent'} border rounded px-1 py-0.5 transition-colors">
          <div class="flex items-center gap-[3px]"><span class="stat-icon-def material-symbols-outlined ${p._defBuffTurns > 0 || p._passiveDefBuffPercent > 0 ? 'text-green-400' : 'text-slate-400'}" style="font-size: 10px; font-variation-settings: 'FILL' 1">shield</span><span class="stat-label-def font-bold tracking-wider ${p._defBuffTurns > 0 || p._passiveDefBuffPercent > 0 ? 'text-green-400' : ''}">DEF</span></div>
          <span class="stat-val-def ${p._defBuffTurns > 0 || p._passiveDefBuffPercent > 0 ? 'text-green-400' : 'text-gray-100'} font-black drop-shadow-md">${formatNumber(p._defBuffTurns > 0 || p._passiveDefBuffPercent > 0 ? Math.floor(p.stats.def * (1 + ((p._passiveDefBuffPercent || 0) + (p._defBuffTurns > 0 ? (p._defBuffPercent || 0) : 0)) / 100)) : p.stats.def)}</span>
        </div>
        <div class="stat-row-mat flex justify-between items-center ${p._matkBuffTurns > 0 || p._passiveMatkBuffPercent > 0 ? 'bg-purple-900/40 border-purple-500/50' : 'bg-gray-900/40 border-transparent'} border rounded px-1 py-0.5 transition-colors">
          <div class="flex items-center gap-[3px]"><span class="stat-icon-mat material-symbols-outlined ${p._matkBuffTurns > 0 || p._passiveMatkBuffPercent > 0 ? 'text-purple-400' : 'text-slate-400'}" style="font-size: 10px; font-variation-settings: 'FILL' 1">auto_awesome</span><span class="stat-label-mat font-bold tracking-wider ${p._matkBuffTurns > 0 || p._passiveMatkBuffPercent > 0 ? 'text-purple-400' : ''}">MAT</span></div>
          <span class="stat-val-mat ${p._matkBuffTurns > 0 || p._passiveMatkBuffPercent > 0 ? 'text-purple-400' : 'text-gray-100'} font-black drop-shadow-md">${formatNumber(p._matkBuffTurns > 0 || p._passiveMatkBuffPercent > 0 ? Math.floor(p.stats.matk * (1 + ((p._passiveMatkBuffPercent || 0) + (p._matkBuffTurns > 0 ? (p._matkBuffPercent || 0) : 0)) / 100)) : p.stats.matk)}</span>
        </div>
        <div class="stat-row-mdf flex justify-between items-center ${p._mdefBuffTurns > 0 || p._passiveMdefBuffAmount > 0 ? 'bg-indigo-900/40 border-indigo-500/50' : 'bg-gray-900/40 border-transparent'} border rounded px-1 py-0.5 transition-colors">
          <div class="flex items-center gap-[3px]"><span class="stat-icon-mdf material-symbols-outlined ${p._mdefBuffTurns > 0 || p._passiveMdefBuffAmount > 0 ? 'text-indigo-300' : 'text-indigo-400'}" style="font-size: 10px; font-variation-settings: 'FILL' 1">security</span><span class="stat-label-mdf font-bold tracking-wider ${p._mdefBuffTurns > 0 || p._passiveMdefBuffAmount > 0 ? 'text-indigo-300' : ''}">MDF</span></div>
          <span class="stat-val-mdf ${p._mdefBuffTurns > 0 || p._passiveMdefBuffAmount > 0 ? 'text-indigo-300' : 'text-gray-100'} font-black drop-shadow-md">${formatNumber(p._mdefBuffTurns > 0 || p._passiveMdefBuffAmount > 0 ? p.stats.mdef + (p._passiveMdefBuffAmount || 0) + (p._mdefBuffTurns > 0 ? (p._mdefBuffAmount || 0) : 0) : p.stats.mdef)}</span>
        </div>
        <div class="stat-row-spd flex justify-between items-center bg-gray-900/40 border border-transparent rounded px-1 py-0.5 transition-colors">
          <div class="flex items-center gap-[3px]"><span class="stat-icon-spd material-symbols-outlined text-yellow-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">directions_run</span><span class="stat-label-spd font-bold tracking-wider">SPD</span></div>
          <span class="stat-val-spd text-gray-100 font-black drop-shadow-md">${formatNumber(p.stats.spd)}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderInfoTabHtml(targetEntity, isParty, equipMap, currentFloorNum, materials, monsterKills, ranchData = {}, playerMedals = {}) {
  if (!targetEntity) {
    return '<div class="text-xs text-gray-500 flex items-center justify-center h-full" style="font-family: system-ui, -apple-system, sans-serif;">対象が選択されていません</div>';
  }

  let html = '';
  const kills = (monsterKills && targetEntity.id) ? (monsterKills[targetEntity.id] || 0) : 0;
  const bonus = Math.floor(kills / 100) * 0.1;
  const medalRankIndex = (playerMedals && targetEntity.id && playerMedals[targetEntity.id] !== undefined) ? playerMedals[targetEntity.id] : -1;

  let dropsHtml = '';
  if (targetEntity.drops && targetEntity.drops.length > 0) {
    dropsHtml = targetEntity.drops.map(d => {
      const mat = materials.find(m => m.id === d.itemId);
      const itemName = mat ? mat.name : d.itemId;
      const itemImg = mat && mat.image 
        ? `<img src="${mat.image}" class="w-5 h-5 object-contain shrink-0 drop-shadow-sm">` 
        : `<span class="material-symbols-outlined text-slate-500 text-[14px] shrink-0">category</span>`;
      
      let badgeClass = '';
      const rate = targetEntity.isLegendary ? 100 : parseFloat(d.rate) + bonus;
      if (rate <= 0.1) {
        badgeClass = 'bg-amber-950/80 text-amber-400 border border-amber-500/40 shadow-[0_0_6px_rgba(245,158,11,0.2)]';
      } else if (rate <= 2.0) {
        badgeClass = 'bg-purple-950/80 text-purple-400 border border-purple-500/45 shadow-[0_0_6px_rgba(168,85,247,0.2)]';
      } else {
        badgeClass = 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40';
      }

      const rateStr = rate.toFixed(2).replace(/\.?0+$/, '');

      return `
        <div class="flex justify-between items-center bg-slate-950/40 p-1.5 rounded border border-slate-850/50 hover:bg-slate-850/20 hover:border-slate-800 transition-all gap-1">
          <div class="flex items-center gap-1.5 min-w-0 flex-1">
            <div class="w-6 h-6 rounded bg-slate-950 flex items-center justify-center border border-slate-800 shrink-0">
              ${itemImg}
            </div>
            <span class="text-slate-200 text-[9.5px] font-black leading-tight break-words">${itemName}</span>
          </div>
          <span class="${badgeClass} px-1.5 py-0.5 rounded text-[8px] font-black shrink-0 tracking-wider">${rateStr}%</span>
        </div>`;
    }).join('');
  } else {
    dropsHtml = '<div class="text-slate-500 text-center py-4 text-[10px] italic">ドロップ情報なし</div>';
  }

  const hpPct = targetEntity.maxHp > 0 ? (targetEntity.currentHp / targetEntity.maxHp) * 100 : 0;

  let actionsHtml = '';
  if (targetEntity.actions && targetEntity.actions.length > 0) {
    actionsHtml = targetEntity.actions.map(a => {
      const desc = a.description || '特殊な行動を行います。';
      return `
        <div class="flex flex-col bg-slate-950/40 border border-slate-850/50 px-1.5 py-1 rounded gap-0.5">
          <div class="flex justify-between items-center">
            <span class="text-[9.5px] font-bold text-slate-200 truncate flex-1">${a.name}</span>
            <span class="text-[8px] font-bold text-blue-400 bg-blue-900/30 px-1 rounded border border-blue-800/50 shrink-0 ml-1">${a.chance}%</span>
          </div>
          <div class="text-[8.5px] text-slate-400 leading-tight">
            ${desc}
          </div>
        </div>
      `;
    }).join('');
  } else {
    actionsHtml = '<div class="text-slate-500 text-center py-2 text-[9px] italic">通常攻撃のみ</div>';
  }

  let capturePanelHtml = '';
  if (!isParty && targetEntity && targetEntity.id) {
    let isNormalCaptured = false;
    let isLegendaryCaptured = false;
    for (const dId of Object.keys(ranchData)) {
      if (ranchData[dId] && ranchData[dId][targetEntity.id]) isNormalCaptured = true;
      if (ranchData[dId] && ranchData[dId][`${targetEntity.id}_legendary`]) isLegendaryCaptured = true;
    }

    let normalBadgeHtml = '';
    if (isNormalCaptured) {
      normalBadgeHtml = `<span class="bg-pink-900/80 text-pink-300 border border-pink-500/50 px-1.5 py-0.5 rounded text-[8px] font-black shrink-0">捕獲済み</span>`;
    } else {
      const captureRate = Math.min(1.0, 0.0001 + Math.floor(kills / 100) * 0.0001);
      const pctStr = (captureRate * 100).toFixed(3).replace(/\.?0+$/, '') + '%';
      normalBadgeHtml = `<span class="bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded text-[8px] font-black shrink-0 tracking-wider">${pctStr}</span>`;
    }

    const legAppRate = Math.min(1.0, 0.00001 + Math.floor(kills / 100) * 0.00001);
    const legAppPctStr = (legAppRate * 100).toFixed(3).replace(/\.?0+$/, '') + '%';
    const legAppBadgeHtml = `<span class="bg-yellow-950/80 text-yellow-400 border border-yellow-500/40 px-1.5 py-0.5 rounded text-[8px] font-black shrink-0 tracking-wider">${legAppPctStr}</span>`;

    let legCapBadgeHtml = '';
    if (isLegendaryCaptured) {
      legCapBadgeHtml = `<span class="bg-pink-900/80 text-pink-300 border border-pink-500/50 px-1.5 py-0.5 rounded text-[8px] font-black shrink-0">捕獲済み</span>`;
    } else {
      const legCapRate = Math.min(1.0, 0.0001 + Math.floor(kills / 100) * 0.0001);
      const legCapPctStr = (legCapRate * 100).toFixed(3).replace(/\.?0+$/, '') + '%';
      legCapBadgeHtml = `<span class="bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded text-[8px] font-black shrink-0 tracking-wider">${legCapPctStr}</span>`;
    }

    capturePanelHtml = `
      <div class="bg-slate-900/60 p-2 rounded-lg border border-slate-700/60 flex flex-col gap-1.5 shadow-inner shrink-0">
        <div class="text-slate-400 text-[10px] font-black tracking-wider border-b border-slate-700/80 pb-1 mb-0.5 flex items-center gap-1 shrink-0">
          <span class="material-symbols-outlined text-[12px] text-pink-400">pets</span>牧場
        </div>
        <div class="text-slate-400 text-[10px] font-black tracking-wider flex items-center justify-between">
          <div class="flex items-center gap-1"><span class="material-symbols-outlined text-[12px] text-yellow-400">auto_awesome</span>伝説出現率</div>
          ${legAppBadgeHtml}
        </div>
        <div class="text-slate-400 text-[10px] font-black tracking-wider flex items-center justify-between">
          <div class="flex items-center gap-1"><span class="material-symbols-outlined text-[12px] text-pink-400">pets</span>捕獲率</div>
          ${normalBadgeHtml}
        </div>
        <div class="text-slate-400 text-[10px] font-black tracking-wider flex items-center justify-between">
          <div class="flex items-center gap-1"><span class="material-symbols-outlined text-[12px] text-pink-400">pets</span>伝説捕獲率</div>
          ${legCapBadgeHtml}
        </div>
      </div>
    `;
  }

  const medal = medalRankIndex >= 0 ? MEDAL_RANKS[medalRankIndex] : {
    name: '未作成',
    killBonus: 0,
    rewardMultiplier: 1.0,
    color: '#64748b'
  };

  const medalPanelHtml = `
    <div class="bg-slate-900/60 p-2 rounded-lg border border-slate-700/60 flex flex-col gap-1 shadow-inner shrink-0 relative overflow-hidden">
      <div class="absolute inset-0 opacity-10 pointer-events-none" style="background: ${medal.color}"></div>
      <div class="text-slate-400 text-[10px] font-black tracking-wider border-b border-slate-700/80 pb-1 mb-0.5 flex items-center justify-between shrink-0 relative z-10">
        <div class="flex items-center gap-1">
          <span class="material-symbols-outlined text-[12px] text-amber-400">military_tech</span>メダル効果
        </div>
        <span class="text-[9px] px-1.5 py-0.5 rounded border bg-black/40" style="color: ${medal.color}; border-color: ${medal.color}50">${medal.name}</span>
      </div>
      <div class="flex items-center justify-between relative z-10">
        <span class="text-[9px] font-bold text-slate-300">討伐ボーナス</span>
        <span class="text-[10px] font-black text-emerald-400">+${medal.killBonus}</span>
      </div>
      <div class="flex items-center justify-between relative z-10">
        <span class="text-[9px] font-bold text-slate-300">報酬 (EXP/JP/G)</span>
        <span class="text-[10px] font-black text-yellow-400">${medal.rewardMultiplier.toFixed(1)}倍</span>
      </div>
    </div>
  `;

  html = `
    <div class="h-full overflow-y-auto p-2 text-slate-300 flex flex-col gap-2.5 custom-scrollbar relative" style="font-family: system-ui, -apple-system, sans-serif;">
      <!-- Background Glow Effect -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-28 bg-red-500/15 rounded-full blur-xl pointer-events-none z-0"></div>
      
      <div class="flex flex-col gap-2 pb-2 border-b border-slate-700/80 shrink-0 relative z-10">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-lg bg-slate-950 border-2 border-red-500/50 overflow-hidden shrink-0 flex items-center justify-center p-1 shadow-[0_0_12px_rgba(239,68,68,0.2)]">
            <img src="${targetEntity.image}" class="w-full h-full object-contain drop-shadow-md" onerror="this.style.display='none'">
          </div>
          <div class="flex flex-col flex-1 justify-center min-w-0">
            <div class="flex items-center gap-2 mb-1 overflow-hidden">
              <span class="font-black text-red-400 text-sm tracking-wide truncate drop-shadow shrink-0">${targetEntity.name}</span>
              <span class="text-red-300 text-[10px] font-black bg-red-950/60 border border-red-900/60 px-2 py-0.5 rounded-full shrink-0 tracking-wider">討伐: ${formatNumber(kills)}</span>
            </div>
            <!-- Status Badges -->
            <div class="flex flex-wrap gap-1 mt-0.5">
              <div class="flex items-center gap-0.5 bg-slate-950/60 border border-slate-800 px-1 rounded text-[8px]" title="HP">
                 <span class="text-red-400 font-bold">HP</span><span class="text-slate-200">${targetEntity.stats?.hp || 0}</span>
              </div>
              <div class="flex items-center gap-0.5 bg-slate-950/60 border border-slate-800 px-1 rounded text-[8px]" title="ATK">
                 <span class="text-red-450 font-bold">ATK</span><span class="text-slate-200">${targetEntity.stats?.atk || 0}</span>
              </div>
              <div class="flex items-center gap-0.5 bg-slate-950/60 border border-slate-800 px-1 rounded text-[8px]" title="DEF">
                 <span class="text-slate-450 font-bold">DEF</span><span class="text-slate-200">${targetEntity.stats?.def || 0}</span>
              </div>
              <div class="flex items-center gap-0.5 bg-slate-950/60 border border-slate-800 px-1 rounded text-[8px]" title="MATK">
                 <span class="text-purple-400 font-bold">MAT</span><span class="text-slate-200">${targetEntity.stats?.matk || 0}</span>
              </div>
              <div class="flex items-center gap-0.5 bg-slate-950/60 border border-slate-800 px-1 rounded text-[8px]" title="MDEF">
                 <span class="text-indigo-400 font-bold">MDF</span><span class="text-slate-200">${targetEntity.stats?.mdef || 0}</span>
              </div>
              <div class="flex items-center gap-0.5 bg-slate-950/60 border border-slate-800 px-1 rounded text-[8px]" title="SPD">
                 <span class="text-amber-400 font-bold">SPD</span><span class="text-slate-200">${targetEntity.stats?.spd || 0}</span>
              </div>
              <!-- Rewards -->
              <div class="flex items-center gap-0.5 bg-slate-950/60 border border-emerald-900/50 px-1 rounded text-[8px]" title="EXP">
                 <span class="text-emerald-400 font-bold">EXP</span><span class="text-slate-200">${targetEntity.rewards?.exp || 0}</span>
              </div>
              <div class="flex items-center gap-0.5 bg-slate-950/60 border border-purple-900/50 px-1 rounded text-[8px]" title="JP">
                 <span class="text-purple-400 font-bold">JP</span><span class="text-slate-200">${targetEntity.rewards?.jp || 0}</span>
              </div>
              <div class="flex items-center gap-0.5 bg-slate-950/60 border border-amber-900/50 px-1 rounded text-[8px]" title="GOLD">
                 <span class="text-amber-500 font-bold">G</span><span class="text-slate-200">${targetEntity.rewards?.gold || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-2 min-h-0 flex-1 relative z-10">
        <!-- Left Column: Actions + Capture -->
        <div class="flex flex-col gap-2 min-h-0 flex-1">
          <!-- Actions -->
          <div class="bg-slate-900/60 p-2 rounded-lg border border-slate-700/60 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar shadow-inner flex-1 min-h-0">
            <div class="text-slate-400 text-[10px] font-black tracking-wider border-b border-slate-700/80 pb-1 mb-0.5 flex items-center gap-1 shrink-0">
              <span class="material-symbols-outlined text-[12px] text-blue-400">psychology</span>行動パターン
            </div>
            <div class="flex flex-col gap-1 pb-1">
              ${actionsHtml}
            </div>
          </div>
          ${capturePanelHtml}
        </div>
        <!-- Right Column: Drops -->
        <div class="flex flex-col gap-2 min-h-0 flex-1">
          <!-- Drop Info -->
          <div class="bg-slate-900/60 p-2 rounded-lg border border-slate-700/60 flex flex-col min-h-0 shadow-inner flex-1">
            <div class="text-slate-400 text-[10px] font-black tracking-wider border-b border-slate-700/80 pb-1 mb-1 flex items-center gap-1 shrink-0">
              <span class="material-symbols-outlined text-[12px] text-red-400">shopping_bag</span>ドロップ
            </div>
            <div class="flex-1 overflow-y-auto custom-scrollbar pr-0.5 flex flex-col gap-1.5">
              ${dropsHtml}
            </div>
          </div>
          ${medalPanelHtml}
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
      <div class="item-card relative w-full h-full bg-gray-800 border border-gray-600 rounded flex flex-col group hover:border-amber-400 hover:bg-gray-700 transition-all overflow-hidden cursor-pointer active:scale-95" data-item-id="${item.id}">
        <div class="relative w-full aspect-square p-1 shrink-0">
          <img src="${item.image}" class="w-full h-full object-contain drop-shadow-md pointer-events-none" onerror="this.style.display='none'">
          <div class="absolute bottom-0 right-0 bg-black/80 text-[8px] text-white font-bold px-1 rounded-tl shadow-sm z-10 pointer-events-none">x${formatNumber(item.quantity)}</div>
        </div>
        <div class="w-full bg-gray-900 border-t border-gray-700 text-[8px] text-gray-300 text-center break-all px-0.5 py-1 leading-tight flex-1 flex items-center justify-center pointer-events-none">
          ${item.name}
        </div>
        <div class="absolute inset-x-0 bottom-full mb-1 hidden group-hover:block bg-black/90 text-white text-[9px] p-1 rounded z-20 text-center whitespace-nowrap border border-gray-700 pointer-events-none z-30">${item.name}</div>
        <div class="absolute inset-0 bg-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none flex items-center justify-center">
          <span class="text-[10px] font-bold text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,1)] bg-black/60 px-1.5 py-0.5 rounded border border-amber-500/50">売却</span>
        </div>
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

  skillListHtml += '<div class="grid grid-cols-2 gap-1.5">';
  learnedSkills.forEach(({ skillDef, level, isInherited }) => {
    const levelConfig = skillDef.levels.find(l => l.level === level) || skillDef.levels[skillDef.levels.length - 1];
    const isSilenced = levelConfig.mpCost > 0 && p.activeAilment && p.activeAilment.type === 'silence';
    const canCast = p.mp.current >= levelConfig.mpCost && !isSilenced;
    const desc = skillDef.getDescription ? skillDef.getDescription(levelConfig) : '';

    const autoEnabled = autoSkillStates[p.id]?.[skillDef.id] !== false;
    
    const grayscaleClass = (!canCast && !isAutoBattle) ? 'grayscale opacity-60 cursor-not-allowed' : '';
    
    let btnClass = "skill-btn relative w-full flex items-center gap-1.5 p-1.5 border rounded-lg transition-all group overflow-hidden ";
    if (isAutoBattle) {
      if (autoEnabled) {
        btnClass += "bg-gradient-to-r from-blue-900/30 to-blue-800/10 border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.15)] hover:border-blue-400 hover:shadow-[0_0_8px_rgba(59,130,246,0.3)] active:scale-[0.98]";
      } else {
        btnClass += "bg-gray-900 border-gray-800 opacity-40 grayscale hover:opacity-60 hover:border-gray-600 cursor-pointer";
      }
    } else {
      btnClass += "bg-gradient-to-r from-gray-800 to-gray-800/50 border-gray-600 hover:border-green-400 hover:shadow-[0_0_8px_rgba(74,222,128,0.15)] active:scale-[0.98] " + grayscaleClass;
    }

    skillListHtml += `
      <button class="${btnClass}" data-skill-id="${skillDef.id}" data-level="${level}">
        <div class="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div class="w-8 h-8 rounded bg-gray-900 flex items-center justify-center border border-gray-700 shrink-0 shadow-inner group-hover:border-green-500/40 transition-colors z-10">
          <span class="material-symbols-outlined ${canCast ? 'text-green-400' : 'text-gray-500'} text-[18px] group-hover:scale-110 transition-transform" style="font-variation-settings: 'FILL' 1">${skillDef.icon || 'star'}</span>
        </div>
        <div class="flex flex-col text-left flex-1 min-w-0 z-10">
          <div class="flex justify-between items-center mb-0.5">
            <div class="text-[10px] font-bold ${canCast ? 'text-gray-100' : 'text-gray-400'} truncate pr-1">
              ${skillDef.name} 
              <span class="${canCast ? 'text-green-400' : 'text-gray-500'} text-[9px] ml-0.5">Lv${level}</span>
              ${isInherited ? `<span class="text-[8px] font-black text-indigo-300 bg-indigo-900/40 border border-indigo-700/50 px-1 py-[1px] rounded ml-1">継承</span>` : ''}
            </div>
            ${levelConfig.mpCost > 0 ? `<div class="text-[9px] font-bold ${canCast ? 'text-blue-300 bg-blue-900/40 border-blue-700/50' : 'text-red-400 bg-red-900/20 border-red-900/50'} px-1 py-[1px] rounded border shadow-inner shrink-0">${canCast ? `MP ${levelConfig.mpCost}` : 'MP不足'}</div>` : ''}
          </div>
          <div class="text-[9px] text-gray-400 leading-none truncate">${desc}</div>
        </div>
      </button>
    `;
  });
  skillListHtml += '</div>';

  return skillListHtml;
}
