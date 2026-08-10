/**
 * battle-passives.js
 * 戦闘開始時のパッシブスキル適用
 */
import { hasMedalEquipmentImmunity, sumMedalEquipmentEffect } from '../../utils/medal-equipment-effects.js';

export const passiveMethods = {
  applyStartOfBattlePassives() {
    const aliveParty = this.party.filter(p => !p.isDead);
    let protectionConfig = null;
    let magicBarrierConfig = null;
    let weaponBlessConfig = null;
    let magicBlessConfig = null;
    let openingActConfig = null;
    const stigmaCharacters = [];

    aliveParty.forEach(p => {
      // Last Bastion can trigger once on every floor battle.
      p._guardianLastBastionUsed = false;
      p._medalLethalSurvivalUsed = false;
      const startingAtb = sumMedalEquipmentEffect(p, this.equipMap, 'startingAtb', 1000);
      if (startingAtb > 0) p.atb = Math.max(p.atb || 0, startingAtb);
      const startingBarrierPercent = sumMedalEquipmentEffect(p, this.equipMap, 'startingBarrierPercent', 60);
      if (startingBarrierPercent > 0) {
        p._barrierHp = Math.floor((p.stats?.hp || p.hp.max || 1) * startingBarrierPercent / 100);
        p._barrierTurns = 9999;
        p._battleBarrierMetric = {
          actor: p,
          skill: { id: 'medal_equipment_barrier', name: 'メダル装備・障壁', type: 'passive' },
        };
      }
      if (p.jobSkills) {
        // --- 贖罪の烙印 (Stigma of Atonement) ---
        const uw = this._findSkill(p, 'stigma_of_atonement');
        if (uw && uw.level > 0 && uw.levelConfig && uw.def.type === 'passive') {
          stigmaCharacters.push(p);
        }

        const prot = this._findSkill(p, 'protection');
        if (prot && prot.level > 0 && prot.levelConfig && prot.def.type === 'passive') {
          if (!protectionConfig || prot.levelConfig.percent > protectionConfig.percent) {
            protectionConfig = prot.levelConfig;
          }
        }
        const mb = this._findSkill(p, 'magic_barrier');
        if (mb && mb.level > 0 && mb.levelConfig && mb.def.type === 'passive') {
          if (!magicBarrierConfig || mb.levelConfig.percent > magicBarrierConfig.percent) {
            magicBarrierConfig = mb.levelConfig;
          }
        }
        const wb = this._findSkill(p, 'weapon_bless');
        if (wb && wb.level > 0 && wb.levelConfig && wb.def.type === 'passive') {
          if (!weaponBlessConfig || wb.levelConfig.percent > weaponBlessConfig.percent) {
            weaponBlessConfig = wb.levelConfig;
          }
        }
        const magb = this._findSkill(p, 'magic_bless');
        if (magb && magb.level > 0 && magb.levelConfig && magb.def.type === 'passive') {
          if (!magicBlessConfig || magb.levelConfig.percent > magicBlessConfig.percent) {
            magicBlessConfig = magb.levelConfig;
          }
        }
        const oa = this._findSkill(p, 'opening_act');
        if (oa && oa.level > 0 && oa.levelConfig && oa.def.type === 'passive') {
          if (!openingActConfig || oa.levelConfig.spdPercent > openingActConfig.spdPercent) {
            openingActConfig = oa.levelConfig;
          }
        }
      }
    });

    let delay = 500;
    const isFirstFloor = this.currentFloorNum === 1 && !this.isAutoBattle;

    if (protectionConfig) {
      aliveParty.forEach(p => {
        p._passiveDefBuffPercent = Math.max(p._passiveDefBuffPercent || 0, protectionConfig.percent);
        
        if (isFirstFloor) {
          setTimeout(() => {
            this.showDamage(p.elementId, `DEF UP`, 'text-green-400');
          }, delay);
        }
      });
      if (isFirstFloor) delay += 500;
    }

    if (magicBarrierConfig) {
      aliveParty.forEach(p => {
        p._passiveMdefBuffPercent = Math.max(p._passiveMdefBuffPercent || 0, magicBarrierConfig.percent);
        
        if (isFirstFloor) {
          setTimeout(() => {
            this.showDamage(p.elementId, `MDEF UP`, 'text-indigo-300');
          }, delay);
        }
      });
      if (isFirstFloor) delay += 500;
    }

    if (weaponBlessConfig) {
      aliveParty.forEach(p => {
        p._passiveAtkBuffPercent = Math.max(p._passiveAtkBuffPercent || 0, weaponBlessConfig.percent);
        
        if (isFirstFloor) {
          setTimeout(() => {
            this.showDamage(p.elementId, `ATK UP`, 'text-red-400');
          }, delay);
        }
      });
      if (isFirstFloor) delay += 500;
    }

    if (magicBlessConfig) {
      aliveParty.forEach(p => {
        p._passiveMatkBuffPercent = Math.max(p._passiveMatkBuffPercent || 0, magicBlessConfig.percent);
        
        if (isFirstFloor) {
          setTimeout(() => {
            this.showDamage(p.elementId, `MATK UP`, 'text-purple-400');
          }, delay);
        }
      });
      if (isFirstFloor) delay += 500;
    }

    if (openingActConfig) {
      aliveParty.forEach(p => {
        if (p.stats && p.stats.spd) {
          p._passiveSpdBuffPercent = Math.max(p._passiveSpdBuffPercent || 0, openingActConfig.spdPercent);
        }
        
        if (isFirstFloor) {
          setTimeout(() => {
            this.showDamage(p.elementId, `SPD UP`, 'text-teal-300');
          }, delay);
        }
      });
      if (isFirstFloor) delay += 500;
    }

    // --- 贖罪の烙印 (Stigma of Atonement): 常時呪い状態付与 ---
    if (stigmaCharacters.length > 0) {
      stigmaCharacters.forEach(p => {
        if (!hasMedalEquipmentImmunity(p, this.equipMap, 'curse')) {
          p.activeAilment = { type: 'curse', duration: 9999 };
        } else {
          this.showActionName(p.elementId, '状態異常無効', 'text-amber-200', 'border-amber-400/60');
        }
        
        if (isFirstFloor) {
          setTimeout(() => {
            this.showDamage(p.elementId, '贖罪の烙印', 'text-fuchsia-400');
          }, delay);
        }
      });
      if (isFirstFloor) delay += 500;
    }
  }
};
