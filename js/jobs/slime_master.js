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
    el.src = `./assets/monster/${slimeId}.webp`;
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
    el.src = `./assets/monster/${slimeId}.webp`;
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

    el.style.filter = 'drop-shadow(0px 20px 10px rgba(0,0,0,0.3))';
    const anim = el.animate([
      { transform: 'translate(0px, 0px) scale(0.5) rotate(0deg)' },
      { transform: `translate(${dx}px, ${dy}px) scale(1.5) rotate(${Math.random() > 0.5 ? 180 : -180}deg)` }
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
        const pSlimeId = params.slimes ? params.slimes[index].slimeId : (params.slimeId || 'slime_blue');
        const pColor = params.slimes ? params.slimes[index].color : (params.color || '#00bfff');
        createSlimeProjectile(cx, cy, tx, ty, pSlimeId, () => {
          // Impact explosion
          const ex = document.createElement('div');
          ex.style.position = 'fixed';
          ex.style.left = `${tx - 40}px`;
          ex.style.top = `${ty - 40}px`;
          ex.style.width = '80px';
          ex.style.height = '80px';
          ex.style.borderRadius = '50%';
          ex.style.background = `radial-gradient(circle, #fff, ${pColor}, transparent)`;
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
        const randomSlime = slimeIds[Math.floor(Math.random() * slimeIds.length)];
        
        createSlimeRain(tx, ty, randomSlime, () => {
          const ex = document.createElement('div');
          ex.style.position = 'fixed';
          ex.style.left = `${tx - 60}px`;
          ex.style.top = `${ty - 60}px`;
          ex.style.width = '120px';
          ex.style.height = '120px';
          ex.style.borderRadius = '50%';
          const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#00ff00', '#0000ff', '#ff8800'];
          const rc = colors[Math.floor(Math.random() * colors.length)];
          ex.style.background = `radial-gradient(circle, #ffffff, ${rc}, transparent)`;
          ex.style.mixBlendMode = 'screen';
          ex.style.zIndex = '9999';
          ex.style.pointerEvents = 'none';
          document.body.appendChild(ex);

          const animEx = ex.animate([
            { transform: 'scale(0.3) rotate(0deg)', opacity: 1 },
            { transform: 'scale(2.5) rotate(90deg)', opacity: 0 }
          ], { duration: 500, easing: 'ease-out' });
          animEx.onfinish = () => ex.remove();

          if (onImpact) onImpact(target, index);
        });
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
      description: 'スライムの森のスライム(キング含む)を全捕獲',
      check: (capturedMonsters) => {
        if (!capturedMonsters) return false;
        // Check if all 13 base slimes + king slimes are captured
        const requiredSlimes = [...BASE_SLIMES, 'slime_king', 'slime_angel_king'];
        return requiredSlimes.every(slime => capturedMonsters.includes(slime));
      }
    }
  ],
  statGrowth: { hp: [2, 4], mp: [2, 4], atk: [1, 2], def: [1, 2], matk: [1, 3], mdef: [1, 3], spd: [1, 2] },
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
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、ランダムなスライムを${lc.level}回投げる。スライムによって属性と追加効果が変わる。1撃の基本威力 ${lc.multiplier.toFixed(2)} 倍`,
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        let mainTarget = battle.selectedEnemyTarget;
        if (!mainTarget || mainTarget.isDead) mainTarget = battle.enemies.find(e => !e.isDead);
        if (!mainTarget) return;

        const numThrows = levelConfig.level;
        const targets = [];
        const slimeDataList = [];
        
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

        for(let i=0; i<numThrows; i++) {
           targets.push(mainTarget);
           const slimeId = BASE_SLIMES[Math.floor(Math.random() * BASE_SLIMES.length)];
           const effect = slimeEffects[slimeId] || slimeEffects['slime_blue'];
           slimeDataList.push({ slimeId, color: effect.color, effect });
        }

        playSkillAnimation(caster, targets, 'slime_throw', { slimes: slimeDataList }, (target, index) => {
          if (target.isDead) {
             const newAlive = battle.enemies.filter(e => !e.isDead);
             if (newAlive.length > 0) target = newAlive[Math.floor(Math.random() * newAlive.length)];
             else return;
          }
          
          const effect = slimeDataList[index].effect;
          const origA = caster.stats.attackAilments;
          if (effect.ailment) {
            caster.stats.attackAilments = { ...(origA || {}), [effect.ailment]: 50 };
          }
          
          battle.executeAttack(caster, target, true, {
            actionName: 'スライム投げ',
            damageMultiplier: levelConfig.multiplier,
            damageType: 'skill',
            isMagic: true,
            element: effect.el,
            hideActionName: true
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
      getDescription: (lc) => {
        const numSlimes = Math.round(10 + (lc.level - 1) * (20 / 9));
        return `MP を ${lc.mpCost} 消費し、ランダムな敵に${numSlimes}体のスライムを落下させる無属性魔法攻撃。1撃の威力 ${(lc.multiplier * 0.25).toFixed(2)} 倍`;
      },
      execute: (caster, levelConfig, battle) => {
        if (!battle) return;
        const aliveEnemies = battle.enemies.filter(e => !e.isDead);
        if (aliveEnemies.length === 0) return;

        const numSlimes = Math.round(10 + (levelConfig.level - 1) * (20 / 9));
        const targets = [];
        for (let i = 0; i < numSlimes; i++) {
          targets.push(aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)]);
        }

        playSkillAnimation(caster, targets, 'slime_hazard', {}, (target) => {
          if (target.isDead) {
             const newAlive = battle.enemies.filter(e => !e.isDead);
             if (newAlive.length > 0) {
                 target = newAlive[Math.floor(Math.random() * newAlive.length)];
             } else {
                 return;
             }
          }
          battle.executeAttack(caster, target, true, {
            actionName: 'スライムハザード',
            damageMultiplier: levelConfig.multiplier * 0.25,
            damageType: 'skill',
            isMagic: true,
            hideActionName: true
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
