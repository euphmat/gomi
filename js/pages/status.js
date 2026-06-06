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
import { calcFinalStats, buildEquipmentMap, getEquippedItems } from '../data/stat-calculator.js';
import { showEquipmentModal } from '../components/equipment-modal.js';

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
      GameDB.getAllCharacters(),
      GameDB.getAllEquipment(),
    ]);

    const equipmentMap = buildEquipmentMap(allEquipment);

    // Build cards: character cards + empty slot placeholders
    const cards = [];

    for (const char of characters) {
      const finalStats = calcFinalStats(char, equipmentMap);
      const equippedItems = getEquippedItems(char, equipmentMap);
      cards.push(createCharacterCard(char, finalStats, equippedItems));
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

  } catch (error) {
    console.error('[StatusPage] Failed to load data:', error);
    container.innerHTML = `
      <div class="flex items-center justify-center py-12">
        <div class="text-red-400 text-sm">データの読み込みに失敗しました</div>
      </div>
    `;
  }
}
