/** Serializable, validated in-progress saves for the town puzzle games. */

const SAVE_VERSION = 1;

export const TOWN_GAME_PROGRESS_KEYS = Object.freeze({
  sudoku: 'townGameProgress:sudoku',
  minesweeper: 'townGameProgress:minesweeper',
});

const isPlainObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isIntegerInRange = (value, minimum, maximum) => (
  Number.isInteger(value) && value >= minimum && value <= maximum
);
const hasArrayLength = (value, length) => Array.isArray(value) && value.length === length;

const getElapsedMs = (game, now) => (
  game.startedAt ? Math.max(0, Math.floor(now - game.startedAt)) : 0
);

export function createSudokuProgressSnapshot(game, now = Date.now()) {
  if (!game || game.completed) return null;
  return {
    version: SAVE_VERSION,
    difficultyId: game.config.id,
    puzzle: [...game.puzzle],
    solution: [...game.solution],
    values: [...game.values],
    notes: game.notes.map(notes => [...notes].sort((left, right) => left - right)),
    inputMode: game.inputMode,
    selectedIndex: game.selectedIndex,
    hintsRemaining: game.hintsRemaining,
    elapsedMs: getElapsedMs(game, now),
    questPlayRecorded: Boolean(game.questPlayRecorded),
    showErrors: Boolean(game.showErrors),
    updatedAt: now,
  };
}

export function restoreSudokuProgress(snapshot, difficulties, now = Date.now()) {
  if (!isPlainObject(snapshot) || snapshot.version !== SAVE_VERSION) return null;
  const config = difficulties?.[snapshot.difficultyId];
  if (!config) return null;

  const cellCount = config.size * config.size;
  if (!hasArrayLength(snapshot.puzzle, cellCount)
      || !hasArrayLength(snapshot.solution, cellCount)
      || !hasArrayLength(snapshot.values, cellCount)
      || !hasArrayLength(snapshot.notes, cellCount)) return null;
  if (!snapshot.puzzle.every(value => isIntegerInRange(value, 0, config.size))
      || !snapshot.solution.every(value => isIntegerInRange(value, 1, config.size))
      || !snapshot.values.every(value => isIntegerInRange(value, 0, config.size))) return null;
  if (!snapshot.puzzle.every((value, index) => (
    !value || (value === snapshot.solution[index] && snapshot.values[index] === value)
  ))) return null;
  if (snapshot.values.every((value, index) => value === snapshot.solution[index])) return null;

  const notes = [];
  for (let index = 0; index < cellCount; index += 1) {
    const savedNotes = snapshot.notes[index];
    if (!Array.isArray(savedNotes)
        || savedNotes.some(value => !isIntegerInRange(value, 1, config.size))
        || new Set(savedNotes).size !== savedNotes.length
        || (snapshot.values[index] && savedNotes.length)) return null;
    notes.push(new Set(savedNotes));
  }

  if (!['number', 'note'].includes(snapshot.inputMode)
      || !isIntegerInRange(snapshot.selectedIndex, -1, cellCount - 1)
      || !isIntegerInRange(snapshot.hintsRemaining, 0, 99)
      || !Number.isFinite(snapshot.elapsedMs) || snapshot.elapsedMs < 0) return null;

  const elapsedMs = Math.floor(snapshot.elapsedMs);
  return {
    config,
    puzzle: [...snapshot.puzzle],
    solution: [...snapshot.solution],
    values: [...snapshot.values],
    notes,
    inputMode: snapshot.inputMode,
    selectedIndex: snapshot.selectedIndex,
    hintsRemaining: snapshot.hintsRemaining,
    startedAt: now - elapsedMs,
    completed: false,
    rewardClaimed: false,
    questPlayRecorded: Boolean(snapshot.questPlayRecorded),
    showErrors: Boolean(snapshot.showErrors),
  };
}

export function createMinesweeperProgressSnapshot(game, now = Date.now()) {
  if (!game || game.over) return null;
  return {
    version: SAVE_VERSION,
    difficultyId: game.config.id,
    board: game.board ? [...game.board] : null,
    revealed: [...game.revealed].sort((left, right) => left - right),
    flags: [...game.flags].sort((left, right) => left - right),
    mode: game.mode,
    generationAttempts: game.generationAttempts,
    hintsRemaining: game.hintsRemaining,
    canaryGuardPercent: game.canaryGuardPercent,
    canaryGuardUsed: Boolean(game.canaryGuardUsed),
    elapsedMs: getElapsedMs(game, now),
    questPlayRecorded: Boolean(game.questPlayRecorded),
    updatedAt: now,
  };
}

export function restoreMinesweeperProgress(snapshot, difficulties, now = Date.now()) {
  if (!isPlainObject(snapshot) || snapshot.version !== SAVE_VERSION) return null;
  const config = difficulties?.[snapshot.difficultyId];
  if (!config) return null;
  const cellCount = config.rows * config.columns;

  if (snapshot.board !== null && !hasArrayLength(snapshot.board, cellCount)) return null;
  if (snapshot.board && (
    !snapshot.board.every(value => isIntegerInRange(value, -1, 8))
    || snapshot.board.filter(value => value === -1).length !== config.mines
  )) return null;
  if (!Array.isArray(snapshot.revealed) || !Array.isArray(snapshot.flags)
      || snapshot.revealed.some(index => !isIntegerInRange(index, 0, cellCount - 1))
      || snapshot.flags.some(index => !isIntegerInRange(index, 0, cellCount - 1))
      || new Set(snapshot.revealed).size !== snapshot.revealed.length
      || new Set(snapshot.flags).size !== snapshot.flags.length
      || snapshot.flags.length > config.mines) return null;

  const revealed = new Set(snapshot.revealed);
  const flags = new Set(snapshot.flags);
  if ([...revealed].some(index => flags.has(index))) return null;
  if (!snapshot.board && revealed.size) return null;
  if (snapshot.board && [...revealed].some(index => snapshot.board[index] === -1)) return null;
  if (snapshot.board && snapshot.board.every((value, index) => value === -1 || revealed.has(index))) return null;
  if (!['open', 'flag'].includes(snapshot.mode)
      || !Number.isInteger(snapshot.generationAttempts) || snapshot.generationAttempts < 0
      || !isIntegerInRange(snapshot.hintsRemaining, 0, 99)
      || !Number.isFinite(snapshot.canaryGuardPercent)
      || snapshot.canaryGuardPercent < 0 || snapshot.canaryGuardPercent > 100
      || !Number.isFinite(snapshot.elapsedMs) || snapshot.elapsedMs < 0) return null;

  const elapsedMs = Math.floor(snapshot.elapsedMs);
  return {
    config,
    board: snapshot.board ? [...snapshot.board] : null,
    revealed,
    flags,
    mode: snapshot.mode,
    generationAttempts: snapshot.generationAttempts,
    hintsRemaining: snapshot.hintsRemaining,
    canaryGuardPercent: snapshot.canaryGuardPercent,
    canaryGuardUsed: Boolean(snapshot.canaryGuardUsed),
    startedAt: snapshot.board ? now - elapsedMs : 0,
    finishedAt: 0,
    over: false,
    outcome: null,
    rewardClaimed: false,
    questPlayRecorded: Boolean(snapshot.questPlayRecorded),
  };
}
