const fs = require('fs');
const path = require('path');

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'out', 'dist', '.vscode-test', '.next', 'build']);

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    if (IGNORED_DIRS.has(file)) return;
    const resolvedPath = path.join(dir, file);
    const stat = fs.statSync(resolvedPath);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(resolvedPath));
    } else { 
      results.push(resolvedPath);
    }
  });
  return results;
}

const files = walk(process.cwd());

const regexAegisDots = /A\.E\.G\.I\.S\./g;
const regexAegisDotsLower = /a\.e\.g\.i\.s\./g;
const regexAegis = /SHIELD/g;
const regexAegisLower = /shield/g;

let changedFiles = 0;

for (const file of files) {
  try {
    const ext = path.extname(file);
    // restrict to text files
    if (!['.md', '.ts', '.js', '.css', '.html', '.json', '.yaml', '.yml', '.txt'].includes(ext) && ext !== '') continue;
    
    let original = fs.readFileSync(file, 'utf8');
    let mutated = original;
    
    mutated = mutated.replace(regexAegisDots, 'S.H.I.E.L.D.');
    mutated = mutated.replace(regexAegisDotsLower, 's.h.i.e.l.d.');
    mutated = mutated.replace(regexAegis, 'SHIELD');
    mutated = mutated.replace(regexAegisLower, 'shield');
    
    if (original !== mutated) {
      fs.writeFileSync(file, mutated, 'utf8');
      changedFiles++;
      console.log('Fixed:', path.relative(process.cwd(), file));
    }
  } catch (err) {
    // skip non-utf8 or locks
  }
}

console.log('Total files changed:', changedFiles);
