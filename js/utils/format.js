/**
 * Number formatting utilities.
 *
 * Display notation is intentionally a local UI preference. It is not stored in
 * the game database or included in cloud saves, so changing it can never alter
 * game values or save compatibility.
 */

export const NUMBER_NOTATION_STORAGE_KEY = 'numberNotation';
export const NUMBER_NOTATION_CHANGED_EVENT = 'numberNotationChanged';
export const NUMBER_NOTATION = Object.freeze({
  COMPACT: 'compact',
  FULL: 'full',
});

const DEFAULT_NUMBER_NOTATION = NUMBER_NOTATION.COMPACT;
const formatterCache = new Map();
let cachedNumberNotation;

// Short-scale abbreviations through uncentillion (10^306). This
// covers every finite JavaScript Number, including Number.MAX_VALUE.
const SMALL_SUFFIXES = Object.freeze([
  '', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
]);
const UNIT_PREFIXES = Object.freeze(['', 'U', 'D', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No']);
const TENS_SUFFIXES = Object.freeze(['', 'Dc', 'Vg', 'Tg', 'Qag', 'Qig', 'Sxg', 'Spg', 'Ocg', 'Nog']);
const TENS_TAILS = Object.freeze(['', 'd', 'vg', 'tg', 'qag', 'qig', 'sxg', 'spg', 'ocg', 'nog']);

function readStoredNotation() {
  try {
    return globalThis.localStorage?.getItem?.(NUMBER_NOTATION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getNumberNotation() {
  if (!cachedNumberNotation) {
    cachedNumberNotation = readStoredNotation() === NUMBER_NOTATION.FULL
      ? NUMBER_NOTATION.FULL
      : DEFAULT_NUMBER_NOTATION;
  }
  return cachedNumberNotation;
}

export function setNumberNotation(notation) {
  const normalized = notation === NUMBER_NOTATION.FULL
    ? NUMBER_NOTATION.FULL
    : NUMBER_NOTATION.COMPACT;
  cachedNumberNotation = normalized;
  try {
    globalThis.localStorage?.setItem?.(NUMBER_NOTATION_STORAGE_KEY, normalized);
  } catch {
    // Formatting remains usable when storage is disabled (private/restricted mode).
  }
  applyNumberNotationToDocument(normalized);
  if (typeof globalThis.CustomEvent === 'function') {
    globalThis.window?.dispatchEvent?.(new globalThis.CustomEvent(NUMBER_NOTATION_CHANGED_EVENT, {
      detail: { notation: normalized },
    }));
  }
  return normalized;
}

export function applyNumberNotationToDocument(notation = getNumberNotation()) {
  const root = globalThis.document?.documentElement;
  if (root) root.dataset.numberNotation = notation;
}

function getFullFormatter(minimumFractionDigits, maximumFractionDigits) {
  const key = `${minimumFractionDigits}:${maximumFractionDigits}`;
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.NumberFormat('ja-JP', {
      useGrouping: true,
      notation: 'standard',
      minimumFractionDigits,
      maximumFractionDigits,
    }));
  }
  return formatterCache.get(key);
}

function getSuffix(groupIndex) {
  if (groupIndex < SMALL_SUFFIXES.length) return SMALL_SUFFIXES[groupIndex];
  const ordinal = groupIndex - 1;
  if (ordinal < 100) {
    const tens = Math.floor(ordinal / 10);
    const units = ordinal % 10;
    const base = TENS_SUFFIXES[tens];
    if (!units) return base;
    return `${UNIT_PREFIXES[units]}${TENS_TAILS[tens]}`;
  }
  if (ordinal <= 101) {
    const units = ordinal - 100;
    return units ? `${UNIT_PREFIXES[units]}ce` : 'Ce';
  }
  return '';
}

function fractionDigitsForCompact(value) {
  if (value >= 100) return 0;
  if (value >= 10) return 1;
  return 2;
}

function trimFixed(value, fractionDigits) {
  return value.toFixed(fractionDigits).replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1');
}

function formatCompactParts(coefficient, groupIndex, isNegative) {
  let digits = fractionDigitsForCompact(coefficient);
  let rounded = Number(coefficient.toFixed(digits));
  if (rounded >= 1000) {
    rounded /= 1000;
    groupIndex += 1;
    digits = fractionDigitsForCompact(rounded);
  }
  const sign = isNegative ? '-' : '';
  const suffix = getSuffix(groupIndex);
  if (!suffix) {
    let scientific = rounded;
    let exponent = groupIndex * 3;
    while (scientific >= 10) {
      scientific /= 10;
      exponent += 1;
    }
    return `${sign}${trimFixed(scientific, 2)}e${exponent}`;
  }
  return `${sign}${trimFixed(rounded, digits)}${suffix}`;
}

function formatCompactBigInt(value) {
  const isNegative = value < 0n;
  const digits = (isNegative ? -value : value).toString();
  if (digits.length <= 3) return getFullFormatter(0, 0).format(value);

  const exponent = digits.length - 1;
  const groupIndex = Math.floor(exponent / 3);
  const coefficientExponent = exponent - groupIndex * 3;
  const significant = digits.slice(0, Math.min(6, digits.length));
  const coefficient = Number(significant) / Math.pow(10, significant.length - 1 - coefficientExponent);
  return formatCompactParts(coefficient, groupIndex, isNegative);
}

function normalizeFractionDigits(options = {}) {
  const maximum = Number.isInteger(options.maximumFractionDigits)
    ? Math.min(20, Math.max(0, options.maximumFractionDigits))
    : 3;
  const minimum = Number.isInteger(options.minimumFractionDigits)
    ? Math.min(maximum, Math.max(0, options.minimumFractionDigits))
    : 0;
  return { minimum, maximum };
}

/**
 * Formats a game value using the player's notation setting.
 *
 * Compact examples: 10,000 -> 10k, 1e100 -> 10Dtg. Compact suffixes cover all
 * finite JS Numbers; still larger BigInts fall back to a bounded scientific
 * form instead of growing the UI indefinitely.
 * Full examples: 10,000 -> 10,000, 1234.5 -> 1,234.5.
 *
 * @param {number|string|bigint} value
 * @param {{minimumFractionDigits?: number, maximumFractionDigits?: number, notation?: 'compact'|'full'}} [options]
 * @returns {string}
 */
export function formatNumber(value, options = {}) {
  const notation = options.notation === NUMBER_NOTATION.FULL || options.notation === NUMBER_NOTATION.COMPACT
    ? options.notation
    : getNumberNotation();
  const { minimum, maximum } = normalizeFractionDigits(options);

  if (typeof value === 'bigint') {
    return notation === NUMBER_NOTATION.FULL
      ? getFullFormatter(0, 0).format(value)
      : formatCompactBigInt(value);
  }

  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  const normalized = Object.is(num, -0) ? 0 : num;
  if (notation === NUMBER_NOTATION.FULL) {
    return getFullFormatter(minimum, maximum).format(normalized);
  }

  const absNum = Math.abs(normalized);
  if (absNum < 1000) return getFullFormatter(minimum, maximum).format(normalized);

  let groupIndex = Math.floor(Math.log10(absNum) / 3);
  let coefficient = absNum / Math.pow(10, groupIndex * 3);
  if (!Number.isFinite(coefficient) || coefficient <= 0) {
    return normalized.toExponential(2).replace('+', '');
  }
  return formatCompactParts(coefficient, groupIndex, normalized < 0);
}
