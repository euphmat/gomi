import { playSoundEffect } from '../../utils/sound-effects.js';
import { playNormalAttackAnimation } from './normal-attack-animations.js';
import {
  getMagicMissileAnimationTiming,
  playMagicMissileAnimation
} from './magic-missile-animation.js';
import { consumeSoulReaperCorpses, getSoulReaperCorpseStock } from '../../jobs/soul_reaper.js';
import { resolveBattleSkill } from './battle-statistics.js';
import {
  getMedalEquipmentEffects,
  hasMedalEquipmentImmunity,
  rollMedalEquipmentEffect,
  sumMedalEquipmentEffect,
} from '../../utils/medal-equipment-effects.js';

export const MAX_STACKED_ATTACK_NEGATION_CHANCE = 85;

export function getDefenseAfterIgnore(defense, ignorePercent) {
  const normalizedDefense = Math.max(0, Number(defense) || 0);
  const normalizedIgnore = Math.min(100, Math.max(0, Number(ignorePercent) || 0));
  return Math.floor(normalizedDefense * (1 - normalizedIgnore / 100));
}

export function getStackedAttackNegationStep(
  cumulativeChance,
  nextChance,
  maximumChance = MAX_STACKED_ATTACK_NEGATION_CHANCE
) {
  const previous = Math.min(100, Math.max(0, Number(cumulativeChance) || 0));
  const candidate = Math.min(100, Math.max(0, Number(nextChance) || 0));
  const maximum = Math.min(100, Math.max(0, Number(maximumChance) || 0));
  const uncappedCombined = 100 - ((100 - previous) * (100 - candidate) / 100);
  const combinedChance = Math.min(maximum, uncappedCombined);
  const rollChance = previous >= 100
    ? 0
    : Math.max(0, (combinedChance - previous) * 100 / (100 - previous));
  return { rollChance, combinedChance };
}

/**
 * battle-actions.js
 * 攻撃・スキル・敵ターン実行ロジック
 */

