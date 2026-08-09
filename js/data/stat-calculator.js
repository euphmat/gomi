/**

 * このファイルはキャラクターの最終的な強さ（ステータス）を計算するファイルです。
 * 基本ステータスに装備の能力を足し合わせる計算などを行います。
 *
 * Stat Calculator
 *
 * Computes final character stats by combining:
 *   1. Base stats (from character level/class)
 *   2. Equipment bonuses (from equipped items)
 *   3. Modifier bonuses (from passive skills, buffs, etc.)
 *
 * Formula:
 *   finalStat = baseStat + Σ(equipment.stats) + Σ(modifier.stats)
 */

import { STAT_KEYS } from './constants.js';
import { JOBS } from '../jobs/index.js';
import { GameDB } from './database.js';
import { MONSTERS } from '../definitions/monsters.js';
import { WEAPONS } from '../definitions/weapons.js';
import { ARMORS } from '../definitions/armors.js';
import { SHIELDS } from '../definitions/shields.js';
import { ACCESSORIES } from '../definitions/accessories.js';
import { FISH } from '../definitions/fish.js';
import { resolveJobSkillLevelConfig } from '../utils/job-skill-potency.js';
import { getTreasureEffect, loadTreasureLevels } from './treasure-manager.js';
import { normalizeBaseExpProgress } from './level-progression.js';
import { clearLegacyJobSpBonus, normalizeJobExpProgress } from './job-progression.js';

/**
 * Calculate the final stats for a character.
 *
 * @param {Object} character - Character data with baseStats, equipment, modifiers
 * @param {Map<string, Object>} equipmentMap - Map of equipment ID → equipment data
 * @returns {{ atk: number, def: number, matk: number, mdef: number, spd: number }}
 */
