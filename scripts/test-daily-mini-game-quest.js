import { DAILY_QUESTS } from '../js/data/quest-manager.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const quest = DAILY_QUESTS.find(item => item.id === 'daily_play_mini_game');
assert(quest, 'daily mini-game quest is missing');
assert(quest.label === 'ミニゲームで1回遊ぶ', 'daily mini-game quest has the wrong label');
assert(quest.eventType === 'quest:mini-game-play', 'daily mini-game quest listens for the wrong event');
assert(quest.progressKey === 'miniGamesPlayed', 'daily mini-game quest uses the wrong progress key');
assert(quest.destination.path === '/status', 'daily mini-game quest does not lead to the hometown');
assert(!DAILY_QUESTS.some(item => item.eventType === 'quest:memory-game-play'), 'legacy memory-only daily quest still exists');

console.log('Daily mini-game quest tests passed.');
