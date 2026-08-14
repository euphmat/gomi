/** ログインとクラウドセーブ所有権を必須にした、通貨賭けブラックジャック。 */
import { GameDB } from '../data/database.js';
import { CloudSaveService } from '../data/cloud-save-service.js';
import {
  getLastCloudUpload,
  recordCloudUpload,
} from '../data/cloud-save-local-state.js';
import { APP_VERSION } from '../definitions/update-log.js';
import {
  createBlackjackRound,
  drawBlackjackCard,
  getBlackjackCurrencyRules,
  getBlackjackHandValue,
  getBlackjackPayout,
  isValidBlackjackBet,
  normalizeBlackjackCurrency,
  resolveBlackjackOutcome,
  shouldBlackjackDealerHit,
} from '../data/blackjack-engine.js';
import { formatNumber } from '../utils/format.js';

const ROUND_STATE_KEY = 'blackjack_round';
const CURRENCY_VIEWS = Object.freeze({
  gold: { label: 'Gold', icon: 'toll', text: 'text-amber-200', accent: 'accent-amber-400', defaultBet: 50 },
  prism: { label: 'Prism', icon: 'diamond', text: 'text-fuchsia-200', accent: 'accent-fuchsia-400', defaultBet: 10 },
});
const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const pageStyles = () => `
  <style>
    .blackjack-felt { position:relative; background:radial-gradient(circle at 50% 42%,#176246 0%,#0b3b2c 54%,#05251d 100%); box-shadow:inset 0 0 60px rgba(0,0,0,.52),0 18px 45px rgba(0,0,0,.38); transition:filter .8s ease,box-shadow .8s ease; }
    .blackjack-felt.is-victory { animation:blackjack-table-win 1.1s ease-out both; box-shadow:inset 0 0 50px rgba(253,224,71,.2),0 0 40px rgba(250,204,21,.3),0 18px 45px rgba(0,0,0,.38); }
    .blackjack-felt.is-defeat { animation:blackjack-table-lose .8s ease-out both; filter:saturate(.45) brightness(.7); }
    .blackjack-card { width:clamp(3.8rem,17vw,5.25rem); aspect-ratio:5/7; border-radius:.65rem; background:linear-gradient(145deg,#fff,#e2e8f0); box-shadow:0 6px 12px rgba(0,0,0,.36),inset 0 0 0 1px rgba(15,23,42,.18); }
    .blackjack-card + .blackjack-card { margin-left:clamp(-1.5rem,-5vw,-.7rem); }
    .blackjack-card.is-hidden { border:3px solid #dbeafe; background:repeating-linear-gradient(45deg,#172554 0 5px,#1d4ed8 5px 10px); box-shadow:0 6px 12px rgba(0,0,0,.36),inset 0 0 0 3px #0f172a,inset 0 0 0 5px #93c5fd; }
    .blackjack-card-deal { animation:blackjack-deal .42s cubic-bezier(.2,.8,.2,1) both; }
    .blackjack-card-reveal { animation:blackjack-reveal .62s cubic-bezier(.2,.8,.2,1) both; transform-style:preserve-3d; }
    .blackjack-result-stage { animation:blackjack-stage-in .38s ease-out both; }
    .blackjack-result-card { animation:blackjack-result-in .7s cubic-bezier(.18,.9,.2,1.15) both; }
    .blackjack-result-card.is-loss { animation:blackjack-loss-in .8s ease-out both; }
    .blackjack-result-halo { animation:blackjack-halo 1.35s ease-in-out infinite alternate; }
    .blackjack-fx-piece { position:absolute; left:var(--x); top:-12%; color:var(--color); font-size:var(--size); animation:blackjack-confetti var(--duration) var(--delay) cubic-bezier(.18,.72,.32,1) both; text-shadow:0 0 10px currentColor; }
    .blackjack-fx-rain { position:absolute; left:var(--x); top:-15%; width:2px; height:42px; border-radius:999px; background:linear-gradient(transparent,rgba(148,163,184,.65)); animation:blackjack-rain var(--duration) var(--delay) linear infinite; transform:rotate(12deg); }
    @keyframes blackjack-deal { from { opacity:0; transform:translate(38px,-28px) rotate(8deg) scale(.82); } to { opacity:1; transform:none; } }
    @keyframes blackjack-reveal { 0% { opacity:.5; transform:rotateY(90deg) scale(.92); } 60% { transform:rotateY(-8deg) scale(1.04); } 100% { opacity:1; transform:none; } }
    @keyframes blackjack-table-win { 0% { transform:none; } 35% { transform:scale(1.012); } 100% { transform:none; } }
    @keyframes blackjack-table-lose { 0%,100% { transform:translateX(0); } 25% { transform:translateX(-4px); } 48% { transform:translateX(3px); } 70% { transform:translateX(-2px); } }
    @keyframes blackjack-stage-in { from { opacity:0; backdrop-filter:blur(0); } to { opacity:1; backdrop-filter:blur(6px); } }
    @keyframes blackjack-result-in { 0% { opacity:0; transform:translateY(24px) scale(.78); } 55% { transform:translateY(-5px) scale(1.04); } 100% { opacity:1; transform:none; } }
    @keyframes blackjack-loss-in { 0% { opacity:0; transform:translateY(-12px) scale(1.06); } 30% { transform:translateX(-5px) rotate(-1deg); } 55% { transform:translateX(4px) rotate(1deg); } 100% { opacity:1; transform:none; } }
    @keyframes blackjack-halo { from { opacity:.45; transform:scale(.88) rotate(0); } to { opacity:.9; transform:scale(1.08) rotate(12deg); } }
    @keyframes blackjack-confetti { 0% { opacity:0; transform:translateY(0) rotate(0) scale(.5); } 12% { opacity:1; } 100% { opacity:0; transform:translate(calc(var(--drift) * 1px),110vh) rotate(var(--spin)) scale(1.1); } }
    @keyframes blackjack-rain { from { opacity:0; transform:translateY(0) rotate(12deg); } 15% { opacity:.7; } to { opacity:0; transform:translateY(110vh) rotate(12deg); } }
    @media (prefers-reduced-motion:reduce) { .blackjack-card-deal,.blackjack-card-reveal,.blackjack-result-stage,.blackjack-result-card,.blackjack-result-card.is-loss,.blackjack-result-halo,.blackjack-fx-piece,.blackjack-fx-rain,.blackjack-felt.is-victory,.blackjack-felt.is-defeat { animation:none; } }
  </style>`;

