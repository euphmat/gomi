import { GameDB } from './database.js';

// Keep the existing storage key so play records survive the removal of the
// former level/EXP system.
export const MEMORY_RECORD_STATE_KEY = 'memoryGameProgress';

const EMPTY_RECORD = Object.freeze({
  gamesPlayed: 0,
  wins: 0,
  draws: 0,
  losses: 0,
});

let cachedRecord = null;

function normalizeRecord(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    gamesPlayed: Math.max(0, Math.floor(Number(source.gamesPlayed) || 0)),
    wins: Math.max(0, Math.floor(Number(source.wins) || 0)),
    draws: Math.max(0, Math.floor(Number(source.draws) || 0)),
    losses: Math.max(0, Math.floor(Number(source.losses) || 0)),
  };
}

const cloneRecord = record => ({ ...record });

export async function loadMemoryRecord(force = false) {
  if (!cachedRecord || force) {
    const saved = await GameDB.getGameState(MEMORY_RECORD_STATE_KEY);
    cachedRecord = normalizeRecord(saved || EMPTY_RECORD);

    // Persist the normalized shape to remove obsolete EXP and old skill data
    // from existing saves while retaining the plain win/loss record.
    if (saved && JSON.stringify(saved) !== JSON.stringify(cachedRecord)) {
      await GameDB.setGameState(MEMORY_RECORD_STATE_KEY, cachedRecord);
    }
  }
  return cloneRecord(cachedRecord);
}

export async function recordMemoryGameResult({ outcome }) {
  const record = await loadMemoryRecord();
  const next = {
    gamesPlayed: record.gamesPlayed + 1,
    wins: record.wins + (outcome === 'win' ? 1 : 0),
    draws: record.draws + (outcome === 'draw' ? 1 : 0),
    losses: record.losses + (outcome === 'win' || outcome === 'draw' ? 0 : 1),
  };
  await GameDB.setGameState(MEMORY_RECORD_STATE_KEY, next);
  cachedRecord = next;
  return cloneRecord(next);
}
