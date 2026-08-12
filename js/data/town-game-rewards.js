/**
 * ホームタウンのミニゲームで使う、難易度別のデイリー報酬定義。
 *
 * 報酬の受取状況はゲーム・難易度ごとに独立する。神経衰弱だけは既存セーブとの
 * 互換性を保つため、従来の保存キーを引き続き使う。
 */
export const TOWN_GAME_REWARDS = Object.freeze({
  easy: 1,
  normal: 2,
  hard: 3,
  very_hard: 5,
});

export const TOWN_GAME_DIFFICULTY_IDS = Object.freeze(Object.keys(TOWN_GAME_REWARDS));
export const TOWN_GAME_IDS = Object.freeze([
  'memory-game',
  'sudoku',
  'minesweeper',
  'monster-tower',
]);

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTownGameRewardStateKey(gameId, difficultyId) {
  if (!TOWN_GAME_IDS.includes(gameId)) {
    throw new Error('Invalid town game.');
  }
  if (!TOWN_GAME_DIFFICULTY_IDS.includes(difficultyId)) {
    throw new Error('Invalid town game difficulty.');
  }
  return gameId === 'memory-game'
    ? `memoryGameLastWin:${difficultyId}`
    : `townGameLastWin:${gameId}:${difficultyId}`;
}
