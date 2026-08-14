import {
  createMinesweeperProgressSnapshot,
  createSudokuProgressSnapshot,
  restoreMinesweeperProgress,
  restoreSudokuProgress,
} from '../js/data/town-game-progress.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const sudokuConfig = {
  id: 'easy', size: 4, boxRows: 2, boxColumns: 2, hints: 3,
};
const sudokuGame = {
  config: sudokuConfig,
  puzzle: [1, 0, 0, 4, 0, 4, 1, 0, 0, 1, 4, 0, 4, 0, 0, 1],
  solution: [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1],
  values: [1, 0, 0, 4, 0, 4, 1, 0, 0, 1, 4, 0, 4, 0, 0, 1],
  notes: Array.from({ length: 16 }, (_, index) => index === 1 ? new Set([2, 3]) : new Set()),
  inputMode: 'note',
  selectedIndex: 1,
  hintsRemaining: 5,
  startedAt: 1000,
  completed: false,
  questPlayRecorded: true,
  showErrors: false,
};
const sudokuSnapshot = createSudokuProgressSnapshot(sudokuGame, 61000);
const restoredSudoku = restoreSudokuProgress(sudokuSnapshot, { easy: sudokuConfig }, 120000);
assert(restoredSudoku, 'valid Sudoku progress was rejected');
assert(restoredSudoku.startedAt === 60000, 'Sudoku elapsed time was not restored as paused time');
assert(restoredSudoku.notes[1].has(2) && restoredSudoku.notes[1].has(3), 'Sudoku notes were not restored');
assert(restoredSudoku.hintsRemaining === 5, 'bonus Sudoku hints were not restored');
assert(restoredSudoku.inputMode === 'note' && restoredSudoku.selectedIndex === 1, 'Sudoku input state was not restored');
assert(!restoreSudokuProgress({ ...sudokuSnapshot, values: [0] }, { easy: sudokuConfig }), 'invalid Sudoku progress was accepted');
assert(createSudokuProgressSnapshot({ ...sudokuGame, completed: true }) === null, 'completed Sudoku was saved');

const minesweeperConfig = { id: 'easy', rows: 3, columns: 3, mines: 1, hints: 3 };
const minesweeperGame = {
  config: minesweeperConfig,
  board: [0, 0, 0, 0, 1, 1, 0, 1, -1],
  revealed: new Set([0, 1, 2, 3, 4, 6]),
  flags: new Set([8]),
  mode: 'flag',
  generationAttempts: 7,
  hintsRemaining: 2,
  canaryGuardPercent: 20,
  canaryGuardUsed: true,
  startedAt: 10000,
  over: false,
  questPlayRecorded: true,
};
const minesweeperSnapshot = createMinesweeperProgressSnapshot(minesweeperGame, 40000);
const restoredMinesweeper = restoreMinesweeperProgress(
  minesweeperSnapshot,
  { easy: minesweeperConfig },
  100000,
);
assert(restoredMinesweeper, 'valid Minesweeper progress was rejected');
assert(restoredMinesweeper.startedAt === 70000, 'Minesweeper elapsed time was not restored as paused time');
assert(restoredMinesweeper.revealed.has(4) && restoredMinesweeper.flags.has(8), 'Minesweeper cells were not restored');
assert(restoredMinesweeper.mode === 'flag' && restoredMinesweeper.hintsRemaining === 2, 'Minesweeper controls were not restored');
assert(restoredMinesweeper.canaryGuardPercent === 20 && restoredMinesweeper.canaryGuardUsed, 'canary state was not restored');
assert(!restoreMinesweeperProgress({ ...minesweeperSnapshot, flags: [0] }, { easy: minesweeperConfig }), 'overlapping Minesweeper cells were accepted');
assert(createMinesweeperProgressSnapshot({ ...minesweeperGame, over: true }) === null, 'finished Minesweeper was saved');

console.log('Town game progress tests passed.');
