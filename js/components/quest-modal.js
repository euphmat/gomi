import { QuestManager } from '../data/quest-manager.js';
import { SpecialQuestManager } from '../data/special-quest-manager.js';
import { renderDailyQuestTab } from '../pages/quest-tabs/daily-quest.js';
import { renderSpecialQuestTab } from '../pages/quest-tabs/special-quest.js';

const TABS = [
  { id: 'daily', label: 'デイリー', icon: 'today', active: 'border-sky-300/45 bg-sky-500/15 text-sky-200' },
  { id: 'special', label: 'スペシャル', icon: 'stars', active: 'border-fuchsia-300/45 bg-fuchsia-500/15 text-fuchsia-200' },
];

function getClaimableCount() {
  const daily = QuestManager.isAllDailyCompleted() && !QuestManager.isClaimed() ? 1 : 0;
  const special = SpecialQuestManager.getQuests().filter(quest => (
    SpecialQuestManager.getState(quest.id).completed
  )).length;
  return daily + special;
}

export function updateQuestHeaderBadge() {
  const badge = document.getElementById('header-quest-badge');
  const button = document.getElementById('btn-quest');
  if (!badge || !button) return;

  const count = getClaimableCount();
  badge.textContent = count > 99 ? '99+' : String(count);
  badge.classList.toggle('hidden', count === 0);
  badge.classList.toggle('flex', count > 0);
  button.setAttribute('aria-label', count > 0
    ? `クエストを開く。受取可能な報酬が${count}件あります`
    : 'クエストを開く');
}

export function initQuestHeaderBadge() {
  updateQuestHeaderBadge();
  [
    'quest:progress-updated',
    'quest:reward-claimed',
    'quest:special-updated',
  ].forEach(eventName => window.addEventListener(eventName, updateQuestHeaderBadge));
}

export function showQuestModal(initialTab = 'daily') {
  const existing = document.getElementById('quest-modal');
  if (existing) {
    existing.querySelector('[data-quest-close]')?.focus();
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const returnFocus = document.activeElement;
  const previousBodyOverflow = document.body.style.overflow;
  let activeTab = TABS.some(tab => tab.id === initialTab) ? initialTab : 'daily';
  let renderRequest = 0;
  let closing = false;

  const overlay = document.createElement('div');
  overlay.id = 'quest-modal';
  overlay.className = 'fixed inset-0 z-[12000] flex items-center justify-center bg-slate-950/85 p-2.5 backdrop-blur-sm sm:p-4';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'quest-modal-title');
  overlay.innerHTML = `
    <section data-quest-panel class="flex h-[min(92dvh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0b0b19] shadow-[0_24px_90px_rgba(0,0,0,.78)]">
      <header class="flex shrink-0 items-center gap-3 border-b border-white/10 bg-slate-950/90 px-3 py-2.5 sm:px-4">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-500/10 text-sky-300"><span class="material-symbols-outlined text-xl">assignment</span></span>
        <div class="min-w-0 flex-1">
          <h2 id="quest-modal-title" class="text-sm font-black tracking-wide text-white">クエスト</h2>
          <p class="mt-0.5 text-[9px] font-bold text-slate-500">進捗確認・報酬受取・目的地への移動</p>
        </div>
        <button data-quest-close type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-400 transition active:scale-95 active:bg-slate-800 active:text-white" aria-label="クエストを閉じる"><span class="material-symbols-outlined text-lg">close</span></button>
      </header>
      <div data-quest-tabs role="tablist" aria-label="クエストの種類" class="grid shrink-0 grid-cols-2 gap-1.5 border-b border-white/[.07] bg-slate-950/70 p-2"></div>
      <div data-quest-content class="relative min-h-0 flex-1 overflow-hidden"></div>
    </section>`;

  const panel = overlay.querySelector('[data-quest-panel]');
  const tabList = overlay.querySelector('[data-quest-tabs]');
  const content = overlay.querySelector('[data-quest-content]');

  const renderTabs = () => {
    tabList.innerHTML = TABS.map(tab => {
      const selected = tab.id === activeTab;
      const claimable = tab.id === 'daily'
        ? (QuestManager.isAllDailyCompleted() && !QuestManager.isClaimed() ? 1 : 0)
        : SpecialQuestManager.getQuests().filter(quest => SpecialQuestManager.getState(quest.id).completed).length;
      return `
        <button data-quest-tab="${tab.id}" type="button" role="tab" aria-selected="${selected}" class="relative flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-black transition active:scale-[.98] ${selected ? tab.active : 'border-slate-800 bg-slate-900/55 text-slate-500'}">
          <span class="material-symbols-outlined text-[18px]">${tab.icon}</span>${tab.label}
          ${claimable ? `<span class="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] text-white">${claimable > 99 ? '99+' : claimable}</span>` : ''}
        </button>`;
    }).join('');

    tabList.querySelectorAll('[data-quest-tab]').forEach(button => {
      button.addEventListener('click', () => {
        if (activeTab === button.dataset.questTab) return;
        activeTab = button.dataset.questTab;
        renderTabs();
        renderContent();
      });
    });
  };

  const renderContent = async () => {
    const request = ++renderRequest;
    content.setAttribute('aria-busy', 'true');
    content.innerHTML = '<div class="flex h-full items-center justify-center text-slate-600"><span class="material-symbols-outlined animate-spin text-2xl">progress_activity</span></div>';
    const tabContent = activeTab === 'special'
      ? await renderSpecialQuestTab()
      : renderDailyQuestTab();
    if (request !== renderRequest || !overlay.isConnected) return;
    content.innerHTML = '';
    content.appendChild(tabContent);
    content.removeAttribute('aria-busy');
  };

  const close = () => {
    if (closing) return;
    closing = true;
    renderRequest += 1;
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('hashchange', close);
    window.removeEventListener('quest:progress-updated', refreshChrome);
    window.removeEventListener('quest:reward-claimed', refreshChrome);
    window.removeEventListener('quest:special-updated', refreshChrome);
    document.body.style.overflow = previousBodyOverflow;
    const animation = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: reducedMotion ? 1 : 120,
      easing: 'ease-out',
    });
    animation.onfinish = () => {
      overlay.remove();
      updateQuestHeaderBadge();
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  };

  const onKeyDown = event => {
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...overlay.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const refreshChrome = () => {
    if (!closing) renderTabs();
  };

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  renderTabs();
  renderContent();

  overlay.querySelector('[data-quest-close]').addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('hashchange', close);
  window.addEventListener('quest:progress-updated', refreshChrome);
  window.addEventListener('quest:reward-claimed', refreshChrome);
  window.addEventListener('quest:special-updated', refreshChrome);

  overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reducedMotion ? 1 : 150, easing: 'ease-out' });
  panel.animate(
    [{ opacity: 0, transform: 'translateY(12px) scale(.98)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
    { duration: reducedMotion ? 1 : 220, easing: 'cubic-bezier(.16,1,.3,1)' }
  );
  overlay.querySelector('[data-quest-close]').focus();
}
