/**
 * battle-actions.js
 * 攻撃・スキル・敵ターン実行ロジック
 */

export const actionMethods = {
  clearEntityStatuses(entity) {
    entity.activeAilment = null;
    entity._defBuffTurns = 0;
    entity._defBuffPercent = 0;
    entity._mdefBuffTurns = 0;
    entity._mdefBuffAmount = 0;
    entity._mdefBuffPercent = 0;
    entity._atkBuffTurns = 0;
    entity._atkBuffPercent = 0;
    entity._matkBuffTurns = 0;
    entity._matkBuffPercent = 0;
    entity._provokeTurns = 0;
    entity._provokeChance = 0;
    entity._ailmentResistBuffTurns = 0;
    entity._ailmentResistBuffAmount = 0;
    entity._barrierHp = 0;
    entity._barrierTurns = 0;
    if (entity.atkDebuffTurns > 0) {
      entity.atkDebuffTurns = 0;
      if (entity.stats && entity.originalAtk) {
        entity.stats.atk = entity.originalAtk;
      }
    }
    if (entity.defDebuffTurns > 0) {
      entity.defDebuffTurns = 0;
      if (entity.stats && entity.originalDef) {
        entity.stats.def = entity.originalDef;
      }
    }
  },

  executeSkill(caster, skillDef, levelConfig, options = {}) {
    if (this.isStopped) return;
    if (!options.isDoubleAct && caster.mp && caster.mp.current < levelConfig.mpCost) return;
    if (!options.isDoubleAct && levelConfig.mpCost > 0 && caster.activeAilment && caster.activeAilment.type === 'silence') {
      // this.showActionName(caster.elementId, '沈黙', 'text-indigo-400', 'border-indigo-500/50');
      caster.atb = 0;
      this.activeCharacter = null;
      this.renderEntities();
      return;
    }

    if (!options.isDoubleAct && caster.mp) {
      caster.mp.current -= levelConfig.mpCost;
    }

    // Execution Logic
    // For now, we assume skills like first_aid don't need a specific target besides caster
    // If a skill needs a target, we would check selectedEnemyTarget or allow party target.
    // However, first_aid's execute logic currently handles its own effect:
    
    // Show action name animation
    if (!skillDef.hideActionName) {
      this.showActionName(
        caster.elementId, 
        skillDef.name,
        skillDef.actionNameClass || 'text-green-300',
        skillDef.actionNameBorderClass || 'border-green-500/50'
      );
    }

    if (skillDef.execute) {
      skillDef.execute(caster, levelConfig, this);
    }
    

    // --- Passive: Double Act ---
    if (!options.isDoubleAct && caster.jobSkills) {
      const doubleActSkill = this._findSkill(caster, 'double_act');
      if (doubleActSkill && doubleActSkill.level > 0 && doubleActSkill.levelConfig) {
        if (Math.random() * 100 < doubleActSkill.levelConfig.chance) {
          setTimeout(() => {
            if (caster.hp !== undefined && !caster.isDead) {
              this.showActionName(caster.elementId, 'ダブルアクト', 'text-cyan-300', 'border-cyan-500/50');
              this.executeSkill(caster, skillDef, levelConfig, { isDoubleAct: true });
            }
          }, 600 / this.speedMult);
        }
      }
    }

    // --- Passive: Mana Regen ---
    const regenSkill = this._findSkill(caster, 'mana_regen');
    if (regenSkill && regenSkill.level > 0 && regenSkill.levelConfig) {
      const amount = regenSkill.levelConfig.recoverMp;
      if (amount > 0 && caster.mp.current < (caster.stats?.mp || caster.mp.max)) {
        this.showActionName(caster.elementId, 'マナリジェネ', 'text-blue-300', 'border-blue-500/50');
      }
      caster.mp.current = Math.min(caster.stats?.mp || caster.mp.max, caster.mp.current + amount);
      setTimeout(() => {
        this.showDamage(caster.elementId, `+${amount} MP`, 'text-blue-400');
      }, 300 / this.speedMult);
    }
    
    // --- Passive: Regen (HP) ---
    const hpRegenSkill = this._findSkill(caster, 'regen');
    if (hpRegenSkill && hpRegenSkill.level > 0 && hpRegenSkill.levelConfig) {
      const amount = hpRegenSkill.levelConfig.recoverHp;
      if (amount > 0 && caster.hp.current < (caster.stats?.hp || caster.hp.max)) {
        this.showActionName(caster.elementId, 'リジェネ', 'text-green-300', 'border-green-500/50');
      }
      caster.hp.current = Math.min(caster.stats?.hp || caster.hp.max, caster.hp.current + amount);
      setTimeout(() => {
        this.showDamage(caster.elementId, `+${amount}`, 'text-green-400');
      }, 300 / this.speedMult);
    }

    // --- Passive: Healing Song (いやしの歌) ---
    const healingSongSkill = this._findSkill(caster, 'healing_song');
    if (healingSongSkill && healingSongSkill.level > 0 && healingSongSkill.levelConfig) {
      let triggered = false;
      this.party.forEach(p => {
        if (!p.isDead && p.hp && (p.hp.current < (p.stats?.hp || p.hp.max))) {
          const maxHp = p.stats?.hp || p.hp.max;
          const healAmount = healingSongSkill.levelConfig.healAmount;
          if (healAmount > 0) {
            triggered = true;
            p.hp.current = Math.min(maxHp, p.hp.current + healAmount);
            setTimeout(() => {
              this.showDamage(p.elementId, `+${healAmount}`, 'text-green-400');
            }, 400 / this.speedMult);
          }
        }
      });
      if (triggered) {
        this.showActionName(caster.elementId, 'いやしの歌', 'text-pink-300', 'border-pink-500/50');
      }
    }

    // --- Passive: Energizing ---
    const energizingSkill = this._findSkill(caster, 'energizing');
    if (energizingSkill && energizingSkill.level > 0 && energizingSkill.levelConfig) {
      const amount = energizingSkill.levelConfig.recoverMp;
      let applied = false;
      this.party.forEach(p => {
        if (!p.isDead && p.mp && (p.mp.current < (p.stats?.mp || p.mp.max))) {
          p.mp.current = Math.min(p.stats?.mp || p.mp.max, p.mp.current + amount);
          setTimeout(() => {
            this.showDamage(p.elementId, `+${amount} MP`, 'text-blue-400');
          }, 600 / this.speedMult);
          applied = true;
        }
      });
      if (applied) {
        this.showActionName(caster.elementId, 'エナジャイジング', 'text-orange-300', 'border-orange-500/50');
      }
    }

    caster.atb = 0;
    this.activeCharacter = null;
    this.renderEntities();
    this.checkBattleEnd();
  },

  executeAttack(attacker, defender, isParty, options = {}) {
    if (this.isStopped) return;
    const actionName = options.actionName || '攻撃';

    let isMagic = options.isMagic || false;
    let isHybrid = options.isHybrid || false;
    
    if (options.statDependency) {
      if (options.statDependency === 'MAT') { isMagic = true; isHybrid = false; }
      else if (options.statDependency === 'BOTH') { isHybrid = true; isMagic = false; }
      else if (options.statDependency === 'ATK') { isMagic = false; isHybrid = false; }
    }
    options.isHybrid = isHybrid;

    // --- Passive: Auto Guard (オートガード) ---
    if (!isParty && !options.isAoEProcessed && defender.hp !== undefined) {
      const paladinsWithGuard = this.party.filter(p => !p.isDead && p !== defender && p.job === 'paladin');
      for (const p of paladinsWithGuard) {
        const guardSkill = this._findSkill(p, 'auto_guard');
        if (guardSkill && guardSkill.level > 0 && guardSkill.levelConfig) {
          if (p.equipment && p.equipment.sub && p.equipment.sub.type === 'shield') {
            if (Math.random() * 100 < guardSkill.levelConfig.guardChance) {
              defender = p;
              options.isGuarded = true;
              this.showActionName(p.elementId, 'オートガード', 'text-yellow-300', 'border-yellow-500/50');
              break;
            }
          }
        }
      }
    }

    // --- 暗闇 (Blind) の判定 ---
    if (!isMagic && attacker.activeAilment && attacker.activeAilment.type === 'blind' && !options.hideActionName) {
      if (Math.random() < 0.75) {
        this.showActionName(attacker.elementId, 'MISS', 'text-gray-400', 'border-gray-500/50');
        attacker.atb = 0;
        if (attacker.hp !== undefined) this.activeCharacter = null;
        else this.activeEnemy = null;
        this.renderEntities();
        return;
      }
    }

    // --- 沈黙 (Silence) の判定 ---
    if (isMagic && attacker.activeAilment && attacker.activeAilment.type === 'silence' && !options.hideActionName) {
      this.showActionName(attacker.elementId, '魔法不発', 'text-indigo-400', 'border-indigo-500/50');
      attacker.atb = 0;
      if (attacker.hp !== undefined) this.activeCharacter = null;
      else this.activeEnemy = null;
      this.renderEntities();
      return;
    }

    // --- 華麗なる見切り (Splendid Evasion) の判定 ---
    if (!isMagic && defender.hp !== undefined) {
      const evadeSkill = this._findSkill(defender, 'splendid_evasion');
      if (evadeSkill && evadeSkill.level > 0 && evadeSkill.levelConfig) {
        if (Math.random() < (evadeSkill.levelConfig.evadeChance / 100)) {
          this.showActionName(defender.elementId, '華麗なる見切り', 'text-green-400', 'border-green-500/50');
          if (!options.skipAtbReset && !options.isAoEProcessed) {
            attacker.atb = 0;
            if (attacker.hp !== undefined) this.activeCharacter = null;
            else this.activeEnemy = null;
            this.renderEntities();
          }
          return;
        }
      }
    }

    let atkStat = isMagic ? (attacker.stats.matk || 0) : (attacker.stats.atk || 0);

    // --- Passive: 鬼神の力 (Demon Power) ---
    if (attacker.hp !== undefined) {
      const demonPowerSkill = this._findSkill(attacker, 'demon_power');
      if (demonPowerSkill && demonPowerSkill.level > 0 && demonPowerSkill.levelConfig) {
        const hpRatio = attacker.hp.current / (attacker.stats?.hp || attacker.hp.max);
        if (hpRatio <= 0.5) {
          const mult = demonPowerSkill.levelConfig.atkMatkMultiplier;
          atkStat = Math.floor(atkStat * mult);
        }
      }
    }

    if (!isMagic) {
      const totalAtkPercent = (attacker._passiveAtkBuffPercent || 0) + (attacker._atkBuffTurns > 0 ? (attacker._atkBuffPercent || 0) : 0);
      if (totalAtkPercent !== 0) {
        atkStat = Math.floor(atkStat * (1 + totalAtkPercent / 100));
      }
    }
    if (isMagic) {
      const totalMatkPercent = (attacker._passiveMatkBuffPercent || 0) + (attacker._matkBuffTurns > 0 ? (attacker._matkBuffPercent || 0) : 0);
      if (totalMatkPercent !== 0) {
        atkStat = Math.floor(atkStat * (1 + totalMatkPercent / 100));
      }
    }
    
    let defStat = isMagic ? (defender.stats.mdef || 0) : (defender.stats.def || 0);
    let mdefStat = defender.stats.mdef || 0;

    // --- 防御バフ適用 (物理防御陣形 + プロテクション) ---
    if (!isMagic) {
      const totalDefPercent = (defender._passiveDefBuffPercent || 0) + (defender._defBuffTurns > 0 ? (defender._defBuffPercent || 0) : 0);
      if (totalDefPercent !== 0) {
        defStat = Math.floor(defStat * (1 + totalDefPercent / 100));
      }
    }
    // --- 魔法防御バフ適用 (マジックバリア) ---
    if (isMagic) {
      const totalMdefPercent = (defender._passiveMdefBuffPercent || 0) + (defender._mdefBuffTurns > 0 ? (defender._mdefBuffPercent || 0) : 0);
      const totalMdefAmount = (defender._mdefBuffTurns > 0 ? (defender._mdefBuffAmount || 0) : 0);
      if (totalMdefPercent !== 0) {
        mdefStat = Math.floor(mdefStat * (1 + totalMdefPercent / 100));
      }
      if (totalMdefAmount !== 0) {
        mdefStat = mdefStat + totalMdefAmount;
      }
      defStat = mdefStat;
    }

    let damage = 0;
    if (options.isHybrid) {
      let physAtk = attacker.stats.atk || 0;
      const hTotalAtkPercent = (attacker._passiveAtkBuffPercent || 0) + (attacker._atkBuffTurns > 0 ? (attacker._atkBuffPercent || 0) : 0);
      if (hTotalAtkPercent !== 0) {
        physAtk = Math.floor(physAtk * (1 + hTotalAtkPercent / 100));
      }
      
      let physDef = defender.stats.def || 0;
      const hTotalDefPercent = (defender._passiveDefBuffPercent || 0) + (defender._defBuffTurns > 0 ? (defender._defBuffPercent || 0) : 0);
      if (hTotalDefPercent !== 0) {
        physDef = Math.floor(physDef * (1 + hTotalDefPercent / 100));
      }
      
      let magAtk = attacker.stats.matk || 0;
      const hTotalMatkPercent = (attacker._passiveMatkBuffPercent || 0) + (attacker._matkBuffTurns > 0 ? (attacker._matkBuffPercent || 0) : 0);
      if (hTotalMatkPercent !== 0) {
        magAtk = Math.floor(magAtk * (1 + hTotalMatkPercent / 100));
      }
      
      let magDef = defender.stats.mdef || 0;
      const hTotalMdefPercent = (defender._passiveMdefBuffPercent || 0) + (defender._mdefBuffTurns > 0 ? (defender._mdefBuffPercent || 0) : 0);
      const hTotalMdefAmount = (defender._mdefBuffTurns > 0 ? (defender._mdefBuffAmount || 0) : 0);
      if (hTotalMdefPercent !== 0) {
        magDef = Math.floor(magDef * (1 + hTotalMdefPercent / 100));
      }
      if (hTotalMdefAmount !== 0) {
        magDef = magDef + hTotalMdefAmount;
      }
      
      const physDamage = Math.max(0, physAtk - Math.floor(physDef / 2));
      const magDamage = Math.max(0, magAtk - Math.floor(magDef / 2));
      damage = Math.max(1, physDamage + magDamage);
    } else {
      damage = Math.max(1, atkStat - Math.floor(defStat / 2));
    }
    damage = Math.floor(damage * (0.9 + Math.random() * 0.2));
    
    const damageMultiplier = options.damageMultiplier || 1;
    damage = Math.floor(damage * damageMultiplier);
    if (options.isGuarded) {
      damage = Math.floor(damage * 0.5);
    }

    // --- 呪い (Curse) の被ダメージ増加判定 ---
    if (defender.activeAilment && defender.activeAilment.type === 'curse') {
      let curseMultiplier = 2.0;
      if (defender.hp !== undefined) {
        const stigmaSkill = this._findSkill(defender, 'stigma_of_atonement');
        if (stigmaSkill && stigmaSkill.level > 0 && stigmaSkill.levelConfig) {
          curseMultiplier = stigmaSkill.levelConfig.curseDamageMultiplier;
        }
      }
      damage = Math.floor(damage * curseMultiplier);
    }

    // --- ポップアップの表示 ---
    if (!options.hideActionName) {
      if (isParty) {
        this.showActionName(attacker.elementId, actionName, 'text-gray-100', 'border-gray-500/50');
      } else {
        this.showActionName(attacker.elementId, actionName, 'text-red-300', 'border-red-500/50');
      }
    }

    // --- 属性ダメージ計算 (比例方式) ---
    const attackElements = options.element 
      ? { [options.element]: 100 }
      : (attacker.stats.attackElements || {});
    const defenderElementResist = defender.stats.elementResist || {};
    
    let totalElementPercent = 0;
    for (const val of Object.values(attackElements)) {
      if (val > 0) totalElementPercent += val;
    }

    // もし属性合計が100%を超えるなら正規化し、100%未満なら残りは無属性とする
    let elementPortionScale = 1.0;
    if (totalElementPercent > 100) {
      elementPortionScale = 100 / totalElementPercent;
    }
    
    let nonElementalPercent = Math.max(0, 100 - totalElementPercent);
    if (totalElementPercent > 100) nonElementalPercent = 0;

    let finalDamage = 0;

    // 各属性ごとのダメージ計算
    for (const [el, val] of Object.entries(attackElements)) {
      if (val > 0) {
        const resist = defenderElementResist[el] || 0;
        const multiplier = Math.max(0, 1 - (resist / 100));
        const portionDamage = damage * (val * elementPortionScale / 100);
        finalDamage += portionDamage * multiplier;
      }
    }

    // 無属性分のダメージ加算
    finalDamage += damage * (nonElementalPercent / 100);

    damage = Math.floor(finalDamage);
    if (damage < 1) damage = 1;

    // --- Passive: Guard ---
    if (!isParty && defender.jobSkills) {
      const guardSkill = this._findSkill(defender, 'guard');
      if (guardSkill && guardSkill.level > 0 && guardSkill.def && guardSkill.levelConfig) {
        const levelConfig = guardSkill.levelConfig;
        if (Math.random() * 100 < levelConfig.chance) {
          const reduction = levelConfig.reduction;
          damage = Math.floor(damage * (1 - reduction / 100));
          if (damage < 1) damage = 1;
          this.showActionName(defender.elementId, 'ガード', 'text-blue-300', 'border-blue-500/50');
        }
      }
    }

    // --- Passive: Slime Body (スライムボディ) ---
    if (!isParty && defender.jobSkills) {
      const slimeBodySkill = this._findSkill(defender, 'slime_body');
      if (slimeBodySkill && slimeBodySkill.level > 0 && slimeBodySkill.levelConfig) {
        const reduction = slimeBodySkill.levelConfig.reduction || 15;
        damage = Math.floor(damage * (1 - reduction / 100));
        if (damage < 1) damage = 1;
        this.showActionName(defender.elementId, 'スライムボディ', 'text-teal-300', 'border-teal-500/50');
      }
    }

    // --- Passive: Parry (物理攻撃を無効化) ---
    if (!isParty && !isMagic && defender.jobSkills) {
      const parrySkill = this._findSkill(defender, 'parry');
      if (parrySkill && parrySkill.level > 0 && parrySkill.levelConfig) {
        if (Math.random() * 100 < parrySkill.levelConfig.chance) {
          damage = 0;
          this.showActionName(defender.elementId, 'パリィ', 'text-cyan-300', 'border-cyan-500/50');
        }
      }
    }

    // --- 汎用バリア処理 (Divine Shield etc.) ---
    if (defender._barrierHp && defender._barrierHp > 0 && damage > 0) {
      if (defender._barrierHp >= damage) {
        defender._barrierHp -= damage;
        damage = 0;
        this.showActionName(defender.elementId, 'BARRIER BLOCK', 'text-amber-300', 'border-amber-500/50');
      } else {
        damage -= defender._barrierHp;
        defender._barrierHp = 0;
        this.showActionName(defender.elementId, 'BARRIER BREAK', 'text-amber-400', 'border-amber-600/50');
      }
    }

    let dmgColor = 'text-white';
    if (totalElementPercent > 0) {
      let sumMultiplier = 0;
      for (const [el, val] of Object.entries(attackElements)) {
        if (val > 0) {
          const resist = defenderElementResist[el] || 0;
          const multiplier = Math.max(0, 1 - (resist / 100));
          const portion = val * elementPortionScale;
          sumMultiplier += multiplier * (portion / 100);
        }
      }
      sumMultiplier += 1.0 * (nonElementalPercent / 100);
      
      if (sumMultiplier < 0.999) {
        dmgColor = 'text-purple-400';
      } else if (sumMultiplier > 1.001) {
        dmgColor = 'text-red-500';
      }
    }

    // --- 汎用攻撃アニメーション (通常攻撃のみ) ---
    if ((!options.damageType || options.damageType === 'ability') && !this._cachedDisableAnim) {
      const defenderEl = document.getElementById(defender.elementId);
      if (defenderEl) {
        const rect = defenderEl.getBoundingClientRect();
        const tx = rect.left + rect.width / 2;
        const ty = rect.top + rect.height / 2;

        const slash = document.createElement('div');
        slash.style.position = 'fixed';
        slash.style.left = `${tx}px`;
        slash.style.top = `${ty}px`;
        slash.style.width = '120px';
        slash.style.height = '6px';
        slash.style.background = 'linear-gradient(to right, transparent, rgba(255,255,255,0.8), #fff, rgba(255,255,255,0.8), transparent)';
        slash.style.boxShadow = '0 0 8px rgba(255,255,255,0.5)';
        slash.style.zIndex = '9998';
        slash.style.pointerEvents = 'none';
        document.body.appendChild(slash);

        const anim = slash.animate([
          { transform: 'translate(-50%, -50%) rotate(45deg) scaleX(0.1) scaleY(0.2)', opacity: 0 },
          { transform: 'translate(-50%, -50%) rotate(45deg) scaleX(1.0) scaleY(1.0)', opacity: 1, offset: 0.3 },
          { transform: 'translate(-50%, -50%) rotate(45deg) scaleX(1.5) scaleY(0.1)', opacity: 0 }
        ], { duration: 200 / this.speedMult, easing: 'ease-out' });

        anim.onfinish = () => slash.remove();
      }
    }

    this.showDamage(defender.elementId, damage, dmgColor);

    // --- 状態異常付与判定 ---
    const attackAilments = attacker.stats.attackAilments || {};
    const defenderAilmentResist = defender.stats.ailmentResist || {};
    const inflictedAilments = [];
    
    for (const [ailment, chance] of Object.entries(attackAilments)) {
      if (chance > 0) {
        const resist = (defenderAilmentResist[ailment] || 0) + (defender._ailmentResistBuffTurns > 0 ? (defender._ailmentResistBuffAmount || 0) : 0);
        const finalChance = Math.max(0, chance - resist);
        if (Math.random() * 100 < finalChance) {
          inflictedAilments.push(ailment);
        }
      }
    }

    if (inflictedAilments.length > 0 && !defender.activeAilment) {
      // --- Passive: 贖罪の烙印 (Stigma of Atonement) - 状態異常免疫 ---
      let ailmentImmune = false;
      if (defender.hp !== undefined) {
        const stigmaSkill = this._findSkill(defender, 'stigma_of_atonement');
        if (stigmaSkill && stigmaSkill.level > 0 && stigmaSkill.levelConfig) {
          ailmentImmune = true;
        }
      }
      if (!ailmentImmune) {
        const ailment = inflictedAilments[0];
        defender.activeAilment = { type: ailment, duration: 10 };
      }
    }

    const isDefenderParty = defender.hp !== undefined;
    const prevHp = isDefenderParty ? defender.hp.current : defender.currentHp;
    
    if (!isDefenderParty) {
      defender.currentHp -= damage;
      if (defender.currentHp <= 0) {
        defender.currentHp = 0;
        defender.isDead = true;
        this.clearEntityStatuses(defender);
        this.processEnemyDeath(defender);
      }
    } else {
      let survivedBySlimeCore = false;
      if (defender.hp.current - damage <= 0 && defender.jobSkills) {
        const slimeCoreSkill = this._findSkill(defender, 'slime_core');
        if (slimeCoreSkill && slimeCoreSkill.level > 0 && slimeCoreSkill.levelConfig) {
          const thresholdPercent = slimeCoreSkill.levelConfig.threshold || 50;
          const currentPercent = (prevHp / (defender.stats.hp || defender.hp.max)) * 100;
          if (currentPercent >= thresholdPercent) {
            damage = prevHp - 1;
            survivedBySlimeCore = true;
            setTimeout(() => {
              this.showActionName(defender.elementId, 'スライムコア', 'text-green-300', 'border-green-500/50');
            }, 300 / this.speedMult);
          }
        }
      }

      defender.hp.current -= damage;
      if (defender.hp.current <= 0 && !survivedBySlimeCore) {
        defender.hp.current = 0;
        defender.isDead = true;
        this.clearEntityStatuses(defender);
        this.lastKilledBy = {
          monsterId: attacker.id,
          monsterName: attacker.name,
          monsterImage: attacker.image,
          actionName: actionName
        };
      } else if (defender.jobSkills) {
        // --- Passive: Counter ---
        const counterSkill = this._findSkill(defender, 'counter');
        if (counterSkill && counterSkill.level > 0 && counterSkill.def && counterSkill.levelConfig) {
          const levelConfig = counterSkill.levelConfig;
          if (Math.random() * 100 < levelConfig.chance) {
            setTimeout(() => {
              if (!defender.isDead && !attacker.isDead) {
                this.showActionName(defender.elementId, 'カウンター', 'text-orange-400', 'border-orange-500/50');
                this.executeAttack(defender, attacker, true, { actionName: 'カウンター', hideActionName: true });
              }
            }, 500 / this.speedMult);
          }
        }
      }
    }
    
    const newHp = isDefenderParty ? defender.hp.current : defender.currentHp;
    if (newHp < prevHp && defender.activeAilment && defender.activeAilment.type === 'sleep') {
      if (Math.random() < 0.5) {
        defender.activeAilment = null;
        // setTimeout(() => {
        //   if (!defender.isDead) this.showActionName(defender.elementId, 'WAKE UP', 'text-blue-300', 'border-blue-500/50');
        // }, 500 / this.speedMult);
      }
    }

    if (!options.skipAtbReset) {
      attacker.atb = 0;
      if (attacker.hp !== undefined) {
        if (this.activeCharacter === attacker) {
          this.activeCharacter = null;
        }
        
        // --- Passive: Magic Missile ---
        if (!options.damageType && !isMagic && !defender.isDead) {
          const missileSkill = this._findSkill(attacker, 'magic_missile');
          if (missileSkill && missileSkill.level > 0 && missileSkill.levelConfig) {
            setTimeout(() => {
              if (!defender.isDead && !attacker.isDead) {
                this.showActionName(attacker.elementId, 'マジックミサイル', 'text-fuchsia-400', 'border-fuchsia-500/50');
                this.executeAttack(attacker, defender, true, { 
                  actionName: 'マジックミサイル', 
                  damageMultiplier: missileSkill.levelConfig.multiplier, 
                  damageType: 'skill', 
                  isMagic: true, 
                  hideActionName: true,
                  skipAtbReset: true
                });
              }
            }, 300 / this.speedMult);
          }
        }
        
        // --- Passive: Plus One ---
        if (!options.damageType && !isMagic && !defender.isDead) {
          const plusOneSkill = this._findSkill(attacker, 'plus_one');
          if (plusOneSkill && plusOneSkill.level > 0 && plusOneSkill.levelConfig) {
            const hits = plusOneSkill.levelConfig.hits || 1;
            for (let i = 0; i < hits; i++) {
              setTimeout(() => {
                let currentTarget = defender;
                if (currentTarget.isDead) {
                  currentTarget = this.enemies.find(e => !e.isDead);
                }
                if (currentTarget && !currentTarget.isDead && !attacker.isDead) {
                  if (i === 0) {
                    this.showActionName(attacker.elementId, 'プラスワン', 'text-yellow-400', 'border-yellow-500/50');
                  }
                  this.executeAttack(attacker, currentTarget, true, {
                    actionName: 'プラスワン',
                    damageMultiplier: plusOneSkill.levelConfig.multiplier || 0.5,
                    damageType: 'ability',
                    hideActionName: true,
                    skipAtbReset: true
                  });
                }
              }, (400 + i * 200) / this.speedMult);
            }
          }
        }
        
        // --- Passive: MP Absorb ---
        if (!options.damageType && !isMagic) {
          const mpAbsorbSkill = this._findSkill(attacker, 'mp_absorb');
          if (mpAbsorbSkill && mpAbsorbSkill.level > 0 && mpAbsorbSkill.levelConfig) {
             const mpRecover = Math.floor(damage * (mpAbsorbSkill.levelConfig.percent / 100));
             if (mpRecover > 0) {
                 this.showActionName(attacker.elementId, 'MP吸収', 'text-indigo-300', 'border-indigo-500/50');
                 attacker.mp.current = Math.min((attacker.stats?.mp || attacker.mp.max), attacker.mp.current + mpRecover);
                 setTimeout(() => {
                   this.showDamage(attacker.elementId, `+${mpRecover} MP`, 'text-blue-400');
                 }, 400 / this.speedMult);
             }
          }

          // --- Passive: Blood Thirst (血の渇望) ---
          const bloodThirstSkill = this._findSkill(attacker, 'blood_thirst');
          if (bloodThirstSkill && bloodThirstSkill.level > 0 && bloodThirstSkill.levelConfig) {
            const hpRecover = Math.floor(damage * (bloodThirstSkill.levelConfig.drainPercent / 100));
            if (hpRecover > 0) {
              this.showActionName(attacker.elementId, '血の渇望', 'text-red-300', 'border-red-500/50');
              attacker.hp.current = Math.min((attacker.stats?.hp || attacker.hp.max), attacker.hp.current + hpRecover);
              setTimeout(() => {
                this.showDamage(attacker.elementId, `+${hpRecover}`, 'text-green-400');
              }, 400 / this.speedMult);
            }
          }
        }

        // --- Passive: Mana Regen & HP Regen ---
        if (!options.damageType && !options.hideActionName) {
          const manaRegenSkill = this._findSkill(attacker, 'mana_regen');
          if (manaRegenSkill && manaRegenSkill.level > 0 && manaRegenSkill.levelConfig) {
            const amount = manaRegenSkill.levelConfig.recoverMp;
            if (amount > 0 && attacker.mp.current < (attacker.stats?.mp || attacker.mp.max)) {
              this.showActionName(attacker.elementId, 'マナリジェネ', 'text-blue-300', 'border-blue-500/50');
            }
            attacker.mp.current = Math.min(attacker.stats?.mp || attacker.mp.max, attacker.mp.current + amount);
            setTimeout(() => {
              this.showDamage(attacker.elementId, `+${amount} MP`, 'text-blue-400');
            }, 600 / this.speedMult);
          }
          
          const hpRegenSkill = this._findSkill(attacker, 'regen');
          if (hpRegenSkill && hpRegenSkill.level > 0 && hpRegenSkill.levelConfig) {
            const amount = hpRegenSkill.levelConfig.recoverHp;
            if (amount > 0 && attacker.hp.current < (attacker.stats?.hp || attacker.hp.max)) {
              this.showActionName(attacker.elementId, 'リジェネ', 'text-green-300', 'border-green-500/50');
            }
            attacker.hp.current = Math.min(attacker.stats?.hp || attacker.hp.max, attacker.hp.current + amount);
            setTimeout(() => {
              this.showDamage(attacker.elementId, `+${amount}`, 'text-green-400');
            }, 600 / this.speedMult);
          }

          // --- Passive: Energizing ---
          const energizingSkill = this._findSkill(attacker, 'energizing');
          if (energizingSkill && energizingSkill.level > 0 && energizingSkill.levelConfig) {
            const amount = energizingSkill.levelConfig.recoverMp;
            let applied = false;
            this.party.forEach(p => {
              if (!p.isDead && p.mp && (p.mp.current < (p.stats?.mp || p.mp.max))) {
                p.mp.current = Math.min(p.stats?.mp || p.mp.max, p.mp.current + amount);
                setTimeout(() => {
                  this.showDamage(p.elementId, `+${amount} MP`, 'text-blue-400');
                }, 600 / this.speedMult);
                applied = true;
              }
            });
            if (applied) {
              this.showActionName(attacker.elementId, 'エナジャイジング', 'text-orange-300', 'border-orange-500/50');
            }
          }

          // --- Passive: Healing Song (いやしの歌) ---
          const healingSongSkill = this._findSkill(attacker, 'healing_song');
          if (healingSongSkill && healingSongSkill.level > 0 && healingSongSkill.levelConfig) {
            let triggered = false;
            this.party.forEach(p => {
              if (!p.isDead && p.hp && (p.hp.current < (p.stats?.hp || p.hp.max))) {
                const maxHp = p.stats?.hp || p.hp.max;
                const healAmount = healingSongSkill.levelConfig.healAmount;
                if (healAmount > 0) {
                  triggered = true;
                  p.hp.current = Math.min(maxHp, p.hp.current + healAmount);
                  setTimeout(() => {
                    this.showDamage(p.elementId, `+${healAmount}`, 'text-green-400');
                  }, 600 / this.speedMult);
                }
              }
            });
            if (triggered) {
              this.showActionName(attacker.elementId, 'いやしの歌', 'text-pink-300', 'border-pink-500/50');
            }
          }
        }
      } else {
        this.activeEnemy = null;
      }
    }

    // --- 呪い (Curse) の反動ダメージ ---
    if (attacker.activeAilment && attacker.activeAilment.type === 'curse' && !attacker.isDead) {
      let recoilMultiplier = 0.4;
      if (attacker.hp !== undefined) {
        const stigmaSkill = this._findSkill(attacker, 'stigma_of_atonement');
        if (stigmaSkill && stigmaSkill.level > 0 && stigmaSkill.levelConfig) {
          recoilMultiplier = stigmaSkill.levelConfig.curseRecoilMultiplier;
        }
      }
      const recoil = Math.max(1, Math.floor(damage * recoilMultiplier));
      if (recoil > 0) {
        setTimeout(() => {
          this.takeAilmentDamage(attacker, recoil, 'CURSE');
        }, 500 / this.speedMult);
      }
    }

    this.renderEntities();
    this.checkBattleEnd();
  },

  executeEnemyTurn(enemy) {
    if (!this.atbWorker) return;
    if (enemy.atkDebuffTurns > 0) {
      enemy.atkDebuffTurns--;
      if (enemy.atkDebuffTurns <= 0) {
        enemy.stats.atk = enemy.originalAtk;
      }
    }
    if (enemy.defDebuffTurns > 0) {
      enemy.defDebuffTurns--;
      if (enemy.defDebuffTurns <= 0) {
        enemy.stats.def = enemy.originalDef;
      }
    }

    // --- 挑発/防御バフのターンデクリメント ---
    this.party.forEach(p => {
      if (p._provokeTurns > 0) {
        p._provokeTurns--;
        if (p._provokeTurns <= 0) {
          p._provokeChance = 0;
        }
      }
      if (p._ailmentResistBuffTurns > 0) {
        p._ailmentResistBuffTurns--;
      }
      if (p._defBuffTurns > 0) {
        p._defBuffTurns--;
        if (p._defBuffTurns <= 0) {
          p._defBuffPercent = 0;
        }
      }
      if (p._mdefBuffTurns > 0) {
        p._mdefBuffTurns--;
        if (p._mdefBuffTurns <= 0) {
          p._mdefBuffAmount = 0;
          p._mdefBuffPercent = 0;
        }
      }
      if (p._atkBuffTurns > 0) {
        p._atkBuffTurns--;
        if (p._atkBuffTurns <= 0) {
          p._atkBuffPercent = 0;
        }
      }
      if (p._matkBuffTurns > 0) {
        p._matkBuffTurns--;
        if (p._matkBuffTurns <= 0) {
          p._matkBuffPercent = 0;
        }
      }
      if (p._barrierTurns > 0) {
        p._barrierTurns--;
        if (p._barrierTurns <= 0) {
          p._barrierHp = 0;
        }
      }
      
      // --- アクティブリジェネ (Sanctuary等) ---
      if (p._regenTurns && p._regenTurns > 0) {
        if (p.hp.current < (p.stats?.hp || p.hp.max) && !p.isDead) {
          p.hp.current = Math.min(p.stats?.hp || p.hp.max, p.hp.current + p._regenHp);
          this.showDamage(p.elementId, `+${p._regenHp}`, 'text-green-400');
          
          if (localStorage.getItem('disableBattleAnimations') !== 'true') {
            const el = document.getElementById(p.elementId);
            if (el) {
              const rect = el.getBoundingClientRect();
              const cx = rect.left + rect.width / 2;
              const cy = rect.top + rect.height / 2;
              for (let i = 0; i < 4; i++) {
                const sparkle = document.createElement('div');
                sparkle.style.position = 'fixed';
                sparkle.style.left = `${cx - 10}px`;
                sparkle.style.top = `${cy - 10}px`;
                sparkle.style.width = '20px';
                sparkle.style.height = '20px';
                sparkle.style.background = 'radial-gradient(circle, #fff, #4ade80, transparent)';
                sparkle.style.clipPath = 'polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%)';
                sparkle.style.zIndex = '9999';
                sparkle.style.pointerEvents = 'none';
                sparkle.style.mixBlendMode = 'screen';
                document.body.appendChild(sparkle);
                
                const angle = Math.random() * Math.PI * 2;
                const dist = 15 + Math.random() * 20;
                const anim = sparkle.animate([
                  { transform: 'translate(0, 0) scale(0)', opacity: 0 },
                  { transform: 'translate(0, 0) scale(0.6)', opacity: 1, offset: 0.2 },
                  { transform: `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist - 15}px) scale(0.2)`, opacity: 0 }
                ], { duration: 500 + Math.random() * 300, easing: 'ease-out' });
                anim.onfinish = () => sparkle.remove();
              }
            }
          }
        }
        p._regenTurns--;
        if (p._regenTurns <= 0) p._regenHp = 0;
      }
    });

    const aliveParty = this.party.filter(p => !p.isDead);
    if (aliveParty.length === 0) {
      this.activeEnemy = null;
      this.checkBattleEnd();
      return;
    }
    
    let target = aliveParty[Math.floor(Math.random() * aliveParty.length)];

    // --- 挑発 (カバー): 挑発中のナイトがターゲットを庇う ---
    const provoker = aliveParty.find(p =>
      p._provokeTurns > 0 && p._provokeChance > 0 && p !== target && !p.isDead
    );
    if (provoker) {
      if (Math.random() * 100 < provoker._provokeChance) {
        target = provoker;
        this.showActionName(provoker.elementId, '挑発', 'text-amber-400', 'border-amber-500/50');
      }
    }

    if (enemy.actions && enemy.actions.length > 0) {
      const rand = Math.random() * 100;
      let cumulative = 0;
      for (const action of enemy.actions) {
        cumulative += action.chance;
        if (rand < cumulative) {
          if (action.execute) {
            action.execute(enemy, target, this);
            this.activeEnemy = null;
            this.updateEntities();
            return;
          }
        }
      }
    }

    this.executeAttack(enemy, target, false);
    this.activeEnemy = null;
    this.updateEntities();
  }
};
