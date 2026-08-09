import { getBattleAnimationSpeed, getBattleSpeed, shouldSkipBattleAnimations } from '../utils/battle-animation.js';

const LEVEL_COSTS = [1, 1, 1, 2, 2, 2, 3, 3, 3, 5];
const makeLevels = configs => configs.map((config, index) => ({
  level: index + 1,
  spCost: LEVEL_COSTS[index],
  ...config
}));

const getTargetGroup = (caster, battle) => {
  if (caster.activeAilment?.type === 'confusion'
    && battle.selectedEnemyTarget
    && battle.party.includes(battle.selectedEnemyTarget)) {
    return battle.party;
  }
  return battle.enemies;
};

const getFocusedTarget = (caster, battle) => {
  const group = getTargetGroup(caster, battle);
  let target = battle.selectedEnemyTarget;
  if (!target || target.isDead || !group.includes(target)) {
    target = group.find(entity => !entity.isDead);
  }
  return target || null;
};

const getHpRatio = target => {
  const current = target.hp ? target.hp.current : target.currentHp;
  const maximum = target.hp ? (target.stats?.hp || target.hp.max) : (target.maxHp || target.stats?.hp);
  return maximum > 0 ? current / maximum : 1;
};

// Final-floor enemies, named bosses and legendary variants cannot be erased by
// instant death. The skill converts its kill effect into extra damage instead.
const isInstantDeathImmune = (target, battle) => {
  const floorCount = battle.dungeonDef?.floors?.length || 0;
  const isFinalFloor = floorCount > 0 && Number(battle.currentFloorNum) >= floorCount;
  return target.instantDeathImmune === true
    || target.isLegendary === true
    || String(target.id || '').startsWith('boss_')
    || isFinalFloor;
};

const getAssassinPassive = (caster, battle, skillId) => {
  const found = battle._findSkill?.(caster, skillId);
  return found?.level > 0 ? found.levelConfig : null;
};

const getChainMultiplier = (caster, battle, hitIndex) => {
  const passive = getAssassinPassive(caster, battle, 'accelerating_blades');
  if (!passive || hitIndex <= 0) return 1;
  const bonus = Math.min(passive.maxChainBonusPercent, hitIndex * passive.chainBonusPerHitPercent);
  return 1 + bonus / 100;
};

const getInstantDeathChance = (caster, battle, baseChance, target, weakBonus = 0) => {
  const passive = getAssassinPassive(caster, battle, 'anatomy_mastery');
  const passiveBonus = passive?.instantDeathBonus || 0;
  const woundedBonus = getHpRatio(target) <= .3 ? weakBonus : 0;
  return Math.min(95, baseChance + passiveBonus + woundedBonus);
};

const defeatEnemyInstantly = (target, battle) => {
  if (!target || target.isDead || !battle.enemies.includes(target)) return false;
  target.currentHp = 0;
  target.isDead = true;
  battle.showDamage(target.elementId, 'INSTANT KILL', 'text-rose-300');
  battle.clearEntityStatuses(target);
  battle.processEnemyDeath(target);
  battle.renderEntities();
  battle.checkBattleEnd();
  return true;
};

const getVisualProfile = (type, totalHits) => {
  const battleSpeed = getBattleSpeed();
  const cores = Number(globalThis.navigator?.hardwareConcurrency) || 8;
  const memory = Number(globalThis.navigator?.deviceMemory) || 8;
  const lowPower = cores <= 4 || memory <= 4;
  const reducedMotion = Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  const baseBudget = type === 'flash_thousand_blades' ? 18 : type === 'nightmare_requiem' ? 16 : 14;
  const speedScale = battleSpeed >= 5 ? .55 : battleSpeed >= 3 ? .75 : 1;
  const deviceScale = lowPower ? .65 : 1;
  const motionScale = reducedMotion ? .55 : 1;
  const visualBudget = Math.max(6, Math.round(baseBudget * speedScale * deviceScale * motionScale));

  return {
    battleSpeed,
    lowPower,
    reducedMotion,
    particleScale: Math.max(.35, speedScale * deviceScale * motionScale),
    visualStride: Math.max(1, Math.ceil(totalHits / visualBudget)),
    cinematic: !reducedMotion && !(lowPower && battleSpeed >= 3)
  };
};

