/** ホームタウンから遊べるマインスイーパー。報酬は他の町ゲームと共有する。 */
import { GameDB } from '../data/database.js';
import {
  createLogicalMinefield,
  getMinefieldNeighbors,
  isMinefieldCleared,
  revealMinefieldCells,
} from '../data/minesweeper-engine.js';
import {
  TOWN_GAME_REWARDS,
  getLocalDateKey,
  getTownGameRewardStateKey,
} from '../data/town-game-rewards.js';
import { formatNumber } from '../utils/format.js';
import { playSoundEffect } from '../utils/sound-effects.js';

const DIFFICULTIES = {
  easy: {
    id: 'easy', label: 'EASY', rows: 8, columns: 8, mines: 10,
    hints: 3, reward: TOWN_GAME_REWARDS.easy, icon: 'filter_8', tone: 'emerald',
  },
  normal: {
    id: 'normal', label: 'NORMAL', rows: 10, columns: 10, mines: 18,
    hints: 2, reward: TOWN_GAME_REWARDS.normal, icon: 'apps', tone: 'sky',
  },
  hard: {
    id: 'hard', label: 'HARD', rows: 12, columns: 12, mines: 28,
    hints: 1, reward: TOWN_GAME_REWARDS.hard, icon: 'grid_view', tone: 'amber',
  },
  very_hard: {
    id: 'very_hard', label: 'VERY HARD', rows: 14, columns: 14, mines: 40,
    hints: 0, reward: TOWN_GAME_REWARDS.very_hard, icon: 'skull', tone: 'rose',
  },
};

const TONE_CLASSES = {
  emerald: 'border-emerald-400/35 from-emerald-500/20 to-emerald-950/35 text-emerald-200',
  sky: 'border-sky-400/35 from-sky-500/20 to-sky-950/35 text-sky-200',
  amber: 'border-amber-400/35 from-amber-500/20 to-amber-950/35 text-amber-200',
  rose: 'border-rose-400/45 from-rose-500/25 to-red-950/40 text-rose-100',
};

const pageStyles = () => `
  <style>
    .mine-board { display:grid; gap:1px; padding:2px; border:1px solid rgba(148,163,184,.55); border-radius:.8rem; background:#020617; box-shadow:0 16px 38px rgba(0,0,0,.4); overflow:hidden; }
    .mine-cell { display:flex; min-width:0; align-items:center; justify-content:center; border:1px solid rgba(148,163,184,.35); border-radius:2px; background:linear-gradient(145deg,#334155,#172033); color:white; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:clamp(.58rem,3.5vw,1.05rem); font-weight:900; line-height:1; box-shadow:inset 1px 1px rgba(255,255,255,.13),inset -1px -1px rgba(0,0,0,.35); }
    .mine-cell.is-revealed { border-color:rgba(71,85,105,.42); background:#0f172a; box-shadow:none; }
    .mine-cell.is-mine { background:#7f1d1d; color:#fecdd3; }
    .mine-cell.is-flagged { background:linear-gradient(145deg,#78350f,#451a03); color:#fde68a; }
    .mine-cell.is-wrong-flag { background:#881337; color:#fda4af; }
    .mine-cell.number-1 { color:#7dd3fc; } .mine-cell.number-2 { color:#86efac; }
    .mine-cell.number-3 { color:#fca5a5; } .mine-cell.number-4 { color:#c4b5fd; }
    .mine-cell.number-5 { color:#fdba74; } .mine-cell.number-6 { color:#67e8f9; }
    .mine-cell.number-7 { color:#f9a8d4; } .mine-cell.number-8 { color:#e2e8f0; }
    .mine-result { animation:mine-result-in .25s ease-out both; }
    @keyframes mine-result-in { from { opacity:0; transform:translateY(10px) scale(.96); } to { opacity:1; transform:none; } }
    @media (prefers-reduced-motion:reduce) { .mine-result { animation:none; } }
  </style>`;

