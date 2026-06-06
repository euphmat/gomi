import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = '/Users/euphmat/Desktop/gomi';

const categories = [
    { file: 'js/definitions/weapons.js', assetDir: 'assets/weapon' },
    { file: 'js/definitions/armors.js', assetDir: 'assets/armor' },
    { file: 'js/definitions/shields.js', assetDir: 'assets/shield' },
    { file: 'js/definitions/accessories.js', assetDir: 'assets/accessory' }
];

const missing = [];

for (const cat of categories) {
    const filePath = path.join(baseDir, cat.file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Regex to match: { id: 'some_id', name: 'Some Name', ...
    // Note: there might be spaces around colons
    const regex = /id:\s*'([^']+)',\s*name:\s*'([^']+)'/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
        const id = match[1];
        const name = match[2];
        
        const imagePath = path.join(baseDir, cat.assetDir, `${id}.webp`);
        if (!fs.existsSync(imagePath)) {
            missing.push(`- id: ${id}, 名前: ${name} (${cat.assetDir})`);
        }
    }
}

console.log(missing.join('\n'));
