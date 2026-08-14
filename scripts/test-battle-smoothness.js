const fs = await import('node:fs');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const animationSource = read('../js/utils/battle-animation.js');
const atbSource = read('../js/pages/battle/battle-atb.js');
const indexSource = read('../js/pages/battle/index.js');
const rendererSource = read('../js/pages/battle/battle-renderer.js');
const popupSource = read('../js/pages/battle/battle-popups.js');

assert(animationSource.includes('export function canCreateBattleEffect')
    && animationSource.includes('activeEffects < limit')
    && animationSource.includes('battleSpeed >= 5) return 40')
    && animationSource.includes('battleSpeed >= 5) return 24'),
  'high-speed effects are not rejected before their DOM and animations are created');

assert(atbSource.includes('battleSpeed >= 5 ? 16 : enemyDelay')
    && indexSource.includes('this.speedMult >= 5 ? 16 : delay'),
  'maximum-speed actions still run synchronously inside the ATB timer task');

assert(rendererSource.includes('AUTO_BATTLE_HUD_INTERVAL = 1000 / 15')
    && rendererSource.includes('FAST_AUTO_BATTLE_HUD_INTERVAL = 1000 / 10')
    && rendererSource.includes('FAST_AUTO_BATTLE_HUD_INTERVAL\n      : AUTO_BATTLE_HUD_INTERVAL'),
  'maximum-speed auto battle does not reduce HUD work');

assert(atbSource.includes('getAtbAdvanceSteps(atbEntries, maxAdvanceSteps)')
    && !atbSource.includes('while (!nextActor && loops < MAX_LOOPS)'),
  'fast-forward ATB still rescans all combatants for every skipped step');

assert(rendererSource.includes('compact ? (fast ? 2 : 3) : 4')
    && rendererSource.includes('compact ? (fast ? 3 : 4) : 5'),
  'auto battle defeats still create the full fragment animation load');

assert(popupSource.includes('this.isAutoBattle ? 250 : 16')
    && popupSource.includes("speed >= 5 ? 18 : 48")
    && popupSource.includes('popup.replaceChildren(icon, value)'),
  'auto battle popups still force frequent layout or allocate children per hit');

const { getBattleEffectLimit } = await import('../js/utils/battle-animation.js');
assert(getBattleEffectLimit(5, true) === 24 && getBattleEffectLimit(5, false) === 40,
  'auto battle does not have an isolated decorative-effect budget');

const { popupMethods } = await import('../js/pages/battle/battle-popups.js');
let rectReads = 0;
const cachedRect = { left: 1, top: 2, width: 3, height: 4 };
const popupManager = {
  isAutoBattle: true,
  domCache: {
    party: {
      'party-0': { root: { getBoundingClientRect: () => { rectReads += 1; return cachedRect; } } }
    },
    enemies: {}
  },
  container: { querySelector: () => null }
};
assert(popupMethods._getBattleElementRect.call(popupManager, 'party-0') === cachedRect
    && popupMethods._getBattleElementRect.call(popupManager, 'party-0') === cachedRect
    && rectReads === 1,
  'auto battle popup positions were not reused between layout changes');

console.log('battle smoothness tests passed');
