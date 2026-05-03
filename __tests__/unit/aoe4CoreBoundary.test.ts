import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '..', '..');

function readJson(relativePath: string): any {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), 'utf-8'));
}

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

  it('points core package test scripts at existing root test suites', () => {
    const packageJson = readJson('packages/aoe4-core/package.json');
    const suiteByScript: Record<string, string> = {
      'test:unit': '__tests__/unit',
      'test:integration': '__tests__/integration',
      'test:e2e': '__tests__/e2e',
    };

    for (const [scriptName, suitePath] of Object.entries(suiteByScript)) {
      const command = packageJson.scripts[scriptName];
      expect(command).toContain('--config ../../package.json');
      expect(command).toContain(suitePath);
      expect(fs.existsSync(path.join(projectRoot, suitePath))).toBe(true);
    }
  });
});
