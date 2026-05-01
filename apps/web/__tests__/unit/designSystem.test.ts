import fs from 'node:fs';
import path from 'node:path';

describe('design system documentation and tokens', () => {
  it('defines app-level design tokens and wires them into global styles', () => {
    const root = process.cwd();
    const tokens = fs.readFileSync(path.join(root, 'design-system/tokens.css'), 'utf-8');
    const master = fs.readFileSync(path.join(root, 'design-system/MASTER.md'), 'utf-8');
    const globals = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf-8');

    expect(tokens).toContain('--aoe-color-bg');
    expect(tokens).toContain('--aoe-radius-md');
    expect(tokens).toContain('--aoe-shadow-panel');
    expect(master).toContain('Data & Analysis');
    expect(master).toContain('Precision & Density');
    expect(globals).toContain('@import "../../design-system/tokens.css";');
  });
});
