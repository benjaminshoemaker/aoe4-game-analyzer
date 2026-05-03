import fs from 'fs';
import path from 'path';

describe('Vercel deployment config', () => {
  it('builds the Next web app from the monorepo root deployment', () => {
    const repoRoot = path.resolve(__dirname, '../..');
    const config = JSON.parse(fs.readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8'));

    expect(config.framework).toBe('nextjs');
    expect(config.installCommand).toBe('npm install');
    expect(config.buildCommand).toBe('npm --prefix apps/web run build');
    expect(config.outputDirectory).toBe('apps/web/.next');
  });

  it('pins the root Node version to the web app runtime supported by Vercel', () => {
    const repoRoot = path.resolve(__dirname, '../..');
    const rootPackageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    const webPackageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'apps/web/package.json'), 'utf8'));

    expect(rootPackageJson.engines.node).toBe('20.x');
    expect(rootPackageJson.engines.node).toBe(webPackageJson.engines.node);
  });
});
