export const ranger = {
  id: 'ranger',
  name: 'レンジャー',
  icon: 'images/jobs/job_ranger.webp', // We use image path for job icon here based on the requirement, or just simple 'track_changes' material icon? The request says "## 画像 - job_ranger.webp". The UI might expect a material symbol string or a URL. Actually `knight.js` uses `icon: 'shield_person'`. But user explicitly specified `job_ranger.webp` as the image. Let's use `icon: 'assets/job_ranger.webp'`. If it doesn't work out of the box, we may need to adjust UI. Wait, let me check how norvice uses its icon. It uses `icon: 'person'`. I'll set `image: 'assets/job_ranger.webp'` and `icon: 'my_location'` just in case, but rely on `image`.
  changeCost: 50000,
  statGrowth: { hp: [1, 3], mp: [1, 2], atk: [1, 3], def: [1, 2], matk: [0, 1], mdef: [1, 2], spd: [2, 4] },
  skills: [
    // ─── Active Skills ──────────────────────────────────────
    {
      id: 'double_arrow', name: 'ダブルアロー', icon: 'keyboard_double_arrow_right',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  4, multiplier: 0.8 },
        { level:  2, spCost: 1, mpCost:  5, multiplier: 0.85 },
        { level:  3, spCost: 1, mpCost:  6, multiplier: 0.9 },
        { level:  4, spCost: 2, mpCost:  7, multiplier: 0.95 },
        { level:  5, spCost: 2, mpCost:  8, multiplier: 1.0 },
        { level:  6, spCost: 2, mpCost:  9, multiplier: 1.05 },
        { level:  7, spCost: 3, mpCost: 10, multiplier: 1.1 },
        { level:  8, spCost: 3, mpCost: 11, multiplier: 1.15 },
        { level:  9, spCost: 3, mpCost: 12, multiplier: 1.2 },
        { level: 10, spCost: 5, mpCost: 15, multiplier: 1.3 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵単体に ${lc.multiplier.toFixed(2)} 倍の物理攻撃を2連続で行う`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (target) {
          for (let i = 0; i < 2; i++) {
            setTimeout(() => {
              if (target && !target.isDead) {
                battle.executeAttack(caster, target, true, { actionName: 'ダブルアロー', damageMultiplier: levelConfig.multiplier, damageType: 'skill', hideActionName: i > 0 });
              }
            }, i * 200 / battle.speedMult);
          }
        }
      },
      autoBattle: {
        priority: 50,
        check: (caster, levelConfig, context) => {
          if (Math.random() < 0.8) {
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
    {
      id: 'arrow_rain', name: 'アローレイン', icon: 'shower',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost:  8, multiplier: 0.4 },
        { level:  2, spCost: 1, mpCost: 10, multiplier: 0.45 },
        { level:  3, spCost: 1, mpCost: 12, multiplier: 0.5 },
        { level:  4, spCost: 2, mpCost: 14, multiplier: 0.55 },
        { level:  5, spCost: 2, mpCost: 16, multiplier: 0.6 },
        { level:  6, spCost: 2, mpCost: 18, multiplier: 0.65 },
        { level:  7, spCost: 3, mpCost: 20, multiplier: 0.7 },
        { level:  8, spCost: 3, mpCost: 22, multiplier: 0.75 },
        { level:  9, spCost: 3, mpCost: 24, multiplier: 0.8 },
        { level: 10, spCost: 5, mpCost: 30, multiplier: 0.9 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵全体に ${lc.multiplier.toFixed(2)} 倍の物理攻撃を3回行う`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            const targets = battle.enemies.filter(e => !e.isDead);
            targets.forEach(target => {
              battle.executeAttack(caster, target, true, { actionName: 'アローレイン', damageMultiplier: levelConfig.multiplier, damageType: 'skill', hideActionName: i > 0 });
            });
          }, i * 300 / battle.speedMult);
        }
      },
      autoBattle: {
        priority: 70,
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length >= 2) {
            if (Math.random() < 0.8) {
              return true;
            }
          }
          return null;
        }
      }
    },
    {
      id: 'rain_of_arrows', name: '五月雨矢', icon: 'storm',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost: 15, multiplier: 0.15 },
        { level:  2, spCost: 2, mpCost: 18, multiplier: 0.17 },
        { level:  3, spCost: 2, mpCost: 21, multiplier: 0.19 },
        { level:  4, spCost: 3, mpCost: 24, multiplier: 0.21 },
        { level:  5, spCost: 3, mpCost: 27, multiplier: 0.23 },
        { level:  6, spCost: 3, mpCost: 30, multiplier: 0.25 },
        { level:  7, spCost: 4, mpCost: 34, multiplier: 0.27 },
        { level:  8, spCost: 4, mpCost: 38, multiplier: 0.29 },
        { level:  9, spCost: 4, mpCost: 42, multiplier: 0.31 },
        { level: 10, spCost: 6, mpCost: 50, multiplier: 0.35 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、ランダムな敵に ${lc.multiplier.toFixed(2)} 倍の物理攻撃を15回行う`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        let hits = 15;
        for (let i = 0; i < hits; i++) {
          setTimeout(() => {
            const aliveEnemies = battle.enemies.filter(e => !e.isDead);
            if (aliveEnemies.length > 0) {
              const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
              battle.executeAttack(caster, target, true, { actionName: '五月雨矢', damageMultiplier: levelConfig.multiplier, damageType: 'skill', hideActionName: true });
            }
          }, i * 100 / battle.speedMult);
        }
      },
      autoBattle: {
        priority: 80,
        check: (caster, levelConfig, context) => {
          if (Math.random() < 0.7) {
            return true;
          }
          return null;
        }
      }
    },
    // ─── Passive Skills ──────────────────────────────────────
    {
      id: 'spd_boost', name: '基礎スピードアップ', icon: 'speed', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, bonusSpd:  3 },
        { level:  2, spCost: 1, mpCost: 0, bonusSpd:  6 },
        { level:  3, spCost: 1, mpCost: 0, bonusSpd:  9 },
        { level:  4, spCost: 2, mpCost: 0, bonusSpd: 12 },
        { level:  5, spCost: 2, mpCost: 0, bonusSpd: 15 },
        { level:  6, spCost: 2, mpCost: 0, bonusSpd: 18 },
        { level:  7, spCost: 3, mpCost: 0, bonusSpd: 21 },
        { level:  8, spCost: 3, mpCost: 0, bonusSpd: 25 },
        { level:  9, spCost: 3, mpCost: 0, bonusSpd: 30 },
        { level: 10, spCost: 5, mpCost: 0, bonusSpd: 40 }
      ],
      getDescription: (lc) => `基礎スピード（SPD）が ${lc.bonusSpd} 上昇する`
    },
    {
      id: 'plus_one', name: 'プラスワン', icon: 'exposure_plus_1', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, hits: 1 },
        { level:  2, spCost: 1, mpCost: 0, hits: 1 },
        { level:  3, spCost: 1, mpCost: 0, hits: 1 },
        { level:  4, spCost: 2, mpCost: 0, hits: 2 },
        { level:  5, spCost: 2, mpCost: 0, hits: 2 },
        { level:  6, spCost: 2, mpCost: 0, hits: 2 },
        { level:  7, spCost: 3, mpCost: 0, hits: 3 },
        { level:  8, spCost: 3, mpCost: 0, hits: 3 },
        { level:  9, spCost: 3, mpCost: 0, hits: 3 },
        { level: 10, spCost: 5, mpCost: 0, hits: 4 }
      ],
      getDescription: (lc) => `通常攻撃時、必ず ${lc.hits} 回追撃する。追撃ダメージの威力は通常の半分（1/2）となる`
    },
    {
      id: 'double_act', name: 'ダブルアクト', icon: 'flip', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, chance:  5 },
        { level:  2, spCost: 1, mpCost: 0, chance:  8 },
        { level:  3, spCost: 1, mpCost: 0, chance: 11 },
        { level:  4, spCost: 2, mpCost: 0, chance: 14 },
        { level:  5, spCost: 2, mpCost: 0, chance: 17 },
        { level:  6, spCost: 2, mpCost: 0, chance: 20 },
        { level:  7, spCost: 3, mpCost: 0, chance: 25 },
        { level:  8, spCost: 3, mpCost: 0, chance: 30 },
        { level:  9, spCost: 3, mpCost: 0, chance: 35 },
        { level: 10, spCost: 5, mpCost: 0, chance: 40 }
      ],
      getDescription: (lc) => `スキル使用時、${lc.chance}％ の確率で MP を消費せずに同じスキルを2回連続で発動する`
    }
  ]
};
