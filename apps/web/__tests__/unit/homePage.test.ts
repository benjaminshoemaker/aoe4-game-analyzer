import fs from 'node:fs';
import path from 'node:path';

describe('HomePage form', () => {
  it('uses a server-submitted text input so the landing page does not hydrate form logic', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/app/page.tsx'), 'utf-8');

    expect(source).not.toContain("'use client'");
    expect(source).not.toContain('useState');
    expect(source).not.toContain('window.location');
    expect(source).toContain('searchParams?: Promise');
    expect(source).toContain('method="get"');
    expect(source).toContain('action="/matches/open"');
    expect(source).toContain('<label');
    expect(source).toContain('htmlFor="match-url"');
    expect(source).toContain('id="match-url"');
    expect(source).toContain('name="url"');
    expect(source).toContain('type="text"');
    expect(source).toContain('inputMode="url"');
    expect(source).not.toContain('type="url"');
    expect(source).toContain('minHeight: 44');
    expect(source).toContain('minWidth: 44');
  });
});
