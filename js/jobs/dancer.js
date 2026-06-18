// ─── Animation Utilities ──────────────────────────────────────
const playSkillAnimation = (caster, targets, type, onImpact) => {
  if (!Array.isArray(targets)) targets = [targets];
  if (localStorage.getItem('disableBattleAnimations') === 'true') {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
    return;
  }

  const casterEl = document.getElementById(caster.elementId);
  const casterRect = casterEl ? casterEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  const cx = casterRect.left + casterRect.width / 2;
  const cy = casterRect.top + casterRect.height / 2;

  const createHitSparks = (x, y, color = '#bef264', count = 4) => {
    for (let i = 0; i < count; i++) {
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

  if (type === 'poison_salsa') {
    const aura = document.createElement('div');
    aura.style.position = 'fixed';
    aura.style.left = `${cx - 50}px`;
    aura.style.top = `${cy - 50}px`;
    aura.style.width = '100px';
    aura.style.height = '100px';
    aura.style.borderRadius = '50%';
    aura.style.background = 'radial-gradient(circle, rgba(168,85,247,0.8), transparent)';
    aura.style.boxShadow = '0 0 20px #a855f7';
    aura.style.zIndex = '9998';
    aura.style.pointerEvents = 'none';
    document.body.appendChild(aura);

    const auraAnim = aura.animate([
      { transform: 'scale(0.5)', opacity: 0 },
      { transform: 'scale(3)', opacity: 0.8, offset: 0.5 },
      { transform: 'scale(8)', opacity: 0 }
    ], { duration: 800, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });

    auraAnim.onfinish = () => aura.remove();

    targets.forEach((target, index) => {
      setTimeout(() => {
        const targetEl = document.getElementById(target.elementId);
        if (!targetEl) { if (onImpact) onImpact(target, index); return; }
        const targetRect = targetEl.getBoundingClientRect();
        const tx = targetRect.left + targetRect.width / 2;
        const ty = targetRect.top + targetRect.height / 2;

        for (let i = 0; i < 6; i++) {
          setTimeout(() => {
            const bubble = document.createElement('div');
            bubble.style.position = 'fixed';
            bubble.style.left = `${tx - 10 + (Math.random() * 40 - 20)}px`;
            bubble.style.top = `${ty + 20 + (Math.random() * 20)}px`;
            bubble.style.width = '20px';
            bubble.style.height = '20px';
            bubble.style.borderRadius = '50%';
            bubble.style.background = 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(168,85,247,0.9), transparent)';
            bubble.style.boxShadow = '0 0 10px rgba(168,85,247,0.5)';
            bubble.style.zIndex = '9999';
            bubble.style.pointerEvents = 'none';
            document.body.appendChild(bubble);

            const floatAnim = bubble.animate([
              { transform: 'translateY(0) scale(0)', opacity: 0 },
              { transform: 'translateY(-20px) scale(1)', opacity: 1, offset: 0.2 },
              { transform: 'translateY(-80px) scale(1.5)', opacity: 0.8, offset: 0.8 },
              { transform: 'translateY(-100px) scale(2)', opacity: 0 }
            ], { duration: 600 + Math.random() * 300, easing: 'ease-out' });

            floatAnim.onfinish = () => bubble.remove();
          }, i * 100);
        }

        setTimeout(() => {
          if (onImpact) onImpact(target, index);
          createHitSparks(tx, ty, '#a855f7', 8);
        }, 400);

      }, 300 + index * 100);
    });

  } else if (type === 'juggling_dagger') {
    targets.forEach((target, index) => {
      const targetEl = document.getElementById(target.elementId);
      if (!targetEl) { if (onImpact) onImpact(target, index); return; }
      const targetRect = targetEl.getBoundingClientRect();
      const tx = targetRect.left + targetRect.width / 2;
      const ty = targetRect.top + targetRect.height / 2;

      const dagger = document.createElement('div');
      dagger.style.position = 'fixed';
      dagger.style.width = '16px';
      dagger.style.height = '48px';
      const swordSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 48"><path d="M8 48 L10 12 L16 12 L16 8 L10 8 L10 0 L6 0 L6 8 L0 8 L0 12 L6 12 Z" fill="%23f1f5f9" stroke="%23cbd5e1" stroke-width="1"/></svg>`;
      dagger.style.backgroundImage = `url('${swordSvg}')`;
      dagger.style.backgroundSize = '100% 100%';
      dagger.style.filter = 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))';
      dagger.style.zIndex = '9999';
      dagger.style.pointerEvents = 'none';
      document.body.appendChild(dagger);

      const midX = cx + (Math.random() * 80 - 40);
      const midY = cy - 60 - Math.random() * 40;

      const angle = Math.atan2(ty - midY, tx - midX);
      const angleDeg = (angle * 180 / Math.PI) - 90;

      const animDuration = 500;
      const strikeOffset = 0.8;

      const anim = dagger.animate([
        { transform: `rotate(0deg) scale(0.5)`, opacity: 0, top: `${cy - 20}px`, left: `${cx}px` },
        { transform: `rotate(360deg) scale(1)`, opacity: 1, top: `${midY}px`, left: `${midX}px`, offset: 0.4 },
        { transform: `rotate(${angleDeg}deg) scale(1)`, opacity: 1, top: `${midY}px`, left: `${midX}px`, offset: 0.6 },
        { transform: `rotate(${angleDeg}deg) scale(1.2)`, opacity: 1, top: `${ty}px`, left: `${tx}px`, offset: strikeOffset },
        { transform: `rotate(${angleDeg}deg) scale(1)`, opacity: 0, top: `${ty}px`, left: `${tx}px`, offset: 1 }
      ], { duration: animDuration, easing: 'ease-in-out' });

      setTimeout(() => {
        createHitSparks(tx, ty, '#38bdf8', 6);
        if (onImpact) onImpact(target, index);
      }, animDuration * strikeOffset);

      anim.onfinish = () => {
        dagger.remove();
      };
    });

  } else if (type === 'confusion_tarantella') {

    targets.forEach((target, index) => {
      setTimeout(() => {
        const targetEl = document.getElementById(target.elementId);
        if (!targetEl) { if (onImpact) onImpact(target, index); return; }
        const targetRect = targetEl.getBoundingClientRect();
        const tx = targetRect.left + targetRect.width / 2;
        const ty = targetRect.top + targetRect.height / 2;

        const web = document.createElement('div');
        web.style.position = 'fixed';
        web.style.left = `${tx - 100}px`;
        web.style.top = `${ty - 100}px`;
        web.style.width = '200px';
        web.style.height = '200px';
        web.style.background = 'repeating-radial-gradient(circle, transparent, transparent 10px, rgba(250, 204, 21, 0.4) 11px, rgba(250, 204, 21, 0.4) 12px), repeating-conic-gradient(from 0deg, rgba(250, 204, 21, 0.4) 0deg, transparent 2deg, transparent 45deg)';
        web.style.borderRadius = '50%';
        web.style.zIndex = '9998';
        web.style.pointerEvents = 'none';
        document.body.appendChild(web);

        const webAnim = web.animate([
          { transform: 'scale(0.1) rotate(0deg)', opacity: 0 },
          { transform: 'scale(1) rotate(180deg)', opacity: 1, offset: 0.3 },
          { transform: 'scale(1) rotate(360deg)', opacity: 0 }
        ], { duration: 1000, easing: 'ease-in-out' });
        webAnim.onfinish = () => web.remove();

        const spiral = document.createElement('div');
        spiral.style.position = 'fixed';
        spiral.style.left = `${tx - 40}px`;
        spiral.style.top = `${ty - 40}px`;
        spiral.style.width = '80px';
        spiral.style.height = '80px';
        spiral.style.background = 'conic-gradient(from 0deg, #facc15, transparent, #facc15, transparent, #facc15)';
        spiral.style.borderRadius = '50%';
        spiral.style.mixBlendMode = 'screen';
        spiral.style.zIndex = '9999';
        spiral.style.pointerEvents = 'none';
        document.body.appendChild(spiral);

        const spiralAnim = spiral.animate([
          { transform: 'scale(0) rotate(0deg)', opacity: 0 },
          { transform: 'scale(1) rotate(720deg)', opacity: 0.8, offset: 0.3 },
          { transform: 'scale(0.5) rotate(1440deg)', opacity: 0 }
        ], { duration: 1000, easing: 'ease-in-out' });
        spiralAnim.onfinish = () => spiral.remove();

        setTimeout(() => {
          if (onImpact) onImpact(target, index);
        }, 500);
      }, index * 100);
    });

  } else if (type === 'curse_step') {
    const circle = document.createElement('div');
    circle.style.position = 'fixed';
    circle.style.left = `${cx - 60}px`;
    circle.style.top = `${cy - 20}px`;
    circle.style.width = '120px';
    circle.style.height = '120px';
    circle.style.border = '4px dashed #f43f5e';
    circle.style.borderRadius = '50%';
    circle.style.boxShadow = '0 0 20px #f43f5e, inset 0 0 20px #f43f5e';
    circle.style.transform = 'rotateX(60deg)';
    circle.style.zIndex = '9997';
    circle.style.pointerEvents = 'none';
    document.body.appendChild(circle);

    const circleAnim = circle.animate([
      { transform: 'rotateX(60deg) rotateZ(0deg)', opacity: 0 },
      { transform: 'rotateX(60deg) rotateZ(180deg)', opacity: 1, offset: 0.2 },
      { transform: 'rotateX(60deg) rotateZ(540deg)', opacity: 1, offset: 0.8 },
      { transform: 'rotateX(60deg) rotateZ(720deg)', opacity: 0 }
    ], { duration: 1500 });
    circleAnim.onfinish = () => circle.remove();

    targets.forEach((target, index) => {
      setTimeout(() => {
        const targetEl = document.getElementById(target.elementId);
        if (!targetEl) { if (onImpact) onImpact(target, index); return; }
        const targetRect = targetEl.getBoundingClientRect();
        const tx = targetRect.left + targetRect.width / 2;
        const ty = targetRect.top + targetRect.height / 2;

        const colors = ['#f43f5e', '#a855f7', '#3b82f6', '#10b981'];
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            const flame = document.createElement('div');
            flame.style.position = 'fixed';
            flame.style.left = `${tx - 15}px`;
            flame.style.top = `${ty - 15}px`;
            flame.style.width = '30px';
            flame.style.height = '30px';
            const color = colors[Math.floor(Math.random() * colors.length)];
            flame.style.background = `radial-gradient(circle, ${color}, transparent)`;
            flame.style.boxShadow = `0 0 15px ${color}`;
            flame.style.borderRadius = '50%';
            flame.style.zIndex = '9999';
            flame.style.pointerEvents = 'none';
            document.body.appendChild(flame);

            const startX = tx + (Math.random() * 200 - 100);
            const startY = ty - 200 - Math.random() * 100;
            const midX = tx + (Math.random() * 100 - 50);
            const midY = ty - 100;

            const flameAnim = flame.animate([
              { transform: `translate(${startX - tx}px, ${startY - ty}px) scale(0)`, opacity: 0 },
              { transform: `translate(${midX - tx}px, ${midY - ty}px) scale(1.5)`, opacity: 1, offset: 0.5 },
              { transform: `translate(0, 0) scale(0.5)`, opacity: 0 }
            ], { duration: 600, easing: 'cubic-bezier(0.5, 0, 0.8, 1)' });

            flameAnim.onfinish = () => flame.remove();
          }, i * 80);
        }

        setTimeout(() => {
          if (onImpact) onImpact(target, index);
        }, 400);
      }, 500 + index * 100);
    });
  } else {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
  }
};

