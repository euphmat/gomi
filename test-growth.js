const MONSTERS = [
  {
    id: "blue_slime",
    name: "ブルースライム",
    image: "assets/monsters/blue_slime.png",
    stats: { hp: 45, atk: 18, def: 12, matk: 0, mdef: 10, spd: 15 },
  }
];

const getBonusStats = (level, monsterDef) => {
  const stats = { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 };
  if (!monsterDef.stats) return stats;
  for (const key of Object.keys(stats)) {
    const baseVal = monsterDef.stats[key] || 0;
    const baseBonus = Math.max(1, Math.floor(baseVal * 0.10));
    const growth = Math.max(level, Math.floor(baseVal * level * 0.001));
    stats[key] = baseBonus + growth;
  }
  return stats;
};

const m = MONSTERS[0];
console.log("Level 0:", getBonusStats(0, m));
console.log("Level 1:", getBonusStats(1, m));
console.log("Level 2:", getBonusStats(2, m));

