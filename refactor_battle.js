const fs = require('fs');

const battlePath = './js/pages/battle.js';
let content = fs.readFileSync(battlePath, 'utf8');

// 1. Add Import
content = content.replace(
  "import { JOBS } from '../jobs/index.js';",
  "import { JOBS } from '../jobs/index.js';\nimport { renderEnemyCardHtml, renderPartyCardHtml, renderInfoTabHtml, renderItemTabHtml, renderSkillTabHtml } from './battle-ui.js';"
);

// 2. Replace renderEnemyCardHtml
const enemyPatternStart = "this.elements.enemyArea.innerHTML = this.enemies.map(e => `";
const enemyPatternEnd = "    `).join('');";
const enemyStartIndex = content.indexOf(enemyPatternStart);
const enemyEndIndex = content.indexOf(enemyPatternEnd, enemyStartIndex) + enemyPatternEnd.length;
content = content.substring(0, enemyStartIndex) + 
  "this.elements.enemyArea.innerHTML = this.enemies.map(e => renderEnemyCardHtml(e, this.selectedEnemyTarget)).join('');" + 
  content.substring(enemyEndIndex);

// 3. Replace renderPartyCardHtml
const partyPatternStart = "      this.elements.partyArea.innerHTML = this.party.map(p => {";
const partyPatternEnd = "      }).join('');";
const partyStartIndex = content.indexOf(partyPatternStart);
const partyEndIndex = content.indexOf(partyPatternEnd, partyStartIndex) + partyPatternEnd.length;
content = content.substring(0, partyStartIndex) + 
  "      this.elements.partyArea.innerHTML = this.party.map(p => renderPartyCardHtml(p, this.activeCharacter, this.isAutoBattle, this.selectedPartyMember)).join('');" + 
  content.substring(partyEndIndex);

// 4. Replace renderInfoTab
const infoPatternStart = "  renderInfoTab() {";
const infoPatternEnd = "    this.elements.tabContent.innerHTML = html;\n  }";
const infoStartIndex = content.indexOf(infoPatternStart);
const infoEndIndex = content.indexOf(infoPatternEnd, infoStartIndex) + infoPatternEnd.length;

const infoReplacement = `  renderInfoTab() {
    let targetEntity = null;
    let isParty = false;
    
    if (this.infoTarget) {
      targetEntity = this.infoTarget.entity;
      isParty = this.infoTarget.type === 'party';
    } else if (this.selectedEnemyTarget) {
      targetEntity = this.selectedEnemyTarget;
      isParty = false;
    } else if (this.selectedPartyMember) {
      targetEntity = this.selectedPartyMember;
      isParty = true;
    } else {
      targetEntity = this.party.find(p => !p.isDead) || this.party[0];
      isParty = true;
    }

    const html = renderInfoTabHtml(targetEntity, isParty, this.equipMap, this.currentFloorNum, MATERIALS);
    this.elements.tabContent.innerHTML = html;
  }`;

content = content.substring(0, infoStartIndex) + infoReplacement + content.substring(infoEndIndex);

// 5. Replace renderItemTab
const itemPatternStart = "  renderItemTab() {";
const itemPatternEnd = "    this.elements.tabContent.innerHTML = html;\n  }";
const itemStartIndex = content.indexOf(itemPatternStart);
const itemEndIndex = content.indexOf(itemPatternEnd, itemStartIndex) + itemPatternEnd.length;

const itemReplacement = `  renderItemTab() {
    const html = renderItemTabHtml(this.obtainedItems);
    this.elements.tabContent.innerHTML = html;
  }`;

content = content.substring(0, itemStartIndex) + itemReplacement + content.substring(itemEndIndex);

// 6. Replace renderSkillTab
const skillPatternStart = "  renderSkillTab() {";
const skillPatternEnd = "    this.elements.tabContent.innerHTML = skillListHtml;\n";
const skillStartIndex = content.indexOf(skillPatternStart);
const skillEndIndex = content.indexOf(skillPatternEnd, skillStartIndex) + skillPatternEnd.length;

const skillReplacement = `  renderSkillTab() {
    if (!this.activeCharacter && !this.isAutoBattle) {
      this.elements.tabContent.innerHTML = '<div class="text-xs text-gray-500 flex items-center justify-center h-full">行動順を待っています...</div>';
      return;
    }

    const p = this.isAutoBattle ? (this.selectedPartyMember || this.party.find(char => !char.isDead)) : this.activeCharacter;
    
    const html = renderSkillTabHtml(p, this.isAutoBattle, this.autoSkillStates, JOBS);
    this.elements.tabContent.innerHTML = html;
`;

content = content.substring(0, skillStartIndex) + skillReplacement + content.substring(skillEndIndex);

fs.writeFileSync(battlePath, content, 'utf8');
console.log('Successfully refactored battle.js');
