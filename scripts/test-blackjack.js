import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createBlackjackDeck,
  createBlackjackRound,
  drawBlackjackCard,
  getBlackjackCurrencyRules,
  getBlackjackHandValue,
  getBlackjackPayout,
  isValidBlackjackBet,
  isLegalBlackjackPlayerUpdate,
  isLegalBlackjackSettlement,
  isValidBlackjackRoundState,
  resolveBlackjackOutcome,
  shouldBlackjackDealerHit,
  shuffleBlackjackDeck,
} from '../js/data/blackjack-engine.js';

const card = (rank, suit = 'spade') => ({
  id: `${suit}-${rank}`,
  suit,
  symbol: suit === 'heart' ? '♥' : '♠',
  color: suit === 'heart' ? 'red' : 'black',
  rank,
});

assert.equal(createBlackjackDeck().length, 52);
assert.equal(new Set(createBlackjackDeck().map(item => item.id)).size, 52);
assert.deepEqual(shuffleBlackjackDeck(createBlackjackDeck(), () => 0).length, 52);

assert.deepEqual(getBlackjackHandValue([card('A'), card('K')]), {
  total: 21, soft: true, busted: false, blackjack: true,
});
assert.equal(getBlackjackHandValue([card('A'), card('A'), card('9')]).total, 21);
assert.equal(getBlackjackHandValue([card('A'), card('A'), card('9'), card('K')]).total, 21);
assert.equal(getBlackjackHandValue([card('K'), card('Q'), card('2')]).busted, true);
assert.equal(shouldBlackjackDealerHit([card('A'), card('6')]), false, 'dealer must stand on soft 17');
assert.equal(shouldBlackjackDealerHit([card('10'), card('6')]), true);

assert.equal(resolveBlackjackOutcome([card('A'), card('K')], [card('10'), card('9')]), 'blackjack');
assert.equal(resolveBlackjackOutcome([card('A'), card('K')], [card('A'), card('Q')]), 'push');
assert.equal(resolveBlackjackOutcome([card('10'), card('8')], [card('K'), card('7')]), 'win');
assert.equal(resolveBlackjackOutcome([card('10'), card('7')], [card('9'), card('8')]), 'push');
assert.equal(resolveBlackjackOutcome([card('10'), card('8')], [card('K'), card('Q'), card('2')]), 'win');
assert.equal(resolveBlackjackOutcome([card('K'), card('Q'), card('2')], [card('2')]), 'lose');

assert.equal(isValidBlackjackBet(10), true);
assert.equal(isValidBlackjackBet(25), false);
assert.equal(isValidBlackjackBet(0), false);
assert.equal(isValidBlackjackBet(2, 'prism'), true);
assert.equal(isValidBlackjackBet(3, 'prism'), false);
assert.deepEqual(getBlackjackCurrencyRules('prism'), {
  id: 'prism', label: 'Prism', minBet: 2, betStep: 2,
});
assert.equal(getBlackjackPayout(100, 'blackjack'), 250);
assert.equal(getBlackjackPayout(100, 'win'), 200);
assert.equal(getBlackjackPayout(100, 'push'), 100);
assert.equal(getBlackjackPayout(100, 'lose'), 0);
assert.equal(getBlackjackPayout(2, 'blackjack', 'prism'), 5);

const orderedDeck = createBlackjackDeck();
const round = createBlackjackRound(50, { id: 'test-round', now: 123, deck: orderedDeck });
assert.equal(round.id, 'test-round');
assert.equal(round.currency, 'gold');
assert.equal(round.phase, 'pending_sync');
assert.equal(round.nextCardIndex, 4);
assert.deepEqual(round.playerHand.map(item => item.id), [orderedDeck[0].id, orderedDeck[2].id]);
assert.deepEqual(round.dealerHand.map(item => item.id), [orderedDeck[1].id, orderedDeck[3].id]);
assert.equal(isValidBlackjackRoundState(round), true);
const prismRound = createBlackjackRound(2, { id: 'prism-round', now: 124, deck: orderedDeck, currency: 'prism' });
assert.equal(prismRound.currency, 'prism');
assert.equal(isValidBlackjackRoundState(prismRound), true);
const prismPlayableRound = structuredClone(prismRound);
prismPlayableRound.phase = 'player';
assert.equal(isLegalBlackjackPlayerUpdate(prismRound, prismPlayableRound), true);
const changedCurrencyRound = structuredClone(prismPlayableRound);
changedCurrencyRound.currency = 'gold';
changedCurrencyRound.wager = 10;
assert.equal(isLegalBlackjackPlayerUpdate(prismRound, changedCurrencyRound), false, 'currency changes must be rejected');
const legacyGoldRound = structuredClone(round);
delete legacyGoldRound.currency;
assert.equal(isValidBlackjackRoundState(legacyGoldRound), true, 'legacy Gold rounds must remain valid');

