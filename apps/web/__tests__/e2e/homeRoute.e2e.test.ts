import { GET } from '../../src/app/route';

describe('home route e2e', () => {
  it('renders validation errors without adding client-side route assets', async () => {
    const response = await GET(new Request('http://localhost/?error=Invalid%20AoE4World%20URL'));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toContain('Invalid AoE4World URL');
    expect(body).toContain('AoE4World match URL');
    expect(body).toContain('--aoe-color-bg: #f7f2e8;');
    expect(body).toContain('--background: var(--aoe-color-bg);');
    expect(body).toContain('--surface: var(--aoe-color-surface);');
    expect(body).toContain('--border: var(--aoe-color-border);');
    expect(body).toContain('--text: var(--aoe-color-text);');
    expect(body).toContain('--muted: var(--aoe-color-muted);');
    expect(body).toContain('font-family: var(--aoe-font-display);');
    expect(body).not.toContain('--background: #f7f2e8;');
    expect(body).not.toContain('/_next/static/chunks/');
    expect(body).not.toContain('self.__next_f');
  });
});
