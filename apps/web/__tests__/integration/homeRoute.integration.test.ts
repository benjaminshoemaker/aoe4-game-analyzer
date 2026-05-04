import { GET } from '../../src/app/route';

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
    expect(body).toContain('/matches/open?url=https%3A%2F%2Faoe4world.com%2Fplayers%2F8139502%2Fgames%2F229727104%3Fsig%3D');
    expect(body).toContain('<form method="get" action="/matches/open"');
    expect(body).toContain('placeholder="https://aoe4world.com/.../games/..."');
    expect(body).not.toContain('/_next/static/chunks/');
    expect(body).not.toContain('self.__next_f');
  });
});
