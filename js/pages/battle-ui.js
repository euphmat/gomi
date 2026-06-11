export function getAilmentIconHTML(ailment) {
  if (!ailment) return '';
  const map = {
    poison: { icon: 'water_drop', color: 'text-purple-500' },
    burn: { icon: 'local_fire_department', color: 'text-red-500' },
    paralysis: { icon: 'bolt', color: 'text-yellow-400' },
    sleep: { icon: 'snooze', color: 'text-blue-300' },
    blind: { icon: 'visibility_off', color: 'text-gray-400' },
    silence: { icon: 'volume_off', color: 'text-indigo-400' },
    curse: { icon: 'sentiment_very_dissatisfied', color: 'text-fuchsia-500' },
    confusion: { icon: 'question_mark', color: 'text-pink-400' }
  };
  const data = map[ailment.type];
  if (!data) return '';
  return `<span class="material-symbols-outlined ${data.color} text-[14px] absolute -top-1.5 -right-1.5 z-20 bg-gray-900 rounded-full border border-gray-700 drop-shadow-md" style="font-variation-settings: 'FILL' 1" title="${ailment.type}">${data.icon}</span>`;
}

export function renderEnemyCardHtml(e, selectedEnemyTarget) {
  const isSelected = selectedEnemyTarget === e;
  const deadStyle = e.isDead ? 'min-width: 0px; max-width: 0px; opacity: 0; margin: 0; pointer-events: none;' : '';
  return `
    <div id="${e.elementId}" class="enemy-card relative flex flex-col items-center gap-1 flex-1 min-w-[2.5rem] max-w-[4rem] overflow-hidden ${e.isDead ? '' : 'cursor-pointer hover:scale-105 transition-transform'}" style="${deadStyle}" data-id="${e.uniqueId}">
      <div class="relative w-full aspect-square bg-gray-800 rounded-lg border-2 ${isSelected ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'border-gray-700'} overflow-hidden ${e.isDead ? 'opacity-0' : ''} transition-opacity duration-500">
        ${!e.isDead ? getAilmentIconHTML(e.activeAilment) : ''}
        <img src="${e.image}" class="w-full h-full object-contain p-1 drop-shadow-md" onerror="this.style.display='none'">
      </div>
      <div class="w-full bg-gray-900 h-2 rounded overflow-hidden shadow-inner shrink-0 ${e.isDead ? 'opacity-0' : ''}">
        <div class="bg-red-500 h-full w-full transition-transform duration-300 origin-left" style="transform: scaleX(${e.currentHp / e.maxHp})"></div>
      </div>
      <div class="w-full bg-gray-900 h-1 rounded overflow-hidden mt-0.5 shadow-inner shrink-0 ${e.isDead ? 'opacity-0' : ''}">
        <div id="${e.elementId}-atb" class="bg-orange-500 h-full w-full origin-left" style="transform: scaleX(${e.atb / 1000}); will-change: transform; transition: transform 100ms linear;"></div>
      </div>
    </div>
  `;
}

