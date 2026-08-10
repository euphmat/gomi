import { getBattleAnimationSpeed, getBattleSpeed, shouldSkipBattleAnimations } from '../utils/battle-animation.js';

const isSlimeSinger = caster => ['slime_singer'].includes(caster?.jobId || caster?.job);

const levelCosts = [2, 2, 2, 3, 3, 3, 4, 4, 4, 6];
const makeLevels = configs => configs.map((config, index) => ({
  level: index + 1,
  spCost: levelCosts[index],
  ...config
}));

const NOTE_ELEMENTS = ['water', 'grass', 'fire', 'ice', 'thunder', 'wind', 'earth', 'light', 'dark'];
const ELEMENT_COLORS = {
  water: '#38bdf8', grass: '#84cc16', fire: '#fb7185', ice: '#a5f3fc',
  thunder: '#fde047', wind: '#6ee7b7', earth: '#d97706', light: '#fef08a', dark: '#a78bfa'
};

const getOffensiveTargets = (caster, battle) => {
  if (caster.activeAilment?.type === 'confusion'
    && battle.selectedEnemyTarget
    && battle.party.includes(battle.selectedEnemyTarget)) {
    return battle.party.filter(member => !member.isDead);
  }
  return battle.enemies.filter(enemy => !enemy.isDead);
};

const getPrimaryTarget = (caster, battle) => {
  const targets = getOffensiveTargets(caster, battle);
  return targets.includes(battle.selectedEnemyTarget) ? battle.selectedEnemyTarget : targets[0] || null;
};

const getLivingAllies = (caster, battle) => {
  const group = battle.enemies.includes(caster) ? battle.enemies : battle.party;
  return group.filter(member => !member.isDead);
};

const addNotes = (caster, amount, battle) => {
  if (!isSlimeSinger(caster) || amount <= 0) return;
  const passive = battle._findSkill?.(caster, 'resonant_gel');
  if (!passive?.levelConfig) return;
  const before = caster._slimeSingerNotes || 0;
  caster._slimeSingerNotes = Math.min(passive.levelConfig.maxNotes, before + amount);
  if (caster._slimeSingerNotes > before) {
    battle.showDamage(caster.elementId, `ぷるぷる音符 ${caster._slimeSingerNotes}`, 'text-cyan-300');
  }
};

const restoreHp = (target, amount, battle) => {
  const maxHp = target.stats?.hp || target.hp?.max || target.maxHp || 1;
  const currentHp = target.hp ? target.hp.current : target.currentHp;
  const recovered = Math.max(0, Math.min(amount, maxHp - currentHp));
  if (recovered <= 0) return 0;
  if (target.hp) target.hp.current += recovered;
  else target.currentHp += recovered;
  battle.showDamage(target.elementId, `+${recovered}`, 'text-emerald-300');
  return recovered;
};

const restoreMp = (target, amount, battle) => {
  if (!target.mp || amount <= 0) return 0;
  const maxMp = target.stats?.mp || target.mp.max || 0;
  const recovered = Math.max(0, Math.min(amount, maxMp - target.mp.current));
  if (recovered <= 0) return 0;
  target.mp.current += recovered;
  battle.showDamage(target.elementId, `+${recovered} MP`, 'text-cyan-200');
  return recovered;
};

const animateSkill = (caster, targets, type, onImpact) => {
  const targetList = Array.isArray(targets) ? targets : [targets];
  if (shouldSkipBattleAnimations() || typeof document === 'undefined') {
    targetList.forEach((target, index) => onImpact?.(target, index));
    return;
  }

  const speed = getBattleAnimationSpeed(getBattleSpeed());
  const layer = document.getElementById('battle-effects-layer') || document.body;
  targetList.forEach((target, index) => {
    const targetEl = document.getElementById(target?.elementId);
    const rect = targetEl?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    setTimeout(() => {
      const effect = document.createElement('div');
      const isFinale = type === 'king_chorus';
      effect.style.cssText = `position:fixed;left:${x - 55}px;top:${y - 55}px;width:110px;height:110px;border-radius:${isFinale ? '44% 56% 48% 52%' : '50%'};border:${isFinale ? 6 : 4}px solid ${isFinale ? '#fde68a' : '#67e8f9'};background:radial-gradient(circle,rgba(255,255,255,.82),rgba(34,211,238,.34) 34%,rgba(59,130,246,.12) 58%,transparent 72%);box-shadow:0 0 ${isFinale ? 30 : 18}px ${isFinale ? '#facc15' : '#22d3ee'},inset 0 0 18px #60a5fa;z-index:9999;pointer-events:none;mix-blend-mode:screen;display:flex;align-items:center;justify-content:center;color:white;font-size:${isFinale ? 45 : 34}px;text-shadow:0 0 8px #0ea5e9;`;
      effect.textContent = isFinale ? '♔♫' : type === 'barrier' ? '♬' : type === 'heal' ? '♪' : '♫';
      layer.appendChild(effect);
      const duration = (isFinale ? 720 : 480) / speed;
      effect.animate([
        { transform: 'scale(.08) rotate(-45deg)', opacity: 0 },
        { transform: 'scale(1.12) rotate(18deg)', opacity: 1, offset: .5 },
        { transform: 'scale(1.55) rotate(55deg)', opacity: 0 }
      ], { duration, easing: 'ease-out' }).onfinish = () => effect.remove();
      setTimeout(() => onImpact?.(target, index), duration * .52);
    }, index * 85 / speed);
  });
};

