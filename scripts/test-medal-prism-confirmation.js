import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../js/pages/shop-tabs/medal-tab.js', import.meta.url), 'utf8');
const handlerStart = source.indexOf('prismBtn.onclick = async () => {');
const handlerEnd = source.indexOf('actionButtons.appendChild(prismBtn);', handlerStart);
const handler = source.slice(handlerStart, handlerEnd);

assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, 'Prism upgrade handler must exist.');
assert.match(handler, /await showPrismUpgradeConfirmation\(monster, nextRank\)/,
  'Prism upgrades must ask for confirmation.');
assert.ok(
  handler.indexOf('await showPrismUpgradeConfirmation(monster, nextRank)')
    < handler.indexOf("GameDB.getGameState('prism')"),
  'Confirmation must happen before reading and spending Prism.'
);
assert.match(handler, /if \(!confirmed\) \{[\s\S]*return;[\s\S]*\}/,
  'Choosing no must stop the Prism upgrade.');
assert.match(handler, /latestRankIndex !== nextRankIndex - 1/,
  'The confirmed rank must be revalidated before spending Prism.');

const modalStart = source.indexOf('function showPrismUpgradeConfirmation');
const modalEnd = source.indexOf('function showCraftSuccessAnimation', modalStart);
const modal = source.slice(modalStart, modalEnd);

assert.ok(modalStart >= 0 && modalEnd > modalStart, 'Prism confirmation modal must exist.');
assert.match(modal, /aria-modal/);
assert.match(modal, /data-prism-confirm-no[^>]*>[\s\S]*いいえ<\/button>/);
assert.match(modal, /data-prism-confirm-yes[^>]*>[\s\S]*はい<\/button>/);
assert.match(modal, /本当にPrismを1個使用して/);

console.log('Medal Prism confirmation checks passed.');
