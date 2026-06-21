import { GameDB } from '../data/database.js';
import { DUNGEONS } from '../definitions/dungeons.js';
import { SPECIAL_DUNGEONS } from '../definitions/special_dungeons.js';
import { MONSTERS } from '../definitions/monsters.js';
import { MATERIALS } from '../definitions/materials.js';
import { MEDAL_RANKS } from '../definitions/medal-definitions.js';
import { JOBS } from '../jobs/index.js';
import { calcFinalStats } from '../data/stat-calculator.js';

const MONSTERS_MAP = new Map(MONSTERS.map(m => [m.id, m]));
const MATERIALS_MAP = new Map(MATERIALS.map(m => [m.id, m]));

export async function executeSkip(dungeonId, isSpecial, numSkips) {
  const dungeonList = isSpecial ? SPECIAL_DUNGEONS : DUNGEONS;
  const dungeon = dungeonList.find(d => d.id === dungeonId);
  if (!dungeon) return null;

  const cost = (dungeon.skipCost || 10000) * numSkips;
  let currentGold = await GameDB.getGameState('gold') || 0;
  if (currentGold < cost) return { error: 'Not enough gold' };

  // Deduct gold
  currentGold -= cost;

  let totalExp = 0;
  let totalJp = 0;
  let totalGold = 0;
  
  const drops = {};
  const captures = [];
  const defeatedMonsters = {};
  
  // Load necessary state
  let discoveredMonsters = await GameDB.getGameState('discovered_monsters') || [];
  let monsterKills = await GameDB.getGameState('monster_kills') || {};
  let playerMedals = await GameDB.getGameState('player_medals') || {};
  let ranchData = await GameDB.getGameState('ranch_data') || {};
  if (!ranchData[dungeonId]) ranchData[dungeonId] = {};
  
  const party = await GameDB.getAllCharacters();
  const equipment = await GameDB.getAllEquipment();
  const equipMap = new Map();
  equipment.forEach(e => equipMap.set(e.id, e));

  let stateNeedsSave = false;

  for (let i = 0; i < numSkips; i++) {
    for (const floor of dungeon.floors) {
      if (!floor.monsters || floor.monsters.length === 0) continue;

      // Pick encounter
      const totalWeight = floor.monsters.reduce((sum, e) => sum + e.weight, 0);
      let rand = Math.random() * totalWeight;
      let selectedEncounter = floor.monsters[0];
      for (const enc of floor.monsters) {
        rand -= enc.weight;
        if (rand <= 0) {
          selectedEncounter = enc;
          break;
        }
      }

      // Process enemies in encounter
      for (const [key, count] of Object.entries(selectedEncounter)) {
        if (key === 'weight') continue;
        const enemyDef = MONSTERS_MAP.get(key);
        if (!enemyDef) continue;

        for (let c = 0; c < count; c++) {
          const currentKills = monsterKills[enemyDef.id] || 0;
          const legAppRate = Math.min(1.0, 0.00001 + Math.floor(currentKills / 100) * 0.00001);
          const isLegendary = Math.random() < legAppRate;
          const trackingId = isLegendary ? `${enemyDef.id}_legendary` : enemyDef.id;

          let medalRankIndex = playerMedals[enemyDef.id] !== undefined ? playerMedals[enemyDef.id] : -1;
          const medalBonus = medalRankIndex >= 0 ? MEDAL_RANKS[medalRankIndex].killBonus : 0;
          const killsToAdd = 1 + medalBonus;

          defeatedMonsters[trackingId] = (defeatedMonsters[trackingId] || 0) + killsToAdd;

          if (!discoveredMonsters.includes(enemyDef.id)) {
            discoveredMonsters.push(enemyDef.id);
            stateNeedsSave = true;
          }
          
          monsterKills[enemyDef.id] = (monsterKills[enemyDef.id] || 0) + killsToAdd;
          stateNeedsSave = true;

          // Rewards
          if (enemyDef.rewards) {
            totalExp += enemyDef.rewards.exp || 0;
            totalJp += enemyDef.rewards.jp || 0;
            totalGold += enemyDef.rewards.gold || 0;
          }

          // Capture
          const captureRate = Math.min(1.0, 0.0001 + Math.floor(currentKills / 100) * 0.0001);
          if (Math.random() < captureRate) {
            if (!ranchData[dungeonId][trackingId]) {
              ranchData[dungeonId][trackingId] = { fedMaterials: 0, level: 0 };
              captures.push({ id: trackingId, name: isLegendary ? `伝説の${enemyDef.name}` : enemyDef.name });
              stateNeedsSave = true;
            }
          }

          // Drops
          if (enemyDef.drops) {
            const kills = monsterKills[enemyDef.id] || 0;
            const dropBonus = Math.floor(kills / 100) * 0.1;
            for (const drop of enemyDef.drops) {
              const adjustedRate = drop.rate + dropBonus;
              let dropCount = 0;
              if (enemyDef.isLegendary) {
                dropCount = 100;
              } else {
                dropCount = Math.floor(adjustedRate / 100);
                if (Math.random() * 100 <= (adjustedRate % 100)) {
                  dropCount += 1;
                }
                dropCount = Math.min(dropCount, 100);
              }

              if (dropCount > 0) {
                drops[drop.itemId] = (drops[drop.itemId] || 0) + dropCount;
              }
            }
          }
        }
      }
    }
  }

  // Apply Gold
  currentGold += totalGold;
  await GameDB.setGameState('gold', currentGold);

  // Apply Drops
  for (const [itemId, qty] of Object.entries(drops)) {
    const mat = MATERIALS_MAP.get(itemId);
    if (mat) {
      const currentItem = await GameDB.getInventoryItem(itemId) || { id: itemId, quantity: 0, type: 'material', ...mat };
      const newQuantity = currentItem.quantity + qty;
      if (newQuantity > 99999) {
        currentGold += (newQuantity - 99999);
        currentItem.quantity = 99999;
      } else {
        currentItem.quantity = newQuantity;
      }
      await GameDB.putInventoryItem(currentItem);
    }
  }
  // Save autoSellGold if any
  await GameDB.setGameState('gold', currentGold);

  // Apply EXP / JP
  if (totalExp > 0 || totalJp > 0) {
    for (const p of party) {
      if (!p.exp) p.exp = { current: 0, max: 100 };
      if (!p.jp) p.jp = { current: 0, max: 100 };
      
      p.exp.current += totalExp;
      p.jp.current += totalJp;

      let baseLevelUp = false;
      let jobLevelUp = false;

      // Level Up
      if (!p.exp.max || p.exp.max <= 0) p.exp.max = 10;
      let loopGuardExp = 0;
      while (p.exp.current >= p.exp.max && loopGuardExp++ < 10000) {
        p.exp.current -= p.exp.max;
        p.exp.max = Math.max(p.exp.max + 1, Math.floor(p.exp.max * 1.2));
        p.level = (p.level || 1) + 1;
        
        const jobGrowth = JOBS[p.jobId]?.statGrowth;
        if (jobGrowth) {
          const getGrowth = (val) => Array.isArray(val) ? Math.floor(Math.random() * (val[1] - val[0] + 1)) + val[0] : (val || 0);
          p.hp.max += getGrowth(jobGrowth.hp);
          p.mp.max += getGrowth(jobGrowth.mp);
          p.baseStats.atk += getGrowth(jobGrowth.atk);
          p.baseStats.def += getGrowth(jobGrowth.def);
          p.baseStats.matk += getGrowth(jobGrowth.matk);
          p.baseStats.mdef += getGrowth(jobGrowth.mdef);
          p.baseStats.spd += getGrowth(jobGrowth.spd);
        }
        baseLevelUp = true;
      }

      // Job Level Up
      if (!p.jp.max || p.jp.max <= 0) p.jp.max = 20;
      let loopGuardJp = 0;
      while (p.jp.current >= p.jp.max && loopGuardJp++ < 10000) {
        p.jp.current -= p.jp.max;
        p.jp.max = Math.max(p.jp.max + 1, Math.floor(p.jp.max * 1.2));
        p.jobLevel = (p.jobLevel || 1) + 1;
        p.sp = (p.sp || 0) + 1;
        jobLevelUp = true;
      }

      if (baseLevelUp || jobLevelUp) {
        p.stats = calcFinalStats(p, equipMap);
        p.hp.current = p.stats.hp;
        p.mp.current = p.stats.mp;
      }
      await GameDB.putCharacter(p);
    }
  }

  if (stateNeedsSave) {
    await GameDB.setGameState('discovered_monsters', discoveredMonsters);
    await GameDB.setGameState('monster_kills', monsterKills);
    await GameDB.setGameState('ranch_data', ranchData);
  }

  // format drop results for UI
  const dropResults = Object.entries(drops).map(([id, qty]) => {
    const mat = MATERIALS_MAP.get(id);
    return { name: mat?.name || id, image: mat?.image, quantity: qty };
  });

  const monstersResult = Object.entries(defeatedMonsters).map(([id, qty]) => {
    const isLegendary = id.endsWith('_legendary');
    const baseId = isLegendary ? id.replace('_legendary', '') : id;
    const m = MONSTERS_MAP.get(baseId);
    return { id, name: isLegendary ? `伝説の${m?.name}` : m?.name, image: m?.image, isLegendary, quantity: qty };
  });

  return {
    success: true,
    totalExp,
    totalJp,
    totalGold,
    cost,
    drops: dropResults,
    captures,
    monsters: monstersResult
  };
}
