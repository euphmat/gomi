import {
  countSudokuSolutions,
  clearSudokuPeerNotes,
  createSudokuPuzzle,
  createSudokuSolution,
  findSudokuConflicts,
  getSudokuCandidates,
  toggleSudokuNote,
} from '../js/data/sudoku-engine.js';
import {
  TOWN_GAME_IDS,
  TOWN_GAME_REWARDS,
  getLocalDateKey,
  getTownGameRewardStateKey,
} from '../js/data/town-game-rewards.js';
import { readFileSync } from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const configs = [
  { size: 9, boxRows: 3, boxColumns: 3, emptyCells: 35 },
  { size: 9, boxRows: 3, boxColumns: 3, emptyCells: 40 },
  { size: 9, boxRows: 3, boxColumns: 3, emptyCells: 45 },
  { size: 9, boxRows: 3, boxColumns: 3, emptyCells: 52 },
];

assert(configs.every(config => config.size === 9 && config.boxRows === 3 && config.boxColumns === 3), 'all difficulties must use a 9x9 board');

configs.forEach(config => {
  const solution = createSudokuSolution(config);
  assert(solution.length === config.size ** 2, `${config.size}x${config.size} solution has the wrong size`);
  assert(findSudokuConflicts(solution, config).size === 0, `${config.size}x${config.size} solution contains conflicts`);
  assert(solution.every(value => value >= 1 && value <= config.size), `${config.size}x${config.size} solution contains an invalid number`);

  const generated = createSudokuPuzzle(config, config.emptyCells);
  assert(generated.puzzle.filter(value => !value).length === generated.emptyCells, 'reported empty-cell count is incorrect');
  assert(generated.emptyCells > 0 && generated.emptyCells <= config.emptyCells, 'puzzle did not remove a valid number of cells');
  assert(countSudokuSolutions(generated.puzzle, config, 2) === 1, `${config.size}x${config.size} puzzle does not have one solution`);

  const emptyIndex = generated.puzzle.findIndex(value => !value);
  assert(getSudokuCandidates(generated.puzzle, emptyIndex, config).includes(generated.solution[emptyIndex]), 'candidate list excluded the solution');
});

const conflictRules = { size: 4, boxRows: 2, boxColumns: 2 };
const conflicting = [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const conflicts = findSudokuConflicts(conflicting, conflictRules);
assert(conflicts.has(0) && conflicts.has(1), 'duplicate row values were not marked as conflicts');

assert(
  TOWN_GAME_REWARDS.easy === 1
    && TOWN_GAME_REWARDS.normal === 2
    && TOWN_GAME_REWARDS.hard === 3
    && TOWN_GAME_REWARDS.very_hard === 5,
  'town game reward amounts changed unexpectedly',
);
assert(TOWN_GAME_IDS.length === 4, 'the town game reward list is incomplete');
assert(getTownGameRewardStateKey('memory-game', 'normal') === 'memoryGameLastWin:normal', 'memory game reward key is not save-compatible');
assert(getTownGameRewardStateKey('sudoku', 'normal') === 'townGameLastWin:sudoku:normal', 'sudoku reward key is not independent');
const rewardKeys = TOWN_GAME_IDS.flatMap(gameId => (
  Object.keys(TOWN_GAME_REWARDS).map(difficultyId => getTownGameRewardStateKey(gameId, difficultyId))
));
assert(new Set(rewardKeys).size === 16, 'town game reward keys overlap');
assert(getLocalDateKey(new Date(2026, 7, 11, 23, 59)) === '2026-08-11', 'reward date key is not based on the local date');

let notes = toggleSudokuNote(new Set(), 5);
assert(notes.has(5), 'a provisional number could not be added');
notes = toggleSudokuNote(notes, 5);
assert(!notes.has(5), 'a provisional number could not be removed');
const noteRules = { size: 9, boxRows: 3, boxColumns: 3 };
const noteGrid = Array.from({ length: 81 }, () => new Set([5]));
const clearedNotes = clearSudokuPeerNotes(noteGrid, 0, 5, noteRules);
assert(!clearedNotes[1].has(5) && !clearedNotes[9].has(5) && !clearedNotes[10].has(5), 'peer provisional numbers were not cleared');
assert(clearedNotes[40].has(5), 'an unrelated provisional number was cleared');

const sudokuPageSource = readFileSync(new URL('../js/pages/sudoku.js', import.meta.url), 'utf8');
assert(sudokuPageSource.includes("getTreasureEffect('sudokuHintBonus')"), 'the Number Sage quill is not applied');
assert(sudokuPageSource.includes('hintsRemaining: config.hints + treasureHintBonus'), 'treasure hints are not added at game start');

console.log('Sudoku engine tests passed.');
