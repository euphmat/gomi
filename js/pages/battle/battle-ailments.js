/**
 * battle-ailments.js
 * 状態異常処理 (poison, burn, paralysis, sleep, confusion 等)
 */

export const ailmentMethods = {
  processPreActionAilment(entity) {
    if (!entity.activeAilment) return false;
    
    const ailment = entity.activeAilment.type;
    let skipTurn = false;
    
    entity.activeAilment.duration--;
    
    if (ailment === 'poison') {
      const maxHp = entity.hp ? (entity.stats?.hp || entity.hp.max) : entity.maxHp;
      const dmg = Math.max(1, Math.floor(maxHp * 0.2));
      this.takeAilmentDamage(entity, dmg, 'POISON');
    } else if (ailment === 'burn') {
      const maxHp = entity.hp ? (entity.stats?.hp || entity.hp.max) : entity.maxHp;
      const dmg = Math.max(1, Math.floor(maxHp * 0.15));
      this.takeAilmentDamage(entity, dmg, 'BURN');
    } else if (ailment === 'paralysis') {
      if (Math.random() < 0.75) {
        skipTurn = true;
      }
    } else if (ailment === 'sleep') {
      skipTurn = true;
    }
    
    if (entity.activeAilment && entity.activeAilment.duration <= 0 && !skipTurn) {
      entity.activeAilment = null;
    } else if (entity.activeAilment && entity.activeAilment.duration <= 0 && skipTurn) {
      setTimeout(() => {
        entity.activeAilment = null;
        if (!document.hidden) this.renderEntities();
      }, 1000 / this.speedMult);
    }
    
    return skipTurn || entity.isDead;
  },

  takeAilmentDamage(entity, damage, ailmentName) {
    if (this.isStopped) return;
    if (entity.isDead) return;
    damage = Math.max(1, damage);
    
    let originalDamage = damage;
    if (ailmentName === 'CURSE' && entity._barrierHp && entity._barrierHp > 0) {
      if (entity._barrierHp >= damage) {
        entity._barrierHp -= damage;
        damage = 0;
      } else {
        damage -= entity._barrierHp;
        entity._barrierHp = 0;
      }
    }

    if (damage > 0) {
      if (entity.hp) {
        entity.hp.current -= damage;
        if (entity.hp.current <= 0) {
           entity.hp.current = 0;
           entity.isDead = true;
           this.clearEntityStatuses(entity);
           this.lastKilledBy = {
             monsterId: 'ailment', monsterName: ailmentName, monsterImage: '', actionName: ailmentName
           };
        }
      } else {
        entity.currentHp -= damage;
        if (entity.currentHp <= 0) {
           entity.currentHp = 0;
           entity.isDead = true;
           this.clearEntityStatuses(entity);
           this.processEnemyDeath(entity);
        }
      }
    }
    this.showDamage(entity.elementId, originalDamage, 'text-purple-400');
  },

  executeConfusionTurn(entity, isParty) {
    if (this.isStopped) return;
    entity.atb = 0;
    if (isParty) this.activeCharacter = null;
    else this.activeEnemy = null;
    
    const aliveParty = this.party.filter(p => !p.isDead);
    const aliveEnemies = this.enemies.filter(e => !e.isDead);
    const allAlive = [...aliveParty, ...aliveEnemies];
    if (allAlive.length === 0) return;
    
    const target = allAlive[Math.floor(Math.random() * allAlive.length)];
    
    setTimeout(() => {
      let skillUsed = false;
      if (isParty) {
        const usableSkills = [];
        if (entity._skillCache) {
          for (const [skillId, cacheData] of entity._skillCache.entries()) {
            const { level, def, levelConfig } = cacheData;
            if (level > 0 && def && levelConfig && def.type !== 'passive' && !def.isPassive) {
              if (entity.mp && entity.mp.current >= levelConfig.mpCost) {
                usableSkills.push({ skillId, def, levelConfig });
              }
            }
          }
        }
        if (usableSkills.length > 0) {
          const skillObj = usableSkills[Math.floor(Math.random() * usableSkills.length)];
          const prevTarget = this.selectedEnemyTarget;
          this.selectedEnemyTarget = target;
          this.executeSkill(entity, skillObj.def, skillObj.levelConfig);
          this.selectedEnemyTarget = prevTarget;
          skillUsed = true;
        }
      } else {
        const usableSkills = [];
        if (entity.actions && entity.actions.length > 0) {
          for (const action of entity.actions) {
            if (action.execute) {
              usableSkills.push(action);
            }
          }
        }
        if (usableSkills.length > 0) {
          const actionObj = usableSkills[Math.floor(Math.random() * usableSkills.length)];
          actionObj.execute(entity, target, this);
          skillUsed = true;
        }
      }

      if (!skillUsed) {
        this.executeAttack(entity, target, isParty);
      }
    }, 500 / this.speedMult);
  }
};
