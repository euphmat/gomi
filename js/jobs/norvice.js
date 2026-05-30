export const norvice = {
  id: 'norvice',
  name: 'ノービス',
  icon: 'person',
  statGrowth: { hp: 5, mp: 1, atk: 1, def: 1, matk: 1, mdef: 1, spd: 1 },
  skills: [
    {
      id: 'first_aid',
      name: '応急手当',
      icon: 'medical_services',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  1, healAmount: 10 },
        { level:  2, spCost: 1, mpCost:  1, healAmount: 15 },
        { level:  3, spCost: 1, mpCost:  2, healAmount: 22 },
        { level:  4, spCost: 2, mpCost:  3, healAmount: 30 },
        { level:  5, spCost: 2, mpCost:  4, healAmount: 40 },
        { level:  6, spCost: 2, mpCost:  5, healAmount: 52 },
        { level:  7, spCost: 3, mpCost:  6, healAmount: 66 },
        { level:  8, spCost: 3, mpCost:  8, healAmount: 82 },
        { level:  9, spCost: 3, mpCost: 10, healAmount: 100 },
        { level: 10, spCost: 5, mpCost: 12, healAmount: 120 }
      ],
      getDescription: (levelConfig) => `自身の HP を ${levelConfig.healAmount} 回復 (固定値)`,
      execute: (caster, levelConfig) => {
        caster.hp.current = Math.min(caster.hp.current + levelConfig.healAmount, caster.hp.max);
        caster.mp.current = Math.max(0, caster.mp.current - levelConfig.mpCost);
      }
    }
  ]
};
