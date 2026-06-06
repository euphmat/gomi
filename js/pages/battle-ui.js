export function renderEnemyCardHtml(e, selectedEnemyTarget) {
  const isSelected = selectedEnemyTarget === e;
  return `
    <div id="${e.elementId}" class="enemy-card relative flex flex-col items-center gap-1 flex-1 min-w-[2.5rem] max-w-[4rem] ${e.isDead ? '' : 'cursor-pointer hover:scale-105 transition-transform'}" data-id="${e.uniqueId}">
      <div class="relative w-full aspect-square bg-gray-800 rounded-lg border-2 ${isSelected ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'border-gray-700'} overflow-hidden ${e.isDead ? 'opacity-0' : ''} transition-opacity duration-500">
        <img src="${e.image}" class="w-full h-full object-contain p-1 drop-shadow-md" onerror="this.style.display='none'">
      </div>
      <div class="w-full bg-gray-900 h-2 rounded overflow-hidden shadow-inner shrink-0 ${e.isDead ? 'opacity-0' : ''}">
        <div class="bg-red-500 h-full transition-all duration-300" style="width: ${(e.currentHp / e.maxHp) * 100}%"></div>
      </div>
      <div class="w-full bg-gray-900 h-1 rounded overflow-hidden mt-0.5 shadow-inner shrink-0 ${e.isDead ? 'opacity-0' : ''}">
        <div id="${e.elementId}-atb" class="bg-orange-500 h-full" style="width: ${e.atb / 10}%; transition: width 50ms linear;"></div>
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
          <div class="text-[10px] font-bold text-gray-100 truncate w-full drop-shadow mb-0.5">${p.name}</div>
          <div class="w-full h-1.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
            <div id="${p.elementId}-atb" class="bg-yellow-400 h-full" style="width: ${p.atb / 10}%; transition: width 50ms linear;"></div>
          </div>
        </div>
      </div>
      
      <div class="flex flex-col gap-[3px] mb-1.5">
        <div class="flex items-center gap-0.5">
          <span class="text-[9px] font-bold text-red-400 w-3.5">HP</span>
          <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
            <div class="bg-red-600 h-full transition-all duration-300" style="width: ${(p.hp.current / (p.stats.hp || p.hp.max)) * 100}%"></div>
            <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${Math.floor(p.hp.current)}/${p.stats.hp || p.hp.max}</div>
          </div>
        </div>
        <div class="flex items-center gap-0.5">
          <span class="text-[9px] font-bold text-blue-400 w-3.5">MP</span>
          <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
            <div class="bg-blue-600 h-full transition-all duration-300" style="width: ${(p.mp.current / p.mp.max) * 100}%"></div>
            <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${Math.floor(p.mp.current)}/${p.mp.max}</div>
          </div>
        </div>
        <div class="flex items-center gap-0.5">
          <span class="text-[9px] font-bold text-green-400 w-3.5">EX</span>
          <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
            <div class="bg-green-600 h-full transition-all duration-300" style="width: ${(p.exp.current / p.exp.max) * 100}%"></div>
            <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${Math.floor(p.exp.current)}/${p.exp.max}</div>
          </div>
        </div>
        <div class="flex items-center gap-0.5">
          <span class="text-[9px] font-bold text-purple-400 w-3.5">JP</span>
          <div class="flex-1 relative h-3.5 bg-gray-900 rounded overflow-hidden shadow-inner border border-gray-700/50">
            <div class="bg-purple-600 h-full transition-all duration-300" style="width: ${(p.jp.current / p.jp.max) * 100}%"></div>
            <div class="absolute inset-0 flex items-center justify-center text-[8.5px] text-gray-100 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,1)] tracking-tighter">${Math.floor(p.jp.current)}/${p.jp.max}</div>
          </div>
        </div>
      </div>

      <div class="battle-stats-container flex flex-col gap-[1px] text-[9px] text-gray-400 mt-auto leading-tight w-full px-0.5 pb-0.5 ${localStorage.getItem('hideBattleStats') === 'true' ? 'hidden' : ''}">
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

export function renderInfoTabHtml(targetEntity, isParty, equipMap, currentFloorNum, materials) {
  if (!targetEntity) {
    return '<div class="text-xs text-gray-500 flex items-center justify-center h-full">対象が選択されていません</div>';
  }

  let html = '';
  if (isParty) {
    const currentHp = targetEntity.hp?.current || 0;
    const maxHp = targetEntity.stats?.hp || targetEntity.hp?.max || 0;
    const hpPct = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
    
    const currentMp = targetEntity.mp?.current || 0;
    const maxMp = targetEntity.mp?.max || 0;
    const mpPct = maxMp > 0 ? (currentMp / maxMp) * 100 : 0;

    const getEquipHtml = (id, label) => {
      const item = id ? equipMap.get(id) : null;
      if (item && item.image) {
        return `<div class="flex items-center gap-1 bg-gray-900/60 p-0.5 rounded border border-gray-700">
            <img src="${item.image}" class="w-4 h-4 object-contain" onerror="this.style.display='none'">
            <div class="flex flex-col min-w-0">
              <span class="text-[7px] text-gray-500 leading-none">${label}</span>
              <span class="text-[8px] text-gray-200 truncate leading-tight">${item.name}</span>
            </div>
          </div>`;
      } else {
        const itemName = item ? item.name : (id || 'なし');
        return `<div class="flex items-center gap-1 bg-gray-900/60 p-0.5 rounded border border-gray-700">
            <span class="material-symbols-outlined text-gray-600" style="font-size: 12px;">category</span>
            <div class="flex flex-col min-w-0">
              <span class="text-[7px] text-gray-500 leading-none">${label}</span>
              <span class="text-[8px] text-gray-400 truncate leading-tight">${itemName}</span>
            </div>
          </div>`;
      }
    };

    html = `
      <div class="h-full overflow-y-auto p-1.5 text-gray-300 text-[9px] flex flex-col gap-1.5 custom-scrollbar">
        <div class="flex items-center gap-2 pb-1 border-b border-gray-700 shrink-0">
          <div class="w-8 h-8 rounded-full border-2 border-gray-600 overflow-hidden bg-gray-800 shrink-0">
            <img src="${targetEntity.iconImage}" class="w-full h-full object-cover" onerror="this.src='./assets/job/job_norvice.webp'">
          </div>
          <div class="flex flex-col flex-1">
            <div class="flex justify-between items-baseline">
              <span class="font-bold text-gray-100 text-[11px] drop-shadow-md">${targetEntity.name}</span>
              <span class="text-gray-400 text-[8px]">Lv.${targetEntity.level || 1} / JLV.${targetEntity.jobLevel || 1}</span>
            </div>
            <div class="flex flex-col gap-[2px] mt-0.5">
              <div class="relative h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-700/50">
                <div class="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 to-red-400" style="width: ${hpPct}%"></div>
              </div>
              <div class="relative h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-700/50">
                <div class="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-blue-400" style="width: ${mpPct}%"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-1.5 shrink-0">
          <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-1 rounded border border-gray-700/50 flex flex-col gap-[2px] shadow-inner">
            <div class="text-gray-500 text-[8px] mb-0.5 border-b border-gray-700 pb-0.5">ステータス</div>
            <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-red-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">swords</span><span class="text-gray-400">ATK</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.atk || 0}</span></div>
            <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-slate-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">shield</span><span class="text-gray-400">DEF</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.def || 0}</span></div>
            <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-purple-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">auto_awesome</span><span class="text-gray-400">MATK</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.matk || 0}</span></div>
            <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-indigo-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">security</span><span class="text-gray-400">MDEF</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.mdef || 0}</span></div>
            <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-yellow-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">directions_run</span><span class="text-gray-400">SPD</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.spd || 0}</span></div>
          </div>
          <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-1 rounded border border-gray-700/50 flex flex-col gap-[2px] shadow-inner">
            <div class="text-gray-500 text-[8px] mb-0.5 border-b border-gray-700 pb-0.5">装備</div>
            <div class="flex flex-col gap-[2px] mt-0.5">
              ${getEquipHtml(targetEntity.equipment?.rightHand, '右手')}
              ${getEquipHtml(targetEntity.equipment?.leftHand, '左手')}
              ${getEquipHtml(targetEntity.equipment?.head, '頭')}
              ${getEquipHtml(targetEntity.equipment?.body, '体')}
              ${getEquipHtml(targetEntity.equipment?.accessory, '装飾品')}
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    let dropsHtml = '';
    if (targetEntity.drops && targetEntity.drops.length > 0) {
      dropsHtml = targetEntity.drops.map(d => {
        const mat = materials.find(m => m.id === d.itemId);
        const itemName = mat ? mat.name : d.itemId;
        const itemImg = mat && mat.image ? `<img src="${mat.image}" class="w-4 h-4 object-contain">` : `<span class="material-symbols-outlined text-gray-500" style="font-size: 12px;">category</span>`;
        return `<div class="flex justify-between items-center bg-gray-900/60 p-0.5 rounded border border-gray-700/50 hover:bg-gray-800 transition-colors">
            <div class="flex items-center gap-1 overflow-hidden">
              ${itemImg}
              <span class="truncate text-gray-200 text-[8px]">${itemName}</span>
            </div>
            <span class="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1 rounded-sm shrink-0 text-[7px] font-bold">${d.rate}%</span>
          </div>`;
      }).join('');
    } else {
      dropsHtml = '<div class="text-gray-500 text-center py-1 text-[8px]">なし</div>';
    }

    const hpPct = targetEntity.maxHp > 0 ? (targetEntity.currentHp / targetEntity.maxHp) * 100 : 0;

    html = `
      <div class="h-full overflow-y-auto p-1.5 text-gray-300 text-[9px] flex flex-col gap-1.5 custom-scrollbar relative">
        <!-- Background Glow Effect -->
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-red-500/10 rounded-full blur-xl pointer-events-none"></div>
        
        <div class="flex items-center gap-2 pb-1 border-b border-gray-700 shrink-0 relative z-10">
          <div class="w-10 h-10 rounded bg-gray-900/80 border border-gray-600 overflow-hidden shrink-0 flex items-center justify-center p-0.5 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
            <img src="${targetEntity.image}" class="w-full h-full object-contain drop-shadow-md" onerror="this.style.display='none'">
          </div>
          <div class="flex flex-col flex-1 justify-center">
            <div class="flex justify-between items-baseline">
              <span class="font-bold text-red-300 text-[11px] drop-shadow-md">${targetEntity.name}</span>
              <span class="text-gray-400 text-[8px] bg-gray-800 px-1 rounded">Lv.${currentFloorNum || 1}</span>
            </div>
            <div class="flex flex-col gap-0.5 mt-1">
              <div class="flex justify-between items-end mb-[1px]">
                <span class="text-[7px] text-gray-500 font-bold leading-none">HP</span>
                <span class="text-[8px] text-red-200 font-bold leading-none">${Math.floor(targetEntity.currentHp || 0)} / ${targetEntity.maxHp || 0}</span>
              </div>
              <div class="relative h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-700/50">
                <div class="absolute inset-y-0 left-0 bg-gradient-to-r from-red-700 to-red-500" style="width: ${hpPct}%"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-1.5 min-h-0 flex-1 relative z-10">
          <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-1 rounded border border-gray-700/50 flex flex-col gap-[2px] overflow-y-auto custom-scrollbar shadow-inner">
            <div class="text-gray-500 text-[8px] mb-0.5 border-b border-gray-700 pb-0.5 shrink-0">ステータス</div>
            <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-red-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">swords</span><span class="text-gray-400">ATK</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.atk || 0}</span></div>
            <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-slate-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">shield</span><span class="text-gray-400">DEF</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.def || 0}</span></div>
            <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-purple-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">auto_awesome</span><span class="text-gray-400">MATK</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.matk || 0}</span></div>
            <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-indigo-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">security</span><span class="text-gray-400">MDEF</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.mdef || 0}</span></div>
            <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-yellow-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">directions_run</span><span class="text-gray-400">SPD</span></div><span class="font-bold text-gray-200">${targetEntity.stats?.spd || 0}</span></div>
            <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm mt-0.5"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-green-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">star</span><span class="text-gray-400">EXP</span></div><span class="font-bold text-green-400">${targetEntity.rewards?.exp || 0}</span></div>
            <div class="flex justify-between items-center bg-gray-800/50 px-1 rounded-sm"><div class="flex items-center gap-0.5"><span class="material-symbols-outlined text-yellow-400" style="font-size: 10px; font-variation-settings: 'FILL' 1">monetization_on</span><span class="text-gray-400">GOLD</span></div><span class="font-bold text-yellow-400">${targetEntity.rewards?.gold || 0}</span></div>
          </div>
          <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-1 rounded border border-gray-700/50 flex flex-col min-h-0 shadow-inner">
            <div class="text-gray-500 text-[8px] mb-1 border-b border-gray-700 pb-0.5 shrink-0 flex items-center gap-0.5"><span class="material-symbols-outlined" style="font-size: 10px;">shopping_bag</span>ドロップ</div>
            <div class="flex-1 overflow-y-auto custom-scrollbar pr-0.5 flex flex-col gap-[2px]">
              ${dropsHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return html;
}

export function renderItemTabHtml(obtainedItems) {
  if (!obtainedItems || obtainedItems.length === 0) {
    return '<div class="text-xs text-gray-500 flex items-center justify-center h-full">獲得したアイテムはありません</div>';
  }
  let html = '<div class="grid grid-cols-5 gap-1.5 p-1 content-start overflow-y-auto h-full">';
  obtainedItems.forEach(item => {
    html += `
      <div class="relative w-full aspect-square bg-gray-800 border border-gray-600 rounded flex flex-col group hover:border-blue-400 transition-colors overflow-hidden">
        <div class="relative flex-1 w-full min-h-0 p-1">
          <img src="${item.image}" class="w-full h-full object-contain drop-shadow-md" onerror="this.style.display='none'">
          <div class="absolute bottom-0 right-0 bg-black/80 text-[8px] text-white font-bold px-1 rounded-tl shadow-sm z-10">x${item.quantity}</div>
        </div>
        <div class="w-full bg-gray-900 border-t border-gray-700 text-[8px] text-gray-300 text-center break-all px-0.5 py-[1px] leading-tight shrink-0">
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

  for (const [jobId, skillsMap] of Object.entries(p.jobSkills)) {
    const jobDef = jobs[jobId];
    if (!jobDef) continue;
    
    for (const [skillId, level] of Object.entries(skillsMap)) {
      if (level > 0) {
        const skillDef = jobDef.skills.find(s => s.id === skillId);
        if (skillDef) {
          learnedSkills.push({ skillDef, level });
        }
      }
    }
  }

  if (learnedSkills.length === 0) {
    return '<div class="text-xs text-gray-500 flex items-center justify-center h-full">覚えているスキルがありません</div>';
  }

  skillListHtml += '<div class="grid grid-cols-2 gap-1.5">';
  learnedSkills.forEach(({ skillDef, level }) => {
    const levelConfig = skillDef.levels.find(l => l.level === level) || skillDef.levels[skillDef.levels.length - 1];
    const canCast = p.mp.current >= levelConfig.mpCost;
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
