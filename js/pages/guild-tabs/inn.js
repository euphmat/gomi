import { GameDB } from '../../data/database.js';
import { createStatusBar, BAR_COLORS } from '../../components/status-bar.js';

export function renderInnTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full p-4 animate-fade-in overflow-y-auto items-center';

  // Title & Description
  const header = document.createElement('div');
  header.className = 'text-center mb-6 bg-blue-900/40 p-4 rounded-xl border border-blue-500/30 w-full max-w-sm shadow-lg';
  header.innerHTML = `
    <div class="flex justify-center items-center gap-2 mb-2">
      <span class="material-symbols-outlined text-4xl text-blue-300" style="font-variation-settings: 'FILL' 1">storefront</span>
      <h2 class="text-2xl font-black text-gray-100 tracking-widest drop-shadow-md">宿屋へようこそ</h2>
    </div>
    <p class="text-[11px] text-gray-400 mt-1">HP・MPの全回復と戦闘不能の蘇生を行います。<br>（宿泊費：回復が必要な仲間のレベル合計 × 1 G）</p>
  `;
  container.appendChild(header);

  // Status Container
  const statusContainer = document.createElement('div');
  statusContainer.className = 'w-full max-w-sm flex flex-col gap-2 mb-6';
  container.appendChild(statusContainer);

  // Rest Button Container
  const btnContainer = document.createElement('div');
  btnContainer.className = 'w-full max-w-sm flex flex-col items-center gap-2 mt-auto pb-4';
  
  const btnRest = document.createElement('button');
  btnRest.className = 'px-8 py-3 w-full max-w-[200px] justify-center bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-colors flex items-center gap-2 relative overflow-hidden';
  
  btnContainer.appendChild(btnRest);
  container.appendChild(btnContainer);

  let currentCost = 0;
  let currentParty = [];

  const renderStatus = async () => {
    currentParty = await GameDB.getAllCharacters();
    statusContainer.innerHTML = '';
    currentCost = 0;
    
    currentParty.forEach(char => {
      const isDead = char.hp.current <= 0;
      const needsHeal = char.hp.current < char.hp.max || char.mp.current < char.mp.max || isDead;
      
      if (needsHeal) {
        currentCost += (char.level || 1);
      }

      const isLowHp = char.hp.current / char.hp.max < 0.3;
      const statusIcon = isDead 
        ? `<span class="material-symbols-outlined text-gray-500 text-sm" style="font-variation-settings: 'FILL' 1">skull</span>` 
        : (needsHeal ? `<span class="material-symbols-outlined text-yellow-500 text-sm" style="font-variation-settings: 'FILL' 1">local_hospital</span>` : `<span class="material-symbols-outlined text-green-400 text-sm" style="font-variation-settings: 'FILL' 1">check_circle</span>`);

      const row = document.createElement('div');
      row.className = `flex items-center gap-3 p-2 rounded-lg border ${needsHeal ? 'bg-gray-800/80 border-blue-500/30' : 'bg-gray-900/50 border-gray-700/50 opacity-80'}`;
      row.innerHTML = `
        <div class="w-11 h-11 rounded-lg overflow-hidden border ${isDead ? 'border-gray-600 grayscale' : 'border-gray-500'} bg-gray-900 shrink-0 relative">
          <img src="${char.iconImage}" class="w-full h-full object-cover ${isDead ? 'opacity-50' : ''}">
          <div class="absolute bottom-0 right-0 bg-black/60 rounded-tl px-1">
            <span class="text-[9px] font-bold text-gray-300">Lv${char.level || 1}</span>
          </div>
        </div>
        <div class="flex-1 flex flex-col gap-1.5">
          <div class="flex justify-between items-center mb-1">
            <span class="text-[12px] font-bold text-gray-200 flex items-center gap-1">${char.name} ${statusIcon}</span>
          </div>
          ${createStatusBar({ label: 'HP', current: Math.floor(char.hp.current), max: char.hp.max, ...BAR_COLORS.hp })}
          ${createStatusBar({ label: 'MP', current: Math.floor(char.mp.current), max: char.mp.max, ...BAR_COLORS.mp })}
        </div>
      `;
      statusContainer.appendChild(row);
    });

    if (currentCost > 0) {
      btnRest.disabled = false;
      btnRest.innerHTML = `<span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' 1">hotel</span> 休む (${currentCost} G)`;
    } else {
      btnRest.disabled = true;
      btnRest.innerHTML = `<span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' 1">check</span> 回復不要`;
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
    if (goldDisplay) goldDisplay.textContent = ` Gold : ${newGold.toLocaleString()} `;

    // Heal party
    for (const char of currentParty) {
      const isDead = char.hp.current <= 0;
      if (char.hp.current < char.hp.max || char.mp.current < char.mp.max || isDead) {
        char.hp.current = char.hp.max;
        char.mp.current = char.mp.max;
        char.isDead = false; 
        await GameDB.putCharacter(char);
      }
    }

    // Effect
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black z-[9999] opacity-0 transition-opacity duration-1000 flex items-center justify-center pointer-events-none';
    overlay.innerHTML = `<div class="flex flex-col items-center gap-4"><span class="material-symbols-outlined text-blue-400 text-6xl animate-pulse" style="font-variation-settings: 'FILL' 1">hotel</span><span class="text-white text-xl font-bold tracking-widest drop-shadow-lg">...Zzz...</span></div>`;
    document.body.appendChild(overlay);

    // Block interaction during fade
    btnRest.disabled = true;
    
    // Fade in
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    // Wait and fade out
    setTimeout(() => {
      renderStatus(); // re-render status while screen is black
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
      }, 1000);
    }, 1500);
  };

  // Initial render
  renderStatus();

  return container;
}
