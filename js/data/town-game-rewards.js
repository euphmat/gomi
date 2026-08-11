/**
 * ホームタウンのミニゲームで共有する、難易度別のデイリー報酬定義。
 *
 * 保存キーは既存の神経衰弱セーブと互換性を保つため、従来名のまま使う。
 * 数独と神経衰弱のどちらかで受け取ると、同じ難易度の報酬は翌日まで
 * 両方のゲームで受取済みになる。
 */
export const TOWN_GAME_REWARDS = Object.freeze({
  easy: 1,
  normal: 3,
  hard: 5,
  very_hard: 10,
});

export const TOWN_GAME_DIFFICULTY_IDS = Object.freeze(Object.keys(TOWN_GAME_REWARDS));

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTownGameRewardStateKey(difficultyId) {
  if (!TOWN_GAME_DIFFICULTY_IDS.includes(difficultyId)) {
    throw new Error('Invalid town game difficulty.');
  }
  return `memoryGameLastWin:${difficultyId}`;
}
