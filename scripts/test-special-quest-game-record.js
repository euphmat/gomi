import assert from 'node:assert/strict';
import {
  normalizeSpecialQuestGameRecord,
  mergeTownGameClearHistory,
  recordBlackjackOutcome,
  recordLoginDay,
  recordTownGameClear,
} from '../js/data/special-quest-game-record.js';

const empty = normalizeSpecialQuestGameRecord(null);
assert.equal(empty.loginDays, 0);
assert.equal(empty.townGames.sudoku.clears, 0);
assert.deepEqual(empty.townGames.minesweeper.clearedDifficulties, []);
assert.equal(empty.blackjack.gamesPlayed, 0);

let record = recordLoginDay(empty);
record = recordLoginDay(record);
record = recordTownGameClear(record, 'sudoku', 'easy');
record = recordTownGameClear(record, 'sudoku', 'easy');
record = recordTownGameClear(record, 'sudoku', 'hard');
record = recordTownGameClear(record, 'monster-tower', 'very_hard');
record = recordBlackjackOutcome(record, 'win');
record = recordBlackjackOutcome(record, 'push');
record = recordBlackjackOutcome(record, 'blackjack');

assert.equal(record.loginDays, 2);
assert.equal(record.townGames.sudoku.clears, 3);
assert.deepEqual(record.townGames.sudoku.clearedDifficulties, ['easy', 'hard']);
assert.equal(record.townGames['monster-tower'].clears, 1);
assert.equal(record.blackjack.gamesPlayed, 3);
assert.equal(record.blackjack.wins, 2);
assert.equal(record.blackjack.blackjacks, 1);

const ignoredMemoryClear = recordTownGameClear(record, 'memory-game', 'normal');
assert.deepEqual(ignoredMemoryClear, record, 'Memory-game results are tracked by their existing record.');
const migrated = mergeTownGameClearHistory(empty, {
  sudoku: { easy: '2026-08-10', hard: '2026-08-12' },
  minesweeper: { normal: '2026-08-11' },
});
assert.equal(migrated.townGames.sudoku.clears, 2);
assert.deepEqual(migrated.townGames.sudoku.clearedDifficulties, ['easy', 'hard']);
assert.equal(migrated.townGames.minesweeper.clears, 1);
assert.throws(() => recordTownGameClear(record, 'sudoku', 'invalid'));
assert.throws(() => recordBlackjackOutcome(record, 'invalid'));

const normalized = normalizeSpecialQuestGameRecord({
  loginDays: -5,
  townGames: { sudoku: { clears: 2.9, clearedDifficulties: ['easy', 'easy', 'invalid'] } },
  blackjack: { gamesPlayed: '8', wins: 3.9, blackjacks: -1 },
});
assert.equal(normalized.loginDays, 0);
assert.equal(normalized.townGames.sudoku.clears, 2);
assert.deepEqual(normalized.townGames.sudoku.clearedDifficulties, ['easy']);
assert.deepEqual(normalized.blackjack, { gamesPlayed: 8, wins: 3, blackjacks: 0 });

console.log('Special quest game record tests passed.');
