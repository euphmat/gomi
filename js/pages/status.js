/**
 * Status Page
 * 
 * Displays a 2×2 grid of character cards showing
 * the full party status overview.
 */
import { createCharacterCard } from '../components/character-card.js';
import { characters } from '../data/mock-data.js';

/**
 * Render the status page.
 * @returns {string} HTML string
 */
export function renderStatusPage() {
  const cardsHTML = characters
    .map(char => createCharacterCard(char))
    .join('');

  return `
    <div class="grid grid-cols-2 gap-2 p-2">
      ${cardsHTML}
    </div>
  `;
}
