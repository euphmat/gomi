// ─── Animation Utilities ──────────────────────────────────────
const playSkillAnimation = (caster, targets, type, onImpact) => {
  if (!Array.isArray(targets)) targets = [targets];
  if (localStorage.getItem('disableBattleAnimations') === 'true') {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
    return;
  }

  targets.forEach((target, index) => {
    const targetEl = document.getElementById(target.elementId);
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    if (targetEl) {
      const targetRect = targetEl.getBoundingClientRect();
      tx = targetRect.left + targetRect.width / 2;
      ty = targetRect.top + targetRect.height / 2;
    } else {
      if (onImpact) onImpact(target, index);
      return;
    }

    setTimeout(() => {
      switch (type) {
        case 'lullaby': {
          for (let i = 0; i < 3; i++) {
            setTimeout(() => {
              const el = document.createElement('div');
              el.style.position = 'fixed';
              el.style.left = `${tx - 15 + (Math.random() * 30 - 15)}px`;
              el.style.top = `${ty - 15 + (Math.random() * 30 - 15)}px`;
              el.style.width = '30px';
              el.style.height = '30px';
              el.style.fontSize = '24px';
              el.style.color = '#f9a8d4';
              el.style.textShadow = '0 0 5px #ec4899';
              el.innerHTML = '♪';
              el.style.zIndex = '9999';
              el.style.pointerEvents = 'none';
              document.body.appendChild(el);

              const anim = el.animate([
                { transform: 'translate(0, 0) scale(0)', opacity: 0 },
                { transform: 'translate(0, -20px) scale(1.2)', opacity: 1, offset: 0.5 },
                { transform: `translate(${Math.random() * 40 - 20}px, -40px) scale(0.8)`, opacity: 0 }
              ], { duration: 1000 + Math.random() * 500, easing: 'ease-out' });

              anim.onfinish = () => el.remove();
            }, i * 200);
          }
          setTimeout(() => { if (onImpact) onImpact(target, index); }, 600);
          break;
        }
        case 'nightmare': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 50}px`;
          el.style.top = `${ty - 50}px`;
          el.style.width = '100px';
          el.style.height = '100px';
          el.style.background = 'radial-gradient(circle, rgba(0,0,0,0.8), rgba(76,29,149,0.8), transparent)';
          el.style.borderRadius = '50%';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          document.body.appendChild(el);

          const anim = el.animate([
            { transform: 'scale(0.1)', opacity: 0 },
            { transform: 'scale(1.5)', opacity: 1, offset: 0.7 },
            { transform: 'scale(2)', opacity: 0 }
          ], { duration: 600, easing: 'ease-in' });

          anim.onfinish = () => el.remove();
          
          setTimeout(() => { if (onImpact) onImpact(target, index); }, 400);
          break;
        }
        case 'warding_song': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 60}px`;
          el.style.top = `${ty - 60}px`;
          el.style.width = '120px';
          el.style.height = '120px';
          el.style.borderRadius = '50%';
          el.style.border = '4px solid #93c5fd';
          el.style.boxShadow = '0 0 15px #3b82f6 inset, 0 0 15px #3b82f6';
          el.style.background = 'radial-gradient(circle, rgba(147, 197, 253, 0.2), transparent)';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          document.body.appendChild(el);

          const note = document.createElement('div');
          note.style.position = 'absolute';
          note.style.left = '45px';
          note.style.top = '10px';
          note.style.fontSize = '30px';
          note.style.color = '#93c5fd';
          note.innerHTML = '♫';
          el.appendChild(note);

          const anim = el.animate([
            { transform: 'scale(0) translateY(20px)', opacity: 0 },
            { transform: 'scale(1.2) translateY(0)', opacity: 1, offset: 0.5 },
            { transform: 'scale(1) translateY(-20px)', opacity: 0 }
          ], { duration: 800, easing: 'ease-out' });

          anim.onfinish = () => el.remove();
          
          setTimeout(() => { if (onImpact) onImpact(target, index); }, 400);
          break;
        }
      }
    }, index * 100);
  });
};

