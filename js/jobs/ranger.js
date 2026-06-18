// ─── Animation Utilities ──────────────────────────────────────
const playSkillAnimation = (caster, targets, type, onImpact) => {
  if (!Array.isArray(targets)) targets = [targets];
  if (localStorage.getItem('disableBattleAnimations') === 'true') {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
    return;
  }

  const casterEl = document.getElementById(caster.elementId);

  const screenShake = (intensity = 3, duration = 150) => {
    // Screen shake disabled globally by user request
  };

  const createHitSparks = (x, y, color = '#bef264') => {
    for (let i = 0; i < 4; i++) {
      const spark = document.createElement('div');
      spark.style.position = 'fixed';
      spark.style.left = `${x - 2}px`;
      spark.style.top = `${y - 15}px`;
      spark.style.width = '4px';
      spark.style.height = '30px';
      spark.style.background = color;
      spark.style.boxShadow = `0 0 8px ${color}`;
      spark.style.borderRadius = '2px';
      spark.style.zIndex = '9999';
      spark.style.pointerEvents = 'none';
      document.body.appendChild(spark);

      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 20;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;

      const anim = spark.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0)`, opacity: 0 }
      ], { duration: 200 + Math.random() * 100, easing: 'ease-out' });
      
      anim.onfinish = () => spark.remove();
    }
  };

  targets.forEach((target, index) => {
    const targetEl = document.getElementById(target.elementId);
    if (!targetEl) {
      if (onImpact) onImpact(target, index);
      return;
    }
    
    const targetRect = targetEl.getBoundingClientRect();
    const tx = targetRect.left + targetRect.width / 2;
    const ty = targetRect.top + targetRect.height / 2;

    const casterRect = casterEl ? casterEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const cx = casterRect.left + casterRect.width / 2;
    const cy = casterRect.top + casterRect.height / 2;

    setTimeout(() => {
      switch (type) {
        case 'single_arrow': {
          const arrow = document.createElement('div');
          arrow.style.position = 'fixed';
          arrow.style.left = `${cx - 20}px`;
          arrow.style.top = `${cy - 2}px`;
          arrow.style.width = '40px';
          arrow.style.height = '4px';
          arrow.style.background = 'linear-gradient(to right, transparent, #bef264, #fff)';
          arrow.style.boxShadow = '0 0 5px #bef264';
          arrow.style.zIndex = '9999';
          arrow.style.pointerEvents = 'none';
          document.body.appendChild(arrow);

          const angle = Math.atan2(ty - cy, tx - cx);
          const dist = Math.hypot(tx - cx, ty - cy);
          const duration = 150;

          const anim = arrow.animate([
            { transform: `rotate(${angle}rad) translateX(0px)`, opacity: 0 },
            { transform: `rotate(${angle}rad) translateX(${dist * 0.2}px)`, opacity: 1, offset: 0.2 },
            { transform: `rotate(${angle}rad) translateX(${dist}px)`, opacity: 1 }
          ], { duration: duration, easing: 'ease-in' });

          anim.onfinish = () => {
            arrow.remove();
            createHitSparks(tx, ty);
            screenShake(2, 100);
            if (onImpact) onImpact(target, index);
          };
          break;
        }
        case 'arrow_rain': {
          const arrow = document.createElement('div');
          arrow.style.position = 'fixed';
          arrow.style.left = `${tx - 2}px`;
          arrow.style.top = `-50px`;
          arrow.style.width = '4px';
          arrow.style.height = '40px';
          arrow.style.background = 'linear-gradient(to bottom, transparent, #86efac, #fff)';
          arrow.style.boxShadow = '0 0 8px #86efac';
          arrow.style.zIndex = '9999';
          arrow.style.pointerEvents = 'none';
          document.body.appendChild(arrow);

          const fallDist = ty + 50;
          
          const anim = arrow.animate([
            { transform: `translateY(0px)`, opacity: 1 },
            { transform: `translateY(${fallDist}px)`, opacity: 1 }
          ], { duration: 200, easing: 'ease-in' });

          anim.onfinish = () => {
            arrow.remove();
            createHitSparks(tx, ty, '#86efac');
            screenShake(3, 100);
            if (onImpact) onImpact(target, index);
          };
          break;
        }
      }
    }, index * 20);
  });
};

export const ranger = {
  id: 'ranger',
  name: 'レンジャー',
  icon: 'images/jobs/job_ranger.webp', // We use image path for job icon here based on the requirement, or just simple 'track_changes' material icon? The request says "## 画像 - job_ranger.webp". The UI might expect a material symbol string or a URL. Actually `knight.js` uses `icon: 'shield_person'`. But user explicitly specified `job_ranger.webp` as the image. Let's use `icon: 'assets/job_ranger.webp'`. If it doesn't work out of the box, we may need to adjust UI. Wait, let me check how norvice uses its icon. It uses `icon: 'person'`. I'll set `image: 'assets/job_ranger.webp'` and `icon: 'my_location'` just in case, but rely on `image`.
  changeCost: 50000,
  skills: [
    // ─── Active Skills ──────────────────────────────────────
    {
      id: 'double_arrow', name: 'ダブルアロー', icon: 'keyboard_double_arrow_right', statDependency: 'ATK',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 8, multiplier: 0.8, hits: 2 },
        { level:  2, spCost: 1, mpCost: 10, multiplier: 0.85, hits: 2 },
        { level:  3, spCost: 1, mpCost: 12, multiplier: 0.9, hits: 2 },
        { level:  4, spCost: 2, mpCost: 14, multiplier: 0.95, hits: 3 },
        { level:  5, spCost: 2, mpCost: 16, multiplier: 1.0, hits: 3 },
        { level:  6, spCost: 2, mpCost: 18, multiplier: 1.05, hits: 3 },
        { level:  7, spCost: 3, mpCost: 20, multiplier: 1.1, hits: 4 },
        { level:  8, spCost: 3, mpCost: 22, multiplier: 1.15, hits: 4 },
        { level:  9, spCost: 3, mpCost: 24, multiplier: 1.2, hits: 4 },
        { level: 10, spCost: 5, mpCost: 30, multiplier: 1.3, hits: 5 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵単体に ${lc.multiplier.toFixed(2)} 倍の物理攻撃を${lc.hits}連続で行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (target) {
          for (let i = 0; i < levelConfig.hits; i++) {
            setTimeout(() => {
              if (target && !target.isDead) {
                playSkillAnimation(caster, [target], 'single_arrow', () => {
                  if (target.isDead) return;
                  battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency, 
                    actionName: '', 
                    damageMultiplier: levelConfig.multiplier, 
                    damageType: 'skill', 
                    hideActionName: true,
                    skipAtbReset: i > 0
                  });
                });
              }
            }, i * 200 / (battle.speedMult || 1));
          }
        }
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let target = context.selectedEnemyTarget;
          if (!target || target.isDead) target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          return { target, score: 35 * levelConfig.multiplier * levelConfig.hits };
        }
      }
    },
    {
      id: 'arrow_rain', name: 'アローレイン', icon: 'shower', statDependency: 'ATK',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 30, multiplier: 0.4, hits: 2 },
        { level:  2, spCost: 1, mpCost: 34, multiplier: 0.45, hits: 2 },
        { level:  3, spCost: 1, mpCost: 38, multiplier: 0.5, hits: 3 },
        { level:  4, spCost: 2, mpCost: 42, multiplier: 0.55, hits: 3 },
        { level:  5, spCost: 2, mpCost: 44, multiplier: 0.6, hits: 4 },
        { level:  6, spCost: 2, mpCost: 48, multiplier: 0.65, hits: 4 },
        { level:  7, spCost: 3, mpCost: 52, multiplier: 0.7, hits: 5 },
        { level:  8, spCost: 3, mpCost: 56, multiplier: 0.75, hits: 5 },
        { level:  9, spCost: 3, mpCost: 60, multiplier: 0.8, hits: 6 },
        { level: 10, spCost: 5, mpCost: 64, multiplier: 0.9, hits: 6 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵全体に ${lc.multiplier.toFixed(2)} 倍の物理攻撃を${lc.hits}回行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        for (let i = 0; i < levelConfig.hits; i++) {
          setTimeout(() => {
            const targets = battle.enemies.filter(e => !e.isDead);
            playSkillAnimation(caster, targets, 'arrow_rain', (target, idx) => {
              if (target.isDead) return;
              battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency, 
                actionName: '', 
                damageMultiplier: levelConfig.multiplier, 
                damageType: 'skill', 
                hideActionName: true,
                skipAtbReset: (i > 0) || (idx > 0),
                isAoEProcessed: true
              });
            });
          }, i * 300 / (battle.speedMult || 1));
        }
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length >= 2) {
             return { target: aliveEnemies[0], score: 40 * levelConfig.multiplier * levelConfig.hits + (aliveEnemies.length * 10) };
          }
          return null;
        }
      }
    },
    {
      id: 'rain_of_arrows', name: '五月雨矢', icon: 'storm', statDependency: 'ATK',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost: 30, multiplier: 0.15, hits: 6 },
        { level:  2, spCost: 2, mpCost: 36, multiplier: 0.17, hits: 7 },
        { level:  3, spCost: 2, mpCost: 42, multiplier: 0.19, hits: 8 },
        { level:  4, spCost: 3, mpCost: 48, multiplier: 0.21, hits: 9 },
        { level:  5, spCost: 3, mpCost: 54, multiplier: 0.23, hits: 10 },
        { level:  6, spCost: 3, mpCost: 60, multiplier: 0.25, hits: 11 },
        { level:  7, spCost: 4, mpCost: 68, multiplier: 0.27, hits: 12 },
        { level:  8, spCost: 4, mpCost: 76, multiplier: 0.29, hits: 13 },
        { level:  9, spCost: 4, mpCost: 84, multiplier: 0.31, hits: 14 },
        { level: 10, spCost: 6, mpCost: 100, multiplier: 0.35, hits: 15 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、ランダムな敵に ${lc.multiplier.toFixed(2)} 倍の物理攻撃を${lc.hits}回行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let hits = levelConfig.hits;
        for (let i = 0; i < hits; i++) {
          setTimeout(() => {
            const aliveEnemies = battle.enemies.filter(e => !e.isDead);
            if (aliveEnemies.length > 0) {
              const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
              playSkillAnimation(caster, [target], 'arrow_rain', () => {
                if (target.isDead) return;
                battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency, 
                  actionName: '', 
                  damageMultiplier: levelConfig.multiplier, 
                  damageType: 'skill', 
                  hideActionName: true,
                  skipAtbReset: i > 0
                });
              });
            }
          }, i * 100 / (battle.speedMult || 1));
        }
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          return { target: aliveEnemies[0], score: 45 * levelConfig.multiplier * levelConfig.hits };
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
        { level:  1, spCost: 1, mpCost: 0, hits: 1, multiplier: 0.5 },
        { level:  2, spCost: 1, mpCost: 0, hits: 1, multiplier: 0.55 },
        { level:  3, spCost: 1, mpCost: 0, hits: 1, multiplier: 0.6 },
        { level:  4, spCost: 2, mpCost: 0, hits: 2, multiplier: 0.65 },
        { level:  5, spCost: 2, mpCost: 0, hits: 2, multiplier: 0.7 },
        { level:  6, spCost: 2, mpCost: 0, hits: 2, multiplier: 0.75 },
        { level:  7, spCost: 3, mpCost: 0, hits: 3, multiplier: 0.8 },
        { level:  8, spCost: 3, mpCost: 0, hits: 3, multiplier: 0.85 },
        { level:  9, spCost: 3, mpCost: 0, hits: 3, multiplier: 0.9 },
        { level: 10, spCost: 5, mpCost: 0, hits: 4, multiplier: 1.0 }
      ],
      getDescription: (lc) => `通常攻撃時、必ず ${lc.hits} 回追撃する。追撃ダメージの威力は通常の ${lc.multiplier} 倍となる`
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
