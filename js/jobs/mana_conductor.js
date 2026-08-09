import { getBattleAnimationSpeed, getBattleSpeed, shouldSkipBattleAnimations } from '../utils/battle-animation.js';

const isConductor = caster => caster?.jobId === 'mana_conductor';
const maxMpOf = entity => entity?.stats?.mp || entity?.mp?.max || 0;
const currentMpOf = entity => entity?.mp?.current || 0;

const restoreMp = (target, amount, battle) => {
  if (!target?.mp || target.isDead || amount <= 0) return 0;
  const before = target.mp.current;
  target.mp.current = Math.min(maxMpOf(target), before + amount);
  const restored = target.mp.current - before;
  if (restored > 0) battle.showDamage(target.elementId, `+${restored} MP`, 'text-cyan-300');
  return restored;
};

const addHarmony = (caster, amount, battle) => {
  if (!isConductor(caster) || amount <= 0) return;
  const core = battle._findSkill?.(caster, 'conductor_core');
  if (!core?.levelConfig) return;
  const previous = caster._conductorHarmony || 0;
  caster._conductorHarmony = Math.min(core.levelConfig.maxHarmony, previous + amount);
  if (caster._conductorHarmony > previous) {
    battle.showDamage(caster.elementId, `共鳴 ${caster._conductorHarmony}`, 'text-violet-300');
  }
};

const getLivingAllies = (caster, battle, { excludeCaster = false } = {}) =>
  battle.party.filter(member => !member.isDead && (!excludeCaster || member !== caster));

const getLowestManaAlly = (caster, battle) => {
  const allies = getLivingAllies(caster, battle, { excludeCaster: true });
  return allies.sort((a, b) => currentMpOf(a) / Math.max(1, maxMpOf(a)) - currentMpOf(b) / Math.max(1, maxMpOf(b)))[0] || null;
};

