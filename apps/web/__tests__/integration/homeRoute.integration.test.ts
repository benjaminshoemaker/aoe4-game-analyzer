import { GET } from '../../src/app/route';

function extractExecutableScripts(html: string): string[] {
  return Array.from(html.matchAll(/<script(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/g))
    .map((match) => match[1]);
}

describe('home route integration', () => {
  it('returns cacheable raw HTML for the default form page', async () => {
    const response = await GET(new Request('http://localhost/'));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('cache-control')).toContain('public');
    expect(body).toContain('See where the game turned.');
    expect(body).toContain('href="https://aoe4world.com" target="_blank" rel="noopener noreferrer"');
    expect(body).toContain('href="https://www.reddit.com/user/shoe7525/" target="_blank" rel="noopener noreferrer"');
    expect(body).toContain('Feedback? DM me on Reddit');
    expect(body).toContain('View sample report');
    expect(body).toContain('Resource state over time');
    expect(body).toContain('/matches/8139502/229727104?sig=');
    expect(body).toContain('<form method="get" action="/matches/open"');
    expect(body).toContain('placeholder="https://aoe4world.com/.../games/..."');
    expect(body).toContain('id="posthog-analytics"');
    expect(body).toContain('home match url submitted');
    expect(body).toContain('home sample report opened');
    expect(body).toContain('home outbound link clicked');
    expect(body).toContain('home engagement summary');
    expect(body).not.toContain('/_next/static/chunks/');
    expect(body).not.toContain('self.__next_f');

    const scripts = extractExecutableScripts(body);
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) {
      expect(() => new Function(script)).not.toThrow();
    }
  });
});
