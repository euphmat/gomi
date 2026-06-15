// ─── Animation Utilities ──────────────────────────────────────
const playSkillAnimation = (caster, targets, type, params = {}, onImpact) => {
  if (!Array.isArray(targets)) targets = [targets];
  if (localStorage.getItem('disableBattleAnimations') === 'true') {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
    return;
  }

  const screenShake = (intensity = 5, duration = 300) => {
    // Screen shake globally disabled by user preference
  };

  const createSlimeProjectile = (startX, startY, endX, endY, slimeId, onHit) => {
    const el = document.createElement('img');
    el.src = `./assets/monster/monster_${slimeId}.webp`;
    el.style.position = 'fixed';
    el.style.left = `${startX - 24}px`;
    el.style.top = `${startY - 24}px`;
    el.style.width = '48px';
    el.style.height = '48px';
    el.style.objectFit = 'contain';
    el.style.zIndex = '9999';
    el.style.pointerEvents = 'none';
    document.body.appendChild(el);

    // Parabolic arc calculation
    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const anim = el.animate([
      { transform: 'translate(0px, 0px) rotate(0deg)' },
      { transform: `translate(${dx / 2}px, ${dy / 2 - 50}px) rotate(180deg)` },
      { transform: `translate(${dx}px, ${dy}px) rotate(360deg)` }
    ], { duration: Math.max(300, dist * 0.8), easing: 'linear' });

    anim.onfinish = () => {
      el.remove();
      onHit();
    };
  };

  const createSlimeRain = (x, y, slimeId, onHit) => {
    const el = document.createElement('img');
    el.src = `./assets/monster/monster_${slimeId}.webp`;
    el.style.position = 'fixed';
    // Start high above the target
    const startX = x + (Math.random() * 100 - 50);
    const startY = y - window.innerHeight;
    
    el.style.left = `${startX - 30}px`;
    el.style.top = `${startY - 30}px`;
    el.style.width = '60px';
    el.style.height = '60px';
    el.style.objectFit = 'contain';
    el.style.zIndex = '9999';
    el.style.pointerEvents = 'none';
    document.body.appendChild(el);

    const dx = x - startX;
    const dy = y - startY;

    const anim = el.animate([
      { transform: 'translate(0px, 0px) scale(0.5)' },
      { transform: `translate(${dx}px, ${dy}px) scale(1.5)` }
    ], { duration: 400 + Math.random() * 200, easing: 'ease-in' });

    anim.onfinish = () => {
      el.remove();
      onHit();
    };
  };

  targets.forEach((target, index) => {
    const targetEl = document.getElementById(target.elementId);
    if (!targetEl) {
      if (onImpact) onImpact(target, index);
      return;
    }
    
    const targetRect = targetEl.getBoundingClientRect();
    const casterEl = document.getElementById(caster.elementId);
    const casterRect = casterEl ? casterEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    
    const cx = casterRect.left + casterRect.width / 2;
    const cy = casterRect.top + casterRect.height / 2;
    const tx = targetRect.left + targetRect.width / 2;
    const ty = targetRect.top + targetRect.height / 2;

    setTimeout(() => {
      if (type === 'slime_throw') {
        createSlimeProjectile(cx, cy, tx, ty, params.slimeId || 'slime_blue', () => {
          // Impact explosion
          const ex = document.createElement('div');
          ex.style.position = 'fixed';
          ex.style.left = `${tx - 40}px`;
          ex.style.top = `${ty - 40}px`;
          ex.style.width = '80px';
          ex.style.height = '80px';
          ex.style.borderRadius = '50%';
          ex.style.background = `radial-gradient(circle, #fff, ${params.color || '#00bfff'}, transparent)`;
          ex.style.zIndex = '9999';
          ex.style.pointerEvents = 'none';
          document.body.appendChild(ex);

          const animEx = ex.animate([
            { transform: 'scale(0.5)', opacity: 0.8 },
            { transform: 'scale(1.5)', opacity: 0 }
          ], { duration: 300, easing: 'ease-out' });
          animEx.onfinish = () => ex.remove();

          if (onImpact) onImpact(target, index);
        });
      } else if (type === 'slime_hazard') {
        const slimeIds = ['slime_blue', 'slime_green', 'slime_red', 'slime_water', 'slime_fire', 'slime_ice', 'slime_wind', 'slime_thunder', 'slime_flower', 'slime_grass', 'slime_dark', 'slime_earth', 'slime_angel'];
        
        // Rain multiple slimes on the target
        let slimesToDrop = 5;
        let slimesDropped = 0;
        
        for (let i = 0; i < slimesToDrop; i++) {
          setTimeout(() => {
            const randomSlime = slimeIds[Math.floor(Math.random() * slimeIds.length)];
            createSlimeRain(tx, ty, randomSlime, () => {
              slimesDropped++;
              if (slimesDropped === slimesToDrop) {
                if (onImpact) onImpact(target, index);
              }
            });
          }, i * 150 + Math.random() * 50);
        }
      }
    }, index * 100);
  });
};

