const fs = require('fs');
const path = require('path');

const compDir = 'apps/web/src/components';
const subdirs = ['admin', 'booking', 'cruise', 'home', 'shared'];
const pageDir = 'apps/web/src/components/page';

function fixCssImports(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (filePath.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Since it's in a sub-folder of components (e.g. components/cruise/ or components/page/),
      // the root src is "../../"
      
      // Some files might have import "../CultureHome.css" which should be "../../CultureHome.css"
      content = content.replace(/import ['"]\.\.\/(.*\.css)['"]/g, 'import "../../$1"');
      // If it still has "./CultureHome.css" (from before), make it "../../CultureHome.css"
      content = content.replace(/import ['"]\.\/(.*\.css)['"]/g, 'import "../../$1"');
      
      fs.writeFileSync(filePath, content);
    }
  }
}

subdirs.forEach(sub => fixCssImports(path.join(compDir, sub)));
fixCssImports(pageDir);
// also layout
fixCssImports(path.join(compDir, 'layout'));

console.log('CSS imports fixed.');
