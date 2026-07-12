import { GameDB } from './database.js';

const DAILY_LOGIN_PRISM = 1;

/** Return the user's local calendar date without UTC conversion. */
export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DailyLoginManager = {
  claim(date = new Date()) {
    return GameDB.claimDailyLoginBonus(getLocalDateKey(date), DAILY_LOGIN_PRISM);
  },

  showReward() {
    const toast = document.createElement('div');
    toast.className = 'fixed left-1/2 top-20 z-[10000] -translate-x-1/2 rounded-2xl border border-fuchsia-300/50 bg-slate-950/95 px-6 py-4 text-center shadow-[0_0_40px_rgba(217,70,239,.4)] backdrop-blur-sm transition duration-300';

    const title = document.createElement('div');
    title.className = 'text-xs font-bold tracking-widest text-fuchsia-200';
    title.textContent = 'LOGIN BONUS';

    const reward = document.createElement('div');
    reward.className = 'mt-1 flex items-center justify-center gap-2 text-lg font-black text-white';
    reward.innerHTML = '<span class="material-symbols-outlined text-fuchsia-300">diamond</span><span>Prism × 1 獲得！</span>';

    toast.append(title, reward);
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('opacity-0', '-translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  },
};
