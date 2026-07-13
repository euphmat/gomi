import { APP_RELEASE_DATE, APP_VERSION, UPDATE_LOG } from '../definitions/update-log.js';

const SECTION_THEME = [
  { border: 'border-cyan-400/25', icon: 'text-cyan-300', badge: 'border-cyan-400/30 bg-cyan-950/60 text-cyan-300' },
  { border: 'border-amber-400/25', icon: 'text-amber-300', badge: 'border-amber-400/30 bg-amber-950/60 text-amber-300' },
  { border: 'border-emerald-400/25', icon: 'text-emerald-300', badge: 'border-emerald-400/30 bg-emerald-950/60 text-emerald-300' },
];

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
    <div data-update-panel class="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-violet-300/30 bg-[#090b16] shadow-[0_28px_90px_rgba(0,0,0,.75)]">
      <header class="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-violet-950 via-slate-950 to-cyan-950 px-4 pb-4 pt-5">
        <div class="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl"></div>
        <div class="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-3xl"></div>
        <button data-update-close class="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/25 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Updateログを閉じる"><span class="material-symbols-outlined text-lg">close</span></button>
        <div class="relative">
          <div class="flex items-center gap-2 text-cyan-300"><span class="material-symbols-outlined text-2xl">rocket_launch</span><span class="text-[9px] font-black tracking-[.26em]">UPDATE LOG</span></div>
          <div class="mt-2 flex items-end justify-between gap-3">
            <div><h2 id="update-log-title" class="text-xl font-black tracking-wide text-white">アップデート情報</h2><p class="mt-1 text-[10px] text-slate-400">新しい冒険と改善内容をお知らせします</p></div>
            <div class="shrink-0 rounded-xl border border-cyan-300/30 bg-cyan-950/50 px-3 py-2 text-right"><div class="text-[8px] font-black tracking-widest text-cyan-500">CURRENT VERSION</div><div class="mt-0.5 font-mono text-sm font-black text-cyan-100">v${APP_VERSION}</div></div>
          </div>
          <div class="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-slate-500"><span class="material-symbols-outlined text-sm">calendar_month</span>${APP_RELEASE_DATE} RELEASE</div>
        </div>
      </header>
      <div class="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
        ${UPDATE_LOG.map((section, index) => {
          const theme = SECTION_THEME[index % SECTION_THEME.length];
          return `<section class="rounded-2xl border ${theme.border} bg-slate-950/65 p-3">
            <div class="flex items-start gap-2.5">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] ${theme.icon}"><span class="material-symbols-outlined text-xl">${section.icon}</span></div>
              <div class="min-w-0 flex-1"><span class="inline-flex rounded-md border px-1.5 py-0.5 text-[7px] font-black tracking-widest ${theme.badge}">${section.label}</span><h3 class="mt-1 text-xs font-black text-white">${section.title}</h3><p class="mt-1 text-[9px] leading-relaxed text-slate-400">${section.description}</p></div>
            </div>
            <ul class="mt-2.5 space-y-1.5 border-t border-white/[.06] pt-2.5">${section.items.map(item => `<li class="flex gap-1.5 text-[9px] leading-relaxed text-slate-300"><span class="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-slate-500"></span><span>${item}</span></li>`).join('')}</ul>
          </section>`;
        }).join('')}
        <div class="flex items-start gap-2 rounded-xl border border-violet-400/20 bg-violet-950/25 px-3 py-2.5 text-[9px] leading-relaxed text-violet-200/75"><span class="material-symbols-outlined text-base text-violet-300">tips_and_updates</span><span>新しいUpdateが利用できる場合は、ヘッダーの更新ボタンが光ってお知らせします。</span></div>
      </div>
      <footer class="border-t border-white/10 bg-slate-950/90 p-3"><button data-update-close class="w-full rounded-xl border border-cyan-300/35 bg-gradient-to-r from-violet-700 via-indigo-700 to-cyan-700 py-2.5 text-xs font-black text-white shadow-[0_0_18px_rgba(34,211,238,.12)] active:scale-[.99]">確認しました</button></footer>
    </div>`;
  document.body.appendChild(overlay);

  const panel = overlay.querySelector('[data-update-panel]');
  overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reducedMotion ? 1 : 180, easing: 'ease-out' });
  panel.animate(
    [{ opacity: 0, transform: 'translateY(16px) scale(.97)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
    { duration: reducedMotion ? 1 : 260, easing: 'cubic-bezier(.16,1,.3,1)' }
  );

  const close = () => {
    document.removeEventListener('keydown', onKeyDown);
    const animation = overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reducedMotion ? 1 : 140, easing: 'ease-out' });
    animation.onfinish = () => overlay.remove();
  };
  const onKeyDown = event => { if (event.key === 'Escape') close(); };
  overlay.querySelectorAll('[data-update-close]').forEach(button => button.addEventListener('click', close));
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  document.addEventListener('keydown', onKeyDown);
}
