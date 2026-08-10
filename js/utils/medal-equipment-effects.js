export function getEquippedMedalRewardItems(entity, equipmentMap) {
  if (!entity?.equipment || !equipmentMap) return [];
  return ['rightHand', 'leftHand', 'armor', 'accessory1', 'accessory2']
    .map(slot => equipmentMap.get(entity.equipment[slot]))
    .filter(item => item?.specialEffect);
}

export function getMedalEquipmentEffects(entity, equipmentMap) {
  return getEquippedMedalRewardItems(entity, equipmentMap).map(item => item.specialEffect);
}

export function sumMedalEquipmentEffect(entity, equipmentMap, key, maximum = Infinity) {
  const total = getMedalEquipmentEffects(entity, equipmentMap)
    .reduce((sum, effect) => sum + (Number(effect?.[key]) || 0), 0);
  return Math.min(maximum, total);
}

export function hasMedalEquipmentImmunity(entity, equipmentMap, ailment) {
  return getMedalEquipmentEffects(entity, equipmentMap)
    .some(effect => Array.isArray(effect.ailmentImmunities) && effect.ailmentImmunities.includes(ailment));
}

export function rollMedalEquipmentEffect(entity, equipmentMap, key, maximum = 100) {
  const chance = sumMedalEquipmentEffect(entity, equipmentMap, key, maximum);
  return chance > 0 && Math.random() * 100 < chance;
}
