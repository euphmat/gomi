const fs = require('fs');
const path = require('path');

let content = fs.readFileSync(path.join(__dirname, 'js/jobs/mage.js'), 'utf8');

// A helper to replace autoBattle for a specific skill id
function replaceAutoBattle(id, newAutoBattle) {
  const regex = new RegExp(`(id:\\s*'${id}'.*?autoBattle:\\s*\\{)(.*?)(^\\s*\\}(?:,|\\n))`, 'ms');
  content = content.replace(regex, `$1\n${newAutoBattle}\n$3`);
}

replaceAutoBattle('fireball', `        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let bestTarget = null;
          let bestScore = 0;
          for (const enemy of aliveEnemies) {
            const resist = enemy.stats?.elementResist?.fire || 0;
            const score = 50 * levelConfig.multiplier * ((100 - resist) / 100);
            if (score > bestScore) {
              bestScore = score;
              bestTarget = enemy;
            }
          }
          if (bestScore > 0) return { target: bestTarget, score: bestScore };
          return null;
        }`);

replaceAutoBattle('ice_lance', `        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let bestTarget = null;
          let bestScore = 0;
          for (const enemy of aliveEnemies) {
            const resist = enemy.stats?.elementResist?.ice || 0;
            const score = 50 * levelConfig.multiplier * ((100 - resist) / 100);
            if (score > bestScore) {
              bestScore = score;
              bestTarget = enemy;
            }
          }
          if (bestScore > 0) return { target: bestTarget, score: bestScore };
          return null;
        }`);

replaceAutoBattle('thunder', `        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let bestTarget = null;
          let bestScore = 0;
          for (const enemy of aliveEnemies) {
            const resist = enemy.stats?.elementResist?.thunder || 0;
            const score = 50 * levelConfig.multiplier * ((100 - resist) / 100);
            if (score > bestScore) {
              bestScore = score;
              bestTarget = enemy;
            }
          }
          if (bestScore > 0) return { target: bestTarget, score: bestScore };
          return null;
        }`);

replaceAutoBattle('magic_barrier', `        check: (caster, levelConfig, context) => {
          const aliveParty = context.party.filter(p => !p.isDead);
          const unbuffedCount = aliveParty.filter(p => !p._mdefBuffTurns || p._mdefBuffTurns <= 0).length;
          if (unbuffedCount >= aliveParty.length / 2) {
             return { target: caster, score: 80 };
          }
          return null;
        }`);

replaceAutoBattle('blizzard', `        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let totalScore = 0;
          for (const enemy of aliveEnemies) {
             const resist = enemy.stats?.elementResist?.ice || 0;
             totalScore += 35 * levelConfig.multiplier * ((100 - resist) / 100);
          }
          if (totalScore > 60) return { target: aliveEnemies[0], score: totalScore };
          return null;
        }`);

replaceAutoBattle('volcano', `        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let totalScore = 0;
          for (const enemy of aliveEnemies) {
             const resist = enemy.stats?.elementResist?.fire || 0;
             totalScore += 35 * levelConfig.multiplier * ((100 - resist) / 100);
          }
          if (totalScore > 60) return { target: aliveEnemies[0], score: totalScore };
          return null;
        }`);

replaceAutoBattle('thunderstorm', `        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let totalScore = 0;
          for (const enemy of aliveEnemies) {
             const resist = enemy.stats?.elementResist?.thunder || 0;
             totalScore += 35 * levelConfig.multiplier * ((100 - resist) / 100);
          }
          if (totalScore > 60) return { target: aliveEnemies[0], score: totalScore };
          return null;
        }`);

fs.writeFileSync(path.join(__dirname, 'js/jobs/mage.js'), content);
console.log('Updated mage.js');