export const actionMethods = {
  applyMedalEquipmentActionRecovery(entity) {
    if (!entity?.hp || entity.isDead) return;
    const hpPercent = sumMedalEquipmentEffect(entity, this.equipMap, 'actionHpRegenPercent', 25);
    const mpPercent = sumMedalEquipmentEffect(entity, this.equipMap, 'actionMpRegenPercent', 25);
    if (hpPercent > 0) {
      const maxHp = entity.stats?.hp || entity.hp.max || 1;
      const recovered = Math.min(Math.floor(maxHp * hpPercent / 100), Math.max(0, maxHp - entity.hp.current));
      if (recovered > 0) {
        entity.hp.current += recovered;
        this._scheduleBattleTimeout(() => this.showDamage(entity.elementId, `+${recovered}`, 'text-emerald-300'), this.speedMult >= 5 ? 0 : 250 / this.speedMult);
      }
    }
    if (mpPercent > 0 && entity.mp) {
      const maxMp = entity.stats?.mp || entity.mp.max || 1;
      const recovered = Math.min(Math.floor(maxMp * mpPercent / 100), Math.max(0, maxMp - entity.mp.current));
      if (recovered > 0) {
        entity.mp.current += recovered;
        this._scheduleBattleTimeout(() => this.showDamage(entity.elementId, `+${recovered} MP`, 'text-cyan-300'), this.speedMult >= 5 ? 0 : 250 / this.speedMult);
      }
    }
  },

  trySoulReaperDeathDenial(entity) {
    if ((entity?.jobId || entity?.job) !== 'soul_reaper' || !entity.hp || entity.isDead) return false;
    if (getSoulReaperCorpseStock(entity) < 1) return false;
    const denial = this._findSkill?.(entity, 'death_denial');
    if (!denial?.levelConfig?.revivePercent) return false;
    if (consumeSoulReaperCorpses(entity, 1, this, { announce: false }) < 1) return false;

    const maxHp = entity.stats?.hp || entity.hp.max || 1;
    entity.hp.current = Math.max(1, Math.floor(maxHp * denial.levelConfig.revivePercent / 100));
    this.showActionName?.(entity.elementId, '死の拒絶', 'text-cyan-100', 'border-violet-400/80');
    this.showDamage?.(entity.elementId, `HP ${entity.hp.current}`, 'text-cyan-200');
    this.renderEntities?.();
    return true;
  },

  _waitForAttackAnimation(target, completionDuration, cadenceDuration = completionDuration) {
    const completionWait = Math.max(0, Math.ceil(Number(completionDuration) || 0));
    if (completionWait === 0) return;
    const cadenceWait = Math.min(
      completionWait,
      Math.max(0, Math.ceil(Number(cadenceDuration) || 0))
    );

    this._pendingAttackAnimations = (this._pendingAttackAnimations || 0) + 1;
    this._pendingAttackCadenceLocks = (this._pendingAttackCadenceLocks || 0) + 1;
    if (!this._pendingAttackAnimationTargets) {
      this._pendingAttackAnimationTargets = new Map();
    }
    const targetCount = this._pendingAttackAnimationTargets.get(target) || 0;
    this._pendingAttackAnimationTargets.set(target, targetCount + 1);

    const releaseCadenceLock = () => {
      this._pendingAttackCadenceLocks = Math.max(0, (this._pendingAttackCadenceLocks || 1) - 1);
    };

    if (cadenceWait < completionWait) {
      this._scheduleBattleTimeout(releaseCadenceLock, cadenceWait);
    }

    this._scheduleBattleTimeout(() => {
      if (cadenceWait >= completionWait) releaseCadenceLock();
      const remainingForTarget = (this._pendingAttackAnimationTargets?.get(target) || 1) - 1;
      if (remainingForTarget > 0) {
        this._pendingAttackAnimationTargets.set(target, remainingForTarget);
      } else {
        this._pendingAttackAnimationTargets?.delete(target);
      }

      this._pendingAttackAnimations = Math.max(0, (this._pendingAttackAnimations || 1) - 1);
      this.renderEntities();
      if (this._pendingAttackAnimations === 0) {
        this.checkBattleEnd();
      }
    }, completionWait);
  },

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
    entity._guardianCoverTurns = 0;
    entity._guardianCoverReduction = 0;
    entity._ailmentResistBuffTurns = 0;
    entity._ailmentResistBuffAmount = 0;
    entity._barrierHp = 0;
    entity._barrierTurns = 0;
    entity._manaFlowTurns = 0;
    entity._manaFlowAmount = 0;
    entity._conductorHarmony = 0;
    entity._entertainerHype = 0;
    entity._slimeSingerNotes = 0;
    entity._dragoonSpirit = 0;
    entity._shinraSigils = [];
    entity._soulReaperCorpses = 0;
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

  applyManaOrchestra(caster) {
    if (!caster?.mp || caster.isDead) return;
    const orchestra = this._findSkill(caster, 'mana_orchestra');
    if (!orchestra?.levelConfig) return;

    const targets = this.party.filter(member => !member.isDead && member.mp);
    const amount = orchestra.levelConfig.recoverMp;
    let applied = false;

    targets.forEach(target => {
      const maxMp = target.stats?.mp || target.mp.max;
      const before = target.mp.current;
      target.mp.current = Math.min(maxMp, before + amount);
      const restored = target.mp.current - before;
      if (restored <= 0) return;
      applied = true;
      this._scheduleBattleTimeout(() => {
        this.showDamage(target.elementId, `+${restored} MP`, 'text-cyan-300');
      }, this.speedMult >= 5 ? 0 : 450 / this.speedMult);
    });

    if (applied) {
      this.showActionName(caster.elementId, 'マナオーケストラ', 'text-cyan-300', 'border-cyan-500/50');
    }
  },

  executeSkill(caster, skillDef, levelConfig, options = {}) {
    if (this.isStopped) return;
    const mpCostReduction = sumMedalEquipmentEffect(caster, this.equipMap, 'mpCostReductionPercent', 80);
    const effectiveMpCost = Math.max(0, Math.floor((Number(levelConfig.mpCost) || 0) * (1 - mpCostReduction / 100)));
    if (!options.isDoubleAct && caster.mp && caster.mp.current < effectiveMpCost) {
      caster.atb = 0;
      this.activeCharacter = null;
      this.renderEntities();
      return;
    }
    if (!options.isDoubleAct && effectiveMpCost > 0 && caster.activeAilment && caster.activeAilment.type === 'silence') {
      // this.showActionName(caster.elementId, '沈黙', 'text-indigo-400', 'border-indigo-500/50');
      caster.atb = 0;
      this.activeCharacter = null;
      this.renderEntities();
      return;
    }

    if (!options.isDoubleAct && caster.mp) {
      caster.mp.current -= effectiveMpCost;
    }

    const telemetrySkill = { ...skillDef, type: skillDef.type || 'active' };
    const telemetryCapturedAt = globalThis.performance?.now?.() ?? Date.now();
    caster._lastBattleTelemetrySkill = telemetrySkill;
    this._battleTelemetryAction = { actor: caster, skill: telemetrySkill, capturedAt: telemetryCapturedAt };
    this.battleTelemetry?.recordAction(caster, telemetrySkill);

    playSoundEffect('battleSkill', { automatic: this.isAutoBattle });

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
      try {
        skillDef.execute(caster, levelConfig, this, options);
      } catch (err) {
        console.error(`Skill Execution Error [${skillDef.id}]:`, err);
      }
    }

    if (!options.isDoubleAct && !options.isEquipmentRepeat
      && rollMedalEquipmentEffect(caster, this.equipMap, 'extraActionChance')) {
      this._scheduleBattleTimeout(() => {
        if (!caster.isDead) {
          this.showActionName(caster.elementId, 'メダル装備・連続行動', 'text-amber-200', 'border-amber-400/60');
          this.executeSkill(caster, skillDef, levelConfig, { ...options, isDoubleAct: true, isEquipmentRepeat: true });
        }
      }, this.speedMult >= 5 ? 0 : 450 / this.speedMult);
      return;
    }
    

    // --- Passive: Double Act ---
    if (!options.isDoubleAct && caster.jobSkills) {
      const doubleActSkill = this._findSkill(caster, 'double_act');
      if (doubleActSkill && doubleActSkill.level > 0 && doubleActSkill.levelConfig) {
        if (Math.random() * 100 < doubleActSkill.levelConfig.chance) {
          this._scheduleBattleTimeout(() => {
            if (caster.hp !== undefined && !caster.isDead) {
              this.showActionName(caster.elementId, 'ダブルアクト', 'text-cyan-300', 'border-cyan-500/50');
              this.executeSkill(caster, skillDef, levelConfig, { isDoubleAct: true });
            } else {
              caster.atb = 0;
              this.activeCharacter = null;
              this.renderEntities();
              this.checkBattleEnd();
            }
          }, this.speedMult >= 5 ? 0 : 600 / this.speedMult);
          return;
        }
      }
    }

    // --- Passive: Mana Regen ---
    const regenSkill = this._findSkill(caster, 'mana_regen');
    if (regenSkill && regenSkill.level > 0 && regenSkill.levelConfig) {
      const amount = regenSkill.levelConfig.recoverMp;
      const mpBefore = caster.mp.current;
      const maxMp = caster.stats?.mp || caster.mp.max;
      caster.mp.current = Math.min(maxMp, mpBefore + amount);
      const restoredMp = caster.mp.current - mpBefore;
      if (restoredMp > 0) {
        this.showActionName(caster.elementId, 'マナリジェネ', 'text-blue-300', 'border-blue-500/50');
        this._scheduleBattleTimeout(() => {
          this.showDamage(caster.elementId, `+${restoredMp} MP`, 'text-blue-400');
        }, this.speedMult >= 5 ? 0 : 300 / this.speedMult);
      }
    }
    
    // --- Passive: Regen (HP) ---
    const hpRegenSkill = this._findSkill(caster, 'regen');
    if (hpRegenSkill && hpRegenSkill.level > 0 && hpRegenSkill.levelConfig) {
      const amount = hpRegenSkill.levelConfig.recoverHp;
      const hpBefore = caster.hp.current;
      const maxHp = caster.stats?.hp || caster.hp.max;
      caster.hp.current = Math.min(maxHp, hpBefore + amount);
      const restoredHp = caster.hp.current - hpBefore;
      if (restoredHp > 0) {
        this.showActionName(caster.elementId, 'リジェネ', 'text-green-300', 'border-green-500/50');
        this._scheduleBattleTimeout(() => {
          this.showDamage(caster.elementId, `+${restoredHp}`, 'text-green-400');
        }, this.speedMult >= 5 ? 0 : 300 / this.speedMult);
      }
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
            const hpBefore = p.hp.current;
            p.hp.current = Math.min(maxHp, hpBefore + healAmount);
            const restoredHp = p.hp.current - hpBefore;
            triggered = triggered || restoredHp > 0;
            this._scheduleBattleTimeout(() => {
              if (restoredHp > 0) this.showDamage(p.elementId, `+${restoredHp}`, 'text-green-400');
            }, this.speedMult >= 5 ? 0 : 400 / this.speedMult);
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
          this._scheduleBattleTimeout(() => {
            this.showDamage(p.elementId, `+${amount} MP`, 'text-blue-400');
          }, this.speedMult >= 5 ? 0 : 600 / this.speedMult);
          applied = true;
        }
      });
      if (applied) {
        this.showActionName(caster.elementId, 'エナジャイジング', 'text-orange-300', 'border-orange-500/50');
      }
    }

    this.applyManaOrchestra(caster);
    this.applyMedalEquipmentActionRecovery(caster);

    caster.atb = sumMedalEquipmentEffect(caster, this.equipMap, 'atbRefundPercent', 50) * 10;
    this.activeCharacter = null;
    this.renderEntities();
    this.checkBattleEnd();
  },

  executeAttack(attacker, defender, isParty, options = {}) {
    if (this.isStopped) return;
    const actionName = options.actionName || '攻撃';
    // Follow-up effects can remain abilities for damage/passive bookkeeping
    // while explicitly representing another normal-attack hit.
    const isNormalAttack = !options.damageType || options.isNormalAttack === true;
    if (isParty && !options.damageType && !options.isCounter) {
      attacker._lastBattleTelemetrySkill = null;
      this.battleTelemetry?.recordAction(attacker, {
        id: 'normal_attack', name: '通常攻撃', type: 'active'
      });
    }
    let attackAnimationMs = 0;
    let attackCadenceMs = 0;

    let isMagic = options.isMagic || false;
    let isHybrid = options.isHybrid || false;
    
    if (options.statDependency) {
      if (options.statDependency === 'MAT') { isMagic = true; isHybrid = false; }
      else if (options.statDependency === 'BOTH') { isHybrid = true; isMagic = false; }
      else if (options.statDependency === 'ATK') { isMagic = false; isHybrid = false; }
    }
    options.isHybrid = isHybrid;
    let cumulativeAttackNegationChance = 0;
    const rollAttackNegation = chance => {
      const step = getStackedAttackNegationStep(cumulativeAttackNegationChance, chance);
      cumulativeAttackNegationChance = step.combinedChance;
      return Math.random() * 100 < step.rollChance;
    };

    if (isParty && attacker.hp !== undefined) {
      options.defenseIgnorePercent = Math.max(
        Number(options.defenseIgnorePercent) || 0,
        sumMedalEquipmentEffect(attacker, this.equipMap, 'defenseIgnorePercent', 60)
      );
    }

    playSoundEffect(isMagic ? 'battleMagic' : 'battleAttack', {
      automatic: this.isAutoBattle,
      rate: isParty ? 1.04 : .9,
    });

    // --- Guardian Oath: intercept every incoming party hit, including AoE ---
    if (!isParty && defender.hp !== undefined) {
      let guardian = defender._guardianCoverTurns > 0 ? defender : null;
      if (!guardian) {
        guardian = this.party
          .filter(member => !member.isDead && member !== defender && member._guardianCoverTurns > 0)
          .sort((a, b) => (b._guardianCoverReduction || 0) - (a._guardianCoverReduction || 0))[0] || null;
      }
      if (guardian) {
        if (guardian !== defender) {
          defender = guardian;
          this.showActionName(guardian.elementId, '守護者の誓約', 'text-amber-200', 'border-amber-400/60');
        }
        options.guardianCoverReduction = guardian._guardianCoverReduction || 0;
      }
    }

    // --- Passive: Auto Guard (オートガード) ---
    if (!isParty && !options.isAoEProcessed && !options.guardianCoverReduction && defender.hp !== undefined) {
      const paladinsWithGuard = this.party.filter(p => !p.isDead && p !== defender && p.job === 'paladin');
      for (const p of paladinsWithGuard) {
        const guardSkill = this._findSkill(p, 'auto_guard');
        if (guardSkill && guardSkill.level > 0 && guardSkill.levelConfig) {
          if (p.equipment && p.equipment.leftHand) {
            const shield = this.equipMap && this.equipMap.get(p.equipment.leftHand);
            if (shield) {
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

    // --- 影の身のこなし (Shadow Motion) の判定 ---
    if (!isParty && defender.hp !== undefined
      && rollAttackNegation(sumMedalEquipmentEffect(defender, this.equipMap, 'evadeChance', 40))) {
      this.showActionName(defender.elementId, 'メダル装備・回避', 'text-amber-200', 'border-amber-400/60');
      if (!options.skipAtbReset && !options.isAoEProcessed) {
        attacker.atb = 0;
        this.activeEnemy = null;
        this.renderEntities();
      }
      return;
    }

    // --- 影の身のこなし (Shadow Motion) の判定 ---
    if (defender.hp !== undefined) {
      const shadowMotionSkill = this._findSkill(defender, 'shadow_motion');
      if (shadowMotionSkill?.level > 0 && shadowMotionSkill.levelConfig
        && rollAttackNegation(shadowMotionSkill.levelConfig.evadeChance)) {
        this.showActionName(defender.elementId, '影の身のこなし', 'text-violet-300', 'border-violet-500/50');
        if (!options.skipAtbReset && !options.isAoEProcessed) {
          attacker.atb = 0;
          if (attacker.hp !== undefined) this.activeCharacter = null;
          else this.activeEnemy = null;
          this.renderEntities();
        }
        return;
      }
    }

    // --- 華麗なる見切り (Splendid Evasion) の判定 ---
    if (!isMagic && defender.hp !== undefined) {
      const evadeSkill = this._findSkill(defender, 'splendid_evasion');
      if (evadeSkill && evadeSkill.level > 0 && evadeSkill.levelConfig) {
        if (rollAttackNegation(evadeSkill.levelConfig.evadeChance)) {
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

    // --- 物理防御貫通 ---
    // スキル側から割合を渡し、装備値と防御バフを含む最終DEFを軽減する。
    if (!options.isHybrid && options.defenseIgnorePercent > 0) {
      defStat = getDefenseAfterIgnore(defStat, options.defenseIgnorePercent);
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

      const hybridIgnorePercent = Math.min(
        100,
        Math.max(0, Number(options.defenseIgnorePercent) || 0)
      );
      if (hybridIgnorePercent > 0) {
        physDef = getDefenseAfterIgnore(physDef, hybridIgnorePercent);
        magDef = getDefenseAfterIgnore(magDef, hybridIgnorePercent);
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

    if (isParty && attacker.hp !== undefined) {
      let equipmentDamagePercent = sumMedalEquipmentEffect(attacker, this.equipMap, 'outgoingDamagePercent', 100);
      const attackerMaxHp = attacker.stats?.hp || attacker.hp.max || 1;
      const hpRatio = attacker.hp.current / attackerMaxHp;
      if (hpRatio >= 1) equipmentDamagePercent += sumMedalEquipmentEffect(attacker, this.equipMap, 'fullHpDamagePercent', 60);
      if (hpRatio <= .5) equipmentDamagePercent += sumMedalEquipmentEffect(attacker, this.equipMap, 'lowHpDamagePercent', 80);
      if (defender.activeAilment) equipmentDamagePercent += sumMedalEquipmentEffect(attacker, this.equipMap, 'afflictedTargetDamagePercent', 80);
      if (options.element || Object.values(attacker.stats.attackElements || {}).some(value => value > 0)) {
        equipmentDamagePercent += sumMedalEquipmentEffect(attacker, this.equipMap, 'elementDamagePercent', 80);
      }
      const lastFloor = this.dungeonDef?.floors?.at(-1)?.level;
      if (Number(this.currentFloorNum) === Number(lastFloor)) {
        equipmentDamagePercent += sumMedalEquipmentEffect(attacker, this.equipMap, 'bossDamagePercent', 100);
      }
      damage = Math.floor(damage * (1 + equipmentDamagePercent / 100));

      const criticalChance = sumMedalEquipmentEffect(attacker, this.equipMap, 'criticalChance', 60);
      if (criticalChance > 0 && Math.random() * 100 < criticalChance) {
        const negated = defender.hp !== undefined
          && rollMedalEquipmentEffect(defender, this.equipMap, 'criticalNegationChance');
        if (!negated) {
          const criticalMultiplier = Math.max(1.5, ...getMedalEquipmentEffects(attacker, this.equipMap)
            .map(effect => Number(effect.criticalMultiplier) || 0));
          damage = Math.floor(damage * criticalMultiplier);
          if (!options.hideActionName) this.showActionName(attacker.elementId, 'MEDAL CRITICAL', 'text-amber-200', 'border-amber-400/60');
        }
      }
    }

    // --- Passive: 死霊軍勢 (corpse stock damage amplification) ---
    if ((attacker.jobId || attacker.job) === 'soul_reaper' && attacker.hp !== undefined) {
      const legion = this._findSkill(attacker, 'legion_of_dead');
      const corpses = getSoulReaperCorpseStock(attacker);
      if (legion?.levelConfig?.corpseDamagePercent && corpses > 0) {
        damage = Math.floor(damage * (1 + corpses * legion.levelConfig.corpseDamagePercent / 100));
      }
    }

    // --- Passive: 急所看破 (Anatomy Mastery) ---
    if (attacker.hp !== undefined) {
      const anatomyMastery = this._findSkill(attacker, 'anatomy_mastery');
      const defenderCurrentHp = defender.hp ? defender.hp.current : defender.currentHp;
      const defenderMaxHp = defender.hp
        ? (defender.stats?.hp || defender.hp.max)
        : (defender.maxHp || defender.stats?.hp);
      if (anatomyMastery?.level > 0 && anatomyMastery.levelConfig?.lowHpDamagePercent
        && defenderMaxHp > 0 && defenderCurrentHp / defenderMaxHp <= .4) {
        damage = Math.floor(damage * (1 + anatomyMastery.levelConfig.lowHpDamagePercent / 100));
      }
    }

    // --- Passive: 夢の残響 (sleeping target damage amplification) ---
    if (defender.activeAilment?.type === 'sleep' && attacker.hp !== undefined) {
      const dreamEcho = this._findSkill(attacker, 'dream_echo');
      if (dreamEcho?.level > 0 && dreamEcho.levelConfig?.sleepingTargetDamagePercent) {
        damage = Math.floor(damage * (1 + dreamEcho.levelConfig.sleepingTargetDamagePercent / 100));
      }
    }

    // --- Passive: 大洋の支配者 (water damage amplification) ---
    if (options.element === 'water' && attacker.hp !== undefined) {
      const oceanSovereignty = this._findSkill(attacker, 'ocean_sovereignty');
      if (oceanSovereignty?.level > 0 && oceanSovereignty.levelConfig?.waterDamagePercent) {
        damage = Math.floor(damage * (1 + oceanSovereignty.levelConfig.waterDamagePercent / 100));
      }
    }
    // --- Passive: 火界の支配者 / 燃焼連鎖 ---
    if (options.element === 'fire' && attacker.hp !== undefined) {
      const flameSovereignty = this._findSkill(attacker, 'flame_sovereignty');
      if (flameSovereignty?.level > 0 && flameSovereignty.levelConfig?.fireDamagePercent) {
        damage = Math.floor(damage * (1 + flameSovereignty.levelConfig.fireDamagePercent / 100));
      }

      if (defender.activeAilment?.type === 'burn') {
        const combustionChain = this._findSkill(attacker, 'combustion_chain');
        if (combustionChain?.level > 0 && combustionChain.levelConfig?.burningTargetDamagePercent) {
          damage = Math.floor(damage * (1 + combustionChain.levelConfig.burningTargetDamagePercent / 100));
        }
      }
    }
    // --- Passive: 氷界の支配者 / 氷砕の奥義 ---
    if (options.element === 'ice' && attacker.hp !== undefined) {
      const iceSovereignty = this._findSkill(attacker, 'ice_sovereignty');
      if (iceSovereignty?.level > 0 && iceSovereignty.levelConfig?.iceDamagePercent) {
        damage = Math.floor(damage * (1 + iceSovereignty.levelConfig.iceDamagePercent / 100));
      }

      if (defender.activeAilment?.type === 'freeze') {
        const shatterMastery = this._findSkill(attacker, 'shatter_mastery');
        if (shatterMastery?.level > 0 && shatterMastery.levelConfig?.frozenTargetDamagePercent) {
          damage = Math.floor(damage * (1 + shatterMastery.levelConfig.frozenTargetDamagePercent / 100));
        }
      }
    }
    // --- Passive: 三界の理 (grass / wind / earth damage amplification) ---
    if (['grass', 'wind', 'earth'].includes(options.element) && attacker.hp !== undefined) {
      const dominion = this._findSkill(attacker, 'three_realms_dominion');
      if (dominion?.level > 0 && dominion.levelConfig?.natureDamagePercent) {
        damage = Math.floor(damage * (1 + dominion.levelConfig.natureDamagePercent / 100));
      }
    }
    if (options.isGuarded) {
      const damageBeforeAutoGuard = damage;
      damage = Math.floor(damage * 0.5);
      this.battleTelemetry?.recordPrevented(defender, defender, damageBeforeAutoGuard - damage, {
        id: 'auto_guard', name: 'オートガード', type: 'passive'
      });
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

    if (options.guardianCoverReduction > 0) {
      const damageBeforeGuardianCover = damage;
      damage = Math.max(1, Math.floor(damage * (1 - options.guardianCoverReduction / 100)));
      this.battleTelemetry?.recordPrevented(defender, defender, damageBeforeGuardianCover - damage, {
        id: 'guardian_oath', name: '守護者の誓約', type: 'active'
      });
    }

    if (!isParty && defender.hp !== undefined) {
      let reduction = sumMedalEquipmentEffect(defender, this.equipMap, 'incomingDamageReductionPercent', 60);
      reduction += isMagic
        ? sumMedalEquipmentEffect(defender, this.equipMap, 'magicDamageReductionPercent', 50)
        : sumMedalEquipmentEffect(defender, this.equipMap, 'physicalDamageReductionPercent', 50);
      const defenderMaxHp = defender.stats?.hp || defender.hp.max || 1;
      if (defender.hp.current / defenderMaxHp <= .5) {
        reduction += sumMedalEquipmentEffect(defender, this.equipMap, 'lowHpDamageReductionPercent', 60);
      }
      if (defender.hp.current >= defenderMaxHp) {
        reduction += sumMedalEquipmentEffect(defender, this.equipMap, 'fullHpDamageReductionPercent', 60);
      }
      damage = Math.max(1, Math.floor(damage * (1 - Math.min(75, reduction) / 100)));
    }

    // --- Passive: Guard ---
    if (!isParty && defender.jobSkills) {
      const guardSkill = this._findSkill(defender, 'guard');
      if (guardSkill && guardSkill.level > 0 && guardSkill.def && guardSkill.levelConfig) {
        const levelConfig = guardSkill.levelConfig;
        if (Math.random() * 100 < levelConfig.chance) {
          const damageBeforeGuard = damage;
          const reduction = levelConfig.reduction;
          damage = Math.floor(damage * (1 - reduction / 100));
          if (damage < 1) damage = 1;
          this.battleTelemetry?.recordPrevented(defender, defender, damageBeforeGuard - damage, guardSkill.def);
          this.showActionName(defender.elementId, 'ガード', 'text-blue-300', 'border-blue-500/50');
        }
      }
    }

    // --- Passive: Slime Body (スライムボディ) ---
    if (!isParty && defender.jobSkills) {
      const slimeBodySkill = this._findSkill(defender, 'slime_body');
      if (slimeBodySkill && slimeBodySkill.level > 0 && slimeBodySkill.levelConfig) {
        const damageBeforeSlimeBody = damage;
        const reduction = slimeBodySkill.levelConfig.reduction || 15;
        damage = Math.floor(damage * (1 - reduction / 100));
        if (damage < 1) damage = 1;
        this.battleTelemetry?.recordPrevented(defender, defender, damageBeforeSlimeBody - damage, slimeBodySkill.def);
        this.showActionName(defender.elementId, 'スライムボディ', 'text-teal-300', 'border-teal-500/50');
      }
    }

    // --- Passive: Parry (物理攻撃を無効化) ---
    if (!isParty && !isMagic && defender.jobSkills) {
      const parrySkill = this._findSkill(defender, 'parry');
      if (parrySkill && parrySkill.level > 0 && parrySkill.levelConfig) {
        if (rollAttackNegation(parrySkill.levelConfig.chance)) {
          const damageBeforeParry = damage;
          damage = 0;
          this.battleTelemetry?.recordPrevented(defender, defender, damageBeforeParry, {
            id: 'parry', name: 'パリィ', type: 'passive'
          });
          this.showActionName(defender.elementId, 'パリィ', 'text-cyan-300', 'border-cyan-500/50');
        }
      }
    }

    // --- 汎用バリア処理 (Divine Shield etc.) ---
    if (defender._barrierHp && defender._barrierHp > 0 && damage > 0) {
      const damageBeforeBarrier = damage;
      if (defender._barrierHp >= damage) {
        defender._barrierHp -= damage;
        damage = 0;
        this.showActionName(defender.elementId, 'BARRIER BLOCK', 'text-amber-300', 'border-amber-500/50');
      } else {
        damage -= defender._barrierHp;
        defender._barrierHp = 0;
        defender._barrierTurns = 0;
        this.showActionName(defender.elementId, 'BARRIER BREAK', 'text-amber-400', 'border-amber-600/50');
      }
      const barrierMetric = defender._battleBarrierMetric;
      this.battleTelemetry?.recordPrevented(
        barrierMetric?.actor || defender,
        defender,
        damageBeforeBarrier - damage,
        barrierMetric?.skill || { id: 'barrier', name: 'バリア', type: 'active' }
      );
      if (!(defender._barrierHp > 0)) defender._battleBarrierMetric = null;
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

    // --- 攻撃アニメーション ---
    let delayDamageMs = 0;
    if (isParty && isNormalAttack && !this._cachedDisableAnim && !document.hidden) {
      // Party normal attacks have a distinct visual for every job. Counter
      // attacks intentionally come through this path as normal attacks too.
      const timing = playNormalAttackAnimation(attacker, defender);
      delayDamageMs = timing.impactDelay;
      attackAnimationMs = Math.max(attackAnimationMs, timing.completionDelay);
      attackCadenceMs = Math.max(attackCadenceMs, timing.cadenceDelay);
    } else if (actionName === 'マジックミサイル' && !this._cachedDisableAnim && !document.hidden) {
      const timing = playMagicMissileAnimation(attacker, defender);
      delayDamageMs = timing.impactDelay;
      attackAnimationMs = Math.max(attackAnimationMs, timing.completionDelay);
      attackCadenceMs = Math.max(attackCadenceMs, timing.cadenceDelay);
    }

    if (delayDamageMs > 0) {
      // Delay the popup animation itself instead of using a managed battle
      // timer. A killing blow stops the ATB loop immediately, which clears
      // those timers before the final damage number can be shown.
      this.showDamage(defender.elementId, damage, dmgColor, delayDamageMs);
    } else if (delayDamageMs === 0) {
      this.showDamage(defender.elementId, damage, dmgColor);
    }

    // --- 状態異常付与判定 ---
    // この攻撃で新しく眠らせた対象まで直後のダメージで起こさないよう、
    // 付与処理より前の状態を記録する。
    const ailmentBeforeHit = defender.activeAilment?.type || null;
    const attackAilments = attacker.stats.attackAilments || {};
    const defenderAilmentResist = defender.stats.ailmentResist || {};
    const inflictedAilments = [];
    
    for (const [ailment, chance] of Object.entries(attackAilments)) {
      if (chance > 0) {
        const rawResist = (defenderAilmentResist[ailment] || 0)
          + (defender._ailmentResistBuffTurns > 0 ? (defender._ailmentResistBuffAmount || 0) : 0);
        const resist = defender.hp !== undefined ? Math.min(95, rawResist) : rawResist;
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
      if (defender.hp !== undefined && hasMedalEquipmentImmunity(defender, this.equipMap, inflictedAilments[0])) {
        ailmentImmune = true;
        this.showActionName(defender.elementId, '状態異常無効', 'text-amber-200', 'border-amber-400/60');
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
        playSoundEffect('enemyDown', { automatic: this.isAutoBattle });
        this.clearEntityStatuses(defender);
        this.processEnemyDeath(defender);
      }
    } else {
      let survivedBySlimeCore = false;
      let survivedByLastBastion = false;
      let survivedByMedalArmor = false;
      const medalSurvivePercent = sumMedalEquipmentEffect(defender, this.equipMap, 'surviveLethalPercent', 80);
      if (defender.hp.current - damage <= 0 && medalSurvivePercent > 0 && !defender._medalLethalSurvivalUsed) {
        const maxHp = defender.stats?.hp || defender.hp.max;
        const survivingHp = Math.max(1, Math.floor(maxHp * medalSurvivePercent / 100));
        damage = Math.max(0, prevHp - survivingHp);
        defender._medalLethalSurvivalUsed = true;
        survivedByMedalArmor = true;
        this._scheduleBattleTimeout(() => {
          this.showActionName(defender.elementId, 'メダル装備・不屈', 'text-amber-200', 'border-amber-400/60');
          this.showDamage(defender.elementId, `HP ${survivingHp}`, 'text-emerald-300');
        }, this.speedMult >= 5 ? 0 : 250 / this.speedMult);
      }
      if (!survivedByMedalArmor && defender.hp.current - damage <= 0 && defender.jobSkills) {
        const lastBastion = this._findSkill(defender, 'last_bastion');
        if (lastBastion?.level > 0 && lastBastion.levelConfig && !defender._guardianLastBastionUsed) {
          const maxHp = defender.stats?.hp || defender.hp.max;
          const survivingHp = Math.max(1, Math.floor(maxHp * lastBastion.levelConfig.revivePercent / 100));
          damage = prevHp - survivingHp;
          defender._guardianLastBastionUsed = true;
          survivedByLastBastion = true;
          this._scheduleBattleTimeout(() => {
            this.showActionName(defender.elementId, 'ラストバスティオン', 'text-amber-200', 'border-amber-400/60');
            this.showDamage(defender.elementId, `HP ${survivingHp}`, 'text-emerald-300');
          }, this.speedMult >= 5 ? 0 : 300 / this.speedMult);
        }

        const slimeCoreSkill = !survivedByLastBastion ? this._findSkill(defender, 'slime_core') : null;
        if (slimeCoreSkill && slimeCoreSkill.level > 0 && slimeCoreSkill.levelConfig) {
          const thresholdPercent = slimeCoreSkill.levelConfig.threshold || 50;
          const currentPercent = (prevHp / (defender.stats.hp || defender.hp.max)) * 100;
          if (currentPercent >= thresholdPercent) {
            damage = prevHp - 1;
            survivedBySlimeCore = true;
            this._scheduleBattleTimeout(() => {
              this.showActionName(defender.elementId, 'スライムコア', 'text-green-300', 'border-green-500/50');
            }, this.speedMult >= 5 ? 0 : 300 / this.speedMult);
          }
        }
      }

      defender.hp.current -= damage;
      if (defender.hp.current <= 0 && !survivedBySlimeCore && !survivedByLastBastion && !survivedByMedalArmor) {
        if (!this.trySoulReaperDeathDenial(defender)) {
          defender.hp.current = 0;
          defender.isDead = true;
          playSoundEffect('enemyDown', { automatic: this.isAutoBattle, rate: .78 });
          this.clearEntityStatuses(defender);
          this.lastKilledBy = {
            monsterId: attacker.id,
            monsterName: attacker.name,
            monsterImage: attacker.image,
            actionName: actionName
          };
        }
      } else if (defender.jobSkills && !options.isCounter) {
        // --- Passive: Counter ---
        const counterSkill = this._findSkill(defender, 'counter');
        if (counterSkill && counterSkill.level > 0 && counterSkill.def && counterSkill.levelConfig) {
          const levelConfig = counterSkill.levelConfig;
          if (Math.random() * 100 < levelConfig.chance) {
            this._scheduleBattleTimeout(() => {
              if (!defender.isDead && !attacker.isDead) {
                this.showActionName(defender.elementId, 'カウンター', 'text-orange-400', 'border-orange-500/50');
                this.executeAttack(defender, attacker, true, {
                  actionName: 'カウンター', hideActionName: true, isCounter: true
                });
              }
            }, this.speedMult >= 5 ? 0 : 500 / this.speedMult);
          }
        }
      }

      if (!defender.isDead && !attacker.isDead && !options.isCounter
        && rollMedalEquipmentEffect(defender, this.equipMap, 'counterChance', 50)) {
        this._scheduleBattleTimeout(() => {
          if (!defender.isDead && !attacker.isDead) {
            this.showActionName(defender.elementId, 'メダル装備・反撃', 'text-amber-200', 'border-amber-400/60');
            this.executeAttack(defender, attacker, true, { actionName: '装備反撃', hideActionName: true, isCounter: true, skipAtbReset: true });
          }
        }, this.speedMult >= 5 ? 0 : 400 / this.speedMult);
      }
    }
    
    const newHp = isDefenderParty ? defender.hp.current : defender.currentHp;
    const damageDealt = Math.max(0, prevHp - newHp);
    this.battleTelemetry?.recordDamage(
      attacker,
      defender,
      damageDealt,
      resolveBattleSkill(this, attacker, actionName, options)
    );

    // --- Passive: Blood Thirst (血の渇望) ---
    // 連撃・全体攻撃の後続ヒットでも毎回処理し、オーバーキル分は吸収量に含めない。
    if (attacker.hp !== undefined && (options.damageType === 'skill' || !options.damageType)) {
      const bloodThirstSkill = this._findSkill(attacker, 'blood_thirst');
      if (bloodThirstSkill && bloodThirstSkill.level > 0 && bloodThirstSkill.levelConfig) {
        const maxHp = attacker.stats?.hp || attacker.hp.max;
        const requestedRecovery = Math.floor(damageDealt * (bloodThirstSkill.levelConfig.drainPercent / 100));
        const actualRecovery = Math.min(requestedRecovery, Math.max(0, maxHp - attacker.hp.current));
        if (actualRecovery > 0) {
          this.showActionName(attacker.elementId, '血の渇望', 'text-red-300', 'border-red-500/50');
          attacker.hp.current += actualRecovery;
          this._scheduleBattleTimeout(() => {
            this.showDamage(attacker.elementId, `+${actualRecovery}`, 'text-green-400');
          }, this.speedMult >= 5 ? 0 : 400 / this.speedMult);
        }
      }
    }

    if (attacker.hp !== undefined && damageDealt > 0) {
      const drainPercent = sumMedalEquipmentEffect(attacker, this.equipMap, 'lifeStealPercent', 40);
      if (drainPercent > 0) {
        const maxHp = attacker.stats?.hp || attacker.hp.max;
        const recovered = Math.min(Math.floor(damageDealt * drainPercent / 100), Math.max(0, maxHp - attacker.hp.current));
        if (recovered > 0) {
          attacker.hp.current += recovered;
          this._scheduleBattleTimeout(() => this.showDamage(attacker.elementId, `+${recovered}`, 'text-emerald-300'), this.speedMult >= 5 ? 0 : 300 / this.speedMult);
        }
      }
    }

    if (isParty && !defender.isDead && defender.hp === undefined) {
      const executeThreshold = sumMedalEquipmentEffect(attacker, this.equipMap, 'executeThresholdPercent', 20);
      if (executeThreshold > 0 && defender.currentHp / Math.max(1, defender.maxHp || defender.stats?.hp) <= executeThreshold / 100) {
        defender.currentHp = 0;
        defender.isDead = true;
        this.showActionName(attacker.elementId, '迷界断絶', 'text-fuchsia-200', 'border-fuchsia-400/60');
        this.processEnemyDeath(defender);
      }
    }

    if (!options.preserveSleep && newHp < prevHp && ailmentBeforeHit === 'sleep'
      && defender.activeAilment && defender.activeAilment.type === 'sleep') {
      if (Math.random() < 0.5) {
        defender.activeAilment = null;
      }
    }

    // --- Passive: Magic Missile ---
    // Every hit explicitly marked as a normal attack owns one missile. This
    // includes Plus One and future effects that repeat a normal attack, while
    // the missile itself remains a skill and cannot recursively trigger here.
    let normalAttackSequenceMs = attackCadenceMs;
    if (isParty && isNormalAttack && !isMagic && attacker.hp !== undefined && !defender.isDead) {
      const missileSkill = this._findSkill(attacker, 'magic_missile');
      if (missileSkill && missileSkill.level > 0 && missileSkill.levelConfig) {
        const missileDelay = attackCadenceMs > 0
          ? attackCadenceMs
          : (this.speedMult >= 5 ? 0 : 300 / this.speedMult);
        if (attackCadenceMs > 0) {
          normalAttackSequenceMs = missileDelay + getMagicMissileAnimationTiming().impactDelay;
        }
        this._scheduleBattleTimeout(() => {
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
        }, missileDelay);
      }
    }

    if (!options.skipAtbReset) {
      const atbRefund = attacker.hp !== undefined
        ? sumMedalEquipmentEffect(attacker, this.equipMap, 'atbRefundPercent', 50)
        : 0;
      attacker.atb = atbRefund * 10;
      if (attacker.hp !== undefined) {
        if (this.activeCharacter === attacker) {
          this.activeCharacter = null;
        }
        
        // --- Passive: Plus One ---
        if (!options.damageType && !isMagic && !options.isEquipmentRepeat) {
          const guaranteedHits = Math.floor(sumMedalEquipmentEffect(attacker, this.equipMap, 'normalAttackExtraHits', 3));
          const chanceHit = rollMedalEquipmentEffect(attacker, this.equipMap, 'normalAttackExtraHitChance') ? 1 : 0;
          const equipmentHits = guaranteedHits + chanceHit;
          for (let i = 0; i < equipmentHits; i++) {
            this._scheduleBattleTimeout(() => {
              const currentTarget = defender.isDead ? this.enemies.find(enemy => !enemy.isDead) : defender;
              if (currentTarget && !currentTarget.isDead && !attacker.isDead) {
                this.executeAttack(attacker, currentTarget, true, {
                  actionName: 'メダル装備・追撃', hideActionName: true, damageType: 'ability',
                  isNormalAttack: true, skipAtbReset: true, isEquipmentRepeat: true,
                });
              }
            }, normalAttackSequenceMs > 0 ? normalAttackSequenceMs * (i + 1) : (this.speedMult >= 5 ? 0 : (350 + i * 180) / this.speedMult));
          }
        }

        if (!options.damageType && !options.isEquipmentRepeat
          && rollMedalEquipmentEffect(attacker, this.equipMap, 'extraActionChance')) {
          this._scheduleBattleTimeout(() => {
            const currentTarget = defender.isDead ? this.enemies.find(enemy => !enemy.isDead) : defender;
            if (currentTarget && !attacker.isDead) {
              this.showActionName(attacker.elementId, 'メダル装備・連続行動', 'text-amber-200', 'border-amber-400/60');
              this.executeAttack(attacker, currentTarget, true, {
                actionName: '連続行動', hideActionName: true, isEquipmentRepeat: true, skipAtbReset: true,
              });
            }
          }, normalAttackSequenceMs > 0 ? normalAttackSequenceMs : (this.speedMult >= 5 ? 0 : 400 / this.speedMult));
        }

        // --- Passive: Plus One ---
        if (!options.damageType && !isMagic && !defender.isDead) {
          const plusOneSkill = this._findSkill(attacker, 'plus_one');
          if (plusOneSkill && plusOneSkill.level > 0 && plusOneSkill.levelConfig) {
            const hits = plusOneSkill.levelConfig.hits || 1;
            for (let i = 0; i < hits; i++) {
              this._scheduleBattleTimeout(() => {
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
                    isNormalAttack: true,
                    hideActionName: true,
                    skipAtbReset: true
                  });
                }
              }, normalAttackSequenceMs > 0
                ? normalAttackSequenceMs * (i + 1)
                : (this.speedMult >= 5 ? 0 : (400 + i * 200) / this.speedMult));
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
                 const mpBefore = attacker.mp.current;
                 attacker.mp.current = Math.min((attacker.stats?.mp || attacker.mp.max), mpBefore + mpRecover);
                 const restoredMp = attacker.mp.current - mpBefore;
                 this._scheduleBattleTimeout(() => {
                   if (restoredMp > 0) this.showDamage(attacker.elementId, `+${restoredMp} MP`, 'text-blue-400');
                 }, this.speedMult >= 5 ? 0 : 400 / this.speedMult);
             }
          }
        }

        // --- Passive: Mana Regen & HP Regen ---
        if (!options.damageType && !options.hideActionName) {
          const manaRegenSkill = this._findSkill(attacker, 'mana_regen');
          if (manaRegenSkill && manaRegenSkill.level > 0 && manaRegenSkill.levelConfig) {
            const amount = manaRegenSkill.levelConfig.recoverMp;
            const mpBefore = attacker.mp.current;
            attacker.mp.current = Math.min(attacker.stats?.mp || attacker.mp.max, mpBefore + amount);
            const restoredMp = attacker.mp.current - mpBefore;
            if (restoredMp > 0) {
              this.showActionName(attacker.elementId, 'マナリジェネ', 'text-blue-300', 'border-blue-500/50');
              this._scheduleBattleTimeout(() => {
                this.showDamage(attacker.elementId, `+${restoredMp} MP`, 'text-blue-400');
              }, this.speedMult >= 5 ? 0 : 600 / this.speedMult);
            }
          }
          
          const hpRegenSkill = this._findSkill(attacker, 'regen');
          if (hpRegenSkill && hpRegenSkill.level > 0 && hpRegenSkill.levelConfig) {
            const amount = hpRegenSkill.levelConfig.recoverHp;
            const hpBefore = attacker.hp.current;
            attacker.hp.current = Math.min(attacker.stats?.hp || attacker.hp.max, hpBefore + amount);
            const restoredHp = attacker.hp.current - hpBefore;
            if (restoredHp > 0) {
              this.showActionName(attacker.elementId, 'リジェネ', 'text-green-300', 'border-green-500/50');
              this._scheduleBattleTimeout(() => {
                this.showDamage(attacker.elementId, `+${restoredHp}`, 'text-green-400');
              }, this.speedMult >= 5 ? 0 : 600 / this.speedMult);
            }
          }

          // --- Passive: Energizing ---
          const energizingSkill = this._findSkill(attacker, 'energizing');
          if (energizingSkill && energizingSkill.level > 0 && energizingSkill.levelConfig) {
            const amount = energizingSkill.levelConfig.recoverMp;
            let applied = false;
            this.party.forEach(p => {
              if (!p.isDead && p.mp && (p.mp.current < (p.stats?.mp || p.mp.max))) {
                const mpBefore = p.mp.current;
                p.mp.current = Math.min(p.stats?.mp || p.mp.max, mpBefore + amount);
                const restoredMp = p.mp.current - mpBefore;
                this._scheduleBattleTimeout(() => {
                  if (restoredMp > 0) this.showDamage(p.elementId, `+${restoredMp} MP`, 'text-blue-400');
                }, this.speedMult >= 5 ? 0 : 600 / this.speedMult);
                applied = applied || restoredMp > 0;
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
                  const hpBefore = p.hp.current;
                  p.hp.current = Math.min(maxHp, hpBefore + healAmount);
                  const restoredHp = p.hp.current - hpBefore;
                  triggered = triggered || restoredHp > 0;
                  this._scheduleBattleTimeout(() => {
                    if (restoredHp > 0) this.showDamage(p.elementId, `+${restoredHp}`, 'text-green-400');
                  }, this.speedMult >= 5 ? 0 : 600 / this.speedMult);
                }
              }
            });
            if (triggered) {
              this.showActionName(attacker.elementId, 'いやしの歌', 'text-pink-300', 'border-pink-500/50');
            }
          }

          this.applyManaOrchestra(attacker);
          this.applyMedalEquipmentActionRecovery(attacker);
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
      const recoil = damageDealt > 0
        ? Math.max(1, Math.floor(damageDealt * recoilMultiplier))
        : 0;
      if (recoil > 0) {
        this.takeAilmentDamage(attacker, recoil, 'CURSE');
      }
    }

    // Keep the target DOM alive until the compositor presents the complete
    // attack, but release the ATB cadence as soon as the hit visibly connects.
    // This preserves killing blows without making 5x combat feel sluggish.
    this._waitForAttackAnimation(defender, attackAnimationMs, attackCadenceMs);
    this.renderEntities();
    this.checkBattleEnd();
  },

  decrementBuffTurns(entity) {
    if (entity.atkDebuffTurns > 0) {
      entity.atkDebuffTurns--;
      if (entity.atkDebuffTurns <= 0) {
        entity.stats.atk = entity.originalAtk;
      }
    }
    if (entity.defDebuffTurns > 0) {
      entity.defDebuffTurns--;
      if (entity.defDebuffTurns <= 0) {
        entity.stats.def = entity.originalDef;
      }
    }
    if (entity._provokeTurns > 0) {
      entity._provokeTurns--;
      if (entity._provokeTurns <= 0) {
        entity._provokeChance = 0;
      }
    }
    if (entity._guardianCoverTurns > 0) {
      entity._guardianCoverTurns--;
      if (entity._guardianCoverTurns <= 0) {
        entity._guardianCoverReduction = 0;
      }
    }
    if (entity._ailmentResistBuffTurns > 0) {
      entity._ailmentResistBuffTurns--;
    }
    if (entity._defBuffTurns > 0) {
      entity._defBuffTurns--;
      if (entity._defBuffTurns <= 0) {
        entity._defBuffPercent = 0;
      }
    }
    if (entity._mdefBuffTurns > 0) {
      entity._mdefBuffTurns--;
      if (entity._mdefBuffTurns <= 0) {
        entity._mdefBuffAmount = 0;
        entity._mdefBuffPercent = 0;
      }
    }
    if (entity._atkBuffTurns > 0) {
      entity._atkBuffTurns--;
      if (entity._atkBuffTurns <= 0) {
        entity._atkBuffPercent = 0;
      }
    }
    if (entity._matkBuffTurns > 0) {
      entity._matkBuffTurns--;
      if (entity._matkBuffTurns <= 0) {
        entity._matkBuffPercent = 0;
      }
    }
    if (entity._barrierTurns > 0) {
      entity._barrierTurns--;
      if (entity._barrierTurns <= 0) {
        entity._barrierHp = 0;
      }
    }
    
    if (entity._regenTurns && entity._regenTurns > 0) {
      if (entity.hp && entity.hp.current < (entity.stats?.hp || entity.hp.max) && !entity.isDead) {
        const hpBefore = entity.hp.current;
        entity.hp.current = Math.min(entity.stats?.hp || entity.hp.max, hpBefore + entity._regenHp);
        const restoredHp = entity.hp.current - hpBefore;
        if (restoredHp > 0) this.showDamage(entity.elementId, `+${restoredHp}`, 'text-green-400');
        
        if (!this._cachedDisableAnim && !document.hidden && this.speedMult < 5) {
          const el = document.getElementById(entity.elementId);
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
              (document.getElementById('battle-effects-layer') || document.body).appendChild(sparkle);
              
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
      entity._regenTurns--;
      if (entity._regenTurns <= 0) entity._regenHp = 0;
    }

    if (entity._manaFlowTurns && entity._manaFlowTurns > 0) {
      if (entity.mp && !entity.isDead) {
        const maxMp = entity.stats?.mp || entity.mp.max;
        const before = entity.mp.current;
        entity.mp.current = Math.min(maxMp, before + (entity._manaFlowAmount || 0));
        const restored = entity.mp.current - before;
        if (restored > 0) this.showDamage(entity.elementId, `+${restored} MP`, 'text-cyan-300');
      }
      entity._manaFlowTurns--;
      if (entity._manaFlowTurns <= 0) entity._manaFlowAmount = 0;
    }
  },

  executeEnemyTurn(enemy) {
    if (this.isStopped) return;

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
            // Reset ATB even if the action didn't call executeAttack internally
            if (enemy.atb !== 0) enemy.atb = 0;
            this.activeEnemy = null;
            this.updateEntities();
            this.checkBattleEnd();
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
