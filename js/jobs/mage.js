export const mage = {
  id: 'mage',
  name: 'メイジ',
  icon: 'auto_awesome',
  changeCost: 30000,
  statGrowth: { hp: [1, 2], mp: [2, 4], atk: [0, 0], def: [0, 1], matk: [2, 4], mdef: [1, 3], spd: [0, 1] },
  skills: [
    // ─── Active Skills ──────────────────────────────────────
    {
      id: 'fireball', name: 'ファイアボール', icon: 'local_fire_department',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  4, multiplier: 1.2 },
        { level:  2, spCost: 1, mpCost:  5, multiplier: 1.3 },
        { level:  3, spCost: 1, mpCost:  6, multiplier: 1.4 },
        { level:  4, spCost: 2, mpCost:  7, multiplier: 1.5 },
        { level:  5, spCost: 2, mpCost:  8, multiplier: 1.6 },
        { level:  6, spCost: 2, mpCost:  9, multiplier: 1.7 },
        { level:  7, spCost: 3, mpCost: 10, multiplier: 1.8 },
        { level:  8, spCost: 3, mpCost: 11, multiplier: 1.9 },
        { level:  9, spCost: 3, mpCost: 12, multiplier: 2.0 },
        { level: 10, spCost: 5, mpCost: 15, multiplier: 2.2 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵単体に ${lc.multiplier.toFixed(1)} 倍の炎属性魔法攻撃を行う`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (target) {
          battle.executeAttack(caster, target, true, { actionName: 'ファイアボール', damageMultiplier: levelConfig.multiplier, damageType: 'skill', isMagic: true, element: 'fire', hideActionName: true });
        }
      },
      autoBattle: {
        priority: 50,
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let target = context.selectedEnemyTarget;
          if (!target || target.isDead) target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          const resist = target.stats?.elementResist?.fire || 0;
          if (resist > 20 && Math.random() < 0.8) return null;
          if (Math.random() < 0.8) return target;
          return null;
        }
      }
    },
    {
      id: 'ice_lance', name: 'アイスランス', icon: 'ac_unit',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  4, multiplier: 1.2 },
        { level:  2, spCost: 1, mpCost:  5, multiplier: 1.3 },
        { level:  3, spCost: 1, mpCost:  6, multiplier: 1.4 },
        { level:  4, spCost: 2, mpCost:  7, multiplier: 1.5 },
        { level:  5, spCost: 2, mpCost:  8, multiplier: 1.6 },
        { level:  6, spCost: 2, mpCost:  9, multiplier: 1.7 },
        { level:  7, spCost: 3, mpCost: 10, multiplier: 1.8 },
        { level:  8, spCost: 3, mpCost: 11, multiplier: 1.9 },
        { level:  9, spCost: 3, mpCost: 12, multiplier: 2.0 },
        { level: 10, spCost: 5, mpCost: 15, multiplier: 2.2 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵単体に ${lc.multiplier.toFixed(1)} 倍の氷属性魔法攻撃を行う`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (target) {
          battle.executeAttack(caster, target, true, { actionName: 'アイスランス', damageMultiplier: levelConfig.multiplier, damageType: 'skill', isMagic: true, element: 'ice', hideActionName: true });
        }
      },
      autoBattle: {
        priority: 50,
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let target = context.selectedEnemyTarget;
          if (!target || target.isDead) target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          const resist = target.stats?.elementResist?.ice || 0;
          if (resist > 20 && Math.random() < 0.8) return null;
          if (Math.random() < 0.8) return target;
          return null;
        }
      }
    },
    {
      id: 'thunder', name: 'サンダー', icon: 'bolt',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  4, multiplier: 1.2 },
        { level:  2, spCost: 1, mpCost:  5, multiplier: 1.3 },
        { level:  3, spCost: 1, mpCost:  6, multiplier: 1.4 },
        { level:  4, spCost: 2, mpCost:  7, multiplier: 1.5 },
        { level:  5, spCost: 2, mpCost:  8, multiplier: 1.6 },
        { level:  6, spCost: 2, mpCost:  9, multiplier: 1.7 },
        { level:  7, spCost: 3, mpCost: 10, multiplier: 1.8 },
        { level:  8, spCost: 3, mpCost: 11, multiplier: 1.9 },
        { level:  9, spCost: 3, mpCost: 12, multiplier: 2.0 },
        { level: 10, spCost: 5, mpCost: 15, multiplier: 2.2 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵単体に ${lc.multiplier.toFixed(1)} 倍の雷属性魔法攻撃を行う`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (target) {
          battle.executeAttack(caster, target, true, { actionName: 'サンダー', damageMultiplier: levelConfig.multiplier, damageType: 'skill', isMagic: true, element: 'thunder', hideActionName: true });
        }
      },
      autoBattle: {
        priority: 50,
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let target = context.selectedEnemyTarget;
          if (!target || target.isDead) target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          const resist = target.stats?.elementResist?.thunder || 0;
          if (resist > 20 && Math.random() < 0.8) return null;
          if (Math.random() < 0.8) return target;
          return null;
        }
      }
    },
    {
      id: 'magic_barrier', name: 'マジックバリア', icon: 'security',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  4, mdefAmount: 10, turns: 3 },
        { level:  2, spCost: 1, mpCost:  5, mdefAmount: 13, turns: 3 },
        { level:  3, spCost: 1, mpCost:  6, mdefAmount: 16, turns: 3 },
        { level:  4, spCost: 2, mpCost:  7, mdefAmount: 19, turns: 3 },
        { level:  5, spCost: 2, mpCost:  8, mdefAmount: 22, turns: 3 },
        { level:  6, spCost: 2, mpCost:  9, mdefAmount: 25, turns: 3 },
        { level:  7, spCost: 3, mpCost: 10, mdefAmount: 28, turns: 4 },
        { level:  8, spCost: 3, mpCost: 11, mdefAmount: 32, turns: 4 },
        { level:  9, spCost: 3, mpCost: 12, mdefAmount: 36, turns: 4 },
        { level: 10, spCost: 5, mpCost: 15, mdefAmount: 40, turns: 5 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、味方全体の魔法防御力を ${lc.turns} ターンの間 ${lc.mdefAmount} アップする`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        const aliveParty = battle.party.filter(p => !p.isDead);
        aliveParty.forEach(p => {
          p._mdefBuffAmount = levelConfig.mdefAmount;
          p._mdefBuffTurns = levelConfig.turns;
        });
        battle.showDamage(caster.elementId, 'MDEF UP', 'text-indigo-400');
      },
      autoBattle: {
        priority: 80,
        check: (caster, levelConfig, context) => {
          const aliveParty = context.party.filter(p => !p.isDead);
          const hasMdefBuff = aliveParty.some(p => p._mdefBuffTurns && p._mdefBuffTurns > 0);
          if (!hasMdefBuff && Math.random() < 0.5) return true;
          return null;
        }
      }
    },
    // ─── Passive Skills ──────────────────────────────────────
    {
      id: 'magic_missile', name: 'マジックミサイル', icon: 'flare', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, multiplier: 0.2 },
        { level:  2, spCost: 1, mpCost: 0, multiplier: 0.3 },
        { level:  3, spCost: 1, mpCost: 0, multiplier: 0.4 },
        { level:  4, spCost: 2, mpCost: 0, multiplier: 0.5 },
        { level:  5, spCost: 2, mpCost: 0, multiplier: 0.6 },
        { level:  6, spCost: 2, mpCost: 0, multiplier: 0.7 },
        { level:  7, spCost: 3, mpCost: 0, multiplier: 0.8 },
        { level:  8, spCost: 3, mpCost: 0, multiplier: 0.9 },
        { level:  9, spCost: 3, mpCost: 0, multiplier: 1.0 },
        { level: 10, spCost: 5, mpCost: 0, multiplier: 1.2 }
      ],
      getDescription: (lc) => `通常攻撃時、追加で魔法攻撃力 ${Math.floor(lc.multiplier * 100)}％ 分の無属性魔法ダメージを与える`
    },
    {
      id: 'mana_regen', name: 'マナリジェネ', icon: 'battery_charging_full', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, recoverMp:  1 },
        { level:  2, spCost: 1, mpCost: 0, recoverMp:  2 },
        { level:  3, spCost: 1, mpCost: 0, recoverMp:  3 },
        { level:  4, spCost: 2, mpCost: 0, recoverMp:  4 },
        { level:  5, spCost: 2, mpCost: 0, recoverMp:  5 },
        { level:  6, spCost: 2, mpCost: 0, recoverMp:  6 },
        { level:  7, spCost: 3, mpCost: 0, recoverMp:  8 },
        { level:  8, spCost: 3, mpCost: 0, recoverMp: 10 },
        { level:  9, spCost: 3, mpCost: 0, recoverMp: 12 },
        { level: 10, spCost: 5, mpCost: 0, recoverMp: 15 }
      ],
      getDescription: (lc) => `自身の行動終了時に、MP を ${lc.recoverMp} 回復する`
    }
  ]
};