export function renderPartyCardHtml(p, activeCharacter, isAutoBattle, selectedPartyMember) {
  let borderClass = 'border-gray-700';
  if (activeCharacter === p) {
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
          <div class="flex items-center gap-1 mb-0.5 relative">
            <div class="text-[10px] font-bold text-gray-100 truncate flex-1 drop-shadow">${p.name}</div>
            ${!p.isDead && p.activeAilment ? `
              <div class="relative w-4 h-4 shrink-0">
                ${getAilmentIconHTML(p.activeAilment)}
              </div>
            ` : ''}
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
            <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${Math.floor(p.hp.current)}/${p.stats.hp || p.hp.max}</div>
          </div>
        </div>
        <div class="flex items-center gap-0.5">
          <span class="text-[9px] font-bold text-blue-400 w-3.5">MP</span>
          <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
            <div class="bg-blue-600 h-full w-full transition-transform duration-300 origin-left" style="transform: scaleX(${p.mp.current / p.mp.max})"></div>
            <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${Math.floor(p.mp.current)}/${p.mp.max}</div>
          </div>
        </div>
        <div class="flex items-center gap-0.5">
          <span class="text-[9px] font-bold text-green-400 w-3.5">EX</span>
          <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
            <div class="bg-green-600 h-full w-full transition-transform duration-300 origin-left" style="transform: scaleX(${p.exp.current / p.exp.max})"></div>
            <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${Math.floor(p.exp.current)}/${p.exp.max}</div>
          </div>
        </div>
        <div class="flex items-center gap-0.5">
          <span class="text-[9px] font-bold text-purple-400 w-3.5">JP</span>
          <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
            <div class="bg-purple-600 h-full w-full transition-transform duration-300 origin-left" style="transform: scaleX(${p.jp.current / p.jp.max})"></div>
            <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${Math.floor(p.jp.current)}/${p.jp.max}</div>
          </div>
        </div>
      </div>

      <div class="battle-stats-container flex flex-col gap-[1px] text-[9px] text-gray-400 mt-auto leading-tight w-full px-0.5 pb-0.5 ${localStorage.getItem('hideBattleStats') !== 'false' ? 'hidden' : ''}">
        <div class="flex justify-between items-center bg-gray-900/40 rounded px-1 py-0.5">
          <div class="flex items-center gap-[3px]"><span class="material-symbols-outlined text-red-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">swords</span><span class="font-bold tracking-wider">ATK</span></div>
          <span class="text-gray-100 font-black drop-shadow-md">${p.stats.atk}</span>
        </div>
        <div class="flex justify-between items-center bg-gray-900/40 rounded px-1 py-0.5">
          <div class="flex items-center gap-[3px]"><span class="material-symbols-outlined text-slate-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">shield</span><span class="font-bold tracking-wider">DEF</span></div>
          <span class="text-gray-100 font-black drop-shadow-md">${p.stats.def}</span>
        </div>
        <div class="flex justify-between items-center bg-gray-900/40 rounded px-1 py-0.5">
          <div class="flex items-center gap-[3px]"><span class="material-symbols-outlined text-purple-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">auto_awesome</span><span class="font-bold tracking-wider">MAT</span></div>
          <span class="text-gray-100 font-black drop-shadow-md">${p.stats.matk}</span>
        </div>
        <div class="flex justify-between items-center bg-gray-900/40 rounded px-1 py-0.5">
          <div class="flex items-center gap-[3px]"><span class="material-symbols-outlined text-indigo-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">security</span><span class="font-bold tracking-wider">MDF</span></div>
          <span class="text-gray-100 font-black drop-shadow-md">${p.stats.mdef}</span>
        </div>
        <div class="flex justify-between items-center bg-gray-900/40 rounded px-1 py-0.5">
          <div class="flex items-center gap-[3px]"><span class="material-symbols-outlined text-yellow-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">directions_run</span><span class="font-bold tracking-wider">SPD</span></div>
          <span class="text-gray-100 font-black drop-shadow-md">${p.stats.spd}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderInfoTabHtml(targetEntity, isParty, equipMap, currentFloorNum, materials, monsterKills) {
  if (!targetEntity) {
    return '<div class="text-xs text-gray-500 flex items-center justify-center h-full" style="font-family: system-ui, -apple-system, sans-serif;">対象が選択されていません</div>';
  }

  let html = '';
  const kills = (monsterKills && targetEntity.id) ? (monsterKills[targetEntity.id] || 0) : 0;
  const bonus = Math.floor(kills / 100) * 0.1;

  let dropsHtml = '';
  if (targetEntity.drops && targetEntity.drops.length > 0) {
    dropsHtml = targetEntity.drops.map(d => {
      const mat = materials.find(m => m.id === d.itemId);
      const itemName = mat ? mat.name : d.itemId;
      const itemImg = mat && mat.image 
        ? `<img src="${mat.image}" class="w-5 h-5 object-contain shrink-0 drop-shadow-sm">` 
        : `<span class="material-symbols-outlined text-slate-500 text-[14px] shrink-0">category</span>`;
      
      let badgeClass = '';
      const rate = Math.min(100, parseFloat(d.rate) + bonus);
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
            <div class="flex justify-between items-center mb-1">
              <span class="font-black text-red-400 text-sm tracking-wide truncate drop-shadow">${targetEntity.name}</span>
              <div class="flex gap-1 items-center">
                <span class="text-slate-400 text-[10px] font-bold bg-slate-950/80 border border-slate-800 px-1.5 py-0.5 rounded shrink-0">Lv.${currentFloorNum || 1}</span>
                <span class="text-slate-400 text-[9px] font-black bg-slate-950/80 border border-slate-800/85 px-1.5 py-0.5 rounded shrink-0">討伐: <span class="text-red-400 font-extrabold">${kills}</span></span>
              </div>
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
        <!-- Actions -->
        <div class="bg-slate-900/60 p-2 rounded-lg border border-slate-700/60 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar shadow-inner">
          <div class="text-slate-400 text-[10px] font-black tracking-wider border-b border-slate-700/80 pb-1 mb-0.5 flex items-center gap-1 shrink-0">
            <span class="material-symbols-outlined text-[12px] text-blue-400">psychology</span>行動パターン
          </div>
          <div class="flex flex-col gap-1 pb-1">
            ${actionsHtml}
          </div>
        </div>
        <!-- Drop Info -->
        <div class="bg-slate-900/60 p-2 rounded-lg border border-slate-700/60 flex flex-col min-h-0 shadow-inner">
          <div class="text-slate-400 text-[10px] font-black tracking-wider border-b border-slate-700/80 pb-1 mb-1 flex items-center gap-1 shrink-0">
            <span class="material-symbols-outlined text-[12px] text-red-400">shopping_bag</span>ドロップ
          </div>
          <div class="flex-1 overflow-y-auto custom-scrollbar pr-0.5 flex flex-col gap-1.5">
            ${dropsHtml}
          </div>
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
      <div class="relative w-full h-full bg-gray-800 border border-gray-600 rounded flex flex-col group hover:border-blue-400 transition-colors overflow-hidden">
        <div class="relative w-full aspect-square p-1 shrink-0">
          <img src="${item.image}" class="w-full h-full object-contain drop-shadow-md" onerror="this.style.display='none'">
          <div class="absolute bottom-0 right-0 bg-black/80 text-[8px] text-white font-bold px-1 rounded-tl shadow-sm z-10">x${item.quantity}</div>
        </div>
        <div class="w-full bg-gray-900 border-t border-gray-700 text-[8px] text-gray-300 text-center break-all px-0.5 py-1 leading-tight flex-1 flex items-center justify-center">
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

  // ジョブID、スキルIDの順でソートし、並び順を統一する
  learnedSkills.sort((a, b) => {
    if (a.jobId !== b.jobId) return a.jobId.localeCompare(b.jobId);
    return a.skillDef.id.localeCompare(b.skillDef.id);
  });

  if (learnedSkills.length === 0) {
    return '<div class="text-xs text-gray-500 flex items-center justify-center h-full">覚えているスキルがありません</div>';
  }

  skillListHtml += '<div class="grid grid-cols-2 gap-1.5">';
  learnedSkills.forEach(({ skillDef, level }) => {
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
            <div class="text-[10px] font-bold ${canCast ? 'text-gray-100' : 'text-gray-400'} truncate pr-1">${skillDef.name} <span class="${canCast ? 'text-green-400' : 'text-gray-500'} text-[9px] ml-0.5">Lv${level}</span></div>
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
