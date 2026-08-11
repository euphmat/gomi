const fs = await import('node:fs');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const indexSource = read('../js/pages/battle/index.js');
const rendererSource = read('../js/pages/battle/battle-renderer.js');
const statisticsSource = read('../js/pages/battle/battle-statistics.js');
const petSource = read('../js/pages/battle/battle-pet-tab.js');
const medalSource = read('../js/pages/battle/battle-medal-tab.js');
const controlsSource = read('../js/pages/battle/battle-controls.js');
const resultsSource = read('../js/pages/battle/battle-results.js');

assert(indexSource.includes('this._lastSkillRenderKey === skillRenderKey')
    && indexSource.includes('scheduleTabContentRender() {')
    && rendererSource.includes("autoBattleChanged || this.currentTab === 'skill'")
    && rendererSource.includes('this.scheduleTabContentRender()'),
  'skill tab renders are not deduplicated and coalesced');

assert(statisticsSource.includes('AUTO_STAT_RENDER_INTERVAL = 2000')
    && statisticsSource.includes('!manager.isTabInteracting')
    && indexSource.includes("if (this.currentTab !== 'stats') cleanupBattleStatistics(this)"),
  'statistics rendering is not throttled or cancelled when inactive');

assert(!petSource.includes('setInterval(')
    && !medalSource.includes('setInterval(')
    && !indexSource.includes('lastMedalRenderTime')
    && resultsSource.includes("['pet', 'medal'].includes(this.currentTab)"),
  'collection tabs still poll storage during combat or are not invalidated after rewards');

assert(indexSource.includes('allInventory\n    );')
    && medalSource.includes('inventoryItems || await GameDB.getAllInventory()'),
  'medal tab does not reuse the inventory snapshot already loaded by its parent');

assert(controlsSource.includes('const MONSTERS_BY_ID = new Map')
    && controlsSource.includes('const ownedMonsterStates = new Map()'),
  'control tab repeatedly scans monster and ranch definitions');

console.log('battle tab performance tests passed');
