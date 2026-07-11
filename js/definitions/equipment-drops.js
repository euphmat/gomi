import { WEAPONS } from './weapons.js';
import { ARMORS } from './armors.js';
import { SHIELDS } from './shields.js';
import { ACCESSORIES } from './accessories.js';

/** Percentage chance rolled independently for every defeated monster. */
export const EQUIPMENT_DROP_RATE = 0.001;

const CRAFTABLE_EQUIPMENT = [
  ...WEAPONS,
  ...ARMORS,
  ...SHIELDS,
  ...ACCESSORIES,
].filter(item => item.recipe?.materials?.length > 0);

/**
 * Returns equipment whose recipe can be made entirely from a monster's drops.
 * Keeping this relationship recipe-driven means newly added monsters and
 * equipment participate automatically without a monster/equipment ID table.
 */
export function getEquipmentDropsForMonster(monster) {
  const materialIds = new Set((monster.drops || []).map(drop => drop.itemId));
  return CRAFTABLE_EQUIPMENT.filter(item =>
    item.recipe.materials.every(material => materialIds.has(material.id))
  );
}
