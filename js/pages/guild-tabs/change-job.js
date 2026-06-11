import { GameDB } from '../../data/database.js';
import { createCharacterSelectGrid } from '../../components/character-select-grid.js';
import { JOBS } from '../../jobs/index.js';

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

    // 未解放の場合、ゴールド確認
    if (!isUnlocked) {
      const gold = await GameDB.getGameState('gold') || 0;
      if (gold < cost) {
        showNotification(container, 'ゴールドが足りません！', 'error');
        return;
      }
      currentGold = gold - cost;
      await GameDB.setGameState('gold', currentGold);
      const goldDisplay = document.getElementById('header-gold-display');
      if (goldDisplay) goldDisplay.textContent = ` Gold : ${currentGold.toLocaleString()} `;
      
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
    characters = await GameDB.getAllCharacters();
    showNotification(container, `${char.name} は ${jobDef.name} に転職した！`, 'success');
    render();
  };

  const showConfirmModal = (char, jobDef) => {
    const isUnlocked = char.unlockedJobs && char.unlockedJobs.includes(jobDef.id);
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in';
    const cost = jobDef.changeCost !== undefined ? jobDef.changeCost : 30000;

    overlay.innerHTML = `
      <div class="bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-[280px] shadow-2xl overflow-hidden animate-fade-in relative">
        <div class="p-5 text-center">
          <div class="w-12 h-12 mx-auto bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center mb-3 shadow-inner">
            <img src="./assets/job/job_${jobDef.id}.webp" class="w-8 h-8 object-contain drop-shadow-md" alt="${jobDef.name}" onerror="this.src='./assets/job/job_norvice.webp'">
          </div>
          <h3 class="text-base font-bold text-gray-100 mb-1">${jobDef.name} に転職しますか？</h3>
          ${!isUnlocked 
            ? `<p class="text-xs text-amber-400 font-bold mb-5 flex items-center justify-center gap-1"><span class="material-symbols-outlined text-[14px]">paid</span>${cost.toLocaleString()} G</p>` 
            : `<p class="text-xs text-emerald-400 font-bold mb-5">費用: 無料 (解放済)</p>`}
          <div class="flex gap-2 mt-2">
            <button id="btn-cancel-job" class="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-bold rounded-xl border border-gray-700 transition-colors">しない</button>
            <button id="btn-confirm-job" class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-indigo-900/50">する</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-cancel-job').addEventListener('click', () => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 200);
    });

    overlay.querySelector('#btn-confirm-job').addEventListener('click', async () => {
      overlay.querySelector('#btn-confirm-job').disabled = true;
      overlay.querySelector('#btn-confirm-job').textContent = '転職中...';
      await changeJob(char, jobDef);
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 200);
    });
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
    characters = await GameDB.getAllCharacters();
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
    if (goldDisplay) goldDisplay.textContent = ` Gold : ${currentGold.toLocaleString()} `;

    // 現在の職業のスキルをクリア
    if (char.jobSkills && char.jobSkills[char.jobId]) {
      char.jobSkills[char.jobId] = {};
    }

    char.sp = Math.max(0, (char.jobLevel || 1) - 1);

    await GameDB.putCharacter(char);
    characters = await GameDB.getAllCharacters();
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

      const row = document.createElement('div');
      row.className = `group flex items-center gap-4 p-3.5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
        isCurrent
          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
          : 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60 hover:border-indigo-500/30 hover:shadow-[0_4px_20px_rgba(99,102,241,0.1)] hover:-translate-y-0.5 cursor-pointer btn-change-job-container'
      }`;
      if (!isCurrent) row.dataset.jobId = job.id;

      const glow = isCurrent 
        ? `<div class="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 to-transparent blur-xl opacity-50"></div>`
        : `<div class="absolute -inset-1 bg-gradient-to-r from-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/10 transition-all duration-500 blur-xl"></div>`;

      const buttonHtml = isCurrent
        ? `<div class="relative px-4 py-1.5 bg-emerald-950/50 text-emerald-400 text-[11px] font-black tracking-wider rounded-lg border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]">装備中</div>`
        : isUnlocked
          ? `<button class="btn-change-job relative px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all shrink-0 overflow-hidden" data-job-id="${job.id}">
              <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span class="relative tracking-wider">転職</span>
            </button>`
          : currentGold >= cost
            ? `<button class="btn-change-job relative px-4 py-2 bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-amber-50 text-xs font-bold rounded-xl shadow-[0_4px_10px_rgba(217,119,6,0.3)] hover:shadow-[0_4px_15px_rgba(217,119,6,0.5)] transition-all shrink-0 flex items-center gap-1.5 border border-amber-500/50 overflow-hidden group/btn" data-job-id="${job.id}">
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>
                <span class="relative material-symbols-outlined text-[16px] text-amber-200" style="font-variation-settings: 'FILL' 1; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">paid</span>
                <span class="relative tracking-wide" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${cost.toLocaleString()} G</span>
              </button>`
            : `<button class="relative px-4 py-2 bg-gray-800 text-gray-500 text-xs font-bold rounded-xl shrink-0 flex items-center gap-1.5 border border-gray-700 cursor-not-allowed opacity-60" disabled>
                <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">paid</span>
                <span>${cost.toLocaleString()} G</span>
              </button>`;

      row.innerHTML = `
        ${glow}
        <div class="relative flex items-center justify-center w-14 h-14 bg-gray-900 rounded-xl shrink-0 border border-gray-700/50 shadow-inner group-hover:border-indigo-500/30 transition-colors overflow-hidden p-1">
          <img src="./assets/job/job_${job.id}.webp" class="w-full h-full object-contain ${isCurrent ? 'opacity-100 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'opacity-80 group-hover:opacity-100'}" alt="${job.name}" onerror="this.src='./assets/job/job_norvice.webp'">
        </div>
        <div class="relative flex-1 min-w-0 pr-2">
          <h3 class="text-[15px] font-black ${isCurrent ? 'text-emerald-300' : 'text-gray-100'} tracking-wide mb-0.5 group-hover:text-indigo-200 transition-colors">${job.name}</h3>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-[11px] font-bold text-gray-400 bg-gray-900/80 px-2 py-0.5 rounded-md border border-gray-700/50">JLv.${savedLevel}</span>
            ${isUnlocked && !isCurrent ? '<span class="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/50"><span class="material-symbols-outlined text-[12px] font-bold">check</span>解放済</span>' : ''}
          </div>
        </div>
        ${buttonHtml}
      `;
      listContainer.appendChild(row);
    });

    listContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-change-job');
      const row = e.target.closest('.btn-change-job-container');
      let jobId = null;
      if (btn) jobId = btn.dataset.jobId;
      else if (row) jobId = row.dataset.jobId;
      if (!jobId) return;

      const jobDef = JOBS[jobId];
      if (!jobDef || char.jobId === jobId) return;
      showConfirmModal(char, jobDef);
    });

    return listContainer;
  };

  // ─── レンダリング: 転生タブ ──────────────────────────────
  const renderRebirthInnerTab = (char) => {
    const container = document.createElement('div');
    container.className = 'flex-1 overflow-y-auto space-y-4 pb-6 px-1';

    const canRebirth = char.level >= 40;
    const bonusHp = Math.floor(char.hp.max * 0.1);
    const bonusMp = Math.floor(char.mp.max * 0.1);
    const bonusAtk = Math.floor((char.baseStats.atk || 0) * 0.1);
    const bonusDef = Math.floor((char.baseStats.def || 0) * 0.1);
    const bonusMatk = Math.floor((char.baseStats.matk || 0) * 0.1);
    const bonusMdef = Math.floor((char.baseStats.mdef || 0) * 0.1);
    const bonusSpd = Math.floor((char.baseStats.spd || 0) * 0.1);

    container.innerHTML = `
      <div class="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4">
        <h3 class="text-indigo-300 font-bold mb-2 flex items-center gap-2"><span class="material-symbols-outlined">auto_awesome</span>転生とは</h3>
        <p class="text-sm text-gray-300 leading-relaxed">ベースレベル40以上で実行可能な儀式です。現在の装備を除いた基礎能力の10%を永続ボーナスとして引き継ぎ、レベル1から再度育成することができます。ジョブレベルや習得スキルは失われません。</p>
      </div>

      <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <h4 class="text-gray-200 font-bold mb-3 text-center">転生で得られるボーナス</h4>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="flex justify-between bg-gray-900/50 p-2 rounded border border-gray-700"><span class="text-gray-400">HP</span><span class="text-emerald-400 font-bold">+${bonusHp}</span></div>
          <div class="flex justify-between bg-gray-900/50 p-2 rounded border border-gray-700"><span class="text-gray-400">MP</span><span class="text-emerald-400 font-bold">+${bonusMp}</span></div>
          <div class="flex justify-between bg-gray-900/50 p-2 rounded border border-gray-700"><span class="text-gray-400">ATK</span><span class="text-emerald-400 font-bold">+${bonusAtk}</span></div>
          <div class="flex justify-between bg-gray-900/50 p-2 rounded border border-gray-700"><span class="text-gray-400">DEF</span><span class="text-emerald-400 font-bold">+${bonusDef}</span></div>
          <div class="flex justify-between bg-gray-900/50 p-2 rounded border border-gray-700"><span class="text-gray-400">MATK</span><span class="text-emerald-400 font-bold">+${bonusMatk}</span></div>
          <div class="flex justify-between bg-gray-900/50 p-2 rounded border border-gray-700"><span class="text-gray-400">MDEF</span><span class="text-emerald-400 font-bold">+${bonusMdef}</span></div>
          <div class="flex justify-between bg-gray-900/50 p-2 rounded border border-gray-700"><span class="text-gray-400">SPD</span><span class="text-emerald-400 font-bold">+${bonusSpd}</span></div>
        </div>
      </div>

      <div class="text-center mt-6">
        ${canRebirth 
          ? `<button id="btn-execute-rebirth" class="px-8 py-3 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(192,38,211,0.4)] hover:shadow-[0_0_30px_rgba(192,38,211,0.6)] transition-all">転生を実行する</button>`
          : `<button class="px-8 py-3 bg-gray-800 text-gray-500 font-bold rounded-xl border border-gray-700 cursor-not-allowed">レベル40が必要です (現在Lv.${char.level})</button>`
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
        <div class="text-2xl font-black text-amber-400 drop-shadow-md">${cost.toLocaleString()} <span class="text-lg">G</span></div>
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
          `<p class="text-xs text-amber-400 font-bold flex items-center justify-center gap-1"><span class="material-symbols-outlined text-[14px]">paid</span>費用: ${cost.toLocaleString()} G</p>`,
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
  Promise.all([GameDB.getAllCharacters(), GameDB.getGameState('gold')]).then(async ([chars, goldVal]) => {
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
