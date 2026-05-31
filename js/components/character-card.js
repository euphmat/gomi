/**

 * このファイルはキャラクターのステータス（HP、MP、レベル、装備など）を
 * カード状に表示するための部品（コンポーネント）を作るファイルです。
 *
 * Character Card Component
 *
 * Displays a single character's full status:
 * - Icon + Level/JobLv
 * - HP / MP bars
 * - EXP / JP bars
 * - Stats (ATK, DEF, MATK, MDEF, SPD)
 * - Equipment (5 slots)
 */
import { createStatusBar, BAR_COLORS } from './status-bar.js';
import { EQUIPMENT_SLOTS, STAT_KEYS } from '../data/constants.js';

/**
 * Render a character card.
 * @param {Object} character - Character data from DB
 * @param {Object} finalStats - Computed final stats { atk, def, matk, mdef, spd }
 * @param {Array<{ slotKey: string, item: Object|null }>} equippedItems - Resolved equipment
 * @returns {string} HTML string
 */
export function createCharacterCard(character, finalStats, equippedItems) {
  const {
    name, jobName, level, jobLevel, sp = 0,
    hp, mp, exp, jp,
    iconImage,
  } = character;

  // ── Equipment Rows ──
  const slotLabelMap = {};
  for (const slot of EQUIPMENT_SLOTS) {
    slotLabelMap[slot.key] = slot.label;
  }

  const equipmentHTML = equippedItems.map(({ slotKey, item }) => {
    const label = slotLabelMap[slotKey] || slotKey;
    if (item) {
      return `
        <div class="flex items-center gap-1.5 py-[3px] border-b border-gray-700/30 last:border-b-0 
                    cursor-pointer hover:bg-gray-800/50 transition-colors eq-slot-clickable"
             data-char-id="${character.id}" data-slot-key="${slotKey}">
          <span class="w-6 h-6 flex items-center justify-center bg-gray-800/80 rounded shrink-0 overflow-hidden
                       border border-gray-700/40">
            ${item.image 
              ? `<img src="${item.image}" class="w-[90%] h-[90%] object-contain drop-shadow-sm" alt="${item.name}" />` 
              : `<span class="material-symbols-outlined text-[14px] text-gray-300">${item.icon}</span>`
            }
          </span>
          <span class="text-[9px] text-gray-500 shrink-0 w-14 text-right">${label}</span>
          <span class="text-[10px] text-gray-300 truncate">${item.name}</span>
        </div>
      `;
    } else {
      return `
        <div class="flex items-center gap-1.5 py-[3px] border-b border-gray-700/30 last:border-b-0 opacity-60
                    cursor-pointer hover:bg-gray-800/50 hover:opacity-100 transition-all eq-slot-clickable"
             data-char-id="${character.id}" data-slot-key="${slotKey}">
          <span class="w-6 h-6 flex items-center justify-center bg-gray-800/80 rounded text-[11px] shrink-0
                       border border-gray-700/40">—</span>
          <span class="text-[9px] text-gray-500 shrink-0 w-14 text-right">${label}</span>
          <span class="text-[10px] text-gray-600 truncate italic">未装備</span>
        </div>
      `;
    }
  }).join('');

  // ── Stat Badges ──
  const statsHTML = STAT_KEYS.map(s => `
    <div class="flex flex-col items-center justify-center bg-gray-800/60 rounded px-1 py-0.5
                border border-gray-700/40 min-w-0 flex-1">
      <span class="text-[7px] text-gray-500 leading-none font-medium">${s.label}</span>
      <span class="text-[10px] text-gray-200 font-bold leading-tight">${finalStats[s.key]}</span>
    </div>
  `).join('');

  // ── Card ──
  return `
    <div class="char-card bg-gray-900/70 backdrop-blur-sm border border-gray-700/50 rounded-lg p-2
                flex flex-col gap-1.5 transition-all duration-300 h-[340px]
                hover:border-gray-500/50 hover:shadow-lg hover:shadow-black/20">

      <!-- Row 1: Icon + Name & Level Info -->
      <div class="flex gap-2">
        <!-- Character Icon -->
        <div class="w-14 h-14 rounded-lg flex items-center justify-center shrink-0
                    shadow-md border border-white/10 overflow-hidden bg-gray-800
                    cursor-pointer hover:border-gray-400 transition-colors char-icon-clickable"
             data-char-id="${character.id}">
          <img src="${iconImage}" alt="${jobName}" class="w-full h-full object-contain pointer-events-none" />
        </div>

        <!-- Name & Level Info -->
        <div class="flex flex-col gap-[3px] flex-1 min-w-0 justify-center">
          <div class="text-[11px] text-gray-100 font-bold truncate">${name}
            <span class="text-[9px] text-gray-400 font-normal ml-1">${jobName}</span>
          </div>
          <div class="flex gap-1">
            <div class="flex-1 text-[10px] text-gray-200 bg-gray-800/70 rounded px-1 py-[2px] border border-gray-700/30 font-mono tracking-tight text-center">
              Lv ${level}
            </div>
            <div class="flex-1 text-[10px] text-gray-200 bg-gray-800/70 rounded px-1 py-[2px] border border-gray-700/30 font-mono tracking-tight text-center">
              JLv ${jobLevel}
            </div>
          </div>
          <div class="flex justify-between items-center text-[10px] text-yellow-400 bg-gray-800/70 rounded px-1.5 py-[2px] border border-gray-700/30 font-mono tracking-tight shadow-[inset_0_0_8px_rgba(234,179,8,0.1)]">
            <span>SP</span>
            <span class="font-bold text-[11px] drop-shadow-md">${sp}</span>
          </div>
        </div>
      </div>

      <!-- Row 2: HP / MP Bars -->
      <div class="grid grid-cols-2 gap-1">
        ${createStatusBar({ label: 'HP', current: hp.current, max: hp.max, ...BAR_COLORS.hp })}
        ${createStatusBar({ label: 'MP', current: mp.current, max: mp.max, ...BAR_COLORS.mp })}
      </div>

      <!-- Row 3: EXP / JP Bars -->
      <div class="grid grid-cols-2 gap-1">
        ${createStatusBar({ label: 'EXP', current: exp.current, max: exp.max, ...BAR_COLORS.exp })}
        ${createStatusBar({ label: 'JP', current: jp.current, max: jp.max, ...BAR_COLORS.jobExp })}
      </div>

      <!-- Row 4: Stats -->
      <div class="flex gap-[3px]">
        ${statsHTML}
      </div>

      <!-- Row 5: Equipment -->
      <div class="flex flex-col mt-0.5">
        ${equipmentHTML}
      </div>
    </div>
  `;
}

/**
 * Render an empty party slot placeholder.
 * @param {number} slotIndex - The slot number (1-based)
 * @returns {string} HTML string
 */
export function createEmptySlotCard(slotIndex) {
  return `
    <div class="char-card bg-gray-900/40 backdrop-blur-sm border border-dashed border-gray-700/40 rounded-lg p-2
                flex flex-col items-center justify-center gap-2 h-[340px]
                transition-all duration-300 hover:border-gray-600/50">
      <div class="w-14 h-14 rounded-lg flex items-center justify-center
                  bg-gray-800/30 border border-gray-700/30">
        <span class="material-symbols-outlined text-2xl text-gray-700">person_add</span>
      </div>
      <div class="text-center">
        <div class="text-[10px] text-gray-600 font-medium">パーティー ${slotIndex}</div>
        <div class="text-[8px] text-gray-700 mt-0.5">— 未加入 —</div>
      </div>
    </div>
  `;
}
