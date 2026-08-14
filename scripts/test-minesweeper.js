import {
  createLogicalMinefield,
  createMinefield,
  getMinefieldNeighbors,
  isMinefieldCleared,
  revealMinefieldCells,
  rollMineGuard,
  solveMinefieldLogically,
} from '../js/data/minesweeper-engine.js';
import { readFileSync } from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const configs = [
  { rows: 8, columns: 8, mines: 10 },
  { rows: 10, columns: 10, mines: 18 },
  { rows: 12, columns: 12, mines: 28 },
  { rows: 14, columns: 14, mines: 40 },
];

configs.forEach(config => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const safeIndex = (attempt * 11) % (config.rows * config.columns);
    const board = createMinefield(config, safeIndex);
    assert(board.length === config.rows * config.columns, 'minefield has the wrong size');
    assert(board.filter(value => value === -1).length === config.mines, 'mine count is incorrect');
    assert(board[safeIndex] === 0, 'first cell is not a safe blank cell');
    board.forEach((value, index) => {
      if (value === -1) return;
      const expected = getMinefieldNeighbors(index, config).filter(neighbor => board[neighbor] === -1).length;
      assert(value === expected, 'adjacent mine count is incorrect');
    });
  }
});

const emptyConfig = { rows: 3, columns: 3, mines: 1 };
const emptyBoard = [0, 0, 0, 0, 1, 1, 0, 1, -1];
const revealed = revealMinefieldCells(emptyBoard, new Set(), 0, emptyConfig);
assert(revealed.size === 8 && !revealed.has(8), 'blank-cell flood reveal failed');
assert(isMinefieldCleared(emptyBoard, revealed), 'cleared board was not recognized');
const blockedReveal = revealMinefieldCells(emptyBoard, new Set(), 0, emptyConfig, new Set([1]));
assert(!blockedReveal.has(1), 'flagged cell was opened by flood reveal');
assert(rollMineGuard(20, false, () => 0.1999), 'the canary should trigger below its chance');
assert(!rollMineGuard(20, false, () => 0.2), 'the canary chance boundary is incorrect');
assert(!rollMineGuard(100, true, () => 0), 'the canary must not trigger twice in one game');
assert(!rollMineGuard(0, false, () => 0), 'an unowned canary must not trigger');

configs.forEach(config => {
  const safeIndex = Math.floor((config.rows * config.columns) / 2);
  const generated = createLogicalMinefield(config, safeIndex, Math.random, 5000);
  assert(generated, `${config.rows}x${config.columns} no-guess board could not be generated`);
  assert(solveMinefieldLogically(generated.board, safeIndex, config).solved, 'generated board requires guessing');
});

const minesweeperPageSource = readFileSync(new URL('../js/pages/minesweeper.js', import.meta.url), 'utf8');
assert(minesweeperPageSource.includes("getTreasureEffect('minesweeperMineGuardPercent')"), 'the Prospector canary is not applied');
assert(minesweeperPageSource.includes('game.flags.add(index)'), 'a guarded mine is not automatically flagged');

console.log('Minesweeper engine tests passed.');
