export function renderSpecialQuestTab() {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full overflow-hidden';
  
  container.innerHTML = `
    <div class="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in pb-[calc(env(safe-area-inset-bottom,0px)+56px)]">
      <div class="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center border-4 border-slate-800 mb-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <span class="material-symbols-outlined text-4xl text-slate-600">stars</span>
      </div>
      <h3 class="text-xl font-black text-slate-300 mb-3 tracking-wide">スペシャルクエスト</h3>
      <p class="text-sm text-slate-500 max-w-xs leading-relaxed font-bold">
        特別な条件を達成して<br>豪華報酬を獲得しよう
      </p>
      
      <div class="mt-8 bg-slate-900/50 border border-slate-800/80 rounded-xl px-6 py-4 border-dashed">
        <span class="text-xs font-bold text-emerald-500/70 tracking-widest uppercase flex items-center justify-center gap-1">
          <span class="material-symbols-outlined text-[14px]">engineering</span>
          実装準備中
        </span>
      </div>
    </div>
  `;
  
  return container;
}
