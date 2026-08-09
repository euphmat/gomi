import { GameDB } from './database.js';

export const MEMORY_PROGRESS_STATE_KEY = 'memoryGameProgress';
export const MEMORY_MAX_LEVEL = 30;

const DIFFICULTY_XP = {
  easy: 10,
  normal: 16,
  hard: 24,
  very_hard: 34,
};

const EMPTY_PROGRESS = Object.freeze({
  xp: 0,
  gamesPlayed: 0,
  wins: 0,
  draws: 0,
  losses: 0,
});

let cachedProgress = null;

/** Lv.N から Lv.N+1 に必要なEXP。 */
export function getMemoryXpToNext(level) {
  return 40 + Math.max(0, level - 1) * 20;
}

/** 指定レベルに到達するための累計EXP。 */
export function getMemoryLevelStartXp(level) {
  const steps = Math.max(0, Math.min(MEMORY_MAX_LEVEL, level) - 1);
  return 10 * steps * steps + 30 * steps;
}

export function getMemoryLevel(xp) {
  const safeXp = Math.max(0, Math.floor(Number(xp) || 0));
  let level = 1;
  while (level < MEMORY_MAX_LEVEL && safeXp >= getMemoryLevelStartXp(level + 1)) level += 1;
  return level;
}

function normalizeProgress(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    xp: Math.max(0, Math.floor(Number(source.xp) || 0)),
    gamesPlayed: Math.max(0, Math.floor(Number(source.gamesPlayed) || 0)),
    wins: Math.max(0, Math.floor(Number(source.wins) || 0)),
    draws: Math.max(0, Math.floor(Number(source.draws) || 0)),
    losses: Math.max(0, Math.floor(Number(source.losses) || 0)),
  };
}

const cloneProgress = progress => ({ ...progress });

export function getMemoryXpReward({ difficultyId, outcome, playerPairs }) {
  const base = DIFFICULTY_XP[difficultyId] || DIFFICULTY_XP.easy;
  const pairXp = Math.max(0, Math.floor(Number(playerPairs) || 0)) * 3;
  const outcomeMultiplier = outcome === 'win' ? 1.5 : outcome === 'draw' ? 1.2 : 1;
  return Math.max(1, Math.round((base + pairXp) * outcomeMultiplier));
}

export async function loadMemoryProgress(force = false) {
  if (!cachedProgress || force) {
    const saved = await GameDB.getGameState(MEMORY_PROGRESS_STATE_KEY);
    cachedProgress = normalizeProgress(saved || EMPTY_PROGRESS);
    if (saved && Object.prototype.hasOwnProperty.call(saved, 'skillRanks')) {
      await GameDB.setGameState(MEMORY_PROGRESS_STATE_KEY, cachedProgress);
    }
  }
  return cloneProgress(cachedProgress);
}

export async function recordMemoryGameResult({ difficultyId, outcome, playerPairs }) {
  const progress = await loadMemoryProgress();
  const previousLevel = getMemoryLevel(progress.xp);
  const xpGained = getMemoryXpReward({ difficultyId, outcome, playerPairs });
  const next = {
    ...progress,
    xp: progress.xp + xpGained,
    gamesPlayed: progress.gamesPlayed + 1,
    wins: progress.wins + (outcome === 'win' ? 1 : 0),
    draws: progress.draws + (outcome === 'draw' ? 1 : 0),
    losses: progress.losses + (outcome === 'win' || outcome === 'draw' ? 0 : 1),
  };
  await GameDB.setGameState(MEMORY_PROGRESS_STATE_KEY, next);
  cachedProgress = next;
  return {
    progress: cloneProgress(next),
    xpGained,
    previousLevel,
    level: getMemoryLevel(next.xp),
  };
}
