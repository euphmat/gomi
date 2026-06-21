export function showInheritanceHelpModal() {
  if (document.getElementById('inheritance-help-modal')) return;

  const overlay = document.createElement('div');
  overlay.id = 'inheritance-help-modal';
  overlay.className = `
    fixed inset-0 z-[100] flex items-center justify-center
    bg-black/80 backdrop-blur-md
    animate-[fade-in_0.2s_ease-out] p-4
  `;
  
  overlay.innerHTML = `
    <div class="bg-[#111122] border border-gray-600/50 rounded-2xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl shadow-indigo-900/20 animate-[slide-up_0.3s_cubic-bezier(0.16,1,0.3,1)] max-h-[90dvh]">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 bg-indigo-900/30 border-b border-indigo-500/30 relative z-20">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-indigo-400">help</span>
          <h2 class="text-[16px] font-black text-gray-100 tracking-wider">継承システムについて</h2>
        </div>
        <button class="close-btn p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors active:scale-95">
          <span class="material-symbols-outlined !text-[20px]">close</span>
        </button>
      </div>

      <!-- Content -->
      <div class="p-4 overflow-y-auto space-y-4 custom-scrollbar text-sm text-gray-300 font-medium">
        
        <div class="bg-gray-800/50 rounded-xl p-3 border border-white/5">
          <h3 class="flex items-center gap-1.5 text-indigo-300 font-bold mb-2">
            <span class="material-symbols-outlined !text-[18px]">psychology</span>
            スキル継承とは
          </h3>
          <p class="text-[12px] leading-relaxed">
            別の職業で習得したスキルを、現在の職業でも使用できるようにするシステムです。<br>
            <span class="text-cyan-300 font-bold">アクティブスキル１つ</span>と、<span class="text-emerald-300 font-bold">パッシブスキル１つ</span>を同時にセットすることができます。
          </p>
        </div>

        <div class="bg-gray-800/50 rounded-xl p-3 border border-white/5">
          <h3 class="flex items-center gap-1.5 text-orange-300 font-bold mb-2">
            <span class="material-symbols-outlined !text-[18px]">upgrade</span>
            継承の条件
          </h3>
          <p class="text-[12px] leading-relaxed">
            スキルを継承するには、元の職業でそのスキルを<span class="text-yellow-400 font-bold">最大レベル（MAX）</span>まで強化している必要があります。
          </p>
        </div>

        <div class="bg-gray-800/50 rounded-xl p-3 border border-white/5">
          <h3 class="flex items-center gap-1.5 text-pink-300 font-bold mb-2">
            <span class="material-symbols-outlined !text-[18px]">touch_app</span>
            設定方法
          </h3>
          <p class="text-[12px] leading-relaxed">
            「継承」タブから、継承したいスキルを選んで「選択する」ボタンを押すとセットされます。<br>
            すでに継承中のスキルをもう一度選ぶと、継承を解除できます。
          </p>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector('.close-btn');
  const close = () => {
    overlay.style.animation = 'fade-out 0.2s ease-out forwards';
    setTimeout(() => overlay.remove(), 200);
  };
  
  closeBtn.onclick = close;
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };
}
