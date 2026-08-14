/** ブラックジャックの純粋なルール・山札処理。 */

export const BLACKJACK_MIN_BET = 10;
export const BLACKJACK_BET_STEP = 10;
export const BLACKJACK_CURRENCY_RULES = Object.freeze({
  gold: Object.freeze({ id: 'gold', label: 'Gold', minBet: 10, betStep: 10 }),
  prism: Object.freeze({ id: 'prism', label: 'Prism', minBet: 2, betStep: 2 }),
});

export const BLACKJACK_SUITS = Object.freeze([
  { id: 'spade', symbol: '♠', color: 'black' },
  { id: 'heart', symbol: '♥', color: 'red' },
  { id: 'diamond', symbol: '♦', color: 'red' },
  { id: 'club', symbol: '♣', color: 'black' },
]);

export const BLACKJACK_RANKS = Object.freeze([
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K',
]);

export function normalizeBlackjackCurrency(currency) {
  return currency === 'prism' ? 'prism' : 'gold';
}

export function getBlackjackCurrencyRules(currency) {
  return BLACKJACK_CURRENCY_RULES[normalizeBlackjackCurrency(currency)];
}

export function isValidBlackjackBet(value, currency = 'gold') {
  const rules = getBlackjackCurrencyRules(currency);
  return Number.isSafeInteger(value)
    && value >= rules.minBet
    && value % rules.betStep === 0;
}

export function createBlackjackDeck() {
  return BLACKJACK_SUITS.flatMap(suit => BLACKJACK_RANKS.map(rank => ({
    id: `${suit.id}-${rank}`,
    suit: suit.id,
    symbol: suit.symbol,
    color: suit.color,
    rank,
  })));
}

function secureRandomIndex(maxExclusive) {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) return 0;
  if (!globalThis.crypto?.getRandomValues) {
    return Math.floor(Math.random() * maxExclusive);
  }

  const limit = Math.floor(0x1_0000_0000 / maxExclusive) * maxExclusive;
  const values = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return values[0] % maxExclusive;
}

