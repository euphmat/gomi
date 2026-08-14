import {
  TOWN_GAME_DIFFICULTY_IDS,
  TOWN_GAME_IDS,
} from './town-game-rewards.js';

export const SPECIAL_QUEST_GAME_RECORD_KEY = 'special_quest_game_record';

const TRACKED_TOWN_GAME_IDS = TOWN_GAME_IDS.filter(gameId => gameId !== 'memory-game');
const BLACKJACK_OUTCOMES = new Set(['blackjack', 'win', 'push', 'lose']);

const nonNegativeInteger = value => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
};

const normalizeDifficultyIds = value => [...new Set(
  (Array.isArray(value) ? value : []).filter(id => TOWN_GAME_DIFFICULTY_IDS.includes(id))
)];

export function normalizeSpecialQuestGameRecord(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const townGames = Object.fromEntries(TRACKED_TOWN_GAME_IDS.map(gameId => {
    const saved = source.townGames?.[gameId] || {};
    return [gameId, {
      clears: nonNegativeInteger(saved.clears),
      clearedDifficulties: normalizeDifficultyIds(saved.clearedDifficulties),
    }];
  }));

  const blackjackGames = nonNegativeInteger(source.blackjack?.gamesPlayed);
  const blackjackWins = Math.min(blackjackGames, nonNegativeInteger(source.blackjack?.wins));
  return {
    loginDays: nonNegativeInteger(source.loginDays),
    townGames,
    blackjack: {
      gamesPlayed: blackjackGames,
      wins: blackjackWins,
      blackjacks: Math.min(blackjackWins, nonNegativeInteger(source.blackjack?.blackjacks)),
    },
  };
}

export function recordTownGameClear(value, gameId, difficultyId) {
  if (!TRACKED_TOWN_GAME_IDS.includes(gameId)) return normalizeSpecialQuestGameRecord(value);
  if (!TOWN_GAME_DIFFICULTY_IDS.includes(difficultyId)) {
    throw new Error('Invalid town game difficulty.');
  }

  const next = normalizeSpecialQuestGameRecord(value);
  const game = next.townGames[gameId];
  game.clears += 1;
  if (!game.clearedDifficulties.includes(difficultyId)) {
    game.clearedDifficulties.push(difficultyId);
  }
  return next;
}

export function mergeTownGameClearHistory(value, historyByGame = {}) {
  const next = normalizeSpecialQuestGameRecord(value);
  for (const gameId of TRACKED_TOWN_GAME_IDS) {
    const game = next.townGames[gameId];
    for (const difficultyId of TOWN_GAME_DIFFICULTY_IDS) {
      if (!historyByGame?.[gameId]?.[difficultyId]) continue;
      if (!game.clearedDifficulties.includes(difficultyId)) {
        game.clearedDifficulties.push(difficultyId);
      }
    }
    game.clears = Math.max(game.clears, game.clearedDifficulties.length);
  }
  return next;
}

export function recordBlackjackOutcome(value, outcome) {
  if (!BLACKJACK_OUTCOMES.has(outcome)) throw new Error('Invalid blackjack outcome.');
  const next = normalizeSpecialQuestGameRecord(value);
  next.blackjack.gamesPlayed += 1;
  if (outcome === 'win' || outcome === 'blackjack') next.blackjack.wins += 1;
  if (outcome === 'blackjack') next.blackjack.blackjacks += 1;
  return next;
}

export function recordLoginDay(value) {
  const next = normalizeSpecialQuestGameRecord(value);
  next.loginDays += 1;
  return next;
}
