import { SpecialQuestManager, SPECIAL_QUESTS } from '../../data/special-quest-manager.js';

const CATEGORIES = [
  { id: 'all', label: 'すべて', icon: 'apps' },
  { id: 'dungeon', label: '踏破', icon: 'swords' },
  { id: 'monster', label: 'モンスター', icon: 'pets' },
  { id: 'item', label: 'アイテム', icon: 'auto_stories' },
  { id: 'medal', label: 'メダル', icon: 'military_tech' },
  { id: 'other', label: 'その他', icon: 'stars' },
];
const QUESTS_PER_PAGE = 6;

function showPrismEffect() {
  const effect = document.createElement('div');
  effect.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-fuchsia-950/20 pointer-events-none';
  effect.innerHTML = `<div class="rounded-2xl border border-fuchsia-300/40 bg-slate-950/95 px-7 py-5 text-center shadow-[0_0_50px_rgba(217,70,239,.45)]"><span class="material-symbols-outlined text-5xl text-fuchsia-300">diamond</span><div class="mt-2 text-lg font-black text-white">Prism × 1 獲得！</div></div>`;
  document.body.appendChild(effect);
  setTimeout(() => effect.remove(), 1400);
}

export async function renderSpecialQuestTab() {
  await SpecialQuestManager.refreshAchievements();

  const container = document.createElement('div');
  container.className = 'h-full overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(217,70,239,.09),transparent_38%)] pb-[calc(env(safe-area-inset-bottom,0px)+72px)]';
  let disposed = false;
  let activeCategory = 'all';
  let currentPage = 1;

  const render = () => {
    const summary = SpecialQuestManager.getSummary();
    const quests = SpecialQuestManager.getQuests(activeCategory);
    const totalPages = Math.max(1, Math.ceil(quests.length / QUESTS_PER_PAGE));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);
    const pageStart = (currentPage - 1) * QUESTS_PER_PAGE;
    const pageQuests = quests.slice(pageStart, pageStart + QUESTS_PER_PAGE);
    const percentage = summary.total ? Math.round((summary.completed / summary.total) * 100) : 0;

    container.innerHTML = `
      <div class="mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 py-4 sm:px-5">
        <section class="overflow-hidden rounded-2xl border border-fuchsia-400/20 bg-slate-900/85 p-4 shadow-xl">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10"><span class="material-symbols-outlined text-2xl text-fuchsia-300">stars</span></div>
            <div class="min-w-0 flex-1"><h2 class="text-base font-black text-white">スペシャルクエスト</h2><p class="mt-0.5 text-xs text-slate-400">冒険の記録を積み重ねてPrismを獲得しよう</p></div>
            <div class="shrink-0 text-right"><div class="font-mono text-lg font-black text-fuchsia-200">${summary.completed}<span class="text-xs text-slate-500"> / ${summary.total}</span></div><div class="text-[9px] font-bold text-slate-500">達成</div></div>
          </div>
          <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-950"><div class="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-400 to-cyan-400 transition-[width]" style="width:${percentage}%"></div></div>
          <div class="mt-2 flex justify-between text-[10px] font-bold text-slate-500"><span>報酬受取 ${summary.claimed}件</span><span>${percentage}%</span></div>
        </section>

        <nav class="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar" aria-label="スペシャルクエストの分類">
          ${CATEGORIES.map(category => {
            const isActive = activeCategory === category.id;
            const count = category.id === 'all' ? SPECIAL_QUESTS.length : SPECIAL_QUESTS.filter(quest => quest.category === category.id).length;
            return `<button data-category="${category.id}" class="flex shrink-0 items-center gap-1 rounded-xl border px-2.5 py-2 text-[10px] font-black transition ${isActive ? 'border-fuchsia-300/40 bg-fuchsia-500/15 text-fuchsia-200' : 'border-slate-800 bg-slate-900/70 text-slate-500'}"><span class="material-symbols-outlined text-[15px]">${category.icon}</span>${category.label}<span class="font-mono text-[9px] opacity-60">${count}</span></button>`;
          }).join('')}
        </nav>

        <div data-quest-list class="flex flex-col gap-2.5">
          ${pageQuests.map(quest => {
            const state = SpecialQuestManager.getState(quest.id);
            const current = Math.min(SpecialQuestManager.getCurrentValue(quest), quest.target);
            const progress = quest.target ? Math.min(100, (current / quest.target) * 100) : 0;
            const status = state.claimed ? '受取済み' : state.completed ? '達成' : '進行中';
            return `
              <article class="rounded-2xl border ${state.completed ? 'border-fuchsia-400/30 bg-fuchsia-950/15' : 'border-slate-800 bg-slate-900/75'} p-3">
                <div class="flex items-start gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${state.completed ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-400'}"><span class="material-symbols-outlined text-xl">${state.completed ? 'check' : quest.icon}</span></div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-2"><h3 class="text-xs font-black leading-relaxed text-slate-100">${quest.title}</h3><span class="shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${state.claimed ? 'bg-slate-800 text-slate-500' : state.completed ? 'bg-emerald-400/15 text-emerald-300' : 'bg-slate-800 text-slate-500'}">${status}</span></div>
                    <p class="mt-0.5 text-[10px] leading-relaxed text-slate-500">${quest.description}</p>
                    <div class="mt-2 flex items-center gap-2">
                      <div class="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-950"><div class="h-full rounded-full ${state.completed ? 'bg-emerald-400' : 'bg-fuchsia-500'}" style="width:${progress}%"></div></div>
                      <span class="min-w-[54px] text-right font-mono text-[9px] font-bold tabular-nums ${state.completed ? 'text-emerald-300' : 'text-slate-500'}">${current} / ${quest.target}</span>
                    </div>
                  </div>
                </div>
                <div class="mt-3 flex items-center gap-2 border-t border-white/[.06] pt-2.5">
                  <div class="flex min-w-0 flex-1 items-center gap-1.5 text-[10px] font-black text-fuchsia-200"><span class="material-symbols-outlined text-base">diamond</span>Prism × ${quest.reward}</div>
                  <button data-claim-special="${quest.id}" class="rounded-lg border px-3 py-2 text-[10px] font-black transition ${state.claimed ? 'cursor-default border-slate-800 bg-slate-950/50 text-slate-600' : state.completed ? 'border-fuchsia-300/30 bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white active:scale-[.97]' : 'cursor-not-allowed border-slate-800 bg-slate-950/60 text-slate-600'}" ${!state.completed || state.claimed ? 'disabled' : ''}>${state.claimed ? '受取済み' : state.completed ? '受け取る' : '未達成'}</button>
                </div>
              </article>`;
          }).join('')}
        </div>

        <nav class="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/75 p-2" aria-label="スペシャルクエストのページ">
          <button data-page="prev" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${currentPage > 1 ? 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200 active:scale-95' : 'cursor-not-allowed border-slate-800 bg-slate-950/50 text-slate-700'}" ${currentPage <= 1 ? 'disabled' : ''} aria-label="前のページ"><span class="material-symbols-outlined">chevron_left</span></button>
          <div class="min-w-0 flex-1 text-center"><div class="font-mono text-xs font-black text-slate-200">${currentPage} / ${totalPages}</div><div class="mt-0.5 text-[9px] font-bold text-slate-500">${quests.length ? `${pageStart + 1}〜${Math.min(pageStart + QUESTS_PER_PAGE, quests.length)}件目` : '0件'} / 全${quests.length}件</div></div>
          <button data-page="next" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${currentPage < totalPages ? 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200 active:scale-95' : 'cursor-not-allowed border-slate-800 bg-slate-950/50 text-slate-700'}" ${currentPage >= totalPages ? 'disabled' : ''} aria-label="次のページ"><span class="material-symbols-outlined">chevron_right</span></button>
        </nav>
      </div>`;

    container.querySelectorAll('[data-category]').forEach(button => {
      button.onclick = () => {
        activeCategory = button.dataset.category;
        currentPage = 1;
        render();
        container.scrollTo({ top: 0, behavior: 'smooth' });
      };
    });

    container.querySelectorAll('[data-page]').forEach(button => {
      button.onclick = () => {
        currentPage += button.dataset.page === 'next' ? 1 : -1;
        render();
        const list = container.querySelector('[data-quest-list]');
        container.scrollTo({ top: Math.max(0, (list?.offsetTop || 0) - 12), behavior: 'smooth' });
      };
    });

    container.querySelectorAll('[data-claim-special]').forEach(button => {
      button.onclick = async () => {
        button.disabled = true;
        if (await SpecialQuestManager.claimReward(button.dataset.claimSpecial)) {
          showPrismEffect();
          render();
        } else {
          button.disabled = false;
        }
      };
    });
  };

  const handleUpdate = () => { if (!disposed && container.isConnected) render(); };
  window.addEventListener('quest:special-updated', handleUpdate);
  const observer = new MutationObserver(() => {
    if (!container.isConnected) {
      disposed = true;
      window.removeEventListener('quest:special-updated', handleUpdate);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  render();
  return container;
}
