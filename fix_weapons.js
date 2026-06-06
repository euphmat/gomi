const fs = require('fs');
const content = fs.readFileSync('js/definitions/weapons.js', 'utf8');

const updated = content.replace(/if\s*\(Math\.random\(\)\s*<\s*([\d.]+)\)\s*\{/g, (match) => {
  return match + ' battle._abilityTriggered = true; ';
});

fs.writeFileSync('js/definitions/weapons.js', updated);
console.log('Fixed weapons.js');
