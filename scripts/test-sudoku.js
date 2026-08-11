import {
  countSudokuSolutions,
  createSudokuPuzzle,
  createSudokuSolution,
  findSudokuConflicts,
  getSudokuCandidates,
} from '../js/data/sudoku-engine.js';
import {
  TOWN_GAME_REWARDS,
  getLocalDateKey,
  getTownGameRewardStateKey,
} from '../js/data/town-game-rewards.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const configs = [
  { size: 4, boxRows: 2, boxColumns: 2, emptyCells: 8 },
  { size: 6, boxRows: 2, boxColumns: 3, emptyCells: 20 },
  { size: 9, boxRows: 3, boxColumns: 3, emptyCells: 45 },
  { size: 9, boxRows: 3, boxColumns: 3, emptyCells: 52 },
];

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

assert(TOWN_GAME_REWARDS.easy === 1 && TOWN_GAME_REWARDS.very_hard === 10, 'shared reward amounts changed unexpectedly');
assert(getTownGameRewardStateKey('normal') === 'memoryGameLastWin:normal', 'shared reward key is not save-compatible');
assert(getLocalDateKey(new Date(2026, 7, 11, 23, 59)) === '2026-08-11', 'reward date key is not based on the local date');

console.log('Sudoku engine tests passed.');
