import { DAILY_COMPLETE_REWARD, QuestManager, DAILY_QUESTS } from '../../data/quest-manager.js';
import { formatNumber } from '../../utils/format.js';

function getJSTNextMidnight() {
  const now = new Date();
  const jstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  jstDate.setUTCHours(24, 0, 0, 0);
  return new Date(jstDate.getTime() - (9 * 60 * 60 * 1000));
}

function formatTimeLeft(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
  const s = (totalSecs % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function showRewardEffect() {
  const effect = document.createElement('div');
  effect.className = 'fixed inset-0 pointer-events-none flex items-center justify-center z-[100] animate-fade-in';
  effect.style.background = 'radial-gradient(circle, rgba(217,70,239,0.28) 0%, transparent 60%)';
  effect.innerHTML = `
    <div class="flex flex-col items-center gap-2 animate-[slide-up_0.5s_ease-out]">
      <div class="w-20 h-20 rounded-full bg-fuchsia-500/15 border border-fuchsia-300/40 flex items-center justify-center shadow-[0_0_45px_rgba(217,70,239,0.45)]">
        <span class="material-symbols-outlined text-5xl text-fuchsia-300">diamond</span>
      </div>
      <span class="text-xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">プリズムを獲得！</span>
    </div>
  `;
  document.body.appendChild(effect);
  setTimeout(() => {
    effect.style.opacity = '0';
    effect.style.transition = 'opacity 0.4s';
    setTimeout(() => effect.remove(), 400);
  }, 1400);
}

export function renderDailyQuestTab() {
  const container = document.createElement('div');
  container.className = 'h-full overflow-y-auto animate-fade-in bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_36%)] pb-4';

  let timerValue = null;
  let disposed = false;

  const updateTimer = () => {
    if (timerValue) {
      timerValue.textContent = formatTimeLeft(getJSTNextMidnight().getTime() - Date.now());
    }
    QuestManager.refreshForNewDay().catch(error => {
      console.error('[DailyQuest] Failed to refresh daily progress:', error);
    });
  };

  const timerInterval = setInterval(updateTimer, 1000);

  const renderContent = () => {
    const completedCount = DAILY_QUESTS.filter(quest => QuestManager.isCompleted(quest.id)).length;
    const totalCount = DAILY_QUESTS.length;
    const overallPercentage = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
    const isAllCompleted = QuestManager.isAllDailyCompleted();
    const isClaimed = QuestManager.isClaimed();

    container.innerHTML = '';

    const content = document.createElement('div');
    content.className = 'w-full max-w-2xl mx-auto px-3 sm:px-5 py-4 flex flex-col gap-4';

    const hero = document.createElement('section');
    hero.className = 'relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-slate-900/85 p-4 sm:p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]';
    hero.innerHTML = `
      <div class="absolute -right-12 -top-16 w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none"></div>
      <div class="relative flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-300">
              <span class="material-symbols-outlined text-[19px]">today</span>
            </span>
            <h2 class="text-base sm:text-lg font-black text-white tracking-wide">今日のクエスト</h2>
          </div>
          <p class="text-[11px] sm:text-xs text-slate-400 leading-relaxed">${DAILY_QUESTS.length}つのミッションを達成して、プリズムを獲得しよう</p>
        </div>
        <div class="shrink-0 rounded-xl bg-slate-950/70 border border-slate-700/70 px-3 py-2 text-right" aria-label="クエスト更新までの時間">
          <div class="flex items-center justify-end gap-1 text-[9px] text-slate-500 font-bold tracking-wider">
            <span class="material-symbols-outlined text-[12px]">schedule</span>更新まで
          </div>
          <span data-timer class="block mt-0.5 text-sm sm:text-base font-mono font-black text-emerald-300 tabular-nums">--:--:--</span>
        </div>
      </div>

      <div class="relative mt-5">
        <div class="flex items-end justify-between mb-2">
          <span class="text-[11px] font-bold text-slate-300">本日の達成度</span>
          <div class="flex items-baseline gap-1">
            <span class="text-xl font-black ${isAllCompleted ? 'text-emerald-300' : 'text-white'}">${completedCount}</span>
            <span class="text-[11px] font-bold text-slate-500">/ ${totalCount} 完了</span>
          </div>
        </div>
        <div class="h-2.5 rounded-full overflow-hidden bg-slate-950 ring-1 ring-slate-700/60" role="progressbar" aria-label="本日のクエスト達成度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${overallPercentage}">
          <div class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500 shadow-[0_0_14px_rgba(52,211,153,0.45)]" style="width:${overallPercentage}%"></div>
        </div>
      </div>
    `;
    timerValue = hero.querySelector('[data-timer]');
    updateTimer();
    content.appendChild(hero);

    const questSection = document.createElement('section');
    questSection.setAttribute('aria-labelledby', 'daily-mission-heading');
    questSection.innerHTML = `
      <div class="flex items-center justify-between px-1 mb-2.5">
        <h3 id="daily-mission-heading" class="text-xs font-black text-slate-200 tracking-wide">ミッション</h3>
        <span class="text-[10px] text-slate-500">毎日 0:00 にリセット</span>
      </div>
    `;

    const list = document.createElement('div');
    list.className = 'flex flex-col gap-2.5';

    DAILY_QUESTS.forEach((quest, index) => {
      const rawProgress = QuestManager.getProgress(quest.id);
      const progress = Math.min(rawProgress, quest.target);
      const percentage = Math.min(100, (progress / quest.target) * 100);
      const isCompleted = rawProgress >= quest.target;
      const remaining = Math.max(0, quest.target - rawProgress);

      const item = document.createElement('button');
      item.type = 'button';
      item.className = `group relative w-full overflow-hidden rounded-xl border p-3.5 text-left transition-all active:scale-[0.99] ${isCompleted
        ? 'border-emerald-400/30 bg-emerald-950/25'
        : 'border-slate-800 bg-slate-900/65 active:border-sky-400/40 active:bg-sky-950/20'}`;
      item.setAttribute('aria-label', `${quest.label}。${quest.destination.label}`);
      item.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="relative shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border ${isCompleted
            ? 'bg-emerald-400/12 border-emerald-400/35 text-emerald-300'
            : 'bg-slate-800/80 border-slate-700 text-slate-300'}">
            <span class="material-symbols-outlined text-[22px]">${isCompleted ? 'check' : quest.icon}</span>
            <span class="absolute -left-1 -top-1 min-w-4 h-4 px-1 rounded-full bg-slate-950 border border-slate-700 text-[8px] font-black text-slate-400 flex items-center justify-center">${index + 1}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <h4 class="text-xs sm:text-sm font-bold leading-relaxed ${isCompleted ? 'text-emerald-100' : 'text-slate-100'}">${quest.label}</h4>
              <span class="shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${isCompleted
                ? 'bg-emerald-400/15 text-emerald-300'
                : 'bg-slate-800 text-slate-400'}">${isCompleted ? '完了' : `あと ${formatNumber(remaining)}`}</span>
            </div>
            <div class="mt-2 flex items-center gap-2">
              <div class="h-1.5 flex-1 rounded-full overflow-hidden bg-slate-950/90" role="progressbar" aria-label="${quest.label}の進捗" aria-valuemin="0" aria-valuemax="${quest.target}" aria-valuenow="${progress}">
                <div class="h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-400' : 'bg-sky-400'}" style="width:${percentage}%"></div>
              </div>
              <span class="min-w-[72px] text-right text-[10px] font-mono font-bold tabular-nums ${isCompleted ? 'text-emerald-300' : 'text-slate-400'}">${formatNumber(progress)} / ${formatNumber(quest.target)}</span>
            </div>
          </div>
          <div class="flex shrink-0 flex-col items-center gap-0.5 text-sky-400/70 transition-transform group-active:translate-x-0.5">
            <span class="material-symbols-outlined text-[20px]">chevron_right</span>
            <span class="text-[8px] font-black">移動</span>
          </div>
        </div>
      `;
      item.addEventListener('click', () => {
        window.location.hash = quest.destination.path;
      });
      list.appendChild(item);
    });

    questSection.appendChild(list);
    content.appendChild(questSection);

    const reward = document.createElement('section');
    reward.className = `rounded-2xl border p-3.5 sm:p-4 ${isAllCompleted && !isClaimed
      ? 'border-fuchsia-400/35 bg-fuchsia-950/20 shadow-[0_8px_30px_rgba(192,38,211,0.12)]'
      : 'border-slate-800 bg-slate-900/75'}`;
    reward.innerHTML = `
      <div class="flex items-center gap-3 mb-3">
        <div class="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/10 border border-fuchsia-400/30 flex items-center justify-center text-fuchsia-300">
          <span class="material-symbols-outlined text-2xl">diamond</span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-[9px] font-bold tracking-[0.16em] text-slate-500">コンプリート報酬</p>
          <div class="flex items-baseline gap-1.5 mt-0.5">
            <span class="text-sm font-black text-white">プリズム</span>
            <span class="text-lg font-black text-fuchsia-300">× ${DAILY_COMPLETE_REWARD}</span>
          </div>
        </div>
        <span class="text-[10px] font-bold ${isClaimed ? 'text-emerald-400' : isAllCompleted ? 'text-fuchsia-300' : 'text-slate-500'}">${isClaimed ? '受取済み' : isAllCompleted ? '受取可能' : `${completedCount}/${totalCount} 達成`}</span>
      </div>
    `;

    const claimButton = document.createElement('button');
    claimButton.type = 'button';
    claimButton.disabled = isClaimed || !isAllCompleted;
    claimButton.className = `w-full min-h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-black transition-all ${isClaimed
      ? 'bg-emerald-950/30 border border-emerald-500/20 text-emerald-500 cursor-default'
      : isAllCompleted
        ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 border border-fuchsia-300/30 text-white shadow-[0_8px_24px_rgba(192,38,211,0.28)] active:brightness-110 active:scale-[0.98] cursor-pointer'
        : 'bg-slate-950/65 border border-slate-800 text-slate-500 cursor-not-allowed'}`;
    claimButton.innerHTML = isClaimed
      ? '<span class="material-symbols-outlined text-[19px]">verified</span>報酬を受け取りました'
      : isAllCompleted
        ? '<span class="material-symbols-outlined text-[19px]">redeem</span>報酬を受け取る'
        : `<span class="material-symbols-outlined text-[18px]">lock</span>あと ${totalCount - completedCount} 件で受け取れます`;

    if (isAllCompleted && !isClaimed) {
      claimButton.onclick = async () => {
        claimButton.disabled = true;
        const success = await QuestManager.claimDailyReward();
        if (success) {
          showRewardEffect();
          renderContent();
        } else {
          claimButton.disabled = false;
        }
      };
    }

    reward.appendChild(claimButton);
    content.appendChild(reward);
    container.appendChild(content);
  };

  const handleUpdate = () => {
    if (!disposed && document.contains(container)) renderContent();
  };
  window.addEventListener('quest:progress-updated', handleUpdate);

  const observer = new MutationObserver(() => {
    if (!document.contains(container)) {
      disposed = true;
      clearInterval(timerInterval);
      window.removeEventListener('quest:progress-updated', handleUpdate);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  renderContent();
  return container;
}
