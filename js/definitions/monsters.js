/**
 * このファイルは敵として登場するモンスターの強さや、落とすアイテムなどのデータをまとめたファイルです。
 * 
 * モンスターのデータ定義ファイル
 * 
 * 敵キャラクターとして出現するモンスターのステータスやドロップアイテムを定義します。
 * 
 * テンプレート（各項目は省略可能、省略された値は 0 として扱われます）
 *    stats:         { hp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 },
 *    elements:      { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
 *    ailments:      { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
 */

export const MONSTERS = [
  { id: 'slime_blue',       name: 'ブルースライム',           stats: { hp:  10, atk:  5, def:  1, matk:  5, mdef:  5, spd:  1 }, elements: {             }, ailments: {               }, rewards: { exp:  1, jp:  1, gold:  1 }, drops: [{ itemId: 'slime_blue_jelly', rate: 5 }, { itemId: 'slime_blue_core', rate: 1 }, { itemId: 'slime_blue_fluid', rate: 0.1 }], actions: [{ name: 'ウォーターアタック', chance: 10, execute: (attacker, defender, battle) => { const orig = attacker.stats.attackElements; attacker.stats.attackElements = { water: 100 }; battle.executeAttack(attacker, defender, false, { actionName: 'ウォーターアタック', damageMultiplier: 1.2, isMagic: true }); attacker.stats.attackElements = orig; } }], },
  { id: 'slime_green',      name: 'グリーンスライム',         stats: { hp:  20, atk:  8, def:  5, matk:  9, mdef:  8, spd:  5 }, elements: { grass:   50 }, ailments: { poison:    10 }, rewards: { exp:  2, jp:  1, gold:  1 }, drops: [{ itemId: 'slime_green_jelly', rate: 5 }, { itemId: 'slime_green_core', rate: 1 }, { itemId: 'slime_green_fluid', rate: 0.1 }], actions: [{ name: 'グラスアタック', chance: 10, execute: (attacker, defender, battle) => { const orig = attacker.stats.attackElements; attacker.stats.attackElements = { grass: 100 }; battle.executeAttack(attacker, defender, false, { actionName: 'グラスアタック', damageMultiplier: 1.2, isMagic: true }); attacker.stats.attackElements = orig; } }], },
  { id: 'slime_red',        name: 'レッドスライム',           stats: { hp:  30, atk: 14, def: 12, matk: 15, mdef: 10, spd:  8 }, elements: { fire:    50 }, ailments: { burn:      10 }, rewards: { exp:  2, jp:  2, gold:  2 }, drops: [{ itemId: 'slime_red_jelly', rate: 5 }, { itemId: 'slime_red_core', rate: 1 }, { itemId: 'slime_red_fluid', rate: 0.1 }], actions: [{ name: 'ファイアアタック', chance: 10, execute: (attacker, defender, battle) => { const orig = attacker.stats.attackElements; attacker.stats.attackElements = { fire: 100 }; battle.executeAttack(attacker, defender, false, { actionName: 'ファイアアタック', damageMultiplier: 1.2, isMagic: true }); attacker.stats.attackElements = orig; } }], },
  { id: 'slime_water',      name: 'ウォータースライム',       stats: { hp:  40, atk: 17, def: 14, matk: 18, mdef: 12, spd:  9 }, elements: { water:   50 }, ailments: {               }, rewards: { exp:  3, jp:  2, gold:  2 }, drops: [{ itemId: 'slime_water_jelly', rate: 5 }, { itemId: 'slime_water_core', rate: 1 }, { itemId: 'slime_water_fluid', rate: 0.1 }], actions: [{ name: 'ウォーターアタック', chance: 10, execute: (attacker, defender, battle) => { const orig = attacker.stats.attackElements; attacker.stats.attackElements = { water: 100 }; battle.executeAttack(attacker, defender, false, { actionName: 'ウォーターアタック', damageMultiplier: 1.2, isMagic: true }); attacker.stats.attackElements = orig; } }], },
  { id: 'slime_fire',       name: 'ファイヤースライム',       stats: { hp:  50, atk: 20, def: 16, matk: 21, mdef: 14, spd: 10 }, elements: { fire:    50 }, ailments: { burn:      10 }, rewards: { exp:  3, jp:  2, gold:  3 }, drops: [{ itemId: 'slime_fire_jelly', rate: 5 }, { itemId: 'slime_fire_core', rate: 1 }, { itemId: 'slime_fire_fluid', rate: 0.1 }], actions: [{ name: 'ファイアアタック', chance: 10, execute: (attacker, defender, battle) => { const orig = attacker.stats.attackElements; attacker.stats.attackElements = { fire: 100 }; battle.executeAttack(attacker, defender, false, { actionName: 'ファイアアタック', damageMultiplier: 1.2, isMagic: true }); attacker.stats.attackElements = orig; } }], },
  { id: 'slime_ice',        name: 'アイススライム',           stats: { hp:  60, atk: 23, def: 18, matk: 24, mdef: 16, spd: 11 }, elements: { ice:     50 }, ailments: { paralysis: 10 }, rewards: { exp:  4, jp:  3, gold:  4 }, drops: [{ itemId: 'slime_ice_jelly', rate: 5 }, { itemId: 'slime_ice_core', rate: 1 }, { itemId: 'slime_ice_fluid', rate: 0.1 }], actions: [{ name: 'アイスアタック', chance: 10, execute: (attacker, defender, battle) => { const orig = attacker.stats.attackElements; attacker.stats.attackElements = { ice: 100 }; battle.executeAttack(attacker, defender, false, { actionName: 'アイスアタック', damageMultiplier: 1.2, isMagic: true }); attacker.stats.attackElements = orig; } }], },
  { id: 'slime_wind',       name: 'ウインドスライム',         stats: { hp:  72, atk: 27, def: 20, matk: 28, mdef: 18, spd: 12 }, elements: { wind:    50 }, ailments: { blind:     10 }, rewards: { exp:  4, jp:  3, gold:  4 }, drops: [{ itemId: 'slime_wind_jelly', rate: 5 }, { itemId: 'slime_wind_core', rate: 1 }, { itemId: 'slime_wind_fluid', rate: 0.1 }], actions: [{ name: 'ウィンドアタック', chance: 10, execute: (attacker, defender, battle) => { const orig = attacker.stats.attackElements; attacker.stats.attackElements = { wind: 100 }; battle.executeAttack(attacker, defender, false, { actionName: 'ウィンドアタック', damageMultiplier: 1.2, isMagic: true }); attacker.stats.attackElements = orig; } }], },
  { id: 'slime_thunder',    name: 'サンダースライム',         stats: { hp:  85, atk: 31, def: 23, matk: 32, mdef: 21, spd: 13 }, elements: { thunder: 50 }, ailments: { paralysis: 10 }, rewards: { exp:  5, jp:  3, gold:  5 }, drops: [{ itemId: 'slime_thunder_jelly', rate: 5 }, { itemId: 'slime_thunder_core', rate: 1 }, { itemId: 'slime_thunder_fluid', rate: 0.1 }], actions: [{ name: 'サンダーアタック', chance: 10, execute: (attacker, defender, battle) => { const orig = attacker.stats.attackElements; attacker.stats.attackElements = { thunder: 100 }; battle.executeAttack(attacker, defender, false, { actionName: 'サンダーアタック', damageMultiplier: 1.2, isMagic: true }); attacker.stats.attackElements = orig; } }], },
  { id: 'slime_flower',     name: 'フラワースライム',         stats: { hp: 100, atk: 36, def: 26, matk: 37, mdef: 24, spd: 14 }, elements: { grass:   50 }, ailments: { sleep:     10 }, rewards: { exp:  5, jp:  3, gold:  6 }, drops: [{ itemId: 'slime_flower_jelly', rate: 5 }, { itemId: 'slime_flower_core', rate: 1 }, { itemId: 'slime_flower_fluid', rate: 0.1 }], actions: [{ name: 'グラスアタック', chance: 10, execute: (attacker, defender, battle) => { const orig = attacker.stats.attackElements; attacker.stats.attackElements = { grass: 100 }; battle.executeAttack(attacker, defender, false, { actionName: 'グラスアタック', damageMultiplier: 1.2, isMagic: true }); attacker.stats.attackElements = orig; } }], }, { id: 'slime_grass', name: 'グラススライム', stats: { hp: 115, atk: 41, def: 29, matk: 42, mdef: 27, spd: 15 }, elements: { grass: 50 }, ailments: { poison: 10 }, rewards: { exp: 18, jp: 2, gold: 30 }, drops: [{ itemId: 'slime_grass_jelly', rate: 5 }, { itemId: 'slime_grass_core', rate: 1 }, { itemId: 'slime_grass_fluid', rate: 0.1 }], actions: [{ name: 'グラスアタック', chance: 10, execute: (attacker, defender, battle) => { const orig = attacker.stats.attackElements; attacker.stats.attackElements = { grass: 100 }; battle.executeAttack(attacker, defender, false, { actionName: 'グラスアタック', damageMultiplier: 1.2, isMagic: true }); attacker.stats.attackElements = orig; } }], },
  { id: 'slime_dark',       name: 'ダークスライム',           stats: { hp: 130, atk: 46, def: 32, matk: 47, mdef: 30, spd: 16 }, elements: { dark:    50 }, ailments: { curse:     10 }, rewards: { exp:  8, jp:  4, gold:  7 }, drops: [{ itemId: 'slime_dark_jelly', rate: 5 }, { itemId: 'slime_dark_core', rate: 1 }, { itemId: 'slime_dark_fluid', rate: 0.1 }], actions: [{ name: 'ダークアタック', chance: 10, execute: (attacker, defender, battle) => { const orig = attacker.stats.attackElements; attacker.stats.attackElements = { dark: 100 }; battle.executeAttack(attacker, defender, false, { actionName: 'ダークアタック', damageMultiplier: 1.2, isMagic: true }); attacker.stats.attackElements = orig; } }], }, { id: 'slime_earth', name: 'アーススライム', stats: { hp: 148, atk: 52, def: 36, matk: 53, mdef: 34, spd: 17 }, elements: { earth: 50 }, ailments: {}, rewards: { exp: 26, jp: 2, gold: 42 }, drops: [{ itemId: 'slime_earth_jelly', rate: 5 }, { itemId: 'slime_earth_core', rate: 1 }, { itemId: 'slime_earth_fluid', rate: 0.1 }], actions: [{ name: 'アースアタック', chance: 10, execute: (attacker, defender, battle) => { const orig = attacker.stats.attackElements; attacker.stats.attackElements = { earth: 100 }; battle.executeAttack(attacker, defender, false, { actionName: 'アースアタック', damageMultiplier: 1.2, isMagic: true }); attacker.stats.attackElements = orig; } }], },
  { id: 'slime_angel',      name: 'エンジェルスライム',       stats: { hp: 168, atk: 58, def: 40, matk: 60, mdef: 38, spd: 18 }, elements: { light:   50 }, ailments: { silence:   10 }, rewards: { exp: 10, jp: 10, gold: 10 }, drops: [{ itemId: 'slime_angel_jelly', rate: 5 }, { itemId: 'slime_angel_core', rate: 1 }, { itemId: 'slime_angel_fluid', rate: 0.1 }], actions: [{ name: 'ホーリーアタック', chance: 10, execute: (attacker, defender, battle) => { const orig = attacker.stats.attackElements; attacker.stats.attackElements = { light: 100 }; battle.executeAttack(attacker, defender, false, { actionName: 'ホーリーアタック', damageMultiplier: 1.2, isMagic: true }); attacker.stats.attackElements = orig; } }], },
  { id: 'slime_king',       name: 'キングスライム',           stats: { hp: 250, atk: 70, def: 50, matk: 72, mdef: 48, spd: 20 }, elements: {             }, ailments: {               }, rewards: { exp: 10, jp: 10, gold: 10 }, drops: [{ itemId: 'slime_king_jelly', rate: 5 }, { itemId: 'slime_king_core', rate: 1 }, { itemId: 'slime_king_fluid', rate: 0.1 }], actions: [{
    name: 'スライム呼び', chance: 20, execute: (attacker, defender, battle) => {
      const slimes = ['slime_blue', 'slime_green', 'slime_red', 'slime_water', 'slime_fire', 'slime_ice', 'slime_wind', 'slime_thunder', 'slime_flower'];
      const leftDef = MONSTERS.find(m => m.id === slimes[Math.floor(Math.random() * slimes.length)]);
      const rightDef = MONSTERS.find(m => m.id === slimes[Math.floor(Math.random() * slimes.length)]);
      if (leftDef && rightDef) {
        battle.showActionName(attacker.elementId, 'スライム呼び', 'text-purple-300', 'border-purple-500/50');
        const createEnemy = (mDef, suffix) => {
          const baseStats = { hp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0, ...(mDef.stats || {}) };
          return {
            ...mDef,
            stats: { ...baseStats, attackElements: { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 }, attackAilments: { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 }, elementResist: { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0, ...(mDef.elements || {}) }, ailmentResist: { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0, ...(mDef.ailments || {}) } },
            uniqueId: `enemy-summon-${Date.now()}-${suffix}`, currentHp: baseStats.hp, maxHp: baseStats.hp, atb: 0, isDead: false, elementId: `enemy-summon-${Date.now()}-${suffix}`
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
    }
  }], },
  { id: 'slime_angel_king', name: 'エンジェルキングスライム', stats: { hp: 550, atk: 85, def: 60, matk: 88, mdef: 58, spd: 22 }, elements: { light:   50 }, ailments: { silence:   10 }, rewards: { exp: 20, jp: 20, gold: 20 }, drops: [{ itemId: 'slime_angel_king_jelly', rate: 5 }, { itemId: 'slime_angel_king_core', rate: 1 }, { itemId: 'slime_angel_king_fluid', rate: 0.1 }],actions: [{
    name: 'スライム呼び', chance: 20, execute: (attacker, defender, battle) => {
      const slimes = ['slime_dark', 'slime_angel'];
      const leftDef = MONSTERS.find(m => m.id === slimes[Math.floor(Math.random() * slimes.length)]);
      const rightDef = MONSTERS.find(m => m.id === slimes[Math.floor(Math.random() * slimes.length)]);
      if (leftDef && rightDef) {
        battle.showActionName(attacker.elementId, 'スライム呼び', 'text-purple-300', 'border-purple-500/50');
        const createEnemy = (mDef, suffix) => {
          const baseStats = { hp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0, ...(mDef.stats || {}) };
          return {
            ...mDef,
            stats: { ...baseStats, attackElements: { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 }, attackAilments: { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 }, elementResist: { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0, ...(mDef.elements || {}) }, ailmentResist: { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0, ...(mDef.ailments || {}) } },
            uniqueId: `enemy-summon-${Date.now()}-${suffix}`, currentHp: baseStats.hp, maxHp: baseStats.hp, atb: 0, isDead: false, elementId: `enemy-summon-${Date.now()}-${suffix}`
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
    }
  }], },

].map(item => ({ ...item, image: `./assets/monster/${item.id}.webp` })) ;