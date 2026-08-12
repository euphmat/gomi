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
import { formatNumber } from '../utils/format.js';
import { isMedalShopEquipment } from '../utils/medal-equipment-scaling.js';

/**
 * Render a character card.
 * @param {Object} character - Character data from DB
 * @param {Object} finalStats - Computed final stats { atk, def, matk, mdef, spd }
 * @param {Array<{ slotKey: string, item: Object|null }>} equippedItems - Resolved equipment
 * @returns {string} HTML string
 */
export function createCharacterCard(character, finalStats, equippedItems, isAlreadyBest = false) {
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
    const isLocked = Boolean(character.equipmentLocks?.[slotKey]);
    const lockButton = `
      <button type="button"
              class="equipment-lock-btn flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors ${isLocked ? 'bg-amber-500/15 text-amber-300 active:bg-amber-500/25' : 'text-gray-600 active:bg-gray-800/70 active:text-gray-300'}"
              aria-label="${label}の自動装備ロックを${isLocked ? '解除' : '設定'}"
              aria-pressed="${isLocked}"
              data-char-id="${character.id}" data-slot-key="${slotKey}">
        <span class="material-symbols-outlined pointer-events-none text-[15px]" style="font-variation-settings: 'FILL' ${isLocked ? 1 : 0}">${isLocked ? 'lock' : 'lock_open'}</span>
      </button>
    `;
    if (item) {
      const isMedalEquipment = isMedalShopEquipment(item);
      const slotClasses = isMedalEquipment
        ? 'rounded-md border border-yellow-200/40 bg-yellow-100/10 shadow-[inset_0_0_10px_rgba(254,240,138,0.08)]'
        : 'border-b border-gray-700/30 last:border-b-0';
      const iconClasses = isMedalEquipment
        ? 'bg-yellow-100/10 border-yellow-200/35'
        : 'bg-gray-800/80 border-gray-700/40';
      return `
        <div class="flex h-8 w-full shrink-0 items-center ${slotClasses}">
          <button type="button" class="flex h-full min-w-0 flex-1 items-center gap-1.5 py-[3px]
                      cursor-pointer transition-colors active:bg-gray-800/50 eq-slot-clickable text-left"
               aria-label="${label}: ${isMedalEquipment ? 'メダル装備 ' : ''}${item.name}を変更"
               ${isMedalEquipment ? 'data-medal-equipment="true"' : ''}
               data-char-id="${character.id}" data-slot-key="${slotKey}">
            <span class="w-6 h-6 flex items-center justify-center rounded shrink-0 overflow-hidden
                         border ${iconClasses}">
              ${item.image
                ? `<img src="${item.image}" class="w-[90%] h-[90%] object-contain drop-shadow-sm" alt=""  onerror="this.style.display='none'" />`
                : `<span class="material-symbols-outlined text-[14px] text-gray-300">${item.icon}</span>`
              }
            </span>
            <span class="min-w-0 truncate text-[10px] text-gray-300">${item.name}</span>
          </button>
          ${lockButton}
        </div>
      `;
    } else {
      return `
        <div class="flex h-8 w-full shrink-0 items-center border-b border-gray-700/30 last:border-b-0">
          <button type="button" class="flex h-full min-w-0 flex-1 items-center gap-1.5 py-[3px] opacity-60
                      cursor-pointer active:bg-gray-800/50 active:opacity-100 transition-all eq-slot-clickable text-left"
               aria-label="${label}: 未装備。装備を選択"
               data-char-id="${character.id}" data-slot-key="${slotKey}">
            <span class="w-6 h-6 flex items-center justify-center bg-gray-800/80 rounded text-[11px] shrink-0
                         border border-gray-700/40">—</span>
            <span class="min-w-0 truncate text-[10px] text-gray-600 italic">未装備</span>
          </button>
          ${lockButton}
        </div>
      `;
    }
  }).join('');

  // ── Stat Badges ──
  const statsHTML = STAT_KEYS.filter(s => s.key !== 'hp' && s.key !== 'mp').map(s => `
    <div class="flex flex-col items-center flex-1 min-w-0 bg-gradient-to-b from-gray-800/80 to-gray-900/90 rounded-lg py-[3px] border border-gray-700/50 shadow-inner">
      <div class="flex items-center justify-center gap-[1px] w-full">
        <span class="material-symbols-outlined ${s.color}" style="font-size: 10px; font-variation-settings: 'FILL' 1">${s.icon}</span>
        <span class="text-[7px] text-gray-300 font-bold tracking-wider leading-none">${s.label}</span>
      </div>
      <span class="max-w-full truncate text-[11px] font-black tabular-nums text-gray-100 leading-none mt-0.5 drop-shadow-md" title="${formatNumber(finalStats[s.key])}">${formatNumber(finalStats[s.key])}</span>
    </div>
  `).join('');

  // ── Card ──
  return `
    <div class="char-card bg-gray-900/70 backdrop-blur-sm border border-gray-700/50 rounded-lg p-2
                flex flex-col gap-1.5 transition-all duration-300 min-h-[330px]
                active:border-gray-500/50 active:shadow-lg active:shadow-black/20">

      <!-- Row 1: Icon + Name & Level Info -->
      <div class="flex gap-2">
        <!-- Character Icon -->
        <button type="button" class="char-avatar w-14 h-14 rounded-lg flex items-center justify-center shrink-0
                    shadow-md border border-white/10 overflow-hidden bg-gray-800
                    cursor-pointer active:border-gray-400 transition-colors char-icon-clickable"
             aria-label="${name}の詳細ステータスを開く"
             data-char-id="${character.id}">
          <img src="${iconImage}" alt="" class="w-full h-full object-contain pointer-events-none"  onerror="this.style.display='none'" />
        </button>

        <!-- Name & Level Info -->
        <div class="flex flex-col gap-[3px] flex-1 min-w-0 justify-center">
          <div class="text-[11px] text-gray-100 font-bold truncate">${name}
            <span class="text-[9px] text-gray-400 font-normal ml-1">${jobName}</span>
          </div>
          <div class="flex gap-1">
            <div class="flex-1 text-[10px] font-bold text-orange-300 bg-orange-900/40 rounded px-1 py-[2px] border border-orange-500/30 font-mono tracking-tight text-center shadow-inner">
              Lv ${level}
            </div>
            <div class="flex-1 text-[10px] font-bold text-pink-300 bg-pink-900/40 rounded px-1 py-[2px] border border-pink-500/30 font-mono tracking-tight text-center shadow-inner">
              JLv ${jobLevel}
            </div>
          </div>
          <div class="flex gap-1">
            <div class="flex-1 flex justify-between items-center text-[10px] text-yellow-400 bg-gray-800/70 rounded px-1.5 py-[2px] border border-gray-700/30 font-mono tracking-tight shadow-[inset_0_0_8px_rgba(234,179,8,0.1)]">
              <span>SP</span>
              <span class="font-bold text-[11px] drop-shadow-md">${sp}</span>
            </div>
            <button type="button" class="h-8 px-2 py-[2px] ${isAlreadyBest ? 'bg-gray-700/50 text-gray-500 border-gray-600/30 cursor-not-allowed' : 'bg-indigo-600/80 active:bg-indigo-500 text-white border-indigo-500/50 cursor-pointer shadow'} rounded text-[9px] font-bold transition-colors border shrink-0 equip-best-btn" data-char-id="${character.id}" ${isAlreadyBest ? 'disabled' : ''}>
              最強装備
            </button>
          </div>
        </div>
      </div>

      <!-- Row 2: HP / MP Bars -->
      <div class="grid grid-cols-2 gap-1">
        ${createStatusBar({ label: 'HP', current: hp.current, max: finalStats.hp || hp.max, ...BAR_COLORS.hp })}
        ${createStatusBar({ label: 'MP', current: mp.current, max: finalStats.mp || mp.max, ...BAR_COLORS.mp })}
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
                flex flex-col items-center justify-center gap-2 min-h-[330px]
                transition-all duration-300 active:border-gray-600/50">
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
