import fs from 'node:fs';
import path from 'node:path';
import { renderPostMatchHtml } from '@aoe4/analyzer-core/formatters/postMatchHtml';
import { makeMvpModelFixture } from '../helpers/mvpModelFixture';
import { renderHomeHtml } from '../../src/lib/homePageHtml';

function aoeTokenDeclarations(tokens: string): Array<[string, string]> {
  return Array.from(tokens.matchAll(/(--aoe-[\w-]+):\s*([^;]+);/g))
    .map(([, name, value]) => [name, value.trim()]);
}

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

  it('embeds canonical tokens into generated raw HTML surfaces', () => {
    const root = process.cwd();
    const tokens = fs.readFileSync(path.join(root, 'design-system/tokens.css'), 'utf-8');
    const declarations = aoeTokenDeclarations(tokens);
    const reportHtml = renderPostMatchHtml(makeMvpModelFixture());
    const homeHtml = renderHomeHtml();
    const staticPreviewHtml = fs.readFileSync(path.join(root, 'public/match-preview.html'), 'utf-8');

    for (const [name, value] of declarations) {
      expect(reportHtml).toContain(`${name}: ${value};`);
      expect(homeHtml).toContain(`${name}: ${value};`);
      expect(staticPreviewHtml).toContain(`${name}: ${value};`);
    }

    expect(reportHtml).toContain('--color-background: var(--aoe-color-report-bg);');
    expect(reportHtml).toContain('--color-background-secondary: var(--aoe-color-report-bg-secondary);');
    expect(reportHtml).toContain('--color-card: var(--aoe-color-report-surface);');
    expect(reportHtml).toContain('--color-text: var(--aoe-color-report-text);');
    expect(reportHtml).toContain('--color-muted: var(--aoe-color-report-muted);');
    expect(reportHtml).toContain('--color-border: var(--aoe-color-report-border);');
    expect(reportHtml).toContain('font-family: var(--aoe-font-report);');
    expect(reportHtml).toContain('border-radius: var(--aoe-radius-lg);');
    expect(reportHtml).toContain('box-shadow: var(--aoe-shadow-panel);');
    expect(reportHtml).not.toContain('--color-background: #f2f4ee;');
    expect(staticPreviewHtml).toContain('--color-background: var(--aoe-color-report-bg);');
    expect(staticPreviewHtml).toContain('font-family: var(--aoe-font-report);');
    expect(staticPreviewHtml).not.toContain('--color-background: #f2f4ee;');

    expect(homeHtml).toContain('--background: var(--aoe-color-bg);');
    expect(homeHtml).toContain('--surface: var(--aoe-color-surface);');
    expect(homeHtml).toContain('--border: var(--aoe-color-border);');
    expect(homeHtml).toContain('--text: var(--aoe-color-text);');
    expect(homeHtml).toContain('--muted: var(--aoe-color-muted);');
    expect(homeHtml).toContain('--primary: var(--aoe-color-primary);');
    expect(homeHtml).toContain('font-family: var(--aoe-font-display);');
    expect(homeHtml).not.toContain('--background: #f7f2e8;');
  });
});
