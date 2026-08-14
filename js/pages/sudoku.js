/** ホームタウンから遊べる数独。 */
import { GameDB } from '../data/database.js';
import {
  clearSudokuPeerNotes,
  createSudokuPuzzle,
  findSudokuConflicts,
  getSudokuBoxIndex,
  getSudokuCandidates,
  toggleSudokuNote,
} from '../data/sudoku-engine.js';
import {
  TOWN_GAME_REWARDS,
  getLocalDateKey,
  getTownGameRewardStateKey,
} from '../data/town-game-rewards.js';
import {
  TOWN_GAME_PROGRESS_KEYS,
  createSudokuProgressSnapshot,
  restoreSudokuProgress,
} from '../data/town-game-progress.js';
import { getTreasureEffect } from '../data/treasure-manager.js';
import { formatNumber } from '../utils/format.js';

const GAME_ID = 'sudoku';

const DIFFICULTIES = {
  easy: {
    id: 'easy', label: 'EASY', size: 9, boxRows: 3, boxColumns: 3,
    emptyCells: 35, hints: 3, reward: TOWN_GAME_REWARDS.easy,
    description: '9×9 ・ はじめてでも安心', icon: 'grid_3x3', tone: 'emerald',
  },
  normal: {
    id: 'normal', label: 'NORMAL', size: 9, boxRows: 3, boxColumns: 3,
    emptyCells: 40, hints: 2, reward: TOWN_GAME_REWARDS.normal,
    description: '9×9 ・ ほどよく考える', icon: 'grid_3x3', tone: 'sky',
  },
  hard: {
    id: 'hard', label: 'HARD', size: 9, boxRows: 3, boxColumns: 3,
    emptyCells: 45, hints: 1, reward: TOWN_GAME_REWARDS.hard,
    description: '9×9 ・ 本格ルール', icon: 'grid_on', tone: 'amber',
  },
  very_hard: {
    id: 'very_hard', label: 'VERY HARD', size: 9, boxRows: 3, boxColumns: 3,
    emptyCells: 52, hints: 0, reward: TOWN_GAME_REWARDS.very_hard,
    description: '9×9 ・ 最少ヒント', icon: 'neurology', tone: 'violet',
  },
};

const TONE_CLASSES = {
  emerald: 'border-emerald-400/35 from-emerald-500/20 to-emerald-950/35 text-emerald-200',
  sky: 'border-sky-400/35 from-sky-500/20 to-sky-950/35 text-sky-200',
  amber: 'border-amber-400/35 from-amber-500/20 to-amber-950/35 text-amber-200',
  violet: 'border-violet-400/45 from-violet-500/25 to-fuchsia-950/35 text-violet-100',
};

const pageStyles = () => `
  <style>
    .sudoku-board { display:grid; background:rgba(148,163,184,.7); border:2px solid rgba(226,232,240,.9); border-radius:.8rem; overflow:hidden; box-shadow:0 16px 38px rgba(0,0,0,.38); }
    .sudoku-cell { display:flex; align-items:center; justify-content:center; min-width:0; border-style:solid; border-color:rgba(148,163,184,.5); background:#111827; color:#67e8f9; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:clamp(1rem,6.4vw,1.75rem); font-weight:900; line-height:1; transition:background-color .1s,color .1s,box-shadow .1s,filter .1s; }
    .sudoku-cell.is-given { background:#1e293b; color:#f8fafc; }
    .sudoku-cell.is-related { background:#172033; }
    .sudoku-cell.is-same { background:#164e63; color:#cffafe; }
    .sudoku-cell.is-selected { position:relative; z-index:2; background:#075985; box-shadow:inset 0 0 0 3px #67e8f9; color:white; }
    .sudoku-cell.is-conflict, .sudoku-cell.is-wrong { background:#7f1d1d; color:#fecdd3; }
    .sudoku-notes { display:grid; width:100%; height:100%; grid-template-columns:repeat(3,minmax(0,1fr)); grid-template-rows:repeat(3,minmax(0,1fr)); padding:2px; color:#a5f3fc; font-size:clamp(.38rem,1.65vw,.68rem); font-weight:700; line-height:1; }
    .sudoku-notes > span { display:flex; min-width:0; align-items:center; justify-content:center; }
    .sudoku-cell.is-selected .sudoku-notes { color:#ecfeff; }
    .sudoku-cell:focus-visible { position:relative; z-index:3; }
    .sudoku-result { animation:sudoku-result-in .25s ease-out both; }
    @keyframes sudoku-result-in { from { opacity:0; transform:translateY(10px) scale(.96); } to { opacity:1; transform:none; } }
    @media (prefers-reduced-motion:reduce) { .sudoku-result { animation:none; } }
  </style>
`;

