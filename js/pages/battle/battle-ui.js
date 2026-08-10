import { formatNumber } from '../../utils/format.js';
import { resolveJobSkillLevelConfig } from '../../utils/job-skill-potency.js';
import { getEffectiveMedalEquipmentMpCost } from '../../utils/medal-equipment-effects.js';
import { renderJobResourceHtml } from './job-resource-ui.js';

/**
 * HP バー内のバリア表示モデル。
 * HP の赤い残量とは合算せず、細いラインだけを最大 HP 比で描画する。
 */
export function getBarrierUiState(entity, maxHp) {
  const rawAmount = Number(entity?._barrierHp);
  const amount = Number.isFinite(rawAmount) ? Math.max(0, Math.floor(rawAmount)) : 0;
  const rawMaxHp = Number(maxHp);
  const safeMaxHp = Number.isFinite(rawMaxHp) && rawMaxHp > 0 ? rawMaxHp : 1;
  const rawPercent = amount > 0 ? (amount / safeMaxHp) * 100 : 0;
  // 100%をわずかに超えた場合も「100%」と誤表示しない。
  const percent = amount > safeMaxHp ? Math.ceil(rawPercent) : Math.round(rawPercent);

  return {
    amount,
    percent,
    fillPercent: Math.min(100, rawPercent),
    isActive: amount > 0,
    isOverflow: amount > safeMaxHp,
    valueText: amount > 0 ? `${formatNumber(amount)} · ${percent}%` : 'なし',
    compactText: amount > 0 ? formatNumber(amount) : '—',
    ariaLabel: amount > 0
      ? `バリア残量 ${formatNumber(amount)}、最大HPの${percent}パーセント`
      : 'バリアなし'
  };
}

function renderBarrierIndicatorHtml(entity, maxHp, { fastMode = false } = {}) {
  const barrier = getBarrierUiState(entity, maxHp);
  const transitionStyle = fastMode ? '' : 'transition: transform 0.3s ease;';
  const frameTheme = barrier.isActive
    ? (barrier.isOverflow ? 'inline-flex border-violet-300/80 bg-violet-950/95 text-violet-50' : 'inline-flex border-cyan-300/80 bg-cyan-950/95 text-cyan-50')
    : 'hidden border-cyan-300/80 bg-cyan-950/95 text-cyan-50';
  const fillTheme = barrier.isOverflow
    ? 'bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400'
    : 'bg-gradient-to-r from-cyan-500 to-blue-400';

  return `
    <div class="barrier-meter pointer-events-none absolute bottom-0 left-0 z-10 h-[2px] w-full origin-left ${fillTheme} ${barrier.isActive ? 'opacity-100' : 'opacity-0'}" style="transform: scaleX(${barrier.fillPercent / 100}); ${transitionStyle}" aria-hidden="true"></div>
    <div class="barrier-indicator absolute right-px top-1/2 z-30 max-w-[45%] -translate-y-1/2 items-center gap-px overflow-hidden rounded-sm border px-px leading-none shadow-[0_0_5px_rgba(34,211,238,0.45)] ${frameTheme}" role="meter" title="${barrier.ariaLabel}" aria-label="${barrier.ariaLabel}" aria-valuemin="0" aria-valuemax="${Math.max(1, Math.floor(maxHp || 1), barrier.amount)}" aria-valuenow="${barrier.amount}">
      <span class="material-symbols-outlined shrink-0 leading-none" style="font-size: 8px; font-variation-settings: 'FILL' 1" aria-hidden="true">shield</span>
      <span class="barrier-text truncate text-[7px] font-black tabular-nums">${barrier.compactText}</span>
    </div>`;
}

