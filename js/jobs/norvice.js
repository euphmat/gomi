export const norvice = {
  id: 'norvice',
  name: 'ノービス',
  icon: 'person',
  changeCost: 0,
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
      getDescription: (levelConfig) => `自身の HP を ${levelConfig.healAmount} 回復する`,
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
      getDescription: (levelConfig) => `MP を ${levelConfig.recoverAmount} 回復する`,
      execute: (caster, levelConfig, battle) => {
        caster.mp.current = Math.min(caster.mp.max, caster.mp.current + levelConfig.recoverAmount);
        if (battle) {
           battle.showDamage(caster.elementId, `+${levelConfig.recoverAmount}`, 'text-blue-400');
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
    },
    {
      id: 'hp_boost', name: '基本 HP 上昇', icon: 'favorite', type: 'passive',
      maxLevel: 10,
      levels: [
        { level: 1, spCost: 1, mpCost: 0, bonusHp: 10 },
        { level: 2, spCost: 1, mpCost: 0, bonusHp: 20 },
        { level: 3, spCost: 1, mpCost: 0, bonusHp: 30 },
        { level: 4, spCost: 2, mpCost: 0, bonusHp: 40 },
        { level: 5, spCost: 2, mpCost: 0, bonusHp: 50 },
        { level: 6, spCost: 2, mpCost: 0, bonusHp: 65 },
        { level: 7, spCost: 3, mpCost: 0, bonusHp: 80 },
        { level: 8, spCost: 3, mpCost: 0, bonusHp: 100 },
        { level: 9, spCost: 3, mpCost: 0, bonusHp: 120 },
        { level: 10, spCost: 5, mpCost: 0, bonusHp: 150 }
      ],
      getDescription: (levelConfig) => `最大 HP が ${levelConfig.bonusHp} 上昇する`
    },
    {
      id: 'counter', name: 'カウンター', icon: 'replay', type: 'passive',
      maxLevel: 10,
      levels: [
        { level: 1, spCost: 1, mpCost: 0, chance: 5 },
        { level: 2, spCost: 1, mpCost: 0, chance: 6 },
        { level: 3, spCost: 1, mpCost: 0, chance: 7 },
        { level: 4, spCost: 2, mpCost: 0, chance: 8 },
        { level: 5, spCost: 2, mpCost: 0, chance: 9 },
        { level: 6, spCost: 2, mpCost: 0, chance: 10 },
        { level: 7, spCost: 3, mpCost: 0, chance: 12 },
        { level: 8, spCost: 3, mpCost: 0, chance: 14 },
        { level: 9, spCost: 3, mpCost: 0, chance: 16 },
        { level: 10, spCost: 5, mpCost: 0, chance: 20 }
      ],
      getDescription: (levelConfig) => `攻撃を受けた時、${levelConfig.chance}％ の確率で通常攻撃で反撃する`
    },
    {
      id: 'guard', name: 'ガード', icon: 'shield', type: 'passive',
      maxLevel: 10,
      levels: [
        { level: 1, spCost: 1, mpCost: 0, chance: 10, reduction: 10 },
        { level: 2, spCost: 1, mpCost: 0, chance: 11, reduction: 12 },
        { level: 3, spCost: 1, mpCost: 0, chance: 12, reduction: 14 },
        { level: 4, spCost: 2, mpCost: 0, chance: 13, reduction: 16 },
        { level: 5, spCost: 2, mpCost: 0, chance: 14, reduction: 18 },
        { level: 6, spCost: 2, mpCost: 0, chance: 15, reduction: 20 },
        { level: 7, spCost: 3, mpCost: 0, chance: 16, reduction: 25 },
        { level: 8, spCost: 3, mpCost: 0, chance: 18, reduction: 30 },
        { level: 9, spCost: 3, mpCost: 0, chance: 20, reduction: 35 },
        { level: 10, spCost: 5, mpCost: 0, chance: 25, reduction: 40 }
      ],
      getDescription: (levelConfig) => `攻撃を受けた時、${levelConfig.chance}％ の確率で受けるダメージを ${levelConfig.reduction}％ 軽減する`
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
      const hpPercent = caster.hp.current / caster.hp.max;
      const missingHp = caster.hp.max - caster.hp.current;
      // 致命傷を避けるためHP60%未満、または回復量が無駄にならないHP80%未満の時に使用
      if (hpPercent < 0.6 || (hpPercent < 0.8 && missingHp >= firstAid.config.healAmount * 0.8)) {
        context.executeSkill('first_aid');
        return;
      }
    }

    // 2. Focus priority (MP is very low)
    if (focus) {
      // MPが30%未満の場合に使用
      if (caster.mp.current < caster.mp.max * 0.3) {
        context.executeSkill('focus');
        return;
      }
    }

    // 3. Cleave priority (Multiple enemies)
    if (cleave && aliveEnemies.length >= 2) {
      // 敵が複数いる場合は高確率で使用、MPが十分にあれば確実に見舞う
      if (Math.random() < 0.8 || caster.mp.current > caster.mp.max * 0.5) {
        context.executeSkill('cleave');
        return;
      }
    }

    // 4. Intimidate priority (Tough enemy without debuff)
    if (intimidate) {
      const toughEnemy = aliveEnemies.find(e => (!e.atkDebuffTurns || e.atkDebuffTurns <= 0) && (e.maxHp >= 50 || e.stats.atk >= 20));
      if (toughEnemy && Math.random() < 0.8) {
        context.executeSkill('intimidate', toughEnemy);
        return;
      }
    }

    // 5. Heavy Strike priority
    if (heavyStrike) {
      // MPがコスト以上あれば高確率で使用
      if (caster.mp.current >= heavyStrike.config.mpCost && Math.random() < 0.7) {
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