const formatTime = totalSeconds => {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

function difficultyCard(config, claimed, hasProgress = false) {
  return `
    <button data-difficulty="${config.id}"
            class="flex min-h-[88px] items-center gap-3 rounded-2xl border bg-gradient-to-br p-3 text-left shadow-lg active:scale-[.98] ${TONE_CLASSES[config.tone]}">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/25"><span class="material-symbols-outlined text-2xl">${hasProgress ? 'resume' : claimed ? 'check_circle' : config.icon}</span></span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-black tracking-[.16em] text-white">${config.label}</span>
        <span class="mt-0.5 block text-[10px] text-slate-300">${config.description}</span>
        <span class="mt-1 flex items-center gap-1 text-[9px] font-black ${hasProgress ? 'text-cyan-200' : claimed ? 'text-emerald-300' : 'text-fuchsia-200'}"><span class="material-symbols-outlined text-[13px]">${hasProgress ? 'history' : claimed ? 'task_alt' : 'diamond'}</span>${hasProgress ? '進行中の盤面から再開' : claimed ? '本日の報酬は受取済み ・ プレイ可能' : `クリア報酬 ${config.reward} Prism`}</span>
      </span>
      <span class="material-symbols-outlined text-white/45">chevron_right</span>
    </button>
  `;
}

export function renderSudokuPage() {
  const container = document.createElement('div');
  container.className = 'relative min-h-full overflow-hidden bg-[#070b16] text-white';
  container.dataset.sudokuPage = 'true';

  let game = null;
  let disposed = false;
  let renderId = 0;
  let claimedDifficulties = new Set();
  let timerId = 0;
  let startingGame = false;
  let savedProgress = null;
  let lastProgressSaveAt = 0;
  let progressWritePromise = Promise.resolve();

  const persistProgress = () => {
    if (!game || game.completed) return progressWritePromise;
    const now = Date.now();
    const snapshot = createSudokuProgressSnapshot(game, now);
    lastProgressSaveAt = now;
    progressWritePromise = GameDB.setGameState(TOWN_GAME_PROGRESS_KEYS.sudoku, snapshot).catch(error => {
      console.error('[Sudoku] Failed to save in-progress game.', error);
    });
    return progressWritePromise;
  };

  const clearProgress = () => {
    savedProgress = null;
    progressWritePromise = GameDB.setGameState(TOWN_GAME_PROGRESS_KEYS.sudoku, null).catch(error => {
      console.error('[Sudoku] Failed to clear in-progress game.', error);
    });
    return progressWritePromise;
  };

  const stopTimer = () => {
    if (timerId) window.clearInterval(timerId);
    timerId = 0;
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
        <p class="mt-2 text-[10px] leading-relaxed text-slate-400">本日の報酬状況を確認できないため、数独を開始できませんでした。</p>
        <button data-reload class="mt-4 w-full rounded-xl border border-amber-300/40 bg-amber-500/15 py-2.5 text-xs font-black text-amber-100">もう一度読み込む</button>
        <button data-home class="mt-2 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-black text-slate-300">ホームタウンへ戻る</button>
      </div>`;
  };

  const renderSelect = async (resumeSaved = false) => {
    stopTimer();
    game = null;
    const currentRenderId = ++renderId;
    container.innerHTML = `${pageStyles()}<div class="flex min-h-[320px] items-center justify-center text-xs font-black text-slate-500"><span class="animate-pulse">本日の報酬状況を確認中…</span></div>`;
    try {
      const dateKey = getLocalDateKey();
      const [states, snapshot] = await Promise.all([
        Promise.all(Object.values(DIFFICULTIES).map(async config => ({
          id: config.id,
          claimed: (await GameDB.getGameState(getTownGameRewardStateKey(GAME_ID, config.id))) === dateKey,
        }))),
        GameDB.getGameState(TOWN_GAME_PROGRESS_KEYS.sudoku),
      ]);
      claimedDifficulties = new Set(states.filter(state => state.claimed).map(state => state.id));
      savedProgress = restoreSudokuProgress(snapshot, DIFFICULTIES);
      if (snapshot && !savedProgress) void clearProgress();
    } catch (error) {
      console.error('[Sudoku] Failed to load daily rewards.', error);
      if (!disposed && currentRenderId === renderId) renderLoadError();
      return;
    }
    if (disposed || currentRenderId !== renderId) return;
    if (resumeSaved && savedProgress) {
      await startGame(savedProgress.config.id, savedProgress);
      return;
    }

    container.innerHTML = `
      ${pageStyles()}
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(6,182,212,.16),transparent_34%),radial-gradient(circle_at_88%_26%,rgba(139,92,246,.17),transparent_38%)]"></div>
      <div class="relative z-10 mx-auto max-w-lg p-2.5 pb-5">
        <header class="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/75 p-2.5 shadow-xl backdrop-blur-md">
          <button data-home class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300" aria-label="ホームタウンへ戻る"><span class="material-symbols-outlined">arrow_back</span></button>
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-gradient-to-br from-cyan-500/20 to-violet-600/25"><span class="material-symbols-outlined text-3xl text-cyan-100">grid_on</span></span>
          <span class="min-w-0"><span class="block text-[9px] font-black tracking-[.24em] text-cyan-300">NUMBER PUZZLE</span><h1 class="text-lg font-black leading-tight">数独</h1><span class="text-[9px] text-slate-400">記憶力を使わず、数字を整理して解こう</span></span>
        </header>

        <section class="mb-3 rounded-2xl border border-cyan-300/20 bg-cyan-950/15 px-3 py-2.5 text-[10px] leading-relaxed text-slate-300">
          <div class="mb-1 flex items-center gap-1 font-black text-cyan-200"><span class="material-symbols-outlined text-base">lightbulb</span>遊び方</div>
          縦・横・太線で囲まれたブロックに、同じ数字が重ならないよう全マスを埋めます。「仮数字」へ切り替えると、1マス内に最大9個の候補を記録できます。
          <div class="mt-1.5 border-t border-cyan-300/10 pt-1.5 text-fuchsia-100/85">難易度別報酬は数独専用です。各難易度で1日1回受け取れ、受取後も何度でも遊べます。</div>
        </section>

        <div class="grid gap-2" aria-label="数独の難易度を選択">${Object.values(DIFFICULTIES).map(config => difficultyCard(config, claimedDifficulties.has(config.id), savedProgress?.config.id === config.id)).join('')}</div>
      </div>`;
  };

  const cellBorderStyle = (index, config) => {
    const row = Math.floor(index / config.size);
    const column = index % config.size;
    return [
      `border-top-width:${row % config.boxRows === 0 ? 2 : 0.5}px`,
      `border-left-width:${column % config.boxColumns === 0 ? 2 : 0.5}px`,
      `border-right-width:${column === config.size - 1 ? 2 : 0.5}px`,
      `border-bottom-width:${row === config.size - 1 ? 2 : 0.5}px`,
    ].join(';');
  };

  const setStatus = (message, tone = 'cyan') => {
    const status = container.querySelector('[data-status]');
    if (!status) return;
    const tones = {
      cyan: 'border-cyan-300/20 bg-cyan-950/25 text-cyan-100',
      rose: 'border-rose-300/30 bg-rose-950/35 text-rose-100',
      emerald: 'border-emerald-300/30 bg-emerald-950/30 text-emerald-100',
    };
    status.className = `mb-2 flex min-h-8 items-center justify-center rounded-xl border px-3 text-center text-[10px] font-black ${tones[tone] || tones.cyan}`;
    status.textContent = message;
  };

  const updateInputMode = () => {
    if (!game) return;
    container.querySelectorAll('[data-input-mode]').forEach(button => {
      const selected = button.dataset.inputMode === game.inputMode;
      button.className = `flex items-center justify-center gap-1 rounded-xl border py-2 text-[10px] font-black ${selected ? 'border-cyan-200/60 bg-cyan-500/25 text-cyan-50 shadow-[0_0_12px_rgba(34,211,238,.18)]' : 'border-white/10 bg-white/5 text-slate-400'}`;
      button.setAttribute('aria-pressed', String(selected));
    });
  };

  const renderNotes = notes => `<span class="sudoku-notes" aria-hidden="true">${Array.from({ length: 9 }, (_, index) => `<span>${notes.has(index + 1) ? index + 1 : ''}</span>`).join('')}</span>`;

  const updateBoard = () => {
    if (!game || game.completed) return;
    const { config, values, puzzle, notes, selectedIndex } = game;
    const conflicts = findSudokuConflicts(values, config);
    const selectedValue = selectedIndex >= 0 ? values[selectedIndex] : 0;
    const selectedRow = selectedIndex >= 0 ? Math.floor(selectedIndex / config.size) : -1;
    const selectedColumn = selectedIndex >= 0 ? selectedIndex % config.size : -1;
    const selectedBox = selectedIndex >= 0 ? getSudokuBoxIndex(selectedRow, selectedColumn, config) : -1;

    container.querySelectorAll('[data-cell-index]').forEach(cell => {
      const index = Number(cell.dataset.cellIndex);
      const row = Math.floor(index / config.size);
      const column = index % config.size;
      const value = values[index];
      const related = selectedIndex >= 0 && (row === selectedRow || column === selectedColumn || getSudokuBoxIndex(row, column, config) === selectedBox);
      cell.innerHTML = value ? String(value) : renderNotes(notes[index]);
      cell.classList.toggle('is-related', related);
      cell.classList.toggle('is-same', Boolean(selectedValue && value === selectedValue));
      cell.classList.toggle('is-selected', index === selectedIndex);
      cell.classList.toggle('is-conflict', conflicts.has(index));
      cell.classList.toggle('is-wrong', Boolean(game.showErrors && value && value !== game.solution[index]));
      const noteLabel = notes[index].size ? ` 仮数字${[...notes[index]].sort((a, b) => a - b).join('、')}` : '';
      cell.setAttribute('aria-label', `行${row + 1} 列${column + 1}${value ? ` 数字${value}` : ` 空欄${noteLabel}`}${puzzle[index] ? ' 初期配置' : ''}`);
    });

    container.querySelectorAll('[data-number]').forEach(button => {
      const value = Number(button.dataset.number);
      const usedCount = values.filter(current => current === value).length;
      button.classList.toggle('opacity-35', usedCount >= config.size);
      button.setAttribute('aria-label', `数字${value} 残り${Math.max(0, config.size - usedCount)}マス`);
    });

    const candidates = selectedIndex >= 0 && !values[selectedIndex]
      ? getSudokuCandidates(values, selectedIndex, config)
      : [];
    const candidateDisplay = container.querySelector('[data-candidates]');
    if (candidateDisplay) candidateDisplay.textContent = candidates.length ? `${game.inputMode === 'note' ? '仮数字 ・ ' : ''}候補: ${candidates.join('・')}` : '空いているマスを選んでください';
    const filledDisplay = container.querySelector('[data-filled]');
    if (filledDisplay) filledDisplay.textContent = `${values.filter(Boolean).length} / ${values.length}`;
  };

  const updateTimer = () => {
    if (!game || game.completed) return;
    const elapsed = Math.floor((Date.now() - game.startedAt) / 1000);
    const display = container.querySelector('[data-timer]');
    if (display) display.textContent = formatTime(elapsed);
    if (Date.now() - lastProgressSaveAt >= 5000) void persistProgress();
  };

  const claimReward = async () => {
    const result = await GameDB.claimDailyTownGameReward(getLocalDateKey(), GAME_ID, game.config.id, game.config.reward);
    claimedDifficulties.add(game.config.id);
    updateHeaderPrism(result.prism);
    return result;
  };

  const showResult = (rewardStatus, elapsedSeconds) => {
    if (!game || disposed) return;
    const overlay = document.createElement('div');
    overlay.dataset.result = 'true';
    overlay.className = 'fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-md';
    overlay.innerHTML = `
      <section class="sudoku-result w-full max-w-sm rounded-3xl border border-cyan-300/45 bg-gradient-to-b from-cyan-950 to-slate-950 p-5 text-center shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="sudoku-result-title">
        <span class="material-symbols-outlined text-6xl text-cyan-200 drop-shadow-[0_0_20px_rgba(34,211,238,.6)]">workspace_premium</span>
        <div class="mt-1 text-[10px] font-black tracking-[.25em] text-cyan-300">PUZZLE CLEAR</div>
        <h2 id="sudoku-result-title" class="mt-1 text-xl font-black">数独クリア！</h2>
        <div class="mx-auto mt-3 flex max-w-[220px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/25 p-3"><span class="material-symbols-outlined text-slate-400">timer</span><span class="font-mono text-xl font-black">${formatTime(elapsedSeconds)}</span></div>
        <div class="mt-3 flex items-center justify-center gap-1 rounded-xl border border-fuchsia-300/30 bg-fuchsia-500/10 py-2 text-sm font-black text-fuchsia-100"><span class="material-symbols-outlined text-fuchsia-300">diamond</span>${rewardStatus === 'awarded' ? `${game.config.reward} Prism 獲得！` : rewardStatus === 'already' ? '本日の報酬は受取済み' : '報酬を保存できませんでした'}</div>
        <p class="mt-2 text-[9px] leading-relaxed text-slate-400">数独の${game.config.label}報酬です。次の報酬は翌日ですが、数独は何度でも遊べます。</p>
        <div class="mt-4 grid gap-2">
          ${rewardStatus === 'failed' ? '<button data-claim-reward class="rounded-xl border border-fuchsia-300/50 bg-fuchsia-600 py-2.5 text-xs font-black">報酬の保存を再試行</button>' : ''}
          <button data-select class="rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-black text-slate-300">難易度選択へ戻る</button>
        </div>
      </section>`;
    container.appendChild(overlay);
  };

  const finishGame = async () => {
    if (!game || game.completed) return;
    game.completed = true;
    stopTimer();
    const elapsedSeconds = Math.floor((Date.now() - game.startedAt) / 1000);
    await clearProgress();
    let rewardStatus = 'failed';
    try {
      const result = await claimReward();
      game.rewardClaimed = true;
      rewardStatus = result.awarded ? 'awarded' : 'already';
    } catch (error) {
      console.error('[Sudoku] Failed to award Prism.', error);
    }
    showResult(rewardStatus, elapsedSeconds);
  };

  const checkCompletion = () => {
    if (!game || game.values.some(value => !value)) return;
    if (game.values.every((value, index) => value === game.solution[index])) {
      setStatus('完成です！ 報酬を保存しています…', 'emerald');
      finishGame();
    } else {
      game.showErrors = true;
      setStatus('赤いマスを見直してください', 'rose');
      updateBoard();
      void persistProgress();
    }
  };

  const recordMiniGamePlay = () => {
    if (!game || game.questPlayRecorded) return;
    game.questPlayRecorded = true;
    window.dispatchEvent(new CustomEvent('quest:mini-game-play'));
  };

  const enterNumber = value => {
    if (!game || game.completed || game.selectedIndex < 0 || game.puzzle[game.selectedIndex]) return;
    const index = game.selectedIndex;
    if (game.inputMode === 'note' && value) {
      if (game.values[index]) {
        setStatus('確定数字を消してから仮数字を入力してください', 'rose');
        return;
      }
      recordMiniGamePlay();
      game.notes[index] = toggleSudokuNote(game.notes[index], value);
      updateBoard();
      setStatus(game.notes[index].has(value) ? `仮数字 ${value} を追加しました` : `仮数字 ${value} を外しました`);
      void persistProgress();
      return;
    }
    const hadValue = Boolean(game.values[index]);
    const hadNotes = game.notes[index].size > 0;
    if (value || hadValue || hadNotes) recordMiniGamePlay();
    game.values[index] = value;
    game.notes[index] = new Set();
    if (value) game.notes = clearSudokuPeerNotes(game.notes, index, value, game.config);
    game.showErrors = false;
    updateBoard();
    if (findSudokuConflicts(game.values, game.config).size) setStatus('同じ列・行・ブロックに重複があります', 'rose');
    else setStatus(value ? '数字を入力しました' : hadValue ? '数字を消しました' : hadNotes ? '仮数字をすべて消しました' : '選択マスを消去しました');
    void persistProgress();
    checkCompletion();
  };

  const useHint = () => {
    if (!game || game.completed || game.hintsRemaining <= 0) return;
    let target = game.selectedIndex;
    if (target < 0 || game.puzzle[target] || game.values[target]) target = game.values.findIndex(value => !value);
    if (target < 0) return;
    recordMiniGamePlay();
    game.values[target] = game.solution[target];
    game.notes[target] = new Set();
    game.notes = clearSudokuPeerNotes(game.notes, target, game.solution[target], game.config);
    game.selectedIndex = target;
    game.hintsRemaining -= 1;
    const hintButton = container.querySelector('[data-hint]');
    if (hintButton) {
      hintButton.innerHTML = `<span class="material-symbols-outlined text-base">auto_awesome</span>ヒント ${game.hintsRemaining}`;
      hintButton.disabled = game.hintsRemaining <= 0;
    }
    setStatus('ヒントで正しい数字を1つ埋めました', 'emerald');
    updateBoard();
    void persistProgress();
    checkCompletion();
  };

  const startGame = async (difficultyId, restoredGame = null) => {
    const config = DIFFICULTIES[difficultyId];
    if (!config || startingGame) return;
    startingGame = true;
    try {
      const latestClaim = await GameDB.getGameState(getTownGameRewardStateKey(GAME_ID, difficultyId));
      if (latestClaim === getLocalDateKey()) {
        claimedDifficulties.add(difficultyId);
      }
    } catch (error) {
      console.error('[Sudoku] Failed to verify daily reward.', error);
      renderLoadError();
      return;
    } finally {
      startingGame = false;
    }
    if (disposed) return;

    const treasureHintBonus = getTreasureEffect('sudokuHintBonus');
    const isResuming = restoredGame?.config.id === difficultyId;
    if (isResuming) {
      game = restoredGame;
    } else {
      const generated = createSudokuPuzzle(config, config.emptyCells);
      game = {
        config,
        puzzle: generated.puzzle,
        solution: generated.solution,
        values: [...generated.puzzle],
        notes: Array.from({ length: generated.puzzle.length }, () => new Set()),
        inputMode: 'number',
        selectedIndex: generated.puzzle.findIndex(value => !value),
        hintsRemaining: config.hints + treasureHintBonus,
        startedAt: Date.now(),
        completed: false,
        rewardClaimed: false,
        questPlayRecorded: false,
        showErrors: false,
      };
    }
    savedProgress = game;

    container.innerHTML = `
      ${pageStyles()}
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,.16),transparent_42%)]"></div>
      <div class="relative z-10 mx-auto max-w-xl p-2 pb-5">
        <header class="mb-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-2 shadow-lg backdrop-blur-md">
          <button data-select class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300" aria-label="難易度選択へ戻る"><span class="material-symbols-outlined">arrow_back</span></button>
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-500/15"><span class="material-symbols-outlined text-cyan-200">grid_on</span></span>
          <div class="min-w-0 flex-1"><div class="text-[9px] font-black tracking-[.2em] text-cyan-300">${config.label}</div><div class="truncate text-xs font-black">${config.size}×${config.size} 数独</div></div>
          <div class="flex items-center gap-2 text-[9px]"><span class="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono"><span class="material-symbols-outlined text-[13px]">timer</span><span data-timer>${formatTime((Date.now() - game.startedAt) / 1000)}</span></span><span class="flex items-center gap-0.5 rounded-lg border border-fuchsia-300/25 bg-fuchsia-500/10 px-2 py-1 font-black text-fuchsia-200"><span class="material-symbols-outlined text-[13px]">diamond</span>${config.reward}</span></div>
        </header>

        <section class="mb-2 grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-[9px] text-slate-400"><span data-candidates>空いているマスを選んでください</span><span class="font-mono"><span data-filled>${game.values.filter(Boolean).length} / ${game.values.length}</span> マス</span></section>
        ${treasureHintBonus ? `<div class="mb-2 flex items-center justify-center gap-1 rounded-xl border border-cyan-300/20 bg-cyan-950/25 px-3 py-1.5 text-[9px] font-black text-cyan-100"><span class="material-symbols-outlined text-sm">ink_pen</span>数聖の羽根筆：開始ヒント +${treasureHintBonus}</div>` : ''}
        <div data-status class="mb-2 flex min-h-8 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-950/25 px-3 text-center text-[10px] font-black text-cyan-100" role="status" aria-live="polite">空いているマスを選び、数字を入力してください</div>

        <section class="sudoku-board mx-auto aspect-square w-full" style="grid-template-columns:repeat(${config.size},minmax(0,1fr));max-width:${config.size <= 4 ? '340px' : config.size <= 6 ? '400px' : '460px'}" aria-label="${config.size}かける${config.size}の数独盤面">
          ${game.values.map((value, index) => `<button data-cell-index="${index}" class="sudoku-cell aspect-square h-full w-full ${game.puzzle[index] ? 'is-given' : ''}" style="${cellBorderStyle(index, config)}" aria-label="数独のマス">${value || ''}</button>`).join('')}
        </section>

        <section class="mx-auto mt-2 grid gap-1.5" style="grid-template-columns:repeat(${config.size},minmax(0,1fr));max-width:${config.size <= 4 ? '340px' : config.size <= 6 ? '400px' : '460px'}" aria-label="数字入力">
          ${Array.from({ length: config.size }, (_, index) => `<button data-number="${index + 1}" class="aspect-square rounded-xl border border-cyan-300/20 bg-cyan-500/10 font-mono text-lg font-black text-cyan-100 active:scale-95">${index + 1}</button>`).join('')}
        </section>
        <div class="mx-auto mt-2 grid grid-cols-2 gap-2" style="max-width:${config.size <= 4 ? '340px' : config.size <= 6 ? '400px' : '460px'}" aria-label="入力方法">
          <button data-input-mode="number" class="flex items-center justify-center gap-1 rounded-xl border py-2 text-[10px] font-black"><span class="material-symbols-outlined text-base">pin</span>確定数字</button>
          <button data-input-mode="note" class="flex items-center justify-center gap-1 rounded-xl border py-2 text-[10px] font-black"><span class="material-symbols-outlined text-base">edit_note</span>仮数字</button>
        </div>
        <div class="mx-auto mt-2 grid grid-cols-2 gap-2" style="max-width:${config.size <= 4 ? '340px' : config.size <= 6 ? '400px' : '460px'}">
          <button data-erase class="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2 text-[10px] font-black text-slate-300"><span class="material-symbols-outlined text-base">backspace</span>消す</button>
          <button data-hint ${game.hintsRemaining ? '' : 'disabled'} class="flex items-center justify-center gap-1 rounded-xl border border-amber-300/25 bg-amber-500/10 py-2 text-[10px] font-black text-amber-100 disabled:opacity-35"><span class="material-symbols-outlined text-base">auto_awesome</span>ヒント ${game.hintsRemaining}</button>
        </div>
      </div>`;
    updateBoard();
    updateInputMode();
    if (isResuming) setStatus('保存した盤面から再開しました', 'emerald');
    stopTimer();
    void persistProgress();
    timerId = window.setInterval(updateTimer, 1000);
  };

  container.addEventListener('click', async event => {
    if (event.target.closest('[data-home]')) {
      await persistProgress();
      window.location.hash = '/status';
      return;
    }
    const difficulty = event.target.closest('[data-difficulty]');
    if (difficulty) {
      difficulty.disabled = true;
      const progress = savedProgress?.config.id === difficulty.dataset.difficulty ? savedProgress : null;
      await startGame(difficulty.dataset.difficulty, progress);
      if (difficulty.isConnected && !game) difficulty.disabled = false;
      return;
    }
    if (event.target.closest('[data-reload]')) {
      renderSelect();
      return;
    }
    const cell = event.target.closest('[data-cell-index]');
    if (cell && game && !game.completed) {
      game.selectedIndex = Number(cell.dataset.cellIndex);
      updateBoard();
      void persistProgress();
      return;
    }
    const numberButton = event.target.closest('[data-number]');
    if (numberButton) {
      enterNumber(Number(numberButton.dataset.number));
      return;
    }
    const inputModeButton = event.target.closest('[data-input-mode]');
    if (inputModeButton && game && !game.completed) {
      game.inputMode = inputModeButton.dataset.inputMode;
      updateInputMode();
      updateBoard();
      setStatus(game.inputMode === 'note' ? '仮数字モード：候補を複数記録できます' : '確定数字モードに切り替えました');
      void persistProgress();
      return;
    }
    if (event.target.closest('[data-erase]')) {
      enterNumber(0);
      return;
    }
    if (event.target.closest('[data-hint]')) {
      useHint();
      return;
    }
    if (event.target.closest('[data-select]')) {
      container.querySelector('[data-result]')?.remove();
      await persistProgress();
      renderSelect(false);
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
        showResult(result.awarded ? 'awarded' : 'already', Math.floor((Date.now() - game.startedAt) / 1000));
      } catch (error) {
        console.error('[Sudoku] Failed to retry Prism award.', error);
        claimButton.disabled = false;
        claimButton.textContent = '報酬の保存を再試行';
      }
    }
  });

  const handleVisibilityChange = () => {
    if (document.hidden) void persistProgress();
  };
  const handlePageHide = () => { void persistProgress(); };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);

  container.cleanup = () => {
    const savePromise = persistProgress();
    disposed = true;
    stopTimer();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
    container.querySelector('[data-result]')?.remove();
    return savePromise;
  };

  renderSelect(true);
  return container;
}