// ─── Assassin skill animations ─────────────────────────────
const playSkillAnimation = (caster, target, type, onImpact, hitIndex = 0, totalHits = 1) => {
  if (!target) return;
  if (shouldSkipBattleAnimations()) {
    onImpact?.();
    return;
  }

  const profile = getVisualProfile(type, totalHits);
  const speedMult = getBattleAnimationSpeed(profile.battleSpeed);
  const impactDelay = (type === 'assassinate' ? 330 : 105) / speedMult;
  const shouldRenderHit = hitIndex === 0
    || hitIndex === totalHits - 1
    || hitIndex % profile.visualStride === 0;
  if (!shouldRenderHit) {
    setTimeout(() => onImpact?.(), impactDelay);
    return;
  }

  const layer = document.getElementById('battle-effects-layer') || document.body;
  const targetEl = document.getElementById(target.elementId);
  const casterEl = document.getElementById(caster.elementId);
  if (!targetEl) {
    onImpact?.();
    return;
  }

  const targetRect = targetEl.getBoundingClientRect();
  const casterRect = casterEl?.getBoundingClientRect();
  const x = targetRect.left + targetRect.width / 2;
  const y = targetRect.top + targetRect.height / 2;
  const originX = casterRect ? casterRect.left + casterRect.width / 2 : x;
  const originY = casterRect ? casterRect.top + casterRect.height / 2 : y + 90;

  const addSlash = (angle, color, size = 120, delay = 0) => {
    const slash = document.createElement('div');
    slash.style.cssText = `position:fixed;left:${x - size / 2}px;top:${y - 5}px;width:${size}px;height:10px;border-radius:999px;background:linear-gradient(90deg,transparent,${color},#fff,${color},transparent);box-shadow:0 0 10px ${color};transform:rotate(${angle}deg) scaleX(0);z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
    layer.appendChild(slash);
    slash.animate([
      { transform: `rotate(${angle}deg) scaleX(.05)`, opacity: 0 },
      { transform: `rotate(${angle}deg) scaleX(1.25)`, opacity: 1, offset: .38 },
      { transform: `rotate(${angle}deg) scaleX(1.55)`, opacity: 0 }
    ], { duration: 230 / speedMult, delay: delay / speedMult, easing: 'cubic-bezier(.12,.74,.2,1)' }).onfinish = () => slash.remove();
  };

  const addSparks = (count, color) => {
    for (let i = 0; i < Math.max(2, Math.round(count * profile.particleScale)); i++) {
      const spark = document.createElement('div');
      const size = 2 + Math.random() * 4;
      spark.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 0 7px ${color};z-index:9999;pointer-events:none;`;
      layer.appendChild(spark);
      const angle = Math.random() * Math.PI * 2;
      const distance = 18 + Math.random() * 48;
      spark.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance}px) scale(.1)`, opacity: 0 }
      ], { duration: (220 + Math.random() * 170) / speedMult, easing: 'ease-out' }).onfinish = () => spark.remove();
    }
  };

  const addImpactRing = (color, size = 92, delay = 0) => {
    const ring = document.createElement('div');
    ring.style.cssText = `position:fixed;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;border:3px solid ${color};border-radius:50%;box-shadow:0 0 14px ${color},inset 0 0 10px ${color};z-index:9998;pointer-events:none;mix-blend-mode:screen;`;
    layer.appendChild(ring);
    ring.animate([
      { transform: 'scale(.12) rotate(-35deg)', opacity: 1 },
      { transform: 'scale(1.45) rotate(35deg)', opacity: 0 }
    ], { duration: 330 / speedMult, delay: delay / speedMult, easing: 'cubic-bezier(.12,.7,.2,1)' }).onfinish = () => ring.remove();
  };

  const addBladeShard = (color, orbitIndex = hitIndex) => {
    const blade = document.createElement('div');
    const angle = (orbitIndex * 2.17) % (Math.PI * 2);
    const startX = x + Math.cos(angle) * 78;
    const startY = y + Math.sin(angle) * 46;
    blade.style.cssText = `position:fixed;left:${startX}px;top:${startY}px;width:42px;height:7px;background:linear-gradient(90deg,transparent,${color},#fff);clip-path:polygon(0 35%,82% 0,100% 50%,82% 100%,0 65%);filter:drop-shadow(0 0 6px ${color});transform-origin:0 50%;z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
    layer.appendChild(blade);
    const travelAngle = Math.atan2(y - startY, x - startX);
    blade.animate([
      { transform: `rotate(${travelAngle}rad) translateX(-28px) scaleX(.55)`, opacity: 0 },
      { opacity: 1, offset: .24 },
      { transform: `rotate(${travelAngle}rad) translateX(58px) scaleX(1.15)`, opacity: 0 }
    ], { duration: 240 / speedMult, easing: 'cubic-bezier(.3,.75,.2,1)' }).onfinish = () => blade.remove();
  };

  const addAfterimage = (color, travelScale = 1) => {
    if (!profile.cinematic || !casterEl || !casterRect) return;
    const source = casterEl.querySelector('img')?.src || caster.iconImage;
    if (!source) return;
    const ghost = document.createElement('img');
    const width = Math.max(42, casterRect.width);
    const height = Math.max(42, casterRect.height);
    ghost.src = source;
    ghost.alt = '';
    ghost.style.cssText = `position:fixed;left:${casterRect.left}px;top:${casterRect.top}px;width:${width}px;height:${height}px;object-fit:contain;filter:brightness(1.8) sepia(1) hue-rotate(215deg) saturate(2.8) drop-shadow(0 0 10px ${color});opacity:.5;z-index:9997;pointer-events:none;mix-blend-mode:screen;`;
    layer.appendChild(ghost);
    const dx = (x - originX) * travelScale;
    const dy = (y - originY) * travelScale;
    ghost.animate([
      { transform: 'translate3d(0,0,0) scale(1)', opacity: .52 },
      { transform: `translate3d(${dx * .72}px,${dy * .72}px,0) scale(.94)`, opacity: .3, offset: .58 },
      { transform: `translate3d(${dx}px,${dy}px,0) scale(.82)`, opacity: 0 }
    ], { duration: 330 / speedMult, easing: 'cubic-bezier(.15,.72,.18,1)' }).onfinish = () => ghost.remove();
  };

  const addSpeedField = (color, count = 12, duration = 620) => {
    if (!profile.cinematic) return;
    const renderedCount = Math.max(5, Math.round(count * profile.particleScale));
    for (let i = 0; i < renderedCount; i++) {
      const line = document.createElement('div');
      const width = 70 + Math.random() * 180;
      const top = 8 + Math.random() * 84;
      line.style.cssText = `position:fixed;left:${i % 2 ? 'auto' : '-22vw'};right:${i % 2 ? '-22vw' : 'auto'};top:${top}vh;width:${width}px;height:${1 + Math.random() * 3}px;background:linear-gradient(90deg,transparent,${color},#fff,transparent);box-shadow:0 0 8px ${color};z-index:9997;pointer-events:none;mix-blend-mode:screen;`;
      layer.appendChild(line);
      const direction = i % 2 ? -1 : 1;
      line.animate([
        { transform: 'translate3d(0,0,0) skewX(-28deg)', opacity: 0 },
        { opacity: .78, offset: .18 },
        { transform: `translate3d(${direction * (window.innerWidth + width * 2)}px,${(Math.random() - .5) * 80}px,0) skewX(-28deg)`, opacity: 0 }
      ], { duration: (duration + Math.random() * 220) / speedMult, delay: i * 12 / speedMult, easing: 'cubic-bezier(.2,.65,.2,1)' }).onfinish = () => line.remove();
    }
  };

  const addFinisherBurst = (color, size = 180) => {
    addImpactRing(color, size * .55);
    addImpactRing('#ffffff', size, 36);
    addSlash(-48, color, size, 15);
    addSlash(42, '#ffffff', size * .82, 58);
    addSparks(16, color);
  };

  if (type === 'assassinate') {
    const veil = document.createElement('div');
    veil.style.cssText = 'position:fixed;inset:0;background:radial-gradient(circle at 50% 50%,transparent 0 14%,rgba(2,6,23,.72) 58%,rgba(0,0,0,.94));z-index:9996;pointer-events:none;';
    layer.appendChild(veil);
    veil.animate([{ opacity: 0 }, { opacity: 1, offset: .35 }, { opacity: 0 }], {
      duration: 520 / speedMult,
      easing: 'ease-in-out'
    }).onfinish = () => veil.remove();

    const mark = document.createElement('div');
    mark.style.cssText = `position:fixed;left:${x - 38}px;top:${y - 38}px;width:76px;height:76px;border:2px solid #fb7185;border-radius:50%;box-shadow:0 0 16px #e11d48,inset 0 0 12px rgba(225,29,72,.45);z-index:9999;pointer-events:none;`;
    mark.innerHTML = '<i style="position:absolute;left:50%;top:-18%;width:2px;height:136%;background:linear-gradient(transparent,#fff,#fb7185,transparent)"></i><i style="position:absolute;top:50%;left:-18%;height:2px;width:136%;background:linear-gradient(90deg,transparent,#fff,#fb7185,transparent)"></i>';
    layer.appendChild(mark);
    mark.animate([
      { transform: 'scale(1.8) rotate(-45deg)', opacity: 0 },
      { transform: 'scale(.82) rotate(0)', opacity: 1, offset: .58 },
      { transform: 'scale(.15) rotate(15deg)', opacity: 0 }
    ], { duration: 470 / speedMult, easing: 'cubic-bezier(.18,.72,.2,1)' }).onfinish = () => mark.remove();
    addSlash(-52, '#fb7185', 170, 190);
    addAfterimage('#fb7185', 1.08);
    addSpeedField('#e11d48', 8, 470);
    addImpactRing('#fb7185', 116, 190);
  } else {
    const palette = type === 'flash_thousand_blades'
      ? ['#67e8f9', '#a78bfa', '#f8fafc', '#f43f5e']
      : type === 'nightmare_requiem'
      ? ['#c084fc', '#f43f5e', '#e9d5ff']
      : type === 'phantom_barrage'
        ? ['#8b5cf6', '#22d3ee', '#ddd6fe']
        : ['#a78bfa', '#f8fafc', '#c4b5fd'];
    const angle = -58 + ((hitIndex * 47) % 116) + (Math.random() * 14 - 7);
    const mainColor = palette[hitIndex % palette.length];
    const slashSize = type === 'flash_thousand_blades' ? 138 : type === 'nightmare_requiem' ? 150 : 118;
    addSlash(angle, mainColor, slashSize);
    if (hitIndex % 2 === 0) addSlash(angle + 82, palette[(hitIndex + 1) % palette.length], 82, 35);
    if (type === 'flash_thousand_blades') addSlash(angle - 84, palette[(hitIndex + 2) % palette.length], 104, 20);
    addSparks(type === 'nightmare_requiem' || type === 'flash_thousand_blades' ? 8 : 5, mainColor);
    if (type === 'phantom_barrage' || type === 'flash_thousand_blades') addBladeShard(mainColor);
    if (hitIndex % Math.max(1, profile.visualStride * 2) === 0) addImpactRing(mainColor, type === 'flash_thousand_blades' ? 78 : 62);

    if (hitIndex === 0) {
      if (type === 'razor_rush') {
        addAfterimage('#a78bfa');
        addSpeedField('#8b5cf6', 7, 420);
      } else if (type === 'phantom_barrage') {
        addAfterimage('#22d3ee', .85);
        addSpeedField('#6366f1', 8, 560);
      } else if (type === 'nightmare_requiem') {
        addAfterimage('#c084fc', 1.05);
        addSpeedField('#a855f7', 12, 920);
      } else if (type === 'flash_thousand_blades') {
        addAfterimage('#67e8f9', 1.1);
        addSpeedField('#67e8f9', 16, 780);
      }
    }

    if ((type === 'nightmare_requiem' || type === 'flash_thousand_blades') && hitIndex === 0) {
      const shroud = document.createElement('div');
      shroud.style.cssText = type === 'flash_thousand_blades'
        ? 'position:fixed;inset:0;background:radial-gradient(ellipse at center,rgba(34,211,238,.16),rgba(49,46,129,.34) 48%,rgba(2,6,23,.72));z-index:9996;pointer-events:none;mix-blend-mode:screen;'
        : 'position:fixed;inset:0;background:radial-gradient(ellipse at center,rgba(88,28,135,.16),rgba(2,6,23,.68));z-index:9996;pointer-events:none;mix-blend-mode:multiply;';
      layer.appendChild(shroud);
      shroud.animate([{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: .8, offset: .75 }, { opacity: 0 }], {
        duration: Math.max(700, totalHits * (type === 'flash_thousand_blades' ? 38 : 75)) / speedMult,
        easing: 'ease-in-out'
      }).onfinish = () => shroud.remove();
    }

    if (type === 'razor_rush') {
      const dash = document.createElement('div');
      const distance = Math.hypot(x - originX, y - originY);
      const angleRad = Math.atan2(y - originY, x - originX);
      dash.style.cssText = `position:fixed;left:${originX}px;top:${originY - 2}px;width:${Math.max(30, distance)}px;height:4px;background:linear-gradient(90deg,transparent,#a78bfa,#fff,transparent);box-shadow:0 0 8px #8b5cf6;transform-origin:0 50%;transform:rotate(${angleRad}rad) scaleX(0);z-index:9998;pointer-events:none;mix-blend-mode:screen;`;
      layer.appendChild(dash);
      dash.animate([
        { transform: `rotate(${angleRad}rad) scaleX(.05)`, opacity: 0 },
        { transform: `rotate(${angleRad}rad) scaleX(1)`, opacity: 1, offset: .45 },
        { transform: `rotate(${angleRad}rad) scaleX(1.1)`, opacity: 0 }
      ], { duration: 180 / speedMult, easing: 'ease-out' }).onfinish = () => dash.remove();
    }

    if (hitIndex === totalHits - 1) {
      addFinisherBurst(type === 'flash_thousand_blades' ? '#67e8f9' : type === 'nightmare_requiem' ? '#f43f5e' : mainColor,
        type === 'flash_thousand_blades' || type === 'nightmare_requiem' ? 210 : 150);
    }
  }

  setTimeout(() => onImpact?.(), impactDelay);
};

