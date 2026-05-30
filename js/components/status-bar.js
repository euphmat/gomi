/**
 * Status Bar Component
 * 
 * Renders a horizontal progress bar (HP, MP, EXP, etc.)
 * with a colored fill and centered text label.
 * 
 * @param {Object} options
 * @param {string} options.label - Bar label (e.g., "HP", "MP")
 * @param {number} options.current - Current value
 * @param {number} options.max - Maximum value
 * @param {string} options.colorFrom - Gradient start color (CSS color)
 * @param {string} options.colorTo - Gradient end color (CSS color)
 * @returns {string} HTML string
 */
export function createStatusBar({ label, current, max, colorFrom, colorTo }) {
  const percentage = Math.min(100, Math.round((current / max) * 100));

  return `
    <div class="status-bar relative h-5 rounded-sm overflow-hidden bg-gray-800/90 border border-gray-700/50">
      <div class="status-bar-fill absolute inset-y-0 left-0 rounded-sm transition-[width] duration-1000 ease-out"
           style="width: ${percentage}%; background: linear-gradient(90deg, ${colorFrom}, ${colorTo});">
      </div>
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span class="text-white text-[9px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wide">
          ${label}
        </span>
      </div>
    </div>
  `;
}

/**
 * Bar color presets matching the mockup design.
 */
export const BAR_COLORS = {
  hp:     { colorFrom: '#008a00', colorTo: '#00c853' },
  mp:     { colorFrom: '#006EAF', colorTo: '#1ba1e2' },
  exp:    { colorFrom: '#C73500', colorTo: '#fa6800' },
  jobExp: { colorFrom: '#A50040', colorTo: '#d80073' },
};
