/**
 * Number formatting utilities
 */

/**
 * Formats a number into an abbreviated string (e.g., 1000 -> 1K, 1500000 -> 1.5M).
 * If the number is less than 1000, it returns the standard localized string.
 *
 * @param {number|string} value - The number to format
 * @returns {string} The formatted string
 */
export function formatNumber(value) {
  const num = Number(value);
  if (isNaN(num)) return '0';

  if (num >= 1_000_000_000_000) {
    return (num / 1_000_000_000_000).toFixed(1).replace(/\.0$/, '') + 'T';
  }
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  
  return num.toLocaleString();
}