export const slime_singer = {
  id: 'slime_singer',
  name: 'スライムシンガー',
  icon: 'music_cast',
  image: './assets/job/job_slime_singer.png',
  changeCost: 500000,
  requirements: [
    { jobId: 'bird', level: 100 },
    { jobId: 'slime_master', level: 100 }
  ],
  skills: [
    {
      id: 'jelly_note', name: 'ジェリーノート', icon: 'music_note', statDependency: 'MAT',
      actionNameClass: 'text-cyan-200', actionNameBorderClass: 'border-lime-400/60',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 18, multiplier: 1.35 }, { mpCost: 21, multiplier: 1.48 },
        { mpCost: 24, multiplier: 1.61 }, { mpCost: 28, multiplier: 1.76 },
        { mpCost: 32, multiplier: 1.92 }, { mpCost: 37, multiplier: 2.08 },
        { mpCost: 42, multiplier: 2.26 }, { mpCost: 48, multiplier: 2.45 },
        { mpCost: 55, multiplier: 2.65 }, { mpCost: 64, multiplier: 2.90 }
      ]),
      getDescription: lc => `敵単体へランダム属性の${lc.multiplier.toFixed(2)}倍魔法攻撃。睡眠中の対象には威力1.6倍。【現職時】ぷるぷる音符+1`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const target = getPrimaryTarget(caster, battle);
        if (!target) return;
        const element = NOTE_ELEMENTS[Math.floor(Math.random() * NOTE_ELEMENTS.length)];
        const sleeping = target.activeAilment?.type === 'sleep';
        addNotes(caster, 1, battle);
        animateSkill(caster, target, 'note', () => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: 'MAT', actionName: '', damageType: 'skill', hideActionName: true,
            damageMultiplier: lc.multiplier * (sleeping ? 1.6 : 1), element,
            effectColor: ELEMENT_COLORS[element]
          });
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const target = targets.find(enemy => enemy.activeAilment?.type === 'sleep')
            || (targets.includes(context.selectedEnemyTarget) ? context.selectedEnemyTarget : targets[0]);
          return { target, score: 48 * lc.multiplier * (target.activeAilment?.type === 'sleep' ? 1.6 : 1) };
        }
      }
    },
    {
      id: 'puyopuyo_chorus', name: 'ぷるぷるコーラス', icon: 'queue_music', statDependency: 'MAT',
      actionNameClass: 'text-blue-200', actionNameBorderClass: 'border-cyan-400/60',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 32, multiplier: .55, chance: 24 }, { mpCost: 36, multiplier: .61, chance: 27 },
        { mpCost: 41, multiplier: .67, chance: 30 }, { mpCost: 46, multiplier: .74, chance: 34 },
        { mpCost: 52, multiplier: .81, chance: 38 }, { mpCost: 59, multiplier: .88, chance: 42 },
        { mpCost: 67, multiplier: .96, chance: 46 }, { mpCost: 76, multiplier: 1.05, chance: 50 },
        { mpCost: 86, multiplier: 1.15, chance: 55 }, { mpCost: 98, multiplier: 1.28, chance: 62 }
      ]),
      getDescription: lc => `敵全体へ${lc.multiplier.toFixed(2)}倍の水属性魔法攻撃を行い、${lc.chance}%の確率で睡眠を付与。【現職時】ぷるぷる音符+1`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getOffensiveTargets(caster, battle);
        if (!targets.length) return;
        addNotes(caster, 1, battle);
        animateSkill(caster, targets, 'chorus', target => {
          if (target.isDead) return;
          const originalAilments = caster.stats.attackAilments;
          caster.stats.attackAilments = { ...(originalAilments || {}), sleep: lc.chance };
          battle.executeAttack(caster, target, true, {
            statDependency: 'MAT', actionName: '', damageType: 'skill', hideActionName: true,
            damageMultiplier: lc.multiplier, element: 'water', isAoEProcessed: true
          });
          caster.stats.attackAilments = originalAilments;
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (targets.length < 2) return null;
          const awake = targets.filter(enemy => enemy.activeAilment?.type !== 'sleep').length;
          return awake ? { target: targets[0], score: 38 * lc.multiplier * targets.length + awake * 14 } : null;
        }
      }
    },
    {
      id: 'elastic_refrain', name: '弾力のリフレイン', icon: 'shield_moon',
      actionNameClass: 'text-lime-200', actionNameBorderClass: 'border-cyan-400/60',
      maxLevel: 10,
      limitBreakMaximums: { amount: 90 },
      levels: makeLevels([
        { mpCost: 36, barrierMatkPercent: 35, amount: 10, turns: 3 }, { mpCost: 41, barrierMatkPercent: 42, amount: 13, turns: 3 },
        { mpCost: 46, barrierMatkPercent: 49, amount: 16, turns: 3 }, { mpCost: 52, barrierMatkPercent: 57, amount: 19, turns: 3 },
        { mpCost: 59, barrierMatkPercent: 65, amount: 22, turns: 4 }, { mpCost: 67, barrierMatkPercent: 74, amount: 25, turns: 4 },
        { mpCost: 76, barrierMatkPercent: 84, amount: 28, turns: 4 }, { mpCost: 86, barrierMatkPercent: 95, amount: 31, turns: 4 },
        { mpCost: 97, barrierMatkPercent: 107, amount: 35, turns: 5 }, { mpCost: 110, barrierMatkPercent: 120, amount: 40, turns: 5 }
      ]),
      getDescription: lc => `味方全体にMATKの${lc.barrierMatkPercent}%分のバリアを付与し、状態異常耐性を${lc.amount}上昇（${lc.turns}ターン）。【現職時】ぷるぷる音符+1`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getLivingAllies(caster, battle);
        const barrier = Math.max(1, Math.floor((caster.stats?.matk || 1) * lc.barrierMatkPercent / 100));
        addNotes(caster, 1, battle);
        animateSkill(caster, targets, 'barrier', target => {
          target._barrierHp = Math.max(target._barrierHp || 0, barrier);
          target._barrierTurns = Math.max(target._barrierTurns || 0, lc.turns);
          target._ailmentResistBuffAmount = Math.max(target._ailmentResistBuffAmount || 0, lc.amount);
          target._ailmentResistBuffTurns = Math.max(target._ailmentResistBuffTurns || 0, lc.turns);
          battle.showDamage(target.elementId, `BARRIER +${barrier}`, 'text-lime-200');
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const allies = context.party.filter(member => !member.isDead);
          const exposed = allies.filter(member => !(member._barrierHp > 0) || !(member._ailmentResistBuffTurns > 0));
          return exposed.length >= Math.ceil(allies.length / 2)
            ? { target: caster, score: 82 + exposed.length * 14 + lc.amount }
            : null;
        }
      }
    },
    {
      id: 'healing_refrain', name: '癒やしのリフレイン', icon: 'healing',
      actionNameClass: 'text-emerald-200', actionNameBorderClass: 'border-cyan-400/60',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 42, healMatkPercent: 38, recoverMp: 3 }, { mpCost: 48, healMatkPercent: 44, recoverMp: 4 },
        { mpCost: 54, healMatkPercent: 51, recoverMp: 5 }, { mpCost: 61, healMatkPercent: 59, recoverMp: 6 },
        { mpCost: 69, healMatkPercent: 68, recoverMp: 7 }, { mpCost: 78, healMatkPercent: 78, recoverMp: 8 },
        { mpCost: 88, healMatkPercent: 89, recoverMp: 10 }, { mpCost: 99, healMatkPercent: 101, recoverMp: 12 },
        { mpCost: 111, healMatkPercent: 114, recoverMp: 15 }, { mpCost: 124, healMatkPercent: 130, recoverMp: 18 }
      ]),
      getDescription: lc => `味方全体のHPをMATKの${lc.healMatkPercent}%、MPを${lc.recoverMp}回復。【現職時】ぷるぷる音符+1`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getLivingAllies(caster, battle);
        const heal = Math.max(1, Math.floor((caster.stats?.matk || 1) * lc.healMatkPercent / 100));
        addNotes(caster, 1, battle);
        animateSkill(caster, targets, 'heal', target => {
          restoreHp(target, heal, battle);
          restoreMp(target, lc.recoverMp, battle);
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const allies = context.party.filter(member => !member.isDead);
          const need = allies.reduce((score, member) => {
            const maxHp = member.stats?.hp || member.hp?.max || 1;
            const hp = member.hp?.current ?? member.currentHp ?? 0;
            const maxMp = member.stats?.mp || member.mp?.max || 1;
            const mp = member.mp?.current ?? maxMp;
            return score + (1 - hp / Math.max(1, maxHp)) * 100 + (1 - mp / Math.max(1, maxMp)) * 28;
          }, 0);
          return need >= 50 ? { target: caster, score: 72 + need } : null;
        }
      }
    },
    {
      id: 'king_slime_chorus', name: 'キングスライム大合唱', icon: 'crown', statDependency: 'MAT',
      actionNameClass: 'text-yellow-100', actionNameBorderClass: 'border-cyan-300/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 72, multiplier: 1.05, noteMultiplier: .22 }, { mpCost: 80, multiplier: 1.17, noteMultiplier: .24 },
        { mpCost: 89, multiplier: 1.29, noteMultiplier: .26 }, { mpCost: 99, multiplier: 1.42, noteMultiplier: .28 },
        { mpCost: 110, multiplier: 1.55, noteMultiplier: .30 }, { mpCost: 122, multiplier: 1.69, noteMultiplier: .32 },
        { mpCost: 135, multiplier: 1.84, noteMultiplier: .34 }, { mpCost: 149, multiplier: 2.00, noteMultiplier: .36 },
        { mpCost: 164, multiplier: 2.17, noteMultiplier: .39 }, { mpCost: 182, multiplier: 2.36, noteMultiplier: .42 }
      ]),
      getDescription: lc => `敵全体へ${lc.multiplier.toFixed(2)}倍の光属性魔法攻撃。【現職時】ぷるぷる音符を全消費し、1個ごとに威力+${lc.noteMultiplier.toFixed(2)}倍`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getOffensiveTargets(caster, battle);
        if (!targets.length) return;
        const notes = isSlimeSinger(caster) ? (caster._slimeSingerNotes || 0) : 0;
        if (isSlimeSinger(caster)) caster._slimeSingerNotes = 0;
        animateSkill(caster, targets, 'king_chorus', target => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: 'MAT', actionName: '', damageType: 'skill', hideActionName: true,
            damageMultiplier: lc.multiplier + notes * lc.noteMultiplier,
            element: 'light', isAoEProcessed: true
          });
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const notes = isSlimeSinger(caster) ? (caster._slimeSingerNotes || 0) : 0;
          if (targets.length < 2 && notes < 3) return null;
          return { target: targets[0], score: 42 * targets.length * (lc.multiplier + notes * lc.noteMultiplier) };
        }
      }
    },
    {
      id: 'resonant_gel', name: '共鳴ジェル', icon: 'graphic_eq', type: 'passive',
      maxLevel: 10,
      levels: makeLevels([
        { bonusMatkPercent: 3, bonusMdefPercent: 3, maxNotes: 2 },
        { bonusMatkPercent: 5, bonusMdefPercent: 5, maxNotes: 2 },
        { bonusMatkPercent: 7, bonusMdefPercent: 7, maxNotes: 2 },
        { bonusMatkPercent: 9, bonusMdefPercent: 9, maxNotes: 3 },
        { bonusMatkPercent: 11, bonusMdefPercent: 11, maxNotes: 3 },
        { bonusMatkPercent: 13, bonusMdefPercent: 13, maxNotes: 3 },
        { bonusMatkPercent: 16, bonusMdefPercent: 16, maxNotes: 4 },
        { bonusMatkPercent: 19, bonusMdefPercent: 19, maxNotes: 4 },
        { bonusMatkPercent: 22, bonusMdefPercent: 22, maxNotes: 4 },
        { bonusMatkPercent: 25, bonusMdefPercent: 25, maxNotes: 5 }
      ]),
      getDescription: lc => `MATK・MDEF+${lc.bonusMatkPercent}%。【現職時】技の使用でぷるぷる音符を最大${lc.maxNotes}個まで蓄積する`
    }
  ]
};
