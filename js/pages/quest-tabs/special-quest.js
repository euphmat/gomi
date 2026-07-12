import { SpecialQuestManager } from '../../data/special-quest-manager.js';

function showPrismEffect() {
  const effect = document.createElement('div');
  effect.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-fuchsia-950/20 pointer-events-none';
  effect.innerHTML = `<div class="rounded-2xl border border-fuchsia-300/40 bg-slate-950/95 px-7 py-5 text-center shadow-[0_0_50px_rgba(217,70,239,.45)]"><span class="material-symbols-outlined text-5xl text-fuchsia-300">diamond</span><div class="mt-2 text-lg font-black text-white">Prism × 1 獲得！</div></div>`;
  document.body.appendChild(effect);
  setTimeout(() => effect.remove(), 1400);
}

export function renderSpecialQuestTab() {
  const container = document.createElement('div');
  container.className = 'h-full overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(217,70,239,.09),transparent_38%)] pb-[calc(env(safe-area-inset-bottom,0px)+72px)]';
  let disposed = false;

  const render = () => {
    const completed = SpecialQuestManager.isMineFirstUnlockCompleted();
    const claimed = SpecialQuestManager.isMineFirstUnlockClaimed();
    container.innerHTML = `
      <div class="mx-auto flex w-full max-w-2xl flex-col gap-4 px-3 py-4 sm:px-5">
        <section class="rounded-2xl border border-fuchsia-400/20 bg-slate-900/85 p-4 shadow-xl">
          <div class="flex items-center gap-3"><div class="flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10"><span class="material-symbols-outlined text-2xl text-fuchsia-300">stars</span></div><div><h2 class="text-base font-black text-white">スペシャルクエスト</h2><p class="mt-0.5 text-xs text-slate-400">特別な目標を達成して報酬を獲得しよう</p></div></div>
        </section>
        <article class="overflow-hidden rounded-2xl border ${completed ? 'border-fuchsia-400/35 bg-fuchsia-950/20' : 'border-slate-800 bg-slate-900/75'} p-4">
          <div class="flex items-start gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${completed ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-400'}"><span class="material-symbols-outlined text-2xl">${completed ? 'check' : 'landscape'}</span></div>
            <div class="min-w-0 flex-1"><div class="flex items-start justify-between gap-2"><h3 class="text-sm font-black leading-relaxed text-slate-100">鉱山を初めて解放する</h3><span class="shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${claimed ? 'bg-slate-800 text-slate-400' : completed ? 'bg-emerald-400/15 text-emerald-300' : 'bg-slate-800 text-slate-500'}">${claimed ? '受取済み' : completed ? '達成' : '未達成'}</span></div><p class="mt-1 text-xs text-slate-400">いずれかの鉱山をPrismで解放する</p></div>
          </div>
          <div class="mt-4 flex items-center gap-3 rounded-xl border border-fuchsia-400/20 bg-slate-950/60 p-3"><span class="material-symbols-outlined text-3xl text-fuchsia-300">diamond</span><div class="flex-1"><div class="text-[10px] font-bold tracking-wider text-slate-500">達成報酬</div><div class="text-base font-black text-white">Prism <span class="text-fuchsia-300">× 1</span></div></div></div>
          <button data-claim-special class="mt-3 w-full rounded-xl border py-3 text-sm font-black transition-all ${claimed ? 'cursor-default border-emerald-500/20 bg-emerald-950/25 text-emerald-500' : completed ? 'border-fuchsia-300/30 bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white active:scale-[.98]' : 'cursor-not-allowed border-slate-800 bg-slate-950/70 text-slate-600'}" ${!completed || claimed ? 'disabled' : ''}>${claimed ? '報酬を受け取りました' : completed ? '報酬を受け取る' : '鉱山を解放すると受取可能'}</button>
        </article>
      </div>`;
    const button = container.querySelector('[data-claim-special]');
    if (completed && !claimed && button) button.onclick = async () => {
      button.disabled = true;
      if (await SpecialQuestManager.claimMineFirstUnlockReward()) {
        showPrismEffect();
        render();
      } else button.disabled = false;
    };
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
