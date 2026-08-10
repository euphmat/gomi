import assert from 'node:assert/strict';
import { createCharacterCard } from '../js/components/character-card.js';

const character = {
  id: 1,
  name: 'テスト',
  jobName: 'テスター',
  level: 1,
  jobLevel: 1,
  hp: { current: 10, max: 10 },
  mp: { current: 5, max: 5 },
  exp: { current: 0, max: 10 },
  jp: { current: 0, max: 10 },
  iconImage: '',
};
const finalStats = { hp: 10, mp: 5, atk: 1, def: 1, matk: 1, mdef: 1, spd: 1 };

const html = createCharacterCard(character, finalStats, [
  {
    slotKey: 'rightHand',
    item: { id: 'medal_slime_calibur_instance', baseId: 'medal_slime_calibur', name: 'メダル武器' },
  },
  {
    slotKey: 'armor',
    item: { id: 'ordinary_armor', name: '通常防具' },
  },
]);

assert.match(html, /data-medal-equipment="true"/);
assert.match(html, /border-yellow-200\/40 bg-yellow-100\/10/);
assert.match(html, /aria-label="右手: メダル装備 メダル武器を変更"/);

const ordinaryRow = html.match(/<button[^>]+aria-label="防具: 通常防具を変更"[\s\S]*?<\/button>/)?.[0] || '';
assert.doesNotMatch(ordinaryRow, /data-medal-equipment|bg-yellow-100/);

console.log('Character card tests passed.');
