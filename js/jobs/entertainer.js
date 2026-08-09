import { getBattleAnimationSpeed, getBattleSpeed, shouldSkipBattleAnimations } from '../utils/battle-animation.js';

const isEntertainer = caster => caster?.jobId === 'entertainer' || caster?.job === 'entertainer';

const getLivingParty = battle => battle.party.filter(member => !member.isDead);

const getOffensiveTargets = (caster, battle) => {
  if (caster.activeAilment?.type === 'confusion') {
    return battle.party.filter(member => !member.isDead);
  }
  return battle.enemies.filter(enemy => !enemy.isDead);
};

const getPrimaryTarget = (caster, battle) => {
  const targets = getOffensiveTargets(caster, battle);
  if (targets.includes(battle.selectedEnemyTarget)) return battle.selectedEnemyTarget;
  return targets[0] || null;
};

const getHpState = entity => {
  const max = entity.stats?.hp || entity.hp?.max || entity.maxHp || 1;
  const current = entity.hp?.current ?? entity.currentHp ?? 0;
  return { current, max, ratio: current / Math.max(1, max) };
};

const restoreHp = (target, amount, battle) => {
  if (!target || target.isDead || amount <= 0) return 0;
  const { current, max } = getHpState(target);
  const restored = Math.max(0, Math.min(amount, max - current));
  if (restored <= 0) return 0;
  if (target.hp) target.hp.current = current + restored;
  else target.currentHp = current + restored;
  battle.showDamage(target.elementId, `+${restored}`, 'text-emerald-300');
  return restored;
};

const restoreMp = (target, amount, battle) => {
  if (!target?.mp || target.isDead || amount <= 0) return 0;
  const max = target.stats?.mp || target.mp.max || 0;
  const restored = Math.max(0, Math.min(amount, max - target.mp.current));
  if (restored <= 0) return 0;
  target.mp.current += restored;
  battle.showDamage(target.elementId, `+${restored} MP`, 'text-cyan-300');
  return restored;
};

const addHype = (caster, amount, battle) => {
  if (!isEntertainer(caster) || amount <= 0) return;
  const showstopper = battle._findSkill?.(caster, 'showstopper');
  if (!showstopper?.levelConfig) return;
  const before = caster._entertainerHype || 0;
  caster._entertainerHype = Math.min(showstopper.levelConfig.maxHype, before + amount);
  if (caster._entertainerHype > before) {
    battle.showDamage(caster.elementId, `舞台熱 ${caster._entertainerHype}`, 'text-fuchsia-300');
  }
};

const animateSkill = (caster, targets, type, onImpact) => {
  const list = Array.isArray(targets) ? targets : [targets];
  if (shouldSkipBattleAnimations() || typeof document === 'undefined') {
    list.forEach((target, index) => onImpact?.(target, index));
    return;
  }

  const speed = getBattleAnimationSpeed(getBattleSpeed());
  const layer = document.getElementById('battle-effects-layer') || document.body;

  list.forEach((target, index) => {
    const targetEl = document.getElementById(target?.elementId);
    const rect = targetEl?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    setTimeout(() => {
      const effect = document.createElement('div');
      effect.style.position = 'fixed';
      effect.style.pointerEvents = 'none';
      effect.style.zIndex = '9999';
      effect.style.left = `${x - 55}px`;
      effect.style.top = `${y - 55}px`;
      effect.style.width = '110px';
      effect.style.height = '110px';
      effect.style.borderRadius = '50%';
      effect.style.mixBlendMode = 'screen';

      if (type === 'spotlight') {
        effect.style.background = 'conic-gradient(from 0deg,transparent,#fde68a,#c4b5fd,transparent)';
        effect.style.boxShadow = '0 0 25px #fbbf24, inset 0 0 18px #8b5cf6';
      } else if (type === 'finale') {
        effect.style.border = '5px double #fff';
        effect.style.background = 'conic-gradient(#f472b6,#fbbf24,#60a5fa,#a78bfa,#f472b6)';
        effect.style.boxShadow = '0 0 30px #f472b6, inset 0 0 25px #fbbf24';
      } else if (type === 'encore') {
        effect.style.border = '4px solid #67e8f9';
        effect.style.background = 'radial-gradient(circle,rgba(255,255,255,.8),rgba(34,211,238,.2),transparent 70%)';
        effect.style.boxShadow = '0 0 22px #22d3ee';
      } else {
        effect.style.border = '4px dashed #f0abfc';
        effect.style.background = 'radial-gradient(circle,rgba(244,114,182,.35),transparent 68%)';
        effect.style.boxShadow = '0 0 20px #a855f7';
      }

      const glyph = document.createElement('div');
      glyph.textContent = type === 'encore' ? '♫' : type === 'finale' ? '★' : '♪';
      glyph.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:42px;color:white;text-shadow:0 0 10px #fff;';
      effect.appendChild(glyph);
      layer.appendChild(effect);

      const duration = (type === 'finale' ? 720 : 500) / speed;
      const animation = effect.animate([
        { transform: 'scale(.1) rotate(-90deg)', opacity: 0 },
        { transform: 'scale(1.15) rotate(90deg)', opacity: 1, offset: .55 },
        { transform: 'scale(1.55) rotate(180deg)', opacity: 0 }
      ], { duration, easing: 'ease-out' });
      animation.onfinish = () => effect.remove();
      setTimeout(() => onImpact?.(target, index), duration * .52);
    }, index * 90 / speed);
  });
};

