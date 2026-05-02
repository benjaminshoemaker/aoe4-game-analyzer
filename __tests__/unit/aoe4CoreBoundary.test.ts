import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '..', '..');

function collectSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(fullPath);
    return /\.(ts|tsx|js|mjs)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe('AoE4 core boundary', () => {
  it('exposes the shared analyzer core package', () => {
    expect(fs.existsSync(path.join(projectRoot, 'packages/aoe4-core/src/index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'packages/aoe4-core/package.json'))).toBe(true);
  });

  it('does not keep a copied analyzer implementation inside the web app', () => {
    expect(fs.existsSync(path.join(projectRoot, 'apps/web/src/lib/aoe4'))).toBe(false);
  });

  it('keeps web source imports on the shared core package', () => {
    const webSrc = path.join(projectRoot, 'apps/web/src');
    const offenders = collectSourceFiles(webSrc)
      .filter(filePath => fs.readFileSync(filePath, 'utf-8').match(/from ['"](?:\.\/|\.\.\/).*aoe4\//))
      .map(filePath => path.relative(projectRoot, filePath));

    expect(offenders).toEqual([]);
  });
});
