const fs = require('fs');

const files = ['weapons.js', 'armors.js', 'shields.js', 'accessories.js'];
const dir = '/Users/euphmat/Desktop/gomi/js/definitions/';

files.forEach(file => {
  const content = fs.readFileSync(dir + file, 'utf-8');
  
  // Extract the main array from `export const WEAPONS = [` to `].map`
  const startIndex = content.indexOf('[');
  const endIndex = content.lastIndexOf('].map');
  
  if (startIndex === -1 || endIndex === -1) return;
  
  const before = content.slice(0, startIndex + 1);
  const arrayContent = content.slice(startIndex + 1, endIndex);
  const after = content.slice(endIndex);
  
  // Split array items by observing newlines that start with "  {" or "{ id"
  const lines = arrayContent.split('\n');
  let items = [];
  let currentItem = [];
  
  lines.forEach(line => {
    if (line.trim() === '') return;
    if (line.match(/^\s*\{\s*id:/)) {
      if (currentItem.length > 0) items.push(currentItem.join('\n'));
      currentItem = [line];
    } else {
      currentItem.push(line);
    }
  });
  if (currentItem.length > 0) items.push(currentItem.join('\n'));
  
  // To sort, we just extract the price
  items.sort((a, b) => {
    const getPrice = (str) => {
      const match = str.match(/price:\s*(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };
    return getPrice(a) - getPrice(b);
  });
  
  const newArrayContent = '\n' + items.join('\n') + '\n';
  fs.writeFileSync(dir + file, before + newArrayContent + after);
  console.log(`Sorted ${file}`);
});
