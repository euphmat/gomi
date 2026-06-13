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
    result[key] = (character.baseStats[key] || 0) + (character.rebirthBonus?.[key] || 0) + (character.ranchBonus?.[key] || 0);
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

  // Helper to apply passive skill bonuses
  const applyPassiveBonus = (skillMap, jobId) => {
    const jobDef = JOBS[jobId];
    if (skillMap && jobDef) {
      for (const [skillId, level] of Object.entries(skillMap)) {
        if (level <= 0) continue;
        const skillDef = jobDef.skills.find(s => s.id === skillId);
        if (!skillDef || skillDef.type !== 'passive') continue;
        const levelConfig = skillDef.levels.find(l => l.level === level) || skillDef.levels[skillDef.levels.length - 1];
        if (levelConfig.bonusHp) result.hp += levelConfig.bonusHp;
        if (levelConfig.bonusDef) result.def += levelConfig.bonusDef;
        if (levelConfig.bonusMdef) result.mdef += levelConfig.bonusMdef;
      }
    }
  };

  // Add passive skill bonuses (current job)
  if (character.jobSkills && character.jobId) {
    applyPassiveBonus(character.jobSkills[character.jobId], character.jobId);
  }

  // Add inherited skill passive bonuses
  if (character.inheritedSkill && character.jobSkills) {
    const { jobId, skillId } = character.inheritedSkill;
    if (jobId !== character.jobId) {
      const level = character.jobSkills[jobId] && character.jobSkills[jobId][skillId];
      if (level > 0) {
        // Create a single-entry map to reuse applyPassiveBonus
        applyPassiveBonus({ [skillId]: level }, jobId);
      }
    }
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
export function getRanchLevelInfo(totalFed) {
  let level = 0;
  let totalRequiredForCurrent = 0;
  let totalRequiredForNext = 10;
  
  while (totalFed >= totalRequiredForNext) {
    level++;
    totalRequiredForCurrent = totalRequiredForNext;
    const nextCost = Math.floor(10 * Math.pow(1.5, level));
    totalRequiredForNext += nextCost;
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
  const ranchData = await GameDB.getGameState('ranch_data') || {};
  const totalBonus = { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 };
  
  for (const dungeonId of Object.keys(ranchData)) {
    for (const [monsterId, data] of Object.entries(ranchData[dungeonId])) {
      const monsterDef = MONSTERS.find(m => m.id === monsterId);
      if (monsterDef && monsterDef.stats) {
        const { level } = getRanchLevelInfo(data.fedMaterials || 0);
        const levelMultiplier = 1 + (level * 0.01);
        
        for (const key of Object.keys(totalBonus)) {
          const baseVal = monsterDef.stats[key] || 0;
          if (baseVal > 0) {
            const grownVal = baseVal * levelMultiplier;
            const bonus = Math.max(1, Math.floor(grownVal * 0.10));
            totalBonus[key] += bonus;
          }
        }
      }
    }
  }
  
  return totalBonus;
}

/**
 * Fetch all characters and attach the calculated ranchBonus to them.
 * 
 * @returns {Promise<Array<Object>>}
 */
export async function getCharactersWithRanchBonus() {
  const characters = await GameDB.getAllCharacters();
  const ranchBonus = await calculateTotalRanchBonus();
  characters.forEach(c => c.ranchBonus = ranchBonus);
  return characters;
}
