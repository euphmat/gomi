/**

 * このファイルは「ステータス」画面の中身を作って表示するためのファイルです。
 * データベースからキャラクターの情報を読み込み、パーティーの情報を一覧で表示する役割を持っています。
 *
 * Status Page
 *
 * Displays a 2×2 grid of party member cards.
 * Filled slots show character status, empty slots show placeholder cards.
 * Maximum party size: 4
 */
import { createCharacterCard, createEmptySlotCard } from '../components/character-card.js';
import { GameDB } from '../data/database.js';
import { calcFinalStats, buildEquipmentMap, getEquippedItems, getCharactersWithRanchBonus } from '../data/stat-calculator.js';
import { showEquipmentModal } from '../components/equipment-modal.js';
import { STAT_KEYS } from '../data/constants.js';

const MAX_PARTY_SIZE = 4;

/**
 * Render the status page.
 * Returns a container element that will be populated asynchronously from IndexedDB.
 * @returns {HTMLElement}
 */
export function renderStatusPage() {
  const container = document.createElement('div');
  container.className = 'p-2';

  // Show loading state
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="animate-pulse text-gray-500 text-sm">読み込み中...</div>
    </div>
  `;

  // Load data from IndexedDB asynchronously
  _loadStatusData(container);

  return container;
}

/**
 * Load character and equipment data from IndexedDB and render cards.
 * @param {HTMLElement} container
 * @private
 */
async function _loadStatusData(container) {
  try {
    const [characters, allEquipment] = await Promise.all([
      getCharactersWithRanchBonus(),
      GameDB.getAllEquipment(),
    ]);

    const equipmentMap = buildEquipmentMap(allEquipment);

    const allEquippedIds = new Set();
    for (const c of characters) {
      Object.values(c.equipment || {}).forEach(id => {
        if (id) allEquippedIds.add(id);
      });
    }

    // Build cards: character cards + empty slot placeholders
    const cards = [];

    for (const char of characters) {
      const finalStats = calcFinalStats(char, equipmentMap);
      const equippedItems = getEquippedItems(char, equipmentMap);

      // Pre-calculate best equipment
      const otherEquippedIds = new Set(allEquippedIds);
      Object.values(char.equipment || {}).forEach(id => {
        if (id) otherEquippedIds.delete(id);
      });
      let availableItems = allEquipment.filter(eq => !otherEquippedIds.has(eq.id));
      const slots = ['rightHand', 'leftHand', 'armor', 'accessory1', 'accessory2'];
      let changed = false;
      const newEquipment = { ...(char.equipment || {}) };
      const changes = [];
      const oldEquipment = { ...(char.equipment || {}) };
      
      for (const slot of slots) {
        const validItems = availableItems.filter(eq => {
          if (slot.startsWith('accessory')) return eq.slot === 'accessory';
          return eq.slot === slot;
        });
        
        let bestItem = null;
        let bestScore = -Infinity;
        for (const item of validItems) {
          let score = 0;
          if (item.stats) {
            score += (item.stats.hp || 0) + (item.stats.mp || 0) + (item.stats.atk || 0) + (item.stats.def || 0) + (item.stats.matk || 0) + (item.stats.mdef || 0) + (item.stats.spd || 0);
          }
          if (score > bestScore || (score === bestScore && item.id === oldEquipment[slot])) {
            bestScore = score;
            bestItem = item;
          }
        }
        if (bestItem) {
          if (newEquipment[slot] !== bestItem.id) {
            const oldItem = oldEquipment[slot] ? equipmentMap.get(oldEquipment[slot]) : null;
            changes.push({ slot, oldItem, newItem: bestItem });
            newEquipment[slot] = bestItem.id;
            changed = true;
          }
          availableItems = availableItems.filter(eq => eq.id !== bestItem.id);
        } else {
          if (newEquipment[slot]) {
            const oldItem = equipmentMap.get(oldEquipment[slot]);
            changes.push({ slot, oldItem, newItem: null });
            newEquipment[slot] = null;
            changed = true;
          }
        }
      }

      const isAlreadyBest = !changed;
      char._bestEquipment = newEquipment;
      char._bestChanged = changed;
      char._bestChanges = changes;

      cards.push(createCharacterCard(char, finalStats, equippedItems, isAlreadyBest));
    }

    // Fill remaining slots with empty placeholders
    const emptyCount = MAX_PARTY_SIZE - characters.length;
    for (let i = 0; i < emptyCount; i++) {
      cards.push(createEmptySlotCard(characters.length + i + 1));
    }

    container.innerHTML = `
      <div class="grid grid-cols-2 gap-2">
        ${cards.join('')}
      </div>
    `;

    // Bind equipment modal click events
    const slotClickables = container.querySelectorAll('.eq-slot-clickable');
    slotClickables.forEach(el => {
      el.addEventListener('click', () => {
        const charId = parseInt(el.getAttribute('data-char-id'), 10);
        const slotKey = el.getAttribute('data-slot-key');
        const character = characters.find(c => c.id === charId);
        if (character && slotKey) {
          showEquipmentModal(character, slotKey, () => _loadStatusData(container));
        }
      });
    });

    // Bind character icon click events for detailed status modal
    const iconClickables = container.querySelectorAll('.char-icon-clickable');
    iconClickables.forEach(el => {
      el.addEventListener('click', () => {
        const charId = parseInt(el.getAttribute('data-char-id'), 10);
        const character = characters.find(c => c.id === charId);
        if (character) {
          const finalStats = calcFinalStats(character, equipmentMap);
          // Import dynamicly to avoid circular dependency issues if any
          import('../components/status-modal.js').then(module => {
            module.showDetailedStatusModal(character, finalStats, () => _loadStatusData(container));
          });
        }
      });
    });

    // Bind equip-best button events
    const equipBestBtns = container.querySelectorAll('.equip-best-btn');
    equipBestBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const charId = parseInt(btn.getAttribute('data-char-id'), 10);
        const character = characters.find(c => c.id === charId);
        if (!character) return;
        
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');

        const changed = character._bestChanged;
        const newEquipment = character._bestEquipment;
        const changes = character._bestChanges;

        if (!changed) {
          window.alert('すでに最強の装備構成です。');
          btn.disabled = false;
          btn.classList.remove('opacity-50', 'cursor-not-allowed');
          return;
        }

        const tempChar = { ...character, equipment: newEquipment };
        const oldStats = calcFinalStats(character, equipmentMap);
        const newStats = calcFinalStats(tempChar, equipmentMap);
        
        const buildStatDiff = (statKey, oldVal, newVal) => {
          const statDef = STAT_KEYS.find(s => s.key === statKey) || { label: statKey, icon: '', color: 'text-gray-400' };
          const labelHtml = `
            <div class="flex items-center gap-1 w-14 shrink-0">
              <span class="material-symbols-outlined !text-[12px] ${statDef.color}" style="font-variation-settings: 'FILL' 1">${statDef.icon}</span>
              <span class="text-gray-300 font-bold tracking-wider">${statDef.label}</span>
            </div>
          `;
          if (oldVal === newVal) {
            return `<div class="flex items-center text-[11px]">${labelHtml}<div class="flex-1 flex justify-end items-center gap-1.5"><span class="text-gray-500 font-mono w-6 text-right">${oldVal}</span> <span class="material-symbols-outlined !text-[10px] opacity-50">arrow_forward</span> <span class="text-gray-500 font-mono w-6 text-right">${newVal}</span><span class="w-10"></span></div></div>`;
          } else if (newVal > oldVal) {
            return `<div class="flex items-center text-[11px]">${labelHtml}<div class="flex-1 flex justify-end items-center gap-1.5"><span class="text-gray-300 font-mono w-6 text-right">${oldVal}</span> <span class="material-symbols-outlined !text-[10px] text-green-400">arrow_forward</span> <span class="text-green-400 font-bold font-mono w-6 text-right">${newVal}</span><span class="text-green-400 font-bold text-[9px] w-10 text-left">(+${newVal - oldVal})</span></div></div>`;
          } else {
            return `<div class="flex items-center text-[11px]">${labelHtml}<div class="flex-1 flex justify-end items-center gap-1.5"><span class="text-gray-300 font-mono w-6 text-right">${oldVal}</span> <span class="material-symbols-outlined !text-[10px] text-red-400">arrow_forward</span> <span class="text-red-400 font-bold font-mono w-6 text-right">${newVal}</span><span class="text-red-400 font-bold text-[9px] w-10 text-left">(${newVal - oldVal})</span></div></div>`;
          }
        };

        const eqNames = { rightHand: '右手', leftHand: '左手', armor: '防具', accessory1: '装飾品1', accessory2: '装飾品2' };
        
        const renderItemIcon = (item) => {
          if (!item) return `<span class="material-symbols-outlined !text-[16px] text-gray-500">remove</span>`;
          if (item.image) {
            return `<img src="${item.image}" class="w-6 h-6 object-contain drop-shadow-sm" alt="" onerror="this.style.display='none'" />`;
          }
          return `<span class="material-symbols-outlined !text-[16px] text-gray-300">${item.icon}</span>`;
        };

        let equipChangesHTML = changes.map(c => `
          <div class="flex items-center py-1.5 border-b border-gray-700/50 last:border-0 bg-gray-800/30 px-1 rounded-sm my-0.5">
            <span class="text-[10px] text-gray-400 w-12 shrink-0 text-center">${eqNames[c.slot]}</span>
            <div class="flex-1 flex items-center gap-1">
              <div class="flex items-center gap-1.5 flex-1 w-0 opacity-50 line-through">
                <span class="w-7 h-7 flex items-center justify-center bg-gray-800 rounded border border-gray-600/50 shrink-0">
                  ${renderItemIcon(c.oldItem)}
                </span>
                <span class="text-gray-400 text-[10px] leading-tight break-words">${c.oldItem ? c.oldItem.name : '未装備'}</span>
              </div>
              <span class="material-symbols-outlined !text-[14px] text-indigo-400 shrink-0 px-0.5">arrow_forward</span>
              <div class="flex items-center gap-1.5 flex-1 w-0">
                <span class="w-7 h-7 flex items-center justify-center bg-gray-800 rounded border border-indigo-500/50 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.2)]">
                  ${renderItemIcon(c.newItem)}
                </span>
                <span class="text-indigo-300 font-bold text-[10px] leading-tight break-words drop-shadow-md">${c.newItem ? c.newItem.name : '未装備'}</span>
              </div>
            </div>
          </div>
        `).join('');

        const confirmOverlay = document.createElement('div');
        confirmOverlay.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fade-in_0.2s_ease-out] p-4';
        confirmOverlay.innerHTML = `
          <div class="bg-gray-900 border border-gray-600 rounded-xl p-4 w-full max-w-sm shadow-2xl flex flex-col gap-3">
            <div class="text-gray-100 font-bold text-center border-b border-gray-700 pb-2">最強装備に変更しますか？</div>
            
            <div class="flex flex-col gap-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
              <div class="bg-gray-800/50 rounded p-2 border border-gray-700/50">
                <div class="text-[10px] text-indigo-300 font-bold mb-1.5 border-b border-gray-700/50 pb-0.5">【装備の変更】</div>
                ${equipChangesHTML}
              </div>
              
              <div class="bg-gray-800/50 rounded p-2 border border-gray-700/50 flex flex-col gap-1.5">
                <div class="text-[10px] text-green-300 font-bold mb-1 border-b border-gray-700/50 pb-0.5">【ステータス変化】</div>
                ${buildStatDiff('hp', oldStats.hp, newStats.hp)}
                ${buildStatDiff('mp', oldStats.mp, newStats.mp)}
                ${buildStatDiff('atk', oldStats.atk, newStats.atk)}
                ${buildStatDiff('def', oldStats.def, newStats.def)}
                ${buildStatDiff('matk', oldStats.matk, newStats.matk)}
                ${buildStatDiff('mdef', oldStats.mdef, newStats.mdef)}
                ${buildStatDiff('spd', oldStats.spd, newStats.spd)}
              </div>
            </div>

            <div class="flex gap-3 mt-2">
              <button id="btn-cancel" class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm font-bold transition-colors">キャンセル</button>
              <button id="btn-confirm" class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-bold transition-colors shadow-lg shadow-indigo-900/50">変更する</button>
            </div>
          </div>
        `;
        document.body.appendChild(confirmOverlay);

        confirmOverlay.querySelector('#btn-cancel').addEventListener('click', () => {
          confirmOverlay.remove();
          btn.disabled = false;
          btn.classList.remove('opacity-50', 'cursor-not-allowed');
        });

        confirmOverlay.querySelector('#btn-confirm').addEventListener('click', async () => {
          confirmOverlay.remove();
          character.equipment = newEquipment;
          await GameDB.putCharacter(character);
          _loadStatusData(container);
        });
      });
    });

  } catch (error) {
    console.error('[StatusPage] Failed to load data:', error);
    container.innerHTML = `
      <div class="flex items-center justify-center py-12">
        <div class="text-red-400 text-sm">データの読み込みに失敗しました</div>
      </div>
    `;
  }
}
