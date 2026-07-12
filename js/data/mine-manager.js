import { GameDB } from './database.js';
import { MINES, MINE_MAX_UPGRADE_LEVEL, getMineStats, getMineUpgradeCost } from '../definitions/mines.js';

const STATE_KEY = 'mine_data';

export function createMineState(now = Date.now()) {
  return { unlocked: false, intervalLevel: 1, yieldLevel: 1, capacityLevel: 1, storedGold: 0, lastAccruedAt: now };
}

export function accrueMine(mine, state, now = Date.now()) {
  if (!state.unlocked) return state;
  if (!Number.isFinite(state.lastAccruedAt) || state.lastAccruedAt <= 0 || state.lastAccruedAt > now) {
    state.lastAccruedAt = now;
    return state;
  }
  const stats = getMineStats(mine, state);
  const elapsed = now - state.lastAccruedAt;
  const cycles = Math.floor(elapsed / stats.intervalMs);
  if (cycles <= 0) return state;
  state.storedGold = Math.min(stats.maxStoredGold, (state.storedGold || 0) + cycles * stats.goldPerCycle);
  state.lastAccruedAt = state.storedGold >= stats.maxStoredGold
    ? now
    : (state.lastAccruedAt || now) + cycles * stats.intervalMs;
  return state;
}

export async function loadMineData(now = Date.now()) {
  const saved = await GameDB.getGameState(STATE_KEY) || {};
  const data = {};
  let changed = false;
  for (const mine of MINES) {
    const original = saved[mine.id];
    data[mine.id] = { ...createMineState(now), ...(original || {}) };
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
  if (!state.unlocked || state.storedGold <= 0) throw new Error('回収できるGoldがありません。');
  const amount = state.storedGold;
  const gold = await GameDB.getGameState('gold') || 0;
  state.storedGold = 0;
  state.lastAccruedAt = Date.now();
  await GameDB.setGameState('gold', gold + amount);
  await GameDB.setGameState(STATE_KEY, data);
  return { data, amount, gold: gold + amount };
}

export async function upgradeMine(mineId, type) {
  const mine = MINES.find(item => item.id === mineId);
  if (!mine || !['interval', 'yield', 'capacity'].includes(type)) throw new Error('強化対象が不正です。');
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
  // 産出量強化で上限も増えるため、既存蓄積を新しい上限内に収める。
  state.storedGold = Math.min(state.storedGold, getMineStats(mine, state).maxStoredGold);
  await GameDB.setGameState(STATE_KEY, data);
  window.dispatchEvent(new CustomEvent('quest:mine-upgrade', {
    detail: { mineId, upgradeType: type, count: 1 }
  }));
  return { data, gold: (gold || 0) - cost.gold };
}
