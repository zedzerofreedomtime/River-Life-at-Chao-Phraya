const fs = require('fs');
const path = require('path');

const srcDir = 'apps/web/src';
const compDir = path.join(srcDir, 'components');

const fileMap = {
  'Admin.tsx': 'admin',
  'Auth.tsx': 'shared',
  'BoatMap.tsx': 'booking',
  'BookingForm.tsx': 'booking',
  'ZoneEditor.tsx': 'booking',
  'CruiseMenu.tsx': 'cruise',
  'CruiseVideos.tsx': 'cruise',
  'DiningGallery.tsx': 'cruise',
  'OnboardExperiences.tsx': 'cruise',
  'RiverHighlights.tsx': 'cruise',
  'SailingCalendar.tsx': 'cruise',
  'CultureBooking.tsx': 'home',
  'CultureDining.tsx': 'home',
  'CultureFacts.tsx': 'home',
  'CultureHero.tsx': 'home',
  'CultureSpaces.tsx': 'home',
  'CultureStory.tsx': 'home',
  'CultureVip.tsx': 'home',
  'LanguageSwitcher.tsx': 'shared',
  'ProfileMenu.tsx': 'shared',
};

// Create dirs
const categories = [...new Set(Object.values(fileMap))];
categories.forEach(cat => {
  const p = path.join(compDir, cat);
  if (!fs.existsSync(p)) fs.mkdirSync(p);
});

// Function to find all tsx files recursively
function getAllTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllTsxFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = getAllTsxFiles(srcDir);

// Move files first
for (const [file, cat] of Object.entries(fileMap)) {
  const oldPath = path.join(compDir, file);
  const newPath = path.join(compDir, cat, file);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
  }
}

// Helper to calculate relative path from one dir to another file
function getRelativeImport(fromFile, toFile) {
  const fromDir = path.dirname(fromFile);
  let rel = path.relative(fromDir, toFile).replace(/\\/g, '/').replace('.tsx', '');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

// Update imports
for (const filePath of allFiles) {
  // If the file was moved, its path in allFiles is outdated. Update it.
  const baseName = path.basename(filePath);
  let actualFilePath = filePath;
  if (fileMap[baseName] && filePath === path.join(compDir, baseName)) {
    actualFilePath = path.join(compDir, fileMap[baseName], baseName);
  }

  if (fs.existsSync(actualFilePath)) {
    let content = fs.readFileSync(actualFilePath, 'utf8');

    for (const [movedFile, cat] of Object.entries(fileMap)) {
      const movedBase = movedFile.replace('.tsx', '');
      const newDest = path.join(compDir, cat, movedFile);
      
      // We need to replace any import that targets the old location.
      // E.g. in App.tsx: import Auth from "./components/Auth"
      // E.g. in layout/Header.tsx: import LanguageSwitcher from "../LanguageSwitcher"
      // E.g. in moved components themselves (before we moved them): import Auth from "./Auth"
      
      // Instead of regex matching the exact old string, we can use the relative path calculator.
      // But we must know how it was imported *before* the move.
      const oldDest = path.join(compDir, movedFile);
      
      const oldImportRel = getRelativeImport(filePath, oldDest);
      const newImportRel = getRelativeImport(actualFilePath, newDest);

      // Regex to match the old import. E.g. /['"]\.\/components\/Auth['"]/
      // We have to escape dots.
      const oldImportRegexStr = `['"]${oldImportRel.replace(/\./g, '\\.')}['"]`;
      const oldImportRegex = new RegExp(oldImportRegexStr, 'g');

      content = content.replace(oldImportRegex, `"${newImportRel}"`);
    }

    fs.writeFileSync(actualFilePath, content);
  }
}

console.log('Component organization complete.');
