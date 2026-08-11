/** Pure Sudoku board generation and validation helpers. */

const shuffled = (items, random = Math.random) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

function assertRules(rules) {
  const { size, boxRows, boxColumns } = rules;
  if (!Number.isInteger(size) || !Number.isInteger(boxRows) || !Number.isInteger(boxColumns)
      || size < 1 || boxRows * boxColumns !== size) {
    throw new Error('Invalid Sudoku rules.');
  }
}

export function getSudokuBoxIndex(row, column, rules) {
  const { size, boxRows, boxColumns } = rules;
  return Math.floor(row / boxRows) * (size / boxColumns) + Math.floor(column / boxColumns);
}

/** ランダム化した完成盤を作る。2x2、2x3、3x3ブロックに対応。 */
export function createSudokuSolution(rules, random = Math.random) {
  assertRules(rules);
  const { size, boxRows, boxColumns } = rules;
  const sequence = Array.from({ length: size }, (_, index) => index);
  const rowBands = shuffled(Array.from({ length: size / boxRows }, (_, index) => index), random);
  const columnStacks = shuffled(Array.from({ length: size / boxColumns }, (_, index) => index), random);
  const rows = rowBands.flatMap(band => shuffled(sequence.slice(band * boxRows, (band + 1) * boxRows), random));
  const columns = columnStacks.flatMap(stack => shuffled(sequence.slice(stack * boxColumns, (stack + 1) * boxColumns), random));
  const numbers = shuffled(Array.from({ length: size }, (_, index) => index + 1), random);
  const pattern = (row, column) => (
    boxColumns * (row % boxRows) + Math.floor(row / boxRows) + column
  ) % size;

  return rows.flatMap(row => columns.map(column => numbers[pattern(row, column)]));
}

export function getSudokuCandidates(board, cellIndex, rules) {
  assertRules(rules);
  const { size, boxRows, boxColumns } = rules;
  if (board[cellIndex]) return [];
  const row = Math.floor(cellIndex / size);
  const column = cellIndex % size;
  const used = new Set();

  for (let offset = 0; offset < size; offset += 1) {
    used.add(board[row * size + offset]);
    used.add(board[offset * size + column]);
  }
  const boxStartRow = Math.floor(row / boxRows) * boxRows;
  const boxStartColumn = Math.floor(column / boxColumns) * boxColumns;
  for (let rowOffset = 0; rowOffset < boxRows; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < boxColumns; columnOffset += 1) {
      used.add(board[(boxStartRow + rowOffset) * size + boxStartColumn + columnOffset]);
    }
  }
  return Array.from({ length: size }, (_, index) => index + 1).filter(value => !used.has(value));
}

/** limitに達したら打ち切る解数カウンター。盤面は変更しない。 */
export function countSudokuSolutions(board, rules, limit = 2) {
  assertRules(rules);
  const working = [...board];
  let count = 0;

  const search = () => {
    if (count >= limit) return;
    let targetIndex = -1;
    let targetCandidates = null;

    for (let index = 0; index < working.length; index += 1) {
      if (working[index]) continue;
      const candidates = getSudokuCandidates(working, index, rules);
      if (!candidates.length) return;
      if (!targetCandidates || candidates.length < targetCandidates.length) {
        targetIndex = index;
        targetCandidates = candidates;
        if (candidates.length === 1) break;
      }
    }

    if (targetIndex < 0) {
      count += 1;
      return;
    }

    for (const value of targetCandidates) {
      working[targetIndex] = value;
      search();
      working[targetIndex] = 0;
      if (count >= limit) return;
    }
  };

  search();
  return count;
}

/** 完成盤から、一意解を保てるマスだけを指定数まで取り除く。 */
export function createSudokuPuzzle(rules, emptyCells, random = Math.random) {
  assertRules(rules);
  const solution = createSudokuSolution(rules, random);
  const puzzle = [...solution];
  const positions = shuffled(Array.from({ length: puzzle.length }, (_, index) => index), random);
  const target = Math.max(0, Math.min(puzzle.length - 1, Math.floor(Number(emptyCells) || 0)));
  let removed = 0;

  for (const position of positions) {
    if (removed >= target) break;
    const previous = puzzle[position];
    puzzle[position] = 0;
    if (countSudokuSolutions(puzzle, rules, 2) === 1) {
      removed += 1;
    } else {
      puzzle[position] = previous;
    }
  }

  return { puzzle, solution, emptyCells: removed };
}

/** 行・列・ブロック内で重複している全マスのindexを返す。 */
export function findSudokuConflicts(board, rules) {
  assertRules(rules);
  const { size } = rules;
  const groups = [];

  for (let row = 0; row < size; row += 1) {
    groups.push(Array.from({ length: size }, (_, column) => row * size + column));
  }
  for (let column = 0; column < size; column += 1) {
    groups.push(Array.from({ length: size }, (_, row) => row * size + column));
  }
  for (let box = 0; box < size; box += 1) {
    const boxRow = Math.floor(box / (size / rules.boxColumns)) * rules.boxRows;
    const boxColumn = (box % (size / rules.boxColumns)) * rules.boxColumns;
    groups.push(Array.from({ length: size }, (_, offset) => (
      (boxRow + Math.floor(offset / rules.boxColumns)) * size + boxColumn + (offset % rules.boxColumns)
    )));
  }

  const conflicts = new Set();
  groups.forEach(indices => {
    const byValue = new Map();
    indices.forEach(index => {
      const value = board[index];
      if (!value) return;
      if (!byValue.has(value)) byValue.set(value, []);
      byValue.get(value).push(index);
    });
    byValue.forEach(matches => {
      if (matches.length > 1) matches.forEach(index => conflicts.add(index));
    });
  });
  return conflicts;
}
