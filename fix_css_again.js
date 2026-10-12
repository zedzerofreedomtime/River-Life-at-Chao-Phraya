const fs = require('fs');
const path = require('path');

const compDir = 'apps/web/src/components';
const subdirs = ['admin', 'booking', 'cruise', 'home', 'shared', 'page', 'layout'];

const cssFiles = ['styles.css', 'CultureHome.css', 'CruiseMenu.css', 'OnboardExperiences.css'];

function fixCss(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (filePath.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      cssFiles.forEach(css => {
        // Strip out any existing imports for this css file
        const regex = new RegExp(`import ['"](.*)${css}['"];?`, 'g');
        content = content.replace(regex, `import "../../${css}";`);
      });
      
      fs.writeFileSync(filePath, content);
    }
  }
}

subdirs.forEach(sub => fixCss(path.join(compDir, sub)));
console.log('CSS fixed.');
