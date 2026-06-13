export const knight = {
  id: 'knight',
  name: 'ナイト',
  icon: 'shield_person',
  changeCost: 30000,
  statGrowth: { hp: [2, 4], mp: [0, 1], atk: [0, 2], def: [1, 2], matk: [0, 0], mdef: [0, 2], spd: [0, 1] },
  skills: [
    // ─── Active Skills ──────────────────────────────────────
    {
      id: 'provoke', name: '挑発', icon: 'record_voice_over',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  3, turns: 2, chance: 20 },
        { level:  2, spCost: 1, mpCost:  4, turns: 2, chance: 25 },
        { level:  3, spCost: 1, mpCost:  5, turns: 2, chance: 28 },
        { level:  4, spCost: 2, mpCost:  6, turns: 3, chance: 30 },
        { level:  5, spCost: 2, mpCost:  7, turns: 3, chance: 33 },
        { level:  6, spCost: 2, mpCost:  8, turns: 3, chance: 36 },
        { level:  7, spCost: 3, mpCost:  9, turns: 4, chance: 40 },
        { level:  8, spCost: 3, mpCost: 10, turns: 4, chance: 43 },
        { level:  9, spCost: 3, mpCost: 11, turns: 4, chance: 46 },
        { level: 10, spCost: 5, mpCost: 14, turns: 5, chance: 50 }
      ],
      getDescription: (lc) => `${lc.turns} ターンの間、${lc.chance}％ の確率で味方を庇う`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        caster._provokeTurns = levelConfig.turns;
        caster._provokeChance = levelConfig.chance;
        battle.showDamage(caster.elementId, '挑発', 'text-amber-400');
      },
      autoBattle: {
        priority: 80,
        check: (caster, levelConfig, context) => {
          if (!caster._provokeTurns || caster._provokeTurns <= 0) {
            const aliveParty = context.party.filter(p => !p.isDead);
            const anyAllyLowHp = aliveParty.some(p => p !== caster && p.hp.current / (p.stats?.hp || p.hp.max) < 0.5);
            if (anyAllyLowHp || Math.random() < 0.4) return true;
          }
          return null;
        }
      }
    },
    {
      id: 'defense_formation', name: '物理防御陣形', icon: 'security',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  4, defPercent: 10, turns: 3 },
        { level:  2, spCost: 1, mpCost:  5, defPercent: 13, turns: 3 },
        { level:  3, spCost: 1, mpCost:  6, defPercent: 16, turns: 3 },
        { level:  4, spCost: 2, mpCost:  7, defPercent: 19, turns: 3 },
        { level:  5, spCost: 2, mpCost:  8, defPercent: 22, turns: 3 },
        { level:  6, spCost: 2, mpCost:  9, defPercent: 25, turns: 3 },
        { level:  7, spCost: 3, mpCost: 10, defPercent: 28, turns: 4 },
        { level:  8, spCost: 3, mpCost: 11, defPercent: 32, turns: 4 },
        { level:  9, spCost: 3, mpCost: 12, defPercent: 36, turns: 4 },
        { level: 10, spCost: 5, mpCost: 15, defPercent: 40, turns: 5 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、味方全員の防御力を ${lc.turns} ターンの間 ${lc.defPercent}％ アップする`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        const aliveParty = battle.party.filter(p => !p.isDead);
        aliveParty.forEach(p => {
          p._defBuffPercent = levelConfig.defPercent;
          p._defBuffTurns = levelConfig.turns;
        });
        battle.showDamage(caster.elementId, 'DEF UP', 'text-blue-400');
      },
      autoBattle: {
        priority: 80,
        check: (caster, levelConfig, context) => {
          const aliveParty = context.party.filter(p => !p.isDead);
          const hasDefBuff = aliveParty.some(p => p._defBuffTurns && p._defBuffTurns > 0);
          if (!hasDefBuff && Math.random() < 0.5) return true;
          return null;
        }
      }
    },
    {
      id: 'shield_attack', name: 'シールドアタック', icon: 'shield',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  3, multiplier: 1.0 },
        { level:  2, spCost: 1, mpCost:  4, multiplier: 1.05 },
        { level:  3, spCost: 1, mpCost:  5, multiplier: 1.1 },
        { level:  4, spCost: 2, mpCost:  6, multiplier: 1.15 },
        { level:  5, spCost: 2, mpCost:  7, multiplier: 1.2 },
        { level:  6, spCost: 2, mpCost:  8, multiplier: 1.25 },
        { level:  7, spCost: 3, mpCost:  9, multiplier: 1.3 },
        { level:  8, spCost: 3, mpCost: 10, multiplier: 1.35 },
        { level:  9, spCost: 3, mpCost: 11, multiplier: 1.4 },
        { level: 10, spCost: 5, mpCost: 14, multiplier: 1.5 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、盾の物理防御力＋自身の攻撃力で ${lc.multiplier.toFixed(2)} 倍の物理攻撃を行う`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (!target) return;

        // Calculate shield DEF bonus
        let shieldDef = 0;
        if (caster.equipment && caster.equipment.leftHand) {
          const shield = battle.equipMap.get(caster.equipment.leftHand);
          if (shield && shield.stats && shield.stats.def) {
            shieldDef = shield.stats.def;
          }
        }

        // Combined ATK = caster ATK + shield DEF
        const combinedAtk = (caster.stats.atk || 0) + shieldDef;
        const defStat = target.stats.def || 0;
        let damage = Math.max(1, combinedAtk - Math.floor(defStat / 2));
        damage = Math.floor(damage * (0.9 + Math.random() * 0.2));
        damage = Math.floor(damage * levelConfig.multiplier);

        // Apply element damage proportionally (same as executeAttack)
        const attackElements = caster.stats.attackElements || {};
        const defenderElementResist = target.stats.elementResist || {};
        let totalElementPercent = 0;
        for (const val of Object.values(attackElements)) {
          if (val > 0) totalElementPercent += val;
        }
        let elementPortionScale = 1.0;
        if (totalElementPercent > 100) elementPortionScale = 100 / totalElementPercent;
        let nonElementalPercent = Math.max(0, 100 - totalElementPercent);
        if (totalElementPercent > 100) nonElementalPercent = 0;

        let finalDamage = 0;
        for (const [el, val] of Object.entries(attackElements)) {
          if (val > 0) {
            const resist = defenderElementResist[el] || 0;
            const mult = Math.max(0, 1 - (resist / 100));
            finalDamage += damage * (val * elementPortionScale / 100) * mult;
          }
        }
        finalDamage += damage * (nonElementalPercent / 100);
        damage = Math.max(1, Math.floor(finalDamage));

        // Apply damage to target
        if (target.hp !== undefined) {
          target.hp.current -= damage;
          if (target.hp.current <= 0) {
            target.hp.current = 0;
            target.isDead = true;
          }
        } else {
          target.currentHp -= damage;
          if (target.currentHp <= 0) {
            target.currentHp = 0;
            target.isDead = true;
            battle.processEnemyDeath(target);
          }
        }

        battle.showDamage(target.elementId, damage, 'text-white');
        battle.renderEntities();
        battle.checkBattleEnd();
      },
      autoBattle: {
        priority: 60,
        check: (caster, levelConfig, context) => {
          if (caster.equipment && caster.equipment.leftHand && Math.random() < 0.7) {
            const aliveEnemies = context.enemies.filter(e => !e.isDead);
            if (aliveEnemies.length === 0) return null;
            let target = context.selectedEnemyTarget;
            if (!target || target.isDead) target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
            return target;
          }
          return null;
        }
      }
    },
    // ─── Passive Skills ──────────────────────────────────────
    {
      id: 'def_boost', name: '基礎物理防御力アップ', icon: 'shield_with_heart', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, bonusDef:  3 },
        { level:  2, spCost: 1, mpCost: 0, bonusDef:  6 },
        { level:  3, spCost: 1, mpCost: 0, bonusDef:  9 },
        { level:  4, spCost: 2, mpCost: 0, bonusDef: 12 },
        { level:  5, spCost: 2, mpCost: 0, bonusDef: 15 },
        { level:  6, spCost: 2, mpCost: 0, bonusDef: 18 },
        { level:  7, spCost: 3, mpCost: 0, bonusDef: 21 },
        { level:  8, spCost: 3, mpCost: 0, bonusDef: 24 },
        { level:  9, spCost: 3, mpCost: 0, bonusDef: 27 },
        { level: 10, spCost: 5, mpCost: 0, bonusDef: 30 }
      ],
      getDescription: (lc) => `物理防御力が ${lc.bonusDef} 上昇する`
    },
    {
      id: 'mdef_boost', name: '基礎属性防御力アップ', icon: 'magic_button', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, bonusMdef:  3 },
        { level:  2, spCost: 1, mpCost: 0, bonusMdef:  6 },
        { level:  3, spCost: 1, mpCost: 0, bonusMdef:  9 },
        { level:  4, spCost: 2, mpCost: 0, bonusMdef: 12 },
        { level:  5, spCost: 2, mpCost: 0, bonusMdef: 15 },
        { level:  6, spCost: 2, mpCost: 0, bonusMdef: 18 },
        { level:  7, spCost: 3, mpCost: 0, bonusMdef: 21 },
        { level:  8, spCost: 3, mpCost: 0, bonusMdef: 24 },
        { level:  9, spCost: 3, mpCost: 0, bonusMdef: 27 },
        { level: 10, spCost: 5, mpCost: 0, bonusMdef: 30 }
      ],
      getDescription: (lc) => `属性防御力が ${lc.bonusMdef} 上昇する`
    },
    {
      id: 'parry', name: 'パリィ', icon: 'swords', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, chance:  3 },
        { level:  2, spCost: 1, mpCost: 0, chance:  4 },
        { level:  3, spCost: 1, mpCost: 0, chance:  5 },
        { level:  4, spCost: 2, mpCost: 0, chance:  6 },
        { level:  5, spCost: 2, mpCost: 0, chance:  7 },
        { level:  6, spCost: 2, mpCost: 0, chance:  8 },
        { level:  7, spCost: 3, mpCost: 0, chance: 10 },
        { level:  8, spCost: 3, mpCost: 0, chance: 12 },
        { level:  9, spCost: 3, mpCost: 0, chance: 13 },
        { level: 10, spCost: 5, mpCost: 0, chance: 15 }
      ],
      getDescription: (lc) => `${lc.chance}％ の確率で、物理攻撃を無効化する`
    }
  ]
};
