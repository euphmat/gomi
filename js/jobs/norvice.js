// ─── Animation Utilities ──────────────────────────────────────
const playSkillAnimation = (caster, targets, type, onImpact) => {
  if (!Array.isArray(targets)) targets = [targets];
  if (localStorage.getItem('disableBattleAnimations') === 'true') {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
    return;
  }

  const screenShake = (intensity = 5, duration = 300) => {
    // Screen shake disabled globally by user request
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

    setTimeout(() => {
      switch (type) {
        case 'first_aid': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 30}px`;
          el.style.top = `${ty - 30}px`;
          el.style.width = '60px';
          el.style.height = '60px';
          el.style.background = '#4ade80';
          el.style.clipPath = 'polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)';
          el.style.boxShadow = '0 0 15px #4ade80';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          document.body.appendChild(el);

          const anim = el.animate([
            { transform: 'scale(0) translateY(20px)', opacity: 0 },
            { transform: 'scale(1.2) translateY(0px)', opacity: 1, offset: 0.5 },
            { transform: 'scale(1) translateY(-20px)', opacity: 0 }
          ], { duration: 600, easing: 'ease-out' });

          anim.onfinish = () => el.remove();
          setTimeout(() => { if (onImpact) onImpact(target, index); }, 300);
          break;
        }
        case 'heavy_strike': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 50}px`;
          el.style.top = `${ty - 50}px`;
          el.style.width = '100px';
          el.style.height = '100px';
          el.style.background = 'radial-gradient(circle, #fff, #cbd5e1, transparent)';
          el.style.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          document.body.appendChild(el);

          const anim = el.animate([
            { transform: 'scale(0.2) rotate(-45deg)', opacity: 0 },
            { transform: 'scale(1.5) rotate(0deg)', opacity: 1, offset: 0.3 },
            { transform: 'scale(2) rotate(45deg)', opacity: 0 }
          ], { duration: 300, easing: 'ease-out' });

          anim.onfinish = () => el.remove();
          screenShake(4, 200);
          setTimeout(() => { if (onImpact) onImpact(target, index); }, 100);
          break;
        }
        case 'focus': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 40}px`;
          el.style.top = `${ty - 60}px`;
          el.style.width = '80px';
          el.style.height = '120px';
          el.style.background = 'linear-gradient(to top, transparent, rgba(59, 130, 246, 0.8), rgba(96, 165, 250, 0.2))';
          el.style.borderRadius = '50% 50% 10% 10%';
          el.style.filter = 'blur(4px)';
          el.style.zIndex = '9998';
          el.style.pointerEvents = 'none';
          document.body.appendChild(el);

          const anim = el.animate([
            { transform: 'scaleY(0)', opacity: 0, transformOrigin: 'bottom' },
            { transform: 'scaleY(1.2)', opacity: 1, offset: 0.5, transformOrigin: 'bottom' },
            { transform: 'scaleY(1.5)', opacity: 0, transformOrigin: 'bottom' }
          ], { duration: 600, easing: 'ease-out' });

          anim.onfinish = () => el.remove();
          setTimeout(() => { if (onImpact) onImpact(target, index); }, 300);
          break;
        }
        case 'intimidate': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 40}px`;
          el.style.top = `${ty - 80}px`;
          el.style.width = '80px';
          el.style.height = '80px';
          el.style.background = 'radial-gradient(circle, #7e22ce, transparent)';
          el.style.borderRadius = '50%';
          el.style.boxShadow = '0 0 20px #9333ea';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          document.body.appendChild(el);

          const anim = el.animate([
            { transform: 'scale(0.5) translateY(-20px)', opacity: 0 },
            { transform: 'scale(1.5) translateY(0px)', opacity: 0.8, offset: 0.5 },
            { transform: 'scale(2) translateY(20px)', opacity: 0 }
          ], { duration: 500, easing: 'ease-in-out' });

          anim.onfinish = () => el.remove();
          setTimeout(() => { if (onImpact) onImpact(target, index); }, 250);
          break;
        }
        case 'cleave': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 80}px`;
          el.style.top = `${ty - 20}px`;
          el.style.width = '160px';
          el.style.height = '40px';
          el.style.background = 'linear-gradient(to bottom, transparent, #fff, #94a3b8, transparent)';
          el.style.borderRadius = '50%';
          el.style.boxShadow = '0 0 10px #fff';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          document.body.appendChild(el);

          const anim = el.animate([
            { transform: 'scaleX(0) translateX(-50px)', opacity: 0 },
            { transform: 'scaleX(1.2) translateX(0px)', opacity: 1, offset: 0.5 },
            { transform: 'scaleX(1.5) translateX(50px)', opacity: 0 }
          ], { duration: 300, easing: 'ease-out' });

          anim.onfinish = () => el.remove();
          setTimeout(() => { if (onImpact) onImpact(target, index); }, 150);
          break;
        }
      }
    }, index * 80);
  });
};

export const norvice = {
  id: 'norvice',
  name: 'ノービス',
  icon: 'person',
  changeCost: 0,
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
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        playSkillAnimation(caster, [caster], 'first_aid', () => {
          caster.hp.current = Math.min(caster.hp.current + levelConfig.healAmount, caster.stats?.hp || caster.hp.max);
          battle.showDamage(caster.elementId, `+${levelConfig.healAmount}`, 'text-green-400');
          battle.renderEntities();
        });
      },
      autoBattle: {
        priority: 90,
        check: (caster, levelConfig, context) => {
          const trueMaxHp = caster.stats?.hp || caster.hp.max;
          const hpPercent = caster.hp.current / trueMaxHp;
          const missingHp = trueMaxHp - caster.hp.current;
          if (hpPercent < 0.6 || (hpPercent < 0.8 && missingHp >= levelConfig.healAmount * 0.8)) {
            return true;
          }
          return null;
        }
      }
    },
    {
      id: 'heavy_strike', name: '強撃', icon: 'swords', statDependency: 'ATK',
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
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (target) {
            playSkillAnimation(caster, [target], 'heavy_strike', () => {
                if (target.isDead) return;
                battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency, actionName: '強撃', damageMultiplier: levelConfig.multiplier, damageType: 'skill', hideActionName: true });
            });
        }
      },
      autoBattle: {
        priority: 50,
        check: (caster, levelConfig, context) => {
          if (Math.random() < 0.7) {
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
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        playSkillAnimation(caster, [caster], 'focus', () => {
          caster.mp.current = Math.min(caster.stats?.mp || caster.mp.max, caster.mp.current + levelConfig.recoverAmount);
          battle.showDamage(caster.elementId, `+${levelConfig.recoverAmount} MP`, 'text-blue-400');
          battle.renderEntities();
        });
      },
      autoBattle: {
        priority: 70,
        check: (caster, levelConfig, context) => {
          if (caster.mp.current < (caster.stats?.mp || caster.mp.max) * 0.3) {
            return true;
          }
          return null;
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
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (target) {
            playSkillAnimation(caster, [target], 'intimidate', () => {
                if (target.isDead) return;
                if (!target.originalAtk) target.originalAtk = target.stats.atk;
                target.stats.atk = Math.floor(target.originalAtk * (1 - levelConfig.reducePercent / 100));
                target.atkDebuffTurns = levelConfig.turns;
                
                battle.showDamage(target.elementId, 'ATK DOWN', 'text-blue-500');
            });
        }
      },
      autoBattle: {
        priority: 70,
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          const toughEnemy = aliveEnemies.find(e => (!e.atkDebuffTurns || e.atkDebuffTurns <= 0) && (e.maxHp >= 50 || e.stats.atk >= 20));
          if (toughEnemy && Math.random() < 0.8) {
            return toughEnemy;
          }
          return null;
        }
      }
    },
    {
      id: 'cleave', name: 'なぎ払い', icon: 'cyclone', statDependency: 'ATK',
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
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const targets = battle.enemies.filter(e => !e.isDead);
        if (targets.length === 0) return;

        playSkillAnimation(caster, targets, 'cleave', (target, index) => {
            if (target.isDead) return;
            battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency, 
                actionName: 'なぎ払い', 
                damageMultiplier: levelConfig.multiplier, 
                damageType: 'skill', 
                hideActionName: true,
                skipAtbReset: index > 0,
                isAoEProcessed: true
            });
        });
      },
      autoBattle: {
        priority: 60,
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length >= 2) {
            if (Math.random() < 0.8 || caster.mp.current > (caster.stats?.mp || caster.mp.max) * 0.5) {
              return true;
            }
          }
          return null;
        }
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
  ]
};
