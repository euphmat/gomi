export const norvice = {
  id: 'norvice',
  name: 'ノービス',
  icon: 'person',
  statGrowth: { hp: 2, mp: 1, atk: 1, def: 1, matk: 1, mdef: 1, spd: 1 },
  skills: [
    {
      id: 'first_aid',
      name: '応急手当',
      icon: 'medical_services',
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
        caster.mp.current = Math.max(0, caster.mp.current - levelConfig.mpCost);
      }
    }
  ],
  autoBattle: (caster, context) => {
    const skillId = 'first_aid';
    const level = context.getSkillLevel(skillId);
    
    if (level > 0 && context.isSkillAutoEnabled(skillId)) {
      const skillDef = context.getSkillDef(skillId);
      if (skillDef) {
        const levelConfig = skillDef.levels.find(l => l.level === level) || skillDef.levels[skillDef.levels.length - 1];
        const canCast = caster.mp.current >= levelConfig.mpCost;
        const needsHeal = caster.hp.current <= (caster.hp.max - levelConfig.healAmount);
        
        if (canCast && needsHeal) {
          context.executeSkill(skillId);
          return;
        }
      }
    }
    
    context.executeAttack();
  }
};
