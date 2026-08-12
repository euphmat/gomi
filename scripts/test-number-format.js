import {
  NUMBER_NOTATION,
  NUMBER_NOTATION_CHANGED_EVENT,
  formatNumber,
  getNumberNotation,
  setNumberNotation,
} from '../js/utils/format.js';

const assertEqual = (actual, expected, label) => {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

const compact = value => formatNumber(value, { notation: NUMBER_NOTATION.COMPACT });
const full = value => formatNumber(value, { notation: NUMBER_NOTATION.FULL });

assertEqual(compact(0), '0', 'zero');
assertEqual(compact(-0), '0', 'negative zero');
assertEqual(compact(999), '999', 'compact boundary below one thousand');
assertEqual(compact(1000), '1k', 'compact one thousand');
assertEqual(compact(10000), '10k', 'compact ten thousand');
assertEqual(compact(1500000), '1.5M', 'compact decimal coefficient');
assertEqual(compact(-12500), '-12.5k', 'compact negative');
assertEqual(compact(999500), '1M', 'compact rounded unit promotion');
assertEqual(compact(10 ** 33), '1Dc', 'compact extended suffix');
assertEqual(compact(10 ** 36), '1Ud', 'compact prefixed extended suffix');
assertEqual(compact(Number.MAX_VALUE), '180Uce', 'maximum finite Number');
assertEqual(compact(10n ** 400n), '1e400', 'BigInt beyond named suffixes');
assertEqual(compact(NaN), '0', 'NaN fallback');
assertEqual(compact(Infinity), '0', 'Infinity fallback');

assertEqual(full(10000), '10,000', 'full ten thousand');
assertEqual(full(-1234567.5), '-1,234,567.5', 'full negative decimal');
assertEqual(full(10n ** 24n), '1,000,000,000,000,000,000,000,000', 'full BigInt');
if (!full(Number.MAX_VALUE).includes(',') || full(Number.MAX_VALUE).includes('e+')) {
  throw new Error('full maximum Number was not expanded with grouping separators');
}
assertEqual(
  formatNumber(1.5, { notation: NUMBER_NOTATION.FULL, minimumFractionDigits: 3, maximumFractionDigits: 3 }),
  '1.500',
  'fraction digit options',
);

const stored = new Map();
const events = [];
globalThis.localStorage = {
  getItem: key => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, value),
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, options) {
    this.type = type;
    this.detail = options?.detail;
  }
};
globalThis.window = {
  dispatchEvent: event => events.push(event),
};
globalThis.document = { documentElement: { dataset: {} } };

assertEqual(getNumberNotation(), NUMBER_NOTATION.COMPACT, 'default setting');
assertEqual(setNumberNotation(NUMBER_NOTATION.FULL), NUMBER_NOTATION.FULL, 'saved full setting');
assertEqual(getNumberNotation(), NUMBER_NOTATION.FULL, 'read full setting');
assertEqual(events.at(-1)?.type, NUMBER_NOTATION_CHANGED_EVENT, 'setting change event');
assertEqual(events.at(-1)?.detail?.notation, NUMBER_NOTATION.FULL, 'setting event detail');
assertEqual(document.documentElement.dataset.numberNotation, NUMBER_NOTATION.FULL, 'document notation state');

console.log('Number format tests passed.');
