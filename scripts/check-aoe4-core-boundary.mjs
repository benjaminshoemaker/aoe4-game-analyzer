import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const checkedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') return [];
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath);
    return checkedExtensions.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

const failures = [];
const coreIndex = path.join(repoRoot, 'packages/aoe4-core/src/index.ts');
const webCopy = path.join(repoRoot, 'apps/web/src/lib/aoe4');

if (!fs.existsSync(coreIndex)) {
  failures.push('packages/aoe4-core/src/index.ts is missing');
}

const corePackageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages/aoe4-core/package.json'), 'utf-8'));
const coreExports = Object.keys(corePackageJson.exports ?? {});
if (coreExports.length !== 1 || coreExports[0] !== '.') {
  failures.push('packages/aoe4-core must expose only the top-level package interface');
}

if (fs.existsSync(webCopy)) {
  failures.push('apps/web/src/lib/aoe4 must not exist; web should import @aoe4/analyzer-core');
}

const rootLegacyPaths = [
  'src/analysis',
  'src/parser',
  'src/formatters',
  'src/types',
  'src/data/counterMatrix.ts',
  'src/data/unitCounterMatrix.ts',
  'src/data/upgradeMappings.ts',
  'src/data/combatValueEngine.ts',
  'src/data/manualMappings.ts',
  'src/data/counterMatrixConfig.json',
  'src/data/combatAdjustedConfig.json',
  'src/data/postMatchStoryConfig.json',
  'src/data/resourceBandConfig.json',
];

for (const relativePath of rootLegacyPaths) {
  if (fs.existsSync(path.join(repoRoot, relativePath))) {
    failures.push(`${relativePath} must not exist; root src should stay a CLI adapter`);
  }
}

const localAoe4ImportPattern = /from\s+['"](?:\.\/|\.\.\/).*aoe4\//;
for (const filePath of collectFiles(path.join(repoRoot, 'apps/web/src'))) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (localAoe4ImportPattern.test(content)) {
    failures.push(`local analyzer import in ${path.relative(repoRoot, filePath)}`);
  }
}

const deepCoreImportPattern = /from\s+['"]@aoe4\/analyzer-core\//;
for (const root of ['src', 'apps/web/src']) {
  for (const filePath of collectFiles(path.join(repoRoot, root))) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (deepCoreImportPattern.test(content)) {
      failures.push(`deep core package import in ${path.relative(repoRoot, filePath)}`);
    }
  }
}

const forbiddenEndpointPattern = /https:\/\/(?:data\.)?aoe4world\.com\/(?:players|units|buildings|technologies)/;
const allowedEndpointExampleFiles = new Set([
  'apps/web/src/lib/homePageHtml.ts',
]);
for (const root of ['src', 'apps/web/src']) {
  for (const filePath of collectFiles(path.join(repoRoot, root))) {
    const relativePath = path.relative(repoRoot, filePath);
    if (allowedEndpointExampleFiles.has(relativePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    if (forbiddenEndpointPattern.test(content)) {
      failures.push(`AoE4World endpoint hardcoded outside core in ${relativePath}`);
    }
  }
}

if (failures.length > 0) {
  console.error('AoE4 core boundary check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('AoE4 core boundary check passed.');
