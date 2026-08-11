/** Pure helpers for generating and resolving Minesweeper boards. */

function assertConfig(config) {
  const { rows, columns, mines } = config;
  if (!Number.isInteger(rows) || !Number.isInteger(columns) || !Number.isInteger(mines)
      || rows < 1 || columns < 1 || mines < 1 || mines >= rows * columns) {
    throw new Error('Invalid Minesweeper configuration.');
  }
}

const shuffled = (items, random = Math.random) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

export function getMinefieldNeighbors(cellIndex, config) {
  const { rows, columns } = config;
  const row = Math.floor(cellIndex / columns);
  const column = cellIndex % columns;
  const neighbors = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (!rowOffset && !columnOffset) continue;
      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;
      if (nextRow >= 0 && nextRow < rows && nextColumn >= 0 && nextColumn < columns) {
        neighbors.push(nextRow * columns + nextColumn);
      }
    }
  }
  return neighbors;
}

/**
 * 初手と可能ならその周囲8マスを除外して地雷を置く。
 * 返値は地雷=-1、それ以外=隣接地雷数の一次元配列。
 */
export function createMinefield(config, safeIndex, random = Math.random) {
  assertConfig(config);
  const totalCells = config.rows * config.columns;
  if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= totalCells) {
    throw new Error('Invalid safe cell.');
  }

  const preferredSafe = new Set([safeIndex, ...getMinefieldNeighbors(safeIndex, config)]);
  let candidates = Array.from({ length: totalCells }, (_, index) => index).filter(index => !preferredSafe.has(index));
  if (candidates.length < config.mines) {
    candidates = Array.from({ length: totalCells }, (_, index) => index).filter(index => index !== safeIndex);
  }
  const mineIndices = new Set(shuffled(candidates, random).slice(0, config.mines));
  const board = Array(totalCells).fill(0);
  mineIndices.forEach(index => { board[index] = -1; });
  board.forEach((value, index) => {
    if (value === -1) return;
    board[index] = getMinefieldNeighbors(index, config).filter(neighbor => mineIndices.has(neighbor)).length;
  });
  return board;
}

/** 空白マスから境界の数字までを連鎖開放した、新しいSetを返す。 */
export function revealMinefieldCells(board, revealedCells, startIndex, config, blockedCells = new Set()) {
  assertConfig(config);
  const revealed = new Set(revealedCells);
  if (startIndex < 0 || startIndex >= board.length || board[startIndex] === -1 || blockedCells.has(startIndex)) return revealed;
  const queue = [startIndex];
  while (queue.length) {
    const index = queue.shift();
    if (revealed.has(index) || board[index] === -1 || blockedCells.has(index)) continue;
    revealed.add(index);
    if (board[index] !== 0) continue;
    getMinefieldNeighbors(index, config).forEach(neighbor => {
      if (!revealed.has(neighbor) && board[neighbor] !== -1 && !blockedCells.has(neighbor)) queue.push(neighbor);
    });
  }
  return revealed;
}

export function isMinefieldCleared(board, revealedCells) {
  return board.every((value, index) => value === -1 || revealedCells.has(index));
}
