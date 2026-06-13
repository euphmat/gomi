import { GameDB } from '../../data/database.js';
import { createStatusBar, BAR_COLORS } from '../../components/status-bar.js';
import { calcFinalStats, buildEquipmentMap, getCharactersWithRanchBonus } from '../../data/stat-calculator.js';

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
  btnRest.className = 'group relative px-8 py-3.5 w-full max-w-[240px] justify-center bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 active:scale-95 disabled:bg-none disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 disabled:cursor-not-allowed disabled:shadow-inner disabled:active:scale-100 text-white font-bold rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-blue-400/50 transition-all duration-300 flex items-center gap-2 overflow-hidden';
  
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
        currentCost += (char.level || 1);
      }

      const isLowHp = char.hp.current / trueMaxHp < 0.3;
      const statusIcon = isDead 
        ? `<span class="material-symbols-outlined text-gray-500 text-sm" style="font-variation-settings: 'FILL' 1">skull</span>` 
        : (needsHeal ? `<span class="material-symbols-outlined text-yellow-500 text-sm" style="font-variation-settings: 'FILL' 1">local_hospital</span>` : `<span class="material-symbols-outlined text-green-400 text-sm" style="font-variation-settings: 'FILL' 1">check_circle</span>`);

      const row = document.createElement('div');
      row.className = `group flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300 shadow-md ${needsHeal ? 'bg-slate-800/80 border-blue-500/30 hover:border-blue-400/50 hover:bg-slate-800' : 'bg-slate-900/40 border-slate-700/30 opacity-70'}`;
      
      row.innerHTML = `
        <div class="w-14 h-14 rounded-xl overflow-hidden border-2 ${isDead ? 'border-red-900/50 grayscale' : (needsHeal ? 'border-blue-500/30' : 'border-slate-600/30')} bg-slate-900 shrink-0 relative shadow-inner">
          <img src="${char.iconImage}" class="w-full h-full object-cover ${isDead ? 'opacity-40' : ''} group-hover:scale-110 transition-transform duration-300" onerror="this.style.display='none'">
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
        <span class="relative z-10 tracking-widest text-sm">休む (${currentCost} G)</span>
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
    if (goldDisplay) goldDisplay.textContent = ` Gold : ${newGold.toLocaleString()} `;

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

    // Effect Overlay
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-gradient-to-b from-slate-950 via-indigo-950/95 to-slate-950 z-[9999] opacity-0 backdrop-blur-md transition-opacity duration-700 flex flex-col items-center justify-center pointer-events-auto';
    overlay.innerHTML = `
      <div class="flex flex-col items-center gap-6 max-w-sm w-full px-8 relative">
        <!-- Pulse Glow Background -->
        <div class="absolute w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl animate-inn-pulse-glow"></div>
        
        <!-- Main Floating Icon -->
        <div class="relative flex items-center justify-center w-24 h-24 bg-slate-900/60 rounded-full border border-indigo-500/20 shadow-[0_0_25px_rgba(99,102,241,0.2)] animate-inn-float z-10">
          <span class="material-symbols-outlined text-indigo-400 text-5xl transition-all duration-300" style="font-variation-settings: 'FILL' 1" id="inn-icon">hotel</span>
        </div>
        
        <!-- Zzz Container -->
        <div id="zzz-container" class="absolute w-full h-40 -top-16 pointer-events-none z-20 overflow-hidden"></div>

        <!-- Text Info -->
        <div class="flex flex-col items-center gap-1.5 z-10 text-center">
          <span class="text-white text-base font-bold tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] min-h-[28px] flex items-center" id="inn-status-text">チェックイン中...</span>
          <span class="text-indigo-300/80 text-xs font-semibold tracking-wider" id="inn-progress-text">0%</span>
        </div>

        <!-- Progress Bar Container -->
        <div class="w-64 h-2.5 bg-slate-900/90 rounded-full border border-white/10 overflow-hidden relative shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] z-10">
          <!-- Glow Gradient Progress Bar -->
          <div class="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-75 ease-out shadow-[0_0_12px_rgba(168,85,247,0.7)]" style="width: 0%;" id="inn-progress-bar"></div>
          <!-- Shimmer line effect -->
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Block interaction on button
    btnRest.disabled = true;
    
    // Fade in overlay
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    // Elements
    const progressBar = overlay.querySelector('#inn-progress-bar');
    const progressText = overlay.querySelector('#inn-progress-text');
    const statusText = overlay.querySelector('#inn-status-text');
    const innIcon = overlay.querySelector('#inn-icon');
    const zzzContainer = overlay.querySelector('#zzz-container');

    const duration = 2200; // ms
    const startTime = performance.now();
    let zzzInterval = null;

    // Spawn Zzz elements
    const spawnZzz = () => {
      const zzz = document.createElement('span');
      zzz.className = 'absolute text-indigo-300 font-bold select-none pointer-events-none animate-zzz drop-shadow';
      
      // Random styling
      const size = Math.random() > 0.6 ? 'text-lg' : (Math.random() > 0.3 ? 'text-base' : 'text-xs');
      zzz.classList.add(size);
      zzz.style.opacity = (Math.random() * 0.4 + 0.4).toFixed(2);
      
      // Random position (around center)
      const leftOffset = Math.floor(Math.random() * 60) - 30; // -30px to 30px
      zzz.style.left = `calc(50% + ${leftOffset}px)`;
      zzz.style.bottom = '10px';
      
      // Random movement offset
      const xOffset = Math.floor(Math.random() * 80) - 40; // -40px to 40px
      zzz.style.setProperty('--x-offset', `${xOffset}px`);
      
      // Zzz content
      const words = ['Z', 'z', 'Zz', 'Zzz...'];
      zzz.textContent = words[Math.floor(Math.random() * words.length)];
      
      zzzContainer.appendChild(zzz);
      
      // Remove after animation completes
      setTimeout(() => {
        zzz.remove();
      }, 2200);
    };

    // Update function
    const updateProgress = (now) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      
      // Update UI
      progressBar.style.width = `${pct}%`;
      progressText.textContent = `${Math.floor(pct)}%`;

      // Status texts and icons depending on progress
      if (pct < 20) {
        statusText.textContent = '🛏️ 部屋へ移動中...';
        innIcon.textContent = 'hotel';
      } else if (pct < 60) {
        statusText.textContent = '💤 ぐっすり夢の中...';
        innIcon.textContent = 'nights_stay';
        
        // Start spawning Zzz
        if (!zzzInterval) {
          zzzInterval = setInterval(spawnZzz, 300);
        }
      } else if (pct < 85) {
        statusText.textContent = '✨ 体力と魔力を回復中...';
        innIcon.textContent = 'local_hospital';
        
        // Stop spawning Zzz
        if (zzzInterval) {
          clearInterval(zzzInterval);
          zzzInterval = null;
        }
      } else if (pct < 100) {
        statusText.textContent = '☀️ 朝の光が差し込んできた...';
        innIcon.textContent = 'wb_sunny';
      } else {
        statusText.textContent = '🎶 すっきり目覚めた！';
        innIcon.textContent = 'check_circle';
        
        // Finalize
        if (zzzInterval) clearInterval(zzzInterval);
        onComplete();
        return;
      }

      requestAnimationFrame(updateProgress);
    };

    const onComplete = () => {
      // Create flash overlay
      const flash = document.createElement('div');
      flash.className = 'fixed inset-0 bg-white z-[10000] opacity-0 pointer-events-none animate-wakeup-flash';
      document.body.appendChild(flash);

      // Apply healing and re-render status
      renderStatus();

      // Clean up flash and fade out main overlay
      setTimeout(() => {
        flash.remove();
        
        // Fade out overlay
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
        }, 700);
      }, 600);
    };

    // Start animation
    requestAnimationFrame(updateProgress);
  };

  // Initial render
  renderStatus();

  return container;
}
