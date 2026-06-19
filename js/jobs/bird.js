export const bird = {
  id: 'bird',
  name: 'バード',
  icon: 'mic',
  changeCost: 300000,
  skills: [
    {
      id: 'lullaby', name: 'こもりうた', icon: 'music_note',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 12, chance: 30 },
        { level:  2, spCost: 1, mpCost: 14, chance: 35 },
        { level:  3, spCost: 1, mpCost: 16, chance: 40 },
        { level:  4, spCost: 2, mpCost: 18, chance: 45 },
        { level:  5, spCost: 2, mpCost: 20, chance: 50 },
        { level:  6, spCost: 2, mpCost: 22, chance: 55 },
        { level:  7, spCost: 3, mpCost: 25, chance: 60 },
        { level:  8, spCost: 3, mpCost: 28, chance: 65 },
        { level:  9, spCost: 3, mpCost: 30, chance: 75 },
        { level: 10, spCost: 5, mpCost: 35, chance: 100 }
      ],
      getDescription: (levelConfig) => `MP を ${levelConfig.mpCost} 消費し、敵全体を ${levelConfig.chance}％ の確率で睡眠状態にする`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const targets = battle.enemies.filter(e => !e.isDead);
        if (targets.length === 0) return;

        battle.showActionName(caster.elementId, 'こもりうた', 'text-pink-300', 'border-pink-500/50');
        targets.forEach((target, index) => {
            if (target.isDead) return;
            const origA = caster.stats.attackAilments;
            caster.stats.attackAilments = { ...(origA || {}), sleep: levelConfig.chance };
            battle.executeAttack(caster, target, true, {
                actionName: 'こもりうた', damageMultiplier: 0.1, isMagic: true, damageType: 'skill', hideActionName: true, skipAtbReset: index > 0, isAoEProcessed: true
            });
            caster.stats.attackAilments = origA;
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          const awakeEnemies = aliveEnemies.filter(e => !e.activeAilment || e.activeAilment.type !== 'sleep');
          if (awakeEnemies.length >= 1) {
             return { target: awakeEnemies[0], score: 50 + (awakeEnemies.length * 10) };
          }
          return null;
        }
      }
    },
    {
      id: 'nightmare', name: 'ナイトメア', icon: 'dark_mode', statDependency: 'MATK',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 15, multiplier: 2.0 },
        { level:  2, spCost: 1, mpCost: 18, multiplier: 2.5 },
        { level:  3, spCost: 1, mpCost: 22, multiplier: 3.0 },
        { level:  4, spCost: 2, mpCost: 25, multiplier: 3.5 },
        { level:  5, spCost: 2, mpCost: 30, multiplier: 4.5 },
        { level:  6, spCost: 2, mpCost: 35, multiplier: 5.5 },
        { level:  7, spCost: 3, mpCost: 40, multiplier: 6.5 },
        { level:  8, spCost: 3, mpCost: 45, multiplier: 8.0 },
        { level:  9, spCost: 3, mpCost: 50, multiplier: 10.0 },
        { level: 10, spCost: 5, mpCost: 65, multiplier: 15.0 }
      ],
      getDescription: (levelConfig) => `MP を ${levelConfig.mpCost} 消費し、睡眠状態の敵単体に ${levelConfig.multiplier.toFixed(1)} 倍の魔法攻撃。対象が睡眠状態でなければ失敗する`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead || !target.activeAilment || target.activeAilment.type !== 'sleep') {
            target = battle.enemies.find(e => !e.isDead && e.activeAilment && e.activeAilment.type === 'sleep');
        }
        if (!target) {
            target = battle.enemies.find(e => !e.isDead);
        }
        
        if (target) {
            if (target.activeAilment && target.activeAilment.type === 'sleep') {
                battle.executeAttack(caster, target, true, {
                    statDependency: this.statDependency, actionName: 'ナイトメア', damageMultiplier: levelConfig.multiplier, isMagic: true, damageType: 'skill'
                });
            } else {
                battle.showActionName(caster.elementId, 'ナイトメア', 'text-gray-400');
                battle.showDamage(target.elementId, 'MISS', 'text-gray-400');
            }
        }
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          const sleepingTarget = aliveEnemies.find(e => e.activeAilment && e.activeAilment.type === 'sleep');
          if (sleepingTarget) {
              return { target: sleepingTarget, score: 100 * levelConfig.multiplier };
          }
          return null;
        }
      }
    },
    {
      id: 'warding_song', name: '破邪の歌', icon: 'shield_moon',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 10, amount: 15, turns: 3 },
        { level:  2, spCost: 1, mpCost: 12, amount: 20, turns: 3 },
        { level:  3, spCost: 1, mpCost: 14, amount: 25, turns: 3 },
        { level:  4, spCost: 2, mpCost: 18, amount: 30, turns: 4 },
        { level:  5, spCost: 2, mpCost: 20, amount: 40, turns: 4 },
        { level:  6, spCost: 2, mpCost: 24, amount: 50, turns: 4 },
        { level:  7, spCost: 3, mpCost: 28, amount: 60, turns: 5 },
        { level:  8, spCost: 3, mpCost: 32, amount: 70, turns: 5 },
        { level:  9, spCost: 3, mpCost: 36, amount: 80, turns: 5 },
        { level: 10, spCost: 5, mpCost: 50, amount: 100, turns: 5 }
      ],
      getDescription: (levelConfig) => `MP を ${levelConfig.mpCost} 消費し、${levelConfig.turns} ターンの間、味方全体の状態異常耐性を ${levelConfig.amount} 上昇させる`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const targets = battle.party.filter(p => !p.isDead);
        battle.showActionName(caster.elementId, '破邪の歌', 'text-blue-300', 'border-blue-500/50');
        targets.forEach(target => {
            target._ailmentResistBuffAmount = levelConfig.amount;
            target._ailmentResistBuffTurns = levelConfig.turns;
            setTimeout(() => battle.showDamage(target.elementId, 'RESIST UP', 'text-blue-300'), 500);
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveParty = context.party.filter(p => !p.isDead);
          const hasBuff = aliveParty.some(p => p._ailmentResistBuffTurns && p._ailmentResistBuffTurns > 0);
          if (!hasBuff) return { target: caster, score: 70 };
          return null;
        }
      }
    },
    {
      id: 'healing_song', name: 'いやしの歌', icon: 'favorite', type: 'passive',
      maxLevel: 10,
      levels: [
        { level: 1, spCost: 1, healAmount: 10 },
        { level: 2, spCost: 1, healAmount: 20 },
        { level: 3, spCost: 1, healAmount: 30 },
        { level: 4, spCost: 2, healAmount: 40 },
        { level: 5, spCost: 2, healAmount: 60 },
        { level: 6, spCost: 2, healAmount: 80 },
        { level: 7, spCost: 3, healAmount: 100 },
        { level: 8, spCost: 3, healAmount: 120 },
        { level: 9, spCost: 3, healAmount: 150 },
        { level: 10, spCost: 5, healAmount: 300 }
      ],
      getDescription: (levelConfig) => `行動終了時、生存している味方全員の HP を ${levelConfig.healAmount} 回復する`
    }
  ]
};
