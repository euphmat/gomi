import { getTreasureEffect } from '../data/treasure-manager.js';

export function getMedalCraftDiscountPercent() {
  return getTreasureEffect('medalCraftDiscountPercent');
}

export function getMedalCraftGoldCost(monster, rank, discountPercent = getMedalCraftDiscountPercent()) {
  const baseCost = Math.max(0, Number(monster?.rewards?.gold) || 0)
    * Math.max(0, Number(rank?.goldMultiplier) || 0);
  if (baseCost <= 0) return 0;
  const discount = Math.max(0, Math.min(100, Number(discountPercent) || 0));
  return Math.max(1, Math.ceil(baseCost * (1 - discount / 100)));
}

export function getMedalCraftMaterialCost(rank, discountPercent = getMedalCraftDiscountPercent()) {
  const baseCost = Math.max(0, Math.floor(Number(rank?.materialQty) || 0));
  if (baseCost <= 0) return 0;
  const discount = Math.max(0, Math.min(100, Number(discountPercent) || 0));
  return Math.max(1, Math.ceil(baseCost * (1 - discount / 100)));
}