const animateSkill = (caster, targets, type, onImpact) => {
  const list = Array.isArray(targets) ? targets : [targets];
  if (shouldSkipBattleAnimations() || typeof document === 'undefined') {
    list.forEach((target, index) => onImpact?.(target, index));
    return;
  }

  const speed = getBattleAnimationSpeed(getBattleSpeed());
  const layer = document.getElementById('battle-effects-layer') || document.body;
  const casterEl = document.getElementById(caster.elementId);
  const casterRect = casterEl?.getBoundingClientRect();
  const origin = casterRect
    ? { x: casterRect.left + casterRect.width / 2, y: casterRect.top + casterRect.height / 2 }
    : { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  list.forEach((target, index) => {
    const targetEl = document.getElementById(target?.elementId);
    const rect = targetEl?.getBoundingClientRect();
    const end = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : origin;
    const delay = index * 85 / speed;

    setTimeout(() => {
      const effect = document.createElement('div');
      effect.style.position = 'fixed';
      effect.style.pointerEvents = 'none';
      effect.style.zIndex = '9999';
      effect.style.mixBlendMode = 'screen';

      if (type === 'relay' || type === 'overture') {
        const dx = end.x - origin.x;
        const dy = end.y - origin.y;
        const distance = Math.hypot(dx, dy);
        effect.style.left = `${origin.x}px`;
        effect.style.top = `${origin.y - 3}px`;
        effect.style.width = `${Math.max(12, distance)}px`;
        effect.style.height = '6px';
        effect.style.borderRadius = '999px';
        effect.style.transformOrigin = '0 50%';
        effect.style.background = 'linear-gradient(90deg,#8b5cf6,#67e8f9,#fff,transparent)';
        effect.style.boxShadow = '0 0 10px #22d3ee';
        const angle = Math.atan2(dy, dx);
        layer.appendChild(effect);
        const animation = effect.animate([
          { transform: `rotate(${angle}rad) scaleX(0)`, opacity: 0 },
          { transform: `rotate(${angle}rad) scaleX(1)`, opacity: 1, offset: .55 },
          { transform: `rotate(${angle}rad) scaleX(1)`, opacity: 0 }
        ], { duration: 430 / speed, easing: 'ease-out' });
        animation.onfinish = () => effect.remove();
      } else {
        effect.style.left = `${end.x - 48}px`;
        effect.style.top = `${end.y - 48}px`;
        effect.style.width = '96px';
        effect.style.height = '96px';
        effect.style.borderRadius = '50%';
        effect.style.border = type === 'finale' ? '5px double #fff' : '3px solid #67e8f9';
        effect.style.background = 'conic-gradient(from 0deg,transparent,#8b5cf6,#22d3ee,transparent)';
        effect.style.boxShadow = '0 0 18px #22d3ee, inset 0 0 16px #8b5cf6';
        layer.appendChild(effect);
        const animation = effect.animate([
          { transform: 'scale(.15) rotate(-90deg)', opacity: 0 },
          { transform: 'scale(1.15) rotate(90deg)', opacity: 1, offset: .5 },
          { transform: 'scale(1.6) rotate(180deg)', opacity: 0 }
        ], { duration: (type === 'finale' ? 650 : 480) / speed, easing: 'ease-out' });
        animation.onfinish = () => effect.remove();
      }

      setTimeout(() => onImpact?.(target, index), (type === 'finale' ? 300 : 210) / speed);
    }, delay);
  });
};

const activeLevels = (mpCosts, values) => mpCosts.map((mpCost, index) => ({
  level: index + 1,
  spCost: index < 3 ? 1 : index < 6 ? 2 : index < 9 ? 3 : 5,
  mpCost,
  ...values[index]
}));

const advancedLevels = (mpCosts, values) => mpCosts.map((mpCost, index) => ({
  level: index + 1,
  spCost: index < 3 ? 2 : index < 6 ? 3 : index < 9 ? 4 : 6,
  mpCost,
  ...values[index]
}));

export const mana_conductor = {
  id: 'mana_conductor',
  name: 'マナコンダクター',
  icon: 'graphic_eq',
  image: './assets/job/job_mana_conductor.webp',
  changeCost: 500000,
  requirements: [
    { jobId: 'mage', level: 100 },
    { jobId: 'dancer', level: 100 }
  ],
  skills: [
    {
      id: 'mana_relay', name: 'マナリレー', icon: 'swap_horiz',
      maxLevel: 10,
      levels: activeLevels(
        [12, 15, 18, 22, 26, 30, 34, 38, 43, 48],
        [22, 28, 34, 42, 50, 59, 69, 79, 89, 100].map(restoreMp => ({ restoreMp }))
      ),
      getDescription: lc => `MPを${lc.mpCost}消費し、自分以外でMP割合が最も低い味方へMPを${lc.restoreMp}渡す`,
      execute(caster, levelConfig, battle, options = {}) {
        const candidates = getLivingAllies(caster, battle, { excludeCaster: true });
        const target = options.autoTarget && candidates.includes(options.autoTarget)
          ? options.autoTarget
          : getLowestManaAlly(caster, battle);
        if (!target) {
          battle.showActionName(caster.elementId, '対象なし', 'text-gray-400', 'border-gray-500/50');
          return;
        }
        animateSkill(caster, target, 'relay', () => {
          const restored = restoreMp(target, levelConfig.restoreMp, battle);
          if (restored > 0) addHarmony(caster, 1, battle);
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const targets = context.party.filter(member => member !== caster && !member.isDead && member.mp);
          const target = targets.sort((a, b) => currentMpOf(a) / Math.max(1, maxMpOf(a)) - currentMpOf(b) / Math.max(1, maxMpOf(b)))[0];
          if (!target) return null;
          const missing = maxMpOf(target) - currentMpOf(target);
          const ratio = currentMpOf(target) / Math.max(1, maxMpOf(target));
          if (missing < Math.max(6, levelConfig.restoreMp * .75) || ratio > .72) return null;
          return { target, score: 70 + (1 - ratio) * 80 };
        }
      }
    },
    {
      id: 'ether_overture', name: 'エーテル序曲', icon: 'all_inclusive',
      maxLevel: 10,
      levels: advancedLevels(
        [28, 32, 36, 42, 48, 54, 62, 70, 80, 92],
        [5, 7, 9, 11, 13, 15, 18, 21, 24, 28].map(recoverMp => ({ recoverMp, duration: 4 }))
      ),
      getDescription: lc => `味方全体へ、各自の行動前にMPを${lc.recoverMp}回復する「マナフロー」を${lc.duration}回付与する`,
      execute(caster, levelConfig, battle) {
        const allies = getLivingAllies(caster, battle);
        animateSkill(caster, allies, 'overture', target => {
          target._manaFlowAmount = Math.max(target._manaFlowAmount || 0, levelConfig.recoverMp);
          target._manaFlowTurns = Math.max(target._manaFlowTurns || 0, levelConfig.duration);
          battle.showDamage(target.elementId, 'MANA FLOW', 'text-cyan-300');
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const allies = context.party.filter(member => !member.isDead && member.mp);
          const dryAllies = allies.filter(member => currentMpOf(member) / Math.max(1, maxMpOf(member)) < .65);
          const uncovered = dryAllies.filter(member => !member._manaFlowTurns);
          if (uncovered.length < Math.min(2, allies.length)) return null;
          return { target: caster, score: 82 + uncovered.length * 12 };
        }
      }
    },
    {
      id: 'arcane_crescendo', name: 'アルカナ・クレッシェンド', icon: 'music_note', statDependency: 'MAT',
      maxLevel: 10,
      levels: activeLevels(
        [10, 12, 14, 16, 19, 22, 25, 28, 32, 38],
        [1.2, 1.3, 1.4, 1.5, 1.6, 1.72, 1.84, 1.96, 2.1, 2.3].map(multiplier => ({ multiplier, harmonyMultiplier: .24 }))
      ),
      getDescription: lc => `敵単体へ${lc.multiplier.toFixed(2)}倍の無属性魔法攻撃。【現職時】共鳴1ごとに威力+${Math.round(lc.harmonyMultiplier * 100)}%（全消費）`,
      execute(caster, levelConfig, battle) {
        const target = battle.selectedEnemyTarget && !battle.selectedEnemyTarget.isDead
          ? battle.selectedEnemyTarget
          : battle.enemies.find(enemy => !enemy.isDead);
        if (!target) return;
        const harmony = isConductor(caster) ? (caster._conductorHarmony || 0) : 0;
        if (harmony > 0) caster._conductorHarmony = 0;
        animateSkill(caster, target, 'attack', () => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: 'MAT', actionName: '', damageType: 'skill', hideActionName: true,
            damageMultiplier: levelConfig.multiplier + harmony * levelConfig.harmonyMultiplier
          });
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const target = context.selectedEnemyTarget || context.enemies.find(enemy => !enemy.isDead);
          if (!target) return null;
          const harmony = isConductor(caster) ? (caster._conductorHarmony || 0) : 0;
          return { target, score: 42 * (levelConfig.multiplier + harmony * levelConfig.harmonyMultiplier) };
        }
      }
    },
    {
      id: 'resonance_storm', name: 'レゾナンスストーム', icon: 'thunderstorm', statDependency: 'MAT',
      maxLevel: 10,
      levels: advancedLevels(
        [30, 35, 40, 46, 52, 58, 66, 74, 84, 96],
        [0.55, 0.62, 0.69, 0.76, 0.84, 0.92, 1, 1.08, 1.18, 1.3].map((multiplier, i) => ({ multiplier, pulseMp: 3 + i, harmonyMultiplier: .1, harmonyPulse: 2 }))
      ),
      getDescription: lc => `敵全体へ${lc.multiplier.toFixed(2)}倍の雷属性魔法攻撃。【現職時】共鳴で威力と味方全体のMP回復量が増加（基本${lc.pulseMp}）`,
      execute(caster, levelConfig, battle) {
        const targets = battle.enemies.filter(enemy => !enemy.isDead);
        if (targets.length === 0) return;
        const harmony = isConductor(caster) ? (caster._conductorHarmony || 0) : 0;
        if (isConductor(caster)) caster._conductorHarmony = 0;
        getLivingAllies(caster, battle).forEach(ally => restoreMp(ally, levelConfig.pulseMp + harmony * levelConfig.harmonyPulse, battle));
        animateSkill(caster, targets, 'storm', target => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: 'MAT', actionName: '', damageType: 'skill', hideActionName: true,
            damageMultiplier: levelConfig.multiplier + harmony * levelConfig.harmonyMultiplier,
            element: 'thunder', isAoEProcessed: true
          });
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (targets.length < 2) return null;
          const harmony = isConductor(caster) ? (caster._conductorHarmony || 0) : 0;
          return { target: targets[0], score: 38 * targets.length * (levelConfig.multiplier + harmony * levelConfig.harmonyMultiplier) };
        }
      }
    },
    {
      id: 'grand_symphony', name: 'グランド・シンフォニー', icon: 'queue_music', statDependency: 'MAT',
      maxLevel: 10,
      levels: advancedLevels(
        [70, 78, 86, 94, 104, 114, 126, 138, 152, 170],
        [1.25, 1.38, 1.51, 1.64, 1.78, 1.92, 2.08, 2.24, 2.42, 2.65].map((multiplier, i) => ({ multiplier, restoreMp: 18 + i * 6, recoverMp: 5 + Math.floor(i * 1.5), duration: 2 }))
      ),
      getDescription: lc => `敵全体へ${lc.multiplier.toFixed(2)}倍の光属性魔法攻撃。【現職時】味方全体のMPを${lc.restoreMp}回復し、マナフローも付与する`,
      execute(caster, levelConfig, battle) {
        const targets = battle.enemies.filter(enemy => !enemy.isDead);
        if (targets.length === 0) return;
        if (isConductor(caster)) caster._conductorHarmony = 0;
        getLivingAllies(caster, battle).forEach(ally => {
          restoreMp(ally, levelConfig.restoreMp, battle);
          ally._manaFlowAmount = Math.max(ally._manaFlowAmount || 0, levelConfig.recoverMp);
          ally._manaFlowTurns = Math.max(ally._manaFlowTurns || 0, levelConfig.duration);
        });
        animateSkill(caster, targets, 'finale', target => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: 'MAT', actionName: '', damageType: 'skill', hideActionName: true,
            damageMultiplier: levelConfig.multiplier, element: 'light', isAoEProcessed: true
          });
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (targets.length === 0) return null;
          const missingMana = context.party.filter(member => !member.isDead && member.mp)
            .reduce((total, member) => total + 1 - currentMpOf(member) / Math.max(1, maxMpOf(member)), 0);
          if (targets.length >= 2 || (isConductor(caster) && missingMana >= 1.2)) {
            return { target: targets[0], score: 72 + targets.length * 15 + missingMana * 25 };
          }
          return null;
        }
      }
    },
    {
      id: 'conductor_core', name: 'コンダクター・コア', icon: 'hub', type: 'passive',
      maxLevel: 10,
      levels: activeLevels(
        Array(10).fill(0),
        [5, 7, 9, 11, 13, 15, 17, 20, 23, 27].map((bonusMpPercent, i) => ({ bonusMpPercent, maxHarmony: i < 3 ? 2 : i < 6 ? 3 : i < 9 ? 4 : 5 }))
      ),
      getDescription: lc => `最大MP+${lc.bonusMpPercent}%。【現職時】味方へMPを渡すたび共鳴を蓄積（最大${lc.maxHarmony}）、攻撃技を強化する`
    },
    {
      id: 'mana_orchestra', name: 'マナオーケストラ', icon: 'graphic_eq', type: 'passive',
      maxLevel: 10,
      levels: advancedLevels(
        Array(10).fill(0),
        [2, 3, 4, 5, 6, 8, 10, 12, 15, 18].map(recoverMp => ({ recoverMp }))
      ),
      getDescription: lc => `行動終了時、味方全体のMPを${lc.recoverMp}回復する`
    }
  ]
};
