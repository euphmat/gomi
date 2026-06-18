// ─── Animation Utilities ──────────────────────────────────────
const playSkillAnimation = (caster, targets, type, onImpact) => {
  if (!Array.isArray(targets)) targets = [targets];
  if (localStorage.getItem('disableBattleAnimations') === 'true') {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
    return;
  }

  targets.forEach((target, index) => {
    const targetEl = document.getElementById(target.elementId);
    const casterEl = document.getElementById(caster.elementId);
    if (!targetEl || !casterEl) {
      if (onImpact) onImpact(target, index);
      return;
    }
    
    const targetRect = targetEl.getBoundingClientRect();
    const casterRect = casterEl.getBoundingClientRect();
    const tx = targetRect.left + targetRect.width / 2;
    const ty = targetRect.top + targetRect.height / 2;
    const cx = casterRect.left + casterRect.width / 2;
    const cy = casterRect.top + casterRect.height / 2;

    setTimeout(() => {
      switch (type) {
        case 'basketball': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${cx - 15}px`;
          el.style.top = `${cy - 15}px`;
          el.style.width = '30px';
          el.style.height = '30px';
          el.style.background = 'radial-gradient(circle at 30% 30%, #f97316, #ea580c)';
          el.style.borderRadius = '50%';
          el.style.boxShadow = 'inset -2px -2px 6px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.3)';
          
          el.style.backgroundImage = `
            radial-gradient(circle at center, transparent 48%, rgba(0,0,0,0.8) 49%, rgba(0,0,0,0.8) 51%, transparent 52%),
            linear-gradient(0deg, transparent 48%, rgba(0,0,0,0.8) 49%, rgba(0,0,0,0.8) 51%, transparent 52%)
          `;
          el.style.zIndex = '9999';
          document.body.appendChild(el);

          const distanceX = tx - cx;
          const distanceY = ty - cy;
          
          const anim = el.animate([
            { transform: 'translate(0px, 0px) rotate(0deg) scale(1)' },
            { transform: `translate(${distanceX * 0.5}px, ${distanceY * 0.5 - 100}px) rotate(180deg) scale(1.2)`, offset: 0.5 },
            { transform: `translate(${distanceX}px, ${distanceY}px) rotate(360deg) scale(1)` }
          ], { duration: 600, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' });

          anim.onfinish = () => {
            el.remove();
            const impact = document.createElement('div');
            impact.style.position = 'fixed';
            impact.style.left = `${tx - 40}px`;
            impact.style.top = `${ty - 40}px`;
            impact.style.width = '80px';
            impact.style.height = '80px';
            impact.style.background = 'radial-gradient(circle, #fcd34d, transparent)';
            impact.style.borderRadius = '50%';
            impact.style.zIndex = '9998';
            document.body.appendChild(impact);
            
            const impactAnim = impact.animate([
              { transform: 'scale(0.5)', opacity: 0.8 },
              { transform: 'scale(1.5)', opacity: 0 }
            ], { duration: 300, easing: 'ease-out' });
            impactAnim.onfinish = () => impact.remove();
            
            if (onImpact) onImpact(target, index);
          };
          break;
        }
        case 'arrest': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 30}px`;
          el.style.top = `${ty - 30}px`;
          el.style.width = '60px';
          el.style.height = '60px';
          el.style.border = '6px solid #cbd5e1';
          el.style.borderRadius = '10px';
          el.style.boxShadow = '0 0 15px #94a3b8';
          el.style.zIndex = '9999';
          document.body.appendChild(el);

          const anim = el.animate([
            { transform: 'scale(3)', opacity: 0 },
            { transform: 'scale(1)', opacity: 1, offset: 0.4 },
            { transform: 'scale(1)', opacity: 1, offset: 0.8 },
            { transform: 'scale(0.8)', opacity: 0 }
          ], { duration: 800, easing: 'ease-in-out' });

          anim.onfinish = () => el.remove();
          setTimeout(() => { if (onImpact) onImpact(target, index); }, 400);
          break;
        }
        case 'sing': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${cx - 20}px`;
          el.style.top = `${cy - 20}px`;
          el.style.fontSize = '40px';
          el.innerHTML = '🎵';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          document.body.appendChild(el);
          
          const distanceX = tx - cx;
          const distanceY = ty - cy;

          const anim = el.animate([
            { transform: 'translate(0, 0) scale(0.5) rotate(-20deg)', opacity: 0 },
            { transform: `translate(${distanceX * 0.3}px, ${distanceY * 0.3 - 50}px) scale(1.5) rotate(20deg)`, opacity: 1, offset: 0.3 },
            { transform: `translate(${distanceX * 0.6}px, ${distanceY * 0.6 + 20}px) scale(1) rotate(-10deg)`, opacity: 0.8, offset: 0.6 },
            { transform: `translate(${distanceX}px, ${distanceY}px) scale(1.2) rotate(10deg)`, opacity: 0 }
          ], { duration: 1000, easing: 'ease-in-out' });

          anim.onfinish = () => el.remove();
          setTimeout(() => { if (onImpact) onImpact(target, index); }, 800);
          break;
        }
        case 'monster_heal': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 60}px`;
          el.style.top = `${ty - 60}px`;
          el.style.width = '120px';
          el.style.height = '120px';
          el.style.background = 'radial-gradient(circle, rgba(168, 85, 247, 0.6), transparent)';
          el.style.borderRadius = '50%';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          document.body.appendChild(el);

          const anim = el.animate([
            { transform: 'scale(0.2)', opacity: 0 },
            { transform: 'scale(1.2)', opacity: 1, offset: 0.5 },
            { transform: 'scale(1)', opacity: 0 }
          ], { duration: 800, easing: 'ease-out' });

          anim.onfinish = () => el.remove();
          setTimeout(() => { if (onImpact) onImpact(target, index); }, 400);
          break;
        }
      }
    }, index * 100);
  });
};

