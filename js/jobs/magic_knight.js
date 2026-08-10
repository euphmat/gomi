import { getBattleAnimationSpeed, getBattleSpeed, shouldSkipBattleAnimations } from '../utils/battle-animation.js';

// ─── Animation Utilities ──────────────────────────────────────
const playSkillAnimation = (caster, targets, type, onImpact) => {
  if (!Array.isArray(targets)) targets = [targets];
  if (shouldSkipBattleAnimations()) {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
    return;
  }
  const battleSpeed = getBattleSpeed();
  const speedMult = getBattleAnimationSpeed(battleSpeed);

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
    (document.getElementById('battle-effects-layer') || document.body).appendChild(ex);
    
    const anim = ex.animate([
      { transform: 'scale(0.2)', opacity: 1 },
      { transform: 'scale(1.5)', opacity: 0 }
    ], { duration: 400 / speedMult, easing: 'ease-out' });
    anim.onfinish = () => ex.remove();
  };

  const createIceShatter = (x, y, shake = false) => {
    if (shake) screenShake(shake.intensity || 3, shake.duration || 150);
    for (let i = 0; i < 6; i++) {
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
      (document.getElementById('battle-effects-layer') || document.body).appendChild(crystal);

      const angle = (Math.PI * 2 / 6) * i;
      const dist = 30 + Math.random() * 20;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;

      const anim = crystal.animate([
        { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0) rotate(${360 + Math.random()*360}deg)`, opacity: 0 }
      ], { duration: (300 + Math.random() * 200) / speedMult, easing: 'ease-out' });
      
      anim.onfinish = () => crystal.remove();
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

    setTimeout(() => {
      switch (type) {
        case 'flame_tongue': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 60}px`;
          el.style.top = `${ty - 60}px`;
          el.style.width = '120px';
          el.style.height = '120px';
          el.style.borderRight = '10px solid #ff4500';
          el.style.borderBottom = '10px solid #ffeb3b';
          el.style.borderRadius = '50%';
          el.style.boxShadow = '0 0 15px #ff4500';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          el.style.mixBlendMode = 'screen';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(el);

          const anim = el.animate([
            { transform: 'scale(0.5) rotate(-45deg) translate(-50px, -50px)', opacity: 0 },
            { transform: 'scale(1.2) rotate(45deg) translate(0px, 0px)', opacity: 1, offset: 0.5 },
            { transform: 'scale(1.5) rotate(135deg) translate(30px, 30px)', opacity: 0 }
          ], { duration: 300 / speedMult, easing: 'ease-in-out' });

          anim.onfinish = () => {
            el.remove();
            createExplosion(tx, ty, '#ff4500', '#ffeb3b', { intensity: 5, duration: 200 });
            if (onImpact) onImpact(target, index);
          };
          break;
        }
        case 'ice_brand': {
          // 1. Cold Mist Background
          const mist = document.createElement('div');
          mist.style.position = 'fixed';
          mist.style.left = `${tx - 80}px`;
          mist.style.top = `${ty - 80}px`;
          mist.style.width = '160px';
          mist.style.height = '160px';
          mist.style.borderRadius = '50%';
          mist.style.background = 'radial-gradient(circle, rgba(224,255,255,0.8), rgba(0,191,255,0.4), transparent)';
          mist.style.filter = 'blur(8px)';
          mist.style.zIndex = '9997';
          mist.style.pointerEvents = 'none';
          mist.style.mixBlendMode = 'screen';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(mist);

          mist.animate([
            { transform: 'scale(0)', opacity: 0 },
            { transform: 'scale(1.2)', opacity: 1, offset: 0.3 },
            { transform: 'scale(1.5)', opacity: 0 }
          ], { duration: 600 / speedMult, easing: 'ease-out' }).onfinish = () => mist.remove();

          // 2. Giant Ice Crystal Forming
          const crystal = document.createElement('div');
          crystal.style.position = 'fixed';
          crystal.style.left = `${tx - 40}px`;
          crystal.style.top = `${ty - 80}px`;
          crystal.style.width = '80px';
          crystal.style.height = '160px';
          crystal.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(135,206,235,0.8) 50%, rgba(0,191,255,0.6) 100%)';
          crystal.style.clipPath = 'polygon(50% 0%, 100% 20%, 80% 80%, 50% 100%, 20% 80%, 0% 20%)';
          crystal.style.boxShadow = '0 0 20px #00bfff, inset 0 0 15px #fff';
          crystal.style.zIndex = '9998';
          crystal.style.pointerEvents = 'none';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(crystal);

          crystal.animate([
            { transform: 'translateY(50px) scale(0)', opacity: 0 },
            { transform: 'translateY(0px) scale(1)', opacity: 1, offset: 0.3 },
            { transform: 'translateY(0px) scale(1.1)', opacity: 1, offset: 0.7 },
            { transform: 'translateY(0px) scale(1.2)', opacity: 0 }
          ], { duration: 600 / speedMult, easing: 'ease-out' });

          // 3. Frosty Slashes
          setTimeout(() => {
            const createSlash = (angle, delay) => {
              setTimeout(() => {
                const slash = document.createElement('div');
                slash.style.position = 'fixed';
                slash.style.left = `${tx - 100}px`;
                slash.style.top = `${ty - 5}px`;
                slash.style.width = '200px';
                slash.style.height = '10px';
                slash.style.background = 'linear-gradient(to right, transparent, #fff, #00ffff, #00bfff, transparent)';
                slash.style.boxShadow = '0 0 15px #00ffff';
                slash.style.zIndex = '9999';
                slash.style.pointerEvents = 'none';
                (document.getElementById('battle-effects-layer') || document.body).appendChild(slash);

                slash.animate([
                  { transform: `rotate(${angle}deg) scaleX(0)`, opacity: 0 },
                  { transform: `rotate(${angle}deg) scaleX(1)`, opacity: 1, offset: 0.2 },
                  { transform: `rotate(${angle}deg) scaleX(0)`, opacity: 0 }
                ], { duration: 250 / speedMult, easing: 'ease-in-out' }).onfinish = () => slash.remove();
              }, delay / speedMult);
            };

            createSlash(30, 0);
            createSlash(-45, 100);
          }, 150 / speedMult);

          // 4. Shatter Impact
          setTimeout(() => {
            if (document.body.contains(crystal)) crystal.remove();
            createIceShatter(tx, ty, { intensity: 5, duration: 250 });
            
            const wave = document.createElement('div');
            wave.style.position = 'fixed';
            wave.style.left = `${tx - 50}px`;
            wave.style.top = `${ty - 50}px`;
            wave.style.width = '100px';
            wave.style.height = '100px';
            wave.style.borderRadius = '50%';
            wave.style.border = '4px solid #00ffff';
            wave.style.boxShadow = '0 0 20px #00bfff';
            wave.style.zIndex = '9997';
            wave.style.pointerEvents = 'none';
            (document.getElementById('battle-effects-layer') || document.body).appendChild(wave);

            wave.animate([
              { transform: 'scale(0.5)', opacity: 1 },
              { transform: 'scale(2.5)', opacity: 0 }
            ], { duration: 400 / speedMult, easing: 'ease-out' }).onfinish = () => wave.remove();

            if (onImpact) onImpact(target, index);
          }, 450 / speedMult);
          break;
        }
        case 'thunder_slash': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 80}px`;
          el.style.top = `${ty - 80}px`;
          el.style.width = '160px';
          el.style.height = '160px';
          el.style.borderLeft = '15px solid #ffff00';
          el.style.borderTop = '15px solid #fff';
          el.style.borderRadius = '50%';
          el.style.filter = 'drop-shadow(0 0 15px #ffff00)';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(el);

          const anim = el.animate([
            { transform: 'scale(0.8) rotate(180deg)', opacity: 0 },
            { transform: 'scale(1.2) rotate(270deg)', opacity: 1, offset: 0.3 },
            { transform: 'scale(1.5) rotate(360deg)', opacity: 0 }
          ], { duration: 350 / speedMult, easing: 'ease-out' });

          anim.onfinish = () => {
            el.remove();
            createExplosion(tx, ty, '#ffff00', '#fff', { intensity: 4, duration: 200 });
            if (onImpact) onImpact(target, index);
          };
          break;
        }
      }
    }, index * 80 / speedMult);
  });
};

export const magic_knight = {
  id: 'magic_knight',
  name: '魔法剣士',
  icon: 'swords',
  changeCost: 200000,
  requirements: [
    { jobId: 'knight', level: 100 },
    { jobId: 'mage', level: 100 }
  ],
  skills: [
    // ─── Active Skills ──────────────────────────────────────
    {
      id: 'flame_tongue', name: 'フレイムタン', icon: 'local_fire_department', statDependency: 'BOTH',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 20, multiplier: 1.2 },
        { level:  2, spCost: 1, mpCost: 24, multiplier: 1.3 },
        { level:  3, spCost: 1, mpCost: 28, multiplier: 1.4 },
        { level:  4, spCost: 2, mpCost: 32, multiplier: 1.5 },
        { level:  5, spCost: 2, mpCost: 36, multiplier: 1.6 },
        { level:  6, spCost: 2, mpCost: 40, multiplier: 1.7 },
        { level:  7, spCost: 3, mpCost: 44, multiplier: 1.8 },
        { level:  8, spCost: 3, mpCost: 48, multiplier: 1.9 },
        { level:  9, spCost: 3, mpCost: 52, multiplier: 2.0 },
        { level: 10, spCost: 5, mpCost: 60, multiplier: 2.2 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、単体に ATK と MATK を合わせた ${lc.multiplier.toFixed(2)} 倍の炎属性複合攻撃を行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (!target) return;

        playSkillAnimation(caster, [target], 'flame_tongue', () => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, { damageType: 'skill', hideActionName: true,
            statDependency: this.statDependency,
            actionName: 'フレイムタン',
            damageMultiplier: levelConfig.multiplier,
            damageType: 'skill',
            element: 'fire',
            hideActionName: true
          });
        });
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
      id: 'ice_brand', name: 'アイスブランド', icon: 'ac_unit', statDependency: 'BOTH',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 30, multiplier: 0.6, hits: 2 },
        { level:  2, spCost: 1, mpCost: 34, multiplier: 0.65, hits: 2 },
        { level:  3, spCost: 1, mpCost: 38, multiplier: 0.7, hits: 3 },
        { level:  4, spCost: 2, mpCost: 42, multiplier: 0.75, hits: 3 },
        { level:  5, spCost: 2, mpCost: 46, multiplier: 0.8, hits: 4 },
        { level:  6, spCost: 2, mpCost: 50, multiplier: 0.85, hits: 4 },
        { level:  7, spCost: 3, mpCost: 54, multiplier: 0.9, hits: 5 },
        { level:  8, spCost: 3, mpCost: 58, multiplier: 0.95, hits: 5 },
        { level:  9, spCost: 3, mpCost: 62, multiplier: 1.0, hits: 6 },
        { level: 10, spCost: 5, mpCost: 72, multiplier: 1.1, hits: 6 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、ランダムな敵に ATK と MATK を合わせた ${lc.multiplier.toFixed(2)} 倍の氷属性複合攻撃を ${lc.hits} 回行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const hits = levelConfig.hits;
        let hitCount = 0;
        const interval = setInterval(() => {
          if (caster.isDead || (battle && battle.isStopped)) {
            clearInterval(interval);
            return;
          }
          let targetGroup = battle.enemies;
          if (caster.activeAilment && caster.activeAilment.type === 'confusion' && battle.selectedEnemyTarget && battle.party.includes(battle.selectedEnemyTarget)) {
            targetGroup = battle.party;
          }
          const aliveEnemies = targetGroup.filter(e => !e.isDead);
          if (aliveEnemies.length === 0 || hitCount >= hits) {
            clearInterval(interval);
            return;
          }
          const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          const currentHit = hitCount;
          hitCount++;
          
          playSkillAnimation(caster, [target], 'ice_brand', () => {
            if (target.isDead) return;
            battle.executeAttack(caster, target, true, { damageType: 'skill', hideActionName: true,
            statDependency: this.statDependency,
              actionName: 'アイスブランド',
              damageMultiplier: levelConfig.multiplier,
              damageType: 'skill',
              element: 'ice',
              hideActionName: true
            });
          });
        }, 300 / (battle.speedMult || 1));
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let bestTarget = null;
          let bestScore = 0;
          for (const enemy of aliveEnemies) {
            const resist = enemy.stats?.elementResist?.ice || 0;
            const score = 50 * levelConfig.multiplier * levelConfig.hits * ((100 - resist) / 100);
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
      id: 'thunder_slash', name: 'サンダースラッシュ', icon: 'bolt', statDependency: 'BOTH',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 50, multiplier: 1.0 },
        { level:  2, spCost: 1, mpCost: 56, multiplier: 1.1 },
        { level:  3, spCost: 1, mpCost: 62, multiplier: 1.2 },
        { level:  4, spCost: 2, mpCost: 68, multiplier: 1.3 },
        { level:  5, spCost: 2, mpCost: 74, multiplier: 1.4 },
        { level:  6, spCost: 2, mpCost: 80, multiplier: 1.5 },
        { level:  7, spCost: 3, mpCost: 86, multiplier: 1.6 },
        { level:  8, spCost: 3, mpCost: 92, multiplier: 1.7 },
        { level:  9, spCost: 3, mpCost: 98, multiplier: 1.8 },
        { level: 10, spCost: 5, mpCost: 110, multiplier: 2.0 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵全体に ATK と MATK を合わせた ${lc.multiplier.toFixed(2)} 倍の雷属性複合攻撃を行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let targetGroup = battle.enemies;
        if (caster.activeAilment && caster.activeAilment.type === 'confusion' && battle.selectedEnemyTarget && battle.party.includes(battle.selectedEnemyTarget)) {
          targetGroup = battle.party;
        }
        const aliveEnemies = targetGroup.filter(e => !e.isDead);
        if (aliveEnemies.length === 0) return;
        
        playSkillAnimation(caster, aliveEnemies, 'thunder_slash', (target, index) => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, { damageType: 'skill', hideActionName: true,
            statDependency: this.statDependency,
            actionName: '',
            damageMultiplier: levelConfig.multiplier,
            damageType: 'skill',
            element: 'thunder',
            hideActionName: true,
            skipAtbReset: index > 0,
            isAoEProcessed: true
          });
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
      id: 'protection', name: 'プロテクション', icon: 'shield', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, percent:  5 },
        { level:  2, spCost: 1, mpCost: 0, percent:  6 },
        { level:  3, spCost: 1, mpCost: 0, percent:  7 },
        { level:  4, spCost: 2, mpCost: 0, percent:  8 },
        { level:  5, spCost: 2, mpCost: 0, percent:  9 },
        { level:  6, spCost: 2, mpCost: 0, percent: 10 },
        { level:  7, spCost: 3, mpCost: 0, percent: 13 },
        { level:  8, spCost: 3, mpCost: 0, percent: 15 },
        { level:  9, spCost: 3, mpCost: 0, percent: 18 },
        { level: 10, spCost: 5, mpCost: 0, percent: 20 }
      ],
      getDescription: (lc) => `ダンジョン潜入時、パーティー全体の DEF を永続的に ${lc.percent}％ アップする`
    },
    {
      id: 'magic_barrier', name: 'マジックバリア', icon: 'security', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, percent:  5 },
        { level:  2, spCost: 1, mpCost: 0, percent:  6 },
        { level:  3, spCost: 1, mpCost: 0, percent:  7 },
        { level:  4, spCost: 2, mpCost: 0, percent:  8 },
        { level:  5, spCost: 2, mpCost: 0, percent:  9 },
        { level:  6, spCost: 2, mpCost: 0, percent: 10 },
        { level:  7, spCost: 3, mpCost: 0, percent: 13 },
        { level:  8, spCost: 3, mpCost: 0, percent: 15 },
        { level:  9, spCost: 3, mpCost: 0, percent: 18 },
        { level: 10, spCost: 5, mpCost: 0, percent: 20 }
      ],
      getDescription: (lc) => `ダンジョン潜入時、パーティー全体の MDEF を永続的に ${lc.percent}％ アップする`
    },
    {
      id: 'weapon_bless', name: 'ウェポンブレス', icon: 'swords', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, percent:  5 },
        { level:  2, spCost: 1, mpCost: 0, percent:  6 },
        { level:  3, spCost: 1, mpCost: 0, percent:  7 },
        { level:  4, spCost: 2, mpCost: 0, percent:  8 },
        { level:  5, spCost: 2, mpCost: 0, percent:  9 },
        { level:  6, spCost: 2, mpCost: 0, percent: 10 },
        { level:  7, spCost: 3, mpCost: 0, percent: 12 },
        { level:  8, spCost: 3, mpCost: 0, percent: 15 },
        { level:  9, spCost: 3, mpCost: 0, percent: 18 },
        { level: 10, spCost: 5, mpCost: 0, percent: 20 }
      ],
      getDescription: (lc) => `ダンジョン潜入時、パーティー全体の ATK を永続的に ${lc.percent}％ アップする`
    },
    {
      id: 'magic_bless', name: 'マジックブレス', icon: 'auto_awesome', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, percent:  5 },
        { level:  2, spCost: 1, mpCost: 0, percent:  6 },
        { level:  3, spCost: 1, mpCost: 0, percent:  7 },
        { level:  4, spCost: 2, mpCost: 0, percent:  8 },
        { level:  5, spCost: 2, mpCost: 0, percent:  9 },
        { level:  6, spCost: 2, mpCost: 0, percent: 10 },
        { level:  7, spCost: 3, mpCost: 0, percent: 12 },
        { level:  8, spCost: 3, mpCost: 0, percent: 15 },
        { level:  9, spCost: 3, mpCost: 0, percent: 18 },
        { level: 10, spCost: 5, mpCost: 0, percent: 20 }
      ],
      getDescription: (lc) => `ダンジョン潜入時、パーティー全体の MATK を永続的に ${lc.percent}％ アップする`
    },
    {
      id: 'mp_absorb', name: 'MP吸収', icon: 'water_drop', type: 'passive',
      maxLevel: 10,
      limitBreakMaximums: { percent: 80 },
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
