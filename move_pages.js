const fs = require('fs');
const path = require('path');

const src = 'apps/web/src';
const compDir = path.join(src, 'components');
const pageDir = path.join(compDir, 'page');

const pagesToMoveFromSrc = ['Home.tsx'];
const pagesToMoveFromComp = [
  'EventDetail.tsx', 
  'Payment.tsx', 
  'BookingSuccess.tsx', 
  'MyBooking.tsx', 
  'TicketWallet.tsx', 
  'AdminDashboard.tsx', 
  'Help.tsx'
];

// Read all components to know what to replace
const allComps = fs.readdirSync(compDir).filter(f => f.endsWith('.tsx') && !pagesToMoveFromComp.includes(f));

function updatePageImports(filePath, isFromSrc) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update data imports
  content = content.replace(/['"]\.\.\/data\/(.*?)['"]/g, '"../../data/$1"');
  if (isFromSrc) {
    content = content.replace(/['"]\.\/data\/(.*?)['"]/g, '"../../data/$1"');
  }
  
  // Update component imports
  allComps.forEach(c => {
    const name = c.replace('.tsx', '');
    const regex = new RegExp(`['"]\\.\\/${name}['"]`, 'g');
    if (isFromSrc) {
      // Home.tsx imported components from "./components/X"
      content = content.replace(new RegExp(`['"]\\.\\/components\\/${name}['"]`, 'g'), `"../${name}"`);
    } else {
      content = content.replace(regex, `"../${name}"`);
    }
  });

  // Update CSS imports
  content = content.replace(/['"]\.\/(.*\.css)['"]/g, '"../../$1"');
  content = content.replace(/['"]\.\.\/(.*\.css)['"]/g, '"../../$1"');

  fs.writeFileSync(filePath, content);
}

// Process from src
pagesToMoveFromSrc.forEach(p => {
  if (fs.existsSync(path.join(src, p))) {
    updatePageImports(path.join(src, p), true);
    fs.renameSync(path.join(src, p), path.join(pageDir, p));
  }
});

// Process from comp
pagesToMoveFromComp.forEach(p => {
  if (fs.existsSync(path.join(compDir, p))) {
    updatePageImports(path.join(compDir, p), false);
    fs.renameSync(path.join(compDir, p), path.join(pageDir, p));
  }
});

// Now update App.tsx to import pages from components/page
let appCode = fs.readFileSync(path.join(src, 'App.tsx'), 'utf8');
[...pagesToMoveFromSrc, ...pagesToMoveFromComp].forEach(p => {
  const name = p.replace('.tsx', '');
  appCode = appCode.replace(`import ${name} from "./components/${name}";`, `import ${name} from "./components/page/${name}";`);
  appCode = appCode.replace(`import ${name} from "./${name}";`, `import ${name} from "./components/page/${name}";`);
});
fs.writeFileSync(path.join(src, 'App.tsx'), appCode);

console.log('Pages moved to components/page');
