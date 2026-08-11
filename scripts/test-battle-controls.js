import fs from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const indexSource = fs.readFileSync(new URL('../js/pages/battle/index.js', import.meta.url), 'utf8');
const controlsSource = fs.readFileSync(new URL('../js/pages/battle/battle-controls.js', import.meta.url), 'utf8');

const statsPosition = indexSource.indexOf('id="tab-btn-stats"');
const controlsPosition = indexSource.indexOf('id="tab-btn-controls"');
const petPosition = indexSource.indexOf('id="tab-btn-pet"');

assert(statsPosition >= 0 && controlsPosition > statsPosition && petPosition > controlsPosition,
  'control tab must be rendered between statistics and companion tabs');
assert(indexSource.includes("id: 'controls'") && indexSource.includes('renderBattleControlsTab(this.elements.tabContent)'),
  'control tab is not wired into battle tab navigation');
assert(controlsSource.includes("localStorage.setItem('autoBattleSpeed'")
    && controlsSource.includes("localStorage.setItem('disableBattleAnimations'")
    && controlsSource.includes("localStorage.setItem('hideBattleStats'")
    && controlsSource.includes("localStorage.setItem('continueOnDeath'")
    && controlsSource.includes('setSoundEffectsEnabled(enabled, { preview: true })'),
  'battle controls do not share all relevant settings with the settings modal');
assert(controlsSource.includes("new Event('settingsChanged')"),
  'control changes are not dispatched to the running battle');
assert(controlsSource.includes("import { activateScreenLock }")
    && controlsSource.includes("data-battle-screen-lock")
    && controlsSource.includes("addEventListener('click', activateScreenLock)"),
  'screen lock button is not connected to the existing screen lock');
assert(controlsSource.includes('class="battle-control-icon')
    && controlsSource.includes('style="display: grid; place-items: center"'),
  'control icons do not use an independent centered wrapper');

console.log('battle controls tests passed');
