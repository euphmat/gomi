/**
 * モンスター定義で使用される共通パターンのヘルパー関数
 */

/**
 * 属性攻撃アクションの execute 関数を生成するファクトリ
 * @param {string} element - 属性名 (例: 'fire', 'water', 'grass')
 * @param {string} actionName - アクション表示名 (例: 'ファイアアタック')
 * @param {number} [multiplier=1.2] - ダメージ倍率
 * @returns {Function} execute 関数 (attacker, defender, battle) => void
 */
export function createElementalAttack(element, actionName, multiplier = 1.2) {
  return (attacker, defender, battle) => {
    const orig = attacker.stats.attackElements;
    attacker.stats.attackElements = { [element]: 100 };
    battle.executeAttack(attacker, defender, false, { actionName, damageMultiplier: multiplier, isMagic: true, damageType: 'skill' });
    attacker.stats.attackElements = orig;
  };
}

/**
 * スライム呼びアクションの execute 関数を生成するファクトリ
 * @param {string} actionName - アクション表示名 (例: 'スライム呼び')
 * @param {string[]} summonPoolIds - 召喚対象モンスターIDの配列
 * @param {Function} getMonsters - MONSTERS 配列を返すコールバック（循環依存回避用）
 * @returns {Function} execute 関数 (attacker, defender, battle) => void
 */
export function createSummonAction(actionName, summonPoolIds, getMonsters) {
  return (attacker, defender, battle) => {
    const MONSTERS = getMonsters();
    const leftDef = MONSTERS.find(m => m.id === summonPoolIds[Math.floor(Math.random() * summonPoolIds.length)]);
    const rightDef = MONSTERS.find(m => m.id === summonPoolIds[Math.floor(Math.random() * summonPoolIds.length)]);
    if (leftDef && rightDef) {
      battle.showActionName(attacker.elementId, actionName, 'text-purple-300', 'border-purple-500/50');
      const createEnemy = (mDef, suffix) => {
        const baseStats = { hp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0, ...(mDef.stats || {}) };
        return {
          ...mDef,
          stats: {
            ...baseStats,
            attackElements: { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
            attackAilments: { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
            elementResist: { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0, ...(mDef.elements || {}) },
            ailmentResist: { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0, ...(mDef.ailments || {}) }
          },
          uniqueId: `enemy-summon-${Date.now()}-${suffix}`,
          currentHp: baseStats.hp,
          maxHp: baseStats.hp,
          atb: 0,
          isDead: false,
          elementId: `enemy-summon-${Date.now()}-${suffix}`
        };
      };
      const attackerIdx = battle.enemies.indexOf(attacker);
      if (attackerIdx !== -1) {
        battle.enemies.splice(attackerIdx, 0, createEnemy(leftDef, 'L'));
        battle.enemies.splice(attackerIdx + 2, 0, createEnemy(rightDef, 'R'));
      } else {
        battle.enemies.push(createEnemy(leftDef, 'L'), createEnemy(rightDef, 'R'));
      }
      battle.elements.enemyArea.innerHTML = '';
      battle.renderEntities();
    }
  };
}
