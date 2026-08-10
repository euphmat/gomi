import { getBattleAnimationSpeed, getBattleSpeed, shouldSkipBattleAnimations } from '../utils/battle-animation.js';

// ─── Pyromancer skill animations ─────────────────────────────
const playSkillAnimation = (caster, targets, type, onImpact) => {
  const targetList = Array.isArray(targets) ? targets : [targets];
  if (shouldSkipBattleAnimations()) {
    targetList.forEach((target, index) => onImpact?.(target, index));
    return;
  }

  const battleSpeed = getBattleSpeed();
  const speedMult = getBattleAnimationSpeed(battleSpeed);
  const targetDensity = targetList.length > 2 ? Math.max(.45, 2 / targetList.length) : 1;
  const speedDensity = battleSpeed >= 5 ? .55 : battleSpeed >= 3 ? .78 : 1;
  const effectDensity = Math.max(.3, targetDensity * speedDensity);
  const layer = document.getElementById('battle-effects-layer') || document.body;
  const casterEl = document.getElementById(caster.elementId);
  const casterRect = casterEl?.getBoundingClientRect();
  const origin = casterRect
    ? { x: casterRect.left + casterRect.width / 2, y: casterRect.top + casterRect.height / 2 }
    : { x: window.innerWidth / 2, y: window.innerHeight * .72 };

  const addEmbers = (x, y, count = 9, spread = 65) => {
    const renderedCount = Math.max(4, Math.round(count * effectDensity));
    for (let i = 0; i < renderedCount; i++) {
      const ember = document.createElement('div');
      const size = 3 + Math.random() * 7;
      ember.style.cssText = `position:fixed;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;background:${i % 3 === 0 ? '#fff7ad' : i % 2 === 0 ? '#fbbf24' : '#f97316'};box-shadow:0 0 8px #ef4444;z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
      layer.appendChild(ember);
      const angle = Math.random() * Math.PI * 2;
      const distance = 18 + Math.random() * spread;
      ember.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance - 35}px) scale(.15)`, opacity: 0 }
      ], { duration: (360 + Math.random() * 280) / speedMult, easing: 'ease-out' }).onfinish = () => ember.remove();
    }
  };

  const addFireRing = (x, y, size = 120) => {
    const ring = document.createElement('div');
    ring.style.cssText = `position:fixed;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;border:6px solid #fb923c;border-radius:50%;box-shadow:0 0 16px #f97316,0 0 34px #dc2626,inset 0 0 18px #fbbf24;z-index:9998;pointer-events:none;mix-blend-mode:screen;`;
    layer.appendChild(ring);
    ring.animate([
      { transform: 'scale(.15) rotate(-25deg)', opacity: 1 },
      { transform: 'scale(1.55) rotate(45deg)', opacity: 0 }
    ], { duration: 480 / speedMult, easing: 'cubic-bezier(.12,.7,.22,1)' }).onfinish = () => ring.remove();
  };

  const addImpactFlash = (x, y, size = 130, color = '#fff7ad') => {
    const flash = document.createElement('div');
    flash.style.cssText = `position:fixed;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.98) 0 7%,${color} 18%,rgba(249,115,22,.78) 42%,rgba(220,38,38,.22) 64%,transparent 72%);filter:blur(1px);box-shadow:0 0 28px #fbbf24,0 0 54px #dc2626;z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
    layer.appendChild(flash);
    flash.animate([
      { transform: 'scale(.08)', opacity: 1 },
      { transform: 'scale(1.05)', opacity: .95, offset: .32 },
      { transform: 'scale(1.55)', opacity: 0 }
    ], { duration: 430 / speedMult, easing: 'cubic-bezier(.08,.72,.18,1)' }).onfinish = () => flash.remove();
  };

  const addCastingSeal = (x, y, size = 112, duration = 760, intensity = 1) => {
    const seal = document.createElement('div');
    seal.style.cssText = `position:fixed;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;border:3px solid rgba(251,191,36,.96);border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,247,173,.75) 0deg 2deg,transparent 2deg 30deg),radial-gradient(circle,transparent 40%,rgba(249,115,22,.24) 43% 52%,transparent 55%);box-shadow:0 0 ${18 * intensity}px #f97316,inset 0 0 ${14 * intensity}px #ef4444;z-index:9998;pointer-events:none;mix-blend-mode:screen;`;
    seal.innerHTML = '<span style="position:absolute;inset:17%;border:2px dashed rgba(255,247,173,.9);border-radius:50%"></span><i style="position:absolute;left:50%;top:50%;width:56%;height:56%;border:2px solid rgba(251,146,60,.9);transform:translate(-50%,-50%) rotate(45deg)"></i>';
    layer.appendChild(seal);
    seal.animate([
      { transform: 'scale(.05) rotate(-95deg)', opacity: 0 },
      { transform: 'scale(1.08) rotate(0deg)', opacity: 1, offset: .34 },
      { transform: 'scale(.82) rotate(115deg)', opacity: 0 }
    ], { duration: duration / speedMult, easing: 'cubic-bezier(.14,.72,.22,1)' }).onfinish = () => seal.remove();
  };

  const addFlameWisps = (x, y, count = 4, radius = 58) => {
    const renderedCount = Math.max(2, Math.round(count * effectDensity));
    for (let i = 0; i < renderedCount; i++) {
      const wisp = document.createElement('div');
      const angle = Math.PI * 2 * i / renderedCount;
      const startX = x + Math.cos(angle) * radius;
      const startY = y + Math.sin(angle) * radius * .45;
      wisp.style.cssText = `position:fixed;left:${startX - 8}px;top:${startY - 18}px;width:16px;height:36px;border-radius:50% 50% 45% 45%;background:linear-gradient(180deg,transparent,#ef4444 26%,#f97316 55%,#fde68a);clip-path:polygon(50% 0,92% 58%,72% 100%,28% 100%,8% 58%);filter:drop-shadow(0 0 7px #f97316);z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
      layer.appendChild(wisp);
      wisp.animate([
        { transform: `rotate(${angle}rad) scale(.35)`, opacity: 0 },
        { transform: `translate(${Math.cos(angle) * -18}px,-18px) rotate(${angle + 1.8}rad) scale(1)`, opacity: 1, offset: .35 },
        { transform: `translate(${Math.cos(angle) * -38}px,-70px) rotate(${angle + 3.8}rad) scale(.15)`, opacity: 0 }
      ], { duration: (540 + i * 35) / speedMult, easing: 'ease-out' }).onfinish = () => wisp.remove();
    }
  };

  const addScreenEmberRain = (count = 14, duration = 920) => {
    const renderedCount = Math.max(6, Math.round(count * speedDensity));
    for (let i = 0; i < renderedCount; i++) {
      const streak = document.createElement('div');
      const height = 24 + Math.random() * 54;
      streak.style.cssText = `position:fixed;left:${Math.random() * window.innerWidth}px;top:${-80 - Math.random() * 160}px;width:${2 + Math.random() * 3}px;height:${height}px;border-radius:999px;background:linear-gradient(180deg,transparent,#fde68a,#f97316);box-shadow:0 0 8px #ef4444;z-index:9997;pointer-events:none;mix-blend-mode:screen;`;
      layer.appendChild(streak);
      streak.animate([
        { transform: 'translate(90px,0) rotate(-25deg)', opacity: 0 },
        { opacity: .9, offset: .18 },
        { transform: `translate(${-80 - Math.random() * 140}px,${window.innerHeight + 300}px) rotate(-25deg)`, opacity: 0 }
      ], { duration: (duration + Math.random() * 480) / speedMult, delay: i * 24 / speedMult, easing: 'linear' }).onfinish = () => streak.remove();
    }
  };

  if (type === 'flare_lance') {
    addCastingSeal(origin.x, origin.y, 92, 620, .8);
  } else if (type === 'inferno') {
    addCastingSeal(origin.x, origin.y, 138, 980, 1.25);
    const heat = document.createElement('div');
    heat.style.cssText = 'position:fixed;inset:0;background:radial-gradient(ellipse at 50% 78%,rgba(251,146,60,.28),rgba(220,38,38,.16) 42%,transparent 76%);backdrop-filter:contrast(1.08) saturate(1.18);z-index:9995;pointer-events:none;mix-blend-mode:screen;';
    layer.appendChild(heat);
    heat.animate([
      { opacity: 0, transform: 'scale(.92)' },
      { opacity: 1, transform: 'scale(1)', offset: .42 },
      { opacity: 0, transform: 'scale(1.08)' }
    ], { duration: 1000 / speedMult, easing: 'ease-out' }).onfinish = () => heat.remove();
    addScreenEmberRain(10, 780);
  } else if (type === 'meteor_catastrophe') {
    addCastingSeal(origin.x, origin.y, 164, 1280, 1.55);
    addScreenEmberRain(18, 1120);
  }

  if (type === 'meteor_catastrophe') {
    const sky = document.createElement('div');
    sky.style.cssText = 'position:fixed;inset:0;background:radial-gradient(ellipse at 50% 5%,rgba(251,146,60,.48),rgba(127,29,29,.42) 38%,rgba(15,23,42,.64) 76%);z-index:9995;pointer-events:none;mix-blend-mode:screen;';
    layer.appendChild(sky);
    sky.animate([
      { opacity: 0 },
      { opacity: 1, offset: .28 },
      { opacity: .85, offset: .72 },
      { opacity: 0 }
    ], { duration: 1250 / speedMult, easing: 'ease-in-out' }).onfinish = () => sky.remove();

    const omen = document.createElement('div');
    omen.style.cssText = 'position:fixed;left:50%;top:5vh;width:180px;height:180px;transform:translateX(-50%);border:5px double rgba(253,230,138,.95);border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(251,191,36,.52) 0deg 3deg,transparent 3deg 20deg),radial-gradient(circle,#fff7ad 0 5%,#f97316 20%,rgba(153,27,27,.72) 47%,transparent 68%);box-shadow:0 0 34px #f97316,0 0 72px rgba(220,38,38,.85),inset 0 0 28px #fbbf24;z-index:9996;pointer-events:none;mix-blend-mode:screen;';
    layer.appendChild(omen);
    omen.animate([
      { transform: 'translateX(-50%) scale(.08) rotate(-120deg)', opacity: 0 },
      { transform: 'translateX(-50%) scale(1.05) rotate(0deg)', opacity: 1, offset: .38 },
      { transform: 'translateX(-50%) scale(1.32) rotate(95deg)', opacity: 0 }
    ], { duration: 1180 / speedMult, easing: 'cubic-bezier(.16,.72,.22,1)' }).onfinish = () => omen.remove();
  }

  targetList.forEach((target, index) => {
    const targetEl = document.getElementById(target.elementId);
    if (!targetEl) {
      onImpact?.(target, index);
      return;
    }
    const rect = targetEl.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    setTimeout(() => {
      if (type === 'flare_lance') {
        const charge = document.createElement('div');
        charge.style.cssText = `position:fixed;left:${origin.x - 25}px;top:${origin.y - 25}px;width:50px;height:50px;border-radius:50%;background:radial-gradient(circle,#fff 0 8%,#fde68a 18%,#f97316 48%,rgba(220,38,38,.35) 68%,transparent 72%);box-shadow:0 0 18px #fbbf24,0 0 38px #dc2626;z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
        layer.appendChild(charge);
        charge.animate([
          { transform: 'scale(.08) rotate(-90deg)', opacity: 0 },
          { transform: 'scale(1.18) rotate(0)', opacity: 1, offset: .55 },
          { transform: 'scale(.45) rotate(90deg)', opacity: 0 }
        ], { duration: 360 / speedMult, easing: 'cubic-bezier(.12,.75,.2,1)' }).onfinish = () => charge.remove();
        addEmbers(origin.x, origin.y, 7, 34);

        const lance = document.createElement('div');
        const angle = Math.atan2(y - origin.y, x - origin.x);
        const distance = Math.hypot(x - origin.x, y - origin.y);
        lance.style.cssText = `position:fixed;left:${origin.x - 12}px;top:${origin.y - 7}px;width:78px;height:14px;border-radius:80% 12% 12% 80%;background:linear-gradient(90deg,#7f1d1d,#f97316 30%,#fbbf24 65%,#fff7ad);clip-path:polygon(0 50%,82% 0,100% 50%,82% 100%);filter:drop-shadow(0 0 8px #ef4444);transform-origin:12px 50%;z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
        layer.appendChild(lance);
        lance.animate([
          { transform: `rotate(${angle}rad) translateX(0) scaleX(.35)`, opacity: 0 },
          { opacity: 1, offset: .16 },
          { transform: `rotate(${angle}rad) translateX(${Math.max(0, distance - 30)}px) scaleX(1.15)`, opacity: 1 }
        ], { duration: 330 / speedMult, easing: 'cubic-bezier(.3,.75,.2,1)' }).onfinish = () => {
          lance.remove();
          addImpactFlash(x, y, 118);
          addFireRing(x, y, 94);
          setTimeout(() => addFireRing(x, y, 138), 60 / speedMult);
          addFlameWisps(x, y, 5, 54);
          addEmbers(x, y, 14, 72);
          onImpact?.(target, index);
        };

        for (let trailIndex = 0; trailIndex < 3; trailIndex++) {
          const trail = document.createElement('div');
          trail.style.cssText = `position:fixed;left:${origin.x - 10}px;top:${origin.y - 2 + (trailIndex - 1) * 7}px;width:${58 - trailIndex * 8}px;height:${5 - trailIndex}px;border-radius:999px;background:linear-gradient(90deg,transparent,${trailIndex === 0 ? '#fde68a' : '#f97316'},transparent);box-shadow:0 0 7px #ef4444;transform-origin:10px 50%;z-index:9998;pointer-events:none;mix-blend-mode:screen;`;
          layer.appendChild(trail);
          trail.animate([
            { transform: `rotate(${angle}rad) translateX(0) scaleX(.2)`, opacity: 0 },
            { opacity: .85, offset: .25 },
            { transform: `rotate(${angle}rad) translateX(${Math.max(0, distance - 42)}px) scaleX(1.6)`, opacity: 0 }
          ], { duration: (350 + trailIndex * 35) / speedMult, delay: trailIndex * 18 / speedMult, easing: 'ease-out' }).onfinish = () => trail.remove();
        }
      } else if (type === 'ember_barrage') {
        addCastingSeal(x, y - 80, 72, 430, .65);
        const gate = document.createElement('div');
        gate.style.cssText = `position:fixed;left:${x - 48}px;top:${y - 132}px;width:96px;height:38px;border:4px double rgba(253,230,138,.95);border-radius:50%;background:radial-gradient(ellipse,rgba(249,115,22,.42),transparent 64%);box-shadow:0 0 14px #f97316,inset 0 0 12px #fbbf24;z-index:9998;pointer-events:none;mix-blend-mode:screen;`;
        layer.appendChild(gate);
        gate.animate([
          { transform: 'scale(.15) rotate(-25deg)', opacity: 0 },
          { transform: 'scale(1.08) rotate(8deg)', opacity: 1, offset: .38 },
          { transform: 'scale(.72) rotate(35deg)', opacity: 0 }
        ], { duration: 450 / speedMult, easing: 'ease-out' }).onfinish = () => gate.remove();

        const bolt = document.createElement('div');
        bolt.style.cssText = `position:fixed;left:${x - 16}px;top:${y - 155}px;width:32px;height:88px;border-radius:50% 50% 42% 42%;background:linear-gradient(180deg,transparent,#ef4444 25%,#f97316 55%,#fde68a);clip-path:polygon(50% 0,100% 70%,72% 100%,28% 100%,0 70%);filter:drop-shadow(0 0 12px #f97316);z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
        layer.appendChild(bolt);
        bolt.animate([
          { transform: 'translateY(-40px) scale(.4)', opacity: 0 },
          { opacity: 1, offset: .18 },
          { transform: 'translateY(150px) scale(1)', opacity: 1 }
        ], { duration: 300 / speedMult, easing: 'ease-in' }).onfinish = () => {
          bolt.remove();
          addImpactFlash(x, y, 76, '#fde68a');
          addFireRing(x, y, 68);
          addEmbers(x, y, 9, 52);
          onImpact?.(target, index);
        };

        for (let side = -1; side <= 1; side += 2) {
          const sparkBolt = document.createElement('div');
          sparkBolt.style.cssText = `position:fixed;left:${x - 6 + side * 22}px;top:${y - 142}px;width:12px;height:68px;border-radius:50%;background:linear-gradient(180deg,transparent,#ef4444,#fbbf24);filter:drop-shadow(0 0 7px #f97316);z-index:9998;pointer-events:none;mix-blend-mode:screen;`;
          layer.appendChild(sparkBolt);
          sparkBolt.animate([
            { transform: `translate(${side * 20}px,-25px) scale(.3) rotate(${side * 12}deg)`, opacity: 0 },
            { opacity: .8, offset: .2 },
            { transform: `translate(${-side * 12}px,135px) scale(.85) rotate(${-side * 8}deg)`, opacity: 0 }
          ], { duration: 320 / speedMult, delay: 30 / speedMult, easing: 'ease-in' }).onfinish = () => sparkBolt.remove();
        }
      } else if (type === 'inferno') {
        addCastingSeal(x, y + 18, 142, 780, 1.15);
        const groundGlow = document.createElement('div');
        groundGlow.style.cssText = `position:fixed;left:${x - 84}px;top:${y + 18}px;width:168px;height:48px;border:5px double rgba(253,230,138,.92);border-radius:50%;background:radial-gradient(ellipse,rgba(255,247,173,.82),rgba(249,115,22,.48) 34%,rgba(153,27,27,.25) 55%,transparent 72%);box-shadow:0 0 22px #f97316,0 0 42px #dc2626;z-index:9997;pointer-events:none;mix-blend-mode:screen;`;
        layer.appendChild(groundGlow);
        groundGlow.animate([
          { transform: 'scale(.1) rotate(-35deg)', opacity: 0 },
          { transform: 'scale(1.15) rotate(0)', opacity: 1, offset: .42 },
          { transform: 'scale(1.42) rotate(28deg)', opacity: 0 }
        ], { duration: 720 / speedMult, easing: 'cubic-bezier(.12,.72,.2,1)' }).onfinish = () => groundGlow.remove();

        const pillar = document.createElement('div');
        pillar.style.cssText = `position:fixed;left:${x - 52}px;top:${y - 155}px;width:104px;height:210px;border-radius:48% 52% 32% 32%;background:radial-gradient(ellipse at 50% 88%,#fff7ad 0 8%,#fbbf24 22%,#f97316 44%,rgba(220,38,38,.86) 64%,transparent 72%);clip-path:polygon(50% 0,68% 25%,84% 12%,79% 42%,100% 58%,78% 100%,22% 100%,0 58%,21% 40%,18% 17%,38% 30%);filter:drop-shadow(0 0 18px #ef4444);z-index:9998;pointer-events:none;mix-blend-mode:screen;transform-origin:50% 100%;`;
        layer.appendChild(pillar);
        pillar.animate([
          { transform: 'scaleX(.25) scaleY(0)', opacity: 0 },
          { transform: 'scaleX(1.12) scaleY(1)', opacity: 1, offset: .42 },
          { transform: 'scaleX(.7) scaleY(1.16)', opacity: 0 }
        ], { duration: 650 / speedMult, easing: 'cubic-bezier(.1,.8,.2,1)' }).onfinish = () => pillar.remove();

        const tongueCount = effectDensity < .5 ? 2 : 3;
        for (let tongueIndex = 0; tongueIndex < tongueCount; tongueIndex++) {
          const tongue = document.createElement('div');
          const side = tongueCount === 2 ? (tongueIndex === 0 ? -1 : 1) : tongueIndex - 1;
          tongue.style.cssText = `position:fixed;left:${x - 19 + side * 42}px;top:${y - 92 - Math.abs(side) * 18}px;width:38px;height:148px;border-radius:50% 50% 35% 35%;background:linear-gradient(180deg,transparent,#dc2626 24%,#f97316 58%,#fde68a);clip-path:polygon(50% 0,90% 54%,72% 100%,28% 100%,10% 54%);filter:drop-shadow(0 0 12px #f97316);z-index:9999;pointer-events:none;mix-blend-mode:screen;transform-origin:50% 100%;`;
          layer.appendChild(tongue);
          tongue.animate([
            { transform: `scaleY(0) rotate(${side * 14}deg)`, opacity: 0 },
            { transform: `scaleY(1.1) rotate(${-side * 9}deg)`, opacity: .95, offset: .48 },
            { transform: `scaleY(.55) translateY(-45px) rotate(${side * 12}deg)`, opacity: 0 }
          ], { duration: (560 + tongueIndex * 70) / speedMult, delay: tongueIndex * 35 / speedMult, easing: 'cubic-bezier(.12,.8,.22,1)' }).onfinish = () => tongue.remove();
        }
        setTimeout(() => {
          addImpactFlash(x, y, 150);
          addFireRing(x, y + 15, 132);
          setTimeout(() => addFireRing(x, y + 8, 190), 70 / speedMult);
          addFlameWisps(x, y, 7, 78);
          addEmbers(x, y, 20, 105);
          onImpact?.(target, index);
        }, 360 / speedMult);
      } else if (type === 'meteor_catastrophe') {
        addCastingSeal(x, y + 10, 172, 980, 1.5);
        const targetMark = document.createElement('div');
        targetMark.style.cssText = `position:fixed;left:${x - 104}px;top:${y - 42}px;width:208px;height:84px;border:6px double rgba(255,247,173,.96);border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(251,191,36,.52) 0deg 3deg,transparent 3deg 24deg),radial-gradient(ellipse,rgba(220,38,38,.34),transparent 64%);box-shadow:0 0 26px #f97316,0 0 54px #991b1b,inset 0 0 24px #fbbf24;z-index:9997;pointer-events:none;mix-blend-mode:screen;`;
        layer.appendChild(targetMark);
        targetMark.animate([
          { transform: 'scale(.05) rotate(-100deg)', opacity: 0 },
          { transform: 'scale(1.12) rotate(0)', opacity: 1, offset: .42 },
          { transform: 'scale(1.45) rotate(75deg)', opacity: 0 }
        ], { duration: 920 / speedMult, easing: 'cubic-bezier(.14,.72,.2,1)' }).onfinish = () => targetMark.remove();

        const fragmentCount = Math.max(2, Math.round(4 * effectDensity));
        for (let fragmentIndex = 0; fragmentIndex < fragmentCount; fragmentIndex++) {
          const fragment = document.createElement('div');
          const side = fragmentIndex % 2 === 0 ? -1 : 1;
          const offset = 42 + fragmentIndex * 16;
          fragment.style.cssText = `position:fixed;left:${x - 10 + side * offset}px;top:${y - 260 - fragmentIndex * 28}px;width:${20 + fragmentIndex * 3}px;height:${58 + fragmentIndex * 6}px;border-radius:50%;background:linear-gradient(180deg,transparent,#991b1b 22%,#f97316 58%,#fde68a);clip-path:polygon(50% 0,100% 72%,68% 100%,32% 100%,0 72%);filter:drop-shadow(0 0 9px #f97316);z-index:9998;pointer-events:none;mix-blend-mode:screen;`;
          layer.appendChild(fragment);
          fragment.animate([
            { transform: `translate(${side * 70}px,-90px) scale(.25) rotate(${side * 22}deg)`, opacity: 0 },
            { opacity: .9, offset: .18 },
            { transform: `translate(${-side * 24}px,${280 + fragmentIndex * 15}px) scale(1) rotate(${-side * 12}deg)`, opacity: 0 }
          ], { duration: (520 + fragmentIndex * 65) / speedMult, delay: fragmentIndex * 28 / speedMult, easing: 'cubic-bezier(.35,.72,.2,1)' }).onfinish = () => fragment.remove();
        }

        const meteor = document.createElement('div');
        meteor.style.cssText = `position:fixed;left:${x - 34}px;top:${y - 280}px;width:68px;height:132px;border-radius:50% 50% 44% 44%;background:radial-gradient(circle at 50% 78%,#fff7ad 0 8%,#fbbf24 20%,#f97316 42%,#991b1b 67%,transparent 70%);clip-path:polygon(50% 0,86% 54%,100% 88%,65% 100%,35% 100%,0 88%,14% 54%);filter:drop-shadow(0 0 16px #f97316) drop-shadow(0 0 28px #dc2626);z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
        layer.appendChild(meteor);
        meteor.animate([
          { transform: 'translate(80px,-80px) scale(.35) rotate(18deg)', opacity: 0 },
          { opacity: 1, offset: .15 },
          { transform: 'translate(-18px,280px) scale(1.25) rotate(-8deg)', opacity: 1 }
        ], { duration: 580 / speedMult, easing: 'cubic-bezier(.35,.72,.2,1)' }).onfinish = () => {
          meteor.remove();
          addImpactFlash(x, y, 245, '#fff7ad');
          addFireRing(x, y, 180);
          setTimeout(() => addFireRing(x, y, 260), 70 / speedMult);
          setTimeout(() => addFireRing(x, y, 340), 135 / speedMult);
          addFlameWisps(x, y, 10, 118);
          addEmbers(x, y, 30, 155);

          const crater = document.createElement('div');
          crater.style.cssText = `position:fixed;left:${x - 118}px;top:${y + 12}px;width:236px;height:72px;border-radius:50%;background:radial-gradient(ellipse,rgba(255,247,173,.92) 0 7%,rgba(249,115,22,.7) 22%,rgba(127,29,29,.65) 48%,transparent 70%);box-shadow:0 0 28px #f97316,inset 0 0 26px #7f1d1d;z-index:9998;pointer-events:none;mix-blend-mode:screen;`;
          layer.appendChild(crater);
          crater.animate([
            { transform: 'scale(.08)', opacity: 0 },
            { transform: 'scale(1.15)', opacity: 1, offset: .28 },
            { transform: 'scale(1.5)', opacity: 0 }
          ], { duration: 720 / speedMult, easing: 'cubic-bezier(.1,.75,.2,1)' }).onfinish = () => crater.remove();

          onImpact?.(target, index);
        };
      }
    }, index * 90 / speedMult);
  });
};