export const bird = {
  id: 'bird',
  name: 'バード',
  icon: 'mic',
  changeCost: 300000,
  skills: [
    {
      id: 'lullaby', name: 'こもりうた', icon: 'music_note',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 12, chance: 30 },
        { level:  2, spCost: 1, mpCost: 14, chance: 35 },
        { level:  3, spCost: 1, mpCost: 16, chance: 40 },
        { level:  4, spCost: 2, mpCost: 18, chance: 45 },
        { level:  5, spCost: 2, mpCost: 20, chance: 50 },
        { level:  6, spCost: 2, mpCost: 22, chance: 55 },
        { level:  7, spCost: 3, mpCost: 25, chance: 60 },
        { level:  8, spCost: 3, mpCost: 28, chance: 65 },
        { level:  9, spCost: 3, mpCost: 30, chance: 75 },
        { level: 10, spCost: 5, mpCost: 35, chance: 80 }
      ],
      getDescription: (levelConfig) => `MP を ${levelConfig.mpCost} 消費し、敵全体を ${levelConfig.chance}％ の確率で睡眠状態にする`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let targetGroup = battle.enemies;
        if (battle.selectedEnemyTarget && battle.party.includes(battle.selectedEnemyTarget)) {
          targetGroup = battle.party;
        }
        const targets = targetGroup.filter(e => !e.isDead);
        if (targets.length === 0) return;

        battle.showActionName(caster.elementId, 'こもりうた', 'text-pink-300', 'border-pink-500/50');
        playSkillAnimation(caster, targets, 'lullaby', (target, index) => {
            if (target.isDead) return;
            const origA = caster.stats.attackAilments;
            caster.stats.attackAilments = { ...(origA || {}), sleep: levelConfig.chance };
            battle.executeAttack(caster, target, true, { damageType: 'skill', hideActionName: true,
                actionName: 'こもりうた', damageMultiplier: 0.1, isMagic: true, damageType: 'skill', hideActionName: true, skipAtbReset: index > 0, isAoEProcessed: true
            });
            caster.stats.attackAilments = origA;
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          const awakeEnemies = aliveEnemies.filter(e => !e.activeAilment || e.activeAilment.type !== 'sleep');
          if (awakeEnemies.length >= 1) {
             return { target: awakeEnemies[0], score: 60 + (awakeEnemies.length * 20) };
          }
          return null;
        }
      }
    },
    {
      id: 'nightmare', name: 'ナイトメア', icon: 'dark_mode', statDependency: 'MATK',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 15, multiplier: 2.0 },
        { level:  2, spCost: 1, mpCost: 18, multiplier: 2.5 },
        { level:  3, spCost: 1, mpCost: 22, multiplier: 3.0 },
        { level:  4, spCost: 2, mpCost: 25, multiplier: 3.5 },
        { level:  5, spCost: 2, mpCost: 30, multiplier: 4.5 },
        { level:  6, spCost: 2, mpCost: 35, multiplier: 5.5 },
        { level:  7, spCost: 3, mpCost: 40, multiplier: 6.5 },
        { level:  8, spCost: 3, mpCost: 45, multiplier: 8.0 },
        { level:  9, spCost: 3, mpCost: 50, multiplier: 10.0 },
        { level: 10, spCost: 5, mpCost: 65, multiplier: 15.0 }
      ],
      getDescription: (levelConfig) => `MP を ${levelConfig.mpCost} 消費し、睡眠状態の敵単体に ${levelConfig.multiplier.toFixed(1)} 倍の闇属性魔法攻撃。対象が睡眠状態でなければ失敗する`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead || !target.activeAilment || target.activeAilment.type !== 'sleep') {
            target = battle.enemies.find(e => !e.isDead && e.activeAilment && e.activeAilment.type === 'sleep');
        }
        if (!target) {
            target = battle.enemies.find(e => !e.isDead);
        }
        
        if (target) {
            if (target.activeAilment && target.activeAilment.type === 'sleep') {
                playSkillAnimation(caster, [target], 'nightmare', () => {
                    battle.executeAttack(caster, target, true, { damageType: 'skill', hideActionName: true,
                        statDependency: this.statDependency, actionName: 'ナイトメア', damageMultiplier: levelConfig.multiplier, isMagic: true, damageType: 'skill', element: 'dark'
                    });
                });
            } else {
                battle.showActionName(caster.elementId, 'ナイトメア', 'text-gray-400');
                battle.showDamage(target.elementId, 'MISS', 'text-gray-400');
            }
        }
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          const sleepingEnemies = aliveEnemies.filter(e => e.activeAilment && e.activeAilment.type === 'sleep');
          if (sleepingEnemies.length > 0) {
              const bestTarget = sleepingEnemies.reduce((prev, curr) => (prev.currentHp > curr.currentHp) ? prev : curr);
              return { target: bestTarget, score: 150 + (levelConfig.multiplier * 10) };
          }
          return null;
        }
      }
    },
    {
      id: 'warding_song', name: '破邪の歌', icon: 'shield_moon',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 10, amount: 15, turns: 3 },
        { level:  2, spCost: 1, mpCost: 12, amount: 20, turns: 3 },
        { level:  3, spCost: 1, mpCost: 14, amount: 25, turns: 3 },
        { level:  4, spCost: 2, mpCost: 18, amount: 30, turns: 4 },
        { level:  5, spCost: 2, mpCost: 20, amount: 35, turns: 4 },
        { level:  6, spCost: 2, mpCost: 24, amount: 40, turns: 4 },
        { level:  7, spCost: 3, mpCost: 28, amount: 45, turns: 5 },
        { level:  8, spCost: 3, mpCost: 32, amount: 50, turns: 5 },
        { level:  9, spCost: 3, mpCost: 36, amount: 55, turns: 5 },
        { level: 10, spCost: 5, mpCost: 50, amount: 60, turns: 5 }
      ],
      getDescription: (levelConfig) => `MP を ${levelConfig.mpCost} 消費し、${levelConfig.turns} ターンの間、味方全体の状態異常耐性を ${levelConfig.amount} 上昇させる`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let targetGroup = battle.party;
        if (battle.selectedEnemyTarget && battle.enemies.includes(battle.selectedEnemyTarget)) {
          targetGroup = battle.enemies;
        }
        const targets = targetGroup.filter(p => !p.isDead);
        battle.showActionName(caster.elementId, '破邪の歌', 'text-blue-300', 'border-blue-500/50');
        playSkillAnimation(caster, targets, 'warding_song', (target) => {
            target._ailmentResistBuffAmount = levelConfig.amount;
            target._ailmentResistBuffTurns = levelConfig.turns;
            battle.showDamage(target.elementId, 'RESIST UP', 'text-blue-300');
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveParty = context.party.filter(p => !p.isDead);
          const buffedCount = aliveParty.filter(p => p._ailmentResistBuffTurns && p._ailmentResistBuffTurns > 0).length;
          if (buffedCount === 0) {
              return { target: caster, score: 150 };
          } else if (buffedCount < aliveParty.length / 2) {
              return { target: caster, score: 90 };
          }
          return null;
        }
      }
    },
    {
      id: 'healing_song', name: 'いやしの歌', icon: 'favorite', type: 'passive',
      maxLevel: 10,
      levels: [
        { level: 1, spCost: 1, healAmount: 5 },
        { level: 2, spCost: 1, healAmount: 10 },
        { level: 3, spCost: 1, healAmount: 15 },
        { level: 4, spCost: 2, healAmount: 20 },
        { level: 5, spCost: 2, healAmount: 25 },
        { level: 6, spCost: 2, healAmount: 30 },
        { level: 7, spCost: 3, healAmount: 35 },
        { level: 8, spCost: 3, healAmount: 40 },
        { level: 9, spCost: 3, healAmount: 45 },
        { level: 10, spCost: 5, healAmount: 50 }
      ],
      getDescription: (levelConfig) => `行動終了時、生存している味方全員の HP を ${levelConfig.healAmount} 回復する`
    }
  ]
};
