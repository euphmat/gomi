import { APP_RELEASE_DATE, APP_VERSION, UPDATE_LOG } from '../definitions/update-log.js';

export function compareVersions(left, right) {
  const leftParts = String(left || '').split('.').map(part => Number.parseInt(part, 10) || 0);
  const rightParts = String(right || '').split('.').map(part => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

export async function checkForAvailableUpdate() {
  try {
    const response = await fetch(`./version.json?checkedAt=${Date.now()}`, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!response.ok) throw new Error(`Version check failed: ${response.status}`);
    const manifest = await response.json();
    const latestVersion = String(manifest.version || '');
    return {
      available: Boolean(latestVersion) && compareVersions(latestVersion, APP_VERSION) > 0,
      currentVersion: APP_VERSION,
      latestVersion: latestVersion || APP_VERSION,
    };
  } catch (error) {
    console.warn('[Update] Could not check the latest version.', error);
    return { available: false, currentVersion: APP_VERSION, latestVersion: APP_VERSION };
  }
}

export function showUpdateLogModal() {
  if (document.getElementById('update-log-modal')) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const overlay = document.createElement('div');
  overlay.id = 'update-log-modal';
  overlay.className = 'fixed inset-0 z-[12000] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'update-log-title');
  overlay.innerHTML = `
    <div data-update-panel class="flex max-h-[86vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#0b0d16] shadow-[0_24px_80px_rgba(0,0,0,.72)]">
      <header class="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <span class="material-symbols-outlined text-xl text-violet-300">rocket_launch</span>
        <div class="min-w-0 flex-1"><h2 id="update-log-title" class="text-sm font-black text-white">Update履歴</h2><p class="text-[9px] text-slate-500">v${APP_VERSION} ・ ${APP_RELEASE_DATE}</p></div>
        <button data-update-close class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 active:bg-white/10 active:text-white" aria-label="Update履歴を閉じる"><span class="material-symbols-outlined text-lg">close</span></button>
      </header>
      <div data-update-page class="min-h-0 flex-1 overflow-y-auto p-4"></div>
      <footer class="flex items-center gap-2 border-t border-white/10 bg-slate-950/70 p-3">
        <button data-page-prev class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 disabled:cursor-not-allowed disabled:opacity-30" aria-label="新しい日付へ"><span class="material-symbols-outlined text-lg">chevron_left</span></button>
        <div data-page-indicator class="flex-1 text-center font-mono text-[10px] font-bold text-slate-500"></div>
        <button data-page-next class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 disabled:cursor-not-allowed disabled:opacity-30" aria-label="古い日付へ"><span class="material-symbols-outlined text-lg">chevron_right</span></button>
      </footer>
    </div>`;
  document.body.appendChild(overlay);

  const panel = overlay.querySelector('[data-update-panel]');
  const page = overlay.querySelector('[data-update-page]');
  const indicator = overlay.querySelector('[data-page-indicator]');
  const prev = overlay.querySelector('[data-page-prev]');
  const next = overlay.querySelector('[data-page-next]');
  let pageIndex = 0;

  const renderPage = () => {
    const entry = UPDATE_LOG[pageIndex];
    if (!entry) {
      page.innerHTML = '<p class="py-8 text-center text-xs text-slate-500">履歴はありません</p>';
      indicator.textContent = '0 / 0';
      prev.disabled = true;
      next.disabled = true;
      return;
    }
    page.innerHTML = `
      <div class="flex items-center justify-between gap-3 border-b border-white/[.07] pb-3">
        <div class="flex items-center gap-2 text-sm font-black text-slate-100"><span class="material-symbols-outlined text-lg text-violet-300">calendar_month</span>${entry.date}</div>
        <span class="rounded-md bg-violet-500/10 px-2 py-1 font-mono text-[9px] font-bold text-violet-300">v${entry.version}</span>
      </div>
      <ul class="mt-3 space-y-2.5">${entry.items.map(item => `<li class="flex items-start gap-2 text-[11px] leading-relaxed text-slate-300"><span class="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400"></span><span>${item}</span></li>`).join('')}</ul>`;
    indicator.textContent = `${pageIndex + 1} / ${UPDATE_LOG.length}`;
    prev.disabled = pageIndex === 0;
    next.disabled = pageIndex >= UPDATE_LOG.length - 1;
    page.scrollTop = 0;
  };

  prev.addEventListener('click', () => {
    if (pageIndex > 0) {
      pageIndex -= 1;
      renderPage();
    }
  });
  next.addEventListener('click', () => {
    if (pageIndex < UPDATE_LOG.length - 1) {
      pageIndex += 1;
      renderPage();
    }
  });
  renderPage();

  overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reducedMotion ? 1 : 150, easing: 'ease-out' });
  panel.animate(
    [{ opacity: 0, transform: 'translateY(10px) scale(.98)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
    { duration: reducedMotion ? 1 : 210, easing: 'cubic-bezier(.16,1,.3,1)' }
  );

  let closing = false;
  const close = () => {
    if (closing) return;
    closing = true;
    document.removeEventListener('keydown', onKeyDown);
    const animation = overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reducedMotion ? 1 : 120, easing: 'ease-out' });
    animation.onfinish = () => overlay.remove();
  };
  const onKeyDown = event => { if (event.key === 'Escape') close(); };
  overlay.querySelectorAll('[data-update-close]').forEach(button => button.addEventListener('click', close));
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  document.addEventListener('keydown', onKeyDown);
}
