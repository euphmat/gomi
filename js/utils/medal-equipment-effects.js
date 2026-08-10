export function getEquippedMedalRewardItems(entity, equipmentMap) {
  if (!entity?.equipment || typeof equipmentMap?.get !== 'function') return [];
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

export function getEffectiveMedalEquipmentMpCost(entity, equipmentMap, baseMpCost) {
  const reduction = sumMedalEquipmentEffect(entity, equipmentMap, 'mpCostReductionPercent', 80);
  return Math.max(0, Math.floor((Number(baseMpCost) || 0) * (1 - reduction / 100)));
}

export function calculateMedalEquipmentIncomingDamage(
  entity,
  equipmentMap,
  rawDamage,
  { isMagic = null } = {}
) {
  const damage = Math.max(0, Number(rawDamage) || 0);
  if (damage <= 0 || !entity?.hp) return damage;

  let reduction = sumMedalEquipmentEffect(entity, equipmentMap, 'incomingDamageReductionPercent', 60);
  if (isMagic === true) {
    reduction += sumMedalEquipmentEffect(entity, equipmentMap, 'magicDamageReductionPercent', 50);
  } else if (isMagic === false) {
    reduction += sumMedalEquipmentEffect(entity, equipmentMap, 'physicalDamageReductionPercent', 50);
  }

  const maxHp = entity.stats?.hp || entity.hp.max || 1;
  if (entity.hp.current / maxHp <= .5) {
    reduction += sumMedalEquipmentEffect(entity, equipmentMap, 'lowHpDamageReductionPercent', 60);
  }
  if (entity.hp.current >= maxHp) {
    reduction += sumMedalEquipmentEffect(entity, equipmentMap, 'fullHpDamageReductionPercent', 60);
  }

  return Math.max(1, Math.floor(damage * (1 - Math.min(75, reduction) / 100)));
}

export function rollMedalEquipmentEffect(entity, equipmentMap, key, maximum = 100) {
  const chance = sumMedalEquipmentEffect(entity, equipmentMap, key, maximum);
  return chance > 0 && Math.random() * 100 < chance;
}
