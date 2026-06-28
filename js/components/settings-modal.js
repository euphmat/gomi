export function showSettingsModal(config) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in px-4';
  
  const modal = document.createElement('div');
  modal.className = 'bg-[#0c0d19] border border-slate-800 rounded-2xl w-full max-w-[320px] shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] shadow-blue-500/10 flex flex-col overflow-hidden animate-[slide-up_0.25s_cubic-bezier(0.16,1,0.3,1)]';
  
  const header = document.createElement('div');
  header.className = 'flex justify-between items-center px-4 py-3 border-b border-slate-800/80 bg-slate-900/40 shrink-0';
  header.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="material-symbols-outlined text-blue-400 text-lg">settings</span>
      <span class="font-bold text-gray-200 text-sm tracking-wider">画面設定</span>
    </div>
    <button class="text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center transition-all cursor-pointer" id="close-settings-modal">
      <span class="material-symbols-outlined text-lg">close</span>
    </button>
  `;

  const body = document.createElement('div');
  body.className = 'p-4 flex flex-col gap-3 max-h-[80vh] overflow-y-auto';

  const renderContent = () => {
    body.innerHTML = '';
    config.items.forEach(item => {
      if (item.condition && !item.condition()) return;

      const row = document.createElement('div');
      row.className = 'flex items-center justify-between bg-slate-900/40 border border-slate-800/80 rounded-xl p-3';

      const labelDiv = document.createElement('div');
      labelDiv.className = 'flex items-center gap-2 text-sm font-bold text-slate-300';
      if (item.icon) {
        labelDiv.innerHTML += `<span class="material-symbols-outlined text-slate-400 text-[18px]">${item.icon}</span>`;
      }
      labelDiv.innerHTML += `<span>${item.label}</span>`;
      row.appendChild(labelDiv);

      const controlDiv = document.createElement('div');
      controlDiv.className = 'flex items-center gap-2';

      if (item.type === 'toggle') {
        const isChecked = item.getValue();
        controlDiv.innerHTML = `
          <div class="relative flex items-center cursor-pointer w-10 h-5" id="toggle-${item.id}">
            <div class="block w-10 h-5 rounded-full transition-colors ${isChecked ? (item.activeColor || 'bg-blue-500') : 'bg-slate-700'}"></div>
            <div class="absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${isChecked ? 'translate-x-5' : 'translate-x-0'}"></div>
          </div>
        `;
        row.appendChild(controlDiv);
        
        setTimeout(() => {
          const toggleEl = row.querySelector(`#toggle-${item.id}`);
          if (toggleEl) {
            toggleEl.addEventListener('click', () => {
              item.onChange(!isChecked);
              renderContent();
            });
          }
        }, 0);
      } else if (item.type === 'radio') {
        const val = item.getValue();
        const container = document.createElement('div');
        container.className = 'flex bg-slate-800/80 rounded-lg overflow-hidden border border-slate-700/50';
        item.options.forEach(opt => {
          const btn = document.createElement('button');
          const active = val === opt.value;
          btn.className = `flex items-center justify-center px-3 h-7 transition-colors text-xs font-bold ${active ? (item.activeColor || 'bg-blue-600 text-white') : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`;
          if (opt.icon) {
            btn.innerHTML = `<span class="material-symbols-outlined text-[16px]">${opt.icon}</span>`;
          } else {
            btn.textContent = opt.label;
          }
          btn.onclick = () => {
            item.onChange(opt.value);
            renderContent();
          };
          container.appendChild(btn);
        });
        controlDiv.appendChild(container);
        row.appendChild(controlDiv);
      }

      body.appendChild(row);
    });
  };

  renderContent();

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeModal = () => {
    overlay.classList.remove('animate-fade-in');
    modal.classList.remove('animate-[slide-up_0.25s_cubic-bezier(0.16,1,0.3,1)]');
    overlay.classList.add('opacity-0');
    modal.classList.add('translate-y-4');
    setTimeout(() => overlay.remove(), 250);
  };
  overlay.addEventListener('click', (e) => { if(e.target === overlay) closeModal(); });
  header.querySelector('#close-settings-modal').onclick = closeModal;
}