const standardLevels = values => values.map((value, index) => ({
  level: index + 1,
  spCost: index < 3 ? 1 : index < 6 ? 2 : index < 9 ? 3 : 5,
  ...value
}));

const advancedLevels = values => values.map((value, index) => ({
  level: index + 1,
  spCost: index < 3 ? 2 : index < 6 ? 3 : index < 9 ? 4 : 6,
  ...value
}));

export const entertainer = {
  id: 'entertainer',
  name: 'エンターテイナー',
  icon: 'theater_comedy',
  image: './assets/job/job_entertainer.webp',
  changeCost: 500000,
  requirements: [
    { jobId: 'bird', level: 100 },
    { jobId: 'dancer', level: 100 }
  ],
  skills: [
    {
      id: 'spotlight_step', name: 'スポットライト・ステップ', icon: 'highlight', statDependency: 'MAT',
      actionNameClass: 'text-amber-200', actionNameBorderClass: 'border-fuchsia-400/60',
      maxLevel: 10,
      levels: standardLevels([
        { mpCost: 18, multiplier: 1.35 }, { mpCost: 21, multiplier: 1.48 },
        { mpCost: 24, multiplier: 1.61 }, { mpCost: 28, multiplier: 1.76 },
        { mpCost: 32, multiplier: 1.92 }, { mpCost: 37, multiplier: 2.08 },
        { mpCost: 42, multiplier: 2.26 }, { mpCost: 48, multiplier: 2.45 },
        { mpCost: 55, multiplier: 2.65 }, { mpCost: 64, multiplier: 2.90 }
      ]),
      getDescription: lc => `敵単体へ${lc.multiplier.toFixed(2)}倍の光属性魔法攻撃。状態異常中の対象には威力が1.5倍になる。【現職時】舞台熱+1`,
      execute(caster, lc, battle) {
        const target = getPrimaryTarget(caster, battle);
        if (!target) return;
        addHype(caster, 1, battle);
        animateSkill(caster, target, 'spotlight', () => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: 'MAT', actionName: '', damageType: 'skill', hideActionName: true,
            damageMultiplier: lc.multiplier * (target.activeAilment ? 1.5 : 1), element: 'light'
          });
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const target = targets.find(enemy => enemy.activeAilment) || context.selectedEnemyTarget || targets[0];
          return { target, score: 52 * lc.multiplier * (target.activeAilment ? 1.5 : 1) };
        }
      }
    },
    {
      id: 'captivating_revue', name: '魅惑のレビュー', icon: 'diversity_1', statDependency: 'MAT',
      actionNameClass: 'text-fuchsia-200', actionNameBorderClass: 'border-violet-400/60',
      maxLevel: 10,
      levels: advancedLevels([
        { mpCost: 30, multiplier: .55, chance: 24 }, { mpCost: 34, multiplier: .61, chance: 27 },
        { mpCost: 39, multiplier: .67, chance: 30 }, { mpCost: 44, multiplier: .74, chance: 34 },
        { mpCost: 50, multiplier: .81, chance: 38 }, { mpCost: 57, multiplier: .88, chance: 42 },
        { mpCost: 65, multiplier: .96, chance: 46 }, { mpCost: 74, multiplier: 1.05, chance: 50 },
        { mpCost: 84, multiplier: 1.15, chance: 55 }, { mpCost: 96, multiplier: 1.28, chance: 62 }
      ]),
      getDescription: lc => `敵全体へ${lc.multiplier.toFixed(2)}倍の無属性魔法攻撃を行い、${lc.chance}%の確率で混乱を付与する。【現職時】舞台熱+1`,
      execute(caster, lc, battle) {
        const targets = getOffensiveTargets(caster, battle);
        if (!targets.length) return;
        addHype(caster, 1, battle);
        animateSkill(caster, targets, 'revue', target => {
          if (target.isDead) return;
          const original = caster.stats.attackAilments;
          caster.stats.attackAilments = { ...(original || {}), confusion: lc.chance };
          battle.executeAttack(caster, target, true, {
            statDependency: 'MAT', actionName: '', damageType: 'skill', hideActionName: true,
            damageMultiplier: lc.multiplier, isAoEProcessed: true
          });
          caster.stats.attackAilments = original;
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (targets.length < 2) return null;
          const unaffected = targets.filter(enemy => enemy.activeAilment?.type !== 'confusion').length;
          return { target: targets[0], score: 36 * lc.multiplier * targets.length + unaffected * 12 };
        }
      }
    },
    {
      id: 'inspiring_revue', name: '鼓舞のレビュー', icon: 'celebration',
      actionNameClass: 'text-pink-200', actionNameBorderClass: 'border-amber-400/60',
      maxLevel: 10,
      levels: advancedLevels([
        { mpCost: 32, buffPercent: 10, amount: 15, duration: 3 }, { mpCost: 36, buffPercent: 12, amount: 18, duration: 3 },
        { mpCost: 40, buffPercent: 14, amount: 21, duration: 3 }, { mpCost: 46, buffPercent: 16, amount: 24, duration: 4 },
        { mpCost: 52, buffPercent: 18, amount: 27, duration: 4 }, { mpCost: 58, buffPercent: 20, amount: 30, duration: 4 },
        { mpCost: 66, buffPercent: 22, amount: 34, duration: 4 }, { mpCost: 74, buffPercent: 24, amount: 38, duration: 5 },
        { mpCost: 84, buffPercent: 27, amount: 42, duration: 5 }, { mpCost: 96, buffPercent: 30, amount: 48, duration: 5 }
      ]),
      getDescription: lc => `味方全体のATK・MATKを${lc.buffPercent}%、状態異常耐性を${lc.amount}上昇させる（${lc.duration}ターン）。【現職時】舞台熱+1`,
      execute(caster, lc, battle) {
        const targets = getLivingParty(battle);
        addHype(caster, 1, battle);
        animateSkill(caster, targets, 'revue', target => {
          target._atkBuffPercent = Math.max(target._atkBuffPercent || 0, lc.buffPercent);
          target._atkBuffTurns = Math.max(target._atkBuffTurns || 0, lc.duration);
          target._matkBuffPercent = Math.max(target._matkBuffPercent || 0, lc.buffPercent);
          target._matkBuffTurns = Math.max(target._matkBuffTurns || 0, lc.duration);
          target._ailmentResistBuffAmount = Math.max(target._ailmentResistBuffAmount || 0, lc.amount);
          target._ailmentResistBuffTurns = Math.max(target._ailmentResistBuffTurns || 0, lc.duration);
          battle.showDamage(target.elementId, 'ALL UP', 'text-pink-300');
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const allies = context.party.filter(member => !member.isDead);
          const uncovered = allies.filter(member => !member._atkBuffTurns || !member._matkBuffTurns);
          if (uncovered.length < Math.ceil(allies.length / 2)) return null;
          return { target: caster, score: 88 + uncovered.length * 14 + lc.buffPercent };
        }
      }
    },
    {
      id: 'encore', name: 'アンコール', icon: 'replay',
      actionNameClass: 'text-cyan-200', actionNameBorderClass: 'border-cyan-400/60',
      maxLevel: 10,
      levels: standardLevels([
        { mpCost: 34, healAmount: 45, recoverMp: 4 }, { mpCost: 39, healAmount: 58, recoverMp: 5 },
        { mpCost: 44, healAmount: 72, recoverMp: 6 }, { mpCost: 50, healAmount: 88, recoverMp: 7 },
        { mpCost: 57, healAmount: 106, recoverMp: 8 }, { mpCost: 65, healAmount: 126, recoverMp: 10 },
        { mpCost: 74, healAmount: 150, recoverMp: 12 }, { mpCost: 84, healAmount: 178, recoverMp: 14 },
        { mpCost: 95, healAmount: 210, recoverMp: 17 }, { mpCost: 108, healAmount: 250, recoverMp: 21 }
      ]),
      getDescription: lc => `味方全体のHPを${lc.healAmount}、MPを${lc.recoverMp}回復する。【現職時】舞台熱+1`,
      execute(caster, lc, battle) {
        const targets = getLivingParty(battle);
        addHype(caster, 1, battle);
        animateSkill(caster, targets, 'encore', target => {
          restoreHp(target, lc.healAmount, battle);
          restoreMp(target, lc.recoverMp, battle);
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const allies = context.party.filter(member => !member.isDead);
          const need = allies.reduce((score, member) => {
            const hpNeed = 1 - getHpState(member).ratio;
            const mpMax = member.stats?.mp || member.mp?.max || 1;
            const mpNeed = member.mp ? 1 - member.mp.current / Math.max(1, mpMax) : 0;
            return score + hpNeed * 90 + mpNeed * 35;
          }, 0);
          return need >= 55 ? { target: caster, score: 70 + need } : null;
        }
      }
    },
    {
      id: 'grand_finale', name: 'グランドフィナーレ', icon: 'hotel_class', statDependency: 'MAT',
      actionNameClass: 'text-yellow-100', actionNameBorderClass: 'border-fuchsia-400/70',
      maxLevel: 10,
      levels: advancedLevels([
        { mpCost: 72, multiplier: 1.10, hypeMultiplier: .16 }, { mpCost: 80, multiplier: 1.22, hypeMultiplier: .16 },
        { mpCost: 89, multiplier: 1.34, hypeMultiplier: .17 }, { mpCost: 99, multiplier: 1.47, hypeMultiplier: .17 },
        { mpCost: 110, multiplier: 1.60, hypeMultiplier: .18 }, { mpCost: 122, multiplier: 1.74, hypeMultiplier: .18 },
        { mpCost: 135, multiplier: 1.89, hypeMultiplier: .19 }, { mpCost: 149, multiplier: 2.05, hypeMultiplier: .19 },
        { mpCost: 164, multiplier: 2.22, hypeMultiplier: .20 }, { mpCost: 182, multiplier: 2.42, hypeMultiplier: .22 }
      ]),
      getDescription: lc => `敵全体へ${lc.multiplier.toFixed(2)}倍の光属性魔法攻撃。【現職時】舞台熱を全消費し、1ごとに威力+${Math.round(lc.hypeMultiplier * 100)}%`,
      execute(caster, lc, battle) {
        const targets = getOffensiveTargets(caster, battle);
        if (!targets.length) return;
        const hype = isEntertainer(caster) ? (caster._entertainerHype || 0) : 0;
        if (isEntertainer(caster)) caster._entertainerHype = 0;
        animateSkill(caster, targets, 'finale', target => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: 'MAT', actionName: '', damageType: 'skill', hideActionName: true,
            damageMultiplier: lc.multiplier + hype * lc.hypeMultiplier,
            element: 'light', isAoEProcessed: true
          });
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const hype = isEntertainer(caster) ? (caster._entertainerHype || 0) : 0;
          if (targets.length < 2 && hype < 3) return null;
          return { target: targets[0], score: 43 * targets.length * (lc.multiplier + hype * lc.hypeMultiplier) };
        }
      }
    },
    {
      id: 'showstopper', name: 'ショーストッパー', icon: 'star', type: 'passive',
      maxLevel: 10,
      levels: standardLevels([
        { bonusMatkPercent: 3, bonusMdefPercent: 3, bonusSpd: 2, maxHype: 2 },
        { bonusMatkPercent: 4, bonusMdefPercent: 4, bonusSpd: 3, maxHype: 2 },
        { bonusMatkPercent: 5, bonusMdefPercent: 5, bonusSpd: 4, maxHype: 2 },
        { bonusMatkPercent: 6, bonusMdefPercent: 6, bonusSpd: 5, maxHype: 3 },
        { bonusMatkPercent: 7, bonusMdefPercent: 7, bonusSpd: 6, maxHype: 3 },
        { bonusMatkPercent: 8, bonusMdefPercent: 8, bonusSpd: 8, maxHype: 3 },
        { bonusMatkPercent: 9, bonusMdefPercent: 9, bonusSpd: 10, maxHype: 4 },
        { bonusMatkPercent: 10, bonusMdefPercent: 10, bonusSpd: 12, maxHype: 4 },
        { bonusMatkPercent: 12, bonusMdefPercent: 12, bonusSpd: 15, maxHype: 4 },
        { bonusMatkPercent: 15, bonusMdefPercent: 15, bonusSpd: 20, maxHype: 5 }
      ]),
      getDescription: lc => `MATK・MDEF+${lc.bonusMatkPercent}%、SPD+${lc.bonusSpd}。【現職時】技の使用で舞台熱を最大${lc.maxHype}まで蓄積する`
    }
  ]
};