export const tsunukichi = {
  id: 'tsunukichi',
  name: 'つぬきち',
  icon: 'mic',
  changeCost: 1000000,
  skills: [
    {
      id: 'basketball', name: '3 ポイントシュート', icon: 'sports_basketball', statDependency: 'ATK',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 8, multiplier: 1.5 },
        { level:  2, spCost: 1, mpCost: 10, multiplier: 1.8 },
        { level:  3, spCost: 1, mpCost: 13, multiplier: 2.1 },
        { level:  4, spCost: 2, mpCost: 15, multiplier: 2.5 },
        { level:  5, spCost: 2, mpCost: 18, multiplier: 3.0 },
        { level:  6, spCost: 2, mpCost: 20, multiplier: 3.5 },
        { level:  7, spCost: 3, mpCost: 23, multiplier: 4.0 },
        { level:  8, spCost: 3, mpCost: 25, multiplier: 4.5 },
        { level:  9, spCost: 3, mpCost: 28, multiplier: 5.0 },
        { level: 10, spCost: 5, mpCost: 33, multiplier: 6.0 }
      ],
      getDescription: (levelConfig) => `MP を ${levelConfig.mpCost} 消費し、敵単体にバスケットボールを投げつけ ${levelConfig.multiplier.toFixed(1)} 倍の物理攻撃を行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (target) {
            playSkillAnimation(caster, [target], 'basketball', () => {
                if (target.isDead) return;
                battle.executeAttack(caster, target, true, {
                    statDependency: this.statDependency, actionName: '3 ポイントシュート', damageMultiplier: levelConfig.multiplier, damageType: 'skill', hideActionName: true 
                });
            });
        }
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let target = context.selectedEnemyTarget;
          if (!target || target.isDead) target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          return { target, score: 50 * levelConfig.multiplier };
        }
      }
    },
    {
      id: 'arrest', name: '逮捕する', icon: 'local_police',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 10 },
        { level:  2, spCost: 1, mpCost: 13 },
        { level:  3, spCost: 1, mpCost: 15 },
        { level:  4, spCost: 2, mpCost: 18 },
        { level:  5, spCost: 2, mpCost: 20 },
        { level:  6, spCost: 2, mpCost: 23 },
        { level:  7, spCost: 3, mpCost: 25 },
        { level:  8, spCost: 3, mpCost: 28 },
        { level:  9, spCost: 3, mpCost: 30 },
        { level: 10, spCost: 5, mpCost: 38 }
      ],
      getDescription: (levelConfig) => `MP を ${levelConfig.mpCost} 消費し、敵単体を確実に麻痺させる`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (target) {
            playSkillAnimation(caster, [target], 'arrest', () => {
                if (target.isDead) return;
                const origA = caster.stats.attackAilments;
                caster.stats.attackAilments = { ...(origA || {}), paralysis: 1000 };
                battle.executeAttack(caster, target, true, {
                    actionName: '逮捕する', damageMultiplier: 0.1, damageType: 'skill', hideActionName: true 
                });
                caster.stats.attackAilments = origA;
            });
        }
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          const unparalyzed = aliveEnemies.find(e => !e.activeAilment || e.activeAilment.type !== 'paralysis');
          if (unparalyzed) {
             return { target: unparalyzed, score: 80 };
          }
          return null;
        }
      }
    },
    {
      id: 'sing', name: 'うたう', icon: 'music_note',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 15, chance: 40 },
        { level:  2, spCost: 1, mpCost: 18, chance: 45 },
        { level:  3, spCost: 1, mpCost: 20, chance: 50 },
        { level:  4, spCost: 2, mpCost: 23, chance: 55 },
        { level:  5, spCost: 2, mpCost: 25, chance: 60 },
        { level:  6, spCost: 2, mpCost: 28, chance: 65 },
        { level:  7, spCost: 3, mpCost: 30, chance: 70 },
        { level:  8, spCost: 3, mpCost: 33, chance: 75 },
        { level:  9, spCost: 3, mpCost: 35, chance: 80 },
        { level: 10, spCost: 5, mpCost: 40, chance: 100 }
      ],
      getDescription: (levelConfig) => `MP を ${levelConfig.mpCost} 消費し、敵全体を ${levelConfig.chance}％ の確率で睡眠状態にする`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const targets = battle.enemies.filter(e => !e.isDead);
        if (targets.length === 0) return;

        playSkillAnimation(caster, targets, 'sing', (target, index) => {
            if (target.isDead) return;
            const origA = caster.stats.attackAilments;
            caster.stats.attackAilments = { ...(origA || {}), sleep: levelConfig.chance };
            battle.executeAttack(caster, target, true, {
                actionName: 'うたう', damageMultiplier: 0.1, isMagic: true, damageType: 'skill', hideActionName: true, skipAtbReset: index > 0, isAoEProcessed: true
            });
            caster.stats.attackAilments = origA;
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          const awakeEnemies = aliveEnemies.filter(e => !e.activeAilment || e.activeAilment.type !== 'sleep');
          if (awakeEnemies.length >= 2) {
             return { target: awakeEnemies[0], score: 40 + (awakeEnemies.length * 20) };
          }
          return null;
        }
      }
    },
    {
      id: 'monster', name: 'モンスター', icon: 'pest_control',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, recoverHp:   5, recoverMp:   5 },
        { level:  2, spCost: 2, mpCost: 0, recoverHp:  10, recoverMp:  10 },
        { level:  3, spCost: 2, mpCost: 0, recoverHp:  15, recoverMp:  15 },
        { level:  4, spCost: 3, mpCost: 0, recoverHp:  20, recoverMp:  20 },
        { level:  5, spCost: 4, mpCost: 0, recoverHp:  25, recoverMp:  25 },
        { level:  6, spCost: 5, mpCost: 0, recoverHp:  30, recoverMp:  30 },
        { level:  7, spCost: 6, mpCost: 0, recoverHp:  35, recoverMp:  35 },
        { level:  8, spCost: 7, mpCost: 0, recoverHp:  40, recoverMp:  40 },
        { level:  9, spCost: 8, mpCost: 0, recoverHp:  45, recoverMp:  45 },
        { level: 10, spCost: 8, mpCost: 0, recoverHp:  50, recoverMp:  50 }
      ],
      getDescription: (levelConfig) => `自身の HP を ${levelConfig.recoverHp}、MP を ${levelConfig.recoverMp} 回復する`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        playSkillAnimation(caster, [caster], 'monster_heal', () => {
          caster.hp.current = Math.min(caster.hp.current + levelConfig.recoverHp, caster.stats?.hp || caster.hp.max);
          caster.mp.current = Math.min(caster.mp.current + levelConfig.recoverMp, caster.stats?.mp || caster.mp.max);
          battle.showDamage(caster.elementId, `+${levelConfig.recoverHp} HP`, 'text-green-400');
          setTimeout(() => {
              battle.showDamage(caster.elementId, `+${levelConfig.recoverMp} MP`, 'text-blue-400');
          }, 300);
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const maxHp = caster.stats?.hp || caster.hp.max;
          const hpPercent = caster.hp.current / maxHp;
          if (hpPercent < 0.6) return { target: caster, score: (1 - hpPercent) * 200 };
          return null;
        }
      }
    },
    // ─── Passive Skills ──────────────────────────────────────
    {
      id: 'utattemita', name: '歌ってみた', icon: 'podcasts', type: 'passive',
      maxLevel: 10,
      levels: [
        { level: 1, spCost: 1, mpCost: 0, healPercent: 2 },
        { level: 2, spCost: 1, mpCost: 0, healPercent: 3 },
        { level: 3, spCost: 1, mpCost: 0, healPercent: 4 },
        { level: 4, spCost: 2, mpCost: 0, healPercent: 5 },
        { level: 5, spCost: 2, mpCost: 0, healPercent: 7 },
        { level: 6, spCost: 2, mpCost: 0, healPercent: 9 },
        { level: 7, spCost: 3, mpCost: 0, healPercent: 11 },
        { level: 8, spCost: 3, mpCost: 0, healPercent: 13 },
        { level: 9, spCost: 3, mpCost: 0, healPercent: 15 },
        { level: 10, spCost: 5, mpCost: 0, healPercent: 20 }
      ],
      getDescription: (levelConfig) => `行動終了時、生存している味方全員の HP を最大値の ${levelConfig.healPercent}％ 回復する`
    }
  ]
};
