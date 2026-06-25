const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('document.body.appendChild')) {
        // Replace in jobs and battle-actions
        if (fullPath.includes('/jobs/') || fullPath.includes('battle-actions.js')) {
          content = content.replace(/document\.body\.appendChild\(/g, "(document.getElementById('battle-effects-layer') || document.body).appendChild(");
          fs.writeFileSync(fullPath, content);
          console.log(`Updated ${fullPath}`);
        }
      }
    }
  }
}

processDir(path.join(__dirname, 'js/jobs'));
processDir(path.join(__dirname, 'js/pages/battle'));
console.log('Done');
