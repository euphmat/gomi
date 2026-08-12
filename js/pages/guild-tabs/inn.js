import { GameDB } from '../../data/database.js';
import { createStatusBar, BAR_COLORS } from '../../components/status-bar.js';
import { calcFinalStats, buildEquipmentMap, getCharactersWithRanchBonus } from '../../data/stat-calculator.js';
import { formatNumber } from '../../utils/format.js';
import { calculateInnFee } from '../../utils/inn-cost.js';
export function renderInnTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full p-4 animate-fade-in overflow-y-auto items-center';



  // Status Container
  const statusContainer = document.createElement('div');
  statusContainer.className = 'w-full max-w-sm flex flex-col gap-2 mb-6';
  container.appendChild(statusContainer);

  // Rest Button Container
  const btnContainer = document.createElement('div');
  btnContainer.className = 'w-full max-w-sm flex flex-col items-center gap-2 mt-auto pb-4';
  
  const btnRest = document.createElement('button');
  btnRest.className = 'group relative px-8 py-3.5 w-full max-w-[240px] justify-center bg-gradient-to-r from-blue-600 to-indigo-500 active:from-blue-500 active:to-indigo-400 active:scale-95 disabled:bg-none disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 disabled:cursor-not-allowed disabled:shadow-inner disabled:active:scale-100 text-white font-bold rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.3)] active:shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-blue-400/50 transition-all duration-300 flex items-center gap-2 overflow-hidden';
  
  btnContainer.appendChild(btnRest);
  container.appendChild(btnContainer);

  let currentCost = 0;
  let currentParty = [];

  const renderStatus = async () => {
    const rawParty = await getCharactersWithRanchBonus();
    const rawEquip = await GameDB.getAllEquipment();
    const equipMap = buildEquipmentMap(rawEquip);
    currentParty = rawParty;
    statusContainer.innerHTML = '';
    currentCost = 0;
    
    currentParty.forEach(char => {
      const stats = calcFinalStats(char, equipMap);
      const trueMaxHp = stats.hp || char.hp.max;
      const trueMaxMp = stats.mp || char.mp.max;

      const isDead = char.hp.current <= 0;
      const needsHeal = char.hp.current < trueMaxHp || char.mp.current < trueMaxMp || isDead;
      
      if (needsHeal) {
        currentCost += calculateInnFee(char.level);
      }

      const isLowHp = char.hp.current / trueMaxHp < 0.3;
      const statusIcon = isDead 
        ? `<span class="material-symbols-outlined text-gray-500 text-sm" style="font-variation-settings: 'FILL' 1">skull</span>` 
        : (needsHeal ? `<span class="material-symbols-outlined text-yellow-500 text-sm" style="font-variation-settings: 'FILL' 1">local_hospital</span>` : `<span class="material-symbols-outlined text-green-400 text-sm" style="font-variation-settings: 'FILL' 1">check_circle</span>`);

      const row = document.createElement('div');
      row.className = `group flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300 shadow-md ${needsHeal ? 'bg-slate-800/80 border-blue-500/30 active:border-blue-400/50 active:bg-slate-800' : 'bg-slate-900/40 border-slate-700/30 opacity-70'}`;
      
      row.innerHTML = `
        <div class="w-14 h-14 rounded-xl overflow-hidden border-2 ${isDead ? 'border-red-900/50 grayscale' : (needsHeal ? 'border-blue-500/30' : 'border-slate-600/30')} bg-slate-900 shrink-0 relative shadow-inner">
          <img src="${char.iconImage}" class="w-full h-full object-cover ${isDead ? 'opacity-40' : ''} group-active:scale-110 transition-transform duration-300" onerror="this.style.display='none'">
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent pt-3 pb-0.5 px-1 text-center">
            <span class="text-[10px] font-bold text-gray-200 drop-shadow">Lv.${char.level || 1}</span>
          </div>
        </div>
        <div class="flex-1 flex flex-col gap-1.5 w-full">
          <div class="flex justify-between items-center mb-0.5">
            <span class="text-sm font-bold text-gray-100 flex items-center gap-1.5 tracking-wide">${char.name} ${statusIcon}</span>
            <span class="text-[10px] font-bold ${needsHeal ? 'text-blue-400 bg-blue-900/30 border border-blue-500/30' : 'text-gray-500 bg-gray-800 border border-gray-700'} px-1.5 py-0.5 rounded shadow-sm">
              ${needsHeal ? '回復対象' : '万全'}
            </span>
          </div>
          <div class="flex flex-col gap-1">
            ${createStatusBar({ label: 'HP', current: Math.floor(char.hp.current), max: trueMaxHp, ...BAR_COLORS.hp })}
            ${createStatusBar({ label: 'MP', current: Math.floor(char.mp.current), max: trueMaxMp, ...BAR_COLORS.mp })}
          </div>
        </div>
      `;
      statusContainer.appendChild(row);
    });

    if (currentCost > 0) {
      btnRest.disabled = false;
      btnRest.innerHTML = `
        <span class="material-symbols-outlined text-xl drop-shadow-md" style="font-variation-settings: 'FILL' 1">hotel</span>
        <span class="relative z-10 truncate tracking-widest text-sm">休む (${formatNumber(currentCost)} G)</span>
      `;
    } else {
      btnRest.disabled = true;
      btnRest.innerHTML = `
        <span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' 1">check_circle</span>
        <span class="relative z-10 tracking-widest text-sm text-gray-400">回復不要</span>
      `;
    }
  };

  btnRest.onclick = async () => {
    if (currentCost <= 0) return;

    const gold = await GameDB.getGameState('gold') || 0;
    if (gold < currentCost) {
      alert('ゴールドが足りません！');
      return;
    }

    // Deduct gold first
    const newGold = gold - currentCost;
    await GameDB.setGameState('gold', newGold);
    
    // Update header gold display
    const goldDisplay = document.getElementById('header-gold-display');
    if (goldDisplay) goldDisplay.textContent = `${formatNumber(newGold)}`;

    const rawEquip = await GameDB.getAllEquipment();
    const equipMap = buildEquipmentMap(rawEquip);

    // Heal party
    for (const char of currentParty) {
      const stats = calcFinalStats(char, equipMap);
      const trueMaxHp = stats.hp || char.hp.max;
      const trueMaxMp = stats.mp || char.mp.max;

      const isDead = char.hp.current <= 0;
      if (char.hp.current < trueMaxHp || char.mp.current < trueMaxMp || isDead) {
        char.hp.current = trueMaxHp;
        char.mp.current = trueMaxMp;
        char.isDead = false; 
        await GameDB.putCharacter(char);
      }
    }

    // Simple Flash Effect
    const flash = document.createElement('div');
    flash.className = 'fixed inset-0 bg-white z-[10000] opacity-0 pointer-events-none transition-opacity duration-200';
    document.body.appendChild(flash);

    // Block interaction on button
    btnRest.disabled = true;

    // Trigger flash and heal
    requestAnimationFrame(() => {
      flash.style.opacity = '0.5';
      
      setTimeout(() => {
        flash.style.opacity = '0';
        
        // Apply healing and re-render status
        renderStatus();
        
        setTimeout(() => {
          flash.remove();
        }, 200);
      }, 100);
    });
  };

  // Initial render
  renderStatus();

  return container;
}