const formatTime = totalSeconds => {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

function difficultyCard(config, claimed) {
  return `
    <button data-difficulty="${config.id}" class="flex min-h-[88px] items-center gap-3 rounded-2xl border bg-gradient-to-br p-3 text-left shadow-lg active:scale-[.98] ${TONE_CLASSES[config.tone]}">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/25"><span class="material-symbols-outlined text-2xl">${claimed ? 'check_circle' : config.icon}</span></span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-black tracking-[.16em] text-white">${config.label}</span>
        <span class="mt-0.5 block text-[10px] text-slate-300">${config.rows}×${config.columns} ・ 地雷${config.mines}個</span>
        <span class="mt-1 flex items-center gap-1 text-[9px] font-black ${claimed ? 'text-emerald-300' : 'text-fuchsia-200'}"><span class="material-symbols-outlined text-[13px]">${claimed ? 'task_alt' : 'diamond'}</span>${claimed ? '本日の共通報酬は受取済み ・ プレイ可能' : `クリア報酬 ${config.reward} Prism`}</span>
      </span>
      <span class="material-symbols-outlined text-white/45">chevron_right</span>
    </button>`;
}

export function renderMinesweeperPage() {
  const container = document.createElement('div');
  container.className = 'relative min-h-full overflow-hidden bg-[#090b13] text-white';
  container.dataset.minesweeperPage = 'true';

  let game = null;
  let disposed = false;
  let renderId = 0;
  let claimedDifficulties = new Set();
  let timerId = 0;
  let startingGame = false;
  const timers = new Set();

  const stopTimer = () => {
    if (timerId) window.clearInterval(timerId);
    timerId = 0;
  };

  const later = (fn, delay) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (!disposed) fn();
    }, delay);
    timers.add(id);
  };

  const clearTimers = () => {
    timers.forEach(id => window.clearTimeout(id));
    timers.clear();
  };

  const updateHeaderPrism = value => {
    const display = document.getElementById('header-prism-display');
    if (display) display.textContent = formatNumber(value);
    const holder = document.getElementById('header-prism');
    if (holder) holder.setAttribute('aria-label', `プリズム ${formatNumber(value)}`);
  };

  const renderLoadError = () => {
    container.innerHTML = `
      ${pageStyles()}
      <div class="mx-auto flex min-h-[360px] max-w-sm flex-col items-center justify-center p-5 text-center">
        <span class="material-symbols-outlined text-5xl text-amber-300">sync_problem</span>
        <h1 class="mt-2 text-base font-black">プレイ状況を確認できません</h1>
        <p class="mt-2 text-[10px] leading-relaxed text-slate-400">共通報酬の受取状況を確認できないため、ゲームを開始できませんでした。</p>
        <button data-reload class="mt-4 w-full rounded-xl border border-amber-300/40 bg-amber-500/15 py-2.5 text-xs font-black text-amber-100">もう一度読み込む</button>
        <button data-home class="mt-2 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-black text-slate-300">ホームタウンへ戻る</button>
      </div>`;
  };

  const renderSelect = async () => {
    stopTimer();
    clearTimers();
    game = null;
    const currentRenderId = ++renderId;
    container.innerHTML = `${pageStyles()}<div class="flex min-h-[320px] items-center justify-center text-xs font-black text-slate-500"><span class="animate-pulse">本日の報酬状況を確認中…</span></div>`;
    try {
      const dateKey = getLocalDateKey();
      const states = await Promise.all(Object.values(DIFFICULTIES).map(async config => ({
        id: config.id,
        claimed: (await GameDB.getGameState(getTownGameRewardStateKey(config.id))) === dateKey,
      })));
      claimedDifficulties = new Set(states.filter(state => state.claimed).map(state => state.id));
    } catch (error) {
      console.error('[Minesweeper] Failed to load shared rewards.', error);
      if (!disposed && currentRenderId === renderId) renderLoadError();
      return;
    }
    if (disposed || currentRenderId !== renderId) return;

    container.innerHTML = `
      ${pageStyles()}
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(245,158,11,.16),transparent_35%),radial-gradient(circle_at_88%_25%,rgba(244,63,94,.15),transparent_38%)]"></div>
      <div class="relative z-10 mx-auto max-w-lg p-2.5 pb-5">
        <header class="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/75 p-2.5 shadow-xl backdrop-blur-md">
          <button data-home class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300" aria-label="ホームタウンへ戻る"><span class="material-symbols-outlined">arrow_back</span></button>
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-300/30 bg-gradient-to-br from-amber-500/20 to-rose-600/25"><span class="material-symbols-outlined text-3xl text-amber-100">bomb</span></span>
          <span class="min-w-0"><span class="block text-[9px] font-black tracking-[.24em] text-amber-300">MINE HUNTER</span><h1 class="text-lg font-black leading-tight">マインスイーパー</h1><span class="text-[9px] text-slate-400">数字を手掛かりに地雷を避けよう</span></span>
        </header>

        <section class="mb-3 rounded-2xl border border-amber-300/20 bg-amber-950/15 px-3 py-2.5 text-[10px] leading-relaxed text-slate-300">
          <div class="mb-1 flex items-center gap-1 font-black text-amber-200"><span class="material-symbols-outlined text-base">lightbulb</span>遊び方</div>
          数字は周囲8マスにある地雷の数です。「旗」モードで地雷候補に印を付け、地雷以外の全マスを開けばクリア。初手周囲は安全で、すべての盤面が推測なしで論理的に解けます。
          <div class="mt-1.5 border-t border-amber-300/10 pt-1.5 text-fuchsia-100/85">報酬は神経衰弱・数独と共有で1日1回。受取後も何度でも遊べます。</div>
        </section>

        <div class="grid gap-2" aria-label="マインスイーパーの難易度を選択">${Object.values(DIFFICULTIES).map(config => difficultyCard(config, claimedDifficulties.has(config.id))).join('')}</div>
      </div>`;
  };

  const updateTimer = () => {
    if (!game || game.over || !game.startedAt) return;
    const display = container.querySelector('[data-timer]');
    if (display) display.textContent = formatTime((Date.now() - game.startedAt) / 1000);
  };

  const setStatus = (message, tone = 'amber') => {
    const status = container.querySelector('[data-status]');
    if (!status) return;
    const tones = {
      amber: 'border-amber-300/20 bg-amber-950/25 text-amber-100',
      rose: 'border-rose-300/30 bg-rose-950/35 text-rose-100',
      emerald: 'border-emerald-300/30 bg-emerald-950/30 text-emerald-100',
    };
    status.className = `mb-2 flex min-h-8 items-center justify-center rounded-xl border px-3 text-center text-[10px] font-black ${tones[tone] || tones.amber}`;
    status.textContent = message;
  };

  const updateMode = () => {
    if (!game) return;
    container.querySelectorAll('[data-mode]').forEach(button => {
      const selected = button.dataset.mode === game.mode;
      button.className = `flex items-center justify-center gap-1 rounded-xl border py-2 text-[10px] font-black ${selected ? 'border-amber-200/60 bg-amber-500/25 text-amber-50 shadow-[0_0_12px_rgba(245,158,11,.18)]' : 'border-white/10 bg-white/5 text-slate-400'}`;
      button.setAttribute('aria-pressed', String(selected));
    });
  };

  const cellContents = (value, flagged) => {
    if (flagged) return '<span class="material-symbols-outlined text-[1.15em]">flag</span>';
    if (value === -1) return '<span class="material-symbols-outlined text-[1.15em]">bomb</span>';
    return value || '';
  };

  const updateBoard = () => {
    if (!game) return;
    container.querySelectorAll('[data-mine-cell]').forEach(cell => {
      const index = Number(cell.dataset.mineCell);
      const value = game.board?.[index];
      const revealed = game.revealed.has(index);
      const flagged = game.flags.has(index);
      const explodedMine = game.outcome === 'lose' && value === -1;
      const clearedMine = game.outcome === 'win' && value === -1;
      const revealMine = explodedMine || clearedMine;
      const wrongFlag = game.outcome === 'lose' && flagged && value !== -1;
      cell.className = `mine-cell aspect-square h-full w-full ${revealed ? 'is-revealed' : ''} ${revealed && value > 0 ? `number-${value}` : ''} ${explodedMine ? 'is-mine' : ''} ${clearedMine || (flagged && !game.over) ? 'is-flagged' : ''} ${wrongFlag ? 'is-wrong-flag' : ''}`;
      cell.innerHTML = revealed || revealMine ? cellContents(value, false) : cellContents(0, flagged);
      const row = Math.floor(index / game.config.columns) + 1;
      const column = (index % game.config.columns) + 1;
      const state = revealMine ? '地雷' : revealed ? (value ? `周囲の地雷${value}` : '安全な空白') : flagged ? '旗あり' : '未開放';
      cell.setAttribute('aria-label', `行${row} 列${column} ${state}`);
    });
    const mineDisplay = container.querySelector('[data-mines-left]');
    if (mineDisplay) mineDisplay.textContent = String(game.config.mines - game.flags.size);
    const safeDisplay = container.querySelector('[data-safe-left]');
    if (safeDisplay) safeDisplay.textContent = String(game.config.rows * game.config.columns - game.config.mines - game.revealed.size);
  };

  const ensureBoard = safeIndex => {
    if (game.board) return true;
    const generated = createLogicalMinefield(game.config, safeIndex);
    if (!generated) {
      console.warn('[Minesweeper] Could not generate a no-guess board.');
      setStatus('論理的に解ける盤面を生成できませんでした。もう一度マスを選んでください', 'rose');
      return false;
    }
    game.board = generated.board;
    game.generationAttempts = generated.attempts;
    game.startedAt = Date.now();
    stopTimer();
    timerId = window.setInterval(updateTimer, 1000);
    return true;
  };

  const claimReward = async () => {
    const result = await GameDB.claimDailyTownGameReward(getLocalDateKey(), game.config.id, game.config.reward);
    claimedDifficulties.add(game.config.id);
    updateHeaderPrism(result.prism);
    return result;
  };

  const showResult = (outcome, rewardStatus = 'none') => {
    if (!game || disposed) return;
    const isWin = outcome === 'win';
    const elapsed = game.startedAt ? Math.floor(((game.finishedAt || Date.now()) - game.startedAt) / 1000) : 0;
    const overlay = document.createElement('div');
    overlay.dataset.result = 'true';
    overlay.className = 'fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-md';
    overlay.innerHTML = `
      <section class="mine-result w-full max-w-sm rounded-3xl border ${isWin ? 'border-amber-300/45 bg-gradient-to-b from-amber-950 to-slate-950' : 'border-rose-400/40 bg-gradient-to-b from-rose-950 to-slate-950'} p-5 text-center shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="mine-result-title">
        <span class="material-symbols-outlined text-6xl ${isWin ? 'text-amber-200 drop-shadow-[0_0_20px_rgba(251,191,36,.55)]' : 'text-rose-300'}">${isWin ? 'workspace_premium' : 'explosion'}</span>
        <div class="mt-1 text-[10px] font-black tracking-[.25em] ${isWin ? 'text-amber-300' : 'text-rose-300'}">${isWin ? 'FIELD CLEAR' : 'BOOM'}</div>
        <h2 id="mine-result-title" class="mt-1 text-xl font-black">${isWin ? '地雷原を制覇！' : '地雷を踏みました'}</h2>
        <div class="mx-auto mt-3 flex max-w-[220px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/25 p-3"><span class="material-symbols-outlined text-slate-400">timer</span><span class="font-mono text-xl font-black">${formatTime(elapsed)}</span></div>
        ${isWin ? `<div class="mt-3 flex items-center justify-center gap-1 rounded-xl border border-fuchsia-300/30 bg-fuchsia-500/10 py-2 text-sm font-black text-fuchsia-100"><span class="material-symbols-outlined text-fuchsia-300">diamond</span>${rewardStatus === 'awarded' ? `${game.config.reward} Prism 獲得！` : rewardStatus === 'already' ? '本日の共通報酬は受取済み' : '報酬を保存できませんでした'}</div><p class="mt-2 text-[9px] text-slate-400">報酬受取後も、この難易度で何度でも遊べます。</p>` : '<p class="mt-3 text-[10px] text-slate-400">盤面は毎回変わります。何度でも再挑戦できます。</p>'}
        <div class="mt-4 grid gap-2">
          ${isWin && rewardStatus === 'failed' ? '<button data-claim-reward class="rounded-xl border border-fuchsia-300/50 bg-fuchsia-600 py-2.5 text-xs font-black">報酬の保存を再試行</button>' : ''}
          <button data-retry class="rounded-xl border border-amber-300/35 bg-amber-600 py-2.5 text-xs font-black text-white">同じ難易度でもう一度</button>
          <button data-select class="rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-black text-slate-300">難易度選択へ戻る</button>
        </div>
      </section>`;
    container.appendChild(overlay);
  };

  const finishWin = async () => {
    if (!game || game.over) return;
    game.over = true;
    game.outcome = 'win';
    game.finishedAt = Date.now();
    stopTimer();
    setStatus('すべての安全なマスを開きました！', 'emerald');
    updateBoard();
    let rewardStatus = 'failed';
    try {
      const result = await claimReward();
      game.rewardClaimed = true;
      rewardStatus = result.awarded ? 'awarded' : 'already';
      playSoundEffect('victory');
    } catch (error) {
      console.error('[Minesweeper] Failed to award Prism.', error);
    }
    showResult('win', rewardStatus);
  };

  const loseGame = () => {
    if (!game || game.over) return;
    game.over = true;
    game.outcome = 'lose';
    game.finishedAt = Date.now();
    stopTimer();
    setStatus('地雷が爆発しました', 'rose');
    updateBoard();
    playSoundEffect('defeat');
    later(() => showResult('lose'), 500);
  };

  const checkClear = () => {
    if (game?.board && isMinefieldCleared(game.board, game.revealed)) finishWin();
  };

  const openCell = index => {
    if (!game || game.over || game.flags.has(index)) return;
    if (!ensureBoard(index)) return;
    const value = game.board[index];
    if (game.revealed.has(index)) {
      if (value <= 0) return;
      const neighbors = getMinefieldNeighbors(index, game.config);
      const adjacentFlags = neighbors.filter(neighbor => game.flags.has(neighbor)).length;
      if (adjacentFlags !== value) {
        setStatus(`周囲に旗を${value}本置くと、残りをまとめて開けます`);
        return;
      }
      const targets = neighbors.filter(neighbor => !game.flags.has(neighbor) && !game.revealed.has(neighbor));
      if (targets.some(target => game.board[target] === -1)) {
        loseGame();
        return;
      }
      targets.forEach(target => { game.revealed = revealMinefieldCells(game.board, game.revealed, target, game.config, game.flags); });
    } else if (value === -1) {
      loseGame();
      return;
    } else {
      game.revealed = revealMinefieldCells(game.board, game.revealed, index, game.config, game.flags);
    }
    setStatus(value === 0 ? '安全地帯をまとめて開きました' : '安全なマスです', 'emerald');
    updateBoard();
    checkClear();
  };

  const toggleFlag = index => {
    if (!game || game.over || game.revealed.has(index)) return;
    if (game.flags.has(index)) {
      game.flags.delete(index);
      setStatus('旗を外しました');
    } else if (game.flags.size < game.config.mines) {
      game.flags.add(index);
      setStatus('地雷候補に旗を立てました');
    } else {
      setStatus('置ける旗をすべて使用しています', 'rose');
    }
    updateBoard();
  };

  const useHint = () => {
    if (!game || game.over || game.hintsRemaining <= 0) return;
    if (!game.board && !ensureBoard(Math.floor((game.config.rows * game.config.columns) / 2))) return;
    const safeCells = game.board.map((value, index) => ({ value, index })).filter(cell => cell.value !== -1 && !game.revealed.has(cell.index));
    const target = safeCells.find(cell => cell.value === 0) || safeCells[0];
    if (!target) return;
    game.flags.delete(target.index);
    game.revealed = revealMinefieldCells(game.board, game.revealed, target.index, game.config, game.flags);
    game.hintsRemaining -= 1;
    const hintButton = container.querySelector('[data-hint]');
    if (hintButton) {
      hintButton.innerHTML = `<span class="material-symbols-outlined text-base">radar</span>安全探知 ${game.hintsRemaining}`;
      hintButton.disabled = game.hintsRemaining <= 0;
    }
    setStatus('安全なマスを探知しました', 'emerald');
    updateBoard();
    checkClear();
  };

  const startGame = async difficultyId => {
    const config = DIFFICULTIES[difficultyId];
    if (!config || startingGame) return;
    startingGame = true;
    try {
      const latestClaim = await GameDB.getGameState(getTownGameRewardStateKey(difficultyId));
      if (latestClaim === getLocalDateKey()) claimedDifficulties.add(difficultyId);
    } catch (error) {
      console.error('[Minesweeper] Failed to verify shared reward.', error);
      renderLoadError();
      return;
    } finally {
      startingGame = false;
    }
    if (disposed) return;
    stopTimer();
    clearTimers();
    game = {
      config, board: null, revealed: new Set(), flags: new Set(), mode: 'open', generationAttempts: 0,
      hintsRemaining: config.hints, startedAt: 0, finishedAt: 0,
      over: false, outcome: null, rewardClaimed: false,
    };

    container.innerHTML = `
      ${pageStyles()}
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,.15),transparent_42%)]"></div>
      <div class="relative z-10 mx-auto max-w-xl p-2 pb-5">
        <header class="mb-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-2 shadow-lg backdrop-blur-md">
          <button data-select class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300" aria-label="難易度選択へ戻る"><span class="material-symbols-outlined">arrow_back</span></button>
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-500/15"><span class="material-symbols-outlined text-amber-200">bomb</span></span>
          <div class="min-w-0 flex-1"><div class="text-[9px] font-black tracking-[.2em] text-amber-300">${config.label}</div><div class="truncate text-xs font-black">${config.rows}×${config.columns} ・ 地雷${config.mines}</div></div>
          <div class="flex items-center gap-1.5 text-[9px]"><span class="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 px-1.5 py-1 font-mono"><span class="material-symbols-outlined text-[13px]">timer</span><span data-timer>00:00</span></span><span class="flex items-center gap-0.5 rounded-lg border border-fuchsia-300/25 bg-fuchsia-500/10 px-1.5 py-1 font-black text-fuchsia-200"><span class="material-symbols-outlined text-[13px]">diamond</span>${config.reward}</span></div>
        </header>

        <section class="mb-2 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-center text-[9px] text-slate-400"><span><span class="material-symbols-outlined mr-0.5 align-middle text-[13px] text-amber-300">flag</span>残り <b data-mines-left class="font-mono text-white">${config.mines}</b></span><span>安全マス <b data-safe-left class="font-mono text-white">${config.rows * config.columns - config.mines}</b></span><span class="font-black text-emerald-300">推測不要</span></section>
        <div data-status class="mb-2 flex min-h-8 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-950/25 px-3 text-center text-[10px] font-black text-amber-100" role="status" aria-live="polite">最初に開くマスを選んでください</div>

        <section class="mine-board mx-auto aspect-square w-full" style="grid-template-columns:repeat(${config.columns},minmax(0,1fr));max-width:${config.columns <= 8 ? '400px' : config.columns <= 10 ? '440px' : '500px'}" aria-label="${config.rows}かける${config.columns}の地雷原">
          ${Array.from({ length: config.rows * config.columns }, (_, index) => `<button data-mine-cell="${index}" class="mine-cell aspect-square h-full w-full" aria-label="未開放のマス"></button>`).join('')}
        </section>

        <div class="mx-auto mt-2 grid grid-cols-2 gap-2" style="max-width:${config.columns <= 8 ? '400px' : config.columns <= 10 ? '440px' : '500px'}">
          <button data-mode="open" class="flex items-center justify-center gap-1 rounded-xl border py-2 text-[10px] font-black"><span class="material-symbols-outlined text-base">ads_click</span>開く</button>
          <button data-mode="flag" class="flex items-center justify-center gap-1 rounded-xl border py-2 text-[10px] font-black"><span class="material-symbols-outlined text-base">flag</span>旗</button>
          <button data-hint ${config.hints ? '' : 'disabled'} class="col-span-2 flex items-center justify-center gap-1 rounded-xl border border-cyan-300/25 bg-cyan-500/10 py-2 text-[10px] font-black text-cyan-100 disabled:opacity-35"><span class="material-symbols-outlined text-base">radar</span>安全探知 ${config.hints}</button>
        </div>
      </div>`;
    updateMode();
    updateBoard();
  };

  container.addEventListener('click', async event => {
    if (event.target.closest('[data-home]')) {
      window.location.hash = '/status';
      return;
    }
    const difficulty = event.target.closest('[data-difficulty]');
    if (difficulty) {
      difficulty.disabled = true;
      await startGame(difficulty.dataset.difficulty);
      if (difficulty.isConnected && !game) difficulty.disabled = false;
      return;
    }
    if (event.target.closest('[data-reload]')) {
      renderSelect();
      return;
    }
    const cell = event.target.closest('[data-mine-cell]');
    if (cell && game) {
      const index = Number(cell.dataset.mineCell);
      if (game.mode === 'flag') toggleFlag(index);
      else openCell(index);
      return;
    }
    const modeButton = event.target.closest('[data-mode]');
    if (modeButton && game && !game.over) {
      game.mode = modeButton.dataset.mode;
      updateMode();
      setStatus(game.mode === 'flag' ? '旗を置くマスを選んでください' : '開くマスを選んでください');
      return;
    }
    if (event.target.closest('[data-hint]')) {
      useHint();
      return;
    }
    if (event.target.closest('[data-select]')) {
      container.querySelector('[data-result]')?.remove();
      renderSelect();
      return;
    }
    const retry = event.target.closest('[data-retry]');
    if (retry && game) {
      const difficultyId = game.config.id;
      retry.disabled = true;
      container.querySelector('[data-result]')?.remove();
      await startGame(difficultyId);
      return;
    }
    const claimButton = event.target.closest('[data-claim-reward]');
    if (claimButton && game && !game.rewardClaimed) {
      claimButton.disabled = true;
      claimButton.textContent = '保存中…';
      try {
        const result = await claimReward();
        game.rewardClaimed = true;
        container.querySelector('[data-result]')?.remove();
        showResult('win', result.awarded ? 'awarded' : 'already');
      } catch (error) {
        console.error('[Minesweeper] Failed to retry Prism award.', error);
        claimButton.disabled = false;
        claimButton.textContent = '報酬の保存を再試行';
      }
    }
  });

  container.addEventListener('contextmenu', event => {
    const cell = event.target.closest('[data-mine-cell]');
    if (!cell || !game) return;
    event.preventDefault();
    toggleFlag(Number(cell.dataset.mineCell));
  });

  container.cleanup = () => {
    disposed = true;
    stopTimer();
    clearTimers();
    container.querySelector('[data-result]')?.remove();
  };

  renderSelect();
  return container;
}