export const dancer = {
  id: 'dancer',
  name: 'ダンサー',
  image: 'assets/job_dancer.webp',
  icon: 'directions_run',
  changeCost: 100000,
  skills: [
    // ─── Active Skills ──────────────────────────────────────
    {
      id: 'poison_salsa', name: 'ポイズン・サルサ', icon: 'coronavirus', statDependency: 'MAT',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 16, multiplier: 0.5, chance: 30 },
        { level:  2, spCost: 1, mpCost: 20, multiplier: 0.55, chance: 35 },
        { level:  3, spCost: 1, mpCost: 24, multiplier: 0.6, chance: 40 },
        { level:  4, spCost: 2, mpCost: 28, multiplier: 0.65, chance: 45 },
        { level:  5, spCost: 2, mpCost: 32, multiplier: 0.7, chance: 50 },
        { level:  6, spCost: 2, mpCost: 36, multiplier: 0.75, chance: 55 },
        { level:  7, spCost: 3, mpCost: 40, multiplier: 0.8, chance: 60 },
        { level:  8, spCost: 3, mpCost: 44, multiplier: 0.85, chance: 65 },
        { level:  9, spCost: 3, mpCost: 48, multiplier: 0.9, chance: 70 },
        { level: 10, spCost: 5, mpCost: 60, multiplier: 1.0, chance: 80 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵全体に ${lc.multiplier.toFixed(2)} 倍のダメージを与え、${lc.chance}% の確率で毒を付与する。`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const targets = battle.enemies.filter(e => !e.isDead);
        playSkillAnimation(caster, targets, 'poison_salsa', (target, idx) => {
          if (target.isDead) return;
          const origA = caster.stats.attackAilments;
          caster.stats.attackAilments = { ...(origA || {}), poison: levelConfig.chance };
          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency, 
            actionName: '', 
            damageMultiplier: levelConfig.multiplier, 
            damageType: 'skill', 
            hideActionName: true,
            isAoEProcessed: true
          });
          caster.stats.attackAilments = origA;
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let score = 40 + (aliveEnemies.length * 10);
          return { target: aliveEnemies[0], score: score };
        }
      }
    },
    {
      id: 'juggling_dagger', name: 'ジャグリングダガー', icon: 'content_cut', statDependency: 'ATK',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 20, multiplier: 0.10, minHits: 3, maxHits: 5 },
        { level:  2, spCost: 1, mpCost: 24, multiplier: 0.11, minHits: 3, maxHits: 6 },
        { level:  3, spCost: 1, mpCost: 28, multiplier: 0.12, minHits: 4, maxHits: 7 },
        { level:  4, spCost: 2, mpCost: 32, multiplier: 0.13, minHits: 4, maxHits: 8 },
        { level:  5, spCost: 2, mpCost: 36, multiplier: 0.14, minHits: 5, maxHits: 9 },
        { level:  6, spCost: 2, mpCost: 40, multiplier: 0.15, minHits: 5, maxHits: 10 },
        { level:  7, spCost: 3, mpCost: 48, multiplier: 0.16, minHits: 6, maxHits: 11 },
        { level:  8, spCost: 3, mpCost: 56, multiplier: 0.18, minHits: 6, maxHits: 12 },
        { level:  9, spCost: 3, mpCost: 64, multiplier: 0.20, minHits: 7, maxHits: 14 },
        { level: 10, spCost: 5, mpCost: 80, multiplier: 0.25, minHits: 8, maxHits: 16 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、ランダムな敵単体に ${lc.multiplier.toFixed(2)} 倍のダメージを ${lc.minHits}～${lc.maxHits} 回与える。`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const hits = Math.floor(Math.random() * (levelConfig.maxHits - levelConfig.minHits + 1)) + levelConfig.minHits;
        for (let i = 0; i < hits; i++) {
          setTimeout(() => {
            const aliveEnemies = battle.enemies.filter(e => !e.isDead);
            if (aliveEnemies.length > 0) {
              const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
              playSkillAnimation(caster, [target], 'juggling_dagger', () => {
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
          const avgHits = (levelConfig.minHits + levelConfig.maxHits) / 2;
          const score = 40 * levelConfig.multiplier * avgHits;
          return { target: aliveEnemies[0], score: score };
        }
      }
    },
    {
      id: 'confusion_tarantella', name: '混乱のタランテラ', icon: 'psychology_alt', statDependency: 'MAT',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost: 30, chance: 30 },
        { level:  2, spCost: 2, mpCost: 34, chance: 35 },
        { level:  3, spCost: 2, mpCost: 38, chance: 40 },
        { level:  4, spCost: 3, mpCost: 42, chance: 45 },
        { level:  5, spCost: 3, mpCost: 46, chance: 50 },
        { level:  6, spCost: 3, mpCost: 50, chance: 55 },
        { level:  7, spCost: 4, mpCost: 56, chance: 60 },
        { level:  8, spCost: 4, mpCost: 62, chance: 65 },
        { level:  9, spCost: 4, mpCost: 70, chance: 70 },
        { level: 10, spCost: 6, mpCost: 80, chance: 80 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵全体に ${lc.chance}% の確率で「混乱」を付与する。`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const targets = battle.enemies.filter(e => !e.isDead);
        playSkillAnimation(caster, targets, 'confusion_tarantella', (target, idx) => {
          if (target.isDead) return;
          const origA = caster.stats.attackAilments;
          caster.stats.attackAilments = { ...(origA || {}), confusion: levelConfig.chance };
          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency, 
            actionName: '', 
            damageMultiplier: 0, 
            damageType: 'skill', 
            hideActionName: true,
            isAoEProcessed: true
          });
          caster.stats.attackAilments = origA;
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length >= 2) return { target: aliveEnemies[0], score: 50 + (aliveEnemies.length * 5) };
          return null;
        }
      }
    },
    {
      id: 'curse_step', name: 'カース・ステップ', icon: 'accessibility_new', statDependency: 'MAT',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 3, mpCost: 50, chance: 30, minAilments: 1, maxAilments: 1 },
        { level:  2, spCost: 3, mpCost: 56, chance: 35, minAilments: 1, maxAilments: 2 },
        { level:  3, spCost: 3, mpCost: 62, chance: 40, minAilments: 1, maxAilments: 2 },
        { level:  4, spCost: 4, mpCost: 68, chance: 45, minAilments: 1, maxAilments: 2 },
        { level:  5, spCost: 4, mpCost: 74, chance: 50, minAilments: 2, maxAilments: 2 },
        { level:  6, spCost: 4, mpCost: 80, chance: 55, minAilments: 2, maxAilments: 3 },
        { level:  7, spCost: 5, mpCost: 90, chance: 60, minAilments: 2, maxAilments: 3 },
        { level:  8, spCost: 5, mpCost: 100, chance: 65, minAilments: 2, maxAilments: 3 },
        { level:  9, spCost: 5, mpCost: 110, chance: 70, minAilments: 2, maxAilments: 4 },
        { level: 10, spCost: 7, mpCost: 130, chance: 85, minAilments: 3, maxAilments: 5 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵全体に ${lc.chance}% の確率でランダムな状態異常を ${lc.minAilments === lc.maxAilments ? lc.minAilments : lc.minAilments + '～' + lc.maxAilments} つ付与する。`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const targets = battle.enemies.filter(e => !e.isDead);
        const allAilments = ['poison', 'burn', 'paralysis', 'sleep', 'confusion', 'curse', 'blind', 'silence'];
        
        playSkillAnimation(caster, targets, 'curse_step', (target, idx) => {
          if (target.isDead) return;
          
          const numAilments = Math.floor(Math.random() * (levelConfig.maxAilments - levelConfig.minAilments + 1)) + levelConfig.minAilments;
          const shuffledAilments = allAilments.sort(() => 0.5 - Math.random());
          const selectedAilments = shuffledAilments.slice(0, numAilments);
          
          const origA = caster.stats.attackAilments;
          const tempAilments = { ...(origA || {}) };
          selectedAilments.forEach(ailment => {
            tempAilments[ailment] = levelConfig.chance;
          });
          caster.stats.attackAilments = tempAilments;
          
          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency, 
            actionName: '', 
            damageMultiplier: 0, 
            damageType: 'skill', 
            hideActionName: true,
            isAoEProcessed: true
          });
          
          caster.stats.attackAilments = origA;
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length >= 2) return { target: aliveEnemies[0], score: 55 + (aliveEnemies.length * 5) };
          return null;
        }
      }
    },
    // ─── Passive Skills ──────────────────────────────────────
    {
      id: 'opening_act', name: 'オープニング・アクト', icon: 'speed', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost: 0, spdPercent: 10 },
        { level:  2, spCost: 2, mpCost: 0, spdPercent: 12 },
        { level:  3, spCost: 2, mpCost: 0, spdPercent: 14 },
        { level:  4, spCost: 3, mpCost: 0, spdPercent: 16 },
        { level:  5, spCost: 3, mpCost: 0, spdPercent: 18 },
        { level:  6, spCost: 3, mpCost: 0, spdPercent: 20 },
        { level:  7, spCost: 4, mpCost: 0, spdPercent: 23 },
        { level:  8, spCost: 4, mpCost: 0, spdPercent: 26 },
        { level:  9, spCost: 4, mpCost: 0, spdPercent: 30 },
        { level: 10, spCost: 6, mpCost: 0, spdPercent: 40 }
      ],
      getDescription: (lc) => `ダンジョン潜入時（バトル中）、味方全員の素早さ（SPD）が ${lc.spdPercent}% 上昇する。`
    },
    {
      id: 'splendid_evasion', name: '華麗なる見切り', icon: 'directions_run', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost: 0, evadeChance:  5 },
        { level:  2, spCost: 2, mpCost: 0, evadeChance:  7 },
        { level:  3, spCost: 2, mpCost: 0, evadeChance: 10 },
        { level:  4, spCost: 3, mpCost: 0, evadeChance: 12 },
        { level:  5, spCost: 3, mpCost: 0, evadeChance: 15 },
        { level:  6, spCost: 3, mpCost: 0, evadeChance: 18 },
        { level:  7, spCost: 4, mpCost: 0, evadeChance: 22 },
        { level:  8, spCost: 4, mpCost: 0, evadeChance: 26 },
        { level:  9, spCost: 4, mpCost: 0, evadeChance: 30 },
        { level: 10, spCost: 6, mpCost: 0, evadeChance: 40 }
      ],
      getDescription: (lc) => `敵の物理攻撃を ${lc.evadeChance}% の確率で回避する。`
    },
    {
      id: 'energizing', name: 'エナジャイジング', icon: 'battery_charging_full', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost: 0, recoverMp:  2 },
        { level:  2, spCost: 2, mpCost: 0, recoverMp:  3 },
        { level:  3, spCost: 2, mpCost: 0, recoverMp:  4 },
        { level:  4, spCost: 3, mpCost: 0, recoverMp:  5 },
        { level:  5, spCost: 3, mpCost: 0, recoverMp:  6 },
        { level:  6, spCost: 3, mpCost: 0, recoverMp:  8 },
        { level:  7, spCost: 4, mpCost: 0, recoverMp: 10 },
        { level:  8, spCost: 4, mpCost: 0, recoverMp: 12 },
        { level:  9, spCost: 4, mpCost: 0, recoverMp: 15 },
        { level: 10, spCost: 6, mpCost: 0, recoverMp: 20 }
      ],
      getDescription: (lc) => `自身のターン終了時、味方全体の MP を ${lc.recoverMp} 回復する。`
    }
  ]
};
