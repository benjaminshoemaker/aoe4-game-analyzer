import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(process.cwd());
const srcDir = path.join(rootDir, 'src');
const disallowedPatterns = [
  /from\s+['"]\.\.\/\.\.\/src\//,
  /from\s+['"]\.\.\/\.\.\/\.\.\/src\//,
  /from\s+['"]\/Users\/coding\/Projects\/aoe4-game-analyzer\/src\//,
  /from\s+['"]src\//,
];
const checkedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);

function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }
    if (checkedExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

const offenders = [];
for (const filePath of collectFiles(srcDir)) {
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const pattern of disallowedPatterns) {
    if (pattern.test(content)) {
      offenders.push(path.relative(rootDir, filePath));
      break;
    }
  }
}

if (offenders.length > 0) {
  console.error('Disallowed imports from root src found:');
  for (const offender of offenders) {
    console.error(`- ${offender}`);
  }
  process.exit(1);
}

console.log('No disallowed root src imports found.');
