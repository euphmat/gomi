const assert = require('assert');

const character = {
  id: 1,
  equipment: {
    accessory1: 'slime_blue_ring_aaa',
    accessory2: null
  }
};

const equippedIds = Object.values(character.equipment).filter(id => id !== null);

const availableItems = [
  { id: 'slime_blue_ring_aaa', slot: 'accessory' },
  { id: 'slime_blue_ring_bbb', slot: 'accessory' },
  { id: 'slime_blue_ring_ccc', slot: 'accessory' },
];

function getBaseId(item) {
  const id = item.id;
  const lastUnderscore = id.lastIndexOf('_');
  if (lastUnderscore > 0) {
    const suffix = id.substring(lastUnderscore + 1);
    if (suffix.length >= 2) {
      return id.substring(0, lastUnderscore);
    }
  }
  return id;
}

const groupMap = new Map();
for (const item of availableItems) {
  const baseId = getBaseId(item);
  if (!groupMap.has(baseId)) {
    groupMap.set(baseId, {
      baseId,
      instances: [item],
    });
  } else {
    groupMap.get(baseId).instances.push(item);
  }
}

const groupedItems = Array.from(groupMap.values());
const selectedGroup = groupedItems[0];
const targetSlot = 'accessory2';

const isCurrentlyEquipped = selectedGroup.instances.some(i => i.id === character.equipment[targetSlot]);
const freeInstance = selectedGroup.instances.find(i => !equippedIds.includes(i.id));

console.log("isCurrentlyEquipped:", isCurrentlyEquipped);
console.log("freeInstance:", freeInstance);