const scheduleMultiHit = ({ caster, battle, hits, delay, type, chooseTarget, multiplierForHit }) => {
  for (let hitIndex = 0; hitIndex < hits; hitIndex++) {
    battle._scheduleBattleTimeout(() => {
      if (caster.isDead || battle.isStopped) return;
      const target = chooseTarget();
      if (!target || target.isDead) return;
      playSkillAnimation(caster, target, type, () => {
        if (caster.isDead || target.isDead || battle.isStopped) return;
        const hitMultiplier = multiplierForHit(hitIndex);
        if (hitMultiplier == null || target.isDead || battle.isStopped) return;
        battle.executeAttack(caster, target, true, {
          statDependency: 'ATK',
          actionName: '',
          damageMultiplier: hitMultiplier,
          damageType: 'skill',
          hideActionName: true,
          skipAtbReset: hitIndex > 0
        });
      }, hitIndex, hits);
    }, hitIndex * delay / (battle.speedMult || 1));
  }
};

export const assassin = {
  id: 'assassin',
  name: 'アサシン',
  image: './assets/job/job_assassin_v2.webp',
  icon: 'target',
  changeCost: 500000,
  requirements: [
    { jobId: 'ranger', level: 100 },
    { jobId: 'dancer', level: 100 }
  ],
  skills: [
    {
      id: 'razor_rush', name: 'レイザーラッシュ', icon: 'double_arrow', statDependency: 'ATK',
      actionNameClass: 'text-violet-200', actionNameBorderClass: 'border-violet-400/60',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 22, multiplier: .42, hits: 5 }, { mpCost: 27, multiplier: .44, hits: 5 },
        { mpCost: 32, multiplier: .46, hits: 6 }, { mpCost: 38, multiplier: .48, hits: 6 },
        { mpCost: 44, multiplier: .50, hits: 7 }, { mpCost: 51, multiplier: .52, hits: 7 },
        { mpCost: 59, multiplier: .54, hits: 8 }, { mpCost: 68, multiplier: .55, hits: 8 },
        { mpCost: 78, multiplier: .57, hits: 9 }, { mpCost: 90, multiplier: .60, hits: 10 }
      ]),
      getDescription: lc => `MP を ${lc.mpCost} 消費し、敵単体に ATK ${lc.multiplier.toFixed(2)} 倍の斬撃を ${lc.hits} 回叩き込む`,
      execute(caster, lc, battle) {
        if (!battle) return;
        scheduleMultiHit({
          caster, battle, hits: lc.hits, delay: 115, type: 'razor_rush',
          chooseTarget: () => getFocusedTarget(caster, battle),
          multiplierForHit: index => lc.multiplier * getChainMultiplier(caster, battle, index)
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const target = context.selectedEnemyTarget && !context.selectedEnemyTarget.isDead
            ? context.selectedEnemyTarget
            : targets[0];
          return { target, score: 38 * lc.multiplier * lc.hits + (targets.length === 1 ? 35 : 0) };
        }
      }
    },
    {
      id: 'phantom_barrage', name: 'ファントムバラージ', icon: 'blur_on', statDependency: 'ATK',
      actionNameClass: 'text-indigo-200', actionNameBorderClass: 'border-cyan-400/60',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 40, multiplier: .30, hits: 8 }, { mpCost: 47, multiplier: .31, hits: 9 },
        { mpCost: 55, multiplier: .32, hits: 10 }, { mpCost: 64, multiplier: .33, hits: 11 },
        { mpCost: 74, multiplier: .34, hits: 12 }, { mpCost: 85, multiplier: .36, hits: 13 },
        { mpCost: 98, multiplier: .38, hits: 14 }, { mpCost: 112, multiplier: .40, hits: 15 },
        { mpCost: 128, multiplier: .42, hits: 16 }, { mpCost: 148, multiplier: .44, hits: 18 }
      ]),
      getDescription: lc => `MP を ${lc.mpCost} 消費し、ランダムな敵へ ATK ${lc.multiplier.toFixed(2)} 倍の攻撃を ${lc.hits} 回浴びせる。敵を倒すと残りの刃は別の敵へ向かう`,
      execute(caster, lc, battle) {
        if (!battle) return;
        scheduleMultiHit({
          caster, battle, hits: lc.hits, delay: 92, type: 'phantom_barrage',
          chooseTarget: () => {
            const targets = getTargetGroup(caster, battle).filter(entity => !entity.isDead);
            return targets[Math.floor(Math.random() * targets.length)] || null;
          },
          multiplierForHit: index => lc.multiplier * getChainMultiplier(caster, battle, index)
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          return { target: targets[0], score: 35 * lc.multiplier * lc.hits + Math.min(80, targets.length * 18) };
        }
      }
    },
    {
      id: 'assassinate', name: 'アサシネイト', icon: 'gps_fixed', statDependency: 'ATK',
      actionNameClass: 'text-rose-200', actionNameBorderClass: 'border-rose-500/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 55, multiplier: 1.80, instantDeathChance: 8, bossMultiplier: 1.35 },
        { mpCost: 62, multiplier: 1.95, instantDeathChance: 10, bossMultiplier: 1.40 },
        { mpCost: 70, multiplier: 2.10, instantDeathChance: 12, bossMultiplier: 1.45 },
        { mpCost: 79, multiplier: 2.25, instantDeathChance: 15, bossMultiplier: 1.50 },
        { mpCost: 89, multiplier: 2.40, instantDeathChance: 18, bossMultiplier: 1.55 },
        { mpCost: 100, multiplier: 2.55, instantDeathChance: 21, bossMultiplier: 1.60 },
        { mpCost: 112, multiplier: 2.70, instantDeathChance: 24, bossMultiplier: 1.68 },
        { mpCost: 125, multiplier: 2.85, instantDeathChance: 27, bossMultiplier: 1.76 },
        { mpCost: 140, multiplier: 3.05, instantDeathChance: 31, bossMultiplier: 1.88 },
        { mpCost: 158, multiplier: 3.25, instantDeathChance: 35, bossMultiplier: 2.00 }
      ]),
      getDescription: lc => `MP を ${lc.mpCost} 消費し、敵単体を ${lc.instantDeathChance}% で即死させる（HP30%以下ならさらに +15%）。失敗時は ATK ${lc.multiplier.toFixed(2)} 倍、即死無効の敵には ${(lc.multiplier * lc.bossMultiplier).toFixed(2)} 倍の物理ダメージ`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const target = getFocusedTarget(caster, battle);
        if (!target) return;
        playSkillAnimation(caster, target, 'assassinate', () => {
          if (caster.isDead || target.isDead || battle.isStopped) return;
          const enemyTarget = battle.enemies.includes(target);
          const immune = !enemyTarget || isInstantDeathImmune(target, battle);
          const chance = getInstantDeathChance(caster, battle, lc.instantDeathChance, target, 15);
          if (!immune && Math.random() * 100 < chance) {
            defeatEnemyInstantly(target, battle);
            return;
          }
          if (immune && enemyTarget) {
            battle.showDamage(target.elementId, 'DEATH RESIST', 'text-violet-300');
          }
          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency,
            actionName: '',
            damageMultiplier: lc.multiplier * (immune ? lc.bossMultiplier : 1),
            damageType: 'skill',
            hideActionName: true
          });
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const target = targets.reduce((lowest, enemy) => getHpRatio(enemy) < getHpRatio(lowest) ? enemy : lowest);
          const weakBonus = getHpRatio(target) <= .3 ? 95 : 0;
          return { target, score: 58 * lc.multiplier + lc.instantDeathChance * 5 + weakBonus };
        }
      }
    },
    {
      id: 'nightmare_requiem', name: 'ナイトメア・レクイエム', icon: 'storm', statDependency: 'ATK',
      actionNameClass: 'text-fuchsia-100', actionNameBorderClass: 'border-fuchsia-400/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 90, multiplier: .22, hits: 14, finisherChance: 3 },
        { mpCost: 103, multiplier: .23, hits: 15, finisherChance: 4 },
        { mpCost: 118, multiplier: .24, hits: 17, finisherChance: 5 },
        { mpCost: 135, multiplier: .25, hits: 19, finisherChance: 7 },
        { mpCost: 154, multiplier: .26, hits: 21, finisherChance: 9 },
        { mpCost: 176, multiplier: .27, hits: 23, finisherChance: 11 },
        { mpCost: 200, multiplier: .29, hits: 25, finisherChance: 13 },
        { mpCost: 227, multiplier: .30, hits: 27, finisherChance: 15 },
        { mpCost: 257, multiplier: .32, hits: 28, finisherChance: 17 },
        { mpCost: 290, multiplier: .34, hits: 30, finisherChance: 20 }
      ]),
      getDescription: lc => `MP を ${lc.mpCost} 消費し、敵単体に ATK ${lc.multiplier.toFixed(2)} 倍の斬撃を ${lc.hits} 回行う。最後の一撃は通常敵を ${lc.finisherChance}% で即死させる`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const originalTarget = getFocusedTarget(caster, battle);
        if (!originalTarget) return;
        scheduleMultiHit({
          caster, battle, hits: lc.hits, delay: 72, type: 'nightmare_requiem',
          chooseTarget: () => originalTarget.isDead ? getFocusedTarget(caster, battle) : originalTarget,
          multiplierForHit: index => {
            if (index === lc.hits - 1) {
              const target = originalTarget.isDead ? getFocusedTarget(caster, battle) : originalTarget;
              if (target && battle.enemies.includes(target) && !isInstantDeathImmune(target, battle)) {
                const chance = getInstantDeathChance(caster, battle, lc.finisherChance, target, 10);
                if (Math.random() * 100 < chance && defeatEnemyInstantly(target, battle)) return null;
              }
            }
            return lc.multiplier * getChainMultiplier(caster, battle, index);
          }
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length || caster.mp.current < lc.mpCost) return null;
          const target = context.selectedEnemyTarget && !context.selectedEnemyTarget.isDead
            ? context.selectedEnemyTarget
            : targets.reduce((highest, enemy) => (enemy.currentHp || 0) > (highest.currentHp || 0) ? enemy : highest);
          return { target, score: 43 * lc.multiplier * lc.hits + lc.finisherChance * 2 + (targets.length === 1 ? 75 : 0) };
        }
      }
    },
    {
      id: 'flash_thousand_blades', name: '瞬獄千刃', icon: 'flash_on', statDependency: 'ATK',
      actionNameClass: 'text-cyan-100', actionNameBorderClass: 'border-cyan-300/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 120, multiplier: .16, hits: 24 }, { mpCost: 136, multiplier: .16, hits: 28 },
        { mpCost: 153, multiplier: .17, hits: 32 }, { mpCost: 172, multiplier: .17, hits: 36 },
        { mpCost: 193, multiplier: .18, hits: 40 }, { mpCost: 216, multiplier: .18, hits: 44 },
        { mpCost: 242, multiplier: .19, hits: 48 }, { mpCost: 271, multiplier: .19, hits: 52 },
        { mpCost: 304, multiplier: .20, hits: 56 }, { mpCost: 340, multiplier: .20, hits: 60 }
      ]),
      getDescription: lc => `MP を ${lc.mpCost} 消費し、時間の隙間へ踏み込んで敵単体に ATK ${lc.multiplier.toFixed(2)} 倍の超高速斬撃を ${lc.hits} 回行う。倒した後の斬撃は別の敵へ向かう`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const originalTarget = getFocusedTarget(caster, battle);
        if (!originalTarget) return;
        scheduleMultiHit({
          caster, battle, hits: lc.hits, delay: 34, type: 'flash_thousand_blades',
          chooseTarget: () => originalTarget.isDead ? getFocusedTarget(caster, battle) : originalTarget,
          multiplierForHit: index => lc.multiplier * getChainMultiplier(caster, battle, index)
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length || caster.mp.current < lc.mpCost) return null;
          const target = context.selectedEnemyTarget && !context.selectedEnemyTarget.isDead
            ? context.selectedEnemyTarget
            : targets.reduce((highest, enemy) => (enemy.currentHp || 0) > (highest.currentHp || 0) ? enemy : highest);
          return { target, score: 44 * lc.multiplier * lc.hits + (targets.length === 1 ? 110 : 35) };
        }
      }
    },
    {
      id: 'shadow_motion', name: '影の身のこなし', icon: 'motion_blur', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusSpd: 5, evadeChance: 3 }, { mpCost: 0, bonusSpd: 9, evadeChance: 5 },
        { mpCost: 0, bonusSpd: 13, evadeChance: 7 }, { mpCost: 0, bonusSpd: 17, evadeChance: 9 },
        { mpCost: 0, bonusSpd: 21, evadeChance: 10 }, { mpCost: 0, bonusSpd: 26, evadeChance: 11 },
        { mpCost: 0, bonusSpd: 31, evadeChance: 13 }, { mpCost: 0, bonusSpd: 37, evadeChance: 14 },
        { mpCost: 0, bonusSpd: 43, evadeChance: 16 }, { mpCost: 0, bonusSpd: 50, evadeChance: 18 }
      ]),
      getDescription: lc => `基礎 SPD が ${lc.bonusSpd} 上昇し、物理・魔法を問わず ${lc.evadeChance}% の確率で攻撃を完全回避する`
    },
    {
      id: 'anatomy_mastery', name: '急所看破', icon: 'my_location', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, lowHpDamagePercent: 6, instantDeathBonus: 1 }, { mpCost: 0, lowHpDamagePercent: 9, instantDeathBonus: 2 },
        { mpCost: 0, lowHpDamagePercent: 12, instantDeathBonus: 3 }, { mpCost: 0, lowHpDamagePercent: 15, instantDeathBonus: 4 },
        { mpCost: 0, lowHpDamagePercent: 18, instantDeathBonus: 5 }, { mpCost: 0, lowHpDamagePercent: 22, instantDeathBonus: 7 },
        { mpCost: 0, lowHpDamagePercent: 26, instantDeathBonus: 9 }, { mpCost: 0, lowHpDamagePercent: 30, instantDeathBonus: 11 },
        { mpCost: 0, lowHpDamagePercent: 35, instantDeathBonus: 13 }, { mpCost: 0, lowHpDamagePercent: 40, instantDeathBonus: 15 }
      ]),
      getDescription: lc => `HP40%以下の敵へのダメージが ${lc.lowHpDamagePercent}% 上昇し、アサシンの即死成功率が ${lc.instantDeathBonus}% 上昇する`
    },
    {
      id: 'accelerating_blades', name: '刃の加速', icon: 'speed', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, chainBonusPerHitPercent: .5, maxChainBonusPercent: 10 },
        { mpCost: 0, chainBonusPerHitPercent: .7, maxChainBonusPercent: 12 },
        { mpCost: 0, chainBonusPerHitPercent: .9, maxChainBonusPercent: 14 },
        { mpCost: 0, chainBonusPerHitPercent: 1.1, maxChainBonusPercent: 17 },
        { mpCost: 0, chainBonusPerHitPercent: 1.3, maxChainBonusPercent: 20 },
        { mpCost: 0, chainBonusPerHitPercent: 1.5, maxChainBonusPercent: 23 },
        { mpCost: 0, chainBonusPerHitPercent: 1.7, maxChainBonusPercent: 26 },
        { mpCost: 0, chainBonusPerHitPercent: 1.9, maxChainBonusPercent: 29 },
        { mpCost: 0, chainBonusPerHitPercent: 2.2, maxChainBonusPercent: 32 },
        { mpCost: 0, chainBonusPerHitPercent: 2.5, maxChainBonusPercent: 35 }
      ]),
      getDescription: lc => `アサシンの連撃中、1ヒットごとに威力が ${lc.chainBonusPerHitPercent}% 上昇する（最大 +${lc.maxChainBonusPercent}%）`
    }
  ]
};
