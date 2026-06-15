export const magic_knight = {
  id: 'magic_knight',
  name: '魔法剣士',
  icon: 'swords',
  changeCost: 200000,
  requirements: [
    { jobId: 'knight', level: 50 },
    { jobId: 'mage', level: 50 }
  ],
  statGrowth: { hp: [2, 3], mp: [1, 3], atk: [1, 2], def: [1, 2], matk: [1, 2], mdef: [1, 2], spd: [0, 1] },
  skills: [
    // ─── Active Skills ──────────────────────────────────────
    {
      id: 'flame_tongue', name: 'フレイムタン', icon: 'local_fire_department',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 10, multiplier: 1.2 },
        { level:  2, spCost: 1, mpCost: 12, multiplier: 1.3 },
        { level:  3, spCost: 1, mpCost: 14, multiplier: 1.4 },
        { level:  4, spCost: 2, mpCost: 16, multiplier: 1.5 },
        { level:  5, spCost: 2, mpCost: 18, multiplier: 1.6 },
        { level:  6, spCost: 2, mpCost: 20, multiplier: 1.7 },
        { level:  7, spCost: 3, mpCost: 22, multiplier: 1.8 },
        { level:  8, spCost: 3, mpCost: 24, multiplier: 1.9 },
        { level:  9, spCost: 3, mpCost: 26, multiplier: 2.0 },
        { level: 10, spCost: 5, mpCost: 30, multiplier: 2.2 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、単体に ATK と MATK を合わせた ${lc.multiplier.toFixed(2)} 倍の炎属性複合攻撃を行う`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (!target) return;

        battle.executeAttack(caster, target, true, {
          actionName: 'フレイムタン',
          damageMultiplier: levelConfig.multiplier,
          damageType: 'skill',
          isMagic: false,
          isHybrid: true,
          element: 'fire'
        });
      },
      autoBattle: {
        priority: 70,
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let target = context.selectedEnemyTarget;
          if (!target || target.isDead) target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          return target;
        }
      }
    },
    {
      id: 'ice_brand', name: 'アイスブランド', icon: 'ac_unit',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 15, multiplier: 0.6, hits: 3 },
        { level:  2, spCost: 1, mpCost: 17, multiplier: 0.65, hits: 3 },
        { level:  3, spCost: 1, mpCost: 19, multiplier: 0.7, hits: 3 },
        { level:  4, spCost: 2, mpCost: 21, multiplier: 0.75, hits: 3 },
        { level:  5, spCost: 2, mpCost: 23, multiplier: 0.8, hits: 3 },
        { level:  6, spCost: 2, mpCost: 25, multiplier: 0.85, hits: 3 },
        { level:  7, spCost: 3, mpCost: 27, multiplier: 0.9, hits: 3 },
        { level:  8, spCost: 3, mpCost: 29, multiplier: 0.95, hits: 3 },
        { level:  9, spCost: 3, mpCost: 31, multiplier: 1.0, hits: 3 },
        { level: 10, spCost: 5, mpCost: 36, multiplier: 1.1, hits: 3 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、ランダムな敵に ATK と MATK を合わせた ${lc.multiplier.toFixed(2)} 倍の氷属性複合攻撃を ${lc.hits} 回行う`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        const hits = levelConfig.hits;
        let hitCount = 0;
        const interval = setInterval(() => {
          if (caster.isDead) {
            clearInterval(interval);
            return;
          }
          const aliveEnemies = battle.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0 || hitCount >= hits) {
            clearInterval(interval);
            return;
          }
          const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          battle.executeAttack(caster, target, true, {
            actionName: hitCount === 0 ? 'アイスブランド' : '',
            damageMultiplier: levelConfig.multiplier,
            damageType: 'skill',
            isMagic: false,
            isHybrid: true,
            element: 'ice',
            hideActionName: hitCount > 0
          });
          hitCount++;
        }, 300 / (battle.speedMult || 1));
      },
      autoBattle: {
        priority: 65,
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length > 0 && Math.random() < 0.7) {
            return context.selectedEnemyTarget || aliveEnemies[0];
          }
          return null;
        }
      }
    },
    {
      id: 'thunder_slash', name: 'サンダースラッシュ', icon: 'bolt',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 25, multiplier: 1.0 },
        { level:  2, spCost: 1, mpCost: 28, multiplier: 1.1 },
        { level:  3, spCost: 1, mpCost: 31, multiplier: 1.2 },
        { level:  4, spCost: 2, mpCost: 34, multiplier: 1.3 },
        { level:  5, spCost: 2, mpCost: 37, multiplier: 1.4 },
        { level:  6, spCost: 2, mpCost: 40, multiplier: 1.5 },
        { level:  7, spCost: 3, mpCost: 43, multiplier: 1.6 },
        { level:  8, spCost: 3, mpCost: 46, multiplier: 1.7 },
        { level:  9, spCost: 3, mpCost: 49, multiplier: 1.8 },
        { level: 10, spCost: 5, mpCost: 55, multiplier: 2.0 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵全体に ATK と MATK を合わせた ${lc.multiplier.toFixed(2)} 倍の雷属性複合攻撃を行う`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        const aliveEnemies = battle.enemies.filter(e => !e.isDead);
        if (aliveEnemies.length === 0) return;
        
        battle.showActionName(caster.elementId, 'サンダースラッシュ', 'text-yellow-300', 'border-yellow-500/50');
        
        aliveEnemies.forEach(target => {
          battle.executeAttack(caster, target, true, {
            actionName: '',
            damageMultiplier: levelConfig.multiplier,
            damageType: 'skill',
            isMagic: false,
            isHybrid: true,
            element: 'thunder',
            hideActionName: true
          });
        });
      },
      autoBattle: {
        priority: 80,
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length >= 2) return true;
          return null;
        }
      }
    },
    // ─── Passive Skills ──────────────────────────────────────
    {
      id: 'mighty_guard', name: 'マイティーガード', icon: 'security', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, percent: 10, turns: 3 },
        { level:  2, spCost: 1, mpCost: 0, percent: 12, turns: 3 },
        { level:  3, spCost: 1, mpCost: 0, percent: 14, turns: 3 },
        { level:  4, spCost: 2, mpCost: 0, percent: 16, turns: 4 },
        { level:  5, spCost: 2, mpCost: 0, percent: 18, turns: 4 },
        { level:  6, spCost: 2, mpCost: 0, percent: 20, turns: 4 },
        { level:  7, spCost: 3, mpCost: 0, percent: 22, turns: 5 },
        { level:  8, spCost: 3, mpCost: 0, percent: 24, turns: 5 },
        { level:  9, spCost: 3, mpCost: 0, percent: 26, turns: 5 },
        { level: 10, spCost: 5, mpCost: 0, percent: 30, turns: 6 }
      ],
      getDescription: (lc) => `戦闘開始時、パーティー全体の DEF と MDEF を ${lc.turns} ターンの間、${lc.percent}％ アップする`
    },
    {
      id: 'weapon_bless', name: 'ウェポンブレス', icon: 'auto_awesome', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, percent: 10, turns: 3 },
        { level:  2, spCost: 1, mpCost: 0, percent: 12, turns: 3 },
        { level:  3, spCost: 1, mpCost: 0, percent: 14, turns: 3 },
        { level:  4, spCost: 2, mpCost: 0, percent: 16, turns: 4 },
        { level:  5, spCost: 2, mpCost: 0, percent: 18, turns: 4 },
        { level:  6, spCost: 2, mpCost: 0, percent: 20, turns: 4 },
        { level:  7, spCost: 3, mpCost: 0, percent: 22, turns: 5 },
        { level:  8, spCost: 3, mpCost: 0, percent: 24, turns: 5 },
        { level:  9, spCost: 3, mpCost: 0, percent: 26, turns: 5 },
        { level: 10, spCost: 5, mpCost: 0, percent: 30, turns: 6 }
      ],
      getDescription: (lc) => `戦闘開始時、パーティー全体の ATK と MATK を ${lc.turns} ターンの間、${lc.percent}％ アップする`
    },
    {
      id: 'mp_absorb', name: 'MP吸収', icon: 'water_drop', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, percent: 2 },
        { level:  2, spCost: 1, mpCost: 0, percent: 4 },
        { level:  3, spCost: 1, mpCost: 0, percent: 6 },
        { level:  4, spCost: 2, mpCost: 0, percent: 8 },
        { level:  5, spCost: 2, mpCost: 0, percent: 10 },
        { level:  6, spCost: 2, mpCost: 0, percent: 12 },
        { level:  7, spCost: 3, mpCost: 0, percent: 14 },
        { level:  8, spCost: 3, mpCost: 0, percent: 16 },
        { level:  9, spCost: 3, mpCost: 0, percent: 18 },
        { level: 10, spCost: 5, mpCost: 0, percent: 20 }
      ],
      getDescription: (lc) => `通常攻撃で敵にダメージを与えた時、与えたダメージの ${lc.percent}％ 分の MP を回復する`
    }
  ]
};
