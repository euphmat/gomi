/** ログインとクラウドセーブ所有権を必須にした、Gold賭けブラックジャック。 */
import { GameDB } from '../data/database.js';
import { CloudSaveService } from '../data/cloud-save-service.js';
import {
  getLastCloudUpload,
  recordCloudUpload,
} from '../data/cloud-save-local-state.js';
import { APP_VERSION } from '../definitions/update-log.js';
import {
  BLACKJACK_BET_STEP,
  BLACKJACK_MIN_BET,
  createBlackjackRound,
  drawBlackjackCard,
  getBlackjackHandValue,
  getBlackjackPayout,
  isValidBlackjackBet,
  resolveBlackjackOutcome,
  shouldBlackjackDealerHit,
} from '../data/blackjack-engine.js';
import { formatNumber } from '../utils/format.js';

const ROUND_STATE_KEY = 'blackjack_round';
const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const pageStyles = () => `
  <style>
    .blackjack-felt { background:radial-gradient(circle at 50% 42%,#176246 0%,#0b3b2c 54%,#05251d 100%); box-shadow:inset 0 0 60px rgba(0,0,0,.52),0 18px 45px rgba(0,0,0,.38); }
    .blackjack-card { width:clamp(3.8rem,17vw,5.25rem); aspect-ratio:5/7; border-radius:.65rem; background:linear-gradient(145deg,#fff,#e2e8f0); box-shadow:0 6px 12px rgba(0,0,0,.36),inset 0 0 0 1px rgba(15,23,42,.18); }
    .blackjack-card + .blackjack-card { margin-left:clamp(-1.5rem,-5vw,-.7rem); }
    .blackjack-card.is-hidden { border:3px solid #dbeafe; background:repeating-linear-gradient(45deg,#172554 0 5px,#1d4ed8 5px 10px); box-shadow:0 6px 12px rgba(0,0,0,.36),inset 0 0 0 3px #0f172a,inset 0 0 0 5px #93c5fd; }
    .blackjack-card-deal { animation:blackjack-deal .28s cubic-bezier(.2,.8,.2,1) both; }
    @keyframes blackjack-deal { from { opacity:0; transform:translate(38px,-28px) rotate(8deg) scale(.82); } to { opacity:1; transform:none; } }
    @media (prefers-reduced-motion:reduce) { .blackjack-card-deal { animation:none; } }
  </style>`;

