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
    const stigmaCharacters = [];

    aliveParty.forEach(p => {
      // Last Bastion can trigger once on every floor battle.
      p._guardianLastBastionUsed = false;
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
        p.activeAilment = { type: 'curse', duration: 9999 };
        
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
