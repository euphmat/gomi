import { GameDB } from '../../data/database.js';
import { getCharactersWithRanchBonus } from '../../data/stat-calculator.js';
import { createCharacterSelectGrid } from '../../components/character-select-grid.js';
import { JOBS } from '../../jobs/index.js';
import { formatNumber } from '../../utils/format.js';
/**
 * 「神殿」タブの画面 — 転職・転生・SPリセット
 */
export function renderChangeJobTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full p-2 animate-fade-in overflow-hidden';

  // 状態管理
  let characters = [];
  let selectedCharId = null;
  let currentGold = 0;
  let currentInnerTab = 'change-job'; // 'change-job' | 'rebirth' | 'sp-reset'

  // ─── 通知トースト ─────────────────────────────────────
  const showNotification = (parentEl, message, type = 'success') => {
    const existing = parentEl.querySelector('.job-notification');
    if (existing) existing.remove();

    const colors = type === 'success'
      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
      : 'bg-red-950/80 border-red-500/40 text-red-300';
    const icon = type === 'success' ? 'check_circle' : 'error';

    const toast = document.createElement('div');
    toast.className = `job-notification fixed top-16 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-xl border ${colors} shadow-lg animate-fade-in`;
    toast.innerHTML = `
      <span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' 1">${icon}</span>
      <span class="text-sm font-semibold">${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  };

  // ─── 転職処理 ─────────────────────────────────────────
  const changeJob = async (char, jobDef) => {
    const isUnlocked = char.unlockedJobs && char.unlockedJobs.includes(jobDef.id);
    const cost = jobDef.changeCost !== undefined ? jobDef.changeCost : 30000;

    // 未解放の場合、条件とゴールド確認
    if (!isUnlocked) {
      if (jobDef.requirements) {
        for (const req of jobDef.requirements) {
          const currentLv = char.jobLevels && char.jobLevels[req.jobId] ? char.jobLevels[req.jobId].level : (char.jobId === req.jobId ? char.jobLevel : 0);
          if (currentLv < req.level) {
            const jobName = JOBS[req.jobId] ? JOBS[req.jobId].name : req.jobId;
            showNotification(container, `条件未達成: ${jobName} Lv${req.level}が必要`, 'error');
            return;
          }
        }
      }

      const gold = await GameDB.getGameState('gold') || 0;
      if (gold < cost) {
        showNotification(container, 'ゴールドが足りません！', 'error');
        return;
      }
      currentGold = gold - cost;
      await GameDB.setGameState('gold', currentGold);
      const goldDisplay = document.getElementById('header-gold-display');
    if (goldDisplay) goldDisplay.textContent = ` Gold : ${formatNumber(currentGold)} `;
      
      if (!char.unlockedJobs) char.unlockedJobs = ['norvice'];
      char.unlockedJobs.push(jobDef.id);
    }

    if (!char.jobLevels) char.jobLevels = {};
    char.jobLevels[char.jobId] = {
      level: char.jobLevel,
      jp: { current: char.jp.current, max: char.jp.max }
    };

    const savedJob = char.jobLevels[jobDef.id];
    if (savedJob) {
      char.jobLevel = savedJob.level;
      char.jp = { current: savedJob.jp.current, max: savedJob.jp.max };
    } else {
      char.jobLevel = 1;
      char.jp = { current: 0, max: 20 };
    }

    if (!char.jobSkills) char.jobSkills = {};
    if (!char.jobSkills[jobDef.id]) char.jobSkills[jobDef.id] = {};

    char.jobId = jobDef.id;
    char.jobName = jobDef.name;
    char.iconImage = `./assets/job/job_${jobDef.id}.webp`;

    // 転職時は継承スキルをすべてリセットする
    char.inheritedActiveSkill = null;
    char.inheritedPassiveSkill = null;

    // ジョブごとのSPを再計算
    let spentSP = 0;
    const job = JOBS[char.jobId];
    if (job && char.jobSkills && char.jobSkills[char.jobId]) {
      for (const [skillId, level] of Object.entries(char.jobSkills[char.jobId])) {
        const skill = job.skills.find(s => s.id === skillId);
        if (!skill) continue;
        for (let i = 1; i <= level; i++) {
          const lConf = skill.levels.find(l => l.level === i);
          if (lConf && lConf.spCost) spentSP += lConf.spCost;
        }
      }
    }
    char.sp = Math.max(0, (char.jobLevel || 1) - 1) - spentSP;

    await GameDB.putCharacter(char);
    characters = await getCharactersWithRanchBonus();
    showNotification(container, `${char.name} は ${jobDef.name} に転職した！`, 'success');
    render();
  };



  const showActionModal = (title, message, costHtml, onConfirm, confirmText = '実行する', confirmColor = 'indigo') => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in';

    overlay.innerHTML = `
      <div class="bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-[280px] shadow-2xl overflow-hidden animate-fade-in relative">
        <div class="p-5 text-center">
          <h3 class="text-base font-bold text-gray-100 mb-2">${title}</h3>
          <p class="text-[11px] text-gray-400 mb-3 leading-relaxed whitespace-pre-wrap">${message}</p>
          ${costHtml ? `<div class="mb-5">${costHtml}</div>` : '<div class="mb-5"></div>'}
          <div class="flex gap-2 mt-2">
            <button id="btn-cancel-action" class="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-bold rounded-xl border border-gray-700 transition-colors">キャンセル</button>
            <button id="btn-confirm-action" class="flex-1 py-2.5 bg-${confirmColor}-600 hover:bg-${confirmColor}-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-${confirmColor}-900/50">${confirmText}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-cancel-action').addEventListener('click', () => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 200);
    });

    overlay.querySelector('#btn-confirm-action').addEventListener('click', async () => {
      const btn = overlay.querySelector('#btn-confirm-action');
      btn.disabled = true;
      btn.textContent = '処理中...';
      await onConfirm();
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 200);
    });
  };

  // ─── 転生処理 ─────────────────────────────────────────
  const executeRebirth = async (char) => {
    if (char.level < 40) return;

    const cost = 10000;
    const gold = await GameDB.getGameState('gold') || 0;
    if (gold < cost) {
      showNotification(container, 'ゴールドが足りません！', 'error');
      return;
    }

    currentGold = gold - cost;
    await GameDB.setGameState('gold', currentGold);
    const goldDisplay = document.getElementById('header-gold-display');
    if (goldDisplay) goldDisplay.textContent = ` Gold : ${formatNumber(currentGold)} `;

    const oldBase = char.baseStats;
    const oldHp = char.hp.max;
    const oldMp = char.mp.max;

    if (!char.rebirthBonus) {
      char.rebirthBonus = { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 };
    }

    char.rebirthBonus.hp += Math.floor(oldHp * 0.1);
    char.rebirthBonus.mp += Math.floor(oldMp * 0.1);
    char.rebirthBonus.atk += Math.floor(oldBase.atk * 0.1);
    char.rebirthBonus.def += Math.floor(oldBase.def * 0.1);
    char.rebirthBonus.matk += Math.floor(oldBase.matk * 0.1);
    char.rebirthBonus.mdef += Math.floor(oldBase.mdef * 0.1);
    char.rebirthBonus.spd += Math.floor(oldBase.spd * 0.1);

    char.level = 1;
    char.exp = { current: 0, max: 100 };
    char.baseStats = { atk: 1, def: 1, matk: 1, mdef: 1, spd: 1 };
    char.hp.max = 10;
    char.hp.current = 10;
    char.mp.max = 10;
    char.mp.current = 10;

    await GameDB.putCharacter(char);
    characters = await getCharactersWithRanchBonus();
    showNotification(container, `${char.name} は転生した！`, 'success');
    render();
  };

  // ─── SPリセット処理 ────────────────────────────────────
  const executeSpReset = async (char) => {
    const cost = char.jobLevel * 1000;
    const gold = await GameDB.getGameState('gold') || 0;
    if (gold < cost) {
      showNotification(container, 'ゴールドが足りません！', 'error');
      return;
    }

    // ゴールド消費
    currentGold = gold - cost;
    await GameDB.setGameState('gold', currentGold);
    const goldDisplay = document.getElementById('header-gold-display');
    if (goldDisplay) goldDisplay.textContent = ` Gold : ${formatNumber(currentGold)} `;

    // 現在の職業のスキルをクリア
    if (char.jobSkills && char.jobSkills[char.jobId]) {
      char.jobSkills[char.jobId] = {};
    }

    char.sp = Math.max(0, (char.jobLevel || 1) - 1);

    await GameDB.putCharacter(char);
    characters = await getCharactersWithRanchBonus();
    showNotification(container, `SPをリセットしました！`, 'success');
    render();
  };

  // ─── レンダリング: 内部タブ ──────────────────────────────
  const renderInnerTabs = () => {
    const tabContainer = document.createElement('div');
    tabContainer.className = 'flex gap-2 px-1 mb-3 shrink-0';
    
    const tabs = [
      { id: 'change-job', label: '転職', icon: 'sync_alt' },
      { id: 'rebirth', label: '転生', icon: 'auto_awesome' },
      { id: 'sp-reset', label: 'SPリセット', icon: 'restart_alt' }
    ];

    tabs.forEach(tab => {
      const isActive = currentInnerTab === tab.id;
      const btn = document.createElement('button');
      btn.className = `flex-1 py-2 flex items-center justify-center gap-1 text-[12px] font-black rounded-lg transition-all duration-200 border ${isActive ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_10px_rgba(79,70,229,0.4)]' : 'bg-gray-800 text-gray-400 border-white/5 hover:bg-gray-700'}`;
      btn.innerHTML = `<span class="material-symbols-outlined text-[16px]">${tab.icon}</span>${tab.label}`;
      btn.onclick = () => {
        if (currentInnerTab !== tab.id) {
          currentInnerTab = tab.id;
          render();
        }
      };
      tabContainer.appendChild(btn);
    });

    return tabContainer;
  };

  // ─── レンダリング: 転職タブ ─────────────────────────────
  const renderChangeJobInnerTab = (char) => {
    const listContainer = document.createElement('div');
    listContainer.className = 'flex-1 overflow-y-auto space-y-3 pb-6 pr-1';

    Object.values(JOBS).forEach(job => {
      const isCurrent = job.id === char.jobId;
      const isUnlocked = char.unlockedJobs && char.unlockedJobs.includes(job.id);
      const savedJob = char.jobLevels && char.jobLevels[job.id];
      const savedLevel = savedJob ? savedJob.level : (isCurrent ? char.jobLevel : 1);
      const cost = job.changeCost !== undefined ? job.changeCost : 30000;

      let allReqsMet = true;
      let requirementsHtml = '';
      if (!isUnlocked && job.requirements) {
        for (const req of job.requirements) {
          const reqJobName = JOBS[req.jobId] ? JOBS[req.jobId].name : req.jobId;
          const currentLv = char.jobLevels && char.jobLevels[req.jobId] ? char.jobLevels[req.jobId].level : (char.jobId === req.jobId ? char.jobLevel : 0);
          const isMet = currentLv >= req.level;
          if (!isMet) allReqsMet = false;
          
          const badgeClass = isMet 
            ? 'bg-emerald-900/30 border-emerald-600/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
            : 'bg-rose-900/30 border-rose-600/50 text-rose-300 shadow-[0_0_10px_rgba(225,29,72,0.1)]';
          const iconHtml = isMet 
            ? '<span class="material-symbols-outlined text-[11px] leading-none drop-shadow-sm text-emerald-400">check_circle</span>' 
            : '<span class="material-symbols-outlined text-[11px] leading-none drop-shadow-sm text-rose-400">cancel</span>';
          
          requirementsHtml += `
            <div class="flex items-center gap-1 px-2 py-0.5 rounded-full border ${badgeClass} backdrop-blur-sm shrink-0" title="条件: ${reqJobName} Lv${req.level}">
              <img src="./assets/job/job_${req.jobId}.webp" class="w-3.5 h-3.5 object-contain drop-shadow-md" alt="${reqJobName}" onerror="this.style.display='none'">
              <span class="text-[9px] font-black flex items-center gap-0.5 tracking-wide">${reqJobName} Lv.${req.level} ${iconHtml}</span>
            </div>
          `;
        }
      }

      const row = document.createElement('div');
      row.className = `group flex items-center gap-4 p-4 rounded-3xl border transition-all duration-300 relative overflow-hidden backdrop-blur-md ${
        isCurrent
          ? 'bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-inset ring-emerald-500/20'
          : 'bg-slate-900/60 border-slate-700/60 hover:bg-slate-800/80 hover:border-indigo-500/50 hover:shadow-[0_8px_30px_rgba(99,102,241,0.2)] hover:-translate-y-1 cursor-pointer btn-change-job-container ring-1 ring-inset ring-white/5'
      }`;
      if (!isCurrent) row.dataset.jobId = job.id;

      const glow = isCurrent 
        ? `<div class="absolute -inset-2 bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent blur-2xl opacity-60 pointer-events-none"></div>`
        : `<div class="absolute -inset-2 bg-gradient-to-r from-indigo-500/0 via-purple-500/0 to-indigo-500/0 group-hover:from-indigo-500/20 group-hover:via-purple-500/10 transition-all duration-700 blur-2xl pointer-events-none"></div>`;

      const buttonHtml = isCurrent
        ? `<div class="relative px-5 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-black tracking-widest rounded-xl border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center gap-1.5"><span class="material-symbols-outlined text-[14px]">verified</span>装備中</div>`
        : isUnlocked
          ? `<button class="btn-change-job relative px-8 py-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-black rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] border border-white/20 transition-all duration-300 shrink-0 overflow-hidden hover:scale-105 active:scale-95 group/btn" data-job-id="${job.id}">
              <div class="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span class="relative tracking-widest flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">swap_horiz</span>転職</span>
            </button>`
          : (currentGold >= cost && allReqsMet)
            ? `<button class="btn-change-job relative px-6 py-2.5 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-black rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.4)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.6)] border border-amber-300/40 transition-all duration-300 shrink-0 flex items-center gap-1.5 overflow-hidden hover:scale-105 active:scale-95 group/btn" data-job-id="${job.id}">
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>
                <span class="relative material-symbols-outlined text-[16px] drop-shadow-md" style="font-variation-settings: 'FILL' 1;">paid</span>
                <span class="relative tracking-wide drop-shadow-md">${formatNumber(cost)} G</span>
              </button>`
            : `<button class="relative px-6 py-2.5 bg-slate-800/80 text-slate-500 text-xs font-black rounded-xl shrink-0 flex items-center gap-1.5 border border-slate-700/80 cursor-not-allowed opacity-60 backdrop-blur-sm" disabled>
                <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">paid</span>
                <span class="tracking-wide">${formatNumber(cost)} G</span>
              </button>`;

      row.innerHTML = `
        ${glow}
        <div class="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shrink-0 border border-slate-700/60 shadow-inner group-hover:border-indigo-400/40 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all duration-300 overflow-hidden p-1.5 z-10">
          <img src="./assets/job/job_${job.id}.webp" class="w-full h-full object-contain ${isCurrent ? 'opacity-100 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)] scale-110' : 'opacity-85 group-hover:opacity-100 group-hover:scale-110 transition-transform duration-500'}" alt="${job.name}" onerror="this.src='./assets/job/job_norvice.webp'">
        </div>
        <div class="relative flex-1 min-w-0 pr-2 z-10">
          <h3 class="text-[17px] font-black tracking-wider mb-1 transition-colors duration-300 ${isCurrent ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-300 group-hover:from-white group-hover:to-indigo-200'}">${job.name}</h3>
          <div class="flex items-center flex-wrap gap-2">
            <span class="text-[10px] font-black text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-600/50 shadow-inner uppercase tracking-widest flex items-center gap-0.5 shrink-0"><span class="material-symbols-outlined text-[10px] text-slate-400">military_tech</span>JLv.${savedLevel}</span>
            ${isUnlocked && !isCurrent ? '<span class="flex items-center gap-0.5 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)] uppercase tracking-wider shrink-0"><span class="material-symbols-outlined text-[12px]">lock_open</span>解放済</span>' : ''}
            ${requirementsHtml}
          </div>
        </div>
        <div class="relative z-10">
          ${buttonHtml}
        </div>
      `;
      listContainer.appendChild(row);
    });

    listContainer.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-change-job');
      const row = e.target.closest('.btn-change-job-container');
      let jobId = null;
      if (btn) jobId = btn.dataset.jobId;
      else if (row) jobId = row.dataset.jobId;
      if (!jobId) return;

      const jobDef = JOBS[jobId];
      if (!jobDef || char.jobId === jobId) return;

      const targetBtn = btn || row.querySelector('.btn-change-job');
      if (targetBtn) {
        targetBtn.disabled = true;
        const span = targetBtn.querySelector('span.tracking-wider') || targetBtn.querySelector('span.tracking-wide');
        if (span) span.textContent = '転職中...';
      }

      await changeJob(char, jobDef);
    });

    return listContainer;
  };

  // ─── レンダリング: 転生タブ ──────────────────────────────
  const renderRebirthInnerTab = (char) => {
    const container = document.createElement('div');
    container.className = 'flex-1 overflow-y-auto space-y-4 pb-6 px-1';

    const cost = 10000;
    const canRebirthLevel = char.level >= 40;
    const canRebirthGold = currentGold >= cost;
    const canRebirth = canRebirthLevel && canRebirthGold;

    const bonusHp = Math.floor(char.hp.max * 0.1);
    const bonusMp = Math.floor(char.mp.max * 0.1);
    const bonusAtk = Math.floor((char.baseStats.atk || 0) * 0.1);
    const bonusDef = Math.floor((char.baseStats.def || 0) * 0.1);
    const bonusMatk = Math.floor((char.baseStats.matk || 0) * 0.1);
    const bonusMdef = Math.floor((char.baseStats.mdef || 0) * 0.1);
    const bonusSpd = Math.floor((char.baseStats.spd || 0) * 0.1);

    const cumHp = (char.rebirthBonus?.hp || 0) + bonusHp;
    const cumMp = (char.rebirthBonus?.mp || 0) + bonusMp;
    const cumAtk = (char.rebirthBonus?.atk || 0) + bonusAtk;
    const cumDef = (char.rebirthBonus?.def || 0) + bonusDef;
    const cumMatk = (char.rebirthBonus?.matk || 0) + bonusMatk;
    const cumMdef = (char.rebirthBonus?.mdef || 0) + bonusMdef;
    const cumSpd = (char.rebirthBonus?.spd || 0) + bonusSpd;

    container.innerHTML = `
      <div class="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4">
        <h3 class="text-indigo-300 font-bold mb-2 flex items-center gap-2"><span class="material-symbols-outlined">auto_awesome</span>転生とは</h3>
        <p class="text-sm text-gray-300 leading-relaxed">ベースレベル40以上で実行可能な儀式です。現在の装備を除いた基礎能力の10%を永続ボーナスとして引き継ぎ、レベル1から再度育成することができます。ジョブレベルや習得スキルは失われません。</p>
      </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          <div class="flex flex-col items-center justify-center px-2 py-2 rounded-lg border bg-red-500/10 border-red-500/20 shadow-sm">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[14px] text-red-400">favorite</span>
              <span class="text-[12px] font-bold text-slate-300">HP</span>
              <span class="text-[14px] font-black text-red-400 drop-shadow-md">+${bonusHp}</span>
            </div>
            <div class="text-[10px] font-bold text-red-300/80 bg-red-900/40 px-2 py-0.5 rounded border border-red-500/30 w-full text-center mt-1.5 flex justify-center items-center gap-1">
              <span>累計:</span><span class="text-[12px] font-black text-red-400 drop-shadow-[0_0_3px_rgba(248,113,113,0.8)]">+${cumHp}</span>
            </div>
          </div>
          <div class="flex flex-col items-center justify-center px-2 py-2 rounded-lg border bg-blue-500/10 border-blue-500/20 shadow-sm">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[14px] text-blue-400">water_drop</span>
              <span class="text-[12px] font-bold text-slate-300">MP</span>
              <span class="text-[14px] font-black text-blue-400 drop-shadow-md">+${bonusMp}</span>
            </div>
            <div class="text-[10px] font-bold text-blue-300/80 bg-blue-900/40 px-2 py-0.5 rounded border border-blue-500/30 w-full text-center mt-1.5 flex justify-center items-center gap-1">
              <span>累計:</span><span class="text-[12px] font-black text-blue-400 drop-shadow-[0_0_3px_rgba(96,165,250,0.8)]">+${cumMp}</span>
            </div>
          </div>
          <div class="flex flex-col items-center justify-center px-2 py-2 rounded-lg border bg-orange-500/10 border-orange-500/20 shadow-sm">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[14px] text-orange-400">swords</span>
              <span class="text-[12px] font-bold text-slate-300">ATK</span>
              <span class="text-[14px] font-black text-orange-400 drop-shadow-md">+${bonusAtk}</span>
            </div>
            <div class="text-[10px] font-bold text-orange-300/80 bg-orange-900/40 px-2 py-0.5 rounded border border-orange-500/30 w-full text-center mt-1.5 flex justify-center items-center gap-1">
              <span>累計:</span><span class="text-[12px] font-black text-orange-400 drop-shadow-[0_0_3px_rgba(251,146,60,0.8)]">+${cumAtk}</span>
            </div>
          </div>
          <div class="flex flex-col items-center justify-center px-2 py-2 rounded-lg border bg-green-500/10 border-green-500/20 shadow-sm">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[14px] text-green-400">shield</span>
              <span class="text-[12px] font-bold text-slate-300">DEF</span>
              <span class="text-[14px] font-black text-green-400 drop-shadow-md">+${bonusDef}</span>
            </div>
            <div class="text-[10px] font-bold text-green-300/80 bg-green-900/40 px-2 py-0.5 rounded border border-green-500/30 w-full text-center mt-1.5 flex justify-center items-center gap-1">
              <span>累計:</span><span class="text-[12px] font-black text-green-400 drop-shadow-[0_0_3px_rgba(74,222,128,0.8)]">+${cumDef}</span>
            </div>
          </div>
          <div class="flex flex-col items-center justify-center px-2 py-2 rounded-lg border bg-fuchsia-500/10 border-fuchsia-500/20 shadow-sm">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[14px] text-fuchsia-400">auto_fix_high</span>
              <span class="text-[12px] font-bold text-slate-300">MAT</span>
              <span class="text-[14px] font-black text-fuchsia-400 drop-shadow-md">+${bonusMatk}</span>
            </div>
            <div class="text-[10px] font-bold text-fuchsia-300/80 bg-fuchsia-900/40 px-2 py-0.5 rounded border border-fuchsia-500/30 w-full text-center mt-1.5 flex justify-center items-center gap-1">
              <span>累計:</span><span class="text-[12px] font-black text-fuchsia-400 drop-shadow-[0_0_3px_rgba(232,121,249,0.8)]">+${cumMatk}</span>
            </div>
          </div>
          <div class="flex flex-col items-center justify-center px-2 py-2 rounded-lg border bg-indigo-500/10 border-indigo-500/20 shadow-sm">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[14px] text-indigo-400">gpp_good</span>
              <span class="text-[12px] font-bold text-slate-300">MDF</span>
              <span class="text-[14px] font-black text-indigo-400 drop-shadow-md">+${bonusMdef}</span>
            </div>
            <div class="text-[10px] font-bold text-indigo-300/80 bg-indigo-900/40 px-2 py-0.5 rounded border border-indigo-500/30 w-full text-center mt-1.5 flex justify-center items-center gap-1">
              <span>累計:</span><span class="text-[12px] font-black text-indigo-400 drop-shadow-[0_0_3px_rgba(129,140,248,0.8)]">+${cumMdef}</span>
            </div>
          </div>
          <div class="flex flex-col items-center justify-center px-2 py-2 rounded-lg border bg-yellow-500/10 border-yellow-500/20 shadow-sm">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[14px] text-yellow-400">speed</span>
              <span class="text-[12px] font-bold text-slate-300">SPD</span>
              <span class="text-[14px] font-black text-yellow-400 drop-shadow-md">+${bonusSpd}</span>
            </div>
            <div class="text-[10px] font-bold text-yellow-300/80 bg-yellow-900/40 px-2 py-0.5 rounded border border-yellow-500/30 w-full text-center mt-1.5 flex justify-center items-center gap-1">
              <span>累計:</span><span class="text-[12px] font-black text-yellow-400 drop-shadow-[0_0_3px_rgba(250,204,21,0.8)]">+${cumSpd}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="text-center mt-6">
        ${!canRebirthLevel
          ? `<button class="px-8 py-3 bg-gray-800 text-gray-500 font-bold rounded-xl border border-gray-700 cursor-not-allowed opacity-60" disabled>レベル40が必要です (現在Lv.${char.level})</button>`
          : !canRebirthGold
            ? `<button class="px-8 py-3 bg-gray-800 text-gray-500 font-bold rounded-xl border border-gray-700 cursor-not-allowed opacity-60 flex items-center justify-center gap-2 mx-auto" disabled><span class="material-symbols-outlined text-[20px]">paid</span>${formatNumber(cost)} G が必要です</button>`
            : `<button id="btn-execute-rebirth" class="px-8 py-3 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(192,38,211,0.4)] hover:shadow-[0_0_30px_rgba(192,38,211,0.6)] transition-all flex items-center justify-center gap-2 mx-auto"><span class="material-symbols-outlined text-[20px]">paid</span>${formatNumber(cost)} G で転生する</button>`
        }
      </div>
    `;

    if (canRebirth) {
      container.querySelector('#btn-execute-rebirth').onclick = () => {
        showActionModal(
          '転生の確認',
          `${char.name} を転生させますか？\nレベルは1に戻りますが、ボーナスステータスを獲得します。`,
          null,
          () => executeRebirth(char),
          '転生する',
          'fuchsia'
        );
      };
    }

    return container;
  };

  // ─── レンダリング: SPリセットタブ ────────────────────────
  const renderSpResetInnerTab = (char) => {
    const container = document.createElement('div');
    container.className = 'flex-1 overflow-y-auto space-y-4 pb-6 px-1';

    const cost = char.jobLevel * 1000;
    const canReset = currentGold >= cost;

    container.innerHTML = `
      <div class="bg-amber-950/30 border border-amber-500/20 rounded-xl p-4">
        <h3 class="text-amber-300 font-bold mb-2 flex items-center gap-2"><span class="material-symbols-outlined">restart_alt</span>SPリセット</h3>
        <p class="text-sm text-gray-300 leading-relaxed">現在の職業「<span class="text-white font-bold">${char.jobName}</span>」で習得したすべてのスキルを忘れ、消費したSPを還元します。振り直しを行いたい場合に実行してください。</p>
      </div>

      <div class="flex items-center justify-between bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <div class="text-gray-300 font-bold">リセット費用</div>
        <div class="text-2xl font-black text-amber-400 drop-shadow-md">${formatNumber(cost)} <span class="text-lg">G</span></div>
      </div>

      <div class="text-center mt-6">
        ${canReset 
          ? `<button id="btn-execute-sp-reset" class="px-8 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] transition-all">SPをリセットする</button>`
          : `<button class="px-8 py-3 bg-gray-800 text-gray-500 font-bold rounded-xl border border-gray-700 cursor-not-allowed">ゴールドが足りません</button>`
        }
      </div>
    `;

    if (canReset) {
      container.querySelector('#btn-execute-sp-reset').onclick = () => {
        showActionModal(
          'SPリセットの確認',
          `本当に ${char.jobName} のスキルをリセットしますか？`,
          `<p class="text-xs text-amber-400 font-bold flex items-center justify-center gap-1"><span class="material-symbols-outlined text-[14px]">paid</span>費用: ${formatNumber(cost)} G</p>`,
          () => executeSpReset(char),
          'リセット',
          'amber'
        );
      };
    }

    return container;
  };

  // ─── レンダリング ───────────────────────────────────────
  const render = () => {
    container.innerHTML = '';

    // キャラクター選択グリッド (上部)
    if (characters.length > 0) {
      const grid = createCharacterSelectGrid(characters, selectedCharId, (id) => {
        selectedCharId = id;
        render();
      });
      container.appendChild(grid);
    }

    const selectedChar = characters.find(c => c.id === selectedCharId);
    if (!selectedChar) return;

    // 内部タブ表示
    container.appendChild(renderInnerTabs());

    // 選択されたタブのコンテンツ
    let content;
    if (currentInnerTab === 'change-job') {
      content = renderChangeJobInnerTab(selectedChar);
    } else if (currentInnerTab === 'rebirth') {
      content = renderRebirthInnerTab(selectedChar);
    } else if (currentInnerTab === 'sp-reset') {
      content = renderSpResetInnerTab(selectedChar);
    }

    if (content) {
      container.appendChild(content);
    }
  };

  // ─── 初期データロード ──────────────────────────────────
  Promise.all([getCharactersWithRanchBonus(), GameDB.getGameState('gold')]).then(async ([chars, goldVal]) => {
    characters = chars;
    currentGold = goldVal || 0;

    for (const char of characters) {
      let needSave = false;
      if (!char.unlockedJobs) {
        char.unlockedJobs = [char.jobId];
        needSave = true;
      }
      if (!char.jobLevels) {
        char.jobLevels = {};
        needSave = true;
      }
      if (needSave) {
        await GameDB.putCharacter(char);
      }
    }

    if (characters.length > 0) {
      selectedCharId = characters[0].id;
    }
    render();
  });

  return container;
}
