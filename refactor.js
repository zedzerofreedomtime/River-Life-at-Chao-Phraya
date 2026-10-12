const fs = require('fs');
const path = require('path');

const src = 'apps/web/src';
const compDir = path.join(src, 'components');
const dataDir = path.join(src, 'data');

if (!fs.existsSync(compDir)) fs.mkdirSync(compDir);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const files = fs.readdirSync(src);

const dataFiles = ['api.ts', 'i18n.ts'];
const pages = ['main.tsx', 'App.tsx', 'Home.tsx'];
const cssFiles = ['styles.css', 'CultureHome.css', 'CruiseMenu.css', 'OnboardExperiences.css'];

const components = files.filter(f => f.endsWith('.tsx') && !pages.includes(f));

// Move data files
dataFiles.forEach(f => {
  if (fs.existsSync(path.join(src, f))) {
    fs.renameSync(path.join(src, f), path.join(dataDir, f));
  }
});

// Move components
components.forEach(f => {
  if (fs.existsSync(path.join(src, f))) {
    fs.renameSync(path.join(src, f), path.join(compDir, f));
  }
});

// Helper to update imports in a file
function updateImports(filePath, isComponent, isData, isPage) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace data imports
  dataFiles.forEach(d => {
    const name = d.replace('.ts', '');
    const oldImport = new RegExp(`['"]\\.\\/${name}['"]`, 'g');
    if (isComponent) {
      content = content.replace(oldImport, `"../data/${name}"`);
    } else if (isPage) {
      content = content.replace(oldImport, `"./data/${name}"`);
    } else if (isData) {
      content = content.replace(oldImport, `"./${name}"`);
    }
  });

  // Replace component imports
  components.forEach(c => {
    const name = c.replace('.tsx', '');
    const oldImport = new RegExp(`['"]\\.\\/${name}['"]`, 'g');
    if (isComponent) {
      content = content.replace(oldImport, `"./${name}"`);
    } else if (isPage) {
      content = content.replace(oldImport, `"./components/${name}"`);
    } else if (isData) {
      content = content.replace(oldImport, `"../components/${name}"`);
    }
  });

  // Replace CSS imports if moved? We didn't move CSS files.
  // Wait, if a component imports "./CultureHome.css", it now needs "../CultureHome.css"
  cssFiles.forEach(css => {
    const oldImport = new RegExp(`['"]\\.\\/${css}['"]`, 'g');
    if (isComponent) {
      content = content.replace(oldImport, `"../${css}"`);
    }
  });

  fs.writeFileSync(filePath, content);
}

// Process all files
pages.forEach(p => updateImports(path.join(src, p), false, false, true));
components.forEach(c => updateImports(path.join(compDir, c), true, false, false));
dataFiles.forEach(d => updateImports(path.join(dataDir, d), false, true, false));

console.log('Refactoring complete.');
