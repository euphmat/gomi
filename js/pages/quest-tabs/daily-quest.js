import { QuestManager, DAILY_QUESTS } from '../../data/quest-manager.js';
import { formatNumber } from '../../utils/format.js';

function getJSTNextMidnight() {
  const now = new Date();
  const jstTime = now.getTime() + (9 * 60 * 60 * 1000); // Now in JST
  const jstDate = new Date(jstTime);
  jstDate.setUTCHours(24, 0, 0, 0); // Next midnight in JST
  return new Date(jstDate.getTime() - (9 * 60 * 60 * 1000)); // Back to local time
}

function formatTimeLeft(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
  const s = (totalSecs % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function renderDailyQuestTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full overflow-hidden relative animate-fade-in pb-[calc(env(safe-area-inset-bottom,0px)+56px)]'; // 56px is roughly nav-bar height

  const renderContent = () => {
    container.innerHTML = '';

    // Header with timer
    const header = document.createElement('div');
    header.className = 'p-4 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between shrink-0';
    
    const titleGroup = document.createElement('div');
    titleGroup.innerHTML = `
      <h2 class="text-lg font-black text-emerald-400 flex items-center gap-2">
        <span class="material-symbols-outlined">today</span>デイリークエスト
      </h2>
      <div class="text-[10px] text-slate-500 font-bold mt-1">毎日0時にリセット</div>
    `;
    
    const timerBox = document.createElement('div');
    timerBox.className = 'bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 flex flex-col items-center shadow-inner';
    const timerLabel = document.createElement('span');
    timerLabel.className = 'text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-tight';
    timerLabel.textContent = '更新まで';
    const timerValue = document.createElement('span');
    timerValue.className = 'text-sm font-mono font-black text-emerald-300 tracking-wider leading-tight';
    
    timerBox.appendChild(timerLabel);
    timerBox.appendChild(timerValue);
    
    let timerInterval = setInterval(() => {
      const msLeft = getJSTNextMidnight().getTime() - Date.now();
      timerValue.textContent = formatTimeLeft(msLeft);
    }, 1000);
    // Initial call
    timerValue.textContent = formatTimeLeft(getJSTNextMidnight().getTime() - Date.now());

    // Clean up interval on detach
    const observer = new MutationObserver((mutations, obs) => {
      if (!document.contains(container)) {
        clearInterval(timerInterval);
        obs.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    header.appendChild(titleGroup);
    header.appendChild(timerBox);

    // Quests list
    const listContainer = document.createElement('div');
    listContainer.className = 'flex-1 overflow-y-auto p-3 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent';

    DAILY_QUESTS.forEach(quest => {
      const progress = QuestManager.getProgress(quest.id);
      const target = quest.target;
      const isCompleted = progress >= target;
      
      const itemEl = document.createElement('div');
      itemEl.className = `
        relative p-3 rounded-xl border flex flex-col gap-2 overflow-hidden
        ${isCompleted 
          ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
          : 'bg-slate-900/50 border-slate-800 shadow-sm'}
      `;

      if (isCompleted) {
        // Completion background glow
        const glow = document.createElement('div');
        glow.className = 'absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none';
        itemEl.appendChild(glow);
      }

      const topRow = document.createElement('div');
      topRow.className = 'flex items-center gap-3 relative z-10';
      
      const iconBox = document.createElement('div');
      iconBox.className = `
        w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border
        ${isCompleted 
          ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
          : 'bg-slate-800 border-slate-700 text-slate-400'}
      `;
      iconBox.innerHTML = `<span class="material-symbols-outlined text-[20px]">${isCompleted ? 'check_circle' : quest.icon}</span>`;
      
      const descBox = document.createElement('div');
      descBox.className = 'flex-1 min-w-0';
      descBox.innerHTML = `
        <div class="text-xs font-bold ${isCompleted ? 'text-emerald-100' : 'text-slate-200'} leading-snug">${quest.label}</div>
      `;

      topRow.appendChild(iconBox);
      topRow.appendChild(descBox);
      itemEl.appendChild(topRow);

      // Progress bar
      const percentage = Math.min(100, (progress / target) * 100);
      const barContainer = document.createElement('div');
      barContainer.className = 'mt-1 relative h-3.5 rounded-full overflow-hidden bg-slate-950 border border-slate-800/80 z-10 shadow-inner';
      
      const fillStr = isCompleted 
        ? 'background: linear-gradient(90deg, #10b981, #34d399);' 
        : 'background: linear-gradient(90deg, #3b82f6, #60a5fa);';

      barContainer.innerHTML = `
        <div class="absolute inset-y-0 left-0 transition-all duration-500" style="width: ${percentage}%; ${fillStr}"></div>
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-[9px] font-mono font-black text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,1)] tracking-wider">
            ${formatNumber(Math.min(progress, target))} / ${formatNumber(target)}
          </span>
        </div>
      `;
      itemEl.appendChild(barContainer);

      listContainer.appendChild(itemEl);
    });

    // Claim Button / Reward Section
    const rewardSection = document.createElement('div');
    rewardSection.className = 'p-4 border-t border-slate-800 bg-slate-900/80 shrink-0 flex flex-col items-center gap-3 backdrop-blur-md pb-[env(safe-area-inset-bottom,16px)]';
    
    const rewardBox = document.createElement('div');
    rewardBox.className = 'flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg shadow-inner';
    rewardBox.innerHTML = `
      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">コンプリート報酬</span>
      <div class="w-px h-4 bg-slate-800 mx-1"></div>
      <span class="material-symbols-outlined text-[16px] text-fuchsia-400">diamond</span>
      <span class="text-sm font-black text-fuchsia-300">1</span>
      <span class="text-[10px] font-bold text-fuchsia-400/70">プリズム</span>
    `;
    rewardSection.appendChild(rewardBox);

    const isAllCompleted = QuestManager.isAllDailyCompleted();
    const isClaimed = QuestManager.isClaimed();

    const claimBtn = document.createElement('button');
    if (isClaimed) {
      claimBtn.disabled = true;
      claimBtn.className = 'w-full max-w-sm py-3 rounded-xl font-bold text-sm bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed flex justify-center items-center gap-2';
      claimBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">done_all</span>受取済み`;
    } else if (isAllCompleted) {
      claimBtn.className = 'w-full max-w-sm py-3 rounded-xl font-black text-sm bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white transition-all active:scale-[0.98] flex justify-center items-center gap-2 shadow-[0_4px_20px_rgba(192,38,211,0.3)] hover:shadow-[0_4px_25px_rgba(192,38,211,0.5)] border border-fuchsia-400/30 cursor-pointer';
      claimBtn.innerHTML = `<span class="material-symbols-outlined text-[18px] animate-pulse">redeem</span>報酬を受け取る`;
      claimBtn.onclick = async () => {
        const success = await QuestManager.claimDailyReward();
        if (success) {
          // Play effect
          const effect = document.createElement('div');
          effect.className = 'fixed inset-0 pointer-events-none flex items-center justify-center z-[100] animate-fade-in';
          effect.style.background = 'radial-gradient(circle, rgba(232,121,249,0.3) 0%, transparent 60%)';
          effect.innerHTML = `
            <div class="flex flex-col items-center gap-2 animate-[slide-up_0.5s_ease-out]">
              <span class="material-symbols-outlined text-6xl text-fuchsia-400 drop-shadow-[0_0_15px_rgba(232,121,249,0.8)]">diamond</span>
              <span class="text-xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">報酬ゲット！</span>
            </div>
          `;
          document.body.appendChild(effect);
          setTimeout(() => {
            effect.style.opacity = '0';
            effect.style.transition = 'opacity 0.5s';
            setTimeout(() => effect.remove(), 500);
          }, 1500);

          renderContent(); // Re-render to show "Claimed"
        }
      };
    } else {
      claimBtn.disabled = true;
      claimBtn.className = 'w-full max-w-sm py-3 rounded-xl font-bold text-sm bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed flex justify-center items-center gap-2';
      claimBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">lock</span>未達成`;
    }

    rewardSection.appendChild(claimBtn);

    container.appendChild(header);
    container.appendChild(listContainer);
    container.appendChild(rewardSection);
  };

  // Re-render when progress updates
  const handleUpdate = () => {
    if (document.contains(container)) {
      renderContent();
    }
  };
  window.addEventListener('quest:progress-updated', handleUpdate);

  // Initial render
  renderContent();

  return container;
}
