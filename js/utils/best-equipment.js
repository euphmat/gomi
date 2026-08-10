const EQUIPMENT_SLOT_KEYS = ['rightHand', 'leftHand', 'armor', 'accessory1', 'accessory2'];

export const BEST_EQUIPMENT_FOCUSES = ['overall', 'physical', 'magic', 'defense', 'speed'];

function getItemScore(item, focus) {
  const stats = item.stats || {};
  const overallScore = (stats.hp || 0)
    + (stats.mp || 0)
    + (stats.atk || 0)
    + (stats.def || 0)
    + (stats.matk || 0)
    + (stats.mdef || 0)
    + (stats.spd || 0);

  let focusScore = overallScore;
  if (focus === 'physical') {
    focusScore = stats.atk || 0;
  } else if (focus === 'magic') {
    focusScore = (stats.matk || 0) + (stats.mp || 0);
  } else if (focus === 'defense') {
    focusScore = (stats.hp || 0) + (stats.def || 0) + (stats.mdef || 0);
  } else if (focus === 'speed') {
    focusScore = stats.spd || 0;
  }

  // 重視ステータスを最優先し、同値の場合は総合値をタイブレーカーにする。
  return focusScore * 1000000 + overallScore;
}

/**
 * 最強装備の候補を重視ステータス別に計算する。
 * equipmentLocks が true のスロットは現在の装備を維持する。
 */
export function calculateBestEquipmentResults(character, allEquipment, equipmentMap, allEquippedIds) {
  const results = {};
  let anyChanged = false;

  for (const focus of BEST_EQUIPMENT_FOCUSES) {
    const otherEquippedIds = new Set(allEquippedIds);
    Object.values(character.equipment || {}).forEach(id => {
      if (id) otherEquippedIds.delete(id);
    });

    const lockedEquipmentIds = new Set();
    for (const slot of EQUIPMENT_SLOT_KEYS) {
      if (!character.equipmentLocks?.[slot]) continue;
      const equipmentId = character.equipment?.[slot];
      if (equipmentId) lockedEquipmentIds.add(equipmentId);
    }

    let availableItems = allEquipment.filter(item => (
      !otherEquippedIds.has(item.id) && !lockedEquipmentIds.has(item.id)
    ));
    const oldEquipment = { ...(character.equipment || {}) };
    const newEquipment = { ...oldEquipment };
    const changes = [];

    for (const slot of EQUIPMENT_SLOT_KEYS) {
      if (character.equipmentLocks?.[slot]) continue;

      const validItems = availableItems.filter(item => {
        if (slot.startsWith('accessory')) return item.slot === 'accessory';
        return item.slot === slot;
      });

      let bestItem = null;
      let bestScore = -Infinity;
      for (const item of validItems) {
        const score = getItemScore(item, focus);
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
        }
        availableItems = availableItems.filter(item => item.id !== bestItem.id);
      } else if (newEquipment[slot]) {
        changes.push({
          slot,
          oldItem: equipmentMap.get(oldEquipment[slot]) || null,
          newItem: null,
        });
        newEquipment[slot] = null;
      }
    }

    const changed = changes.length > 0;
    results[focus] = { newEquipment, changes, changed };
    if (changed) anyChanged = true;
  }

  return { results, anyChanged };
}
