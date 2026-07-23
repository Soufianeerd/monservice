/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = walk('./src');
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Add text-gray-900 to common input/select/textarea classes if not present
  content = content.replace(/(className="[^"]*block w-full[^"]*border-gray-300[^"]*")/g, (match) => {
    if (!match.includes('text-gray-900') && !match.includes('text-gray-')) {
      return match.replace('className="', 'className="text-gray-900 ');
    }
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    changedFiles++;
    console.log('Fixed inputs in', file);
  }
});

console.log(`Done. Changed ${changedFiles} files.`);
