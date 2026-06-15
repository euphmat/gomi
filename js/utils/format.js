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
  
  const absNum = Math.abs(num);
  if (absNum < 1000) return num.toLocaleString();

  const suffixes = [
    "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", 
    "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Od", "Nd", "V", "Uv"
  ];
  
  let suffixIndex = Math.floor(Math.log10(absNum) / 3);
  let divisor = Math.pow(10, suffixIndex * 3);
  let shortNum = absNum / divisor;

  // Handle rounding up that would cause e.g. 1000K instead of 1M
  if (shortNum >= 999.95) {
    suffixIndex++;
    divisor = Math.pow(10, suffixIndex * 3);
    shortNum = absNum / divisor;
  }

  if (suffixIndex < suffixes.length) {
    const formattedNum = shortNum.toFixed(1).replace(/\.0$/, '');
    return (num < 0 ? '-' : '') + formattedNum + suffixes[suffixIndex];
  }
  
  return num.toExponential(2);
}
