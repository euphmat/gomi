// ─── Animation Utilities ──────────────────────────────────────
const playSkillAnimation = (caster, targets, type, onImpact) => {
  if (!Array.isArray(targets)) targets = [targets];
  if (localStorage.getItem('disableBattleAnimations') === 'true') {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
    return;
  }

  const casterEl = document.getElementById(caster.elementId);
  if (!casterEl && type !== 'magic_barrier') {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
    return;
  }

  const screenShake = (intensity = 5, duration = 300) => {
    // Screen shake disabled globally by user request
  };

  const createExplosion = (x, y, color1, color2, shake = false) => {
    if (shake) screenShake(shake.intensity || 4, shake.duration || 200);
    const ex = document.createElement('div');
    ex.style.position = 'fixed';
    ex.style.left = `${x - 60}px`;
    ex.style.top = `${y - 60}px`;
    ex.style.width = '120px';
    ex.style.height = '120px';
    ex.style.borderRadius = '50%';
    ex.style.background = `radial-gradient(circle, #fff, ${color2}, ${color1}, transparent)`;
    ex.style.zIndex = '9999';
    ex.style.pointerEvents = 'none';
    ex.style.mixBlendMode = 'screen';
    document.body.appendChild(ex);
    
    const anim = ex.animate([
      { transform: 'scale(0.2)', opacity: 1 },
      { transform: 'scale(1.5)', opacity: 0 }
    ], { duration: 400, easing: 'ease-out' });
    anim.onfinish = () => ex.remove();
  };

  const createIceShatter = (x, y, shake = false) => {
    if (shake) screenShake(shake.intensity || 2, shake.duration || 150);
    for (let i = 0; i < 8; i++) {
      const crystal = document.createElement('div');
      crystal.style.position = 'fixed';
      crystal.style.left = `${x - 10}px`;
      crystal.style.top = `${y - 10}px`;
      crystal.style.width = '20px';
      crystal.style.height = '20px';
      crystal.style.background = '#e0ffff';
      crystal.style.boxShadow = '0 0 8px #00bfff';
      crystal.style.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
      crystal.style.zIndex = '9999';
      crystal.style.pointerEvents = 'none';
      document.body.appendChild(crystal);

      const angle = (Math.PI * 2 / 8) * i;
      const dist = 40 + Math.random() * 30;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;

      const anim = crystal.animate([
        { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0) rotate(${360 + Math.random()*360}deg)`, opacity: 0 }
      ], { duration: 400 + Math.random() * 200, easing: 'ease-out' });
      
      anim.onfinish = () => crystal.remove();
    }
  };

  const createThunder = (tx, ty, shake = false, callback = null) => {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.left = `${tx - 20}px`;
    el.style.top = `0px`;
    el.style.width = '40px';
    el.style.height = `${ty}px`;
    el.style.background = 'linear-gradient(to right, transparent, #fff, #ffff00, #fff, transparent)';
    el.style.zIndex = '9999';
    el.style.pointerEvents = 'none';
    el.style.filter = 'drop-shadow(0 0 15px #ffff00)';
    el.style.clipPath = 'polygon(20% 0%, 80% 0%, 55% 40%, 90% 40%, 35% 100%, 45% 60%, 10% 60%)';
    document.body.appendChild(el);

    const anim = el.animate([
      { opacity: 0 },
      { opacity: 1, offset: 0.1 },
      { opacity: 0.2, offset: 0.2 },
      { opacity: 1, offset: 0.3 },
      { opacity: 0 }
    ], { duration: 400 });

    anim.onfinish = () => {
      el.remove();
      createExplosion(tx, ty, '#ffff00', '#fff', shake);
      if (callback) callback();
    };
  };

  targets.forEach((target, index) => {
    const targetEl = document.getElementById(target.elementId);
    if (!targetEl && type !== 'magic_barrier') {
      if (onImpact) onImpact(target, index);
      return;
    }
    
    const targetRect = targetEl ? targetEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const casterRect = casterEl ? casterEl.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    
    const cx = casterRect.left + casterRect.width / 2;
    const cy = casterRect.top + casterRect.height / 2;
    const tx = targetRect.left + targetRect.width / 2;
    const ty = targetRect.top + targetRect.height / 2;

    const delay = type.includes('storm') || type === 'blizzard' || type === 'volcano' ? index * 100 : 0;

    setTimeout(() => {
      switch (type) {
        case 'fireball': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${cx - 20}px`;
          el.style.top = `${cy - 20}px`;
          el.style.width = '40px';
          el.style.height = '40px';
          el.style.borderRadius = '50%';
          el.style.background = 'radial-gradient(circle, #fff, #ffeb3b, #ff4500, transparent)';
          el.style.boxShadow = '0 0 20px 10px rgba(255, 69, 0, 0.6)';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          el.style.mixBlendMode = 'screen';
          document.body.appendChild(el);

          const anim = el.animate([
            { transform: 'scale(0.5)' },
            { transform: `translate(${tx - cx}px, ${ty - cy}px) scale(1.5)` }
          ], { duration: 300, easing: 'ease-in' });

          anim.onfinish = () => {
            el.remove();
            createExplosion(tx, ty, '#ff4500', '#ffeb3b', { intensity: 4, duration: 200 });
            if (onImpact) onImpact(target, index);
          };
          break;
        }
        case 'ice_lance': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${cx - 15}px`;
          el.style.top = `${cy - 40}px`;
          el.style.width = '30px';
          el.style.height = '100px';
          el.style.background = 'linear-gradient(to bottom, transparent, #e0ffff, #00bfff)';
          el.style.boxShadow = '0 0 15px #00bfff';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          el.style.clipPath = 'polygon(50% 0%, 100% 100%, 50% 80%, 0% 100%)';
          document.body.appendChild(el);

          const angle = Math.atan2(ty - cy, tx - cx) + Math.PI / 2;
          
          const anim = el.animate([
            { transform: `rotate(${angle}rad) translateY(0px) scale(0)`, opacity: 0 },
            { transform: `rotate(${angle}rad) translateY(0px) scale(1)`, opacity: 1, offset: 0.3 },
            { transform: `rotate(${angle}rad) translateY(-${Math.hypot(tx - cx, ty - cy)}px) scale(1)`, opacity: 1 }
          ], { duration: 350, easing: 'ease-in' });

          anim.onfinish = () => {
            el.remove();
            createIceShatter(tx, ty, { intensity: 3, duration: 150 });
            if (onImpact) onImpact(target, index);
          };
          break;
        }
        case 'thunder': {
          createThunder(tx, ty, { intensity: 5, duration: 250 }, () => {
            if (onImpact) onImpact(target, index);
          });
          break;
        }
        case 'magic_barrier': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 50}px`;
          el.style.top = `${ty - 50}px`;
          el.style.width = '100px';
          el.style.height = '100px';
          el.style.borderRadius = '50%';
          el.style.border = '4px solid rgba(138, 43, 226, 0.9)';
          el.style.boxShadow = 'inset 0 0 20px rgba(138, 43, 226, 0.6), 0 0 20px rgba(138, 43, 226, 0.6)';
          el.style.background = 'radial-gradient(circle, rgba(138, 43, 226, 0.3), transparent)';
          el.style.zIndex = '9998';
          el.style.pointerEvents = 'none';
          document.body.appendChild(el);

          const anim = el.animate([
            { transform: 'scale(0)', opacity: 0 },
            { transform: 'scale(1.2)', opacity: 1, offset: 0.5 },
            { transform: 'scale(1)', opacity: 0 }
          ], { duration: 800, easing: 'ease-out' });

          anim.onfinish = () => el.remove();
          setTimeout(() => { if (onImpact) onImpact(target, index); }, 400);
          break;
        }
        case 'blizzard': {
          createIceShatter(tx, ty, false); // No screen shake for lighter effect
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 60}px`;
          el.style.top = `${ty - 60}px`;
          el.style.width = '120px';
          el.style.height = '120px';
          el.style.borderRadius = '50%';
          el.style.background = 'conic-gradient(from 0deg, transparent, rgba(224, 255, 255, 0.6), transparent)';
          el.style.zIndex = '9998';
          el.style.pointerEvents = 'none';
          el.style.mixBlendMode = 'screen';
          document.body.appendChild(el);

          const anim = el.animate([
            { transform: 'rotate(0deg) scale(0)', opacity: 0 },
            { transform: 'rotate(180deg) scale(1.2)', opacity: 0.8, offset: 0.5 },
            { transform: 'rotate(360deg) scale(1.5)', opacity: 0 }
          ], { duration: 600 }); // Slightly faster and smaller

          anim.onfinish = () => el.remove();
          
          setTimeout(() => { if (onImpact) onImpact(target, index); }, 300);
          break;
        }
        case 'volcano': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 50}px`;
          el.style.top = `${ty - 50}px`;
          el.style.width = '100px';
          el.style.height = '150px';
          el.style.background = 'linear-gradient(to top, #ff0000, #ff8c00, transparent)';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          el.style.clipPath = 'polygon(20% 100%, 80% 100%, 100% 0%, 0% 0%)';
          el.style.mixBlendMode = 'screen';
          document.body.appendChild(el);

          const anim = el.animate([
            { transform: 'scaleY(0)', transformOrigin: 'bottom', opacity: 1 },
            { transform: 'scaleY(1.5)', transformOrigin: 'bottom', opacity: 1, offset: 0.7 },
            { transform: 'scaleY(2)', transformOrigin: 'bottom', opacity: 0 }
          ], { duration: 400, easing: 'ease-out' });

          anim.onfinish = () => el.remove();
          setTimeout(() => {
            createExplosion(tx, ty, '#ff0000', '#ff8c00', { intensity: 3, duration: 150 });
            if (onImpact) onImpact(target, index);
          }, 150);
          break;
        }
        case 'thunderstorm': {
          createThunder(tx, ty, { intensity: 3, duration: 150 }, () => {
             if (onImpact) onImpact(target, index);
          });
          setTimeout(() => {
            const rx = tx + (Math.random() - 0.5) * 80;
            const ry = ty + (Math.random() - 0.5) * 80;
            createThunder(rx, ry, false);
          }, 50);
          break;
        }
      }
    }, delay);
  });
};