const BASE_SLIMES = [
  'slime_blue', 'slime_green', 'slime_red', 'slime_water', 'slime_fire', 'slime_ice', 'slime_wind',
  'slime_thunder', 'slime_flower', 'slime_grass', 'slime_dark', 'slime_earth', 'slime_angel'
];

export const slime_master = {
  id: 'slime_master',
  name: 'スライムマスター',
  icon: 'water_drop',
  changeCost: 200000,
  requirements: [
    {
      type: 'custom',
      description: 'スライムの森のスライムを全捕獲 (王を除く)',
      check: (capturedMonsters) => {
        if (!capturedMonsters) return false;
        // Check if all 13 base slimes are captured
        return BASE_SLIMES.every(slime => capturedMonsters.includes(slime));
      }
    }
  ],
  statGrowth: { hp: [10, 15], mp: [2, 4], atk: [1, 2], def: [1, 2], matk: [2, 3], mdef: [2, 3], spd: [1, 2] },
  skills: [
    // ─── Active Skills ──────────────────────────────────────
    {
      id: 'slime_throw', name: 'スライム投げ', icon: 'water_drop',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 5, multiplier: 1.2 },
        { level:  2, spCost: 1, mpCost: 6, multiplier: 1.3 },
        { level:  3, spCost: 1, mpCost: 7, multiplier: 1.4 },
        { level:  4, spCost: 2, mpCost: 8, multiplier: 1.5 },
        { level:  5, spCost: 2, mpCost: 9, multiplier: 1.6 },
        { level:  6, spCost: 2, mpCost: 10, multiplier: 1.7 },
        { level:  7, spCost: 3, mpCost: 11, multiplier: 1.8 },
        { level:  8, spCost: 3, mpCost: 12, multiplier: 1.9 },
        { level:  9, spCost: 3, mpCost: 13, multiplier: 2.0 },
        { level: 10, spCost: 5, mpCost: 15, multiplier: 2.5 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、ランダムなスライムを投げる。スライムによって属性と追加効果が変わる。基本威力 ${lc.multiplier.toFixed(2)} 倍`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (!target) return;

        const slimeId = BASE_SLIMES[Math.floor(Math.random() * BASE_SLIMES.length)];
        
        // Define slime effects
        const slimeEffects = {
          'slime_blue': { el: 'water', color: '#00bfff' },
          'slime_green': { el: 'grass', color: '#32cd32', ailment: 'poison' },
          'slime_red': { el: 'fire', color: '#ff4500', ailment: 'burn' },
          'slime_water': { el: 'water', color: '#1e90ff' },
          'slime_fire': { el: 'fire', color: '#ff0000', ailment: 'burn' },
          'slime_ice': { el: 'ice', color: '#e0ffff', ailment: 'paralysis' },
          'slime_wind': { el: 'wind', color: '#98fb98', ailment: 'blind' },
          'slime_thunder': { el: 'thunder', color: '#ffd700', ailment: 'paralysis' },
          'slime_flower': { el: 'grass', color: '#ff69b4', ailment: 'sleep' },
          'slime_grass': { el: 'grass', color: '#228b22', ailment: 'poison' },
          'slime_dark': { el: 'dark', color: '#4b0082', ailment: 'curse' },
          'slime_earth': { el: 'earth', color: '#8b4513', ailment: 'blind' },
          'slime_angel': { el: 'light', color: '#ffffff', ailment: 'silence' }
        };

        const effect = slimeEffects[slimeId] || slimeEffects['slime_blue'];

        playSkillAnimation(caster, [target], 'slime_throw', { slimeId, color: effect.color }, () => {
          if (target.isDead) return;
          
          const origA = caster.stats.attackAilments;
          if (effect.ailment) {
            caster.stats.attackAilments = { ...(origA || {}), [effect.ailment]: 50 };
          }
          
          battle.executeAttack(caster, target, true, {
            actionName: 'スライム投げ',
            damageMultiplier: levelConfig.multiplier,
            damageType: 'skill',
            isMagic: true, // Let's make it magic based since they are using slimes
            element: effect.el
          });
          
          caster.stats.attackAilments = origA;
        });
      },
      autoBattle: {
        priority: 60,
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
      id: 'slime_hazard', name: 'スライムハザード', icon: 'storm',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost: 30, multiplier: 1.5 },
        { level:  2, spCost: 2, mpCost: 35, multiplier: 1.6 },
        { level:  3, spCost: 2, mpCost: 40, multiplier: 1.7 },
        { level:  4, spCost: 3, mpCost: 45, multiplier: 1.8 },
        { level:  5, spCost: 3, mpCost: 50, multiplier: 1.9 },
        { level:  6, spCost: 3, mpCost: 55, multiplier: 2.0 },
        { level:  7, spCost: 4, mpCost: 60, multiplier: 2.2 },
        { level:  8, spCost: 4, mpCost: 65, multiplier: 2.4 },
        { level:  9, spCost: 4, mpCost: 70, multiplier: 2.6 },
        { level: 10, spCost: 6, mpCost: 80, multiplier: 3.0 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵全体にスライムの雨を降らせる無属性魔法攻撃。威力 ${lc.multiplier.toFixed(2)} 倍`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        const targets = battle.enemies.filter(e => !e.isDead);
        if (targets.length === 0) return;

        playSkillAnimation(caster, targets, 'slime_hazard', {}, (target) => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            actionName: 'スライムハザード',
            damageMultiplier: levelConfig.multiplier,
            damageType: 'skill',
            isMagic: true
          });
        });
      },
      autoBattle: {
        priority: 70,
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length >= 2) return caster;
          return null;
        }
      }
    },
    // ─── Passive Skills ──────────────────────────────────────
    {
      id: 'slime_body', name: 'スライムボディ', icon: 'shield', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, reduction: 5 },
        { level:  2, spCost: 1, reduction: 7 },
        { level:  3, spCost: 1, reduction: 9 },
        { level:  4, spCost: 2, reduction: 11 },
        { level:  5, spCost: 2, reduction: 13 },
        { level:  6, spCost: 2, reduction: 15 },
        { level:  7, spCost: 3, reduction: 17 },
        { level:  8, spCost: 3, reduction: 19 },
        { level:  9, spCost: 3, reduction: 21 },
        { level: 10, spCost: 5, reduction: 25 }
      ],
      getDescription: (lc) => `常に自身が受ける被ダメージを ${lc.reduction}％ カットする`
    },
    {
      id: 'slime_core', name: 'スライムコア', icon: 'favorite', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, threshold: 80 },
        { level:  2, spCost: 2, threshold: 75 },
        { level:  3, spCost: 2, threshold: 70 },
        { level:  4, spCost: 3, threshold: 65 },
        { level:  5, spCost: 3, threshold: 60 },
        { level:  6, spCost: 3, threshold: 55 },
        { level:  7, spCost: 4, threshold: 50 },
        { level:  8, spCost: 4, threshold: 45 },
        { level:  9, spCost: 4, threshold: 40 },
        { level: 10, spCost: 6, threshold: 30 }
      ],
      getDescription: (lc) => `HP が ${lc.threshold}％ 以上の時、致命傷を受けても HP が 1 残る`
    },
    {
      id: 'adhesive_substance', name: '粘着物質', icon: 'opacity', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, spdDown: 3 },
        { level:  2, spCost: 2, spdDown: 4 },
        { level:  3, spCost: 2, spdDown: 5 },
        { level:  4, spCost: 3, spdDown: 6 },
        { level:  5, spCost: 3, spdDown: 7 },
        { level:  6, spCost: 3, spdDown: 8 },
        { level:  7, spCost: 4, spdDown: 9 },
        { level:  8, spCost: 4, spdDown: 10 },
        { level:  9, spCost: 4, spdDown: 12 },
        { level: 10, spCost: 6, spdDown: 15 }
      ],
      getDescription: (lc) => `ターン開始時に、敵全体の SPD を ${lc.spdDown}％ ダウンさせる（累積する）`
    }
  ]
};
