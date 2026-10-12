const fs = require('fs');
const path = require('path');

const compDir = 'apps/web/src/components';
const subdirs = ['admin', 'booking', 'cruise', 'home', 'shared'];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (filePath.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Fix data imports
      content = content.replace(/['"]\.\.\/data\/(.*?)['"]/g, '"../../data/$1"');
      
      // Fix page imports? Usually components don't import pages, but let's check.
      // Wait, any component import like "../BoatMap" needs to be fixed.
      // I already did some replacements in the previous script. Let's see if there are any broken ones.
      // Actually, if a component in cruise/ imported something in shared/, it should be "../shared/Auth"
      // Wait! In the original folder src/components/, it imported "./Auth".
      // My script changed "./Auth" to "../shared/Auth". Which is correct!
      
      fs.writeFileSync(filePath, content);
    }
  }
}

subdirs.forEach(sub => processDir(path.join(compDir, sub)));
console.log('Imports fixed.');
