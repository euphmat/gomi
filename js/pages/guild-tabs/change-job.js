import { GameDB } from '../../data/database.js';
import { createCharacterSelectGrid } from '../../components/character-select-grid.js';
import { JOBS } from '../../jobs/index.js';

const CHANGE_JOB_COST = 30000;

/**
 * 「神殿」タブの画面 — 転職機能
 */
export function renderChangeJobTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full p-2 animate-fade-in overflow-hidden';

  // 状態管理
  let characters = [];
  let selectedCharId = null;
  let currentGold = 0;

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

      // ゴールド消費
      currentGold = gold - cost;
      await GameDB.setGameState('gold', currentGold);
      const goldDisplay = document.getElementById('header-gold-display');
      if (goldDisplay) goldDisplay.textContent = ` Gold : ${currentGold.toLocaleString()} `;

      // 職業を解放
      if (!char.unlockedJobs) char.unlockedJobs = ['norvice'];
      char.unlockedJobs.push(jobDef.id);
    }

    // 現在のJOBレベル/JPを保存
    if (!char.jobLevels) char.jobLevels = {};
    char.jobLevels[char.jobId] = {
      level: char.jobLevel,
      jp: { current: char.jp.current, max: char.jp.max }
    };

    // 転職先のJOBレベル/JPを復元（なければ初期値）
    const savedJob = char.jobLevels[jobDef.id];
    if (savedJob) {
      char.jobLevel = savedJob.level;
      char.jp = { current: savedJob.jp.current, max: savedJob.jp.max };
    } else {
      char.jobLevel = 1;
      char.jp = { current: 0, max: 20 };
    }

    // JOBスキルエントリを初期化（なければ）
    if (!char.jobSkills) char.jobSkills = {};
    if (!char.jobSkills[jobDef.id]) char.jobSkills[jobDef.id] = {};

    // 職業情報を更新
    char.jobId = jobDef.id;
    char.jobName = jobDef.name;
    char.iconImage = `./assets/job/job_${jobDef.id}.webp`;

    // SP を再計算 (総取得SP - 全職業での消費SP)
    recalcSP(char);

    // 保存
    await GameDB.putCharacter(char);

    // キャラ情報を再読み込み
    characters = await GameDB.getAllCharacters();
    showNotification(container, `${char.name} は ${jobDef.name} に転職した！`, 'success');
    render();
  };

  // ─── SP 再計算 ──────────────────────────────────────────
  const recalcSP = (char) => {
    // 全職業のJOBレベルから総獲得SP算出はせず、
    // 現在のSPを維持する（SPは各JOBレベルアップ時に付与されるため）
    // 既に使用したSPは jobSkills のレベル合計から計算
    // SPは転職しても減らない
  };

  // ─── 確認モーダル ─────────────────────────────────────
  const showConfirmModal = (char, jobDef) => {
    const isUnlocked = char.unlockedJobs && char.unlockedJobs.includes(jobDef.id);
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in';

    const savedJob = char.jobLevels && char.jobLevels[jobDef.id];
    const savedLevel = savedJob ? savedJob.level : 1;
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
            <button id="btn-cancel-job" class="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-bold rounded-xl border border-gray-700 transition-colors">
              しない
            </button>
            <button id="btn-confirm-job" class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-indigo-900/50">
              する
            </button>
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

    // ジョブリスト (下部・スクロール可能)
    const listContainer = document.createElement('div');
    listContainer.className = 'flex-1 overflow-y-auto space-y-3 pb-6 pr-1 mt-2';

    Object.values(JOBS).forEach(job => {
      const isCurrent = job.id === selectedChar.jobId;
      const isUnlocked = selectedChar.unlockedJobs && selectedChar.unlockedJobs.includes(job.id);
      const savedJob = selectedChar.jobLevels && selectedChar.jobLevels[job.id];
      const savedLevel = savedJob ? savedJob.level : (isCurrent ? selectedChar.jobLevel : 1);
      const cost = job.changeCost !== undefined ? job.changeCost : 30000;

      const row = document.createElement('div');
      row.className = `group flex items-center gap-4 p-3.5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
        isCurrent
          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
          : 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60 hover:border-indigo-500/30 hover:shadow-[0_4px_20px_rgba(99,102,241,0.1)] hover:-translate-y-0.5 cursor-pointer btn-change-job-container'
      }`;
      if (!isCurrent) row.dataset.jobId = job.id; // Allow clicking the whole row

      // Decorative background glow
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

    // 転職ボタンおよび行のクリックイベント委譲
    listContainer.addEventListener('click', (e) => {
      // Find either a clicked button or a clicked row container
      const btn = e.target.closest('.btn-change-job');
      const row = e.target.closest('.btn-change-job-container');
      
      let jobId = null;
      if (btn) jobId = btn.dataset.jobId;
      else if (row) jobId = row.dataset.jobId;
      
      if (!jobId) return;

      const jobDef = JOBS[jobId];
      if (!jobDef) return;

      const char = characters.find(c => c.id === selectedCharId);
      if (!char || char.jobId === jobId) return;

      showConfirmModal(char, jobDef);
    });

    container.appendChild(listContainer);
  };

  // ─── 初期データロード ──────────────────────────────────
  Promise.all([GameDB.getAllCharacters(), GameDB.getGameState('gold')]).then(async ([chars, goldVal]) => {
    characters = chars;
    currentGold = goldVal || 0;

    // unlockedJobs の初期化（既存キャラクターへのマイグレーション）
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
