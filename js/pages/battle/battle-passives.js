/**
 * battle-passives.js
 * 戦闘開始時のパッシブスキル適用
 */

export const passiveMethods = {
  applyStartOfBattlePassives() {
    const aliveParty = this.party.filter(p => !p.isDead);
    let protectionConfig = null;
    let magicBarrierConfig = null;
    let weaponBlessConfig = null;
    let magicBlessConfig = null;
    let openingActConfig = null;

    aliveParty.forEach(p => {
      if (p.jobSkills) {
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
          p.stats.spd = Math.floor(p.stats.spd * (1 + openingActConfig.spdPercent / 100));
        }
        
        if (isFirstFloor) {
          setTimeout(() => {
            this.showDamage(p.elementId, `SPD UP`, 'text-teal-300');
          }, delay);
        }
      });
      if (isFirstFloor) delay += 500;
    }
  }
};
