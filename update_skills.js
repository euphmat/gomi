const fs = require('fs');
const path = require('path');

const jobsDir = path.join(__dirname, 'js/jobs');
const files = fs.readdirSync(jobsDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(jobsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Change execute: (...) => { to execute(...) {
  content = content.replace(/execute:\s*\((.*?)\)\s*=>\s*\{/g, 'execute($1) {');

  // In battle.executeAttack calls, replace hardcoded isMagic / isHybrid 
  // and inject statDependency: this.statDependency
  
  // First, inject statDependency: this.statDependency into all executeAttack calls within these files.
  // We'll look for `battle.executeAttack(caster, target, true, {` and add statDependency.
  content = content.replace(/(battle\.executeAttack\([^,]+,\s*[^,]+,\s*(?:true|false),\s*\{)/g, '$1\n            statDependency: this.statDependency,');
  
  // Then remove isMagic: true, isMagic: false, isHybrid: true
  content = content.replace(/isMagic:\s*(true|false),?\s*\n?/g, '');
  content = content.replace(/isHybrid:\s*(true|false),?\s*\n?/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});