export const mage = {
  id: 'mage',
  name: 'メイジ',
  icon: 'auto_awesome',
  changeCost: 30000,
  skills: [
    // ─── Active Skills ──────────────────────────────────────
    {
      id: 'fireball', name: 'ファイアボール', icon: 'local_fire_department', statDependency: 'MAT',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 8, multiplier: 1.2 },
        { level:  2, spCost: 1, mpCost: 10, multiplier: 1.3 },
        { level:  3, spCost: 1, mpCost: 12, multiplier: 1.4 },
        { level:  4, spCost: 2, mpCost: 14, multiplier: 1.5 },
        { level:  5, spCost: 2, mpCost: 16, multiplier: 1.6 },
        { level:  6, spCost: 2, mpCost: 18, multiplier: 1.7 },
        { level:  7, spCost: 3, mpCost: 20, multiplier: 1.8 },
        { level:  8, spCost: 3, mpCost: 22, multiplier: 1.9 },
        { level:  9, spCost: 3, mpCost: 24, multiplier: 2.0 },
        { level: 10, spCost: 5, mpCost: 30, multiplier: 2.2 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵単体に ${lc.multiplier.toFixed(1)} 倍の炎属性魔法攻撃を行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (target) {
          playSkillAnimation(caster, [target], 'fireball', () => {
            battle.executeAttack(caster, target, true, { damageType: 'skill', hideActionName: true,
            statDependency: this.statDependency, actionName: 'ファイアボール', damageMultiplier: levelConfig.multiplier, damageType: 'skill', element: 'fire', hideActionName: true });
          });
        }
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let bestTarget = null;
          let bestScore = 0;
          for (const enemy of aliveEnemies) {
            const resist = enemy.stats?.elementResist?.fire || 0;
            const score = 50 * levelConfig.multiplier * ((100 - resist) / 100);
            if (score > bestScore) {
              bestScore = score;
              bestTarget = enemy;
            }
          }
          if (bestScore > 0) return { target: bestTarget, score: bestScore };
          return null;
        }
      }
    },
    {
      id: 'ice_lance', name: 'アイスランス', icon: 'ac_unit', statDependency: 'MAT',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 8, multiplier: 1.2 },
        { level:  2, spCost: 1, mpCost: 10, multiplier: 1.3 },
        { level:  3, spCost: 1, mpCost: 12, multiplier: 1.4 },
        { level:  4, spCost: 2, mpCost: 14, multiplier: 1.5 },
        { level:  5, spCost: 2, mpCost: 16, multiplier: 1.6 },
        { level:  6, spCost: 2, mpCost: 18, multiplier: 1.7 },
        { level:  7, spCost: 3, mpCost: 20, multiplier: 1.8 },
        { level:  8, spCost: 3, mpCost: 22, multiplier: 1.9 },
        { level:  9, spCost: 3, mpCost: 24, multiplier: 2.0 },
        { level: 10, spCost: 5, mpCost: 30, multiplier: 2.2 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵単体に ${lc.multiplier.toFixed(1)} 倍の氷属性魔法攻撃を行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (target) {
          playSkillAnimation(caster, [target], 'ice_lance', () => {
            battle.executeAttack(caster, target, true, { damageType: 'skill', hideActionName: true,
            statDependency: this.statDependency, actionName: 'アイスランス', damageMultiplier: levelConfig.multiplier, damageType: 'skill', element: 'ice', hideActionName: true });
          });
        }
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let bestTarget = null;
          let bestScore = 0;
          for (const enemy of aliveEnemies) {
            const resist = enemy.stats?.elementResist?.ice || 0;
            const score = 50 * levelConfig.multiplier * ((100 - resist) / 100);
            if (score > bestScore) {
              bestScore = score;
              bestTarget = enemy;
            }
          }
          if (bestScore > 0) return { target: bestTarget, score: bestScore };
          return null;
        }
      }
    },
    {
      id: 'thunder', name: 'サンダー', icon: 'bolt', statDependency: 'MAT',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 8, multiplier: 1.2 },
        { level:  2, spCost: 1, mpCost: 10, multiplier: 1.3 },
        { level:  3, spCost: 1, mpCost: 12, multiplier: 1.4 },
        { level:  4, spCost: 2, mpCost: 14, multiplier: 1.5 },
        { level:  5, spCost: 2, mpCost: 16, multiplier: 1.6 },
        { level:  6, spCost: 2, mpCost: 18, multiplier: 1.7 },
        { level:  7, spCost: 3, mpCost: 20, multiplier: 1.8 },
        { level:  8, spCost: 3, mpCost: 22, multiplier: 1.9 },
        { level:  9, spCost: 3, mpCost: 24, multiplier: 2.0 },
        { level: 10, spCost: 5, mpCost: 30, multiplier: 2.2 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵単体に ${lc.multiplier.toFixed(1)} 倍の雷属性魔法攻撃を行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (target) {
          playSkillAnimation(caster, [target], 'thunder', () => {
            battle.executeAttack(caster, target, true, { damageType: 'skill', hideActionName: true,
            statDependency: this.statDependency, actionName: 'サンダー', damageMultiplier: levelConfig.multiplier, damageType: 'skill', element: 'thunder', hideActionName: true });
          });
        }
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let bestTarget = null;
          let bestScore = 0;
          for (const enemy of aliveEnemies) {
            const resist = enemy.stats?.elementResist?.thunder || 0;
            const score = 50 * levelConfig.multiplier * ((100 - resist) / 100);
            if (score > bestScore) {
              bestScore = score;
              bestTarget = enemy;
            }
          }
          if (bestScore > 0) return { target: bestTarget, score: bestScore };
          return null;
        }
      }
    },
    {
      id: 'magic_barrier', name: 'マジックバリア', icon: 'security',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 8, mdefAmount: 10, turns: 3 },
        { level:  2, spCost: 1, mpCost: 10, mdefAmount: 13, turns: 3 },
        { level:  3, spCost: 1, mpCost: 12, mdefAmount: 16, turns: 3 },
        { level:  4, spCost: 2, mpCost: 14, mdefAmount: 19, turns: 3 },
        { level:  5, spCost: 2, mpCost: 16, mdefAmount: 22, turns: 3 },
        { level:  6, spCost: 2, mpCost: 18, mdefAmount: 25, turns: 3 },
        { level:  7, spCost: 3, mpCost: 20, mdefAmount: 28, turns: 4 },
        { level:  8, spCost: 3, mpCost: 22, mdefAmount: 32, turns: 4 },
        { level:  9, spCost: 3, mpCost: 24, mdefAmount: 36, turns: 4 },
        { level: 10, spCost: 5, mpCost: 30, mdefAmount: 40, turns: 5 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、味方全体の魔法防御力を ${lc.turns} ターンの間 ${lc.mdefAmount} アップする`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let targetGroup = battle.party;
        if (battle.selectedEnemyTarget && battle.enemies.includes(battle.selectedEnemyTarget)) {
          targetGroup = battle.enemies;
        }
        const aliveParty = targetGroup.filter(p => !p.isDead);
        playSkillAnimation(caster, aliveParty, 'magic_barrier', (target) => {
          if (!target.isDead) {
            target._mdefBuffAmount = levelConfig.mdefAmount;
            target._mdefBuffTurns = levelConfig.turns;
            battle.showDamage(target.elementId, 'MDEF UP', 'text-indigo-400');
          }
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveParty = context.party.filter(p => !p.isDead);
          const unbuffedCount = aliveParty.filter(p => !p._mdefBuffTurns || p._mdefBuffTurns <= 0).length;
          if (unbuffedCount >= aliveParty.length / 2) {
             return { target: caster, score: 85 };
          }
          return null;
        }
      }
    },
    {
      id: 'blizzard', name: 'ブリザード', icon: 'severe_cold', statDependency: 'MAT',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost: 30, multiplier: 1.0 },
        { level:  2, spCost: 2, mpCost: 36, multiplier: 1.1 },
        { level:  3, spCost: 2, mpCost: 44, multiplier: 1.2 },
        { level:  4, spCost: 3, mpCost: 54, multiplier: 1.3 },
        { level:  5, spCost: 3, mpCost: 66, multiplier: 1.4 },
        { level:  6, spCost: 3, mpCost: 80, multiplier: 1.5 },
        { level:  7, spCost: 4, mpCost: 96, multiplier: 1.6 },
        { level:  8, spCost: 4, mpCost: 114, multiplier: 1.7 },
        { level:  9, spCost: 4, mpCost: 134, multiplier: 1.8 },
        { level: 10, spCost: 6, mpCost: 160, multiplier: 2.0 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵全体に ${lc.multiplier.toFixed(1)} 倍の氷属性魔法攻撃を行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let targetGroup = battle.enemies;
        if (battle.selectedEnemyTarget && battle.party.includes(battle.selectedEnemyTarget)) {
          targetGroup = battle.party;
        }
        const aliveEnemies = targetGroup.filter(e => !e.isDead);
        if (aliveEnemies.length === 0) return;
        playSkillAnimation(caster, aliveEnemies, 'blizzard', (target, index) => {
          if (!target.isDead) {
            battle.executeAttack(caster, target, true, { damageType: 'skill', hideActionName: true,
            statDependency: this.statDependency, 
              actionName: 'ブリザード', 
              damageMultiplier: levelConfig.multiplier, 
              damageType: 'skill', 
              element: 'ice', 
              hideActionName: true, 
              skipAtbReset: index > 0, 
              isAoEProcessed: true 
            });
          }
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let totalScore = 0;
          for (const enemy of aliveEnemies) {
             const resist = enemy.stats?.elementResist?.ice || 0;
             totalScore += 35 * levelConfig.multiplier * ((100 - resist) / 100);
          }
          if (totalScore > 60) return { target: aliveEnemies[0], score: totalScore };
          return null;
        }
      }
    },
    {
      id: 'volcano', name: 'ボルケーノ', icon: 'volcano', statDependency: 'MAT',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost: 30, multiplier: 1.0 },
        { level:  2, spCost: 2, mpCost: 36, multiplier: 1.1 },
        { level:  3, spCost: 2, mpCost: 44, multiplier: 1.2 },
        { level:  4, spCost: 3, mpCost: 54, multiplier: 1.3 },
        { level:  5, spCost: 3, mpCost: 66, multiplier: 1.4 },
        { level:  6, spCost: 3, mpCost: 80, multiplier: 1.5 },
        { level:  7, spCost: 4, mpCost: 96, multiplier: 1.6 },
        { level:  8, spCost: 4, mpCost: 114, multiplier: 1.7 },
        { level:  9, spCost: 4, mpCost: 134, multiplier: 1.8 },
        { level: 10, spCost: 6, mpCost: 160, multiplier: 2.0 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵全体に ${lc.multiplier.toFixed(1)} 倍の炎属性魔法攻撃を行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let targetGroup = battle.enemies;
        if (battle.selectedEnemyTarget && battle.party.includes(battle.selectedEnemyTarget)) {
          targetGroup = battle.party;
        }
        const aliveEnemies = targetGroup.filter(e => !e.isDead);
        if (aliveEnemies.length === 0) return;
        playSkillAnimation(caster, aliveEnemies, 'volcano', (target, index) => {
          if (!target.isDead) {
            battle.executeAttack(caster, target, true, { damageType: 'skill', hideActionName: true,
            statDependency: this.statDependency, 
              actionName: 'ボルケーノ', 
              damageMultiplier: levelConfig.multiplier, 
              damageType: 'skill', 
              element: 'fire', 
              hideActionName: true, 
              skipAtbReset: index > 0, 
              isAoEProcessed: true 
            });
          }
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let totalScore = 0;
          for (const enemy of aliveEnemies) {
             const resist = enemy.stats?.elementResist?.fire || 0;
             totalScore += 35 * levelConfig.multiplier * ((100 - resist) / 100);
          }
          if (totalScore > 60) return { target: aliveEnemies[0], score: totalScore };
          return null;
        }
      }
    },
    {
      id: 'thunderstorm', name: 'サンダーストーム', icon: 'thunderstorm', statDependency: 'MAT',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost: 30, multiplier: 1.0 },
        { level:  2, spCost: 2, mpCost: 36, multiplier: 1.1 },
        { level:  3, spCost: 2, mpCost: 44, multiplier: 1.2 },
        { level:  4, spCost: 3, mpCost: 54, multiplier: 1.3 },
        { level:  5, spCost: 3, mpCost: 66, multiplier: 1.4 },
        { level:  6, spCost: 3, mpCost: 80, multiplier: 1.5 },
        { level:  7, spCost: 4, mpCost: 96, multiplier: 1.6 },
        { level:  8, spCost: 4, mpCost: 114, multiplier: 1.7 },
        { level:  9, spCost: 4, mpCost: 134, multiplier: 1.8 },
        { level: 10, spCost: 6, mpCost: 160, multiplier: 2.0 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵全体に ${lc.multiplier.toFixed(1)} 倍の雷属性魔法攻撃を行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let targetGroup = battle.enemies;
        if (battle.selectedEnemyTarget && battle.party.includes(battle.selectedEnemyTarget)) {
          targetGroup = battle.party;
        }
        const aliveEnemies = targetGroup.filter(e => !e.isDead);
        if (aliveEnemies.length === 0) return;
        playSkillAnimation(caster, aliveEnemies, 'thunderstorm', (target, index) => {
          if (!target.isDead) {
            battle.executeAttack(caster, target, true, { damageType: 'skill', hideActionName: true,
            statDependency: this.statDependency, 
              actionName: 'サンダーストーム', 
              damageMultiplier: levelConfig.multiplier, 
              damageType: 'skill', 
              element: 'thunder', 
              hideActionName: true, 
              skipAtbReset: index > 0, 
              isAoEProcessed: true 
            });
          }
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let totalScore = 0;
          for (const enemy of aliveEnemies) {
             const resist = enemy.stats?.elementResist?.thunder || 0;
             totalScore += 35 * levelConfig.multiplier * ((100 - resist) / 100);
          }
          if (totalScore > 60) return { target: aliveEnemies[0], score: totalScore };
          return null;
        }
      }
    },
    // ─── Passive Skills ──────────────────────────────────────
    {
      id: 'magic_missile', name: 'マジックミサイル', icon: 'flare', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, multiplier: 0.2 },
        { level:  2, spCost: 1, mpCost: 0, multiplier: 0.3 },
        { level:  3, spCost: 1, mpCost: 0, multiplier: 0.4 },
        { level:  4, spCost: 2, mpCost: 0, multiplier: 0.5 },
        { level:  5, spCost: 2, mpCost: 0, multiplier: 0.6 },
        { level:  6, spCost: 2, mpCost: 0, multiplier: 0.7 },
        { level:  7, spCost: 3, mpCost: 0, multiplier: 0.8 },
        { level:  8, spCost: 3, mpCost: 0, multiplier: 0.9 },
        { level:  9, spCost: 3, mpCost: 0, multiplier: 1.0 },
        { level: 10, spCost: 5, mpCost: 0, multiplier: 1.2 }
      ],
      getDescription: (lc) => `通常攻撃時、追加で魔法攻撃力 ${Math.floor(lc.multiplier * 100)}％ 分の無属性魔法ダメージを与える`
    },
    {
      id: 'mana_regen', name: 'マナリジェネ', icon: 'battery_charging_full', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, recoverMp:  1 },
        { level:  2, spCost: 1, mpCost: 0, recoverMp:  2 },
        { level:  3, spCost: 1, mpCost: 0, recoverMp:  3 },
        { level:  4, spCost: 2, mpCost: 0, recoverMp:  4 },
        { level:  5, spCost: 2, mpCost: 0, recoverMp:  5 },
        { level:  6, spCost: 2, mpCost: 0, recoverMp:  6 },
        { level:  7, spCost: 3, mpCost: 0, recoverMp:  7 },
        { level:  8, spCost: 3, mpCost: 0, recoverMp:  8 },
        { level:  9, spCost: 3, mpCost: 0, recoverMp:  9 },
        { level: 10, spCost: 5, mpCost: 0, recoverMp: 10 }
      ],
      getDescription: (lc) => `自身の行動終了時に、MP を ${lc.recoverMp} 回復する`
    }
  ]
};