export function calcFinalStats(character, equipmentMap) {
  const statKeys = STAT_KEYS.map(s => s.key);

  // Start with base stats
  const result = {
    hp: ((character.hp && character.hp.max) || 0) + (character.rebirthBonus?.hp || 0) + (character.ranchBonus?.hp || 0),
    mp: ((character.mp && character.mp.max) || 0) + (character.rebirthBonus?.mp || 0) + (character.ranchBonus?.mp || 0),
    attackElements: { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
    attackAilments: { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
    elementResist: character.elementResist ? { ...character.elementResist } : { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
    ailmentResist: character.ailmentResist ? { ...character.ailmentResist } : { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
  };
  
  for (const key of statKeys) {
    if (key === 'hp' || key === 'mp') continue;
    result[key] = (character.baseStats[key] || 0) + (character.rebirthBonus?.[key] || 0) + (character.ranchBonus?.[key] || 0) + (character.dictionaryBonus?.[key] || 0);
  }

  // Add equipment bonuses
  if (character.equipment) {
    const slots = ['rightHand', 'leftHand', 'armor', 'accessory1', 'accessory2'];
    for (const slot of slots) {
      const eqId = character.equipment[slot];
      if (!eqId) continue;

      const item = equipmentMap.get(eqId);
      if (!item) continue;

      if (item.stats) {
        for (const key of statKeys) {
          result[key] += item.stats[key] || 0;
        }
      }

      const isWeapon = item.slot === 'rightHand'; // 武器は rightHand で定義されている

      if (item.elements) {
        for (const [k, v] of Object.entries(item.elements)) {
          if (isWeapon) {
            result.attackElements[k] = (result.attackElements[k] || 0) + v;
          } else {
            result.elementResist[k] = (result.elementResist[k] || 0) + v;
          }
        }
      }

      if (item.ailments) {
        for (const [k, v] of Object.entries(item.ailments)) {
          if (isWeapon) {
            result.attackAilments[k] = (result.attackAilments[k] || 0) + v;
          } else {
            result.ailmentResist[k] = (result.ailmentResist[k] || 0) + v;
          }
        }
      }
    }
  }

  // Add modifier bonuses
  if (character.modifiers && character.modifiers.length > 0) {
    for (const mod of character.modifiers) {
      if (!mod.stats) continue;
      for (const key of statKeys) {
        result[key] += mod.stats[key] || 0;
      }
    }
  }

  let hpMultiplier = 1.0;
  let mpMultiplier = 1.0;
  let atkMultiplier = 1.0;
  let matkMultiplier = 1.0;
  let defMultiplier = 1.0;
  let mdefMultiplier = 1.0;

  // Helper to apply passive skill bonuses
  const applyPassiveBonus = (skillMap, jobId, potencyMode) => {
    const jobDef = JOBS[jobId];
    if (skillMap && jobDef) {
      for (const [skillId, level] of Object.entries(skillMap)) {
        if (level <= 0) continue;
        const skillDef = jobDef.skills.find(s => s.id === skillId);
        if (!skillDef || skillDef.type !== 'passive') continue;
        const levelConfig = resolveJobSkillLevelConfig(skillDef, level, potencyMode);
        if (levelConfig.bonusHp) result.hp += levelConfig.bonusHp;
        if (levelConfig.bonusHpPercent) hpMultiplier += levelConfig.bonusHpPercent / 100;
        if (levelConfig.bonusMp) result.mp += levelConfig.bonusMp;
        if (levelConfig.bonusMpPercent) mpMultiplier += levelConfig.bonusMpPercent / 100;
        if (levelConfig.bonusAtk) result.atk += levelConfig.bonusAtk;
        if (levelConfig.bonusAtkPercent) atkMultiplier += levelConfig.bonusAtkPercent / 100;
        if (levelConfig.bonusMatk) result.matk += levelConfig.bonusMatk;
        if (levelConfig.bonusMatkPercent) matkMultiplier += levelConfig.bonusMatkPercent / 100;
        if (levelConfig.bonusDef) result.def += levelConfig.bonusDef;
        if (levelConfig.bonusDefPercent) defMultiplier += levelConfig.bonusDefPercent / 100;
        if (levelConfig.bonusMdef) result.mdef += levelConfig.bonusMdef;
        if (levelConfig.bonusMdefPercent) mdefMultiplier += levelConfig.bonusMdefPercent / 100;
        if (levelConfig.bonusSpd) result.spd += levelConfig.bonusSpd;
        if (levelConfig.waterResistPercent) {
          result.elementResist.water = (result.elementResist.water || 0) + levelConfig.waterResistPercent;
        }
        if (levelConfig.fireResistPercent) {
          result.elementResist.fire = (result.elementResist.fire || 0) + levelConfig.fireResistPercent;
        }
        if (levelConfig.iceResistPercent) {
          result.elementResist.ice = (result.elementResist.ice || 0) + levelConfig.iceResistPercent;
        }
        if (levelConfig.natureResistPercent) {
          ['grass', 'wind', 'earth'].forEach(element => {
            result.elementResist[element] = (result.elementResist[element] || 0) + levelConfig.natureResistPercent;
          });
        }
      }
    }
  };

  // Add passive skill bonuses (current job)
  if (character.jobSkills && character.jobId) {
    applyPassiveBonus(character.jobSkills[character.jobId], character.jobId, 'current');
  }

  // Add inherited skill passive bonuses
  if (character.jobSkills) {
    if (character.inheritedPassiveSkill) {
      const { jobId, skillId } = character.inheritedPassiveSkill;
      if (jobId !== character.jobId) {
        const level = character.jobSkills[jobId] && character.jobSkills[jobId][skillId];
        if (level > 0) {
          applyPassiveBonus({ [skillId]: level }, jobId, 'inherited');
        }
      }
    }
    // Just in case an active skill has passive bonuses
    if (character.inheritedActiveSkill) {
      const { jobId, skillId } = character.inheritedActiveSkill;
      if (jobId !== character.jobId) {
        const level = character.jobSkills[jobId] && character.jobSkills[jobId][skillId];
        if (level > 0) {
          applyPassiveBonus({ [skillId]: level }, jobId, 'inherited');
        }
      }
    }
  }

  result.hp = Math.floor(result.hp * hpMultiplier);
  result.mp = Math.floor(result.mp * mpMultiplier);
  result.atk = Math.floor(result.atk * atkMultiplier);
  result.matk = Math.floor(result.matk * matkMultiplier);
  result.def = Math.floor(result.def * defMultiplier);
  result.mdef = Math.floor(result.mdef * mdefMultiplier);

  // Apply job specific stat multipliers
  const jobDef = JOBS[character.jobId];
  if (jobDef && jobDef.statMultiplier) {
    for (const key of statKeys) {
      if (jobDef.statMultiplier[key] !== undefined) {
        result[key] = Math.floor(result[key] * jobDef.statMultiplier[key]);
      }
    }
  }

  // Fish-library bonuses are flat final-stat gains, so job multipliers must not
  // reduce (or amplify) the promised +1 SPD per discovered species.
  result.spd += character.fishLibraryBonus?.spd || 0;

  // Ensure SPD is at least 1
  if (result.spd < 1) {
    result.spd = 1;
  }

  return result;
}

/**
 * Get equipped items as an array of { slot, item } pairs.
 * Resolves equipment IDs to full equipment data.
 *
 * @param {Object} character - Character data
 * @param {Map<string, Object>} equipmentMap - Map of equipment ID → equipment data
 * @returns {Array<{ slotKey: string, item: Object|null }>}
 */
export function getEquippedItems(character, equipmentMap) {
  const slots = ['rightHand', 'leftHand', 'armor', 'accessory1', 'accessory2'];

  return slots.map(slotKey => {
    const eqId = character.equipment?.[slotKey];
    const item = eqId ? (equipmentMap.get(eqId) || null) : null;
    return { slotKey, item };
  });
}

/**
 * Build a Map from an array of equipment items for fast lookup.
 *
 * @param {Array<Object>} equipmentArray
 * @returns {Map<string, Object>}
 */
export function buildEquipmentMap(equipmentArray) {
  const map = new Map();
  for (const item of equipmentArray) {
    map.set(item.id, item);
  }
  return map;
}

/**
 * Calculate ranch level from total fed materials.
 * Cost for next level grows exponentially: 10, 15, 22, 33, 50, ...
 */
export function getRanchLevelInfo(totalFed, isLegendary = false) {
  let level = 1;
  let totalRequiredForCurrent = 0;
  let baseCost = isLegendary ? 50 : 10;
  let multiplier = isLegendary ? 2.0 : 1.5;
  let totalRequiredForNext = baseCost;
  
  if (!isFinite(totalFed) || totalFed < 0) {
    return { level: 1, currentLevelFed: 0, nextLevelRequired: baseCost };
  }

  while (totalFed >= totalRequiredForNext) {
    level++;
    totalRequiredForCurrent = totalRequiredForNext;
    const nextCost = Math.floor(baseCost * Math.pow(multiplier, level - 1));
    totalRequiredForNext += nextCost;
    
    // Safety guard against infinite loops in extreme edge cases
    if (!isFinite(totalRequiredForNext) || level > 1000) break;
  }
  
  const currentLevelFed = totalFed - totalRequiredForCurrent;
  const nextLevelRequired = totalRequiredForNext - totalRequiredForCurrent;
  
  return { level, currentLevelFed, nextLevelRequired };
}

/**
 * Calculate the total bonus from companion monsters in the ranch.
 * 
 * @returns {Promise<{ hp: number, mp: number, atk: number, def: number, matk: number, mdef: number, spd: number }>}
 */
export async function calculateTotalRanchBonus() {
  await loadTreasureLevels();
  const ranchData = await GameDB.getGameState('ranch_data') || {};
  const totalBonus = { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 };
  
  for (const dungeonId of Object.keys(ranchData)) {
    for (const [monsterId, data] of Object.entries(ranchData[dungeonId])) {
      const isLegendary = monsterId.endsWith('_legendary');
      const baseId = isLegendary ? monsterId.replace('_legendary', '') : monsterId;
      const monsterDef = MONSTERS.find(m => m.id === baseId);
      if (monsterDef) {
        const { level } = getRanchLevelInfo(data.fedMaterials || 0, isLegendary);
        // 通常モンスター: Lv ごとに +1 / 伝説モンスター: Lv ごとに +2
        // 対象: HP, ATK, DEF, MATK, MDEF
        const bonusPerLevel = isLegendary ? 2 : 1;
        const applicableStats = ['hp', 'atk', 'def', 'matk', 'mdef'];
        for (const key of applicableStats) {
          totalBonus[key] += level * bonusPerLevel;
        }
        
        // 伝説モンスターのみMP+1
        if (isLegendary) {
          totalBonus.mp += level;
        }
      }
    }
  }
  
  const petMultiplier = 1 + getTreasureEffect('petStatsPercent') / 100;
  for (const key of Object.keys(totalBonus)) {
    totalBonus[key] = Math.floor(totalBonus[key] * petMultiplier);
  }
  return totalBonus;
}

/**
 * Calculate the total bonus from equipment owned, per item type.
 * For each equipment type: bonus = 1 + floor(count / 5000)
 * All per-type bonuses are summed and applied to ATK, DEF, MDEF, MATK.
 * Example: Weapon A x99999 → +20, Weapon B x99999 → +20, total → +40
 * 
 * @returns {Promise<{ atk: number, def: number, mdef: number, matk: number }>}
 */
export async function calculateDictionaryBonus() {
  const [eq, inv] = await Promise.all([
    GameDB.getAllEquipment(),
    GameDB.getAllInventory(),
  ]);

  // 装備品の定義IDセット（武器・防具・盾・アクセサリ）
  const equipmentIds = new Set();
  WEAPONS.forEach(w => equipmentIds.add(w.id));
  ARMORS.forEach(a => equipmentIds.add(a.id));
  SHIELDS.forEach(s => equipmentIds.add(s.id));
  ACCESSORIES.forEach(ac => equipmentIds.add(ac.id));

  // 種類ごとの所持数を集計
  const countMap = {};

  // equipment ストアの各エントリは1個ずつ（baseIdで集計）
  eq.forEach(item => {
    const baseId = item.baseId || item.id;
    if (equipmentIds.has(baseId)) {
      countMap[baseId] = (countMap[baseId] || 0) + 1;
    }
  });

  // inventory ストアのうち装備品に該当するもののquantityを加算
  inv.forEach(item => {
    if (equipmentIds.has(item.id)) {
      countMap[item.id] = (countMap[item.id] || 0) + (item.quantity || 0);
    }
  });

  // 各種類ごとに 1 + floor(count / 5000) を計算して合算
  let totalBonus = 0;
  for (const id of Object.keys(countMap)) {
    const count = countMap[id];
    if (count > 0) {
      totalBonus += 1 + Math.floor(count / 5000);
    }
  }

  return { atk: totalBonus, def: totalBonus, mdef: totalBonus, matk: totalBonus };
}

/**
 * Calculate the permanent party-wide SPD bonus from the fish library.
 * Legacy discovery entries may be objects keyed by fishing spot/variant, so
 * treat a species as discovered when any saved value for it is truthy.
 *
 * @returns {Promise<{ spd: number }>}
 */
export async function calculateFishLibraryBonus() {
  const fishingData = await GameDB.getGameState('fishing_data') || {};
  const discovered = fishingData.discovered || {};
  const spd = FISH.reduce((total, fish) => {
    const entry = discovered[fish.id];
    const isDiscovered = entry && typeof entry === 'object'
      ? Object.values(entry).some(Boolean)
      : Boolean(entry);
    return total + (isDiscovered ? 1 : 0);
  }, 0);
  return { spd };
}

/**
 * Fetch all characters and attach the calculated party-wide bonuses to them.
 * 
 * @returns {Promise<Array<Object>>}
 */
export async function getCharactersWithRanchBonus() {
  const [characters, ranchBonus, dictionaryBonus, fishLibraryBonus, equipment] = await Promise.all([
    GameDB.getAllCharacters(),
    calculateTotalRanchBonus(),
    calculateDictionaryBonus(),
    calculateFishLibraryBonus(),
    GameDB.getAllEquipment(),
  ]);
  const equipmentMap = buildEquipmentMap(equipment);
  
  for (const c of characters) {
    c.ranchBonus = ranchBonus;
    c.dictionaryBonus = dictionaryBonus;
    c.fishLibraryBonus = fishLibraryBonus;
    let needSave = false;

    // Convert exponential-era saves to the level-derived curves while keeping
    // the same percentage of progress toward the next level.
    if (normalizeBaseExpProgress(c)) needSave = true;
    if (normalizeJobExpProgress(c)) needSave = true;
    if (clearLegacyJobSpBonus(c)) needSave = true;
    
    // Migrate old inheritedSkill format
    if (c.inheritedSkill) {
      const { jobId, skillId } = c.inheritedSkill;
      const jobDef = JOBS[jobId];
      if (jobDef) {
        const skillDef = jobDef.skills.find(s => s.id === skillId);
        if (skillDef) {
          if (skillDef.type === 'passive') {
            c.inheritedPassiveSkill = { jobId, skillId };
          } else {
            c.inheritedActiveSkill = { jobId, skillId };
          }
        }
      }
      delete c.inheritedSkill;
      needSave = true;
    }

    // Verify inherited active skill is mastered
    if (c.inheritedActiveSkill) {
      const { jobId, skillId } = c.inheritedActiveSkill;
      const jobDef = JOBS[jobId];
      if (jobDef) {
        const skillDef = jobDef.skills.find(s => s.id === skillId);
        const level = c.jobSkills && c.jobSkills[jobId] && c.jobSkills[jobId][skillId];
        if (!skillDef || !level || level < skillDef.maxLevel) {
          c.inheritedActiveSkill = null;
          needSave = true;
        }
      } else {
        c.inheritedActiveSkill = null;
        needSave = true;
      }
    }

    // Verify inherited passive skill is mastered
    if (c.inheritedPassiveSkill) {
      const { jobId, skillId } = c.inheritedPassiveSkill;
      const jobDef = JOBS[jobId];
      if (jobDef) {
        const skillDef = jobDef.skills.find(s => s.id === skillId);
        const level = c.jobSkills && c.jobSkills[jobId] && c.jobSkills[jobId][skillId];
        if (!skillDef || !level || level < skillDef.maxLevel) {
          c.inheritedPassiveSkill = null;
          needSave = true;
        }
      } else {
        c.inheritedPassiveSkill = null;
        needSave = true;
      }
    }

    const stats = calcFinalStats(c, equipmentMap);
    if (c.hp && stats.hp !== undefined && c.hp.current > stats.hp) {
      c.hp.current = stats.hp;
      needSave = true;
    }
    if (c.mp && stats.mp !== undefined && c.mp.current > stats.mp) {
      c.mp.current = stats.mp;
      needSave = true;
    }

    if (needSave) {
      await GameDB.putCharacter(c);
    }
  }
  
  return characters;
}
