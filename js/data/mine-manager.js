import { GameDB } from './database.js';
import { MINES, MINE_MAX_UPGRADE_LEVEL, getMineStats, getMineUpgradeCost } from '../definitions/mines.js';
import { notifyGameEvent } from '../utils/game-notifications.js';
import { getTreasureEffect, loadTreasureLevels } from './treasure-manager.js';

const STATE_KEY = 'mine_data';

export function createMineState(now = Date.now()) {
  return { unlocked: false, machineLevel: 1, yieldLevel: 1, capacityLevel: 1, storedGold: 0, lastAccruedAt: now, maxNotified: false };
}

export function accrueMine(mine, state, now = Date.now()) {
  if (!state.unlocked) return state;
  if (!Number.isFinite(state.lastAccruedAt) || state.lastAccruedAt <= 0 || state.lastAccruedAt > now) {
    state.lastAccruedAt = now;
    return state;
  }
  const stats = getMineStats(mine, state);
  const elapsedSeconds = (now - state.lastAccruedAt) / 1000;
  if (elapsedSeconds <= 0) return state;
  const storedGold = Math.max(0, state.storedGold || 0);
  // 旧仕様で新上限を超えていた蓄積Goldは失わせず、回収されるまでそのまま保持する。
  state.storedGold = storedGold >= stats.maxStoredGold
    ? storedGold
    : Math.min(stats.maxStoredGold, storedGold + elapsedSeconds * stats.goldPerSecond);
  if (state.storedGold >= stats.maxStoredGold && !state.maxNotified) {
    state.maxNotified = true;
    notifyGameEvent('鉱山の蓄積完了', `${mine.name}の蓄積量がMAXになりました！`, `mine-max-${mine.id}`);
  }
  state.lastAccruedAt = now;
  return state;
}

export async function loadMineData(now = Date.now()) {
  await loadTreasureLevels();
  const saved = await GameDB.getGameState(STATE_KEY) || {};
  const data = {};
  let changed = false;
  for (const mine of MINES) {
    const original = saved[mine.id];
    data[mine.id] = { ...createMineState(now), ...(original || {}) };
    // 旧「採掘速度」レベルを同値の「採掘機」レベルへ一度だけ移行する。
    if (!Number.isFinite(original?.machineLevel) && Number.isFinite(original?.intervalLevel)) {
      data[mine.id].machineLevel = original.intervalLevel;
    }
    delete data[mine.id].intervalLevel;
    // 廃止済みの魚油ブースト時間は引き継がず、保存データからも除去する。
    delete data[mine.id].fuelUntil;
    accrueMine(mine, data[mine.id], now);
    if (!original || JSON.stringify(original) !== JSON.stringify(data[mine.id])) changed = true;
  }
  if (changed) await GameDB.setGameState(STATE_KEY, data);
  return data;
}

/**
 * アプリ起動時の放置採掘同期。
 * 未回収Goldをmine_dataへ反映するだけで、所持Goldへの回収は行わない。
 */
export async function syncMineOfflineProgress(now = Date.now()) {
  return loadMineData(now);
}

export async function unlockMine(mineId) {
  const mineIndex = MINES.findIndex(item => item.id === mineId);
  const mine = MINES[mineIndex];
  if (!mine) throw new Error('鉱山が見つかりません。');
  const data = await loadMineData();
  const prism = await GameDB.getGameState('prism') || 0;
  if (data[mineId].unlocked) return { data, prism };
  const lockedLowerMine = MINES.slice(0, mineIndex).find(item => !data[item.id]?.unlocked);
  if (lockedLowerMine) throw new Error(`先に${lockedLowerMine.name}を解放してください。`);
  if (prism < mine.unlockPrism) throw new Error('Prismが足りません。');
  const unlockInventory = await Promise.all(
    mine.unlockMaterials.map(cost => GameDB.getInventoryItem(cost.materialId))
  );
  const missingMaterial = mine.unlockMaterials.find((cost, index) =>
    (unlockInventory[index]?.quantity || 0) < cost.amount
  );
  if (missingMaterial) throw new Error('解放素材が足りません。');

  await Promise.all(unlockInventory.map((item, index) => {
    item.quantity -= mine.unlockMaterials[index].amount;
    return item.quantity <= 0
      ? GameDB.deleteInventoryItem(item.id)
      : GameDB.putInventoryItem(item);
  }));
  data[mineId].unlocked = true;
  data[mineId].lastAccruedAt = Date.now();
  await GameDB.setGameState('prism', prism - mine.unlockPrism);
  await GameDB.setGameState(STATE_KEY, data);
  window.dispatchEvent(new CustomEvent('quest:mine-unlock', { detail: { mineId } }));
  return { data, prism: prism - mine.unlockPrism };
}

export async function claimMineGold(mineId) {
  const mine = MINES.find(item => item.id === mineId);
  if (!mine) throw new Error('鉱山が見つかりません。');
  const data = await loadMineData();
  const state = data[mineId];
  const storedAmount = Math.floor(state.storedGold || 0);
  if (!state.unlocked || storedAmount <= 0) throw new Error('回収できるGoldがありません。');
  const amount = Math.floor(storedAmount * (1 + getTreasureEffect('mineGoldPercent') / 100));
  const gold = await GameDB.getGameState('gold') || 0;
  // 1 Gold未満の端数は鉱山に残し、所持Goldを常に整数に保つ。
  state.storedGold -= storedAmount;
  state.maxNotified = false;
  state.lastAccruedAt = Date.now();
  await GameDB.setGameState('gold', gold + amount);
  await GameDB.setGameState(STATE_KEY, data);
  return { data, amount, gold: gold + amount };
}

export async function upgradeMine(mineId, type) {
  const mine = MINES.find(item => item.id === mineId);
  if (!mine || !['machine', 'yield', 'capacity'].includes(type)) throw new Error('強化対象が不正です。');
  const data = await loadMineData();
  const state = data[mineId];
  if (!state.unlocked) throw new Error('鉱山が未解放です。');
  const levelKey = `${type}Level`;
  if (state[levelKey] >= MINE_MAX_UPGRADE_LEVEL) throw new Error('最大レベルです。');
  const cost = getMineUpgradeCost(mine, type, state[levelKey]);
  const [inventoryItem, gold] = await Promise.all([GameDB.getInventoryItem(cost.materialId), GameDB.getGameState('gold')]);
  if (!inventoryItem || inventoryItem.quantity < cost.materialAmount) throw new Error('強化素材が足りません。');
  if ((gold || 0) < cost.gold) throw new Error('Goldが足りません。');

  inventoryItem.quantity -= cost.materialAmount;
  if (inventoryItem.quantity <= 0) await GameDB.deleteInventoryItem(inventoryItem.id);
  else await GameDB.putInventoryItem(inventoryItem);
  await GameDB.setGameState('gold', (gold || 0) - cost.gold);
  state[levelKey] += 1;
  // すべての強化で上限は維持または増加するため、既存蓄積Goldはそのまま保持する。
  if (state.storedGold < getMineStats(mine, state).maxStoredGold) state.maxNotified = false;
  await GameDB.setGameState(STATE_KEY, data);
  window.dispatchEvent(new CustomEvent('quest:mine-upgrade', {
    detail: { mineId, upgradeType: type, count: 1 }
  }));
  return { data, gold: (gold || 0) - cost.gold };
}
