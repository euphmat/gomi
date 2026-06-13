export const priest = {
  id: 'priest',
  name: 'プリースト',
  icon: 'health_and_safety',
  changeCost: 30000,
  statGrowth: { hp: [1, 2], mp: [3, 5], atk: [0, 0], def: [0, 1], matk: [1, 2], mdef: [2, 4], spd: [0, 1] },
  skills: [
    // ─── Active Skills ──────────────────────────────────────
    {
      id: 'heal', name: 'ヒール', icon: 'healing',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  3, healAmount: 30 },
        { level:  2, spCost: 1, mpCost:  4, healAmount: 45 },
        { level:  3, spCost: 1, mpCost:  5, healAmount: 60 },
        { level:  4, spCost: 2, mpCost:  6, healAmount: 80 },
        { level:  5, spCost: 2, mpCost:  7, healAmount: 100 },
        { level:  6, spCost: 2, mpCost:  8, healAmount: 125 },
        { level:  7, spCost: 3, mpCost:  9, healAmount: 150 },
        { level:  8, spCost: 3, mpCost: 11, healAmount: 180 },
        { level:  9, spCost: 3, mpCost: 13, healAmount: 220 },
        { level: 10, spCost: 5, mpCost: 15, healAmount: 260 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、HPが最も減っている味方単体の HP を ${lc.healAmount} 回復する`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        const aliveParty = battle.party.filter(p => !p.isDead);
        if (aliveParty.length === 0) return;
        
        // Find ally with lowest HP percentage
        let target = aliveParty[0];
        let lowestHpPercent = target.hp.current / target.hp.max;
        for (const p of aliveParty) {
          const hpPercent = p.hp.current / p.hp.max;
          if (hpPercent < lowestHpPercent) {
            lowestHpPercent = hpPercent;
            target = p;
          }
        }

        target.hp.current = Math.min(target.hp.max, target.hp.current + levelConfig.healAmount);
        battle.showDamage(target.elementId, `+${levelConfig.healAmount}`, 'text-green-400');
        battle.renderEntities();
      }
    },
    {
      id: 'raise', name: 'レイズ', icon: 'settings_backup_restore',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost: 10, reviveHp: 10 },
        { level:  2, spCost: 2, mpCost: 12, reviveHp: 20 },
        { level:  3, spCost: 2, mpCost: 14, reviveHp: 30 },
        { level:  4, spCost: 3, mpCost: 16, reviveHp: 40 },
        { level:  5, spCost: 3, mpCost: 18, reviveHp: 50 },
        { level:  6, spCost: 3, mpCost: 20, reviveHp: 65 },
        { level:  7, spCost: 4, mpCost: 22, reviveHp: 80 },
        { level:  8, spCost: 4, mpCost: 24, reviveHp: 100 },
        { level:  9, spCost: 4, mpCost: 26, reviveHp: 120 },
        { level: 10, spCost: 5, mpCost: 30, reviveHp: 150 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、戦闘不能の味方単体を HP ${lc.reviveHp} で蘇生する`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        const deadParty = battle.party.filter(p => p.isDead);
        if (deadParty.length === 0) {
          battle.showActionName(caster.elementId, 'MISS', 'text-gray-400', 'border-gray-500/50');
          return;
        }
        
        const target = deadParty[Math.floor(Math.random() * deadParty.length)];
        target.isDead = false;
        target.hp.current = Math.min(target.hp.max, levelConfig.reviveHp);
        target.atb = 0; // Reset ATB on revive just in case
        battle.showDamage(target.elementId, `RAISE`, 'text-yellow-300');
        battle.renderEntities(); // This handles reviving UI
      }
    },
    {
      id: 'restore', name: 'レストア', icon: 'health_metrics',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  4 },
        { level:  2, spCost: 1, mpCost:  4 },
        { level:  3, spCost: 1, mpCost:  4 },
        { level:  4, spCost: 2, mpCost:  4 },
        { level:  5, spCost: 2, mpCost:  4 },
        { level:  6, spCost: 2, mpCost:  4 },
        { level:  7, spCost: 3, mpCost:  3 },
        { level:  8, spCost: 3, mpCost:  3 },
        { level:  9, spCost: 3, mpCost:  3 },
        { level: 10, spCost: 5, mpCost:  2 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、状態異常の味方単体の状態異常を回復する`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        const afflictedParty = battle.party.filter(p => !p.isDead && p.activeAilment);
        if (afflictedParty.length === 0) {
          battle.showActionName(caster.elementId, 'MISS', 'text-gray-400', 'border-gray-500/50');
          return;
        }
        
        const target = afflictedParty[Math.floor(Math.random() * afflictedParty.length)];
        target.activeAilment = null;
        battle.showActionName(target.elementId, `CURE`, 'text-green-300', 'border-green-500/50');
        battle.renderEntities();
      }
    },
    {
      id: 'holy', name: 'ホーリー', icon: 'light_mode',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  5, multiplier: 1.3 },
        { level:  2, spCost: 1, mpCost:  6, multiplier: 1.4 },
        { level:  3, spCost: 1, mpCost:  7, multiplier: 1.5 },
        { level:  4, spCost: 2, mpCost:  8, multiplier: 1.6 },
        { level:  5, spCost: 2, mpCost:  9, multiplier: 1.7 },
        { level:  6, spCost: 2, mpCost: 10, multiplier: 1.8 },
        { level:  7, spCost: 3, mpCost: 11, multiplier: 1.9 },
        { level:  8, spCost: 3, mpCost: 12, multiplier: 2.0 },
        { level:  9, spCost: 3, mpCost: 13, multiplier: 2.1 },
        { level: 10, spCost: 5, mpCost: 16, multiplier: 2.4 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵単体に ${lc.multiplier.toFixed(1)} 倍の光属性魔法攻撃を行う`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (target) {
          battle.executeAttack(caster, target, true, { actionName: 'ホーリー', damageMultiplier: levelConfig.multiplier, damageType: 'skill', isMagic: true, element: 'light', hideActionName: true });
        }
      }
    },
    // ─── Passive Skills ──────────────────────────────────────
    {
      id: 'regen', name: 'リジェネ', icon: 'favorite', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, recoverHp:  5 },
        { level:  2, spCost: 1, mpCost: 0, recoverHp: 10 },
        { level:  3, spCost: 1, mpCost: 0, recoverHp: 15 },
        { level:  4, spCost: 2, mpCost: 0, recoverHp: 20 },
        { level:  5, spCost: 2, mpCost: 0, recoverHp: 30 },
        { level:  6, spCost: 2, mpCost: 0, recoverHp: 40 },
        { level:  7, spCost: 3, mpCost: 0, recoverHp: 55 },
        { level:  8, spCost: 3, mpCost: 0, recoverHp: 70 },
        { level:  9, spCost: 3, mpCost: 0, recoverHp: 90 },
        { level: 10, spCost: 5, mpCost: 0, recoverHp: 120 }
      ],
      getDescription: (lc) => `自身の行動終了時に、HP を ${lc.recoverHp} 回復する`
    },
    {
      id: 'divine_protection', name: '神の加護', icon: 'stars', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, chance:  5 },
        { level:  2, spCost: 1, mpCost: 0, chance: 10 },
        { level:  3, spCost: 1, mpCost: 0, chance: 15 },
        { level:  4, spCost: 2, mpCost: 0, chance: 20 },
        { level:  5, spCost: 2, mpCost: 0, chance: 25 },
        { level:  6, spCost: 2, mpCost: 0, chance: 30 },
        { level:  7, spCost: 3, mpCost: 0, chance: 35 },
        { level:  8, spCost: 3, mpCost: 0, chance: 40 },
        { level:  9, spCost: 3, mpCost: 0, chance: 45 },
        { level: 10, spCost: 5, mpCost: 0, chance: 50 }
      ],
      getDescription: (lc) => `魔法攻撃時、${lc.chance}％ の確率で全体攻撃になる`
    }
  ],

  // ─── Auto Battle AI ────────────────────────────────────────
  autoBattle: (caster, context) => {
    const aliveEnemies = context.enemies.filter(e => !e.isDead);
    if (aliveEnemies.length === 0) return;

    const getSkillInfo = (sId) => {
      const level = context.getSkillLevel(sId);
      if (level > 0 && context.isSkillAutoEnabled(sId)) {
        const skillDef = context.getSkillDef(sId);
        if (skillDef) {
          const levelConfig = skillDef.levels.find(l => l.level === level) || skillDef.levels[skillDef.levels.length - 1];
          if (caster.mp.current >= levelConfig.mpCost) {
            return { id: sId, level, config: levelConfig, def: skillDef };
          }
        }
      }
      return null;
    };

    const raise = getSkillInfo('raise');
    const restore = getSkillInfo('restore');
    const heal = getSkillInfo('heal');
    const holy = getSkillInfo('holy');

    // 1. Raise dead allies
    if (raise) {
      const deadParty = context.party.filter(p => p.isDead);
      if (deadParty.length > 0) {
        context.executeSkill('raise');
        return;
      }
    }

    // 2. Restore ailments
    if (restore) {
      const afflictedParty = context.party.filter(p => !p.isDead && p.activeAilment);
      if (afflictedParty.length > 0) {
        context.executeSkill('restore');
        return;
      }
    }

    // 3. Heal low HP allies
    if (heal) {
      const aliveParty = context.party.filter(p => !p.isDead);
      const criticallyInjured = aliveParty.find(p => p.hp.current / p.hp.max < 0.4);
      if (criticallyInjured) {
        context.executeSkill('heal');
        return;
      }
      const lightlyInjured = aliveParty.find(p => p.hp.current / p.hp.max < 0.7);
      if (lightlyInjured && Math.random() < 0.6) {
        context.executeSkill('heal');
        return;
      }
    }

    // 4. Attack
    if (holy && Math.random() < 0.8) {
        let target = context.selectedEnemyTarget;
        if (!target || target.isDead) target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
        context.executeSkill('holy', target);
        return;
    }

    // Default: normal attack
    context.executeAttack();
  }
};
