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
const touchFeedbackSource = read('../js/utils/touch-feedback.js');

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
    && resultsSource.includes('await this.refreshPetTabResources?.()')
    && petSource.includes('refreshBattlePetInventory'),
  'collection tabs still poll storage during combat or are not invalidated after rewards');

assert(indexSource.includes('touch-action: none;')
    && petSource.includes('dataset.petItemId')
    && petSource.includes('data-pet-owned')
    && indexSource.includes('this._petInventoryRefreshPending = true')
    && touchFeedbackSource.includes("target.matches('input[type=\"range\"]')"),
  'Pet sliders are not touch-draggable or inventory updates still require a full redraw');

assert(indexSource.includes('allInventory\n    );')
    && medalSource.includes('inventoryItems || await GameDB.getAllInventory()'),
  'medal tab does not reuse the inventory snapshot already loaded by its parent');

assert(controlsSource.includes('const MONSTERS_BY_ID = new Map')
    && controlsSource.includes('const ownedMonsterStates = new Map()'),
  'control tab repeatedly scans monster and ranch definitions');

globalThis.localStorage = { getItem: () => null };
globalThis.window = { addEventListener: () => {} };
const { refreshBattlePetInventory } = await import('../js/pages/battle/battle-pet-tab.js');
const toggledClasses = new Map();
const owned = { textContent: '', className: '' };
const slider = { max: '1', value: '1', disabled: false };
const input = { max: '1', value: '1', disabled: false };
const feedButton = { disabled: false };
const controls = { classList: { toggle: (name, enabled) => toggledClasses.set(name, enabled) } };
const progress = { style: { width: '' } };
const nodes = {
  '[data-pet-owned]': owned,
  '.quantity-slider': slider,
  '.quantity-input': input,
  '.btn-feed': feedButton,
  '.battle-quantity-control': controls,
  '.slider-progress': progress
};
const itemRow = {
  dataset: { petItemId: 'slime_drop' },
  querySelector: selector => nodes[selector] || null
};
const root = { querySelectorAll: () => [itemRow] };
const tabContent = { querySelector: selector => selector === '.battle-pet-root' ? root : null };

assert(await refreshBattlePetInventory(tabContent, [{ id: 'slime_drop', quantity: 7 }]),
  'visible Pet inventory could not be refreshed');
assert(owned.textContent === '7' && slider.max === '7' && slider.value === '7'
    && input.value === '7' && !slider.disabled && progress.style.width === '100%',
  'Pet material controls were not updated in place');

await refreshBattlePetInventory(tabContent, []);
assert(slider.disabled && input.disabled && feedButton.disabled
    && toggledClasses.get('pointer-events-none') === true,
  'empty Pet materials did not disable their controls');

console.log('battle tab performance tests passed');