const levelCosts = [1, 1, 1, 2, 2, 2, 3, 3, 3, 5];
const makeLevels = (configs) => configs.map((config, index) => ({
  level: index + 1,
  spCost: levelCosts[index],
  ...config
}));

const getTargetGroup = (caster, battle) => {
  if (caster.activeAilment?.type === 'confusion' && battle.selectedEnemyTarget && battle.party.includes(battle.selectedEnemyTarget)) {
    return battle.party;
  }
  return battle.enemies;
};

const tryApplyBurn = (target, chance, duration, battle) => {
  if (!target || target.isDead || target.activeAilment) return false;
  if (target.hp !== undefined) {
    const stigma = battle._findSkill?.(target, 'stigma_of_atonement');
    if (stigma?.level > 0) return false;
  }
  const resist = (target.stats?.ailmentResist?.burn || 0)
    + (target._ailmentResistBuffTurns > 0 ? (target._ailmentResistBuffAmount || 0) : 0);
  if (Math.random() * 100 >= Math.max(0, chance - resist)) return false;
  target.activeAilment = { type: 'burn', duration };
  battle.showDamage(target.elementId, 'BURN', 'text-orange-400');
  battle.renderEntities();
  return true;
};

export const pyromancer = {
  id: 'pyromancer',
  name: 'パイロマンサー',
  icon: 'local_fire_department',
  changeCost: 500000,
  requirements: [
    { jobId: 'mage', level: 100 },
    { jobId: 'magic_knight', level: 100 }
  ],
  skills: [
    // ─── Active Skills ──────────────────────────────────────
    {
      id: 'flare_lance', name: 'フレアランス', icon: 'flare', statDependency: 'MAT',
      actionNameClass: 'text-orange-200', actionNameBorderClass: 'border-orange-400/60',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 24, multiplier: 1.50, burnChance: 25, burnTurns: 3 },
        { mpCost: 28, multiplier: 1.65, burnChance: 30, burnTurns: 3 },
        { mpCost: 32, multiplier: 1.80, burnChance: 35, burnTurns: 3 },
        { mpCost: 38, multiplier: 1.95, burnChance: 40, burnTurns: 4 },
        { mpCost: 44, multiplier: 2.10, burnChance: 45, burnTurns: 4 },
        { mpCost: 50, multiplier: 2.25, burnChance: 50, burnTurns: 4 },
        { mpCost: 58, multiplier: 2.40, burnChance: 55, burnTurns: 5 },
        { mpCost: 66, multiplier: 2.60, burnChance: 60, burnTurns: 5 },
        { mpCost: 76, multiplier: 2.80, burnChance: 65, burnTurns: 5 },
        { mpCost: 90, multiplier: 3.00, burnChance: 70, burnTurns: 6 }
      ]),
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵単体に MATK ${lc.multiplier.toFixed(2)} 倍の炎属性攻撃。${lc.burnChance}% の確率で ${lc.burnTurns} ターン火傷を付与する`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const group = getTargetGroup(caster, battle);
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead || !group.includes(target)) target = group.find(enemy => !enemy.isDead);
        if (!target) return;
        playSkillAnimation(caster, target, 'flare_lance', () => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency,
            actionName: this.name,
            damageMultiplier: levelConfig.multiplier,
            damageType: 'skill',
            element: 'fire',
            hideActionName: true
          });
          tryApplyBurn(target, levelConfig.burnChance, levelConfig.burnTurns, battle);
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const target = targets.reduce((best, enemy) =>
            (enemy.stats?.elementResist?.fire || 0) < (best.stats?.elementResist?.fire || 0) ? enemy : best
          );
          const burnScore = target.activeAilment ? 0 : lc.burnChance * .45;
          return { target, score: 48 * lc.multiplier * Math.max(.2, 1 - (target.stats?.elementResist?.fire || 0) / 100) + burnScore };
        }
      }
    },
    {
      id: 'ember_barrage', name: 'エンバーバラージ', icon: 'auto_awesome', statDependency: 'MAT',
      actionNameClass: 'text-amber-200', actionNameBorderClass: 'border-red-400/60',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 36, multiplier: .45, hits: 3 }, { mpCost: 42, multiplier: .48, hits: 3 },
        { mpCost: 48, multiplier: .52, hits: 4 }, { mpCost: 56, multiplier: .55, hits: 4 },
        { mpCost: 64, multiplier: .58, hits: 5 }, { mpCost: 74, multiplier: .61, hits: 5 },
        { mpCost: 84, multiplier: .64, hits: 6 }, { mpCost: 96, multiplier: .68, hits: 6 },
        { mpCost: 110, multiplier: .72, hits: 7 }, { mpCost: 126, multiplier: .75, hits: 7 }
      ]),
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、ランダムな敵に MATK ${lc.multiplier.toFixed(2)} 倍の炎属性攻撃を ${lc.hits} 回行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        for (let hit = 0; hit < levelConfig.hits; hit++) {
          battle._scheduleBattleTimeout(() => {
            if (caster.isDead || battle.isStopped) return;
            const targets = getTargetGroup(caster, battle).filter(enemy => !enemy.isDead);
            if (!targets.length) return;
            const target = targets[Math.floor(Math.random() * targets.length)];
            playSkillAnimation(caster, target, 'ember_barrage', () => {
              if (target.isDead) return;
              battle.executeAttack(caster, target, true, {
                statDependency: this.statDependency,
                actionName: this.name,
                damageMultiplier: levelConfig.multiplier,
                damageType: 'skill',
                element: 'fire',
                hideActionName: true,
                skipAtbReset: hit > 0
              });
            });
          }, hit * 145 / (battle.speedMult || 1));
        }
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const averageResist = targets.reduce((sum, enemy) => sum + (enemy.stats?.elementResist?.fire || 0), 0) / targets.length;
          return { target: targets[0], score: 37 * lc.multiplier * lc.hits * Math.max(.2, 1 - averageResist / 100) + (targets.length === 1 ? 45 : 0) };
        }
      }
    },
    {
      id: 'inferno', name: 'インフェルノ', icon: 'whatshot', statDependency: 'MAT',
      actionNameClass: 'text-red-200', actionNameBorderClass: 'border-red-500/60',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 54, multiplier: .90, burnChance: 35, burnTurns: 3 },
        { mpCost: 62, multiplier: .98, burnChance: 40, burnTurns: 3 },
        { mpCost: 70, multiplier: 1.06, burnChance: 45, burnTurns: 3 },
        { mpCost: 80, multiplier: 1.15, burnChance: 50, burnTurns: 4 },
        { mpCost: 92, multiplier: 1.24, burnChance: 55, burnTurns: 4 },
        { mpCost: 104, multiplier: 1.34, burnChance: 60, burnTurns: 4 },
        { mpCost: 118, multiplier: 1.44, burnChance: 68, burnTurns: 5 },
        { mpCost: 134, multiplier: 1.55, burnChance: 75, burnTurns: 5 },
        { mpCost: 152, multiplier: 1.67, burnChance: 82, burnTurns: 5 },
        { mpCost: 174, multiplier: 1.80, burnChance: 90, burnTurns: 6 }
      ]),
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵全体に MATK ${lc.multiplier.toFixed(2)} 倍の炎属性攻撃。${lc.burnChance}% の確率で ${lc.burnTurns} ターン火傷を付与する`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const targets = getTargetGroup(caster, battle).filter(enemy => !enemy.isDead);
        if (!targets.length) return;
        playSkillAnimation(caster, targets, 'inferno', (target, index) => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency,
            actionName: this.name,
            damageMultiplier: levelConfig.multiplier,
            damageType: 'skill',
            element: 'fire',
            hideActionName: true,
            isAoEProcessed: true,
            skipAtbReset: index < targets.length - 1
          });
          tryApplyBurn(target, levelConfig.burnChance, levelConfig.burnTurns, battle);
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (targets.length < 2) return null;
          const unburned = targets.filter(enemy => enemy.activeAilment?.type !== 'burn').length;
          return { target: targets[0], score: 42 * lc.multiplier * targets.length + unburned * lc.burnChance * .42 };
        }
      }
    },
    {
      id: 'meteor_catastrophe', name: 'メテオカタストロフ', icon: 'volcano', statDependency: 'MAT',
      actionNameClass: 'text-yellow-100', actionNameBorderClass: 'border-orange-400/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 90, multiplier: 1.20, detonationMultiplier: 1.25 },
        { mpCost: 104, multiplier: 1.32, detonationMultiplier: 1.30 },
        { mpCost: 118, multiplier: 1.44, detonationMultiplier: 1.35 },
        { mpCost: 134, multiplier: 1.57, detonationMultiplier: 1.40 },
        { mpCost: 150, multiplier: 1.70, detonationMultiplier: 1.45 },
        { mpCost: 168, multiplier: 1.84, detonationMultiplier: 1.50 },
        { mpCost: 188, multiplier: 1.99, detonationMultiplier: 1.56 },
        { mpCost: 210, multiplier: 2.15, detonationMultiplier: 1.62 },
        { mpCost: 234, multiplier: 2.32, detonationMultiplier: 1.68 },
        { mpCost: 260, multiplier: 2.50, detonationMultiplier: 1.75 }
      ]),
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵全体に MATK ${lc.multiplier.toFixed(2)} 倍の炎属性攻撃。火傷中の対象にはさらに ${lc.detonationMultiplier.toFixed(2)} 倍のダメージを与え、火傷を解除する`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const targets = getTargetGroup(caster, battle).filter(enemy => !enemy.isDead);
        if (!targets.length) return;
        playSkillAnimation(caster, targets, 'meteor_catastrophe', (target, index) => {
          if (target.isDead) return;
          const isBurning = target.activeAilment?.type === 'burn';
          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency,
            actionName: this.name,
            damageMultiplier: levelConfig.multiplier * (isBurning ? levelConfig.detonationMultiplier : 1),
            damageType: 'skill',
            element: 'fire',
            hideActionName: true,
            isAoEProcessed: true,
            skipAtbReset: index < targets.length - 1
          });
          if (isBurning && !target.isDead) {
            target.activeAilment = null;
            battle.showDamage(target.elementId, 'DETONATE', 'text-yellow-300');
            battle.renderEntities();
          }
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length || caster.mp.current < (context.getEffectiveMpCost?.(caster, lc.mpCost) ?? lc.mpCost)) return null;
          const burning = targets.filter(enemy => enemy.activeAilment?.type === 'burn').length;
          if (!burning && targets.length < 3) return null;
          return { target: targets[0], score: 50 * lc.multiplier * (targets.length + burning * (lc.detonationMultiplier - 1)) + burning * 70 };
        }
      }
    },

    // ─── Passive Skills ──────────────────────────────────────
    {
      id: 'arcane_furnace', name: '魔力炉心', icon: 'mode_heat', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusMpPercent: 4, bonusMatkPercent: 4 }, { mpCost: 0, bonusMpPercent: 7, bonusMatkPercent: 7 },
        { mpCost: 0, bonusMpPercent: 10, bonusMatkPercent: 10 }, { mpCost: 0, bonusMpPercent: 13, bonusMatkPercent: 13 },
        { mpCost: 0, bonusMpPercent: 16, bonusMatkPercent: 16 }, { mpCost: 0, bonusMpPercent: 19, bonusMatkPercent: 19 },
        { mpCost: 0, bonusMpPercent: 22, bonusMatkPercent: 22 }, { mpCost: 0, bonusMpPercent: 25, bonusMatkPercent: 25 },
        { mpCost: 0, bonusMpPercent: 29, bonusMatkPercent: 29 }, { mpCost: 0, bonusMpPercent: 35, bonusMatkPercent: 35 }
      ]),
      getDescription: (lc) => `最大 MP と魔法攻撃力の倍率がそれぞれ ${lc.bonusMpPercent}%、${lc.bonusMatkPercent}% 上昇する`
    },
    {
      id: 'flame_sovereignty', name: '火界の支配者', icon: 'local_fire_department', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, fireDamagePercent: 5, fireResistPercent: 4 }, { mpCost: 0, fireDamagePercent: 8, fireResistPercent: 7 },
        { mpCost: 0, fireDamagePercent: 11, fireResistPercent: 10 }, { mpCost: 0, fireDamagePercent: 14, fireResistPercent: 13 },
        { mpCost: 0, fireDamagePercent: 17, fireResistPercent: 16 }, { mpCost: 0, fireDamagePercent: 20, fireResistPercent: 19 },
        { mpCost: 0, fireDamagePercent: 23, fireResistPercent: 22 }, { mpCost: 0, fireDamagePercent: 26, fireResistPercent: 25 },
        { mpCost: 0, fireDamagePercent: 30, fireResistPercent: 28 }, { mpCost: 0, fireDamagePercent: 35, fireResistPercent: 35 }
      ]),
      getDescription: (lc) => `炎属性で与えるダメージが ${lc.fireDamagePercent}% 上昇し、炎属性耐性が ${lc.fireResistPercent}% 上昇する`
    },
    {
      id: 'combustion_chain', name: '燃焼連鎖', icon: 'crisis_alert', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, burningTargetDamagePercent: 6 }, { mpCost: 0, burningTargetDamagePercent: 9 },
        { mpCost: 0, burningTargetDamagePercent: 12 }, { mpCost: 0, burningTargetDamagePercent: 16 },
        { mpCost: 0, burningTargetDamagePercent: 20 }, { mpCost: 0, burningTargetDamagePercent: 24 },
        { mpCost: 0, burningTargetDamagePercent: 29 }, { mpCost: 0, burningTargetDamagePercent: 34 },
        { mpCost: 0, burningTargetDamagePercent: 39 }, { mpCost: 0, burningTargetDamagePercent: 45 }
      ]),
      getDescription: (lc) => `火傷中の敵へ炎属性攻撃で与えるダメージが ${lc.burningTargetDamagePercent}% 上昇する`
    }
  ]
};