const playableRound = structuredClone(round);
playableRound.phase = 'player';
assert.equal(isLegalBlackjackPlayerUpdate(round, playableRound), true);
const tamperedRound = structuredClone(playableRound);
tamperedRound.deck.reverse();
assert.equal(isLegalBlackjackPlayerUpdate(round, tamperedRound), false, 'deck replacement must be rejected');

const settledRound = structuredClone(playableRound);
while (shouldBlackjackDealerHit(settledRound.dealerHand)) {
  drawBlackjackCard(settledRound, 'dealerHand');
}
settledRound.phase = 'completed';
settledRound.outcome = resolveBlackjackOutcome(settledRound.playerHand, settledRound.dealerHand);
settledRound.payout = getBlackjackPayout(settledRound.wager, settledRound.outcome);
settledRound.completedAt = 456;
assert.equal(isLegalBlackjackSettlement(playableRound, settledRound), true);
const forgedPayout = structuredClone(settledRound);
forgedPayout.payout += 1000;
assert.equal(isLegalBlackjackSettlement(playableRound, forgedPayout), false, 'forged payout must be rejected');

const databaseSource = readFileSync(new URL('../js/data/database.js', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../js/pages/blackjack.js', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const statusSource = readFileSync(new URL('../js/pages/status.js', import.meta.url), 'utf8');

for (const method of [
  'startBlackjackRound(round)',
  'updateBlackjackRound(round, additionalWager = 0)',
  'settleBlackjackRound(round)',
  'markBlackjackResultSynced(roundId)',
]) {
  assert.ok(databaseSource.includes(method), `missing database method: ${method}`);
}
assert.match(pageSource, /CloudSaveService\.getCurrentUser\(\)/);
assert.match(pageSource, /expectedSavedAt:\s*metadata\?\.savedAt \?\? null/);
assert.match(pageSource, /metadata\.savedAt !== getLastCloudUpload\(currentUser\.uid\)/);
assert.match(pageSource, /recordCloudUpload\(user\.uid, uploaded\.savedAt\)/);
assert.match(pageSource, /dramaticPause\(650\)/);
assert.match(pageSource, /dramaticPause\(900\)/);
assert.match(pageSource, /blackjack-result-card/);
assert.match(pageSource, /resultEffectsMarkup\(view\.effect\)/);
assert.match(pageSource, /insertAdjacentHTML\('beforeend', cardMarkup/);
assert.match(pageSource, /type="range"/);
assert.match(pageSource, /data-wager-currency="\$\{id\}"/);
assert.ok(!pageSource.includes('data-chip='), 'fixed wager buttons must be removed');
assert.match(databaseSource, /store\.get\(currency\)/);
assert.ok(!pageSource.includes("return error?.message || 'クラウド"));
for (const hiddenSaveLabel of [
  '結果をクラウドへ保存しています',
  '開始前セーブ',
  '自動セーブが有効です',
  'クラウド保存を完了してください',
]) {
  assert.ok(!pageSource.includes(hiddenSaveLabel), `player-facing save label remains: ${hiddenSaveLabel}`);
}
const settlementUiSource = pageSource.slice(
  pageSource.indexOf('const syncCompletedResult'),
  pageSource.indexOf('const startRound'),
);
assert.ok(!settlementUiSource.includes('renderTable('), 'settlement must not redraw the full table');
assert.match(appSource, /\.register\('\/blackjack', renderBlackjackPage\)/);
assert.match(statusSource, /data-blackjack/);

console.log('Blackjack engine and integration tests passed.');