export function getActiveStateIconsHTML(entity) {
  if (!entity) return '';
  const icons = [];
  
  if (entity.activeAilment) {
    const AILMENTS = {
      poison: { icon: 'skull', color: 'text-purple-500', name: '毒' },
      burn: { icon: 'mode_heat', color: 'text-red-500', name: '火傷' },
      paralysis: { icon: 'flash_off', color: 'text-yellow-400', name: '麻痺' },
      freeze: { icon: 'ac_unit', color: 'text-cyan-200', name: '凍結' },
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

  if (entity._guardianCoverTurns > 0) {
    icons.push({ icon: 'shield_lock', color: 'text-cyan-200', name: '守護者の誓約' });
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

  if (entity._manaFlowTurns && entity._manaFlowTurns > 0) {
    icons.push({ icon: 'all_inclusive', color: 'text-cyan-300', name: 'マナフロー' });
  }

  if (entity._barrierHp && entity._barrierHp > 0) {
    icons.push({ icon: 'shield', color: 'text-cyan-300', name: `バリア ${formatNumber(Math.floor(entity._barrierHp))}` });
  }

  if (icons.length === 0) return '';

  return icons.map(data => 
    `<span class="material-symbols-outlined inline-flex h-[11px] w-[11px] flex-shrink-0 items-center justify-center leading-none ${data.color} drop-shadow-md" style="font-size: 11px; font-variation-settings: 'FILL' 1" role="img" aria-label="${data.name}">${data.icon}</span>`
  ).join('');
}

export function renderEnemyCardHtml(e, selectedEnemyTarget) {
  const isSelected = selectedEnemyTarget === e;
  const fastMode = cachedBattleSpeed >= 5;
  const transitionClass = fastMode ? '' : 'transition-transform';
  const deadStyle = e.isDead ? 'min-width: 0px; max-width: 0px; opacity: 0; margin: 0 -0.125rem; pointer-events: none;' : '';
  const maxHp = Math.max(1, e.maxHp || 1);
  return `
    <div id="${e.elementId}" class="enemy-card relative flex flex-col items-center gap-0.5 flex-1 min-w-[2.5rem] max-w-[4rem] ${e.isDead ? '' : `cursor-pointer active:scale-105 ${transitionClass}`}" style="${deadStyle}" data-id="${e.uniqueId}">
      <div class="relative w-full aspect-square ${isSelected ? 'drop-shadow-[0_0_8px_rgba(239,68,68,1)]' : 'drop-shadow-md'} ${e.isDead ? 'opacity-0' : ''}" style="${fastMode ? '' : 'transition: filter 0.3s ease;'}">
        <div class="state-icons-container absolute -top-1.5 -right-1.5 z-20 flex gap-0.5 pointer-events-auto">
          ${!e.isDead ? getActiveStateIconsHTML(e) : ''}
        </div>
        <img src="${e.image}" class="w-full h-full object-contain p-1 ${e.isLegendary ? 'animate-rainbow' : ''}" onerror="this.style.display='none'">
      </div>
      <div class="enemy-hp-container w-full relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50 shrink-0 ${e.isDead ? 'opacity-0' : ''}">
        <div class="absolute bg-red-600" style="left: 0; top: 0; bottom: 0; width: ${Math.min(100, (e.currentHp / maxHp) * 100)}%; ${fastMode ? '' : 'transition: width 0.3s ease;'}"></div>
        ${renderBarrierIndicatorHtml(e, maxHp, { fastMode })}
        <div class="hp-text absolute inset-0 z-20 flex items-center ${e._barrierHp > 0 ? 'justify-start pl-0.5 pr-[45%]' : 'justify-center'} overflow-hidden text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter whitespace-nowrap">
          <span class="hp-value truncate">${e.isDead ? '撃破' : `${formatNumber(Math.floor(e.currentHp))}/${formatNumber(e.maxHp)}`}</span>
        </div>
      </div>
      <div class="enemy-atb-container w-full bg-gray-900 h-1.5 rounded overflow-hidden shadow-inner border border-gray-700/50 shrink-0 ${e.isDead ? 'opacity-0' : ''}">
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
      freeze: 'bg-cyan-950/80',
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
  const barTransStyle = fastMode ? '' : 'transition: transform 0.3s ease;';
  const maxHp = Math.max(1, p.stats.hp || p.hp.max || 1);

  return `
    <div id="${p.elementId}" class="party-card relative flex min-w-0 flex-col overflow-hidden ${bgClass} rounded-md border ${borderClass} p-1 ${p.isDead ? 'opacity-40 grayscale' : `${transClass} cursor-pointer active:scale-[1.02]`}" aria-label="${p.name} レベル${p.level || 1}">
      <!-- Identity and turn gauge -->
      <div class="flex min-w-0 items-center gap-1 mb-1">
        <div class="w-8 h-8 rounded border border-gray-600/80 overflow-hidden shadow bg-gray-800 shrink-0">
          <img src="${p.iconImage}" class="w-full h-full object-cover" onerror="this.style.display='none'">
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex h-[11px] min-w-0 shrink-0 items-center gap-0.5 leading-none">
            <span class="truncate text-[9px] font-bold text-gray-100 drop-shadow">${p.name}</span>
            <div class="state-icons-container ml-auto flex h-[11px] shrink-0 items-center gap-px leading-none pointer-events-auto">
              ${!p.isDead ? getActiveStateIconsHTML(p) : ''}
            </div>
          </div>
          <div class="mt-0.5 grid grid-cols-3 gap-0.5 overflow-hidden whitespace-nowrap">
            <span class="flex min-w-0 flex-col items-center rounded-[3px] border border-cyan-400/40 bg-cyan-950/70 py-px leading-none shadow-inner">
              <span class="text-[8px] font-bold text-cyan-300">LV</span>
              <span class="${p.elementId}-lv mt-px text-[11px] font-black tabular-nums text-white drop-shadow">${p.level || 1}</span>
            </span>
            <span class="flex min-w-0 flex-col items-center rounded-[3px] border border-violet-400/40 bg-violet-950/70 py-px leading-none shadow-inner">
              <span class="text-[8px] font-bold text-violet-300">JLV</span>
              <span class="${p.elementId}-jlv mt-px text-[11px] font-black tabular-nums text-white drop-shadow">${p.jobLevel || 1}</span>
            </span>
            <span class="flex min-w-0 flex-col items-center rounded-[3px] border border-amber-400/40 bg-amber-950/70 py-px leading-none shadow-inner">
              <span class="text-[8px] font-bold text-amber-300">SP</span>
              <span class="${p.elementId}-sp mt-px text-[11px] font-black tabular-nums text-white drop-shadow">${p.sp || 0}</span>
            </span>
          </div>
          <div class="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-gray-950 ring-1 ring-gray-700/60">
            <div id="${p.elementId}-atb" class="h-full w-full origin-left bg-amber-300" style="transform: scaleX(${p.atb / 1000}); will-change: transform; transition: transform 100ms linear;"></div>
          </div>
        </div>
      </div>

      <!-- Only battle-critical values stay full size. -->
      <div class="flex flex-col gap-0.5">
        <!-- Current-job mechanics sit directly above HP for at-a-glance decisions. -->
        ${renderJobResourceHtml(p)}

        <div class="flex items-center gap-0.5">
          <span class="w-3 shrink-0 text-[7px] font-black text-red-400">HP</span>
          <div class="relative h-3 flex-1 overflow-hidden rounded bg-gray-950 shadow-inner ring-1 ring-gray-700/60">
            <div class="absolute bg-red-600" style="left: 0; top: 0; bottom: 0; width: ${Math.min(100, (p.hp.current / maxHp) * 100)}%; ${hpTransStyle}"></div>
            ${renderBarrierIndicatorHtml(p, maxHp, { fastMode })}
            <div class="hp-text absolute inset-0 z-20 flex items-center ${p._barrierHp > 0 ? 'justify-start pl-0.5 pr-[45%]' : 'justify-center'} overflow-hidden whitespace-nowrap text-[7.5px] font-bold tracking-tighter text-gray-100 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
              <span class="hp-value truncate">${formatNumber(Math.floor(p.hp.current))}/${formatNumber(maxHp)}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-0.5">
          <span class="w-3 shrink-0 text-[7px] font-black text-blue-400">MP</span>
          <div class="relative h-3 flex-1 overflow-hidden rounded bg-gray-950 shadow-inner ring-1 ring-gray-700/60">
            <div class="bg-blue-600 h-full w-full origin-left" style="transform: scaleX(${p.mp.current / (p.stats.mp || p.mp.max)}); ${barTransStyle}"></div>
            <div class="absolute inset-0 flex items-center justify-center text-[7.5px] font-bold tracking-tighter text-gray-100 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">${formatNumber(Math.floor(p.mp.current))}/${formatNumber(p.stats.mp || p.mp.max)}</div>
          </div>
        </div>

        <!-- Long-term progress remains visible without competing with HP/MP. -->
        <div class="grid grid-cols-2 gap-1 pt-0.5">
          <div class="flex min-w-0 items-center gap-0.5" title="EXP ${formatNumber(Math.floor(p.exp.current))}/${formatNumber(p.exp.max)}">
            <span class="text-[6px] font-black text-green-400">EX</span>
            <div class="relative h-1 flex-1 overflow-hidden rounded-full bg-gray-950">
              <div class="bg-green-600 h-full w-full origin-left" style="transform: scaleX(${p.exp.current / p.exp.max}); ${barTransStyle}"></div>
              <span class="sr-only">${formatNumber(Math.floor(p.exp.current))}/${formatNumber(p.exp.max)}</span>
            </div>
          </div>
          <div class="flex min-w-0 items-center gap-0.5" title="JP ${formatNumber(Math.floor(p.jp.current))}/${formatNumber(p.jp.max)}">
            <span class="text-[6px] font-black text-purple-400">JP</span>
            <div class="relative h-1 flex-1 overflow-hidden rounded-full bg-gray-950">
              <div class="bg-purple-600 h-full w-full origin-left" style="transform: scaleX(${p.jp.current / p.jp.max}); ${barTransStyle}"></div>
              <span class="sr-only">${formatNumber(Math.floor(p.jp.current))}/${formatNumber(p.jp.max)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="battle-stats-container flex flex-col gap-[1px] text-[9px] text-gray-400 mt-auto leading-tight w-full px-0.5 pb-0.5 ${localStorage.getItem('hideBattleStats') !== 'false' ? 'hidden' : ''}">
        <div class="stat-row-atk flex h-[17px] shrink-0 justify-between items-center ${atkTheme.bg} border rounded px-1 py-0.5 ${transColorClass}">
          <div class="flex items-center gap-[3px]"><span class="stat-icon-atk material-symbols-outlined ${atkTheme.icon}" style="font-size: 10px; font-variation-settings: 'FILL' 1">swords</span><span class="stat-label-atk font-bold tracking-wider ${atkTheme.text}">ATK</span></div>
          <span class="stat-val-atk ${atkTheme.val} font-black drop-shadow-md">${formatNumber(finalAtk)}</span>
        </div>
        <div class="stat-row-def flex h-[17px] shrink-0 justify-between items-center ${defTheme.bg} border rounded px-1 py-0.5 ${transColorClass}">
          <div class="flex items-center gap-[3px]"><span class="stat-icon-def material-symbols-outlined ${defTheme.icon}" style="font-size: 10px; font-variation-settings: 'FILL' 1">shield</span><span class="stat-label-def font-bold tracking-wider ${defTheme.text}">DEF</span></div>
          <span class="stat-val-def ${defTheme.val} font-black drop-shadow-md">${formatNumber(finalDef)}</span>
        </div>
        <div class="stat-row-mat flex h-[17px] shrink-0 justify-between items-center ${matkTheme.bg} border rounded px-1 py-0.5 ${transColorClass}">
          <div class="flex items-center gap-[3px]"><span class="stat-icon-mat material-symbols-outlined ${matkTheme.icon}" style="font-size: 10px; font-variation-settings: 'FILL' 1">auto_awesome</span><span class="stat-label-mat font-bold tracking-wider ${matkTheme.text}">MAT</span></div>
          <span class="stat-val-mat ${matkTheme.val} font-black drop-shadow-md">${formatNumber(finalMatk)}</span>
        </div>
        <div class="stat-row-mdf flex h-[17px] shrink-0 justify-between items-center ${mdefTheme.bg} border rounded px-1 py-0.5 ${transColorClass}">
          <div class="flex items-center gap-[3px]"><span class="stat-icon-mdf material-symbols-outlined ${mdefTheme.icon}" style="font-size: 10px; font-variation-settings: 'FILL' 1">security</span><span class="stat-label-mdf font-bold tracking-wider ${mdefTheme.text}">MDF</span></div>
          <span class="stat-val-mdf ${mdefTheme.val} font-black drop-shadow-md">${formatNumber(finalMdef)}</span>
        </div>
        <div class="stat-row-spd flex h-[17px] shrink-0 justify-between items-center ${spdTheme.bg} border rounded px-1 py-0.5 ${transColorClass}">
          <div class="flex items-center gap-[3px]"><span class="stat-icon-spd material-symbols-outlined ${spdTheme.icon}" style="font-size: 10px; font-variation-settings: 'FILL' 1">directions_run</span><span class="stat-label-spd font-bold tracking-wider ${spdTheme.text}">SPD</span></div>
          <span class="stat-val-spd ${spdTheme.val} font-black drop-shadow-md">${formatNumber(finalSpd)}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderItemTabHtml(obtainedItems, gridClass = 'grid-cols-5') {
  if (!obtainedItems || obtainedItems.length === 0) {
    return '<div class="text-xs text-gray-500 flex items-center justify-center h-full">獲得したアイテムはありません</div>';
  }

  const renderGroup = (label, icon, items, equipment = false) => {
    if (items.length === 0) return '';
    const accent = equipment
      ? 'text-amber-300 border-amber-800/60 bg-amber-950/25'
      : 'text-cyan-300 border-cyan-900/60 bg-cyan-950/20';
    const cards = items.map(item => `
      <div class="battle-item-card item-card relative bg-slate-900/85 border ${equipment ? 'border-amber-800/50' : 'border-slate-700/70'} rounded-lg flex items-center justify-center p-1 group" data-item-id="${item.id}" aria-label="${item.name} x${formatNumber(item.quantity)}">
        <div class="battle-item-image rounded-md bg-slate-950/80 border border-slate-700/60 p-0.5 flex items-center justify-center">
          <img src="${item.image}" class="w-full h-full object-contain drop-shadow-sm pointer-events-none" onerror="this.style.display='none'">
        </div>
        <span class="absolute right-0 bottom-0 max-w-full overflow-hidden bg-black/85 rounded-tl px-0.5 text-[8px] leading-[11px] font-black ${equipment ? 'text-amber-300' : 'text-white'} tabular-nums whitespace-nowrap pointer-events-none">x${formatNumber(item.quantity)}</span>
      </div>
    `).join('');

    return `
      <section class="battle-item-group flex flex-col gap-1.5" aria-label="${label}">
        <div class="battle-item-heading px-2 rounded-lg border flex items-center gap-1.5 ${accent}">
          <span class="material-symbols-outlined" style="font-size: 14px; font-variation-settings: 'FILL' 1">${icon}</span>
          <span class="text-[10px] font-black tracking-wider">${label}</span>
          <span class="ml-auto text-[9px] opacity-70">${items.length}種</span>
        </div>
        <div class="battle-item-grid">${cards}</div>
      </section>
    `;
  };

  const equipmentItems = obtainedItems.filter(item => item.type === 'equipment');
  const materialItems = obtainedItems.filter(item => item.type !== 'equipment');
  return `<div class="battle-item-root flex flex-col gap-2 p-1 content-start w-full">
    ${renderGroup('素材', 'category', materialItems)}
    ${renderGroup('装備', 'swords', equipmentItems, true)}
  </div>`;
}

export function renderSkillTabHtml(p, isAutoBattle, autoSkillStates, jobs, equipmentMap) {
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
    const levelConfig = resolveJobSkillLevelConfig(skillDef, level, isInherited ? 'inherited' : 'current');
    const effectiveMpCost = getEffectiveMedalEquipmentMpCost(p, equipmentMap, levelConfig.mpCost);
    const isSilenced = effectiveMpCost > 0 && p.activeAilment && p.activeAilment.type === 'silence';
    const useState = skillDef.getUseState?.(p, levelConfig) || { canUse: true };
    const canCast = p.mp.current >= effectiveMpCost && !isSilenced && useState.canUse !== false;
    const desc = skillDef.getDescription ? skillDef.getDescription(levelConfig) : '';
    const useStateHtml = useState.canUse === false && useState.message
      ? `<span class="font-black text-rose-300">${useState.message}。</span>`
      : '';

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
    let btnClass = "battle-skill-card skill-btn relative w-full flex items-stretch gap-2.5 p-2 border rounded-xl transition-all duration-300 group overflow-hidden ";
    
    let toggleHtml = '';
    
    if (isAutoBattle) {
      if (autoEnabled) {
        // Active Auto state: Glassmorphism blue/cyan, glowing borders
        btnClass += "bg-slate-900/60 backdrop-blur-md border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.1)] active:border-cyan-400/80 active:shadow-[0_0_25px_rgba(34,211,238,0.25)] active:-translate-y-0.5 active:scale-[0.98] ";
        
        toggleHtml = `
          <div class="battle-skill-auto flex flex-col items-center justify-center pl-2 border-l border-cyan-500/20 shrink-0 min-w-[60px]">
            <span class="text-[9px] text-cyan-300 font-bold tracking-wider mb-0.5 uppercase drop-shadow-[0_0_2px_rgba(34,211,238,0.5)]">Auto</span>
            <div class="battle-switch is-active bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.4)]" aria-hidden="true">
              <span class="battle-switch-knob bg-white"></span>
            </div>
          </div>
        `;
      } else {
        // Disabled Auto state: Muted glassmorphism
        btnClass += "bg-slate-900/40 backdrop-blur-md border-slate-700/50 opacity-80 active:opacity-100 active:border-slate-500/80 active:-translate-y-0.5 active:scale-[0.98] ";
        
        toggleHtml = `
          <div class="battle-skill-auto flex flex-col items-center justify-center pl-2 border-l border-slate-700/50 shrink-0 min-w-[60px]">
            <span class="text-[9px] text-slate-500 font-bold tracking-wider mb-0.5 uppercase">Manual</span>
            <div class="battle-switch bg-slate-700" aria-hidden="true">
              <span class="battle-switch-knob bg-slate-400"></span>
            </div>
          </div>
        `;
      }
    } else {
      // Manual battle state
      btnClass += "bg-slate-900/60 backdrop-blur-md border-slate-700/60 active:border-cyan-400/50 active:shadow-[0_0_20px_rgba(34,211,238,0.15)] active:-translate-y-0.5 active:scale-[0.98] " + grayscaleClass;
    }

    // MP Cost Display
    let mpCostHtml = '';
    if (effectiveMpCost > 0) {
      if (canCast) {
        mpCostHtml = `
          <div class="battle-skill-mp flex flex-col items-end justify-center px-2 min-w-[50px]">
            <span class="text-[9px] text-cyan-400/80 font-bold tracking-wider uppercase mb-[1px]">MP</span>
            <span class="text-lg font-mono font-black text-cyan-100 drop-shadow-[0_0_5px_rgba(34,211,238,0.3)] leading-none">${effectiveMpCost}</span>
          </div>
        `;
      } else {
        mpCostHtml = `
          <div class="battle-skill-mp flex flex-col items-end justify-center px-2 min-w-[50px]">
            <span class="text-[9px] text-rose-500/80 font-bold tracking-wider uppercase mb-[1px]">MP</span>
            <span class="text-lg font-mono font-black text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.3)] leading-none">${effectiveMpCost}</span>
          </div>
        `;
      }
    } else {
      mpCostHtml = `
        <div class="battle-skill-mp flex flex-col items-end justify-center px-2 min-w-[50px]">
          <span class="text-[9px] text-slate-500/80 font-bold tracking-wider uppercase mb-[1px]">MP</span>
          <span class="text-lg font-mono font-black text-slate-400 leading-none">0</span>
        </div>
      `;
    }

    skillListHtml += `
      <button class="${btnClass}" data-skill-id="${skillDef.id}" data-level="${level}" aria-disabled="${canCast ? 'false' : 'true'}" ${isAutoBattle ? `role="switch" aria-checked="${autoEnabled}" aria-label="${skillDef.name}の自動使用"` : ''}>
        <!-- Touch press feedback -->
        <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 group-active:opacity-100 transition-opacity duration-500"></div>
        
        <!-- Left: Icon -->
        <div class="battle-skill-icon-wrap flex items-center justify-center shrink-0 z-10">
          <div class="battle-skill-icon w-10 h-10 rounded-lg bg-slate-950/80 flex items-center justify-center border border-slate-700/80 shadow-inner group-active:border-cyan-500/50 group-active:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all duration-300">
            <span class="material-symbols-outlined ${canCast ? 'text-cyan-400 drop-shadow-[0_0_3px_rgba(34,211,238,0.5)]' : 'text-slate-500'} text-[22px] group-active:scale-110 transition-transform duration-300" style="font-variation-settings: 'FILL' 1">${skillDef.icon || 'star'}</span>
          </div>
        </div>
        
        <!-- Middle: Info -->
        <div class="battle-skill-info flex flex-col text-left flex-1 min-w-0 justify-center z-10 py-0">
          <div class="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <div class="text-[13px] font-bold tracking-wide ${canCast ? 'text-slate-50' : 'text-slate-400'} leading-tight">
              ${skillDef.name}
            </div>
            <div class="${canCast ? 'text-cyan-400' : 'text-slate-500'} text-[9px] font-bold bg-slate-900/50 px-1 py-[1px] rounded border border-slate-700/50">Lv${level}</div>
            ${typeBadgeHtml}
          </div>
          <div class="text-[11px] ${canCast ? 'text-slate-300' : 'text-slate-500'} leading-tight whitespace-normal pr-1 opacity-90">${useStateHtml}${desc}</div>
        </div>

        <!-- Right: MP Cost & Auto Switch (Horizontal Layout) -->
        <div class="battle-skill-controls flex items-stretch justify-end shrink-0 z-10">
          ${mpCostHtml}
          ${toggleHtml}
        </div>
      </button>
    `;
  });
  skillListHtml += '</div>';

  return skillListHtml;
}
