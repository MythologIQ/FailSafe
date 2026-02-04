const fs = require('fs');
const path = require('path');

const bindingPath = path.join(__dirname, '..', 'node_modules', 'better-sqlite3', 'binding.gyp');

if (!fs.existsSync(bindingPath)) {
  console.warn('better-sqlite3 binding.gyp not found; skipping patch.');
  process.exit(0);
}

const original = fs.readFileSync(bindingPath, 'utf8');
const updated = original
  .replace(/-std=c\+\+17/g, '-std=c++20')
  .replace(/std:c\+\+17/g, 'std:c++20');

if (original === updated) {
  console.warn('better-sqlite3 binding.gyp already patched or no matches found.');
  process.exit(0);
}

fs.writeFileSync(bindingPath, updated);
console.log('Patched better-sqlite3 binding.gyp to use C++20.');
