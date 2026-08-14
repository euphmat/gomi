import assert from 'node:assert/strict';
import { GameDB } from '../js/data/database.js';
import {
  MEMORY_RECORD_STATE_KEY,
  loadMemoryRecord,
  recordMemoryGameResult,
} from '../js/data/memory-game-record.js';

let savedRecord = {
  xp: 9876,
  skillRanks: { old_memory_skill: 3 },
  gamesPlayed: 12,
  wins: 5,
  draws: 2,
  losses: 5,
};

GameDB.getGameState = async key => key === MEMORY_RECORD_STATE_KEY ? structuredClone(savedRecord) : null;
GameDB.setGameState = async (key, value) => {
  assert.equal(key, MEMORY_RECORD_STATE_KEY);
  savedRecord = structuredClone(value);
};

const migrated = await loadMemoryRecord(true);
assert.deepEqual(migrated, { gamesPlayed: 12, wins: 5, draws: 2, losses: 5 });
assert.deepEqual(savedRecord, migrated, 'Obsolete memory EXP and skill data must be removed from the save.');

const updated = await recordMemoryGameResult({ outcome: 'win' });
assert.deepEqual(updated, { gamesPlayed: 13, wins: 6, draws: 2, losses: 5 });
assert.deepEqual(savedRecord, updated, 'Only the plain play record should be persisted.');

console.log('Memory game record tests passed.');