function createRoundId() {
  return globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function updateHeaderGold(gold) {
  const display = document.getElementById('header-gold-display');
  if (display) display.textContent = formatNumber(gold);
}

function cardMarkup(card, hidden = false, index = 0) {
  if (hidden) {
    return `<div class="blackjack-card is-hidden blackjack-card-deal shrink-0" style="animation-delay:${index * 35}ms" aria-label="伏せられたカード"></div>`;
  }
  const red = card?.color === 'red';
  return `
    <div class="blackjack-card blackjack-card-deal relative shrink-0 p-1.5 ${red ? 'text-rose-600' : 'text-slate-950'}" style="animation-delay:${index * 35}ms" aria-label="${card?.symbol || ''}${card?.rank || ''}">
      <div class="text-base font-black leading-none">${card?.rank || '?'}</div>
      <div class="text-lg leading-none">${card?.symbol || ''}</div>
      <div class="absolute inset-0 flex items-center justify-center text-3xl">${card?.symbol || ''}</div>
      <div class="absolute bottom-1.5 right-1.5 rotate-180 text-base font-black leading-none">${card?.rank || '?'}</div>
    </div>`;
}

function outcomeView(round) {
  const profit = round.payout - round.wager;
  const views = {
    blackjack: { title: 'BLACKJACK!', detail: `配当 +${formatNumber(profit)} Gold`, icon: 'auto_awesome', tone: 'text-amber-200' },
    win: { title: 'YOU WIN', detail: `利益 +${formatNumber(profit)} Gold`, icon: 'emoji_events', tone: 'text-emerald-200' },
    push: { title: 'PUSH', detail: '賭け金を返却しました', icon: 'handshake', tone: 'text-sky-200' },
    lose: { title: 'DEALER WINS', detail: `${formatNumber(round.wager)} Goldを失いました`, icon: 'sentiment_dissatisfied', tone: 'text-rose-200' },
  };
  return views[round.outcome] || views.lose;
}

function errorMessage(error) {
  if (error?.code === 'blackjack/ownership-required') {
    return '別端末のクラウドセーブを検出しました。設定の「データ管理」からクラウドセーブを復元して、この端末へセーブ権を移してください。';
  }
  if (error?.code === 'cloud-save/conflict') {
    return '保存中に別端末でセーブされました。この端末の自動セーブは無効です。クラウドから復元してください。';
  }
  return error?.message || 'クラウドセーブに失敗しました。通信状態を確認してください。';
}

export function renderBlackjackPage() {
  const container = document.createElement('div');
  container.className = 'relative min-h-full overflow-hidden bg-[#06130f] text-white';
  container.dataset.blackjackPage = 'true';

  let currentUser = null;
  let round = null;
  let gold = 0;
  let busy = false;
  let disposed = false;
  let unsubscribe = null;
  let authRenderId = 0;

  const openSettings = () => document.getElementById('btn-setting')?.click();

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
      error: { icon: 'sync_problem', title: 'セーブデータを確認できません', tone: 'text-rose-300', action: '<button data-reload-state class="mt-4 w-full rounded-xl border border-rose-300/35 bg-rose-500/15 py-2.5 text-xs font-black text-rose-100">もう一度確認</button>' },
    };
    const view = views[kind] || views.error;
    container.innerHTML = `
      ${pageStyles()}
      <div class="mx-auto flex min-h-[390px] max-w-sm flex-col items-center justify-center p-5 text-center">
        <span class="material-symbols-outlined text-5xl ${view.tone} ${kind === 'loading' ? 'animate-spin' : ''}">${view.icon}</span>
        <h1 class="mt-2 text-lg font-black">${view.title}</h1>
        <p class="mt-2 text-[10px] leading-relaxed text-slate-400">${escapeHtml(detail || 'Goldを扱うため、ブラックジャックはクラウドセーブを利用できるアカウントだけが遊べます。')}</p>
        ${view.action}
        <button data-home class="mt-2 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-black text-slate-300">ホームタウンへ戻る</button>
      </div>`;
  };

  const renderLobby = (message = '') => {
    const maxBet = Math.floor(gold / BLACKJACK_BET_STEP) * BLACKJACK_BET_STEP;
    const defaultBet = Math.min(Math.max(BLACKJACK_MIN_BET, 50), maxBet);
    const canBet = maxBet >= BLACKJACK_MIN_BET;
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
          <div class="mb-1 flex items-center gap-1 font-black text-emerald-200"><span class="material-symbols-outlined text-base">verified_user</span>セーフプレイ</div>
          ラウンド開始前に賭け金と配札をクラウドへ自動保存し、この端末の自動セーブを有効にします。別端末の自動セーブは無効になります。
        </section>

        <section class="rounded-3xl border border-amber-300/20 bg-slate-950/80 p-4 shadow-2xl">
          <div class="text-center"><div class="text-[9px] font-black tracking-[.2em] text-slate-500">YOUR BANKROLL</div><div class="mt-1 text-3xl font-black tabular-nums text-amber-200">${formatNumber(gold)} <span class="text-xs">Gold</span></div></div>
          <div class="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3">
            <label for="blackjack-wager" class="text-[9px] font-black text-slate-400">賭け金（10 Gold刻み）</label>
            <div class="mt-1.5 flex items-center gap-2"><input id="blackjack-wager" data-wager type="number" min="${BLACKJACK_MIN_BET}" max="${maxBet}" step="${BLACKJACK_BET_STEP}" value="${canBet ? defaultBet : 0}" ${canBet ? '' : 'disabled'} class="min-w-0 flex-1 rounded-xl border border-amber-300/25 bg-slate-900 px-3 py-2.5 text-center text-lg font-black tabular-nums text-amber-100 outline-none focus:border-amber-300"><span class="text-[10px] font-black text-slate-500">Gold</span></div>
            <div class="mt-2 grid grid-cols-4 gap-1.5">${[10, 50, 100].map(value => `<button data-chip="${value}" ${gold >= value ? '' : 'disabled'} class="rounded-lg border border-white/10 bg-white/5 py-2 text-[9px] font-black text-slate-300 disabled:opacity-30">${value}</button>`).join('')}<button data-chip="max" ${canBet ? '' : 'disabled'} class="rounded-lg border border-amber-300/20 bg-amber-500/10 py-2 text-[9px] font-black text-amber-200 disabled:opacity-30">MAX</button></div>
          </div>
          ${message ? `<div class="mt-3 rounded-xl border border-rose-300/25 bg-rose-950/30 px-3 py-2 text-center text-[9px] font-bold leading-relaxed text-rose-200" role="alert">${escapeHtml(message)}</div>` : ''}
          <button data-deal ${canBet ? '' : 'disabled'} class="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200/40 bg-gradient-to-r from-emerald-600 to-teal-700 py-3 text-sm font-black text-white shadow-lg active:scale-[.99] disabled:opacity-35"><span class="material-symbols-outlined">playing_cards</span>賭けて配る</button>
          ${canBet ? '' : '<p class="mt-2 text-center text-[9px] text-rose-300">プレイには10 Gold以上必要です。</p>'}
        </section>

        <section class="mt-3 grid grid-cols-3 gap-1.5 text-center text-[8px] text-slate-400"><div class="rounded-xl border border-white/10 bg-white/5 p-2"><b class="block text-[10px] text-white">通常勝利</b>2倍返却</div><div class="rounded-xl border border-white/10 bg-white/5 p-2"><b class="block text-[10px] text-amber-200">BLACKJACK</b>2.5倍返却</div><div class="rounded-xl border border-white/10 bg-white/5 p-2"><b class="block text-[10px] text-sky-200">PUSH</b>全額返却</div></section>
      </div>`;
  };

  const renderTable = (message = '', tone = 'normal') => {
    if (!round) return;
    const playerValue = getBlackjackHandValue(round.playerHand);
    const completed = round.phase === 'completed';
    const pending = round.phase === 'pending_sync';
    const dealerVisibleHand = completed ? round.dealerHand : round.dealerHand.slice(0, 1);
    const dealerValue = getBlackjackHandValue(dealerVisibleHand);
    const canDouble = !busy && !pending && !completed && round.playerHand.length === 2 && gold >= round.wager;
    const result = completed ? outcomeView(round) : null;
    const statusTone = tone === 'error' ? 'border-rose-300/30 bg-rose-950/40 text-rose-100' : pending ? 'border-cyan-300/25 bg-cyan-950/30 text-cyan-100' : 'border-amber-300/20 bg-amber-950/30 text-amber-100';

    container.innerHTML = `
      ${pageStyles()}
      <div class="relative mx-auto max-w-xl p-2 pb-5">
        <header class="mb-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-2 shadow-lg">
          <button data-home class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300" aria-label="ホームタウンへ戻る"><span class="material-symbols-outlined">arrow_back</span></button>
          <div class="min-w-0 flex-1"><div class="text-[9px] font-black tracking-[.2em] text-emerald-300">BLACKJACK TABLE</div><div class="text-xs font-black">賭け金 ${formatNumber(round.wager)} Gold</div></div>
          <div class="rounded-lg border border-amber-300/20 bg-amber-500/10 px-2 py-1 text-right"><div class="text-[7px] text-slate-500">所持Gold</div><div class="text-[11px] font-black tabular-nums text-amber-200">${formatNumber(gold)}</div></div>
        </header>

        <section class="blackjack-felt min-h-[410px] rounded-[2rem] border-4 border-amber-900/70 p-3">
          <div class="text-center"><div class="text-[9px] font-black tracking-[.2em] text-emerald-200/70">DEALER</div><div class="mt-0.5 text-sm font-black">${completed ? dealerValue.total : `${dealerValue.total} + ?`}</div></div>
          <div class="mt-2 flex min-h-[7.5rem] items-center justify-center" aria-label="ディーラーの手札">${round.dealerHand.map((card, index) => cardMarkup(card, !completed && index === 1, index)).join('')}</div>
          <div class="my-3 flex items-center gap-2"><div class="h-px flex-1 bg-emerald-200/20"></div><div class="rounded-full border border-amber-300/25 bg-black/25 px-3 py-1 text-[9px] font-black text-amber-200">BET ${formatNumber(round.wager)}</div><div class="h-px flex-1 bg-emerald-200/20"></div></div>
          <div class="flex min-h-[7.5rem] items-center justify-center" aria-label="あなたの手札">${round.playerHand.map((card, index) => cardMarkup(card, false, index)).join('')}</div>
          <div class="mt-2 text-center"><div class="text-sm font-black ${playerValue.busted ? 'text-rose-200' : 'text-white'}">${playerValue.total}${playerValue.soft ? ' SOFT' : ''}</div><div class="text-[9px] font-black tracking-[.2em] text-emerald-200/70">YOU</div></div>
        </section>

        <div class="mt-2 min-h-9 rounded-xl border px-3 py-2 text-center text-[9px] font-black leading-relaxed ${statusTone}" role="status" aria-live="polite">${escapeHtml(message || (pending ? '賭け金と配札をクラウドへ自動保存しています…' : completed ? (round.resultSynced ? '結果をクラウドへ保存しました' : '結果をクラウドへ保存しています…') : 'カードを引くか、勝負するか選んでください'))}</div>

        ${completed ? `
          <section class="mt-2 rounded-2xl border border-white/10 bg-slate-950/90 p-4 text-center shadow-xl">
            <span class="material-symbols-outlined text-4xl ${result.tone}">${result.icon}</span><h2 class="mt-1 text-xl font-black ${result.tone}">${result.title}</h2><p class="mt-1 text-[10px] font-bold text-slate-300">${result.detail}</p>
            ${round.resultSynced ? '<button data-new-round class="mt-3 w-full rounded-xl border border-emerald-300/35 bg-emerald-500/15 py-2.5 text-xs font-black text-emerald-100">次のラウンド</button>' : '<button data-sync-result class="mt-3 w-full rounded-xl border border-cyan-300/35 bg-cyan-500/15 py-2.5 text-xs font-black text-cyan-100">結果の保存を再試行</button>'}
          </section>` : pending ? `
          <button data-sync-start class="mt-2 w-full rounded-xl border border-cyan-300/35 bg-cyan-500/15 py-2.5 text-xs font-black text-cyan-100 disabled:opacity-40" ${busy ? 'disabled' : ''}>開始前セーブを再試行</button>` : `
          <div class="mt-2 grid grid-cols-3 gap-2"><button data-hit ${busy ? 'disabled' : ''} class="rounded-xl border border-cyan-300/30 bg-cyan-500/15 py-2.5 text-[10px] font-black text-cyan-100 disabled:opacity-35">ヒット</button><button data-stand ${busy ? 'disabled' : ''} class="rounded-xl border border-emerald-300/30 bg-emerald-500/15 py-2.5 text-[10px] font-black text-emerald-100 disabled:opacity-35">スタンド</button><button data-double ${canDouble ? '' : 'disabled'} class="rounded-xl border border-amber-300/30 bg-amber-500/15 py-2.5 text-[10px] font-black text-amber-100 disabled:opacity-35">ダブル</button></div>`}
      </div>`;
  };

  const syncCompletedResult = async () => {
    if (!round || round.phase !== 'completed' || round.resultSynced || busy) return;
    busy = true;
    renderTable('結果をクラウドへ保存しています…');
    try {
      await syncCurrentSnapshot();
      const marked = await GameDB.markBlackjackResultSynced(round.id);
      if (!marked.updated) throw new Error('ラウンド結果が変更されました。');
      round = marked.round;
      renderTable('結果を保存しました。この端末の自動セーブが有効です。');
    } catch (error) {
      console.error('[Blackjack] Failed to sync result.', error);
      renderTable(errorMessage(error), 'error');
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
      payout: getBlackjackPayout(round.wager, outcome),
      completedAt: Date.now(),
      resultSynced: false,
    };
    const result = await GameDB.settleBlackjackRound(completedRound);
    if (!result.settled) throw new Error('ラウンドを精算できませんでした。');
    round = result.round;
    gold = result.gold;
    updateHeaderGold(gold);
    renderTable();
    busy = false;
    await syncCompletedResult();
  };

  const playDealer = async () => {
    if (!round || busy) return;
    busy = true;
    const working = JSON.parse(JSON.stringify(round));
    while (shouldBlackjackDealerHit(working.dealerHand)) {
      drawBlackjackCard(working, 'dealerHand');
    }
    round = working;
    await finishRound(resolveBlackjackOutcome(round.playerHand, round.dealerHand));
  };

  const syncPendingStart = async () => {
    if (!round || round.phase !== 'pending_sync' || busy) return;
    busy = true;
    renderTable('賭け金と配札をクラウドへ自動保存しています…');
    try {
      await syncCurrentSnapshot();
      const shouldRecordQuest = round.questPlayRecorded !== true;
      const playableRound = { ...round, phase: 'player', questPlayRecorded: true };
      const updated = await GameDB.updateBlackjackRound(playableRound);
      if (!updated.updated) throw new Error('ラウンドを開始状態へ更新できませんでした。');
      round = updated.round;
      if (shouldRecordQuest) window.dispatchEvent(new CustomEvent('quest:mini-game-play'));
      busy = false;
      renderTable('開始前セーブ完了。この端末の自動セーブが有効です。');
      const player = getBlackjackHandValue(round.playerHand);
      const dealer = getBlackjackHandValue(round.dealerHand);
      if (player.blackjack || dealer.blackjack) await finishRound(resolveBlackjackOutcome(round.playerHand, round.dealerHand));
    } catch (error) {
      console.error('[Blackjack] Failed to sync round start.', error);
      busy = false;
      renderTable(errorMessage(error), 'error');
    }
  };

  const startRound = async wager => {
    if (busy) return;
    busy = true;
    await withSessionLock(async () => {
      try {
        await requirePlayableUser();
        const latestGold = Math.max(0, Math.floor(Number(await GameDB.getGameState('gold')) || 0));
        if (!isValidBlackjackBet(wager) || wager > latestGold) throw new Error('賭け金を10 Gold刻みで入力してください。');

        // Ownership is checked before local mutation. A stale secondary device
        // must restore instead of overwriting the current bankroll.
        const metadata = await CloudSaveService.getMetadata();
        if (metadata && metadata.savedAt !== getLastCloudUpload(currentUser.uid)) {
          const ownershipError = new Error('Another device owns the cloud save.');
          ownershipError.code = 'blackjack/ownership-required';
          throw ownershipError;
        }

        const newRound = createBlackjackRound(wager, { id: createRoundId() });
        const result = await GameDB.startBlackjackRound(newRound);
        if (!result.started) {
          if (result.reason === 'insufficient-gold') throw new Error('Goldが足りません。');
          round = result.round;
          gold = Math.max(0, Number(await GameDB.getGameState('gold')) || 0);
          throw new Error('未完了のラウンドがあります。');
        }
        round = result.round;
        gold = result.gold;
        updateHeaderGold(gold);
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
      if (!updated.updated) throw new Error('カードを保存できませんでした。');
      round = updated.round;
      busy = false;
      renderTable('カードを1枚引きました');
      const value = getBlackjackHandValue(round.playerHand);
      if (value.busted) await finishRound('lose');
      else if (value.total === 21) await playDealer();
    } catch (error) {
      console.error('[Blackjack] Hit failed.', error);
      busy = false;
      renderTable(errorMessage(error), 'error');
    }
  };

  const doubleDown = async () => {
    if (!round || round.phase !== 'player' || round.playerHand.length !== 2 || busy || gold < round.wager) return;
    busy = true;
    try {
      const previousWager = round.wager;
      const nextRound = JSON.parse(JSON.stringify(round));
      nextRound.wager += previousWager;
      drawBlackjackCard(nextRound, 'playerHand');
      const updated = await GameDB.updateBlackjackRound(nextRound, previousWager);
      if (!updated.updated) throw new Error(updated.reason === 'insufficient-gold' ? 'ダブルに必要なGoldが足りません。' : 'ダブルを保存できませんでした。');
      round = updated.round;
      gold = updated.gold;
      updateHeaderGold(gold);
      busy = false;
      if (getBlackjackHandValue(round.playerHand).busted) await finishRound('lose');
      else await playDealer();
    } catch (error) {
      console.error('[Blackjack] Double down failed.', error);
      busy = false;
      renderTable(errorMessage(error), 'error');
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
      renderGate('unverified', 'メール確認済みのアカウントだけがGoldを賭けられます。確認メールのリンクを開いた後、設定で確認状態を更新してください。');
      return;
    }
    renderGate('loading', '所持Goldと未完了のラウンドを確認しています…');
    try {
      const [storedGold, storedRound] = await Promise.all([
        GameDB.getGameState('gold'),
        GameDB.getGameState(ROUND_STATE_KEY),
      ]);
      if (disposed || renderId !== authRenderId) return;
      gold = Math.max(0, Math.floor(Number(storedGold) || 0));
      round = storedRound || null;
      updateHeaderGold(gold);
      if (!round || (round.phase === 'completed' && round.resultSynced)) renderLobby();
      else if (round.phase === 'pending_sync') {
        renderTable('開始前のクラウドセーブを完了してください', 'error');
      } else if (round.phase === 'player') renderTable('未完了のラウンドを再開しました');
      else if (round.phase === 'completed') renderTable('結果のクラウド保存を完了してください', 'error');
      else throw new Error('保存されているラウンド形式を読み込めません。');
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
    const chip = event.target.closest('[data-chip]');
    if (chip) {
      const input = container.querySelector('[data-wager]');
      if (!input) return;
      input.value = chip.dataset.chip === 'max'
        ? String(Math.floor(gold / BLACKJACK_BET_STEP) * BLACKJACK_BET_STEP)
        : chip.dataset.chip;
      return;
    }
    if (event.target.closest('[data-deal]')) {
      const value = Number(container.querySelector('[data-wager]')?.value);
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
    if (event.target.closest('[data-sync-result]')) {
      await syncCompletedResult();
      return;
    }
    if (event.target.closest('[data-new-round]')) {
      round = null;
      gold = Math.max(0, Math.floor(Number(await GameDB.getGameState('gold')) || 0));
      renderLobby();
    }
  });

  container.cleanup = () => {
    disposed = true;
    authRenderId += 1;
    unsubscribe?.();
  };

  renderGate('loading');
  if (!CloudSaveService.isConfigured) {
    renderGate('error', 'クラウドセーブが設定されていないため、ブラックジャックを開始できません。');
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
