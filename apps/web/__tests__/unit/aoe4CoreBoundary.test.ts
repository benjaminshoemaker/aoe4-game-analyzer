import fs from 'fs';
import path from 'path';

const webRoot = path.resolve(__dirname, '..', '..');
const projectRoot = path.resolve(webRoot, '..', '..');

function readJson(relativePath: string): any {
  return JSON.parse(fs.readFileSync(path.join(webRoot, relativePath), 'utf-8'));
}

function collectSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(fullPath);
    return /\.(ts|tsx|js|mjs)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe('web shared-core boundary', () => {
  it('uses the shared analyzer core instead of a local AoE4 copy', () => {
    expect(fs.existsSync(path.join(webRoot, 'src/lib/aoe4'))).toBe(false);
    expect(fs.existsSync(path.join(projectRoot, 'packages/aoe4-core/src/index.ts'))).toBe(true);
  });

  it('does not import analyzer modules through local ./aoe4 paths', () => {
    const offenders = collectSourceFiles(path.join(webRoot, 'src'))
      .filter(filePath => fs.readFileSync(filePath, 'utf-8').match(/from ['"](?:\.\/|\.\.\/).*aoe4\//))
      .map(filePath => path.relative(webRoot, filePath));

    expect(offenders).toEqual([]);
  });

  it('uses only the top-level analyzer core package interface in production source', () => {
    const offenders = collectSourceFiles(path.join(webRoot, 'src'))
      .filter(filePath => fs.readFileSync(filePath, 'utf-8').match(/from ['"]@aoe4\/analyzer-core\//))
      .map(filePath => path.relative(webRoot, filePath));

    expect(offenders).toEqual([]);
  });

  it('installs the shared analyzer core from the local package', () => {
    const packageJson = readJson('package.json');

    expect(packageJson.dependencies['@aoe4/analyzer-core']).toBe('file:../../packages/aoe4-core');
  });
});
