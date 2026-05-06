import { GET } from '../../src/app/route';

function extractExecutableScripts(html: string): string[] {
  return Array.from(html.matchAll(/<script(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/g))
    .map((match) => match[1]);
}

describe('home route e2e', () => {
  it('renders validation errors without adding client-side route assets', async () => {
    const response = await GET(new Request('http://localhost/?error=Invalid%20AoE4World%20URL'));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toContain('Invalid AoE4World URL');
    expect(body).toContain('AoE4World match URL');
    expect(body).toContain('See where the game turned.');
    expect(body).toContain('1v1 match report');
    expect(body).toContain('Paste an AoE4World 1v1 match link. See economy, army, and fight timing in one report.');
    expect(body).toContain('Post-match allocation analysis from <a href="https://aoe4world.com" target="_blank" rel="noopener noreferrer">AoE4World links</a>');
    expect(body).toContain('<a href="https://www.reddit.com/user/shoe7525/" target="_blank" rel="noopener noreferrer">Feedback? DM me on Reddit</a>');
    expect(body).toContain('View sample report');
    expect(body).toContain('Currently supports 1v1 games only.');
    expect(body).toContain('Recap');
    expect(body).toContain('Timeline');
    expect(body).toContain('Selected moment');
    expect(body).toContain('Selected Time');
    expect(body).toContain('Chart focus.');
    expect(body).toContain('Economy edge.');
    expect(body).toContain('Army edge.');
    expect(body).toContain('Resource state over time');
    expect(body).toContain('At 19:51, the military line separates.');
    expect(body).toContain('id="posthog-analytics"');
    expect(body).toContain('posthog.init');
    expect(body).toContain('home match url submitted');
    expect(body).toContain('home match url rejected');
    expect(body).toContain('home outbound link clicked');
    expect(body).toContain('home engagement summary');
    expect(body).toContain('--aoe-color-bg: #f7f2e8;');
    expect(body).toContain('--background: var(--aoe-color-bg);');
    expect(body).toContain('--surface: var(--aoe-color-surface);');
    expect(body).toContain('--surface-alt: var(--aoe-color-report-surface);');
    expect(body).toContain('--border: var(--aoe-color-border);');
    expect(body).toContain('--report-border: var(--aoe-color-report-border);');
    expect(body).toContain('--text: var(--aoe-color-text);');
    expect(body).toContain('--muted: var(--aoe-color-muted);');
    expect(body).toContain('font-family: var(--aoe-font-display);');
    expect(body).not.toContain('Paste an AoE4World match link and inspect the resource mix');
    expect(body).not.toContain('State before the late divergence.');
    expect(body).not.toContain('Why 19:51 matters');
    expect(body).not.toContain('--background: #f7f2e8;');
    expect(body).not.toContain('/_next/static/chunks/');
    expect(body).not.toContain('self.__next_f');

    const scripts = extractExecutableScripts(body);
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) {
      expect(() => new Function(script)).not.toThrow();
    }
  });
});