function createRoundId() {
  return globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function updateHeaderBalance(currency, balance) {
  const display = document.getElementById(`header-${currency}-display`);
  if (display) display.textContent = formatNumber(balance);
}

function cardMarkup(card, { hidden = false, index = 0, owner = '', reveal = false } = {}) {
  const ownerAttribute = owner ? ` data-${owner}-card="${index}"` : '';
  if (hidden) {
    return `<div${ownerAttribute} class="blackjack-card is-hidden blackjack-card-deal shrink-0" style="animation-delay:${index * 100}ms" aria-label="伏せられたカード"></div>`;
  }
  const red = card?.color === 'red';
  return `
    <div${ownerAttribute} class="blackjack-card ${reveal ? 'blackjack-card-reveal' : 'blackjack-card-deal'} relative shrink-0 p-1.5 ${red ? 'text-rose-600' : 'text-slate-950'}" style="animation-delay:${reveal ? 0 : index * 100}ms" aria-label="${card?.symbol || ''}${card?.rank || ''}">
      <div class="text-base font-black leading-none">${card?.rank || '?'}</div>
      <div class="text-lg leading-none">${card?.symbol || ''}</div>
      <div class="absolute inset-0 flex items-center justify-center text-3xl">${card?.symbol || ''}</div>
      <div class="absolute bottom-1.5 right-1.5 rotate-180 text-base font-black leading-none">${card?.rank || '?'}</div>
    </div>`;
}

function outcomeView(round) {
  const profit = round.payout - round.wager;
  const currency = CURRENCY_VIEWS[normalizeBlackjackCurrency(round.currency)];
  const views = {
    blackjack: { title: 'BLACKJACK!', detail: `配当 +${formatNumber(profit)} ${currency.label}`, icon: 'auto_awesome', tone: 'text-amber-200', effect: 'win' },
    win: { title: 'YOU WIN', detail: `利益 +${formatNumber(profit)} ${currency.label}`, icon: 'emoji_events', tone: 'text-emerald-200', effect: 'win' },
    push: { title: 'PUSH', detail: '賭け金を返却しました', icon: 'handshake', tone: 'text-sky-200', effect: 'push' },
    lose: { title: 'DEALER WINS', detail: `${formatNumber(round.wager)} ${currency.label}を失いました`, icon: 'heart_broken', tone: 'text-rose-200', effect: 'lose' },
  };
  return views[round.outcome] || views.lose;
}

function errorMessage(error) {
  if (error?.code === 'blackjack/ownership-required') {
    return '別端末に新しいデータがあります。設定の「データ管理」から、この端末へ最新データを反映してください。';
  }
  if (error?.code === 'cloud-save/conflict') {
    return '別端末でデータが更新されました。設定の「データ管理」から最新データを反映してください。';
  }
  const message = String(error?.message || '');
  const playerSafePrefixes = [
    '賭け金', 'Goldが', 'Prismが', '未完了のラウンド', 'カードを処理', 'ダブルに必要',
    'ダブルを処理', 'ブラックジャックを遊ぶには', 'メールアドレスを確認',
    'ログイン状態が変更',
  ];
  if (playerSafePrefixes.some(prefix => message.startsWith(prefix))) return message;
  return '通信に失敗しました。接続状態を確認して、もう一度お試しください。';
}

function resultEffectsMarkup(effect) {
  if (effect === 'win') {
    return Array.from({ length: 34 }, (_, index) => {
      const colors = ['#fde047', '#fbbf24', '#86efac', '#67e8f9', '#f0abfc'];
      const symbols = ['✦', '◆', '●', '★'];
      return `<span class="blackjack-fx-piece" style="--x:${(index * 29) % 101}%;--color:${colors[index % colors.length]};--size:${12 + (index % 5) * 3}px;--duration:${1.8 + (index % 7) * .16}s;--delay:${(index % 9) * .06}s;--drift:${(index % 2 ? 1 : -1) * (18 + (index % 6) * 7)};--spin:${180 + (index % 6) * 90}deg">${symbols[index % symbols.length]}</span>`;
    }).join('');
  }
  if (effect === 'lose') {
    return Array.from({ length: 18 }, (_, index) => `<span class="blackjack-fx-rain" style="--x:${(index * 17) % 103}%;--duration:${1.1 + (index % 5) * .16}s;--delay:${(index % 7) * -.18}s"></span>`).join('');
  }
  return '';
}

export function renderBlackjackPage() {
  const container = document.createElement('div');
  container.className = 'relative min-h-full overflow-hidden bg-[#06130f] text-white';
  container.dataset.blackjackPage = 'true';

  let currentUser = null;
  let round = null;
  let balances = { gold: 0, prism: 0 };
  let selectedCurrency = 'gold';
  let busy = false;
  let disposed = false;
  let unsubscribe = null;
  let authRenderId = 0;
  const pendingPauses = new Map();
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  const dramaticPause = milliseconds => new Promise(resolve => {
    const id = window.setTimeout(() => {
      pendingPauses.delete(id);
      resolve(!disposed);
    }, reducedMotion ? Math.min(milliseconds, 80) : milliseconds);
    pendingPauses.set(id, resolve);
  });

  const openSettings = () => document.getElementById('btn-setting')?.click();
  const getRoundCurrency = () => normalizeBlackjackCurrency(round?.currency || selectedCurrency);
  const getBalance = (currency = getRoundCurrency()) => Math.max(0, Math.floor(Number(balances[currency]) || 0));
  const setBalance = (currency, value) => {
    const normalized = normalizeBlackjackCurrency(currency);
    balances[normalized] = Math.max(0, Math.floor(Number(value) || 0));
    updateHeaderBalance(normalized, balances[normalized]);
  };

  const withSessionLock = task => {
    if (navigator.locks?.request && currentUser?.uid) {
      return navigator.locks.request(`blackjack:${currentUser.uid}`, { mode: 'exclusive' }, task);
    }
    return task();
  };

  const requirePlayableUser = async () => {
    const user = await CloudSaveService.getCurrentUser();
    if (!user) {
      const error = new Error('ブラックジャックを遊ぶにはログインしてください。');
      error.code = 'blackjack/login-required';
      throw error;
    }
    if (!user.emailVerified) {
      const error = new Error('メールアドレスを確認してからブラックジャックを遊んでください。');
      error.code = 'blackjack/verification-required';
      throw error;
    }
    if (currentUser?.uid !== user.uid) throw new Error('ログイン状態が変更されました。');
    return user;
  };

  /** Save with optimistic concurrency and keep this device as the auto-save owner. */
  const syncCurrentSnapshot = async () => {
    const user = await requirePlayableUser();
    const metadata = await CloudSaveService.getMetadata();
    const lastUpload = getLastCloudUpload(user.uid);
    if (metadata && metadata.savedAt !== lastUpload) {
      const error = new Error('Another device owns the cloud save.');
      error.code = 'blackjack/ownership-required';
      throw error;
    }
    const payload = await GameDB.createCloudSnapshot();
    const uploaded = await CloudSaveService.upload(payload, APP_VERSION, {
      expectedSavedAt: metadata?.savedAt ?? null,
    });
    recordCloudUpload(user.uid, uploaded.savedAt);
    window.dispatchEvent(new CustomEvent('dailyCloudSaveStatus', {
      detail: { status: 'saved', savedAt: uploaded.savedAt, source: 'blackjack' },
    }));
    return uploaded;
  };

  const renderGate = (kind, detail = '') => {
    const views = {
      loading: { icon: 'progress_activity', title: 'ログイン状態を確認中', tone: 'text-emerald-300', action: '' },
      loggedOut: { icon: 'lock', title: 'ログインが必要です', tone: 'text-amber-300', action: '<button data-settings class="mt-4 w-full rounded-xl border border-amber-300/35 bg-amber-500/15 py-2.5 text-xs font-black text-amber-100">設定からログイン</button>' },
      unverified: { icon: 'mark_email_unread', title: 'メール確認が必要です', tone: 'text-cyan-300', action: '<button data-settings class="mt-4 w-full rounded-xl border border-cyan-300/35 bg-cyan-500/15 py-2.5 text-xs font-black text-cyan-100">設定で確認状態を更新</button>' },
      error: { icon: 'sync_problem', title: 'データを確認できません', tone: 'text-rose-300', action: '<button data-reload-state class="mt-4 w-full rounded-xl border border-rose-300/35 bg-rose-500/15 py-2.5 text-xs font-black text-rose-100">もう一度確認</button>' },
    };
    const view = views[kind] || views.error;
    container.innerHTML = `
      ${pageStyles()}
      <div class="mx-auto flex min-h-[390px] max-w-sm flex-col items-center justify-center p-5 text-center">
        <span class="material-symbols-outlined text-5xl ${view.tone} ${kind === 'loading' ? 'animate-spin' : ''}">${view.icon}</span>
        <h1 class="mt-2 text-lg font-black">${view.title}</h1>
        <p class="mt-2 text-[10px] leading-relaxed text-slate-400">${escapeHtml(detail || '通貨を扱うため、ブラックジャックは確認済みのアカウントで遊べます。')}</p>
        ${view.action}
        <button data-home class="mt-2 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-black text-slate-300">ホームタウンへ戻る</button>
      </div>`;
  };

  const renderLobby = (message = '') => {
    const currency = normalizeBlackjackCurrency(selectedCurrency);
    const rules = getBlackjackCurrencyRules(currency);
    const view = CURRENCY_VIEWS[currency];
    const balance = getBalance(currency);
    const maxBet = Math.floor(balance / rules.betStep) * rules.betStep;
    const canBet = maxBet >= rules.minBet;
    const preferredBet = Math.min(view.defaultBet, maxBet);
    const defaultBet = canBet
      ? Math.max(rules.minBet, Math.floor(preferredBet / rules.betStep) * rules.betStep)
      : 0;
    container.innerHTML = `
      ${pageStyles()}
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(16,185,129,.18),transparent_34%),radial-gradient(circle_at_88%_24%,rgba(245,158,11,.13),transparent_34%)]"></div>
      <div class="relative z-10 mx-auto max-w-lg p-2.5 pb-5">
        <header class="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/75 p-2.5 shadow-xl backdrop-blur-md">
          <button data-home class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300" aria-label="ホームタウンへ戻る"><span class="material-symbols-outlined">arrow_back</span></button>
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-300/30 bg-gradient-to-br from-emerald-500/20 to-amber-500/20"><span class="material-symbols-outlined text-3xl text-emerald-100">playing_cards</span></span>
          <span class="min-w-0"><span class="block text-[9px] font-black tracking-[.24em] text-emerald-300">ROYAL TABLE</span><h1 class="text-lg font-black leading-tight">ブラックジャック</h1><span class="text-[9px] text-slate-400">21に近づけてディーラーに勝とう</span></span>
        </header>

        <section class="mb-3 rounded-2xl border border-emerald-300/20 bg-emerald-950/20 p-3 text-[10px] leading-relaxed text-slate-300">
          <div class="mb-1 flex items-center gap-1 font-black text-emerald-200"><span class="material-symbols-outlined text-base">style</span>テーブルルール</div>
          ディーラーは17以上でスタンド。Aは1または11として数えます。伏せ札が開く瞬間まで、勝負の行方をお楽しみください。
        </section>

        <section class="rounded-3xl border border-amber-300/20 bg-slate-950/80 p-4 shadow-2xl">
          <div class="grid grid-cols-2 gap-2" role="group" aria-label="賭ける通貨を選択">
            ${Object.entries(CURRENCY_VIEWS).map(([id, item]) => {
              const selected = id === currency;
              return `<button data-wager-currency="${id}" aria-pressed="${selected}" class="rounded-2xl border px-3 py-2.5 text-left transition active:scale-[.98] ${selected ? id === 'gold' ? 'border-amber-300/50 bg-amber-500/15' : 'border-fuchsia-300/50 bg-fuchsia-500/15' : 'border-white/10 bg-white/5'}"><span class="flex items-center gap-1 text-[9px] font-black ${selected ? item.text : 'text-slate-400'}"><span class="material-symbols-outlined text-base">${item.icon}</span>${item.label}</span><span class="mt-1 block text-lg font-black tabular-nums ${selected ? item.text : 'text-slate-300'}">${formatNumber(getBalance(id))}</span></button>`;
            }).join('')}
          </div>

          <div class="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3">
            <div class="flex items-end justify-between gap-3"><label for="blackjack-wager" class="text-[9px] font-black text-slate-400">賭け金</label><div class="text-right"><span data-wager-output class="text-2xl font-black tabular-nums ${view.text}">${formatNumber(defaultBet)}</span><span class="ml-1 text-[9px] font-black text-slate-400">${view.label}</span></div></div>
            <input id="blackjack-wager" data-wager-range type="range" min="${rules.minBet}" max="${Math.max(rules.minBet, maxBet)}" step="${rules.betStep}" value="${canBet ? defaultBet : rules.minBet}" ${canBet ? '' : 'disabled'} class="mt-3 h-2 w-full cursor-pointer ${view.accent} disabled:cursor-not-allowed disabled:opacity-35" aria-label="${view.label}の賭け金">
            <div class="mt-1.5 flex justify-between text-[8px] font-bold text-slate-500"><span>MIN ${formatNumber(rules.minBet)}</span><span>MAX ${formatNumber(maxBet)}</span></div>
            <p class="mt-2 text-center text-[8px] text-slate-500">${view.label}は${rules.betStep}単位で調整できます</p>
          </div>
          ${message ? `<div class="mt-3 rounded-xl border border-rose-300/25 bg-rose-950/30 px-3 py-2 text-center text-[9px] font-bold leading-relaxed text-rose-200" role="alert">${escapeHtml(message)}</div>` : ''}
          <button data-deal ${canBet ? '' : 'disabled'} class="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200/40 bg-gradient-to-r from-emerald-600 to-teal-700 py-3 text-sm font-black text-white shadow-lg active:scale-[.99] disabled:opacity-35"><span class="material-symbols-outlined">playing_cards</span>賭けて配る</button>
          ${canBet ? '' : `<p class="mt-2 text-center text-[9px] text-rose-300">プレイには${rules.minBet} ${view.label}以上必要です。</p>`}
        </section>

        <section class="mt-3 grid grid-cols-3 gap-1.5 text-center text-[8px] text-slate-400"><div class="rounded-xl border border-white/10 bg-white/5 p-2"><b class="block text-[10px] text-white">通常勝利</b>2倍返却</div><div class="rounded-xl border border-white/10 bg-white/5 p-2"><b class="block text-[10px] text-amber-200">BLACKJACK</b>2.5倍返却</div><div class="rounded-xl border border-white/10 bg-white/5 p-2"><b class="block text-[10px] text-sky-200">PUSH</b>全額返却</div></section>
      </div>`;
  };

  const playerActionsMarkup = () => {
    const canDouble = !busy && round?.phase === 'player' && round.playerHand.length === 2 && getBalance() >= round.wager;
    return `
      <div class="grid grid-cols-3 gap-2" role="group" aria-label="ブラックジャックの操作">
        <button data-hit ${busy ? 'disabled' : ''} aria-label="ヒット：カードを1枚引く" title="ヒット：カードを1枚引く" class="group flex min-h-[76px] flex-col items-center justify-center rounded-2xl border border-cyan-300/35 bg-gradient-to-b from-cyan-500/20 to-cyan-950/35 px-1.5 py-2 text-cyan-100 shadow-lg transition active:scale-95 disabled:opacity-35">
          <span class="material-symbols-outlined text-[28px] leading-none" aria-hidden="true">add_card</span>
          <span class="mt-1 text-[10px] font-black">ヒット</span>
          <span class="mt-0.5 text-[7px] font-bold text-cyan-200/65">1枚引く</span>
        </button>
        <button data-stand ${busy ? 'disabled' : ''} aria-label="スタンド：この手札で勝負する" title="スタンド：この手札で勝負する" class="group flex min-h-[76px] flex-col items-center justify-center rounded-2xl border border-emerald-300/35 bg-gradient-to-b from-emerald-500/20 to-emerald-950/35 px-1.5 py-2 text-emerald-100 shadow-lg transition active:scale-95 disabled:opacity-35">
          <span class="material-symbols-outlined text-[28px] leading-none" aria-hidden="true">front_hand</span>
          <span class="mt-1 text-[10px] font-black">スタンド</span>
          <span class="mt-0.5 text-[7px] font-bold text-emerald-200/65">この手で勝負</span>
        </button>
        <button data-double ${canDouble ? '' : 'disabled'} aria-label="ダブル：賭け金を2倍にして1枚引く" title="ダブル：賭け金を2倍にして1枚引く" class="group flex min-h-[76px] flex-col items-center justify-center rounded-2xl border border-amber-300/35 bg-gradient-to-b from-amber-500/20 to-amber-950/35 px-1.5 py-2 text-amber-100 shadow-lg transition active:scale-95 disabled:opacity-35">
          <span class="material-symbols-outlined text-[28px] leading-none" aria-hidden="true">keyboard_double_arrow_up</span>
          <span class="mt-1 text-[10px] font-black">ダブル</span>
          <span class="mt-0.5 text-[7px] font-bold text-amber-200/65">賭け金 ×2</span>
        </button>
      </div>`;
  };

  const renderTable = (message = '', tone = 'normal') => {
    if (!round) return;
    const playerValue = getBlackjackHandValue(round.playerHand);
    const completed = round.phase === 'completed';
    const pending = round.phase === 'pending_sync';
    const currency = getRoundCurrency();
    const currencyView = CURRENCY_VIEWS[currency];
    const dealerVisibleHand = completed ? round.dealerHand : round.dealerHand.slice(0, 1);
    const dealerValue = getBlackjackHandValue(dealerVisibleHand);
    const statusTone = tone === 'error'
      ? 'border-rose-300/30 bg-rose-950/40 text-rose-100'
      : pending
        ? 'border-cyan-300/25 bg-cyan-950/30 text-cyan-100'
        : 'border-amber-300/20 bg-amber-950/30 text-amber-100';

    container.innerHTML = `
      ${pageStyles()}
      <div data-blackjack-root class="relative mx-auto max-w-xl p-2 pb-5">
        <header class="mb-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-2 shadow-lg">
          <button data-home class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300" aria-label="ホームタウンへ戻る"><span class="material-symbols-outlined">arrow_back</span></button>
          <div class="min-w-0 flex-1"><div class="text-[9px] font-black tracking-[.2em] text-emerald-300">BLACKJACK TABLE</div><div data-table-wager class="text-xs font-black">賭け金 ${formatNumber(round.wager)} ${currencyView.label}</div></div>
          <div class="rounded-lg border ${currency === 'gold' ? 'border-amber-300/20 bg-amber-500/10' : 'border-fuchsia-300/20 bg-fuchsia-500/10'} px-2 py-1 text-right"><div class="text-[7px] text-slate-500">所持${currencyView.label}</div><div data-table-balance class="text-[11px] font-black tabular-nums ${currencyView.text}">${formatNumber(getBalance())}</div></div>
        </header>

        <section data-blackjack-felt class="blackjack-felt min-h-[410px] rounded-[2rem] border-4 border-amber-900/70 p-3">
          <div class="text-center"><div class="text-[9px] font-black tracking-[.2em] text-emerald-200/70">DEALER</div><div data-dealer-score class="mt-0.5 text-sm font-black">${completed ? dealerValue.total : `${dealerValue.total} + ?`}</div></div>
          <div data-dealer-hand class="mt-2 flex min-h-[7.5rem] items-center justify-center" aria-label="ディーラーの手札">${round.dealerHand.map((card, index) => cardMarkup(card, { hidden: !completed && index === 1, index, owner: 'dealer' })).join('')}</div>
          <div class="my-3 flex items-center gap-2"><div class="h-px flex-1 bg-emerald-200/20"></div><div data-bet-chip class="rounded-full border border-amber-300/25 bg-black/25 px-3 py-1 text-[9px] font-black text-amber-200">BET ${formatNumber(round.wager)}</div><div class="h-px flex-1 bg-emerald-200/20"></div></div>
          <div data-player-hand class="flex min-h-[7.5rem] items-center justify-center" aria-label="あなたの手札">${round.playerHand.map((card, index) => cardMarkup(card, { index, owner: 'player' })).join('')}</div>
          <div class="mt-2 text-center"><div data-player-score class="text-sm font-black ${playerValue.busted ? 'text-rose-200' : 'text-white'}">${playerValue.total}${playerValue.soft ? ' SOFT' : ''}</div><div class="text-[9px] font-black tracking-[.2em] text-emerald-200/70">YOU</div></div>
        </section>

        <div data-table-status class="mt-2 min-h-9 rounded-xl border px-3 py-2 text-center text-[9px] font-black leading-relaxed ${statusTone}" role="status" aria-live="polite">${escapeHtml(message || (pending ? 'カードを準備しています…' : completed ? '勝負が決まりました' : 'カードを引くか、勝負するか選んでください'))}</div>
        <div data-table-actions class="mt-2">${completed || pending ? '' : playerActionsMarkup()}</div>
      </div>`;
  };

  const setTableStatus = (message, tone = 'normal') => {
    const status = container.querySelector('[data-table-status]');
    if (!status) return;
    const tones = {
      normal: 'border-amber-300/20 bg-amber-950/30 text-amber-100',
      suspense: 'border-violet-300/25 bg-violet-950/35 text-violet-100',
      success: 'border-emerald-300/25 bg-emerald-950/35 text-emerald-100',
      error: 'border-rose-300/30 bg-rose-950/40 text-rose-100',
    };
    status.className = `mt-2 min-h-9 rounded-xl border px-3 py-2 text-center text-[9px] font-black leading-relaxed ${tones[tone] || tones.normal}`;
    status.textContent = message;
  };

  const setControlsDisabled = disabled => {
    container.querySelectorAll('[data-hit],[data-stand],[data-double]').forEach(button => {
      button.disabled = disabled || (button.hasAttribute('data-double') && (round?.playerHand.length !== 2 || getBalance() < round.wager));
    });
  };

  const showPlayerActions = () => {
    const actions = container.querySelector('[data-table-actions]');
    if (actions) actions.innerHTML = playerActionsMarkup();
  };

  const updateTableBalances = () => {
    const balanceDisplay = container.querySelector('[data-table-balance]');
    const wagerDisplay = container.querySelector('[data-table-wager]');
    const betChip = container.querySelector('[data-bet-chip]');
    const currencyView = CURRENCY_VIEWS[getRoundCurrency()];
    if (balanceDisplay) balanceDisplay.textContent = formatNumber(getBalance());
    if (wagerDisplay) wagerDisplay.textContent = `賭け金 ${formatNumber(round.wager)} ${currencyView.label}`;
    if (betChip) betChip.textContent = `BET ${formatNumber(round.wager)}`;
  };

  const updatePlayerDisplay = (appendLatest = false) => {
    const hand = container.querySelector('[data-player-hand]');
    if (appendLatest && hand) {
      const index = round.playerHand.length - 1;
      hand.insertAdjacentHTML('beforeend', cardMarkup(round.playerHand[index], { index, owner: 'player', reveal: true }));
    }
    const value = getBlackjackHandValue(round.playerHand);
    const score = container.querySelector('[data-player-score]');
    if (score) {
      score.textContent = `${value.total}${value.soft ? ' SOFT' : ''}`;
      score.className = `text-sm font-black ${value.busted ? 'text-rose-200' : 'text-white'}`;
    }
  };

  const revealDealerCard = index => {
    const cardElement = container.querySelector(`[data-dealer-card="${index}"]`);
    if (cardElement) cardElement.outerHTML = cardMarkup(round.dealerHand[index], { index, owner: 'dealer', reveal: true });
    const score = container.querySelector('[data-dealer-score]');
    if (score) score.textContent = String(getBlackjackHandValue(round.dealerHand.slice(0, index + 1)).total);
  };

  const appendDealerCard = (card, index) => {
    const hand = container.querySelector('[data-dealer-hand]');
    hand?.insertAdjacentHTML('beforeend', cardMarkup(card, { index, owner: 'dealer', reveal: true }));
    const score = container.querySelector('[data-dealer-score]');
    if (score) score.textContent = String(getBlackjackHandValue(round.dealerHand).total);
  };

  const showResultPanel = () => {
    if (!round || round.phase !== 'completed' || container.querySelector('[data-result-stage]')) return;
    const view = outcomeView(round);
    const win = view.effect === 'win';
    const lose = view.effect === 'lose';
    const felt = container.querySelector('[data-blackjack-felt]');
    if (win) felt?.classList.add('is-victory');
    if (lose) felt?.classList.add('is-defeat');
    const root = container.querySelector('[data-blackjack-root]');
    root?.insertAdjacentHTML('beforeend', `
      <div data-result-stage class="blackjack-result-stage absolute inset-0 z-30 flex min-h-full items-center justify-center overflow-hidden rounded-2xl ${win ? 'bg-amber-950/45' : lose ? 'bg-slate-950/72' : 'bg-slate-950/55'} p-4 backdrop-blur-sm">
        <div class="pointer-events-none absolute inset-0 overflow-hidden">${resultEffectsMarkup(view.effect)}</div>
        ${win ? '<div class="blackjack-result-halo pointer-events-none absolute h-64 w-64 rounded-full bg-[conic-gradient(from_0deg,transparent,#fde04766,transparent,#f59e0b55,transparent)] blur-xl"></div>' : ''}
        <section class="blackjack-result-card ${lose ? 'is-loss border-rose-300/30 bg-gradient-to-b from-slate-900/95 to-rose-950/95' : win ? 'border-amber-200/55 bg-gradient-to-b from-amber-950/95 via-slate-900/95 to-emerald-950/95 shadow-[0_0_45px_rgba(250,204,21,.35)]' : 'border-sky-300/35 bg-slate-900/95'} relative z-10 w-full max-w-xs rounded-3xl border p-5 text-center shadow-2xl">
          <span class="material-symbols-outlined text-5xl ${view.tone}">${view.icon}</span>
          <h2 class="mt-1 text-2xl font-black tracking-wide ${view.tone}">${view.title}</h2>
          <p class="mt-2 text-xs font-bold text-slate-200">${view.detail}</p>
          <button data-result-continue ${round.resultSynced ? '' : 'disabled'} class="mt-5 flex w-full items-center justify-center gap-1 rounded-xl border ${win ? 'border-amber-200/50 bg-amber-400/20 text-amber-100' : lose ? 'border-slate-500/40 bg-slate-700/35 text-slate-200' : 'border-sky-300/35 bg-sky-500/15 text-sky-100'} py-3 text-xs font-black disabled:opacity-45"><span class="material-symbols-outlined text-base">${round.resultSynced ? 'replay' : 'hourglass_top'}</span><span data-result-button-label>${round.resultSynced ? '次の勝負' : 'チップを数えています…'}</span></button>
          <p data-result-network class="mt-2 hidden text-[9px] font-bold text-rose-300"></p>
        </section>
      </div>`);
  };

  const updateResultContinueButton = ({ ready, failed = false } = {}) => {
    const button = container.querySelector('[data-result-continue]');
    const label = container.querySelector('[data-result-button-label]');
    const icon = button?.querySelector('.material-symbols-outlined');
    const network = container.querySelector('[data-result-network]');
    if (!button || !label) return;
    button.disabled = !ready && !failed;
    button.dataset.retryConnection = failed ? 'true' : 'false';
    label.textContent = failed ? '再接続して続ける' : ready ? '次の勝負' : 'チップを数えています…';
    if (icon) icon.textContent = failed ? 'wifi_off' : ready ? 'replay' : 'hourglass_top';
    if (network) {
      network.textContent = failed ? '通信が不安定です。接続を確認してください。' : '';
      network.classList.toggle('hidden', !failed);
    }
  };

  const syncCompletedResult = async () => {
    if (!round || round.phase !== 'completed' || round.resultSynced || busy) return;
    busy = true;
    updateResultContinueButton({ ready: false });
    try {
      await syncCurrentSnapshot();
      const marked = await GameDB.markBlackjackResultSynced(round.id);
      if (!marked.updated) throw new Error('ラウンド結果が変更されました。');
      round = marked.round;
      updateResultContinueButton({ ready: true });
    } catch (error) {
      console.error('[Blackjack] Failed to sync result.', error);
      updateResultContinueButton({ ready: false, failed: true });
    } finally {
      busy = false;
    }
  };

  const finishRound = async outcome => {
    if (!round || round.phase !== 'player') return;
    const completedRound = {
      ...round,
      phase: 'completed',
      outcome,
      payout: getBlackjackPayout(round.wager, outcome, round.currency),
      completedAt: Date.now(),
      resultSynced: false,
    };
    const result = await GameDB.settleBlackjackRound(completedRound);
    if (!result.settled) throw new Error('ラウンドを精算できませんでした。');
    round = result.round;
    setBalance(result.currency, result.balance);
    updateTableBalances();
    setTableStatus(outcome === 'lose' ? '勝負が決まりました…' : '結果を確認しています…', outcome === 'lose' ? 'error' : 'success');
    await dramaticPause(450);
    if (disposed) return;
    showResultPanel();
    busy = false;
    await syncCompletedResult();
  };

  const playDealer = async () => {
    if (!round || busy) return;
    busy = true;
    setControlsDisabled(true);
    setTableStatus('ディーラーが伏せ札を確認しています…', 'suspense');
    if (!await dramaticPause(650)) return;
    revealDealerCard(1);
    setTableStatus('伏せ札が開きました', 'suspense');
    if (!await dramaticPause(850)) return;

    const working = JSON.parse(JSON.stringify(round));
    const playerBusted = getBlackjackHandValue(working.playerHand).busted;
    const natural = getBlackjackHandValue(working.playerHand).blackjack
      || getBlackjackHandValue(working.dealerHand).blackjack;
    while (!playerBusted && !natural && shouldBlackjackDealerHit(working.dealerHand)) {
      const beforeDraw = getBlackjackHandValue(working.dealerHand).total;
      setTableStatus(`${beforeDraw}… ディーラーはもう1枚引きます`, 'suspense');
      if (!await dramaticPause(700)) return;
      drawBlackjackCard(working, 'dealerHand');
      round = working;
      appendDealerCard(working.dealerHand.at(-1), working.dealerHand.length - 1);
      const value = getBlackjackHandValue(working.dealerHand);
      setTableStatus(value.busted ? `${value.total}、ディーラーがバースト！` : `${value.total}…`, value.busted ? 'success' : 'suspense');
      if (!await dramaticPause(900)) return;
    }
    round = working;
    const dealerValue = getBlackjackHandValue(round.dealerHand);
    if (playerBusted) setTableStatus('あなたはバーストしました…', 'error');
    else if (!dealerValue.busted && !natural) setTableStatus(`ディーラーは${dealerValue.total}でスタンド`, 'suspense');
    if (!await dramaticPause(800)) return;
    try {
      await finishRound(resolveBlackjackOutcome(round.playerHand, round.dealerHand));
    } catch (error) {
      console.error('[Blackjack] Could not settle dealer turn.', error);
      busy = false;
      setTableStatus('勝負を確定できませんでした。もう一度お試しください。', 'error');
      const actions = container.querySelector('[data-table-actions]');
      if (actions) actions.innerHTML = '<button data-retry-dealer class="w-full rounded-xl border border-rose-300/35 bg-rose-500/15 py-2.5 text-xs font-black text-rose-100">勝負を確定する</button>';
    }
  };

  const syncPendingStart = async () => {
    if (!round || round.phase !== 'pending_sync' || busy) return;
    busy = true;
    setTableStatus('カードを準備しています…', 'suspense');
    const retryButton = container.querySelector('[data-sync-start]');
    if (retryButton) retryButton.disabled = true;
    try {
      await syncCurrentSnapshot();
      const shouldRecordQuest = round.questPlayRecorded !== true;
      const playableRound = { ...round, phase: 'player', questPlayRecorded: true };
      const updated = await GameDB.updateBlackjackRound(playableRound);
      if (!updated.updated) throw new Error('ラウンドを開始状態へ更新できませんでした。');
      round = updated.round;
      if (shouldRecordQuest) window.dispatchEvent(new CustomEvent('quest:mini-game-play'));
      busy = false;
      const player = getBlackjackHandValue(round.playerHand);
      const dealer = getBlackjackHandValue(round.dealerHand);
      if (player.blackjack || dealer.blackjack) {
        setTableStatus('最初の2枚で勝負が動きます…', 'suspense');
        await playDealer();
      } else {
        showPlayerActions();
        setTableStatus('カードを引くか、勝負するか選んでください');
      }
    } catch (error) {
      console.error('[Blackjack] Failed to sync round start.', error);
      busy = false;
      setTableStatus(errorMessage(error), 'error');
      const actions = container.querySelector('[data-table-actions]');
      if (actions) actions.innerHTML = '<button data-sync-start class="w-full rounded-xl border border-cyan-300/35 bg-cyan-500/15 py-2.5 text-xs font-black text-cyan-100">もう一度カードを準備</button>';
    }
  };

  const startRound = async wager => {
    if (busy) return;
    busy = true;
    await withSessionLock(async () => {
      try {
        await requirePlayableUser();
        const currency = normalizeBlackjackCurrency(selectedCurrency);
        const rules = getBlackjackCurrencyRules(currency);
        const view = CURRENCY_VIEWS[currency];
        const latestBalance = Math.max(0, Math.floor(Number(await GameDB.getGameState(currency)) || 0));
        setBalance(currency, latestBalance);
        if (!isValidBlackjackBet(wager, currency) || wager > latestBalance) {
          throw new Error(`賭け金を${rules.betStep} ${view.label}刻みで選んでください。`);
        }

        // Ownership is checked before local mutation. A stale secondary device
        // must restore instead of overwriting the current bankroll.
        const metadata = await CloudSaveService.getMetadata();
        if (metadata && metadata.savedAt !== getLastCloudUpload(currentUser.uid)) {
          const ownershipError = new Error('Another device owns the cloud save.');
          ownershipError.code = 'blackjack/ownership-required';
          throw ownershipError;
        }

        const newRound = createBlackjackRound(wager, { id: createRoundId(), currency });
        const result = await GameDB.startBlackjackRound(newRound);
        if (!result.started) {
          if (result.reason === 'insufficient-balance') throw new Error(`${view.label}が足りません。`);
          round = result.round;
          const activeCurrency = normalizeBlackjackCurrency(round?.currency);
          setBalance(activeCurrency, await GameDB.getGameState(activeCurrency));
          throw new Error('未完了のラウンドがあります。');
        }
        round = result.round;
        setBalance(result.currency, result.balance);
      } catch (error) {
        console.error('[Blackjack] Could not start round.', error);
        if (round && round.phase !== 'completed') renderTable(errorMessage(error), 'error');
        else renderLobby(errorMessage(error));
      }
    });
    busy = false;
    if (round?.phase === 'pending_sync') {
      renderTable();
      await syncPendingStart();
    }
  };

  const hit = async () => {
    if (!round || round.phase !== 'player' || busy) return;
    busy = true;
    try {
      const nextRound = JSON.parse(JSON.stringify(round));
      drawBlackjackCard(nextRound, 'playerHand');
      const updated = await GameDB.updateBlackjackRound(nextRound);
      if (!updated.updated) throw new Error('カードを処理できませんでした。');
      round = updated.round;
      updatePlayerDisplay(true);
      setTableStatus('カードを1枚引きました');
      if (!await dramaticPause(420)) return;
      const value = getBlackjackHandValue(round.playerHand);
      busy = false;
      if (value.busted || value.total === 21) await playDealer();
      else setControlsDisabled(false);
    } catch (error) {
      console.error('[Blackjack] Hit failed.', error);
      busy = false;
      setTableStatus(errorMessage(error), 'error');
      setControlsDisabled(false);
    }
  };

  const doubleDown = async () => {
    if (!round || round.phase !== 'player' || round.playerHand.length !== 2 || busy || getBalance() < round.wager) return;
    busy = true;
    try {
      const previousWager = round.wager;
      const nextRound = JSON.parse(JSON.stringify(round));
      nextRound.wager += previousWager;
      drawBlackjackCard(nextRound, 'playerHand');
      const updated = await GameDB.updateBlackjackRound(nextRound, previousWager);
      const currencyView = CURRENCY_VIEWS[getRoundCurrency()];
      if (!updated.updated) throw new Error(updated.reason === 'insufficient-balance' ? `ダブルに必要な${currencyView.label}が足りません。` : 'ダブルを処理できませんでした。');
      round = updated.round;
      setBalance(updated.currency, updated.balance);
      updateTableBalances();
      updatePlayerDisplay(true);
      setTableStatus('賭け金を倍にして、最後の1枚を引きました', 'suspense');
      if (!await dramaticPause(620)) return;
      busy = false;
      await playDealer();
    } catch (error) {
      console.error('[Blackjack] Double down failed.', error);
      busy = false;
      setTableStatus(errorMessage(error), 'error');
      setControlsDisabled(false);
    }
  };

  const loadForUser = async user => {
    const renderId = ++authRenderId;
    currentUser = user;
    if (!user) {
      round = null;
      renderGate('loggedOut');
      return;
    }
    if (!user.emailVerified) {
      round = null;
      renderGate('unverified', 'メール確認済みのアカウントだけが通貨を賭けられます。確認メールのリンクを開いた後、設定で確認状態を更新してください。');
      return;
    }
    renderGate('loading', '所持通貨と未完了のラウンドを確認しています…');
    try {
      const [storedGold, storedPrism, storedRound] = await Promise.all([
        GameDB.getGameState('gold'),
        GameDB.getGameState('prism'),
        GameDB.getGameState(ROUND_STATE_KEY),
      ]);
      if (disposed || renderId !== authRenderId) return;
      balances = {
        gold: Math.max(0, Math.floor(Number(storedGold) || 0)),
        prism: Math.max(0, Math.floor(Number(storedPrism) || 0)),
      };
      round = storedRound || null;
      updateHeaderBalance('gold', balances.gold);
      updateHeaderBalance('prism', balances.prism);
      if (round) selectedCurrency = normalizeBlackjackCurrency(round.currency);
      if (!round || (round.phase === 'completed' && round.resultSynced)) renderLobby();
      else if (round.phase === 'pending_sync') {
        renderTable('カードを準備しています…');
        await syncPendingStart();
      } else if (round.phase === 'player') renderTable('未完了のラウンドを再開しました');
      else if (round.phase === 'completed') {
        renderTable('勝負が決まりました');
        showResultPanel();
        syncCompletedResult();
      }
      else throw new Error('ラウンドデータを読み込めません。');
    } catch (error) {
      console.error('[Blackjack] Could not load state.', error);
      if (!disposed && renderId === authRenderId) renderGate('error', errorMessage(error));
    }
  };

  container.addEventListener('click', async event => {
    if (event.target.closest('[data-home]')) {
      window.location.hash = '/status';
      return;
    }
    if (event.target.closest('[data-settings]')) {
      openSettings();
      return;
    }
    if (event.target.closest('[data-reload-state]')) {
      await loadForUser(currentUser);
      return;
    }
    const currencyButton = event.target.closest('[data-wager-currency]');
    if (currencyButton) {
      selectedCurrency = normalizeBlackjackCurrency(currencyButton.dataset.wagerCurrency);
      renderLobby();
      return;
    }
    if (event.target.closest('[data-deal]')) {
      const value = Number(container.querySelector('[data-wager-range]')?.value);
      await startRound(value);
      return;
    }
    if (event.target.closest('[data-sync-start]')) {
      await syncPendingStart();
      return;
    }
    if (event.target.closest('[data-hit]')) {
      await hit();
      return;
    }
    if (event.target.closest('[data-stand]')) {
      await playDealer();
      return;
    }
    if (event.target.closest('[data-double]')) {
      await doubleDown();
      return;
    }
    if (event.target.closest('[data-retry-dealer]')) {
      await playDealer();
      return;
    }
    const resultContinue = event.target.closest('[data-result-continue]');
    if (resultContinue) {
      if (!round?.resultSynced || resultContinue.dataset.retryConnection === 'true') {
        await syncCompletedResult();
      } else {
        round = null;
        const [latestGold, latestPrism] = await Promise.all([
          GameDB.getGameState('gold'),
          GameDB.getGameState('prism'),
        ]);
        balances = {
          gold: Math.max(0, Math.floor(Number(latestGold) || 0)),
          prism: Math.max(0, Math.floor(Number(latestPrism) || 0)),
        };
        renderLobby();
      }
    }
  });

  container.addEventListener('input', event => {
    const slider = event.target.closest('[data-wager-range]');
    if (!slider) return;
    const output = container.querySelector('[data-wager-output]');
    if (output) output.textContent = formatNumber(Number(slider.value) || 0);
  });

  container.cleanup = () => {
    disposed = true;
    authRenderId += 1;
    for (const [id, resolve] of pendingPauses) {
      window.clearTimeout(id);
      resolve(false);
    }
    pendingPauses.clear();
    unsubscribe?.();
  };

  renderGate('loading');
  if (!CloudSaveService.isConfigured) {
    renderGate('error', 'オンライン機能を利用できないため、ブラックジャックを開始できません。');
    return container;
  }
  CloudSaveService.observeAuthState(user => loadForUser(user))
    .then(stop => {
      if (disposed) stop();
      else unsubscribe = stop;
    })
    .catch(error => {
      console.error('[Blackjack] Authentication initialization failed.', error);
      if (!disposed) renderGate('error', errorMessage(error));
    });
  return container;
}
