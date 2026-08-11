const fs = await import('node:fs');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const animationSource = read('../js/utils/battle-animation.js');
const atbSource = read('../js/pages/battle/battle-atb.js');
const indexSource = read('../js/pages/battle/index.js');
const rendererSource = read('../js/pages/battle/battle-renderer.js');

assert(animationSource.includes('export function canCreateBattleEffect')
    && animationSource.includes('activeEffects < limit')
    && animationSource.includes('battleSpeed >= 5) return 40'),
  'high-speed effects are not rejected before their DOM and animations are created');

assert(atbSource.includes('battleSpeed >= 5 ? 16 : enemyDelay')
    && indexSource.includes('this.speedMult >= 5 ? 16 : delay'),
  'maximum-speed actions still run synchronously inside the ATB timer task');

assert(rendererSource.includes('FAST_AUTO_BATTLE_HUD_INTERVAL = 1000 / 20')
    && rendererSource.includes('FAST_AUTO_BATTLE_HUD_INTERVAL\n      : AUTO_BATTLE_HUD_INTERVAL'),
  'maximum-speed auto battle does not reduce HUD work');

console.log('battle smoothness tests passed');
