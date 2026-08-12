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
assert(indexSource.includes("id: 'controls'") && indexSource.includes('renderBattleControlsTab(this.elements.tabContent, {'),
  'control tab is not wired into battle tab navigation');
assert(controlsSource.includes("localStorage.setItem('autoBattleSpeed'")
    && controlsSource.includes("localStorage.setItem('disableBattleAnimations'")
    && controlsSource.includes("localStorage.setItem('hideBattleStats'")
    && controlsSource.includes("localStorage.setItem('continueOnDeath'"),
  'battle controls do not share all remaining relevant settings with the settings modal');
assert(!controlsSource.includes("id: 'sound'"),
  '廃止済みの設定が戦闘コントロールに残っています');
assert(controlsSource.includes("new Event('settingsChanged')"),
  'control changes are not dispatched to the running battle');
assert(controlsSource.includes("import { activateScreenLock }")
    && controlsSource.includes("data-battle-screen-lock")
    && controlsSource.includes("addEventListener('click', activateScreenLock)"),
  'screen lock button is not connected to the existing screen lock');
assert(controlsSource.includes('class="battle-control-icon')
    && controlsSource.includes('style="display: grid; place-items: center"'),
  'control icons do not use an independent centered wrapper');
assert(controlsSource.includes('data-battle-floor-jump=')
    && controlsSource.includes('階層ジャンプ')
    && controlsSource.includes('battleContext.onFloorJump(targetFloor)'),
  'completed dungeon floor jump controls are not rendered or connected');
assert(controlsSource.includes("owned.companion ? 'bg-emerald-300'")
    && controlsSource.includes("owned.legendary ? 'bg-amber-300'")
    && controlsSource.includes("hasMedal ? 'bg-cyan-300'")
    && indexSource.includes('ranchData: this.ranchData')
    && indexSource.includes('playerMedals: this.playerMedals'),
  'floor jump monster icons do not show companion, legendary, and medal status');
assert(controlsSource.includes('const floorMonsters = monsterIds.map(monsterId =>')
    && !controlsSource.includes('monsterIds.slice(0, 4)')
    && !controlsSource.includes('remainingMonsterCount'),
  'floor jump controls must render every monster instead of a +N summary');
assert(indexSource.includes("GameDB.getGameState('completed_dungeons')")
    && indexSource.includes('async jumpToFloor(floorLevel)')
    && indexSource.includes("GameDB.setGameState('currentFloor', targetFloor)")
    && indexSource.includes('syncBattleControlsFloor(this.elements.tabContent, this.currentFloorNum)')
    && !indexSource.includes("removeAttribute('data-rendered-tab')"),
  'battle floor jump does not validate completion and update the selected floor');
assert(controlsSource.includes('export function syncBattleControlsFloor')
    && controlsSource.includes("section.dataset.currentFloor === String(currentFloorNum)"),
  'floor progress must update in place without replacing monster images');

console.log('battle controls tests passed');