/** Fisher-Yates shuffle. rng(maxExclusive) is injectable for deterministic tests. */
export function shuffleBlackjackDeck(deck = createBlackjackDeck(), rng = secureRandomIndex) {
  const shuffled = deck.map(card => ({ ...card }));
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = rng(index + 1);
    if (!Number.isInteger(target) || target < 0 || target > index) {
      throw new Error('Invalid blackjack random source.');
    }
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function getBlackjackHandValue(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand || []) {
    if (card?.rank === 'A') {
      total += 11;
      aces += 1;
    } else if (['J', 'Q', 'K'].includes(card?.rank)) {
      total += 10;
    } else {
      total += Number(card?.rank) || 0;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return {
    total,
    soft: aces > 0,
    busted: total > 21,
    blackjack: (hand?.length || 0) === 2 && total === 21,
  };
}

export function shouldBlackjackDealerHit(hand) {
  // Dealer stands on every 17, including soft 17.
  return getBlackjackHandValue(hand).total < 17;
}

export function drawBlackjackCard(round, target) {
  if (!round || !Array.isArray(round.deck) || !Array.isArray(round[target])) {
    throw new Error('Invalid blackjack round.');
  }
  const card = round.deck[round.nextCardIndex];
  if (!card) throw new Error('Blackjack deck is empty.');
  round.nextCardIndex += 1;
  round[target].push(card);
  if (Array.isArray(round.drawHistory)) round.drawHistory.push(target);
  return card;
}

export function createBlackjackRound(wager, { id, now = Date.now(), deck, currency = 'gold' } = {}) {
  const normalizedCurrency = normalizeBlackjackCurrency(currency);
  if (!isValidBlackjackBet(wager, normalizedCurrency)) throw new Error('Invalid blackjack wager.');
  const round = {
    id: id || `${now}-${Math.random().toString(36).slice(2)}`,
    wager,
    currency: normalizedCurrency,
    deck: deck ? deck.map(card => ({ ...card })) : shuffleBlackjackDeck(),
    nextCardIndex: 0,
    playerHand: [],
    dealerHand: [],
    drawHistory: [],
    phase: 'pending_sync',
    outcome: null,
    payout: 0,
    createdAt: now,
    completedAt: null,
    resultSynced: false,
    questPlayRecorded: false,
  };
  drawBlackjackCard(round, 'playerHand');
  drawBlackjackCard(round, 'dealerHand');
  drawBlackjackCard(round, 'playerHand');
  drawBlackjackCard(round, 'dealerHand');
  return round;
}

export function resolveBlackjackOutcome(playerHand, dealerHand) {
  const player = getBlackjackHandValue(playerHand);
  const dealer = getBlackjackHandValue(dealerHand);
  if (player.busted) return 'lose';
  if (player.blackjack || dealer.blackjack) {
    if (player.blackjack && dealer.blackjack) return 'push';
    return player.blackjack ? 'blackjack' : 'lose';
  }
  if (dealer.busted || player.total > dealer.total) return 'win';
  if (player.total < dealer.total) return 'lose';
  return 'push';
}

/** Total amount returned to the bankroll; the wager was already deducted. */
export function getBlackjackPayout(wager, outcome, currency = 'gold') {
  if (!isValidBlackjackBet(wager, currency)) throw new Error('Invalid blackjack wager.');
  if (outcome === 'blackjack') return (wager * 5) / 2;
  if (outcome === 'win') return wager * 2;
  if (outcome === 'push') return wager;
  if (outcome === 'lose') return 0;
  throw new Error('Invalid blackjack outcome.');
}

const jsonEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

/** Validate the persisted deck and reconstruct every dealt card from its history. */
export function isValidBlackjackRoundState(round) {
  if (!round || typeof round.id !== 'string' || !round.id
      || !isValidBlackjackBet(round.wager, round.currency)
      || !['pending_sync', 'player', 'completed'].includes(round.phase)
      || !Array.isArray(round.deck) || round.deck.length !== 52
      || !Array.isArray(round.playerHand) || !Array.isArray(round.dealerHand)
      || !Array.isArray(round.drawHistory)
      || !Number.isInteger(round.nextCardIndex)
      || round.nextCardIndex !== round.drawHistory.length
      || round.nextCardIndex < 4 || round.nextCardIndex > round.deck.length) return false;

  const expectedIds = new Set(createBlackjackDeck().map(card => card.id));
  if (new Set(round.deck.map(card => card?.id)).size !== 52
      || round.deck.some(card => !expectedIds.has(card?.id))) return false;

  const reconstructed = { playerHand: [], dealerHand: [] };
  for (let index = 0; index < round.drawHistory.length; index += 1) {
    const target = round.drawHistory[index];
    if (!['playerHand', 'dealerHand'].includes(target)) return false;
    reconstructed[target].push(round.deck[index]);
  }
  if (!jsonEqual(reconstructed.playerHand, round.playerHand)
      || !jsonEqual(reconstructed.dealerHand, round.dealerHand)) return false;
  return round.drawHistory.slice(0, 4).join(',')
    === 'playerHand,dealerHand,playerHand,dealerHand';
}

function hasImmutableRoundCore(previous, next) {
  return previous.id === next.id
    && previous.createdAt === next.createdAt
    && normalizeBlackjackCurrency(previous.currency) === normalizeBlackjackCurrency(next.currency)
    && jsonEqual(previous.deck, next.deck);
}

export function isLegalBlackjackPlayerUpdate(previous, next, additionalWager = 0) {
  if (!isValidBlackjackRoundState(previous) || !isValidBlackjackRoundState(next)
      || !hasImmutableRoundCore(previous, next)
      || !Number.isSafeInteger(additionalWager) || additionalWager < 0
      || next.wager !== previous.wager + additionalWager
      || next.outcome !== null || next.payout !== 0 || next.completedAt !== null
      || next.resultSynced !== false
      || (previous.questPlayRecorded === true && next.questPlayRecorded !== true)) return false;

  if (previous.phase === 'pending_sync') {
    return next.phase === 'player'
      && additionalWager === 0
      && jsonEqual(previous.drawHistory, next.drawHistory)
      && jsonEqual(previous.playerHand, next.playerHand)
      && jsonEqual(previous.dealerHand, next.dealerHand);
  }
  if (previous.phase !== 'player' || next.phase !== 'player') return false;
  if (additionalWager > 0 && additionalWager !== previous.wager) return false;
  if (!jsonEqual(previous.dealerHand, next.dealerHand)
      || next.drawHistory.length !== previous.drawHistory.length + 1
      || next.drawHistory.at(-1) !== 'playerHand') return false;
  return next.playerHand.length === previous.playerHand.length + 1
    && jsonEqual(next.playerHand.slice(0, -1), previous.playerHand);
}

export function isLegalBlackjackSettlement(previous, next) {
  if (!isValidBlackjackRoundState(previous) || !isValidBlackjackRoundState(next)
      || previous.phase !== 'player' || next.phase !== 'completed'
      || !hasImmutableRoundCore(previous, next)
      || next.wager !== previous.wager
      || next.resultSynced !== false
      || !Number.isFinite(next.completedAt)
      || !jsonEqual(previous.playerHand, next.playerHand)
      || !jsonEqual(next.dealerHand.slice(0, previous.dealerHand.length), previous.dealerHand)
      || next.drawHistory.slice(previous.drawHistory.length).some(target => target !== 'dealerHand')) return false;

  const expected = JSON.parse(JSON.stringify(previous));
  const player = getBlackjackHandValue(expected.playerHand);
  const dealer = getBlackjackHandValue(expected.dealerHand);
  if (!player.busted && !player.blackjack && !dealer.blackjack) {
    while (shouldBlackjackDealerHit(expected.dealerHand)) {
      drawBlackjackCard(expected, 'dealerHand');
    }
  }
  const outcome = resolveBlackjackOutcome(expected.playerHand, expected.dealerHand);
  return jsonEqual(expected.dealerHand, next.dealerHand)
    && expected.nextCardIndex === next.nextCardIndex
    && jsonEqual(expected.drawHistory, next.drawHistory)
    && next.outcome === outcome
    && next.payout === getBlackjackPayout(next.wager, outcome, next.currency);
}
