export const norvice = {
  id: 'norvice',
  name: 'ノービス',
  icon: 'person',
  statGrowth: { hp: [1, 2], mp: [0, 1], atk: [0, 1], def: [0, 1], matk: [0, 1], mdef: [0, 1], spd: [0, 1] },
  skills: [
    {
      id: 'first_aid', name: '応急手当', icon: 'medical_services',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  1, healAmount: 10 },
        { level:  2, spCost: 1, mpCost:  2, healAmount: 15 },
        { level:  3, spCost: 1, mpCost:  3, healAmount: 22 },
        { level:  4, spCost: 2, mpCost:  4, healAmount: 30 },
        { level:  5, spCost: 2, mpCost:  5, healAmount: 40 },
        { level:  6, spCost: 2, mpCost:  6, healAmount: 52 },
        { level:  7, spCost: 3, mpCost:  7, healAmount: 66 },
        { level:  8, spCost: 3, mpCost:  9, healAmount: 82 },
        { level:  9, spCost: 3, mpCost: 11, healAmount: 100 },
        { level: 10, spCost: 5, mpCost: 13, healAmount: 120 }
      ],
      getDescription: (levelConfig) => `自身の HP を ${levelConfig.healAmount} 回復 (固定値)`,
      execute: (caster, levelConfig) => {
        caster.hp.current = Math.min(caster.hp.current + levelConfig.healAmount, caster.hp.max);
        // mp is already deducted in battle.js executeSkill
      }
    },
    {
      id: 'heavy_strike', name: '強撃', icon: 'swords',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  2, multiplier: 1.1 },
        { level:  2, spCost: 1, mpCost:  3, multiplier: 1.2 },
        { level:  3, spCost: 1, mpCost:  4, multiplier: 1.3 },
        { level:  4, spCost: 2, mpCost:  5, multiplier: 1.4 },
        { level:  5, spCost: 2, mpCost:  6, multiplier: 1.5 },
        { level:  6, spCost: 2, mpCost:  7, multiplier: 1.6 },
        { level:  7, spCost: 3, mpCost:  8, multiplier: 1.7 },
        { level:  8, spCost: 3, mpCost:  9, multiplier: 1.8 },
        { level:  9, spCost: 3, mpCost: 10, multiplier: 1.9 },
        { level: 10, spCost: 5, mpCost: 12, multiplier: 2.0 }
      ],
      getDescription: (levelConfig) => `MP を ${levelConfig.mpCost} 消費し、敵単体に ${levelConfig.multiplier.toFixed(1)} 倍の物理攻撃を行う`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (target) {
            battle.executeAttack(caster, target, true, { actionName: '強撃', damageMultiplier: levelConfig.multiplier, damageType: 'skill', hideActionName: true });
        }
      }
    },
    {
      id: 'focus', name: '気合い', icon: 'self_improvement',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, recoverAmount:  2 },
        { level:  2, spCost: 1, mpCost: 0, recoverAmount:  3 },
        { level:  3, spCost: 1, mpCost: 0, recoverAmount:  4 },
        { level:  4, spCost: 2, mpCost: 0, recoverAmount:  5 },
        { level:  5, spCost: 2, mpCost: 0, recoverAmount:  6 },
        { level:  6, spCost: 2, mpCost: 0, recoverAmount:  7 },
        { level:  7, spCost: 3, mpCost: 0, recoverAmount:  8 },
        { level:  8, spCost: 3, mpCost: 0, recoverAmount:  9 },
        { level:  9, spCost: 3, mpCost: 0, recoverAmount: 10 },
        { level: 10, spCost: 5, mpCost: 0, recoverAmount: 15 }
      ],
      getDescription: (levelConfig) => `MP をごくわずか ${levelConfig.recoverAmount} 回復する`,
      execute: (caster, levelConfig, battle) => {
        caster.mp.current = Math.min(caster.mp.max, caster.mp.current + levelConfig.recoverAmount);
        if (battle) {
           battle.showDamage(caster.elementId, `+${levelConfig.recoverAmount} MP`, 'text-blue-400');
        }
      }
    },
    {
      id: 'intimidate', name: '威嚇', icon: 'mood_bad',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  2, reducePercent: 10, turns: 2 },
        { level:  2, spCost: 1, mpCost:  2, reducePercent: 12, turns: 2 },
        { level:  3, spCost: 1, mpCost:  3, reducePercent: 14, turns: 2 },
        { level:  4, spCost: 2, mpCost:  3, reducePercent: 16, turns: 3 },
        { level:  5, spCost: 2, mpCost:  4, reducePercent: 18, turns: 3 },
        { level:  6, spCost: 2, mpCost:  4, reducePercent: 20, turns: 3 },
        { level:  7, spCost: 3, mpCost:  5, reducePercent: 22, turns: 4 },
        { level:  8, spCost: 3, mpCost:  5, reducePercent: 24, turns: 4 },
        { level:  9, spCost: 3, mpCost:  6, reducePercent: 26, turns: 4 },
        { level: 10, spCost: 5, mpCost:  8, reducePercent: 30, turns: 5 }
      ],
      getDescription: (levelConfig) => `MP を ${levelConfig.mpCost} 消費し、敵1体の物理攻撃力を ${levelConfig.turns} ターンの間 ${levelConfig.reducePercent}％ 低下させる`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (target) {
            if (!target.originalAtk) target.originalAtk = target.stats.atk;
            target.stats.atk = Math.floor(target.originalAtk * (1 - levelConfig.reducePercent / 100));
            target.atkDebuffTurns = levelConfig.turns;
            
            battle.showDamage(target.elementId, 'ATK DOWN', 'text-blue-500');
        }
      }
    },
    {
      id: 'cleave', name: 'なぎ払い', icon: 'cyclone',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  4, multiplier: 0.5 },
        { level:  2, spCost: 1, mpCost:  5, multiplier: 0.55 },
        { level:  3, spCost: 1, mpCost:  6, multiplier: 0.6 },
        { level:  4, spCost: 2, mpCost:  7, multiplier: 0.65 },
        { level:  5, spCost: 2, mpCost:  8, multiplier: 0.7 },
        { level:  6, spCost: 2, mpCost:  9, multiplier: 0.75 },
        { level:  7, spCost: 3, mpCost: 10, multiplier: 0.8 },
        { level:  8, spCost: 3, mpCost: 11, multiplier: 0.85 },
        { level:  9, spCost: 3, mpCost: 12, multiplier: 0.9 },
        { level: 10, spCost: 5, mpCost: 15, multiplier: 1.0 }
      ],
      getDescription: (levelConfig) => `MP を ${levelConfig.mpCost} 消費し、敵全体に ${levelConfig.multiplier.toFixed(2)} 倍の物理攻撃を行う`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        const targets = battle.enemies.filter(e => !e.isDead);
        targets.forEach(target => {
            battle.executeAttack(caster, target, true, { actionName: 'なぎ払い', damageMultiplier: levelConfig.multiplier, damageType: 'skill', hideActionName: true });
        });
      }
    }
  ],
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

    const firstAid = getSkillInfo('first_aid');
    const focus = getSkillInfo('focus');
    const intimidate = getSkillInfo('intimidate');
    const cleave = getSkillInfo('cleave');
    const heavyStrike = getSkillInfo('heavy_strike');

    // 1. First Aid priority (Healing)
    if (firstAid) {
      if (caster.hp.current <= (caster.hp.max - firstAid.config.healAmount)) {
        context.executeSkill('first_aid');
        return;
      }
    }

    // 2. Focus priority (MP is very low)
    if (focus) {
      if (caster.mp.current < caster.mp.max * 0.3) {
        context.executeSkill('focus');
        return;
      }
    }

    // 3. Cleave priority (Multiple enemies)
    if (cleave && aliveEnemies.length >= 2) {
      if (Math.random() < 0.7 || caster.mp.current > caster.mp.max * 0.6) {
        context.executeSkill('cleave');
        return;
      }
    }

    // 4. Intimidate priority (Tough enemy without debuff)
    if (intimidate) {
      const toughEnemy = aliveEnemies.find(e => (!e.atkDebuffTurns || e.atkDebuffTurns <= 0) && (e.maxHp >= 50 || e.stats.atk >= 20));
      if (toughEnemy && Math.random() < 0.5) {
        context.executeSkill('intimidate', toughEnemy);
        return;
      }
    }

    // 5. Heavy Strike priority
    if (heavyStrike) {
      if (caster.mp.current > heavyStrike.config.mpCost * 2 && Math.random() < 0.6) {
        let target = context.selectedEnemyTarget;
        if (!target || target.isDead) target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
        context.executeSkill('heavy_strike', target);
        return;
      }
    }

    // Default: normal attack
    context.executeAttack();
  }
};
